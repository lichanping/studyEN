const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { prioritizeCustomStudent } = require("../schedule-course-match.js");

function readWorkspaceFile(relativePath) {
    return fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");
}

function testTrialPageShouldNotHardCodeTemporaryStudent() {
    const html = readWorkspaceFile("class-trial.html");
    assert.ok(
        !html.includes('<option value="悦慧">悦慧</option>'),
        "体验课 userName 列表不应 hard code 临时添加的学生"
    );
}

function testScheduleCustomStudentShouldMoveToFront() {
    assert.deepStrictEqual(
        prioritizeCustomStudent(["旧学生", "悦慧", "其他学生"], "悦慧"),
        ["悦慧", "旧学生", "其他学生"],
        "临时添加已存在学生时，应移动到 custom-students-v1 顶部"
    );

    assert.deepStrictEqual(
        prioritizeCustomStudent(["旧学生", "其他学生"], "悦慧"),
        ["悦慧", "旧学生", "其他学生"],
        "临时添加新学生时，应保存为 custom-students-v1 顶部"
    );
}

function testSchedulePageShouldUseSharedPrioritizer() {
    const html = readWorkspaceFile("schedule.html");
    assert.ok(
        html.includes("ScheduleCourseMatch.prioritizeCustomStudent"),
        "schedule 临时加课保存自定义学生时应复用置顶规则"
    );
}

function run() {
    testTrialPageShouldNotHardCodeTemporaryStudent();
    testScheduleCustomStudentShouldMoveToFront();
    testSchedulePageShouldUseSharedPrioritizer();
    console.log("test-class-trial-student-options passed");
}

run();
