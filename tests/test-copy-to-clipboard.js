const assert = require('assert');
const fs = require('fs');
const path = require('path');

function extractBlock(source, signature) {
    const start = source.indexOf(signature);
    assert(start >= 0, `Missing ${signature}`);
    const openBrace = source.indexOf('{', start);
    let depth = 0;
    for (let index = openBrace; index < source.length; index += 1) {
        if (source[index] === '{') depth += 1;
        if (source[index] === '}') depth -= 1;
        if (depth === 0) return source.slice(start, index + 1);
    }
    throw new Error(`Unclosed ${signature}`);
}

const source = fs.readFileSync(path.join(__dirname, '..', 'commonFunctions.js'), 'utf8');
const functionCode = extractBlock(source, 'export function copyToClipboard');
const copyToClipboard = new Function(
    'document',
    `${functionCode.replace('export ', '')}\nreturn copyToClipboard;`
);

function createDocument(copyResult) {
    const state = { appended: 0, removed: 0, selected: 0, copiedText: null };
    let textarea;
    const document = {
        createElement() {
            textarea = {
                value: '',
                select() {
                    state.selected += 1;
                }
            };
            return textarea;
        },
        body: {
            appendChild() {
                state.appended += 1;
            },
            removeChild() {
                state.removed += 1;
            }
        },
        execCommand() {
            state.copiedText = textarea.value;
            if (copyResult instanceof Error) throw copyResult;
            return copyResult;
        }
    };
    return { document, state };
}

const success = createDocument(true);
assert.equal(copyToClipboard(success.document)('first<br>second<br><br>third'), true);
assert.equal(success.state.copiedText, 'first\nsecond\n\nthird');
assert.deepEqual(
    { appended: success.state.appended, selected: success.state.selected, removed: success.state.removed },
    { appended: 1, selected: 1, removed: 1 }
);

const rejected = createDocument(false);
assert.equal(copyToClipboard(rejected.document)('text'), false);
assert.equal(rejected.state.removed, 1, '复制被拒绝时也应清理 textarea');

const failed = createDocument(new Error('clipboard blocked'));
assert.equal(copyToClipboard(failed.document)('text'), false, '浏览器抛错应转换为可处理的失败状态');
assert.equal(failed.state.removed, 1, '复制抛错时也应清理 textarea');

console.log('test-copy-to-clipboard passed');