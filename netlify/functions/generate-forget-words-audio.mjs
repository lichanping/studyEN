import { Buffer } from "node:buffer";
import { EdgeTTS } from "@andresaya/edge-tts";

/**
 * Netlify Function — 单词 MP3 生成（每次处理 1 个词）
 *
 * POST body: { english: "apple", chinese: "苹果" }
 * Returns: audio/mpeg binary (英文 → 英文 → 中文)
 */

const EN_VOICE = "en-US-EmmaNeural";
const ZH_VOICE = "zh-CN-XiaoxiaoNeural";
const EN_RATE = "+30%";
const ZH_RATE = "+30%";

// MPEG2 Layer3 48kbps 24000Hz mono silent frame (matches edge-tts output format)
const SILENT_FRAME_SIZE = 144;
const SILENT_FRAME = Buffer.alloc(SILENT_FRAME_SIZE);
Buffer.from([0xFF, 0xF3, 0x64, 0xC4]).copy(SILENT_FRAME);

// 0.15s ≈ 6 frames (each frame = 24ms at 24kHz)
const SILENCE_SHORT = Buffer.concat(Array(6).fill(SILENT_FRAME));

function corsHeaders() {
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    };
}

async function synthesize(text, voice, rate, retries = 2) {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const ttsInstance = new EdgeTTS();
            await ttsInstance.synthesize(text, voice, { rate });
            return ttsInstance.toBuffer();
        } catch (err) {
            if (attempt === retries) throw err;
            await new Promise(r => setTimeout(r, 1000));
        }
    }
}

export default async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("", { status: 204, headers: corsHeaders() });
    }

    if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
            headers: { "Content-Type": "application/json", ...corsHeaders() },
        });
    }

    let body;
    try {
        body = await req.json();
    } catch {
        return new Response(JSON.stringify({ error: "Invalid JSON" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders() },
        });
    }

    const { english, chinese } = body;
    if (!english) {
        return new Response(JSON.stringify({ error: "english is required" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders() },
        });
    }

    try {
        // 并行合成英文和中文
        const [enBuf, zhBuf] = await Promise.all([
            synthesize(english, EN_VOICE, EN_RATE),
            chinese ? synthesize(chinese, ZH_VOICE, ZH_RATE) : Promise.resolve(null),
        ]);

        // 拼装: 英文 → 0.15s → 英文 → 0.15s → 中文
        const chunks = [enBuf, SILENCE_SHORT, enBuf, SILENCE_SHORT];
        if (zhBuf) chunks.push(zhBuf);

        const combined = Buffer.concat(chunks);

        return new Response(combined, {
            status: 200,
            headers: {
                "Content-Type": "audio/mpeg",
                ...corsHeaders(),
            },
        });
    } catch (err) {
        console.error("TTS generation error:", err);
        return new Response(JSON.stringify({ error: "音频生成失败，请稍后重试" }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders() },
        });
    }
};
