const assert = require("assert");
const {
    createShareToken,
    verifyShareToken,
    buildSharedArticleUrl,
} = require("../reading-articles/share-token.js");

function testCreateAndVerifyShareToken() {
    const token = createShareToken(
        {
            albumId: "mid50",
            articleTitle: "Chapter 2 Tips for Staying Healthy（保持健康的小贴士）",
            expiresAt: Date.now() + 60 * 60 * 1000,
        },
        "unit-test-secret"
    );

    const result = verifyShareToken(token, "unit-test-secret");
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.payload.albumId, "mid50");
    assert.strictEqual(result.payload.articleTitle, "Chapter 2 Tips for Staying Healthy（保持健康的小贴士）");
}

function testExpiredShareTokenShouldBeRejected() {
    const token = createShareToken(
        {
            albumId: "mid50",
            articleTitle: "Chapter 2 Tips for Staying Healthy（保持健康的小贴士）",
            expiresAt: Date.now() - 1000,
        },
        "unit-test-secret"
    );

    const result = verifyShareToken(token, "unit-test-secret");
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.reason, "expired");
}

function testSharedUrlShouldPointToSharedPage() {
    const url = buildSharedArticleUrl("https://example.com/reading-articles/shared.html", "token-value");
    assert.strictEqual(url, "https://example.com/reading-articles/shared.html?token=token-value");
}

function run() {
    testCreateAndVerifyShareToken();
    testExpiredShareTokenShouldBeRejected();
    testSharedUrlShouldPointToSharedPage();
    console.log("test-reading-article-share-token passed");
}

run();
