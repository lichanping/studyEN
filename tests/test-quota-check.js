/**
 * 单元测试：课时需求聚合与异常判定逻辑
 * TDD：测试核心逻辑，不依赖浏览器 DOM 或网络
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { normalizeStudentName } = require("../student-name-alias.js");
const LEGACY_STUDENT_NAMES = new Set(["李敏维", "季筱雯", "施博睿", "于熠凡", "陈怡睿"]);
const scheduleSource = fs.readFileSync(path.join(__dirname, "..", "schedule.html"), "utf8");

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

const formatQuotaDisplayCode = extractBlock(scheduleSource, "function formatQuotaDisplay");
const formatQuotaDisplay = new Function(
    "toQuotaNumber",
    `${formatQuotaDisplayCode}\nreturn formatQuotaDisplay;`
)(toQuotaNumber);

function collectQuotaNeeds(entries) {
    const needsMap = new Map();

    for (const entry of entries || []) {
        const displayName = String(entry?.student || "").trim();
        if (!displayName) continue;
        if (LEGACY_STUDENT_NAMES.has(displayName)) continue;

        const course = String(entry?.course || "").trim();
        if (course.includes("体验")) continue;

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

function extractBlock(source, signature, openChar = "{", closeChar = "}") {
    const start = source.indexOf(signature);
    if (start === -1) {
        throw new Error(`Unable to find block: ${signature}`);
    }

    const bodyStart = source.indexOf(openChar, start);
    if (bodyStart === -1) {
        throw new Error(`Unable to find block body for: ${signature}`);
    }

    let depth = 0;
    for (let index = bodyStart; index < source.length; index += 1) {
        const char = source[index];
        if (char === openChar) depth += 1;
        if (char === closeChar) {
            depth -= 1;
            if (depth === 0) {
                return source.slice(start, index + 1);
            }
        }
    }

    throw new Error(`Unable to extract block: ${signature}`);
}

// ============ 测试用例 ============

console.log("\n========== 测试 0: 体验课不参与课时余额检查 ==========");
const trialNeeds = collectQuotaNeeds([
    { student: "悦慧", course: "体验", durationMinutes: 60 },
    { student: "邸睿", course: "单词", durationMinutes: 30 }
]);
assert.strictEqual(trialNeeds.has("悦慧"), false, "体验课学生不应进入课时余额检查");
assert.strictEqual(trialNeeds.has("邸睿"), true, "非体验课学生仍应进入课时余额检查");

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
    (test1Req.requiredQuota30 > 0 && (quota30_1A === null || quota30_1A <= 0.00001)) ||
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
    (test1Req.requiredQuota30 > 0 && (quota30_1B === null || quota30_1B <= 0.00001)) ||
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
    (test1Req.requiredQuota30 > 0 && (quota30_1C === null || quota30_1C <= 0.00001)) ||
    (test1Req.requiredQuota60 > 0 && (quota60_1C === null || quota60_1C <= 0.00001)) ||
    (test1Req.requiredAccompanyHours > 0 && (accompany_1C === null || accompany_1C < test1Req.requiredAccompanyHours));
console.log(`30分钟 0 < 需求 ${formatQuotaNeed(test1Req.requiredQuota30)} => 异常: ${isAnomalous_1C} ✓`);
assert.strictEqual(isAnomalous_1C, true, "30分钟剩余为 0 时应判定为异常");

console.log("\n场景 C2：邸睿本周需 3 节 30分钟课，剩余 2（非 0，不应异常）");
const test1C2Entries = [
    { student: "邸睿", course: "单词", durationMinutes: 30 },
    { student: "邸睿", course: "单词", durationMinutes: 30 },
    { student: "邸睿", course: "单词", durationMinutes: 30 }
];
const test1C2Needs = collectQuotaNeeds(test1C2Entries);
const test1C2Req = test1C2Needs.get("邸睿");
const apiResponse_1C2 = { quota30: "2", quota60: "0", quotaAccompany: "0.5" };
const quota30_1C2 = toQuotaNumber(apiResponse_1C2.quota30);
const quota60_1C2 = toQuotaNumber(apiResponse_1C2.quota60);
const accompany_1C2 = toQuotaNumber(apiResponse_1C2.quotaAccompany);
const isAnomalous_1C2 = 
    (test1C2Req.requiredQuota30 > 0 && (quota30_1C2 === null || quota30_1C2 <= 0.00001)) ||
    (test1C2Req.requiredQuota60 > 0 && (quota60_1C2 === null || quota60_1C2 <= 0.00001)) ||
    (test1C2Req.requiredAccompanyHours > 0 && (accompany_1C2 === null || accompany_1C2 < test1C2Req.requiredAccompanyHours));
console.log(`30分钟剩余 2，需求 ${formatQuotaNeed(test1C2Req.requiredQuota30)} => 异常: ${isAnomalous_1C2}`);
assert.strictEqual(isAnomalous_1C2, false, "30分钟剩余只要不是 0，就不应判定为异常");

// 测试场景 D：60分钟课时不足
console.log("\n场景 D：邸睿 60分钟剩余 0（不足）");
const apiResponse_1D = { quota30: "1", quota60: "0", quotaAccompany: "1.0" };
const quota30_1D = toQuotaNumber(apiResponse_1D.quota30);
const quota60_1D = toQuotaNumber(apiResponse_1D.quota60);
const accompany_1D = toQuotaNumber(apiResponse_1D.quotaAccompany);
const isAnomalous_1D = 
    (test1Req.requiredQuota30 > 0 && (quota30_1D === null || quota30_1D <= 0.00001)) ||
    (test1Req.requiredQuota60 > 0 && (quota60_1D === null || quota60_1D <= 0.00001)) ||
    (test1Req.requiredAccompanyHours > 0 && (accompany_1D === null || accompany_1D < test1Req.requiredAccompanyHours));
console.log(`60分钟 0 < 需求 ${formatQuotaNeed(test1Req.requiredQuota60)} => 异常: ${isAnomalous_1D} ✓`);
assert.strictEqual(isAnomalous_1D, true, "60分钟剩余为 0 时应判定为异常");

console.log("\n场景 D2：邸睿本周需 3 节 60分钟课，剩余 2（非 0，不应异常）");
const test1D2Entries = [
    { student: "邸睿", course: "阅读", durationMinutes: 60 },
    { student: "邸睿", course: "阅读", durationMinutes: 60 },
    { student: "邸睿", course: "阅读", durationMinutes: 60 }
];
const test1D2Needs = collectQuotaNeeds(test1D2Entries);
const test1D2Req = test1D2Needs.get("邸睿");
const apiResponse_1D2 = { quota30: "0", quota60: "2", quotaAccompany: "1.0" };
const quota30_1D2 = toQuotaNumber(apiResponse_1D2.quota30);
const quota60_1D2 = toQuotaNumber(apiResponse_1D2.quota60);
const accompany_1D2 = toQuotaNumber(apiResponse_1D2.quotaAccompany);
const isAnomalous_1D2 = 
    (test1D2Req.requiredQuota30 > 0 && (quota30_1D2 === null || quota30_1D2 <= 0.00001)) ||
    (test1D2Req.requiredQuota60 > 0 && (quota60_1D2 === null || quota60_1D2 <= 0.00001)) ||
    (test1D2Req.requiredAccompanyHours > 0 && (accompany_1D2 === null || accompany_1D2 < test1D2Req.requiredAccompanyHours));
console.log(`60分钟剩余 2，需求 ${formatQuotaNeed(test1D2Req.requiredQuota60)} => 异常: ${isAnomalous_1D2}`);
assert.strictEqual(isAnomalous_1D2, false, "60分钟剩余只要不是 0，就不应判定为异常");

console.log("\n========== 测试 1E: 异常文案不重复追加当前剩余 ==========");
const buildQuotaAnomalyDetailLineCode = extractBlock(scheduleSource, "function buildQuotaAnomalyDetailLine");
const buildQuotaAnomalyDetailLine = new Function(
    `${buildQuotaAnomalyDetailLineCode}\nreturn buildQuotaAnomalyDetailLine;`
)();

console.log("\n========== 测试 1D3: 剩余值展示格式 ==========");
assert.strictEqual(formatQuotaDisplay("0.0"), "0", "整数型剩余值不应保留 .0");
assert.strictEqual(formatQuotaDisplay("2.0"), "2", "整数型剩余值显示应去掉 .0");
assert.strictEqual(formatQuotaDisplay("0.5"), "0.5", "浮点型剩余值应保留有效小数");
assert.strictEqual(formatQuotaDisplay("-"), "-", "非数字占位值应保持原样");
assert(
    scheduleSource.includes("剩余${formatQuotaDisplay(item?.quota30)}")
    && scheduleSource.includes("剩余${formatQuotaDisplay(item?.quota60)}")
    && scheduleSource.includes("剩余${formatQuotaDisplay(item?.quotaAccompany)}"),
    "异常文案中的剩余值应使用统一格式化，整数去掉 .0，浮点保留有效小数"
);

const anomalyLine = buildQuotaAnomalyDetailLine({
    queryName: "俞新硕",
    displayNames: ["硕硕"],
    quota30: "8",
    quota60: "4",
    quotaAccompany: "0.0",
    zeroFields: ["quotaAccompany"],
    issueText: "陪练服务时长不足（剩余0.0，需求1小时）"
});

assert(!anomalyLine.includes('请帮忙为硕硕（系统名：俞新硕）充值'), '异常文案主语不应再使用昵称 + 系统名的重复写法');
assert(anomalyLine.includes('请帮忙为俞新硕充值：陪练服务时长不足（剩余0.0，需求1小时）'), '异常文案应优先使用系统名作为充值对象');
assert(!anomalyLine.includes('当前"陪练服务时长剩余"为0.0'), '异常文案不应重复追加陪练服务时长当前剩余值');
assert(!anomalyLine.includes('当前"30分钟剩余"为 8'), '异常文案不应展示未异常的 30 分钟剩余值');
assert(!anomalyLine.includes('"60分钟剩余"为 4'), '异常文案不应展示未异常的 60 分钟剩余值');

console.log("\n========== 测试 1F: 异常列表状态栏提供单行复制 ==========");
class FakeElement {
    constructor(tagName) {
        this.tagName = String(tagName || "").toUpperCase();
        this.children = [];
        this.className = "";
        this._textContent = "";
        this._innerHTML = "";
        this.listeners = {};
    }

    appendChild(child) {
        this.children.push(child);
        return child;
    }

    addEventListener(eventName, handler) {
        if (!this.listeners[eventName]) {
            this.listeners[eventName] = [];
        }
        this.listeners[eventName].push(handler);
    }

    set textContent(value) {
        this._textContent = String(value ?? "");
    }

    get textContent() {
        return this._textContent;
    }

    set innerHTML(value) {
        this._innerHTML = String(value ?? "");
    }

    get innerHTML() {
        return this._innerHTML;
    }
}

function findFirstElement(root, predicate) {
    if (!root) return null;
    if (predicate(root)) return root;
    for (const child of root.children || []) {
        const matched = findFirstElement(child, predicate);
        if (matched) return matched;
    }
    return null;
}

const buildQuotaResultTableCode = extractBlock(scheduleSource, "function buildQuotaResultTable");
const quotaCopyCalls = [];
const buildQuotaResultTable = new Function(
    "document",
    "buildQuotaAnomalyDetailLine",
    "copyToClipboard",
    "window",
    `${buildQuotaResultTableCode}\nreturn buildQuotaResultTable;`
)(
    {
        createElement(tagName) {
            return new FakeElement(tagName);
        }
    },
    buildQuotaAnomalyDetailLine,
    async (text) => {
        quotaCopyCalls.push(text);
        return true;
    },
    {
        showToast() {},
        showCopiedContentToast() {}
    }
);

const quotaResultTable = buildQuotaResultTable([
    {
        displayName: "硕硕",
        queryName: "俞新硕",
        displayNames: ["硕硕"],
        quota30: "8",
        quota60: "4",
        quotaAccompany: "0.0",
        zeroFields: ["quotaAccompany"],
        statusType: "warn",
        statusText: "异常：陪练服务时长不足（剩余0.0，需求1小时）",
        issueText: "陪练服务时长不足（剩余0.0，需求1小时）"
    },
    {
        displayName: "张舒睿",
        queryName: "张舒睿",
        quota30: "6",
        quota60: "1",
        quotaAccompany: "1.0",
        zeroFields: [],
        statusType: "ok",
        statusText: "正常",
        issueText: "",
        displayNames: ["张舒睿"]
    }
]);

const copyButton = findFirstElement(quotaResultTable, (node) => node.tagName === "BUTTON" && node.textContent === "复制");
assert(copyButton, "异常行状态栏应提供单独复制按钮");
assert.strictEqual(quotaCopyCalls.length, 0, "未点击复制按钮前不应触发复制");
assert(copyButton.listeners.click?.length, "复制按钮应绑定点击事件");
Promise.resolve(copyButton.listeners.click[0]())
    .then(() => {
        assert.deepStrictEqual(quotaCopyCalls, [anomalyLine], "点击异常行复制按钮时应只复制该行充值文案");

        const normalRowCopyButton = findFirstElement(
            quotaResultTable.children[1],
            (node) => node.tagName === "BUTTON" && node.textContent === "复制"
        );
        assert.strictEqual(normalRowCopyButton, null, "正常学生行不应出现异常充值复制按钮");

        console.log("\n========== 测试 1G: 查看课时数不应被首页排课失败 toast 覆盖 ==========");
        assert(
            scheduleSource.includes("await refreshBoardScheduleMatches({ suppressErrorToast: true });"),
            "查看课时数按钮触发的首页排课状态刷新应静默错误 toast，避免覆盖课时检查结果提示"
        );
        assert(
            scheduleSource.includes("if (!options?.suppressErrorToast) {")
            && scheduleSource.includes("window.showToast?.(\"首页排课查询失败，状态标记将显示未获取\", 4200);"),
            "首页排课查询失败 toast 应支持按调用场景静默"
        );

        // ============ 测试 2: legacy 学生不参与课时余额检查 ============
        console.log("\n========== 测试 2: legacy 学生不参与课时余额检查 ==========");
        const test2Entries = [
            { student: "陈怡睿", course: "单词", durationMinutes: 30 }
        ];
        const test2Needs = collectQuotaNeeds(test2Entries);
        assert.strictEqual(test2Needs.has("陈怡睿"), false, "legacy 学生陈怡睿不应进入课时余额检查");

        // ============ 测试 3: legacy 60分钟学生不参与课时余额检查 ============
        console.log("\n========== 测试 3: legacy 60分钟学生不参与课时余额检查 ==========");
        const test3Entries = [
            { student: "季筱雯", course: "单词", durationMinutes: 60 }
        ];
        const test3Needs = collectQuotaNeeds(test3Entries);
        assert.strictEqual(test3Needs.has("季筱雯"), false, "legacy 学生季筱雯不应进入课时余额检查");

        console.log("\n========== 所有测试完成 ==========\n");
    })
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
