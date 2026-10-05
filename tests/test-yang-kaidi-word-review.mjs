import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as reviewCore from '../yang-kaidi-word-review-core.mjs';

import {
    applyWordClick,
    buildBookFingerprint,
    buildDailyReviewReport,
    buildForgottenWordsByBookExport,
    buildForgottenWordsExport,
    buildUniqueForgottenWordsExport,
    buildReviewSummaryReport,
    calculateBookStats,
    createCompletedResult,
    getBeijingDateYmd,
    parseTabbedWordList,
    toSpeechText,
    toggleForgotten,
    updateCompletedResult
} from '../yang-kaidi-word-review-core.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');

const lessonEntries = parseTabbedWordList(
    fs.readFileSync(path.join(repoRoot, 'data/杨开迪-我的/2026-10-02.txt'), 'utf8'),
    'my-coach:2026-10-02'
);
assert.equal(lessonEntries.length, 75, '首节正课词库应完整解析75条');
assert(lessonEntries.every((entry) => entry.english && entry.meaning));
assert.equal(lessonEntries.find((entry) => entry.english === 'wound').meaning, 'n 伤口 v 受伤');
assert.equal(lessonEntries.find((entry) => entry.english === 'address').meaning, 'n 地址 v 解决');

assert.equal(typeof reviewCore.getSourceBooks, 'function', '词库清单应支持正课和历史两个来源');
assert.equal(reviewCore.DEFAULT_REVIEW_SOURCE, 'my-coach', '默认打开正课词库');
const historyBooks = reviewCore.getSourceBooks('old-coach');
const lessonBooks = reviewCore.getSourceBooks('my-coach');
assert.equal(historyBooks.length, 30);
assert.equal(historyBooks[0].bookId, '2026-05-09', '历史册主键保持不变');
assert.equal(historyBooks[0].path, 'data/杨开迪/2026-05-09.txt');
assert.equal(lessonBooks.length, 3);
assert.equal(lessonBooks[0].bookId, 'my-coach:2026-10-02');
assert.equal(lessonBooks[0].bookDate, '2026-10-02');
assert.equal(lessonBooks[0].bookNumber, 1);
assert.equal(lessonBooks[0].path, 'data/杨开迪-我的/2026-10-02.txt');
assert.deepEqual(lessonBooks[1], {
    sourceId: 'my-coach',
    bookId: 'my-coach:2026-10-04',
    bookDate: '2026-10-04',
    bookNumber: 2,
    path: 'data/杨开迪-我的/2026-10-04.txt'
});
const secondLessonText = fs.readFileSync(path.join(repoRoot, lessonBooks[1].path), 'utf8');
const secondLessonEntries = parseTabbedWordList(secondLessonText, lessonBooks[1].bookId);
assert.equal(secondLessonEntries.length, 71, '两张图片的60+11条词目应完整录入');
assert.deepEqual(secondLessonEntries.map((entry) => entry.english), [
    'marriage', 'theatre', 'guest', 'accent', 'trousers',
    'rat', 'wheel', 'towel', 'risk', 'coal',
    'cent', 'cotton', 'murder', 'cheese', 'purse',
    'force', 'fetch', 'certain', 'heat', 'rope',
    'separate', 'whether', 'count', 'instruction', 'lock',
    'kick', 'condition', 'steal', 'object', 'blind',
    'pioneer', 'chest', 'message', 'path', 'information',
    'hang', 'salt', 'drug', 'row', 'concert',
    'humorous', 'stamp', 'worth', 'sick', 'bitter',
    'available', 'vehicle', 'stick', 'war', 'prove',
    'license', 'till', 'treatment', 'bell', 'retell',
    'repeat', 'round', 'state', 'total', 'president',
    'granny', 'least', 'composition', 'abundance', 'beg',
    'bounce', 'brand', 'defend', 'devotion', 'dialect', 'diamond'
], '按图片每组从左到右、组内从上到下保留原拼写');
assert.deepEqual(secondLessonEntries.map((entry) => entry.meaning), [
    '结婚', '剧院', '客人', '口音', '裤子',
    '老鼠', '车轮', '毛巾', '冒险', '煤',
    '美分', '棉花', '谋杀', '奶酪', '钱包',
    '强迫', '拿取', '确定的', '热；加热', '绳子',
    '分开', '是否', '数数', '用法说明', '锁',
    '踢', '条件；状况', '偷', '物体', '失明的',
    '先锋', '胸部', '信息', '路', '信息',
    '悬挂', '盐', '毒品', '一排', '音乐会',
    '幽默的', '邮票', '值得', '生病的', '苦的',
    '可用的', '车辆', '粘贴；刺', '战争', '证明',
    '证件', '直到', '治疗', '铃', '复述',
    '重复', '圆的', '状态', '总共', '总统',
    '奶奶', '最少', '构成', '大量', '乞求',
    '弹跳', '品牌', '保卫', '热爱', '方言', '钻石'
], '释义应与图片一致，不自行添加词性或改写');
assert(secondLessonText.endsWith('\n'));
assert(!secondLessonText.includes('\r'));
assert(secondLessonText.trimEnd().split('\n').every((line) => line.split('\t').length === 2));
assert(secondLessonEntries.every((entry) => entry.entryId.startsWith('my-coach:2026-10-04:')));
assert.equal(new Set(secondLessonEntries.map((entry) => entry.english)).size, 71);
assert.deepEqual(lessonBooks[2], {
    sourceId: 'my-coach',
    bookId: 'my-coach:2026-10-05',
    bookDate: '2026-10-05',
    bookNumber: 3,
    path: 'data/杨开迪-我的/2026-10-05.txt'
});
const thirdLessonText = fs.readFileSync(path.join(repoRoot, lessonBooks[2].path), 'utf8');
const thirdLessonEntries = parseTabbedWordList(thirdLessonText, lessonBooks[2].bookId);
assert.equal(thirdLessonEntries.length, 55, '图片中的11组词目应完整录入');
assert.deepEqual(thirdLessonEntries.map((entry) => entry.english), [
    'evaluate', 'evolution', 'fascination', 'gather', 'handful',
    'hunch', 'independence', 'infer', 'invest', 'look out',
    'measure', 'occupy', 'on average', 'spatial', 'straw',
    'struggle', 'undertake', 'yell', 'cage', 'claim',
    'description', 'extinct', 'factual', 'female', 'fierce',
    'forbid', 'laboratory', 'military', 'motor', 'native',
    'relate', 'tram', 'trunk', 'unrest', 'access',
    'adequately', 'ambiguous', 'appointment', 'attack', 'discrimination',
    'disgusting', 'dread', 'droop', 'drought', 'drunk',
    'efficiency', 'embarrassed', 'endurance', 'entertaining', 'newly',
    'per', 'pity', 'presentation', 'recipe', 'resource'
], '保留图片每组从左到右、组内从上到下的词目顺序');
assert.deepEqual(thirdLessonEntries.map((entry) => entry.meaning), [
    '评价', '进化', '入迷', '聚集', '一把',
    '直觉', '独立', '推断', '投资', '当心',
    '方法', '占据', '平均', '空间的', '稻草',
    '挣扎', '承担', '大喊', '笼子', '宣告',
    '描述', '灭绝的', '事实的', '女性的', '凶猛的',
    '禁止', '实验室', '军事的', '发动机', '本地的',
    '联系', '电车', '树干；行李箱', '不安', '进入；通道',
    '足够地', '模糊的', '预约', '攻击', '歧视',
    '令人厌恶的', '畏惧', '下垂', '干旱', '醉的',
    '效率', '尴尬的', '忍耐力', '有趣的', '新近',
    '每', '可惜', '展示', '烹饪；食谱', '资源'
], '保留原释义，包括measure的方法，不自行添加词性');
assert(thirdLessonText.endsWith('\n'));
assert(!thirdLessonText.includes('\r'));
assert(thirdLessonText.trimEnd().split('\n').every((line) => line.split('\t').length === 2));
assert(thirdLessonEntries.every((entry) => entry.entryId.startsWith('my-coach:2026-10-05:')));
assert.equal(new Set(thirdLessonEntries.map((entry) => entry.english)).size, 55);
assert.equal(reviewCore.getRecordSourceId({ bookId: '2026-10-02' }), 'old-coach');
assert.equal(reviewCore.getRecordSourceId({ bookId: 'my-coach:2026-10-02' }), 'my-coach');
const lessonResult = createCompletedResult({
    book: { ...lessonBooks[0], totalWords: 75, sourceFingerprint: 'lesson-fp' },
    entries: lessonEntries.map((entry, index) => ({ ...entry, tested: index < 2, forgotten: index === 0 })),
    completedAt: new Date('2026-10-03T01:00:00Z')
});
assert.equal(lessonResult.sourceId, 'my-coach');
assert.equal(lessonResult.bookDate, '2026-10-02');
assert.equal(lessonResult.reviewDateBeijing, '2026-10-03');
const sameDateHistoryResult = {
    ...lessonResult,
    bookId: '2026-10-02',
    sourceId: undefined,
    forgottenWords: [{ entryId: 'old-only', english: 'old-only', meaning: '仅历史' }]
};
const mixedSourceResults = [sameDateHistoryResult, lessonResult];
assert.deepEqual(reviewCore.selectSourceRecords(mixedSourceResults, 'my-coach'), [lessonResult]);
assert.deepEqual(reviewCore.selectSourceRecords(mixedSourceResults, 'old-coach'), [sameDateHistoryResult]);
const lessonDaily = buildDailyReviewReport(mixedSourceResults, '2026-10-03', 'my-coach');
assert(lessonDaily.includes('词库来源：正课'));
assert(lessonDaily.includes('复习：2 词'));
assert(lessonDaily.includes('词库日期：2026-10-02'));
assert(!lessonDaily.includes('old-only'));
const lessonSummary = buildReviewSummaryReport(mixedSourceResults, [
    { ...historyBooks[0], totalWords: 37 }, { ...lessonBooks[0], totalWords: 75 }
], new Date('2026-10-03T01:00:00Z'), 'my-coach');
assert(lessonSummary.includes('正课词库复习 Summary'));
assert(lessonSummary.includes('已完成：1 / 1 册'));
assert(lessonSummary.includes('已复习：2 / 75 词'));
for (const builder of [buildForgottenWordsByBookExport, buildUniqueForgottenWordsExport]) {
    const output = builder(mixedSourceResults, '杨开迪', new Date('2026-10-03T01:00:00Z'), 'my-coach');
    assert(output.includes('正课单词复习遗忘词'));
    assert(output.includes('regard'));
    assert(!output.includes('old-only'));
}
assert.equal(buildDailyReviewReport([sameDateHistoryResult], '2026-10-03', 'my-coach'), null);

function expectThrowsMessage(callback, expectedMessage) {
    assert.throws(callback, (error) => error instanceof Error && error.message.includes(expectedMessage));
}

const parsed = parseTabbedWordList(
    '\ncatch up with\tv 赶上\neasy‑going\tadj 随和的\nunknown\t\n',
    '2026-05-09'
);
assert.equal(parsed.length, 3, '空行不计入词条数');
assert.deepEqual(
    { english: parsed[0].english, meaning: parsed[0].meaning },
    { english: 'catch up with', meaning: 'v 赶上' },
    '普通空格属于英文词组，只有 Tab 分隔释义'
);
assert.equal(parsed[2].meaning, '', '空释义允许加载');
assert.notEqual(parsed[0].entryId, parsed[1].entryId, '词条 ID 应稳定区分不同原始行');

const duplicates = parseTabbedWordList('echo\tn 回声\necho\tn 回声\n', 'duplicates');
assert.notEqual(duplicates[0].entryId, duplicates[1].entryId, '完全重复行也必须有不同 ID');
assert.deepEqual(
    parseTabbedWordList('echo\tn 回声\necho\tn 回声\n', 'duplicates').map((entry) => entry.entryId),
    duplicates.map((entry) => entry.entryId),
    '相同源文本应产生稳定 ID'
);

expectThrowsMessage(() => parseTabbedWordList('missing separator', 'bad'), '第 1 行缺少 Tab');
expectThrowsMessage(() => parseTabbedWordList('\t中文', 'bad'), '第 1 行英文为空');
expectThrowsMessage(() => parseTabbedWordList('word\tn 中文\textra', 'bad'), '第 1 行包含多个 Tab');

assert.equal(buildBookFingerprint('same content'), buildBookFingerprint('same content'));
assert.notEqual(buildBookFingerprint('before'), buildBookFingerprint('after'));

const initialWord = { ...parsed[0], tested: false, revealed: false, forgotten: false };
const firstClick = applyWordClick(initialWord);
assert.deepEqual(
    { tested: firstClick.tested, revealed: firstClick.revealed, forgotten: firstClick.forgotten },
    { tested: true, revealed: false, forgotten: false },
    '第一次点击只推进测试，不揭示释义'
);
const secondClick = applyWordClick(firstClick);
assert.equal(secondClick.revealed, true, '第二次点击揭示释义');
assert.equal(applyWordClick(secondClick).revealed, true, '后续点击保持释义可见');

const forgottenBeforeAudio = toggleForgotten(initialWord);
assert.deepEqual(
    { tested: forgottenBeforeAudio.tested, forgotten: forgottenBeforeAudio.forgotten },
    { tested: true, forgotten: true },
    '标记遗忘也算已测试'
);
const restored = toggleForgotten(forgottenBeforeAudio);
assert.deepEqual(
    { tested: restored.tested, forgotten: restored.forgotten },
    { tested: true, forgotten: false },
    '撤销遗忘不倒退测试进度'
);

assert.deepEqual(calculateBookStats([initialWord]), {
    testedCount: 0,
    forgottenCount: 0,
    correctCount: 0,
    remainingCount: 1,
    accuracy: null
});
assert.deepEqual(calculateBookStats([firstClick, forgottenBeforeAudio]), {
    testedCount: 2,
    forgottenCount: 1,
    correctCount: 1,
    remainingCount: 0,
    accuracy: 50
});

assert.equal(getBeijingDateYmd(new Date('2026-09-24T16:01:00.000Z')), '2026-09-25');
assert.equal(toSpeechText('catch up with'), 'catch up with');
assert.equal(toSpeechText('easy‑going'), 'easy-going');
assert.equal(toSpeechText('depend on/upon'), 'depend on or upon');

const completedEntries = [
    { ...parsed[0], tested: true, revealed: false, forgotten: true },
    { ...parsed[1], tested: true, revealed: true, forgotten: false },
    { ...parsed[2], tested: false, revealed: false, forgotten: false }
];
const completed = createCompletedResult({
    book: { bookId: '2026-05-09', bookNumber: 1, totalWords: 3, sourceFingerprint: 'fp' },
    entries: completedEntries,
    completedAt: new Date('2026-09-24T16:30:00.000Z')
});
assert.equal(completed.reviewDateBeijing, '2026-09-25');
assert.equal(completed.testedCount, 2, '提前完成按实际已测试词数保存');
assert.equal(completed.forgottenCount, 1);
assert.equal(completed.accuracy, 50);
assert.deepEqual(completed.testedEntryIds, [parsed[0].entryId, parsed[1].entryId]);
assert.deepEqual(completed.forgottenWords, [{
    entryId: parsed[0].entryId,
    english: 'catch up with',
    meaning: 'v 赶上'
}]);

const result2 = {
    bookId: '2026-05-15',
    bookNumber: 2,
    totalWords: 2,
    testedCount: 2,
    forgottenCount: 0,
    correctCount: 2,
    accuracy: 100,
    completedAt: '2026-09-25T02:00:00.000Z',
    reviewDateBeijing: '2026-09-25',
    forgottenWords: []
};
const dailyReport = buildDailyReviewReport([result2, completed], '2026-09-25');
assert(dailyReport.includes('【杨开迪抗遗忘复习报告】'));
assert(dailyReport.includes('完成：2 册'));
assert(dailyReport.includes('复习：4 词'));
assert(dailyReport.includes('遗忘：1 词'));
assert(dailyReport.includes('正确：3 词'));
assert(dailyReport.includes('正确率：75%'));
assert(dailyReport.indexOf('第 1 册') < dailyReport.indexOf('第 2 册'), '按册序号升序输出');
assert(dailyReport.includes('catch up with  v 赶上'));
assert(dailyReport.includes('【第 2 册 · 2026-05-15】\n无遗忘词'));
assert(!/费用|工资|计费档位/.test(dailyReport));
assert.equal(buildDailyReviewReport([completed], '2026-09-26'), null, '无当日结果返回空状态');

const books = [
    { bookId: '2026-05-09', bookNumber: 1, totalWords: 3 },
    { bookId: '2026-05-15', bookNumber: 2, totalWords: 2 },
    { bookId: '2026-05-16', bookNumber: 3, totalWords: 4 }
];
const summary = buildReviewSummaryReport(
    [result2, completed],
    books,
    new Date('2026-09-25T12:00:00.000Z')
);
assert(summary.includes('【杨开迪历史词库复习 Summary】'));
assert(summary.includes('已完成：2 / 3 册'));
assert(summary.includes('已复习：4 / 9 词'));
assert(summary.includes('总体正确率：75%'));
assert(summary.includes('2026-09-25｜完成 2 册｜复习 4 词｜遗忘 1 词｜正确率 75%'));
assert(!summary.includes('四、累计需继续复习的单词'), 'Summary 不应重复完整遗忘词清单');
assert(!summary.includes('catch up with'), '完整遗忘词应由专用清单导出');
assert(!/费用|工资|计费档位|模式 1/.test(summary));

const exportText = buildForgottenWordsByBookExport(
    [result2, completed],
    '杨开迪',
    new Date('2026-09-25T12:00:00.000Z')
);
assert(exportText.includes('学生姓名：杨开迪'));
assert(exportText.includes('catch up with\tv 赶上'));
assert(exportText.includes('【第 1 册 · 2026-05-09】'));
assert(!exportText.includes('【第 2 册 · 2026-05-15】'), '按册 Mapping 只输出有遗忘词的册');
assert(!/费用|工资|计费档位/.test(exportText));
assert.equal(buildForgottenWordsExport, buildForgottenWordsByBookExport, '保留原导出函数兼容调用方');

const repeatedForgotten = {
    ...result2,
    forgottenCount: 2,
    correctCount: 0,
    accuracy: 0,
    forgottenWords: [
        { ...completed.forgottenWords[0], meaning: 'v 赶上；达到' },
        { ...completed.forgottenWords[0], meaning: 'v 赶上；达到' }
    ]
};
const uniqueExportText = buildUniqueForgottenWordsExport(
    [completed, repeatedForgotten],
    '杨开迪',
    new Date('2026-09-25T12:00:00.000Z')
);
assert.equal((uniqueExportText.match(/catch up with/g) || []).length, 1, '全列表应去重');
assert(
    uniqueExportText.includes('来源：第 1 册（2026-05-09）、第 2 册（2026-05-15）'),
    '全列表应保留每册 Mapping 和词库日期'
);
assert(!uniqueExportText.includes('第 2 册（2026-05-15）、第 2 册（2026-05-15）'), '同册来源不应重复');

const legacyResultWithoutAccuracy = {
    ...completed,
    testedCount: 3,
    forgottenCount: 2,
    correctCount: undefined,
    accuracy: undefined
};
assert(
    buildDailyReviewReport([legacyResultWithoutAccuracy], '2026-09-25').includes('正确率：33.33%'),
    '旧结果缺少 accuracy 时，日报应从测试数和遗忘数补算'
);
assert(
    buildReviewSummaryReport([legacyResultWithoutAccuracy], books).includes('正确率：33.33%'),
    '旧结果缺少 accuracy 时，Summary 应从测试数和遗忘数补算'
);
assert(
    buildForgottenWordsExport([legacyResultWithoutAccuracy], '杨开迪').includes('正确率：33.33%'),
    '旧结果缺少 accuracy 时，遗忘词报告应从测试数和遗忘数补算'
);

const revisedResult = updateCompletedResult(legacyResultWithoutAccuracy, completedEntries);
assert.equal(revisedResult.testedCount, 3, '保存修改不得改变原测试词数');
assert.equal(revisedResult.reviewDateBeijing, legacyResultWithoutAccuracy.reviewDateBeijing, '保存修改不得改变原复习日期');
assert.equal(revisedResult.forgottenCount, 1);
assert.equal(revisedResult.correctCount, 2);
assert.equal(Number(revisedResult.accuracy.toFixed(2)), 66.67);

const corpusDir = path.join(repoRoot, 'data', '杨开迪');
const corpusFiles = fs.readdirSync(corpusDir).filter((name) => name.endsWith('.txt')).sort();
assert.equal(corpusFiles.length, 30, '应扫描当前全部 30 册，而不是样例文件');
let corpusWordCount = 0;
for (const fileName of corpusFiles) {
    const text = fs.readFileSync(path.join(corpusDir, fileName), 'utf8');
    const entries = parseTabbedWordList(text, fileName.replace(/\.txt$/, ''));
    corpusWordCount += entries.length;
}
assert.equal(corpusWordCount, 1528, '当前 30 册运行时总词数应为 1,528');

console.log('Yang Kaidi word review core tests passed.');