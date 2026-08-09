const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const classFormalSource = fs.readFileSync(path.join(root, 'classFormal.js'), 'utf8');
const indexSource = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const indexCssSource = fs.readFileSync(path.join(root, 'index.css'), 'utf8');

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

assert(
    indexSource.includes('id="monthProgressBadge"'),
    'index.html 应提供 headline 右侧的本月进度挂载点'
);

assert(
    !indexSource.includes('month-progress-bar')
        && !indexSource.includes('month-progress-fill')
        && indexSource.includes('class="month-progress-text"'),
    'index.html 应改为仅保留文字容器，由 badge 自身承载进度填充背景'
);

assert(
    indexCssSource.includes('.month-progress-badge')
        && indexCssSource.includes('min-height: 32px;')
        && indexCssSource.includes('padding: 0 14px;')
        && indexCssSource.includes('font-size: 15px;')
        && indexCssSource.includes('linear-gradient(90deg, #7ec8a0 0%, #7ec8a0 var(--month-progress-percent, 0%), var(--panel-bg) var(--month-progress-percent, 0%), var(--panel-bg) 100%)')
        && indexCssSource.includes('flex-wrap: nowrap;'),
    'index.css 应让 headline 本月进度 badge 使用自身背景承载进度填充，并维持更紧凑的同排布局'
);

assert(
    classFormalSource.includes("badge.style.setProperty('--month-progress-percent', `${percent}%`);")
        || classFormalSource.includes("badge.style.setProperty(\"--month-progress-percent\", `${percent}%`);"),
    'classFormal.js 应通过 CSS 变量驱动 badge 背景填充比例'
);

const calculateMonthElapsedPercentCode = extractBlock(classFormalSource, 'export function calculateMonthElapsedPercent');
const getMonthElapsedHeadlineTextCode = extractBlock(classFormalSource, 'export function getMonthElapsedHeadlineText');

const calculateMonthElapsedPercent = new Function(
    `${calculateMonthElapsedPercentCode.replace('export ', '')}\nreturn calculateMonthElapsedPercent;`
)();
const getMonthElapsedHeadlineText = new Function(
    'calculateMonthElapsedPercent',
    `${getMonthElapsedHeadlineTextCode.replace('export ', '')}\nreturn getMonthElapsedHeadlineText;`
)(calculateMonthElapsedPercent);

assert.strictEqual(
    calculateMonthElapsedPercent(new Date(2026, 7, 8)),
    25.8,
    '8 月 8 日的本月进度应按 8/31 计算为 25.8%'
);
assert.strictEqual(
    calculateMonthElapsedPercent(new Date(2026, 7, 31)),
    100.0,
    '当月最后一天的本月进度应为 100.0%'
);
assert.strictEqual(
    getMonthElapsedHeadlineText(new Date(2026, 7, 8)),
    '本月已过 25.8%',
    'headline 本月进度文案应使用固定前缀并展示 1 位小数'
);

console.log('test-index-month-progress passed');