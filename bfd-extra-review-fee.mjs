export const BFD_EXTRA_REVIEW_FEE_STORAGE_KEY = 'bfd-extra-review-fee-ledger-v1';
const BFD_PLATFORM_ID = 'baifendii';
const PRICING_VERSION = 'bfd-review-v1';

export function calculateBfdExtraReviewFee(totalWords) {
    if (!Number.isInteger(totalWords) || totalWords <= 0) {
        throw new TypeError('复习词数必须是正整数');
    }
    if (totalWords < 100) {
        return { pricingTier: '1-99', feeAmount: 3 };
    }
    if (totalWords < 200) {
        return { pricingTier: '100-199', feeAmount: 5 };
    }
    return { pricingTier: '200+', feeAmount: 8 };
}

export function formatBeijingDateTimeLocal(date = new Date()) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23'
    }).formatToParts(date).reduce((result, part) => {
        result[part.type] = part.value;
        return result;
    }, {});
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

function getReviewDateBeijing(reviewTime) {
    const value = String(reviewTime || '').trim();
    const match = value.match(/^(\d{4}-\d{2}-\d{2})T\d{2}:\d{2}$/);
    if (!match) {
        throw new TypeError('复习时间必须是有效的北京时间');
    }
    return match[1];
}

function createBusinessKey(record) {
    return `${record.platform}|${record.studentName}|${record.reviewDateBeijing}`;
}

export function parseBfdExtraReviewFeeLedger(raw) {
    if (raw === null || raw === '') {
        return { ok: true, records: [], warnings: [] };
    }
    try {
        const parsed = JSON.parse(raw);
        if (parsed?.version !== 1 || !Array.isArray(parsed.records)) {
            return { ok: false, records: [], warnings: ['BFD 额外复习计费账本结构无效'] };
        }
        return { ok: true, records: parsed.records, warnings: [] };
    } catch (_) {
        return { ok: false, records: [], warnings: ['BFD 额外复习计费账本无法解析'] };
    }
}

export function syncBfdExtraReviewFeeRecord(storage, input, normalizeStudentName = (value) => String(value || '').trim()) {
    if (input?.platform !== BFD_PLATFORM_ID) {
        return { ok: false, action: 'rejected', error: '仅 BFD 平台支持额外复习计费' };
    }

    const studentName = normalizeStudentName(input.studentName);
    if (!studentName) {
        return { ok: false, action: 'rejected', error: '学员姓名不能为空' };
    }

    let reviewDateBeijing;
    try {
        reviewDateBeijing = getReviewDateBeijing(input.reviewTime);
    } catch (error) {
        return { ok: false, action: 'rejected', error: error.message };
    }

    const parsed = parseBfdExtraReviewFeeLedger(storage.getItem(BFD_EXTRA_REVIEW_FEE_STORAGE_KEY));
    if (!parsed.ok) {
        return { ok: false, action: 'rejected', error: parsed.warnings[0] };
    }

    const source = input.source || 'antiForgetting';
    if (!['antiForgetting', 'yangKaidiHistory'].includes(source)) {
        return { ok: false, action: 'rejected', error: '额外复习计费来源无效' };
    }

    const businessKey = `${BFD_PLATFORM_ID}|${studentName}|${reviewDateBeijing}`;
    const existingRecord = parsed.records.find((record) => createBusinessKey(record) === businessKey);
    const records = parsed.records.filter((record) => createBusinessKey(record) !== businessKey);
    const sources = existingRecord?.sources
        ? { ...existingRecord.sources }
        : existingRecord
            ? {
                antiForgetting: {
                    totalWords: existingRecord.totalWords,
                    reviewTime: existingRecord.reviewTime,
                    updatedAt: existingRecord.updatedAt
                }
            }
            : {};

    if (!input.charged) {
        delete sources[source];
        if (Object.keys(sources).length > 0) {
            const totalWords = Object.values(sources).reduce((sum, item) => sum + item.totalWords, 0);
            const pricing = calculateBfdExtraReviewFee(totalWords);
            const record = {
                platform: BFD_PLATFORM_ID,
                studentName,
                reviewTime: String(input.reviewTime),
                reviewDateBeijing,
                totalWords,
                pricingTier: pricing.pricingTier,
                pricingVersion: PRICING_VERSION,
                feeAmount: pricing.feeAmount,
                updatedAt: input.updatedAt || new Date().toISOString(),
                sources
            };
            records.push(record);
            storage.setItem(BFD_EXTRA_REVIEW_FEE_STORAGE_KEY, JSON.stringify({ version: 1, records }));
            return { ok: true, action: 'upserted', record };
        }
        storage.setItem(BFD_EXTRA_REVIEW_FEE_STORAGE_KEY, JSON.stringify({ version: 1, records }));
        return { ok: true, action: 'removed' };
    }

    let sourcePricing;
    try {
        sourcePricing = calculateBfdExtraReviewFee(input.totalWords);
    } catch (error) {
        return { ok: false, action: 'rejected', error: error.message };
    }
    const updatedAt = input.updatedAt || new Date().toISOString();
    sources[source] = {
        totalWords: input.totalWords,
        reviewTime: String(input.reviewTime),
        updatedAt
    };
    const totalWords = Object.values(sources).reduce((sum, item) => sum + item.totalWords, 0);
    const pricing = Object.keys(sources).length === 1 ? sourcePricing : calculateBfdExtraReviewFee(totalWords);

    const record = {
        platform: BFD_PLATFORM_ID,
        studentName,
        reviewTime: String(input.reviewTime),
        reviewDateBeijing,
        totalWords,
        pricingTier: pricing.pricingTier,
        pricingVersion: PRICING_VERSION,
        feeAmount: pricing.feeAmount,
        updatedAt,
        sources
    };
    records.push(record);
    storage.setItem(BFD_EXTRA_REVIEW_FEE_STORAGE_KEY, JSON.stringify({ version: 1, records }));
    return { ok: true, action: 'upserted', record };
}

export function syncBfdHistoryReviewResults(storage, studentName, results) {
    const dailyResults = new Map();
    for (const result of results || []) {
        const reviewDateBeijing = String(result?.reviewDateBeijing || '');
        const testedCount = Number(result?.testedCount) || 0;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(reviewDateBeijing) || testedCount <= 0) continue;
        const current = dailyResults.get(reviewDateBeijing) || { totalWords: 0, latestCompletedAt: '' };
        current.totalWords += testedCount;
        if (String(result.completedAt || '') > current.latestCompletedAt) {
            current.latestCompletedAt = String(result.completedAt || '');
        }
        dailyResults.set(reviewDateBeijing, current);
    }

    const records = [];
    for (const [reviewDateBeijing, daily] of dailyResults) {
        const completedAt = new Date(daily.latestCompletedAt);
        const hasValidCompletedAt = !Number.isNaN(completedAt.getTime());
        const syncResult = syncBfdExtraReviewFeeRecord(storage, {
            platform: BFD_PLATFORM_ID,
            studentName,
            reviewTime: hasValidCompletedAt
                ? formatBeijingDateTimeLocal(completedAt)
                : `${reviewDateBeijing}T23:59`,
            totalWords: daily.totalWords,
            charged: true,
            source: 'yangKaidiHistory',
            updatedAt: hasValidCompletedAt ? completedAt.toISOString() : `${reviewDateBeijing}T15:59:00.000Z`
        });
        if (!syncResult.ok) return syncResult;
        records.push(syncResult.record);
    }
    return { ok: true, records };
}

export function selectBfdExtraReviewFeeRecords(raw, startDateYmd, endDateYmd) {
    const parsed = parseBfdExtraReviewFeeLedger(raw);
    if (!parsed.ok) {
        return parsed;
    }

    const warnings = [];
    const latestByKey = new Map();
    parsed.records.forEach((record) => {
        if (record?.platform !== BFD_PLATFORM_ID) return;
        if (typeof record.studentName !== 'string' || !record.studentName.trim()) return;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(record.reviewDateBeijing || '')) return;
        if (record.reviewDateBeijing < startDateYmd || record.reviewDateBeijing > endDateYmd) return;
        if (record.pricingVersion !== PRICING_VERSION) {
            warnings.push(`跳过未知计费版本：${record.pricingVersion || '空'}`);
            return;
        }
        let expectedPricing;
        try {
            expectedPricing = calculateBfdExtraReviewFee(record.totalWords);
        } catch (_) {
            warnings.push(`跳过无效复习词数：${record.studentName}`);
            return;
        }
        if (record.pricingTier !== expectedPricing.pricingTier || record.feeAmount !== expectedPricing.feeAmount) {
            warnings.push(`跳过金额不匹配记录：${record.studentName}`);
            return;
        }
        const key = createBusinessKey(record);
        const existing = latestByKey.get(key);
        if (!existing || String(record.updatedAt || '') >= String(existing.updatedAt || '')) {
            latestByKey.set(key, record);
        }
    });

    return {
        ok: true,
        records: Array.from(latestByKey.values()).sort((left, right) => {
            return left.reviewTime.localeCompare(right.reviewTime) || left.studentName.localeCompare(right.studentName, 'zh-CN');
        }),
        warnings
    };
}
