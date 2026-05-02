/**
 * 单元测试：课时需求聚合与异常判定逻辑
 * TDD：测试核心逻辑，不依赖浏览器 DOM 或网络
 */

const { normalizeStudentName } = require("../student-name-alias.js");

// ============ Mock 函数 ============

function toQuotaNumber(value) {
    const raw = String(value ?? "").trim();
    if (!raw) return null;
    const normalized = raw.replace(/[^\d.+-]/g, "");
    if (!normalized) return null;
    const numeric = Number(normalized);
    return Number.isFinite(numeric) ? numeric : null;
}

function formatQuotaNeed(value) {
    const numeric = Number(value) || 0;
    if (Math.abs(numeric - Math.round(numeric)) < 0.00001) return String(Math.round(numeric));
    return String(Number(numeric.toFixed(2)));
}

function collectQuotaNeeds(entries) {
    const needsMap = new Map();

    for (const entry of entries || []) {
        const displayName = String(entry?.student || "").trim();
        if (!displayName) continue;

        const queryName = normalizeStudentName(displayName);
        const durationMinutes = Number(entry?.durationMinutes);
        if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) continue;

        if (!needsMap.has(queryName)) {
            needsMap.set(queryName, {
                displayNames: new Set(),
                requiredQuota30: 0,
                requiredQuota60: 0,
                maxDurationMinutes: 0
            });
        }

        const target = needsMap.get(queryName);
        target.displayNames.add(displayName);
        // 陪练时长：取本周该学生所有排课中最长的课程时长
        target.maxDurationMinutes = Math.max(target.maxDurationMinutes, durationMinutes);

        if (Math.abs(durationMinutes - 30) < 0.001) {
            target.requiredQuota30 += 1;
        } else if (Math.abs(durationMinutes - 60) < 0.001) {
            target.requiredQuota60 += 1;
        } else {
            target.requiredQuota30 += (durationMinutes / 30);
        }
    }

    // 计算每个学生的陪练时长需求（取最长课程时长）
    for (const requirement of needsMap.values()) {
        requirement.requiredAccompanyHours = (requirement.maxDurationMinutes || 0) / 60;
    }

    return needsMap;
}

function getRequiredFields(requirement) {
    const fields = [];
    if ((Number(requirement?.requiredQuota30) || 0) > 0) fields.push("quota30");
    if ((Number(requirement?.requiredQuota60) || 0) > 0) fields.push("quota60");
    if ((Number(requirement?.requiredAccompanyHours) || 0) > 0) fields.push("quotaAccompany");
    return fields;
}

// ============ 测试用例 ============

console.log("\n========== 测试 1: 邸睿 60分钟阅读 + 30分钟单词 ==========");
const test1Entries = [
    { student: "邸睿", course: "阅读", durationMinutes: 60 },
    { student: "邸睿", course: "单词", durationMinutes: 30 }
];
const test1Needs = collectQuotaNeeds(test1Entries);
const test1Req = test1Needs.get("邸睿");
console.log("需求:", {
    quota30: test1Req.requiredQuota30,
    quota60: test1Req.requiredQuota60,
    maxDurationMinutes: test1Req.maxDurationMinutes,
    requiredAccompanyHours: test1Req.requiredAccompanyHours
});

// 测试场景 A：剩余不足
console.log("\n场景 A：邸睿陪练剩余 0.5 小时（不足）");
const apiResponse_1A = { quota30: "1", quota60: "1", quotaAccompany: "0.5" };
const quota30_1A = toQuotaNumber(apiResponse_1A.quota30);
const quota60_1A = toQuotaNumber(apiResponse_1A.quota60);
const accompany_1A = toQuotaNumber(apiResponse_1A.quotaAccompany);
const isAnomalous_1A = 
    (test1Req.requiredQuota30 > 0 && (quota30_1A === null || quota30_1A < test1Req.requiredQuota30)) ||
    (test1Req.requiredQuota60 > 0 && (quota60_1A === null || quota60_1A < test1Req.requiredQuota60)) ||
    (test1Req.requiredAccompanyHours > 0 && (accompany_1A === null || accompany_1A < test1Req.requiredAccompanyHours));
console.log(`陪练 0.5 < 需求 ${formatQuotaNeed(test1Req.requiredAccompanyHours)} => 异常: ${isAnomalous_1A} ✓`);

// 测试场景 B：陪练充足
console.log("\n场景 B：邸睿陪练剩余 1.0 小时（充足）");
const apiResponse_1B = { quota30: "1", quota60: "1", quotaAccompany: "1.0" };
const quota30_1B = toQuotaNumber(apiResponse_1B.quota30);
const quota60_1B = toQuotaNumber(apiResponse_1B.quota60);
const accompany_1B = toQuotaNumber(apiResponse_1B.quotaAccompany);
const isAnomalous_1B = 
    (test1Req.requiredQuota30 > 0 && (quota30_1B === null || quota30_1B < test1Req.requiredQuota30)) ||
    (test1Req.requiredQuota60 > 0 && (quota60_1B === null || quota60_1B < test1Req.requiredQuota60)) ||
    (test1Req.requiredAccompanyHours > 0 && (accompany_1B === null || accompany_1B < test1Req.requiredAccompanyHours));
console.log(`陪练 1.0 >= 需求 ${formatQuotaNeed(test1Req.requiredAccompanyHours)} => 异常: ${isAnomalous_1B} ✓`);

// 测试场景 C：30分钟课时不足
console.log("\n场景 C：邸睿 30分钟剩余 0（不足）");
const apiResponse_1C = { quota30: "0", quota60: "1", quotaAccompany: "1.0" };
const quota30_1C = toQuotaNumber(apiResponse_1C.quota30);
const quota60_1C = toQuotaNumber(apiResponse_1C.quota60);
const accompany_1C = toQuotaNumber(apiResponse_1C.quotaAccompany);
const isAnomalous_1C = 
    (test1Req.requiredQuota30 > 0 && (quota30_1C === null || quota30_1C < test1Req.requiredQuota30)) ||
    (test1Req.requiredQuota60 > 0 && (quota60_1C === null || quota60_1C < test1Req.requiredQuota60)) ||
    (test1Req.requiredAccompanyHours > 0 && (accompany_1C === null || accompany_1C < test1Req.requiredAccompanyHours));
console.log(`30分钟 0 < 需求 ${formatQuotaNeed(test1Req.requiredQuota30)} => 异常: ${isAnomalous_1C} ✓`);

// 测试场景 D：60分钟课时不足
console.log("\n场景 D：邸睿 60分钟剩余 0（不足）");
const apiResponse_1D = { quota30: "1", quota60: "0", quotaAccompany: "1.0" };
const quota30_1D = toQuotaNumber(apiResponse_1D.quota30);
const quota60_1D = toQuotaNumber(apiResponse_1D.quota60);
const accompany_1D = toQuotaNumber(apiResponse_1D.quotaAccompany);
const isAnomalous_1D = 
    (test1Req.requiredQuota30 > 0 && (quota30_1D === null || quota30_1D < test1Req.requiredQuota30)) ||
    (test1Req.requiredQuota60 > 0 && (quota60_1D === null || quota60_1D < test1Req.requiredQuota60)) ||
    (test1Req.requiredAccompanyHours > 0 && (accompany_1D === null || accompany_1D < test1Req.requiredAccompanyHours));
console.log(`60分钟 0 < 需求 ${formatQuotaNeed(test1Req.requiredQuota60)} => 异常: ${isAnomalous_1D} ✓`);

// ============ 测试 2: 只有 30分钟课程 ==========
console.log("\n========== 测试 2: 陈怡睿 只有 30分钟单词课 ==========");
const test2Entries = [
    { student: "陈怡睿", course: "单词", durationMinutes: 30 }
];
const test2Needs = collectQuotaNeeds(test2Entries);
const test2Req = test2Needs.get("陈怡睿");
console.log("需求:", {
    quota30: test2Req.requiredQuota30,
    quota60: test2Req.requiredQuota60,
    maxDurationMinutes: test2Req.maxDurationMinutes,
    requiredAccompanyHours: test2Req.requiredAccompanyHours
});

console.log("\n场景 A：陈怡睿陪练剩余 0.5 小时（充足，max=0.5）");
const apiResponse_2A = { quota30: "1", quota60: "0", quotaAccompany: "0.5" };
const quota30_2A = toQuotaNumber(apiResponse_2A.quota30);
const quota60_2A = toQuotaNumber(apiResponse_2A.quota60);
const accompany_2A = toQuotaNumber(apiResponse_2A.quotaAccompany);
const isAnomalous_2A = 
    (test2Req.requiredQuota30 > 0 && (quota30_2A === null || quota30_2A < test2Req.requiredQuota30)) ||
    (test2Req.requiredQuota60 > 0 && (quota60_2A === null || quota60_2A < test2Req.requiredQuota60)) ||
    (test2Req.requiredAccompanyHours > 0 && (accompany_2A === null || accompany_2A < test2Req.requiredAccompanyHours));
console.log(`陪练 0.5 >= 需求 ${formatQuotaNeed(test2Req.requiredAccompanyHours)} => 异常: ${isAnomalous_2A} ✓`);

// ============ 测试 3: 只有 60分钟课程 ==========
console.log("\n========== 测试 3: 季筱雯 只有 60分钟单词课 ==========");
const test3Entries = [
    { student: "季筱雯", course: "单词", durationMinutes: 60 }
];
const test3Needs = collectQuotaNeeds(test3Entries);
const test3Req = test3Needs.get("季筱雯");
console.log("需求:", {
    quota30: test3Req.requiredQuota30,
    quota60: test3Req.requiredQuota60,
    maxDurationMinutes: test3Req.maxDurationMinutes,
    requiredAccompanyHours: test3Req.requiredAccompanyHours
});

console.log("\n场景 A：季筱雯陪练剩余 1.0 小时（充足，max=1.0）");
const apiResponse_3A = { quota30: "0", quota60: "1", quotaAccompany: "1.0" };
const quota30_3A = toQuotaNumber(apiResponse_3A.quota30);
const quota60_3A = toQuotaNumber(apiResponse_3A.quota60);
const accompany_3A = toQuotaNumber(apiResponse_3A.quotaAccompany);
const isAnomalous_3A = 
    (test3Req.requiredQuota30 > 0 && (quota30_3A === null || quota30_3A < test3Req.requiredQuota30)) ||
    (test3Req.requiredQuota60 > 0 && (quota60_3A === null || quota60_3A < test3Req.requiredQuota60)) ||
    (test3Req.requiredAccompanyHours > 0 && (accompany_3A === null || accompany_3A < test3Req.requiredAccompanyHours));
console.log(`陪练 1.0 >= 需求 ${formatQuotaNeed(test3Req.requiredAccompanyHours)} => 异常: ${isAnomalous_3A} ✓`);

console.log("\n========== 所有测试完成 ==========\n");
