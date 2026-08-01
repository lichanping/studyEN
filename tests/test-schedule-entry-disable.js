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

const scheduleManageHtml = read('schedule-students-manage.html');
const scheduleManageJs = read('schedule-students-manage.js');
const scheduleHtml = read('schedule.html');

const manageNormalizeBody = getFunctionBody(scheduleManageJs, 'normalizeEntry');
const manageStripBody = getFunctionBody(scheduleManageJs, 'stripForStorage');
const manageRenderBody = getFunctionBody(scheduleManageJs, 'renderTable');
const manageActionBody = getFunctionBody(scheduleManageJs, 'handleTableAction');

const getConfigBody = getFunctionBody(scheduleHtml, 'getConfig');
const renderDayEntriesBody = getFunctionBody(scheduleHtml, 'renderDayEntries');
const renderTodayBody = getFunctionBody(scheduleHtml, 'renderToday');
const renderWeekBody = getFunctionBody(scheduleHtml, 'renderWeek');
const sortEntriesByTimeBody = getFunctionBody(scheduleHtml, 'sortEntriesByTime');

assert(
    scheduleManageHtml.includes('<th>状态</th>'),
    'schedule-students-manage.html 应新增状态列，展示排课条目的启用/停排状态'
);

assert(
    manageNormalizeBody.includes('disabled: Boolean(entry.disabled)'),
    'schedule-students-manage.js 应在 normalizeEntry 中保留 disabled 字段'
);

assert(
    manageStripBody.includes('disabled: normalized.disabled'),
    'schedule-students-manage.js 持久化覆盖配置时应写回 disabled 字段'
);

assert(
    manageRenderBody.includes('entry-disabled')
        && manageRenderBody.includes('已停排')
        && manageRenderBody.includes('停排')
        && manageRenderBody.includes('启用'),
    'schedule-students-manage.js 列表应显示停排状态，并提供停排/启用切换入口'
);

assert(
    manageActionBody.includes('toggle-disabled')
        && manageActionBody.includes('target.disabled = !target.disabled')
        && manageActionBody.includes('persistEntries()'),
    'schedule-students-manage.js 应支持直接切换条目 disabled 状态并立即持久化'
);

assert(
    getConfigBody.includes('disabled: Boolean(entry?.disabled)'),
    'schedule.html 读取配置时应标准化 disabled 字段，避免旧配置缺省值影响渲染'
);

assert(
    scheduleHtml.includes('function isEntryDisabled(entry)'),
    'schedule.html 应提供 isEntryDisabled 帮助函数'
);

assert(
    sortEntriesByTimeBody.includes('isEntryDisabled'),
    'schedule.html 排序时应把 disabled 条目沉到底部，避免干扰当天有效排课'
);

assert(
    renderDayEntriesBody.includes('disabled-entry')
        && renderDayEntriesBody.includes('已停排')
        && renderDayEntriesBody.includes('button.disabled = true')
        && renderDayEntriesBody.includes('status.textContent = "已停排"')
        && renderDayEntriesBody.includes('scheduleStateLabel.textContent = courseScheduleState.text'),
    'schedule.html 今日/明日列表应灰显 disabled 条目，主状态显示已停排，且右侧匹配标签继续显示真实查询结果'
);

assert(
    renderTodayBody.includes('!isCancelled(item, baseDate) && !isEntryDisabled(item)')
        && renderTodayBody.includes('!isCancelled(item, tomorrowDate) && !isEntryDisabled(item)')
        && renderTodayBody.includes('停排'),
    'schedule.html 今日/明日应上统计应排除 disabled 条目，并显示停排数量'
);

assert(
    renderWeekBody.includes('!isCancelled(item, dayDate) && !isEntryDisabled(item)')
        && renderWeekBody.includes('dayDisabledCount')
        && renderWeekBody.includes('weekDisabledCount')
        && renderWeekBody.includes('停排'),
    'schedule.html 本周统计应排除 disabled 条目，并显示每日/每周停排数量'
);

assert(
    scheduleHtml.includes('.class-item.disabled-entry')
        && scheduleHtml.includes('.mini-item.disabled-entry'),
    'schedule.html 应为 disabled 条目提供独立灰显样式'
);

console.log('test-schedule-entry-disable passed');