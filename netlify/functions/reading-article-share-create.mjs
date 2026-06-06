import shareToken from "../../reading-articles/share-token.js";
import shareService from "../../reading-articles/share-service.js";

function corsHeaders() {
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
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

function normalizeTtlMinutes(body) {
    const allowedMinutes = [5, 60, 360, 1440, 4320];

    const parsedMinutes = Number.parseInt(String(body?.expiresInMinutes || "").trim(), 10);
    if (allowedMinutes.includes(parsedMinutes)) {
        return parsedMinutes;
    }

    const parsedHours = Number.parseInt(String(body?.expiresInHours || "").trim(), 10);
    if (Number.isFinite(parsedHours) && parsedHours > 0) {
        const hourAsMinutes = parsedHours * 60;
        if (allowedMinutes.includes(hourAsMinutes)) {
            return hourAsMinutes;
        }
    }

    return 1440;
}

export default async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("", { status: 204, headers: corsHeaders() });
    }

    if (req.method !== "POST") {
        return jsonResponse({ error: "Method not allowed" }, 405);
    }

    let body;
    try {
        body = await req.json();
    } catch {
        return jsonResponse({ error: "Invalid JSON" }, 400);
    }

    const albumId = String(body?.albumId || "").trim();
    const articleTitle = String(body?.articleTitle || "").trim();
    const ttlMinutes = normalizeTtlMinutes(body);

    if (!albumId || !articleTitle) {
        return jsonResponse({ error: "albumId and articleTitle are required" }, 400);
    }

    try {
        const manifest = await shareService.loadManifest(req.url);
        const article = shareService.findArticle(manifest, albumId, articleTitle);
        if (!article) {
            return jsonResponse({ error: "Article not found" }, 404);
        }

        const expiresAt = Date.now() + ttlMinutes * 60 * 1000;
        const token = shareToken.createShareToken({ albumId, articleTitle, expiresAt });
        const shareUrl = shareToken.buildSharedArticleUrl(
            `${new URL(req.url).origin}/reading-articles/shared.html`,
            token
        );

        return jsonResponse({
            token,
            shareUrl,
            expiresAt,
            albumId,
            articleTitle,
            ttlMinutes,
        });
    } catch (error) {
        console.error("reading-article-share-create failed:", error);
        return jsonResponse({ error: "Failed to create share link" }, 500);
    }
};
