"use strict";

const STUDENT_NAME_ALIAS = Object.freeze({
    "硕硕": "俞新硕"
});

function normalizeStudentName(value) {
    const trimmed = String(value || "").trim();
    return STUDENT_NAME_ALIAS[trimmed] || trimmed;
}

function normalizeDurationMinutes(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return null;
    return Math.round(numeric);
}

function toYmdByTimestamp(timestampMs) {
    const date = new Date(Number(timestampMs));
    if (!Number.isFinite(date.getTime())) return "";
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function parseBoardDurationMinutes(type, fallbackMinutes) {
    const rawType = String(type || "").trim();
    if (/TRIAL/i.test(rawType)) return normalizeDurationMinutes(fallbackMinutes) || 60;
    if (/MINUTE_30/i.test(rawType)) return 30;
    if (/MINUTE_60/i.test(rawType)) return 60;
    const fromType = rawType.match(/MINUTE_(\d+)/i);
    if (fromType) return normalizeDurationMinutes(fromType[1]);
    return normalizeDurationMinutes(fallbackMinutes);
}

function extractBoardStatusText(row) {
    const values = [
        row && row.status,
        row && row.statusText,
        row && row.statusDesc,
        row && row.statusName,
        row && row.trainingStatus,
        row && row.courseStatus
    ];
    for (const value of values) {
        const text = String(value || "").trim();
        if (text) return text;
    }
    return "";
}

function resolveBoardCourseState(row) {
    const statusText = extractBoardStatusText(row).toLowerCase();
    if (!statusText) return "scheduled";
    if (statusText.includes("已完成") || statusText.includes("completed") || statusText === "3") {
        return "completed";
    }
    return "scheduled";
}

function normalizeBoardRecord(row) {
    if (!row || typeof row !== "object") return null;
    const student = normalizeStudentName(row.student && row.student.name);
    const date = toYmdByTimestamp(row.scheduleTime);
    const durationMinutes = parseBoardDurationMinutes(row.type, row.durationMinutes);
    if (!student || !date || !durationMinutes) return null;
    return {
        student,
        date,
        durationMinutes,
        matchState: resolveBoardCourseState(row)
    };
}

function mergeCourseState(currentState, nextState) {
    if (currentState === "completed" || nextState === "completed") return "completed";
    if (currentState === "scheduled" || nextState === "scheduled") return "scheduled";
    return "none";
}

function buildCourseMatchKey(input) {
    if (!input || typeof input !== "object") return "";
    const student = normalizeStudentName(input.student);
    const date = String(input.date || "").trim();
    const durationMinutes = normalizeDurationMinutes(input.durationMinutes);
    if (!student || !date || !durationMinutes) return "";
    return `${student}__${date}__${durationMinutes}`;
}

function createBoardMatchIndex(boardList) {
    const keySet = new Set();
    const stateByKey = new Map();
    const normalizedRows = [];
    for (const row of Array.isArray(boardList) ? boardList : []) {
        const normalized = normalizeBoardRecord(row);
        if (!normalized) continue;
        normalizedRows.push(normalized);
        const key = buildCourseMatchKey(normalized);
        if (!key) continue;
        keySet.add(key);
        const previousState = stateByKey.get(key) || "none";
        stateByKey.set(key, mergeCourseState(previousState, normalized.matchState));
    }
    return {
        keys: keySet,
        rows: normalizedRows,
        stateByKey
    };
}

function getCourseMatchState(index, targetCourse) {
    if (!index || typeof index !== "object") return "none";
    const key = buildCourseMatchKey(targetCourse);
    if (!key) return "none";
    return index.stateByKey instanceof Map ? (index.stateByKey.get(key) || "none") : "none";
}

module.exports = {
    buildCourseMatchKey,
    createBoardMatchIndex,
    getCourseMatchState
};