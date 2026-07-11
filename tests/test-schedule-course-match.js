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

function testNormalizeBoardRecordShouldUseExplicitTrialDuration() {
    const row = {
        scheduleTime: Date.parse("2026-06-28T11:30:00+08:00"),
        type: "TRIAL",
        durationMinutes: 30,
        student: { name: "悦慧" }
    };

    const actual = normalizeBoardRecord(row);
    assert.deepStrictEqual(actual, {
        student: "悦慧",
        date: "2026-06-28",
        durationMinutes: 30,
        matchState: "scheduled"
    });
}

function testNormalizeBoardRecordShouldFallbackMissingTrialDurationToOneHour() {
    const row = {
        scheduleTime: Date.parse("2026-06-28T11:30:00+08:00"),
        type: "TRIAL",
        student: { name: "悦慧" }
    };

    const actual = normalizeBoardRecord(row);
    assert.deepStrictEqual(actual, {
        student: "悦慧",
        date: "2026-06-28",
        durationMinutes: 60,
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

    const render = resolveBoardQueryPlan("studyen-static.onrender.com");
    assert.deepStrictEqual(render, {
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

    const render = resolveCompletedQueryPlan("studyen-static.onrender.com");
    assert.deepStrictEqual(render, {
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

function testNormalizeCompletedRecordForSalaryShouldUseExplicitHalfHourTrialDuration() {
    const row = {
        id: 3006,
        scheduleTime: "2026-07-11 16:00",
        type: "体验训练",
        category: "体验课",
        trainingTime: "30分钟",
        studentName: "闫奕洁"
    };

    const actual = normalizeCompletedRecordForSalary(row);
    assert.ok(actual, "half-hour trial row should be normalized");
    assert.strictEqual(actual.salaryType, "体验课");
    assert.strictEqual(actual.durationHours, 0.5);
    assert.strictEqual(actual.rate, 40);
    assert.strictEqual(actual.fee, 20);
}

function testNormalizeCompletedRecordForSalaryShouldUseMaisuiHalfHourTrialRate() {
    const row = {
        id: 3008,
        platform: "maisuiyingyu",
        date: "2026-07-11",
        type: "体验训练",
        category: "体验课",
        courseType: { name: "30分钟" },
        user: { name: "试课学员" },
        course: { name: "体验课" }
    };

    const actual = normalizeCompletedRecordForSalary(row);
    assert.ok(actual, "Maisui half-hour trial row should be normalized");
    assert.strictEqual(actual.salaryType, "体验课");
    assert.strictEqual(actual.durationHours, 0.5);
    assert.strictEqual(actual.rate, 20);
    assert.strictEqual(actual.fee, 10);
}

function testNormalizeCompletedRecordForSalaryShouldUseMaisuiFormalRate() {
    const row = {
        id: 3009,
        platform: "maisuiyingyu",
        date: "2026-07-11",
        courseType: { name: "60分钟" },
        user: { name: "正式学员" },
        course: { name: "K1：小学考纲词库（新）" }
    };

    const actual = normalizeCompletedRecordForSalary(row);
    assert.ok(actual, "Maisui one-hour formal row should be normalized");
    assert.strictEqual(actual.salaryType, "词汇课");
    assert.strictEqual(actual.durationHours, 1);
    assert.strictEqual(actual.rate, 50);
    assert.strictEqual(actual.fee, 50);
}

function testNormalizeCompletedRecordForSalaryShouldNotUseMaisuiStudentNameAsTrialType() {
    const row = {
        id: 3010,
        platform: "maisuiyingyu",
        date: "2026-07-11",
        courseType: { name: "30分钟" },
        user: { name: "试课学员" },
        course: {
            name: "K1：小学考纲词库（新）",
            category: { value: 1, name: "单词速记" }
        },
        sourceType: { value: 1, name: "单词识记" }
    };

    const actual = normalizeCompletedRecordForSalary(row);
    assert.ok(actual, "Maisui vocab record with trial-like student name should be normalized");
    assert.strictEqual(actual.salaryType, "词汇课");
    assert.strictEqual(actual.durationHours, 0.5);
    assert.strictEqual(actual.rate, 50);
    assert.strictEqual(actual.fee, 25);
}

function testNormalizeCompletedRecordForSalaryShouldParseMaisuiLearnUnionRecord() {
    const row = {
        id: 132303,
        platform: "maisuiyingyu",
        course: {
            name: "K1：小学考纲词库（新）",
            category: { value: 1, name: "单词速记" }
        },
        courseType: { value: 1, name: "30分钟" },
        sourceType: { value: 1, name: "单词识记" },
        user: { name: "试课学员" },
        startTime: "2026-07-09 15:48",
        endTime: "2026-07-09 15:51",
        status: { value: 2, name: "学习完成" }
    };

    const actual = normalizeCompletedRecordForSalary(row);
    assert.ok(actual, "Maisui learn-union row should be normalized");
    assert.strictEqual(actual.date, "2026-07-09");
    assert.strictEqual(actual.studentName, "试课学员");
    assert.strictEqual(actual.courseName, "K1：小学考纲词库（新）");
    assert.strictEqual(actual.salaryType, "词汇课");
    assert.strictEqual(actual.durationHours, 0.5);
    assert.strictEqual(actual.rate, 50);
    assert.strictEqual(actual.fee, 25);
}

function testNormalizeCompletedRecordForSalaryShouldFallbackMissingTrialDurationToOneHour() {
    const row = {
        id: 3007,
        scheduleTime: "2026-07-11 16:00",
        type: "体验训练",
        category: "体验课",
        studentName: "闫奕洁"
    };

    const actual = normalizeCompletedRecordForSalary(row);
    assert.ok(actual, "legacy trial row without duration should still be kept");
    assert.strictEqual(actual.salaryType, "体验课");
    assert.strictEqual(actual.durationHours, 1);
    assert.strictEqual(actual.rate, 40);
    assert.strictEqual(actual.fee, 40);
}

function testNormalizeCompletedRecordForSalaryShouldParseTrialFromStartEndTimeFields() {
    // Trial class with NO explicit duration field — only startTime/endTime.
    // Since trial is always fixed at 1 hour / 40 yuan, the record must NOT be dropped.
    const row = {
        id: 3002,
        startTime: "2026-02-03 19:52",
        endTime: "2026-02-03 20:30",
        type: "体验训练",
        category: "体验课",
        userName: "徐智浩 XP15775781"
    };

    const actual = normalizeCompletedRecordForSalary(row);
    assert.ok(actual, "trial class without explicit duration should still be kept (fixed 1h)");
    assert.strictEqual(actual.date, "2026-02-03");
    assert.strictEqual(actual.salaryType, "体验课");
    assert.strictEqual(actual.durationHours, 1, "trial is always 1 hour");
    assert.strictEqual(actual.rate, 40);
    assert.strictEqual(actual.fee, 40);
}

function testNormalizeCompletedRecordForSalaryShouldClampTrialToOneHour() {
    const row = {
        id: 3003,
        startTime: "2026-02-03 19:52",
        endTime: "2026-02-03 20:44",
        type: "体验训练",
        category: "体验课",
        trainingTime: "60分钟",
        userName: "徐智浩 XP15775781"
    };

    const actual = normalizeCompletedRecordForSalary(row);
    assert.ok(actual, "trial row should be normalized");
    assert.strictEqual(actual.salaryType, "体验课");
    assert.strictEqual(actual.durationHours, 1, "trial classes should be fixed at 1 hour");
    assert.strictEqual(actual.rate, 40);
    assert.strictEqual(actual.fee, 40);
}

function testNormalizeCompletedRecordForSalaryShouldParseTextDurationField() {
    const row = {
        id: 3005,
        scheduleTime: "2026-02-03 19:52",
        duration: "60分钟",
        type: "体验训练",
        category: "体验课",
        userName: "徐智浩 XP15775781"
    };

    const actual = normalizeCompletedRecordForSalary(row);
    assert.ok(actual, "text duration field should be enough to normalize the row");
    assert.strictEqual(actual.date, "2026-02-03");
    assert.strictEqual(actual.salaryType, "体验课");
    assert.strictEqual(actual.durationHours, 1);
    assert.strictEqual(actual.fee, 40);
}

function testNormalizeCompletedRecordForSalaryShouldIgnoreActualStartEndForVocabClass() {
    const row = {
        id: 3004,
        scheduleTime: "2026-02-09 19:44",
        startTime: "2026-02-09 19:51",
        endTime: "2026-02-09 20:43",
        type: "MINUTE_60",
        category: "词汇课",
        userName: "徐智浩 XP15775781"
    };

    const actual = normalizeCompletedRecordForSalary(row);
    assert.ok(actual, "vocab row should be normalized by scheduled duration");
    assert.strictEqual(actual.salaryType, "词汇课");
    assert.strictEqual(actual.durationHours, 1, "should use scheduled duration instead of actual start/end");
    assert.strictEqual(actual.fee, 50);
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

function testBuildSalaryRowsFromCompletedRecordsShouldExcludeByTrainerName() {
    // When trainerName contains a name, that name should be excluded from salary rows.
    const records = [
        {
            id: 11,
            scheduleTime: Date.parse("2026-05-02T20:00:00+08:00"),
            type: "MINUTE_60",
            courseName: "陪练练习",
            student: { name: "陈怡睿" },
            trainerName: "陈怡睿 XP123456"
        },
        {
            id: 12,
            scheduleTime: Date.parse("2026-05-03T20:00:00+08:00"),
            type: "MINUTE_60",
            courseName: "文章补全（7-5）",
            student: { name: "胡贝妮" }
        },
        {
            id: 13,
            scheduleTime: Date.parse("2026-05-04T20:00:00+08:00"),
            type: "MINUTE_60",
            courseName: "托福高频词汇",
            student: { name: "陈怡睿" }
        }
    ];

    const rows = buildSalaryRowsFromCompletedRecords(records, {
        startDate: "2026-05-01",
        endDate: "2026-05-31"
    });

    assert.strictEqual(rows.length, 2, "only test-course row should be excluded");
    assert.deepStrictEqual(rows.map((r) => r.sourceId), ["12", "13"]);
    assert.deepStrictEqual(rows.map((r) => r.studentName), ["胡贝妮", "陈怡睿"]);
}

function testBuildSalaryRowsFromCompletedRecordsShouldNotExcludeWhenNoTrainerName() {
    const records = [
        {
            id: 11,
            scheduleTime: Date.parse("2026-05-02T20:00:00+08:00"),
            type: "MINUTE_60",
            courseName: "陪练练习",
            student: { name: "陈怡睿" }
        },
        {
            id: 12,
            scheduleTime: Date.parse("2026-05-03T20:00:00+08:00"),
            type: "MINUTE_60",
            courseName: "文章补全（7-5）",
            student: { name: "胡贝妮" }
        }
    ];

    const rows = buildSalaryRowsFromCompletedRecords(records, {
        startDate: "2026-05-01",
        endDate: "2026-05-31"
    });

    assert.strictEqual(rows.length, 2, "all rows should be kept when no trainerName available");
    assert.deepStrictEqual(rows.map((r) => r.studentName), ["陈怡睿", "胡贝妮"]);
}

function run() {
    testNormalizeBoardRecord();
    testNormalizeBoardRecordShouldUseExplicitTrialDuration();
    testNormalizeBoardRecordShouldFallbackMissingTrialDurationToOneHour();
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
    testNormalizeCompletedRecordForSalaryShouldUseExplicitHalfHourTrialDuration();
    testNormalizeCompletedRecordForSalaryShouldUseMaisuiHalfHourTrialRate();
    testNormalizeCompletedRecordForSalaryShouldUseMaisuiFormalRate();
    testNormalizeCompletedRecordForSalaryShouldNotUseMaisuiStudentNameAsTrialType();
    testNormalizeCompletedRecordForSalaryShouldParseMaisuiLearnUnionRecord();
    testNormalizeCompletedRecordForSalaryShouldFallbackMissingTrialDurationToOneHour();
    testNormalizeCompletedRecordForSalaryShouldParseTrialFromStartEndTimeFields();
    testNormalizeCompletedRecordForSalaryShouldClampTrialToOneHour();
    testNormalizeCompletedRecordForSalaryShouldParseTextDurationField();
    testNormalizeCompletedRecordForSalaryShouldIgnoreActualStartEndForVocabClass();
    testBuildSalaryRowsFromCompletedRecordsShouldFilterAndDedup();
    testBuildSalaryRowsFromCompletedRecordsShouldExcludeByTrainerName();
    testBuildSalaryRowsFromCompletedRecordsShouldNotExcludeWhenNoTrainerName();
    console.log("test-schedule-course-match passed");
}

run();
