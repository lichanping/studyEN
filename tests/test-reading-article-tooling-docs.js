const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const rootDir = path.resolve(__dirname, "..");

function readWorkspaceFile(relPath) {
    return fs.readFileSync(path.join(rootDir, relPath), "utf8");
}

function testPrepareArticleFetcherShouldBeDocumentedAndReusable() {
    const scriptPath = path.join(rootDir, "scripts/fetch_course_prepare_articles.js");
    assert.ok(fs.existsSync(scriptPath), "full prepare txt fetcher script should be checked in");

    const help = execFileSync(process.execPath, [scriptPath, "--help"], { encoding: "utf8" });
    assert.ok(help.includes("CustomerQueryCourseBookPrepareByCourseBookId"), "help should identify the full prepare endpoint");
    assert.ok(help.includes("LXLL_TOKEN_C"), "help should explain token env var usage");
    assert.ok(help.includes("--output-folder"), "help should document output folder option");
}

function testReadmeShouldDescribeTxtAndMp3GenerationCommands() {
    const readme = readWorkspaceFile("README.md");
    assert.ok(
        readme.includes("node scripts/fetch_course_prepare_articles.js"),
        "README should document the full prepare txt generation script"
    );
    assert.ok(
        readme.includes("bash scripts/generate_article_audio.sh"),
        "README should document the existing mp3 generation script"
    );
    assert.ok(
        readme.includes("build:reading-manifest"),
        "README should remind maintainers to rebuild the reading manifest"
    );
}

function run() {
    testPrepareArticleFetcherShouldBeDocumentedAndReusable();
    testReadmeShouldDescribeTxtAndMp3GenerationCommands();
    console.log("test-reading-article-tooling-docs passed");
}

run();
