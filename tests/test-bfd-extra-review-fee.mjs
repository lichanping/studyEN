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
    syncBfdExtraReviewFeeRecord
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
    updatedAt: '2026-09-20T13:00:00.000Z'
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
assert(classFormal.includes('selectBfdExtraReviewFeeRecords'));
assert(classFormal.includes('extraReviewFee'));
assert(classFormal.includes('recordPlatform !== currentPlatformId'));
assert(classFormal.includes('额外抗遗忘复习明细'));

console.log('test-bfd-extra-review-fee passed');
