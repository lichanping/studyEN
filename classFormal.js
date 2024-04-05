import {copyToClipboard, getRandomMotto, showAlert, getRandomFeedback, showLongText} from './commonFunctions.js'

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
    "蔡青青": {
        schedule: "每周一 19:30 蔡青青 (6年级)",
        // course: "乱序版上海市初中",
        course: "牛津上海版英语七年级下册",
        // course: "牛津上海版英语七年级上册",
        hours: [19, 30]
    },
    "夏启程": {
        schedule: "每周五、日 19:40 夏启程 (5年级)",
//        course: "牛津上海版小学英语六年级",
        course: "小学考纲词汇",
        hours: [19, 40]
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
    // Create labels for each user
    Object.keys(userData).forEach(userName => {
        const userInfo = userData[userName];
        const label = document.createElement("label");
        label.textContent = userInfo.schedule;
        label.className = "scheduleLabel";
        scheduleLabels.appendChild(label);
        scheduleLabels.appendChild(document.createElement("br"));
    });

    const userDataForSelectedUser = userData[userName];
    const currentDate = new Date();
    for (var i = 0; i < labels.length; i++) {
        if (labels[i].textContent.includes(userName)) {
            labels[i].style.fontWeight = "bold";
            labels[i].style.color = "red";
            courseLabel.textContent = userDataForSelectedUser.course;
            currentDate.setHours(...userDataForSelectedUser.hours, 0, 0);
        } else {
            labels[i].style.fontWeight = "normal";
            labels[i].style.color = "initial";
        }
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
    const notificationMessage = `亲爱的 ✨ ${userName} 用户您好! 我们的语言陪练服务时间安排在${formattedDateTime}。<br><br>本次课程时间为${thisDateTime}；<br><br>上课地址如下：<br><br>#腾讯会议：573-215-9639<br><br>请学员及家长准时进入会议室上课，并且务必确保摄像头📷 📷 开启。感谢您的配合！`;

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

export function handleClassFeedbackClick() {
    const userName = document.getElementById("userName").value;
    const newWord = parseInt(document.getElementById("newWord").value);
    const reviewWordCount = document.getElementById("reviewWord").value;
    const forgetWord = parseInt(document.getElementById("forgetWord").value) || 0; // Default to 0 if no value entered or invalid
    // Calculate correct rate
    const correctRate = ((newWord - forgetWord) / newWord * 100).toFixed(0);
    // Get course label
    const courseLabel = document.getElementById("courseLabel").textContent.trim();
    // Generate feedback message
    const feedbackMessage = `【${userName}今日学习反馈】<br><br>1.今日复习单词 ${reviewWordCount}个，遗忘 0个；今日新学单词 ${newWord}个，遗忘${forgetWord}个, 正确率 ${correctRate}%。<br><br>2.陪伴 ✨ ${userName} 学习非常开心~ ${userName} ${getRandomFeedback()} "${getRandomMotto()}”，认真且努力的${userName}一定能抵达梦想的彼岸。<br><br>3.${userName}目前学习：${courseLabel}<br><br>4.严格按照 21 天抗遗忘复习表来复习哟! 🚀🚀🚀`
    copyToClipboard(feedbackMessage);
    showLongText(`${feedbackMessage}`);
}

export function handleManagementGroupTemplateClick() {
    const userName = document.getElementById("userName").value;
    const reviewTime = document.getElementById("reviewTime").value; // Get the review time from the input field

    var selectedDateTime = new Date(reviewTime);
    var hour = selectedDateTime.getHours();
    var minute = selectedDateTime.getMinutes()
    const outputMessage = `${userName}同学的复习时间定为 ${hour}:${minute}；<br><br>21天抗遗忘复习排课表已生成，请学员准时进入会议室进行抗遗忘复习，并且务必确保摄像头开启。感谢您的配合！📷 📷 📷 <br><br>上课地址如下：<br><br>#腾讯会议：573-215-9639<br><br>仅需在当天有提醒通知的情况下入会，若未收到通知，请自行按需复习纸质内容。如有任何疑问，请随时与我们联系。😊`;
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
    return `每周${formattedDateTime}`;
}



