(function (globalScope) {
    "use strict";

    function normalizeStudentName(value) {
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
            durationMinutes: durationMinutes
        };
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
        var normalizedRows = [];
        (Array.isArray(boardList) ? boardList : []).forEach(function (row) {
            var normalized = normalizeBoardRecord(row);
            if (!normalized) return;
            normalizedRows.push(normalized);
            var key = buildCourseMatchKey(normalized);
            if (key) keySet.add(key);
        });
        return {
            keys: keySet,
            rows: normalizedRows
        };
    }

    function hasScheduledCourse(index, targetCourse) {
        if (!index || !index.keys) return false;
        var key = buildCourseMatchKey(targetCourse);
        if (!key) return false;
        return index.keys.has(key);
    }

    var api = {
        normalizeBoardRecord: normalizeBoardRecord,
        buildCourseMatchKey: buildCourseMatchKey,
        createBoardMatchIndex: createBoardMatchIndex,
        hasScheduledCourse: hasScheduledCourse
    };

    globalScope.ScheduleCourseMatch = api;

    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
})(typeof window !== "undefined" ? window : globalThis);
