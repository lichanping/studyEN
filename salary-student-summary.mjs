function createEmptySalaryStat() {
    return {
        hours: 0,
        classFee: 0,
        extraReviewCount: 0,
        extraReviewFee: 0,
        fee: 0
    };
}

export function formatSalaryStudentDisplayName(studentName, hiddenStudentNames = new Set()) {
    const normalizedName = String(studentName || '').trim();
    if (!normalizedName) return '';
    return hiddenStudentNames.has(normalizedName)
        ? `${normalizedName}（已退学·当月有工资）`
        : normalizedName;
}

export function buildSalaryStudentStats({
    classRecords = [],
    extraReviewRecords = [],
    platformId,
    normalizeStudentName = (value) => String(value || '').trim()
}) {
    const studentStats = {};
    const ensureStudent = (value) => {
        const studentName = normalizeStudentName(value);
        if (!studentName) return null;
        studentStats[studentName] ||= createEmptySalaryStat();
        return studentStats[studentName];
    };

    classRecords.forEach((record) => {
        const duration = Number(record?.duration);
        const hourlyRate = Number(record?.hourlyRate);
        if (record?.platform !== platformId || !Number.isFinite(duration) || duration <= 0 || !Number.isFinite(hourlyRate)) return;

        const stat = ensureStudent(record.userName);
        if (!stat) return;
        const lessonFee = duration * hourlyRate;
        stat.hours += duration;
        stat.classFee += lessonFee;
        stat.fee += lessonFee;
    });

    extraReviewRecords.forEach((record) => {
        const feeAmount = Number(record?.feeAmount);
        if (record?.platform !== platformId || !Number.isFinite(feeAmount) || feeAmount <= 0) return;

        const stat = ensureStudent(record.studentName);
        if (!stat) return;
        stat.extraReviewCount += 1;
        stat.extraReviewFee += feeAmount;
        stat.fee += feeAmount;
    });

    return studentStats;
}