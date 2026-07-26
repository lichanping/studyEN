const assert = require('assert');
const fs = require('fs');
const path = require('path');

function read(fileName) {
    return fs.readFileSync(path.join(__dirname, '..', fileName), 'utf8');
}

const formalHtml = read('index.html');
const classFormalContent = read('classFormal.js');
const readHtml = read('class-read.html');
const trialHtml = read('class-trial.html');
const commonFunctions = read('commonFunctions.js');
const readJs = read('classRead.js');
const trialJs = read('classTrial.js');
const meetingConfig = read('meeting-config.js');
const expectedSelfReviewMessage = '📚 今日作业布置（必做）<br>1. 笔头作业：打印【每日单词表】，看中文版写英文，看英文版写中文；对照批改后拍照发群打卡。建议每天练1遍，落实会拼会写。<br>2. 口头作业：新学单词大声朗读2遍，录音或视频发群打卡。<br><br>⏰ 截止：今晚22:20前<br>📌 复习规则：坚持21天抗遗忘复习，做到看到英文会读、知道中文；当天遗忘的单词及时加入生词本巩固。<br>☀️ 继续加油，坚持会更有收获。';

assert(
    readHtml.includes('id="platformSelect"'),
    'class-read.html 应提供平台切换下拉框'
);

assert(
    trialHtml.includes('id="platformSelect"'),
    'class-trial.html 应提供平台切换下拉框'
);

assert(
    trialHtml.includes('id="classDuration"')
        && trialHtml.includes('value="0.5"')
        && trialHtml.includes('value="1"'),
    'class-trial.html 提交课堂反馈前应支持输入体验课时长（0.5/1小时）'
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
    classFormalContent.includes('initPlatformSelector();')
        && classFormalContent.includes('updateUserNameOptions();')
        && classFormalContent.includes('setInitialDateTime();'),
    'classFormal.js 页面加载时应初始化平台选择器、学员列表与默认上课时间，避免页面显示的平台与提交/排课校验读取的平台脱节'
);

assert(
    classFormalContent.includes('platformSelect")?.value')
        && readJs.includes('platformSelect")?.value')
        && trialJs.includes('platformSelect")?.value')
        && meetingConfig.includes('platformSelect")?.value'),
    '正式课/阅读课/体验课及全局平台配置读取当前平台时，应优先使用页面上当前 platformSelect 的值，避免视觉平台与 localStorage 脱节'
);

assert(
    classFormalContent.includes('const currentPlatformId = getCurrentPlatformId();')
        && classFormalContent.includes('const shouldConfirmNewWordReplacement = currentPlatformId === DEFAULT_PLATFORM_ID && newWordCountFromText !== newWord;')
        && !classFormalContent.includes('if (newWordCountFromText !== newWord) {'),
    'classFormal.js 正式课新学词数自动替换提示应仅在李校平台触发，百分缔和麦穗应保留手动输入数量'
);

assert(
    commonFunctions.includes('export function formatLocalDateYmd')
        && commonFunctions.includes('export function parseLocalDateYmd')
        && classFormalContent.includes('formatLocalDateYmd(classDateTime)')
        && classFormalContent.includes('formatLocalDateYmd(reviewDate)')
        && readJs.includes('formatLocalDateYmd(classDateTime)')
        && readJs.includes('formatLocalDateYmd(reviewDate)')
        && trialJs.includes('formatLocalDateYmd(classDateTime)')
        && !classFormalContent.includes('new Date(lastReviewDate)')
        && !readJs.includes('new Date(lastReviewDate)')
        && !classFormalContent.includes('const studyDate = new Date(dateStr);')
        && !classFormalContent.includes("toISOString().split('T')[0]")
        && !readJs.includes("toISOString().split('T')[0]")
        && !trialJs.includes("toISOString().split('T')[0]"),
    '正式课/阅读课/体验课相关日期应统一使用本地 YYYY-MM-DD 解析与格式化，不能再混用 UTC 截断或 new Date(YYYY-MM-DD)'
);

assert(
    readHtml.includes('commonFunctions.selfReviewClick'),
    '阅读课页的课后复习方式按钮应复用 commonFunctions.selfReviewClick'
);

assert(
    trialHtml.includes('script.selfReviewClick'),
    '体验课页的课后复习方式按钮应使用体验课独立 selfReviewClick 文案'
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
    trialJs.includes('【体验课】3次抗遗忘复习') && trialJs.includes('生词本') && trialJs.includes('会拼会写'),
    '体验课课后复习文案应恢复为历史独立文案（3次抗遗忘复习）'
);

    assert(
        commonFunctions.includes('resolveSubmittedDurationMinutes')
            && commonFunctions.includes('uniqueCourseDurations')
            && !commonFunctions.includes('classDurationEl ? classDurationEl.value : "1"'),
        '体验课课堂反馈无时长控件时，应按当天排课时长推断，不能固定按 1 小时提交'
    );

    assert(
        commonFunctions.includes('getCurrentSchedulePlatformId')
            && commonFunctions.includes('entryBelongsToCurrentPlatform'),
        '课堂反馈排课校验应按当前平台过滤排课条目，避免多平台同名学生互相影响'
    );

    assert(
        !trialJs.includes('storeClassStatistics(userName, classDate, newWord, 0, 1, "体验课")'),
        '体验课课堂反馈写统计时不应固定按 1 小时，应使用排课推断课时'
    );

    assert(
        trialJs.includes('classDuration')
            && trialJs.includes('syncTrialDurationDefaultByPlatform'),
        '体验课页面应按当前平台初始化可编辑课时时长，麦穗默认半小时，其他平台默认一小时'
    );

    assert(
        !commonFunctions.includes('| 1小时\\n'),
        '体验课报告不应固定显示 1 小时，应显示实际统计课时'
    );

    assert(
        commonFunctions.includes('platform:')
            && commonFunctions.includes('getCurrentSchedulePlatformId()'),
        '课堂反馈统计记录应保存当前平台，用于 index.html 按平台计算工资'
    );

console.log('test-read-trial-platform-ui passed');
