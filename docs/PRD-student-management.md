# 排课学生管理联动（MVP）- PRD + Smoke + 测试报告（合并版）

> 文档日期：2026-04-09  
> 本文已合并原 `PRD-student-management.md`、`smoke-case-schedule-mvp-20260409.md`、`test-report-student-sync-20260409.md`

## 1. 背景与目标

### 1.1 背景

系统已上线 `schedule-students-manage.html` 用于排课条目维护，但历史上各页面学生来源分散，带来三类问题：

- 排课管理新增/修改学生后，其他页面下拉不一定即时可选。
- 体验课页静态名单较长，新加入学生可能置底，选择成本高。
- 抗遗忘页对“临时加课”来源覆盖不完整。

### 1.2 本期目标（MVP）

- 排课管理新增/修改学生后，可在 `index.html`、`class-read.html`、`class-trial.html`、`anti-forgetting.html` 选择。
- 体验课新维护学生优先显示在顶部区域。
- 删除排课条目后保留学生名可选（不影响历史反馈/工资核对）。
- 抗遗忘页支持“临时加课”学生可选。

### 1.3 非目标（本期不做）

- 不引入后端存储。
- 不移除所有历史静态名单。
- 不做“删除学生即全局彻底移除姓名”。

## 2. 当前实现口径

### 2.1 关键存储键

- `schedule-config-override-v1`：排课管理覆盖配置。
- `custom-students-v1`：长期保留学生名册（保存时 move-to-front）。
- `schedule-extra-entries-v1`：临时加课条目。
- `*_classStatistics`：历史课堂统计数据（兜底来源）。

### 2.2 各页面学生下拉来源

| 页面 | 学生来源（高 -> 低） |
|---|---|
| `index.html` (`classFormal.js`) | `teacherData` + `schedule-config-override-v1` + `custom-students-v1` |
| `class-read.html` (`classRead.js`) | `teacherData` + `schedule-config-override-v1` + `custom-students-v1` |
| `class-trial.html` (`classTrial.js`) | `custom-students-v1` + `schedule-config-override-v1` + 静态 `<option>` |
| `anti-forgetting.html` | `schedule-config-override-v1` + `custom-students-v1` + `schedule-extra-entries-v1` + `schedule.html` + `*_classStatistics` |

### 2.3 行为规则

- 管理页保存条目时，通过 `ensureStudentRetained(name)` 写入 `custom-students-v1`。
- 管理页“删条目/删该生全部”只改排课 `entries`，不清理长期名册。
- 体验课页重建下拉时，优先渲染“新维护学生”列表，再补静态历史名单。
- `schedule.html` 的“查看课时数”改为 `getConfig()` 读取（覆盖优先）。
- 工资统计账本口径仍是 `schedule-salary-ledger-v1`，补录才写入。

## 3. 验收标准

- AC-01：新增学生后，四个页面下拉均可选择该学生。
- AC-02：删除该学生排课条目后，四个页面仍可选择该学生。
- AC-03：体验课页新维护学生位于顶部区域，减少滚动查找。
- AC-04：仅通过“临时加课”出现的学生可在抗遗忘页选择。
- AC-05：查看课时数与排课管理配置保持一致。

## 4. Smoke Cases（2026-04-09）

| Case | 场景 | 预期 | 结果 |
|---|---|---|---|
| A | 正式课学生源联动 | `classFormal.js` 下拉/工资统计都走合并名单 | 通过 |
| B | 阅读课学生源联动 | `classRead.js` 合并 override + custom | 通过 |
| C | 体验课置顶 | `classTrial.js` 优先学生先渲染 | 通过 |
| D | 抗遗忘临时加课来源 | `anti-forgetting.html` 读取 `schedule-extra-entries-v1` | 通过 |
| E | 删除保留语义 | 管理页删除不清理 `custom-students-v1` | 通过 |
| F | 查看课时数联动 | `schedule.html` `runScheduleQuotaCheck()` 使用 `getConfig()` | 通过 |
| G | 工资账本口径 | 仍按 `schedule-salary-ledger-v1`，补录写入 | 通过 |

执行汇总：7/7 通过，0 失败，0 阻塞。

## 5. 测试报告（2026-04-09）

### 5.1 测试范围

1. 学生来源跨页联动（正式课/阅读课/体验课/抗遗忘）。
2. 体验课新维护学生置顶易用性。
3. 关键统计口径不回归（查看课时数、工资账本）。

### 5.2 测试方法

- 代码路径冒烟（关键函数、关键 key、调用链）。
- IDE 错误检查（`get_errors`）。
- 口径一致性核对（实现与文档一致）。

> 本轮未执行浏览器自动化脚本；结论基于静态路径验证与错误检查。

### 5.3 测试用例结果

| 用例ID | 场景 | 预期 | 结果 |
|---|---|---|---|
| TS-01 | 正式课学生下拉 | 合并 `teacherData + schedule-config-override-v1 + custom-students-v1` | 通过 |
| TS-02 | 阅读课学生下拉 | 合并 `teacherData + schedule-config-override-v1 + custom-students-v1` | 通过 |
| TS-03 | 体验课学生下拉 | 新维护学生优先渲染在顶部区域 | 通过 |
| TS-04 | 抗遗忘学生下拉 | 覆盖配置 + 长期名册 + 临时加课 + 历史统计兜底 | 通过 |
| TS-05 | 删除语义 | 删除条目后保留学生名可选 | 通过 |
| TS-06 | 查看课时数联动 | 使用 `getConfig()` 读取覆盖配置 | 通过 |
| TS-07 | 工资统计口径 | 独立账本 `schedule-salary-ledger-v1`，补录写入 | 通过 |

### 5.4 关键证据（文件/符号）

- `classFormal.js`：`getMergedStudentNames`、`updateUserNameOptions`、`generateSalaryReport`、`viewTotalHoursClick`
- `classRead.js`：`loadScheduleOverrideStudents`、`loadCustomStudents`、`updateUserNameOptions2`
- `classTrial.js`：`updateTrialUserOptions`
- `anti-forgetting.html`：`loadStudentOptions`（含 `schedule-extra-entries-v1`）
- `schedule-students-manage.js`：`ensureStudentRetained`、`删该生全部(保留学生名)`
- `schedule.html`：`runScheduleQuotaCheck` -> `getConfig()`

### 5.5 结论与发布建议

- 结论：本次联动改动达到预期，可用。
- 建议：进入下一轮人工 UI 回归（移动端下拉体验为重点）。

## 6. 风险与后续

- 当前是“多源合并”而非单一主表；同名冲突场景仍依赖去重规则。
- 体验课仍保留静态历史名单，列表可能偏长；本期已通过置顶策略改善首屏可用性。
- 后续可评估统一 `student-roster-v1`，集中管理来源、状态、更新时间。


