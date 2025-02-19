import {
    copyToClipboard, 
    getRandomMotto, 
    showAlert, 
    getRandomFeedback, 
    showLongText,
    storeClassStatistics
} from './commonFunctions.js'

const setInitialDateTime = () => {
    const currentDate = new Date();
    currentDate.setHours(19, 50, 0, 0); // Set the time to 21:00 (9 PM)

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
window.addEventListener('load', updateUserNameOptions2);
window.addEventListener("load", updateLabel2);

const teacherData = {
    "liTeacher": {
        users: {
            "泽瑞": {
                schedule: "每周5、7 泽瑞 (初三)",
                course: "初中阅读理解",
                hours: [16, 0]
            },
            "泽瑞同学": {
                schedule: "每周5、7 泽瑞同学 (初三)",
                course: "初中完型填空",
                hours: [16, 0]
            },
            "悠然": {
                schedule: "每周6、7 悠然 (高二)",
                course: "高中高级阅读理解",
                hours: [11, 0]
            },
            "悠然同学": {
                schedule: "每周6、7 10:30 悠然同学 (高二)",
                course: "高中高级完型填空",
                hours: [10, 30]
            },
        }
    },
    "shiTeacher": {
        users: {
            "硕硕2": {
                schedule: "每周周六下午3点+周日 10点 硕硕 (四年级)",
                course: "全册",
                hours: [15, 0],
            },
            "王泓俨2": {
                schedule: "每周 王泓俨 (高二)",
                course: "上海高考英语考纲词汇（乱序版）",
                hours: [20, 50],
            },
            // Add other users for 施教练 here...
        }
    },
    // Add more teachers as needed
};


export function updateUserNameOptions2() {
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
        updateLabel2();  // Update the label with the first user's details
    } else {
        updateLabel2();  // No users, just update labels
    }
}

export function updateLabel2() {
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


export function handleScheduleNotificationClick() {
    const userName = document.getElementById("userName").value;
    const courseLabel = document.getElementById("courseLabel").textContent.trim();

    // Get the date and time from the input field
    const classDateTime = document.getElementById("classDateTime").value;
    const formattedDateTime = formatDateTimeWeekly(classDateTime);
    const thisDateTime = formatDateTime(classDateTime);

    var selectedDateTime = new Date(classDateTime);
    const currentTime = new Date();
    const timeDifference = Math.floor((selectedDateTime - currentTime) / 1000 / 60); // Difference in minutes, rounded down

    let notificationMessage;
    if (timeDifference > 0 && timeDifference <= 30) {
        notificationMessage = `【${thisDateTime}】<br><br>⏰我们的在线课程还有 **${timeDifference}** 分钟开始了，请做好准备，及时进入会议室哦🔥<br><br>👍#腾讯会议：988-8340-0582`;
    } else {
        notificationMessage = `【${thisDateTime}】<br><br>亲爱的 ⭐ ${userName} 用户您好! 我们的英语《${courseLabel}》学习时间安排在${formattedDateTime}。<br><br>⏰请学员及家长准时进入会议室上课，并确保摄像头🎥开启。感谢您的配合！<br><br>👍#腾讯会议：988-8340-0582`;
    }

    copyToClipboard(notificationMessage);
    showLongText(`${notificationMessage}`);
}

export function handleLateMeetingReminderClick() {
    const userName = document.getElementById("userName").value;
    // Create the reminder message
    const reminderMessage = `我们的在线课程已经开始了，请 ⭐  ${userName} 同学抓紧时间及时进入会议室，并且务必确保摄像头🎥🎥开启。感谢您的配合！🔥`
    copyToClipboard(reminderMessage);
    showLongText(`${reminderMessage}`);
}

export function handleReadClassFeedbackClick() {
    const userName = document.getElementById("userName").value;
    const courseLabel = document.getElementById("courseLabel").textContent.trim();
    const reviewWordCount = document.getElementById("reviewWord").value;
    const newWord = parseInt(document.getElementById("newWord").value);
    const mistakeWords = parseInt(document.getElementById("mistakeWords").value);

    const test = document.getElementById("test").value;
    const mistake = parseInt(document.getElementById("mistake").value)
    const correctRate = ((test - mistake) / test * 100).toFixed(0);

    const feedbacks = [
        "今天表现很棒！上课投入，文章理解透彻，翻译流畅。词汇短语积累有进步，但还可更好。发音要多练，多读提高流畅度，加油！",
        "今天表现超棒！上课专注，理解文章到位，翻译自然。词汇积累有提升，还需多练。注意发音，多读文章，加油！",
        "今天表现优秀！上课认真，文章理解深入，翻译流畅。词汇积累有进步，仍需努力。多练发音，提高流畅度，保持！",
        "今天表现亮眼！上课积极，理解透彻，翻译自然。词汇积累有提升，还需练习。发音多注意，加油！",
        "今天表现出色！上课用心，理解深入，翻译自然。词汇有增加，继续努力。发音多练习，保持下去！",
        "今天表现不错！上课专注，理解透彻，翻译流畅。词汇积累有提升空间。多练发音，加油！",
        "今天表现优秀！上课认真，理解到位，翻译自然。词汇积累有提升，还需加强。多练发音，加油！",
        "今天表现出色！上课投入，理解深入，翻译流畅。词汇积累有提升，仍需努力。多练发音，保持！",
        "今天表现优秀！上课积极，理解深入，翻译自然。词汇增加了，还需努力。注意发音，加油！",
        "今天表现不错！上课认真，理解到位，翻译自然。词汇积累有提升，仍需加强。多练发音，努力！"
    ];
    let feedback = feedbacks[Math.floor(Math.random() * feedbacks.length)]

    // 在生成反馈前，存储课程数据
    const classDateTime = document.getElementById("classDateTime").value;
    if (classDateTime) {
        const classDate = new Date(classDateTime).toISOString().split('T')[0];
        storeClassStatistics(
            userName,
            classDate,
            newWord,
            reviewWordCount,
            1, // 默认1小时
            "阅读完型语法课" // 指定课程类型
        );
    }

    // Generate feedback message
    const feedbackMessage = `【${userName}学习反馈】<br><br>①《${courseLabel}》1篇<br><br>②复习${reviewWordCount} 词，新学${newWord} 词，遗忘${mistakeWords} 词，习题${test}个，错误习题${mistake}个，正确率${correctRate}%💯<br><br>③${userName}⭐${feedback} <br><br><br><br>💟今日寄语💟<br><br>${getRandomMotto()}`
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



