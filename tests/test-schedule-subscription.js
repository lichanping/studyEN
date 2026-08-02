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

async function testSubscribeShouldPersistHourlySubscription() {
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
    assert.strictEqual(store.snapshot()[0].nextCheckAt, '2026-08-02T03:00:00.000Z');
    assert.strictEqual(sentMessages[0].subscription.id, '邸睿__2026-08-02__60');
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
        workflow.includes("cron: '0 * * * *'")
            && workflow.includes('node scripts/check_schedule_subscriptions.mjs')
            && workflow.includes('NETLIFY_AUTH_TOKEN')
            && workflow.includes('FX_ALERT_SMTP_PASS'),
        'GitHub Actions should run the schedule subscription checker hourly with Netlify and SMTP secrets'
    );

    const oldNetlifyCheckerPath = path.join(__dirname, '..', 'netlify', 'functions', 'schedule-subscription-check.mjs');
    assert(
        !fs.existsSync(oldNetlifyCheckerPath),
        'Netlify scheduled checker should be removed so GitHub Actions is the single hourly sender'
    );
}

async function run() {
    await testSubscribeShouldPersistHourlySubscription();
    await testCheckerShouldRemoveResolvedSubscription();
    await testCheckerShouldSendEmailAndRescheduleWhenStillUnscheduled();
    await testReminderEmailShouldFallbackToHardcodedRecipient();
    await testReminderEmailShouldFallbackMailFromToSmtpUser();
    await testReminderEmailShouldIncludeScheduleRequestTextWithoutCopyPageLink();
    await testGithubActionShouldOwnHourlyChecker();
    console.log('test-schedule-subscription passed');
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});