import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { collectAudioPlan } from '../scripts/generate_yang_kaidi_word_audio.mjs';

const root = await mkdtemp(path.join(os.tmpdir(), 'yang-kaidi-audio-'));
const sourceDir = path.join(root, 'data');
const soundsDir = path.join(root, 'sounds');

try {
    await mkdir(sourceDir);
    await mkdir(soundsDir);
    await writeFile(path.join(sourceDir, 'book.txt'), [
        'Hello\t你好',
        'depend/on\t依靠',
        'New word\t新词',
        'Hello\t再次出现'
    ].join('\n'));
    await writeFile(path.join(soundsDir, 'hello.mp3'), 'audio');
    await writeFile(path.join(soundsDir, 'Depend or on.mp3'), 'audio');

    const plan = await collectAudioPlan(sourceDir, soundsDir);

    assert.equal(plan.entryCount, 4);
    assert.equal(plan.uniqueCount, 3);
    assert.deepEqual(plan.covered, ['hello.mp3']);
    assert.deepEqual(plan.caseRenames, [{ from: 'Depend or on.mp3', to: 'depend or on.mp3' }]);
    assert.deepEqual(plan.missing, [{ speechText: 'New word', fileName: 'new word.mp3' }]);
} finally {
    await rm(root, { recursive: true, force: true });
}

console.log('test-generate-yang-kaidi-word-audio passed');