(function (root, factory) {
    const api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    root.ExamPrepCore = api;
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
    const TYPES = ["single", "multiple", "boolean"];

    function getInventory(questions) {
        const inventory = { single: 0, multiple: 0, boolean: 0 };
        for (const question of questions || []) {
            if (Object.hasOwn(inventory, question.type)) inventory[question.type] += 1;
        }
        return inventory;
    }

    function validateSettings(settings, inventory) {
        const errors = {};
        let totalCount = 0;
        for (const type of TYPES) {
            const count = Number(settings.counts[type]);
            const score = Number(settings.scores[type]);
            if (!Number.isInteger(count) || count < 0) {
                errors[type] = "请输入非负整数";
            } else if (count > inventory[type]) {
                errors[type] = `最多可选 ${inventory[type]} 题`;
            } else {
                totalCount += count;
            }
            if (!Number.isInteger(score) || score <= 0) {
                errors[`${type}Score`] = "分值须为大于 0 的整数";
            }
        }
        if (totalCount === 0 && !TYPES.some((type) => errors[type])) {
            errors.form = "请至少选择 1 道题";
        }
        return { valid: Object.keys(errors).length === 0, errors };
    }

    function shuffle(items, random) {
        const copy = items.slice();
        for (let index = copy.length - 1; index > 0; index -= 1) {
            const swapIndex = Math.floor(random() * (index + 1));
            [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
        }
        return copy;
    }

    function buildExam(questions, counts, random = Math.random) {
        const selected = [];
        for (const type of TYPES) {
            const candidates = questions.filter((question) => question.type === type);
            selected.push(...shuffle(candidates, random).slice(0, Number(counts[type]) || 0));
        }
        return shuffle(selected, random);
    }

    function normalizedAnswers(answers) {
        return [...new Set(answers || [])].sort();
    }

    function answersMatch(actual, expected) {
        const normalizedActual = normalizedAnswers(actual);
        const normalizedExpected = normalizedAnswers(expected);
        return normalizedActual.length === normalizedExpected.length
            && normalizedActual.every((answer, index) => answer === normalizedExpected[index]);
    }

    function gradeExam(exam, responses, scores) {
        const byType = Object.fromEntries(TYPES.map((type) => [type, {
            score: 0,
            totalScore: 0,
            correct: 0,
            total: 0
        }]));
        let score = 0;
        let totalScore = 0;
        const items = exam.map((question) => {
            const response = normalizedAnswers(responses[question.id]);
            const questionScore = Number(scores[question.type]);
            const status = response.length === 0
                ? "unanswered"
                : answersMatch(response, question.answers) ? "correct" : "incorrect";
            const earned = status === "correct" ? questionScore : 0;
            score += earned;
            totalScore += questionScore;
            byType[question.type].score += earned;
            byType[question.type].totalScore += questionScore;
            byType[question.type].correct += status === "correct" ? 1 : 0;
            byType[question.type].total += 1;
            return { question, response, status, earned, questionScore };
        });
        return {
            score,
            totalScore,
            percentage: totalScore ? Math.round((score / totalScore) * 100) : 0,
            items,
            byType
        };
    }

    return { buildExam, getInventory, gradeExam, validateSettings };
}));