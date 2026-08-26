const assert = require("assert");
const fs = require("fs");
const path = require("path");

function read(relativePath) {
    return fs.readFileSync(path.resolve(__dirname, "..", relativePath), "utf8");
}

function testIndexExposesExamPreparationEntry() {
    const html = read("index.html");
    assert.ok(html.includes('id="navigateToExamPrepPage"'));
    assert.ok(html.includes("exam-prep/index.html"));
}

function testPageContainsRequiredSettingsAndResultControls() {
    const html = read("exam-prep/index.html");
    for (const id of [
        "single-count", "multiple-count", "boolean-count",
        "single-score", "multiple-score", "boolean-score",
        "mode-instant", "mode-submit", "start-exam",
        "confirm-answer", "submit-exam", "incorrect-only",
        "retry-exam", "reset-exam"
    ]) {
        assert.ok(html.includes(`id="${id}"`), `missing page control: ${id}`);
    }
    assert.ok(html.includes('value="20"'), "default count 20 should be present");
    assert.ok(html.includes('id="multiple-score"') && html.includes('value="2"'), "multiple choice should default to 2 points");
    assert.ok(html.includes("core.js?v="));
    assert.ok(html.includes("app.js?v="));
}

function testPageSupportsDynamicInventoryAndVersionedQuestionBank() {
    const script = read("exam-prep/app.js");
    assert.ok(/questions-[a-z0-9-]+\.json/.test(script), "question bank URL should be versioned");
    assert.ok(script.includes("getInventory"), "inventory should be derived from loaded questions");
    assert.ok(script.includes("countInput.max = state.inventory[type]"), "dynamic inventory should set the native input max");
    assert.ok(script.includes("最多可选"), "over-limit errors should be shown to users");
    assert.ok(script.includes("gradeExam"), "submission should use shared grading logic");
}

function testStylesCoverWrongAnswersAndPhoneSafeAreas() {
    const css = read("exam-prep/style.css");
    assert.ok(/\.result-item\.incorrect[\s\S]*border/.test(css), "wrong result cards should be highlighted");
    assert.ok(/\.option\.selected-wrong[\s\S]*(#|rgb|var\()/.test(css), "selected wrong answers should be red");
    assert.ok(css.includes("env(safe-area-inset-bottom)"), "iPhone safe area should be respected");
    assert.ok(/@media\s*\(max-width:\s*430px\)/.test(css), "phone layout should cover Huawei and iPhone widths");
}

function testQuestionBankUsesImmutableCaching() {
    const config = read("netlify.toml");
    assert.ok(config.includes('for = "/exam-prep/questions-*.json"'));
    assert.ok(config.includes("public, max-age=31536000, immutable"));
}

function testGeneratedQuestionBankContainsOnlyValidatedQuestions() {
    const bank = JSON.parse(read("exam-prep/questions-v1.json"));
    const counts = bank.questions.reduce((result, question) => {
        result[question.type] = (result[question.type] || 0) + 1;
        assert.ok(question.answers.length >= (question.type === "multiple" ? 2 : 1), `invalid answers: ${question.id}`);
        return result;
    }, {});
    assert.deepStrictEqual(counts, { single: 400, multiple: 200, boolean: 384 });
}

testIndexExposesExamPreparationEntry();
testPageContainsRequiredSettingsAndResultControls();
testPageSupportsDynamicInventoryAndVersionedQuestionBank();
testStylesCoverWrongAnswersAndPhoneSafeAreas();
testQuestionBankUsesImmutableCaching();
testGeneratedQuestionBankContainsOnlyValidatedQuestions();
console.log("test-exam-prep-page-regression passed");