const assert = require("assert");
const fs = require("fs");
const path = require("path");

function read(fileName) {
    return fs.readFileSync(path.join(__dirname, "..", fileName), "utf8");
}

function assertSupportsMaisuiyingyu(fileName) {
    const content = read(fileName);
    assert(
        content.includes("maisuiyingyu") || content.includes("populatePlatformSelect"),
        `${fileName} 应支持新增平台 麦穗英语`
    );
}

function run() {
    const meetingConfig = read("meeting-config.js");
    assert(
        meetingConfig.includes("麦穗英语"),
        "meeting-config.js 应包含 麦穗英语 平台配置"
    );
    assert(
        meetingConfig.includes("maisuiyingyu"),
        "meeting-config.js 应包含 麦穗英语 平台 id"
    );
    assert(
        meetingConfig.includes('meetingId: "569-8084-0547"'),
        "meeting-config.js 应包含 麦穗英语 会议号配置"
    );

    [
        "class-trial.html",
        "class-read.html",
        "index.html",
        "schedule.html",
        "schedule-students-manage.html",
        "anti-forgetting.html"
    ].forEach(assertSupportsMaisuiyingyu);

    const trialJs = read("classTrial.js");
    assert(
        !trialJs.includes('? "百分缔" : "李校来啦"'),
        "classTrial.js 平台展示名不应写成二元分支"
    );

    const commonFunctions = read("commonFunctions.js");
    assert(
        !commonFunctions.includes('=== "baifendii" ? "百分缔" : "李校来啦"'),
        "commonFunctions.js 平台展示名不应写成二元分支"
    );

    const scheduleManageJs = read("schedule-students-manage.js");
    assert(
        !scheduleManageJs.includes('=== "baifendii" ? "百分缔" : "李校来啦"'),
        "schedule-students-manage.js 平台展示名不应写成二元分支"
    );

    const scheduleHtml = read("schedule.html");
    assert(
        !scheduleHtml.includes('=== "baifendii" ? "百分缔" : "李校来啦"'),
        "schedule.html 平台展示名不应写成二元分支"
    );

    console.log("test-third-platform-support passed");
}

run();