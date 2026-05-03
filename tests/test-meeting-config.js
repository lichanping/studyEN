const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OLD_MEETING_ID = "762-3777-6304";

const filesToCheck = [
    "meeting-config.js",
    "classFormal.js",
    "classRead.js",
    "classTrial.js",
    "commonFunctions.js",
    "schedule.html"
];

function read(relativePath) {
    return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function testUsesCentralMeetingConfig() {
    const configContent = read("meeting-config.js");
    assert.ok(
        configContent.includes('const MEETING_ID = "957-2306-5683";'),
        "meeting-config.js 必须包含新的会议号配置"
    );
    assert.ok(
        configContent.includes("const TENCENT_MEETING_TAG = `#腾讯会议：${MEETING_ID}`;"),
        "meeting-config.js 必须生成腾讯会议标签"
    );

    const implementationFiles = filesToCheck.filter((file) => file !== "meeting-config.js");
    for (const file of implementationFiles) {
        const content = read(file);
        assert.ok(
            !content.includes(OLD_MEETING_ID),
            `${file} 仍包含旧会议号 ${OLD_MEETING_ID}`
        );
        assert.ok(
            content.includes("APP_MEETING_CONFIG"),
            `${file} 未使用 APP_MEETING_CONFIG 统一读取会议号`
        );
    }
}

function run() {
    testUsesCentralMeetingConfig();
    console.log("test-meeting-config passed");
}

run();
