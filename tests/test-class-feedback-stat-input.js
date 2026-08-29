const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const root = path.resolve(__dirname, '..');
const modulePath = path.join(root, 'feedback-stat-input.mjs');
const classFormalSource = fs.readFileSync(path.join(root, 'classFormal.js'), 'utf8');

class FakeInput {
    constructor(value = '0') {
        this.value = value;
        this.validationMessage = '';
        this.reportValidityCount = 0;
        this.focusCount = 0;
        this.listeners = new Map();
    }

    addEventListener(type, listener) {
        const listeners = this.listeners.get(type) || [];
        listeners.push(listener);
        this.listeners.set(type, listeners);
    }

    setCustomValidity(message) {
        this.validationMessage = message;
    }

    reportValidity() {
        this.reportValidityCount += 1;
        return !this.validationMessage;
    }

    focus() {
        this.focusCount += 1;
    }

    dispatch(type) {
        (this.listeners.get(type) || []).forEach((listener) => listener({ target: this }));
    }
}

function createFakeDocument(values = {}) {
    const ids = ['reviewWord', 'reviewforgetWord', 'preTestWord', 'newWord', 'forgetWord'];
    const inputs = Object.fromEntries(ids.map((id) => [id, new FakeInput(values[id] ?? '0')]));
    return {
        inputs,
        getElementById(id) {
            return inputs[id] || null;
        }
    };
}

(async () => {
    assert(
        fs.existsSync(modulePath),
        '应提供课堂反馈统计输入模块，统一处理五项失焦求和'
    );

    const mod = await import(`${pathToFileURL(modulePath).href}?test=${Date.now()}`);

    assert(
        classFormalSource.includes("from './feedback-stat-input.mjs'")
            && classFormalSource.includes('initFeedbackStatInputs(document)')
            && classFormalSource.includes('normalizeFeedbackStatInputs(document)'),
        'classFormal.js 应初始化五项失焦汇总，并在提交前统一校验'
    );

    assert.deepStrictEqual(
        mod.parseFeedbackStatExpression('10+20+15'),
        { valid: true, total: 45 },
        '半角加号表达式应正确求和'
    );
    assert.deepStrictEqual(
        mod.parseFeedbackStatExpression(' 10 ＋ 20 + 15 '),
        { valid: true, total: 45 },
        '全角加号和空格应正确归一化'
    );
    assert.strictEqual(mod.parseFeedbackStatExpression('10++20').valid, false, '连续加号应判定为无效');
    assert.strictEqual(mod.parseFeedbackStatExpression('10+a').valid, false, '字母分项应判定为无效');
    assert.strictEqual(mod.parseFeedbackStatExpression('-1+2').valid, false, '负数应判定为无效');
    assert.strictEqual(mod.parseFeedbackStatExpression('1.5+2').valid, false, '小数应判定为无效');

    const allFieldsDocument = createFakeDocument({ newWord: '30' });
    mod.initFeedbackStatInputs(allFieldsDocument);

    for (const id of mod.FEEDBACK_STAT_INPUT_IDS) {
        const input = allFieldsDocument.inputs[id];
        input.value = '10+20+15';
        input.dispatch('blur');
        assert.strictEqual(input.value, '45', `${id} 失焦后应自动汇总为 45`);

        input.value += '+10';
        input.dispatch('blur');
        assert.strictEqual(input.value, '55', `${id} 应允许在合计后继续追加`);
    }

    const invalidInput = allFieldsDocument.inputs.reviewWord;
    invalidInput.value = '10++20';
    invalidInput.dispatch('blur');
    assert.strictEqual(invalidInput.value, '10++20', '非法表达式失焦后应保留原内容');
    assert(invalidInput.validationMessage, '非法表达式应设置校验提示');
    assert.strictEqual(invalidInput.reportValidityCount, 1, '非法表达式失焦后应展示校验提示');
    invalidInput.dispatch('input');
    assert.strictEqual(invalidInput.validationMessage, '', '继续编辑时应清除旧校验提示');

    const firstSyncDocument = createFakeDocument({ reviewforgetWord: '0', newWord: '30' });
    mod.initFeedbackStatInputs(firstSyncDocument);
    firstSyncDocument.inputs.reviewforgetWord.value = '2+3+1';
    firstSyncDocument.inputs.reviewforgetWord.dispatch('blur');
    assert.strictEqual(firstSyncDocument.inputs.reviewforgetWord.value, '6', '复习遗忘应先汇总为 6');
    assert.strictEqual(firstSyncDocument.inputs.newWord.value, '6', '复习遗忘首次有效失焦应同步合计到新学单词');

    firstSyncDocument.inputs.reviewforgetWord.value = '8';
    firstSyncDocument.inputs.reviewforgetWord.dispatch('blur');
    assert.strictEqual(firstSyncDocument.inputs.newWord.value, '6', '复习遗忘后续失焦不应再次覆盖新学单词');

    const delayedSyncDocument = createFakeDocument({ reviewforgetWord: '0', newWord: '30' });
    mod.initFeedbackStatInputs(delayedSyncDocument);
    delayedSyncDocument.inputs.reviewforgetWord.dispatch('blur');
    assert.strictEqual(delayedSyncDocument.inputs.newWord.value, '30', '复习遗忘为 0 时不应同步');
    delayedSyncDocument.inputs.reviewforgetWord.value = '4';
    delayedSyncDocument.inputs.reviewforgetWord.dispatch('blur');
    assert.strictEqual(delayedSyncDocument.inputs.newWord.value, '4', '无效同步未消耗机会，后续正数仍应首次同步');

    const submitDocument = createFakeDocument({
        reviewWord: '10+20',
        reviewforgetWord: '2+3',
        preTestWord: '4+5',
        newWord: '20+10',
        forgetWord: '1+2'
    });
    const normalized = mod.normalizeFeedbackStatInputs(submitDocument);
    assert.strictEqual(normalized.valid, true, '五项有效表达式应允许提交');
    assert.deepStrictEqual(
        Object.fromEntries(mod.FEEDBACK_STAT_INPUT_IDS.map((id) => [id, submitDocument.inputs[id].value])),
        {
            reviewWord: '30',
            reviewforgetWord: '5',
            preTestWord: '9',
            newWord: '30',
            forgetWord: '3'
        },
        '提交前应统一把五项归一化为合计'
    );

    submitDocument.inputs.forgetWord.value = '1+a';
    const rejected = mod.normalizeFeedbackStatInputs(submitDocument);
    assert.strictEqual(rejected.valid, false, '任一统计项非法时应阻止提交');
    assert.strictEqual(rejected.input, submitDocument.inputs.forgetWord, '应返回第一个非法输入框');
    assert.strictEqual(submitDocument.inputs.forgetWord.focusCount, 1, '提交失败时应聚焦非法输入框');

    console.log('test-class-feedback-stat-input passed');
})().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
