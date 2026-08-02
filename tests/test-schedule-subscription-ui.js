const assert = require('assert');
const fs = require('fs');
const path = require('path');

function read(relativePath) {
    return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

function getFunctionBody(source, functionName) {
    const start = source.indexOf(`function ${functionName}(`);
    assert(start >= 0, `${functionName} should exist`);
    let parenDepth = 0;
    let signatureEnd = -1;
    for (let i = source.indexOf('(', start); i < source.length; i += 1) {
        if (source[i] === '(') parenDepth += 1;
        if (source[i] === ')') parenDepth -= 1;
        if (parenDepth === 0) {
            signatureEnd = i;
            break;
        }
    }
    const bodyStart = source.indexOf('{', signatureEnd);
    let depth = 0;
    for (let i = bodyStart; i < source.length; i += 1) {
        if (source[i] === '{') depth += 1;
        if (source[i] === '}') depth -= 1;
        if (depth === 0) return source.slice(bodyStart, i + 1);
    }
    throw new Error(`${functionName} body should be closed`);
}

const scheduleHtml = read('schedule.html');
const renderDayEntriesBody = getFunctionBody(scheduleHtml, 'renderDayEntries');
const initBody = getFunctionBody(scheduleHtml, 'init');

assert(
    scheduleHtml.includes('const SCHEDULE_SUBSCRIPTION_STORAGE_KEY = "schedule-subscriptions-v1";'),
    'schedule.html 应保存本地订阅状态，便于刷新后继续显示已订阅按钮状态'
);

assert(
    scheduleHtml.includes('function subscribeScheduleEntry(')
        && scheduleHtml.includes('function unsubscribeScheduleEntry('),
    'schedule.html 应提供订阅 / 取消订阅逻辑'
);

assert(
    renderDayEntriesBody.includes('courseScheduleState.text === "未排课"')
        && renderDayEntriesBody.includes('subscriptionButton')
        && renderDayEntriesBody.includes('actionGroup.appendChild(subscriptionButton)'),
    'schedule.html 仅应在未排课条目渲染订阅按钮'
);

assert(
    initBody.includes('scheduleSubscriptionState = loadScheduleSubscriptions();'),
    'schedule.html 初始化时应加载本地订阅状态'
);

assert(
    scheduleHtml.includes('time: getAppointmentClockText(entry, dateValue)')
        && scheduleHtml.includes('time: getAppointmentClockText(entry, dateValue),'),
    'schedule.html 订阅请求和本地订阅快照应保存申请排课使用的上课时间'
);

assert(
    !fs.existsSync(path.join(__dirname, '..', 'copy-schedule-request.html')),
    '邮件不应依赖手机邮件客户端无法稳定打开的复制页面'
);

assert(
    scheduleHtml.includes('function clearResolvedScheduleSubscription(')
        && renderDayEntriesBody.includes('clearResolvedScheduleSubscription(item, dateValue, courseScheduleState);'),
    'schedule.html 看到已排课或已完成时应清理本地已订阅状态，避免后台已停止轮询后 UI 仍显示取消订阅'
);

console.log('test-schedule-subscription-ui passed');