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

const monthlySummarySource = read('monthly-summary.js');
const indexSource = read('index.html');
const classFormalSource = read('classFormal.js');
const classReadSource = read('classRead.js');
const commonFunctionsSource = read('commonFunctions.js');
const prdPath = path.join(__dirname, '..', 'docs', 'PRD-monthly-summary.md');

assert(fs.existsSync(prdPath), 'docs/PRD-monthly-summary.md 应存在于当前分支');

const prdSource = fs.readFileSync(prdPath, 'utf8');
assert(
    prdSource.includes('仅统计抗遗忘复习的正确率/遗忘情况') && !prdSource.includes('newWordCorrectRate'),
    'refined PRD 应明确 P0 只统计抗遗忘复习的正确率/遗忘情况，且不新增正课字段'
);

assert(
    prdSource.includes('若学员姓名为 3 个字，月末总结报告正文中的学员称呼去掉姓氏，仅保留后 2 个字')
        && prdSource.includes('下载的 txt 文件名仍使用学员完整姓名'),
    'PRD 应明确三字学员名仅在月末总结报告正文中去姓，下载文件名仍保留全名'
);

assert(
    prdSource.includes('点击 `新版反馈` 后也会写入 `FeedbackDB.feedbackData[userName].feedbackEntries`')
        && prdSource.includes('点击 `新版反馈`：不再读取“遗忘词（英文+中文）”文本框做统计，直接读取“遗忘：”输入框里的数字'),
    'PRD 应明确新版反馈也会写入月末总结依赖的 feedbackEntries，且遗忘数直接读取遗忘输入框'
);

assert(
    prdSource.includes('正课遗忘词总数：`SUM(forgetNewWords)`')
        && prdSource.includes('正课新词掌握率 `>= 90%`')
        && prdSource.includes('当正课次数、累计学词、抗遗忘复盘次数均为 `0` 时，整份月末总结统一输出暖心寄语式鼓励文案'),
    'PRD 应明确月末总结统计正课遗忘词与掌握率，并覆盖 0 正课 + 0 复习的暖心寄语场景'
);

assert(
    indexSource.includes('id="monthlySummaryButton"')
        && indexSource.includes('id="recordLeaveButton"')
        && indexSource.includes('id="viewLeaveRecordsButton"'),
    'index.html 应提供月末总结、记录请假、查看请假记录三个入口'
);

assert(
    indexSource.includes('id="statsModeDay"')
        && indexSource.includes('id="statsModeMonth"')
        && indexSource.includes('id="statsMonthInput"'),
    'index.html 应提供按天/按月切换控件和月份选择器'
);

assert(
    indexSource.includes('monthly-summary.js')
        && indexSource.includes('monthlySummary.monthlySummaryOpen')
        && indexSource.includes('monthlySummary.recordLeaveOpen')
        && indexSource.includes('monthlySummary.viewLeaveRecordsOpen'),
    'index.html 应接线月末总结和请假管理入口'
);

assert(/export\s+function\s+monthlySummaryOpen/.test(monthlySummarySource), 'monthly-summary.js 应导出 monthlySummaryOpen');
assert(/export\s+function\s+recordLeaveOpen/.test(monthlySummarySource), 'monthly-summary.js 应导出 recordLeaveOpen');
assert(/export\s+function\s+viewLeaveRecordsOpen/.test(monthlySummarySource), 'monthly-summary.js 应导出 viewLeaveRecordsOpen');
assert(/export\s+function\s+resolveLeaveCountOverride/.test(monthlySummarySource), 'monthly-summary.js 应导出 resolveLeaveCountOverride');
assert(/export\s+function\s+getMonthDisplay/.test(monthlySummarySource), 'monthly-summary.js 应导出 getMonthDisplay');
assert(/export\s+function\s+summarizeFeedbackEntries/.test(monthlySummarySource), 'monthly-summary.js 应导出 summarizeFeedbackEntries');
assert(/export\s+function\s+generateImprovements/.test(monthlySummarySource), 'monthly-summary.js 应导出 generateImprovements');
assert(/export\s+function\s+getMonthlySummaryStudentDisplayName/.test(monthlySummarySource), 'monthly-summary.js 应导出 getMonthlySummaryStudentDisplayName');

assert(
    classFormalSource.includes('forgetWord')
        && classFormalSource.includes('correctRate')
        && classReadSource.includes('storeClassStatistics(')
        && commonFunctionsSource.includes('feedbackEntries'),
    '现有历史数据源应继续复用正式课和抗遗忘原始统计结构'
);

assert(
    commonFunctionsSource.includes('statsModeMonth')
        && commonFunctionsSource.includes('statsMonthInput')
        && classFormalSource.includes('statsModeMonth')
        && classFormalSource.includes('statsMonthInput'),
    '正课统计和抗遗忘统计都应支持按月模式'
);

const parseLocalDateYmdCode = extractBlock(monthlySummarySource, 'function parseLocalDateYmd');
const getMonthRangeCode = extractBlock(monthlySummarySource, 'function getMonthRange');
const calculateMonthlyClassStatsCode = extractBlock(monthlySummarySource, 'export function calculateMonthlyClassStats');
const getMonthDisplayCode = extractBlock(monthlySummarySource, 'export function getMonthDisplay');
const resolveLeaveCountOverrideCode = extractBlock(monthlySummarySource, 'export function resolveLeaveCountOverride');
const summarizeFeedbackEntriesCode = extractBlock(monthlySummarySource, 'export function summarizeFeedbackEntries');
const highlightsLibraryCode = extractBlock(monthlySummarySource, 'const HIGHLIGHTS_LIBRARY = [', '[', ']');
const improvementsLibraryCode = extractBlock(monthlySummarySource, 'const IMPROVEMENTS_LIBRARY = [', '[', ']');
const generateHighlightsCode = extractBlock(monthlySummarySource, 'export function generateHighlights');
const generateImprovementsCode = extractBlock(monthlySummarySource, 'export function generateImprovements');
const getMonthlySummaryStudentDisplayNameCode = extractBlock(monthlySummarySource, 'export function getMonthlySummaryStudentDisplayName');
const getAttendanceTextCode = extractBlock(monthlySummarySource, 'function getAttendanceText');
const getAntiForgettingTextCode = extractBlock(monthlySummarySource, 'function getAntiForgettingText');
const buildWarmMessageCode = extractBlock(monthlySummarySource, 'function buildWarmMessage');
const buildGoalsCode = extractBlock(monthlySummarySource, 'function buildGoals');
const buildMonthlySummaryReportCode = extractBlock(monthlySummarySource, 'function buildMonthlySummaryReport');
const buildPreviewHtmlCode = extractBlock(monthlySummarySource, 'function buildPreviewHtml');
const storeClassStatisticsCode = extractBlock(commonFunctionsSource, 'export function storeClassStatistics');

const calculateMonthlyClassStats = new Function(
    'localStorage',
    `${parseLocalDateYmdCode}\n${getMonthRangeCode}\n${calculateMonthlyClassStatsCode.replace('export ', '')}\nreturn calculateMonthlyClassStats;`
)({
    store: {
        '徐智浩_classStatistics': JSON.stringify({
            '2026-08-01': {
                date: '2026-08-01',
                type: '词汇课',
                newWord: 20,
                reviewWordCount: 5,
                duration: 1,
                forgetNewWords: 2
            },
            '2026-08-01_reading': {
                date: '2026-08-01',
                type: '阅读完型语法课',
                newWord: 8,
                reviewWordCount: 3,
                duration: 1
            },
            '2026-08-10_trial': {
                date: '2026-08-10',
                type: '体验课',
                newWord: 15,
                reviewWordCount: 0,
                duration: 0.5,
                forgetNewWords: 2
            },
            '2026-08-15': {
                date: '2026-08-15',
                type: '词汇课',
                newWord: 10,
                reviewWordCount: 4,
                duration: 0.5
            },
            '2026-07-30': {
                date: '2026-07-30',
                type: '词汇课',
                newWord: 100,
                reviewWordCount: 100,
                duration: 3
            }
        })
    },
    getItem(key) {
        return this.store[key] || null;
    }
});

const classStats = calculateMonthlyClassStats('徐智浩', '2026-08');
assert.strictEqual(classStats.classCount, 3, '月末总结应按日期去重统计正课次数，并包含体验课');
assert.strictEqual(classStats.totalDuration, 3, '月末总结应汇总所选月份内所有命中课时，并包含体验课');
assert.strictEqual(classStats.totalNewWords, 53, '月末总结应统计所选月份内的新词总量，并包含体验课');
assert.strictEqual(classStats.totalReviewWords, 12, '月末总结应统计所选月份内的复习词总量');
assert.strictEqual(classStats.totalWords, 65, '月末总结应输出新词与复习词总和，并包含体验课');
assert.strictEqual(classStats.totalForgetNewWords, 4, '月末总结应统计所选月份内正课遗忘词总量');
assert.strictEqual(classStats.newWordMasteryRate, 92, '月末总结应按月汇总计算正课新词掌握率，并兼容历史 forgetNewWords 缺失按 0 处理');

const getMonthDisplay = new Function(`${getMonthDisplayCode.replace('export ', '')}; return getMonthDisplay;`)();
const resolveLeaveCountOverride = new Function(`${resolveLeaveCountOverrideCode.replace('export ', '')}; return resolveLeaveCountOverride;`)();
const getMonthlySummaryStudentDisplayName = new Function(
    `${getMonthlySummaryStudentDisplayNameCode.replace('export ', '')}; return getMonthlySummaryStudentDisplayName;`
)();
const summarizeFeedbackEntries = new Function(
    `${parseLocalDateYmdCode}\n${getMonthRangeCode}\n${summarizeFeedbackEntriesCode.replace('export ', '')}\nreturn summarizeFeedbackEntries;`
)();
const generateHighlights = new Function(
    `${highlightsLibraryCode};\n${generateHighlightsCode.replace('export ', '')}\nreturn generateHighlights;`
)();
const generateImprovements = new Function(
    `${improvementsLibraryCode};\n${generateImprovementsCode.replace('export ', '')}\nreturn generateImprovements;`
)();
const buildGoals = new Function(`${buildGoalsCode}\nreturn buildGoals;`)();
const buildMonthlySummaryReport = new Function(
    `${getAttendanceTextCode}\n${getAntiForgettingTextCode}\n${buildWarmMessageCode}\n${buildMonthlySummaryReportCode}\nreturn buildMonthlySummaryReport;`
)();
const buildPreviewHtml = new Function(`${buildPreviewHtmlCode}\nreturn buildPreviewHtml;`)();

const antiForgettingStats = summarizeFeedbackEntries([
    '2026-08-02(周日): 80% | 10|8',
    '2026-08-09(周日): 90% | 10|9',
    '2026-08-20(周四): 100% | 5|5',
    '2026-07-28(周二): 50% | 10|5',
    'bad-data'
], '2026-08');

assert.strictEqual(antiForgettingStats.totalReviewed, 25, '月末总结应汇总所选月份内的抗遗忘复盘词数');
assert.strictEqual(antiForgettingStats.totalCorrect, 22, '月末总结应汇总所选月份内的正确词数');
assert.strictEqual(antiForgettingStats.correctRate, 88, '月末总结应基于原始 feedbackEntries 计算月度正确率');
assert.strictEqual(antiForgettingStats.sessionCount, 3, '月末总结应统计所选月份内的抗遗忘次数');
assert.strictEqual(antiForgettingStats.trend, 'rising', '月末总结应按周比较抗遗忘正确率趋势');

assert.strictEqual(getMonthDisplay('2026-08'), '8🈷️', '月末总结标题应使用 8🈷️ 这类月份展示格式');
assert.strictEqual(resolveLeaveCountOverride('', 3), 0, '手动清空请假输入框应视为 0 次请假');
assert.strictEqual(resolveLeaveCountOverride('0', 3), 0, '手动输入 0 应覆盖自动请假次数');
assert.strictEqual(resolveLeaveCountOverride('2', 3), 2, '手动输入正整数时应优先生效');
assert.strictEqual(getMonthlySummaryStudentDisplayName('徐智浩'), '智浩', '三字学员名在月末总结正文中应去掉姓氏');
assert.strictEqual(getMonthlySummaryStudentDisplayName('李响'), '李响', '两字学员名在月末总结正文中应保持原样');
assert.strictEqual(getMonthlySummaryStudentDisplayName('欧阳娜娜'), '欧阳娜娜', '非三字学员名在月末总结正文中不应裁剪');

const roundedEdgeStats = summarizeFeedbackEntries([
    '2026-08-05(周三): 100% | 10|10',
    '2026-08-06(周四): 100% | 200|200',
    '2026-08-07(周五): 90% | 10|9'
], '2026-08');
assert.strictEqual(roundedEdgeStats.correctRate, 100, '月末总结抗遗忘正确率应按汇总结果沿用全局四舍五入口径显示整数百分比');

const reportText = buildMonthlySummaryReport({
    reportStudentName: '智浩',
    monthDisplay: '8🈷️',
    classStats: {
        classCount: 3,
        totalDuration: 3,
        totalWords: 65,
        totalNewWords: 53,
        totalReviewWords: 12,
        totalForgetNewWords: 4,
        newWordMasteryRate: 92
    },
    antiForgettingStats: {
        totalReviewed: 25,
        correctRate: 88,
        forgetCount: 3
    },
    leaveCount: 1,
    highlights: ['▫️ 课堂专注认真，积极互动，单词疑问及时问，态度超赞👍'],
    improvements: ['▫️ 抗遗忘复盘次数还可以再加一些，尽量把复习频率提上来，记得会更牢🔄'],
    goals: ['下月增加抗遗忘复盘次数，尽量形成更稳定的复习节奏。'],
    allStats: {
        totalWords: 65,
        antiForgettingTotalReviewed: 25
    }
});

assert(reportText.startsWith('智浩学员8🈷️月末总结'), '月末总结标题中的三字学员名应去掉姓氏');
assert(reportText.includes('智浩本月累计学词65个，抗遗忘复盘25词。'), '月末总结寄语中的三字学员名应去掉姓氏');
assert(reportText.includes('本月正课遗忘词：4个，新词掌握率92%'), '月末总结 txt 正文应展示正课遗忘词和新词掌握率');
assert(
    monthlySummarySource.includes('link.download = `${userName}_${yearMonth}_月末总结.txt`;'),
    '月末总结下载文件名应继续使用学员完整姓名'
);

const previewHtml = buildPreviewHtml({
    classCount: 2,
    totalDuration: 1.5,
    totalWords: 163,
    totalNewWords: 63,
    totalReviewWords: 100,
    totalForgetNewWords: 7,
    newWordMasteryRate: 89
}, {
    totalReviewed: 220,
    correctRate: 99
});
assert(previewHtml.includes('正课遗忘词：7 个（新词掌握率 89%）'), '月末总结预览区应展示正课遗忘词和新词掌握率');

assert(
    generateHighlights({ antiForgettingCorrectRate: 80, classCount: 4, antiForgettingTrend: 'stable', totalDuration: 3, newWordMasteryRate: 90 }).some((text) => text.includes('本月新学内容掌握得比较扎实')),
    '正课新词掌握率达到 90% 时应命中掌握率闪光点'
);
assert(
    generateImprovements({ antiForgettingSessionCount: 14, classCount: 4, antiForgettingCorrectRate: 95 }).some((text) => text.includes('复盘次数还可以再加一些')),
    '抗遗忘次数少的阈值应为 < 15'
);
assert(
    !generateImprovements({ antiForgettingSessionCount: 15, classCount: 4, antiForgettingCorrectRate: 95 }).some((text) => text.includes('复盘次数还可以再加一些')),
    '抗遗忘次数达到 15 时不应再命中次数偏少提示'
);
assert(
    generateImprovements({ antiForgettingSessionCount: 20, classCount: 4, antiForgettingCorrectRate: 95, antiForgettingTrend: 'rising', newWordMasteryRate: 89 }).some((text) => text.includes('本月新学内容里还有一些词需要反复回看')),
    '正课新词掌握率低于 90% 时应命中掌握率提升点'
);
assert(
    !generateImprovements({ antiForgettingSessionCount: 0, classCount: 0, antiForgettingCorrectRate: 0, antiForgettingTrend: 'stable', newWordMasteryRate: null, totalWords: 0 }).some((text) => text.includes('本月正课次数偏少')),
    '0 正课 + 0 复习时小提升点不应出现“本月正课次数偏少”'
);

const zeroStatsReport = buildMonthlySummaryReport({
    reportStudentName: '小明',
    monthDisplay: '8🈷️',
    classStats: {
        classCount: 0,
        totalDuration: 0,
        totalWords: 0,
        totalNewWords: 0,
        totalReviewWords: 0,
        totalForgetNewWords: 0,
        newWordMasteryRate: null
    },
    antiForgettingStats: {
        totalReviewed: 0,
        correctRate: 0,
        forgetCount: 0,
        sessionCount: 0
    },
    leaveCount: 0,
    highlights: [],
    improvements: ['这个月我们先稍作调整，期待下个月一起把学习节奏慢慢找回来，继续稳稳往前走。'],
    goals: ['下月优先恢复稳定上课与复习安排，先把学习节奏重新建立起来。'],
    allStats: {
        totalWords: 0,
        antiForgettingTotalReviewed: 0,
        antiForgettingSessionCount: 0
    }
});

assert(zeroStatsReport.includes('本月暂无课堂与复习数据'), '0 正课 + 0 复习时月末总结应使用暖心寄语式鼓励文案');
assert(!zeroStatsReport.includes('全勤，出勤超棒'), '0 正课时月末总结不应输出全勤文案');

const reviewOnlyReport = buildMonthlySummaryReport({
    reportStudentName: '小明',
    monthDisplay: '8🈷️',
    classStats: {
        classCount: 0,
        totalDuration: 0,
        totalWords: 0,
        totalNewWords: 0,
        totalReviewWords: 0,
        totalForgetNewWords: 0,
        newWordMasteryRate: null
    },
    antiForgettingStats: {
        totalReviewed: 12,
        correctRate: 92,
        forgetCount: 1,
        sessionCount: 2
    },
    leaveCount: 0,
    highlights: ['▫️ 抗遗忘意识足，主动配合复盘，旧词巩固到位✅'],
    improvements: ['▫️ 本月正课次数偏少，下月可适当多安排一些课程，保持学习节奏更稳📚'],
    goals: ['下月适当增加正课安排，尽量保持每周稳定上课频率。'],
    allStats: {
        totalWords: 0,
        antiForgettingTotalReviewed: 12,
        antiForgettingSessionCount: 2
    }
});

assert(reviewOnlyReport.includes('本月暂未安排正课，但复习节奏仍在持续保持。'), '0 正课但有复习时应使用单独的鼓励文案');

assert(
    buildGoals({ classCount: 0, antiForgettingSessionCount: 0, antiForgettingCorrectRate: 0, antiForgettingTrend: 'stable', totalWords: 0, totalReviewed: 0 }).includes('下月优先恢复稳定上课与复习安排，先把学习节奏重新建立起来。'),
    '0 正课 + 0 复习时下月目标应优先恢复学习节奏'
);

const storageMock = {
    store: {
        '徐智浩_classStatistics': JSON.stringify({
            '2026-08-05': {
                newWord: 20,
                reviewWordCount: 5,
                duration: 1,
                platform: 'lixiaolaila',
                type: '词汇课'
            }
        })
    },
    getItem(key) {
        return this.store[key] || null;
    },
    setItem(key, value) {
        this.store[key] = value;
    }
};

const storeClassStatistics = new Function(
    'localStorage',
    'getCurrentSchedulePlatformId',
    `${storeClassStatisticsCode.replace('export ', '')}; return storeClassStatistics;`
)(storageMock, () => 'lixiaolaila');

storeClassStatistics('徐智浩', '2026-08-06', 18, 6, 1, '词汇课', 3);
const storedStats = JSON.parse(storageMock.store['徐智浩_classStatistics']);
assert.strictEqual(storedStats['2026-08-06'].forgetNewWords, 3, 'storeClassStatistics 应在原有记录结构中新增 forgetNewWords 字段');
assert.strictEqual(storedStats['2026-08-05'].type, '词汇课', 'storeClassStatistics 不应改写已有记录结构');

console.log('test-monthly-summary passed');