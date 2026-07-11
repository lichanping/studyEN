const assert = require('assert');
const fs = require('fs');
const path = require('path');

const classFormalPath = path.join(__dirname, '..', 'classFormal.js');
const content = fs.readFileSync(classFormalPath, 'utf8');

assert(
    content.includes('CURRENT_PLATFORM_STORAGE_KEY') || content.includes('current-platform-v1'),
    'classFormal.js 应读取当前平台用于学生与工资统计'
);

assert(
    content.includes('function getCurrentPlatformId()'),
    'classFormal.js 应提供当前平台读取函数'
);

assert(
    content.includes('platformId === DEFAULT_PLATFORM_ID'),
    'classFormal.js 应对默认平台与新平台执行区分逻辑'
);

assert(
    !content.includes('暂不支持工资统计'),
    'index/classFormal 不应复用 schedule 页的工资禁用提示'
);

assert(
    content.includes('function getTrialSalaryHourlyRate')
        && content.includes('maisuiyingyu: 20')
        && content.includes('baifendii: 30')
        && content.includes('lixiaolaila: 40'),
    'index/classFormal 工资统计应按平台计算体验课单价：麦穗半小时10元、百分缔1小时30元、李校1小时40元'
);

assert(
    content.includes('stats.platform')
        && content.includes('recordPlatform')
        && content.includes('getSalaryHourlyRate(type, recordPlatform)'),
    'index/classFormal 工资统计应读取课堂统计记录的平台字段，并按记录平台计算单价'
);

console.log('test-class-formal-salary-platform passed');
