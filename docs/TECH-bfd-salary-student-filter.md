# BFD 工资 CSV 学生名单过滤技术设计

- 文档日期：2026-09-26
- 版本：v0.2（已确认）
- 关联需求：`docs/PRD-bfd-salary-student-filter.md`

## 1. 方案结论

保留现有候选学生扫描能力，改为延迟创建 `studentStats`：只有一条正课记录通过日期、平台和有效时长校验，或一条 BFD 额外复习记录通过账本校验后，才创建对应学生的汇总对象。

输出前再执行一次事件条件过滤，作为防御性保护。该方案不新增配置、不删除历史数据、不依赖当前设备的学生白名单。

## 2. 当前数据流

`generateSalaryReport()` 当前流程：

1. 获取当前平台和统计日期范围。
2. 合并当前学生、全部历史 `*_classStatistics` key、额外复习姓名为 `allStudents`。
3. 遍历 `allStudents` 时立即初始化 `studentStats[姓名]`。
4. 再按日期和 `recordPlatform` 过滤正课记录。
5. 合并额外复习费用。
6. 将全部 `studentStats` 写入文本摘要和 CSV。

问题发生在第 3 步：候选姓名被错误地当作工资输出姓名。

## 3. 设计原则

### 3.1 区分候选集合与输出集合

- `candidateStudentNames`：用于查找浏览器中可能存在的课程统计数据，可以包含历史或当前无效姓名。
- `salaryStudentStats`：只由校验通过的工资事件创建，是文本摘要和 CSV 的唯一学生来源。

候选集合大不影响输出；输出集合不读取当前名册状态。

### 3.2 延迟初始化

删除遍历候选姓名时的预初始化：

```js
studentStats[canonicalStudentName] ||= emptyStats;
```

正课聚合时，在确认记录满足以下条件后再初始化：

```text
日期在范围内
AND recordPlatform === currentPlatformId
AND duration > 0
```

额外复习聚合继续在有效账本记录进入聚合时初始化。

### 3.3 防御性输出过滤

生成 `sortedStudentStats` 前仅保留：

```text
hours > 0 OR extraReviewCount > 0
```

不使用姓名是否存在于 `hidden-students-v1` 作为工资删除条件。

### 3.4 姓名归一化

正课和额外复习在写入同一个汇总对象前，继续调用现有姓名别名归一化逻辑。不得新增另一套姓名比较规则。

## 4. 预计改动范围

### 4.1 `classFormal.js`

在 `generateSalaryReport()` 内做最小修改：

1. 候选学生扫描阶段不再初始化 `studentStats`。
2. 正课记录通过日期、平台、时长校验后，再确保汇总对象存在。
3. 额外复习仍按有效账本记录创建汇总对象。
4. 文本和 CSV 共用过滤后的 `sortedStudentStats`。

不修改工资单价、额外复习账本同步和 CSV 转义逻辑。

### 4.2 测试

优先在现有工资测试附近增加可执行行为测试。若 DOM 耦合导致无法直接调用 `generateSalaryReport()`，提取最小纯函数用于“事件生成学生汇总”，不把整个工资报告重构为新模块。

目标测试文件：

- `tests/test-class-formal-salary-platform.js` 或新增相邻的行为测试文件。
- 必要时更新 `package.json`，确保聚焦测试进入现有测试命令。

## 5. TDD 实施顺序

### Red

先加入失败测试，至少覆盖：

1. 候选名单包含 10 名学生，但只有 2 名存在当期 BFD 工资事件，输出只有 2 名。
2. 非 BFD 正课不能创建 BFD 学生汇总行。
3. 隐藏/退学学生无当期事件时不显示。
4. 隐藏/退学学生有当期有效 BFD 工资时仍显示。
5. 只有额外复习费用的学生仍显示。
6. 同名跨平台记录只汇总 BFD 部分。
7. 文本摘要与 CSV 使用同一个学生集合。

### Green

实施延迟初始化和输出防御过滤，使上述测试通过。

### Refactor

只在出现重复初始化代码时增加一个局部 helper，不改动其他报表流程。

## 6. 验证方案

自动化：

```bash
node tests/test-class-formal-salary-platform.js
npm run test:bfd-extra-review-fee
npm run test:stats-mode-and-review-deadline
npm run test:all
```

浏览器验收：

1. 外部 Chrome 打开 `index.html`。
2. 切换 BFD 平台，选择 2026-09 月。
3. 生成工资 CSV。
4. 核对正课明细、额外复习明细、学生总计和工资总计。
5. 确认学生总计只包含当月实际有工资事件的姓名。

## 7. 数据兼容与回滚

### 数据兼容

- 不改变 localStorage key 或数据结构。
- 不清理历史学生、隐藏名单、正课记录和额外复习账本。
- 旧记录继续按现有平台默认规则解析。

### 回滚

实现仅改变报表内存聚合和输出过滤。回滚代码即可恢复旧展示，不涉及数据回滚。

## 8. 风险控制

1. **漏薪风险**：不使用黑名单直接删除历史工资；只按工资事件生成输出。
2. **跨平台污染**：保持逐条 `recordPlatform === currentPlatformId` 校验。
3. **空行回归**：输出前增加事件条件过滤，防止未来代码再次预初始化零值行。
4. **跨设备差异**：当前名册不参与输出资格判断，但工资事件未同步的问题不在本需求范围内。
5. **金额回归**：复用现有聚合金额，测试必须断言修改前后有效学生的金额和总工资不变。

## 9. 已确认决策

1. 黑名单学生当月有真实 BFD 工资事件时仍显示并计薪。
2. 不建立“当前 BFD 仅两人”的静态名单。
3. 工资学生集合只由所选范围内的有效工资事件生成。