const assert = require('assert');
const path = require('path');
const { pathToFileURL } = require('url');

async function loadModule(relativePath) {
    const fileUrl = pathToFileURL(path.resolve(__dirname, '..', relativePath)).href;
    return import(fileUrl);
}

function createMemoryStore(initialRecords) {
    let value = Array.isArray(initialRecords) ? initialRecords.slice() : [];
    return {
        async get() {
            return value.slice();
        },
        async setJSON(_key, next) {
            value = Array.isArray(next) ? next.slice() : [];
        },
        snapshot() {
            return value.slice();
        }
    };
}

function createLaggyMemoryStore(initialRecords) {
    let value = Array.isArray(initialRecords) ? initialRecords.slice() : [];
    let staleOnce = null;
    return {
        async get() {
            if (staleOnce) {
                const current = staleOnce.slice();
                staleOnce = null;
                return current;
            }
            return value.slice();
        },
        async setJSON(_key, next) {
            staleOnce = value.slice();
            value = Array.isArray(next) ? next.slice() : [];
        },
        snapshot() {
            return value.slice();
        }
    };
}

async function testSubscribeShouldPersistTenMinuteSubscription() {
    const mod = await loadModule('netlify/functions/schedule-subscription.mjs');
    const store = createMemoryStore();
    const now = '2026-08-02T01:00:00.000Z';

    const result = await mod.upsertSubscription({
        store,
        nowIso: now,
        payload: {
            student: '邸睿',
            date: '2026-08-02',
            durationMinutes: 60,
            course: '单词',
            platform: 'lixiaolaila',
            token: 'x-token-c-demo',
            userId: 'u-1'
        }
    });

    assert.strictEqual(result.subscription.id, '邸睿__2026-08-02__60');
    assert.strictEqual(result.subscription.nextCheckAt, '2026-08-02T02:00:00.000Z');
    assert.strictEqual(store.snapshot().length, 1, 'active subscription should be persisted');
}

async function testSubscribeShouldAllowMissingUserIdWhenTokenExists() {
    const mod = await loadModule('netlify/functions/schedule-subscription.mjs');
    const store = createMemoryStore();
    const now = '2026-08-02T01:00:00.000Z';

    const result = await mod.upsertSubscription({
        store,
        nowIso: now,
        payload: {
            student: '徐智浩',
            date: '2026-08-02',
            durationMinutes: 60,
            course: '单词',
            platform: 'lixiaolaila',
            token: 'x-token-c-demo'
        }
    });

    assert.strictEqual(result.subscription.id, '徐智浩__2026-08-02__60');
    assert.strictEqual(result.subscription.userId, '');
    assert.strictEqual(store.snapshot().length, 1, 'token-only lxll login state should still be subscribable');
}

async function testAbnormalStudentSubscribeShouldPersistStudentScopedSubscription() {
    const mod = await loadModule('netlify/functions/schedule-subscription.mjs');
    const store = createMemoryStore();
    const now = '2026-08-11T01:00:00.000Z';

    const result = await mod.upsertSubscription({
        store,
        nowIso: now,
        payload: {
            subscriptionType: 'abnormal-student',
            student: '俞新硕',
            platform: 'lixiaolaila',
            token: 'x-token-c-demo',
            issueText: '陪练服务时长不足（剩余0.0，需求1小时）',
            sourceScopeLabel: '2026-08-11~2026-08-17',
            zeroFields: ['quotaAccompany'],
            requiredQuota30: 0,
            requiredQuota60: 0,
            requiredAccompanyHours: 1
        }
    });

    assert.strictEqual(result.subscription.id, 'abnormal-student__俞新硕');
    assert.strictEqual(result.subscription.subscriptionType, 'abnormal-student');
    assert.strictEqual(result.subscription.issueText, '陪练服务时长不足（剩余0.0，需求1小时）');
    assert.deepStrictEqual(result.subscription.zeroFields, ['quotaAccompany']);
    assert.strictEqual(result.subscription.requiredAccompanyHours, 1);
    assert.strictEqual(store.snapshot().length, 1, 'abnormal student subscription should be persisted');
}

async function testCheckerShouldOmitUserIdHeaderWhenMissing() {
    const mod = await loadModule('scripts/check_schedule_subscriptions.mjs');
    const originalFetch = global.fetch;
    const calls = [];
    global.fetch = async (url, options) => {
        calls.push({ url, headers: options.headers });
        if (String(url).includes('/orders')) {
            return { ok: true, async json() { return { data: { data: [] } }; } };
        }
        return { ok: true, async json() { return { data: [] }; } };
    };

    try {
        await mod.loadBoardRowsForSubscription({ token: 'x-token-c-demo', userId: '' });
    } finally {
        global.fetch = originalFetch;
    }

    assert.strictEqual(calls.length, 2, 'checker should query board and completed orders');
    assert(calls.every((call) => call.headers['x-token-c'] === 'x-token-c-demo'));
    assert(calls.every((call) => !Object.prototype.hasOwnProperty.call(call.headers, 'x-user-id')),
        'checker should not send an empty x-user-id header');
}

async function testCheckerShouldRemoveResolvedSubscription() {
    const mod = await loadModule('scripts/check_schedule_subscriptions.mjs');
    const store = createMemoryStore([
        {
            id: '邸睿__2026-08-02__60',
            student: '邸睿',
            date: '2026-08-02',
            durationMinutes: 60,
            course: '单词',
            platform: 'lixiaolaila',
            token: 'x-token-c-demo',
            userId: 'u-1',
            nextCheckAt: '2026-08-02T02:00:00.000Z',
            createdAt: '2026-08-02T01:00:00.000Z',
            updatedAt: '2026-08-02T01:00:00.000Z'
        }
    ]);
    const sentMessages = [];

    const summary = await mod.runSubscriptionChecks({
        store,
        nowIso: '2026-08-02T02:00:00.000Z',
        fetchBoardRows: async () => ([
            {
                student: { name: '邸睿' },
                scheduleTime: new Date('2026-08-02T09:00:00+08:00').getTime(),
                type: 'MINUTE_60',
                status: 'SCHEDULED'
            }
        ]),
        sendReminderEmail: async (payload) => {
            sentMessages.push(payload);
        }
    });

    assert.strictEqual(summary.resolvedCount, 1, 'resolved course should stop subscription');
    assert.strictEqual(store.snapshot().length, 0, 'resolved subscription should be removed from active list');
    assert.strictEqual(sentMessages.length, 1, 'resolved course should send one success email before stopping');
    assert(
        sentMessages[0].subject.includes('已排课')
            && sentMessages[0].message.includes('已检测到排课')
            && sentMessages[0].message.includes('自动停止订阅'),
        'resolved success email should explain that polling stops'
    );
}

async function testCheckerShouldSendEmailAndRescheduleWhenStillUnscheduled() {
    const mod = await loadModule('scripts/check_schedule_subscriptions.mjs');
    const store = createMemoryStore([
        {
            id: '邸睿__2026-08-02__60',
            student: '邸睿',
            date: '2026-08-02',
            durationMinutes: 60,
            course: '单词',
            platform: 'lixiaolaila',
            token: 'x-token-c-demo',
            userId: 'u-1',
            nextCheckAt: '2026-08-02T02:00:00.000Z',
            createdAt: '2026-08-02T01:00:00.000Z',
            updatedAt: '2026-08-02T01:00:00.000Z'
        }
    ]);
    const sentMessages = [];

    const summary = await mod.runSubscriptionChecks({
        store,
        nowIso: '2026-08-02T02:00:00.000Z',
        fetchBoardRows: async () => ([]),
        sendReminderEmail: async (payload) => {
            sentMessages.push(payload);
        }
    });

    assert.strictEqual(summary.notifiedCount, 1, 'unscheduled course should send reminder email');
    assert.strictEqual(store.snapshot().length, 1, 'unscheduled subscription should remain active');
    assert.strictEqual(store.snapshot()[0].nextCheckAt, '2026-08-02T03:00:00.000Z');
    assert.strictEqual(sentMessages[0].subscription.id, '邸睿__2026-08-02__60');
}

async function testCheckerShouldExpireAfterMaxNotifications() {
    const mod = await loadModule('scripts/check_schedule_subscriptions.mjs');
    const store = createMemoryStore([
        {
            id: '邸睿__2026-08-02__60',
            student: '邸睿',
            date: '2026-08-02',
            durationMinutes: 60,
            course: '单词',
            platform: 'lixiaolaila',
            token: 'x-token-c-demo',
            userId: 'u-1',
            notifyCount: 2,
            nextCheckAt: '2026-08-02T02:00:00.000Z',
            createdAt: '2026-08-02T01:00:00.000Z',
            updatedAt: '2026-08-02T01:50:00.000Z'
        }
    ]);
    const sentMessages = [];

    const summary = await mod.runSubscriptionChecks({
        store,
        nowIso: '2026-08-02T02:00:00.000Z',
        fetchBoardRows: async () => ([]),
        sendReminderEmail: async (payload) => {
            sentMessages.push(payload);
        }
    });

    assert.strictEqual(summary.notifiedCount, 1, 'final allowed reminder should still be sent');
    assert.strictEqual(summary.expiredCount, 1, 'subscription should be counted as expired after max reminders');
    assert.strictEqual(store.snapshot().length, 0, 'expired subscription should be removed from active list');
    assert(
        sentMessages[0].message.includes('连续提醒 3 次')
            && sentMessages[0].message.includes('自动停止轮询'),
        'final reminder should tell the user polling stops after max reminders'
    );
}

async function testCheckerShouldNotSpendNotifyCountOnError() {
    const mod = await loadModule('scripts/check_schedule_subscriptions.mjs');
    const store = createMemoryStore([
        {
            id: '邸睿__2026-08-02__60',
            student: '邸睿',
            date: '2026-08-02',
            durationMinutes: 60,
            course: '单词',
            platform: 'lixiaolaila',
            token: 'x-token-c-demo',
            userId: 'u-1',
            notifyCount: 2,
            nextCheckAt: '2026-08-02T02:00:00.000Z',
            createdAt: '2026-08-02T01:00:00.000Z',
            updatedAt: '2026-08-02T01:50:00.000Z'
        }
    ]);

    const summary = await mod.runSubscriptionChecks({
        store,
        nowIso: '2026-08-02T02:00:00.000Z',
        fetchBoardRows: async () => {
            throw new Error('temporary board failure');
        },
        sendReminderEmail: async () => {
            throw new Error('should not send');
        }
    });

    assert.strictEqual(summary.skippedCount, 1, 'temporary errors should be skipped and retried later');
    assert.strictEqual(summary.expiredCount, 0, 'temporary errors should not expire the subscription');
    assert.strictEqual(store.snapshot().length, 1, 'failed checks should keep the active subscription');
    assert.strictEqual(store.snapshot()[0].notifyCount, 2, 'failed checks should not spend a notify attempt');
    assert.strictEqual(store.snapshot()[0].lastError, 'temporary board failure');
}

async function testResubscribeShouldResetNotifyCountAfterExpiry() {
    const mod = await loadModule('netlify/functions/schedule-subscription.mjs');
    const store = createMemoryStore([]);

    const result = await mod.upsertSubscription({
        store,
        nowIso: '2026-08-02T04:00:00.000Z',
        payload: {
            student: '徐智浩',
            date: '2026-08-03',
            durationMinutes: 60,
            course: '单词',
            platform: 'lixiaolaila',
            token: 'x-token-c-demo'
        }
    });

    assert.strictEqual(result.subscription.notifyCount, 0, 're-subscribing after expiry should start a fresh notify count');
    assert.strictEqual(result.subscription.nextCheckAt, '2026-08-02T05:00:00.000Z');
    assert.strictEqual(store.snapshot().length, 1, 're-subscribing after expiry should create a fresh active subscription');
}

async function testSubscribeShouldImmediatelySendFirstReminderWhenStillUnscheduled() {
    const mod = await loadModule('netlify/functions/schedule-subscription.mjs');
    const sentMessages = [];
    const store = createLaggyMemoryStore([]);

    const result = await mod.subscribeAndRunImmediateCheck({
        store,
        nowIso: '2026-08-02T04:00:00.000Z',
        payload: {
            student: '徐智浩',
            date: '2026-08-03',
            durationMinutes: 60,
            course: '单词',
            platform: 'lixiaolaila',
            token: 'x-token-c-demo'
        },
        fetchBoardRows: async () => ([]),
        sendReminderEmail: async (payload) => {
            sentMessages.push(payload);
        }
    });

    assert.strictEqual(result.summary.notifiedCount, 1, 'subscribe should trigger the first reminder immediately when still unscheduled');
    assert.strictEqual(result.summary.resolvedCount, 0, 'unscheduled first check should not resolve the subscription');
    assert.strictEqual(store.snapshot().length, 1, 'unscheduled first check should keep the subscription active');
    assert.strictEqual(store.snapshot()[0].notifyCount, 1, 'immediate first reminder should spend the first notify attempt');
    assert.strictEqual(store.snapshot()[0].nextCheckAt, '2026-08-02T05:00:00.000Z', 'next hourly retry should be scheduled after the immediate first check');
    assert.strictEqual(sentMessages.length, 1, 'immediate first check should send exactly one reminder email');
}

async function testSubscribeShouldImmediatelyResolveAndStopWhenAlreadyScheduled() {
    const mod = await loadModule('netlify/functions/schedule-subscription.mjs');
    const sentMessages = [];
    const store = createMemoryStore([]);

    const result = await mod.subscribeAndRunImmediateCheck({
        store,
        nowIso: '2026-08-02T04:00:00.000Z',
        payload: {
            student: '徐智浩',
            date: '2026-08-03',
            durationMinutes: 60,
            course: '单词',
            platform: 'lixiaolaila',
            token: 'x-token-c-demo'
        },
        fetchBoardRows: async () => ([
            {
                student: { name: '徐智浩' },
                scheduleTime: new Date('2026-08-03T10:00:00+08:00').getTime(),
                type: 'MINUTE_60',
                status: 'SCHEDULED'
            }
        ]),
        sendReminderEmail: async (payload) => {
            sentMessages.push(payload);
        }
    });

    assert.strictEqual(result.summary.resolvedCount, 1, 'subscribe should immediately resolve when the course is already scheduled');
    assert.strictEqual(result.summary.notifiedCount, 0, 'resolved first check should not send an unresolved reminder');
    assert.strictEqual(store.snapshot().length, 0, 'resolved first check should stop the subscription immediately');
    assert.strictEqual(sentMessages.length, 1, 'resolved first check should send one success email');
    assert(sentMessages[0].subject.includes('已排课'), 'resolved first check should send a success subject');
}

async function testAbnormalStudentSubscribeShouldImmediatelyResolveWhenQuotaRecovered() {
    const mod = await loadModule('netlify/functions/schedule-subscription.mjs');
    const sentMessages = [];
    const store = createMemoryStore([]);

    const result = await mod.subscribeAndRunImmediateCheck({
        store,
        nowIso: '2026-08-11T04:00:00.000Z',
        payload: {
            subscriptionType: 'abnormal-student',
            student: '俞新硕',
            platform: 'lixiaolaila',
            token: 'x-token-c-demo',
            issueText: '陪练服务时长不足（剩余0.0，需求1小时）',
            zeroFields: ['quotaAccompany'],
            requiredAccompanyHours: 1
        },
        fetchQuotaRows: async () => ([
            {
                userName: '俞新硕',
                quota30: '2',
                quota60: '1',
                quotaAccompany: '1.0'
            }
        ]),
        sendReminderEmail: async (payload) => {
            sentMessages.push(payload);
        }
    });

    assert.strictEqual(result.summary.resolvedCount, 1, 'abnormal student subscription should resolve when the subscribed quota issue is recovered');
    assert.strictEqual(result.summary.notifiedCount, 0, 'resolved abnormal student subscription should not send unresolved reminders');
    assert.strictEqual(store.snapshot().length, 0, 'resolved abnormal student subscription should stop immediately');
    assert.strictEqual(sentMessages.length, 1, 'resolved abnormal student subscription should send one result email');
    assert.strictEqual(sentMessages[0].subscription.subscriptionType, 'abnormal-student');
    assert(sentMessages[0].message.includes('当前30分钟剩余：2'), 'resolved abnormal student email should include the latest quota30 value');
    assert(sentMessages[0].message.includes('当前60分钟剩余：1'), 'resolved abnormal student email should include the latest quota60 value');
    assert(sentMessages[0].message.includes('当前陪练服务时长剩余：1.0'), 'resolved abnormal student email should include the latest accompany quota value');
    assert(!sentMessages[0].message.includes('检查范围：'), 'resolved abnormal student email should not show schedule-scope text');
}

async function testAbnormalStudentSubscribeShouldNotifyWhenQuotaStillInsufficient() {
    const mod = await loadModule('netlify/functions/schedule-subscription.mjs');
    const sentMessages = [];
    const store = createLaggyMemoryStore([]);

    const result = await mod.subscribeAndRunImmediateCheck({
        store,
        nowIso: '2026-08-11T04:00:00.000Z',
        payload: {
            subscriptionType: 'abnormal-student',
            student: '俞新硕',
            platform: 'lixiaolaila',
            token: 'x-token-c-demo',
            issueText: '30分钟课时不足（剩余0，需求1）',
            zeroFields: ['quota30'],
            requiredQuota30: 1
        },
        fetchQuotaRows: async () => ([
            {
                userName: '俞新硕',
                quota30: '0',
                quota60: '3',
                quotaAccompany: '2.0'
            }
        ]),
        sendReminderEmail: async (payload) => {
            sentMessages.push(payload);
        }
    });

    assert.strictEqual(result.summary.notifiedCount, 1, 'abnormal student subscription should notify when the subscribed quota issue still exists');
    assert.strictEqual(result.summary.resolvedCount, 0, 'still-insufficient abnormal student subscription should not resolve');
    assert.strictEqual(store.snapshot().length, 1, 'still-insufficient abnormal student subscription should remain active');
    assert.strictEqual(store.snapshot()[0].notifyCount, 1, 'first abnormal student reminder should consume one notify attempt');
    assert(sentMessages[0].message.includes('30分钟课时不足'), 'abnormal student reminder should mention the subscribed quota issue');
    assert(sentMessages[0].message.includes('当前30分钟剩余：0'), 'abnormal student reminder should include the latest quota30 value');
    assert(sentMessages[0].message.includes('当前60分钟剩余：3'), 'abnormal student reminder should include the latest quota60 value');
    assert(sentMessages[0].message.includes('当前陪练服务时长剩余：2.0'), 'abnormal student reminder should include the latest accompany quota value');
    assert(!sentMessages[0].message.includes('检查范围：'), 'abnormal student reminder should not show schedule-scope text');
}

async function testAbnormalStudentReminderMessageShouldFocusOnQuotaInfo() {
    const mod = await loadModule('scripts/check_schedule_subscriptions.mjs');
    const message = mod.buildReminderMessage({
        id: 'abnormal-student__俞新硕',
        subscriptionType: 'abnormal-student',
        student: '俞新硕',
        platform: 'lixiaolaila',
        issueText: '陪练服务时长不足（剩余0，需求1小时）',
        zeroFields: ['quotaAccompany']
    }, {
        quotaRow: {
            quota30: '8',
            quota60: '4',
            quotaAccompany: '0'
        }
    });

    assert(message.includes('当前30分钟剩余：8'), 'abnormal student reminder message should include quota30 snapshot');
    assert(message.includes('当前60分钟剩余：4'), 'abnormal student reminder message should include quota60 snapshot');
    assert(message.includes('当前陪练服务时长剩余：0'), 'abnormal student reminder message should include accompany quota snapshot');
    assert(!message.includes('检查范围：'), 'abnormal student reminder message should not include schedule-scope text');
}

async function testSubscriptionStatusShouldReportActiveIds() {
    const mod = await loadModule('netlify/functions/schedule-subscription.mjs');
    const store = createMemoryStore([
        {
            id: '邸睿__2026-08-02__60',
            student: '邸睿',
            date: '2026-08-02',
            durationMinutes: 60
        }
    ]);

    const result = await mod.getSubscriptionStatus({
        store,
        payload: {
            ids: ['邸睿__2026-08-02__60', '徐智浩__2026-08-02__60']
        }
    });

    assert.deepStrictEqual(result.activeIds, ['邸睿__2026-08-02__60']);
    assert.strictEqual(result.statusById['邸睿__2026-08-02__60'], 'active');
    assert.strictEqual(result.statusById['徐智浩__2026-08-02__60'], 'inactive');
}

async function testReminderEmailShouldFallbackToHardcodedRecipient() {
    const mod = await loadModule('scripts/check_schedule_subscriptions.mjs');
    const recipients = mod.resolveMailRecipients({});

    assert.deepStrictEqual(
        recipients,
        ['lichanping@126.com'],
        'MVP should fallback to the hardcoded mailbox when MAIL_TO env is not configured'
    );
}

async function testReminderEmailShouldFallbackMailFromToSmtpUser() {
    const mod = await loadModule('scripts/check_schedule_subscriptions.mjs');
    const mailFrom = mod.resolveMailFrom({
        SCHEDULE_SUBSCRIPTION_SMTP_USER: 'sender@example.com'
    });

    assert.strictEqual(
        mailFrom,
        'sender@example.com',
        'MAIL_FROM should default to SMTP_USER like the reference email implementation'
    );
}

async function testReminderEmailShouldIncludeScheduleRequestTextWithoutCopyPageLink() {
    const mod = await loadModule('scripts/check_schedule_subscriptions.mjs');
    const subscription = {
        id: '徐智浩__2026-08-02__60',
        student: '徐智浩',
        date: '2026-08-02',
        time: '10:00',
        durationMinutes: 60,
        course: '单词',
        platform: 'lixiaolaila'
    };

    const requestText = mod.buildScheduleRequestText(subscription);
    assert.strictEqual(
        requestText,
        '【排课申请】\n学员：【徐智浩】\n时间：8月2日（周日） 10:00\n课程与时长：单词（1小时），谢谢～',
        'copy text should match the schedule page appointment request format'
    );

    const message = mod.buildReminderMessage(subscription, {
        SCHEDULE_SUBSCRIPTION_COPY_BASE_URL: 'http://localhost:8888'
    });

    assert(
        message.includes(requestText)
            && !message.includes('copy-schedule-request.html')
            && !message.includes('点击下面链接'),
        'reminder email should include the appointment request text directly without an unreliable copy page link'
    );
}

async function testReminderEmailShouldSkipWhenDisabledByEnv() {
    const mod = await loadModule('scripts/check_schedule_subscriptions.mjs');
    const result = await mod.sendSmtpReminderEmail({
        subscription: {
            id: '徐智浩__2026-08-02__60',
            student: '徐智浩',
            date: '2026-08-02',
            durationMinutes: 60,
            course: '单词',
            platform: 'lixiaolaila'
        },
        env: {
            SCHEDULE_SUBSCRIPTION_DISABLE_EMAIL: 'true'
        }
    });

    assert.deepStrictEqual(
        result,
        { skipped: true },
        'PR validation should be able to disable real email sending explicitly'
    );
}

async function testImmediateCheckShouldNotConsumeAttemptWhenEmailSkipped() {
    const mod = await loadModule('netlify/functions/schedule-subscription.mjs');
    const store = createLaggyMemoryStore([]);

    const result = await mod.subscribeAndRunImmediateCheck({
        store,
        nowIso: '2026-08-02T04:00:00.000Z',
        payload: {
            student: '季筱雯',
            date: '2026-08-03',
            durationMinutes: 60,
            course: '单词',
            platform: 'lixiaolaila',
            token: 'x-token-c-demo'
        },
        fetchBoardRows: async () => ([]),
        sendReminderEmail: async () => ({ skipped: true })
    });

    assert.strictEqual(result.summary.notifiedCount, 0, 'skipped email should not be counted as sent');
    assert.strictEqual(result.summary.skippedCount, 1, 'skipped email should be reported explicitly');
    assert.strictEqual(store.snapshot()[0].notifyCount, 0, 'skipped email should not consume a notify attempt');
    assert.strictEqual(store.snapshot()[0].lastError, 'email skipped');
}

async function testCheckerShouldBeReadOnlyInDryRunMode() {
    const mod = await loadModule('scripts/check_schedule_subscriptions.mjs');
    const originalRecord = {
        id: '邸睿__2026-08-02__60',
        student: '邸睿',
        date: '2026-08-02',
        durationMinutes: 60,
        course: '单词',
        platform: 'lixiaolaila',
        token: 'x-token-c-demo',
        userId: 'u-1',
        notifyCount: 2,
        nextCheckAt: '2026-08-02T02:00:00.000Z',
        createdAt: '2026-08-02T01:00:00.000Z',
        updatedAt: '2026-08-02T01:50:00.000Z'
    };
    const store = createMemoryStore([originalRecord]);
    const sentMessages = [];

    const summary = await mod.runSubscriptionChecks({
        store,
        nowIso: '2026-08-02T02:00:00.000Z',
        env: {
            SCHEDULE_SUBSCRIPTION_DRY_RUN: 'true'
        },
        fetchBoardRows: async () => ([]),
        sendReminderEmail: async (payload) => {
            sentMessages.push(payload);
            return { skipped: true };
        }
    });

    assert.strictEqual(summary.dryRun, true, 'PR validation should report dry-run mode explicitly');
    assert.strictEqual(summary.notifiedCount, 0, 'dry-run must not count a real reminder as sent');
    assert.strictEqual(summary.expiredCount, 0, 'dry-run must not expire active subscriptions');
    assert.strictEqual(summary.wouldNotifyCount, 1, 'dry-run should still report pending reminder actions');
    assert.strictEqual(summary.activeCount, 1, 'dry-run should keep the original active subscription count');
    assert.deepStrictEqual(store.snapshot(), [originalRecord], 'dry-run must not mutate the persisted subscriptions');
    assert.strictEqual(sentMessages.length, 0, 'dry-run must not even call the email sender');
}

async function testNetlifyScheduledFunctionShouldOwnReminderChecker() {
    const fs = require('fs');
    const workflowPath = path.join(__dirname, '..', '.github', 'workflows', 'schedule-subscription-reminder.yml');
    const workflow = fs.readFileSync(workflowPath, 'utf8');

    assert(
        !workflow.includes("cron: '*/10 * * * *'")
            && workflow.includes('pull_request:')
            && workflow.includes('node scripts/check_schedule_subscriptions.mjs')
            && workflow.includes('NETLIFY_AUTH_TOKEN')
            && workflow.includes('FX_ALERT_SMTP_PASS')
            && workflow.includes("SCHEDULE_SUBSCRIPTION_DRY_RUN: ${{ github.event_name == 'pull_request' && 'true' || 'false' }}"),
        'GitHub Actions should keep only dry-run validation, not production schedule ownership'
    );

    const netlifyCheckerPath = path.join(__dirname, '..', 'netlify', 'functions', 'schedule-subscription-check.mjs');
    assert(
        fs.existsSync(netlifyCheckerPath),
        'Netlify scheduled checker should exist so production polling is owned by Netlify Scheduled Functions'
    );

    const netlifyCheckerSource = fs.readFileSync(netlifyCheckerPath, 'utf8');
    assert(
        netlifyCheckerSource.includes('schedule = "@hourly"')
            || netlifyCheckerSource.includes("schedule: '@hourly'")
            || netlifyCheckerSource.includes('schedule: "@hourly"'),
        'Netlify scheduled checker should run hourly'
    );
}

async function testNetlifySubscriptionFunctionShouldNotRequireRootBrowserModule() {
    const fs = require('fs');
    const functionPath = path.join(__dirname, '..', 'netlify', 'functions', 'schedule-subscription.mjs');
    const source = fs.readFileSync(functionPath, 'utf8');
    const checkerPath = path.join(__dirname, '..', 'scripts', 'check_schedule_subscriptions.mjs');
    const checkerSource = fs.readFileSync(checkerPath, 'utf8');
    const scheduledFunctionPath = path.join(__dirname, '..', 'netlify', 'functions', 'schedule-subscription-check.mjs');
    const scheduledFunctionSource = fs.readFileSync(scheduledFunctionPath, 'utf8');

    assert(
        !source.includes('schedule-course-match.js'),
        'Netlify bundled subscription function should not require root browser modules that are missing from the Lambda package'
    );
    assert(
        source.includes('./schedule-subscription-checker-shared.mjs')
            && scheduledFunctionSource.includes('./schedule-subscription-checker-shared.mjs')
            && checkerSource.includes('../netlify/functions/schedule-subscription-checker-shared.mjs'),
        'Subscription functions should import a checker shared module from netlify/functions, and the script entry should only wrap that shared module'
    );
    assert(
        !source.includes('createRequire')
            && !scheduledFunctionSource.includes('createRequire')
            && fs.readFileSync(path.join(__dirname, '..', 'netlify', 'functions', 'schedule-subscription-checker-shared.mjs'), 'utf8').includes('./schedule-course-match-shared.mjs'),
        'Netlify subscription checker should use a static ESM matcher import so bundling includes the dependency'
    );
}

async function run() {
    await testSubscribeShouldPersistTenMinuteSubscription();
    await testSubscribeShouldAllowMissingUserIdWhenTokenExists();
    await testAbnormalStudentSubscribeShouldPersistStudentScopedSubscription();
    await testCheckerShouldOmitUserIdHeaderWhenMissing();
    await testCheckerShouldRemoveResolvedSubscription();
    await testCheckerShouldSendEmailAndRescheduleWhenStillUnscheduled();
    await testCheckerShouldExpireAfterMaxNotifications();
    await testCheckerShouldNotSpendNotifyCountOnError();
    await testResubscribeShouldResetNotifyCountAfterExpiry();
    await testSubscribeShouldImmediatelySendFirstReminderWhenStillUnscheduled();
    await testSubscribeShouldImmediatelyResolveAndStopWhenAlreadyScheduled();
    await testAbnormalStudentSubscribeShouldImmediatelyResolveWhenQuotaRecovered();
    await testAbnormalStudentSubscribeShouldNotifyWhenQuotaStillInsufficient();
    await testAbnormalStudentReminderMessageShouldFocusOnQuotaInfo();
    await testSubscriptionStatusShouldReportActiveIds();
    await testReminderEmailShouldFallbackToHardcodedRecipient();
    await testReminderEmailShouldFallbackMailFromToSmtpUser();
    await testReminderEmailShouldIncludeScheduleRequestTextWithoutCopyPageLink();
    await testReminderEmailShouldSkipWhenDisabledByEnv();
    await testImmediateCheckShouldNotConsumeAttemptWhenEmailSkipped();
    await testCheckerShouldBeReadOnlyInDryRunMode();
    await testNetlifyScheduledFunctionShouldOwnReminderChecker();
    await testNetlifySubscriptionFunctionShouldNotRequireRootBrowserModule();
    console.log('test-schedule-subscription passed');
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});