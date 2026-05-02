function corsHeaders() {
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
    };
}

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            ...corsHeaders()
        }
    });
}

function sanitizeText(value, maxLen = 256) {
    const text = String(value || "").trim();
    if (!text) return "";
    return text.slice(0, maxLen);
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
    } catch (_) {
        return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    const reqUrl = new URL(req.url);
    const modeFromQuery = sanitizeText(reqUrl.searchParams.get("mode"), 64).toLowerCase();
    const modeFromBody = sanitizeText(body?.mode, 64).toLowerCase();
    const mode = modeFromQuery || modeFromBody || "board";

    const token = sanitizeText(body?.token, 4096);
    const userId = sanitizeText(body?.userId, 64);
    const xUa = sanitizeText(body?.xUa, 128) || "ct=2&v=5.0.96";

    if (!token) {
        return jsonResponse({ error: "Missing token" }, 400);
    }

    const headers = {
        "accept": "application/json, text/plain, */*",
        "authorization": "Bearer " + token,
        "x-token-c": token,
        "x-ua": xUa
    };
    if (userId) {
        headers["x-user-id"] = userId;
    }

    const upstreamUrl = mode === "completed"
        ? "https://apiv2.lxll.com/customer/training/orders?pageNumber=1&pageSize=50&status=COMPLETED"
        : "https://apiv2.lxll.com/customer/training/board";

    try {
        const resp = await fetch(upstreamUrl, {
            method: "GET",
            headers
        });

        const text = await resp.text();
        let payload;
        try {
            payload = text ? JSON.parse(text) : {};
        } catch (_) {
            payload = { raw: text };
        }

        if (!resp.ok) {
            return jsonResponse({ error: "Upstream request failed", status: resp.status, payload }, 502);
        }

        return jsonResponse(payload, 200);
    } catch (error) {
        console.error("schedule-board proxy failed:", error);
        return jsonResponse({ error: "Proxy request failed", detail: error.message || "unknown" }, 500);
    }
};
