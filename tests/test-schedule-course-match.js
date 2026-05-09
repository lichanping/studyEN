const assert = require("assert");
const {
    normalizeBoardRecord,
    buildCourseMatchKey,
    createBoardMatchIndex,
    hasScheduledCourse,
    getCourseMatchState,
    resolveBoardQueryPlan,
    resolveCompletedQueryPlan,
    inferSalaryTypeFromCourse,
    normalizeCompletedRecordForSalary,
    buildSalaryRowsFromCompletedRecords
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

function testResolveCompletedQueryPlan() {
    const local = resolveCompletedQueryPlan("localhost");
    assert.deepStrictEqual(local, {
        url: "/.netlify/functions/schedule-board?mode=completed",
        useProxy: true
    });

    const preview = resolveCompletedQueryPlan("deploy-preview-7--engaid.netlify.app");
    assert.deepStrictEqual(preview, {
        url: "/.netlify/functions/schedule-board?mode=completed",
        useProxy: true
    });

    const prod = resolveCompletedQueryPlan("h5.lxll.com");
    assert.deepStrictEqual(prod, {
        url: "https://apiv2.lxll.com/customer/training/orders?pageNumber=1&pageSize=50&status=COMPLETED",
        useProxy: false
    });
}

function testInferSalaryTypeFromCourse() {
    assert.strictEqual(inferSalaryTypeFromCourse("阅读理解专项"), "阅读完型语法课");
    assert.strictEqual(inferSalaryTypeFromCourse("完型语法提升"), "阅读完型语法课");
    assert.strictEqual(inferSalaryTypeFromCourse("体验课-试听"), "体验课");
    assert.strictEqual(inferSalaryTypeFromCourse("托福高频词汇"), "词汇课");
}

function testNormalizeCompletedRecordForSalaryShouldDetectTrialFromCategory() {
    const row = {
        id: 2001,
        scheduleTime: Date.parse("2025-06-01T20:00:00+08:00"),
        type: "MINUTE_60",
        courseName: "上海高考英语考纲词汇（乱序）",
        category: "体验课",
        student: { name: "测试学生" }
    };

    const actual = normalizeCompletedRecordForSalary(row);
    assert.strictEqual(actual.salaryType, "体验课");
    assert.strictEqual(actual.rate, 40);
    assert.strictEqual(actual.fee, 40);
}

function testNormalizeCompletedRecordForSalaryShouldParseTrialTrainingDurationText() {
    const row = {
        id: 3001,
        scheduleTime: "2026-02-03 19:52",
        type: "体验训练",
        category: "体验课",
        trainingTime: "60分钟",
        studentName: "徐智浩 XP15775781",
        trainerName: "李婵娉 XT144620"
    };

    const actual = normalizeCompletedRecordForSalary(row);
    assert.ok(actual, "trial training row with text duration should not be dropped");
    assert.strictEqual(actual.date, "2026-02-03");
    assert.strictEqual(actual.salaryType, "体验课");
    assert.strictEqual(actual.durationHours, 1);
    assert.strictEqual(actual.fee, 40);
}

function testNormalizeCompletedRecordForSalary() {
    const row = {
        id: 1001,
        scheduleTime: Date.parse("2026-05-02T20:00:00+08:00"),
        type: "MINUTE_30",
        courseName: "阅读专项",
        student: { name: "陈怡睿" }
    };

    const actual = normalizeCompletedRecordForSalary(row);
    assert.deepStrictEqual(actual, {
        sourceId: "1001",
        date: "2026-05-02",
        studentName: "陈怡睿",
        courseName: "阅读专项",
        salaryType: "阅读完型语法课",
        durationHours: 0.5,
        rate: 55,
        fee: 27.5
    });
}

function testBuildSalaryRowsFromCompletedRecordsShouldFilterAndDedup() {
    const records = [
        {
            id: 1,
            scheduleTime: Date.parse("2026-05-02T20:00:00+08:00"),
            type: "MINUTE_60",
            courseName: "托福高频词汇",
            student: { name: "陈怡睿" }
        },
        {
            id: 2,
            scheduleTime: Date.parse("2026-05-03T20:00:00+08:00"),
            type: "MINUTE_30",
            courseName: "阅读理解",
            student: { name: "胡贝妮" }
        },
        {
            id: 2,
            scheduleTime: Date.parse("2026-05-03T20:00:00+08:00"),
            type: "MINUTE_30",
            courseName: "阅读理解",
            student: { name: "胡贝妮" }
        },
        {
            id: 3,
            scheduleTime: Date.parse("2026-05-04T20:00:00+08:00"),
            type: "MINUTE_60",
            courseName: "体验课",
            student: { name: "俞新硕" }
        },
        {
            id: 4,
            scheduleTime: Date.parse("2026-05-07T20:00:00+08:00"),
            type: "MINUTE_60",
            courseName: "托福高频词汇",
            student: { name: "陈怡睿" }
        }
    ];

    const rows = buildSalaryRowsFromCompletedRecords(records, {
        startDate: "2026-05-01",
        endDate: "2026-05-05"
    });

    assert.strictEqual(rows.length, 3, "should keep rows in range and remove duplicated sourceId");
    assert.deepStrictEqual(rows.map((r) => r.sourceId), ["1", "2", "3"]);
    assert.deepStrictEqual(rows.map((r) => r.courseName), ["托福高频词汇", "阅读理解", "体验课"]);
    assert.strictEqual(rows[0].fee, 50);
    assert.strictEqual(rows[1].fee, 27.5);
    assert.strictEqual(rows[2].fee, 40);
}

function run() {
    testNormalizeBoardRecord();
    testBuildCourseMatchKey();
    testHasScheduledCourse();
    testHasScheduledCourseWithAliasName();
    testGetCourseMatchStateShouldPreferCompleted();
    testGetCourseMatchStateShouldReturnNoneWhenNoMatch();
    testResolveBoardQueryPlan();
    testResolveCompletedQueryPlan();
    testInferSalaryTypeFromCourse();
    testNormalizeCompletedRecordForSalary();
    testNormalizeCompletedRecordForSalaryShouldDetectTrialFromCategory();
    testNormalizeCompletedRecordForSalaryShouldParseTrialTrainingDurationText();
    testBuildSalaryRowsFromCompletedRecordsShouldFilterAndDedup();
    console.log("test-schedule-course-match passed");
}

run();
