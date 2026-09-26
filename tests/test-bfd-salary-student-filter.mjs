import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import * as salaryStudentSummary from '../salary-student-summary.mjs';

const { buildSalaryStudentStats, formatSalaryStudentDisplayName } = salaryStudentSummary;

const normalizeStudentName = (name) => name === '开迪' ? '杨开迪' : String(name).trim();
const classRecords = [
    { userName: '张舒睿', duration: 2, hourlyRate: 48, platform: 'baifendii' },
    { userName: '已退学但有工资', duration: 1, hourlyRate: 48, platform: 'baifendii' },
    { userName: '非 BFD 学生', duration: 1, hourlyRate: 50, platform: 'lixiaolaila' },
    { userName: '零课时学生', duration: 0, hourlyRate: 48, platform: 'baifendii' }
];
const extraReviewRecords = [
    { studentName: '开迪', feeAmount: 5, platform: 'baifendii' },
    { studentName: '其他平台复习', feeAmount: 8, platform: 'lixiaolaila' }
];

const stats = buildSalaryStudentStats({
    classRecords,
    extraReviewRecords,
    platformId: 'baifendii',
    normalizeStudentName
});

assert.deepEqual(Object.keys(stats).sort(), ['已退学但有工资', '张舒睿', '杨开迪']);
assert.deepEqual(stats['张舒睿'], {
    hours: 2,
    classFee: 96,
    extraReviewCount: 0,
    extraReviewFee: 0,
    fee: 96
});
assert.deepEqual(stats['已退学但有工资'], {
    hours: 1,
    classFee: 48,
    extraReviewCount: 0,
    extraReviewFee: 0,
    fee: 48
});
assert.deepEqual(stats['杨开迪'], {
    hours: 0,
    classFee: 0,
    extraReviewCount: 1,
    extraReviewFee: 5,
    fee: 5
});
assert.equal(stats['非 BFD 学生'], undefined);
assert.equal(stats['零课时学生'], undefined);
assert.equal(stats['无工资黑名单学生'], undefined);
assert.equal(stats['其他平台复习'], undefined);

assert.equal(typeof formatSalaryStudentDisplayName, 'function', '应提供黑名单工资姓名展示函数');
assert.equal(
    formatSalaryStudentDisplayName('已退学但有工资', new Set(['已退学但有工资'])),
    '已退学但有工资（已退学·当月有工资）'
);
assert.equal(formatSalaryStudentDisplayName('张舒睿', new Set(['已退学但有工资'])), '张舒睿');

const classFormalSource = fs.readFileSync(path.join(import.meta.dirname, '..', 'classFormal.js'), 'utf8');
assert(classFormalSource.includes('loadHiddenStudents'), '工资报表应读取黑名单');
assert(classFormalSource.includes('formatSalaryStudentDisplayName'), '工资报表应使用黑名单工资姓名展示函数');

console.log('test-bfd-salary-student-filter passed');