import assert from 'node:assert/strict';
import fs from 'node:fs';
import handler from '../netlify/functions/generate-forget-words-audio.mjs';

const source = fs.readFileSync(new URL('../netlify/functions/generate-forget-words-audio.mjs', import.meta.url), 'utf8');
const synthesizeSource = source.slice(source.indexOf('async function synthesize('), source.indexOf('async function loadLocalAsset('));
const calls = [];
class UnavailableEdgeTTS {
    async synthesize() {
        throw new Error('Unexpected server response: 403');
    }
}
let fallbackResponse;
let rejectSentence = false;
const synthesize = new Function('EdgeTTS', 'fetch', 'Buffer', 'AbortSignal', `${synthesizeSource}\nreturn synthesize;`)(
    UnavailableEdgeTTS,
    async (url, options) => {
        calls.push({ url: new URL(url), options });
        if (rejectSentence && new URL(url).searchParams.get('audio') === 'dusk.') {
            return new Response('unavailable', { status: 500 });
        }
        return fallbackResponse.clone();
    },
    Buffer,
    AbortSignal
);
fallbackResponse = new Response(Buffer.from([0xff, 0xf3, 0xe4, 0xc4]), { headers: { 'Content-Type': 'audio/mpeg' } });
assert.equal((await synthesize('island', 'en-US-JennyNeural', '+0%', 0)).length, 4);
assert.equal(calls[0].url.origin, 'https://dict.youdao.com');
assert.equal(calls[0].url.searchParams.get('audio'), 'island.');
assert.equal(calls[0].url.searchParams.get('le'), 'eng');
assert.ok(calls[0].options.signal instanceof AbortSignal);
fallbackResponse = new Response(Buffer.from([0xff, 0xf3, 0xe4, 0xc4]), { headers: { 'Content-Type': 'audio/mpeg' } });
await synthesize('岛', 'zh-CN-XiaoxiaoNeural', '+0%', 0);
assert.equal(calls[1].url.searchParams.get('le'), 'zh');
assert.equal(calls[1].url.searchParams.get('type'), '1', '中文应使用可覆盖一代等释义的语音类型');
const multiMeaningAudio = await synthesize('协议；一致；符合', 'zh-CN-XiaoxiaoNeural', '+0%', 0);
assert.equal(multiMeaningAudio.length, 12, '备用中文 TTS 应逐条生成全部释义并拼接');
assert.deepEqual(calls.slice(2).map(({ url }) => url.searchParams.get('audio')), ['协议', '一致', '符合']);
rejectSentence = true;
assert.equal((await synthesize('dusk', 'en-US-JennyNeural', '+0%', 0, 'https://preview.example/')).length, 4);
assert.equal(calls.at(-2).url.searchParams.get('audio'), 'dusk.');
assert.equal(calls.at(-1).url.href, 'https://preview.example/sounds/dusk.mp3', '词典原词录音格式不兼容时应使用站内标准音源');
for (const response of [
    new Response('unavailable', { status: 503 }),
    new Response('not audio', { headers: { 'Content-Type': 'text/html' } }),
    new Response('', { headers: { 'Content-Type': 'audio/mpeg' } })
]) {
    fallbackResponse = response;
    await assert.rejects(() => synthesize('island', 'en-US-JennyNeural', '+0%', 0));
}
console.log('test-word-audio-service fallback passed');

if (process.argv.includes('--live')) {
    const response = await handler(new Request('https://engaid.netlify.app/.netlify/functions/generate-forget-words-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            wordPairs: [
                { english: 'dusk', chinese: '黄昏' },
                { english: 'embassy', chinese: '大使馆' },
                { english: 'generation', chinese: '一代' },
                { english: 'identify', chinese: '识别；认出；确认' },
                { english: 'obviously', chinese: '明显地；显然' },
                { english: 'accord', chinese: '协议；一致；符合' }
            ],
            spellingEnabled: false,
            spellingSpeedPreset: 'medium',
            earTrainingEnabled: false
        })
    }));

    assert.equal(response.status, 200, '真实上游应能生成截图中的完整六词词表，而不是返回 500');
    assert.equal(response.headers.get('Content-Type'), 'audio/mpeg');
    const audio = Buffer.from(await response.arrayBuffer());
    assert.ok(audio.length > 1872, '返回音频不能只有开头的静音帧');
    assert.equal(audio[0], 0xff);
    assert.equal(audio[1] & 0xe0, 0xe0);

    console.log(`test-word-audio-service passed (${audio.length} bytes)`);
}
