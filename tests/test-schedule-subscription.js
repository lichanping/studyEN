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
    assert.strictEqual(result.subscription.nextCheckAt, '2026-08-02T01:10:00.000Z');
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
    assert.strictEqual(sentMessages.length, 0, 'resolved course should not send reminder email');
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
    assert.strictEqual(store.snapshot()[0].nextCheckAt, '2026-08-02T02:10:00.000Z');
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
            notifyCount: 6,
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
        sentMessages[0].message.includes('连续提醒 7 次')
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
            notifyCount: 6,
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
    assert.strictEqual(store.snapshot()[0].notifyCount, 6, 'failed checks should not spend a notify attempt');
    assert.strictEqual(store.snapshot()[0].lastError, 'temporary board failure');
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

async function testGithubActionShouldOwnHourlyChecker() {
    const fs = require('fs');
    const workflowPath = path.join(__dirname, '..', '.github', 'workflows', 'schedule-subscription-reminder.yml');
    const workflow = fs.readFileSync(workflowPath, 'utf8');

    assert(
        workflow.includes("cron: '*/10 * * * *'")
            && workflow.includes('pull_request:')
            && workflow.includes('node scripts/check_schedule_subscriptions.mjs')
            && workflow.includes('NETLIFY_AUTH_TOKEN')
            && workflow.includes('FX_ALERT_SMTP_PASS'),
        'GitHub Actions should run the schedule subscription checker in PR validation and every 10 minutes with Netlify and SMTP secrets'
    );

    const oldNetlifyCheckerPath = path.join(__dirname, '..', 'netlify', 'functions', 'schedule-subscription-check.mjs');
    assert(
        !fs.existsSync(oldNetlifyCheckerPath),
        'Netlify scheduled checker should be removed so GitHub Actions is the single hourly sender'
    );
}

async function testNetlifySubscriptionFunctionShouldNotRequireRootBrowserModule() {
    const fs = require('fs');
    const functionPath = path.join(__dirname, '..', 'netlify', 'functions', 'schedule-subscription.mjs');
    const source = fs.readFileSync(functionPath, 'utf8');

    assert(
        !source.includes('schedule-course-match.js'),
        'Netlify bundled subscription function should not require root browser modules that are missing from the Lambda package'
    );
}

async function run() {
    await testSubscribeShouldPersistTenMinuteSubscription();
    await testSubscribeShouldAllowMissingUserIdWhenTokenExists();
    await testCheckerShouldOmitUserIdHeaderWhenMissing();
    await testCheckerShouldRemoveResolvedSubscription();
    await testCheckerShouldSendEmailAndRescheduleWhenStillUnscheduled();
    await testCheckerShouldExpireAfterMaxNotifications();
    await testCheckerShouldNotSpendNotifyCountOnError();
    await testSubscriptionStatusShouldReportActiveIds();
    await testReminderEmailShouldFallbackToHardcodedRecipient();
    await testReminderEmailShouldFallbackMailFromToSmtpUser();
    await testReminderEmailShouldIncludeScheduleRequestTextWithoutCopyPageLink();
    await testGithubActionShouldOwnHourlyChecker();
    await testNetlifySubscriptionFunctionShouldNotRequireRootBrowserModule();
    console.log('test-schedule-subscription passed');
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});