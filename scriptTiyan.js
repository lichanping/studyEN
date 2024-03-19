import {copyToClipboard, getRandomMotto, showAlert} from './commonFunctions.js'
// Attach the function when the page loads
// window.addEventListener("load", copyToClipboard);
const setInitialDateTime = () => {
    const currentDate = new Date();
    currentDate.setHours(15, 0, 0, 0); // Set the time to 21:00 (9 PM)

    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0'); // Months are zero-based
    const day = String(currentDate.getDate()).padStart(2, '0');
    const hours = String(currentDate.getHours()).padStart(2, '0');
    const minutes = String(currentDate.getMinutes()).padStart(2, '0');

    const formattedCurrentDate = `${year}-${month}-${day}T${hours}:${minutes}`;
    document.getElementById("classDateTime").value = formattedCurrentDate;
};

// Attach the function to the "load" event of the window
window.addEventListener("load", setInitialDateTime);

// JavaScript code for the button click functions
export function handleScheduleNotificationClick() {
    const userName = document.getElementById("userName").value;

    // Get the date and time from the input field
    const classDateTime = document.getElementById("classDateTime").value;

    // Create the notification message with the dynamic date and time
    const notificationMessage = `亲爱的 ${userName} 用户您好! 语言体验服务课程时间安排在(${formatDateTime(classDateTime)}) 请提前安排好时间，以下是会议室链接。注意! 请提前下载好【腾讯会议】，我们一起开启语言学习体验之旅! 电脑🖥️、笔记本💻、平板📱都可使用。<br><br>(请提前检查好摄像头，检测好音频。笔记本电脑和平板无需佩戴耳机，台式电脑须佩戴耳机和音响)`;

    copyToClipboard(notificationMessage);
    showAlert(`${notificationMessage}`);
    // Add your function logic here
}

export function handlePreMeetingReminderClick() {
    const userName = document.getElementById("userName").value;

    // Get the date and time from the input field
    const classDateTime = document.getElementById("classDateTime").value;

    // Create the reminder message
    const reminderMessage = `亲爱的 ${userName} 用户和家长，我们的体验服务时间为: ${formatDateTime(classDateTime)}。这是本次的会议链接，请 ${userName} 同学准时进入会议室哦。🎉🎉🎉<br><br>
同时我们需要做好以下陪练前准备:<br><br>
- 给孩子准备平板或者电脑，适当的屏幕和距离有利于保护孩子的眼睛和提升专注力;<br>
- 请提前提前下载好腾讯会议APP，检查好摄像头，检测好音频。笔记本电脑和平板无需佩戴耳机，台式电脑须佩戴耳机和音响;<br>
- 体验服务家长要全程陪伴，但切勿打扰孩子，保持环境安静；<br>
- 因为全程阅读单词，会口渴，给孩子准备一杯温水🚰🚰️哦~感谢配合~`;

    copyToClipboard(reminderMessage);
    showAlert(`${reminderMessage}`);
}

export function handleOnTimeReminderClick() {
    const userName = document.getElementById("userName").value;
    const onTimeReminderMessage = `亲爱的${userName}用户和家长，我们的体验服务马上开始了，请做好准备，及时进入会议室哦~⏰🚀`;

    copyToClipboard(onTimeReminderMessage);
    showAlert(`${onTimeReminderMessage}`);
    // Add your function logic here
}

// JavaScript code for the button click functions
export function handleVocabularyResultClick() {
    const userName = document.getElementById("userName").value;
    const vocabularyCount = document.getElementById("vocabularyCount").value;
    const resultMessage = `${userName}的词汇量检测结果：${vocabularyCount} 🎉🎉🎉`;
    copyToClipboard(resultMessage);
    showAlert(`${resultMessage}`);
    // Add your function logic here
}

// JavaScript code for the button click functions
export function handleClassFeedbackClick() {
    const userName = document.getElementById("userName").value;
    const teacherName = document.getElementById("teacherName").value;
    const newWord = parseInt(document.getElementById("newWord").value) || 30; // Default to 30 if no value entered or invalid
    const forgetWord = parseInt(document.getElementById("forgetWord").value) || 0; // Default to 0 if no value entered or invalid
    const studyTime = parseInt(document.getElementById("studyTime").value) || 30; // Default to 30 if no value entered or invalid

    // Calculate correct rate
    const correctRate = ((newWord - forgetWord) / newWord * 100).toFixed(0);
    const vocabularyCount = document.getElementById("vocabularyCount").value || "XXXX"; // Default to "XXXX" if no value entered

    // Generate feedback message
    const feedbackMessage = `【${userName} 体验课总结】<br>
1.首测词汇量 ${vocabularyCount}。<br>
2.今日新学单词 ${newWord} 词，${forgetWord} 遗忘，正确率 ${correctRate}%，${studyTime} 分钟记住了 ${newWord - forgetWord} 词。<br>
3.${userName}同学上课很积极，状态非常好，配合度很高，注意力集中，做到了 ${correctRate}% 正确，总体来说效果非常好！<br>
"${getRandomMotto()}"🚀🚀🚀`;


    copyToClipboard(feedbackMessage);
    showAlert(`${feedbackMessage}`);
    // Add your function logic here
}

export function handleOpeningSpeechClick() {
    const userName = document.getElementById("userName").value;
    const openingSpeechMessage = `${userName}，${userName}妈妈你们好！<br>可以打开你们的视频吗？<br>同时我也打开我的视频，让我们互相都能看见彼此，这样会感觉更加真实和亲切。`;

    copyToClipboard(openingSpeechMessage);
    showAlert(`${openingSpeechMessage}`);
    // Add your function logic here
}

export function handleUnderstandSituationClick() {
    const userName = document.getElementById("userName").value;
    // const studentLevel = document.querySelector('input[name="studentLevel"]:checked').value;
    const studentLevel = document.getElementById("studentLevel").value;

    let message = "";
    if (studentLevel === "middleHigh") {
        // If student is in 初高中
        message = `${userName}，我想了解一下，你现在几年级了呢?你现在的语言成绩在哪一个阶段呢?那我说三个段,如果对了你只用点头就行，好吗?<br>150 总分:90分以下，90-120，120以上<br>[问]:XX(和XX妈妈)你错的阅读、完型等等这些题目，你觉得错的原因是什么?<br>
[总结]:嗯，好的。其实归根结底是我们单词量不够的原因。如果有这样的一种方法，它能让你一分钟记住一个单词，全程有教练来陪伴学习和陪伴复习，并且全部记住消化不遗忘。你愿不愿意尝试一下?<br>
那我们体验课正式开始吧！`;
    } else if (studentLevel === "primary") {
        // If student is 小学生
        message = `${userName}，我想了解一下，你现在几年级了呢?你考试的时候错题的原因是什么呢?嗯，好的。<br>其实归根结底是我们单词量不够的原因。<br>接下来，我们就一起来尝试一下高效快速地提高我们的单词量，${userName}，${userName}妈妈，那我们体验课正式开始吧!`;
    }

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