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

const renderWeekBody = getFunctionBody(scheduleHtml, 'renderWeek');

assert(
    scheduleHtml.includes('function getDisplayTimeText('),
    'schedule.html 应提供周视图可复用的显示时间函数，统一处理时间覆盖后的文案'
);

assert(
    renderWeekBody.includes('const sortedItems = sortEntriesByTime(items, dayDate);'),
    'schedule.html 本周视图应按有效上课时间排序，而不是继续使用原始 entries 顺序'
);

assert(
    renderWeekBody.includes('sortedItems.length') && renderWeekBody.includes('sortedItems.map((it) => {'),
    'schedule.html 本周视图应使用排序后的条目列表渲染'
);

assert(
    renderWeekBody.includes("getDisplayTimeText(it, dayDate)") && !renderWeekBody.includes("formatTime(it)"),
    'schedule.html 本周视图应显示覆盖后的实际上课时间，避免仍显示“上午/晚上”导致顺序与今日视图不一致'
);

console.log('test-schedule-weekly-time-override passed');