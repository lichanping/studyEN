const assert = require("assert");
const fs = require("fs");
const path = require("path");

const adapterPath = path.resolve(__dirname, "../exam-prep-miniprogram/utils/exam-session.js");
assert.ok(fs.existsSync(adapterPath), "missing mini program exam session adapter");

const {
    chooseOption,
    confirmAnswer,
    createSession,
    retryIncorrect,
    startExam,
    submitExam
} = require(adapterPath);

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

function testMiniProgramSessionSupportsExamAndRetryFlow() {
    const questions = [
        question("s1", "single", ["A"]),
        question("m1", "multiple", ["A", "C"]),
        question("b1", "boolean", ["B"])
    ];
    const initial = createSession(questions);
    assert.deepStrictEqual(initial.inventory, { single: 1, multiple: 1, boolean: 1 });
    assert.strictEqual(initial.view, "setup");

    const started = startExam(initial, {
        counts: { single: 1, multiple: 1, boolean: 1 },
        scores: { single: 1, multiple: 2, boolean: 1 }
    }, "submit", () => 0);
    assert.strictEqual(started.validation.valid, true);
    assert.strictEqual(started.session.view, "quiz");
    assert.strictEqual(started.session.exam.length, 3);

    let session = started.session;
    for (const item of session.exam) {
        const selected = item.id === "m1" ? ["A"] : item.answers;
        for (const optionId of selected) session = chooseOption(session, item.id, optionId);
    }

    const resultSession = submitExam(session);
    assert.strictEqual(resultSession.view, "results");
    assert.strictEqual(resultSession.result.score, 2);
    assert.strictEqual(resultSession.result.totalScore, 4);
    assert.deepStrictEqual(
        resultSession.result.items.map((item) => item.status).sort(),
        ["correct", "correct", "incorrect"]
    );

    const retrySession = retryIncorrect(resultSession);
    assert.strictEqual(retrySession.view, "quiz");
    assert.deepStrictEqual(retrySession.exam.map((item) => item.id), ["m1"]);
    assert.deepStrictEqual(retrySession.responses, {});
}

function testInstantModeLocksConfirmedAnswersAndFinishesAutomatically() {
    const questions = [question("s1", "single", ["A"])];
    const started = startExam(createSession(questions), {
        counts: { single: 1, multiple: 0, boolean: 0 },
        scores: { single: 1, multiple: 2, boolean: 1 }
    }, "instant", () => 0);
    const answered = chooseOption(started.session, "s1", "A");
    const confirmation = confirmAnswer(answered, "s1");

    assert.strictEqual(confirmation.error, "");
    assert.strictEqual(confirmation.session.view, "results");
    assert.deepStrictEqual(confirmation.session.confirmed, ["s1"]);
    assert.deepStrictEqual(
        chooseOption(confirmation.session, "s1", "B").responses.s1,
        ["A"],
        "confirmed instant answers should be locked"
    );
    assert.doesNotThrow(() => JSON.stringify(confirmation.session));
}

testMiniProgramSessionSupportsExamAndRetryFlow();
testInstantModeLocksConfirmedAnswersAndFinishesAutomatically();
console.log("test-exam-prep-miniprogram passed");