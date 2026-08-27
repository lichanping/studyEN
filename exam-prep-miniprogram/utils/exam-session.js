const core = require("./core.js");

function createSession(questions) {
    return {
        questions,
        inventory: core.getInventory(questions),
        exam: [],
        responses: {},
        confirmed: [],
        currentIndex: 0,
        mode: "instant",
        scores: {},
        result: null,
        view: "setup"
    };
}

function startExam(session, settings, mode, random = Math.random) {
    const validation = core.validateSettings(settings, session.inventory);
    if (!validation.valid) return { session, validation };
    const scores = {};
    for (const type of Object.keys(settings.scores)) {
        scores[type] = Number(settings.scores[type]);
    }
    return {
        validation,
        session: {
            ...session,
            exam: core.buildExam(session.questions, settings.counts, random),
            responses: {},
            confirmed: [],
            currentIndex: 0,
            mode,
            scores,
            result: null,
            view: "quiz"
        }
    };
}

function chooseOption(session, questionId, optionId) {
    const question = session.exam.find((item) => item.id === questionId);
    if (!question || (session.mode === "instant" && session.confirmed.includes(questionId))) return session;
    const selected = session.responses[questionId] || [];
    const response = question.type === "multiple"
        ? selected.includes(optionId)
            ? selected.filter((id) => id !== optionId)
            : [...selected, optionId]
        : [optionId];
    return {
        ...session,
        responses: { ...session.responses, [questionId]: response }
    };
}

function confirmAnswer(session, questionId) {
    if (!(session.responses[questionId] || []).length) {
        return { session, error: "请先选择答案" };
    }
    const confirmed = session.confirmed.includes(questionId)
        ? session.confirmed
        : [...session.confirmed, questionId];
    const confirmedSession = { ...session, confirmed };
    return {
        session: confirmed.length === session.exam.length ? submitExam(confirmedSession) : confirmedSession,
        error: ""
    };
}

function submitExam(session) {
    return {
        ...session,
        result: core.gradeExam(session.exam, session.responses, session.scores),
        view: "results"
    };
}

function retryIncorrect(session) {
    return {
        ...session,
        exam: core.buildRetryExam(session.result.items),
        responses: {},
        confirmed: [],
        currentIndex: 0,
        result: null,
        view: "quiz"
    };
}

module.exports = { chooseOption, confirmAnswer, createSession, retryIncorrect, startExam, submitExam };