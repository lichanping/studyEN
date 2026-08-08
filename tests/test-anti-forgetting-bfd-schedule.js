const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'anti-forgetting.html'), 'utf8');

function extractBraceBlock(content, startToken) {
    const start = content.indexOf(startToken);
    assert(start >= 0, `未找到代码片段: ${startToken}`);
    const braceStart = content.indexOf('{', start);
    assert(braceStart >= 0, `未找到起始大括号: ${startToken}`);
    let depth = 0;
    for (let index = braceStart; index < content.length; index += 1) {
        const char = content[index];
        if (char === '{') depth += 1;
        if (char === '}') depth -= 1;
        if (depth === 0) {
            const semicolonIndex = content.indexOf(';', index);
            return content.slice(start, semicolonIndex + 1);
        }
    }
    throw new Error(`无法提取代码片段: ${startToken}`);
}

function extractFunction(content, functionSignature) {
    const start = content.indexOf(functionSignature);
    assert(start >= 0, `未找到函数: ${functionSignature}`);
    const braceStart = content.indexOf('{', start);
    assert(braceStart >= 0, `未找到函数体: ${functionSignature}`);
    let depth = 0;
    for (let index = braceStart; index < content.length; index += 1) {
        const char = content[index];
        if (char === '{') depth += 1;
        if (char === '}') depth -= 1;
        if (depth === 0) {
            return content.slice(start, index + 1);
        }
    }
    throw new Error(`无法提取函数: ${functionSignature}`);
}

function parseDate(value) {
    if (!value) return null;
    const parts = String(value).split('-');
    if (parts.length !== 3) return null;
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function addDays(date, days) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

const reviewRulesCode = extractBraceBlock(source, 'const REVIEW_RULES =');
const getReviewRuleCode = extractFunction(source, 'function getReviewRule(platformId)');
const formatReviewOffsetLabelCode = extractFunction(source, 'function formatReviewOffsetLabel(platformId, offset)');
const getReviewHintHtmlCode = extractFunction(source, 'function getReviewHintHtml(platformId)');
const calculateReviewScheduleFromClassStatsCode = extractFunction(source, 'function calculateReviewScheduleFromClassStats(classStatistics, checkDate, platformId)');
const ensureReviewWordInputCountCode = extractFunction(source, 'function ensureReviewWordInputCount(expectedCount)');

const antiForgettingApi = new Function(
    'parseDate',
    'formatDate',
    'addDays',
    `${reviewRulesCode}\n${getReviewRuleCode}\n${formatReviewOffsetLabelCode}\n${getReviewHintHtmlCode}\n${calculateReviewScheduleFromClassStatsCode}\nreturn { REVIEW_RULES, getReviewRule, formatReviewOffsetLabel, getReviewHintHtml, calculateReviewScheduleFromClassStats };`
)(parseDate, formatDate, addDays);

assert.deepStrictEqual(
    antiForgettingApi.getReviewRule('lixiaolaila').offsets,
    [1, 2, 3, 6, 9, 12, 15, 17, 19, 21],
    'LXLL 应继续使用 1/2/3/6/9/12/15/17/19/21'
);

assert.deepStrictEqual(
    antiForgettingApi.getReviewRule('baifendii').offsets,
    [1, 2, 3, 5, 7, 9, 12, 14, 17, 21],
    'BFD 应使用 1/2/3/5/7/9/12/14/17/21'
);

assert.strictEqual(
    antiForgettingApi.getReviewRule('baifendii').compareMode,
    'expected-only',
    'BFD 应走 expected-only 模式'
);

assert(
    antiForgettingApi.getReviewHintHtml('lixiaolaila').includes('1/2/3/6/9/12/15/17/19/21'),
    'LXLL 问号说明应展示 LXLL offsets'
);

assert(
    antiForgettingApi.getReviewHintHtml('baifendii').includes('1/2/3/5/7/9/12/14/17/21'),
    'BFD 问号说明应展示 BFD offsets'
);

assert.strictEqual(
    antiForgettingApi.formatReviewOffsetLabel('baifendii', 14),
    '第8次（+14）',
    'BFD 复习节点文案应优先展示第 n 次，后附 +offset'
);

assert.strictEqual(
    antiForgettingApi.formatReviewOffsetLabel('lixiaolaila', 21),
    '第10次（+21）',
    'LXLL 复习节点文案也应优先展示第 n 次，后附 +offset'
);

assert(
    source.includes('<script src="./meeting-config.js"></script>') || source.includes("<script src='./meeting-config.js'></script>"),
    'anti-forgetting.html 应接入 meeting-config.js，避免 BFD 平台文案回退为默认值'
);

const expectedItems = antiForgettingApi.calculateReviewScheduleFromClassStats(
    {
        '2026-08-07': { platform: 'baifendii', type: '词汇课' },
        '2026-08-03': { platform: 'baifendii', type: '词汇课' },
        '2026-07-25': { platform: 'baifendii', type: '词汇课' },
        '2026-07-30': { platform: 'lixiaolaila', type: '词汇课' },
        '2026-08-06': { platform: 'baifendii', type: '阅读完型语法课' },
        '2026-08-02': { platform: 'baifendii', type: '词汇课' }
    },
    '2026-08-08',
    'baifendii'
);

assert.deepStrictEqual(
    expectedItems.map((item) => [item.trainingDate, item.offset]),
    [
        ['2026-07-25', 14],
        ['2026-08-03', 5],
        ['2026-08-07', 1]
    ],
    'BFD 应仅按本地 classStatistics 中 platform=baifendii 且 type=词汇课 的正课记录推算当天来源'
);

assert(
    source.includes("if (platformId === 'baifendii')") || source.includes('if (platformId === "baifendii")'),
    '核对逻辑应存在 BFD 独立分支'
);

assert(
    source.includes('ensureReviewWordInputCount('),
    'BFD 应支持按当天应复习来源条数动态生成复习词数输入框'
);

assert(
    !ensureReviewWordInputCountCode.includes('button.hidden = true;'),
    '自动推算复习词数后，不应强制隐藏手工增加输入框的 + 按钮'
);

assert(
    ensureReviewWordInputCountCode.includes('updateAddReviewWordInputButton();'),
    '自动推算复习词数后，应复用 + 按钮显隐逻辑保留手工容错入口'
);

assert(
    source.includes('function refreshReviewScheduleForCurrentSelection()'),
    'BFD 应存在当前选择变化后的复习计划结果刷新函数'
);

assert(
    source.includes('renderScheduleCheckResultForBfd(expectedItems, studentName, checkDate);'),
    'BFD 自动刷新时应重新渲染应复习来源表格'
);

assert(
    source.includes("document.getElementById('reviewTime').addEventListener('change', refreshReviewScheduleForCurrentSelection)") || source.includes('document.getElementById("reviewTime").addEventListener("change", refreshReviewScheduleForCurrentSelection)'),
    '切换复习时间后，BFD 应自动刷新应复习来源表格'
);

assert(
    source.includes("document.getElementById('userName').addEventListener('change', refreshReviewScheduleForCurrentSelection)") || source.includes('document.getElementById("userName").addEventListener("change", refreshReviewScheduleForCurrentSelection)'),
    '切换学员后，BFD 应自动刷新应复习来源表格'
);

assert(
    source.includes('当天按已提交正课记录无应复习任务'),
    'BFD 无命中来源时应展示无应复习任务提示'
);

assert(
    source.includes("formatReviewOffsetLabel('baifendii', item.offset)") || source.includes('formatReviewOffsetLabel("baifendii", item.offset)'),
    'BFD 结果表的复习节点列应展示 +offset 与第 n 次组合文案'
);

assert(
    source.includes("getPlatformDisplayName(getCurrentPlatformId())"),
    'BFD 摘要平台名应读取当前平台，而不是写死平台值'
);

assert(
    source.includes('selectedOptions') || source.includes('platformSelect.options[platformSelect.selectedIndex]'),
    'anti-forgetting.html 在 meeting-config 不可用时，也应能从平台下拉框读取当前平台展示名'
);

assert(
    source.includes("lastCheckResult.mode === 'expected-only'") || source.includes('lastCheckResult.mode === "expected-only"'),
    '导出逻辑应兼容 BFD expected-only 结果'
);

console.log('test-anti-forgetting-bfd-schedule passed');