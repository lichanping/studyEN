const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'commonFunctions.js'), 'utf8');

function extractBlock(sourceText, signature) {
    const start = sourceText.indexOf(signature);
    if (start === -1) throw new Error(`Unable to find block: ${signature}`);

    const bodyStart = sourceText.indexOf('{', start);
    let depth = 0;
    for (let index = bodyStart; index < sourceText.length; index += 1) {
        if (sourceText[index] === '{') depth += 1;
        if (sourceText[index] === '}') {
            depth -= 1;
            if (depth === 0) return sourceText.slice(start, index + 1);
        }
    }
    throw new Error(`Unable to extract block: ${signature}`);
}

async function run() {
const { parseVocabularyLine } = await import('../word-audio-format.mjs');
const parseForgetWordsForAudio = new Function(
    'parseVocabularyLine',
    `${extractBlock(source, 'export function parseForgetWordsForAudio').replace('export ', '')}\nreturn parseForgetWordsForAudio;`
)(parseVocabularyLine);

const input = `brighten v （使）变亮；变得开心，面露喜色
cater v 供应饮食；为（集会等）承办酒席
claim v 索赔；索取；主张；断言
female adj 女性的；雌性的 n 女子；雌性动（植）物
forbid v 禁止
irrigation n 灌溉
military n 军队 adj 军事的
motor n 马达，发动机
native adj 本地的，本国的 n 本地人；土著
noble adj 贵族的，高贵的 n 贵族成员
petal n 花瓣
relate v 相关，讲述
reunite v 重逢；再结合
tram n 有轨电车
trunk n 象鼻；（人）躯干
unrest n 不安，动荡的局面
hail n 冰雹 v 下冰雹；致敬，欢呼
identical adj 相同的 n 完全相同的事物
mentally adv 精神上，智力上，心理上
navigation n 导航
neighbor n 邻居
pollute v 污染，弄脏；玷污，亵渎
rubber n 橡胶，胶鞋
slightly adv 稍微
sneeze n 喷嚏 v 打喷嚏
suitable adj 合适的
troublesome adj 讨厌的，令人烦恼的
upright adj 垂直的；正直的 adv 直立地`;

const parsed = parseForgetWordsForAudio(input);
assert.deepStrictEqual(
    parsed.map(({ english }) => english),
    [
        'brighten', 'cater', 'claim', 'female', 'forbid', 'irrigation', 'military',
        'motor', 'native', 'noble', 'petal', 'relate', 'reunite', 'tram', 'trunk',
        'unrest', 'hail', 'identical', 'mentally', 'navigation', 'neighbor', 'pollute',
        'rubber', 'slightly', 'sneeze', 'suitable', 'troublesome', 'upright'
    ],
    '词性标记不应进入英文 TTS 文本'
);
assert.equal(parsed[0].chinese, 'v （使）变亮；变得开心，面露喜色');
assert.equal(parsed[3].chinese, 'adj 女性的；雌性的 n 女子；雌性动（植）物');
assert.equal(parsed[27].chinese, 'adj 垂直的；正直的 adv 直立地');

assert.deepStrictEqual(
    parseForgetWordsForAudio('apple 苹果\nbanana\n香蕉\npear梨\npalace宫殿\npalace 宫殿\npalace　宫殿'),
    [
        { english: 'apple', chinese: '苹果' },
        { english: 'banana', chinese: '香蕉' },
        { english: 'pear', chinese: '梨' },
        { english: 'palace', chinese: '宫殿' },
        { english: 'palace', chinese: '宫殿' },
        { english: 'palace', chinese: '宫殿' }
    ],
    '原有双行、无空格、半角空格和全角空格格式应保持兼容'
);
assert.deepStrictEqual(
    parseVocabularyLine('in person phr 亲自；当面'),
    { english: 'in person', meaning: 'phr 亲自；当面' },
    '英文短语应完整保留到首个词性标记之前'
);
assert.deepStrictEqual(
    parseVocabularyLine('upright 垂直的；正直的 adv 直立地'),
    { english: 'upright', meaning: '垂直的；正直的 adv 直立地' },
    '首个释义缺少词性时，应按更早出现的中文边界分隔中英文'
);
assert.deepStrictEqual(
    parseVocabularyLine('take off 起飞'),
    { english: 'take off', meaning: '起飞' },
    '无词性的英文词组应完整保留到首个中文边界之前'
);
assert.deepStrictEqual(
    parseForgetWordsForAudio('take off 起飞'),
    [{ english: 'take off', chinese: '起飞' }],
    '遗忘词批量解析应保留无词性的英文词组'
);

[
    ['magpie n【鸟类】喜鹊；饶舌者', 'magpie', 'n【鸟类】喜鹊；饶舌者'],
    ['postcode n〈英〉邮政编码', 'postcode', 'n〈英〉邮政编码'],
    ['PC abbr【计】个人计算机', 'PC', 'abbr【计】个人计算机'],
    ['tadpole n【动】蝌蚪', 'tadpole', 'n【动】蝌蚪']
].forEach(([line, english, meaning]) => {
    assert.deepStrictEqual(
        parseVocabularyLine(line),
        { english, meaning },
        `词性后紧跟分类括号时应正确拆分：${line}`
    );
});

const vocabularyDirectory = path.join(__dirname, '..', 'data', '杨开迪');
const vocabularyFiles = fs.readdirSync(vocabularyDirectory)
    .filter((fileName) => fileName.endsWith('.txt'))
    .sort();
let corpusEntryCount = 0;
vocabularyFiles.forEach((fileName) => {
    const lines = fs.readFileSync(path.join(vocabularyDirectory, fileName), 'utf8').split(/\r?\n/);
    lines.forEach((rawLine, index) => {
        if (!rawLine.trim()) return;
        const columns = rawLine.split('\t');
        assert.equal(columns.length, 2, `${fileName}:${index + 1} 应且仅应包含一个 Tab`);
        const expected = { english: columns[0].trim(), meaning: columns[1].trim() };
        assert.deepStrictEqual(
            parseVocabularyLine(rawLine),
            expected,
            `${fileName}:${index + 1} 原始 Tab 格式应正确拆分`
        );
        assert.deepStrictEqual(
            parseVocabularyLine(`${expected.english} ${expected.meaning}`),
            expected,
            `${fileName}:${index + 1} 普通空格粘贴格式应正确拆分`
        );
        corpusEntryCount += 1;
    });
});
assert.equal(vocabularyFiles.length, 30, '应扫描杨开迪目录下全部 30 个 TXT 词表');
assert.equal(corpusEntryCount, 1528, '应验证全部 1528 条词汇记录');

console.log('test-forget-words-audio-parser passed');
}

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});