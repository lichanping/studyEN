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
            "悠然": {
                schedule: "每周一五六日 悠然 (高三)",
                course: "乱序版-高中英语短语词组&固定搭配",
                hours: [19, 30],
                courseWordCount: 1092
            },
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
                course: "全册-沪教版初中英语八年级上册",
                hours: [9, 0],
                courseWordCount: 229
            },
            "泽瑞": {
                schedule: "每周五晚上+周日16点 泽瑞 (初三)",
                course: "2025年上海中考考纲词汇（乱序版）",
                hours: [19, 40],
                courseWordCount: 2299
            },
            "泽瑞同学": {
                schedule: "仅用于核对工资，不用于统计抗遗忘复习 泽瑞同学 (初三)",
                course: "中考超纲",
                hours: [19, 40],
                courseWordCount: 272
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
    const notificationMessage = `${userName}和${userName}妈妈，我遇到了一些突发状况，导致接下来的 n 天无法正常进行正课教学，需要暂停课程。对于给你们造成的不便，我由衷地表示歉意，带来不便，还望理解！`;
    copyToClipboard(notificationMessage);
    showLongText(`${notificationMessage}`);
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
    const newWord = parseInt(document.getElementById("newWord").value);
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
    const inputAntiForgettingForgetWord = document.getElementById("antiForgettingForgetWord");
    inputAntiForgettingForgetWord.value = numberOfEnglishWords;
    const antiForgettingForgetWord = document.getElementById('antiForgettingForgetWord').value;
    const learnedWord = parseInt(document.getElementById("learnedWord").value.trim()) || 0;
    const inputText = document.getElementById('preTestWord').value.trim();
    let preTestWord = inputText ? inputText.split('+').reduce((sum, num) => {
        const parsedNum = parseInt(num.trim(), 10);
        return sum + (isNaN(parsedNum) ? 0 : parsedNum);
    }, 0) : 0;

    // 生成反馈报告
    let feedbackMessage;
    if (learnedWord > 0) {
        let remaining = courseWordCountLabel - learnedWord;
        feedbackMessage = `【${userName}今日学习-《${course}》的反馈】<br><br>1.九宫格复习${reviewWordCount}词，遗忘${reviewforgetWord}词，正确率${reviewCorrectRate}%；<br><br>2.学前检测${preTestWord}词，新学${newWord}词，遗忘${forgetWord}词，正确率${correctRate}%<br><br>3.今天学习的是《${course}》，共${courseWordCountLabel}词，已学习${learnedWord}词，剩余${remaining}词未推送完九宫格。<br><br>4.🎉陪伴 ${userName} 学习非常开心~ ${userName} ${getRandomFeedback()} 认真且努力的${userName}一定能抵达梦想的彼岸。🚀🚀🚀<br><br>5.严格按照 21 天抗遗忘复习表来复习哟!<br><br><br><br>💟今日寄语💟<br><br>${getRandomMotto()}`;
    } else {
        feedbackMessage = `【${userName}今日学习-《${course}》的反馈】<br><br>1.九宫格复习${reviewWordCount}词，遗忘${reviewforgetWord}词，正确率${reviewCorrectRate}%；<br><br>2.学前检测${preTestWord}词，新学${newWord}词，遗忘${forgetWord}词，正确率${correctRate}%<br><br>3.陪伴 ✨ ${userName} 学习非常开心~ ${userName} ${getRandomFeedback()} 认真且努力的${userName}一定能抵达梦想的彼岸。🚀🚀🚀<br><br>4.严格按照 21 天抗遗忘复习表来复习哟!<br><br><br><br>🌺💎今日寄语💎🌺<br><br>${getRandomMotto()}`;
    }

    // 获取课程日期
    const classDateTime = document.getElementById("classDateTime").value;
    if (classDateTime) {
        const classDate = new Date(classDateTime).toISOString().split('T')[0];
        const classDuration = parseFloat(document.getElementById("classDuration").value);
        storeClassStatistics(userName, classDate, newWord, reviewWordCount, classDuration, "词汇课");
    } else {
        alert("请选择有效的课程日期。");
        return; // 如果没有选择日期，停止函数
    }

    // 复制到剪贴板并弹窗显示
    copyToClipboard(feedbackMessage);
    showLongText(`${feedbackMessage}`);
}

export function generateReport() {
    const userName = document.getElementById("userName").value;
    const teacherNameElement = document.getElementById("teacherName");
    const coachName = teacherNameElement.options[teacherNameElement.selectedIndex].text;

    // 合并包含所选userName的数据
    let allClassStats = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.includes(userName)) {
            const storedValue = localStorage.getItem(key);
            if (storedValue) { // 检查存储的值是否存在
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

    // Read day range from input
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

    // Update: Handle both types of classes, including those with the `type` attribute (e.g., "阅读完型语法课")
    Object.entries(allClassStats).forEach(([key, stats]) => {
        const isVocabClass = !key.includes('_') || (stats.type === "词汇课" || stats.type === "阅读完型语法课");
        if (!isVocabClass) return;

        // Ensure the correct date is used, and handle missing or alternate formats
        const date = stats.date || key;
        const recordDate = new Date(date);
        recordDate.setHours(0, 0, 0, 0);

        if (recordDate > startDate && recordDate <= today) {
            const weekDay = recordDate.toLocaleString('zh-CN', { weekday: 'short' });
            const formattedDate = `${String(recordDate.getMonth() + 1).padStart(2, '0')}-${String(recordDate.getDate()).padStart(2, '0')}`;

            let courseType = stats.type || "词汇课";
            if (courseType === "词汇课") {
                let duration = stats.duration;
                if (typeof duration === 'undefined') {
                    duration = (stats.newWord < 20) ? 0.5 : 1;
                }
                courseType = duration === 0.5 ? "半词课" : "词汇课";
            }   else if (courseType === "阅读完型语法课") {
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

    // If no valid entries within the date range, alert the user
    if (validEntries === 0) {
        alert("没有找到数据可供下载！");
        return;
    }

    // Sort the entries by date in ascending order
    sortedEntries.sort((a, b) => a.date - b.date);

    // Prepare the report content (with totals in the title)
    let reportContent = `【正课学习数据统计】\n`;
    reportContent += `学员: ${userName}\n`;
    reportContent += `教练: ${coachName}\n\n`;

    // Add the totals after the calculation
    reportContent += `📌 本期学习总览\n`;
    reportContent += `新学单词：${totalNewWords} 词\n`;
    reportContent += `九宫格复习：${totalReviewWords} 词\n\n`;

    reportContent += `📅 正课学习详情\n日期     | 课程类型 | 新词  | 九宫格\n--------------------------------\n`;

    let currentYear = null;

    // Add sorted entries to the report content
    sortedEntries.forEach(entry => {
        // Add year title if it changes
        if (entry.year !== currentYear) {
            currentYear = entry.year;
            reportContent += `**${currentYear}年**\n`;
        }

        reportContent += `${entry.formatted}\n`;
    });

    reportContent += `\n📢 以上数据仅统计${userName}在正课中的学习情况，不包含课后的抗遗忘复习。\n💪 ${userName}，继续稳步积累，保持进步！`;

    // Copy the formatted content to the clipboard
    copyToClipboard(reportContent);

    // Generate the file and trigger download
    const blob = new Blob([reportContent], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${userName}_学习报告.txt`; // Use the username as the filename

    // Trigger download
    link.click();
}

export function handleUnderstandSituationClick() {
    const userName = document.getElementById("userName").value;
    // const studentLevel = document.querySelector('input[name="studentLevel"]:checked').value;
    const studentLevel = document.getElementById("studentLevel").value;

    let message = "";

    if (studentLevel === "middleHigh") {
        // If student is in 初高中
        message = `${userName}，我想了解一下，你现在几年级了呢?你现在的语言成绩在哪一个阶段呢?那我说三个段,如果对了你只用点头就行，好吗?<br><br>150 总分:90分以下，90-120，120以上<br><br>[问]:XX(和XX妈妈)你错的阅读、完型等等这些题目，你觉得错的原因是什么?<br><br>
[总结]:嗯，好的。其实归根结底是我们单词量不够的原因。如果有这样的一种方法，它能让你一分钟记住一个单词，全程有教练来陪伴学习和陪伴复习，并且全部记住消化不遗忘。你愿不愿意尝试一下?<br><br>
那我们体验课正式开始吧！`;
    } else if (studentLevel === "primary") {
        // If student is 小学生
        message = `${userName}，我想了解一下，你现在几年级了呢?你考试的时候错题的原因是什么呢?<br><br>
嗯，好的。<br><br>
其实归根结底是我们单词量不够的原因。<br><br>
接下来，我们就一起来尝试一下高效快速地提高我们的单词量，${userName}，${userName}妈妈，那我们体验课正式开始吧!`;
    }

    copyToClipboard(message);
    showAlert(message);
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
        switch(record.type) {
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

    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${teacherDisplayName}_${monthToQuery}_课时工资.txt`;
    link.click();
}



