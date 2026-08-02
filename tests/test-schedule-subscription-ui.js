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
    scheduleHtml.includes('if (payload?.subscription)')
        && scheduleHtml.includes('forgetScheduleSubscription(entry, dateValue);'),
    'schedule.html 订阅后若当次首检已自动停订，不应继续保留本地已订阅状态'
);

assert(
    renderDayEntriesBody.includes('courseScheduleState.text === "未排课"')
        && renderDayEntriesBody.includes('subscriptionButton')
        && renderDayEntriesBody.includes('actionGroup.appendChild(subscriptionButton)'),
    'schedule.html 仅应在未排课条目渲染订阅按钮'
);

assert(
    renderDayEntriesBody.includes('每1小时检查一次')
        && renderDayEntriesBody.includes('最多提醒3次')
        && renderDayEntriesBody.includes('每1小时复查一次'),
    'schedule.html 订阅提示应显示每1小时复查且最多提醒3次'
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
    scheduleHtml.includes('if (!token)')
        && scheduleHtml.includes('请先完成李校来啦登录，再订阅未排课提醒')
        && !scheduleHtml.includes('if (!token || !userId)'),
    'schedule.html 订阅时应只强制要求 lxll token，避免缺少 x-user-id 的登录态无法订阅'
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

assert(
    !scheduleHtml.includes('function syncScheduleSubscriptionStatuses(')
        && !scheduleHtml.includes('action: "status"')
        && !renderDayEntriesBody.includes('syncScheduleSubscriptionStatuses();'),
    'schedule.html 不应在渲染时请求后端订阅状态，应完全依赖 localStorage 减少函数调用'
);

assert(
    !scheduleHtml.includes('后端订阅状态已同步'),
    'schedule.html 不应再提示后端订阅状态同步'
);

assert(
    !scheduleHtml.includes('SCHEDULE_SUBSCRIPTION_STATUS_SYNC_GRACE_MS')
        && !scheduleHtml.includes('subscribedAt'),
    'schedule.html 移除后端状态同步后不应继续保留同步 grace window 状态'
);

console.log('test-schedule-subscription-ui passed');