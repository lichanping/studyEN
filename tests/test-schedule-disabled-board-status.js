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

const getCourseScheduleStateBody = getFunctionBody(scheduleHtml, 'getCourseScheduleState');
const renderDayEntriesBody = getFunctionBody(scheduleHtml, 'renderDayEntries');

assert(
    !getCourseScheduleStateBody.includes('isEntryDisabled(entry)'),
    'schedule.html 查询是否已排课时不应因 disabled 而短路，否则会覆盖真实的已排课/已完成状态'
);

assert(
    !renderDayEntriesBody.includes('scheduleStateLabel.className = "schedule-state-label state-disabled"')
        && !renderDayEntriesBody.includes('scheduleStateLabel.textContent = "已停排"'),
    'schedule.html disabled 行的排课匹配标签不应被改写成已停排，应继续显示已排课/未排课/已完成等查询结果'
);

assert(
    renderDayEntriesBody.includes('status.textContent = "已停排"')
        && renderDayEntriesBody.includes('button.textContent = "已停排"'),
    'schedule.html 停排态本身仍应通过主状态标签和操作按钮明确显示为已停排'
);

console.log('test-schedule-disabled-board-status passed');