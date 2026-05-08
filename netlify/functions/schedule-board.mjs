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

function parsePositiveInt(value, fallback) {
    const parsed = Number.parseInt(String(value || "").trim(), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
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

    let upstreamUrl;
    if (mode === "completed") {
        const pageNumber = parsePositiveInt(reqUrl.searchParams.get("pageNumber") || body?.pageNumber, 1);
        const pageSize = parsePositiveInt(reqUrl.searchParams.get("pageSize") || body?.pageSize, 50);
        upstreamUrl = `https://apiv2.lxll.com/customer/training/orders?pageNumber=${pageNumber}&pageSize=${pageSize}&status=COMPLETED`;
    } else if (mode === "anti-forgetting-list") {
        // 抗遗忘复习计划核对：线上真实接口
        const studentName = sanitizeText(body?.studentName, 64);
        const startDate = sanitizeText(body?.startDate, 32);
        const endDate = sanitizeText(body?.endDate, 32);
        if (!studentName || !startDate || !endDate) {
            return jsonResponse({ error: "Missing parameters: studentName, startDate, endDate required" }, 400);
        }
        upstreamUrl = "https://apiv2.lxll.com/customer/anti-forget/record/teacher";
    } else {
        upstreamUrl = "https://apiv2.lxll.com/customer/training/board";
    }

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
