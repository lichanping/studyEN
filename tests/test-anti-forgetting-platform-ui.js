const assert = require('assert');
const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.join(__dirname, '..', 'anti-forgetting.html'), 'utf8');

assert(
    content.includes('id="platformSelect"'),
    'anti-forgetting.html 应提供平台切换下拉'
);

assert(
    content.includes('typeof item === \'string\'') || content.includes('item.name'),
    'anti-forgetting.html 应兼容 custom-students-v1 的 string/object 结构'
);

assert(
    content.includes('platformSelect') && content.includes('addStudent('),
    'anti-forgetting.html 应通过平台筛选器过滤学员，避免 dirty data'
);

assert(
    content.includes('id="wordAudioSpellingEnabled"'),
    'anti-forgetting.html 应提供 MP3 包含拼写开关'
);

assert(
    content.includes('MP3包含拼写'),
    'anti-forgetting.html 应展示 MP3 包含拼写开关文案'
);

assert(
    content.includes('id="wordAudioSpellingSpeedPreset"'),
    'anti-forgetting.html 应提供 spelling 快中慢跳档'
);

assert(
    content.includes('option value="slow"') && content.includes('option value="medium"') && content.includes('option value="fast"'),
    'anti-forgetting.html 应提供 slow/medium/fast 三档 spelling 速度选项'
);

console.log('test-anti-forgetting-platform-ui passed');
