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
const LETTER_AUDIO_CACHE = new Map();
const WORD_AUDIO_GAP_FRAMES = 13;

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

async function loadLocalAsset(assetPath, requestUrl) {
    if (!assetPath) {
        throw new Error("Missing assetPath for spelling segment");
    }

    const normalizedAssetPath = assetPath.startsWith("/") ? assetPath : `/${assetPath}`;
    const assetUrl = new URL(normalizedAssetPath, requestUrl).toString();

    if (!LETTER_AUDIO_CACHE.has(assetUrl)) {
        LETTER_AUDIO_CACHE.set(assetUrl, (async () => {
            const response = await fetch(assetUrl);
            if (!response.ok) {
                throw new Error(`Failed to load spelling asset: ${assetUrl} (${response.status})`);
            }
            const arrayBuffer = await response.arrayBuffer();
            return Buffer.from(arrayBuffer);
        })());
    }

    return LETTER_AUDIO_CACHE.get(assetUrl);
}

async function buildSingleWordAudioBuffer(wordPair, normalizedSpellingSpeedPreset, requestUrl) {
    const segments = buildWordAudioSegments(wordPair);
    const audioCache = new Map();
    const audioBuffers = await Promise.all(
        segments.map(async (segment) => {
            if (segment.kind === "spelling") {
                return loadLocalAsset(segment.assetPath, requestUrl);
            }

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

    return Buffer.concat(chunks);
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
    const requestWordPairs = Array.isArray(body?.wordPairs) && body.wordPairs.length > 0
        ? body.wordPairs
        : [{ english, chinese, spellingWord }];

    if (!requestWordPairs.some((wordPair) => String(wordPair?.english || "").trim())) {
        return new Response(JSON.stringify({ error: "english is required" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders() },
        });
    }

    try {
        const normalizedSpellingSpeedPreset = normalizeWordAudioSpellingSpeedPreset(spellingSpeedPreset);
        const singleWordBuffers = await Promise.all(
            requestWordPairs
                .filter((wordPair) => String(wordPair?.english || "").trim())
                .map((wordPair) => buildSingleWordAudioBuffer({
                    ...wordPair,
                    spellingEnabled: Boolean(spellingEnabled),
                }, normalizedSpellingSpeedPreset, req.url))
        );

        const wordAudioBuffers = [getSilenceBuffer(WORD_AUDIO_GAP_FRAMES)];
        singleWordBuffers.forEach((buffer, index) => {
            wordAudioBuffers.push(buffer);
            if (index < singleWordBuffers.length - 1) {
                wordAudioBuffers.push(getSilenceBuffer(WORD_AUDIO_GAP_FRAMES));
            }
        });
        const combined = Buffer.concat(wordAudioBuffers);

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
