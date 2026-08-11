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
    scheduleHtml.includes('function subscribeAbnormalStudentEntry(')
        && scheduleHtml.includes('function unsubscribeAbnormalStudentEntry('),
    'schedule.html 应提供异常学生订阅 / 取消订阅逻辑'
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
    scheduleHtml.includes('function getAbnormalStudentSubscriptionSnapshot(')
        && scheduleHtml.includes('function clearResolvedAbnormalStudentSubscription('),
    'schedule.html 应维护异常学生订阅的本地快照与自动清理逻辑'
);

assert(
    scheduleHtml.includes('subscriptionType: "abnormal-student"')
        && scheduleHtml.includes('issueText: String(row?.issueText || "").trim()')
        && scheduleHtml.includes('sourceScopeLabel: String(row?.sourceScopeLabel || "").trim()')
        && scheduleHtml.includes('requiredQuota30: Number(row?.requiredQuota30 || 0)')
        && scheduleHtml.includes('requiredQuota60: Number(row?.requiredQuota60 || 0)')
        && scheduleHtml.includes('requiredAccompanyHours: Number(row?.requiredAccompanyHours || 0)')
        && scheduleHtml.includes('zeroFields: Array.isArray(row?.zeroFields) ? row.zeroFields.slice() : []'),
    'schedule.html 异常学生订阅请求应携带 subscriptionType、异常说明和额度缺口上下文'
);

assert(
    scheduleHtml.includes('已订阅异常学生课时不足提醒，将每1小时复查一次，最多提醒3次')
        && scheduleHtml.includes('showToast("已取消异常学生课时不足订阅"'),
    'schedule.html 异常学生订阅成功/取消提示应指向课时不足复查策略'
);

assert(
    scheduleHtml.includes('result?.summary?.skippedCount')
        && scheduleHtml.includes('result?.subscription?.lastError')
        && scheduleHtml.includes('已订阅，但首封提醒邮件发送失败：'),
    'schedule.html 订阅后若首封提醒邮件被跳过或发送失败，应展示真实诊断信息'
);

assert(
    renderDayEntriesBody.includes('每1小时检查一次')
        && renderDayEntriesBody.includes('最多提醒3次')
        && renderDayEntriesBody.includes('每1小时复查一次'),
    'schedule.html 订阅提示应显示每1小时复查且最多提醒3次'
);

assert(
    scheduleHtml.includes('已订阅未排课提醒，将每1小时复查一次，最多提醒3次')
        && !scheduleHtml.includes('已订阅未排课提醒，将每10分钟复查一次'),
    'schedule.html 订阅成功 toast 应与当前每1小时、最多3次的策略保持一致'
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

const clickHandlerMatch = renderDayEntriesBody.match(/subscriptionButton\.addEventListener\("click",\s*async\s*\(\)\s*=>\s*\{/);
assert(
    clickHandlerMatch,
    'schedule.html 订阅按钮应绑定 async click handler'
);
const clickHandlerStart = clickHandlerMatch.index;
let handlerDepth = 0;
let clickHandlerBody = '';
for (let i = renderDayEntriesBody.indexOf('{', clickHandlerStart); i < renderDayEntriesBody.length; i += 1) {
    if (renderDayEntriesBody[i] === '{') handlerDepth += 1;
    if (renderDayEntriesBody[i] === '}') handlerDepth -= 1;
    clickHandlerBody += renderDayEntriesBody[i];
    if (handlerDepth === 0) break;
}

assert(
    clickHandlerBody.includes('originalText')
        && clickHandlerBody.includes('subscriptionButton.textContent'),
    'schedule.html 订阅按钮 click handler 应保存 originalText 并在 loading 时切换按钮文字'
);

assert(
    clickHandlerBody.includes('订阅中')
        && clickHandlerBody.includes('取消中'),
    'schedule.html 订阅按钮点击后应显示"订阅中…"或"取消中…"作为 loading 反馈'
);

assert(
    clickHandlerBody.includes('originalText')
        && (clickHandlerBody.match(/originalText/g) || []).length >= 2,
    'schedule.html 订阅按钮失败时应恢复原始按钮文字（originalText 至少出现 2 次：保存、catch 恢复）'
);

assert(
    scheduleHtml.includes('.action-btn.subscribe:disabled')
        && scheduleHtml.includes('.action-btn.unsubscribe:disabled')
        && !scheduleHtml.includes('.action-btn:disabled {'),
    'schedule.html 应为订阅/取消订阅按钮单独定义 :disabled 样式，不影响其他 action-btn'
);

console.log('test-schedule-subscription-ui passed');