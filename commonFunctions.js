// JavaScript code for the button click functions
export function navigateToTiyanClass() {
    window.location.href = "class-trial.html";
}

export function navigateToFormalClass() {
    // Check if the current page is learn-words.html
    if (window.location.pathname.includes("learn-words.html")) {
        const pin = prompt("Enter PIN code to proceed:");
        // Check if the entered PIN matches the expected value
        if (pin === "111") {
            // Navigate to the formal class page
            window.location.href = "index.html";
        } else {
            // Display an error message if the PIN is incorrect
            alert("Incorrect PIN. Please try again.");
        }
    } else {
        // Navigate to the formal class page directly without asking for PIN
        window.location.href = "index.html";
    }
}

export function navigateToLearnWords() {
    window.location.href = "learn-words.html";
}

export function navigateToReadClass() {
    window.location.href = "class-read.html";
}

export function handleCameraWarningClick() {
    const userName = document.getElementById("userName").value;
    const warningMessage = `尊敬的家长，我们注意到 ${userName} 在课堂上未按要求开启摄像头。为了确保学习效果和教学质量，请您督促 ${userName} 在课堂期间按要求操作。感谢您的理解与配合！⚠`;

    copyToClipboard(warningMessage);
    showLongText(`${warningMessage}`);
}

export function handleGroupGreetingClick() {
    const teacherName = document.getElementById("teacherName").value;
    const greetingMessage = `亲爱的家长朋友，您们好！我是${teacherName}，很⾼兴您们加⼊英语快速提升集训营🎉🎉🎉，开启一段快乐、高效的“英语提升之旅”！<br><br>        在此过程中，我会全程陪伴孩⼦进行学新和复习，也会根据学生状态调整上课节奏🐧🕙，从短暂记忆到永久记忆，从被动接收到主动参与，逐渐提高学生的英语能力。💪💪<br><br>        让我们一起努力，⻅证孩子的学习提升和蜕变吧！😉😉😉`;

    copyToClipboard(greetingMessage);
    showLongText(`${greetingMessage}`);
}

// Define an array of 10 sentences
const sentences = [
    "亲爱的${userName}和${userName}妈妈，自体验课开始至今，${userName}的英语快速提升之旅已画下完美句号。感谢你们的陪伴和支持，让这段学习时光充满了温暖和意义。",
    "${userName}和${userName}妈妈你们好，自体验课之日起，加上连续3天的复习，这边${userName}的英语快速提升的体验课之旅已经到这里结束了，很开心能陪伴${userName}走过这一段学习时光。",
    "亲爱的${userName}和家长，感谢你们选择了我们的体验课。在这短短的时间里，${userName}展现出了惊人的学习潜力和积极态度，我们的学习旅程已经圆满结束。",
    "${userName}和${userName}妈妈，感谢你们选择了我们的英语快速提升课程。在这短暂的时间里，${userName}展现了出色的学习能力和积极的学习态度，我们为她的成长感到骄傲。",
    "亲爱的${userName}和家长，自从体验课开始以来，我们一直见证着${userName}的成长和进步。感谢你们的信任和支持，让我们一起度过了这段难忘的学习时光。",
    "${userName}和${userName}妈妈，感谢你们选择了我们的英语快速提升课程。在这段时间里，${userName}展现了出色的学习能力和优秀的学习态度，我们期待在正式课上再次见到你们！",
    "亲爱的${userName}和家长，感谢你们的支持和信任，让我们共同度过了这段美好的学习时光。${userName}已经做得非常棒了，我们期待在正式课上继续与她共同进步。",
    "${userName}和${userName}妈妈，感谢你们选择了我们的英语快速提升课程。${userName}在这段时间里展现了出色的学习能力和积极的学习态度，我们的学习之旅已圆满结束。",
    "亲爱的${userName}和家长，感谢你们的支持和信任，让我们共同度过了这段美好的学习时光。${userName}已经做得非常出色了，我们期待在正式课上继续与她共同进步。",
    "${userName}和${userName}妈妈你们好，自体验课之日起，加上连续3天的复习，这边${userName}的英语快速提升的体验课之旅已经到这里结束了，很开心能陪伴${userName}走过这一段学习时光。期待与你踏上英语学习之旅。"
];

// Function to randomly select one sentence from the array
function getRandomSentence() {
    const userName = document.getElementById("userName").value;
    const newWord = parseInt(document.getElementById("newWord").value);
    var opt = sentences[Math.floor(Math.random() * sentences.length)];
    opt = opt + `<br>👍${userName}现在已经很棒了，已经完全把上课所学习的${newWord}个单词给吸收了。<br><br>👍十分感谢家长和${userName}的高度配合，我们正式课见哦！`
    return opt;
}

export function byeClick() {
    const userName = document.getElementById("userName").value;
    const newWord = parseInt(document.getElementById("newWord").value);
    // Get a random sentence
    const randomSentence = getRandomSentence();
    // Replace placeholders with actual values
    let message = randomSentence.replace(/\${userName}/g, userName).replace(/\${newWord}/g, newWord);
    // Add line breaks
    message = message.replace(/\n/g, '<br>');
    // Copy the message to clipboard
    copyToClipboard(message);
    // Show alert with the generated message
    showLongText(`${message}`);
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
        outputMessage = `【抗遗忘温馨提醒-${hour}:${minute}】<br><br>👍#腾讯会议：988-8340-0582<br><br>温馨提示：<br><br>⏰请准时参加会议，如有特殊情况无法参加，请提前告知！<br><br>㊙️仅在当天有收到提醒通知才需入会<br><br>💝在求知的旅程中，你的每一分努力老师都铭记于心，老师为你骄傲！`;
    }

    copyToClipboard(outputMessage);
    // Display the output message
    showLongText(outputMessage);
}

export function handleAntiForgettingFeedbackClick() {
    // Get values from input boxes
    const antiForgettingReviewWord = Array.from(document.querySelectorAll('.antiForgettingReviewWord'))
        .reduce((sum, input) => sum + (input.value ? parseInt(input.value, 10) : 0), 0);
    let forgetWords = document.getElementById('forgetWords').value.trim();
    let pronounceWords = document.getElementById('pronounceWords').value.trim();
    let keyLanguagePoints = document.getElementById('keyLanguagePoints').value.trim();
    let practiceArea = document.getElementById('practiceArea').value.trim();
    const userName = document.getElementById("userName").value;
    const randomFeedback = getRandomFeedback();

    // Count the number of English words
    const numberOfEnglishWords = countEnglishWords(forgetWords);
    const numberOfWrongWords = countEnglishWords(pronounceWords);
    const correctWordsCount = parseInt(antiForgettingReviewWord) - numberOfEnglishWords
    const correctRate = (correctWordsCount / antiForgettingReviewWord * 100).toFixed(0);
    // Get the input element to display the result
    const inputAntiForgettingForgetWord = document.getElementById("antiForgettingForgetWord");

    // Set the calculated value to the input box
    inputAntiForgettingForgetWord.value = numberOfEnglishWords;
    const antiForgettingForgetWord = document.getElementById('antiForgettingForgetWord').value;

    if (forgetWords.trim().length == 0) {
        forgetWords = " 无!";
    } else {
        forgetWords = '<br>' + forgetWords.split('\n').map(word => `- ${word}`).join('<br>') + '<br>';
    }
    if (pronounceWords.trim().length == 0) {
        pronounceWords = " 无!";
    } else {
        pronounceWords = '<br>' + pronounceWords.split('\n').map(word2 => `- ${word2}`).join('<br>') + '<br>';
    }

    let keyLanguagePointsSection = "";
    let practiceSection = "";

    // If key language points are not empty, assign sequence number 5
    if (keyLanguagePoints.length !== 0) {
        keyLanguagePointsSection = '<br><br>5️⃣重点语言点：<br>' + keyLanguagePoints.split('\n').filter(point => point.trim() !== '').map((point, index) => (index + 1) + '. ' + point).join('<br>') + '<br>';
    }

    // If practice area is not empty, assign sequence number based on keyLanguagePoints
    if (practiceArea.length !== 0) {
        let practiceNumber = keyLanguagePoints.length !== 0 ? '6️⃣' : '5️⃣';
        practiceSection = '<br><br>' + practiceNumber + '语言闯关：<br>' + practiceArea.split('\n').filter(point => point.trim() !== '').map((point, index) => (index + 1) + '. ' + point).join('<br>') + '<br>';
    }

    // Combine both sections
    let combinedContent = keyLanguagePointsSection + practiceSection;
    // Generate the message
    let message = `【${userName} 今日抗遗忘复习反馈】<br>
1️⃣复习${antiForgettingReviewWord} 词，遗忘${antiForgettingForgetWord} 词，发音不标准${numberOfWrongWords} 词，正确率${correctRate}% 💯<br>
2️⃣遗忘词:${forgetWords}<br>
3️⃣发音不标准的词:${pronounceWords}<br>
4️⃣${userName} ${randomFeedback}`;
    // Add key language points if not empty
    if (combinedContent.length > 0) {
        message += combinedContent;
    }
    // Add line breaks
    message = message.replace(/\n/g, '<br>');
    // Append random motto
    if (forgetWords!== " 无!" || pronounceWords!== " 无!"){
        message += `<br><br><br>🎯重要提醒🎯<br><br>${userName}🥰，课后一定要记得练习那些你遗忘或者发音不标准的单词哦💪`;
    }
    else{
        message += `<br><br><br>📚知识小船📚<br><br>${getRandomMotto()}`;
    }
    // Copy the message to clipboard
    copyToClipboard(message);
    // Show alert with the generated message
    showLongText(`${message}`);

    // Store current date and correct rate in a local file
    storeFeedbackInFile(userName, correctRate);
}

// Function to store feedback data (current date and correct rate) in a file
function storeFeedbackInFile(userName, correctRate) {
    // Get the date and time from the reviewTime input field
    const reviewTime = document.getElementById('reviewTime').value; // Retrieve the value (in format: 'YYYY-MM-DDTHH:mm')

    // Check if reviewTime has a valid value (i.e., it is not empty)
    if (!reviewTime) {
        console.error('Review time not selected.');
        return; // Exit the function if no review time is provided
    }

    // Format the date part (e.g., '2024-12-03') from the reviewTime value
    const currentDate = reviewTime.split('T')[0];  // Get only the date part (YYYY-MM-DD)

    // Get the day of the week (e.g., "星期一")
    const dateObj = new Date(currentDate);
    const daysOfWeek = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
    const weekDay = daysOfWeek[dateObj.getDay()];

    // Format content with day of the week
    const content = `${currentDate} (${weekDay}): ${correctRate}%\n`;

    // Create or append to the file in localStorage
    const existingContent = localStorage.getItem(userName) || ''; // Retrieve previous data from local storage
    const updatedContent = existingContent + content;

    // Store the updated content in localStorage (browser's local storage)
    localStorage.setItem(userName, updatedContent);
}

export function downloadFeedbackFile() {
    const userName = document.getElementById("userName").value;
    // Retrieve the stored content from localStorage
    const content = localStorage.getItem(userName);

    // Check if there's any content to download
    if (!content) {
        alert("没有找到数据可供下载！");
        return; // Exit if no content is found
    }

    // Create a Blob with the feedback data
    const blob = new Blob([content], { type: 'text/plain' });

    // Create an anchor element for downloading the file
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${userName}_背单词正确率统计.txt`; // Use the username as the filename

    // Trigger a click event to download the file
    link.click();
}

export function getRandomFeedback() {
    const attentionLevels = [
        '很认真', '非常专注', '表现很好', '注意力集中',
        '态度认真', '专心致志', '非常投入', '学习态度端正',
        '聚精会神', '全神贯注', '投入程度很高', '尽心尽力',
        '专注度满分', '全身心投入', '严谨认真', '一丝不苟'
    ];

    const classEfficiency = [
        '十分高效', '效果显著', '学习效率很高', '效果优秀',
        '表现卓越', '取得显著进步', '学得非常好', '表现优异',
        '事半功倍', '迅速掌握', '成绩斐然',
        '高效学习', '进步神速'
    ];

    const randomAttention = attentionLevels[Math.floor(Math.random() * attentionLevels.length)];
    const randomEfficiency = classEfficiency[Math.floor(Math.random() * classEfficiency.length)];

    return `同学${randomAttention}，整节课注意力都很在线，我们的课堂也${randomEfficiency}！要继续保持哦!`;
}

export function copyToClipboard(text) {
    const filteredText = text.replace(/<br><br>/g, '\n').replace(/<br>/g, '\n');
    const textarea = document.createElement('textarea');
    textarea.value = filteredText;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
}

export function showAlert(message) {
    Swal.fire({
        html: `<div style="height: 500px; overflow-y: auto; text-align: left;">${message}</div>`, // Adjust the height as needed
        confirmButtonText: 'OK',
        allowOutsideClick: false,
        heightAuto: false,  // Prevent auto height adjustment
    });
}

export function showLongText(longText) {
    const textElement = document.createElement('div');
    textElement.innerHTML = longText;
    textElement.classList.add('long-text');
    document.body.appendChild(textElement);
    setTimeout(() => {
        textElement.style.opacity = '0'; // Set opacity to make it invisible
        setTimeout(() => {
            textElement.remove(); // Remove the text after hiding
        }, 300); // Adjust the timing of removal as needed (300 milliseconds in this case)
    }, 2000); // Adjust the timing of visibility as needed (2000 milliseconds in this case)
}

export function getRandomMotto() {
    // Replace the following array with your own collection of mottos
    const mottos = [
        "One clap: You’re great! Two claps: You’re awesome! Three claps: You’re the best!<br><br>一个赞：你很棒！两个赞：你真棒！三个赞：你最棒！",
        "Wonderful, keep it up! Every success is built upon a foundation of consistent effort!<br><br>很棒，坚持！每个成功后面都有着厚积薄发的过程！",
        "Received the record of your efforts! Applause to the best version of you, making progress bit by bit. Great job!<br><br>收到宝贝的打卡啦，掌声送给最棒的你，正在一点一点的进步，很棒哦！",
		"Every effort and persistence from you will not be in vain!<br><br>宝贝的每一次努力和坚持都不会被辜负！",
		"You’re amazing! Such effort and determination make me truly proud of you!<br><br>你真行！这么努力，这么执着，真为你感到骄傲！",
		"Your performance is outstanding; you are the best!<br><br>你的表现很出色，你就是最棒的！",
		"You’re progressing so fast, I’m genuinely happy for you!<br><br>你进步的真快，太为你感到开心啦！",
		"I love seeing your hard-working spirit and look forward to seeing you take another step forward tomorrow!<br><br>我喜欢你努力的样子，期待明天的你更进一步！",
		"Your recent training has been so dedicated, I’m cheering for you!<br><br>最近训练很认真，我疯狂为你点赞！",
		"Here’s a little flower for you, as a reward for all your hard work!<br><br>送你一朵小花花，奖励努力的你！",
        "Through continuous efforts, I believe you will become more and more amazing!<br><br>通过一次次努力相信你一定会越来越棒的！",
        "I hope every effort you make becomes a stroke of luck. Keep it up!<br><br>希望你的每一次努力，都是幸运的伏笔，加油！",
        "With hard work, you've perfectly completed your training goal once again!<br><br>经过努力，你又一次完美地完成了训练目标！",
        "You are always so confident; I'm so proud of you!<br><br>你永远那么自信，真为你自豪！",
        "You always bring me surprises. You're truly amazing!<br><br>你总是可以给我带来惊喜，真的太棒啦！",
        "Keep trying hard; success will definitely be yours!<br><br>你尽管努力，成功一定属于你！",
        "Believe that you are the brightest star!<br><br>相信你就是最亮的那颗星星！",
        "When you're serious, you shine!<br><br>认真起来的你闪闪发光！",
        "Dedication will lead to rewards. I look forward to seeing an even better you!<br><br>用心一定会有收获，期待看到更棒的你！",
        "Kudos to you for completing your daily tasks so diligently! You’re truly the best!<br><br>表扬每天都认真完成打卡的你，收获满满，你就是最棒的！",
        "Life is a journey, and if you fall in love with the journey, you will be in love forever.<br><br>生活是一场旅程，如果你爱上了这场旅程，你将永远热爱。",
        "Uncertainty is the only certainty there is, and knowing how to live with insecurity is the only security.<br><br>不确定性是唯一确定的，知道如何与不安全感共处是唯一的安全感。",
        "In a time of drastic change it is the learners who inherit the future. The learned usually find themselves equipped to live in a world that no longer exists.<br><br>在剧烈变化的时代，是学习者继承未来。有学识的人通常发现自己准备好生活在一个不再存在的世界里。",
        "Change is the law of life. And those who look only to the past or present are certain to miss the future.<br><br>变化是生活的法则。那些只看过去或现在的人肯定会错过未来。",
        "The future belongs to those who believe in the beauty of their dreams.<br><br>未来属于那些相信他们梦想之美的人。",
        "No pains,no gains.<br><br>不劳则无获。",
        "Rome was not built in a day.<br><br>罗马不是一天建成的。/伟业非一日之功。",
        "Practice makes perfect.<br><br>熟能生巧。",
        "It's never too old to learn.<br><br>活到老，学到老。",
        "A good beginning is half done.<br><br>好的开始是成功的一半。",
        "Easier said than done.<br><br>说起来容易做起来难。",
        "Actions speak louder than words.<br><br>行胜于言。",
        "A journey of a thousand miles begins with a single step.<br><br>千里之行，始于足下。",
        "All roads lead to Rome.<br><br>条条大路通罗马。",
        "No man can do two things at once.<br><br>一心不可二用。",
        "Where there is a will,there is a way.<br><br>有志者，事竟成。",
        "God helps those who help themselves.<br><br>自助者天助之。",
        "Time and tide wait for no man.<br><br>时不我待。",
        "A friend in need is a friend indeed.<br><br>患难见真情。",
        "An apple a day keeps the doctor away.<br><br>一天一苹果，医生远离我。",
        "Laughter is the best medicine.<br><br>笑是最好的药。",
        "An hour in the morning is worth two in the evening.<br><br>一日之计在于晨。",
        "Every coin has two sides.<br><br>凡事皆有两面性。",
        "When in Rome,do as the Romans do.<br><br>入乡随俗。",
        "Every day is a new opportunity to learn and grow. Keep pushing forward!<br><br>每一天都是学习和成长的新机会。继续前进！",
        "May your kindness and positivity shine bright today and always!<br><br>愿你的善良和积极态度今天和永远闪耀光芒！",
        "Wishing you the courage to pursue your dreams and the strength to overcome any obstacles in your path.<br><br>祝你勇气去追逐梦想，力量去克服路上的任何障碍。",
        "Believe in yourself and your abilities. You have the power to achieve amazing things!<br><br>相信自己和自己的能力。你有能力实现不可思议的事情！",
        "Sending you warm wishes for a day filled with joy, laughter, and endless possibilities.<br><br>送上温暖的祝福，愿你的一天充满快乐、笑声和无限可能。",
        "Never underestimate the impact of a small act of kindness. Spread love wherever you go!<br><br>永远不要低估一次小小善举的影响力。无论何时何地，传播爱心！",
        "Embrace each moment with gratitude and appreciation. Life is a precious gift.<br><br>怀着感恩和欣赏之心拥抱每一刻。生命是一份珍贵的礼物。",
        "Challenges are opportunities in disguise. Keep a positive attitude and tackle them head-on!<br><br>挑战是伪装的机遇。保持积极态度，直面挑战！",
        "May your day be filled with moments that make your heart smile and your soul sing.<br><br>愿你的一天充满让心灵微笑、灵魂欢歌的时刻。",
        "Remember to take care of yourself today. Your well-being is important, too!<br><br>记得今天要好好照顾自己。你的健康也很重要！",
        "祝好运、健康、欢乐伴你度过一个快乐每一年。<br><br>Good luck, good health, good cheer. l wish you a happy every Year.",
        "知识改变命运<br><br>Knowledge changes destiny",
        "坚持就是胜利<br><br>Persistence is victory",
        "学无止境<br><br>Learning knows no bounds",
        "心有多大，舞台就有多大<br><br>As big as your heart is, so is the stage",
        "吹灭读书灯，一身都是月<br><br>Blow out the lamp of study, and a whole body is lit by the moon",
        "路漫漫其修远兮，吾将上下而求索<br><br>The road ahead is long and winding; I will seek my way up and down",
        "千里之行，始于足下<br><br>A journey of a thousand miles begins with a single step",
        "世间美好，皆源于心<br><br>The beauty of the world all comes from the heart",
        "宝剑锋从磨砺出，梅花香自苦寒来<br><br>The sword is sharpened from grinding, and the fragrance of the plum blossom comes from the bitter cold",
        "天行健，君子以自强不息<br><br>The sky is healthy; gentlemen should always strive for self-improvement",
        "有志者事竟成，破釜沉舟，百二秦关终属楚<br><br>Where there is a will, there is a way; burning boats and breaking cauldrons, after a hundred battles, Qin Pass belongs to Chu",
        "不经一番寒彻骨，怎得梅花扑鼻香<br><br>Without going through the cold to the bone, how can one enjoy the fragrance of plum blossoms",
        "若要人悦，莫若草木之茂<br><br>If you want people to be pleased, it's best to be as lush as grass and trees",
        "心有多大，舞台就有多大；梦有多远，路就有多远<br><br>As big as your heart is, so is the stage; as far as your dreams go, so goes the road",
        "世上无难事，只要肯攀登<br><br>There is nothing difficult in the world as long as you are willing to climb",
        "百折不挠，金石可镂<br><br>Perseverance can carve through metal and stone",
        "天行健，君子以自强不息<br><br>The sky is healthy; gentlemen should always strive for self-improvement",
        "莫问前程有多远，道路漫漫谁执鞭<br><br>Do not ask how far the future is; on the long road, who holds the reins",
        "勿以善小而不为，勿以恶小而为之<br><br>Do not fail to do good because it seems trivial; do not do evil because it seems trivial",
        "少壮不努力，老大徒伤悲<br><br>A young man who does not work hard will suffer in his old age",
        "踏遍青山人未老，风景这边独好<br><br>Travel through the mountains while young; the scenery here is unique",
        "夙愿必胜，坚持不懈<br><br>Morning wishes will surely win with persistence",
        "学海无涯，勇攀高峰<br><br>The sea of learning has no horizon; bravely climb the peaks",
        "行路漫漫，勇者无畏<br><br>The road ahead is long and winding; the brave have no fear",
        "勤奋如雨，润物无声<br><br>Diligence falls like rain, silently nurturing",
        "热爱生活，生活也会热爱你<br><br>Love life, and life will love you back",
        "每一次努力都是一次收获<br><br>Every effort is a harvest",
        "坚信自己，勇往直前<br><br>Believe in yourself and move forward bravely",
        "自律之路，一步一个脚印<br><br>The road of self-discipline, one step at a time",
        "岁月静好，唯有努力不懈<br><br>The years are peaceful, only with unremitting efforts",
        "阳光总在风雨后<br><br>The sun always shines after the storm",
        "前路漫漫，勿忘初心<br><br>The road ahead is long and winding; never forget your original intention",
        "在人生的旅程中，勇敢前行，迎接挑战，创造奇迹。<br><br>Embrace the journey of life, move forward bravely, face challenges, and create miracles.",
        "相信自己的内在力量，你拥有无限的潜能。<br><br>Believe in your inner strength, you have unlimited potential.",
        "勇敢地追求你的梦想，即使道路曲折，也要坚持不懈。<br><br>Pursue your dreams bravely, even if the road is winding, persevere.",
        "在困难面前不退缩，因为你的坚韧会迎接挑战。<br><br>Do not shrink back in the face of difficulties, because your resilience will meet the challenge.",
        "学会欣赏生活中的美好，感恩每一个来之不易的时刻。<br><br>Learn to appreciate the beauty in life, be grateful for every precious moment.",
        "用爱心和善意装饰你的日常生活，创造美好的回忆。<br><br>Adorn your daily life with love and kindness, create beautiful memories.",
        "坚持不懈，直至成功。在每一步都迈得更近。<br><br>Persist until success. Take one step closer with each step.",
        "勇敢地跨出舒适区，探索未知的领域，拥抱成长的机会。<br><br>Bravely step out of your comfort zone, explore the unknown, embrace growth opportunities.",
        "用心灵的眼睛看世界，你会发现无限的可能性。<br><br>See the world with the eyes of your heart, you will discover infinite possibilities.",
        "每一次失败都是一次学习的机会，让它们成为你成功的台阶。<br><br>Every failure is an opportunity to learn, let them become the steps to your success.",
        "热情与决心将引领你走向成功的道路，不断前行，永不放弃。<br><br>Passion and determination will lead you to the path of success, keep moving forward, never give up.",
        "用积极的态度面对生活中的挑战，你会发现自己拥有无限的力量。<br><br>Face the challenges in life with a positive attitude, you will find yourself with infinite strength.",
        "每一次努力都是一次成长，每一次挑战都是一次进步。<br><br>Every effort is a growth, every challenge is a progress.",
        "勇敢地迎接未来的挑战，因为你拥有充足的能力去应对一切。<br><br>Bravely embrace the challenges of the future, because you have the ability to deal with everything.",
        "坚持追求自己的梦想，即使前方是未知的道路，也要勇敢前行。<br><br>Persist in pursuing your dreams, even if the road ahead is unknown, keep moving forward bravely."
    ];

    const randomIndex = Math.floor(Math.random() * mottos.length);
    return mottos[randomIndex];
}


export function countEnglishWords(text) {
    const wordsArray = extractEnglishWords(text)
    const len = wordsArray.length;
    return len;
}

function extractEnglishWords(text) {
    const wordsArray = text.split(/\r?\n/).filter(element => element);
    return wordsArray;
}

export function displayToast(message) {
    // Create a toast element
    const toast = document.createElement('div');
    toast.classList.add('toast');
    toast.textContent = message;

    // Append toast to the document body
    document.body.appendChild(toast);

    // Automatically remove toast after 3 seconds
    setTimeout(() => {
        toast.remove();
    }, 3000);
}
