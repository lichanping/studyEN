(function () {
    "use strict";

    const BANK_URL = "questions-v1.json";
    const TYPES = ["single", "multiple", "boolean"];
    const TYPE_NAMES = { single: "单选题", multiple: "多选题", boolean: "判断题" };
    const core = window.ExamPrepCore;
    const state = {
        questions: [], inventory: {}, exam: [], responses: {}, confirmed: new Set(),
        currentIndex: 0, mode: "instant", scores: {}, counts: {}, result: null
    };

    const byId = (id) => document.getElementById(id);
    const views = { setup: byId("setup-view"), quiz: byId("quiz-view"), results: byId("results-view") };

    function showView(name) {
        Object.entries(views).forEach(([key, element]) => { element.hidden = key !== name; });
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function readSettings() {
        return {
            counts: Object.fromEntries(TYPES.map((type) => [type, byId(`${type}-count`).value])),
            scores: Object.fromEntries(TYPES.map((type) => [type, byId(`${type}-score`).value]))
        };
    }

    function clearErrors() {
        TYPES.forEach((type) => {
            byId(`${type}-count`).classList.remove("invalid");
            byId(`${type}-score`).classList.remove("invalid");
            byId(`${type}-error`).textContent = "";
            byId(`${type}-score-error`).textContent = "";
        });
        byId("form-error").textContent = "";
    }

    function displayErrors(errors) {
        clearErrors();
        TYPES.forEach((type) => {
            if (errors[type]) {
                byId(`${type}-count`).classList.add("invalid");
                byId(`${type}-error`).textContent = errors[type].startsWith("最多可选")
                    ? errors[type] : errors[type];
            }
            if (errors[`${type}Score`]) {
                byId(`${type}-score`).classList.add("invalid");
                byId(`${type}-score-error`).textContent = errors[`${type}Score`];
            }
        });
        byId("form-error").textContent = errors.form || "";
    }

    function startExam() {
        const settings = readSettings();
        const validation = core.validateSettings(settings, state.inventory);
        displayErrors(validation.errors);
        if (!validation.valid) return;
        state.counts = Object.fromEntries(TYPES.map((type) => [type, Number(settings.counts[type])]));
        state.scores = Object.fromEntries(TYPES.map((type) => [type, Number(settings.scores[type])]));
        state.mode = document.querySelector('input[name="mode"]:checked').value;
        state.exam = core.buildExam(state.questions, state.counts);
        state.responses = {};
        state.confirmed = new Set();
        state.currentIndex = 0;
        state.result = null;
        byId("submit-exam").hidden = state.mode === "instant";
        showView("quiz");
        renderQuestion();
    }

    function currentQuestion() { return state.exam[state.currentIndex]; }

    function chooseOption(optionId) {
        const question = currentQuestion();
        if (state.mode === "instant" && state.confirmed.has(question.id)) return;
        const selected = state.responses[question.id] || [];
        state.responses[question.id] = question.type === "multiple"
            ? selected.includes(optionId) ? selected.filter((id) => id !== optionId) : [...selected, optionId]
            : [optionId];
        renderQuestion();
    }

    function renderQuestion() {
        const question = currentQuestion();
        const response = state.responses[question.id] || [];
        const isConfirmed = state.confirmed.has(question.id);
        byId("question-progress").textContent = `第 ${state.currentIndex + 1} / ${state.exam.length} 题`;
        byId("answered-progress").textContent = `已答 ${Object.values(state.responses).filter((answers) => answers.length).length} 题`;
        byId("progress-bar").style.width = `${((state.currentIndex + 1) / state.exam.length) * 100}%`;
        byId("question-type").textContent = TYPE_NAMES[question.type];
        byId("source-number").textContent = `题库 #${question.sourceNumber}`;
        byId("question-text").textContent = question.question;
        const options = byId("question-options");
        options.replaceChildren(...question.options.map((option) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "option";
            if (response.includes(option.id)) button.classList.add("selected");
            if (isConfirmed && question.answers.includes(option.id)) button.classList.add("correct");
            if (isConfirmed && response.includes(option.id) && !question.answers.includes(option.id)) button.classList.add("selected-wrong");
            button.disabled = state.mode === "instant" && isConfirmed;
            button.innerHTML = `<span class="option-key">${option.id}</span><span>${escapeHtml(option.text)}</span>`;
            button.addEventListener("click", () => chooseOption(option.id));
            return button;
        }));
        const feedback = byId("answer-feedback");
        feedback.hidden = !isConfirmed;
        if (isConfirmed) {
            const correct = sameAnswers(response, question.answers);
            feedback.className = `answer-feedback${correct ? "" : " wrong"}`;
            feedback.textContent = correct ? "回答正确" : `回答错误。正确答案：${question.answers.join("、")}`;
        }
        byId("previous-question").disabled = state.currentIndex === 0;
        byId("next-question").disabled = state.currentIndex === state.exam.length - 1;
        byId("confirm-answer").textContent = state.mode === "instant" ? (isConfirmed ? "已确认" : "确认本题") : "保存并下一题";
        byId("confirm-answer").disabled = state.mode === "instant" && isConfirmed;
    }

    function confirmAnswer() {
        const question = currentQuestion();
        if (!(state.responses[question.id] || []).length) {
            byId("answer-feedback").hidden = false;
            byId("answer-feedback").className = "answer-feedback wrong";
            byId("answer-feedback").textContent = "请先选择答案";
            return;
        }
        if (state.mode === "instant") {
            state.confirmed.add(question.id);
            renderQuestion();
            if (state.confirmed.size === state.exam.length) showResults();
        } else if (state.currentIndex < state.exam.length - 1) {
            state.currentIndex += 1;
            renderQuestion();
        }
    }

    function submitExam() {
        const unanswered = state.exam.filter((question) => !(state.responses[question.id] || []).length).length;
        if (unanswered && !window.confirm(`还有 ${unanswered} 题未答，确认交卷吗？`)) return;
        showResults();
    }

    function showResults() {
        state.result = core.gradeExam(state.exam, state.responses, state.scores);
        byId("score-value").textContent = `${state.result.score} / ${state.result.totalScore}`;
        byId("score-percentage").textContent = `${state.result.percentage}%`;
        const incorrect = state.result.items.filter((item) => item.status === "incorrect").length;
        const unanswered = state.result.items.filter((item) => item.status === "unanswered").length;
        byId("score-summary").textContent = `答对 ${state.exam.length - incorrect - unanswered} 题，答错 ${incorrect} 题，未答 ${unanswered} 题`;
        byId("type-summary").innerHTML = TYPES.filter((type) => state.result.byType[type].total).map((type) => {
            const item = state.result.byType[type];
            return `<article><h3>${TYPE_NAMES[type]}</h3><p>${item.score} / ${item.totalScore} 分 · 答对 ${item.correct} / ${item.total}</p></article>`;
        }).join("");
        byId("incorrect-only").checked = false;
        renderResults();
        showView("results");
    }

    function renderResults() {
        const onlyIncorrect = byId("incorrect-only").checked;
        const items = onlyIncorrect ? state.result.items.filter((item) => item.status !== "correct") : state.result.items;
        byId("result-list").innerHTML = items.map((item, index) => {
            const answerText = item.question.options.filter((option) => item.response.includes(option.id)).map((option) => `${option.id}. ${option.text}`).join("；") || "未作答";
            const correctText = item.question.options.filter((option) => item.question.answers.includes(option.id)).map((option) => `${option.id}. ${option.text}`).join("；");
            const statusText = { correct: "回答正确", incorrect: "回答错误", unanswered: "未作答" }[item.status];
            return `<article class="result-item ${item.status}"><div class="question-meta"><span>${TYPE_NAMES[item.question.type]}</span><span>题库 #${item.question.sourceNumber}</span></div><h3>${index + 1}. ${escapeHtml(item.question.question)}</h3><p class="result-status">${statusText} · ${item.earned} / ${item.questionScore} 分</p><p class="result-answer">你的答案：${escapeHtml(answerText)}</p><p class="result-answer">正确答案：${escapeHtml(correctText)}</p></article>`;
        }).join("") || '<p class="empty-result">本次没有错题或未答题。</p>';
    }

    function sameAnswers(first, second) {
        return [...first].sort().join("|") === [...second].sort().join("|");
    }

    function escapeHtml(value) {
        return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
    }

    function retryExam() { startExam(); }
    function resetExam() { showView("setup"); }

    async function loadQuestionBank() {
        try {
            const response = await fetch(BANK_URL);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            state.questions = data.questions;
            state.inventory = core.getInventory(state.questions);
            TYPES.forEach((type) => {
                const countInput = byId(`${type}-count`);
                countInput.max = state.inventory[type];
                byId(`${type}-limit`).textContent = `上限 ${state.inventory[type]}`;
            });
            byId("bank-status").textContent = `题库已就绪 · ${state.questions.length} 题`;
            byId("start-exam").disabled = false;
        } catch (error) {
            byId("bank-status").textContent = "题库加载失败，请刷新重试";
            byId("form-error").textContent = `题库加载失败：${error.message}`;
        }
    }

    byId("start-exam").addEventListener("click", startExam);
    byId("confirm-answer").addEventListener("click", confirmAnswer);
    byId("submit-exam").addEventListener("click", submitExam);
    byId("previous-question").addEventListener("click", () => { state.currentIndex -= 1; renderQuestion(); });
    byId("next-question").addEventListener("click", () => { state.currentIndex += 1; renderQuestion(); });
    byId("exit-exam").addEventListener("click", () => { if (window.confirm("退出后本次答题记录将清空，确认退出吗？")) resetExam(); });
    byId("incorrect-only").addEventListener("change", renderResults);
    byId("retry-exam").addEventListener("click", retryExam);
    byId("reset-exam").addEventListener("click", resetExam);
    TYPES.forEach((type) => {
        byId(`${type}-count`).addEventListener("input", clearErrors);
        byId(`${type}-score`).addEventListener("input", clearErrors);
    });
    loadQuestionBank();
}());