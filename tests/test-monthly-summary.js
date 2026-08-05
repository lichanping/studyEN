const assert = require('assert');
const fs = require('fs');
const path = require('path');

const monthlySummaryPath = path.join(__dirname, '..', 'monthly-summary.js');
const indexPath = path.join(__dirname, '..', 'index.html');

const monthlySummaryContent = fs.readFileSync(monthlySummaryPath, 'utf8');
const indexContent = fs.readFileSync(indexPath, 'utf8');

// ========================================
// 1. monthly-summary.js 核心导出函数
// ========================================

// 1.1 应导出 generateMonthlySummary
assert(
    /export\s+(async\s+)?function\s+generateMonthlySummary/.test(monthlySummaryContent)
    || /export\s+\{[^}]*generateMonthlySummary/.test(monthlySummaryContent),
    'monthly-summary.js 应导出 generateMonthlySummary 函数'
);

// 1.2 应导出 calculateMonthlyClassStats（正课统计计算）
assert(
    /export\s+function\s+calculateMonthlyClassStats/.test(monthlySummaryContent),
    'monthly-summary.js 应导出 calculateMonthlyClassStats 函数'
);

// 1.3 应导出 calculateMonthlyAntiForgettingStats（抗遗忘统计计算）
assert(
    /export\s+function\s+calculateMonthlyAntiForgettingStats/.test(monthlySummaryContent),
    'monthly-summary.js 应导出 calculateMonthlyAntiForgettingStats 函数'
);

// 1.4 应导出 getLeaveCount（请假次数计算）
assert(
    /export\s+function\s+getLeaveCount/.test(monthlySummaryContent),
    'monthly-summary.js 应导出 getLeaveCount 函数'
);

// 1.5 应导出 generateHighlights（闪光点生成）
assert(
    /export\s+function\s+generateHighlights/.test(monthlySummaryContent),
    'monthly-summary.js 应导出 generateHighlights 函数'
);

// 1.6 应导出 generateImprovements（小提升点生成）
assert(
    /export\s+function\s+generateImprovements/.test(monthlySummaryContent),
    'monthly-summary.js 应导出 generateImprovements 函数'
);

// ========================================
// 2. calculateMonthlyClassStats 计算逻辑
// ========================================

// 2.1 应筛选 type 为 "词汇课" 或 "阅读完型语法课" 的记录
assert(
    monthlySummaryContent.includes('词汇课') && monthlySummaryContent.includes('阅读完型语法课'),
    'calculateMonthlyClassStats 应筛选词汇课和阅读完型语法课'
);

// 2.2 应计算正课次数（去重日期）
assert(
    monthlySummaryContent.includes('newWord') && monthlySummaryContent.includes('reviewWordCount'),
    'calculateMonthlyClassStats 应统计 newWord 和 reviewWordCount'
);

// 2.3 应计算正课总时长（duration 汇总）
assert(
    monthlySummaryContent.includes('duration'),
    'calculateMonthlyClassStats 应统计 duration（课时）'
);

// 2.4 累计学单词 = 新词 + 旧词巩固
assert(
    monthlySummaryContent.includes('newWord') && monthlySummaryContent.includes('reviewWordCount'),
    '累计学单词应包含 newWord（新词）和 reviewWordCount（旧词巩固）'
);

// ========================================
// 3. calculateMonthlyAntiForgettingStats 计算逻辑
// ========================================

// 3.1 应从 IndexedDB feedbackEntries 读取数据
assert(
    monthlySummaryContent.includes('feedbackEntries') || monthlySummaryContent.includes('FeedbackDB'),
    'calculateMonthlyAntiForgettingStats 应读取 IndexedDB feedbackEntries'
);

// 3.2 应解析 "YYYY-MM-DD(周X): rate% | total | correct" 格式
assert(
    monthlySummaryContent.includes('|') && monthlySummaryContent.includes('totalWordsReviewed'),
    'calculateMonthlyAntiForgettingStats 应解析 feedbackEntries 格式'
);

// 3.3 应计算抗遗忘正确率（非遗忘率）
assert(
    monthlySummaryContent.includes('correctRate') || monthlySummaryContent.includes('正确率'),
    'calculateMonthlyAntiForgettingStats 应计算正确率（非遗忘率）'
);

// ========================================
// 4. getLeaveCount 请假次数计算
// ========================================

// 4.1 应读取 ${userName}_leaves 数据
assert(
    monthlySummaryContent.includes('_leaves'),
    'getLeaveCount 应读取 ${userName}_leaves 数据'
);

// 4.2 应按月份筛选请假记录
assert(
    monthlySummaryContent.includes('date') && (monthlySummaryContent.includes('month') || monthlySummaryContent.includes('月份')),
    'getLeaveCount 应按月份筛选请假记录'
);

// ========================================
// 5. generateHighlights 闪光点生成
// ========================================

// 5.1 应基于正确率 >= 90% 判断优秀
assert(
    monthlySummaryContent.includes('90'),
    'generateHighlights 应使用 90% 作为优秀阈值'
);

// 5.2 应包含话术库
assert(
    monthlySummaryContent.includes('记词效率高') || monthlySummaryContent.includes('接受度强'),
    'generateHighlights 应包含闪光点话术库'
);

// ========================================
// 6. generateImprovements 小提升点生成
// ========================================

// 6.1 应基于正确率 < 90% 判断待提升
assert(
    monthlySummaryContent.includes('90') || monthlySummaryContent.includes('75'),
    'generateImprovements 应使用正确率分档阈值'
);

// 6.2 应包含话术库
assert(
    monthlySummaryContent.includes('结合语境') || monthlySummaryContent.includes('碎片化复习'),
    'generateImprovements 应包含小提升点话术库'
);

// ========================================
// 7. index.html 入口
// ========================================

// 7.1 应有月末总结按钮
assert(
    indexContent.includes('monthlySummary') || indexContent.includes('月末总结'),
    'index.html 应有月末总结按钮'
);

// 7.2 按钮应在数据统计区域
const statsSectionMatch = indexContent.match(/数据统计[\s\S]*?<\/fieldset>/);
assert(
    statsSectionMatch && (statsSectionMatch[0].includes('monthlySummary') || statsSectionMatch[0].includes('月末总结')),
    '月末总结按钮应在数据统计区域'
);

// 7.3 应引入 monthly-summary.js
assert(
    indexContent.includes('monthly-summary.js'),
    'index.html 应引入 monthly-summary.js'
);

// ========================================
// 8. 报告输出格式
// ========================================

// 8.1 应生成纯文本报告（非 Markdown/Word）
assert(
    monthlySummaryContent.includes('text/plain') || monthlySummaryContent.includes('.txt'),
    '报告应导出为 .txt 纯文本格式'
);

// 8.2 应复制到剪贴板
assert(
    monthlySummaryContent.includes('copyToClipboard') || monthlySummaryContent.includes('clipboard'),
    '报告应自动复制到剪贴板'
);

console.log('test-monthly-summary passed');
