const assert = require('assert');
const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.join(__dirname, '..', 'commonFunctions.js'), 'utf8');

assert(
    content.includes('const userName = document.getElementById("userName").value;'),
    'handleGroupGreetingClick 应读取当前学员名'
);

assert(
    content.includes('getCurrentPlatformId') || content.includes('currentPlatformId'),
    'handleGroupGreetingClick 应按当前平台生成入群招呼语'
);

assert(
    content.includes('currentPlatformId === "baifendii"') || content.includes("currentPlatformId === 'baifendii'"),
    'handleGroupGreetingClick 应为百分缔平台提供独立文案分支'
);

assert(
    content.includes('${userName}同学家长您好!'),
    '百分缔入群招呼语应使用当前学员名'
);

assert(
    content.includes('我是${teacherName}:将担任孩子的英语学习教练'),
    '百分缔入群招呼语应包含教师身份说明'
);

console.log('test-formal-group-greeting-baifendii passed');