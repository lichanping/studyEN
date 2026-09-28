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

console.log('test-forget-words-audio-parser passed');
}

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});