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
    commonFunctions.includes('📚 课后复习安排') &&
    commonFunctions.includes('1. 今日笔头作业（必做）') &&
    commonFunctions.includes('2. 今日口头作业') &&
    commonFunctions.includes('打印【每日单词表】') &&
    commonFunctions.includes('新学单词大声朗读2遍') &&
    commonFunctions.includes('坚持21天抗遗忘复习') &&
    commonFunctions.includes('两项作业都要完成') &&
    commonFunctions.includes('截止：今晚22:20前'),
    'commonFunctions.selfReviewClick 应提供统一且精简的课后复习文案，并将21天抗遗忘复习放到最后作为规则'
);

assert(
    !trialJs.includes('体验课】3次抗遗忘复习'),
    '体验课页不应继续保留单独的旧版课后复习文案'
);

console.log('test-read-trial-platform-ui passed');
