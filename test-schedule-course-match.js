const assert = require("assert");
const {
    normalizeBoardRecord,
    buildCourseMatchKey,
    createBoardMatchIndex,
    hasScheduledCourse
} = require("./schedule-course-match.js");

function testNormalizeBoardRecord() {
    const row = {
        scheduleTime: Date.parse("2026-05-02T20:00:00+08:00"),
        type: "MINUTE_30",
        student: { name: "陈怡睿" }
    };

    const actual = normalizeBoardRecord(row);
    assert.deepStrictEqual(actual, {
        student: "陈怡睿",
        date: "2026-05-02",
        durationMinutes: 30
    });
}

function testBuildCourseMatchKey() {
    const key = buildCourseMatchKey({
        student: " 陈怡睿 ",
        date: "2026-05-02",
        durationMinutes: 60
    });
    assert.strictEqual(key, "陈怡睿__2026-05-02__60");
}

function testHasScheduledCourse() {
    const boardList = [
        {
            scheduleTime: Date.parse("2026-05-02T20:00:00+08:00"),
            type: "MINUTE_30",
            student: { name: "陈怡睿" }
        },
        {
            scheduleTime: Date.parse("2026-05-03T10:00:00+08:00"),
            type: "MINUTE_60",
            student: { name: "胡贝妮" }
        }
    ];

    const index = createBoardMatchIndex(boardList);

    assert.strictEqual(
        hasScheduledCourse(index, { student: "陈怡睿", date: "2026-05-02", durationMinutes: 30 }),
        true
    );

    assert.strictEqual(
        hasScheduledCourse(index, { student: "陈怡睿", date: "2026-05-02", durationMinutes: 60 }),
        false
    );

    assert.strictEqual(
        hasScheduledCourse(index, { student: "徐智浩", date: "2026-05-02", durationMinutes: 60 }),
        false
    );
}

function run() {
    testNormalizeBoardRecord();
    testBuildCourseMatchKey();
    testHasScheduledCourse();
    console.log("test-schedule-course-match passed");
}

run();
