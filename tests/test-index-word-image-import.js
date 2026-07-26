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
    commonFunctions.includes('extractBfdWordListFromImage')
        && commonFunctions.includes('preprocessWordTableRegion')
        && commonFunctions.includes('WORD_TABLE_NOISE_KEYWORDS')
        && commonFunctions.includes('词汇课单词表')
        && commonFunctions.includes('抗遗忘复习计划')
        && commonFunctions.includes('buildWordTableCellGroup({ englishX: 0.025, meaningX: 0.180, topY: 0.205, rowCount: 5 })')
        && commonFunctions.includes('buildWordTableCellGroup({ englishX: 0.675, meaningX: 0.830, topY: 0.540, rowCount: 5 })'),
    'commonFunctions.js 应针对 BFD 单词表图片做预处理与噪音过滤，避免把表头、手机号、抗遗忘计划误识别进新学单词'
);

assert(
    commonFunctions.includes('WORD_TABLE_CELL_REGIONS')
        && commonFunctions.includes('for (const cellGroup of WORD_TABLE_CELL_REGIONS)')
        && commonFunctions.includes('extractWordTableCellLines')
        && commonFunctions.includes('buildWordTableCellGroup({ englishX: 0.675, meaningX: 0.830, topY: 0.540, rowCount: 5 })')
        && commonFunctions.includes('const englishText = englishLines[pairIndex];')
        && commonFunctions.includes('const meaningText = meaningLines[pairIndex];')
        && commonFunctions.includes('if (!englishText || !meaningText) continue;')
        && commonFunctions.includes('pairs.push(`${englishText}')
        && commonFunctions.includes('${meaningText}`);'),
    'BFD 单词表识别应覆盖抗遗忘复习计划上方的全部词表区域，并按实际非空单元格数量导入，允许中间存在空白词格'
);

assert(
    commonFunctions.includes('structuredText = await extractBfdWordListFromImage')
        && commonFunctions.includes('fallbackText = normalizeRecognizedWordTableText')
        && commonFunctions.includes('structuredText || fallbackText'),
    '图片导入应优先走 BFD 词表结构化提取，失败后再回退到普通 OCR 文本清洗'
);

assert(
    formalHtml.includes('commonFunctions.setupNewLearnedWordsImageImport')
        && formalHtml.includes('importWordsImageButton')
        && formalHtml.includes('newLearnedWordsImageInput'),
    '正式课页应在加载后绑定图片识别导入逻辑'
);

console.log('test-index-word-image-import passed');