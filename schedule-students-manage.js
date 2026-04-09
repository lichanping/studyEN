const SCHEDULE_CONFIG_URL = "./schedule.html";
const SCHEDULE_CONFIG_OVERRIDE_KEY = "schedule-config-override-v1";
const CUSTOM_STUDENTS_STORAGE_KEY = "custom-students-v1";
const WEEK_DAYS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

const keywordInput = document.getElementById("keywordInput");
const metaText = document.getElementById("metaText");
const studentSummary = document.getElementById("studentSummary");
const entriesTableBody = document.getElementById("entriesTableBody");

const entryForm = document.getElementById("entryForm");
const entryIdInput = document.getElementById("entryId");
const formTitle = document.getElementById("formTitle");
const studentInput = document.getElementById("studentInput");
const courseSelect = document.getElementById("courseSelect");
const durationSelect = document.getElementById("durationSelect");
const periodSelect = document.getElementById("periodSelect");
const timeInput = document.getElementById("timeInput");

let entriesState = [];
let baseEntriesCount = 0;

function generateId() {
    return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

function buildCompositeKey(entryLike) {
    return [
        entryLike.student,
        entryLike.course,
        entryLike.durationMinutes,
        entryLike.period || "",
        entryLike.time || "",
        (entryLike.days || []).join("|")
    ].join("__");
}

function getCheckedDays() {
    return Array.from(document.querySelectorAll(".dayCheck:checked")).map((checkbox) => checkbox.value);
}

function setCheckedDays(days) {
    const daySet = new Set(Array.isArray(days) ? days : []);
    document.querySelectorAll(".dayCheck").forEach((checkbox) => {
        checkbox.checked = daySet.has(checkbox.value);
    });
}

function normalizeEntry(entry) {
    const days = Array.isArray(entry.days)
        ? entry.days.filter((day) => WEEK_DAYS.includes(day))
        : [];
    const normalized = {
        id: String(entry.id || generateId()),
        student: String(entry.student || "").trim(),
        course: String(entry.course || "单词").trim() || "单词",
        durationMinutes: Number(entry.durationMinutes) === 30 ? 30 : 60,
        days,
        period: String(entry.period || "晚上").trim() || "晚上",
        time: String(entry.time || "").trim(),
        _legacyKey: String(entry._legacyKey || "")
    };

    if (!normalized._legacyKey) {
        normalized._legacyKey = buildCompositeKey(normalized);
    }
    return normalized;
}

function loadOverrideConfig() {
    try {
        const raw = localStorage.getItem(SCHEDULE_CONFIG_OVERRIDE_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        if (parsed && Array.isArray(parsed.entries)) {
            return parsed;
        }
    } catch (error) {
        console.warn("读取本地排课覆盖失败:", error);
    }
    return null;
}

async function loadBaseConfig() {
    const response = await fetch(SCHEDULE_CONFIG_URL, { cache: "no-store" });
    if (!response.ok) {
        throw new Error("加载 schedule.html 失败: " + response.status);
    }
    const htmlText = await response.text();
    const doc = new DOMParser().parseFromString(htmlText, "text/html");
    const configText = doc.getElementById("schedule-config")?.textContent || "";
    const config = configText ? JSON.parse(configText) : {};
    return Array.isArray(config.entries) ? config.entries : [];
}

function saveOverride(entries) {
    localStorage.setItem(SCHEDULE_CONFIG_OVERRIDE_KEY, JSON.stringify({ entries }));
}

function loadCustomStudents() {
    try {
        const raw = localStorage.getItem(CUSTOM_STUDENTS_STORAGE_KEY);
        const arr = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr) ? arr : [];
    } catch (_) {
        return [];
    }
}

function ensureStudentRetained(name) {
    const trimmed = String(name || "").trim();
    if (!trimmed) return;
    const list = loadCustomStudents().filter((item) => String(item || "").trim() !== trimmed);
    // 新增/编辑过的学生置顶，便于体验课页优先选择
    list.unshift(trimmed);
    localStorage.setItem(CUSTOM_STUDENTS_STORAGE_KEY, JSON.stringify(list));
}

function clearForm() {
    entryIdInput.value = "";
    entryForm.reset();
    courseSelect.value = "单词";
    durationSelect.value = "30";
    periodSelect.value = "晚上";
    setCheckedDays([]);
    formTitle.textContent = "新增排课条目";
}

function stripForStorage(entry) {
    const normalized = normalizeEntry(entry);
    return {
        id: normalized.id,
        student: normalized.student,
        course: normalized.course,
        durationMinutes: normalized.durationMinutes,
        days: normalized.days,
        period: normalized.period,
        time: normalized.time,
        _legacyKey: normalized._legacyKey
    };
}

function persistEntries() {
    const sanitized = entriesState.map(stripForStorage);
    saveOverride(sanitized);
}

function renderMeta() {
    const override = loadOverrideConfig();
    const uniqueStudents = new Set(entriesState.map((item) => item.student).filter(Boolean));
    metaText.textContent = `当前条目: ${entriesState.length}（基线条目: ${baseEntriesCount}）`;
    studentSummary.textContent = `当前学生数: ${uniqueStudents.size}，数据来源: ${override ? "本地覆盖" : "内置配置"}`;
}

function renderTable() {
    const keyword = keywordInput.value.trim();
    let list = entriesState;
    if (keyword) {
        list = list.filter((item) => item.student.includes(keyword));
    }

    if (!list.length) {
        entriesTableBody.innerHTML = "<tr><td colspan=\"6\">暂无条目</td></tr>";
        return;
    }

    entriesTableBody.innerHTML = list.map((item) => {
        const daysText = item.days.length ? item.days.join("、") : "未设置";
        const timeText = item.time ? `${item.period} ${item.time}` : item.period;
        return `<tr>
            <td>${item.student}</td>
            <td>${item.course}</td>
            <td>${item.durationMinutes}</td>
            <td>${daysText}</td>
            <td>${timeText}</td>
            <td>
                <button data-action="edit" data-id="${item.id}">编辑</button>
                <button data-action="delete" data-id="${item.id}">删条目</button>
                <button data-action="delete-student" data-name="${item.student}">删该生全部(保留学生名)</button>
            </td>
        </tr>`;
    }).join("");
}

function renderAll() {
    renderMeta();
    renderTable();
}

function fillForm(item) {
    entryIdInput.value = item.id;
    studentInput.value = item.student;
    courseSelect.value = item.course;
    durationSelect.value = String(item.durationMinutes);
    periodSelect.value = item.period;
    timeInput.value = item.time;
    setCheckedDays(item.days);
    formTitle.textContent = `编辑条目: ${item.student}`;
}

function handleTableAction(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const action = button.dataset.action;
    if (action === "edit") {
        const id = button.dataset.id;
        const target = entriesState.find((item) => item.id === id);
        if (!target) return;
        fillForm(target);
        return;
    }

    if (action === "delete") {
        const id = button.dataset.id;
        entriesState = entriesState.filter((item) => item.id !== id);
        persistEntries();
        if (entryIdInput.value === id) clearForm();
        renderAll();
        return;
    }

    if (action === "delete-student") {
        const name = button.dataset.name || "";
        if (!name) return;
        if (!window.confirm(`确认删除 ${name} 的全部排课条目？`)) return;
        entriesState = entriesState.filter((item) => item.student !== name);
        persistEntries();
        clearForm();
        renderAll();
    }
}

function handleSubmit(event) {
    event.preventDefault();

    const student = studentInput.value.trim();
    const days = getCheckedDays();
    if (!student) {
        alert("学生姓名不能为空");
        return;
    }
    if (!days.length) {
        alert("请至少选择一个星期");
        return;
    }

    const payload = normalizeEntry({
        id: entryIdInput.value || generateId(),
        student,
        course: courseSelect.value,
        durationMinutes: Number(durationSelect.value),
        days,
        period: periodSelect.value,
        time: timeInput.value.trim()
    });

    const idx = entriesState.findIndex((item) => item.id === payload.id);
    if (idx >= 0) {
        ensureStudentRetained(payload.student);
        payload._legacyKey = entriesState[idx]._legacyKey || payload._legacyKey;
        entriesState[idx] = payload;
    } else {
        ensureStudentRetained(payload.student);
        payload._legacyKey = "";
        // 新增条目放到最前，便于近期维护
        entriesState.unshift(payload);
    }

    persistEntries();
    clearForm();
    renderAll();
}

function exportOverride() {
    const override = loadOverrideConfig();
    if (!override) {
        alert("当前没有本地覆盖配置可导出");
        return;
    }
    const blob = new Blob([JSON.stringify(override, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `schedule-config-override-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
}

async function init() {
    try {
        const baseEntries = (await loadBaseConfig()).map(normalizeEntry);
        baseEntriesCount = baseEntries.length;
        const override = loadOverrideConfig();
        entriesState = (override?.entries || baseEntries).map(normalizeEntry);
        renderAll();
    } catch (error) {
        console.error(error);
        alert("加载排课配置失败，请检查 schedule.html 是否可访问");
    }
}

function bindNav() {
    document.getElementById("goSchedule").addEventListener("click", () => {
        window.location.href = "schedule.html";
    });
    document.getElementById("goFormal").addEventListener("click", () => {
        window.location.href = "index.html";
    });
    document.getElementById("goTrial").addEventListener("click", () => {
        window.location.href = "class-trial.html";
    });
    document.getElementById("goRead").addEventListener("click", () => {
        window.location.href = "class-read.html";
    });
}

function bindEvents() {
    keywordInput.addEventListener("input", renderTable);
    entryForm.addEventListener("submit", handleSubmit);
    entriesTableBody.addEventListener("click", handleTableAction);
    document.getElementById("clearFormButton").addEventListener("click", clearForm);
    document.getElementById("exportOverrideButton").addEventListener("click", exportOverride);
    document.getElementById("resetToBuiltinButton").addEventListener("click", async () => {
        if (!window.confirm("确认恢复内置配置？这会清除本地覆盖配置。")) return;
        localStorage.removeItem(SCHEDULE_CONFIG_OVERRIDE_KEY);
        clearForm();
        await init();
    });
}

bindNav();
bindEvents();
clearForm();
init();

