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

console.log('test-anti-forgetting-platform-ui passed');
