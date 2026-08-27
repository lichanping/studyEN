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
        "retry-exam", "retry-incorrect", "reset-exam"
    ]) {
        assert.ok(html.includes(`id="${id}"`), `missing page control: ${id}`);
    }
    assert.strictEqual((html.match(/class="setting-fields"/g) || []).length, 3, "each question type should group count and score");
    assert.strictEqual((html.match(/-count"[^>]*value="5"/g) || []).length, 3, "all default counts should be 5");
    assert.ok(html.includes('id="multiple-score"') && html.includes('value="2"'), "multiple choice should default to 2 points");
    assert.ok(html.includes('href="style.css?v=20260827-2"'), "updated mobile styles should use a new cache version");
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
    assert.ok(script.includes("buildRetryExam"), "wrong and unanswered questions should support retrying");
    assert.ok(script.includes('state.confirmed.size === state.exam.length'), "instant mode should show results after all questions");
    assert.ok(!script.includes('byId("submit-exam").hidden = state.mode === "instant"'), "instant mode should keep manual submission visible");
}

function testStylesCoverWrongAnswersAndPhoneSafeAreas() {
    const css = read("exam-prep/style.css");
    assert.ok(/\.result-item\.incorrect[\s\S]*border/.test(css), "wrong result cards should be highlighted");
    assert.ok(/\.option\.selected-wrong[\s\S]*(#|rgb|var\()/.test(css), "selected wrong answers should be red");
    assert.ok(css.includes("env(safe-area-inset-bottom)"), "iPhone safe area should be respected");
    assert.ok(/@media\s*\(max-width:\s*430px\)/.test(css), "phone layout should cover Huawei and iPhone widths");
    assert.ok(/@media\s*\(max-width:\s*430px\)[\s\S]*\.setting-fields[\s\S]*grid-template-columns:\s*1fr 1fr/.test(css), "count and score should share one row on phones");
    assert.ok(/@media\s*\(max-width:\s*430px\)[\s\S]*\.type-setting\s*\{[^}]*padding:\s*8px 10px 6px/.test(css), "question type rows should use compact phone padding");
    assert.ok(/@media\s*\(max-width:\s*430px\)[\s\S]*\.field-error:empty[^}]*min-height:\s*0[^}]*margin:\s*0/.test(css), "empty field errors should not add phone height");
    assert.ok(/@media\s*\(max-width:\s*430px\)[\s\S]*\.mode-setting\s*\{[^}]*grid-template-columns:\s*1fr 1fr/.test(css), "grading modes should share one row on phones");
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