import { parseVocabularyLine } from './word-audio-format.mjs';

export const DEFAULT_REVIEW_SOURCE = 'my-coach';
export const WORD_REVIEW_SOURCES = [
    {
        sourceId: 'old-coach', label: '历史', directory: 'data/杨开迪',
        bookDates: [
            '2026-05-09', '2026-05-15', '2026-05-16', '2026-05-22', '2026-05-23',
            '2026-05-29', '2026-05-30', '2026-06-01', '2026-06-07', '2026-06-13',
            '2026-06-14', '2026-06-20', '2026-06-26', '2026-06-27', '2026-07-13',
            '2026-07-22', '2026-07-24', '2026-08-03', '2026-08-05', '2026-08-12',
            '2026-08-14', '2026-08-20', '2026-08-24', '2026-08-26', '2026-08-28',
            '2026-08-31', '2026-09-04', '2026-09-06', '2026-09-12', '2026-09-18'
        ]
    },
    {
        sourceId: 'my-coach', label: '正课', directory: 'data/杨开迪-我的',
        bookDates: ['2026-10-02', '2026-10-04']
    }
];

export function getReviewSource(sourceId) {
    const source = WORD_REVIEW_SOURCES.find((item) => item.sourceId === sourceId);
    if (!source) throw new Error('未知词库来源');
    return source;
}

export function getSourceBooks(sourceId) {
    const source = getReviewSource(sourceId);
    return [...source.bookDates].sort().map((bookDate, index) => ({
        sourceId,
        bookId: sourceId === 'old-coach' ? bookDate : `${sourceId}:${bookDate}`,
        bookDate,
        bookNumber: index + 1,
        path: `${source.directory}/${bookDate}.txt`
    }));
}

export function getRecordSourceId(record) {
    return record.sourceId || (String(record.bookId).startsWith('my-coach:') ? 'my-coach' : 'old-coach');
}

export function getBookDate(book) {
    return book.bookDate || String(book.bookId).replace(/^my-coach:/, '');
}

export function selectSourceRecords(records, sourceId) {
    return records.filter((record) => getRecordSourceId(record) === sourceId);
}

function formatPercent(value) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return '--';
    return `${Number(numericValue.toFixed(2))}%`;
}

function getResultAccuracy(result) {
    const storedAccuracy = Number(result?.accuracy);
    if (Number.isFinite(storedAccuracy)) return storedAccuracy;
    const testedCount = Number(result?.testedCount) || 0;
    const forgottenCount = Number(result?.forgottenCount) || 0;
    return testedCount > 0 ? (testedCount - forgottenCount) / testedCount * 100 : null;
}

function formatBeijingDateTime(date) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23'
    }).formatToParts(date).reduce((result, part) => {
        result[part.type] = part.value;
        return result;
    }, {});
    return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
}

export function buildBookFingerprint(text) {
    let hash = 2166136261;
    for (const character of String(text)) {
        hash ^= character.codePointAt(0);
        hash = Math.imul(hash, 16777619);
    }
    return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export function parseTabbedWordList(text, bookId) {
    const duplicateCounts = new Map();
    const entries = [];

    String(text).split(/\r?\n/).forEach((rawLine, index) => {
        if (!rawLine.trim()) return;
        const tabCount = (rawLine.match(/\t/g) || []).length;
        if (tabCount === 0) {
            throw new Error(`第 ${index + 1} 行缺少 Tab`);
        }
        if (tabCount > 1) {
            throw new Error(`第 ${index + 1} 行包含多个 Tab`);
        }
        const { english, meaning } = parseVocabularyLine(rawLine);
        if (!english) {
            throw new Error(`第 ${index + 1} 行英文为空`);
        }
        const normalizedLine = `${english}\t${meaning}`;
        const duplicateIndex = duplicateCounts.get(normalizedLine) || 0;
        duplicateCounts.set(normalizedLine, duplicateIndex + 1);
        entries.push({
            entryId: `${bookId}:${buildBookFingerprint(normalizedLine)}:${duplicateIndex}`,
            english,
            meaning,
            tested: false,
            revealed: false,
            forgotten: false
        });
    });

    return entries;
}

export function applyWordClick(entry) {
    return {
        ...entry,
        tested: true,
        revealed: Boolean(entry.tested) || Boolean(entry.revealed)
    };
}

export function toggleForgotten(entry) {
    return {
        ...entry,
        tested: true,
        forgotten: !entry.forgotten
    };
}

export function calculateBookStats(entries) {
    const testedCount = entries.filter((entry) => entry.tested).length;
    const forgottenCount = entries.filter((entry) => entry.forgotten).length;
    const correctCount = testedCount - forgottenCount;
    return {
        testedCount,
        forgottenCount,
        correctCount,
        remainingCount: entries.length - testedCount,
        accuracy: testedCount === 0 ? null : correctCount / testedCount * 100
    };
}

export function getBeijingDateYmd(date = new Date()) {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(date);
}

export function toSpeechText(english) {
    return String(english)
        .replace(/[‐‑‒–—―]/g, '-')
        .replace(/(?<=[A-Za-z])\/(?=[A-Za-z])/g, ' or ');
}

export function createCompletedResult({ book, entries, completedAt = new Date() }) {
    const stats = calculateBookStats(entries);
    return {
        bookId: book.bookId,
        sourceId: getRecordSourceId(book),
        bookDate: getBookDate(book),
        bookNumber: book.bookNumber,
        totalWords: book.totalWords,
        sourceFingerprint: book.sourceFingerprint,
        testedCount: stats.testedCount,
        forgottenCount: stats.forgottenCount,
        correctCount: stats.correctCount,
        accuracy: stats.accuracy,
        completedAt: completedAt.toISOString(),
        reviewDateBeijing: getBeijingDateYmd(completedAt),
        testedEntryIds: entries.filter((entry) => entry.tested).map((entry) => entry.entryId),
        forgottenWords: entries
            .filter((entry) => entry.forgotten)
            .map(({ entryId, english, meaning }) => ({ entryId, english, meaning }))
    };
}

export function updateCompletedResult(result, entries) {
    const forgottenWords = entries
        .filter((entry) => entry.forgotten)
        .map(({ entryId, english, meaning }) => ({ entryId, english, meaning }));
    const testedCount = Number(result.testedCount) || 0;
    const forgottenCount = forgottenWords.length;
    const correctCount = testedCount - forgottenCount;
    return {
        ...result,
        forgottenCount,
        correctCount,
        accuracy: testedCount > 0 ? correctCount / testedCount * 100 : null,
        forgottenWords
    };
}

function sortResults(results) {
    return [...results].sort((left, right) => left.bookNumber - right.bookNumber);
}

function forgottenSection(result, useTab = false) {
    const heading = `【第 ${result.bookNumber} 册 · ${getBookDate(result)}】`;
    if (!result.forgottenWords.length) return `${heading}\n无遗忘词`;
    const separator = useTab ? '\t' : '  ';
    const words = result.forgottenWords
        .map((word) => `${word.english}${separator}${word.meaning}`.trimEnd())
        .join('\n');
    return `${heading}\n${words}`;
}

export function buildDailyReviewReport(results, reviewDateBeijing, sourceId = 'old-coach') {
    const source = getReviewSource(sourceId);
    const selected = sortResults(selectSourceRecords(results, sourceId).filter((result) => result.reviewDateBeijing === reviewDateBeijing));
    if (!selected.length) return null;
    const testedCount = selected.reduce((sum, result) => sum + result.testedCount, 0);
    const forgottenCount = selected.reduce((sum, result) => sum + result.forgottenCount, 0);
    const correctCount = testedCount - forgottenCount;
    const details = selected.map((result, index) => [
        `${index + 1}. 第 ${result.bookNumber} 册｜词库日期：${getBookDate(result)}`,
        `\t已测试：${result.testedCount}  遗忘：${result.forgottenCount}  正确率：${formatPercent(getResultAccuracy(result))}`
    ].join('\n')).join('\n');
    const forgottenWords = selected.map((result) => forgottenSection(result)).join('\n\n');

    return [
        '【杨开迪抗遗忘复习报告】',
        `复习日期：${reviewDateBeijing}（北京时间）`,
        `词库来源：${source.label}`,
        `复习方式：${source.label}词库逐册复习`,
        '',
        '一、当日完成',
        details,
        '',
        '二、当日汇总',
        `完成：${selected.length} 册`,
        `复习：${testedCount} 词`,
        `遗忘：${forgottenCount} 词`,
        `正确：${correctCount} 词`,
        `正确率：${formatPercent(correctCount / testedCount * 100)}`,
        '',
        '三、需继续复习的单词',
        forgottenWords
    ].join('\n');
}

export function buildReviewSummaryReport(results, books, generatedAt = new Date(), sourceId = 'old-coach') {
    const source = getReviewSource(sourceId);
    const completed = sortResults(selectSourceRecords(results, sourceId));
    const selectedBooks = selectSourceRecords(books, sourceId);
    const totalWords = selectedBooks.reduce((sum, book) => sum + book.totalWords, 0);
    const testedCount = completed.reduce((sum, result) => sum + result.testedCount, 0);
    const forgottenCount = completed.reduce((sum, result) => sum + result.forgottenCount, 0);
    const correctCount = testedCount - forgottenCount;
    const byDate = new Map();
    completed.forEach((result) => {
        const aggregate = byDate.get(result.reviewDateBeijing) || {
            bookCount: 0,
            testedCount: 0,
            forgottenCount: 0
        };
        aggregate.bookCount += 1;
        aggregate.testedCount += result.testedCount;
        aggregate.forgottenCount += result.forgottenCount;
        byDate.set(result.reviewDateBeijing, aggregate);
    });
    const dateLines = [...byDate.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([date, aggregate]) => {
        const correct = aggregate.testedCount - aggregate.forgottenCount;
        return `${date}｜完成 ${aggregate.bookCount} 册｜复习 ${aggregate.testedCount} 词｜遗忘 ${aggregate.forgottenCount} 词｜正确率 ${formatPercent(correct / aggregate.testedCount * 100)}`;
    });
    const bookLines = completed.map((result, index) => [
        `${index + 1}. 第 ${result.bookNumber} 册｜词库日期：${getBookDate(result)}｜复习日期：${result.reviewDateBeijing}`,
        `\t已测试：${result.testedCount}  遗忘：${result.forgottenCount}  正确率：${formatPercent(getResultAccuracy(result))}`
    ].join('\n'));

    return [
        `【杨开迪${source.label}词库复习 Summary】`,
        `生成时间：${formatBeijingDateTime(generatedAt)}（北京时间）`,
        `词库来源：${source.label}`,
        '',
        '一、总体进度',
        `已完成：${completed.length} / ${selectedBooks.length} 册`,
        `已复习：${testedCount} / ${totalWords} 词`,
        `遗忘：${forgottenCount} 词`,
        `正确：${correctCount} 词`,
        `总体正确率：${formatPercent(testedCount ? correctCount / testedCount * 100 : null)}`,
        '',
        '二、按复习日期汇总',
        dateLines.length ? dateLines.join('\n') : '暂无已完成复习记录',
        '',
        '三、已完成册明细',
        bookLines.length ? bookLines.join('\n') : '暂无已完成复习记录'
    ].join('\n');
}

function forgottenExportHeader(title, studentName, generatedAt) {
    return [
        title,
        `学生姓名：${studentName}`,
        `生成时间（北京时间）：${formatBeijingDateTime(generatedAt)}`,
        ''
    ];
}

export function buildForgottenWordsByBookExport(results, studentName, generatedAt = new Date(), sourceId = 'old-coach') {
    const source = getReviewSource(sourceId);
    const sections = sortResults(selectSourceRecords(results, sourceId)).filter((result) => result.forgottenWords.length).map((result) => {
        const words = result.forgottenWords
            .map((word) => `${word.english}\t${word.meaning}`.trimEnd())
            .join('\n');
        return [
            `【第 ${result.bookNumber} 册 · ${getBookDate(result)}】`,
            `复习日期（北京时间）：${result.reviewDateBeijing}`,
            `已测试：${result.testedCount}  遗忘：${result.forgottenCount}  正确率：${formatPercent(getResultAccuracy(result))}`,
            words
        ].join('\n');
    });
    return [
        ...forgottenExportHeader(`杨开迪${source.label}单词复习遗忘词 · 按册 Mapping`, studentName, generatedAt),
        sections.length ? sections.join('\n\n') : '暂无遗忘词'
    ].join('\n');
}

export function formatForgottenWordSources(sources) {
    return sources
        .map((source) => `${getRecordSourceId(source) === 'my-coach' ? '正课 · ' : ''}第 ${source.bookNumber} 册（${getBookDate(source)}）`)
        .join('、');
}

export function buildUniqueForgottenWordsExport(results, studentName, generatedAt = new Date(), sourceId = 'old-coach') {
    const source = getReviewSource(sourceId);
    const unique = new Map();
    sortResults(selectSourceRecords(results, sourceId)).forEach((result) => {
        result.forgottenWords.forEach((word) => {
            const key = toSpeechText(word.english).toLowerCase().replace(/\s+/g, ' ').trim();
            if (!unique.has(key)) unique.set(key, { ...word, sources: [] });
            const sources = unique.get(key).sources;
            const source = { bookNumber: result.bookNumber, bookId: result.bookId };
            if (!sources.some((item) => item.bookNumber === source.bookNumber && item.bookId === source.bookId)) {
                sources.push(source);
            }
        });
    });
    const lines = [...unique.values()].map((word, index) => (
        `${index + 1}. ${word.english}\t${word.meaning}\t来源：${formatForgottenWordSources(word.sources)}`.trimEnd()
    ));
    return [
        ...forgottenExportHeader(`杨开迪${source.label}单词复习遗忘词 · 全列表（去重）`, studentName, generatedAt),
        lines.length ? lines.join('\n') : '暂无遗忘词'
    ].join('\n');
}

export const buildForgottenWordsExport = buildForgottenWordsByBookExport;