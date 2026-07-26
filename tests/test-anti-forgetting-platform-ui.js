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

assert(
    content.includes('option value="medium" selected'),
    'anti-forgetting.html 应默认选中 medium spelling 档位'
);

assert(
    content.includes('id="copyPronounceWordsTaskButton"')
        && content.includes('📢 【九宫格复习中发音打卡任务】')
        && content.includes('结合「智能记忆灯塔」系统，以下单词需强化发音，请大声朗读2遍，录音或视频发群打卡：')
        && content.includes('document.getElementById(\'copyPronounceWordsTaskButton\').addEventListener(\'click\', copyPronounceWordsTask);'),
    'anti-forgetting.html 应提供发音打卡任务按钮，并输出固定模板文案'
);

console.log('test-anti-forgetting-platform-ui passed');
