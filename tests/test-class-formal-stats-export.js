const assert = require('assert');
const fs = require('fs');
const path = require('path');

const classFormalPath = path.join(__dirname, '..', 'classFormal.js');
const content = fs.readFileSync(classFormalPath, 'utf8');

assert(
    content.includes('Number.isFinite(Number(stats?.newWord))')
        || content.includes('Number.isFinite(Number(stats.newWord))'),
    '正课统计应先校验 newWord 为有效数字，避免导出 undefined 行'
);

assert(
    content.includes('Number.isFinite(Number(stats?.reviewWordCount))')
        || content.includes('Number.isFinite(Number(stats.reviewWordCount))'),
    '正课统计应先校验 reviewWordCount 为有效数字，避免导出 undefined 行'
);

assert(
    content.includes('if (!hasValidNewWord || !hasValidReviewWordCount) return;'),
    '正课统计应跳过 newWord/reviewWordCount 缺失的记录'
);

assert(
    !content.includes('formatted: `${formattedDate} (${weekDay}) | ${courseType} | ${stats.newWord} | ${stats.reviewWordCount}`'),
    '正课统计不应直接把未校验的 newWord/reviewWordCount 拼进导出文案'
);

console.log('test-class-formal-stats-export passed');