import { EdgeTTS } from '@andresaya/edge-tts';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
};

function jsonResponse(body, status) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
}

async function synthesizeEnglish(english) {
    const tts = new EdgeTTS();
    await tts.synthesize(english, 'en-US-EmmaNeural');
    return tts.toBuffer();
}

export function createWordPronunciationHandler(synthesize = synthesizeEnglish) {
    return async (request) => {
        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: CORS_HEADERS });
        }
        if (request.method !== 'POST') {
            return jsonResponse({ error: 'Method not allowed' }, 405);
        }

        let body;
        try {
            body = await request.json();
        } catch (_) {
            return jsonResponse({ error: 'Invalid JSON' }, 400);
        }

        const keys = body && typeof body === 'object' ? Object.keys(body) : [];
        const english = typeof body?.english === 'string' ? body.english.trim() : '';
        if (keys.length !== 1 || keys[0] !== 'english' || !english || /[\t\r\n\u3400-\u9fff]/u.test(english)) {
            return jsonResponse({ error: '只允许提交单个纯英文单词或短语' }, 400);
        }

        try {
            const audio = await synthesize(english);
            return new Response(audio, {
                status: 200,
                headers: { 'Content-Type': 'audio/mpeg', ...CORS_HEADERS }
            });
        } catch (error) {
            console.error('Word pronunciation generation error:', error);
            return jsonResponse({ error: '音频生成失败，请稍后重试' }, 500);
        }
    };
}

export default createWordPronunciationHandler();