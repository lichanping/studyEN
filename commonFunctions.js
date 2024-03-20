// JavaScript code for the button click functions
export function navigateToTiyanClass(){
    window.location.href = "tiyanClass.html";
}

export function navigateToFormalClass(){
    window.location.href = "index.html";
}

export function handleGroupGreetingClick() {
    const teacherName = document.getElementById("teacherName").value;
    const greetingMessage = `您好！我是${teacherName}，很⾼兴你们加⼊语⾔集训营，接下来让我们⼀起开启快乐、⾼效的语⾔训练之旅! 在此过程中，我会全程陪伴孩⼦的学习和复习过程，从短暂记忆到永久记忆，从被动接收到主动参与，让我们⼀起⻅证孩⼦的蜕变吧!🌟🌟🌟`;

    copyToClipboard(greetingMessage);
    showAlert(`${greetingMessage}`);
}

export function handleAntiForgettingFeedbackClick() {
    // Get values from input boxes
    const antiForgettingReviewWord = document.getElementById('antiForgettingReviewWord').value;
    let forgetWords = document.getElementById('forgetWords').value;
    let pronounceWords = document.getElementById('pronounceWords').value;

    const userName = document.getElementById("userName").value;
    const randomFeedback = getRandomFeedback();

    // Count the number of English words
    const numberOfEnglishWords = countEnglishWords(forgetWords);
    const numberOfWrongWords = countEnglishWords(pronounceWords);

    // Get the input element to display the result
    const inputAntiForgettingForgetWord = document.getElementById("antiForgettingForgetWord");

    // Set the calculated value to the input box
    inputAntiForgettingForgetWord.value = numberOfEnglishWords;
    const antiForgettingForgetWord = document.getElementById('antiForgettingForgetWord').value;

    if (forgetWords.trim().length == 0){
        forgetWords=" 无!" ;
    }
    else{forgetWords=`<br>${forgetWords}`;
    }
    if (pronounceWords.trim().length == 0){
        pronounceWords=" 无!" ;
    }
    else{pronounceWords=`<br>${pronounceWords}`;
    }

    // Generate the message
    let message = `【${userName} 今日抗遗忘复习反馈】<br>
1. 今日复习 ${antiForgettingReviewWord} 词，遗忘 ${antiForgettingForgetWord} 词， 发音不标准 ${numberOfWrongWords} 词。<br>
2. 遗忘词:${forgetWords}<br>
3. 发音不标准的词:${pronounceWords}<br>
4. ${userName} ${randomFeedback}`;

    // Add line breaks
    message = message.replace(/\n/g, '<br>');
    message += `<br><br>${userName}课下继续加强发音哦!`
    // Append random motto
    message += `<br><br>"${getRandomMotto()}" 💖✨`;
    // Copy the message to clipboard
    copyToClipboard(message);
    // Show alert with the generated message
    showAlert(`${message}`);
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
        html: `<div style="height: 420px; overflow: hidden; text-align: left;">${message}</div>`,
        confirmButtonText: 'OK',
        allowOutsideClick: false,
        heightAuto: false,  // Prevent auto height adjustment
    });
}

export function getRandomMotto() {
    // Replace the following array with your own collection of mottos
    const mottos = [
        "知识改变命运",
        "坚持就是胜利",
        "学无止境",
        "心有多大，舞台就有多大",
        "吹灭读书灯，一身都是月",
        "路漫漫其修远兮，吾将上下而求索",
        "千里之行，始于足下",
        "世间美好，皆源于心",
        "宝剑锋从磨砺出，梅花香自苦寒来",
        "天行健，君子以自强不息",
        "有志者事竟成，破釜沉舟，百二秦关终属楚",
        "不经一番寒彻骨，怎得梅花扑鼻香",
        "若要人悦，莫若草木之茂",
        "心有多大，舞台就有多大；梦有多远，路就有多远",
        "世上无难事，只要肯攀登",
        "百折不挠，金石可镂",
        "天行健，君子以自强不息",
        "莫问前程有多远，道路漫漫谁执鞭",
        "勿以善小而不为，勿以恶小而为之",
        "抛弃时光的人，时光亦抛弃他",
        "少壮不努力，老大徒伤悲",
        "踏遍青山人未老，风景这边独好",
        "夙愿必胜，坚持不懈",
        "学海无涯，勇攀高峰",
        "行路漫漫，勇者无畏",
        "勤奋如雨，润物无声",
        "热爱生活，生活也会热爱你",
        "每一次努力都是一次收获",
        "坚信自己，勇往直前",
        "自律之路，一步一个脚印",
        "岁月静好，唯有努力不懈",
        "阳光总在风雨后",
        "前路漫漫，勿忘初心"
    ];

    const randomIndex = Math.floor(Math.random() * mottos.length);
    return mottos[randomIndex];
}



function countEnglishWords(text) {
    const wordsArray = extractEnglishWords(text)
    const len = wordsArray.length;
    return len;
}

function extractEnglishWords(text) {
    const wordsArray = text.split(/\r?\n/).filter(element => element);
    return wordsArray;
}


