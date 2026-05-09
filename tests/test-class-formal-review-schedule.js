const assert = require('assert');
const fs = require('fs');
const path = require('path');

const classFormalPath = path.join(__dirname, '..', 'classFormal.js');
const classFormalContent = fs.readFileSync(classFormalPath, 'utf8');

assert(
    classFormalContent.includes('const intervals = [1, 2, 3, 6, 9, 12, 15, 17, 19, 21];'),
    'createReviewScheduleTable 应使用升级后的 Word 排表节点 [1,2,3,6,9,12,15,17,19,21]'
);

assert(
    !classFormalContent.includes('const intervals = [1, 2, 3, 5, 7, 9, 12, 14, 17, 21];'),
    'classFormal.js 不应继续保留旧版 Word 排表节点 [1,2,3,5,7,9,12,14,17,21]'
);

console.log('test-class-formal-review-schedule passed');