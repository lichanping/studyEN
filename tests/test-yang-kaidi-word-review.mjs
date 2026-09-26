import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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