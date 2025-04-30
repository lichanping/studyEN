import {
    copyToClipboard,
    getRandomMotto,
    showAlert,
    getRandomFeedback,
    showLongText,
    countEnglishWords,
    storeClassStatistics
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
            "子琦": {
                schedule: "每周 刘子琦 (初二)",
                course: "上海高考英语考纲词汇（乱序版）",
                hours: [21, 30],
                courseWordCount: 4955
            },
            "硕硕": {
                schedule: "每周周六下午3点+周日10点 硕硕(四年级)",
                course: "牛津上海版小学英语五年级（下册）",
                hours: [15, 0],
                courseWordCount: 92
            },
            "梓言": {
                schedule: "每周 梓言 (初一)",
                course: "【新教材】沪教版（五四学制）七年级下册",
                hours: [9, 0],
                courseWordCount: 283
            },
            "泽瑞": {
                schedule: "每周五晚上+周日16点 泽瑞 (初三)",
                course: "2025年上海中考考纲词汇（乱序版）",
                hours: [19, 40],
                courseWordCount: 2299
            },
            "悠然": {
                schedule: "每周一五六日 悠然 (高三)",
                course: "高中超前单词",
                hours: [19, 30],
                courseWordCount: 4610
            },
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
📖 课程名称：《${course}》
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

export function selfReviewClick() {
    const feedbackMessage = `*课后复习方式：<br><br>1️⃣.教练带动进行标准 21 天抗遗忘复习（解决"两会" ：看到英文会读，看到英文知道中文意思）<br><br>2️⃣.家长和学生需将【每日单词表】打印出来，家长打印中文版，让学生书写英文；打印英文版，学生填写中文，家长及学员对应中英文版进行批改，并以拍照的方式发送到群里进行打卡（解决另外"两会" ：会拼会写），建议每天写一遍。<br><br>3️⃣.对于当日抗遗忘复习单词中遗忘的部分，也要加入"生词本"进行重点复习。`
    copyToClipboard(feedbackMessage);
    showLongText(`${feedbackMessage}`);
}

export function handleClassFeedbackClick() {
    // 获取课程信息
    const course = document.getElementById('courseLabel').textContent;
    const courseWordCountLabel = document.getElementById('courseWordCountLabel').textContent;

    // 获取用户输入数据
    const userName = document.getElementById("userName").value;
    const newLearnedWordsText = document.getElementById('newLearnedWords').value.trim();
    const newWordCountFromText = countEnglishWords(newLearnedWordsText);
    const newWordInput = document.getElementById("newWord");
    let newWord = parseInt(newWordInput.value);

    if (newWordCountFromText !== newWord) {
        const confirmReplace = confirm(`新学单词实际数量为 ${newWordCountFromText}，与手动输入的 ${newWord} 不同。是否要自动替换？`);
        if (confirmReplace) {
            newWordInput.value = newWordCountFromText;
            newWord = newWordCountFromText; // 重新赋值给 newWord 变量
        }
    }

    const reviewWordInputText = document.getElementById("reviewWord").value.trim();
    const reviewWordCount = reviewWordInputText ? reviewWordInputText.split('+').reduce((sum, num) => {
        const parsedNum = parseInt(num.trim(), 10);
        return sum + (isNaN(parsedNum) ? 0 : parsedNum);
    }, 0) : 0;
    const reviewforgetWord = document.getElementById("reviewforgetWord").value;
    const reviewCorrectRate = ((reviewWordCount - reviewforgetWord) / reviewWordCount * 100).toFixed(0);
    const forgetWord = parseInt(document.getElementById("forgetWord").value) || 0;
    const correctRate = ((newWord - forgetWord) / newWord * 100).toFixed(0);
    let forgetWords = document.getElementById('forgetWords').value.trim();
    const numberOfEnglishWords = countEnglishWords(forgetWords);
    document.getElementById("antiForgettingForgetWord").value = numberOfEnglishWords;

    const learnedWord = parseInt(document.getElementById("learnedWord").value.trim()) || 0;
    const inputText = document.getElementById('preTestWord').value.trim();
    let preTestWord = inputText ? inputText.split('+').reduce((sum, num) => {
        const parsedNum = parseInt(num.trim(), 10);
        return sum + (isNaN(parsedNum) ? 0 : parsedNum);
    }, 0) : 0;

    // 生成反馈报告
    let feedbackMessage = `【${userName}今日学习-《${course}》的反馈】<br><br>`;

    // Initialize the index counter
    let index = 1;

    // Only include review word feedback if reviewWordCount is more than 0
    if (reviewWordCount > 0) {
        feedbackMessage += `${index++}.九宫格复习${reviewWordCount}词，遗忘${reviewforgetWord}词，正确率${reviewCorrectRate}%；<br><br>`;
    }

    // Always include the pre-test and new word feedback
    feedbackMessage += `${index++}.学前检测${preTestWord}词，新学${newWord}词，遗忘${forgetWord}词，正确率${correctRate}%<br><br>`;

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
    showLongText(`${feedbackMessage}`);
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

async function storeNewLearnedWords(studentName, newLearnedWordsText) {
    const classDateInput = document.getElementById("classDateTime").value;

    if (!classDateInput) {
        console.error('Class date not selected.');
        return;
    }

    try {
        const currentDate = classDateInput.split('T')[0];
        const db = await initDB();
        const tx = db.transaction(STORE_NAME_LEARNED, 'readwrite');
        const store = tx.objectStore(STORE_NAME_LEARNED);

        const request = store.get(studentName);
        const existingData = await new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        // Normalize input into one-line English+Chinese
        const normalizedLines = normalizeOneLineEntries(newLearnedWordsText);
        const finalTextToStore = normalizedLines.join('\n');

        const newWordsEntry = {
            [currentDate]: finalTextToStore
        };

        const updatedData = {
            userName: studentName,
            newLearnedWords: {
                ...(existingData?.newLearnedWords || {}),
                ...newWordsEntry  // newWordsEntry 应该是你要新增的单词
            },
            feedbackEntries: existingData?.feedbackEntries || [],
            forgetWords: existingData?.forgetWords || {}
        };

        store.put(updatedData);
        await new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });

        console.log('✅ New learned words stored successfully:\n', finalTextToStore);
    } catch (error) {
        console.error('❌ Error storing new learned words:', error);
    }
}

function normalizeOneLineEntries(text) {
    const lines = text.trim().split('\n').map(line => line.trim()).filter(Boolean);
    const result = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        const hasChinese = /[\u4e00-\u9fa5]/.test(line);
        const hasEnglish = /[a-zA-Z]/.test(line);

        // One-line case: contains both English and Chinese
        if (hasChinese && hasEnglish) {
            result.push(line);
        }
        // Two-line case: English first, then Chinese
        else if (hasEnglish && i + 1 < lines.length && /[\u4e00-\u9fa5]/.test(lines[i + 1])) {
            result.push(lines[i] + lines[i + 1]);
            i++; // Skip the next line (Chinese explanation)
        }
        // If only English or only Chinese, keep as-is (optional)
        else {
            result.push(line);
        }
    }

    return result;
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

    Object.entries(allClassStats).forEach(([key, stats]) => {
        const isVocabClass = !key.includes('_') || (stats.type === "词汇课" || stats.type === "阅读完型语法课");
        if (!isVocabClass) return;

        const date = stats.date || key;
        const recordDate = new Date(date);
        recordDate.setHours(0, 0, 0, 0);

        if (recordDate > startDate && recordDate <= today) {
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
    reportContent += `💪 ${userName}，继续稳步积累，保持进步！`;

    // Copy to clipboard
    copyToClipboard(reportContent);

    // Download report
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
        studentStats[userName] = 0;

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
        studentStats[record.userName] += lessonFee;
    });

    // 添加学生总计
    reportContent += "\n学生总计:\n";

    // Sort studentStats by total fee in descending order
    const sortedStudentStats = Object.entries(studentStats).sort((a, b) => b[1] - a[1]);

    sortedStudentStats.forEach(([student, total]) => {
        reportContent += `${student.padEnd(6)}: ${total}元\n`;
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

    const blob = new Blob([reportContent], {type: 'text/plain;charset=utf-8'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${teacherDisplayName}_${monthToQuery}_课时工资.txt`;
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
        startDate.setDate(today.getDate() - dayRange);
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

    return entries.flatMap(([dateStr, words]) => {
        const wordPairs = words.trim().split('\n').map(pair => {
            const match = pair.match(/^([\w\s\-…\.]+)(.*)$/);
            if (match) {
                const english = match[1].trim();
                const chinese = match[2].trim() || '缺失中文';
                return [english, chinese];
            }
            return []; // skip badly formatted lines
        });

        const tableRows = wordPairs.map((pair, index) => {
            if (pair.length >= 2) {
                return new TableRow({
                    children: [
                        new TableCell({  // Index column
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
                columnWidths: [500, 800, 800],  // Adjusted for 3 columns
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
                                    left: 200,  // 单位是 1/20 point，200 大约等于 0.25 cm
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

