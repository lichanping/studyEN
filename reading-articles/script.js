(function () {
    const lib = window.ReadingArticleLib;
    if (!lib) {
        console.error("ReadingArticleLib is not available");
        return;
    }

    const state = {
        manifest: null,
        activeAlbumId: "",
        activeArticleTitle: "",
        searchQuery: "",
    };

    const els = {
        tabs: document.getElementById("album-tabs"),
        albumTitle: document.getElementById("album-title"),
        list: document.getElementById("article-list"),
        articleTitle: document.getElementById("article-title"),
        articleContent: document.getElementById("article-content"),
        articleAudio: document.getElementById("article-audio"),
        shareCurrent: document.getElementById("share-current"),
        shareExpiry: document.getElementById("share-expiry"),
        searchInput: document.getElementById("article-search"),
        progress: document.getElementById("reading-progress"),
    };

    init().catch((error) => {
        console.error("Failed to initialize reading article page", error);
        els.articleContent.textContent = "加载失败，请稍后重试。";
    });

    async function init() {
        state.manifest = await loadManifest();
        const tabs = lib.buildAlbumTabs(state.manifest.albums);

        const search = new URLSearchParams(window.location.search);
        const preferredAlbum = search.get("album");
        const preferredArticle = search.get("article");

        const defaultAlbum = tabs.find((item) => item.id === preferredAlbum) || tabs[0];
        state.activeAlbumId = defaultAlbum ? defaultAlbum.id : "";

        bindEvents(tabs);
        renderTabs(tabs);
        renderList();

        if (preferredArticle) {
            const matched = getVisibleArticles().find((entry) => entry.title === preferredArticle);
            if (matched) {
                setActiveArticle(matched.title);
                return;
            }
        }

        const firstArticle = getVisibleArticles()[0];
        if (firstArticle) {
            setActiveArticle(firstArticle.title);
        }
    }

    function bindEvents(tabs) {
        els.shareCurrent.addEventListener("click", shareCurrentArticle);
        els.searchInput.addEventListener("input", () => {
            state.searchQuery = els.searchInput.value.trim();
            renderList();
        });
        els.progress.addEventListener("input", () => {
            const key = getProgressKey();
            window.localStorage.setItem(key, String(els.progress.value || "0"));
        });

        if (els.articleAudio) {
            els.articleAudio.addEventListener("loadedmetadata", () => {
                const saved = window.localStorage.getItem(getProgressKey());
                if (saved !== null) {
                    els.progress.value = saved;
                }
            });
            els.articleAudio.addEventListener("ended", handleAudioEnded);
        }

        state.tabs = tabs;
    }

    async function loadManifest() {
        const res = await fetch("./manifest.json");
        if (!res.ok) {
            throw new Error("manifest fetch failed");
        }
        const manifest = await res.json();
        if (!manifest || !Array.isArray(manifest.albums)) {
            throw new Error("invalid manifest format");
        }
        return manifest;
    }

    function getActiveAlbum() {
        return state.manifest.albums.find((album) => album.id === state.activeAlbumId) || null;
    }

    function getVisibleArticles() {
        const album = getActiveAlbum();
        const articles = album ? album.articles : [];
        return lib.filterArticles(articles, state.searchQuery);
    }

    function getProgressKey() {
        return lib.buildProgressKey(state.activeAlbumId, state.activeArticleTitle || "");
    }

    function toRootAssetUrl(relativePath) {
        const cleaned = String(relativePath || "").replace(/^\/+/, "");
        return new URL(`../${cleaned}`, window.location.href).href;
    }

    function renderTabs(tabs) {
        els.tabs.innerHTML = "";
        tabs.forEach((tab) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = `album-tab${tab.id === state.activeAlbumId ? " active" : ""}`;
            button.textContent = tab.abbr;
            button.title = tab.title;
            button.addEventListener("click", () => {
                state.activeAlbumId = tab.id;
                state.activeArticleTitle = "";
                renderTabs(tabs);
                renderList();
                const first = getVisibleArticles()[0];
                if (first) setActiveArticle(first.title);
            });
            els.tabs.appendChild(button);
        });
    }

    function renderList() {
        const album = getActiveAlbum();
        const articles = getVisibleArticles();
        els.albumTitle.textContent = album ? `${album.title}（${album.count}篇）` : "专辑";
        els.list.innerHTML = "";

        articles.forEach((article, index) => {
            const li = document.createElement("li");
            li.className = `article-item${article.title === state.activeArticleTitle ? " active" : ""}`;
            li.textContent = `${index + 1}. ${article.title}`;
            li.addEventListener("click", () => setActiveArticle(article.title));
            els.list.appendChild(li);
        });
    }

    async function setActiveArticle(title, options = {}) {
        const shouldAutoPlay = Boolean(options.autoPlay);
        state.activeArticleTitle = title;
        renderList();

        const article = getVisibleArticles().find((item) => item.title === title);
        if (!article) return;

        els.articleTitle.textContent = article.title;
        els.articleAudio.src = toRootAssetUrl(article.audioPath);
        els.articleAudio.load();

        const textRes = await fetch(toRootAssetUrl(article.textPath));
        if (!textRes.ok) {
            els.articleContent.textContent = "文章加载失败。";
            return;
        }

        els.articleContent.textContent = await textRes.text();
        const saved = window.localStorage.getItem(getProgressKey());
        els.progress.value = saved !== null ? saved : "0";
        syncUrl(article.title);

        if (shouldAutoPlay) {
            try {
                await els.articleAudio.play();
            } catch (error) {
                console.warn("auto play next article failed", error);
            }
        }
    }

    async function handleAudioEnded() {
        if (!lib.shouldEnableContinuousPlay(state.searchQuery)) {
            return;
        }

        const nextTitle = lib.getNextArticleTitle(getVisibleArticles(), state.activeArticleTitle);
        if (!nextTitle || nextTitle === state.activeArticleTitle) {
            return;
        }

        await setActiveArticle(nextTitle, { autoPlay: true });
    }

    function syncUrl(articleTitle) {
        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.set("album", state.activeAlbumId);
        nextUrl.searchParams.set("article", articleTitle);
        window.history.replaceState(null, "", nextUrl.toString());
    }

    async function shareCurrentArticle() {
        const article = getVisibleArticles().find((item) => item.title === state.activeArticleTitle);
        if (!article) {
            alert("请先选择文章");
            return;
        }

        if (els.shareCurrent) {
            els.shareCurrent.disabled = true;
        }

        try {
            const res = await fetch("/.netlify/functions/reading-article-share-create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    albumId: state.activeAlbumId,
                    articleTitle: article.title,
                    expiresInMinutes: Number.parseInt(String(els.shareExpiry?.value || "1440"), 10) || 1440,
                }),
            });

            const payload = await res.json();
            if (!res.ok) {
                throw new Error(payload.error || "share-create-failed");
            }

            const shareUrl = payload.shareUrl;
            if (navigator.share) {
                try {
                    await navigator.share({
                        title: `阅读文章：${article.title}`,
                        text: "一起学习这篇英语阅读文章",
                        url: shareUrl,
                    });
                    return;
                } catch (error) {
                    console.warn("navigator.share cancelled or failed", error);
                }
            }

            if (navigator.clipboard?.writeText) {
                try {
                    await navigator.clipboard.writeText(shareUrl);
                    alert("分享链接已复制，可粘贴到微信");
                    return;
                } catch (error) {
                    console.warn("clipboard write failed", error);
                }
            }

            // WeChat WebView often blocks navigator.share/clipboard. Provide manual copy fallback.
            window.prompt("复制下方链接后分享到微信", shareUrl);
        } catch (error) {
            console.error("shareCurrentArticle failed", error);
            alert("创建分享链接失败，请稍后重试");
        } finally {
            if (els.shareCurrent) {
                els.shareCurrent.disabled = false;
            }
        }
    }
})();