(function (globalScope) {
    "use strict";

    var STUDENT_NAME_ALIAS = Object.freeze({
        "硕硕": "俞新硕"
    });

    function normalizeStudentName(value) {
        var trimmed = String(value || "").trim();
        return STUDENT_NAME_ALIAS[trimmed] || trimmed;
    }

    var api = {
        STUDENT_NAME_ALIAS: STUDENT_NAME_ALIAS,
        normalizeStudentName: normalizeStudentName
    };

    globalScope.StudentNameAlias = api;

    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
})(typeof window !== "undefined" ? window : globalThis);