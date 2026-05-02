(function (globalScope) {
    "use strict";

    var studentNameAliasApi = null;
    if (typeof module !== "undefined" && module.exports && typeof require === "function") {
        studentNameAliasApi = require("./student-name-alias.js");
    } else if (globalScope.StudentNameAlias) {
        studentNameAliasApi = globalScope.StudentNameAlias;
    }

    function normalizeStudentName(value) {
        if (studentNameAliasApi && typeof studentNameAliasApi.normalizeStudentName === "function") {
            return studentNameAliasApi.normalizeStudentName(value);
        }
        return String(value || "").trim();
    }

    function normalizeDurationMinutes(value) {
        var numeric = Number(value);
        if (!Number.isFinite(numeric) || numeric <= 0) return null;
        return Math.round(numeric);
    }

    function toYmdByTimestamp(timestampMs) {
        var date = new Date(Number(timestampMs));
        if (!Number.isFinite(date.getTime())) return "";
        var y = date.getFullYear();
        var m = String(date.getMonth() + 1).padStart(2, "0");
        var d = String(date.getDate()).padStart(2, "0");
        return y + "-" + m + "-" + d;
    }

    function parseBoardDurationMinutes(type, fallbackMinutes) {
        var rawType = String(type || "").trim();
        if (/MINUTE_30/i.test(rawType)) return 30;
        if (/MINUTE_60/i.test(rawType)) return 60;
        var fromType = rawType.match(/MINUTE_(\d+)/i);
        if (fromType) return normalizeDurationMinutes(fromType[1]);
        return normalizeDurationMinutes(fallbackMinutes);
    }

    function normalizeBoardRecord(row) {
        if (!row || typeof row !== "object") return null;
        var student = normalizeStudentName(row.student && row.student.name);
        var date = toYmdByTimestamp(row.scheduleTime);
        var durationMinutes = parseBoardDurationMinutes(row.type, row.durationMinutes);
        if (!student || !date || !durationMinutes) return null;

        return {
            student: student,
            date: date,
            durationMinutes: durationMinutes,
            matchState: resolveBoardCourseState(row)
        };
    }

    function extractBoardStatusText(row) {
        var values = [
            row && row.status,
            row && row.statusText,
            row && row.statusDesc,
            row && row.statusName,
            row && row.trainingStatus,
            row && row.courseStatus
        ];
        for (var i = 0; i < values.length; i += 1) {
            var text = String(values[i] || "").trim();
            if (text) return text;
        }
        return "";
    }

    function resolveBoardCourseState(row) {
        var statusText = extractBoardStatusText(row).toLowerCase();
        if (!statusText) return "scheduled";
        if (statusText.indexOf("已完成") !== -1 || statusText.indexOf("completed") !== -1 || statusText === "3") {
            return "completed";
        }
        return "scheduled";
    }

    function mergeCourseState(currentState, nextState) {
        if (currentState === "completed" || nextState === "completed") return "completed";
        if (currentState === "scheduled" || nextState === "scheduled") return "scheduled";
        return "none";
    }

    function buildCourseMatchKey(input) {
        if (!input || typeof input !== "object") return "";
        var student = normalizeStudentName(input.student);
        var date = String(input.date || "").trim();
        var durationMinutes = normalizeDurationMinutes(input.durationMinutes);
        if (!student || !date || !durationMinutes) return "";
        return student + "__" + date + "__" + durationMinutes;
    }

    function createBoardMatchIndex(boardList) {
        var keySet = new Set();
        var stateByKey = new Map();
        var normalizedRows = [];
        (Array.isArray(boardList) ? boardList : []).forEach(function (row) {
            var normalized = normalizeBoardRecord(row);
            if (!normalized) return;
            normalizedRows.push(normalized);
            var key = buildCourseMatchKey(normalized);
            if (key) {
                keySet.add(key);
                var previousState = stateByKey.get(key) || "none";
                stateByKey.set(key, mergeCourseState(previousState, normalized.matchState));
            }
        });
        return {
            keys: keySet,
            rows: normalizedRows,
            stateByKey: stateByKey
        };
    }

    function resolveBoardQueryPlan(hostname) {
        var host = String(hostname || "").trim().toLowerCase();
        var shouldDirectFetch = host === "h5.lxll.com";
        if (shouldDirectFetch) {
            return {
                url: "https://apiv2.lxll.com/customer/training/board",
                useProxy: false
            };
        }
        return {
            url: "/.netlify/functions/schedule-board",
            useProxy: true
        };
    }

    function getCourseMatchState(index, targetCourse) {
        if (!index || !index.keys) return "none";
        var key = buildCourseMatchKey(targetCourse);
        if (!key) return "none";
        if (!index.keys.has(key)) return "none";
        if (index.stateByKey && typeof index.stateByKey.get === "function") {
            return index.stateByKey.get(key) || "scheduled";
        }
        return "scheduled";
    }

    function hasScheduledCourse(index, targetCourse) {
        return getCourseMatchState(index, targetCourse) !== "none";
    }

    var api = {
        normalizeBoardRecord: normalizeBoardRecord,
        buildCourseMatchKey: buildCourseMatchKey,
        createBoardMatchIndex: createBoardMatchIndex,
        getCourseMatchState: getCourseMatchState,
        hasScheduledCourse: hasScheduledCourse,
        resolveBoardQueryPlan: resolveBoardQueryPlan
    };

    globalScope.ScheduleCourseMatch = api;

    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
})(typeof window !== "undefined" ? window : globalThis);
