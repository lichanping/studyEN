const assert = require('assert');
const fs = require('fs');
const path = require('path');

const commonFunctionsPath = path.join(__dirname, '..', 'commonFunctions.js');
const classTrialPath = path.join(__dirname, '..', 'classTrial.js');

const commonContent = fs.readFileSync(commonFunctionsPath, 'utf8');
const classTrialContent = fs.readFileSync(classTrialPath, 'utf8');

// 1. commonFunctions.js 应导出 resolveTrialDurationMinutes
assert(
    commonContent.includes('resolveTrialDurationMinutes'),
    'commonFunctions.js 应包含 resolveTrialDurationMinutes 函数'
);

assert(
    /export\s+function\s+resolveTrialDurationMinutes/.test(commonContent),
    'resolveTrialDurationMinutes 应被 export 为具名函数'
);

// 2. resolveTrialDurationMinutes 应读取 schedule-extra-entries-v1
assert(
    commonContent.includes('schedule-extra-entries-v1') || commonContent.includes('EXTRA_ENTRIES_STORAGE_KEY'),
    'resolveTrialDurationMinutes 应读取 schedule-extra-entries-v1（临时加课）'
);

// 3. resolveTrialDurationMinutes 应读取 schedule-config-override-v1
assert(
    commonContent.includes('schedule-config-override-v1') || commonContent.includes('SCHEDULE_CONFIG_OVERRIDE_KEY'),
    'resolveTrialDurationMinutes 应读取 schedule-config-override-v1'
);

// 4. classTrial.js 应导入并使用 resolveTrialDurationMinutes
assert(
    classTrialContent.includes('resolveTrialDurationMinutes'),
    'classTrial.js 应导入 resolveTrialDurationMinutes'
);

// 5. classTrial.js 应有 userName change 事件监听来更新 duration
assert(
    /userName.*change|addEventListener.*change.*userName|userName.*addEventListener/i.test(classTrialContent)
    || classTrialContent.includes('syncTrialDurationForSelectedStudent'),
    'classTrial.js 应在 userName 选择变化时更新 duration'
);

// 6. classTrial.js 页面加载时应触发 duration 覆盖（不只是平台默认值）
assert(
    classTrialContent.includes('syncTrialDurationForSelectedStudent')
    || classTrialContent.includes('resolveTrialDurationMinutes'),
    'classTrial.js 页面加载时应尝试从排课配置覆盖 duration'
);

console.log('test-trial-duration-from-schedule passed');
