const assert = require('assert');
const fs = require('fs');
const path = require('path');

const commonFunctionsPath = path.join(__dirname, '..', 'commonFunctions.js');
const classFormalPath = path.join(__dirname, '..', 'classFormal.js');
const classReadPath = path.join(__dirname, '..', 'classRead.js');

const commonContent = fs.readFileSync(commonFunctionsPath, 'utf8');
const classFormalContent = fs.readFileSync(classFormalPath, 'utf8');
const classReadContent = fs.readFileSync(classReadPath, 'utf8');

// 1. commonFunctions.js 应导出 resolveStudentDurationMinutes
assert(
    commonContent.includes('resolveStudentDurationMinutes'),
    'commonFunctions.js 应包含 resolveStudentDurationMinutes 函数'
);

assert(
    /export\s+(async\s+)?function\s+resolveStudentDurationMinutes/.test(commonContent)
    || /export\s+\{[^}]*resolveStudentDurationMinutes/.test(commonContent),
    'resolveStudentDurationMinutes 应被 export'
);

// 2. resolveStudentDurationMinutes 应读取 schedule-config-override-v1
assert(
    commonContent.includes('schedule-config-override-v1') || commonContent.includes('SCHEDULE_CONFIG_OVERRIDE_KEY'),
    'resolveStudentDurationMinutes 应读取 schedule-config-override'
);

// 3. classFormal.js updateLabel 应使用 schedule-config-override 的 duration 而非仅硬编码
assert(
    classFormalContent.includes('resolveStudentDurationMinutes'),
    'classFormal.js 应调用 resolveStudentDurationMinutes 获取排课配置的 duration'
);

// 4. classRead.js updateLabel2 应使用 schedule-config-override 的 duration
assert(
    classReadContent.includes('resolveStudentDurationMinutes'),
    'classRead.js 应调用 resolveStudentDurationMinutes 获取排课配置的 duration'
);

// 5. classFormal.js 不应直接使用 userInfo.duration 设置 durationSelect（应有 override 优先）
// 检查 updateLabel 函数中 durationSelect 赋值前有 override 逻辑
const updateLabelMatch = classFormalContent.match(/function\s+updateLabel\s*\(\s*\)\s*\{[\s\S]*?durationSelect\.value/);
assert(
    updateLabelMatch && (
        updateLabelMatch[0].includes('resolveStudentDurationMinutes')
        || updateLabelMatch[0].includes('scheduleDuration')
        || updateLabelMatch[0].includes('overrideDuration')
    ),
    'classFormal.js updateLabel() 中 durationSelect.value 赋值前应使用 schedule override 逻辑'
);

// 6. classRead.js 同理
const updateLabel2Match = classReadContent.match(/function\s+updateLabel2\s*\(\s*\)\s*\{[\s\S]*?durationSelect\.value/);
assert(
    updateLabel2Match && (
        updateLabel2Match[0].includes('resolveStudentDurationMinutes')
        || updateLabel2Match[0].includes('scheduleDuration')
        || updateLabel2Match[0].includes('overrideDuration')
    ),
    'classRead.js updateLabel2() 中 durationSelect.value 赋值前应使用 schedule override 逻辑'
);

// 7. classTrial.js 不应改动（体验课 duration 按平台默认值，不从排课配置读取）
const classTrialContent = fs.readFileSync(path.join(__dirname, '..', 'classTrial.js'), 'utf8');
assert(
    !classTrialContent.includes('resolveStudentDurationMinutes'),
    'classTrial.js 不应调用 resolveStudentDurationMinutes（体验课按平台默认值）'
);

console.log('test-duration-priority-override passed');
