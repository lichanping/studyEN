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

const commonFunctionsSource = read('commonFunctions.js');
const countNonEmptyLinesCode = extractBlock(commonFunctionsSource, 'function countNonEmptyLines');
const handleNewVersionFeedbackClickCode = extractBlock(commonFunctionsSource, 'export async function handleNewVersionFeedbackClick');

let copiedMessage = '';
let shownMessage = '';
let storedArgs = null;
let allowEmptyPrompted = false;

const elements = {
    userName: { value: '邱睿' },
    keyLanguagePoints: { value: '重点1\n\n重点2' },
    practiceArea: { value: '闯关1' },
    antiForgettingForgetWord: { value: '1' },
    forgetWords: { value: 'apple 苹果\nbanana 香蕉' }
};

const reviewInputs = [
    { value: '3' },
    { value: '4' },
    { value: '' }
];

const documentMock = {
    querySelectorAll(selector) {
        assert.strictEqual(selector, '.antiForgettingReviewWord', '新版反馈应从复习词数输入框读取复习词数');
        return reviewInputs;
    },
    getElementById(id) {
        return elements[id] || null;
    }
};

const handleNewVersionFeedbackClick = new Function(
    'document',
    'showAllowEmptyConfirm',
    'countNonEmptyLines',
    'getRandomMotto',
    'copyToClipboard',
    'showLongText',
    'storeFeedbackInFile',
    `${countNonEmptyLinesCode}\n${handleNewVersionFeedbackClickCode.replace('export ', '')}\nreturn handleNewVersionFeedbackClick;`
)(
    documentMock,
    async () => {
        allowEmptyPrompted = true;
        return true;
    },
    undefined,
    () => '继续加油',
    (message) => {
        copiedMessage = message;
    },
    (message) => {
        shownMessage = message;
    },
    async (...args) => {
        storedArgs = args;
    }
);

(async () => {
    await handleNewVersionFeedbackClick();

    assert.strictEqual(allowEmptyPrompted, false, '有复习词数时新版反馈不应弹出跳过统计确认');
    assert.deepStrictEqual(
        storedArgs,
        ['邱睿', '90', 10, 9],
        '新版反馈应按遗忘输入框数字写入 feedbackEntries 统计记录，而不是按遗忘词文本计数'
    );
    assert(copiedMessage.includes('1. 复习 10 词'), '新版反馈文案应展示汇总后的复习词数');
    assert.strictEqual(shownMessage, copiedMessage, '新版反馈展示文案应与复制内容一致');
    console.log('test-anti-forgetting-feedback passed');
})().catch((error) => {
    console.error(error);
    process.exit(1);
});