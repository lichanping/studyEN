const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

function read(relativePath) {
    return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function loadMeetingConfig() {
    const window = {
        localStorage: { getItem: () => null },
        document: {
            getElementById: () => null,
            createElement: () => ({ appendChild() {} })
        }
    };
    window.window = window;
    vm.runInNewContext(read('meeting-config.js'), { window, console });
    return window.APP_MEETING_CONFIG;
}

const config = loadMeetingConfig();

assert.equal(
    typeof config.isSmartTrainingCabinRegularClassPlatform,
    'function',
    '应提供严格判断智练舱正课平台的方法'
);
assert.equal(config.isSmartTrainingCabinRegularClassPlatform('lixiaolaila'), true);
assert.equal(config.isSmartTrainingCabinRegularClassPlatform('baifendii'), false);
assert.equal(config.isSmartTrainingCabinRegularClassPlatform('maisuiyingyu'), false);
assert.equal(config.isSmartTrainingCabinRegularClassPlatform('unknown'), false);
assert.equal(config.isSmartTrainingCabinRegularClassPlatform(''), false);

const files = {
    formal: read('classFormal.js'),
    reading: read('classRead.js'),
    trial: read('classTrial.js'),
    schedule: read('schedule.html')
};

for (const [name, content] of Object.entries(files)) {
    assert(
        content.includes('isSmartTrainingCabinRegularClassPlatform'),
        `${name} 通知入口应接入智练舱正课平台判断`
    );
}

assert(
    files.schedule.includes('上课入口：【智练舱】（正课固定使用智练舱，不使用腾讯会议）'),
    '排课页主模板应突出智练舱长期正课规则'
);
assert(
    files.schedule.includes('可以正常上课请回复“确认”；无法参加请回复“请假/调课”'),
    '排课页主模板应要求明确回复是否上课'
);

const scheduleMessageStart = files.schedule.indexOf('function buildScheduleNotificationMessage(');
const scheduleMessageEnd = files.schedule.indexOf('\n    function getMondayOfWeek(', scheduleMessageStart);
const scheduleMessageSource = files.schedule.slice(scheduleMessageStart, scheduleMessageEnd);
const smartCabinMessageStart = scheduleMessageSource.indexOf('if (window.APP_MEETING_CONFIG?.isSmartTrainingCabinRegularClassPlatform');
const legacyMessageStart = scheduleMessageSource.indexOf('\n        return "【"', smartCabinMessageStart);
const smartCabinMessageSource = scheduleMessageSource.slice(smartCabinMessageStart, legacyMessageStart);
assert(!smartCabinMessageSource.includes('摄像头'), '排课页智练舱通知不应提示摄像头');
assert(!smartCabinMessageSource.includes('温水'), '排课页智练舱通知不应提示温水');
assert(scheduleMessageSource.includes('准备好摄像头和一杯水'), '非 LXLL 排课通知应保持原文不变');

for (const content of Object.values(files)) {
    assert(
        content.includes('getCurrentTencentMeetingTag') || content.includes('getMeetingTagForEntry'),
        '非 LXLL 平台应保留原腾讯会议通知路径'
    );
}

console.log('test-lxll-smart-cabin-notification passed');