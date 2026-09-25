import { copyToClipboard } from './commonFunctions.js';
import {
    formatBeijingDateTimeLocal,
    syncBfdExtraReviewFeeRecord,
    syncBfdHistoryReviewResults
} from './bfd-extra-review-fee.mjs';
import {
    applyWordClick,
    buildBookFingerprint,
    buildDailyReviewReport,
    buildForgottenWordsExport,
    buildUniqueForgottenWordsExport,
    buildReviewSummaryReport,
    calculateBookStats,
    createCompletedResult,
    formatForgottenWordSources,
    getBeijingDateYmd,
    parseTabbedWordList,
    toSpeechText,
    toggleForgotten,
    updateCompletedResult
} from './yang-kaidi-word-review-core.mjs';
import { createYangKaidiWordReviewRepository } from './yang-kaidi-word-review-db.mjs';

const BOOK_IDS = [
    '2026-05-09', '2026-05-15', '2026-05-16', '2026-05-22', '2026-05-23',
    '2026-05-29', '2026-05-30', '2026-06-01', '2026-06-07', '2026-06-13',
    '2026-06-14', '2026-06-20', '2026-06-26', '2026-06-27', '2026-07-13',
    '2026-07-22', '2026-07-24', '2026-08-03', '2026-08-05', '2026-08-12',
    '2026-08-14', '2026-08-20', '2026-08-24', '2026-08-26', '2026-08-28',
    '2026-08-31', '2026-09-04', '2026-09-06', '2026-09-12', '2026-09-18'
];
const STUDENT_NAME = '杨开迪';
const repository = createYangKaidiWordReviewRepository();
const audioCache = new Map();
let books = [];
let results = [];
let currentBook = null;
let currentResult = null;
let currentEntries = [];
let currentReportText = '';
let currentForgottenExportText = '';
let forgottenExportMode = 'byBook';
let draftWriteQueue = Promise.resolve();
let toastTimer;

const elements = Object.fromEntries([...document.querySelectorAll('[id]')].map((element) => [element.id, element]));

function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => elements.toast.classList.remove('visible'), 3000);
}

function showView(viewId) {
    document.querySelectorAll('.view').forEach((view) => {
        view.hidden = view.id !== viewId;
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resultFor(bookId) {
    return results.find((result) => result.bookId === bookId);
}

async function loadBooks() {
    const loadedResults = await repository.getAllResults();
    results = loadedResults;
    const historySalarySync = syncBfdHistoryReviewResults(localStorage, STUDENT_NAME, loadedResults);
    if (!historySalarySync.ok) showToast(historySalarySync.error || '模式 2 工资数据同步失败');
    books = await Promise.all(BOOK_IDS.map(async (bookId, index) => {
        const response = await fetch(`data/杨开迪/${bookId}.txt`);
        if (!response.ok) throw new Error(`${bookId} 词库读取失败`);
        const sourceText = await response.text();
        const entries = parseTabbedWordList(sourceText, bookId);
        const draft = await repository.getDraft(bookId);
        return {
            bookId,
            bookNumber: index + 1,
            totalWords: entries.length,
            sourceFingerprint: buildBookFingerprint(sourceText),
            entries,
            draft
        };
    }));
    renderBookList();
}

function renderBookList() {
    const totalWords = books.reduce((sum, book) => sum + book.totalWords, 0);
    const testedCount = results.reduce((sum, result) => sum + result.testedCount, 0);
    const forgottenCount = results.reduce((sum, result) => sum + result.forgottenCount, 0);
    elements.overallProgress.textContent = `${results.length} / ${books.length} 册 · ${testedCount} / ${totalWords} 词 · 遗忘 ${forgottenCount}`;
    elements.bookList.replaceChildren(...books.map((book) => {
        const result = resultFor(book.bookId);
        const draftStats = book.draft ? calculateBookStats(applyDraft(book.entries, book.draft)) : null;
        const status = result ? 'completed' : book.draft ? 'progress' : 'new';
        const item = document.createElement('article');
        item.className = 'book-item';
        item.dataset.status = status;
        const title = document.createElement('h3');
        title.textContent = `第 ${book.bookNumber} 册 · ${book.bookId}`;
        const meta = document.createElement('p');
        meta.className = 'book-meta';
        meta.textContent = result
            ? `已完成 · ${result.testedCount}/${book.totalWords} 词 · 遗忘 ${result.forgottenCount} · 复习日 ${result.reviewDateBeijing}`
            : draftStats
                ? `进行中 · ${draftStats.testedCount}/${book.totalWords} 词 · 遗忘 ${draftStats.forgottenCount}`
                : `未开始 · 共 ${book.totalWords} 词`;
        const button = document.createElement('button');
        button.className = result ? 'secondary' : 'primary';
        button.type = 'button';
        button.textContent = result ? '查看并修改结果' : book.draft ? '继续复习' : '开始复习';
        button.addEventListener('click', () => openBook(book));
        item.append(title, meta, button);
        return item;
    }));
}

function applyDraft(entries, draft) {
    return entries.map((entry) => ({ ...entry, ...(draft.entries[entry.entryId] || {}) }));
}

async function openBook(book) {
    currentBook = book;
    currentResult = resultFor(book.bookId) || null;
    if (currentResult) {
        const testedIds = new Set(currentResult.testedEntryIds || []);
        const forgottenIds = new Set(currentResult.forgottenWords.map((word) => word.entryId));
        currentEntries = book.entries.map((entry) => ({
            ...entry,
            tested: testedIds.has(entry.entryId),
            forgotten: forgottenIds.has(entry.entryId)
        }));
    } else if (book.draft) {
        if (book.draft.sourceFingerprint !== book.sourceFingerprint) {
            const reset = window.confirm('该册源文件已更新，旧进度无法安全恢复。是否清除旧进度并重新开始？');
            if (!reset) return;
            await repository.deleteDraft(book.bookId);
            book.draft = null;
            currentEntries = book.entries.map((entry) => ({ ...entry }));
        } else {
            currentEntries = applyDraft(book.entries, book.draft);
        }
    } else {
        currentEntries = book.entries.map((entry) => ({ ...entry }));
    }
    elements.currentBookLabel.textContent = `第 ${book.bookNumber} 册 · ${book.bookId}`;
    elements.completeBookButton.textContent = currentResult ? '保存修改' : '完成本册';
    elements.reviewHint.textContent = currentResult
        ? '已完成结果仅允许调整原测试词中的遗忘标记；测试词数、日期和工资保持不变。'
        : '首次点击只播放英文；再次点击显示释义，并再次播放英文。';
    renderReview();
    showView('reviewView');
}

function renderReview() {
    const stats = calculateBookStats(currentEntries);
    elements.reviewProgress.textContent = `${stats.testedCount} / ${currentEntries.length}`;
    elements.forgottenCount.textContent = `遗忘 ${stats.forgottenCount}`;
    elements.accuracyValue.textContent = `正确率 ${stats.accuracy === null ? '--' : `${Number(stats.accuracy.toFixed(2))}%`}`;
    elements.wordList.replaceChildren(...currentEntries.map((entry, index) => {
        const row = document.createElement('div');
        row.className = 'word-row';
        row.dataset.tested = String(entry.tested);
        row.dataset.forgotten = String(entry.forgotten);
        row.dataset.entryId = entry.entryId;
        const wordButton = document.createElement('button');
        wordButton.type = 'button';
        wordButton.className = 'word-main';
        const english = document.createElement('strong');
        english.textContent = `${index + 1}. ${entry.english}`;
        wordButton.append(english);
        if (entry.revealed) {
            const meaning = document.createElement('span');
            meaning.textContent = entry.meaning || '暂无释义';
            wordButton.append(meaning);
        }
        wordButton.addEventListener('click', () => handleWordClick(index));
        const forgetButton = document.createElement('button');
        forgetButton.type = 'button';
        forgetButton.className = 'forget-toggle';
        forgetButton.textContent = '×';
        forgetButton.setAttribute('aria-label', `${entry.forgotten ? '撤销' : '标记'}遗忘 ${entry.english}`);
        forgetButton.setAttribute('aria-pressed', String(entry.forgotten));
        forgetButton.disabled = Boolean(currentResult && !entry.tested);
        forgetButton.addEventListener('click', () => handleForgottenClick(index));
        row.append(wordButton, forgetButton);
        return row;
    }));
}

async function handleWordClick(index) {
    const previous = currentEntries[index];
    const next = applyWordClick(previous);
    if (currentResult && !previous.tested) next.tested = false;
    currentEntries[index] = next;
    renderReview();
    if (!currentResult) queueDraftSave();
    try {
        await playEnglish(toSpeechText(previous.english));
    } catch (_) {
        showToast(`“${previous.english}”发音失败，请再次点击重试`);
    }
}

function handleForgottenClick(index) {
    currentEntries[index] = toggleForgotten(currentEntries[index]);
    renderReview();
    if (!currentResult) queueDraftSave();
}

function queueDraftSave() {
    const draft = {
        bookId: currentBook.bookId,
        sourceFingerprint: currentBook.sourceFingerprint,
        entries: Object.fromEntries(currentEntries.map((entry) => [entry.entryId, {
            tested: entry.tested,
            revealed: entry.revealed,
            forgotten: entry.forgotten
        }])),
        startedAt: currentBook.draft?.startedAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    currentBook.draft = draft;
    draftWriteQueue = draftWriteQueue.then(() => repository.putDraft(draft)).catch(() => {
        showToast('进度保存失败，请稍后重试');
    });
}

async function completeCurrentBook() {
    const stats = calculateBookStats(currentEntries);
    if (currentResult) {
        const updated = updateCompletedResult(currentResult, currentEntries);
        elements.completeBookButton.disabled = true;
        elements.completeBookButton.textContent = '保存中...';
        try {
            await repository.putResult(updated);
        } catch (error) {
            elements.completeBookButton.disabled = false;
            elements.completeBookButton.textContent = '保存修改';
            throw error;
        }
        results = results.map((result) => result.bookId === updated.bookId ? updated : result);
        currentResult = updated;
        elements.completeBookButton.disabled = false;
        elements.completeBookButton.textContent = '已保存 ✓';
        showToast('遗忘词修改已保存，原复习日期和测试词数保持不变');
        renderBookList();
        window.setTimeout(() => {
            if (currentResult?.bookId === updated.bookId) {
                elements.completeBookButton.textContent = '保存修改';
            }
        }, 2000);
        return;
    }

    const accuracy = stats.accuracy === null ? '--' : `${Number(stats.accuracy.toFixed(2))}%`;
    const confirmed = window.confirm(`确认完成本册？\n已测试：${stats.testedCount}\n遗忘：${stats.forgottenCount}\n正确率：${accuracy}\n剩余未测试：${stats.remainingCount}`);
    if (!confirmed) return;
    if (stats.testedCount === 0) {
        showToast('至少测试一个单词后才能完成本册');
        return;
    }
    const result = createCompletedResult({ book: currentBook, entries: currentEntries, completedAt: new Date() });
    await draftWriteQueue;
    await repository.completeBook(result);
    results = await repository.getAllResults();
    currentBook.draft = null;
    currentResult = result;
    renderBookList();
    try {
        syncHistorySalary(result.reviewDateBeijing, result.completedAt);
        showToast('本册结果已保存');
    } catch (_) {
        showToast('结果已保存，工资同步失败，请重试');
    }
    await openBook(currentBook);
}

function syncHistorySalary(reviewDateBeijing, completedAt) {
    const totalWords = results
        .filter((result) => result.reviewDateBeijing === reviewDateBeijing)
        .reduce((sum, result) => sum + result.testedCount, 0);
    const syncResult = syncBfdExtraReviewFeeRecord(localStorage, {
        platform: 'baifendii',
        studentName: STUDENT_NAME,
        reviewTime: formatBeijingDateTimeLocal(new Date(completedAt)),
        totalWords,
        charged: totalWords > 0,
        source: 'yangKaidiHistory',
        updatedAt: new Date().toISOString()
    });
    if (!syncResult.ok) throw new Error(syncResult.error);
}

async function playEnglish(speechText) {
    if (audioCache.has(speechText)) {
        await new Audio(audioCache.get(speechText)).play();
        return;
    }
    const staticUrls = [...new Set([
        `sounds/${encodeURIComponent(speechText.toLowerCase())}.mp3`,
        `sounds/${encodeURIComponent(speechText)}.mp3`
    ])];
    for (const staticUrl of staticUrls) {
        try {
            await new Audio(staticUrl).play();
            audioCache.set(speechText, staticUrl);
            return;
        } catch (_) {}
    }
    const response = await fetch('/.netlify/functions/generate-word-pronunciation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ english: speechText })
    });
    if (!response.ok) throw new Error('TTS failed');
    const blobUrl = URL.createObjectURL(await response.blob());
    audioCache.set(speechText, blobUrl);
    await new Audio(blobUrl).play();
}

function renderForgottenWords() {
    const completed = [...results].sort((left, right) => left.bookNumber - right.bookNumber);
    if (!completed.length) {
        elements.forgottenSummary.textContent = '暂无已完成复习记录';
        return;
    }
    elements.forgottenSummary.replaceChildren(...completed.map((result) => {
        const section = document.createElement('section');
        section.className = 'forgotten-book';
        const heading = document.createElement('h3');
        heading.textContent = `第 ${result.bookNumber} 册 · ${result.bookId}`;
        const content = document.createElement('p');
        content.textContent = result.forgottenWords.length
            ? result.forgottenWords.map((word) => `${word.english}\t${word.meaning}`).join('\n')
            : '无遗忘词';
        section.append(heading, content);
        return section;
    }));
}

function renderUniqueForgottenWords() {
    const unique = new Map();
    [...results].sort((left, right) => left.bookNumber - right.bookNumber).forEach((result) => {
        result.forgottenWords.forEach((word) => {
            const key = toSpeechText(word.english).toLowerCase().replace(/\s+/g, ' ').trim();
            if (!unique.has(key)) {
                unique.set(key, { ...word, sources: [] });
            }
            const sources = unique.get(key).sources;
            const source = { bookNumber: result.bookNumber, bookId: result.bookId };
            if (!sources.some((item) => item.bookNumber === source.bookNumber && item.bookId === source.bookId)) {
                sources.push(source);
            }
        });
    });
    elements.forgottenSummary.textContent = unique.size
        ? [...unique.values()].map((word) => `${word.english}\t${word.meaning}\t来源：${formatForgottenWordSources(word.sources)}`).join('\n')
        : '暂无遗忘词';
}

function refreshForgottenExportText() {
    const isUnique = forgottenExportMode === 'unique';
    currentForgottenExportText = isUnique
        ? buildUniqueForgottenWordsExport(results, STUDENT_NAME, new Date())
        : buildForgottenWordsExport(results, STUDENT_NAME, new Date());
    if (isUnique) {
        elements.copyForgottenButton.textContent = '复制全列表';
        elements.downloadForgottenButton.textContent = '下载全列表 TXT';
    } else {
        elements.copyForgottenButton.textContent = '复制按册 Mapping';
        elements.downloadForgottenButton.textContent = '下载按册 Mapping TXT';
    }
}

function downloadText(text, fileName) {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = fileName;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
}

function showReportText(reportText) {
    elements.reportOutput.textContent = reportText;
}

function publishReport(reportText, fileName) {
    if (!reportText) {
        elements.reportStatus.textContent = '该日期暂无已完成复习记录';
        return;
    }
    currentReportText = reportText;
    showReportText(currentReportText);
    const copied = copyToClipboard(currentReportText);
    downloadText(currentReportText, fileName);
    elements.reportStatus.textContent = copied
        ? '报告已生成、复制并下载 TXT'
        : '报告已生成并下载 TXT，但自动复制失败';
}

function setActiveButton(buttons, activeButton) {
    buttons.forEach((button) => {
        const isActive = button === activeButton;
        button.classList.toggle('primary', isActive);
        button.classList.toggle('secondary', !isActive);
        button.setAttribute('aria-pressed', String(isActive));
    });
}

elements.backToBooksButton.addEventListener('click', () => showView('bookListView'));
document.querySelectorAll('.back-to-books').forEach((button) => button.addEventListener('click', () => showView('bookListView')));
elements.showForgottenButton.addEventListener('click', () => {
    forgottenExportMode = 'byBook';
    refreshForgottenExportText();
    renderForgottenWords();
    setActiveButton([elements.forgottenByBookButton, elements.forgottenUniqueButton], elements.forgottenByBookButton);
    showView('forgottenView');
});
elements.forgottenByBookButton.addEventListener('click', () => {
    forgottenExportMode = 'byBook';
    refreshForgottenExportText();
    renderForgottenWords();
    setActiveButton([elements.forgottenByBookButton, elements.forgottenUniqueButton], elements.forgottenByBookButton);
});
elements.forgottenUniqueButton.addEventListener('click', () => {
    forgottenExportMode = 'unique';
    refreshForgottenExportText();
    renderUniqueForgottenWords();
    setActiveButton([elements.forgottenByBookButton, elements.forgottenUniqueButton], elements.forgottenUniqueButton);
});
elements.copyForgottenButton.addEventListener('click', () => {
    const label = forgottenExportMode === 'unique' ? '全列表' : '按册 Mapping';
    showToast(copyToClipboard(currentForgottenExportText) ? `${label} 已复制` : '复制失败，请重试');
});
elements.downloadForgottenButton.addEventListener('click', () => {
    const label = forgottenExportMode === 'unique' ? '全列表' : '按册Mapping';
    downloadText(currentForgottenExportText, `杨开迪-历史单词复习遗忘词-${label}-${getBeijingDateYmd()}.txt`);
});
elements.showReportsButton.addEventListener('click', () => showView('reportView'));
elements.completeBookButton.addEventListener('click', () => completeCurrentBook().catch((error) => showToast(error.message)));
elements.jumpToUntestedButton.addEventListener('click', () => {
    const entry = currentEntries.find((item) => !item.tested);
    document.querySelector(`[data-entry-id="${CSS.escape(entry?.entryId || '')}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
});
elements.generateDailyReportButton.addEventListener('click', () => {
    publishReport(
        buildDailyReviewReport(results, elements.reportDate.value),
        `杨开迪-历史单词复习-当日报告-${elements.reportDate.value}.txt`
    );
    setActiveButton([elements.generateDailyReportButton, elements.generateSummaryButton], elements.generateDailyReportButton);
});
elements.generateSummaryButton.addEventListener('click', () => {
    publishReport(
        buildReviewSummaryReport(results, books, new Date()),
        `杨开迪-历史单词复习-Summary-${getBeijingDateYmd()}.txt`
    );
    setActiveButton([elements.generateDailyReportButton, elements.generateSummaryButton], elements.generateSummaryButton);
});

elements.reportDate.value = getBeijingDateYmd();
loadBooks().catch((error) => {
    elements.overallProgress.textContent = error.message;
    showToast(error.message);
});

window.addEventListener('beforeunload', () => {
    for (const url of audioCache.values()) {
        if (url.startsWith('blob:')) URL.revokeObjectURL(url);
    }
});
