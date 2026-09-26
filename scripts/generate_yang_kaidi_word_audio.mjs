import { readFile, readdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { EdgeTTS } from '@andresaya/edge-tts';

import { toSpeechText } from '../yang-kaidi-word-review-core.mjs';

export async function collectAudioPlan(sourceDir, soundsDir) {
    const sourceFiles = (await readdir(sourceDir)).filter((fileName) => fileName.endsWith('.txt')).sort();
    const soundFiles = (await readdir(soundsDir)).filter((fileName) => fileName.endsWith('.mp3'));
    const soundFileSet = new Set(soundFiles);
    const soundFilesByLowercase = new Map(soundFiles.map((fileName) => [fileName.toLowerCase(), fileName]));
    const speechTexts = [];

    for (const fileName of sourceFiles) {
        const source = await readFile(path.join(sourceDir, fileName), 'utf8');
        for (const rawLine of source.split(/\r?\n/)) {
            if (!rawLine.trim()) continue;
            const separatorIndex = rawLine.indexOf('\t');
            if (separatorIndex < 0) throw new Error(`${fileName} 存在缺少 Tab 的行`);
            speechTexts.push(toSpeechText(rawLine.slice(0, separatorIndex).trim()));
        }
    }

    const uniqueSpeechTexts = [...new Map(speechTexts.map((speechText) => [speechText.toLowerCase(), speechText])).values()];
    const covered = [];
    const caseRenames = [];
    const missing = [];

    for (const speechText of uniqueSpeechTexts) {
        const fileName = `${speechText.toLowerCase()}.mp3`;
        if (soundFileSet.has(fileName)) {
            covered.push(fileName);
        } else if (soundFilesByLowercase.has(fileName)) {
            caseRenames.push({ from: soundFilesByLowercase.get(fileName), to: fileName });
        } else {
            missing.push({ speechText, fileName });
        }
    }

    return {
        entryCount: speechTexts.length,
        uniqueCount: uniqueSpeechTexts.length,
        covered: covered.sort(),
        caseRenames: caseRenames.sort((left, right) => left.to.localeCompare(right.to)),
        missing: missing.sort((left, right) => left.fileName.localeCompare(right.fileName))
    };
}

async function generateAudio(speechText, outputPath) {
    const tts = new EdgeTTS();
    await tts.synthesize(speechText, 'en-US-EmmaNeural');
    await writeFile(outputPath, tts.toBuffer());
}

async function main() {
    const shouldGenerate = process.argv.includes('--generate');
    const sourceDir = path.resolve('data/杨开迪');
    const soundsDir = path.resolve('sounds');
    const plan = await collectAudioPlan(sourceDir, soundsDir);

    console.log(`词库条目 ${plan.entryCount}，唯一发音 ${plan.uniqueCount}`);
    console.log(`已覆盖 ${plan.covered.length}，待规范大小写 ${plan.caseRenames.length}，缺失 ${plan.missing.length}`);
    if (!shouldGenerate) {
        console.log('仅审计；使用 --generate 补齐静态 MP3。');
        return;
    }

    for (const item of plan.caseRenames) {
        await rename(path.join(soundsDir, item.from), path.join(soundsDir, item.to));
        console.log(`重命名 ${item.from} -> ${item.to}`);
    }
    for (const [index, item] of plan.missing.entries()) {
        await generateAudio(item.speechText, path.join(soundsDir, item.fileName));
        console.log(`[${index + 1}/${plan.missing.length}] 已生成 ${item.fileName}`);
    }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    await main();
}