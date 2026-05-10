# PRD + Tech: 按实际上课记录生成工资统计

## 1. 背景与问题

现状“按排课生成工资统计”基于排课计划推导，周排课会变化，导致工资统计不准确。

目标改为：基于实际上课记录（completed training records）计算工资，确保工资统计与真实上课一致。

## 2. 业务规则

- 数据来源：已完成上课记录（status=COMPLETED）。
- 统计范围：仅统计选定周期内，且不晚于今天前一天的记录。
- 计费规则：
  - 词汇课：50 元/小时
  - 阅读完型语法课：55 元/小时
  - 体验课：40 元/小时
  - 半小时课程：按小时费率折半（例如 0.5 小时）
- 去重规则：同一 sourceId（id/orderId/scheduleId）只计一次，避免分页重复。
- 课程归类：
  - 课程名包含“体验” => 体验课
  - 课程名包含“阅读/完型/语法” => 阅读完型语法课
  - 其他 => 词汇课

## 3. 交互变化

- 将按钮文案由“按排课生成工资统计”改为“按实际上课生成工资统计”。
- 点击后拉取 completed API 分页数据，按选定月份/年份生成 CSV。

## 4. 技术方案

### 4.1 计算模块

在 schedule-course-match.js 增加纯函数：

- inferSalaryTypeFromCourse(courseText)
- normalizeCompletedRecordForSalary(record)
- buildSalaryRowsFromCompletedRecords(records, { startDate, endDate })

以上函数可直接单测，避免在 schedule.html 中写不可测的大逻辑。

### 4.2 页面接入

schedule.html 中“生成工资”按钮逻辑改为：

1. 解析统计周期（月份或年份）
2. 拉取 completed records（分页，直到末页）
3. 调用 buildSalaryRowsFromCompletedRecords 得到工资行
4. 复用现有 CSV 汇总与下载逻辑

## 5. TDD 计划

- Red：在 tests/test-schedule-course-match.js 增加 3 组失败测试
  - 课型识别
  - completed 记录归一化
  - 周期过滤+去重+金额计算
- Green：实现上述函数并让测试通过
- Refactor：页面按钮切换到新数据源后，补充回归测试并手工验证导出结果

## 6. 验收标准

- 导出工资基于 completed API，不再基于排课计划。
- 半小时课程费用正确折半。
- 体验/阅读/词汇课费率正确。
- 分页重复记录不重复计费。
- 选择月份/年份导出结果与统计周期一致。
