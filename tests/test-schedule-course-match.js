const assert = require("assert");
const {
    normalizeBoardRecord,
    buildCourseMatchKey,
    createBoardMatchIndex,
    hasScheduledCourse,
    getCourseMatchState,
    resolveBoardQueryPlan
} = require("../schedule-course-match.js");

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
        durationMinutes: 30,
        matchState: "scheduled"
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

function testHasScheduledCourseWithAliasName() {
    const boardList = [
        {
            scheduleTime: Date.parse("2026-05-04T10:00:00+08:00"),
            type: "MINUTE_60",
            student: { name: "俞新硕" }
        }
    ];

    const index = createBoardMatchIndex(boardList);

    assert.strictEqual(
        hasScheduledCourse(index, { student: "硕硕", date: "2026-05-04", durationMinutes: 60 }),
        true
    );
}

function testGetCourseMatchStateShouldPreferCompleted() {
    const boardList = [
        {
            scheduleTime: Date.parse("2026-05-02T10:00:00+08:00"),
            type: "MINUTE_30",
            student: { name: "陈怡睿" },
            status: "scheduled"
        },
        {
            scheduleTime: Date.parse("2026-05-02T10:30:00+08:00"),
            type: "MINUTE_30",
            student: { name: "陈怡睿" },
            statusText: "已完成"
        }
    ];

    const index = createBoardMatchIndex(boardList);
    assert.strictEqual(
        getCourseMatchState(index, { student: "陈怡睿", date: "2026-05-02", durationMinutes: 30 }),
        "completed"
    );
}

function testGetCourseMatchStateShouldReturnNoneWhenNoMatch() {
    const boardList = [
        {
            scheduleTime: Date.parse("2026-05-02T10:00:00+08:00"),
            type: "MINUTE_30",
            student: { name: "陈怡睿" },
            statusText: "已完成"
        }
    ];

    const index = createBoardMatchIndex(boardList);
    assert.strictEqual(
        getCourseMatchState(index, { student: "胡贝妮", date: "2026-05-02", durationMinutes: 30 }),
        "none"
    );
}

function testResolveBoardQueryPlan() {
    const local = resolveBoardQueryPlan("localhost");
    assert.deepStrictEqual(local, {
        url: "/.netlify/functions/schedule-board",
        useProxy: true
    });

    const preview = resolveBoardQueryPlan("deploy-preview-7--engaid.netlify.app");
    assert.deepStrictEqual(preview, {
        url: "/.netlify/functions/schedule-board",
        useProxy: true
    });

    const prod = resolveBoardQueryPlan("h5.lxll.com");
    assert.deepStrictEqual(prod, {
        url: "https://apiv2.lxll.com/customer/training/board",
        useProxy: false
    });
}

function run() {
    testNormalizeBoardRecord();
    testBuildCourseMatchKey();
    testHasScheduledCourse();
    testHasScheduledCourseWithAliasName();
    testGetCourseMatchStateShouldPreferCompleted();
    testGetCourseMatchStateShouldReturnNoneWhenNoMatch();
    testResolveBoardQueryPlan();
    console.log("test-schedule-course-match passed");
}

run();
