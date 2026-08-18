const assert = require('assert');
const fs = require('fs');
const path = require('path');

function read(fileName) {
    return fs.readFileSync(path.join(__dirname, '..', fileName), 'utf8');
}

function extractBlock(source, signature, openChar = '{', closeChar = '}') {
    const start = source.indexOf(signature);
    if (start === -1) {
        throw new Error(`Unable to find block: ${signature}`);
    }

    const bodyStart = source.indexOf(openChar, start);
    if (bodyStart === -1) {
        throw new Error(`Unable to find block body for: ${signature}`);
    }

    let depth = 0;
    for (let index = bodyStart; index < source.length; index += 1) {
        const char = source[index];
        if (char === openChar) depth += 1;
        if (char === closeChar) {
            depth -= 1;
            if (depth === 0) {
                return source.slice(start, index + 1);
            }
        }
    }

    throw new Error(`Unable to extract block: ${signature}`);
}

const commonFunctionsSource = read('commonFunctions.js');
const getBeijingDatePartsCode = extractBlock(commonFunctionsSource, 'function getBeijingDateParts');
const createBeijingDateCode = extractBlock(commonFunctionsSource, 'function createBeijingDate');
const resolveSelfReviewDeadlineCode = extractBlock(commonFunctionsSource, 'export function resolveSelfReviewDeadline');
const formatSelfReviewDeadlineLabelCode = extractBlock(commonFunctionsSource, 'export function formatSelfReviewDeadlineLabel');

const helpers = new Function(
    `${getBeijingDatePartsCode}
${createBeijingDateCode}
${resolveSelfReviewDeadlineCode.replace('export ', '')}
${formatSelfReviewDeadlineLabelCode.replace('export ', '')}
return { resolveSelfReviewDeadline, formatSelfReviewDeadlineLabel };`
)();

const at1930 = new Date('2026-08-18T11:30:00.000Z');
const at2110 = new Date('2026-08-18T13:10:00.000Z');
const at2200 = new Date('2026-08-18T14:00:00.000Z');
const at2335 = new Date('2026-08-18T15:35:00.000Z');

assert.strictEqual(
    helpers.formatSelfReviewDeadlineLabel(at1930),
    '今晚22:20前',
    '北京时间 19:30 时，截止时间应保持今晚22:20前'
);

assert.strictEqual(
    helpers.formatSelfReviewDeadlineLabel(at2110),
    '今晚23:10前',
    '北京时间 21:10 时，应顺延为今晚23:10前'
);

assert.strictEqual(
    helpers.formatSelfReviewDeadlineLabel(at2200),
    '明天10:00前',
    '北京时间 22:00 时，跨日后不应落在凌晨，最早应为明天10:00前'
);

assert.strictEqual(
    helpers.formatSelfReviewDeadlineLabel(at2335),
    '明天10:00前',
    '北京时间 23:35 时，跨日后不应落在凌晨，最早应为明天10:00前'
);

const deadlineAt2200 = helpers.resolveSelfReviewDeadline(at2200);
assert.strictEqual(deadlineAt2200.dayLabel, '明天', '跨日场景应切换为明天');
assert.strictEqual(deadlineAt2200.hour, 10, '跨日场景的最早小时应钳制到 10 点');
assert.strictEqual(deadlineAt2200.minute, 0, '跨日场景的最早分钟应钳制到 00');

console.log('test-self-review-deadline passed');