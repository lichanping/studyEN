const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (fileName) => fs.readFileSync(path.join(root, fileName), 'utf8');

const antiForgettingHtml = read('anti-forgetting.html');
const page = read('yang-kaidi-word-review.html');
const controller = read('yang-kaidi-word-review.js');
const styles = read('yang-kaidi-word-review.css');

assert(antiForgettingHtml.includes('id="yangKaidiWordReviewButton"'));
assert(antiForgettingHtml.includes("window.location.href = 'yang-kaidi-word-review.html'"));

for (const id of [
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
assert.equal((controller.match(/'2026-\d{2}-\d{2}'/g) || []).length, 30, '应登记 30 个源 TXT 文件');
assert(controller.includes("fetch(`data/杨开迪/${bookId}.txt`)"));
assert(controller.includes('createYangKaidiWordReviewRepository'));
assert(controller.includes('sourceFingerprint'));
assert(controller.includes('repository.completeBook'));
assert(controller.includes("elements.completeBookButton.textContent = '保存中...'"));
assert(controller.includes("elements.completeBookButton.textContent = '已保存 ✓'"));
assert(controller.includes("source: 'yangKaidiHistory'"));
assert(controller.includes('syncBfdHistoryReviewResults(localStorage, STUDENT_NAME, loadedResults)'));
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

console.log('test-yang-kaidi-word-review-ui passed');