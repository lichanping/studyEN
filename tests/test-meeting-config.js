const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OLD_MEETING_ID = "762-3777-6304";
const BAIFENDI_MEETING_ID = "684-1587-8369";
const MAISUIYINGYU_MEETING_ID = "569-8084-0547";

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
        configContent.includes('id: "lixiaolaila"') && configContent.includes('meetingId: "957-2306-5683"'),
        "meeting-config.js 必须包含李校来啦会议号配置"
    );
    assert.ok(
        configContent.includes('id: "baifendii"') && configContent.includes(`meetingId: "${BAIFENDI_MEETING_ID}"`),
        "meeting-config.js 必须包含百分缔会议号配置"
    );
    assert.ok(
        configContent.includes('id: "maisuiyingyu"') && configContent.includes(`meetingId: "${MAISUIYINGYU_MEETING_ID}"`),
        "meeting-config.js 必须包含麦穗英语会议号配置"
    );
    assert.ok(
        configContent.includes("getTencentMeetingTagByPlatform"),
        "meeting-config.js 必须提供按平台读取会议号标签的方法"
    );

    const implementationFiles = filesToCheck.filter((file) => file !== "meeting-config.js");
    for (const file of implementationFiles) {
        const content = read(file);
        assert.ok(
            !content.includes(OLD_MEETING_ID),
            `${file} 仍包含旧会议号 ${OLD_MEETING_ID}`
        );
        assert.ok(
            !content.includes(BAIFENDI_MEETING_ID),
            `${file} 不应直接硬编码百分缔会议号 ${BAIFENDI_MEETING_ID}`
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
