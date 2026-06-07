const ALBUM_CONFIG = [
    {
        id: "mid50",
        abbr: "R50",
        title: "中阶阅读50篇",
        folder: "user_data/!【5.0】【中级】-中阶-阅读50篇",
    },
    {
        id: "zk",
        abbr: "ZK",
        title: "中考阅读真题",
        folder: "user_data/!【5.0】中考阅读真题",
    },
    {
        id: "wc",
        abbr: "WC",
        title: "高中中级完型填空",
        folder: "user_data/!高中中级完型填空",
    },
];

function normalizePath(input) {
    return String(input || "").replace(/\\/g, "/").replace(/^\.\//, "");
}

function stripExt(fileName) {
    return String(fileName || "").replace(/\.[^/.]+$/, "");
}

function basename(filePath) {
    const normalized = normalizePath(filePath);
    const idx = normalized.lastIndexOf("/");
    return idx >= 0 ? normalized.slice(idx + 1) : normalized;
}

function parseOrder(title) {
    const chapterMatch = String(title).match(/chapter\s*(\d+)/i);
    if (chapterMatch) return Number(chapterMatch[1]);

    const prefixMatch = String(title).match(/^(\d+)[_\s-]/);
    if (prefixMatch) return Number(prefixMatch[1]);

    return Number.MAX_SAFE_INTEGER;
}

function byTitle(a, b) {
    return String(a).localeCompare(String(b), "zh-Hans-CN", { numeric: true, sensitivity: "base" });
}

function buildAlbumTabs(config) {
    return (Array.isArray(config) ? config : []).map((album) => ({
        id: album.id,
        abbr: album.abbr,
        title: album.title,
        folder: album.folder,
    }));
}

function buildArticleEntries(album, filesByType) {
    const textFiles = (filesByType && Array.isArray(filesByType.textFiles)) ? filesByType.textFiles : [];
    const audioFiles = (filesByType && Array.isArray(filesByType.audioFiles)) ? filesByType.audioFiles : [];

    const textMap = new Map();
    const audioMap = new Map();

    textFiles.forEach((filePath) => {
        const normalized = normalizePath(filePath);
        const title = stripExt(basename(normalized));
        if (title) textMap.set(title, normalized);
    });

    audioFiles.forEach((filePath) => {
        const normalized = normalizePath(filePath);
        const title = stripExt(basename(normalized));
        if (title) audioMap.set(title, normalized);
    });

    const entries = [];
    textMap.forEach((textPath, title) => {
        const audioPath = audioMap.get(title);
        if (!audioPath) return;
        entries.push({
            album: album.id,
            title,
            textPath,
            audioPath,
            order: parseOrder(title),
        });
    });

    entries.sort((a, b) => {
        if (a.order !== b.order) return a.order - b.order;
        return byTitle(a.title, b.title);
    });

    return entries;
}

function buildShareUrl(baseUrl, payload) {
    const next = new URL(baseUrl);
    next.searchParams.set("album", payload.album);
    next.searchParams.set("article", payload.article);
    return next.toString();
}

function buildSharedArticleUrl(baseUrl, token) {
    const next = new URL(baseUrl);
    next.searchParams.set("token", token);
    return next.toString();
}

function filterArticles(articles, query) {
    const normalized = String(query || "").trim().toLowerCase();
    if (!normalized) return Array.isArray(articles) ? articles.slice() : [];
    return (Array.isArray(articles) ? articles : []).filter((item) => String(item.title || "").toLowerCase().includes(normalized));
}

function buildProgressKey(albumId, articleTitle) {
    return `${albumId}::${articleTitle}`;
}

function shouldEnableContinuousPlay(searchQuery) {
    return String(searchQuery || "").trim() === "";
}

function getNextArticleTitle(articles, currentTitle) {
    const list = Array.isArray(articles) ? articles : [];
    if (list.length === 0) return "";

    const currentIndex = list.findIndex((item) => item && item.title === currentTitle);
    if (currentIndex < 0) return list[0].title || "";

    const nextIndex = (currentIndex + 1) % list.length;
    return list[nextIndex].title || "";
}

const api = {
    ALBUM_CONFIG,
    buildAlbumTabs,
    buildArticleEntries,
    buildShareUrl,
    buildSharedArticleUrl,
    filterArticles,
    buildProgressKey,
    shouldEnableContinuousPlay,
    getNextArticleTitle,
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
}

if (typeof window !== "undefined") {
    window.ReadingArticleLib = api;
}