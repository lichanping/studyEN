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
    assert.ok(/src="script\.js\?v=\d/.test(html), "reading-articles page should use folder-local script");
    assert.ok(/href="style\.css\?v=\d/.test(html), "reading-articles page should use folder-local style");
    assert.ok(html.includes("checkLoginStatus"), "reading-articles page should be protected by login status check");
    assert.ok(html.includes('id="article-picker"'), "mobile article picker should be present for quick selection");
    assert.ok(!html.includes('id="reading-progress"'), "reading progress bar should be removed from reading page");
}

function testReadingArticlesListShouldUseResponsiveSelectionLayout() {
    const css = readWorkspaceFile("reading-articles/style.css");
    assert.ok(
        /\.article-list-panel[\s\S]*height:\s*calc\(100vh\s*-\s*210px\)/.test(css),
        "PC article list panel should fill the available viewport height"
    );
    assert.ok(
        /\.article-list[\s\S]*max-height:\s*none/.test(css),
        "PC article list should not be capped to a short fixed vh height"
    );
    assert.ok(
        /\.article-picker[\s\S]*display:\s*none/.test(css),
        "article picker should be hidden on desktop"
    );
    assert.ok(
        /@media \(max-width:\s*900px\)[\s\S]*\.article-picker[\s\S]*display:\s*block/.test(css),
        "article picker should be available on mobile"
    );
}

function run() {
    testIndexShouldUseReadingArticleEntry();
    testReadingArticlesFolderShouldContainEntryFiles();
    testReadingArticlesListShouldUseResponsiveSelectionLayout();
    console.log("test-reading-articles-page-regression passed");
}

run();
