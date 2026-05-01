const assert = require("assert");
const { normalizeStudentName, STUDENT_NAME_ALIAS } = require("./student-name-alias.js");

function testAliasMap() {
    assert.strictEqual(STUDENT_NAME_ALIAS["硕硕"], "俞新硕");
}

function testNormalizeStudentName() {
    assert.strictEqual(normalizeStudentName(" 硕硕 "), "俞新硕");
    assert.strictEqual(normalizeStudentName("俞新硕"), "俞新硕");
    assert.strictEqual(normalizeStudentName("胡贝妮"), "胡贝妮");
}

function run() {
    testAliasMap();
    testNormalizeStudentName();
    console.log("test-student-name-alias passed");
}

run();
