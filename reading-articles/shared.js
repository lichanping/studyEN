(function () {
    const els = {
        title: document.getElementById("article-title"),
        content: document.getElementById("article-content"),
        audio: document.getElementById("article-audio"),
        status: document.getElementById("share-status"),
        expireAt: document.getElementById("share-expire-at"),
    };

    init().catch((error) => {
        console.error("failed to load shared reading page", error);
        setStatus("分享链接无效或已过期");
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

        setStatus("");
        if (els.title) els.title.textContent = payload.title;
        if (els.content) {
            const normalized = String(payload.textContent || "")
                .replace(/^\s*训前准备原文\s*/u, "原文\n\n");
            els.content.textContent = normalized;
        }
        if (els.expireAt) els.expireAt.textContent = `exp ${formatDateTime(payload.expiresAt)}`;
        if (els.audio) {
            els.audio.src = payload.audioUrl;
            els.audio.load();
        }
        document.title = `阅读分享 - ${payload.title}`;
    }

    function setStatus(text) {
        if (els.status) els.status.textContent = text;
    }

    function formatDateTime(value) {
        const date = new Date(Number(value));
        if (Number.isNaN(date.getTime())) return "未知";
        return new Intl.DateTimeFormat("zh-CN", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        }).format(date).replace(/\//g, "-");
    }
})();
