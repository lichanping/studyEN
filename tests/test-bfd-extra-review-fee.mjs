import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const {
    BFD_EXTRA_REVIEW_FEE_STORAGE_KEY,
    calculateBfdExtraReviewFee,
    formatBeijingDateTimeLocal,
    parseBfdExtraReviewFeeLedger,
    selectBfdExtraReviewFeeRecords,
    syncBfdExtraReviewFeeRecord,
    syncBfdHistoryReviewResults
} = await import('../bfd-extra-review-fee.mjs');

function createStorage(initialValue = null) {
    const values = new Map();
    if (initialValue !== null) {
        values.set(BFD_EXTRA_REVIEW_FEE_STORAGE_KEY, initialValue);
    }
    return {
        getItem(key) {
            return values.has(key) ? values.get(key) : null;
        },
        setItem(key, value) {
            values.set(key, String(value));
        },
        snapshot() {
            return values.get(BFD_EXTRA_REVIEW_FEE_STORAGE_KEY) ?? null;
        }
    };
}

assert.deepEqual(calculateBfdExtraReviewFee(1), { pricingTier: '1-99', feeAmount: 3 });
assert.deepEqual(calculateBfdExtraReviewFee(99), { pricingTier: '1-99', feeAmount: 3 });
assert.deepEqual(calculateBfdExtraReviewFee(100), { pricingTier: '100-199', feeAmount: 5 });
assert.deepEqual(calculateBfdExtraReviewFee(199), { pricingTier: '100-199', feeAmount: 5 });
assert.deepEqual(calculateBfdExtraReviewFee(200), { pricingTier: '200+', feeAmount: 8 });
assert.deepEqual(calculateBfdExtraReviewFee(500), { pricingTier: '200+', feeAmount: 8 });
assert.throws(() => calculateBfdExtraReviewFee(0), /正整数/);
assert.throws(() => calculateBfdExtraReviewFee(1.5), /正整数/);
assert.throws(() => calculateBfdExtraReviewFee('99'), /正整数/);

assert.equal(
    formatBeijingDateTimeLocal(new Date('2026-09-20T16:30:00.000Z')),
    '2026-09-21T00:30',
    '默认复习时间必须按 Asia/Shanghai 生成，不能使用设备本地日期'
);

const storage = createStorage();
const normalizeStudentName = (name) => name === '硕硕' ? '俞新硕' : String(name).trim();
const firstSync = syncBfdExtraReviewFeeRecord(storage, {
    platform: 'baifendii',
    studentName: '硕硕',
    reviewTime: '2026-09-20T19:30',
    totalWords: 86,
    charged: true,
    updatedAt: '2026-09-20T12:00:00.000Z'
}, normalizeStudentName);
assert.equal(firstSync.ok, true);
assert.equal(firstSync.action, 'upserted');

const overwriteSync = syncBfdExtraReviewFeeRecord(storage, {
    platform: 'baifendii',
    studentName: '俞新硕',
    reviewTime: '2026-09-20T20:30',
    totalWords: 120,
    charged: true,
    updatedAt: '2026-09-20T13:00:00.000Z'
}, normalizeStudentName);
assert.equal(overwriteSync.ok, true);
const overwrittenLedger = parseBfdExtraReviewFeeLedger(storage.snapshot());
assert.equal(overwrittenLedger.records.length, 1, '同一标准学生同一北京时间日期只能保留最后一次');
assert.deepEqual(overwrittenLedger.records[0], {
    platform: 'baifendii',
    studentName: '俞新硕',
    reviewTime: '2026-09-20T20:30',
    reviewDateBeijing: '2026-09-20',
    totalWords: 120,
    pricingTier: '100-199',
    pricingVersion: 'bfd-review-v1',
    feeAmount: 5,
    updatedAt: '2026-09-20T13:00:00.000Z',
    sources: {
        antiForgetting: {
            totalWords: 120,
            reviewTime: '2026-09-20T20:30',
            updatedAt: '2026-09-20T13:00:00.000Z'
        }
    }
});

const removeSync = syncBfdExtraReviewFeeRecord(storage, {
    platform: 'baifendii',
    studentName: '硕硕',
    reviewTime: '2026-09-20T21:30',
    totalWords: 0,
    charged: false,
    updatedAt: '2026-09-20T14:00:00.000Z'
}, normalizeStudentName);
assert.equal(removeSync.action, 'removed');
assert.equal(parseBfdExtraReviewFeeLedger(storage.snapshot()).records.length, 0);

const combinedStorage = createStorage();
syncBfdExtraReviewFeeRecord(combinedStorage, {
    platform: 'baifendii',
    studentName: '杨开迪',
    reviewTime: '2026-09-25T18:00',
    totalWords: 86,
    charged: true,
    source: 'antiForgetting',
    updatedAt: '2026-09-25T10:00:00.000Z'
});
const combined = syncBfdExtraReviewFeeRecord(combinedStorage, {
    platform: 'baifendii',
    studentName: '杨开迪',
    reviewTime: '2026-09-25T20:00',
    totalWords: 112,
    charged: true,
    source: 'yangKaidiHistory',
    updatedAt: '2026-09-25T12:00:00.000Z'
});
assert.equal(combined.ok, true);
assert.equal(combined.record.totalWords, 198, '模式 1 和模式 2 应按同一北京时间日期合计');
assert.equal(combined.record.feeAmount, 5, '合计词数只计算一次费用档位');
assert.deepEqual(combined.record.sources, {
    antiForgetting: {
        totalWords: 86,
        reviewTime: '2026-09-25T18:00',
        updatedAt: '2026-09-25T10:00:00.000Z'
    },
    yangKaidiHistory: {
        totalWords: 112,
        reviewTime: '2026-09-25T20:00',
        updatedAt: '2026-09-25T12:00:00.000Z'
    }
});

const updatedHistory = syncBfdExtraReviewFeeRecord(combinedStorage, {
    platform: 'baifendii',
    studentName: '杨开迪',
    reviewTime: '2026-09-25T21:00',
    totalWords: 62,
    charged: true,
    source: 'yangKaidiHistory',
    updatedAt: '2026-09-25T13:00:00.000Z'
});
assert.equal(updatedHistory.record.totalWords, 148, '更新模式 2 不得覆盖模式 1');
assert.equal(updatedHistory.record.sources.antiForgetting.totalWords, 86);

const removeHistory = syncBfdExtraReviewFeeRecord(combinedStorage, {
    platform: 'baifendii',
    studentName: '杨开迪',
    reviewTime: '2026-09-25T21:30',
    totalWords: 0,
    charged: false,
    source: 'yangKaidiHistory',
    updatedAt: '2026-09-25T13:30:00.000Z'
});
assert.equal(removeHistory.action, 'upserted', '删除一个来源后仍有另一个来源时应保留日账本');
assert.equal(removeHistory.record.totalWords, 86);
assert.deepEqual(Object.keys(removeHistory.record.sources), ['antiForgetting']);

const historyBackfillStorage = createStorage();
syncBfdExtraReviewFeeRecord(historyBackfillStorage, {
    platform: 'baifendii',
    studentName: '杨开迪',
    reviewTime: '2026-09-25T18:00',
    totalWords: 20,
    charged: true,
    source: 'antiForgetting',
    updatedAt: '2026-09-25T10:00:00.000Z'
});
const historyResults = [
    { bookNumber: 1, reviewDateBeijing: '2026-09-25', testedCount: 37, completedAt: '2026-09-25T11:00:00.000Z' },
    { bookNumber: 2, reviewDateBeijing: '2026-09-25', testedCount: 33, completedAt: '2026-09-25T12:00:00.000Z' },
    { bookNumber: 3, reviewDateBeijing: '2026-09-24', testedCount: 40, completedAt: '2026-09-24T12:00:00.000Z' }
];
assert.equal(syncBfdHistoryReviewResults(historyBackfillStorage, '杨开迪', historyResults).ok, true);
assert.equal(syncBfdHistoryReviewResults(historyBackfillStorage, '杨开迪', historyResults).ok, true, '回填必须幂等');
const backfilledLedger = parseBfdExtraReviewFeeLedger(historyBackfillStorage.snapshot());
assert.equal(backfilledLedger.records.length, 2, '应按复习日期生成模式2工资记录');
const september25Record = backfilledLedger.records.find((record) => record.reviewDateBeijing === '2026-09-25');
assert.equal(september25Record.totalWords, 90, '应保留模式1并合计同日两册模式2词数');
assert.equal(september25Record.sources.antiForgetting.totalWords, 20, '不得覆盖模式1来源');
assert.equal(september25Record.sources.yangKaidiHistory.totalWords, 70, '模式2应按日期汇总完成册');
assert.equal(september25Record.sources.yangKaidiHistory.reviewTime, '2026-09-25T20:00', '应使用当日最后完成时间');

const legacyStorage = createStorage(JSON.stringify({
    version: 1,
    records: [{
        platform: 'baifendii',
        studentName: '杨开迪',
        reviewTime: '2026-09-26T18:00',
        reviewDateBeijing: '2026-09-26',
        totalWords: 90,
        pricingTier: '1-99',
        pricingVersion: 'bfd-review-v1',
        feeAmount: 3,
        updatedAt: '2026-09-26T10:00:00.000Z'
    }]
}));
const migratedLegacy = syncBfdExtraReviewFeeRecord(legacyStorage, {
    platform: 'baifendii',
    studentName: '杨开迪',
    reviewTime: '2026-09-26T20:00',
    totalWords: 50,
    charged: true,
    source: 'yangKaidiHistory',
    updatedAt: '2026-09-26T12:00:00.000Z'
});
assert.equal(migratedLegacy.record.totalWords, 140);
assert.equal(migratedLegacy.record.sources.antiForgetting.totalWords, 90);
assert.equal(migratedLegacy.record.sources.yangKaidiHistory.totalWords, 50);

const nonBfdStorage = createStorage();
const nonBfdSync = syncBfdExtraReviewFeeRecord(nonBfdStorage, {
    platform: 'lixiaolaila',
    studentName: '俞新硕',
    reviewTime: '2026-09-20T19:30',
    totalWords: 86,
    charged: true
}, normalizeStudentName);
assert.equal(nonBfdSync.ok, false);
assert.equal(nonBfdStorage.snapshot(), null, '非 BFD 平台不得写入计费账本');

const corruptStorage = createStorage('{bad json');
const corruptSnapshot = corruptStorage.snapshot();
const corruptSync = syncBfdExtraReviewFeeRecord(corruptStorage, {
    platform: 'baifendii',
    studentName: '俞新硕',
    reviewTime: '2026-09-20T19:30',
    totalWords: 86,
    charged: true
}, normalizeStudentName);
assert.equal(corruptSync.ok, false);
assert.equal(corruptStorage.snapshot(), corruptSnapshot, '损坏账本不得被覆盖');

const rangeLedger = JSON.stringify({
    version: 1,
    records: [
        { platform: 'baifendii', studentName: '甲', reviewTime: '2026-08-31T19:30', reviewDateBeijing: '2026-08-31', totalWords: 99, pricingTier: '1-99', pricingVersion: 'bfd-review-v1', feeAmount: 3, updatedAt: '2026-08-31T12:00:00.000Z' },
        { platform: 'baifendii', studentName: '乙', reviewTime: '2026-09-01T19:30', reviewDateBeijing: '2026-09-01', totalWords: 100, pricingTier: '100-199', pricingVersion: 'bfd-review-v1', feeAmount: 5, updatedAt: '2026-09-01T12:00:00.000Z' },
        { platform: 'baifendii', studentName: '丙', reviewTime: '2026-09-20T19:30', reviewDateBeijing: '2026-09-20', totalWords: 200, pricingTier: '200+', pricingVersion: 'bfd-review-v1', feeAmount: 8, updatedAt: '2026-09-20T12:00:00.000Z' },
        { platform: 'lixiaolaila', studentName: '甲', reviewTime: '2026-09-20T19:30', reviewDateBeijing: '2026-09-20', totalWords: 200, pricingTier: '200+', pricingVersion: 'bfd-review-v1', feeAmount: 8, updatedAt: '2026-09-20T12:00:00.000Z' },
        { platform: 'baifendii', studentName: '坏金额', reviewTime: '2026-09-20T19:30', reviewDateBeijing: '2026-09-20', totalWords: 99, pricingTier: '1-99', pricingVersion: 'bfd-review-v1', feeAmount: 8, updatedAt: '2026-09-20T12:00:00.000Z' }
    ]
});
const selected = selectBfdExtraReviewFeeRecords(rangeLedger, '2026-09-01', '2026-09-30');
assert.deepEqual(selected.records.map((record) => record.studentName), ['乙', '丙']);
assert.equal(selected.warnings.length, 1, '金额不匹配记录应跳过并告警');

const antiForgettingHtml = fs.readFileSync(path.join(root, 'anti-forgetting.html'), 'utf8');
const commonFunctions = fs.readFileSync(path.join(root, 'commonFunctions.js'), 'utf8');
const classFormal = fs.readFileSync(path.join(root, 'classFormal.js'), 'utf8');
assert(antiForgettingHtml.includes('本次 BFD 抗遗忘复习需要额外计费'));
assert(antiForgettingHtml.includes('bfdExtraReviewFeeContainer'));
assert(
    antiForgettingHtml.includes('[hidden]') && antiForgettingHtml.includes('display: none !important'),
    'BFD 计费控件的 hidden 属性不能被 .row 的 display 样式覆盖'
);
assert(
    antiForgettingHtml.lastIndexOf("import { formatBeijingDateTimeLocal } from './bfd-extra-review-fee.mjs';")
        > antiForgettingHtml.lastIndexOf('<script type="module">'),
    '北京时间 helper 必须导入到调用 setDefaultReviewTime 的页面主模块'
);
assert(commonFunctions.includes('calculateAntiForgettingReviewWords'));
assert(commonFunctions.includes('syncBfdExtraReviewFeeRecord'));
assert(
    commonFunctions.includes('当日合计 ${result.record.totalWords} 词，${result.record.feeAmount} 元'),
    '模式 1 toast 应展示模式 1 + 模式 2 的当日合计词数和工资'
);
assert(classFormal.includes('selectBfdExtraReviewFeeRecords'));
assert(classFormal.includes('createYangKaidiWordReviewRepository'));
assert(classFormal.includes("syncBfdHistoryReviewResults(localStorage, '杨开迪', historyResults)"));
assert(classFormal.includes('extraReviewFee'));
assert(classFormal.includes('recordPlatform !== currentPlatformId'));
assert(classFormal.includes('额外抗遗忘复习明细'));

console.log('test-bfd-extra-review-fee passed');
