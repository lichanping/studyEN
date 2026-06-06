import shareToken from "../../reading-articles/share-token.js";
import shareService from "../../reading-articles/share-service.js";

function corsHeaders() {
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    };
}

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            ...corsHeaders(),
        },
    });
}

export default async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("", { status: 204, headers: corsHeaders() });
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
        return jsonResponse({ error: "Method not allowed" }, 405);
    }

    const reqUrl = new URL(req.url);
    const token = reqUrl.searchParams.get("token") || "";
    const verified = shareToken.verifyShareToken(token);
    if (!verified.valid) {
        return jsonResponse({ error: verified.reason === "expired" ? "Share link expired" : "Invalid share token" }, verified.reason === "expired" ? 410 : 401);
    }

    try {
        const manifest = await shareService.loadManifest(req.url);
        const article = shareService.findArticle(manifest, verified.payload.albumId, verified.payload.articleTitle);
        if (!article) {
            return jsonResponse({ error: "Article not found" }, 404);
        }

        const rangeHeader = req.headers?.get?.("range");
        const forwardHeaders = {};
        if (rangeHeader) {
            forwardHeaders.range = rangeHeader;
        }

        const upstream = await shareService.loadBinaryAsset(req.url, article.audioPath, {
            method: req.method,
            headers: forwardHeaders,
        });

        return new Response(req.method === "HEAD" ? null : upstream.body, {
            status: upstream.status,
            headers: {
                "Content-Type": upstream.headers.get("Content-Type") || "audio/mpeg",
                "Content-Length": upstream.headers.get("Content-Length") || "",
                "Content-Range": upstream.headers.get("Content-Range") || "",
                "Accept-Ranges": upstream.headers.get("Accept-Ranges") || "bytes",
                "Cache-Control": "no-store",
                ...corsHeaders(),
            },
        });
    } catch (error) {
        console.error("reading-article-share-audio failed:", error);
        return jsonResponse({ error: "Failed to load shared audio" }, 500);
    }
};
