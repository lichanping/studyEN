const assert = require("assert");
const {
    buildExam,
    getInventory,
    gradeExam,
    validateSettings
} = require("../exam-prep/core.js");

function question(id, type, answers) {
    return {
        id,
        sourceNumber: Number(id.replace(/\D/g, "")),
        type,
        question: id,
        options: [
            { id: "A", text: "甲" },
            { id: "B", text: "乙" },
            { id: "C", text: "丙" }
        ],
        answers
    };
}

const questions = [
    question("s1", "single", ["A"]),
    question("s2", "single", ["B"]),
    question("s3", "single", ["C"]),
    question("m1", "multiple", ["A", "C"]),
    question("m2", "multiple", ["A", "B"]),
    question("b1", "boolean", ["A"]),
    question("b2", "boolean", ["B"])
];

function testInventoryAndValidationUseQuestionData() {
    const inventory = getInventory(questions);
    assert.deepStrictEqual(inventory, { single: 3, multiple: 2, boolean: 2 });

    const invalid = validateSettings({
        counts: { single: 4, multiple: 0, boolean: 0 },
        scores: { single: 1, multiple: 2, boolean: 1 }
    }, inventory);
    assert.strictEqual(invalid.valid, false);
    assert.strictEqual(invalid.errors.single, "最多可选 3 题");

    const valid = validateSettings({
        counts: { single: 2, multiple: 1, boolean: 1 },
        scores: { single: 1, multiple: 2, boolean: 1 }
    }, inventory);
    assert.deepStrictEqual(valid, { valid: true, errors: {} });
}

function testBuildExamSamplesWithoutDuplicates() {
    const exam = buildExam(questions, { single: 3, multiple: 2, boolean: 2 }, () => 0.25);
    assert.strictEqual(exam.length, 7);
    assert.strictEqual(new Set(exam.map((item) => item.id)).size, 7);
    assert.deepStrictEqual(getInventory(exam), { single: 3, multiple: 2, boolean: 2 });
}

function testGradeExamRequiresExactMultipleChoiceMatchAndUsesCustomScores() {
    const exam = [questions[0], questions[3], questions[5], questions[6]];
    const result = gradeExam(exam, {
        s1: ["A"],
        m1: ["A"],
        b1: ["A"],
        b2: []
    }, { single: 1, multiple: 3, boolean: 2 });

    assert.strictEqual(result.score, 3);
    assert.strictEqual(result.totalScore, 8);
    assert.strictEqual(result.percentage, 38);
    assert.deepStrictEqual(
        result.items.map((item) => item.status),
        ["correct", "incorrect", "correct", "unanswered"]
    );
    assert.deepStrictEqual(result.byType.multiple, {
        score: 0,
        totalScore: 3,
        correct: 0,
        total: 1
    });

    const exact = gradeExam([questions[3]], { m1: ["C", "A"] }, { single: 1, multiple: 3, boolean: 1 });
    assert.strictEqual(exact.score, 3, "answer order should not affect exact matching");
}

testInventoryAndValidationUseQuestionData();
testBuildExamSamplesWithoutDuplicates();
testGradeExamRequiresExactMultipleChoiceMatchAndUsesCustomScores();
console.log("test-exam-prep-core passed");