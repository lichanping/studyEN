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

    if (req.method !== "GET") {
        return jsonResponse({ error: "Method not allowed" }, 405);
    }

    const reqUrl = new URL(req.url);
    const token = reqUrl.searchParams.get("token") || "";
    const verified = shareToken.verifyShareToken(token);
    if (!verified.valid) {
        return jsonResponse({ error: verified.reason === "expired" ? "Share link expired" : "Invalid share token" }, verified.reason === "expired" ? 410 : 401);
    }

    const manifest = await shareService.loadManifest();
    const article = shareService.findArticle(manifest, verified.payload.albumId, verified.payload.articleTitle);
    if (!article) {
        return jsonResponse({ error: "Article not found" }, 404);
    }

    const upstream = await shareService.loadBinaryAsset(req.url, article.audioPath);
    return new Response(upstream.body, {
        status: upstream.status,
        headers: {
            "Content-Type": upstream.headers.get("Content-Type") || "audio/mpeg",
            "Cache-Control": "no-store",
            ...corsHeaders(),
        },
    });
};
