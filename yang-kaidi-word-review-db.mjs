const DATABASE_NAME = 'YangKaidiWordReviewDB';
const DATABASE_VERSION = 1;

function requestToPromise(request) {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function transactionToPromise(transaction) {
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error || new Error('IndexedDB transaction aborted'));
    });
}

function normalizeCompletedResult(result) {
    const testedCount = Math.max(0, Number(result?.testedCount) || 0);
    const hasForgottenWords = Array.isArray(result?.forgottenWords);
    const forgottenWords = hasForgottenWords ? result.forgottenWords : [];
    const storedForgottenCount = Math.max(0, Number(result?.forgottenCount) || 0);
    const forgottenCount = Math.min(testedCount, hasForgottenWords ? forgottenWords.length : storedForgottenCount);
    const correctCount = testedCount - forgottenCount;
    return {
        ...result,
        testedCount,
        forgottenCount,
        correctCount,
        accuracy: testedCount > 0 ? correctCount / testedCount * 100 : null,
        forgottenWords
    };
}

function hasCanonicalStats(result, normalized) {
    return result?.testedCount === normalized.testedCount
        && result?.forgottenCount === normalized.forgottenCount
        && result?.correctCount === normalized.correctCount
        && result?.accuracy === normalized.accuracy
        && Array.isArray(result?.forgottenWords);
}

export function createYangKaidiWordReviewRepository(indexedDb = globalThis.indexedDB) {
    if (!indexedDb) {
        throw new Error('当前浏览器不支持 IndexedDB');
    }

    let databasePromise;
    function openDatabase() {
        if (!databasePromise) {
            databasePromise = new Promise((resolve, reject) => {
                const request = indexedDb.open(DATABASE_NAME, DATABASE_VERSION);
                request.onupgradeneeded = () => {
                    const database = request.result;
                    if (!database.objectStoreNames.contains('drafts')) {
                        database.createObjectStore('drafts', { keyPath: 'bookId' });
                    }
                    if (!database.objectStoreNames.contains('results')) {
                        database.createObjectStore('results', { keyPath: 'bookId' });
                    }
                };
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        }
        return databasePromise;
    }

    async function get(storeName, bookId) {
        const database = await openDatabase();
        return requestToPromise(database.transaction([storeName], 'readonly').objectStore(storeName).get(bookId));
    }

    async function getAll(storeName) {
        const database = await openDatabase();
        return requestToPromise(database.transaction([storeName], 'readonly').objectStore(storeName).getAll());
    }

    async function put(storeName, value) {
        const database = await openDatabase();
        const transaction = database.transaction([storeName], 'readwrite');
        transaction.objectStore(storeName).put(value);
        await transactionToPromise(transaction);
    }

    async function remove(storeName, bookId) {
        const database = await openDatabase();
        const transaction = database.transaction([storeName], 'readwrite');
        transaction.objectStore(storeName).delete(bookId);
        await transactionToPromise(transaction);
    }

    return {
        getDraft: (bookId) => get('drafts', bookId),
        putDraft: (draft) => put('drafts', draft),
        deleteDraft: (bookId) => remove('drafts', bookId),
        async getResult(bookId) {
            const result = await get('results', bookId);
            if (!result) return result;
            const normalized = normalizeCompletedResult(result);
            if (!hasCanonicalStats(result, normalized)) await put('results', normalized);
            return normalized;
        },
        async getAllResults() {
            const results = await getAll('results');
            const normalizedResults = results.map(normalizeCompletedResult);
            await Promise.all(normalizedResults.map((normalized, index) => (
                hasCanonicalStats(results[index], normalized) ? null : put('results', normalized)
            )));
            return normalizedResults;
        },
        putResult: (result) => put('results', normalizeCompletedResult(result)),
        async completeBook(result) {
            const database = await openDatabase();
            const transaction = database.transaction(['drafts', 'results'], 'readwrite');
            transaction.objectStore('results').put(normalizeCompletedResult(result));
            transaction.objectStore('drafts').delete(result.bookId);
            await transactionToPromise(transaction);
        }
    };
}