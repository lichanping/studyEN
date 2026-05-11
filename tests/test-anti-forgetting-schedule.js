/**
 * 抗遗忘复习计划核对 - 单元测试
 * 
 * 测试核心算法：
 * 1. calculateReviewSchedule - 从训练记录生成复习计划
 * 2. compareSchedules - 对比预期和实际复习计划
 * 3. calculateExpectedReviews - 计算指定日期的预期复习
 * 
 * 运行方式: node tests/test-anti-forgetting-schedule.js
 */

const fs = require('fs');
const path = require('path');

// ==================== 模拟核心函数 ====================

const REVIEW_OFFSETS = [1, 2, 3, 6, 9, 12, 15, 17, 19, 21];

function addDays(date, days) {
    const result = new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
    return result;
}

function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function parseDate(str) {
    if (!str) return null;
    // Use date-only parsing to avoid timezone issues
    const parts = str.split('-');
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
}

function extractTrainingDateFromRecord(record) {
    const raw = record?.trainingTime || record?.trainingDate || record?.date || record?.orderTime || record?.scheduleTime;
    if (!raw) return null;

    if (typeof raw === 'string') {
        const ymd = raw.slice(0, 10);
        if (/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
            return parseDate(ymd);
        }
    }

    const dt = new Date(raw);
    if (Number.isNaN(dt.getTime())) return null;
    return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
}

function calculateReviewSchedule(trainingRecords, targetStudent) {
    const reviewSchedule = new Map(); // Date -> [reviewItems]
    
    trainingRecords.forEach(record => {
        const studentName = (record.userName || record.studentName || record.trainerName || record.student?.name || '').trim();
        if (studentName !== targetStudent) return;
        
        const trainingDate = extractTrainingDateFromRecord(record);
        if (!trainingDate) return;
        
        // Use date-only to avoid timezone issues
        const today = new Date();
        const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        
        REVIEW_OFFSETS.forEach(offset => {
            const reviewDate = addDays(trainingDate, offset);
            if (reviewDate < todayDate) return;
            
            const reviewItem = {
                trainingDate: formatDate(trainingDate),
                reviewDate: formatDate(reviewDate),
                offset: offset,
                student: studentName,
                courseType: record.courseName || record.type || record.category || '词汇课'
            };
            
            if (!reviewSchedule.has(reviewDate.getTime())) {
                reviewSchedule.set(reviewDate.getTime(), []);
            }
            reviewSchedule.get(reviewDate.getTime()).push(reviewItem);
        });
    });
    
    return reviewSchedule;
}

function calculateExpectedReviews(trainingDate, startDate, endDate) {
    const result = new Map(); // Date -> [reviewItems]
    
    const tDate = parseDate(trainingDate);
    if (!tDate) return result;
    
    const sDate = parseDate(startDate);
    const eDate = parseDate(endDate);
    if (!sDate || !eDate) return result;
    
    REVIEW_OFFSETS.forEach(offset => {
        const reviewDate = addDays(tDate, offset);
        if (reviewDate >= sDate && reviewDate <= eDate) {
            const item = {
                trainingDate: formatDate(tDate),
                reviewDate: formatDate(reviewDate),
                offset: offset,
                courseType: '词汇课'
            };
            if (!result.has(reviewDate.getTime())) {
                result.set(reviewDate.getTime(), []);
            }
            result.get(reviewDate.getTime()).push(item);
        }
    });
    
    return result;
}

// Helper functions for Map operations with Date keys
function mapHasByDate(map, dateStr) {
    const target = parseDate(dateStr);
    if (!target) return false;
    for (const key of map.keys()) {
        const keyDate = new Date(key);
        if (keyDate.getFullYear() === target.getFullYear() &&
            keyDate.getMonth() === target.getMonth() &&
            keyDate.getDate() === target.getDate()) {
            return true;
        }
    }
    return false;
}

function mapGetByDate(map, dateStr) {
    const target = parseDate(dateStr);
    if (!target) return undefined;
    for (const [key, value] of map.entries()) {
        const keyDate = new Date(key);
        if (keyDate.getFullYear() === target.getFullYear() &&
            keyDate.getMonth() === target.getMonth() &&
            keyDate.getDate() === target.getDate()) {
            return value;
        }
    }
    return undefined;
}

function compareSchedules(expectedSchedule, actualList) {
    const diff = {
        normal: [],
        missing: [],
        extra: [],
        summary: { normal: 0, missing: 0, extra: 0 }
    };
    
    const actualMap = new Map();
    actualList.forEach(item => {
        const reviewDate = parseDate(item.reviewDate || item.date);
        if (!reviewDate) return;
        const key = reviewDate.getTime();
        if (!actualMap.has(key)) {
            actualMap.set(key, []);
        }
        actualMap.get(key).push(item);
    });
    
    const processedReviewDates = new Set();

    expectedSchedule.forEach((items, reviewDateKey) => {
        processedReviewDates.add(reviewDateKey);
        const reviewDate = new Date(reviewDateKey);
        const reviewDateStr = formatDate(reviewDate);
        const actualItems = actualMap.get(reviewDateKey) || [];

        const expectedByTrainingDate = new Map();
        items.forEach((item) => {
            const key = String(item?.trainingDate || '').trim();
            if (!key) return;
            if (!expectedByTrainingDate.has(key)) expectedByTrainingDate.set(key, item);
        });

        const actualByTrainingDate = new Map();
        actualItems.forEach((item) => {
            const key = String(item?.trainingDate || item?.sourceDate || '').trim();
            if (!key) return;
            if (!actualByTrainingDate.has(key)) actualByTrainingDate.set(key, item);
        });

        expectedByTrainingDate.forEach((expected, trainingDate) => {
            if (actualByTrainingDate.has(trainingDate)) {
                diff.normal.push({ ...expected, status: 'normal' });
                diff.summary.normal++;
            } else {
                diff.missing.push({ ...expected, status: 'missing' });
                diff.summary.missing++;
            }
        });

        actualByTrainingDate.forEach((actual, trainingDate) => {
            if (!expectedByTrainingDate.has(trainingDate)) {
                diff.extra.push({
                    ...actual,
                    reviewDate: reviewDateStr,
                    status: 'extra',
                    expectedOffsets: []
                });
                diff.summary.extra++;
            }
        });
    });

    actualMap.forEach((items, reviewDateKey) => {
        if (processedReviewDates.has(reviewDateKey)) return;
        const reviewDateStr = formatDate(new Date(reviewDateKey));
        items.forEach(actual => {
            diff.extra.push({
                ...actual,
                reviewDate: reviewDateStr,
                status: 'extra',
                expectedOffsets: []
            });
            diff.summary.extra++;
        });
    });
    
    return diff;
}

// ==================== 测试框架 ====================

let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`  ✅ ${message}`);
        passed++;
    } else {
        console.log(`  ❌ ${message}`);
        failed++;
    }
}

function assertEqual(actual, expected, message) {
    if (actual === expected) {
        console.log(`  ✅ ${message}`);
        passed++;
    } else {
        console.log(`  ❌ ${message}`);
        console.log(`      期望 = ${expected}`);
        console.log(`      实际 = ${actual}`);
        failed++;
    }
}

// ==================== 测试用例 ====================

console.log('=======================================');
console.log('抗遗忘复习计划核对 - 单元测试');
console.log('========================================\n');

// ---------- calculateReviewSchedule 基础功能 ----------
console.log('📦 calculateReviewSchedule - 基础功能');

const baseRecords = [
    { userName: '测试学生', trainingTime: '2027-06-01', courseName: '词汇课' }
];
const baseSchedule = calculateReviewSchedule(baseRecords, '测试学生');

const baseDate = parseDate('2027-06-01');
for (let i = 0; i < REVIEW_OFFSETS.length; i++) {
    const offset = REVIEW_OFFSETS[i];
    const expectedDate = addDays(baseDate, offset);
    const expectedFormatted = formatDate(expectedDate);
    
    assert(mapHasByDate(baseSchedule, expectedFormatted), `包含 T+${offset} = ${expectedFormatted}`);
}

assertEqual(baseSchedule.size, REVIEW_OFFSETS.length, 
    `复习日期数量 = ${REVIEW_OFFSETS.length}，实际 = ${baseSchedule.size}`);

console.log('\n📦 anti-forgetting.html - 回归防护');
const antiForgettingHtml = fs.readFileSync(path.join(__dirname, '..', 'anti-forgetting.html'), 'utf8');
const extractFunctionStart = antiForgettingHtml.indexOf('function extractTrainingDateFromRecord(record)');
const extractFunctionEnd = antiForgettingHtml.indexOf('function fetchCompletedTrainingRecords(token, userId)', extractFunctionStart);
const extractFunctionContent = extractFunctionStart >= 0 && extractFunctionEnd > extractFunctionStart
    ? antiForgettingHtml.slice(extractFunctionStart, extractFunctionEnd)
    : '';
assert(
    extractFunctionContent.includes('record?.scheduleTime'),
    'extractTrainingDateFromRecord 必须兼容 scheduleTime 字段（防止 expected 被算空）'
);
assert(
    antiForgettingHtml.includes('<script src="./student-name-alias.js"></script>') || antiForgettingHtml.includes("student-name-alias.js"),
    'anti-forgetting.html 应接入共享姓名映射 student-name-alias.js'
);
assert(
    antiForgettingHtml.includes('normalizeStudentName('),
    'anti-forgetting.html 应在核对逻辑中使用 normalizeStudentName'
);
assert(
    antiForgettingHtml.includes('✅ 正常（按计划已排）'),
    'renderScheduleCheckResult 应展示正常列表，且位置在异常列表之后'
);
const reviewPanelIndex = antiForgettingHtml.indexOf('id="reviewScheduleCheckPanel"');
const checkButtonIndex = antiForgettingHtml.indexOf('id="checkReviewScheduleBtn"');
assert(
    reviewPanelIndex > checkButtonIndex,
    '核对结果 Section 应位于“核对复习计划”按钮下方就地展示'
);
assert(
    antiForgettingHtml.includes('id="reviewScheduleCollapseToggle"'),
    '核对结果应提供折叠开关按钮'
);
assert(
    antiForgettingHtml.includes('id="reviewScheduleCollapseBody"') && antiForgettingHtml.includes('display:none;'),
    '核对结果内容应默认折叠'
);
assert(
    antiForgettingHtml.includes('setReviewScheduleExpanded('),
    '核对结果应通过统一方法控制展开/折叠'
);
assert(
    antiForgettingHtml.includes("document.getElementById('reviewScheduleCollapseToggle').addEventListener('click'"),
    '折叠开关应绑定点击事件'
);
assert(
    antiForgettingHtml.includes('response.status === 501') && antiForgettingHtml.includes('不支持 POST（HTTP 501）') && antiForgettingHtml.includes('npm run dev:local'),
    '代理请求应识别静态服务器 501 并提示使用 npm run dev:local'
);
assert(
    antiForgettingHtml.includes('id="reviewScheduleHintToggle"') && antiForgettingHtml.includes('aria-label="查看复习公式说明"'),
    '页面应提供复习公式 Hint 图标按钮'
);
assert(
    antiForgettingHtml.includes('class="hint-icon-btn"') && (antiForgettingHtml.includes('>?</button>') || antiForgettingHtml.includes('>？</button>')),
    'Hint 应使用问号图标按钮样式'
);
assert(
    antiForgettingHtml.includes('id="reviewScheduleHintPanel"') && antiForgettingHtml.includes('display:none;'),
    '复习公式 Hint 面板应默认隐藏'
);
assert(
    antiForgettingHtml.includes('id="noReviewTodayButton"'),
    '页面应提供“今日无复习”按钮'
);
assert(
    antiForgettingHtml.includes('id="noReviewTodayNames"'),
    '页面应提供顶部学员名单展示区以替换原提示文本'
);
assert(
    antiForgettingHtml.includes("document.getElementById('noReviewTodayButton').addEventListener('click'"),
    '“今日无复习”按钮应绑定点击事件'
);
assert(
    antiForgettingHtml.includes("Array.from(document.getElementById('userName').options)") || antiForgettingHtml.includes('getDisplayedStudentNames()'),
    '“今日无复习”应直接使用页面当前下拉框中的学员列表'
);
assert(
    antiForgettingHtml.includes('commonFunctions.handleReviewLateReminderClick()') || antiForgettingHtml.includes('尊敬的家长，您好！'),
    '点击“今日无复习”应复制与 index 页面相同的提示文案'
);
assert(
    antiForgettingHtml.includes("join('、')") || antiForgettingHtml.includes("join('，')") || antiForgettingHtml.includes("join('、'") || antiForgettingHtml.includes("join('、')") || antiForgettingHtml.includes("join('、')"),
    '无复习学员名称应以分隔符拼接展示'
);
assert(
    antiForgettingHtml.includes('正课日期 + 1/2/3/6/9/12/15/17/19/21 天') || antiForgettingHtml.includes('+1,+2,+3,+6,+9,+12,+15,+17,+19,+21'),
    'Hint 面板应说明升级后 +1 到 +21 的复习计算公式'
);
assert(
    antiForgettingHtml.includes('const REVIEW_OFFSETS = [1, 2, 3, 6, 9, 12, 15, 17, 19, 21];'),
    'anti-forgetting.html 应使用升级后复习节点 [1,2,3,6,9,12,15,17,19,21]'
);
assert(
    antiForgettingHtml.includes("const { normal, missing, extra } = lastCheckResult;"),
    '导出 CSV 应读取 normal/missing/extra 三类结果'
);
assert(
    antiForgettingHtml.includes("csvRows.push([item.reviewDate, item.trainingDate, `+${item.offset}`, '正常']);"),
    '导出 CSV 应包含正常项'
);

// 检查 T+1 是否有复习记录
const t1Items = mapGetByDate(baseSchedule, '2027-06-02');
assertEqual(t1Items?.length, 1, `T+1 有 1 条复习记录`);

console.log();

// ---------- calculateReviewSchedule - 兼容线上 training/orders 结构 ----------
console.log('📦 calculateReviewSchedule - 兼容线上 training/orders 结构');

const nestedRecordSchedule = calculateReviewSchedule([
    {
        student: { name: '于熠凡' },
        scheduleTime: Date.parse('2027-05-03T11:00:00+08:00'),
        material: { name: '新-中阶-考纲单词（乱序）' },
        status: 'COMPLETED'
    }
], '于熠凡');

assert(mapHasByDate(nestedRecordSchedule, '2027-05-04'), '嵌套结构记录应生成 2027-05-04 (T+1)');
assert(mapHasByDate(nestedRecordSchedule, '2027-05-24'), '嵌套结构记录应生成 2027-05-24 (T+21)');

console.log();

// ---------- calculateReviewSchedule - 过滤其他学生 ----------
console.log('📦 calculateReviewSchedule - 过滤其他学生');

const multiStudentRecords = [
    { userName: '测试学生A', trainingTime: '2027-06-01' },
    { userName: '测试学生B', trainingTime: '2027-06-01' },
    { userName: '测试学生C', trainingTime: '2027-06-01' }
];
const scheduleA = calculateReviewSchedule(multiStudentRecords, '测试学生A');
assertEqual(scheduleA.size, REVIEW_OFFSETS.length, 
    `测试学生A 应有 ${REVIEW_OFFSETS.length} 条复习记录，实际 = ${scheduleA.size}`);

console.log();

// ---------- calculateReviewSchedule - 多个训练日期 ----------
console.log('📦 calculateReviewSchedule - 多个训练日期');

const multiDateRecords = [
    { userName: '测试学生', trainingTime: '2027-06-01' },
    { userName: '测试学生', trainingTime: '2027-06-15' }
];
const multiDateSchedule = calculateReviewSchedule(multiDateRecords, '测试学生');

// 检查 6-30 应复习 6-15 的 T15
const jun30Items = mapGetByDate(multiDateSchedule, '2027-06-30');
assertEqual(jun30Items?.length, 1, `6-30 应复习 1 条(6-15 T15)`);

// 检查 6-22 仅应复习 6-01 的 T21 = 1条
const jun22Items = mapGetByDate(multiDateSchedule, '2027-06-22');
assertEqual(jun22Items?.length, 1, `6-22 应复习 1 条(6-01 T21)`);
if (jun22Items) {
    const trainingDates = jun22Items.map(i => i.trainingDate);
    assert(trainingDates.includes('2027-06-01'), `6-22 应包含 6-01`);
}

console.log();

// ---------- 于熠凡 bug 场景 - 用未来日期验证 ----------
console.log('📦 于熠凡 bug 场景 - 用未来日期验证逻辑\n');

// 使用 2027 年日期确保所有复习日期都在未来（相对于当前时间）
const yufanRecords = [
    { userName: '于熠凡', trainingTime: '2027-04-22' },
    { userName: '于熠凡', trainingTime: '2027-04-25' },
    { userName: '于熠凡', trainingTime: '2027-05-03' },
    { userName: '于熠凡', trainingTime: '2027-05-04' }
];

const yufanSchedule = calculateReviewSchedule(yufanRecords, '于熠凡');

console.log('  📅 各天应复习列表:');

// 5.6 应复习: 5.3(T3), 5.4(T2) = 2条
const may06Items = mapGetByDate(yufanSchedule, '2027-05-06');
console.log('  5.6 应复习:');
assertEqual(may06Items?.length, 2, `5.6 应复习 2 条(5.3, 5.4)`);
if (may06Items) {
    const trainingDates = may06Items.map(i => i.trainingDate);
    assert(trainingDates.includes('2027-05-03'), `5.6 应包含 5.3`);
    assert(trainingDates.includes('2027-05-04'), `5.6 应包含 5.4`);
}

// 5.7 应复习: 4.22(T15), 4.25(T12), 5.4(T3) = 3条
const may07Items = mapGetByDate(yufanSchedule, '2027-05-07');
console.log('  5.7 应复习:');
assertEqual(may07Items?.length, 3, `5.7 应复习 3 条(4.22, 4.25, 5.4)`);
if (may07Items) {
    const trainingDates = may07Items.map(i => i.trainingDate);
    assert(trainingDates.includes('2027-04-22'), `5.7 应包含 4.22`);
    assert(trainingDates.includes('2027-04-25'), `5.7 应包含 4.25`);
    assert(trainingDates.includes('2027-05-04'), `5.7 应包含 5.4`);
}

console.log();

// ---------- calculateExpectedReviews - 日期范围过滤 ----------
console.log('📦 calculateExpectedReviews - 日期范围过滤');

// 使用 2027 年日期确保都在未来
// 2027-06-01 的正课，复习日期为: 06-02(T+1), 06-03(T+2), 06-04(T+3), 06-07(T+6), 06-10(T+9), ...
// 在范围 [06-05, 06-10] 内的有: 06-07(T+6), 06-10(T+9)
const expectedReviews = calculateExpectedReviews('2027-06-01', '2027-06-05', '2027-06-10');

assert(!mapHasByDate(expectedReviews, '2027-06-05'), '不包含 2027-06-05 (06-01+偏移不产生06-05)');
assert(mapHasByDate(expectedReviews, '2027-06-07'), '包含 2027-06-07 (T+6)');
assert(mapHasByDate(expectedReviews, '2027-06-10'), '包含 2027-06-10 (T+9)');
assert(!mapHasByDate(expectedReviews, '2027-06-04'), '不包含 2027-06-04 (范围外)');
assert(!mapHasByDate(expectedReviews, '2027-06-11'), '不包含 2027-06-11 (范围外)');

// 检查 06-07 应有 1 条 (T+6)
const jun07Items = mapGetByDate(expectedReviews, '2027-06-07');
assertEqual(jun07Items?.length, 1, `06-07 应有 1 条复习(06-01 T+6)`);

console.log();

// ---------- 边界情况 - 空数据 ----------
console.log('📦 边界情况 - 空数据');
const emptySchedule = calculateReviewSchedule([], '测试学生');
assertEqual(emptySchedule.size, 0, '空数据返回空 Map');

console.log();

// ---------- 边界情况 - 无效日期 ----------
console.log('📦 边界情况 - 无效日期');
// 使用空字符串作为无效日期测试
const invalidSchedule = calculateReviewSchedule([
    { userName: '测试学生', trainingTime: '' }
], '测试学生');
assertEqual(invalidSchedule.size, 0, '空字符串日期不生成复习计划');

console.log();

// ---------- 边界情况 - 学生名匹配 ----------
console.log('📦 边界情况 - 学生名匹配');
const nameRecords = [
    { userName: '测试学生A', trainingTime: '2027-06-01' },
    { userName: '测试学生B', trainingTime: '2027-06-01' }
];
const scheduleA2 = calculateReviewSchedule(nameRecords, '测试学生A');
assertEqual(scheduleA2.size, REVIEW_OFFSETS.length, `测试学生A 有 ${REVIEW_OFFSETS.length} 条复习记录`);
const scheduleB2 = calculateReviewSchedule(nameRecords, '测试学生B');
assertEqual(scheduleB2.size, REVIEW_OFFSETS.length, `测试学生B 有 ${REVIEW_OFFSETS.length} 条复习记录`);

console.log();

// ---------- 日期计算验证 ----------
console.log('📦 日期计算 - 复习间隔验证\n');

const dateCheckRecords = [
    { userName: '测试学生', trainingTime: '2027-06-01' }
];
const dateCheckSchedule = calculateReviewSchedule(dateCheckRecords, '测试学生');

console.log('  📅 复习间隔验证:');
REVIEW_OFFSETS.forEach(offset => {
    const expectedReviewDate = addDays(parseDate('2027-06-01'), offset);
    const items = mapGetByDate(dateCheckSchedule, formatDate(expectedReviewDate));
    if (items) {
        const diffDays = Math.floor((new Date(items[0].reviewDate + 'T00:00:00') - expectedReviewDate) / (1000 * 60 * 60 * 24));
        assert(diffDays === 0, `T${offset}: 间隔 ${diffDays} 天 (期望 0)`);
    } else {
        assert(false, `T${offset}: ${formatDate(expectedReviewDate)} 未找到`);
    }
});

console.log();

// ---------- compareSchedules 测试 ----------
console.log('📦 compareSchedules - 对比逻辑');

const expectedSchedule = calculateReviewSchedule([
    { userName: '测试学生', trainingTime: '2027-06-01' }
], '测试学生');

// 正常匹配
const actualNormal = [
    { trainingDate: '2027-06-01', reviewDate: '2027-06-02' },
    { trainingDate: '2027-06-01', reviewDate: '2027-06-03' }
];
const diffNormal = compareSchedules(expectedSchedule, actualNormal);
assertEqual(diffNormal.summary.normal, 2, `正常匹配 = 2`);
assertEqual(diffNormal.summary.missing, 8, `缺失 = 8`);
assertEqual(diffNormal.summary.extra, 0, `多余 = 0`);

// 多余匹配
const actualExtra = [
    { trainingDate: '2027-06-15', reviewDate: '2027-06-02' },
    { trainingDate: '2027-06-01', reviewDate: '2027-06-03' }
];
const diffExtra = compareSchedules(expectedSchedule, actualExtra);
assertEqual(diffExtra.summary.normal, 1, `正常匹配 = 1`);
assertEqual(diffExtra.summary.missing, 9, `缺失 = 9`);
assertEqual(diffExtra.summary.extra, 1, `多余 = 1`);

// 非预期日期上的实际复习也应计为多余
const actualOnUnexpectedDate = [
    { trainingDate: '2027-06-15', reviewDate: '2027-07-01' }
];
const diffUnexpectedDate = compareSchedules(expectedSchedule, actualOnUnexpectedDate);
assertEqual(diffUnexpectedDate.summary.normal, 0, `正常匹配 = 0`);
assertEqual(diffUnexpectedDate.summary.missing, 10, `缺失 = 10`);
assertEqual(diffUnexpectedDate.summary.extra, 1, `非预期日期上的实际复习应计为多余 = 1`);

// 同一天同训练日期重复项去重后不应重复计数
const actualWithDuplicateTrainingDate = [
    { trainingDate: '2027-06-01', reviewDate: '2027-06-02' },
    { trainingDate: '2027-06-01', reviewDate: '2027-06-02' }
];
const diffDedup = compareSchedules(expectedSchedule, actualWithDuplicateTrainingDate);
assertEqual(diffDedup.summary.normal, 1, `去重后正常匹配 = 1`);
assertEqual(diffDedup.summary.extra, 0, `去重后多余 = 0`);

console.log();

// ---------- 汇总 ----------
console.log('========================================');
console.log(`测试结果: ${passed} 通过, ${failed} 失败, 共 ${passed + failed} 项`);
console.log('========================================');

if (failed > 0) {
    console.log('\n❌ 有测试失败，请检查上述日志');
    process.exit(1);
} else {
    console.log('\n✅ 所有测试通过！');
    process.exit(0);
}