import {
    copyToClipboard,
    getRandomMotto,
    showAlert,
    getRandomFeedback,
    showLongText,
    countEnglishWords
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
            "王泓俨": {
                schedule: "每周 王泓俨 (高二)",
                course: "上海高考英语考纲词汇（乱序版）",
                hours: [20, 20],
                courseWordCount: 4955
            },
            "礼豪": {
                schedule: "每周日晚上19点 礼豪（初二88%）",
                course: "2023年上海市初中英语考纲词汇",
                hours: [19, 30],
                courseWordCount: 1768
            },
            "芷淇": {
                schedule: "每周五日 芷淇 (初三)",
                course: "新东方中考英语必备词汇666个",
                hours: [19, 25],
                courseWordCount: 643
            },
            "征洋": {
                schedule: "每周日9点 征洋（初一65%）",
                course: "新版初中考纲单词",
                hours: [9, 0],
                courseWordCount: 1623
            },
            "硕硕": {
                schedule: "每周周六下午3点+周日 10点 硕硕 (四年级)",
                course: "全册-牛津上海版小学英语四年级（上册）",
                hours: [15, 0],
                courseWordCount: 260
            },
            "盛安逸": {
                schedule: "每周 盛安逸 (四年级)",
                course: "xxx",
                hours: [20, 20],
                courseWordCount: 4610
            },
            "阮王睿": {
                schedule: "每周一三六 19:35 阮王睿 (准高一)",
                course: "雅思初级单词词汇表",
                hours: [19, 35],
                courseWordCount: 3500
            }, "敏珺": {
                schedule: "每周日 19:40 敏珺 (初二)",
                course: "初中高级阅读理解",
                hours: [19, 40],
                courseWordCount: 3500
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
        notificationMessage = `【${thisDateTime}】<br><br>⏰我们的在线课程还有【${timeDifference}】分钟开始了，请做好准备，及时进入会议室哦🔥`;
    } else {
        notificationMessage = `【${thisDateTime}】<br><br>亲爱的 ✨ ${userName} 用户您好! 我们的语言陪练课程将于${formattedDateTime}开始，<br><br>📖课程名称为《${course}》。<br><br>📢请学员准时进入会议室，并确保摄像头开启。<br><br>👄为了呵护嗓子，建议课前准备一杯水放在身旁。<br><br>🔔请您看到消息后抽空回复，让我们确认您已知课程安排😉。期待课堂相见🎈<br><br>👍#腾讯会议：988-8340-0582`;
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
    const feedbackMessage = `*课后复习方式：<br><br>1️⃣.教练带动进行标准 21 天抗遗忘复习（解决“两会” ：看到英文会读，看到英文知道中文意思）<br><br>2️⃣.家长和学生需将【每日单词表】打印出来，家长打印中文版，让学生书写英文；打印英文版，学生填写中文，家长及学员对应中英文版进行批改，并以拍照的方式发送到群里进行打卡（解决另外“两会” ：会拼会写），建议每天写一遍。<br><br>3️⃣.对于当日抗遗忘复习单词中遗忘的部分，也要加入“生词本”进行重点复习。`
    copyToClipboard(feedbackMessage);
    showLongText(`${feedbackMessage}`);
}

export function handleClassFeedbackClick() {
    const course = document.getElementById('courseLabel').textContent;
    const courseWordCountLabel = document.getElementById('courseWordCountLabel').textContent;
    const userName = document.getElementById("userName").value;
    const newWord = parseInt(document.getElementById("newWord").value);
    const reviewWordCount = document.getElementById("reviewWord").value;
    const reviewforgetWord = document.getElementById("reviewforgetWord").value;
    const reviewCorrectRate = ((reviewWordCount - reviewforgetWord) / reviewWordCount * 100).toFixed(0);

    const forgetWord = parseInt(document.getElementById("forgetWord").value) || 0; // Default to 0 if no value entered or invalid
    // Calculate correct rate
    const correctRate = ((newWord - forgetWord) / newWord * 100).toFixed(0);

    // Get values from input boxes
    let forgetWords = document.getElementById('forgetWords').value.trim();

    // Count the number of English words
    const numberOfEnglishWords = countEnglishWords(forgetWords);
    // Get the input element to display the result
    const inputAntiForgettingForgetWord = document.getElementById("antiForgettingForgetWord");

    // Set the calculated value to the input box
    inputAntiForgettingForgetWord.value = numberOfEnglishWords;
    const antiForgettingForgetWord = document.getElementById('antiForgettingForgetWord').value;

    const learnedWord = parseInt(document.getElementById("learnedWord").value.trim()) || 0;
    const inputText = document.getElementById('preTestWord').value.trim();

    // Default value is 0 if input is empty
    let preTestWord = inputText ? inputText.split('+').reduce((sum, num) => {
        // Parse the integer and add to sum, default to 0 if NaN
        const parsedNum = parseInt(num.trim(), 10);
        return sum + (isNaN(parsedNum) ? 0 : parsedNum);
    }, 0) : 0;
    let feedbackMessage
    if (learnedWord > 0) {
        let remaining = courseWordCountLabel - learnedWord;
        feedbackMessage = `【${userName}今日学习-《${course}》的反馈】<br><br>1️⃣.九宫格复习${reviewWordCount} 词，遗忘${reviewforgetWord} 词，正确率${reviewCorrectRate}%；<br><br>2️⃣.学前检测${preTestWord} 词，新学${newWord} 词，遗忘${forgetWord} 词，正确率${correctRate}%<br><br>3️⃣.今天学习的是《${course}》，共${courseWordCountLabel}词，已学习${learnedWord}词，剩余${remaining}词未推送完九宫格。<br><br>4️⃣.🎉陪伴 ${userName} 学习非常开心~ ${userName} ${getRandomFeedback()} 认真且努力的${userName}一定能抵达梦想的彼岸。🚀🚀🚀<br><br>5️⃣.严格按照 21 天抗遗忘复习表来复习哟!<br><br><br><br>💟今日寄语💟<br><br>${getRandomMotto()}`
    } else {
        feedbackMessage = `【${userName}今日学习-《${course}》的反馈】<br><br>1️⃣.九宫格复习${reviewWordCount} 词，遗忘${reviewforgetWord} 词，正确率${reviewCorrectRate}%；<br><br>2️⃣.学前检测${preTestWord} 词，新学${newWord} 词，遗忘${forgetWord} 词，正确率${correctRate}%<br><br>3️⃣.陪伴 ✨ ${userName} 学习非常开心~ ${userName} ${getRandomFeedback()} 认真且努力的${userName}一定能抵达梦想的彼岸。🚀🚀🚀<br><br>4️⃣.严格按照 21 天抗遗忘复习表来复习哟!<br><br><br><br>🌺💎今日寄语💎🌺<br><br>${getRandomMotto()}`
    }
    copyToClipboard(feedbackMessage);
    showLongText(`${feedbackMessage}`);
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



