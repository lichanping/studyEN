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
const syncScheduleSubscriptionStatusesBody = getFunctionBody(scheduleHtml, 'syncScheduleSubscriptionStatuses');
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
    renderDayEntriesBody.includes('每10分钟检查一次')
        && renderDayEntriesBody.includes('每10分钟复查一次'),
    'schedule.html 测试阶段订阅提示应显示每10分钟复查'
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
    scheduleHtml.includes('function syncScheduleSubscriptionStatuses(')
        && scheduleHtml.includes('action: "status"')
        && renderDayEntriesBody.includes('syncScheduleSubscriptionStatuses();'),
    'schedule.html 渲染时应向后端校验本地订阅状态，后端已停止订阅时清理 localStorage'
);

assert(
    scheduleHtml.includes('后端订阅状态已同步')
        && scheduleHtml.includes('delete scheduleSubscriptionState[id];'),
    'schedule.html 同步发现后端 inactive 时应清理本地订阅缓存并提示状态已同步'
);

assert(
    syncScheduleSubscriptionStatusesBody.includes('rerenderScheduleViewsForBoardState();'),
    'schedule.html 同步清理本地订阅后应立即重渲染，避免按钮继续停留在取消订阅状态'
);

assert(
    scheduleHtml.includes('SCHEDULE_SUBSCRIPTION_STATUS_SYNC_GRACE_MS')
        && syncScheduleSubscriptionStatusesBody.includes('subscribedAt')
        && syncScheduleSubscriptionStatusesBody.includes('SCHEDULE_SUBSCRIPTION_STATUS_SYNC_GRACE_MS'),
    'schedule.html 刚订阅后的短时间内不应被后端 status 读写延迟误清理'
);

console.log('test-schedule-subscription-ui passed');