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
    content.includes('function getVocabSalaryHourlyRate')
        && content.includes('baifendii: 48')
        && content.includes('lixiaolaila: 50'),
    'index/classFormal 工资统计应按平台计算单词课单价：百分缔48元/时、李校50元/时'
);

assert(
    !content.includes('if (type === "词汇课") return 50;'),
    'index/classFormal 工资统计不应将所有单词课统一按 50 元/时计算'
);

assert(
    !content.includes('const salaryVocab = totalHoursVocab * 50;')
        && content.includes('filter((record) => record.type === "词汇课")')
        && content.includes('record.duration * record.hourlyRate'),
    'index/classFormal 单词课工资汇总应按记录平台单价逐条累加，不能统一按 50 元/时'
);

assert(
    content.includes('stats.platform')
        && content.includes('recordPlatform')
        && content.includes('getSalaryHourlyRate(type, recordPlatform)'),
    'index/classFormal 工资统计应读取课堂统计记录的平台字段，并按记录平台计算单价'
);

console.log('test-class-formal-salary-platform passed');
