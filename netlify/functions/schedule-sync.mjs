import { getStore } from "@netlify/blobs";

/**
 * Netlify Function v2 — 排课数据同步 API
 *
 * POST: 上传指定日期的排课快照
 * GET:  下载指定日期的排课快照
 *
 * 使用 Netlify Blobs 作为持久化存储，以 {syncKey}/{date} 为键。
 */

function corsHeaders() {
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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

function isValidDate(str) {
    return /^\d{4}-\d{2}-\d{2}$/.test(str);
}

function sanitizeSyncKey(raw) {
    // Only allow alphanumeric, dash, underscore (prevent path traversal)
    const trimmed = String(raw || "").trim();
    if (!trimmed || trimmed.length > 64) return null;
    if (!/^[\w\-]+$/.test(trimmed)) return null;
    return trimmed;
}

export default async (req, context) => {
    // CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("", { status: 204, headers: corsHeaders() });
    }

    let store;
    try {
        store = getStore("schedule-sync");
    } catch (err) {
        console.error("Failed to get blob store:", err);
        return jsonResponse({ error: "Storage unavailable" }, 500);
    }

    // ─── POST: Upload ─────────────────────────────────────────────
    if (req.method === "POST") {
        let body;
        try {
            body = await req.json();
        } catch (_) {
            return jsonResponse({ error: "Invalid JSON body" }, 400);
        }

        const syncKey = sanitizeSyncKey(body.syncKey);
        const date = body.date;
        const payload = body.payload;

        if (!syncKey) {
            return jsonResponse({ error: "Invalid or missing syncKey (alphanumeric, max 64 chars)" }, 400);
        }
        if (!date || !isValidDate(date)) {
            return jsonResponse({ error: "Invalid or missing date (YYYY-MM-DD)" }, 400);
        }
        if (!payload || typeof payload !== "object") {
            return jsonResponse({ error: "Missing payload object" }, 400);
        }

        const blobKey = `${syncKey}/${date}`;
        const record = {
            ...payload,
            uploadedAt: new Date().toISOString(),
        };

        try {
            await store.setJSON(blobKey, record);
        } catch (err) {
            console.error("Blob write error:", err);
            return jsonResponse({ error: "Failed to write data" }, 500);
        }

        return jsonResponse({
            success: true,
            date,
            uploadedAt: record.uploadedAt,
        });
    }

    // ─── GET: Download ────────────────────────────────────────────
    if (req.method === "GET") {
        const url = new URL(req.url);
        const syncKey = sanitizeSyncKey(url.searchParams.get("syncKey"));
        const date = url.searchParams.get("date");

        if (!syncKey) {
            return jsonResponse({ error: "Invalid or missing syncKey" }, 400);
        }
        if (!date || !isValidDate(date)) {
            return jsonResponse({ error: "Invalid or missing date (YYYY-MM-DD)" }, 400);
        }

        const blobKey = `${syncKey}/${date}`;
        let data;
        try {
            data = await store.get(blobKey, { type: "json" });
        } catch (err) {
            console.error("Blob read error:", err);
            return jsonResponse({ error: "Failed to read data" }, 500);
        }

        if (!data) {
            return jsonResponse({ error: "No data found for this date", date }, 404);
        }

        return jsonResponse({
            success: true,
            date,
            payload: data,
        });
    }

    return jsonResponse({ error: "Method not allowed" }, 405);
};

