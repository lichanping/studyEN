import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
    buildWordAudioBatchRequestPayload,
    buildWordAudioSegments
} from '../word-audio-format.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
const audioFunction = fs.readFileSync(
    path.join(__dirname, '..', 'netlify/functions/generate-forget-words-audio.mjs'),
    'utf8'
);
assert(
    commonFunctions.includes('earTrainingEnabled: isWordAudioEarTrainingEnabled()'),
    '只有遗忘词生成入口应读取磨耳朵开关'
);
assert(
    audioFunction.includes('earTrainingEnabled: Boolean(earTrainingEnabled)'),
    'Netlify Function 应把磨耳朵模式传给每个单词'
);

console.log('test-ear-training-mode passed');