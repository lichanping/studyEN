const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

function read(relativePath) {
    return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
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

// ========================================
// Source loading
// ========================================
const commonFunctionsSource = read('commonFunctions.js');
const classFormalSource = read('classFormal.js');

// ========================================
// 1. getStatsDateRangeSelection — day mode
// ========================================
const getStatsDateRangeSelectionCode = extractBlock(commonFunctionsSource, 'export function getStatsDateRangeSelection');

function makeDayModeWindow(dayRangeValue, monthChecked, monthValue) {
    return {
        document: {
            getElementById(id) {
                if (id === 'daysRangeInput') return { value: String(dayRangeValue) };
                if (id === 'statsModeMonth') return monthChecked ? { checked: true } : { checked: false };
                if (id === 'statsMonthInput') return { value: monthValue || '' };
                return null;
            }
        }
    };
}

function runGetStatsDateRangeSelection(dayRangeValue, monthChecked, monthValue, now) {
    const doc = {
        getElementById(id) {
            if (id === 'daysRangeInput') return { value: String(dayRangeValue) };
            if (id === 'statsModeMonth') return monthChecked ? { checked: true } : { checked: false };
            if (id === 'statsMonthInput') return { value: monthValue || '' };
            return null;
        }
    };
    // Replace 'document.' with 'doc.' in the function body so it uses our mock
    const patchedCode = getStatsDateRangeSelectionCode
        .replace('export function getStatsDateRangeSelection(now = new Date())', 'function getStatsDateRangeSelection(document, now)');
    const fn = new Function('doc', 'now', `${patchedCode}\nreturn getStatsDateRangeSelection(doc, now);`);
    return fn(doc, now);
}

// Test: day mode, 7 days range
const now7 = new Date(2026, 7, 18, 10, 0, 0); // Aug 18, 2026 10:00
const day7Result = runGetStatsDateRangeSelection(7, false, '', now7);
assert.strictEqual(day7Result.mode, 'day', 'day mode should be "day"');
assert.strictEqual(day7Result.dayRange, 7, 'dayRange should be 7');
assert.strictEqual(day7Result.yearMonth, '', 'yearMonth should be empty in day mode');
assert.strictEqual(day7Result.startDate.getDate(), 12, '7-day range: start should be Aug 12');
assert.strictEqual(day7Result.startDate.getHours(), 0, 'start should be at 00:00:00.000');
assert.strictEqual(day7Result.endDate.getDate(), 18, '7-day range: end should be Aug 18');
assert.strictEqual(day7Result.endDate.getHours(), 23, 'end should be at 23:59:59.999');

// Test: day mode, 1 day range
const now1 = new Date(2026, 7, 18, 15, 30, 0);
const day1Result = runGetStatsDateRangeSelection(1, false, '', now1);
assert.strictEqual(day1Result.dayRange, 1, '1-day range: dayRange should be 1');
assert.strictEqual(day1Result.startDate.getDate(), 18, '1-day range: start should be same day');
assert.strictEqual(day1Result.endDate.getDate(), 18, '1-day range: end should be same day');

// Test: day mode, invalid dayRange defaults to 1
const dayInvalidResult = runGetStatsDateRangeSelection('abc', false, '', now7);
assert.strictEqual(dayInvalidResult.dayRange, 1, 'invalid dayRange should default to 1');

// Test: day mode, negative dayRange clamped to 1
const dayNegResult = runGetStatsDateRangeSelection(-5, false, '', now7);
assert.strictEqual(dayNegResult.dayRange, 1, 'negative dayRange should be clamped to 1');

// ========================================
// 2. getStatsDateRangeSelection — month mode
// ========================================
const monthResult = runGetStatsDateRangeSelection(7, true, '2026-08', now7);
assert.strictEqual(monthResult.mode, 'month', 'month mode should be "month"');
assert.strictEqual(monthResult.yearMonth, '2026-08', 'yearMonth should be 2026-08');
assert.strictEqual(monthResult.startDate.getMonth(), 7, 'month mode: start month should be Aug (0-indexed 7)');
assert.strictEqual(monthResult.startDate.getDate(), 1, 'month mode: start day should be 1');
assert.strictEqual(monthResult.startDate.getHours(), 0, 'month mode: start at 00:00');
assert.strictEqual(monthResult.endDate.getMonth(), 7, 'month mode: end month should be Aug');
assert.strictEqual(monthResult.endDate.getDate(), 31, 'month mode: end day should be 31 (Aug has 31 days)');
assert.strictEqual(monthResult.endDate.getHours(), 23, 'month mode: end at 23:59:59.999');

// Test: month mode, February (leap year 2024)
const febResult = runGetStatsDateRangeSelection(7, true, '2024-02', new Date(2024, 1, 15));
assert.strictEqual(febResult.endDate.getDate(), 29, 'Feb 2024 (leap year): end day should be 29');

// Test: month mode, February (non-leap year 2025)
const feb25Result = runGetStatsDateRangeSelection(7, true, '2025-02', new Date(2025, 1, 15));
assert.strictEqual(feb25Result.endDate.getDate(), 28, 'Feb 2025 (non-leap): end day should be 28');

// Test: month mode, invalid month value falls back to day mode
const invalidMonthResult = runGetStatsDateRangeSelection(7, true, 'invalid', now7);
assert.strictEqual(invalidMonthResult.mode, 'day', 'invalid month value should fall back to day mode');

// Test: month mode, month not checked falls back to day mode
const uncheckedResult = runGetStatsDateRangeSelection(7, false, '2026-08', now7);
assert.strictEqual(uncheckedResult.mode, 'day', 'unchecked month radio should fall back to day mode');

// ========================================
// 3. getStatsDateRangeSelection — NaN date
// ========================================
const nanResult = runGetStatsDateRangeSelection(7, false, '', new Date('invalid'));
assert.strictEqual(nanResult.mode, 'day', 'NaN date should return day mode');
assert.ok(Number.isNaN(nanResult.startDate.getTime()), 'NaN date: startDate should be NaN');
assert.ok(Number.isNaN(nanResult.endDate.getTime()), 'NaN date: endDate should be NaN');

// ========================================
// 4. resolveSelfReviewDeadline
// ========================================
const resolveSelfReviewDeadlineCode = extractBlock(commonFunctionsSource, 'export function resolveSelfReviewDeadline');
const getBeijingDatePartsCode = extractBlock(commonFunctionsSource, 'function getBeijingDateParts');
const createBeijingDateCode = extractBlock(commonFunctionsSource, 'function createBeijingDate');

const resolveFunc = new Function(
    `${getBeijingDatePartsCode}\n${createBeijingDateCode}\n${resolveSelfReviewDeadlineCode.replace('export ', '')}\nreturn resolveSelfReviewDeadline;`
)();
function beijingDate(year, month, day, hour, minute) {
    return new Date(Date.UTC(year, month - 1, day, hour - 8, minute || 0, 0, 0));
}

// Test: morning (10:00 Beijing) → deadline is tonight 22:20
const morningResult = resolveFunc(beijingDate(2026, 8, 18, 10, 0));
assert.strictEqual(morningResult.dayLabel, '今晚', 'morning: dayLabel should be 今晚');
assert.strictEqual(morningResult.hour, 22, 'morning: hour should be 22');
assert.strictEqual(morningResult.minute, 20, 'morning: minute should be 20');

// Test: afternoon (15:00 Beijing) → deadline is tonight 22:20
const afternoonResult = resolveFunc(beijingDate(2026, 8, 18, 15, 0));
assert.strictEqual(afternoonResult.dayLabel, '今晚', 'afternoon: dayLabel should be 今晚');
assert.strictEqual(afternoonResult.hour, 22, 'afternoon: hour should be 22');

// Test: 20:30 Beijing → less than 2h to 22:20, so deadline = now + 2h = 22:30
const lateResult = resolveFunc(beijingDate(2026, 8, 18, 20, 30));
assert.strictEqual(lateResult.dayLabel, '今晚', 'late evening: dayLabel should be 今晚');
assert.strictEqual(lateResult.hour, 22, 'late evening: hour should be 22');
assert.strictEqual(lateResult.minute, 30, 'late evening: minute should be 30 (20:30 + 2h)');

// Test: 21:00 Beijing → less than 2h to 22:20, deadline = 23:00 (same day, no clamp needed)
const veryLateResult = resolveFunc(beijingDate(2026, 8, 18, 21, 0));
assert.strictEqual(veryLateResult.dayLabel, '今晚', '21:00: dayLabel should be 今晚 (23:00 same day)');
assert.strictEqual(veryLateResult.hour, 23, '21:00: hour should be 23');
assert.strictEqual(veryLateResult.minute, 0, '21:00: minute should be 0');

// Test: 22:00 Beijing → less than 2h to 22:20, deadline = 00:00 next day
// Next day hour = 0 < 10, clamp to 10:00 → 明天 10:00
const midnightResult = resolveFunc(beijingDate(2026, 8, 18, 22, 0));
assert.strictEqual(midnightResult.dayLabel, '明天', '22:00: dayLabel should be 明天');
assert.strictEqual(midnightResult.hour, 10, '22:00: clamped to 10:00');
assert.strictEqual(midnightResult.minute, 0, '22:00: minute should be 0');

// Test: 22:30 Beijing → deadline = 00:30 next day, hour < 10, clamp to 10:00
const pastMidnightResult = resolveFunc(beijingDate(2026, 8, 18, 22, 30));
assert.strictEqual(pastMidnightResult.dayLabel, '明天', '22:30: dayLabel should be 明天');
assert.strictEqual(pastMidnightResult.hour, 10, '22:30: clamped to 10:00');
assert.strictEqual(pastMidnightResult.minute, 0, '22:30: minute should be 0');

// Test: 23:30 Beijing → deadline = 01:30 next day, hour < 10, clamp to 10:00
const lateNightResult = resolveFunc(beijingDate(2026, 8, 18, 23, 30));
assert.strictEqual(lateNightResult.dayLabel, '明天', '23:30: dayLabel should be 明天');
assert.strictEqual(lateNightResult.hour, 10, '23:30: clamped to 10:00');

// Test: NaN date → fallback default
const nanDeadlineResult = resolveFunc(new Date('invalid'));
assert.strictEqual(nanDeadlineResult.dayLabel, '今晚', 'NaN date: fallback dayLabel should be 今晚');
assert.strictEqual(nanDeadlineResult.hour, 22, 'NaN date: fallback hour should be 22');
assert.strictEqual(nanDeadlineResult.minute, 20, 'NaN date: fallback minute should be 20');

// ========================================
// 5. formatSelfReviewDeadlineLabel
// ========================================
const formatLabelCode = extractBlock(commonFunctionsSource, 'export function formatSelfReviewDeadlineLabel');
const formatLabelFunc = new Function(
    `${getBeijingDatePartsCode}\n${createBeijingDateCode}\n${resolveSelfReviewDeadlineCode.replace('export ', '')}\n${formatLabelCode.replace('export ', '')}\nreturn formatSelfReviewDeadlineLabel;`
)();

// Test: morning → 今晚22:20前
const morningLabel = formatLabelFunc(beijingDate(2026, 8, 18, 10, 0));
assert.strictEqual(morningLabel, '今晚22:20前', 'morning label should be 今晚22:20前');

// Test: very late (22:00) → 明天10:00前
const lateLabel = formatLabelFunc(beijingDate(2026, 8, 18, 22, 0));
assert.strictEqual(lateLabel, '明天10:00前', '22:00 label should be 明天10:00前');

// ========================================
// 6. selfReviewClick uses dynamic deadline
// ========================================
assert(
    commonFunctionsSource.includes('formatSelfReviewDeadlineLabel()'),
    'selfReviewClick 应使用动态截止时间 formatSelfReviewDeadlineLabel()'
);
assert(
    !commonFunctionsSource.includes('今晚22:20前'),
    'selfReviewClick 不应再硬编码 今晚22:20前'
);

// ========================================
// 7. classFormal.js uses getStatsDateRangeSelection
// ========================================
assert(
    classFormalSource.includes("getStatsDateRangeSelection"),
    'classFormal.js 应导入并使用 getStatsDateRangeSelection'
);

// Verify generateReport uses getStatsDateRangeSelection
const generateReportBlock = extractBlock(classFormalSource, 'export async function generateReport');
assert(
    generateReportBlock.includes('getStatsDateRangeSelection'),
    'generateReport 应使用 getStatsDateRangeSelection'
);
assert(
    !generateReportBlock.includes('statsModeMonth?.checked') || generateReportBlock.includes('getStatsDateRangeSelection'),
    'generateReport 不应再内联计算日期范围'
);

// Verify generateSalaryReport uses getStatsDateRangeSelection
const generateSalaryBlock = extractBlock(classFormalSource, 'export function generateSalaryReport');
assert(
    generateSalaryBlock.includes('getStatsDateRangeSelection'),
    'generateSalaryReport 应使用 getStatsDateRangeSelection'
);
assert(
    !generateSalaryBlock.includes('prompt('),
    'generateSalaryReport 不应再使用 prompt 输入月份'
);
assert(
    generateSalaryBlock.includes('statsPeriodLabel'),
    'generateSalaryReport 应使用 statsPeriodLabel 显示统计范围'
);
assert(
    generateSalaryBlock.includes('filePeriodLabel'),
    'generateSalaryReport 应使用 filePeriodLabel 作为文件名'
);
assert(
    generateSalaryBlock.includes("alert('所选统计范围内没有找到工资数据。')"),
    'generateSalaryReport 应在无数据时提示用户'
);

// Verify generateWordReport uses getStatsDateRangeSelection
const generateWordBlock = extractBlock(classFormalSource, 'export async function generateWordReport');
assert(
    generateWordBlock.includes('getStatsDateRangeSelection'),
    'generateWordReport 应使用 getStatsDateRangeSelection'
);
assert(
    generateWordBlock.includes('parseStoredDateToLocalDate'),
    'generateWordReport 应使用 parseStoredDateToLocalDate 解析日期'
);
assert(
    generateWordBlock.includes('periodLabel'),
    'generateWordReport 应使用 periodLabel 显示提示'
);

// Verify generateForgetWordsReport uses getStatsDateRangeSelection
const generateForgetBlock = extractBlock(classFormalSource, 'export async function generateForgetWordsReport');
assert(
    generateForgetBlock.includes('getStatsDateRangeSelection'),
    'generateForgetWordsReport 应使用 getStatsDateRangeSelection'
);
assert(
    generateForgetBlock.includes('parseStoredDateToLocalDate'),
    'generateForgetWordsReport 应使用 parseStoredDateToLocalDate 解析日期'
);

// ========================================
// 8. commonFunctions.js formatFeedbackContent uses getStatsDateRangeSelection
// ========================================
const formatFeedbackBlock = extractBlock(commonFunctionsSource, 'async function formatFeedbackContent');
assert(
    formatFeedbackBlock.includes('getStatsDateRangeSelection'),
    'formatFeedbackContent 应使用 getStatsDateRangeSelection'
);

// ========================================
// Summary
// ========================================
console.log('test-stats-mode-and-review-deadline passed');
