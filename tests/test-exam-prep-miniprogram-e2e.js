const assert = require("assert");
const path = require("path");
const automator = require("miniprogram-automator");
const MiniProgram = require("miniprogram-automator/out/MiniProgram").default;

MiniProgram.prototype.checkVersion = async function checkVersion() {};

const cliPath = "/Applications/wechatwebdevtools.app/Contents/MacOS/cli";
const projectPath = path.resolve(__dirname, "../exam-prep-miniprogram");

async function testExamFlowInWechatSimulator() {
    const miniProgram = await automator.launch({
        cliPath,
        projectPath,
        trustProject: true,
        timeout: 60000
    });

    try {
        const page = await miniProgram.reLaunch("/pages/index/index");
        assert.ok(page, "mini program index page should open");
        await page.waitFor(1000);

        let data = await page.data();
        assert.strictEqual(data.view, "setup");
        assert.strictEqual(data.bankStatus, "题库已就绪 · 984 题");

        const startButton = await page.$("#start-exam");
        assert.ok(startButton, "start exam button should render");
        await startButton.tap();
        await page.waitFor(500);

        data = await page.data();
        assert.strictEqual(data.view, "quiz");
        assert.ok(data.currentQuestion.question);
        assert.strictEqual(data.questionProgress, "第 1 / 15 题");

        const submitButton = await page.$(".submit-button");
        assert.ok(submitButton, "instant mode should show the submit button");

        const firstOption = await page.$(".option");
        assert.ok(firstOption, "question options should render");
        await firstOption.tap();
        await page.waitFor(300);

        data = await page.data();
        assert.strictEqual(data.answeredProgress, "已答 1 题");

        await miniProgram.mockWxMethod("showModal", { confirm: true, cancel: false });
        await submitButton.tap();
        await page.waitFor(500);

        data = await page.data();
        assert.strictEqual(data.view, "results");
        assert.strictEqual(data.result.items.length, 15);
        assert.ok(data.result.summary.includes("未答 14 题"));
        await miniProgram.screenshot({ path: "/tmp/exam-prep-miniprogram.png" });
    } finally {
        miniProgram.disconnect();
    }
}

testExamFlowInWechatSimulator()
    .then(() => console.log("test-exam-prep-miniprogram-e2e passed"))
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });