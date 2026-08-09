import { copyToClipboard, showLongText, formatLocalDateYmd } from './commonFunctions.js';

const LEAVES_STORAGE_SUFFIX = '_leaves';
const CLASS_STATS_SUFFIX = '_classStatistics';
const FEEDBACK_DB_NAME = 'FeedbackDB';
const FEEDBACK_STORE_NAME = 'feedbackData';
const MONTHLY_MODAL_ID = 'monthlySummaryModal';
const LEAVE_MODAL_ID = 'leaveRecordModal';
const LEAVE_LIST_MODAL_ID = 'leaveRecordsListModal';
const CLASS_TYPES_FOR_MONTHLY_STATS = new Set(['词汇课', '阅读完型语法课', '体验课']);

function parseLocalDateYmd(dateStr) {
    if (!dateStr) return new Date(NaN);
    const match = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return new Date(NaN);
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function getMonthRange(yearMonth) {
    const [year, month] = String(yearMonth || '').split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(year, month, 0);
    endDate.setHours(0, 0, 0, 0);
    return { startDate, endDate, year, month };
}

function getCurrentMonth() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

function getStatsStorage(userName) {
    const statsKey = `${userName}${CLASS_STATS_SUFFIX}`;
    const raw = localStorage.getItem(statsKey);
    return raw ? JSON.parse(raw) : {};
}

function getLeavesStorage(userName) {
    const leavesKey = `${userName}${LEAVES_STORAGE_SUFFIX}`;
    const raw = localStorage.getItem(leavesKey);
    return raw ? JSON.parse(raw) : [];
}

function safeRemoveElementById(id) {
    const element = document.getElementById(id);
    if (element) {
        element.remove();
    }
}

function createModalShell(id, title) {
    safeRemoveElementById(id);
    const overlay = document.createElement('div');
    overlay.id = id;
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.background = 'rgba(0, 0, 0, 0.45)';
    overlay.style.zIndex = '9999';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'flex-start';
    overlay.style.justifyContent = 'center';
    overlay.style.padding = '48px 16px';
    overlay.style.overflowY = 'auto';

    const panel = document.createElement('div');
    panel.style.background = '#2b2f36';
    panel.style.color = '#e7e7e7';
    panel.style.borderRadius = '10px';
    panel.style.padding = '28px 30px';
    panel.style.width = 'min(560px, 100%)';
    panel.style.boxSizing = 'border-box';
    panel.style.border = '1px solid #5a606a';
    panel.style.boxShadow = '0 20px 56px rgba(0, 0, 0, 0.4)';
    panel.style.fontFamily = '"Segoe UI", Arial, sans-serif';
    panel.style.lineHeight = '1.6';
    panel.style.colorScheme = 'dark';
    panel.innerHTML = `<h3 style="margin:0 0 20px;font-size:22px;font-weight:700;color:#ececec;">${title}</h3>`;

    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (event) => {
        if (event.target === overlay) {
            overlay.remove();
        }
    });

    return panel;
}

function styleModalControls(panel) {
    panel.querySelectorAll('label').forEach((label) => {
        label.style.color = '#d5d9df';
        label.style.fontSize = '15px';
        label.style.fontWeight = '600';
    });

    panel.querySelectorAll('strong').forEach((strong) => {
        strong.style.color = '#f8fafc';
        strong.style.fontSize = '18px';
        strong.style.fontWeight = '700';
    });

    panel.querySelectorAll('input').forEach((input) => {
        input.style.height = '44px';
        input.style.padding = '0 14px';
        input.style.border = '1px solid #5a606a';
        input.style.borderRadius = '10px';
        input.style.background = '#3a3d43';
        input.style.color = '#ececec';
        input.style.fontSize = '16px';
        input.style.boxSizing = 'border-box';
        input.style.colorScheme = 'dark';
    });

    panel.querySelectorAll('button').forEach((button) => {
        button.style.height = '44px';
        button.style.padding = '0 20px';
        button.style.border = '1px solid #5a606a';
        button.style.borderRadius = '10px';
        button.style.background = '#3a3d43';
        button.style.color = '#ececec';
        button.style.fontSize = '16px';
        button.style.fontWeight = '700';
        button.style.cursor = 'pointer';
        button.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.28)';
    });
}

function getSelectedUserName() {
    return document.getElementById('userName')?.value || '';
}

function getSelectedMonthInputValue() {
    return document.getElementById('monthlySummaryMonth')?.value || getCurrentMonth();
}

export function getMonthDisplay(yearMonth) {
    const [, month] = String(yearMonth || '').split('-');
    return `${Number(month || 0)}🈷️`;
}

export function getMonthlySummaryStudentDisplayName(userName) {
    const chars = [...String(userName || '').trim()];
    return chars.length === 3 ? chars.slice(1).join('') : String(userName || '').trim();
}

export function resolveLeaveCountOverride(rawValue, autoLeaveCount) {
    const normalized = String(rawValue ?? '').trim();
    if (normalized === '') return 0;
    const parsed = parseInt(normalized, 10);
    if (Number.isFinite(parsed) && parsed >= 0) {
        return parsed;
    }
    return autoLeaveCount;
}

export function calculateMonthlyClassStats(userName, yearMonth) {
    const statsKey = `${userName}_classStatistics`;
    const rawStats = localStorage.getItem(statsKey);
    const classStats = rawStats ? JSON.parse(rawStats) : {};
    const { startDate, endDate } = getMonthRange(yearMonth);
    const includedTypes = new Set(['词汇课', '阅读完型语法课', '体验课']);

    let totalNewWords = 0;
    let totalReviewWords = 0;
    let totalDuration = 0;
    let totalForgetNewWords = 0;
    let classCount = 0;
    const uniqueDates = new Set();

    Object.entries(classStats).forEach(([key, stats]) => {
        const type = stats?.type || '词汇课';
        if (!includedTypes.has(type)) return;

        const date = stats?.date || key;
        const recordDate = parseLocalDateYmd(date);
        if (Number.isNaN(recordDate.getTime())) return;

        recordDate.setHours(0, 0, 0, 0);
        if (recordDate < startDate || recordDate > endDate) return;

        const dateKey = recordDate.toISOString().split('T')[0];
        if (!uniqueDates.has(dateKey)) {
            uniqueDates.add(dateKey);
            classCount += 1;
        }

        totalNewWords += Number(stats?.newWord) || 0;
        totalReviewWords += Number(stats?.reviewWordCount) || 0;
        totalDuration += Number(stats?.duration) || 0;
        totalForgetNewWords += Number(stats?.forgetNewWords) || 0;
    });

    const newWordMasteryRate = totalNewWords > 0
        ? Math.round(((totalNewWords - totalForgetNewWords) / totalNewWords) * 100)
        : null;

    return {
        classCount,
        totalDuration: Math.round(totalDuration * 10) / 10,
        totalNewWords,
        totalReviewWords,
        totalWords: totalNewWords + totalReviewWords,
        totalForgetNewWords,
        newWordMasteryRate
    };
}

function getWeekIndexInMonth(date) {
    return Math.floor((date.getDate() - 1) / 7) + 1;
}

export function summarizeFeedbackEntries(feedbackEntries, yearMonth) {
    const { startDate, endDate } = getMonthRange(yearMonth);
    let totalReviewed = 0;
    let totalCorrect = 0;
    let sessionCount = 0;
    const weeklyStats = new Map();

    (Array.isArray(feedbackEntries) ? feedbackEntries : []).forEach((entry) => {
        const match = String(entry).match(/^(\d{4}-\d{2}-\d{2})/);
        if (!match) return;

        const recordDate = parseLocalDateYmd(match[1]);
        if (Number.isNaN(recordDate.getTime())) return;
        recordDate.setHours(0, 0, 0, 0);
        if (recordDate < startDate || recordDate > endDate) return;

        const parts = String(entry).split('|').map((part) => part.trim());
        if (parts.length < 3) return;

        const reviewed = parseInt(parts[1], 10);
        const correct = parseInt(parts[2], 10);
        if (!Number.isFinite(reviewed) || reviewed <= 0 || !Number.isFinite(correct) || correct < 0) return;

        totalReviewed += reviewed;
        totalCorrect += correct;
        sessionCount += 1;

        const weekIndex = Math.floor((recordDate.getDate() - 1) / 7) + 1;
        const previous = weeklyStats.get(weekIndex) || { reviewed: 0, correct: 0 };
        weeklyStats.set(weekIndex, {
            reviewed: previous.reviewed + reviewed,
            correct: previous.correct + correct
        });
    });

    const correctRate = totalReviewed > 0 ? Math.round((totalCorrect / totalReviewed) * 100) : 0;
    const forgetCount = Math.max(0, totalReviewed - totalCorrect);

    const weeklyRates = [...weeklyStats.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([, value]) => (value.reviewed > 0 ? value.correct / value.reviewed : 0));

    const trend = weeklyRates.length >= 2 && weeklyRates[weeklyRates.length - 1] > weeklyRates[0]
        ? 'rising'
        : 'stable';

    return {
        totalReviewed,
        totalCorrect,
        correctRate,
        forgetCount,
        sessionCount,
        trend
    };
}

export function calculateMonthlyAntiForgettingStats(userName, yearMonth) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(FEEDBACK_DB_NAME, 2);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(FEEDBACK_STORE_NAME)) {
                resolve({ totalReviewed: 0, totalCorrect: 0, correctRate: 0, forgetCount: 0, sessionCount: 0, trend: 'stable' });
                return;
            }

            const tx = db.transaction(FEEDBACK_STORE_NAME, 'readonly');
            const store = tx.objectStore(FEEDBACK_STORE_NAME);
            const getRequest = store.get(userName);
            getRequest.onerror = () => reject(getRequest.error);
            getRequest.onsuccess = () => {
                const userData = getRequest.result;
                resolve(summarizeFeedbackEntries(userData?.feedbackEntries || [], yearMonth));
            };
        };
    });
}

export function getLeaveCount(userName, yearMonth) {
    const leaves = getLeavesStorage(userName);
    const { startDate, endDate } = getMonthRange(yearMonth);
    let count = 0;

    leaves.forEach((leave) => {
        const recordDate = parseLocalDateYmd(leave?.date);
        if (Number.isNaN(recordDate.getTime())) return;
        recordDate.setHours(0, 0, 0, 0);
        if (recordDate >= startDate && recordDate <= endDate) {
            count += 1;
        }
    });

    return count;
}

const HIGHLIGHTS_LIBRARY = [
    { condition: (stats) => stats.antiForgettingCorrectRate >= 90, text: '▫️ 抗遗忘意识足，主动配合复盘，旧词巩固到位✅' },
    { condition: (stats) => stats.classCount >= 4, text: '▫️ 课堂专注认真，积极互动，单词疑问及时问，态度超赞👍' },
    { condition: (stats) => stats.antiForgettingTrend === 'rising', text: '▫️ 易混词/易错词能及时订正，二次出错率低，进步超明显✨' },
    { condition: (stats) => stats.totalDuration >= 8, text: '▫️ 自主学习性强，课后能主动打卡，坚持超给力🌟' },
    { condition: (stats) => stats.newWordMasteryRate >= 90, text: '▫️ 本月新学内容掌握得比较扎实，课堂吸收效率不错👏' }
];

export function generateHighlights(stats) {
    return HIGHLIGHTS_LIBRARY
        .filter((item) => item.condition(stats))
        .map((item) => item.text)
        .slice(0, 3);
}

const IMPROVEMENTS_LIBRARY = [
    { condition: (stats) => stats.antiForgettingSessionCount < 15, text: '▫️ 课后作业和每日复习打卡还需要继续落实，尽量把当天作业按时完成、及时巩固，记得会更牢🔄' },
    { condition: (stats) => stats.classCount < 4, text: '▫️ 本月正课次数偏少，下月可适当多安排一些课程，保持学习节奏更稳📚' },
    { condition: (stats) => stats.antiForgettingCorrectRate < 90, text: '▫️ 易错词还可以继续针对性巩固，把整体正确率再往上提一提📝' },
    { condition: (stats) => stats.antiForgettingTrend !== 'rising', text: '▫️ 复习状态还可以再稳一点，争取让后半月的表现持续往上走📈' },
    { condition: (stats) => stats.newWordMasteryRate !== null && stats.newWordMasteryRate < 90, text: '▫️ 本月新学内容里还有一些词需要反复回看，建议课后把易忘词再多巩固几遍📝' }
];

export function generateImprovements(stats) {
    if (stats.classCount === 0 && stats.antiForgettingSessionCount === 0 && stats.totalWords === 0) {
        return ['这个月我们先稍作调整，期待下个月一起把学习节奏慢慢找回来，继续稳稳往前走。'];
    }

    const matched = IMPROVEMENTS_LIBRARY
        .filter((item) => item.condition(stats))
        .map((item) => item.text)
        .slice(0, 2);

    return matched.length > 0 ? matched : ['本月表现很棒，继续保持！'];
}

function buildGoals(stats) {
    if (stats.classCount === 0 && stats.antiForgettingSessionCount === 0 && stats.totalWords === 0) {
        return ['下月优先恢复稳定上课与复习安排，先把学习节奏重新建立起来。'];
    }

    const goals = [];
    if (stats.classCount < 4) {
        goals.push('下月适当增加正课安排，尽量保持每周稳定上课频率。');
    }
    if (stats.antiForgettingSessionCount < 15) {
        goals.push('下月继续加强课后作业落实与每日复习打卡，尽量把当天新学内容及时巩固。');
    }
    if (stats.antiForgettingCorrectRate < 90) {
        goals.push('下月继续针对易错词反复巩固，争取把抗遗忘正确率再往上提。');
    }
    if (stats.newWordMasteryRate !== null && stats.newWordMasteryRate < 90) {
        goals.push('下月继续加强新词课后回顾，尽量把课堂中容易遗忘的词及时滚动复习。');
    }
    if (stats.antiForgettingTrend !== 'rising') {
        goals.push('下月继续优化复习状态，争取让后半月的抗遗忘表现更稳定向上。');
    }
    if (goals.length === 0) {
        goals.push('继续保持当前学习节奏，把好状态稳定延续到下个月。');
    }
    return goals.slice(0, 3);
}

function getAttendanceText(leaveCount) {
    return leaveCount === 0 ? '全勤，出勤超棒！' : `学员本月请假${leaveCount}次，整体出勤稳定。`;
}

function getAntiForgettingText(correctRate, forgetCount) {
    if (correctRate === 0 && forgetCount === 0) {
        return '本月暂无抗遗忘复盘记录。';
    }
    return `累计遗忘${forgetCount}词，综合正确率${correctRate}%。`;
}

function getFormalStudyText(classStats) {
    const baseText = `本月累计学单词：${classStats.totalWords}个（新词学习${classStats.totalNewWords}个+旧词巩固${classStats.totalReviewWords}个）`;
    if (classStats.totalNewWords <= 0 || classStats.newWordMasteryRate === null) {
        return `${baseText}。`;
    }

    return `${baseText}，累计遗忘${classStats.totalForgetNewWords}词，综合正确率${classStats.newWordMasteryRate}%。`;
}

function buildWarmMessage(reportStudentName, stats) {
    if (stats.totalWords === 0 && stats.antiForgettingTotalReviewed === 0) {
        return '这个月我们先稍作调整，期待下个月一起把学习节奏慢慢找回来，继续稳稳往前走。';
    }
    if (stats.totalWords === 0 && stats.antiForgettingTotalReviewed > 0) {
        return '本月暂未安排正课，但复习节奏仍在持续保持。继续把这份坚持延续下去，下个月会更扎实。';
    }
    return `${reportStudentName}本月累计学词${stats.totalWords}个，抗遗忘复盘${stats.antiForgettingTotalReviewed}词。继续保持这股稳定投入的劲头，下个月会更扎实。`;
}

function buildMonthlySummaryReport(options) {
    const {
        reportStudentName,
        monthDisplay,
        classStats,
        antiForgettingStats,
        leaveCount,
        highlights,
        improvements,
        goals,
        allStats
    } = options;

    let report = `${reportStudentName}学员${monthDisplay}月末总结\n\n`;
    report += '一、本月核心学习数据📊\n\n';

    if (classStats.classCount === 0 && classStats.totalWords === 0 && antiForgettingStats.totalReviewed === 0) {
        const leaveText = leaveCount > 0 ? `学员本月请假${leaveCount}次，` : '';
        report += `✅ 本月暂无课堂与复习数据，${leaveText}当前以学习安排衔接和下月节奏准备为主。\n\n`;
        report += '二、本月表现点评🌟\n\n';
        report += '本月暂无可统计的课堂与复习表现，本段先不做表现评价。\n\n';
        report += '三、下月小目标🎯\n\n';
        goals.forEach((goal, index) => {
            report += `${index + 1}. ${goal}\n`;
        });
        report += '\n四、教练暖心寄语💌\n\n';
        report += buildWarmMessage(reportStudentName, allStats);
        return report;
    }

    report += `✅ 本月正课次数：${classStats.classCount}节，共${classStats.totalDuration}小时（${classStats.classCount === 0 ? '本月暂无正课安排' : getAttendanceText(leaveCount)}）\n`;
    report += `✅ ${getFormalStudyText(classStats)}\n`;
    report += `✅ 本月抗遗忘复盘：${antiForgettingStats.totalReviewed}个单词，${antiForgettingStats.totalReviewed === 0 ? '本月暂无抗遗忘复盘记录。' : getAntiForgettingText(antiForgettingStats.correctRate, antiForgettingStats.forgetCount)}\n\n`;

    report += '二、本月表现点评🌟\n\n';
    report += '👍 闪光点\n\n';
    const defaultHighlights = classStats.classCount === 0 && antiForgettingStats.totalReviewed === 0
        ? ['▫️ 这个月我们先稍作调整，期待下个月一起把学习节奏慢慢找回来，继续稳稳往前走。']
        : ['▫️ 本月整体表现稳定，学习节奏保持得不错。'];
    (highlights.length > 0 ? highlights : defaultHighlights).forEach((line) => {
        report += `${line}\n`;
    });

    report += '\n📌 小提升点\n\n';
    improvements.forEach((line) => {
        report += `${line}\n`;
    });

    report += '\n三、下月小目标🎯\n\n';
    goals.forEach((goal, index) => {
        report += `${index + 1}. ${goal}\n`;
    });

    report += '\n四、教练暖心寄语💌\n\n';
    report += buildWarmMessage(reportStudentName, allStats);
    return report;
}

function buildPreviewHtml(classStats, antiForgettingStats) {
    const lines = [
        `正课次数：${classStats.classCount} 节，共 ${classStats.totalDuration} 小时`,
        getFormalStudyText({
            ...classStats,
            totalWords: classStats.totalWords,
            totalNewWords: classStats.totalNewWords,
            totalReviewWords: classStats.totalReviewWords,
            totalForgetNewWords: classStats.totalForgetNewWords,
            newWordMasteryRate: classStats.newWordMasteryRate
        }).replace('本月', '').replace(/。$/, ''),
        `抗遗忘复盘：${antiForgettingStats.totalReviewed} 词，${antiForgettingStats.totalReviewed === 0 ? '本月暂无抗遗忘复盘记录。' : getAntiForgettingText(antiForgettingStats.correctRate, antiForgettingStats.forgetCount)}`
    ];

    return lines.map((line) => `<div style="color:#e5e7eb;font-size:15px;font-weight:600;">${line}</div>`).join('');
}

export async function generateMonthlySummary() {
    const userName = getSelectedUserName();
    if (!userName) {
        alert('请先选择学员');
        return;
    }

    const yearMonth = getSelectedMonthInputValue();
    if (!/^\d{4}-\d{2}$/.test(yearMonth)) {
        alert('请输入有效的月份（格式：YYYY-MM）');
        return;
    }

    const autoLeaveCount = getLeaveCount(userName, yearMonth);
    const leaveInputValue = document.getElementById('monthlySummaryLeaves')?.value;
    const leaveCount = resolveLeaveCountOverride(leaveInputValue, autoLeaveCount);

    const classStats = calculateMonthlyClassStats(userName, yearMonth);
    let antiForgettingStats;
    try {
        antiForgettingStats = await calculateMonthlyAntiForgettingStats(userName, yearMonth);
    } catch (error) {
        console.error('读取抗遗忘数据失败:', error);
        antiForgettingStats = { totalReviewed: 0, totalCorrect: 0, correctRate: 0, forgetCount: 0, sessionCount: 0, trend: 'stable' };
    }

    const allStats = {
        ...classStats,
        antiForgettingTotalReviewed: antiForgettingStats.totalReviewed,
        antiForgettingCorrectRate: antiForgettingStats.correctRate,
        antiForgettingSessionCount: antiForgettingStats.sessionCount,
        antiForgettingTrend: antiForgettingStats.trend,
        antiForgettingForgetCount: antiForgettingStats.forgetCount,
        leaveCount
    };

    const highlights = generateHighlights(allStats);
    const improvements = generateImprovements(allStats);
    const goals = buildGoals(allStats);
    const monthDisplay = getMonthDisplay(yearMonth);
    const reportStudentName = getMonthlySummaryStudentDisplayName(userName);

    const report = buildMonthlySummaryReport({
        reportStudentName,
        monthDisplay,
        classStats,
        antiForgettingStats,
        leaveCount,
        highlights,
        improvements,
        goals,
        allStats
    });

    copyToClipboard(report);

    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${userName}_${yearMonth}_月末总结.txt`;
    link.click();

    showLongText(report.replace(/\n/g, '<br>'));
}

async function previewMonthlySummaryData() {
    const userName = getSelectedUserName();
    const yearMonth = getSelectedMonthInputValue();
    const classStats = calculateMonthlyClassStats(userName, yearMonth);
    let antiForgettingStats;
    try {
        antiForgettingStats = await calculateMonthlyAntiForgettingStats(userName, yearMonth);
    } catch (_) {
        antiForgettingStats = { totalReviewed: 0, correctRate: 0 };
    }
    const preview = document.getElementById('monthlySummaryPreview');
    if (preview) {
        preview.style.display = 'block';
        preview.innerHTML = buildPreviewHtml(classStats, antiForgettingStats);
    }
}

function upsertLeaveRecord(userName, date) {
    const leavesKey = `${userName}${LEAVES_STORAGE_SUFFIX}`;
    const leaves = getLeavesStorage(userName).filter((item) => item?.date !== date);
    leaves.push({ date });
    leaves.sort((a, b) => String(a.date).localeCompare(String(b.date)));
    localStorage.setItem(leavesKey, JSON.stringify(leaves));
}

function deleteLeaveRecord(userName, date) {
    const leavesKey = `${userName}${LEAVES_STORAGE_SUFFIX}`;
    const leaves = getLeavesStorage(userName).filter((item) => item?.date !== date);
    localStorage.setItem(leavesKey, JSON.stringify(leaves));
}

export function monthlySummaryOpen() {
    const userName = getSelectedUserName();
    if (!userName) {
        alert('请先选择学员');
        return;
    }

    const panel = createModalShell(MONTHLY_MODAL_ID, '月末总结生成器');
    const autoLeaveCount = getLeaveCount(userName, getCurrentMonth());
    panel.insertAdjacentHTML('beforeend', `
        <div style="display:grid; gap:18px;">
            <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;"><label>学员：</label><strong id="monthlySummaryStudent">${userName}</strong></div>
            <div style="display:grid;grid-template-columns:84px minmax(180px, 1fr);align-items:center;gap:12px;"><label for="monthlySummaryMonth">月份：</label><input type="month" id="monthlySummaryMonth" value="${getCurrentMonth()}"></div>
            <div style="display:grid;grid-template-columns:184px minmax(160px, 1fr) auto;align-items:center;gap:12px;"><label for="monthlySummaryLeaves">本月请假次数：</label><input type="number" id="monthlySummaryLeaves" min="0" value="${autoLeaveCount}"><span style="color:#cbd5e1;font-size:13px;font-weight:500;">可手动覆盖，清空视为 0</span></div>
            <div style="display:flex; gap:10px;">
                <button id="monthlySummaryPreviewButton">预览数据</button>
                <button id="monthlySummaryGenerateButton">生成报告</button>
                <button id="monthlySummaryCloseButton">关闭</button>
            </div>
            <div id="monthlySummaryPreview" style="display:none;padding:16px;background:#1f2329;border:1px solid #5a606a;border-radius:10px;"></div>
        </div>
    `);
    styleModalControls(panel);

    panel.querySelector('#monthlySummaryPreviewButton')?.addEventListener('click', previewMonthlySummaryData);
    panel.querySelector('#monthlySummaryGenerateButton')?.addEventListener('click', generateMonthlySummary);
    panel.querySelector('#monthlySummaryCloseButton')?.addEventListener('click', () => safeRemoveElementById(MONTHLY_MODAL_ID));
}

export function recordLeaveOpen() {
    const userName = getSelectedUserName();
    if (!userName) {
        alert('请先选择学员');
        return;
    }

    const today = formatLocalDateYmd(new Date());
    const panel = createModalShell(LEAVE_MODAL_ID, '记录请假');
    panel.insertAdjacentHTML('beforeend', `
        <div style="display:grid; gap:18px;">
            <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;"><label>学员：</label><strong>${userName}</strong></div>
            <div style="display:grid;grid-template-columns:84px minmax(180px, 1fr);align-items:center;gap:12px;"><label for="leaveRecordDate">日期：</label><input type="date" id="leaveRecordDate" value="${today}"></div>
            <div style="display:flex; gap:10px;">
                <button id="saveLeaveRecordButton">保存</button>
                <button id="closeLeaveRecordButton">关闭</button>
            </div>
        </div>
    `);
    styleModalControls(panel);

    panel.querySelector('#saveLeaveRecordButton')?.addEventListener('click', () => {
        const date = panel.querySelector('#leaveRecordDate')?.value;
        if (!date) {
            alert('请选择请假日期');
            return;
        }
        upsertLeaveRecord(userName, date);
        safeRemoveElementById(LEAVE_MODAL_ID);
        showLongText(`已记录 ${userName} 在 ${date} 的请假。`, { useHtml: false });
    });
    panel.querySelector('#closeLeaveRecordButton')?.addEventListener('click', () => safeRemoveElementById(LEAVE_MODAL_ID));
}

export function viewLeaveRecordsOpen() {
    const userName = getSelectedUserName();
    if (!userName) {
        alert('请先选择学员');
        return;
    }

    const panel = createModalShell(LEAVE_LIST_MODAL_ID, '查看请假记录');
    const list = document.createElement('div');
    list.style.display = 'grid';
    list.style.gap = '8px';
    const render = () => {
        const leaves = getLeavesStorage(userName);
        if (!Array.isArray(leaves) || leaves.length === 0) {
            list.innerHTML = '<div style="color:#cbd5e1;font-size:14px;font-weight:500;">暂无请假记录</div>';
            return;
        }
        list.innerHTML = leaves
            .sort((a, b) => String(a.date).localeCompare(String(b.date)))
            .map((item) => `<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:10px 12px;border:1px solid #5a606a;border-radius:10px;background:#1f2329;"><span style="color:#ececec;font-size:15px;font-weight:600;">${item.date}</span><button data-date="${item.date}">删除</button></div>`)
            .join('');
        styleModalControls(panel);
        list.querySelectorAll('button[data-date]').forEach((button) => {
            button.addEventListener('click', () => {
                deleteLeaveRecord(userName, button.dataset.date);
                render();
            });
        });
    };

    panel.appendChild(list);
    const closeButton = document.createElement('button');
    closeButton.textContent = '关闭';
    closeButton.style.marginTop = '12px';
    closeButton.addEventListener('click', () => safeRemoveElementById(LEAVE_LIST_MODAL_ID));
    panel.appendChild(closeButton);
    styleModalControls(panel);
    render();
}
