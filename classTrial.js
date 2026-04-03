import {copyToClipboard, getRandomMotto, showAlert, showLongText, storeClassStatistics, validateBeforeClassFeedbackSubmit} from './commonFunctions.js'
// Attach the function when the page loads
// window.addEventListener("load", copyToClipboard);
const setInitialDateTime = () => {
    const currentDate = new Date();
    currentDate.setHours(16, 0, 0, 0); // Set the time to 21:00 (9 PM)

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

// JavaScript code for the button click functions
export function handleScheduleNotificationClick() {
    const userName = document.getElementById("userName").value;

    // Get the date and time from the input field
    const classDateTime = document.getElementById("classDateTime").value;

    // Create the notification message with the dynamic date and time
    const notificationMessage = `【体验课-${formatDateTime(classDateTime)}】<br><br>亲爱的 ${userName} 用户您好!<br><br>我们为您安排的语言体验课程即将到来，请提前做好时间安排。以下是您的会议室链接：<br><br>#腾讯会议：762-3777-6304<br><br>🔔 温馨提醒：<br><br>- 请提前下载并安装【腾讯会议】应用，方便顺利进入课堂。 <br><br>- 电脑🖥️、笔记本💻、平板📱都可使用。<br><br>- 请提前检查 摄像头 和 音频设备，确保它们正常工作。台式电脑用户请务必佩戴耳机和音响。<br><br>我们期待与您一起开启这段精彩的语言学习体验之旅！`;

    copyToClipboard(notificationMessage);
    showLongText(`${notificationMessage}`);
    // Add your function logic here
}

export function handlePreMeetingReminderClick() {
    const userName = document.getElementById("userName").value;

    // Get the date and time from the input field
    const classDateTime = document.getElementById("classDateTime").value;

    // Create the reminder message
    const reminderMessage = `亲爱的 ${userName} 用户和家长，我们的体验服务时间为: ${formatDateTime(classDateTime)}。请 ${userName} 同学准时进入会议室哦。🎉🎉🎉<br><br>
同时我们需要做好以下陪练前准备:
- 给孩子准备平板或者电脑，适当的屏幕和距离有利于保护孩子的眼睛和提升专注力;
- 请提前提前下载好腾讯会议APP，检查好摄像头，检测好音频。笔记本电脑和平板无需佩戴耳机，台式电脑须佩戴耳机和音响;
- 体验服务家长要全程陪伴，但切勿打扰孩子，保持环境安静；
- 因为全程阅读单词，会口渴，给孩子准备一杯温水🚰🚰️哦~感谢配合~<br>
上课地址如下：
#腾讯会议：762-3777-6304`;

    copyToClipboard(reminderMessage);
    showLongText(`${reminderMessage}`);
}

export function handleOnTimeReminderClick() {
    const userName = document.getElementById("userName").value;
    const onTimeReminderMessage = `亲爱的${userName}用户和家长，我们的体验服务马上开始了，请做好准备，及时进入会议室哦~⏰🚀`;

    copyToClipboard(onTimeReminderMessage);
    showLongText(`${onTimeReminderMessage}`);
    // Add your function logic here
}

// JavaScript code for the button click functions
export function handleVocabularyResultClick() {
    const userName = document.getElementById("userName").value;
    const vocabularyCount = document.getElementById("vocabularyCount").value;
    const resultMessage = `${userName}的词汇量检测结果：${vocabularyCount} 🎉🎉🎉`;
    copyToClipboard(resultMessage);
    showLongText(`${resultMessage}`);
}

export function selfReviewClick() {
    const feedbackMessage = `*课后复习方式：<br><br>1️⃣.教练带动进行【体验课】3次抗遗忘复习（解决"两会" ：看到英文会读，看到英文知道中文意思）<br><br>2️⃣.家长和学生需将【每日单词表】打印出来，家长打印中文版，让学生书写英文；打印英文版，学生填写中文，家长及学员对应中英文版进行批改，并以拍照的方式发送到群里进行打卡（解决另外"两会" ：会拼会写），建议每天写一遍。<br><br>3️⃣.对于当日抗遗忘复习单词中遗忘的部分，也要加入"生词本"进行重点复习。`
    copyToClipboard(feedbackMessage);
    showLongText(`${feedbackMessage}`);
}

// JavaScript code for the button click functions
export async function handleClassFeedbackClick() {
    // 排课校验（体验课）
    const canSubmit = await validateBeforeClassFeedbackSubmit("体验课");
    if (!canSubmit) {
        return;
    }

    const userName = document.getElementById("userName").value;
    const teacherName = document.getElementById("teacherName").value;
    const newWord = parseInt(document.getElementById("newWord").value) || 30;
    const forgetWord = parseInt(document.getElementById("forgetWord").value) || 0;
    const studyTime = parseInt(document.getElementById("studyTime").value) || 30;
    const inputText = document.getElementById('preTestWord').value.replace(/\s/g, ''); // 移除所有空格

    // 添加classDateTime获取
    const classDateTime = document.getElementById("classDateTime").value;

    // Default value is 0 if input is empty
    let preTestWord = inputText ? inputText.split('+').reduce((sum, num) => {
        // Parse the integer and add to sum, default to 0 if NaN
        const parsedNum = parseInt(num, 10);
        return sum + (isNaN(parsedNum) ? 0 : parsedNum);
    }, 0) : 0;
    // Calculate correct rate
    const correctRate = ((newWord - forgetWord) / newWord * 100).toFixed(0);
    const vocabularyCount = document.getElementById("vocabularyCount").value || "XXXX"; // Default to "XXXX" if no value entered

    // Generate feedback message
    const feedbackMessage = `【${userName} 体验课总结】<br>
1. 首测词汇量${vocabularyCount}。
2. 新学${newWord} 词，遗忘${forgetWord} 词，正确率 ${correctRate}%（学前检测${preTestWord} 词）。
3. ${userName}在${studyTime} 分钟内记住了${newWord - forgetWord} 词 (从开始识记到学后检测)，上课很积极，状态非常好，配合度很高，注意力集中，做到了${correctRate}% 正确，总体来说效果非常好！<br><br><br><br>📚知识小船📚
${getRandomMotto()}`;

    copyToClipboard(feedbackMessage);
    showLongText(`${feedbackMessage}`);

    if (classDateTime) {
        const classDate = new Date(classDateTime).toISOString().split('T')[0];
        // 体验课固定1小时，单价40元
        storeClassStatistics(userName, classDate, newWord, 0, 1, "体验课");
    } else {
        alert("请选择有效的课程时间");
    }
}


export function handleUnderstandSituationClick() {
    const userName = document.getElementById("userName").value;
    // const studentLevel = document.querySelector('input[name="studentLevel"]:checked').value;
    const studentLevel = document.getElementById("studentLevel").value;

    let message = "";
    if (studentLevel === "middleHigh") {
        // If student is in 初高中
        message = `${userName}，我想了解一下，你现在几年级了呢?你现在的语言成绩在哪一个阶段呢?那我说三个段,如果对了你只用点头就行，好吗?<br>150 总分:90分以下，90-120，120以上<br>[问]:XX(和XX妈妈)丢分最主要是在哪些题型：阅读，基础句子填空<br>[问]:你错的阅读、完型等等这些题目，你觉得错的原因是什么?<br>
[总结]:嗯，好的。其实归根结底是我们单词量不够的原因。如果有这样的一种方法，它能让你一分钟记住一个单词，全程有教练来陪伴学习和陪伴复习，并且全部记住消化不遗忘。你愿不愿意尝试一下?<br>
那我们体验课正式开始吧！`;
    } else if (studentLevel === "primary") {
        // If student is 小学生
        message = `${userName}，我想了解一下，你现在几年级了呢?你考试的时候错题的原因是什么呢?嗯，好的。<br>其实归根结底是我们单词量不够的原因。<br>接下来，我们就一起来尝试一下高效快速地提高我们的单词量，${userName}，${userName}妈妈，那我们体验课正式开始吧!`;
    }

    copyToClipboard(message);
    showAlert(`${message}`);
}

export function handleAntiForgettingSpeechClick() {
    const userName = document.getElementById("userName").value;
    const studyTime = document.getElementById("studyTime").value || 40;
    const newWord = parseInt(document.getElementById("newWord").value) || 30;
    const forgetWord = parseInt(document.getElementById("forgetWord").value) || 0;
    let message = `好的，那我们今天的体验之旅就到此结束啦。<br>${userName}今天的表现非常棒哦！<br>在${studyTime}分钟内就记住了${newWord - forgetWord}个单词，专注且高效，为你点赞！<br>希望你喜欢李校来啦这个平台，也<span style="color:red; font-weight:bold;">对我今天的陪伴服务感到满意</span>，相信你在持续使用这个产品的过程中，还能得到更大的提升！<br>加油！<br>接下来我们会有连续三天的抗遗忘复习，我也会陪伴你完成，${userName}什么时间方便来进行抗遗忘呢。<br>期待下次的见面哦，拜拜！<br>`;
    copyToClipboard(message);
    showAlert(`${message}`);
}

// Function to display the message before the vocabulary test
export function startVocabularyTest() {
    showAlert("在开始体验之前，我们先做一个系统的词汇量检测吧!<br>这样我可以更好地了解你的真实情况，才能更好地帮助你。<br>点击【开始】后，每个单词有10秒的思考时间，系统说英文，你说英文+中文，你认识就直接告诉我它的意思，不知道就说不知道。<br>好，我们现在开始吧!<br>（系统声音不分享或太低，教练清晰代读）");
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