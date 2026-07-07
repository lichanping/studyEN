const assert = require('assert');
const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.join(__dirname, '..', 'schedule.html'), 'utf8');

assert(
    content.includes('id="platformSelect"'),
    'schedule.html 应提供平台切换下拉'
);

assert(
    content.includes('if (currentPlatformId !== "lixiaolaila")') && content.includes('查看课时数'),
    'schedule.html 非李校平台应阻断查看课时数并提示'
);

assert(
    content.includes('if (currentPlatformId !== "lixiaolaila")') && content.includes('暂不支持工资统计'),
    'schedule.html 非李校平台应阻断工资统计并提示'
);

assert(
    content.includes('platformSelect') && content.includes('addExtraEntry('),
    'schedule.html 临时加课应支持选择平台并写入条目'
);

assert(
    content.includes('getMeetingTagForEntry(entry)') || content.includes('getTencentMeetingTagByPlatform'),
    'schedule.html 抗遗忘/排课通知应按平台使用会议号'
);

console.log('test-schedule-platform-bugs passed');
