import assert from 'node:assert/strict';

import { createYangKaidiWordReviewRepository } from '../yang-kaidi-word-review-db.mjs';

function createRequest(action) {
    const request = {};
    queueMicrotask(() => {
        try {
            request.result = action();
            request.onsuccess?.();
        } catch (error) {
            request.error = error;
            request.onerror?.();
        }
    });
    return request;
}

function createFakeIndexedDb() {
    const stores = new Map();
    const operations = [];
    const database = {
        objectStoreNames: {
            contains(name) {
                return stores.has(name);
            }
        },
        createObjectStore(name, options) {
            stores.set(name, { keyPath: options.keyPath, values: new Map() });
        },
        transaction(storeNames, mode) {
            const transaction = {
                objectStore(name) {
                    const store = stores.get(name);
                    return {
                        get(key) {
                            return createRequest(() => store.values.get(key));
                        },
                        getAll() {
                            return createRequest(() => [...store.values.values()]);
                        },
                        put(value) {
                            operations.push(`${mode}:put:${name}:${value.bookId}`);
                            store.values.set(value[store.keyPath], structuredClone(value));
                            return createRequest(() => value[store.keyPath]);
                        },
                        delete(key) {
                            operations.push(`${mode}:delete:${name}:${key}`);
                            store.values.delete(key);
                            return createRequest(() => undefined);
                        }
                    };
                }
            };
            setTimeout(() => transaction.oncomplete?.(), 0);
            return transaction;
        }
    };
    return {
        operations,
        seed(storeName, value) {
            stores.get(storeName).values.set(value.bookId, structuredClone(value));
        },
        open(name, version) {
            assert.equal(name, 'YangKaidiWordReviewDB');
            assert.equal(version, 1);
            const request = { result: database };
            queueMicrotask(() => {
                request.onupgradeneeded?.();
                request.onsuccess?.();
            });
            return request;
        }
    };
}

const fakeIndexedDb = createFakeIndexedDb();
const repository = createYangKaidiWordReviewRepository(fakeIndexedDb);
const draft = {
    bookId: '2026-05-09',
    sourceFingerprint: 'fp-1',
    entries: { first: { tested: true, revealed: false, forgotten: true } }
};
await repository.putDraft(draft);
assert.deepEqual(await repository.getDraft('2026-05-09'), draft);
assert.equal(await repository.getResult('2026-05-09'), undefined, '草稿不能写入正式结果 store');

const result = {
    bookId: '2026-05-09',
    sourceFingerprint: 'fp-1',
    testedCount: 3,
    forgottenWords: [{ entryId: 'first', english: 'word', meaning: 'n 单词' }]
};
await repository.completeBook(result);
assert.equal(await repository.getDraft('2026-05-09'), undefined, '正式完成后应删除草稿');
assert.deepEqual(await repository.getResult('2026-05-09'), {
    ...result,
    forgottenCount: 1,
    correctCount: 2,
    accuracy: 2 / 3 * 100
}, '写入正式结果时必须补齐统计字段');
assert.deepEqual(await repository.getAllResults(), [{
    ...result,
    forgottenCount: 1,
    correctCount: 2,
    accuracy: 2 / 3 * 100
}]);
assert.deepEqual(
    fakeIndexedDb.operations.slice(-2),
    ['readwrite:put:results:2026-05-09', 'readwrite:delete:drafts:2026-05-09'],
    '正式结果写入和草稿删除应位于同一 readwrite 事务'
);

await repository.putDraft({ ...draft, bookId: '2026-05-15' });
await repository.deleteDraft('2026-05-15');
assert.equal(await repository.getDraft('2026-05-15'), undefined);

await repository.putResult({
    ...result,
    bookId: '2026-05-15',
    forgottenCount: undefined,
    correctCount: undefined,
    accuracy: undefined
});
assert.equal((await repository.getAllResults()).length, 2);
assert.deepEqual(
    await repository.getResult('2026-05-15'),
    {
        ...result,
        bookId: '2026-05-15',
        forgottenCount: 1,
        correctCount: 2,
        accuracy: 2 / 3 * 100
    },
    '不完整结果不得原样写入 IndexedDB'
);

fakeIndexedDb.seed('results', {
    ...result,
    bookId: '2026-05-16',
    forgottenCount: 1,
    correctCount: undefined,
    accuracy: undefined
});
const migratedResult = await repository.getResult('2026-05-16');
assert.equal(migratedResult.correctCount, 2);
assert.equal(migratedResult.accuracy, 2 / 3 * 100);
assert(
    fakeIndexedDb.operations.includes('readwrite:put:results:2026-05-16'),
    '读取已有不完整结果时应自动回写修复后的完整记录'
);

console.log('test-yang-kaidi-word-review-db passed');