const assert = require("assert");
const fs = require("fs");
const path = require("path");

function readWorkspaceFile(relativePath) {
    return fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");
}

const classFormalContent = readWorkspaceFile("classFormal.js");
const classReadContent = readWorkspaceFile("classRead.js");
const classTrialContent = readWorkspaceFile("classTrial.js");
const antiForgettingContent = readWorkspaceFile("anti-forgetting.html");
const commonFunctionsContent = readWorkspaceFile("commonFunctions.js");

assert(
    !classFormalContent.includes('"施博睿": {'),
    "classFormal.js 不应再保留施博睿静态学员配置"
);

assert(
    commonFunctionsContent.includes("export const LEGACY_STUDENT_NAMES"),
    "LEGACY_STUDENT_NAMES 应统一在 commonFunctions.js 维护"
);

assert(
    commonFunctionsContent.includes("李敏维") &&
    commonFunctionsContent.includes("季筱雯") &&
    commonFunctionsContent.includes("施博睿") &&
    commonFunctionsContent.includes("于熠凡"),
    "commonFunctions.js 中的 legacy 名单应包含新增需过滤学员：季筱雯、施博睿、于熠凡"
);

assert(
    commonFunctionsContent.includes("export function filterLegacyStudents"),
    "filterLegacyStudents 应统一在 commonFunctions.js 提供"
);

assert(
    classFormalContent.includes("filterLegacyStudents(") && !classFormalContent.includes("function filterLegacyStudents("),
    "classFormal.js 应复用 commonFunctions.filterLegacyStudents，而不是本地重复定义"
);

assert(
    classReadContent.includes("filterLegacyStudents(") && !classReadContent.includes("function filterLegacyStudents("),
    "classRead.js 应复用 commonFunctions.filterLegacyStudents，而不是本地重复定义"
);

assert(
    classTrialContent.includes("filterLegacyStudents(") && !classTrialContent.includes("function filterLegacyStudents("),
    "classTrial.js 应复用 commonFunctions.filterLegacyStudents，而不是本地重复定义"
);

assert(
    antiForgettingContent.includes("commonFunctions.filterLegacyStudents(") && !antiForgettingContent.includes("function filterLegacyStudents("),
    "anti-forgetting.html 应复用 commonFunctions.filterLegacyStudents，而不是本地重复定义"
);

console.log("test-legacy-student-filtering passed");
