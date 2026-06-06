const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const { createShareToken } = require("../reading-articles/share-token.js");

async function loadHandler(fileName) {
    const fileUrl = pathToFileURL(path.resolve(__dirname, `../netlify/functions/${fileName}`)).href;
    const mod = await import(fileUrl);
    return mod.default;
}

function loadFirstArticle() {
    const manifest = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../reading-articles/manifest.json"), "utf8"));
    const album = manifest.albums[0];
    const article = album.articles[0];
    return { album, article };
}

async function testCreateResolveAndAudioHandlers() {
    const { album, article } = loadFirstArticle();
    const createHandler = await loadHandler("reading-article-share-create.mjs");
    const resolveHandler = await loadHandler("reading-article-share-resolve.mjs");
    const audioHandler = await loadHandler("reading-article-share-audio.mjs");

    const originalFetch = global.fetch;
    global.fetch = async (url) => {
        const urlText = String(url);
        const decodedUrlText = decodeURIComponent(urlText);
        if (decodedUrlText.endsWith("/reading-articles/manifest.json")) {
            return new Response(JSON.stringify({ albums: [{ id: album.id, articles: [article] }] }), {
                status: 200,
                headers: { "Content-Type": "application/json; charset=utf-8" },
            });
        }
        if (decodedUrlText.endsWith(article.textPath)) {
            return new Response("Sample reading article text", {
                status: 200,
                headers: { "Content-Type": "text/plain; charset=utf-8" },
            });
        }
        if (decodedUrlText.endsWith(article.audioPath)) {
            return new Response("FAKE-MP3-DATA", {
                status: 200,
                headers: { "Content-Type": "audio/mpeg" },
            });
        }
        throw new Error(`Unexpected fetch url: ${urlText}`);
    };

    const createResp = await createHandler({
        method: "POST",
        url: "https://example.test/.netlify/functions/reading-article-share-create",
        json: async () => ({
            albumId: album.id,
            articleTitle: article.title,
            expiresInHours: 24,
        }),
    });
    const createBody = await createResp.json();
    assert.strictEqual(createResp.status, 200);
    assert.ok(createBody.shareUrl.includes("/reading-articles/shared.html?token="));

    const resolveResp = await resolveHandler({
        method: "GET",
        url: `https://example.test/.netlify/functions/reading-article-share-resolve?token=${encodeURIComponent(createBody.token)}`,
    });
    const resolveBody = await resolveResp.json();
    assert.strictEqual(resolveResp.status, 200);
    assert.strictEqual(resolveBody.title, article.title);
    assert.strictEqual(resolveBody.textContent, "Sample reading article text");
    assert.ok(resolveBody.audioUrl.includes("reading-article-share-audio?token="));

    const audioResp = await audioHandler({
        method: "GET",
        url: `https://example.test/.netlify/functions/reading-article-share-audio?token=${encodeURIComponent(createBody.token)}`,
    });
    assert.strictEqual(audioResp.status, 200);
    assert.strictEqual(await audioResp.text(), "FAKE-MP3-DATA");

    const audioHeadResp = await audioHandler({
        method: "HEAD",
        url: `https://example.test/.netlify/functions/reading-article-share-audio?token=${encodeURIComponent(createBody.token)}`,
    });
    assert.strictEqual(audioHeadResp.status, 200);

    global.fetch = originalFetch;
}

async function testExpiredTokenShouldBeRejected() {
    const resolveHandler = await loadHandler("reading-article-share-resolve.mjs");
    const token = createShareToken(
        {
            albumId: "mid50",
            articleTitle: "Chapter 2 Tips for Staying Healthy（保持健康的小贴士）",
            expiresAt: Date.now() - 1000,
        }
    );

    const resp = await resolveHandler({
        method: "GET",
        url: `https://example.test/.netlify/functions/reading-article-share-resolve?token=${encodeURIComponent(token)}`,
    });
    const body = await resp.json();
    assert.strictEqual(resp.status, 410);
    assert.strictEqual(body.error, "Share link expired");
}

async function run() {
    await testCreateResolveAndAudioHandlers();
    await testExpiredTokenShouldBeRejected();
    console.log("test-reading-article-share-functions passed");
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
