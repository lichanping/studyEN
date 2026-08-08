const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'commonFunctions.js'), 'utf8');

function extractBlock(sourceText, signature, openChar = '{', closeChar = '}') {
    const start = sourceText.indexOf(signature);
    if (start === -1) {
        throw new Error(`Unable to find block: ${signature}`);
    }

    const bodyStart = sourceText.indexOf(openChar, start);
    if (bodyStart === -1) {
        throw new Error(`Unable to find block body for: ${signature}`);
    }

    let depth = 0;
    for (let index = bodyStart; index < sourceText.length; index += 1) {
        const char = sourceText[index];
        if (char === openChar) depth += 1;
        if (char === closeChar) {
            depth -= 1;
            if (depth === 0) {
                return sourceText.slice(start, index + 1);
            }
        }
    }

    throw new Error(`Unable to extract block: ${signature}`);
}

const extractEnglishWordsCode = extractBlock(source, 'function extractEnglishWords');
const countEnglishWordsCode = extractBlock(source, 'export function countEnglishWords');

const countEnglishWords = new Function(
    `${extractEnglishWordsCode}\n${countEnglishWordsCode.replace('export ', '')}\nreturn countEnglishWords;`
)();

const sample = `melody
旋律；曲调
offer
主动提出；自愿给予
chorus
合唱团；歌唱队
confident
自信的
athlete
运动员
in person
亲自;当面
spirit
精神；心灵
solo
单独地；独唱
stutter
口吃；结巴
chart
图表；曲线图
what’s more
而且；另外
describe
描述；形容
charity
慈善
calmly
沉着地
gain
增加；增添
survey
调查`;

assert.strictEqual(
    countEnglishWords(sample),
    16,
    'countEnglishWords 应将带弯引号的 what’s more 识别为一个有效词条'
);

console.log('test-word-count passed');