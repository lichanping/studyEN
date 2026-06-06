const assert = require("assert");
const fs = require("fs");
const path = require("path");

function readWorkspaceFile(relPath) {
    return fs.readFileSync(path.resolve(__dirname, "..", relPath), "utf8");
}

function testIndexShouldUseReadingArticleEntry() {
    const html = readWorkspaceFile("index.html");
    assert.ok(html.includes('id="navigateToReadingArticlePage"'), "index should expose reading article button");
    assert.ok(html.includes("reading-articles/index.html"), "index should navigate to reading-articles folder page");
    assert.ok(!html.includes('id="navigateToPlayPage"'), "play button id should be removed from index");
}

function testReadingArticlesFolderShouldContainEntryFiles() {
    const html = readWorkspaceFile("reading-articles/index.html");
    assert.ok(html.includes('script.js?v=20260606-2'), "reading-articles page should use folder-local script");
    assert.ok(html.includes('style.css?v=20260606-2'), "reading-articles page should use folder-local style");
}

function run() {
    testIndexShouldUseReadingArticleEntry();
    testReadingArticlesFolderShouldContainEntryFiles();
    console.log("test-reading-articles-page-regression passed");
}

run();
