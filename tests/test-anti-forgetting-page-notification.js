const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const page = fs.readFileSync(path.join(root, 'anti-forgetting.html'), 'utf8');
const meetingConfigSource = fs.readFileSync(path.join(root, 'meeting-config.js'), 'utf8');

function readFunction(source, signature) {
    const start = source.indexOf(signature);
    assert(start >= 0, `缺少函数：${signature}`);
    const braceStart = source.indexOf('{', start);
    let depth = 0;
    for (let index = braceStart; index < source.length; index += 1) {
        if (source[index] === '{') depth += 1;
        if (source[index] === '}') depth -= 1;
        if (depth === 0) return source.slice(start, index + 1);
    }
    throw new Error(`函数未闭合：${signature}`);
}

const meetingWindow = {
    localStorage: { getItem: () => null },
    document: { getElementById: () => null }
};
meetingWindow.window = meetingWindow;
vm.runInNewContext(meetingConfigSource, { window: meetingWindow, console });

const copiedMessages = [];
const displayedMessages = [];
const alerts = [];
const elements = {
    userName: { value: '验收学生' },
    reviewTime: { value: '2026-09-27T19:30' },
    bfdExtraReviewFeeCheckbox: { checked: true }
};
let currentPlatformId = 'lixiaolaila';
const pageContext = {
    window: {
        APP_MEETING_CONFIG: meetingWindow.APP_MEETING_CONFIG,
        alert: (message) => alerts.push(message)
    },
    document: { getElementById: (id) => elements[id] || null },
    getCurrentPlatformId: () => currentPlatformId,
    commonFunctions: {
        copyToClipboard: (message) => {
            copiedMessages.push(message);
            return true;
        },
        showLongText: (message) => displayedMessages.push(message)
    }
};

const noticeFunctions = [
    readFunction(page, 'function buildAntiForgettingPageNoticeMessage('),
    readFunction(page, 'function sendAntiForgettingNotice('),
    'this.buildAntiForgettingPageNoticeMessage = buildAntiForgettingPageNoticeMessage;',
    'this.sendAntiForgettingNotice = sendAntiForgettingNotice;'
].join('\n');
vm.runInNewContext(noticeFunctions, pageContext);

assert(page.includes('id="sendAntiForgettingNoticeButton"'), '抗遗忘页应提供发送复习通知按钮');
assert(page.includes('>发送复习通知</button>'), '通知按钮应有明确的发送复习通知文案');
assert(
    page.includes("document.getElementById('sendAntiForgettingNoticeButton').addEventListener('click', sendAntiForgettingNotice);"),
    '发送复习通知按钮应绑定通知处理函数'
);

const expectedMeetingTags = {
    lixiaolaila: '#腾讯会议：332-6955-7102',
    baifendii: '#腾讯会议：684-1587-8369',
    maisuiyingyu: '#腾讯会议：569-8084-0547'
};

for (const [platformId, meetingTag] of Object.entries(expectedMeetingTags)) {
    const message = pageContext.buildAntiForgettingPageNoticeMessage(
        '验收学生',
        '2026-09-27T19:30',
        platformId
    );
    assert(message.startsWith('【抗遗忘温馨提醒-19:30】'), `${platformId} 通知标题应包含复习时间`);
    assert(message.includes('验收学生'), `${platformId} 通知应包含学员姓名`);
    assert(!message.includes('2026-09-27'), `${platformId} 通知不应包含日期`);
    assert(message.includes(meetingTag), `${platformId} 通知应使用平台对应的抗遗忘会议号`);
}

currentPlatformId = 'baifendii';
pageContext.sendAntiForgettingNotice();
assert.strictEqual(copiedMessages.length, 1, '有效输入应复制一条通知');
assert.strictEqual(displayedMessages[0], copiedMessages[0], '复制后应在页面展示通知文案');
assert(copiedMessages[0].includes(expectedMeetingTags.baifendii));
assert.strictEqual(elements.reviewTime.value, '2026-09-27T19:30', '发送通知不应修改复习时间');
assert.strictEqual(elements.bfdExtraReviewFeeCheckbox.checked, true, '发送通知不应更改计费勾选状态');

elements.userName.value = '';
pageContext.sendAntiForgettingNotice();
assert.strictEqual(copiedMessages.length, 1, '缺少学员时不得复制通知');
assert.strictEqual(alerts.length, 1, '缺少学员时应提示补全信息');

elements.userName.value = '验收学生';
elements.reviewTime.value = '';
pageContext.sendAntiForgettingNotice();
assert.strictEqual(copiedMessages.length, 1, '缺少复习时间时不得复制通知');
assert.strictEqual(alerts.length, 2, '缺少复习时间时应提示补全信息');

console.log('test-anti-forgetting-page-notification passed');