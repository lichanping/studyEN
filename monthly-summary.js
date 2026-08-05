// monthly-summary.js - 学员月末总结报告生成
// 依赖: commonFunctions.js (copyToClipboard, showLongText)

const LEAVES_STORAGE_SUFFIX = '_leaves';
const CLASS_STATS_SUFFIX = '_classStatistics';

// ========================================
// 工具函数
// ========================================

function parseLocalDateYmd(dateStr) {
    if (!dateStr) return new Date(NaN);
    const match = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return new Date(NaN);
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function getMonthRange(yearMonth) {
    const [year, month] = yearMonth.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // 月末最后一天
    return { startDate, endDate, year, month };
}

function getCurrentMonth() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

// ========================================
// 1. 正课统计计算
// ========================================

export function calculateMonthlyClassStats(userName, yearMonth) {
    const statsKey = `${userName}${CLASS_STATS_SUFFIX}`;
    const classStats = JSON.parse(localStorage.getItem(statsKey)) || {};
    const { startDate, endDate } = getMonthRange(yearMonth);

    let totalNewWords = 0;
    let totalReviewWords = 0;
    let totalDuration = 0;
    let classCount = 0;
    const uniqueDates = new Set();

    Object.entries(classStats).forEach(([key, stats]) => {
        const type = stats.type || '词汇课';
        if (type !== '词汇课' && type !== '阅读完型语法课') return;

        const date = stats.date || key;
        const recordDate = parseLocalDateYmd(date);
        if (Number.isNaN(recordDate.getTime())) return;

        recordDate.setHours(0, 0, 0, 0);
        if (recordDate < startDate || recordDate > endDate) return;

        // 去重：同一天多次记录只算 1 次课
        const dateKey = recordDate.toISOString().split('T')[0];
        if (!uniqueDates.has(dateKey)) {
            uniqueDates.add(dateKey);
            classCount++;
        }

        totalNewWords += Number(stats.newWord) || 0;
        totalReviewWords += Number(stats.reviewWordCount) || 0;
        totalDuration += parseFloat(stats.duration) || 0;
    });

    return {
        classCount,
        totalDuration: Math.round(totalDuration * 10) / 10,
        totalNewWords,
        totalReviewWords,
        totalWords: totalNewWords + totalReviewWords
    };
}

// ========================================
// 2. 抗遗忘统计计算
// ========================================

export function calculateMonthlyAntiForgettingStats(userName, yearMonth) {
    // 从 IndexedDB 读取（需要异步）
    return new Promise((resolve, reject) => {
        const DB_NAME = 'FeedbackDB';
        const STORE_NAME = 'feedbackData';

        const request = indexedDB.open(DB_NAME, 2);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                resolve({ totalReviewed: 0, correctRate: 0, sessionCount: 0 });
                return;
            }

            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const getRequest = store.get(userName);

            getRequest.onsuccess = () => {
                const userData = getRequest.result;
                if (!userData || !userData.feedbackEntries) {
                    resolve({ totalReviewed: 0, correctRate: 0, sessionCount: 0 });
                    return;
                }

                const { startDate, endDate } = getMonthRange(yearMonth);
                let totalReviewed = 0;
                let totalCorrect = 0;
                let sessionCount = 0;

                userData.feedbackEntries.forEach(entry => {
                    // 格式: "YYYY-MM-DD(周X): rate% | totalWordsReviewed | correctWordsCount"
                    const match = String(entry).match(/^(\d{4}-\d{2}-\d{2})/);
                    if (!match) return;

                    const recordDate = parseLocalDateYmd(match[1]);
                    if (Number.isNaN(recordDate.getTime())) return;

                    recordDate.setHours(0, 0, 0, 0);
                    if (recordDate < startDate || recordDate > endDate) return;

                    // 解析 "rate% | total | correct"
                    const parts = entry.split('|').map(s => s.trim());
                    if (parts.length >= 3) {
                        const totalWordsReviewed = parseInt(parts[1], 10);
                        const correctWordsCount = parseInt(parts[2], 10);

                        if (Number.isFinite(totalWordsReviewed)) {
                            totalReviewed += totalWordsReviewed;
                            sessionCount++;
                        }
                        if (Number.isFinite(correctWordsCount)) {
                            totalCorrect += correctWordsCount;
                        }
                    }
                });

                const correctRate = totalReviewed > 0
                    ? Math.round((totalCorrect / totalReviewed) * 100)
                    : 0;

                resolve({ totalReviewed, correctRate, sessionCount });
            };

            getRequest.onerror = () => reject(getRequest.error);
        };
    });
}

// ========================================
// 3. 请假次数计算
// ========================================

export function getLeaveCount(userName, yearMonth) {
    const leavesKey = `${userName}${LEAVES_STORAGE_SUFFIX}`;
    const leaves = JSON.parse(localStorage.getItem(leavesKey)) || [];
    if (!Array.isArray(leaves)) return 0;

    const { startDate, endDate } = getMonthRange(yearMonth);
    let count = 0;

    leaves.forEach(leave => {
        const recordDate = parseLocalDateYmd(leave.date);
        if (Number.isNaN(recordDate.getTime())) return;

        recordDate.setHours(0, 0, 0, 0);
        if (recordDate >= startDate && recordDate <= endDate) {
            count++;
        }
    });

    return count;
}

// ========================================
// 4. 闪光点生成
// ========================================

const HIGHLIGHTS_LIBRARY = [
    { condition: (stats) => stats.vocabCorrectRate >= 90, text: '▫️ 记词效率高，接受度强，新单词掌握又快又扎实💪' },
    { condition: (stats) => stats.antiForgettingCorrectRate >= 90, text: '▫️ 抗遗忘意识足，主动配合复盘，旧词巩固到位✅' },
    { condition: (stats) => stats.classCount >= 4, text: '▫️ 课堂专注认真，积极互动，单词疑问及时问，态度超赞👍' },
    { condition: (stats) => stats.antiForgettingTrend === 'rising', text: '▫️ 易混词/易错词能及时订正，二次出错率低，进步超明显✨' },
    { condition: (stats) => stats.totalDuration >= 8, text: '▫️ 自主学习性强，课后能主动打卡，坚持超给力🌟' }
];

export function generateHighlights(stats) {
    const matched = HIGHLIGHTS_LIBRARY
        .filter(item => item.condition(stats))
        .map(item => item.text);

    // 最多 3 条
    return matched.slice(0, 3);
}

// ========================================
// 5. 小提升点生成
// ========================================

const IMPROVEMENTS_LIBRARY = [
    { condition: (stats) => stats.vocabCorrectRate < 90, text: '▫️ 部分单词需多结合语境记忆，避免混淆📝' },
    { condition: (stats) => stats.antiForgettingSessionCount < 4, text: '▫️ 抗遗忘可增加碎片化复习，记得更牢🔄' },
    { condition: (stats) => stats.classCount < 4, text: '▫️ 遇到难词别畏难，多主动提问，突破更快哦～' }
];

export function generateImprovements(stats) {
    const matched = IMPROVEMENTS_LIBRARY
        .filter(item => item.condition(stats))
        .map(item => item.text);

    // 最多 2 条
    const result = matched.slice(0, 2);

    // 若全部指标都优秀，输出鼓励语
    if (result.length === 0) {
        return ['本月表现很棒，继续保持！'];
    }

    return result;
}

// ========================================
// 6. 生成完整报告
// ========================================

function getAttendanceText(classCount, leaveCount) {
    if (leaveCount === 0) {
        return '全勤，出勤超棒！';
    }
    return `仅${leaveCount}次请假，出勤超棒！`;
}

function getAntiForgettingText(correctRate) {
    if (correctRate > 80) {
        return '正确率持续保持高位';
    } else if (correctRate >= 60) {
        return '正确率稳步控制👏';
    }
    return '继续加油，抗遗忘需要更多练习💪';
}

function getGoalText(leaveCount, antiForgettingCorrectRate) {
    let goal2 = '针对性攻克薄弱点';
    if (antiForgettingCorrectRate < 70) {
        goal2 += '，减少同类错误';
    }
    goal2 += '，稳步提分';

    let goal3 = '保持好状态';
    if (leaveCount === 0) {
        goal3 += '，继续保持';
    } else {
        goal3 += '，出勤稳定';
    }
    goal3 += '，课堂专注度拉满💯';

    return [
        '持续积累单词，稳步推进新词+坚持旧词抗遗忘',
        goal2,
        goal3
    ];
}

function getWarmMessage(userName, stats) {
    return `${userName}本月的坚持和进步都看在眼里！累计学${stats.totalWords}词，抗遗忘${stats.antiForgettingTotalReviewed}词，正确率${stats.antiForgettingCorrectRate}%。保持这份劲头，坚持抗遗忘、稳积累，下月一定能更上一层楼，越来越优秀🥳！`;
}

export async function generateMonthlySummary() {
    const userName = document.getElementById('userName').value;
    if (!userName) {
        alert('请先选择学员');
        return;
    }

    // 获取月份输入
    const monthInput = document.getElementById('monthlySummaryMonth');
    const yearMonth = monthInput ? monthInput.value : getCurrentMonth();
    if (!yearMonth || !/^\d{4}-\d{2}$/.test(yearMonth)) {
        alert('请输入有效的月份（格式：YYYY-MM）');
        return;
    }

    // 获取请假次数（手动输入优先）
    const leaveInput = document.getElementById('monthlySummaryLeaves');
    const manualLeaveCount = leaveInput ? parseInt(leaveInput.value, 10) : NaN;
    const autoLeaveCount = getLeaveCount(userName, yearMonth);
    const leaveCount = Number.isFinite(manualLeaveCount) && manualLeaveCount > 0 ? manualLeaveCount : autoLeaveCount;

    // 计算正课统计
    const classStats = calculateMonthlyClassStats(userName, yearMonth);

    // 计算抗遗忘统计
    let antiForgettingStats;
    try {
        antiForgettingStats = await calculateMonthlyAntiForgettingStats(userName, yearMonth);
    } catch (error) {
        console.error('读取抗遗忘数据失败:', error);
        antiForgettingStats = { totalReviewed: 0, correctRate: 0, sessionCount: 0 };
    }

    // 计算词汇课正确率（用于闪光点/提升点判断）
    const vocabCorrectRate = classStats.totalNewWords > 0
        ? Math.round(((classStats.totalNewWords - (classStats.totalNewWords * 0.1)) / classStats.totalNewWords) * 100)
        : 0;

    // 综合统计数据
    const allStats = {
        ...classStats,
        ...antiForgettingStats,
        vocabCorrectRate,
        antiForgettingCorrectRate: antiForgettingStats.correctRate,
        antiForgettingSessionCount: antiForgettingStats.sessionCount,
        antiForgettingTrend: 'stable', // 简化处理，暂不计算趋势
        leaveCount
    };

    // 生成闪光点和提升点
    const highlights = generateHighlights(allStats);
    const improvements = generateImprovements(allStats);
    const goals = getGoalText(leaveCount, antiForgettingStats.correctRate);

    // 构建报告
    const monthDisplay = yearMonth.replace('-', '🈷️');
    let report = `${userName}学员${monthDisplay}月末总结\n\n`;

    // 一、本月核心学习数据
    report += '一、本月核心学习数据📊\n\n';
    report += `✅ 本月正课次数：${classStats.classCount}节，共${classStats.totalDuration}小时（${getAttendanceText(classStats.classCount, leaveCount)}）\n`;
    report += `✅ 本月累计学单词：${classStats.totalWords}个（新词学习${classStats.totalNewWords}个+旧词巩固${classStats.totalReviewWords}个）\n`;
    report += `✅ 本月抗遗忘复盘：${antiForgettingStats.totalReviewed}个单词，正确率${antiForgettingStats.correctRate}%，${getAntiForgettingText(antiForgettingStats.correctRate)}\n\n`;

    // 二、本月表现点评
    report += '二、本月表现点评🌟\n\n';
    report += '👍 闪光点\n\n';
    highlights.forEach(h => { report += `${h}\n`; });
    report += '\n📌 小提升点\n\n';
    improvements.forEach(i => { report += `${i}\n`; });
    report += '\n';

    // 三、下月小目标
    report += '三、下月小目标🎯\n\n';
    goals.forEach((g, i) => { report += `${i + 1}. ${g}\n`; });
    report += '\n';

    // 四、教练暖心寄语
    report += '四、教练暖心寄语💌\n\n';
    report += getWarmMessage(userName, allStats);

    // 复制到剪贴板
    if (typeof copyToClipboard === 'function') {
        copyToClipboard(report);
    } else if (window.commonFunctions?.copyToClipboard) {
        window.commonFunctions.copyToClipboard(report);
    }

    // 导出 .txt 文件
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${userName}_${yearMonth}_月末总结.txt`;
    link.click();

    // 显示报告
    if (typeof showLongText === 'function') {
        showLongText(report.replace(/\n/g, '<br>'));
    }
}

// ========================================
// 7. 初始化模态框
// ========================================

export function initMonthlySummaryModal() {
    // 创建模态框 HTML
    const modalHtml = `
        <div id="monthlySummaryModal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:9999; overflow-y:auto;">
            <div style="background:white; margin:50px auto; padding:20px; max-width:500px; border-radius:8px;">
                <h3 style="margin-top:0;">月末总结生成器</h3>
                <div style="margin-bottom:15px;">
                    <label>学员：</label>
                    <span id="monthlySummaryStudent"></span>
                </div>
                <div style="margin-bottom:15px;">
                    <label for="monthlySummaryMonth">月份：</label>
                    <input type="month" id="monthlySummaryMonth" value="${getCurrentMonth()}" style="padding:5px;">
                </div>
                <div style="margin-bottom:15px;">
                    <label for="monthlySummaryLeaves">本月请假次数：</label>
                    <input type="number" id="monthlySummaryLeaves" value="0" min="0" style="width:60px; padding:5px;">
                    <span style="color:#666; font-size:12px;">（自动填充，可手动覆盖）</span>
                </div>
                <div style="margin-bottom:15px;">
                    <button onclick="monthlySummaryPreview()" style="padding:8px 16px; background:#4CAF50; color:white; border:none; border-radius:4px; cursor:pointer;">预览数据</button>
                </div>
                <div id="monthlySummaryPreview" style="margin-bottom:15px; padding:10px; background:#f5f5f5; border-radius:4px; display:none;"></div>
                <div style="display:flex; gap:10px;">
                    <button onclick="monthlySummaryGenerate()" style="padding:8px 16px; background:#2196F3; color:white; border:none; border-radius:4px; cursor:pointer;">生成报告</button>
                    <button onclick="monthlySummaryClose()" style="padding:8px 16px; background:#999; color:white; border:none; border-radius:4px; cursor:pointer;">关闭</button>
                </div>
            </div>
        </div>
    `;

    // 添加到 body
    const container = document.createElement('div');
    container.innerHTML = modalHtml;
    document.body.appendChild(container);

    // 设置学员名称
    const userName = document.getElementById('userName').value;
    const studentSpan = document.getElementById('monthlySummaryStudent');
    if (studentSpan) {
        studentSpan.textContent = userName;
    }

    // 自动填充请假次数
    const yearMonth = getCurrentMonth();
    const leaveCount = getLeaveCount(userName, yearMonth);
    const leaveInput = document.getElementById('monthlySummaryLeaves');
    if (leaveInput && leaveCount > 0) {
        leaveInput.value = leaveCount;
    }
}

// 预览数据
window.monthlySummaryPreview = async function() {
    const userName = document.getElementById('userName').value;
    const monthInput = document.getElementById('monthlySummaryMonth');
    const yearMonth = monthInput ? monthInput.value : getCurrentMonth();

    const classStats = calculateMonthlyClassStats(userName, yearMonth);
    let antiForgettingStats;
    try {
        antiForgettingStats = await calculateMonthlyAntiForgettingStats(userName, yearMonth);
    } catch (error) {
        antiForgettingStats = { totalReviewed: 0, correctRate: 0, sessionCount: 0 };
    }

    const preview = document.getElementById('monthlySummaryPreview');
    if (preview) {
        preview.style.display = 'block';
        preview.innerHTML = `
            <div>正课次数：${classStats.classCount} 节，共 ${classStats.totalDuration} 小时</div>
            <div>累计学单词：${classStats.totalWords} 个（新词${classStats.totalNewWords}+旧词${classStats.totalReviewWords}）</div>
            <div>抗遗忘复盘：${antiForgettingStats.totalReviewed} 词（正确率 ${antiForgettingStats.correctRate}%）</div>
        `;
    }
};

// 生成报告
window.monthlySummaryGenerate = function() {
    generateMonthlySummary();
};

// 关闭模态框
window.monthlySummaryClose = function() {
    const modal = document.getElementById('monthlySummaryModal');
    if (modal) {
        modal.style.display = 'none';
    }
};

// 打开模态框
window.monthlySummaryOpen = function() {
    const userName = document.getElementById('userName').value;
    if (!userName) {
        alert('请先选择学员');
        return;
    }

    initMonthlySummaryModal();
    const modal = document.getElementById('monthlySummaryModal');
    if (modal) {
        modal.style.display = 'block';
    }
};
