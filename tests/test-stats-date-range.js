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

function formatYmd(date) {
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0')
    ].join('-');
}

function createDocumentMock({ monthChecked, monthValue, dayRange }) {
    return {
        getElementById(id) {
            if (id === 'statsModeMonth') {
                return { checked: monthChecked };
            }
            if (id === 'statsMonthInput') {
                return { value: monthValue };
            }
            if (id === 'daysRangeInput') {
                return { value: String(dayRange) };
            }
            return null;
        }
    };
}

const commonFunctionsSource = read('commonFunctions.js');
const classFormalSource = read('classFormal.js');

const getStatsDateRangeSelectionCode = extractBlock(commonFunctionsSource, 'export function getStatsDateRangeSelection');
const getStatsDateRangeSelection = new Function(
    'document',
    `${getStatsDateRangeSelectionCode.replace('export ', '')}\nreturn getStatsDateRangeSelection;`
)(createDocumentMock({ monthChecked: false, monthValue: '2026-08', dayRange: 7 }));

const dayRange = getStatsDateRangeSelection(new Date(2026, 7, 18, 22, 0, 0));
assert.strictEqual(dayRange.mode, 'day', '按天模式应返回 day');
assert.strictEqual(dayRange.dayRange, 7, '按天模式应保留当前输入天数');
assert.strictEqual(formatYmd(dayRange.startDate), '2026-08-12', '按天模式应包含今天在内的最近 N 天');
assert.strictEqual(formatYmd(dayRange.endDate), '2026-08-18', '按天模式结束日期应为当天');

const getMonthRange = new Function(
    'document',
    `${getStatsDateRangeSelectionCode.replace('export ', '')}\nreturn getStatsDateRangeSelection;`
)(createDocumentMock({ monthChecked: true, monthValue: '2026-08', dayRange: 1 }));

const monthRange = getMonthRange(new Date(2026, 7, 18, 22, 0, 0));
assert.strictEqual(monthRange.mode, 'month', '按月模式应返回 month');
assert.strictEqual(monthRange.yearMonth, '2026-08', '按月模式应保留月份输入');
assert.strictEqual(formatYmd(monthRange.startDate), '2026-08-01', '按月模式起始日期应为月初');
assert.strictEqual(formatYmd(monthRange.endDate), '2026-08-31', '按月模式结束日期应为月末');

const formatFeedbackContentCode = extractBlock(commonFunctionsSource, 'async function formatFeedbackContent');
const generateReportCode = extractBlock(classFormalSource, 'export async function generateReport');
const generateWordReportCode = extractBlock(classFormalSource, 'export async function generateWordReport');
const generateForgetWordsReportCode = extractBlock(classFormalSource, 'export async function generateForgetWordsReport');
const generateSalaryReportCode = extractBlock(classFormalSource, 'export function generateSalaryReport');

assert(/getStatsDateRangeSelection\(/.test(formatFeedbackContentCode), '抗遗忘统计详情应复用统一日期范围 helper');
assert(/getStatsDateRangeSelection\(/.test(generateReportCode), '正课统计应复用统一日期范围 helper');
assert(/getStatsDateRangeSelection\(/.test(generateWordReportCode), '导出 Word 应复用统一日期范围 helper');
assert(/getStatsDateRangeSelection\(/.test(generateForgetWordsReportCode), '导出遗忘 Word 应复用统一日期范围 helper');
assert(/getStatsDateRangeSelection\(/.test(generateSalaryReportCode), '工资统计应复用统一日期范围 helper');

console.log('test-stats-date-range passed');