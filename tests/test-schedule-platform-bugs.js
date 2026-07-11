const assert = require('assert');
const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.join(__dirname, '..', 'schedule.html'), 'utf8');
const commonFunctionsContent = fs.readFileSync(path.join(__dirname, '..', 'commonFunctions.js'), 'utf8');

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

const configureLoginBody = getFunctionBody(content, 'configureLoginCredentialsForCurrentPlatform');
const runScheduleQuotaCheckBody = getFunctionBody(content, 'runScheduleQuotaCheck');
const checkQuotaFromScheduleBody = getFunctionBody(content, 'checkQuotaFromSchedule');
const configureLxBody = getFunctionBody(commonFunctionsContent, 'configureLxCredentials');
const configureMaisuiBody = getFunctionBody(commonFunctionsContent, 'configureMaisuiCredentials');

assert(
    content.includes('id="platformSelect"'),
    'schedule.html 应提供平台切换下拉'
);

assert(
    content.includes('if (currentPlatformId !== "lixiaolaila")') && content.includes('查看课时数'),
    'schedule.html 非李校平台应阻断查看课时数并提示'
);

assert(
    content.includes('if (currentPlatformId !== "lixiaolaila")') && content.includes('暂不支持工资统计'),
    'schedule.html 非李校平台应阻断工资统计并提示'
);

assert(
    content.includes('platformSelect') && content.includes('addExtraEntry('),
    'schedule.html 临时加课应支持选择平台并写入条目'
);

assert(
    content.includes('getMeetingTagForEntry(entry)') || content.includes('getTencentMeetingTagByPlatform'),
    'schedule.html 抗遗忘/排课通知应按平台使用会议号'
);

assert(
    configureLoginBody.includes('platformId === "maisuiyingyu"')
        && configureLoginBody.includes('safeConfigureMaisuiCredentials()')
        && configureLoginBody.includes('safeConfigureLxCredentials()'),
    '设置登录信息应按当前平台分流：麦穗走麦穗登录，默认李校走李校登录'
);

assert(
    configureLxBody.includes("localStorage.setItem('lx_phone'")
        && configureLxBody.includes("localStorage.setItem('lx_pw'")
        && configureLxBody.includes("localStorage.removeItem('x-token-c')")
        && !configureLxBody.includes('maisui-access-token'),
    '李校重新设置登录信息时只应覆盖李校凭据/token，不应清理麦穗 token'
);

assert(
    configureMaisuiBody.includes("localStorage.setItem('maisui_phone'")
        && configureMaisuiBody.includes("localStorage.setItem('maisui_pw'")
        && configureMaisuiBody.includes("localStorage.removeItem('maisui-access-token')")
        && !configureMaisuiBody.includes('x-token-c'),
    '麦穗重新设置登录信息时只应覆盖麦穗凭据/token，不应清理李校 token'
);

assert(
    runScheduleQuotaCheckBody.includes('currentPlatformId !== "lixiaolaila"')
        && runScheduleQuotaCheckBody.includes('return;')
        && checkQuotaFromScheduleBody.includes('localStorage.getItem("x-token-c")')
        && checkQuotaFromScheduleBody.includes('safeLoginApp().catch'),
    '初次进入页面的自动课时/异常检查应默认只走李校 token；缺少李校 token 时才触发李校手机号密码框'
);

console.log('test-schedule-platform-bugs passed');
