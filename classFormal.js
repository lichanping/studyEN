import {
    copyToClipboard,
    getRandomMotto,
    showAlert,
    getRandomFeedback,
    showLongText,
    countEnglishWords,
    storeClassStatistics,
    storeNewLearnedWords,
    loginApp,
    displayToast
} from './commonFunctions.js'

const setInitialDateTime = () => {
    const currentDate = new Date();
    currentDate.setHours(19, 40, 0, 0); // Set the time to 21:00 (9 PM)

    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0'); // Months are zero-based
    const day = String(currentDate.getDate()).padStart(2, '0');
    const hours = String(currentDate.getHours()).padStart(2, '0');
    const minutes = String(currentDate.getMinutes()).padStart(2, '0');

    const formattedCurrentDate = `${year}-${month}-${day}T${hours}:${minutes}`;
    document.getElementById("classDateTime").value = formattedCurrentDate;
    document.getElementById("reviewTime").value = formattedCurrentDate;
};

// Attach the function to the "load" event of the window
window.addEventListener("load", setInitialDateTime);
window.addEventListener('load', updateUserNameOptions);
window.addEventListener("load", updateLabel);
// Define user data
const teacherData = {
    "liTeacher": {
        users: {
            "陈怡睿": {
                schedule: "陈怡睿-每天半小时",
                course: "托福高频词汇",
                hours: [19, 30],
                courseWordCount: 3573,
                duration: 0.5
            },
            "徐智浩": {
                schedule: "徐智浩(每周五到周日)",
                course: "【推荐】2020版沪外教版必修三（单元顺序）",
                hours: [19, 30],
                courseWordCount: 92,
                duration: 1
            },
            "胡贝妮": {
                schedule: "胡贝妮 (七年级)",
                course: "【推荐】2024版沪教版英语单词课程",
                hours: [19, 45],
                courseWordCount: 327,
                duration: 1
            },
            "硕硕": {
                schedule: "周三、五半小时，周六1小时 硕硕(四年级)222",
                course: "牛津上海版小学英语单词课程",
                hours: [15, 0],
                courseWordCount: 92,
                duration: 0.5
            },
            "邸睿": {
                schedule: "周四一小时，周六周日上午半小时 邸睿(6年级)",
                course: "【推荐】沪教版单词课程",
                hours: [21, 0],
                courseWordCount: 92,
                duration: 1
            },
            "施博睿": {
                schedule: "施博睿-三年级小学男生，周末1小时的单词课",
                course: "人教版单词课程",
                hours: [13, 30],
                courseWordCount: 92,
                duration: 1
            }
        }
    },
    "shiTeacher": {
        users: {
            "aaa": {
                schedule: "每周周六下午3点+周日 10点 硕硕 (四年级)",
                course: "aaa-全册",
                hours: [15, 0],
                courseWordCount: 260
            },
            "bbb": {
                schedule: "每周 王泓俨 (高二)",
                course: "bbb-考纲",
                hours: [20, 50],
                courseWordCount: 4955
            },
            // Add other users for 施教练 here...
        }
    },
    // Add more teachers as needed
};

const SCHEDULE_CONFIG_URL = "./schedule.html";
const WEEK_DAYS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
const CANCELLATION_STORAGE_KEY = "schedule-cancellations-v1";
const LESSON_OVERRIDE_STORAGE_KEY = "schedule-lesson-overrides-v1";
let cachedScheduleEntries = null;

function getDateValueFromDateTime(dateTimeValue) {
    if (!dateTimeValue) return "";
    return String(dateTimeValue).split("T")[0] || "";
}

function getDayFromDateValue(dateValue) {
    if (!dateValue) return "";
    const date = new Date(dateValue + "T00:00:00");
    const day = date.getDay();
    return WEEK_DAYS[(day + 6) % 7];
}

function parseStorageObject(key) {
    try {
        const raw = localStorage.getItem(key);
        const parsed = raw ? JSON.parse(raw) : {};
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch (error) {
        console.warn("读取排课校验缓存失败:", key, error);
        return {};
    }
}

function getEntryId(entry) {
    if (entry.id) return String(entry.id);
    return [
        entry.student,
        entry.course,
        entry.durationMinutes,
        entry.period || "",
        entry.time || "",
        (entry.days || []).join("|")
    ].join("__");
}

function resolveEntryByOverride(entry, dateValue, lessonOverrideState) {
    const key = dateValue + "::" + getEntryId(entry);
    const override = lessonOverrideState[key] || {};
    const overrideCourse = String(override.course || "").trim();
    const overrideDuration = Number(override.durationMinutes);

    return {
        ...entry,
        course: overrideCourse || String(entry.course || "").trim(),
        durationMinutes: (overrideDuration === 30 || overrideDuration === 60)
            ? overrideDuration
            : (Number(entry.durationMinutes) || 60)
    };
}

function isCancelledEntry(entry, dateValue, cancellationState) {
    const key = dateValue + "::" + getEntryId(entry);
    return Boolean(cancellationState[key]);
}

function wasCancelledEntry(entry, dateValue, cancellationState) {
    const key = dateValue + "::" + getEntryId(entry);
    return Boolean(cancellationState[key]);
}

function toUniqueList(values) {
    return [...new Set(values.filter(Boolean))];
}

function formatEntrySummary(entry) {
    return `${entry.student} / ${entry.course || "课程"} / ${entry.durationMinutes || 60}分钟`;
}

function normalizeSubmittedCourseType(courseType) {
    if (courseType === "词汇课") return "单词";
    if (courseType === "阅读课") return "阅读";
    if (courseType === "体验课") return "体验";
    return String(courseType || "").trim();
}

async function loadScheduleEntries() {
    if (Array.isArray(cachedScheduleEntries)) return cachedScheduleEntries;

    const response = await fetch(SCHEDULE_CONFIG_URL, { cache: "no-store" });
    if (!response.ok) {
        throw new Error(`加载排课页面失败: ${response.status}`);
    }

    const htmlText = await response.text();
    const doc = new DOMParser().parseFromString(htmlText, "text/html");
    const configText = doc.getElementById("schedule-config")?.textContent || "";
    const config = configText ? JSON.parse(configText) : {};
    cachedScheduleEntries = Array.isArray(config.entries) ? config.entries : [];
    return cachedScheduleEntries;
}

async function validateBeforeClassFeedbackSubmit() {
    const classDateTime = document.getElementById("classDateTime").value;
    if (!classDateTime) return true;

    const userName = document.getElementById("userName").value;
    const submittedCourse = normalizeSubmittedCourseType("词汇课");
    const submittedDurationMinutes = Math.round(parseFloat(document.getElementById("classDuration").value || "0") * 60);
    const dateValue = getDateValueFromDateTime(classDateTime);
    const weekDay = getDayFromDateValue(dateValue);

    try {
        const allEntries = await loadScheduleEntries();
        const cancellationState = parseStorageObject(CANCELLATION_STORAGE_KEY);
        const lessonOverrideState = parseStorageObject(LESSON_OVERRIDE_STORAGE_KEY);

        const dayEntriesAll = allEntries
            .filter((entry) => Array.isArray(entry.days) && entry.days.includes(weekDay))
            .map((entry) => resolveEntryByOverride(entry, dateValue, lessonOverrideState));

        const studentEntriesAll = dayEntriesAll.filter((entry) => entry.student === userName);
        const courseEntriesAll = studentEntriesAll.filter((entry) => entry.course === submittedCourse);
        const matchedEntriesAll = courseEntriesAll.filter((entry) => Number(entry.durationMinutes) === submittedDurationMinutes);

        if (matchedEntriesAll.some(entry => wasCancelledEntry(entry, dateValue, cancellationState))) {
            const cancelledInfo = `当前提交的课程 (${userName} / ${submittedCourse} / ${submittedDurationMinutes}分钟) 在 ${dateValue} 已被标记为请假。`;
            const warningMessage = [
                `⚠️ 课程已标记请假`,
                cancelledInfo,
                "",
                "请假课程无需提交反馈。",
                "如果需要补交该日期的反馈，请先在排课日历中取消请假标记。",
                "",
                "点击【确定】返回。"
            ].join("\n");
            alert(warningMessage);
            return false;
        }

        const dayEntries = dayEntriesAll.filter((entry) => !isCancelledEntry(entry, dateValue, cancellationState));

        const studentEntries = dayEntries.filter((entry) => entry.student === userName);
        const courseEntries = studentEntries.filter((entry) => entry.course === submittedCourse);
        const matchedEntries = courseEntries.filter((entry) => Number(entry.durationMinutes) === submittedDurationMinutes);

        if (matchedEntries.length > 0) {
            return true;
        }

        const mismatchDetails = [];
        if (studentEntries.length === 0) {
            mismatchDetails.push(`- 学员不匹配：当天排课学员为 ${toUniqueList(dayEntries.map((entry) => entry.student)).join("、") || "无"}`);
        }
        if (studentEntries.length > 0 && courseEntries.length === 0) {
            mismatchDetails.push(`- 课程类型不匹配：${userName} 当天排课课程为 ${toUniqueList(studentEntries.map((entry) => entry.course)).join("、") || "无"}`);
        }
        if (courseEntries.length > 0 && matchedEntries.length === 0) {
            mismatchDetails.push(`- 时长不匹配：${userName} ${submittedCourse} 课排课时长为 ${toUniqueList(courseEntries.map((entry) => `${entry.durationMinutes}分钟`)).join("、") || "无"}`);
        }

        const selectedInfo = `当前提交: ${userName} / ${submittedCourse} / ${submittedDurationMinutes}分钟`;
        const scheduleInfo = dayEntries.length > 0
            ? dayEntries.map((entry) => formatEntrySummary(entry)).join("\n")
            : "当天无有效排课（可能已取消）";

        const warningMessage = [
            `⚠️ 排课校验发现差异（${dateValue} ${weekDay}）`,
            selectedInfo,
            "",
            "差异详情:",
            mismatchDetails.length ? mismatchDetails.join("\n") : "- 当前提交与排课未形成完整匹配",
            "",
            "当天排课明细:",
            scheduleInfo,
            "",
            "点击【确定】继续提交，点击【取消】返回修改。"
        ].join("\n");

        return window.confirm(warningMessage);
    } catch (error) {
        console.warn("课堂反馈前排课校验失败:", error);
        return window.confirm("⚠️ 未能完成排课校验（读取 schedule 配置失败）。\n点击【确定】继续提交，点击【取消】返回修改。");
    }
}


export function updateUserNameOptions() {
    const userNameSelect = document.getElementById("userName");
    const selectedTeacher = document.getElementById("teacherName").value;
    userNameSelect.innerHTML = "";
    const userNames = Object.keys(teacherData[selectedTeacher].users);

    userNames.forEach(userName => {
        const option = document.createElement("option");
        option.value = userName;
        option.textContent = userName;
        userNameSelect.appendChild(option);
    });
    // Update the label for the first user in the list (if any)
    if (userNames.length > 0) {
        document.getElementById("userName").value = userNames[0];
        updateLabel();  // Update the label with the first user's details
    } else {
        updateLabel();  // No users, just update labels
    }
}

export function updateLabel() {
    var userName = document.getElementById("userName").value;
    const teacherName = document.getElementById("teacherName").value;

    var labels = document.getElementsByClassName("scheduleLabel");
    var courseLabel = document.getElementById("courseLabel");
    var courseWordCountLabel = document.getElementById('courseWordCountLabel');

    const scheduleLabels = document.getElementsByClassName("scheduleLabels")[0];
    // Clear existing labels
    scheduleLabels.innerHTML = "";

    const userDataForSelectedUser = teacherData[teacherName].users[userName];
    const currentDate = new Date();

    if (userDataForSelectedUser) {
        const userInfo = userDataForSelectedUser;
        const label = document.createElement("label");
        label.textContent = userInfo.schedule;
        label.className = "scheduleLabel";
        label.style.color = "red";
        scheduleLabels.appendChild(label);
        scheduleLabels.appendChild(document.createElement("br"));
        courseLabel.textContent = userDataForSelectedUser.course;
        courseWordCountLabel.textContent = userDataForSelectedUser.courseWordCount;
        currentDate.setHours(...userDataForSelectedUser.hours, 0, 0);
        let duration = userInfo.duration.toString()
        const durationSelect = document.getElementById("classDuration");
        durationSelect.value = duration
    } else {
        courseLabel.textContent = '';
    }

    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0'); // Months are zero-based
    const day = String(currentDate.getDate()).padStart(2, '0');
    const hours = String(currentDate.getHours()).padStart(2, '0');
    const minutes = String(currentDate.getMinutes()).padStart(2, '0');

    const formattedCurrentDate = `${year}-${month}-${day}T${hours}:${minutes}`;
    document.getElementById("classDateTime").value = formattedCurrentDate;
    document.getElementById("reviewTime").value = formattedCurrentDate;

    // 获取 localStorage 中 ${userName}_末次复习 的值
    const lastReviewDate = localStorage.getItem(`${userName}_末次复习`);
    const reviewDateLabel = document.getElementById('reviewDateLabel');
    reviewDateLabel.style.color = '';
    reviewDateLabel.className = '';
    if (lastReviewDate) {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        const isExpired = new Date(lastReviewDate) <= tomorrow;
        reviewDateLabel.textContent = `末次复习: ${lastReviewDate}`;
        reviewDateLabel.style.color = isExpired ? 'red' : 'green';
    } else {
        reviewDateLabel.textContent = '';
    }
    showTodayReviewDates(userName)
    // 获取 localStorage 中 ${userName}_总课时的值，放入id="totalHours"的标签中，支持 float
    let totalHours = localStorage.getItem(`${userName}_总课时`) || '0';
    totalHours = parseFloat(totalHours).toFixed(1);
    let totalHoursLabel = document.getElementById('totalHours');
    totalHoursLabel.value = totalHours;
}

function showTodayReviewDates(userName) {
    try {
        const statsKey = `${userName}_classStatistics`;
        const classStats = JSON.parse(localStorage.getItem(statsKey)) || {};

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const reviewOffsets = [1, 2, 3, 5, 7, 9, 12, 14, 17, 21];
        const matchedStudyDates = [];

        Object.keys(classStats).forEach(dateStr => {
            const studyDate = new Date(dateStr);
            studyDate.setHours(0, 0, 0, 0);

            reviewOffsets.forEach(offset => {
                const reviewDate = new Date(studyDate);
                reviewDate.setDate(reviewDate.getDate() + offset);

                if (reviewDate.getTime() === today.getTime()) {
                    matchedStudyDates.push(studyDate);
                }
            });
        });

        // Sort the matched dates ascending (first month, then day)
        matchedStudyDates.sort((a, b) => a - b);

        // Format for display: "4-5", "4-12" etc.
        const formattedDates = matchedStudyDates.map(date => `${date.getMonth() + 1}-${date.getDate()}`);

        const labelElement = document.getElementById('todayReviewDates');
        labelElement.style.color = '';
        labelElement.className = '';
        if (labelElement) {
            if (formattedDates.length > 0) {
                labelElement.textContent = `需复习的训练日期：${formattedDates.join('，')}`;
                labelElement.style.color = 'green';
            } else {
                labelElement.textContent = '今天没有需要复习的训练内容。';
                labelElement.style.color = 'red';
            }
        }
    } catch (error) {
        console.error('生成今天复习训练日期列表出错:', error);
    }
}

// JavaScript code for the button click functions
export function handleScheduleNotificationClick() {
    const userName = document.getElementById("userName").value;
    const course = document.getElementById('courseLabel').textContent;

    // Get the date and time from the input field
    const classDateTime = document.getElementById("classDateTime").value;
    const formattedDateTime = formatDateTimeWeekly(classDateTime);
    const thisDateTime = formatDateTime(classDateTime);

    // Compare classDateTime with current time
    const classTime = new Date(classDateTime);
    const currentTime = new Date();
    const timeDifference = Math.floor((classTime - currentTime) / 1000 / 60); // Difference in minutes, rounded down
    let notificationMessage;
    if (timeDifference > 0 && timeDifference <= 30) {
        // Calculate the countdown time
        notificationMessage = `【${thisDateTime}】<br><br>⏳我们的在线课程还有【${timeDifference}】分钟开始了，请做好准备，及时进入会议室哦`;
    } else {
        notificationMessage =
            `【${thisDateTime}】
亲爱的 ✨ ${userName} 用户您好！
🔤 课程名称：《单词记忆训练课》
🔔 重要提醒：
如需取消或调整上课时间，请至少提前4小时告知学员服务中心负责人，否则系统将无法更改，仍会消耗课时。
🗣️ 上课小贴士：
请准时进入会议室，准备好摄像头和一杯水🍵，呵护嗓子。
💬 请您看到消息后回复确认👌。

📞 #腾讯会议：762-3777-6304`;
    }
    copyToClipboard(notificationMessage);
    showLongText(`${notificationMessage}`);
}

export function handleStopNotificationClick() {
    const userName = document.getElementById("userName").value;
    const notificationMessage =
        `感谢${userName}妈妈一直以来的支持与配合，也感谢${userName}的积极投入与努力。
在这段共同学习与成长的旅程中，你们的理解与宽容让每一步都充满力量。
很荣幸能陪伴${userName}一同进步，愿你在未来的道路上，继续绽放光芒，收获无尽的美好与成功，一路繁花相送，前景无限光明。`;

    copyToClipboard(notificationMessage);
    showLongText(notificationMessage);
}

export function handleLateMeetingReminderClick() {
    const userName = document.getElementById("userName").value;
    // Create the reminder message
    const reminderMessage = `我们的在线课程已经开始了，请 ✨  ${userName} 同学抓紧时间及时进入会议室，并且务必确保摄像头📷 📷 开启。感谢您的配合！🔥`
    copyToClipboard(reminderMessage);
    showLongText(`${reminderMessage}`);
}


export async function handleClassFeedbackClick() {
    const canSubmit = await validateBeforeClassFeedbackSubmit();
    if (!canSubmit) {
        return;
    }

    // 获取课程信息
    const course = document.getElementById('courseLabel').textContent;
    const courseWordCountLabel = document.getElementById('courseWordCountLabel').textContent;

    // 获取用户输入数据
    const userName = document.getElementById("userName").value;
    const newLearnedWordsText = document.getElementById('newLearnedWords').value.trim();
    const newWordCountFromText = countEnglishWords(newLearnedWordsText);
    const newWordInput = document.getElementById("newWord");
    const newWordInputText = newWordInput.value.replace(/\s/g, ''); // 移除所有空格
    let newWord = newWordInputText ? newWordInputText.split('+').reduce((sum, num) => {
        const parsedNum = parseInt(num, 10);
        return sum + (isNaN(parsedNum) ? 0 : parsedNum);
    }, 0) : 0;

    if (newWordCountFromText !== newWord) {
        const confirmReplace = confirm(`新学单词实际数量为 ${newWordCountFromText}，与手动输入的 ${newWord} 不同。是否要自动替换？`);
        if (confirmReplace) {
            newWordInput.value = newWordCountFromText;
            newWord = newWordCountFromText; // 重新赋值给 newWord 变量
        }
    }

    const reviewWordInputText = document.getElementById("reviewWord").value.replace(/\s/g, ''); // 移除所有空格
    const reviewWordCount = reviewWordInputText ? reviewWordInputText.split('+').reduce((sum, num) => {
        const parsedNum = parseInt(num, 10);
        return sum + (isNaN(parsedNum) ? 0 : parsedNum);
    }, 0) : 0;
    const reviewforgetWord = document.getElementById("reviewforgetWord").value;
    const reviewCorrectRate = ((reviewWordCount - reviewforgetWord) / reviewWordCount * 100).toFixed(0);
    const forgetWord = parseInt(document.getElementById("forgetWord").value) || 0;
    const correctRate = ((newWord - forgetWord) / newWord * 100).toFixed(0);

    const learnedWord = parseInt(document.getElementById("learnedWord").value.trim()) || 0;
    const inputText = document.getElementById('preTestWord').value.replace(/\s/g, ''); // 移除所有空格
    let preTestWord = inputText ? inputText.split('+').reduce((sum, num) => {
        const parsedNum = parseInt(num, 10);
        return sum + (isNaN(parsedNum) ? 0 : parsedNum);
    }, 0) : 0;

    // 生成反馈报告
    let feedbackMessage = `【${userName}今日学习反馈】<br><br>`;

    // Initialize the index counter
    let index = 1;

    // Only include review word feedback if reviewWordCount is more than 0
    if (reviewWordCount > 0) {
        feedbackMessage += `${index++}.九宫格复习${reviewWordCount}词，遗忘${reviewforgetWord}词，正确率${reviewCorrectRate}%；<br><br>`;
    }

    // Always include the pre-test and new word feedback
    feedbackMessage += `${index++}.`
    if (preTestWord > newWord) {
        feedbackMessage += `学前检测${preTestWord}词，`
    }
    feedbackMessage += `新学${newWord}词，遗忘${forgetWord}词，正确率${correctRate}%<br><br>`;

    // Include learned word and remaining words feedback only if learnedWord > 0
    if (learnedWord > 0) {
        let remaining = courseWordCountLabel - learnedWord;
        feedbackMessage += `${index++}.今天学习的是《${course}》，共${courseWordCountLabel}词，已学习${learnedWord}词，剩余${remaining}词未推送完九宫格。<br><br>`;
    }

    // Include the motivational message
    feedbackMessage += `${index++}.🎉陪伴 ${userName} 学习非常开心~ ${userName} ${getRandomFeedback()} 认真且努力的${userName}一定能抵达梦想的彼岸。🚀🚀🚀<br><br>`;

    // Always include the reminder for the 21-day review
    feedbackMessage += `${index++}.严格按照 21 天抗遗忘复习表来复习哟!<br><br><br><br>`;

    // Always include the motto
    feedbackMessage += `💟今日寄语💟<br><br>${getRandomMotto()}`;

    // 获取课程日期
    const classDateTime = document.getElementById("classDateTime").value;
    if (classDateTime) {
        const classDate = new Date(classDateTime).toISOString().split('T')[0];
        const classDuration = parseFloat(document.getElementById("classDuration").value);
        storeClassStatistics(userName, classDate, newWord, reviewWordCount, classDuration, "词汇课");

        // ✅ 存储 newLearnedWords 到 IndexedDB
        storeNewLearnedWords(userName, newLearnedWordsText);

        // 计算第21天的复习日期
        const reviewDate = new Date(classDateTime);
        reviewDate.setDate(reviewDate.getDate() + 21);
        // 将复习日期格式化为 YYYY-MM-DD 格式
        const formattedReviewDate = reviewDate.toISOString().split('T')[0];
        // 获取 localStorage 中现有的末次复习日期
        const existingReviewDate = localStorage.getItem(`${userName}_末次复习`);

        // 仅当 formattedReviewDate 大于现有日期时，才更新 localStorage
        if (!existingReviewDate || formattedReviewDate > existingReviewDate) {
            localStorage.setItem(`${userName}_末次复习`, formattedReviewDate);
        }
        // 显示复习日期
        document.getElementById('reviewDateLabel').textContent = `末次复习: ${localStorage.getItem(`${userName}_末次复习`)}`;
    } else {
        alert("请选择有效的课程日期。");
        return;
    }

    // 复制到剪贴板并弹窗显示
    copyToClipboard(feedbackMessage);
    // 课堂反馈使用10秒显示时间
    showLongTextWithDuration(feedbackMessage, 10000);
}

// 自定义显示时长的弹窗函数
function showLongTextWithDuration(longText, duration) {
    const textElement = document.createElement('div');
    textElement.innerHTML = longText;
    textElement.classList.add('long-text');
    document.body.appendChild(textElement);
    setTimeout(() => {
        textElement.style.opacity = '0';
        setTimeout(() => {
            textElement.remove();
        }, 300);
    }, duration);
}

const DB_NAME = 'FeedbackDB';
const DB_VERSION = 2
const STORE_NAME_FORGET = 'feedbackData';
const STORE_NAME_LEARNED = 'newLearnedWords';

async function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            if (!db.objectStoreNames.contains(STORE_NAME_LEARNED)) {
                db.createObjectStore(STORE_NAME_LEARNED, {keyPath: 'userName'});
            }

            if (!db.objectStoreNames.contains(STORE_NAME_FORGET)) {
                db.createObjectStore(STORE_NAME_FORGET, {keyPath: 'userName'});
            }
        };

        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

export async function generateReport() {
    const userName = document.getElementById("userName").value;
    const teacherNameElement = document.getElementById("teacherName");
    const coachName = teacherNameElement.options[teacherNameElement.selectedIndex].text;

    // 合并包含所选userName的数据
    let allClassStats = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.includes(userName)) {
            const storedValue = localStorage.getItem(key);
            if (storedValue) {
                try {
                    const stats = JSON.parse(storedValue);
                    Object.assign(allClassStats, stats);
                } catch (error) {
                    console.error(`解析 ${key} 时出错:`, error);
                }
            }
        }
    }

    if (Object.keys(allClassStats).length === 0) {
        alert("没有找到数据可供下载！");
        return;
    }

    const dayRangeInput = document.getElementById("daysRangeInput");
    const dayRange = parseInt(dayRangeInput.value) || 7;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date();
    startDate.setDate(today.getDate() - dayRange);
    startDate.setHours(0, 0, 0, 0);

    let validEntries = 0;
    let sortedEntries = [];
    let totalNewWords = 0;
    let totalReviewWords = 0;
    let totalUsedHours = 0; // 新增：统计已用课时


    Object.entries(allClassStats).forEach(([key, stats]) => {
        const isVocabClass = !key.includes('_') || (stats.type === "词汇课" || stats.type === "阅读完型语法课");
        if (!isVocabClass) return;

        const date = stats.date || key;
        const recordDate = new Date(date);
        recordDate.setHours(0, 0, 0, 0);

        if (recordDate > startDate && recordDate <= today) {
            // 累加已用课时（处理可能的未定义情况）
            totalUsedHours += parseFloat(stats.duration) || 0;

            const weekDay = recordDate.toLocaleString('zh-CN', {weekday: 'short'});
            const formattedDate = `${String(recordDate.getMonth() + 1).padStart(2, '0')}-${String(recordDate.getDate()).padStart(2, '0')}`;

            let courseType = stats.type || "词汇课";
            if (courseType === "词汇课") {
                let duration = stats.duration;
                if (typeof duration === 'undefined') {
                    duration = (stats.newWord < 20) ? 0.5 : 1;
                }
                courseType = duration === 0.5 ? "半词课" : "词汇课";
            } else if (courseType === "阅读完型语法课") {
                courseType = "阅语课";
            }

            sortedEntries.push({
                date: recordDate,
                formatted: `${formattedDate} (${weekDay}) | ${courseType} | ${stats.newWord} | ${stats.reviewWordCount}`,
                year: recordDate.getFullYear(),
                newWord: stats.newWord,
                reviewWordCount: parseInt(stats.reviewWordCount),
                courseType
            });


            totalNewWords += stats.newWord;
            totalReviewWords += parseInt(stats.reviewWordCount);
            validEntries++;
        }
    });

    if (validEntries === 0) {
        alert("没有找到数据可供下载！");
        return;
    }

    sortedEntries.sort((a, b) => a.date - b.date);

    // 获取总课时（从input获取）
    const totalHoursInput = localStorage.getItem(`${userName}_总课时`) || '0';
    const totalHours = parseFloat(totalHoursInput) || 0;
    // 计算剩余课时
    const remainingHours = (totalHours - totalUsedHours).toFixed(1);

    // 构建报告文本内容
    let reportContent = `【正课学习数据统计】\n`;
    reportContent += `学员: ${userName}\n`;
    reportContent += `教练: ${coachName}\n\n`;

    reportContent += `📌 本期学习总览\n`;
    reportContent += `新学单词：${totalNewWords} 词\n`;
    reportContent += `九宫格复习：${totalReviewWords} 词\n\n`;

    reportContent += `📅 正课学习详情\n`;
    reportContent += `日期     | 课程类型 | 新词  | 九宫格\n`;
    reportContent += `--------------------------------\n`;

    let currentYear = null;
    sortedEntries.forEach(entry => {
        if (entry.year !== currentYear) {
            currentYear = entry.year;
            reportContent += `**${currentYear}年**\n`;
        }
        reportContent += `${entry.formatted}\n`;
    });

    // 结尾说明
    reportContent += `\n📢 以上数据仅统计${userName}在正课中的学习情况，不包含课后的抗遗忘复习。\n`;
    reportContent += `💪 ${userName}，继续稳步积累，保持进步！\n\n`;

    // 新增：课时统计部分
    reportContent += `⏰ 课时统计\n`;
    reportContent += `已用课时：${totalUsedHours.toFixed(1)} 小时\n`;
    const includeHoursInfo = document.getElementById("includeHoursInfo")?.checked;
    if (includeHoursInfo) {
        reportContent += `总课时：${totalHours.toFixed(1)} 小时\n`;
        reportContent += `剩余课时：${remainingHours} 小时`;
    }

    // 复制到剪贴板
    copyToClipboard(reportContent);

    // 下载报告
    const blob = new Blob([reportContent], {type: 'text/plain'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${userName}_学习报告.txt`;
    link.click();
}

function formatDateTime(dateTimeString) {
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: false
    };
    const formattedDateTime = new Date(dateTimeString).toLocaleString('zh-CN', options);
    return formattedDateTime;
}

function formatDateTimeWeekly(dateTimeString) {
    const options = {
        weekday: 'long',
        hour: 'numeric',
        minute: 'numeric',
        hour12: false
    };
    const formattedDateTime = new Date(dateTimeString).toLocaleString('zh-CN', options);
    return `${formattedDateTime}`;
}

function escapeCsvCell(value) {
    const text = String(value ?? "");
    if (/[",\n]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
}

export function generateSalaryReport() {
    const teacherName = document.getElementById("teacherName").value;
    const teacherDisplayName = document.getElementById("teacherName").options[document.getElementById("teacherName").selectedIndex].text;
    // 获取当前日期
    const currentDate = new Date();
    // 获取当前年份
    const year = currentDate.getFullYear();
    // 获取当前月份，注意 getMonth() 返回值是 0 - 11，所以要加 1
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    // 组合成 YYYY-MM 格式的日期
    const defaultMonth = `${year}-${month}`;

    const monthToQuery = prompt("请输入要统计的月份（格式：YYYY-MM，例如2025-02）:", defaultMonth);
    console.log(monthToQuery);
    if (!monthToQuery) return;

    const currentTeacher = teacherData[teacherName];
    const allStudents = Object.keys(currentTeacher.users);

    let totalHoursVocab = 0;     // 词汇课总课时
    let totalHoursReading = 0;   // 阅读课总课时
    let totalHoursTrial = 0;     // 体验课总课时
    let totalSalaryAll = 0;
    let reportContent = `【${teacherDisplayName} 综合课工资明细】\n`;
    reportContent += `统计月份: ${monthToQuery}\n\n`;

    let allRecords = [];  // 用于存储所有记录
    let studentStats = {};  // 用于存储每个学生的统计数据

    allStudents.forEach(userName => {
        // 初始化每个学生的总工资
        studentStats[userName] = { hours: 0, fee: 0 };

        const statsKey = `${userName}_classStatistics`;
        const classStats = JSON.parse(localStorage.getItem(statsKey)) || {};

        Object.entries(classStats).forEach(([key, stats]) => {
            // 获取日期
            let date = key;
            if (key.includes('_')) {
                date = stats.date;
            }

            const recordDate = new Date(date);
            const recordYear = recordDate.getFullYear();
            const recordMonth = recordDate.getMonth() + 1;

            const [inputYear, inputMonth] = monthToQuery.split('-').map(Number);

            if (recordYear === inputYear && recordMonth === inputMonth) {
                let duration = stats.duration;
                if (typeof duration === 'undefined') {
                    duration = (stats.newWord < 20) ? 0.5 : 1;
                }

                const type = stats.type || "词汇课";

                // 将记录添加到数组中
                allRecords.push({
                    userName,
                    date,
                    type,
                    duration,
                    hourlyRate: type === "词汇课" ? 50 :
                        type === "阅读完型语法课" ? 55 : 40
                });
            }
        });
    });

    // 按日期排序所有记录
    allRecords.sort((a, b) => new Date(a.date) - new Date(b.date));

    // 生成报表内容
    reportContent += "学生姓名 | 日期       | 课程类型 | 课时 | 课时费\n";
    reportContent += "--------------------------------------------------------\n";

    // 输出排序后的记录并统计每个学生的数据
    allRecords.forEach(record => {
        const lessonFee = record.duration * record.hourlyRate;
        reportContent += `${record.userName.padEnd(6)} | ${record.date} | ${record.type.padEnd(12)} | ${record.duration.toString().padEnd(4)} | ${lessonFee}元\n`;

        // 累加总课时和学生工资
        switch (record.type) {
            case "词汇课":
                totalHoursVocab += record.duration;
                break;
            case "阅读完型语法课":
                totalHoursReading += record.duration;
                break;
            case "体验课":
                totalHoursTrial += record.duration;
                break;
        }
        studentStats[record.userName].hours += record.duration;
        studentStats[record.userName].fee += lessonFee;
    });

    // 添加学生总计
    reportContent += "\n学生总计:\n";

    // Sort studentStats by total fee in descending order
    const sortedStudentStats = Object.entries(studentStats).sort((a, b) => b[1].fee - a[1].fee);

    sortedStudentStats.forEach(([student, stat]) => {
        reportContent += `${student.padEnd(6)}: ${stat.hours.toFixed(2)}小时, ${stat.fee}元\n`;
    });

    // 添加总计数据
    reportContent += "\n========== 总计 ==========\n";

    // 计算各类课程工资
    const salaryVocab = totalHoursVocab * 50;    // 词汇课工资
    const salaryReading = totalHoursReading * 55; // 阅读课工资
    const salaryTrial = totalHoursTrial * 40;     // 体验课工资
    totalSalaryAll = salaryVocab + salaryReading + salaryTrial;  // 计算总工资

    if (totalHoursVocab > 0) {
        reportContent += `词汇课总课时: ${totalHoursVocab} 小时\n`;
        reportContent += `词汇课工资（50元/时）: ${salaryVocab} 元\n`;
    }
    if (totalHoursReading > 0) {
        reportContent += `阅读课总课时: ${totalHoursReading} 小时\n`;
        reportContent += `阅读课工资（55元/时）: ${salaryReading} 元\n`;
    }
    if (totalHoursTrial > 0) {
        reportContent += `体验课总课时: ${totalHoursTrial} 小时\n`;
        reportContent += `体验课工资（40元/时）: ${salaryTrial} 元\n`;
    }
    reportContent += `\n工资总计: ${totalSalaryAll} 元\n`;

    const csvRows = [];
    csvRows.push(["学生姓名", "日期", "课程类型", "课时", "单价", "课时费(元)"]);
    allRecords.forEach((record) => {
        const lessonFee = record.duration * record.hourlyRate;
        csvRows.push([record.userName, record.date, record.type, record.duration, record.hourlyRate, lessonFee]);
    });

    csvRows.push([]);
    csvRows.push(["学生总计", "总课时", "工资(元)"]);
    sortedStudentStats.forEach(([student, stat]) => {
        csvRows.push([student, Number(stat.hours.toFixed(2)), Number(stat.fee.toFixed(2))]);
    });

    csvRows.push([]);
    csvRows.push(["课程类型", "总课时", "时薪(元)", "工资(元)"]);
    if (totalHoursVocab > 0) csvRows.push(["词汇课", totalHoursVocab, 50, salaryVocab]);
    if (totalHoursReading > 0) csvRows.push(["阅读完型语法课", totalHoursReading, 55, salaryReading]);
    if (totalHoursTrial > 0) csvRows.push(["体验课", totalHoursTrial, 40, salaryTrial]);
    csvRows.push(["工资总计", "", "", Number(totalSalaryAll.toFixed(2))]);

    const csvContent = "\uFEFF" + csvRows.map((row) => row.map(escapeCsvCell).join(",")).join("\n");
    const blob = new Blob([csvContent], {type: 'text/csv;charset=utf-8'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${teacherDisplayName}_${monthToQuery}_课时工资.csv`;
    link.click();
}

// 定义 generateWordReport 函数
export async function generateWordReport() {
    try {
        // ===== 增强docx库加载逻辑（添加5秒超时）===== [2,3](@ref)
        if (!window.docx) {
            await new Promise((resolve, reject) => {
                const timeoutId = setTimeout(() =>
                    reject(new Error('docx库加载超时')), 5000
                );
                window.addEventListener('docxLoaded', () => {
                    clearTimeout(timeoutId);
                    resolve();
                });
            });
        }

        const {
            Document,
            Packer,
            Paragraph,
            TextRun,
            AlignmentType
        } = window.docx;

        // ===== 数据获取增强 ===== [6,8](@ref)
        const db = await initDB();
        const tx = db.transaction(STORE_NAME_LEARNED, 'readonly');
        const store = tx.objectStore(STORE_NAME_LEARNED);
        const userName = document.getElementById("userName")?.value || '未命名用户';
        const teacherSelect = document.getElementById("teacherName");
        const teacherName = teacherSelect?.options[teacherSelect.selectedIndex]?.text || '未指定教练';

        const indexDBData = await new Promise((resolve, reject) => {
            const request = store.get(userName);
            request.onsuccess = () => resolve(request.result || {});
            request.onerror = () => reject(request.error);
        });

        // ===== 关键空值保护 ===== [6,8](@ref)
        const learnedWordsMap = indexDBData?.newLearnedWords || {};
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const dayRangeInput = document.getElementById("daysRangeInput");
        const dayRange = parseInt(dayRangeInput?.value) || 7;
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - (dayRange - 1)); // 向前推 n-1 天
        startDate.setHours(0, 0, 0, 0);

        // ===== 数据过滤增强 ===== [6,8](@ref)
        const filteredNewWordsEntries = Object.entries(learnedWordsMap)
            .filter(([dateStr, words]) => {
                const date = new Date(dateStr);
                date.setHours(0, 0, 0, 0);
                return date >= startDate &&
                    date <= today &&
                    typeof words === 'string' &&
                    words.trim().length > 0; // 严格过滤空字符串
            })
            .sort(([a], [b]) => new Date(b) - new Date(a));

        if (filteredNewWordsEntries.length === 0) {
            alert(`在${dayRange}天内未找到学习记录`);
            return;
        }

        // ===== 文档生成空值保护 ===== [6](@ref)
        const combinedDoc = new Document({
            sections: [{
                children: [
                    // 学习资料部分
                    new Paragraph({
                        text: '正课资料（中英文）',
                        heading: 'Heading1',
                        alignment: AlignmentType.CENTER,
                    }),
                    new Paragraph({text: `用户：${userName}`, alignment: AlignmentType.LEFT}),
                    new Paragraph({text: `教练：${teacherName}`, alignment: AlignmentType.LEFT}),
                    new Paragraph({text: ''}),
                    ...generateTableSections(filteredNewWordsEntries, true, true),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: '请家长和学生需将文档打印出来，完成词义记忆和拼写练习，并对应中英文版进行批改。',
                                bold: true,
                                size: 28,
                                color: 'C47F3E',
                            })
                        ],
                        spacing: {before: 300},
                        alignment: AlignmentType.LEFT,
                    }),
                    // 英文默写部分前空白行（使用数组展开简化代码）
                    ...[...Array(4)].map(() => new Paragraph({text: ''})),

                    // 英文默写部分
                    new Paragraph({
                        text: '词义记忆（英文）',
                        heading: 'Heading1',
                        alignment: AlignmentType.CENTER,
                    }),
                    new Paragraph({text: `用户：${userName}`, alignment: AlignmentType.LEFT}),
                    new Paragraph({text: `教练：${teacherName}`, alignment: AlignmentType.LEFT}),
                    new Paragraph({text: ''}),
                    ...generateTableSections(filteredNewWordsEntries, true, false),

                    // 中文默写部分
                    new Paragraph({
                        text: '拼写练习（中文）',
                        heading: 'Heading1',
                        alignment: AlignmentType.CENTER,
                    }),
                    new Paragraph({text: `用户：${userName}`, alignment: AlignmentType.LEFT}),
                    new Paragraph({text: `教练：${teacherName}`, alignment: AlignmentType.LEFT}),
                    new Paragraph({text: ''}),
                    ...generateTableSections(filteredNewWordsEntries, false, true),
                    new Paragraph({text: ''}),
                    new Paragraph({text: ''}),
                    // 添加空值保护[6](@ref)
                    ...(filteredNewWordsEntries.length === 1 && createReviewScheduleTable(filteredNewWordsEntries[0][0], userName)
                        ? [createReviewScheduleTable(filteredNewWordsEntries[0][0], userName)]
                        : [])
                ]
            }]
        });

        // ===== 文件导出 =====
        const combinedBlob = await Packer.toBlob(combinedDoc);
        const combinedLink = document.createElement("a");
        combinedLink.href = URL.createObjectURL(combinedBlob);
        const formattedDate = new Date().toISOString().slice(0, 10);
        combinedLink.download = `学习资料_${userName}_${formattedDate}.docx`;
        combinedLink.click();

    } catch (error) {
        console.error('生成报告失败:', error);
        alert(`报告生成失败: ${error.message}`);
    }
}

// 工具函数：生成词汇表格段落
function generateTableSections(entries, showEnglish, showChinese) {
    const {
        Paragraph,
        Table,
        TableRow,
        TableCell,
        TextRun,
        WidthType,
        BorderStyle,
        AlignmentType
    } = window.docx;

    // 替代正则方式的更智能分词逻辑
    function parseWordPair(pair) {
        pair = pair.trim();
        const chineseCharIndex = pair.search(/[\u4e00-\u9fa5]/);
        if (chineseCharIndex === -1) {
            return [pair.trim(), '缺失中文'];
        }

        let leftPart = pair.slice(0, chineseCharIndex).trim();
        let rightPart = pair.slice(chineseCharIndex).trim();

        // 判断括号数量是否匹配
        const openParens = (leftPart.match(/\(/g) || []).length;
        const closeParens = (leftPart.match(/\)/g) || []).length;

        // 如果左括号多于右括号，把最后一个左括号移入 rightPart
        if (openParens > closeParens) {
            const lastOpenIndex = leftPart.lastIndexOf('(');
            if (lastOpenIndex !== -1) {
                // 拆出括号和剩余英文部分
                const removedParen = leftPart.slice(lastOpenIndex);
                leftPart = leftPart.slice(0, lastOpenIndex).trim();
                rightPart = removedParen + rightPart;
            }
        }

        return [leftPart.trim(), rightPart.trim()];
    }


    return entries.flatMap(([dateStr, words]) => {
        const wordPairs = words.trim().split('\n').map(pair => {
            const [english, chinese] = parseWordPair(pair);
            if (english && chinese) {
                return [english, chinese];
            }
            return []; // skip badly formatted lines
        });

        const tableRows = wordPairs.map((pair, index) => {
            if (pair.length >= 2) {
                return new TableRow({
                    children: [
                        new TableCell({
                            children: [new Paragraph(String(index + 1))]
                        }),
                        new TableCell({
                            children: [new Paragraph(showEnglish ? pair[0] : '')]
                        }),
                        new TableCell({
                            children: [new Paragraph(showChinese ? pair[1] : '')]
                        })
                    ]
                });
            } else {
                return new TableRow({
                    children: [
                        new TableCell({children: [new Paragraph(String(index + 1))]}),
                        new TableCell({children: [new Paragraph('格式错误')]}),
                        new TableCell({children: [new Paragraph('格式错误')]})
                    ]
                });
            }
        });

        return [
            new Paragraph({
                text: `词汇日期：${dateStr}`,
                heading: 'Heading2',
                alignment: AlignmentType.LEFT,
            }),
            new Table({
                width: {size: 100, type: WidthType.PERCENTAGE},
                columnWidths: [500, 800, 800],
                rows: [
                    new TableRow({
                        children: [
                            new TableCell({
                                width: {size: 3, type: WidthType.PERCENTAGE},
                                shading: {
                                    fill: "ADD8E6",
                                    transparency: 0,
                                },
                                children: [new Paragraph({
                                    children: [new TextRun({text: '序', bold: true})]
                                })]
                            }),
                            new TableCell({
                                width: {size: 48.5, type: WidthType.PERCENTAGE},
                                margins: {
                                    left: 200,
                                },
                                shading: {
                                    fill: "ADD8E6",
                                    transparency: 0,
                                },
                                children: [new Paragraph({
                                    children: [new TextRun({text: '英语', bold: true})]
                                })]
                            }),
                            new TableCell({
                                width: {size: 48.5, type: WidthType.PERCENTAGE},
                                margins: {
                                    left: 200,
                                },
                                shading: {
                                    fill: "ADD8E6",
                                    transparency: 0,
                                },
                                children: [new Paragraph({
                                    children: [new TextRun({text: '中文', bold: true})]
                                })]
                            })
                        ]
                    }),
                    ...tableRows
                ],
                borders: {
                    top: {style: BorderStyle.SINGLE, size: 1},
                    bottom: {style: BorderStyle.SINGLE, size: 1},
                    left: {style: BorderStyle.SINGLE, size: 1},
                    right: {style: BorderStyle.SINGLE, size: 1},
                    insideHorizontal: {style: BorderStyle.SINGLE, size: 1},
                    insideVertical: {style: BorderStyle.SINGLE, size: 1}
                }
            }),
            new Paragraph({text: ""}) // 空行
        ];
    });
}

function createReviewScheduleTable(dateStr, userName) {
    const {
        Document,
        Packer,
        Paragraph,
        Table,
        TableRow,
        TableCell,
        TextRun,
        WidthType,
        BorderStyle,
        AlignmentType,
        VerticalAlign
    } = window.docx;

    // 检查是否是当日数据
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const entryDate = new Date(dateStr);
    entryDate.setHours(0, 0, 0, 0);
    if (entryDate.getTime() !== today.getTime()) return null;

    // 生成复习日期数组
    const intervals = [1, 2, 3, 5, 7, 9, 12, 14, 17, 21];
    const reviewDates = intervals.map(offset => {
        const d = new Date(today);
        d.setDate(d.getDate() + offset);
        return new Intl.DateTimeFormat('zh-CN', {month: '2-digit', day: '2-digit'}).format(d);
    });

    // 创建带样式的段落（复用函数）
    const createCenteredParagraph = (text) => {
        return new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({text, font: '微软雅黑', size: 22})]
        });
    };

    return new Table({
        width: {size: 100, type: WidthType.PERCENTAGE},
        columnWidths: [2000, 800, 800, 800, 800, 800, 800, 800, 800, 800, 800],
        rows: [
            // 第几天行
            new TableRow({
                children: [
                    new TableCell({
                        verticalAlign: VerticalAlign.CENTER,
                        children: [createCenteredParagraph('第几天')]
                    }),
                    ...intervals.map(num => new TableCell({
                        verticalAlign: VerticalAlign.CENTER,
                        children: [createCenteredParagraph(num.toString())]
                    }))
                ]
            }),
            // 复习日期行
            new TableRow({
                children: [
                    new TableCell({
                        verticalAlign: VerticalAlign.CENTER,
                        children: [createCenteredParagraph('复习日期')]
                    }),
                    ...reviewDates.map(date => new TableCell({
                        verticalAlign: VerticalAlign.CENTER,
                        children: [createCenteredParagraph(date)]
                    }))
                ]
            }),
            // 遗忘词数行
            new TableRow({
                children: [
                    new TableCell({
                        verticalAlign: VerticalAlign.CENTER,
                        children: [createCenteredParagraph('遗忘词数')]
                    }),
                    ...Array(10).fill().map(() => new TableCell({
                        verticalAlign: VerticalAlign.CENTER,
                        children: [createCenteredParagraph('')]
                    }))
                ]
            })
        ],
        borders: {
            top: {style: BorderStyle.SINGLE, size: 1, color: "000000"},      // 黑色实线
            bottom: {style: BorderStyle.SINGLE, size: 1, color: "000000"},
            left: {style: BorderStyle.SINGLE, size: 1, color: "000000"},
            right: {style: BorderStyle.SINGLE, size: 1, color: "000000"},
            insideHorizontal: {style: BorderStyle.SINGLE, size: 1, color: "666666"}, // 灰色内边框
            insideVertical: {style: BorderStyle.SINGLE, size: 1, color: "666666"}
        }
    });
}

export async function generateForgetWordsReport() {
    if (!window.docx) {
        await new Promise(resolve => {
            window.addEventListener('docxLoaded', resolve);
        });
    }

    const {
        Document,
        Packer,
        Paragraph,
        TextRun,
        AlignmentType,
    } = window.docx;

    const db = await initDB();
    const tx = db.transaction(STORE_NAME_FORGET, 'readonly');
    const store = tx.objectStore(STORE_NAME_FORGET);
    const userName = document.getElementById("userName").value;
    const teacherName = document.getElementById("teacherName").options[document.getElementById("teacherName").selectedIndex].text;
    const request = store.get(userName);

    const indexDBData = await new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });

    const forgetWordsMap = indexDBData?.forgetWords || {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayRangeInput = document.getElementById("daysRangeInput");
    const dayRange = parseInt(dayRangeInput.value) || 7;
    const startDate = new Date();
    startDate.setDate(today.getDate() - dayRange);
    startDate.setHours(0, 0, 0, 0);

    const filteredForgetEntries = Object.entries(forgetWordsMap)
        .filter(([dateStr, words]) => {
            if (!words || !words.trim()) return false;
            const date = new Date(dateStr);
            date.setHours(0, 0, 0, 0);
            return date > startDate && date <= today;
        })
        .sort(([a], [b]) => new Date(b) - new Date(a));

    if (filteredForgetEntries.length === 0) {
        alert("No forget word record found for the specified period.");
        return;
    }

    const doc = new Document({
        sections: [{
            children: [
                new Paragraph({
                    text: '复习课遗忘词（中英文）',
                    heading: 'Heading1',
                    alignment: AlignmentType.CENTER,
                }),
                new Paragraph({text: `用户：${userName}`, alignment: AlignmentType.LEFT}),
                new Paragraph({text: `教练：${teacherName}`, alignment: AlignmentType.LEFT}),
                new Paragraph({text: ''}),
                ...generateTableSections(filteredForgetEntries, true, true),
                new Paragraph({
                    children: [
                        new TextRun({
                            text: '请家长和学生需将文档打印出来，复习遗忘词汇，并对应中英文版进行默写练习。',
                            bold: true,
                            size: 28,
                            color: 'C47F3E',
                        })
                    ],
                    spacing: {before: 300},
                    alignment: AlignmentType.LEFT,
                }),
                new Paragraph({text: ''}),
                new Paragraph({text: ''}),
                new Paragraph({text: ''}),
                new Paragraph({text: ''}),

                new Paragraph({
                    text: '词义记忆（英文）',
                    heading: 'Heading1',
                    alignment: AlignmentType.CENTER,
                }),
                new Paragraph({text: `用户：${userName}`, alignment: AlignmentType.LEFT}),
                new Paragraph({text: `教练：${teacherName}`, alignment: AlignmentType.LEFT}),
                new Paragraph({text: ''}),
                ...generateTableSections(filteredForgetEntries, true, false),

                new Paragraph({
                    text: '拼写练习（中文）',
                    heading: 'Heading1',
                    alignment: AlignmentType.CENTER,
                }),
                new Paragraph({text: `用户：${userName}`, alignment: AlignmentType.LEFT}),
                new Paragraph({text: `教练：${teacherName}`, alignment: AlignmentType.LEFT}),
                new Paragraph({text: ''}),
                ...generateTableSections(filteredForgetEntries, false, true),
            ]
        }]
    });

    const blob = await Packer.toBlob(doc);
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    const formattedDate = new Intl.DateTimeFormat('zh-CN', {
        year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(new Date()).replace(/\//g, '-');
    link.download = `复习课遗忘词汇_${userName}_${formattedDate}.docx`;
    link.click();
}

export function resetTotalButton() {
    const userName = document.getElementById("userName").value;
    //获取totalHours控件的值
    const totalHoursElement = parseFloat(document.getElementById("totalHours").value) || 0;
    let totalHours = localStorage.getItem(`${userName}_总课时`) || '0';
    if (parseFloat(totalHours) > 0) {
        if (!confirm(`当前总课时为 ${totalHours} 小时，确定要重置为 ${totalHoursElement} 小时吗？`)) {
            alert("操作已取消，未修改总课时。");
            return;
        }
    }
    localStorage.setItem(`${userName}_总课时`, totalHoursElement.toString());
    alert(`总课时已重置为 ${totalHoursElement} 小时`);
}

// 保持 docx 加载逻辑不变
const docxScript = document.createElement('script');
docxScript.src = "https://unpkg.com/docx@7.7.0/build/index.js";
docxScript.onload = () => {
    window.docx = docx;
    console.log("✅ docx available?", window.docx);
    // 触发一个自定义事件，表示 docx 库已经加载完成
    const docxLoadedEvent = new Event('docxLoaded');
    window.dispatchEvent(docxLoadedEvent);
};
docxScript.onerror = () => {
    console.error('❌ Failed to load docx library. Check network or CDN.');
};
document.head.appendChild(docxScript);

// 新版 viewTotalHoursClick: 根据 teacherData 中每个学生的 duration 精确判断 quota30 或 quota60
export async function viewTotalHoursClick() {
    let token = localStorage.getItem('x-token-c');
    if (!token) {
        await loginApp().catch(() => {
        });
        token = localStorage.getItem('x-token-c');
        if (!token) {
            alert('未找到 token。请先点击“设置登录信息”后重试。');
            return;
        }
    }

    // 获取当前选中的教师
    const selectedTeacher = document.getElementById("teacherName")?.value || 'liTeacher';
    const currentTeacherUsers = teacherData[selectedTeacher]?.users || {};

    // 构建学生名称到 duration 的映射
    const studentDurationMap = {};
    Object.entries(currentTeacherUsers).forEach(([userName, userData]) => {
        studentDurationMap[userName] = userData.duration;
    });

    fetch('https://api.lxll.com/request/CustomerTeacherListClient', {
        method: 'POST',
        headers: {
            'accept': 'application/json, text/plain, */*',
            'content-type': 'application/json',
            'origin': 'https://h5.lxll.com',
            'referer': 'https://h5.lxll.com/',
            'x-token-c': token,
            'x-ua': 'ct=1&version=5.0.6',
            'x-user-id': localStorage.getItem('x-user-id') || '144620'
        },
        body: JSON.stringify({
            pageNumber: 1,
            pageSize: 100,
            whereCriteria: {studentName: ''}
        })
    })
        .then(r => {
            if (!r.ok) throw new Error('网络错误 ' + r.status);
            return r.json();
        })
        .then(data => {
            console.log('教师列表数据:', data);
            displayToast('教师列表获取成功');

            const list = Array.isArray(data?.data?.data) ? data.data.data : [];
            const anomaliesDetails = [];

            // 获取白名单：当前教师下的所有学生
            const whiteList = new Set(Object.keys(currentTeacherUsers));
            console.log('当前教师学生白名单:', [...whiteList]);

            const isZero = (v) => {
                const s = String(v ?? '').trim();
                const n = parseFloat(s);
                return s === '0' || (Number.isFinite(n) && n === 0);
            };

            for (const item of list) {
                const userName = (item?.userName || '').trim();
                if (!whiteList.has(userName)) continue;

                const q30 = item?.quota30;
                const q60 = item?.quota60;
                const qAcc = item?.quotaAccompany;

                // 获取该学生配置的 duration
                const studentDuration = studentDurationMap[userName];

                const zeroFields = [];
                let hasQuotaIssue = false;

                // 根据 duration 精确判断需要检查哪个 quota
                if (studentDuration === 0.5) {
                    // 半小时课程，只检查 quota30
                    if (isZero(q30)) {
                        zeroFields.push('quota30');
                        hasQuotaIssue = true;
                    }
                } else if (studentDuration === 1) {
                    // 1小时课程，只检查 quota60
                    if (isZero(q60)) {
                        zeroFields.push('quota60');
                        hasQuotaIssue = true;
                    }
                } else {
                    // 未配置 duration 或其他情况，检查两者都为0才报警（保持兼容）
                    if (isZero(q30) && isZero(q60)) {
                        zeroFields.push('quota30', 'quota60');
                        hasQuotaIssue = true;
                    }
                }

                // 陪伴课为0也需要报警
                if (isZero(qAcc)) {
                    zeroFields.push('quotaAccompany');
                    hasQuotaIssue = true;
                }

                if (hasQuotaIssue) {
                    anomaliesDetails.push({
                        userName,
                        duration: studentDuration,
                        quota30: q30,
                        quota60: q60,
                        quotaAccompany: qAcc,
                        zeroFields
                    });
                }
            }

            console.table(anomaliesDetails);

            const summary = {
                total: data?.data?.total ?? list.length,
                anomaliesCount: anomaliesDetails.length,
                anomalies: anomaliesDetails
            };

            showLongText(JSON.stringify(summary, null, 2));

            if (anomaliesDetails.length > 0) {
                const detailLines = anomaliesDetails.map(d => {
                    const durationDesc = d.duration === 0.5 ? '(半小时课)' : d.duration === 1 ? '(1小时课)' : '';
                    return `请帮忙为${d.userName}${durationDesc}充值：当前"30分钟剩余"为 ${d.quota30 ?? '-'}、"60分钟剩余"为 ${d.quota60 ?? '-'}，"陪练服务时长剩余"为${d.quotaAccompany ?? '-'}`;
                });
                const alertMsg = `发现异常学生(${anomaliesDetails.length})：\n${detailLines.join('\n')}`;
                copyToClipboard(alertMsg);
                alert(alertMsg);
            }
        })
        .catch(async (err) => {
            console.error('获取教师列表失败:', err);

            // 检查是否是 token 失效导致的错误
            if (err.message && err.message.includes('401')) {
                console.warn('检测到 token 失效，尝试重新登录...');
                try {
                    await loginApp();
                    const token = localStorage.getItem('x-token-c');
                    if (token) {
                        console.log('重新登录成功，重新尝试获取教师列表...');
                        return viewTotalHoursClick();
                    } else {
                        console.error('重新登录失败，未获取到 token');
                    }
                } catch (loginError) {
                    console.error('重新登录时发生错误:', loginError);
                }
            }
        });
}
