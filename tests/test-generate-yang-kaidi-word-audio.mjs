import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, stat, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
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

const auditOutput = execFileSync(process.execPath, ['scripts/generate_yang_kaidi_word_audio.mjs'], { encoding: 'utf8' });
assert(auditOutput.includes('【正课】词库条目 201'), '默认音频命令必须审计三册正课词库');
assert(auditOutput.includes('【历史】词库条目 1528'));
const lessonPlan = await collectAudioPlan('data/杨开迪-我的', 'sounds');
assert.equal(lessonPlan.entryCount, 201);
assert.equal(lessonPlan.uniqueCount, 201);
assert.equal(lessonPlan.missing.length, 0, '新正课全部词应有静态 MP3');
assert.equal(lessonPlan.covered.length + lessonPlan.caseRenames.length, 201, '包含可兼容的已有大写音频');
for (const fileName of [...lessonPlan.covered, ...lessonPlan.caseRenames.map((item) => item.from)]) {
    assert((await stat(path.join('sounds', fileName))).size > 0, `音频为空：${fileName}`);
}
assert((await stat('sounds/Abroad.mp3')).size > 0, '保留已有大写音频引用');
assert((await stat('sounds/Engineer.mp3')).size > 0);

console.log('test-generate-yang-kaidi-word-audio passed');