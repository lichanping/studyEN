const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const read = (fileName) => fs.readFileSync(path.join(root, fileName), 'utf8');

const antiForgettingHtml = read('anti-forgetting.html');
const page = read('yang-kaidi-word-review.html');
const controller = read('yang-kaidi-word-review.js');
const styles = read('yang-kaidi-word-review.css');

assert(antiForgettingHtml.includes('id="yangKaidiWordReviewButton"'));
assert(antiForgettingHtml.includes("window.location.href = 'yang-kaidi-word-review.html'"));

for (const id of [
    'myCoachSourceButton',
    'oldCoachSourceButton',
    'sourceLabel',
    'bookListView',
    'reviewView',
    'forgottenView',
    'forgottenByBookButton',
    'forgottenUniqueButton',
    'copyForgottenButton',
    'downloadForgottenButton',
    'overallProgress',
    'bookList',
    'wordList',
    'completeBookButton',
    'reportDate',
    'generateDailyReportButton',
    'generateSummaryButton',
    'reportOutput'
]) {
    assert(page.includes(`id="${id}"`), `页面缺少 #${id}`);
}
assert(!page.includes('id="copyReportButton"'), '生成后会自动复制，不应保留重复的复制按钮');
assert(!page.includes('id="downloadReportButton"'), '生成后会自动下载，不应保留重复的下载按钮');
assert(page.includes('yang-kaidi-word-review.css'));
assert(page.includes('type="module" src="yang-kaidi-word-review.js"'));
assert(controller.includes('getSourceBooks(activeSourceId)'));
assert(controller.includes('fetch(book.path)'));
assert(controller.includes('activeSourceId = DEFAULT_REVIEW_SOURCE'));
assert(controller.includes('switchReviewSource'));
assert(controller.includes('createYangKaidiWordReviewRepository'));
assert(controller.includes('sourceFingerprint'));
assert(controller.includes('repository.completeBook'));
assert(controller.includes("elements.completeBookButton.textContent = '保存中...'"));
assert(controller.includes("elements.completeBookButton.textContent = '已保存 ✓'"));
assert(controller.includes("source: 'yangKaidiHistory'"));
assert(controller.includes("selectSourceRecords(loadedResults, 'old-coach')"));
assert(controller.includes("if (getRecordSourceId(result) === 'old-coach')"));
assert(controller.includes('showReportText(currentReportText)'));
assert(controller.includes('copyToClipboard(currentReportText)'));
assert(controller.includes('downloadText(currentReportText'));
assert(controller.includes("? '报告已生成、复制并下载 TXT'"));
assert(controller.includes(": '报告已生成并下载 TXT，但自动复制失败'"));
assert(controller.includes('setTimeout(() => URL.revokeObjectURL(url), 0)'));
assert(!controller.includes('elements.copyReportButton'));
assert(!controller.includes('elements.downloadReportButton'));
assert(controller.includes('buildForgottenWordsExport'));
assert(controller.includes('buildUniqueForgottenWordsExport'));
assert(controller.includes('formatForgottenWordSources'));
assert(controller.includes('formatForgottenWordSources(word.sources)'));
assert(controller.includes("forgottenExportMode = 'unique'"));
assert(controller.includes('refreshForgottenExportText()'));
assert(controller.includes("elements.copyForgottenButton.textContent = '复制按册 Mapping'"));
assert(controller.includes("elements.downloadForgottenButton.textContent = '下载全列表 TXT'"));
assert(controller.includes('downloadText(currentForgottenExportText'));
assert(controller.includes('new Blob([text]'));
assert(controller.includes('copyToClipboard(currentForgottenExportText)'));
assert(controller.includes('renderUniqueForgottenWords'));
assert(controller.includes('setActiveButton([elements.forgottenByBookButton, elements.forgottenUniqueButton], elements.forgottenUniqueButton)'));
assert(controller.includes('setActiveButton([elements.generateDailyReportButton, elements.generateSummaryButton], elements.generateSummaryButton)'));
assert(controller.includes("button.setAttribute('aria-pressed', String(isActive))"));
assert(controller.includes("reportOutput.textContent = reportText"));
assert(!controller.includes('reportOutput.innerHTML'));
assert(controller.includes("body: JSON.stringify({ english: speechText })"));
assert(!controller.includes('JSON.stringify({ english: speechText, meaning'));
assert(
    controller.includes('sounds/${encodeURIComponent(speechText)}.mp3'),
    '小写静态音频缺失时，应兼容 Git 中保留原始大小写的 MP3'
);
assert(page.includes('点击任一生成按钮后，将自动复制并下载 TXT'));
assert(!/计费档位|累计工资|feeAmount/.test(page), '历史复习页面不得展示工资信息');
assert(styles.includes('@media'));
assert(
    /\.book-item\s*\{[^}]*border-left:\s*5px solid var\(--yellow\)/s.test(styles),
    '未完成册应使用黄色状态边框'
);
assert(
    /\.book-item\[data-status="completed"\]\s*\{[^}]*border-left-color:\s*var\(--green\)/s.test(styles),
    '已完成册应使用绿色状态边框'
);
assert(
    /@media \(max-width:\s*1024px\)\s*\{[^}]*\.word-list\s*\{[^}]*grid-template-columns:\s*1fr/s.test(styles),
    '窄屏和平板下单词列表应保持一行一个单词'
);

async function verifySourceController() {
    const core = await import('../yang-kaidi-word-review-core.mjs');
    const historyBook = core.getSourceBooks('old-coach')[0];
    const lessonBook = core.getSourceBooks('my-coach')[0];
    const historyResult = { bookId: historyBook.bookId, bookNumber: 1, testedCount: 1, forgottenCount: 0, forgottenWords: [] };
    const lessonResult = { bookId: lessonBook.bookId, sourceId: 'my-coach', bookNumber: 1, testedCount: 2, forgottenCount: 0, forgottenWords: [] };
    const storedResults = new Map([[historyResult.bookId, historyResult], [lessonResult.bookId, lessonResult]]);
    const salarySyncs = [];
    const draftReads = [];
    const context = vm.createContext({
        ...core,
        activeSourceId: 'my-coach',
        STUDENT_NAME: '杨开迪',
        books: [], results: [], currentResult: null,
        elements: { currentBookLabel: {}, overallProgress: {} },
        draftWriteQueue: Promise.resolve(), draftWriteError: null,
        localStorage: {},
        repository: {
            getAllResults: async () => [...storedResults.values()],
            getDraft: async (bookId) => { draftReads.push(bookId); return null; },
            completeBook: async (result) => storedResults.set(result.bookId, result)
        },
        fetch: async (fileName) => ({ ok: true, text: async () => read(fileName) }),
        syncBfdHistoryReviewResults: (_storage, _student, results) => { salarySyncs.push(results); return { ok: true }; },
        syncHistorySalary: () => salarySyncs.push('completion'),
        renderBookList: () => {}, showToast: () => {}, openBook: async () => {},
        window: { confirm: () => true }, Date
    });
    const loadCode = controller.slice(controller.indexOf('async function loadBooks('), controller.indexOf('\nfunction renderBookList('));
    vm.runInContext(`${loadCode}; this.loadBooks = loadBooks;`, context);
    await context.loadBooks();
    assert.equal(salarySyncs.length, 0, '默认加载正课不得补同步历史工资');
    assert.equal(context.books.length, 3);
    assert.equal(context.books[0].totalWords, 75);
    assert.equal(context.books[1].totalWords, 71);
    assert.equal(context.books[1].bookId, 'my-coach:2026-10-04');
    assert.equal(context.books[2].totalWords, 55);
    assert.equal(context.books[2].bookId, 'my-coach:2026-10-05');
    assert.equal(context.results.length, 1);
    assert.equal(context.results[0].bookId, lessonBook.bookId);
    assert.deepEqual(draftReads, core.getSourceBooks('my-coach').map((book) => book.bookId));

    const clickCode = controller.slice(controller.indexOf('async function handleWordClick('), controller.indexOf('\nfunction handleForgottenClick('));
    vm.runInContext(`${clickCode}; this.handleWordClick = handleWordClick;`, context);
    const clickedAudio = [];
    let clickDraftWrites = 0;
    context.renderReview = () => {};
    context.playEnglish = async (speechText) => clickedAudio.push(speechText);
    context.queueDraftSave = () => { clickDraftWrites += 1; };
    context.currentResult = lessonResult;
    context.currentEntries = context.books[0].entries.map((entry, index) => ({ ...entry, tested: index < 2 }));
    const resultBeforeClick = JSON.stringify(lessonResult);
    await context.handleWordClick(2);
    assert.equal(context.currentEntries[2].revealed, true, '已完成册的未测试词点击后也应显示中文');
    assert.equal(context.currentEntries[2].tested, false, '查看已完成册释义不得增加原测试词数');
    await context.handleWordClick(0);
    assert.equal(context.currentEntries[0].revealed, true, '已完成册的原测试词点击后显示中文');
    assert.equal(core.calculateBookStats(context.currentEntries).testedCount, 2);
    assert.equal(clickDraftWrites, 0, '查看已完成结果不得写草稿');
    assert.equal(JSON.stringify(lessonResult), resultBeforeClick, '查看释义不得修改已存结果');
    assert.equal(salarySyncs.length, 0, '查看释义不得同步工资');
    context.currentResult = null;
    context.currentEntries = [{ ...context.books[0].entries[2], tested: false, revealed: false }];
    await context.handleWordClick(0);
    assert.equal(context.currentEntries[0].tested, true);
    assert.equal(context.currentEntries[0].revealed, false, '未完成册首次点击仍只播放英文');
    await context.handleWordClick(0);
    assert.equal(context.currentEntries[0].revealed, true, '未完成册再次点击才显示中文');
    assert.equal(clickDraftWrites, 2);
    assert.equal(clickedAudio.length, 4, '查看释义仍播放英文');

    context.currentBook = context.books[0];
    context.currentEntries = context.currentBook.entries.map((entry, index) => ({ ...entry, tested: index < 2, forgotten: index === 0 }));
    const completeCode = controller.slice(controller.indexOf('async function completeCurrentBook('), controller.indexOf('\nfunction syncHistorySalary('));
    vm.runInContext(`${completeCode}; this.completeCurrentBook = completeCurrentBook;`, context);
    await context.completeCurrentBook();
    assert.equal(salarySyncs.length, 0, '完成正课不得写入工资');
    assert.equal(storedResults.get(lessonBook.bookId).testedCount, 2);
    assert.equal(storedResults.get(lessonBook.bookId).forgottenCount, 1);
    assert.equal(storedResults.get(lessonBook.bookId).sourceId, 'my-coach');
    assert.strictEqual(storedResults.get(historyBook.bookId), historyResult, '正课保存不覆盖旧结果');
    assert.equal(context.results.length, 1, '完成后仍只展示当前来源');

    context.fetch = async () => ({ ok: true, text: async () => 'broken no tab' });
    await assert.rejects(context.loadBooks(), /正课.*2026-10-02.*第 1 行缺少 Tab/);
    context.fetch = async (fileName) => ({ ok: true, text: async () => read(fileName) });
    context.activeSourceId = 'old-coach';
    await context.loadBooks();
    assert.equal(context.books.length, 30, '新来源加载失败不影响切换历史');
    assert.equal(context.results.length, 1);
    assert.equal(salarySyncs.length, 1);
    assert.deepEqual(salarySyncs[0].map((result) => result.bookId), [historyBook.bookId], '历史补同步排除正课结果');
    assert(draftReads.includes(historyBook.bookId), '历史草稿仍按原主键读取');

    context.currentResult = null;
    context.currentBook = context.books[0];
    context.currentEntries = context.currentBook.entries.map((entry, index) => ({ ...entry, tested: index === 0 }));
    await context.completeCurrentBook();
    assert.equal(salarySyncs[salarySyncs.length - 1], 'completion', '历史完成仍触发原工资同步');

    context.activeSourceId = 'my-coach';
    context.currentResult = null;
    context.currentBook = { ...lessonBook, entries: core.parseTabbedWordList(read(lessonBook.path), lessonBook.bookId), draft: {} };
    context.currentEntries = context.currentBook.entries.map((entry, index) => ({ ...entry, tested: index === 0 }));
    context.changingSource = false;
    context.savingBook = false;
    context.view = 'reviewView';
    context.showView = (view) => { context.view = view; };
    context.elements.sourceLabel = { textContent: '正课词库' };
    context.elements.reportOutput = { textContent: '正课报告' };
    context.elements.reportStatus = {};
    context.elements.forgottenSummary = { replaceChildren: () => {} };
    context.elements.bookList = { replaceChildren: () => {} };
    context.elements.myCoachSourceButton = {};
    context.elements.oldCoachSourceButton = {};
    context.sourceButtons = [context.elements.myCoachSourceButton, context.elements.oldCoachSourceButton];
    context.setSourceButtonsDisabled = (disabled) => context.sourceButtons.forEach((button) => { button.disabled = disabled; });
    context.setActiveButton = () => {};
    context.repository.putDraft = async () => { throw new Error('storage write failed'); };
    const draftCode = controller.slice(controller.indexOf('function queueDraftSave('), controller.indexOf('\nasync function completeCurrentBook('));
    vm.runInContext(draftCode, context);
    await context.switchReviewSource('old-coach');
    assert.equal(context.activeSourceId, 'my-coach', '草稿写入失败不得切换来源');
    assert.equal(context.view, 'reviewView');
    assert.equal(context.currentEntries[0].tested, true, '写入失败保留当前测试状态');
    assert.equal(context.sourceButtons[0].disabled, false);
    let recoveredDraft;
    context.repository.putDraft = async (draft) => { recoveredDraft = draft; };
    await context.switchReviewSource('old-coach');
    assert.equal(context.activeSourceId, 'old-coach', '重试保存成功后可切换');
    assert.equal(recoveredDraft.bookId, lessonBook.bookId);
    assert.equal(recoveredDraft.sourceId, 'my-coach');
    assert.equal(context.elements.reportOutput.textContent, '', '切换来源清除旧报告');
    assert.equal(context.elements.sourceLabel.textContent, '历史词库');

    const played = [];
    context.audioCache = new Map();
    context.Audio = class {
        constructor(url) { this.url = url; }
        async play() {
            if (!['sounds/Abroad.mp3', 'sounds/Engineer.mp3'].includes(this.url)) throw new Error('missing case-sensitive path');
            played.push(this.url);
        }
    };
    context.fetch = async () => { throw new Error('已有静态音频不应请求TTS'); };
    const playCode = controller.slice(controller.indexOf('async function playEnglish('), controller.indexOf('\nfunction renderForgottenWords('));
    vm.runInContext(`${playCode}; this.playEnglish = playEnglish;`, context);
    await context.playEnglish('abroad');
    await context.playEnglish('engineer');
    assert.deepEqual(played, ['sounds/Abroad.mp3', 'sounds/Engineer.mp3']);
}

verifySourceController().then(() => console.log('test-yang-kaidi-word-review-ui passed')).catch((error) => {
    console.error(error);
    process.exitCode = 1;
});