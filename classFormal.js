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
window.addEventListener('load', createUsers);
window.addEventListener("load", updateLabel);
// Define user data
const userData = {
    "悠然": {
        schedule: "每周一五六日 悠然 (高二)",
        course: "高中超前单词",
        hours: [19, 20]
    },
    "何子谦": {
        schedule: "每周二六日 何子谦 (高二)",
        course: "升序版-上海市高考英语考纲词汇(2024)",
        hours: [11, 0]
    },
    "芷淇": {
        schedule: "每周五日 芷淇 (初二)",
        course: "牛津上海版英语九年级上册",
        hours: [19, 25]
    },
    "阮王睿": {
        schedule: "每周一三六 19:35 阮王睿 (准高一)",
        course: "雅思初级单词词汇表",
        hours: [19, 35]
    },
    "伟杰": {
        schedule: "体验课 19:35 伟杰 (高三)",
        course: "体验课",
        hours: [19, 35]
    },
    "青青": {
        schedule: "每周一 19:30 青青 (6年级)",
        course: "牛津上海版英语八年级上册",
        hours: [19, 30]
    }, "敏珺": {
        schedule: "每周日 19:40 敏珺 (初一)",
        course: "初中高级阅读理解",
        hours: [19, 40]
    }, "泽成": {
        schedule: "每天晚上 泽成 (初三)",
        course: "上海市初中英语考纲词汇",
        hours: [19, 45]
    }, "辰辰": {
        schedule: "每天晚上 辰辰 (高一)",
        course: "高考词汇",
        hours: [22, 30]
    }
};

export function createUsers() {
    const userNameSelect = document.getElementById("userName");
    Object.keys(userData).forEach(userName => {
        const option = document.createElement("option");
        option.value = userName;
        option.textContent = userName;
        userNameSelect.appendChild(option);
    });
}

export function updateLabel() {
    var userName = document.getElementById("userName").value;
    var labels = document.getElementsByClassName("scheduleLabel");
    var courseLabel = document.getElementById("courseLabel");

    const scheduleLabels = document.getElementsByClassName("scheduleLabels")[0];
    // Clear existing labels
    scheduleLabels.innerHTML = "";

    const userDataForSelectedUser = userData[userName];
    const currentDate = new Date();

    if (userDataForSelectedUser) {
        const userInfo = userData[userName];
        const label = document.createElement("label");
        label.textContent = userInfo.schedule;
        label.className = "scheduleLabel";
        label.style.color = "red";
        scheduleLabels.appendChild(label);
        scheduleLabels.appendChild(document.createElement("br"));
        courseLabel.textContent = userDataForSelectedUser.course;
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
        notificationMessage = `【${thisDateTime}】<br><br>亲爱的 ✨ ${userName} 用户您好! 我们的语言陪练服务时间安排在${formattedDateTime}。<br><br>📢请学员及家长准时进入会议室上课，并确保摄像头📷开启。<br><br>📢如临时无法参加尽量提前告知。感谢您的配合！`;
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
    const feedbackMessage = `*课后复习方式：<br><br>1️⃣.教练带动进行标准21天抗遗忘复习。<br><br>2️⃣.家长和学生需将【每日单词表】打印出来，家长打印中文版，让学生书写英文；打印英文版，学生填写中文，然后对应中英文版进行批改，并以拍照的方式发送到群里进行打卡，建议每天写30个左右。<br><br>3️⃣.对于当日抗遗忘复习单词中遗忘的部分，也要进行默写哦。`
    copyToClipboard(feedbackMessage);
    showLongText(`${feedbackMessage}`);
}

export function handleClassFeedbackClick() {
    const course = document.getElementById('courseLabel').textContent;
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

    // Generate feedback message
    const feedbackMessage = `【${userName}今日学习-《${course}》的反馈】<br><br>1️⃣.今日新学单词 ${newWord}个，遗忘${forgetWord}个, 正确率 ${correctRate}% ；<br><br>2️⃣.今日复习单词 ${reviewWordCount}个，遗忘 ${reviewforgetWord}个, 正确率 ${reviewCorrectRate}%。<br><br>3️⃣.陪伴 ✨ ${userName} 学习非常开心~ ${userName} ${getRandomFeedback()} 认真且努力的${userName}一定能抵达梦想的彼岸。🚀🚀🚀<br><br>4️⃣.严格按照 21 天抗遗忘复习表来复习哟!<br><br><br><br>💟今日寄语💟<br><br>${getRandomMotto()}`
    copyToClipboard(feedbackMessage);
    showLongText(`${feedbackMessage}`);
}

export function handleManagementGroupTemplateClick() {
    const userName = document.getElementById("userName").value;
    const reviewTime = document.getElementById("reviewTime").value; // Get the review time from the input field

    var selectedDateTime = new Date(reviewTime);
    var hour = selectedDateTime.getHours();
    var minute = selectedDateTime.getMinutes().toString().padStart(2, '0');

    // Get the current time
    const currentTime = new Date();
    const timeDifference = Math.floor((selectedDateTime - currentTime) / 1000 / 60); // Difference in minutes, rounded down

    let outputMessage;
    if (timeDifference > 0 && timeDifference <= 30) {
        outputMessage = `【抗遗忘提醒-${hour}:${minute}】<br><br>⏰我们的抗遗忘复习课还有 **${timeDifference}** 分钟开始了，请做好准备，及时进入会议室哦🔥`;
    } else {
        outputMessage = `【抗遗忘温馨提醒-${hour}:${minute}】<br><br>👍#腾讯会议：689-688-4088<br><br>温馨提示：<br><br>⏰请准时参加会议并打开摄像头📷<br><br>📢临时无法参加尽量提前告知<br><br>㊙️仅在当天有收到提醒通知才需入会<br><br>💝在求知的旅程中，你的每一分努力老师都铭记于心，老师为你骄傲！`;
    }

    copyToClipboard(outputMessage);
    // Display the output message
    showLongText(outputMessage);
}

export function handleOpeningSpeechClick() {
    const userName = document.getElementById("userName").value;
    const teacherName = document.getElementById("teacherName").value;

    const openingSpeechMessage = `${userName}同学，你那边能听到我说话吗?从现在开始需要你保持摄像头的开启，这样能我更好地关注到你的状态，跟你多互动。(已经打开可以不说)<br><br>
下面我来做一个自我介绍，我是【李校来啦】${teacherName}，以后我就是你的词汇/阅读完型/语法的专属陪练，我会陪着你一起训练和复习，那么接下来我们就开启英语学习之旅吧!`;

    copyToClipboard(openingSpeechMessage);
    showAlert(`${openingSpeechMessage}`);
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



