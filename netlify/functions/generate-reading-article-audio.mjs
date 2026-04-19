import { Buffer } from "node:buffer";
import { EdgeTTS } from "@andresaya/edge-tts";

const EN_VOICE = "en-US-EmmaNeural";
const ZH_VOICE = "zh-CN-XiaoxiaoNeural";
const ZH_RATE = "+0%";
const DEFAULT_RATE = "+10%";
const ALLOWED_RATES = ["+0%", "+10%", "+30%"];
const MAX_ARTICLE_LENGTH = 4000;

const CJK_RE = /[\u4e00-\u9fff]/;

function corsHeaders() {
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    };
}

function normalizeArticleText(text) {
    return String(text || "")
        .replace(/\r\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .replace(/[ \t]{2,}/g, " ")
        .trim();
}

/**
 * 将一行文本按中英文边界拆分为片段。
 * 例如 "Hello world.你好世界" → [{lang:"en",text:"Hello world."},{lang:"zh",text:"你好世界"}]
 */
function splitLineIntoFragments(line) {
    const fragments = [];
    // 匹配连续的中文字符（含标点）或连续的非中文字符
    const SEGMENT_RE = /([\u4e00-\u9fff\u3000-\u303f\uff00-\uffef，。！？；、""''（）【】《》·…—]+|[^\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]+)/g;
    let match;
    while ((match = SEGMENT_RE.exec(line)) !== null) {
        const part = match[1].trim();
        if (!part) continue;
        const lang = CJK_RE.test(part) ? "zh" : "en";
        fragments.push({ lang, text: part });
    }
    return fragments;
}

/**
 * 将文章拆分为连续的语言段落（英文 or 中文），
 * 同语言的连续片段合并，减少 TTS 调用次数。
 */
function splitSegments(text) {
    const lines = text.split("\n").filter((l) => l.trim());
    const segments = [];
    for (const line of lines) {
        const fragments = splitLineIntoFragments(line.trim());
        for (const frag of fragments) {
            const last = segments[segments.length - 1];
            if (last && last.lang === frag.lang) {
                last.text += "\n" + frag.text;
            } else {
                segments.push({ lang: frag.lang, text: frag.text });
            }
        }
    }
    return segments;
}

async function synthesize(text, voice, rate, retries = 2) {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const ttsInstance = new EdgeTTS();
            await ttsInstance.synthesize(text, voice, { rate });
            return ttsInstance.toBuffer();
        } catch (err) {
            if (attempt === retries) throw err;
            await new Promise((resolve) => setTimeout(resolve, 1000));
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

    const article = normalizeArticleText(body?.article);
    if (!article) {
        return new Response(JSON.stringify({ error: "article is required" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders() },
        });
    }

    if (article.length > MAX_ARTICLE_LENGTH) {
        return new Response(JSON.stringify({ error: `article too long (max ${MAX_ARTICLE_LENGTH})` }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders() },
        });
    }

    const rate = ALLOWED_RATES.includes(body?.rate) ? body.rate : DEFAULT_RATE;

    try {
        const segments = splitSegments(article);
        const buffers = [];
        for (const seg of segments) {
            const voice = seg.lang === "zh" ? ZH_VOICE : EN_VOICE;
            const segRate = (seg.lang === "zh" && rate === "-10%") ? ZH_RATE : rate;
            buffers.push(await synthesize(seg.text, voice, segRate));
        }
        const audioBuffer = Buffer.concat(buffers);
        return new Response(audioBuffer, {
            status: 200,
            headers: {
                "Content-Type": "audio/mpeg",
                ...corsHeaders(),
            },
        });
    } catch (err) {
        console.error("Article TTS generation error:", err);
        return new Response(JSON.stringify({ error: "音频生成失败，请稍后重试" }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders() },
        });
    }
};
