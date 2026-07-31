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

const reviewWordInputs = content.match(/class="antiForgettingReviewWord mini-input"/g) || [];
assert.strictEqual(
    reviewWordInputs.length,
    7,
    'anti-forgetting.html 应预置最多 7 个复习词数输入框'
);

assert(
    Array.from({ length: 7 }, (_, index) => `aria-label="复习词数${index + 1}"`).every(label => content.includes(label)),
    'anti-forgetting.html 复习词数输入框应从 1 到 7 连续标注'
);

assert(
    Array.from({ length: 3 }, (_, index) => `aria-label="复习词数${index + 5}" hidden`).every(label => content.includes(label)),
    'anti-forgetting.html 第 5-7 个复习词数输入框应默认隐藏，避免页面常驻拥挤'
);

assert(
    content.includes('id="addReviewWordInputButton"')
        && content.includes('aria-label="增加复习词数输入框"')
        && content.includes('addReviewWordInputButton'),
    'anti-forgetting.html 应提供按需展开复习词数输入框的按钮'
);

assert(
    content.includes('id="copyPronounceWordsTaskButton"')
        && content.includes('>纠音MP3</button>')
        && content.includes('>发音任务</button>')
        && content.includes('📢 【九宫格复习中发音打卡任务】')
        && content.includes("const studentName = String(document.getElementById('userName')?.value || '').trim();")
        && content.includes("const formattedLines = lines.map((line) => `- ${line}`);")
        && content.includes('结合「智能记忆灯塔」系统，以下单词需要重点强化发音，请${studentName ? `${studentName}` : ""}大声朗读 2 遍，并录音或拍视频发群打卡：')
        && content.includes('document.getElementById(\'copyPronounceWordsTaskButton\').addEventListener(\'click\', copyPronounceWordsTask);'),
    'anti-forgetting.html 应提供发音打卡任务按钮，并使用更短按钮文案保证两个按钮可同行显示'
);

console.log('test-anti-forgetting-platform-ui passed');
