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

    function parseDurationMinutesFromText(value) {
        var text = String(value || "").trim();
        if (!text) return null;
        var match = text.match(/(\d+(?:\.\d+)?)\s*分钟/);
        if (match) return normalizeDurationMinutes(Number(match[1]));
        return null;
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

    function resolveCompletedQueryPlan(hostname) {
        var host = String(hostname || "").trim().toLowerCase();
        var shouldDirectFetch = host === "h5.lxll.com";
        if (shouldDirectFetch) {
            return {
                url: "https://apiv2.lxll.com/customer/training/orders?pageNumber=1&pageSize=50&status=COMPLETED",
                useProxy: false
            };
        }
        return {
            url: "/.netlify/functions/schedule-board?mode=completed",
            useProxy: true
        };
    }

    var SALARY_RATE_MAP = {
        "词汇课": 50,
        "阅读完型语法课": 55,
        "体验课": 40
    };

    function inferSalaryTypeFromCourse(courseText) {
        var text = String(courseText || "").trim();
        if (!text) return "词汇课";
        if (text.indexOf("体验") !== -1) return "体验课";
        if (text.indexOf("阅读") !== -1 || text.indexOf("完型") !== -1 || text.indexOf("语法") !== -1) {
            return "阅读完型语法课";
        }
        return "词汇课";
    }

    function inferSalaryTypeFromCompletedRecord(row, fallbackCourseName) {
        var hints = [
            fallbackCourseName,
            row && row.category,
            row && row.type,
            row && row.materialName,
            row && row.material && row.material.name,
            row && row.course && row.course.name
        ].map(function (value) {
            return String(value || "").trim();
        }).filter(Boolean);

        var joined = hints.join("|");
        return inferSalaryTypeFromCourse(joined);
    }

    function toYmdFromAny(raw) {
        if (raw === null || typeof raw === "undefined") return "";

        if (typeof raw === "string") {
            var maybeYmd = raw.slice(0, 10);
            if (/^\d{4}-\d{2}-\d{2}$/.test(maybeYmd)) {
                return maybeYmd;
            }

            var parsedFromString = new Date(raw);
            if (Number.isFinite(parsedFromString.getTime())) {
                return toYmdByTimestamp(parsedFromString.getTime());
            }
            return "";
        }

        if (raw instanceof Date) {
            if (!Number.isFinite(raw.getTime())) return "";
            return toYmdByTimestamp(raw.getTime());
        }

        return toYmdByTimestamp(raw);
    }

    function extractCompletedSourceId(row) {
        var candidates = [
            row && row.id,
            row && row.orderId,
            row && row.scheduleId,
            row && row.trainingId,
            row && row.antiForgetId
        ];

        for (var i = 0; i < candidates.length; i += 1) {
            var candidate = String(candidates[i] || "").trim();
            if (candidate) return candidate;
        }
        return "";
    }

    function parseCompletedDurationMinutes(row) {
        if (!row || typeof row !== "object") return null;

        var byType = parseBoardDurationMinutes(row.type, null);
        if (byType) return byType;

        var minuteCandidates = [
            row.durationMinutes,
            row.duration,
            row.trainDurationMinutes,
            row.classDurationMinutes
        ];

        for (var i = 0; i < minuteCandidates.length; i += 1) {
            var minutes = normalizeDurationMinutes(minuteCandidates[i]);
            if (minutes) return minutes;
        }

        var hourCandidates = [row.durationHours, row.hours];
        for (var j = 0; j < hourCandidates.length; j += 1) {
            var hourValue = Number(hourCandidates[j]);
            if (Number.isFinite(hourValue) && hourValue > 0) {
                return normalizeDurationMinutes(hourValue * 60);
            }
        }

        var textCandidates = [
            row.duration,
            row.trainingTime,
            row.trainTimeText,
            row.trainingDurationText,
            row.durationText
        ];
        for (var k = 0; k < textCandidates.length; k += 1) {
            var minutesFromText = parseDurationMinutesFromText(textCandidates[k]);
            if (minutesFromText) return minutesFromText;
        }

        return null;
    }

    function extractCompletedCourseText(row) {
        var values = [
            row && row.courseName,
            row && row.category,
            row && row.materialName,
            row && row.material && row.material.name,
            row && row.course && row.course.name,
            row && row.type
        ];

        for (var i = 0; i < values.length; i += 1) {
            var text = String(values[i] || "").trim();
            if (text) return text;
        }
        return "";
    }

    function extractCompletedStudentName(row) {
        var values = [
            row && row.student && row.student.name,
            row && row.userName,
            row && row.studentName,
            row && row.trainerName
        ];

        for (var i = 0; i < values.length; i += 1) {
            var text = normalizeStudentName(values[i]);
            if (text) return text;
        }
        return "";
    }

    function normalizeCompletedRecordForSalary(row) {
        if (!row || typeof row !== "object") return null;

        var studentName = extractCompletedStudentName(row);
        var courseName = extractCompletedCourseText(row);
        var date = toYmdFromAny(
            row.scheduleTime ||
            row.startTime ||
            row.beginTime ||
            row.actualStartTime ||
            row.reserveStartTime ||
            row.trainTime ||
            row.orderTime ||
            row.date
        );
        var durationMinutes = parseCompletedDurationMinutes(row);

        var salaryType = inferSalaryTypeFromCompletedRecord(row, courseName);

        // Trial classes are always fixed at 1 hour; do not drop them for missing duration
        if (!durationMinutes && salaryType === "体验课") {
            durationMinutes = 60;
        }

        if (!studentName || !date || !durationMinutes) return null;

        var rate = SALARY_RATE_MAP[salaryType] || 50;
        var durationHours = salaryType === "体验课" ? 1 : Number((durationMinutes / 60).toFixed(2));
        var fee = Number((durationHours * rate).toFixed(2));
        var sourceId = extractCompletedSourceId(row);

        return {
            sourceId: sourceId,
            date: date,
            studentName: studentName,
            courseName: courseName,
            salaryType: salaryType,
            durationHours: durationHours,
            rate: rate,
            fee: fee
        };
    }

    function extractTeacherNamesFromRecords(records) {
        var nameSet = new Set();
        var list = Array.isArray(records) ? records : [];
        list.forEach(function (record) {
            if (!record || typeof record !== "object") return;
            var candidates = [
                record.trainerName,
                record.teacherName,
                record.teacher && record.teacher.name,
                record.trainer && record.trainer.name,
                record.teacherNameText,
                record.trainerNameText
            ];
            candidates.forEach(function (val) {
                var text = String(val || "").trim();
                if (!text) return;
                if (text.indexOf(" ") !== -1) {
                    var parts = text.split(/\s+/);
                    var namePart = parts[0];
                    if (namePart && namePart.length > 1) {
                        nameSet.add(namePart);
                    }
                } else if (text.length > 1) {
                    nameSet.add(text);
                }
            });
        });
        return Array.from(nameSet);
    }

    function hasTeacherIdentity(record) {
        if (!record || typeof record !== "object") return false;
        var candidates = [
            record.trainerName,
            record.teacherName,
            record.teacher && record.teacher.name,
            record.trainer && record.trainer.name,
            record.teacherNameText,
            record.trainerNameText
        ];
        for (var i = 0; i < candidates.length; i += 1) {
            var text = String(candidates[i] || "").trim();
            if (text) return true;
        }
        return false;
    }

    function containsPattern(text, patterns) {
        var normalized = String(text || "").trim();
        if (!normalized || !Array.isArray(patterns) || patterns.length === 0) return false;
        for (var i = 0; i < patterns.length; i += 1) {
            if (normalized.indexOf(patterns[i]) !== -1) return true;
        }
        return false;
    }

    function buildExcludedSalaryPatterns(completedRecords) {
        var list = Array.isArray(completedRecords) ? completedRecords : [];
        if (list.length === 0) {
            return Object.freeze({ studentPatterns: [], coursePatterns: [] });
        }

        var names = extractTeacherNamesFromRecords(list);
        if (names.length === 0) {
            return Object.freeze({ studentPatterns: [], coursePatterns: [] });
        }

        var testCourseSet = new Set();
        list.forEach(function (record) {
            if (!hasTeacherIdentity(record)) return;

            var student = extractCompletedStudentName(record);
            var course = extractCompletedCourseText(record);
            if (!student || !course) return;
            if (!containsPattern(student, names)) return;

            testCourseSet.add(course);
        });

        return Object.freeze({
            studentPatterns: Object.freeze(names),
            coursePatterns: Object.freeze(Array.from(testCourseSet))
        });
    }

    function shouldExcludeSalaryStudent(studentName, courseName, excludedPatterns) {
        if (!excludedPatterns || typeof excludedPatterns !== "object") return false;
        if (!containsPattern(studentName, excludedPatterns.studentPatterns)) return false;
        if (!containsPattern(courseName, excludedPatterns.coursePatterns)) return false;
        return true;
    }

    function buildSalaryRowsFromCompletedRecords(records, options) {
        var list = Array.isArray(records) ? records : [];
        var excludedPatterns = buildExcludedSalaryPatterns(list);
        var startDate = String(options && options.startDate || "").trim();
        var endDate = String(options && options.endDate || "").trim();
        var rows = [];
        var seen = new Set();

        list.forEach(function (record) {
            var normalized = normalizeCompletedRecordForSalary(record);
            if (!normalized) return;
            if (shouldExcludeSalaryStudent(normalized.studentName, normalized.courseName, excludedPatterns)) return;

            if (startDate && normalized.date < startDate) return;
            if (endDate && normalized.date > endDate) return;

            var dedupeKey = normalized.sourceId ||
                (normalized.studentName + "__" + normalized.date + "__" + normalized.durationHours + "__" + normalized.salaryType);
            if (seen.has(dedupeKey)) return;
            seen.add(dedupeKey);
            rows.push(normalized);
        });

        rows.sort(function (a, b) {
            var byDate = a.date.localeCompare(b.date);
            if (byDate !== 0) return byDate;
            return a.studentName.localeCompare(b.studentName, "zh-CN");
        });

        return rows;
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
        resolveBoardQueryPlan: resolveBoardQueryPlan,
        resolveCompletedQueryPlan: resolveCompletedQueryPlan,
        inferSalaryTypeFromCourse: inferSalaryTypeFromCourse,
        normalizeCompletedRecordForSalary: normalizeCompletedRecordForSalary,
        buildSalaryRowsFromCompletedRecords: buildSalaryRowsFromCompletedRecords
    };

    globalScope.ScheduleCourseMatch = api;

    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
})(typeof window !== "undefined" ? window : globalThis);
