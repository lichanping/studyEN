const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

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

function loadMeetingConfig(source, options = {}) {
    const platformSelectValue = options.platformSelectValue || "";
    const storedPlatformId = options.storedPlatformId || null;
    const window = {
        localStorage: {
            getItem(key) {
                if (key === "current-platform-v1") {
                    return storedPlatformId;
                }
                return null;
            }
        },
        document: {
            getElementById(id) {
                if (id === "platformSelect") {
                    return platformSelectValue ? { value: platformSelectValue } : null;
                }
                return null;
            },
            createElement() {
                return {
                    value: "",
                    textContent: "",
                    appendChild() {}
                };
            }
        }
    };
    window.window = window;
    vm.runInNewContext(source, { window, console });
    return window.APP_MEETING_CONFIG;
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
    assert.ok(
        configContent.includes("antiForgettingMeetingId"),
        "meeting-config.js 必须包含抗遗忘会议号配置字段"
    );
    assert.ok(
        configContent.includes("getAntiForgettingMeetingIdByPlatform")
            && configContent.includes("getCurrentAntiForgettingTencentMeetingTag"),
        "meeting-config.js 必须提供抗遗忘会议号读取方法"
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

function testAntiForgettingMeetingConfigBehavior() {
    const configContent = read("meeting-config.js");
    const config = loadMeetingConfig(configContent, { storedPlatformId: "baifendii" });

    assert.strictEqual(
        config.getAntiForgettingMeetingIdByPlatform("baifendii"),
        BAIFENDI_MEETING_ID,
        "抗遗忘会议号默认应支持按平台读取"
    );
    assert.strictEqual(
        config.getAntiForgettingTencentMeetingTagByPlatform("maisuiyingyu"),
        `#腾讯会议：${MAISUIYINGYU_MEETING_ID}`,
        "抗遗忘会议标签应复用统一格式输出"
    );
    assert.strictEqual(
        config.getCurrentAntiForgettingTencentMeetingTag(),
        `#腾讯会议：${BAIFENDI_MEETING_ID}`,
        "当前平台抗遗忘会议标签应基于当前平台返回"
    );
    assert.strictEqual(
        config.antiForgettingMeetingId,
        BAIFENDI_MEETING_ID,
        "APP_MEETING_CONFIG 应暴露当前平台抗遗忘会议号 getter"
    );

    const fallbackSource = configContent.replace(
        /antiForgettingMeetingId:\s*"684-1587-8369",?\n/,
        ""
    );
    const fallbackConfig = loadMeetingConfig(fallbackSource, { storedPlatformId: "baifendii" });
    assert.strictEqual(
        fallbackConfig.getAntiForgettingMeetingIdByPlatform("baifendii"),
        BAIFENDI_MEETING_ID,
        "未配置抗遗忘会议号时应自动回退到正课会议号"
    );
}

function testAntiForgettingNotificationCallSites() {
    const commonFunctionsContent = read("commonFunctions.js");
    const scheduleContent = read("schedule.html");
    const classFormalContent = read("classFormal.js");
    const classTrialContent = read("classTrial.js");
    const classReadContent = read("classRead.js");

    assert.ok(
        commonFunctionsContent.includes("getCurrentAntiForgettingTencentMeetingTag"),
        "抗遗忘提醒文案应使用抗遗忘会议号"
    );
    assert.ok(
        scheduleContent.includes("getCurrentAntiForgettingTencentMeetingTag"),
        "抗遗忘通知按钮应使用抗遗忘会议号"
    );
    assert.ok(
        classFormalContent.includes("getCurrentTencentMeetingTag"),
        "正课通知应继续使用正课会议号"
    );
    assert.ok(
        classTrialContent.includes("getCurrentTencentMeetingTag"),
        "体验课通知应继续使用正课会议号"
    );
    assert.ok(
        classReadContent.includes("getCurrentTencentMeetingTag"),
        "阅读课通知应继续使用正课会议号"
    );
}

function run() {
    testUsesCentralMeetingConfig();
    testAntiForgettingMeetingConfigBehavior();
    testAntiForgettingNotificationCallSites();
    console.log("test-meeting-config passed");
}

run();
