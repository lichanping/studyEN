/**
 * TDD 测试：多排复习节点计算
 * 
 * 测试目标：extra 项的复习节点 = 实际复习日期 - 来源正课日期
 * 例如：正课 2026-04-22，实际复习 2026-05-04
 *      偏移 = 5.4 - 4.22 = 12 天，所以显示 +12
 */

// 模拟工具函数
function parseDate(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr + 'T00:00:00');
    return isNaN(d.getTime()) ? null : d;
}

function formatDate(date) {
    if (!date) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}

// 复习节点规则
const REVIEW_OFFSETS = [1, 2, 3, 5, 7, 9, 12, 14, 17, 21];

/**
 * 计算实际复习偏移（用于多排场景）
 * @param {string} trainingDate - 来源正课日期 (YYYY-MM-DD)
 * @param {string} reviewDate - 实际复习日期 (YYYY-MM-DD)
 * @returns {number|null} 偏移天数，如果无法计算返回 null
 */
function calculateActualOffset(trainingDate, reviewDate) {
    const training = parseDate(trainingDate);
    const review = parseDate(reviewDate);
    if (!training || !review) return null;
    
    const diffTime = review.getTime() - training.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays > 0 ? diffDays : null;
}

/**
 * 判断一个偏移是否匹配规则节点
 * @param {number} offset - 偏移天数
 * @returns {object} { matched: boolean, nearestOffset: number, isExact: boolean }
 */
function findNearestReviewOffset(offset) {
    if (offset === null || offset <= 0) {
        return { matched: false, nearestOffset: null, isExact: false };
    }
    
    // 精确匹配
    if (REVIEW_OFFSETS.includes(offset)) {
        return { matched: true, nearestOffset: offset, isExact: true };
    }
    
    // 找最近的规则节点
    let nearest = REVIEW_OFFSETS[0];
    let minDiff = Math.abs(offset - REVIEW_OFFSETS[0]);
    
    for (let i = 1; i < REVIEW_OFFSETS.length; i++) {
        const diff = Math.abs(offset - REVIEW_OFFSETS[i]);
        if (diff < minDiff) {
            minDiff = diff;
            nearest = REVIEW_OFFSETS[i];
        }
    }
    
    return { matched: false, nearestOffset: nearest, isExact: false };
}

// ==================== 测试用例 ====================

console.log('=== 测试 1: calculateActualOffset ===\n');

const testCases1 = [
    {
        name: '正课 4.22，复习 5.4（+12 天）',
        trainingDate: '2026-04-22',
        reviewDate: '2026-05-04',
        expected: 12
    },
    {
        name: '正课 5.3，复习 5.4（+1 天）',
        trainingDate: '2026-05-03',
        reviewDate: '2026-05-04',
        expected: 1
    },
    {
        name: '正课 4.25，复习 5.4（+9 天）',
        trainingDate: '2026-04-25',
        reviewDate: '2026-05-04',
        expected: 9
    },
    {
        name: '正课 5.4，复习 5.7（+3 天）',
        trainingDate: '2026-05-04',
        reviewDate: '2026-05-07',
        expected: 3
    }
];

let passed1 = 0;
let failed1 = 0;

testCases1.forEach(tc => {
    const result = calculateActualOffset(tc.trainingDate, tc.reviewDate);
    const status = result === tc.expected ? '✅ 通过' : '❌ 失败';
    if (result === tc.expected) passed1++;
    else failed1++;
    console.log(`${status}: ${tc.name}`);
    console.log(`   预期: ${tc.expected}, 实际: ${result}`);
});

console.log(`\n测试 1 结果: ${passed1}/${testCases1.length} 通过\n`);

console.log('=== 测试 2: findNearestReviewOffset ===\n');

const testCases2 = [
    {
        name: '偏移 12（精确匹配）',
        offset: 12,
        expectedMatched: true,
        expectedNearest: 12
    },
    {
        name: '偏移 1（精确匹配）',
        offset: 1,
        expectedMatched: true,
        expectedNearest: 1
    },
    {
        name: '偏移 10（不匹配，最近为 9 或 12）',
        offset: 10,
        expectedMatched: false,
        expectedNearest: 9  // 或 12，取决于实现
    },
    {
        name: '偏移 15（不匹配，最近为 14 或 17）',
        offset: 15,
        expectedMatched: false,
        expectedNearest: 14  // 或 17
    },
    {
        name: '偏移 0（无效）',
        offset: 0,
        expectedMatched: false,
        expectedNearest: null
    },
    {
        name: '偏移 -5（无效）',
        offset: -5,
        expectedMatched: false,
        expectedNearest: null
    }
];

let passed2 = 0;
let failed2 = 0;

testCases2.forEach(tc => {
    const result = findNearestReviewOffset(tc.offset);
    const matchedOk = result.matched === tc.expectedMatched;
    const nearestOk = tc.expectedNearest === null 
        ? result.nearestOffset === null 
        : result.nearestOffset === tc.expectedNearest;
    const status = (matchedOk && nearestOk) ? '✅ 通过' : '❌ 失败';
    if (matchedOk && nearestOk) passed2++;
    else failed2++;
    console.log(`${status}: ${tc.name}`);
    console.log(`   预期: matched=${tc.expectedMatched}, nearest=${tc.expectedNearest}`);
    console.log(`   实际: matched=${result.matched}, nearest=${result.nearestOffset}`);
});

console.log(`\n测试 2 结果: ${passed2}/${testCases2.length} 通过\n`);

console.log('=== 测试 3: 多排场景完整计算 ===\n');

// 模拟多排场景
const extraItems = [
    {
        reviewDate: '2026-05-06',
        trainingDate: '2026-04-22',
        description: '4.22 的正课，在 5.4 复习（+12，但 5.4 不是预期的复习日）'
    },
    {
        reviewDate: '2026-05-07',
        trainingDate: '2026-04-22',
        description: '4.22 的正课，在 5.6 复习（+14，但 5.6 不是预期的复习日）'
    },
    {
        reviewDate: '2026-05-07',
        trainingDate: '2026-05-03',
        description: '5.3 的正课，在 5.6 复习（+4，不是规则节点）'
    }
];

let passed3 = 0;
let failed3 = 0;

extraItems.forEach(item => {
    const offset = calculateActualOffset(item.trainingDate, item.reviewDate);
    const nearest = findNearestReviewOffset(offset);
    
    console.log(`场景: ${item.description}`);
    console.log(`  正课: ${item.trainingDate}, 复习: ${item.reviewDate}`);
    console.log(`  实际偏移: +${offset} 天`);
    console.log(`  最近规则节点: +${nearest.nearestOffset}`);
    console.log(`  是否精确匹配: ${nearest.isExact ? '是' : '否'}`);
    console.log('');
    
    // 验证：偏移必须 > 0
    if (offset > 0) passed3++;
    else failed3++;
});

console.log(`测试 3 结果: ${passed3}/${extraItems.length} 通过\n`);

// 汇总
const totalPassed = passed1 + passed2 + passed3;
const totalTests = testCases1.length + testCases2.length + extraItems.length;
console.log(`=== 总计: ${totalPassed}/${totalTests} 通过 ===`);

if (failed1 + failed2 + failed3 === 0) {
    console.log('✅ 所有测试通过！');
} else {
    console.log(`❌ ${failed1 + failed2 + failed3} 个测试失败`);
    process.exit(1);
}