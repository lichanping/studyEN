const assert = require('assert');
const fs = require('fs');
const path = require('path');

function read(fileName) {
    return fs.readFileSync(path.join(__dirname, '..', fileName), 'utf8');
}

function extractFunction(source, signature) {
    const start = source.indexOf(signature);
    if (start === -1) {
        throw new Error(`Unable to find function: ${signature}`);
    }

    const bodyStart = source.indexOf('{', start);
    if (bodyStart === -1) {
        throw new Error(`Unable to find function body for: ${signature}`);
    }

    let depth = 0;
    for (let index = bodyStart; index < source.length; index += 1) {
        const char = source[index];
        if (char === '{') depth += 1;
        if (char === '}') {
            depth -= 1;
            if (depth === 0) {
                return source.slice(start, index + 1);
            }
        }
    }

    throw new Error(`Unable to extract function: ${signature}`);
}

const commonFunctionsSource = read('commonFunctions.js');
const classFormalSource = read('classFormal.js');

const formatLocalDateYmdCode = extractFunction(commonFunctionsSource, 'export function formatLocalDateYmd');
const parseLocalDateYmdCode = extractFunction(commonFunctionsSource, 'export function parseLocalDateYmd');
const parseStoredDateToLocalDateCode = extractFunction(classFormalSource, 'function parseStoredDateToLocalDate');
const compareStoredDateCode = extractFunction(classFormalSource, 'function compareStoredDate');

const formatLocalDateYmd = new Function(
    `${formatLocalDateYmdCode.replace('export ', '')}; return formatLocalDateYmd;`
)();

const parseLocalDateYmd = new Function(
    `${parseLocalDateYmdCode.replace('export ', '')}; return parseLocalDateYmd;`
)();

const parseStoredDateToLocalDate = new Function(
    'parseLocalDateYmd',
    `${parseStoredDateToLocalDateCode}; return parseStoredDateToLocalDate;`
)(parseLocalDateYmd);

const compareStoredDate = new Function(
    'parseStoredDateToLocalDate',
    `${compareStoredDateCode}; return compareStoredDate;`
)(parseStoredDateToLocalDate);

assert.strictEqual(
    formatLocalDateYmd('2026-07-26T00:00'),
    '2026-07-26',
    '北京时间午夜整点的课堂反馈应保留当天日期'
);

assert.strictEqual(
    formatLocalDateYmd('2026-07-26T00:12'),
    '2026-07-26',
    '北京时间午夜后 12 分钟的课堂反馈应保留当天日期'
);

assert.strictEqual(
    formatLocalDateYmd('2026-07-26T23:59'),
    '2026-07-26',
    '北京时间深夜 23:59 的课堂反馈应仍保留当天日期'
);

const reviewDate = new Date('2026-07-26T00:12');
reviewDate.setDate(reviewDate.getDate() + 21);
assert.strictEqual(
    formatLocalDateYmd(reviewDate),
    '2026-08-16',
    '21 天抗遗忘复习日期应按本地日历日顺延，不能因 UTC 截断提前一天'
);

const parsedReviewDate = parseLocalDateYmd('2026-08-16');
assert(parsedReviewDate instanceof Date && !Number.isNaN(parsedReviewDate.getTime()), 'parseLocalDateYmd 应返回有效日期对象');
assert.strictEqual(parsedReviewDate.getFullYear(), 2026, 'parseLocalDateYmd 应保留年份');
assert.strictEqual(parsedReviewDate.getMonth(), 7, 'parseLocalDateYmd 应保留月份');
assert.strictEqual(parsedReviewDate.getDate(), 16, 'parseLocalDateYmd 应保留日期');
assert.strictEqual(parsedReviewDate.getHours(), 0, 'parseLocalDateYmd 应以本地零点解析 YYYY-MM-DD');

const storedBoundaryDate = parseStoredDateToLocalDate('2026-07-26');
assert.strictEqual(storedBoundaryDate.getFullYear(), 2026, '工资读取应保留存储日期年份');
assert.strictEqual(storedBoundaryDate.getMonth(), 6, '工资读取应保留存储日期月份');
assert.strictEqual(storedBoundaryDate.getDate(), 26, '工资读取应保留存储日期日');

const sortedDates = ['2026-07-26', '2026-07-25', '2026-08-01'].sort(compareStoredDate);
assert.deepStrictEqual(
    sortedDates,
    ['2026-07-25', '2026-07-26', '2026-08-01'],
    '工资记录排序应按本地存储日期先后排列'
);

console.log('test-local-date-regression passed');
