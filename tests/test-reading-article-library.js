const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
    ALBUM_CONFIG,
    buildAlbumTabs,
    buildArticleEntries,
    buildShareUrl,
    filterArticles,
    buildProgressKey,
    getNextArticleTitle,
    shouldEnableContinuousPlay,
} = require("../reading-articles/library.js");

function testBuildAlbumTabsShouldExposeConfiguredAlbumsWithAbbr() {
    const tabs = buildAlbumTabs(ALBUM_CONFIG);
    assert.strictEqual(tabs.length, 6);
    assert.deepStrictEqual(tabs.map((item) => item.abbr), ["R50", "W25", "CJ", "ZK", "WC", "GY"]);

    const clozeAlbum = tabs.find((item) => item.id === "midCloze25");
    assert.ok(clozeAlbum, "中阶完形填空25篇 album should be exposed");
    assert.strictEqual(clozeAlbum.title, "中阶完形填空25篇");
    assert.strictEqual(clozeAlbum.folder, "user_data/!【5.0】【中级】-中阶-分级阅读_完形填空_25篇");

    const earlyAlbum = tabs.find((item) => item.id === "early50");
    assert.ok(earlyAlbum, "初阶阅读50篇 album should be exposed");
    assert.strictEqual(earlyAlbum.title, "初阶阅读50篇");
    assert.strictEqual(earlyAlbum.folder, "user_data/!【5.0】【中级】-初阶-阅读50篇");
}

function testBuildArticleEntriesShouldKeepOnlyTxtAudioPairsAndSortByChapter() {
    const album = {
        id: "mid50",
        folder: "user_data/!【5.0】【中级】-中阶-阅读50篇",
    };

    const entries = buildArticleEntries(album, {
        textFiles: [
            "user_data/!【5.0】【中级】-中阶-阅读50篇/Chapter 10 B.txt",
            "user_data/!【5.0】【中级】-中阶-阅读50篇/Chapter 2 A.txt",
            "user_data/!【5.0】【中级】-中阶-阅读50篇/Chapter 11 C.txt",
        ],
        audioFiles: [
            "user_data/!【5.0】【中级】-中阶-阅读50篇/audio/Chapter 11 C.mp3",
            "user_data/!【5.0】【中级】-中阶-阅读50篇/audio/Chapter 2 A.mp3",
        ],
    });

    assert.deepStrictEqual(entries.map((item) => item.title), [
        "Chapter 2 A",
        "Chapter 11 C",
    ]);
}

function testManifestShouldIncludeAllMidClozeArticles() {
    const manifestPath = path.resolve(__dirname, "../reading-articles/manifest.json");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const album = manifest.albums.find((item) => item.id === "midCloze25");

    assert.ok(album, "中阶完形填空25篇 should be present in manifest");
    assert.strictEqual(album.count, 25);
    assert.deepStrictEqual(album.articles.map((item) => item.order), Array.from({ length: 25 }, (_, index) => index + 1));
}

function testBuildShareUrlShouldAttachAlbumAndArticle() {
    const url = buildShareUrl("https://example.com/reading-articles/index.html", {
        album: "mid50",
        article: "Chapter 2 A",
    });

    assert.strictEqual(
        url,
        "https://example.com/reading-articles/index.html?album=mid50&article=Chapter+2+A"
    );
}

function testFilterArticlesShouldMatchTitleCaseInsensitive() {
    const result = filterArticles([
        { title: "Chapter 2 Healthy" },
        { title: "Hydrogen-Powered Trains" },
        { title: "Lantern Festival" },
    ], "hYdRo");

    assert.deepStrictEqual(result.map((item) => item.title), ["Hydrogen-Powered Trains"]);
}

function testBuildProgressKeyShouldBeStable() {
    assert.strictEqual(buildProgressKey("mid50", "Chapter 2 A"), "mid50::Chapter 2 A");
}

function testGetNextArticleTitleShouldLoopWithinAlbum() {
    const titles = [
        { title: "A" },
        { title: "B" },
        { title: "C" },
    ];

    assert.strictEqual(getNextArticleTitle(titles, "A"), "B");
    assert.strictEqual(getNextArticleTitle(titles, "C"), "A");
}

function testShouldEnableContinuousPlayShouldDependOnSearchQuery() {
    assert.strictEqual(shouldEnableContinuousPlay(""), true);
    assert.strictEqual(shouldEnableContinuousPlay("   "), true);
    assert.strictEqual(shouldEnableContinuousPlay("chapter"), false);
}

function run() {
    testBuildAlbumTabsShouldExposeConfiguredAlbumsWithAbbr();
    testBuildArticleEntriesShouldKeepOnlyTxtAudioPairsAndSortByChapter();
    testManifestShouldIncludeAllMidClozeArticles();
    testBuildShareUrlShouldAttachAlbumAndArticle();
    testFilterArticlesShouldMatchTitleCaseInsensitive();
    testBuildProgressKeyShouldBeStable();
    testGetNextArticleTitleShouldLoopWithinAlbum();
    testShouldEnableContinuousPlayShouldDependOnSearchQuery();
    console.log("test-reading-article-library passed");
}

run();
