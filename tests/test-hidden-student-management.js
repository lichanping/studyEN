const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { normalizeStudentName } = require('../student-name-alias.js');

function read(relativePath) {
    return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

function getFunctionBody(source, functionName) {
    const start = source.indexOf(`function ${functionName}(`);
    assert(start >= 0, `${functionName} should exist`);
    let parenDepth = 0;
    let signatureEnd = -1;
    for (let i = source.indexOf('(', start); i < source.length; i += 1) {
        if (source[i] === '(') parenDepth += 1;
        if (source[i] === ')') parenDepth -= 1;
        if (parenDepth === 0) {
            signatureEnd = i;
            break;
        }
    }
    const bodyStart = source.indexOf('{', signatureEnd);
    let depth = 0;
    for (let i = bodyStart; i < source.length; i += 1) {
        if (source[i] === '{') depth += 1;
        if (source[i] === '}') depth -= 1;
        if (depth === 0) return source.slice(bodyStart, i + 1);
    }
    throw new Error(`${functionName} body should be closed`);
}

const commonFunctionsSource = read('commonFunctions.js');
const scheduleManageHtml = read('schedule-students-manage.html');
const scheduleManageJs = read('schedule-students-manage.js');

const filterLegacyStudentsBody = getFunctionBody(commonFunctionsSource, 'filterLegacyStudents');
const loadHiddenStudentsBody = getFunctionBody(commonFunctionsSource, 'loadHiddenStudents');
const upsertHiddenStudentBody = getFunctionBody(commonFunctionsSource, 'upsertHiddenStudent');
const renderHiddenStudentsBody = getFunctionBody(scheduleManageJs, 'renderHiddenStudents');
const handleHiddenStudentSubmitBody = getFunctionBody(scheduleManageJs, 'handleHiddenStudentSubmit');
const bindEventsBody = getFunctionBody(scheduleManageJs, 'bindEvents');

assert.strictEqual(normalizeStudentName('硕硕'), '俞新硕', '学生别名映射前提应成立');

assert(
    commonFunctionsSource.includes('export const HIDDEN_STUDENTS_STORAGE_KEY = "hidden-students-v1"')
        || commonFunctionsSource.includes("export const HIDDEN_STUDENTS_STORAGE_KEY = 'hidden-students-v1'"),
    'commonFunctions.js 应提供共享 hidden-students-v1 存储 key'
);

assert(
    commonFunctionsSource.includes('window.StudentNameAlias?.normalizeStudentName')
        || commonFunctionsSource.includes('globalThis.StudentNameAlias?.normalizeStudentName'),
    'commonFunctions.js 隐藏名单逻辑应复用 student-name-alias.js 的 normalizeStudentName'
);

assert(
    loadHiddenStudentsBody.includes('localStorage.getItem(HIDDEN_STUDENTS_STORAGE_KEY)')
        && loadHiddenStudentsBody.includes('normalizeStudentName(')
        && loadHiddenStudentsBody.includes('platform: "all"') || loadHiddenStudentsBody.includes("platform: 'all'"),
    'commonFunctions.js 读取隐藏名单时应从 hidden-students-v1 加载，并对姓名做归一化，默认平台为 all'
);

assert(
    filterLegacyStudentsBody.includes('loadHiddenStudents()')
        && filterLegacyStudentsBody.includes('normalizeStudentName(')
        && filterLegacyStudentsBody.includes('HIDDEN_STUDENT_NAME_SET'),
    'filterLegacyStudents 应合并 hidden-students-v1，并在过滤前统一做姓名归一化'
);

assert(
    upsertHiddenStudentBody.includes('normalizeStudentName(')
        && upsertHiddenStudentBody.includes('updatedAt: new Date().toISOString()')
        && upsertHiddenStudentBody.includes('platform: "all"') || upsertHiddenStudentBody.includes("platform: 'all'"),
    'commonFunctions.js 新增隐藏学生时应按 all 平台保存标准姓名，并更新时间'
);

assert(
    scheduleManageHtml.includes('<script src="student-name-alias.js"></script>')
        || scheduleManageHtml.includes('<script src="./student-name-alias.js"></script>'),
    'schedule-students-manage.html 应加载 student-name-alias.js，确保隐藏名单录入可做别名归一化'
);

assert(
    scheduleManageHtml.includes('隐藏学生名单')
        && scheduleManageHtml.includes('id="hiddenStudentInput"')
        && scheduleManageHtml.includes('id="addHiddenStudentButton"')
        && scheduleManageHtml.includes('id="hiddenStudentsTableBody"'),
    'schedule-students-manage.html 应提供简洁的隐藏学生名单维护面板'
);

assert(
    scheduleManageJs.includes('const hiddenStudentInput = document.getElementById("hiddenStudentInput")')
        && scheduleManageJs.includes('const hiddenStudentsTableBody = document.getElementById("hiddenStudentsTableBody")'),
    'schedule-students-manage.js 应接管隐藏学生维护 UI 节点'
);

assert(
    renderHiddenStudentsBody.includes('loadHiddenStudents()')
        && renderHiddenStudentsBody.includes('hiddenStudentsTableBody.innerHTML')
        && renderHiddenStudentsBody.includes('取消隐藏'),
    'schedule-students-manage.js 应渲染当前隐藏名单，并提供取消隐藏操作'
);

assert(
    handleHiddenStudentSubmitBody.includes('upsertHiddenStudent(hiddenStudentInput.value)')
        && handleHiddenStudentSubmitBody.includes('hiddenStudentInput.value = ""')
        && handleHiddenStudentSubmitBody.includes('renderHiddenStudents()'),
    'schedule-students-manage.js 新增隐藏学生后应清空输入框并刷新列表'
);

assert(
    bindEventsBody.includes('addHiddenStudentButton')
        && bindEventsBody.includes('handleHiddenStudentSubmit')
        && bindEventsBody.includes('removeHiddenStudent('),
    'schedule-students-manage.js 应绑定添加和取消隐藏事件'
);

console.log('test-hidden-student-management passed');