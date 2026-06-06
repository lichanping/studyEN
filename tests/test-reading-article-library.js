const assert = require("assert");
const {
    ALBUM_CONFIG,
    buildAlbumTabs,
    buildArticleEntries,
    buildShareUrl,
    filterArticles,
    buildProgressKey,
} = require("../reading-articles/library.js");

function testBuildAlbumTabsShouldExposeTwoAlbumsWithAbbr() {
    const tabs = buildAlbumTabs(ALBUM_CONFIG);
    assert.strictEqual(tabs.length, 2);
    assert.deepStrictEqual(tabs.map((item) => item.abbr), ["R50", "ZK"]);
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

function run() {
    testBuildAlbumTabsShouldExposeTwoAlbumsWithAbbr();
    testBuildArticleEntriesShouldKeepOnlyTxtAudioPairsAndSortByChapter();
    testBuildShareUrlShouldAttachAlbumAndArticle();
    testFilterArticlesShouldMatchTitleCaseInsensitive();
    testBuildProgressKeyShouldBeStable();
    console.log("test-reading-article-library passed");
}

run();
