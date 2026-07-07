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

console.log('test-class-formal-salary-platform passed');
