const questionsData = require("../../data/questions-v1.js");
const sessionApi = require("../../utils/exam-session.js");

const TYPES = ["single", "multiple", "boolean"];
const TYPE_NAMES = { single: "单选题", multiple: "多选题", boolean: "判断题" };
const DEFAULT_SETTINGS = [
    { key: "single", name: "单选题", count: 5, score: 1 },
    { key: "multiple", name: "多选题", count: 5, score: 2 },
    { key: "boolean", name: "判断题", count: 5, score: 1 }
];

function sameAnswers(first, second) {
    return [...first].sort().join("|") === [...second].sort().join("|");
}

Page({
    data: {
        view: "setup",
        bankStatus: "题库加载中",
        typeSettings: DEFAULT_SETTINGS,
        mode: "instant",
        formError: "",
        currentQuestion: null,
        currentOptions: [],
        questionProgress: "",
        answeredProgress: "",
        progressPercent: 0,
        feedbackText: "",
        feedbackWrong: false,
        canPrevious: false,
        canNext: false,
        confirmText: "确认本题",
        result: null,
        typeSummary: [],
        resultItems: [],
        incorrectOnly: false,
        canRetryIncorrect: false
    },

    onLoad() {
        this.session = sessionApi.createSession(questionsData.questions);
        this.setData({
            bankStatus: `题库已就绪 · ${questionsData.questions.length} 题`,
            typeSettings: DEFAULT_SETTINGS.map((item) => ({
                ...item,
                limit: this.session.inventory[item.key],
                countError: "",
                scoreError: ""
            }))
        });
    },

    onShareAppMessage() {
        return {
            title: "B证备考",
            path: "/pages/index/index"
        };
    },

    updateSetting(event) {
        const { type, field } = event.currentTarget.dataset;
        this.setData({
            typeSettings: this.data.typeSettings.map((item) => item.key === type
                ? { ...item, [field]: event.detail.value, countError: "", scoreError: "" }
                : item),
            formError: ""
        });
    },

    changeMode(event) {
        this.setData({ mode: event.detail.value });
    },

    getSettings() {
        const counts = {};
        const scores = {};
        for (const item of this.data.typeSettings) {
            counts[item.key] = item.count;
            scores[item.key] = item.score;
        }
        return {
            counts,
            scores
        };
    },

    startExam() {
        const started = sessionApi.startExam(this.session, this.getSettings(), this.data.mode);
        if (!started.validation.valid) {
            this.setData({
                typeSettings: this.data.typeSettings.map((item) => ({
                    ...item,
                    countError: started.validation.errors[item.key] || "",
                    scoreError: started.validation.errors[`${item.key}Score`] || ""
                })),
                formError: started.validation.errors.form || ""
            });
            return;
        }
        this.session = started.session;
        this.renderQuiz();
    },

    renderQuiz() {
        const question = this.session.exam[this.session.currentIndex];
        const response = this.session.responses[question.id] || [];
        const confirmed = this.session.confirmed.includes(question.id);
        const isCorrect = confirmed && sameAnswers(response, question.answers);
        this.setData({
            view: "quiz",
            currentQuestion: { ...question, typeName: TYPE_NAMES[question.type] },
            currentOptions: question.options.map((option) => ({
                ...option,
                className: response.includes(option.id)
                    ? confirmed && !question.answers.includes(option.id) ? "selected-wrong" : "selected"
                    : confirmed && question.answers.includes(option.id) ? "correct" : ""
            })),
            questionProgress: `第 ${this.session.currentIndex + 1} / ${this.session.exam.length} 题`,
            answeredProgress: `已答 ${Object.values(this.session.responses).filter((answers) => answers.length).length} 题`,
            progressPercent: ((this.session.currentIndex + 1) / this.session.exam.length) * 100,
            feedbackText: confirmed ? (isCorrect ? "回答正确" : `回答错误。正确答案：${question.answers.join("、")}`) : "",
            feedbackWrong: confirmed && !isCorrect,
            canPrevious: this.session.currentIndex > 0,
            canNext: this.session.currentIndex < this.session.exam.length - 1,
            confirmText: this.session.mode === "instant" ? (confirmed ? "已确认" : "确认本题") : "保存并下一题"
        });
    },

    chooseOption(event) {
        this.session = sessionApi.chooseOption(
            this.session,
            this.data.currentQuestion.id,
            event.currentTarget.dataset.optionId
        );
        this.renderQuiz();
    },

    confirmAnswer() {
        const questionId = this.data.currentQuestion.id;
        if (!(this.session.responses[questionId] || []).length) {
            wx.showToast({ title: "请先选择答案", icon: "none" });
            return;
        }
        if (this.session.mode === "instant") {
            const confirmation = sessionApi.confirmAnswer(this.session, questionId);
            this.session = confirmation.session;
            if (this.session.view === "results") this.showResults();
            else this.renderQuiz();
            return;
        }
        if (this.session.currentIndex < this.session.exam.length - 1) {
            this.session = { ...this.session, currentIndex: this.session.currentIndex + 1 };
            this.renderQuiz();
        }
    },

    previousQuestion() {
        if (!this.data.canPrevious) return;
        this.session = { ...this.session, currentIndex: this.session.currentIndex - 1 };
        this.renderQuiz();
    },

    nextQuestion() {
        if (!this.data.canNext) return;
        this.session = { ...this.session, currentIndex: this.session.currentIndex + 1 };
        this.renderQuiz();
    },

    submitExam() {
        const unanswered = this.session.exam.filter((question) => !(this.session.responses[question.id] || []).length).length;
        if (!unanswered) {
            this.finishExam();
            return;
        }
        wx.showModal({
            title: "确认交卷",
            content: `还有 ${unanswered} 题未答，确认交卷吗？`,
            success: ({ confirm }) => { if (confirm) this.finishExam(); }
        });
    },

    finishExam() {
        this.session = sessionApi.submitExam(this.session);
        this.showResults();
    },

    showResults() {
        const result = this.session.result;
        const incorrect = result.items.filter((item) => item.status === "incorrect").length;
        const unanswered = result.items.filter((item) => item.status === "unanswered").length;
        this.allResultItems = result.items.map((item, index) => {
            const answerText = item.question.options
                .filter((option) => item.response.includes(option.id))
                .map((option) => `${option.id}. ${option.text}`).join("；") || "未作答";
            const correctText = item.question.options
                .filter((option) => item.question.answers.includes(option.id))
                .map((option) => `${option.id}. ${option.text}`).join("；");
            return {
                ...item,
                number: index + 1,
                typeName: TYPE_NAMES[item.question.type],
                statusText: { correct: "回答正确", incorrect: "回答错误", unanswered: "未作答" }[item.status],
                answerText,
                correctText
            };
        });
        this.setData({
            view: "results",
            result: {
                ...result,
                summary: `答对 ${result.items.length - incorrect - unanswered} 题，答错 ${incorrect} 题，未答 ${unanswered} 题`
            },
            typeSummary: TYPES.filter((type) => result.byType[type].total).map((type) => ({
                name: TYPE_NAMES[type],
                ...result.byType[type]
            })),
            resultItems: this.allResultItems,
            incorrectOnly: false,
            canRetryIncorrect: incorrect + unanswered > 0
        });
        wx.pageScrollTo({ scrollTop: 0, duration: 0 });
    },

    toggleIncorrectOnly(event) {
        const checked = event.detail.value.length > 0;
        this.setData({
            incorrectOnly: checked,
            resultItems: checked
                ? this.allResultItems.filter((item) => item.status !== "correct")
                : this.allResultItems
        });
    },

    retryIncorrect() {
        if (!this.data.canRetryIncorrect) return;
        this.session = sessionApi.retryIncorrect(this.session);
        this.renderQuiz();
        wx.pageScrollTo({ scrollTop: 0, duration: 0 });
    },

    retryExam() {
        this.session = sessionApi.createSession(questionsData.questions);
        this.startExam();
    },

    resetExam() {
        this.session = sessionApi.createSession(questionsData.questions);
        this.setData({ view: "setup", formError: "" });
        wx.pageScrollTo({ scrollTop: 0, duration: 0 });
    },

    exitExam() {
        wx.showModal({
            title: "退出本次答题",
            content: "退出后本次答题记录将清空，确认退出吗？",
            success: ({ confirm }) => { if (confirm) this.resetExam(); }
        });
    }
});