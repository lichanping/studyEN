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
    const greetingMessage = `您好！我是${teacherName}，很⾼兴你们加⼊语⾔集训营，接下来让我们⼀起开启快乐、⾼效的语⾔训练之旅! 在此过程中，我会全程陪伴孩⼦的学习和复习过程，从短暂记忆到永久记忆，从被动接收到主动参与，让我们⼀起⻅证孩⼦的蜕变吧!🌟🌟🌟`;

    copyToClipboard(greetingMessage);
    showLongText(`${greetingMessage}`);
}

export function byeClick(){
    const userName = document.getElementById("userName").value;
    const newWord = parseInt(document.getElementById("newWord").value);
    let message = `${userName}和${userName}妈妈你们好，自体验课之日起，加上连续3天的复习，这边${userName}的英语快速提升的体验课之旅已经到这里结束了，很开心能陪伴${userName}走过这一段学习时光。<br>
${userName}现在已经很棒了，已经完全把上课所学习的${newWord}个单词完全吸收了。
十分感谢家长和${userName}的高度配合，我们正式课见哦！`;
    // Add line breaks
    message = message.replace(/\n/g, '<br>');
    // Copy the message to clipboard
    copyToClipboard(message);
    // Show alert with the generated message
    showLongText(`${message}`);
}

export function handleAntiForgettingFeedbackClick() {
    // Get values from input boxes
    const antiForgettingReviewWord = document.getElementById('antiForgettingReviewWord').value;
    let forgetWords = document.getElementById('forgetWords').value.trim();
    let pronounceWords = document.getElementById('pronounceWords').value.trim();

    const userName = document.getElementById("userName").value;
    const randomFeedback = getRandomFeedback();

    // Count the number of English words
    const numberOfEnglishWords = countEnglishWords(forgetWords);
    const numberOfWrongWords = countEnglishWords(pronounceWords);
    const correctWordsCount = parseInt(antiForgettingReviewWord) - numberOfEnglishWords - numberOfWrongWords
    const correctRate = (correctWordsCount / antiForgettingReviewWord * 100).toFixed(0);
    // Get the input element to display the result
    const inputAntiForgettingForgetWord = document.getElementById("antiForgettingForgetWord");

    // Set the calculated value to the input box
    inputAntiForgettingForgetWord.value = numberOfEnglishWords;
    const antiForgettingForgetWord = document.getElementById('antiForgettingForgetWord').value;

    if (forgetWords.trim().length == 0) {
        forgetWords = " 无!";
    } else {
        forgetWords = `<br>${forgetWords}`;
    }
    if (pronounceWords.trim().length == 0) {
        pronounceWords = " 无!";
    } else {
        pronounceWords = `<br>${pronounceWords}`;
    }

    // Generate the message
    let message = `【${userName} 今日抗遗忘复习反馈】<br>
1. 今日复习 ${antiForgettingReviewWord} 词，遗忘 ${antiForgettingForgetWord} 词， 发音不标准 ${numberOfWrongWords} 词, 正确率 ${correctRate}%。<br>
2. 遗忘词:${forgetWords}<br>
3. 发音不标准的词:${pronounceWords}<br>
4. ${userName} ${randomFeedback}`;

    // Add line breaks
    message = message.replace(/\n/g, '<br>');
    if (numberOfWrongWords > 0) {
        message += `<br><br>${userName}课下继续加强发音哦!`
    }
    // Append random motto
    message += `<br><br><br><br>💟今日寄语💟<br><br>${getRandomMotto()}`;
    // Copy the message to clipboard
    copyToClipboard(message);
    // Show alert with the generated message
    showLongText(`${message}`);
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
        "Children are able to learn more quickly and retain more knowledge than adults. 加油！",
        "Such a nice kid!",
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
        "前路漫漫，勿忘初心<br><br>The road ahead is long and winding; never forget your original intention"
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
