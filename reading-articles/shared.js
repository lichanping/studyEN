(function () {
    const els = {
        title: document.getElementById("article-title"),
        content: document.getElementById("article-content"),
        audio: document.getElementById("article-audio"),
    };

    init().catch((error) => {
        console.error("failed to load shared reading page", error);
        els.content.textContent = "当前链接不可访问。";
        if (els.audio) els.audio.disabled = true;
    });

    async function init() {
        const token = new URLSearchParams(window.location.search).get("token");
        if (!token) {
            throw new Error("missing-token");
        }

        const res = await fetch(`/.netlify/functions/reading-article-share-resolve?token=${encodeURIComponent(token)}`);
        const payload = await res.json();
        if (!res.ok) {
            throw new Error(payload.error || "share-resolve-failed");
        }

        if (els.title) els.title.textContent = payload.title;
        if (els.content) {
            const normalized = String(payload.textContent || "")
                .replace(/^\s*训前准备原文\s*/u, "原文\n\n");
            els.content.textContent = normalized;
        }
        if (els.audio) {
            els.audio.src = payload.audioUrl;
            els.audio.load();
        }
        document.title = `阅读分享 - ${payload.title}`;
    }
})();
