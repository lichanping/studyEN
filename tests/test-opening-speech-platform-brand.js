const assert = require('assert');
const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.join(__dirname, '..', 'commonFunctions.js'), 'utf8');

assert(
    content.includes('getCurrentPlatformId') || content.includes('CURRENT_PLATFORM_STORAGE_KEY'),
    'commonFunctions.js 开场话术应读取当前平台'
);

assert(
    content.includes('getPlatformDisplayName') || content.includes('platformDisplayName'),
    'commonFunctions.js 开场话术应使用平台展示名变量'
);

assert(
    !content.includes('我是【李校来啦】${teacherName}'),
    'commonFunctions.js 开场话术不应硬编码李校来啦'
);

console.log('test-opening-speech-platform-brand passed');
