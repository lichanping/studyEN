const assert = require('assert');
const fs = require('fs');
const path = require('path');

function read(fileName) {
    return fs.readFileSync(path.join(__dirname, '..', fileName), 'utf8');
}

const formalHtml = read('index.html');
const formalJs = read('classFormal.js');

assert(
    !formalHtml.includes('id="viewTotalHoursButton"'),
    'index.html 不应再渲染正式课页面的查看课时数按钮'
);

assert(
    !formalHtml.includes('script.viewTotalHoursClick'),
    'index.html 不应再绑定正式课页面的查看课时数事件'
);

assert(
    !formalJs.includes('export async function viewTotalHoursClick()'),
    'classFormal.js 不应再保留正式课页面专用的查看课时数实现'
);

assert(
    !formalJs.includes('CustomerTeacherListClient'),
    'classFormal.js 不应再发起正式课页面的课时查询接口请求'
);

console.log('test-formal-page-quota-removal passed');