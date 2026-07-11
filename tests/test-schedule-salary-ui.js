const assert = require('assert');
const fs = require('fs');
const path = require('path');

const schedulePath = path.join(__dirname, '..', 'schedule.html');
const scheduleContent = fs.readFileSync(schedulePath, 'utf8');

assert(
    scheduleContent.includes('const endDate = dateToYmd(range.end);'),
    '按实际上课统计应以统计维度上限作为结束日期（支持计入今天）'
);

assert(
    !scheduleContent.includes('const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);') &&
    !scheduleContent.includes('const cutoff = range.end < yesterday ? range.end : yesterday;'),
    '按实际上课统计不应再强制截断到昨天'
);

assert(
    scheduleContent.includes('["学生姓名", "日期", "课程名称", "课程类别", "课时", "单价", "课时费(元)"]'),
    '工资导出列表应包含课程名称列，便于核对课型识别'
);

assert(
    scheduleContent.includes('CURRENT_PLATFORM_STORAGE_KEY') || scheduleContent.includes('current-platform-v1'),
    'schedule.html 应读取当前平台，用于工资统计平台开关'
);

assert(
    scheduleContent.includes('configureMaisuiCredentials')
        && scheduleContent.includes('loginMaisuiApp')
        && scheduleContent.includes('maisui-access-token'),
    'schedule.html 应支持麦穗英语登录并保存独立 token'
);

assert(
    scheduleContent.includes('fetchMaisuiCompletedRecordsForSalary')
        && scheduleContent.includes('https://ms.aiyingsi.com/api/teacher/learn-union/list-page')
        && scheduleContent.includes('timeRange[0]')
        && scheduleContent.includes('timeRange[1]')
        && scheduleContent.includes('authorization'),
    'schedule.html 麦穗工资统计应使用麦穗 token 按月份 timeRange 拉取销课记录列表'
);

assert(
    !scheduleContent.includes('https://ms.aiyingsi.com/api/teacher/user-appointment/list'),
    'schedule.html 麦穗工资统计不应使用预约列表，应使用销课记录 learn-union/list-page'
);

assert(
    scheduleContent.includes('baifendii') && scheduleContent.includes('暂不支持工资统计'),
    'schedule.html 百分缔平台仍应提示本期暂不支持实际课次工资统计'
);

console.log('test-schedule-salary-ui passed');
