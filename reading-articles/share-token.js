const crypto = require("node:crypto");

const TOKEN_KIND = "reading-article-share";
const DEFAULT_TTL_HOURS = 24;

function base64UrlEncode(text) {
    return Buffer.from(String(text), "utf8").toString("base64url");
}

function base64UrlDecode(text) {
    return Buffer.from(String(text), "base64url").toString("utf8");
}

function getShareSecret(explicitSecret) {
    return explicitSecret || process.env.READING_ARTICLES_SHARE_SECRET || "studyen-reading-articles-dev-secret";
}

function normalizePositiveInteger(value, fallback) {
    const parsed = Number.parseInt(String(value || "").trim(), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function makeSignature(secret, data) {
    return crypto.createHmac("sha256", secret).update(data).digest("base64url");
}

function createShareToken(payload, explicitSecret) {
    const secret = getShareSecret(explicitSecret);
    const normalizedPayload = {
        kind: TOKEN_KIND,
        v: 1,
        albumId: String(payload?.albumId || "").trim(),
        articleTitle: String(payload?.articleTitle || "").trim(),
        expiresAt: normalizePositiveInteger(payload?.expiresAt, Date.now() + DEFAULT_TTL_HOURS * 60 * 60 * 1000),
        issuedAt: normalizePositiveInteger(payload?.issuedAt, Date.now()),
    };

    const encodedPayload = base64UrlEncode(JSON.stringify(normalizedPayload));
    const signature = makeSignature(secret, encodedPayload);
    return `${encodedPayload}.${signature}`;
}

function verifyShareToken(token, explicitSecret) {
    const secret = getShareSecret(explicitSecret);
    const tokenText = String(token || "").trim();
    if (!tokenText) {
        return { valid: false, reason: "missing" };
    }

    const parts = tokenText.split(".");
    if (parts.length !== 2) {
        return { valid: false, reason: "invalid" };
    }

    const [encodedPayload, signature] = parts;
    const expectedSignature = makeSignature(secret, encodedPayload);

    const expectedBuffer = Buffer.from(expectedSignature, "utf8");
    const actualBuffer = Buffer.from(signature, "utf8");
    if (expectedBuffer.length !== actualBuffer.length || !crypto.timingSafeEqual(expectedBuffer, actualBuffer)) {
        return { valid: false, reason: "invalid" };
    }

    let payload;
    try {
        payload = JSON.parse(base64UrlDecode(encodedPayload));
    } catch {
        return { valid: false, reason: "invalid" };
    }

    if (payload.kind !== TOKEN_KIND || payload.v !== 1) {
        return { valid: false, reason: "invalid", payload };
    }

    if (!payload.expiresAt || Number(payload.expiresAt) <= Date.now()) {
        return { valid: false, reason: "expired", payload };
    }

    return { valid: true, payload };
}

function buildSharedArticleUrl(baseUrl, token) {
    const next = new URL(baseUrl);
    next.searchParams.set("token", token);
    return next.toString();
}

const api = {
    TOKEN_KIND,
    DEFAULT_TTL_HOURS,
    createShareToken,
    verifyShareToken,
    buildSharedArticleUrl,
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
}

if (typeof window !== "undefined") {
    window.ReadingArticleShareToken = api;
}
