import assert from 'node:assert/strict';

import { createWordPronunciationHandler } from '../netlify/functions/generate-word-pronunciation.mjs';

const calls = [];
const handler = createWordPronunciationHandler(async (english) => {
    calls.push(english);
    return Buffer.from('mp3');
});

function post(body) {
    return new Request('http://localhost/.netlify/functions/generate-word-pronunciation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
}

assert.equal((await handler(new Request('http://localhost', { method: 'OPTIONS' }))).status, 204);
assert.equal((await handler(new Request('http://localhost', { method: 'GET' }))).status, 405);

for (const body of [
    {},
    { english: '' },
    { english: 'word\tn 单词' },
    { english: 'word\nnext' },
    { english: 'word 中文' },
    { english: 'word', chinese: '单词' },
    { english: 'word', wordPairs: [{ english: 'word' }] }
]) {
    const response = await handler(post(body));
    assert.equal(response.status, 400, `无效请求应被拒绝：${JSON.stringify(body)}`);
}

const response = await handler(post({ english: 'depend on or upon' }));
assert.equal(response.status, 200);
assert.equal(response.headers.get('Content-Type'), 'audio/mpeg');
assert.deepEqual(calls, ['depend on or upon'], '每次请求只合成一次纯英文');
assert.equal(await response.text(), 'mp3');

console.log('test-generate-word-pronunciation passed');