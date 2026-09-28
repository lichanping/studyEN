import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
    buildWordAudioBatchRequestPayload,
    buildWordAudioSegments
} from '../word-audio-format.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function extractFunction(source, signature) {
    const start = source.indexOf(signature);
    assert(start >= 0, `缺少函数：${signature}`);
    const braceStart = source.indexOf('{', start);
    let depth = 0;
    for (let index = braceStart; index < source.length; index += 1) {
        if (source[index] === '{') depth += 1;
        if (source[index] === '}') depth -= 1;
        if (depth === 0) return source.slice(start, index + 1);
    }
    throw new Error(`函数未闭合：${signature}`);
}

assert.deepEqual(
    buildWordAudioSegments({
        english: 'book',
        chinese: '书本',
        spellingEnabled: true,
        earTrainingEnabled: true
    }).map((segment) => segment.text || segment.letter),
    ['书本', 'book', 'book', 'book', 'book', 'book', 'book'],
    '磨耳朵模式应先中文一遍，再英文六遍，并忽略拼写'
);

assert.deepEqual(
    buildWordAudioSegments({ english: 'book', chinese: '', earTrainingEnabled: true })
        .map((segment) => segment.text),
    ['book', 'book', 'book', 'book', 'book', 'book'],
    '缺少中文时仍应生成六遍英文'
);

const legacyPayload = buildWordAudioBatchRequestPayload([
    { english: 'book', chinese: '书本' }
]);
assert.equal(legacyPayload.earTrainingEnabled, false, '旧调用默认应关闭磨耳朵模式');

const earTrainingPayload = buildWordAudioBatchRequestPayload([
    { english: 'book', chinese: '书本' }
], false, 'medium', true);
assert.equal(earTrainingPayload.earTrainingEnabled, true, '客户端 payload 应透传磨耳朵模式');

const commonFunctions = fs.readFileSync(path.join(__dirname, '..', 'commonFunctions.js'), 'utf8');
const antiForgettingPage = fs.readFileSync(path.join(__dirname, '..', 'anti-forgetting.html'), 'utf8');
const audioFunction = fs.readFileSync(
    path.join(__dirname, '..', 'netlify/functions/generate-forget-words-audio.mjs'),
    'utf8'
);
assert(
    commonFunctions.match(/earTrainingEnabled: isWordAudioEarTrainingEnabled\(\)/g)?.length === 2,
    '遗忘词和纠音 MP3 都应读取磨耳朵开关'
);
assert(
    audioFunction.includes('earTrainingEnabled: Boolean(earTrainingEnabled)'),
    'Netlify Function 应把磨耳朵模式传给每个单词'
);

const buildWordAudioFileName = new Function(
    `${extractFunction(commonFunctions, 'export function buildWordAudioFileName').replace('export ', '')}\nreturn buildWordAudioFileName;`
)();
assert.equal(
    buildWordAudioFileName('杨开迪', '遗忘词', '2026-09-28', false, false),
    '杨开迪_遗忘词_2026-09-28.mp3',
    '普通模式应保持现有文件名'
);
assert.equal(
    buildWordAudioFileName('杨开迪', '遗忘词', '2026-09-28', true, false),
    '杨开迪_遗忘词_磨耳朵_2026-09-28.mp3',
    '磨耳朵模式文件名应包含模式名'
);
assert.equal(
    buildWordAudioFileName('杨开迪', '发音纠正', '2026-09-28', true, false),
    '杨开迪_发音纠正_磨耳朵_2026-09-28.mp3',
    '纠音 MP3 的磨耳朵模式文件名也应包含模式名'
);
assert.equal(
    buildWordAudioFileName('杨开迪', '遗忘词', '2026-09-28', false, true),
    '杨开迪_遗忘词_拼写_2026-09-28.mp3',
    '遗忘词 MP3 的拼写模式文件名应包含模式名'
);
assert.equal(
    buildWordAudioFileName('杨开迪', '发音纠正', '2026-09-28', false, true),
    '杨开迪_发音纠正_拼写_2026-09-28.mp3',
    '拼写模式文件名应包含模式名'
);
assert(
    antiForgettingPage.includes('磨耳朵模式（中文1遍 → 英文6遍，同时作用于以上两个 MP3）'),
    '页面应明确磨耳朵模式同时作用于遗忘词和纠音 MP3'
);

console.log('test-ear-training-mode passed');