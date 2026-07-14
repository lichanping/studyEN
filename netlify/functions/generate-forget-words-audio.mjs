import { Buffer } from "node:buffer";
import { EdgeTTS } from "@andresaya/edge-tts";
import { buildWordAudioSegments, getWordAudioPauseFramesAfterSegment, getWordAudioRateForSegment, getWordAudioTextForSegment, getWordAudioVoiceForSegment, normalizeWordAudioSpellingSpeedPreset } from "../../word-audio-format.mjs";

/**
 * Netlify Function — 单词 MP3 生成（每次处理 1 个词）
 *
 * POST body: { english: "apple", chinese: "苹果", spellingEnabled?: boolean }
 * Returns: audio/mpeg binary
 */

// MPEG2 Layer3 48kbps 24000Hz mono silent frame (matches edge-tts output format)
const SILENT_FRAME_SIZE = 144;
const SILENT_FRAME = Buffer.alloc(SILENT_FRAME_SIZE);
Buffer.from([0xFF, 0xF3, 0x64, 0xC4]).copy(SILENT_FRAME);

function createSilenceBuffer(frameCount) {
    return Buffer.concat(Array(frameCount).fill(SILENT_FRAME));
}

const SILENCE_BUFFER_CACHE = new Map();

function getSilenceBuffer(frameCount) {
    if (!SILENCE_BUFFER_CACHE.has(frameCount)) {
        SILENCE_BUFFER_CACHE.set(frameCount, createSilenceBuffer(frameCount));
    }
    return SILENCE_BUFFER_CACHE.get(frameCount);
}

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

    const { english, chinese, spellingEnabled, spellingWord, spellingSpeedPreset } = body;
    if (!english) {
        return new Response(JSON.stringify({ error: "english is required" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders() },
        });
    }

    try {
        const normalizedSpellingSpeedPreset = normalizeWordAudioSpellingSpeedPreset(spellingSpeedPreset);
        const segments = buildWordAudioSegments({ english, chinese, spellingEnabled, spellingWord });
        const audioCache = new Map();
        const audioBuffers = await Promise.all(
            segments.map(async (segment) => {
                const voice = getWordAudioVoiceForSegment(segment);
                const rate = getWordAudioRateForSegment(segment, normalizedSpellingSpeedPreset);
                const ttsText = getWordAudioTextForSegment(segment);
                const cacheKey = `${segment.kind}:${segment.lang}:${ttsText}:${rate}`;
                if (!audioCache.has(cacheKey)) {
                    audioCache.set(cacheKey, synthesize(ttsText, voice, rate));
                }
                return audioCache.get(cacheKey);
            })
        );

        const chunks = [];
        audioBuffers.forEach((buffer, index) => {
            chunks.push(buffer);
            if (index < audioBuffers.length - 1) {
                const pauseFrames = getWordAudioPauseFramesAfterSegment(
                    segments[index],
                    segments[index + 1],
                    normalizedSpellingSpeedPreset
                );
                chunks.push(getSilenceBuffer(pauseFrames));
            }
        });

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
