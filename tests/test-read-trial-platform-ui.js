const assert = require('assert');
const fs = require('fs');
const path = require('path');

function read(fileName) {
    return fs.readFileSync(path.join(__dirname, '..', fileName), 'utf8');
}

const formalHtml = read('index.html');
const readHtml = read('class-read.html');
const trialHtml = read('class-trial.html');
const commonFunctions = read('commonFunctions.js');
const readJs = read('classRead.js');
const trialJs = read('classTrial.js');
const expectedSelfReviewMessage = '📚 今日作业布置（必做）<br><br>1. 笔头作业：打印【每日单词表】，看中文版写英文，看英文版写中文；对照批改后拍照发群打卡。建议每天练1遍，落实会拼会写。<br><br>2. 口头作业：新学单词大声朗读2遍，录音或视频发群打卡。<br><br>⏰ 截止：今晚22:20前<br>📌 复习规则：坚持21天抗遗忘复习，做到看到英文会读、知道中文；当天遗忘的单词及时加入生词本巩固。<br>☀️ 继续加油，坚持会更有收获。';

assert(
    readHtml.includes('id="platformSelect"'),
    'class-read.html 应提供平台切换下拉框'
);

assert(
    trialHtml.includes('id="platformSelect"'),
    'class-trial.html 应提供平台切换下拉框'
);

assert(
    readJs.includes('getCurrentPlatformId') && readJs.includes('entry?.platform'),
    'classRead.js 应按当前平台过滤排课学生'
);

assert(
    trialJs.includes('getCurrentPlatformId') && trialJs.includes('entry?.platform'),
    'classTrial.js 应按当前平台过滤排课学生'
);

assert(
    !trialJs.includes('希望你喜欢李校来啦这个平台'),
    'classTrial.js 抗遗忘话术不应硬编码平台名'
);

assert(
    formalHtml.includes('commonFunctions.selfReviewClick'),
    '正式课页的课后复习方式按钮应复用 commonFunctions.selfReviewClick'
);

assert(
    readHtml.includes('commonFunctions.selfReviewClick'),
    '阅读课页的课后复习方式按钮应复用 commonFunctions.selfReviewClick'
);

assert(
    trialHtml.includes('commonFunctions.selfReviewClick'),
    '体验课页的课后复习方式按钮也应复用 commonFunctions.selfReviewClick，避免文案分叉'
);

assert(
    commonFunctions.includes(expectedSelfReviewMessage),
    'commonFunctions.selfReviewClick 应与确认后的作业布置文案完全一致，包含空白行'
);

assert(
    commonFunctions.includes("text.replace(/<br><br>/g, '\\n\\n').replace(/<br>/g, '\\n')"),
    'copyToClipboard 应保留 <br><br> 对应的空白行，避免截止时间前的空行丢失'
);

assert(
    !trialJs.includes('体验课】3次抗遗忘复习'),
    '体验课页不应继续保留单独的旧版课后复习文案'
);

console.log('test-read-trial-platform-ui passed');
