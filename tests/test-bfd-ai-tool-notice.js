const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'classFormal.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function extractFunction(signature) {
    const start = source.indexOf(signature);
    assert(start >= 0, `应实现 ${signature}`);
    const bodyStart = source.indexOf('{', start);
    let depth = 0;
    for (let index = bodyStart; index < source.length; index += 1) {
        if (source[index] === '{') depth += 1;
        if (source[index] === '}' && --depth === 0) {
            return source.slice(start, index + 1).replace(/^export /, '');
        }
    }
    throw new Error(`函数未结束：${signature}`);
}

assert.match(html, /<button[^>]*id="aiToolNoticeButton"[^>]*hidden[^>]*>AI单词工具介绍<\/button>/, '按钮默认隐藏，避免非 BFD 页面闪现');
assert(html.includes('script.handleAiToolNoticeClick'), '页面应绑定复制按钮');
const elements = {
    platformSelect: { value: 'baifendii' },
    userName: { value: '杨开迪' },
    aiToolNoticeButton: { hidden: true }
};
const copied = [];
const toasts = [];
let copySucceeded = true;
const context = vm.createContext({
    document: { getElementById: id => elements[id] },
    getCurrentPlatformId: () => elements.platformSelect.value,
    copyToClipboard: text => { copied.push(text); return copySucceeded; },
    displayToast: text => toasts.push(text)
});
vm.runInContext([
    extractFunction('function updateAiToolNoticeButton()'),
    extractFunction('export function handleAiToolNoticeClick()')
].join('\n'), context);

for (const platform of ['baifendii', 'lixiaolaila', 'maisuiyingyu', 'baifendii']) {
    elements.platformSelect.value = platform;
    context.updateAiToolNoticeButton();
    assert.strictEqual(elements.aiToolNoticeButton.hidden, platform !== 'baifendii');
}
const initSource = extractFunction('function initPlatformSelector()');
assert.strictEqual((initSource.match(/updateAiToolNoticeButton\(\)/g) || []).length, 2, '初始化及平台 change 均应刷新显隐');

context.handleAiToolNoticeClick();
assert.strictEqual(copied.length, 1);
assert(copied[0].startsWith('杨开迪同学及家长好😊\n\n'));
for (const text of ['音节、词根拆分与发音跟读', '词义、常见搭配及易混词讲解', '即时自测、薄弱词标记与针对性复习', '任课老师课外借助AI提取词表、导入页面并生成链接', '并非全自动完成', '请杨开迪同学珍惜老师的用心准备', '10～15分钟', '学管柚子老师帮忙反馈', '感谢柚子老师的支持与协助', '感谢杨开迪同学及家长的配合']) {
    assert(copied[0].includes(text), `文案缺少：${text}`);
}
assert(!/\{学生姓名\}|各位家长|同学们|练习链接由任课老师提供/.test(copied[0]));
assert.strictEqual(toasts.at(-1), 'AI单词工具介绍已复制');
elements.userName.value = ' 测试学员 ';
context.handleAiToolNoticeClick();
assert(copied.at(-1).startsWith('测试学员同学及家长好'));
assert(!copied.at(-1).includes('杨开迪'), '切换学生后不得沿用旧姓名');

elements.userName.value = '  ';
context.handleAiToolNoticeClick();
assert.strictEqual(copied.length, 2, '空学生不应复制');
assert.strictEqual(toasts.at(-1), '请先选择学员');
elements.userName.value = '测试学员';
elements.platformSelect.value = 'lixiaolaila';
context.handleAiToolNoticeClick();
assert.strictEqual(copied.length, 2, '非 BFD 不应复制');
elements.platformSelect.value = 'baifendii';
copySucceeded = false;
context.handleAiToolNoticeClick();
assert.strictEqual(toasts.at(-1), '复制失败，请重试');
console.log('BFD AI tool notice tests passed');
