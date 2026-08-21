const assert = require('assert');
const fs = require('fs');
const path = require('path');

function read(fileName) {
    return fs.readFileSync(path.join(__dirname, '..', fileName), 'utf8');
}

function extractBlock(source, signature, openChar = '{', closeChar = '}') {
    const start = source.indexOf(signature);
    if (start === -1) {
        throw new Error(`Unable to find block: ${signature}`);
    }

    const bodyStart = source.indexOf(openChar, start);
    if (bodyStart === -1) {
        throw new Error(`Unable to find block body for: ${signature}`);
    }

    let depth = 0;
    for (let index = bodyStart; index < source.length; index += 1) {
        const char = source[index];
        if (char === openChar) depth += 1;
        if (char === closeChar) {
            depth -= 1;
            if (depth === 0) {
                return source.slice(start, index + 1);
            }
        }
    }

    throw new Error(`Unable to extract block: ${signature}`);
}

const commonFunctionsSource = read('commonFunctions.js');
const countNonEmptyLinesCode = extractBlock(commonFunctionsSource, 'function countNonEmptyLines');
const getBeijingDateYmdCode = extractBlock(commonFunctionsSource, 'function getBeijingDateYmd');
const getReviewDateYmdCode = extractBlock(commonFunctionsSource, 'function getReviewDateYmd');
const confirmAntiForgettingReviewDateMatchesTodayCode = extractBlock(commonFunctionsSource, 'function confirmAntiForgettingReviewDateMatchesToday');
const handleAntiForgettingFeedbackClickCode = extractBlock(commonFunctionsSource, 'export async function handleAntiForgettingFeedbackClick');
const handleNewVersionFeedbackClickCode = extractBlock(commonFunctionsSource, 'export async function handleNewVersionFeedbackClick');

function createDocumentMock(reviewTime) {
    const elements = {
        userName: { value: '邱睿' },
        reviewTime: { value: reviewTime },
        keyLanguagePoints: { value: '' },
        practiceArea: { value: '' },
        antiForgettingForgetWord: { value: '1' },
        forgetWords: { value: 'apple 苹果' },
        pronounceWords: { value: '' }
    };

    return {
        querySelectorAll(selector) {
            assert.strictEqual(selector, '.antiForgettingReviewWord');
            return [{ value: '10' }];
        },
        getElementById(id) {
            return elements[id] || null;
        }
    };
}

function createFeedbackApi({ reviewTime, confirmResult, nowIso }) {
    const events = {
        confirmedMessages: [],
        copied: 0,
        shown: 0,
        storedFeedback: 0,
        storedForgetWords: 0
    };

    const DateCtor = class FixedDate extends Date {
        constructor(...args) {
            if (args.length === 0) {
                super(nowIso);
                return;
            }
            super(...args);
        }

        static now() {
            return new Date(nowIso).getTime();
        }
    };

    return {
        events,
        ...new Function(
            'document',
            'Date',
            'window',
            'showAllowEmptyConfirm',
            'storeForgetWords',
            'storeFeedbackInFile',
            'getRandomFeedback',
            'getRandomMotto',
            'copyToClipboard',
            'showLongText',
            'countEnglishWords',
            `${countNonEmptyLinesCode}\n${getBeijingDateYmdCode}\n${getReviewDateYmdCode}\n${confirmAntiForgettingReviewDateMatchesTodayCode}\n${handleAntiForgettingFeedbackClickCode.replace('export ', '')}\n${handleNewVersionFeedbackClickCode.replace('export ', '')}\nreturn { handleAntiForgettingFeedbackClick, handleNewVersionFeedbackClick };`
        )(
            createDocumentMock(reviewTime),
            DateCtor,
            {
                confirm(message) {
                    events.confirmedMessages.push(message);
                    return confirmResult;
                }
            },
            async () => true,
            async () => { events.storedForgetWords += 1; },
            async () => { events.storedFeedback += 1; },
            () => '表现很好',
            () => '继续加油',
            () => { events.copied += 1; },
            () => { events.shown += 1; },
            (text) => String(text || '').split(/\s+/).filter(Boolean).length
        )
    };
}

(async () => {
    {
        const { handleNewVersionFeedbackClick, events } = createFeedbackApi({
            reviewTime: '2026-08-20T19:30',
            confirmResult: false,
            nowIso: '2026-08-20T16:30:00Z'
        });

        await handleNewVersionFeedbackClick();

        assert.strictEqual(events.confirmedMessages.length, 1, '新版反馈日期不是北京时间今天时应先弹确认');
        assert(events.confirmedMessages[0].includes('2026-08-20'), '确认文案应包含当前选择的复习日期');
        assert(events.confirmedMessages[0].includes('2026-08-21'), '确认文案应包含当前北京时间日期');
        assert.strictEqual(events.copied, 0, '用户取消后新版反馈不应复制文案');
        assert.strictEqual(events.storedFeedback, 0, '用户取消后新版反馈不应写入统计');
    }

    {
        const { handleAntiForgettingFeedbackClick, events } = createFeedbackApi({
            reviewTime: '2026-08-20T19:30',
            confirmResult: false,
            nowIso: '2026-08-20T16:30:00Z'
        });

        await handleAntiForgettingFeedbackClick();

        assert.strictEqual(events.confirmedMessages.length, 1, '抗遗忘课堂反馈日期不是北京时间今天时应先弹确认');
        assert.strictEqual(events.copied, 0, '用户取消后抗遗忘课堂反馈不应复制文案');
        assert.strictEqual(events.storedFeedback, 0, '用户取消后抗遗忘课堂反馈不应写入统计');
        assert.strictEqual(events.storedForgetWords, 0, '用户取消后抗遗忘课堂反馈不应写入遗忘词');
    }

    {
        const { handleNewVersionFeedbackClick, events } = createFeedbackApi({
            reviewTime: '2026-08-21T08:00',
            confirmResult: false,
            nowIso: '2026-08-20T16:30:00Z'
        });

        await handleNewVersionFeedbackClick();

        assert.strictEqual(events.confirmedMessages.length, 0, '复习日期等于北京时间今天时不应弹确认');
        assert.strictEqual(events.copied, 1, '复习日期为北京时间今天时应继续正常生成反馈');
        assert.strictEqual(events.storedFeedback, 1, '复习日期为北京时间今天时应正常写入统计');
    }

    console.log('test-anti-forgetting-review-date-confirm passed');
})().catch((error) => {
    console.error(error);
    process.exit(1);
});