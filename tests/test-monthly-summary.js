const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

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

assert(monthlySummarySource.includes('export function saveIncompleteHomeworkRecord'), '应先实现按正课日期登记未交作业');
assert(!monthlySummarySource.includes("import { normalizeStudentName } from './student-name-alias.js'"), '姓名库为全局脚本，不能使用不存在的命名 export');
const homeworkStorage = new Map();
const homeworkContext = vm.createContext({
    Date,
    localStorage: {
        getItem: key => homeworkStorage.get(key) ?? null,
        setItem: (key, value) => homeworkStorage.set(key, value)
    },
    normalizeStudentName: value => String(value || '').trim(),
    formatLocalDateYmd: date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
});
vm.runInContext(read('student-name-alias.js'), homeworkContext);
vm.runInContext(monthlySummarySource.replace(/^import .*;$/gm, '').replace(/export /g, ''), homeworkContext);
const homeworkNow = new Date(2026, 9, 3);
const homeworkRecord = { platformId: 'baifendii', studentName: '杨开迪', classDate: '2026-10-01' };
homeworkContext.saveIncompleteHomeworkRecord(homeworkRecord, homeworkNow);
homeworkContext.saveIncompleteHomeworkRecord({ ...homeworkRecord, studentName: ' 杨开迪 ' }, homeworkNow);
homeworkContext.saveIncompleteHomeworkRecord({ ...homeworkRecord, classDate: '2026-10-02' }, homeworkNow);
homeworkContext.saveIncompleteHomeworkRecord({ ...homeworkRecord, platformId: 'other' }, homeworkNow);
homeworkContext.saveIncompleteHomeworkRecord({ ...homeworkRecord, studentName: '其他学生' }, homeworkNow);
homeworkContext.saveIncompleteHomeworkRecord({ ...homeworkRecord, classDate: '2026-09-30' }, homeworkNow);
assert.strictEqual(homeworkContext.readIncompleteHomeworkRecords().length, 5, '同日去重，但不同平台、学生应独立保存');
homeworkContext.saveIncompleteHomeworkRecord({ ...homeworkRecord, studentName: '硕硕' }, homeworkNow);
homeworkContext.saveIncompleteHomeworkRecord({ ...homeworkRecord, studentName: '俞新硕' }, homeworkNow);
assert.strictEqual(homeworkContext.summarizeIncompleteHomework(homeworkContext.readIncompleteHomeworkRecords(), 'baifendii', '硕硕', '2026-10-01', '2026-10-31').totalCount, 1, '复用真实姓名别名，同日不重复');
homeworkContext.deleteIncompleteHomeworkRecord({ ...homeworkRecord, studentName: '俞新硕' });
const storedHomework = JSON.parse(homeworkStorage.get('homework-review-incomplete-v1'));
assert.deepStrictEqual(Object.keys(storedHomework.records[0]).sort(), ['classDate', 'platformId', 'studentName']);
for (const classDate of ['', '2026-02-30', '2026-13-01', '2026-10-04', '2026-10-01extra']) {
    assert.throws(() => homeworkContext.saveIncompleteHomeworkRecord({ ...homeworkRecord, classDate }, homeworkNow), undefined, '无效和未来正课日期应拒绝保存');
}
assert.throws(() => homeworkContext.saveIncompleteHomeworkRecord({ ...homeworkRecord, studentName: '' }, homeworkNow));
const monthHomework = homeworkContext.summarizeIncompleteHomework(homeworkContext.readIncompleteHomeworkRecords(), 'baifendii', '杨开迪', '2026-10-01', '2026-10-31');
assert.strictEqual(monthHomework.totalCount, 2);
assert.deepStrictEqual(Array.from(monthHomework.dates), ['2026-10-01', '2026-10-02']);
const dayHomework = homeworkContext.summarizeIncompleteHomework(homeworkContext.readIncompleteHomeworkRecords(), 'baifendii', '杨开迪', '2026-10-02', '2026-10-03');
assert.deepStrictEqual(Array.from(dayHomework.dates), ['2026-10-02'], '日期边界包含首尾，不按登记日期归属');
const monthlyDisclosure = homeworkContext.buildIncompleteHomeworkReport('杨开迪', monthHomework, { yearMonth: '2026-10' });
const standaloneDisclosure = homeworkContext.buildIncompleteHomeworkReport('杨开迪', monthHomework, { startDate: '2026-10-01', endDate: '2026-10-31' });
assert.strictEqual(monthlyDisclosure, '一、课后复习提交情况\n本月登记未交作业 2 次，正课日期：\n1. 2026-10-01\n2. 2026-10-02', '月末披露应只包含精简 section、次数及正课日期');
assert.strictEqual(standaloneDisclosure, '【未交作业统计】\n学员：杨开迪\n统计范围：2026-10-01 至 2026-10-31\n未提交课后复习作业共 2 次，对应正课日期：\n1. 2026-10-01\n2. 2026-10-02\n以上根据当前保留的登记记录汇总。', '独立统计全文保持不变');
for (const report of [monthlyDisclosure, standaloneDisclosure]) {
    assert(report.includes('1. 2026-10-01\n2. 2026-10-02'));
    assert(!/平台|baifendii|百分缔/.test(report));
    assert(!report.includes('正课的课后复习未提交'), '明细不重复未交说明');
}
const emptyHomework = { totalCount: 0, dates: [] };
assert.strictEqual(homeworkContext.buildIncompleteHomeworkReport('杨开迪', emptyHomework, { yearMonth: '2026-10' }), '');
assert(homeworkContext.buildIncompleteHomeworkReport('杨开迪', emptyHomework, { startDate: '2026-10-01', endDate: '2026-10-31' }).includes('共 0 次（所选范围暂无登记记录）'));
homeworkContext.deleteIncompleteHomeworkRecord(homeworkRecord);
assert.strictEqual(homeworkContext.readIncompleteHomeworkRecords().length, 4);
assert.strictEqual(homeworkContext.summarizeIncompleteHomework(homeworkContext.readIncompleteHomeworkRecords(), 'baifendii', '杨开迪', '2026-10-01', '2026-10-31').totalCount, 1);
assert.strictEqual(homeworkContext.summarizeIncompleteHomework(homeworkContext.readIncompleteHomeworkRecords(), 'other', '杨开迪', '2026-10-01', '2026-10-31').totalCount, 1);
const homeworkBeforeCorruption = homeworkStorage.get('homework-review-incomplete-v1');
for (const invalidRaw of ['{', '{"version":2,"records":[]}', '{"version":1,"records":[{}]}']) {
    homeworkStorage.set('homework-review-incomplete-v1', invalidRaw);
    assert.throws(() => homeworkContext.readIncompleteHomeworkRecords(), undefined, '损坏数据不能降级成零记录');
    assert.throws(() => homeworkContext.saveIncompleteHomeworkRecord(homeworkRecord, homeworkNow));
    assert.strictEqual(homeworkStorage.get('homework-review-incomplete-v1'), invalidRaw);
}
homeworkStorage.set('homework-review-incomplete-v1', homeworkBeforeCorruption);
homeworkContext.localStorage.setItem = () => { throw new Error('quota'); };
assert.throws(() => homeworkContext.saveIncompleteHomeworkRecord(homeworkRecord, homeworkNow));
assert.strictEqual(homeworkStorage.get('homework-review-incomplete-v1'), homeworkBeforeCorruption, '写入失败不得改变原数据');

assert(indexSource.includes('id="recordIncompleteHomeworkButton"') && indexSource.includes('id="viewIncompleteHomeworkRecordsButton"'), '首页应提供精简登记和查看入口');
assert(indexSource.indexOf('id="viewLeaveRecordsButton"') < indexSource.indexOf('id="recordIncompleteHomeworkButton"'));
assert(indexSource.indexOf('id="downloadFileButton"') < indexSource.indexOf('id="incompleteHomeworkStatsButton"') && indexSource.indexOf('id="incompleteHomeworkStatsButton"') < indexSource.indexOf('id="downloadFormalButton"'), '未交统计紧接抗遗忘统计');
for (const handler of ['recordIncompleteHomeworkOpen', 'viewIncompleteHomeworkRecordsOpen', 'downloadIncompleteHomeworkStats']) {
    assert(indexSource.includes(`monthlySummary.${handler}`), '新增入口必须绑定实际处理函数');
    assert(monthlySummarySource.includes(`export function ${handler}`));
}
const homeworkHighlightStats = { totalDuration: 8, classCount: 1, antiForgettingCorrectRate: 80, antiForgettingTrend: 'stable', newWordMasteryRate: 95 };
const normalHomeworkHighlights = homeworkContext.generateHighlights(homeworkHighlightStats);
assert(normalHomeworkHighlights.some(line => line.includes('课后能主动打卡')));
assert.deepStrictEqual(Array.from(homeworkContext.generateHighlights({ ...homeworkHighlightStats, incompleteHomeworkCount: 2 })), Array.from(normalHomeworkHighlights).filter(line => !line.includes('课后能主动打卡')), '有记录时仅去掉冲突表扬');

async function testHomeworkReportOutputs() {
    homeworkContext.localStorage.setItem = (key, value) => homeworkStorage.set(key, value);
    homeworkContext.saveIncompleteHomeworkRecord(homeworkRecord, homeworkNow);
    const outputs = [];
    const inputs = { userName: { value: '杨开迪' }, monthlySummaryMonth: { value: '2026-10' }, monthlySummaryLeaves: { value: '0' }, platformSelect: { value: 'baifendii' } };
    homeworkContext.document = {
        getElementById: id => inputs[id] || null,
        createElement: () => ({ click() { outputs.push({ action: 'download', text: homeworkContext.lastBlob.parts.join(''), name: this.download }); } })
    };
    homeworkContext.window = { APP_MEETING_CONFIG: { getCurrentPlatformId: () => inputs.platformSelect.value } };
    homeworkContext.alert = message => outputs.push({ action: 'alert', text: message });
    homeworkContext.copyToClipboard = text => outputs.push({ action: 'copy', text });
    homeworkContext.showLongText = text => outputs.push({ action: 'show', text: text.replace(/<br>/g, '\n') });
    homeworkContext.Blob = class { constructor(parts) { this.parts = parts; homeworkContext.lastBlob = this; } };
    homeworkContext.URL = { createObjectURL: () => 'blob:test', revokeObjectURL() {} };
    homeworkContext.calculateMonthlyClassStats = () => ({ classCount: 0, totalWords: 0, totalDuration: 0, totalNewWords: 0, totalReviewWords: 0, totalForgetNewWords: 0, newWordMasteryRate: null });
    const noFeedback = { totalReviewed: 0, totalCorrect: 0, correctRate: 0, forgetCount: 0, sessionCount: 0, trend: 'stable' };
    homeworkContext.calculateMonthlyAntiForgettingStats = async () => noFeedback;
    await homeworkContext.generateMonthlySummary();
    assert.deepStrictEqual(outputs.map(output => output.action), ['copy', 'download', 'show']);
    assert.strictEqual(outputs[1].name, '杨开迪_2026-10_月末总结.txt', '月末总结文件名继续使用完整姓名');
    const expectedMonthlyReport = outputs[0].text;
    const expectedTitleAndDisclosure = '开迪学员10🈷️月末总结\n\n一、课后复习提交情况\n本月登记未交作业 2 次，正课日期：\n1. 2026-10-01\n2. 2026-10-02\n\n二、本月核心学习数据📊';
    assert(expectedMonthlyReport.startsWith(expectedTitleAndDisclosure), '零课堂数据仍应在标题下第一节披露');
    assert.deepStrictEqual(expectedMonthlyReport.match(/^[一二三四五]、/gm), ['一、', '二、', '三、', '四、', '五、'], '零课堂报告 section 应顺延且连续');
    assert(!/学员：|月份：|以上根据|【本月课后复习提交情况】/.test(expectedMonthlyReport), '月末披露不重复上下文和尾注');
    assert(outputs[0].text.includes('1. 2026-10-01\n2. 2026-10-02'));
    assert(outputs.every(output => output.text === outputs[0].text), '所有输出采用同一完整报告');
    assert(!/平台|baifendii|百分缔/.test(outputs[0].text + outputs[1].name));
    outputs.length = 0;
    homeworkContext.calculateMonthlyAntiForgettingStats = async () => { inputs.platformSelect.value = 'other'; return noFeedback; };
    await homeworkContext.generateMonthlySummary();
    assert(outputs.length === 1 && outputs[0].action === 'alert', '异步读取期间切换平台，不生成混合报告');
    inputs.platformSelect.value = 'baifendii';
    homeworkContext.calculateMonthlyAntiForgettingStats = async () => noFeedback;
    const previewNode = { style: {}, innerHTML: '', textContent: '', prepend(element) { this.prefix = element.textContent; } };
    inputs.monthlySummaryPreview = previewNode;
    const createDownloadElement = homeworkContext.document.createElement;
    homeworkContext.document.createElement = tag => tag === 'div' ? { style: {}, textContent: '' } : createDownloadElement();
    await homeworkContext.previewMonthlySummaryData();
    assert.strictEqual(previewNode.textContent, expectedMonthlyReport, '有记录时预览应与完整报告使用同一顺序和内容');
    const zeroClassStats = homeworkContext.calculateMonthlyClassStats;
    homeworkContext.calculateMonthlyClassStats = () => ({ classCount: 2, totalWords: 30, totalDuration: 8, totalNewWords: 20, totalReviewWords: 10, totalForgetNewWords: 1, newWordMasteryRate: 95 });
    outputs.length = 0;
    await homeworkContext.generateMonthlySummary();
    assert(outputs[0].text.startsWith(expectedTitleAndDisclosure), '有课堂数据时仍在标题下第一节披露');
    assert.deepStrictEqual(outputs[0].text.match(/^[一二三四五]、/gm), ['一、', '二、', '三、', '四、', '五、']);
    assert(outputs[0].text.includes('本月正课次数：2节，共8小时'), '原学习统计正文不变');
    assert(!outputs[0].text.includes('课后能主动打卡'), '编号调整不影响已有表扬屏蔽规则');
    await homeworkContext.previewMonthlySummaryData();
    assert.strictEqual(previewNode.textContent, outputs[0].text, '有课堂数据时预览与输出也保持一致');
    homeworkContext.calculateMonthlyClassStats = zeroClassStats;
    const retainedRecords = homeworkStorage.get('homework-review-incomplete-v1');
    homeworkStorage.set('homework-review-incomplete-v1', JSON.stringify({ version: 1, records: [] }));
    outputs.length = 0;
    await homeworkContext.generateMonthlySummary();
    const originalMonthlyReport = expectedMonthlyReport
        .replace(`${monthlyDisclosure}\n\n`, '')
        .replace(/^二、本月核心学习数据/m, '一、本月核心学习数据')
        .replace(/^三、本月表现点评/m, '二、本月表现点评')
        .replace(/^四、下月小目标/m, '三、下月小目标')
        .replace(/^五、教练暖心寄语/m, '四、教练暖心寄语');
    assert.strictEqual(outputs[0].text, originalMonthlyReport, '无记录时原标题、编号和正文逐字不变');
    assert.deepStrictEqual(outputs[0].text.match(/^[一二三四五]、/gm), ['一、', '二、', '三、', '四、']);
    await homeworkContext.previewMonthlySummaryData();
    assert.strictEqual(previewNode.innerHTML, homeworkContext.buildPreviewHtml(zeroClassStats(), noFeedback), '无记录时预览保留原数据摘要');
    assert.strictEqual(previewNode.textContent, '', '删除全部记录后预览不得保留之前的披露');
    homeworkStorage.set('homework-review-incomplete-v1', retainedRecords);
    outputs.length = 0;
    homeworkContext.getStatsDateRangeSelection = () => ({ startDate: new Date(2026, 9, 1), endDate: new Date(2026, 9, 31) });
    homeworkContext.downloadIncompleteHomeworkStats();
    assert.deepStrictEqual(outputs.map(output => output.action), ['copy', 'download', 'show']);
    assert(outputs[0].text.includes('共 2 次，对应正课日期：'));
    assert(outputs.every(output => output.text === outputs[0].text));
    outputs.length = 0;
    homeworkContext.getStatsDateRangeSelection = () => ({ startDate: new Date(2026, 9, 2), endDate: new Date(2026, 9, 3) });
    homeworkContext.downloadIncompleteHomeworkStats();
    assert(outputs[0].text.includes('共 1 次，对应正课日期：\n1. 2026-10-02'));
    outputs.length = 0;
    homeworkContext.getStatsDateRangeSelection = () => ({ startDate: new Date(2026, 8, 1), endDate: new Date(2026, 8, 29) });
    homeworkContext.downloadIncompleteHomeworkStats();
    assert(outputs[0].text.includes('共 0 次（所选范围暂无登记记录）'));
    outputs.length = 0;
    homeworkStorage.set('homework-review-incomplete-v1', '{');
    await homeworkContext.generateMonthlySummary();
    assert(outputs.length === 1 && outputs[0].action === 'alert', '损坏记录不得遗漏披露后生成报告');
    console.log('homework report integration passed');
}
testHomeworkReportOutputs().catch(error => { console.error(error); process.exitCode = 1; });

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
    prdSource.includes('抗遗忘复盘次数由系统规则决定，不将“提高复盘次数”作为对学员的直接要求')
        && prdSource.includes('月末总结需优先强调课后作业落实、每日复习打卡与家长跟进的重要性'),
    'PRD 应明确月末总结不再要求学员提高系统复盘次数，而是强调课后作业落实'
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
assert(
    monthlySummarySource.includes("function getPreferredMonthlySummaryMonth()")
        && monthlySummarySource.includes("const statsModeMonth = document.getElementById('statsModeMonth');")
        && monthlySummarySource.includes("const statsMonthInput = document.getElementById('statsMonthInput');")
        && monthlySummarySource.includes('const initialMonth = getPreferredMonthlySummaryMonth();')
        && monthlySummarySource.includes('const autoLeaveCount = getLeaveCount(userName, initialMonth);')
        && monthlySummarySource.includes('value="${initialMonth}"'),
    '月末总结按钮打开弹窗时，应优先继承统计区已选择的按月月份'
);
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
        && commonFunctionsSource.includes('getStatsDateRangeSelection')
        && classFormalSource.includes('getStatsDateRangeSelection'),
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
const getFormalStudyTextCode = extractBlock(monthlySummarySource, 'function getFormalStudyText');
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
    `${getAttendanceTextCode}\n${getAntiForgettingTextCode}\n${getFormalStudyTextCode}\n${buildWarmMessageCode}\n${buildMonthlySummaryReportCode}\nreturn buildMonthlySummaryReport;`
)();
const buildPreviewHtml = new Function(`${getAntiForgettingTextCode}\n${getFormalStudyTextCode}\n${buildPreviewHtmlCode}\nreturn buildPreviewHtml;`)();

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
    improvements: ['▫️ 课后作业和每日复习打卡还需要继续落实，尽量把当天作业按时完成、及时巩固，记得会更牢🔄'],
    goals: ['下月继续加强课后作业落实与每日复习打卡，尽量把当天新学内容及时巩固。'],
    allStats: {
        totalWords: 65,
        antiForgettingTotalReviewed: 25
    }
});

assert(reportText.startsWith('智浩学员8🈷️月末总结'), '月末总结标题中的三字学员名应去掉姓氏');
assert(reportText.includes('智浩本月累计学词65个，抗遗忘复盘25词。'), '月末总结寄语中的三字学员名应去掉姓氏');
assert(reportText.includes('学员本月请假1次，整体出勤稳定。'), '月末总结请假文案应明确是学员请假，避免歧义');
assert(reportText.includes('本月累计学单词：65个（新词学习53个+旧词巩固12个），累计遗忘4词，综合正确率92%。'), '月末总结 txt 正文应将正课学习汇总为与抗遗忘一致的单行格式');
assert(
    reportText.includes('课后作业和每日复习打卡还需要继续落实，尽量把当天作业按时完成、及时巩固，记得会更牢🔄'),
    '月末总结小提升点应强调课后作业落实，而不是要求提高系统复盘次数'
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
    correctRate: 99,
    forgetCount: 11
});
assert(previewHtml.includes('累计学单词：163个（新词学习63个+旧词巩固100个），累计遗忘7词，综合正确率89%'), '月末总结预览区应按单行格式展示正课遗忘词和正确率');
assert(previewHtml.includes('抗遗忘复盘：220 词，累计遗忘11词，综合正确率99%'), '月末总结预览区应展示抗遗忘累计遗忘词和正确率');

assert(
    generateHighlights({ antiForgettingCorrectRate: 80, classCount: 4, antiForgettingTrend: 'stable', totalDuration: 3, newWordMasteryRate: 90 }).some((text) => text.includes('本月新学内容掌握得比较扎实')),
    '正课新词掌握率达到 90% 时应命中掌握率闪光点'
);
assert(
    generateImprovements({ antiForgettingSessionCount: 14, classCount: 4, antiForgettingCorrectRate: 95 }).some((text) => text.includes('课后作业和每日复习打卡还需要继续落实')),
    '抗遗忘次数少的场景应转为强调课后作业落实，而不是要求提高系统复盘次数'
);
assert(
    !generateImprovements({ antiForgettingSessionCount: 15, classCount: 4, antiForgettingCorrectRate: 95 }).some((text) => text.includes('课后作业和每日复习打卡还需要继续落实')),
    '抗遗忘次数达到 15 时不应再命中课后作业落实提示'
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
assert.strictEqual((zeroStatsReport.match(/这个月我们先稍作调整，期待下个月一起把学习节奏慢慢找回来，继续稳稳往前走。/g) || []).length, 1, '0 正课 + 0 复习时同一句暖心文案不应在 txt 中重复出现');
assert(!zeroStatsReport.includes('📌 小提升点'), '0 正课 + 0 复习时 txt 应省略冗余的小提升点段落');

const zeroStatsWithLeaveReport = buildMonthlySummaryReport({
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
    leaveCount: 1,
    highlights: [],
    improvements: ['这个月我们先稍作调整，期待下个月一起把学习节奏慢慢找回来，继续稳稳往前走。'],
    goals: ['下月优先恢复稳定上课与复习安排，先把学习节奏重新建立起来。'],
    allStats: {
        totalWords: 0,
        antiForgettingTotalReviewed: 0,
        antiForgettingSessionCount: 0
    }
});

assert(zeroStatsWithLeaveReport.includes('学员本月请假1次'), '0 正课 + 0 复习但有请假时，月末总结仍应展示学员请假信息');

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