const assert = require("assert");
const fs = require("fs");
const path = require("path");

function read(relativePath) {
    return fs.readFileSync(path.resolve(__dirname, "..", relativePath), "utf8");
}

function testProjectCanBeImportedByWechatDevTools() {
    const project = JSON.parse(read("exam-prep-miniprogram/project.config.json"));
    const app = JSON.parse(read("exam-prep-miniprogram/app.json"));
    assert.strictEqual(project.compileType, "miniprogram");
    assert.strictEqual(project.miniprogramRoot, "./");
    assert.strictEqual(project.srcMiniprogramRoot, "./");
    assert.strictEqual(project.isGameTourist, false);
    assert.deepStrictEqual(app.pages, ["pages/index/index"]);
}

function testPageContainsSetupQuizAndResultControls() {
    const wxml = read("exam-prep-miniprogram/pages/index/index.wxml");
    for (const marker of [
        'data-view="setup"', 'data-view="quiz"', 'data-view="results"',
        'bindtap="startExam"', 'bindtap="chooseOption"', 'bindtap="confirmAnswer"',
        'bindtap="submitExam"', 'bindtap="retryIncorrect"', 'bindtap="resetExam"',
        'bindchange="toggleIncorrectOnly"'
    ]) {
        assert.ok(wxml.includes(marker), `missing mini program UI marker: ${marker}`);
    }
    assert.ok(wxml.includes('<button class="button submit-button" bindtap="submitExam">交卷</button>'), "instant mode should always render manual submission");
}

function testPageLoadsBundledQuestionBankAndSessionAdapter() {
    const script = read("exam-prep-miniprogram/pages/index/index.js");
    assert.ok(script.includes('require("../../data/questions-v1.js")'));
    assert.ok(script.includes('require("../../utils/exam-session.js")'));
    assert.ok(script.includes("wx.showModal"), "unanswered submission and exit should be confirmed");
    assert.ok(script.includes("onShareAppMessage()"), "page should support sharing from the WeChat menu");
    assert.ok(script.includes('path: "/pages/index/index"'), "shared cards should open the exam home page");

    const bank = require(path.resolve(__dirname, "../exam-prep-miniprogram/data/questions-v1.js"));
    assert.strictEqual(bank.questions.length, 984);
}

function testGeneratedAssetsMatchWebSourcesAndWechatRuntime() {
    const webCore = read("exam-prep/core.js");
    const miniProgramCore = read("exam-prep-miniprogram/utils/core.js");
    const session = read("exam-prep-miniprogram/utils/exam-session.js");
    const page = read("exam-prep-miniprogram/pages/index/index.js");
    const sourceBank = JSON.parse(read("exam-prep/questions-v1.json"));
    const generatedBank = require(path.resolve(__dirname, "../exam-prep-miniprogram/data/questions-v1.js"));

    assert.strictEqual(miniProgramCore, webCore, "generated mini program core should match the Web source");
    assert.deepStrictEqual(generatedBank, sourceBank, "generated mini program bank should match the JSON source");
    for (const script of [miniProgramCore, session, page]) {
        assert.ok(!script.includes("Object.hasOwn"), "mini program should avoid unsupported Object.hasOwn");
        assert.ok(!script.includes("Object.fromEntries"), "mini program should avoid unsupported Object.fromEntries");
    }
}

function testPhoneStylesRespectSafeAreaAndStableControls() {
    const styles = read("exam-prep-miniprogram/pages/index/index.wxss");
    assert.ok(styles.includes("env(safe-area-inset-bottom)"));
    assert.ok(styles.includes("grid-template-columns: 1fr 1fr"));
    assert.ok(styles.includes("min-height"));
}

testProjectCanBeImportedByWechatDevTools();
testPageContainsSetupQuizAndResultControls();
testPageLoadsBundledQuestionBankAndSessionAdapter();
testGeneratedAssetsMatchWebSourcesAndWechatRuntime();
testPhoneStylesRespectSafeAreaAndStableControls();
console.log("test-exam-prep-miniprogram-page passed");