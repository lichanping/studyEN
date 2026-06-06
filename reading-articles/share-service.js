const fs = require("node:fs/promises");
const path = require("node:path");

let manifestCache = null;

async function loadManifest(reqUrl) {
    if (manifestCache) return manifestCache;

    if (reqUrl) {
        try {
            const manifestUrl = toAssetUrl(reqUrl, "reading-articles/manifest.json");
            const resp = await fetch(manifestUrl);
            if (resp.ok) {
                manifestCache = await resp.json();
                return manifestCache;
            }
        } catch (_) {
            // Fallback to local file read below.
        }
    }

    const manifestPath = path.resolve(process.cwd(), "reading-articles/manifest.json");
    const raw = await fs.readFile(manifestPath, "utf8");
    manifestCache = JSON.parse(raw);
    return manifestCache;
}

function findArticle(manifest, albumId, articleTitle) {
    const album = Array.isArray(manifest?.albums)
        ? manifest.albums.find((item) => item.id === albumId)
        : null;
    if (!album) return null;

    return (Array.isArray(album.articles) ? album.articles : []).find((item) => item.title === articleTitle) || null;
}

function toAssetUrl(reqUrl, relativePath) {
    const origin = new URL(reqUrl).origin;
    const normalized = String(relativePath || "").replace(/^\/+/, "");
    return new URL(`/${normalized}`, origin).href;
}

async function loadTextAsset(reqUrl, relativePath) {
    const assetUrl = toAssetUrl(reqUrl, relativePath);
    const resp = await fetch(assetUrl);
    if (!resp.ok) {
        throw new Error(`asset fetch failed: ${resp.status}`);
    }
    return await resp.text();
}

async function loadBinaryAsset(reqUrl, relativePath) {
    const assetUrl = toAssetUrl(reqUrl, relativePath);
    const resp = await fetch(assetUrl);
    if (!resp.ok) {
        throw new Error(`asset fetch failed: ${resp.status}`);
    }
    return resp;
}

const api = {
    loadManifest,
    findArticle,
    loadTextAsset,
    loadBinaryAsset,
    toAssetUrl,
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
}
