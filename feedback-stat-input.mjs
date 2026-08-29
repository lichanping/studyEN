export const FEEDBACK_STAT_INPUT_IDS = Object.freeze([
    'reviewWord',
    'reviewforgetWord',
    'preTestWord',
    'newWord',
    'forgetWord'
]);

const INVALID_EXPRESSION_MESSAGE = '请输入非负整数，多个数字请使用 + 连接';

export function parseFeedbackStatExpression(value) {
    const normalized = String(value ?? '')
        .replace(/\s/g, '')
        .replace(/＋/g, '+');

    if (!normalized) {
        return { valid: true, total: 0 };
    }
    if (!/^\d+(?:\+\d+)*$/.test(normalized)) {
        return { valid: false, total: 0 };
    }

    const total = normalized
        .split('+')
        .reduce((sum, item) => sum + Number(item), 0);
    if (!Number.isSafeInteger(total)) {
        return { valid: false, total: 0 };
    }

    return { valid: true, total };
}

export function collapseFeedbackStatInput(input, options = {}) {
    const result = parseFeedbackStatExpression(input?.value);
    if (!input) {
        return { valid: false, total: 0 };
    }

    input.setCustomValidity(result.valid ? '' : INVALID_EXPRESSION_MESSAGE);
    if (!result.valid) {
        if (options.reportInvalid) {
            input.reportValidity();
        }
        return result;
    }

    input.value = String(result.total);
    return result;
}

export function normalizeFeedbackStatInputs(documentRef = document) {
    for (const id of FEEDBACK_STAT_INPUT_IDS) {
        const input = documentRef.getElementById(id);
        if (!input) continue;

        const result = collapseFeedbackStatInput(input);
        if (!result.valid) {
            input.reportValidity();
            input.focus();
            return { valid: false, input };
        }
    }

    return { valid: true, input: null };
}

export function initFeedbackStatInputs(documentRef = document) {
    const newWordInput = documentRef.getElementById('newWord');
    let hasAutoSyncedNewWordFromReviewWord = false;

    for (const id of FEEDBACK_STAT_INPUT_IDS) {
        const input = documentRef.getElementById(id);
        if (!input) continue;

        input.addEventListener('input', () => {
            input.setCustomValidity('');
        });
        input.addEventListener('blur', () => {
            const result = collapseFeedbackStatInput(input, { reportInvalid: true });
            if (
                id === 'reviewforgetWord'
                && result.valid
                && result.total > 0
                && !hasAutoSyncedNewWordFromReviewWord
                && newWordInput
            ) {
                newWordInput.value = String(result.total);
                newWordInput.setCustomValidity('');
                hasAutoSyncedNewWordFromReviewWord = true;
            }
        });
    }
}
