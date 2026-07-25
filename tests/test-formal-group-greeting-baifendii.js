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

assert(
    content.includes('温馨提示：<br>1.请提前给孩子准备一个网络信号好、安静的环境，以确保良好的学习体验。<br>2.课中孩子大量跟读，提前准备一杯温开水'),
    '百分缔入群招呼语应包含独立的温馨提示段落'
);

assert(
    content.includes('请您关注！<br><br>温馨提示：')
        && content.includes('温开水<br><br>这是我的个人介绍'),
    '百分缔入群招呼语应在个人介绍前插入温馨提示段落，并与前后段落各保留一个空白行'
);

console.log('test-formal-group-greeting-baifendii passed');