const assert = require('assert');
const fs = require('fs');
const path = require('path');

function read(fileName) {
    return fs.readFileSync(path.join(__dirname, '..', fileName), 'utf8');
}

const formalHtml = read('index.html');
const commonFunctions = read('commonFunctions.js');

assert(
    formalHtml.includes('id="importWordsImageButton"')
        && formalHtml.includes('识别单词表图片'),
    '正式课页应提供“识别单词表图片”按钮，方便从 BFD png 单词表导入新学单词'
);

assert(
    formalHtml.includes('id="newLearnedWordsImageInput"')
        && formalHtml.includes('accept="image/*"'),
    '正式课页应提供仅接收图片的隐藏文件输入，用于本地选择单词表 png/jpg'
);

assert(
    commonFunctions.includes('export function setupNewLearnedWordsImageImport')
        && commonFunctions.includes('window.Tesseract')
        && commonFunctions.includes('targetTextarea.value')
        && commonFunctions.includes('input.click()'),
    'commonFunctions.js 应提供浏览器端 OCR 初始化逻辑，触发本地选图并将识别结果写回新学单词输入框'
);

assert(
    formalHtml.includes('commonFunctions.setupNewLearnedWordsImageImport')
        && formalHtml.includes('importWordsImageButton')
        && formalHtml.includes('newLearnedWordsImageInput'),
    '正式课页应在加载后绑定图片识别导入逻辑'
);

console.log('test-index-word-image-import passed');