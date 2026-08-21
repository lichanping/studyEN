# PRD：抗遗忘复习计划核对功能（完整版）

> 日期：2026-05-07（初版）/ 2026-05-08（更新）
> 状态：已实施
> 优先级：高
> 页面：anti-forgetting.html

---

## 目录

1. [背景与问题](#1-背景与问题)
2. [目标](#2-目标)
3. [核心规则](#3-核心规则)
4. [功能需求](#4-功能需求)
5. [技术方案](#5-技术方案)
6. [学生列表数据来源](#6-学生列表数据来源)
7. [非功能需求](#7-非功能需求)
8. [实施计划](#8-实施计划)
9. [验收标准](#9-验收标准)
10. [风险与缓解](#10-风险与缓解)
11. [附录：复习节点计算示例](#11-附录复习节点计算示例)
12. [2026-08-21 增补：抗遗忘反馈提交前日期确认](#15-2026-08-21-增补抗遗忘反馈提交前日期确认)

---

## 1. 背景与问题

### 1.1 业务背景

抗遗忘复习系统基于艾宾浩斯遗忘曲线，在正课日期 D 后设置 10 个复习节点：D+1, D+2, D+3, D+5, D+7, D+9, D+12, D+14, D+17, D+21。

### 1.2 当前问题

| 问题 | 影响 |
|------|------|
| 排班逻辑错误 | 漏排 + 多排，复习任务与规则不符 |
| 数据源局限 | 仅依赖 localStorage，历史数据可能丢失 |
| 无法回溯 | 无法获取服务端已完成训练记录 |
| 昵称映射缺失 | 学员"硕硕"无法正确核对 |

### 1.3 复现案例

**用户：于熠凡**
**核对日期：2026-05-06 ~ 2026-05-07**

| 正课日期 | 应排复习日期（>= 5.6） | 实排复习日期 | 问题 |
|----------|----------------------|-------------|------|
| 2026-04-22 | 5.6(+14), 5.9(+17), 5.13(+21) | 5.6, 5.4 | 5.4 多排 |
| 2026-05-03 | 5.6(+3), 5.8(+5)... | 5.6, 5.4 | 5.4 多排 |
| 2026-05-04 | 5.6(+2), 5.7(+3)... | 5.6, 5.7 | ✅ 正确 |

---

## 2. 目标

1. **修复排班逻辑**：基于服务端已完成训练记录，正确计算复习计划
2. **提供核对功能**：在抗遗忘页面内集成复习计划核对功能
3. **支持导出**：导出 CSV/Excel 格式用于线下核对
4. **昵称映射**：修复"硕硕"等昵称学员无法正确核对的问题
5. **今日无复习**：新增"今日无复习"按钮，输出指定日期无复习的学员名单

---

## 3. 核心规则

### 3.1 复习节点规则

正课次日为第 1 天，复习节点为：

| 节点序号 | 偏移天数 | 说明 |
|----------|---------|------|
| 1 | +1 | 正课次日 |
| 2 | +2 | 第 2 天 |
| 3 | +3 | 第 3 天 |
| 4 | +6 | 第 6 天 |
| 5 | +9 | 第 9 天 |
| 6 | +12 | 第 12 天 |
| 7 | +15 | 第 15 天 |
| 8 | +17 | 第 17 天 |
| 9 | +19 | 第 19 天 |
| 10 | +21 | 第 21 天 |

### 3.2 昵称映射规则

| 习惯名 | 标准名 |
|--------|--------|
| 硕硕 | 俞新硕 |

---

## 4. 功能需求

### 4.1 复习计划核对功能

#### 4.1.1 入口

在 `anti-forgetting.html` 顶部控制区新增按钮：

```html
<button id="checkReviewScheduleBtn">📋 核对复习计划</button>
```

#### 4.1.2 核对结果展示区

```html
<div id="reviewScheduleCheckPanel" style="margin-top:12px;">
    <button id="reviewScheduleCollapseToggle" class="collapse-toggle-btn">📊 复习计划核对结果（点击展开）</button>
    <div id="reviewScheduleCollapseBody" style="display:none;">
        <div id="reviewScheduleSummary"></div>
        <div id="reviewScheduleDiff"></div>
        <div class="actions">
            <button id="exportReviewScheduleCSV">📥 导出CSV</button>
            <button id="closeReviewPanel">收起</button>
        </div>
    </div>
</div>
```

#### 4.1.3 摘要展示

| 指标 | 样式 |
|------|------|
| ✅ 正常数量 | 绿色 |
| ❌ 漏排数量 | 红色 |
| ⚠️ 多排数量 | 黄色 |
| 🎉 完全正确提示 | 绿色大提示 |

#### 4.1.4 差异详情表格

**漏排表格**：

| 列名 | 说明 |
|------|------|
| 复习日期 | 应复习的日期 |
| 应排来源 | 来自哪天的正课训练 |
| 复习节点 | 正课后第几天 |
| 状态 | 漏排 |

**多排表格**：

| 列名 | 说明 |
|------|------|
| 复习日期 | 实际复习的日期 |
| 来源 | 来自哪天的正课训练 |
| 复习节点 | ? |
| 状态 | 多排 |

### 4.2 今日无复习功能

#### 4.2.1 入口

在顶部学员/复习时间区域新增按钮：

```html
<button id="noReviewTodayButton">今日无复习</button>
```

#### 4.2.2 点击行为

1. 读取页面当前"复习时间"的日期部分
2. 获取当前页面可选学员列表
3. 逐个学员检查当天是否存在实际抗遗忘复习记录
4. 汇总"当天无抗遗忘复习"的学员名单
5. 在页面展示结果

#### 4.2.3 输出内容

- 查询日期
- 无抗遗忘复习学员数量
- 学员名单（顿号分隔，便于人工复制）
- 若名单为空：展示"当天所有学员均有抗遗忘复习"

### 4.3 核对公式说明

在核对按钮旁添加帮助图标按钮：

```html
<button id="reviewScheduleHintToggle" class="hint-icon-btn">?</button>
<div id="reviewScheduleHintPanel" class="hint" style="display:none;">
    复习公式：复习日期 = 正课日期 + 1/2/3/6/9/12/15/17/19/21 天。<br>
    例如正课是 2026-04-17，则对应复习日依次为 2026-04-18、04-19、04-20、04-23、04-26、04-29、05-02、05-04、05-06、05-08。
</div>
```

---

## 5. 技术方案

### 5.1 获取已完成训练记录

**API 调用**：

```
POST /.netlify/functions/schedule-board?mode=completed&pageNumber=1&pageSize=500
```

**请求体**：

```json
{
  "token": "{token}",
  "userId": "{userId}",
  "xUa": "ct=2&v=5.0.96"
}
```

**响应处理**：

- 解析 `data.data.data` 数组
- 分页获取所有记录
- 仅保留 `today-21` 及之后的训练记录

### 5.2 复习计划计算

```javascript
const REVIEW_OFFSETS = [1, 2, 3, 6, 9, 12, 15, 17, 19, 21];

function calculateReviewSchedule(trainingRecords, targetStudent) {
    const reviewSchedule = new Map();
    const targetCanonicalName = normalizeStudentName(targetStudent);
    
    trainingRecords.forEach(record => {
        const studentName = (record.userName || record.studentName || '').trim();
        if (normalizeStudentName(studentName) !== targetCanonicalName) return;
        
        const trainingDate = extractTrainingDateFromRecord(record);
        if (!trainingDate) return;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        REVIEW_OFFSETS.forEach(offset => {
            const reviewDate = addDays(trainingDate, offset);
            if (reviewDate < today) return;
            
            const reviewDateStr = formatDate(reviewDate);
            const reviewItem = {
                trainingDate: formatDate(trainingDate),
                reviewDate: reviewDateStr,
                offset: offset,
                student: targetStudent,
                courseType: record.courseName || '词汇课'
            };
            
            if (!reviewSchedule.has(reviewDateStr)) {
                reviewSchedule.set(reviewDateStr, []);
            }
            reviewSchedule.get(reviewDateStr).push(reviewItem);
        });
    });
    
    return reviewSchedule;
}
```

### 5.3 获取实际复习列表

**API 调用**：

```
POST /.netlify/functions/schedule-board
```

**请求体**：

```json
{
  "token": "{token}",
  "userId": "{userId}",
  "xUa": "ct=2&v=5.0.96",
  "mode": "anti-forgetting-list",
  "studentName": "俞新硕",
  "startDate": "2026-05-08",
  "endDate": "2026-05-08"
}
```

### 5.4 对比差异

```javascript
function compareSchedules(expectedSchedule, actualList) {
    const diff = { normal: [], missing: [], extra: [], summary: { normal: 0, missing: 0, extra: 0 } };
    
    // 构建实际复习 Map
    const actualMap = new Map();
    actualList.forEach(item => {
        const reviewDate = formatDate(parseDate(item.reviewDate || item.date));
        if (!actualMap.has(reviewDate)) actualMap.set(reviewDate, []);
        actualMap.get(reviewDate).push(item);
    });
    
    const processedReviewDates = new Set();
    
    // 遍历预期计划
    expectedSchedule.forEach((items, reviewDate) => {
        processedReviewDates.add(reviewDate);
        const actualItems = actualMap.get(reviewDate) || [];
        
        // 去重比较：以 trainingDate 为粒度
        const expectedByTrainingDate = new Map();
        items.forEach(item => {
            const key = String(item?.trainingDate || '').trim();
            if (key && !expectedByTrainingDate.has(key)) expectedByTrainingDate.set(key, item);
        });
        
        const actualByTrainingDate = new Map();
        actualItems.forEach(item => {
            const key = formatDate(parseDate(item.trainingDate || item.sourceDate));
            if (key && !actualByTrainingDate.has(key)) actualByTrainingDate.set(key, item);
        });
        
        expectedByTrainingDate.forEach((expected, trainingDate) => {
            if (actualByTrainingDate.has(trainingDate)) {
                diff.normal.push({ ...expected, status: 'normal' });
                diff.summary.normal++;
            } else {
                diff.missing.push({ ...expected, status: 'missing' });
                diff.summary.missing++;
            }
        });
        
        actualByTrainingDate.forEach((actual, trainingDate) => {
            if (!expectedByTrainingDate.has(trainingDate)) {
                diff.extra.push({ ...actual, reviewDate, status: 'extra', expectedOffsets: [] });
                diff.summary.extra++;
            }
        });
    });
    
    // 处理实际存在但预期不存在的日期
    actualMap.forEach((items, reviewDate) => {
        if (processedReviewDates.has(reviewDate)) return;
        items.forEach(actual => {
            diff.extra.push({ ...actual, reviewDate, status: 'extra', expectedOffsets: [] });
            diff.summary.extra++;
        });
    });
    
    return diff;
}
```

### 5.5 昵称映射实现

**共享文件**：`student-name-alias.js`

**统一调用**：

```javascript
import { StudentNameAlias } from './student-name-alias.js';

function normalizeStudentName(value) {
    return StudentNameAlias.normalizeStudentName(value);
}
```

**映射应用点**：

1. 核对应排复习计划时的学员名匹配
2. 获取实际抗遗忘列表时的学员名过滤
3. 统计"今日无复习"名单时的学员去重与匹配

### 5.6 学生列表数据来源

| 数据来源 | 存储键/方式 | 说明 |
|---------|------------|------|
| teacherData 硬编码数据 | localStorage `teacherData_liTeacher_users` | 李教练/施教练的学生列表 |
| localStorage 自定义学生 | `custom-students-v1` | 用户自定义添加的学生 |
| 排课配置学生 | `schedule-config-override-v1` | 排课管理覆盖配置 |
| 临时加课学生 | `schedule-extra-entries-v1` | 临时加课条目 |
| classStatistics 键 | `*_classStatistics` | 有上课记录的学生 |
| schedule.html 远程配置 | fetch `./schedule.html` | 远程排课配置 |

---

## 6. 学生列表数据来源

### 6.1 现有学生列表

`anti-forgetting.html` 页面已有学生列表，数据来源：

1. **排课配置学生**：`schedule-config-override-v1`（localStorage）
2. **自定义学生**：`custom-students-v1`（localStorage）
3. **临时加课学生**：`schedule-extra-entries-v1`（localStorage）
4. **排课总览配置**：`schedule.html` 中的 `schedule-config`
5. **有上课记录的学生**：localStorage 中以 `_classStatistics` 结尾的 key

---

## 7. 非功能需求

### 7.1 兼容性

- 不改变现有学员下拉逻辑
- 不改变现有核对按钮行为
- 不改变现有 CSV 结构

### 7.2 性能

- 采用现有前端查询方式即可
- 当前学生规模较小，允许逐个学员查询

### 7.3 数据安全

- Token 不持久化
- 本地缓存加密（可选）

---

## 8. 实施计划

### 阶段一：在 anti-forgetting.html 新增功能

- [x] 新增"核对复习计划"按钮
- [x] 新增核对结果面板（可折叠）
- [x] 独立获取学生列表
- [x] 实现核心核对逻辑
- [x] 硕硕姓名映射处理
- [x] 回归测试

### 阶段二：API 验证与实现

- [x] 验证 `/customer/training/orders` API 响应字段名
- [x] 确认分页策略
- [x] 实现训练记录获取逻辑

### 阶段三：测试验证

- [x] 用例：于熠凡 2026-05-06 ~ 2026-05-07
- [x] 验证：应排 vs 实排
- [x] 回归测试

### 阶段四：新增功能

- [x] 昵称映射修复
- [x] 今日无复习按钮
- [x] 核对公式说明面板

---

## 9. 验收标准

| 编号 | 标准 | 验证方式 |
|------|------|---------|
| AC-1 | 在 anti-forgetting.html 页面内展示核对结果 | 界面核对 |
| AC-2 | 于熠凡 5.6 应排：4.22(+14), 5.3(+3), 5.4(+2) | 界面核对 |
| AC-3 | 于熠凡 5.7 应排：4.25(+12), 5.4(+3) | 界面核对 |
| AC-4 | 核对结果展示准确 | 界面核对 |
| AC-5 | 学生列表不为空 | 界面核对 |
| AC-6 | 硕硕昵称正确映射到俞新硕 | 界面核对 |
| AC-7 | 今日无复习按钮正常工作 | 界面核对 |

---

## 10. 风险与缓解

| 风险 | 等级 | 缓解 |
|------|------|------|
| API 响应结构不符 | 高 | 阶段一先验证 |
| 历史数据缺失 | 中 | 明确保留策略 |
| 分页限制 | 中 | 实现分页获取 |
| 学生列表为空 | 中 | 多数据源补充 |

---

## 11. 附录：复习节点计算示例

**正课日期：2026-04-22**

| 节点 | 偏移 | 复习日期 |
|------|------|---------|
| 1 | +1 | 2026-04-23 |
| 2 | +2 | 2026-04-24 |
| 3 | +3 | 2026-04-25 |
| 4 | +5 | 2026-04-27 |
| 5 | +7 | 2026-04-29 |
| 6 | +9 | 2026-05-01 |
| 7 | +12 | 2026-05-04 |
| 8 | +14 | 2026-05-06 |
| 9 | +17 | 2026-05-09 |
| 10 | +21 | 2026-05-13 |

---

## 12. 测试报告

详见：`docs/测试报告-抗遗忘复习计划核对.md`

## 13. 验收指南

详见：`docs/验收指南-抗遗忘复习计划核对.md`

---

## 14. 2026-08-08 增补：按平台区分复习公式与 BFD 本地推算

### 14.1 背景

当前 `anti-forgetting.html` 已具备 LXLL 场景下的复习计划核对能力，但仍存在两个限制：

1. 页面上的复习公式说明只展示 1 套 offsets。
2. 复习词数输入框数量没有和“当天按计划应复习几次”建立直接联动。

对于 BFD，真实网站当前不可访问，因此无法像 LXLL 一样依赖服务端“实际复习列表”做自动对比；但老师仍需要知道：

1. 今天应该复习哪些来源正课的 `+N` 天任务。
2. 因此页面上方应该出现多少个“复习词数”输入框。

### 14.2 已确认的平台公式

| 平台 | offsets |
|------|---------|
| LXLL | `1/2/3/6/9/12/15/17/19/21` |
| BFD | `1/2/3/5/7/9/12/14/17/21` |

本次以此为正式标准。

### 14.3 目标

1. **确保 LXLL 原有逻辑不受影响**。
2. **BFD 使用独立 offsets**：`1/2/3/5/7/9/12/14/17/21`。
3. **问号说明按平台切换**：LXLL 与 BFD 各自展示自己的公式。
4. **BFD 核对来源改为本地正课记录**：只依据 index 页提交后写入的正课记录推算当天应复习来源。
5. **BFD 输入框数量动态生成**：按当天应复习来源条数显示应有的复习词数格子，不再受“最多 7 个”的旧上限限制。

### 14.4 平台差异化规则

| 平台 | 预期来源 | 实际来源 | 核对模式 | 输入框数量 |
|------|----------|----------|----------|------------|
| LXLL | 服务端已完成训练记录 | 服务端抗遗忘列表 | 自动对比正常 / 漏排 / 多排 | 保持当前逻辑 |
| BFD | index 页已提交并落盘的正课记录 | 无自动拉取 | 仅展示“今天应复习哪些来源的 +N 天任务” | 按来源条数动态生成 |

### 14.5 BFD 数据来源定义

#### 14.5.1 数据源

读取 index 页正式课提交后写入 localStorage 的 `${userName}_classStatistics`。

#### 14.5.2 筛选规则

1. 仅匹配当前学员。
2. 仅匹配 `platform === "baifendii"` 的记录。
3. 仅匹配 `type === "词汇课"` 的记录。
4. 以记录日期作为正课来源日期。
5. 用 BFD offsets `1/2/3/5/7/9/12/14/17/21` 推算应复习日期。
6. 只保留“复习日期 = 当前页面选中的复习日期”的来源项。

#### 14.5.3 输出结果

输出为“当天应复习来源清单”，每条至少包含：

- `reviewDate`
- `trainingDate`
- `offset`
- `courseType`

示例：

```json
[
    { "reviewDate": "2026-08-08", "trainingDate": "2026-08-07", "offset": 1, "courseType": "词汇课" },
    { "reviewDate": "2026-08-08", "trainingDate": "2026-08-03", "offset": 5, "courseType": "词汇课" },
    { "reviewDate": "2026-08-08", "trainingDate": "2026-07-25", "offset": 14, "courseType": "词汇课" }
]
```

### 14.6 问号说明文案切换

点击 `?` 展开后的公式说明必须跟随当前平台切换：

1. 当平台为 LXLL 时，展示：`复习日期 = 正课日期 + 1/2/3/6/9/12/15/17/19/21 天`。
2. 当平台为 BFD 时，展示：`复习日期 = 正课日期 + 1/2/3/5/7/9/12/14/17/21 天`。
3. 示例日期说明也需同步切换，保证页面所见即当前平台规则。

### 14.7 复习词数输入框规则

#### 14.7.1 LXLL

保持现有实现与交互方式，不在本次需求中改动。

#### 14.7.2 BFD

1. 输入框数量由“当天应复习来源条数”自动决定。
2. 若当天命中 8 条来源，则显示 8 个输入框。
3. 若当天命中 0 条来源，则显示“当天按已提交正课记录无应复习任务”提示。
4. BFD 模式下不再沿用“最多 7 个”的旧上限。

### 14.8 技术方案增补

建议把平台差异抽成统一配置：

```javascript
const REVIEW_RULES = {
    lixiaolaila: {
        offsets: [1, 2, 3, 6, 9, 12, 15, 17, 19, 21],
        expectedSource: 'server-completed-training',
        actualSource: 'server-anti-forgetting-list',
        compareMode: 'diff'
    },
    baifendii: {
        offsets: [1, 2, 3, 5, 7, 9, 12, 14, 17, 21],
        expectedSource: 'local-class-statistics',
        actualSource: 'none',
        compareMode: 'expected-only'
    }
};
```

实现职责拆分建议：

1. `getReviewRule(platformId)`：返回当前平台 offsets 与模式。
2. `calculateReviewScheduleFromServer(...)`：仅供 LXLL 使用，保持现状。
3. `calculateReviewScheduleFromClassStats(...)`：仅供 BFD 使用，从 `${userName}_classStatistics` 推算当天来源。
4. `renderReviewScheduleHint(platformId)`：按平台渲染问号说明文案。
5. `renderReviewWordInputsForBfd(expectedCount)`：按 BFD 当天来源条数动态生成输入框。
6. `renderScheduleCheckResultForBfd(expectedItems)`：仅展示“当天应复习来源清单”，不输出正常/漏排/多排。

### 14.9 验收标准增补

1. 当平台为 LXLL 时，问号说明展示 `1/2/3/6/9/12/15/17/19/21`。
2. 当平台为 BFD 时，问号说明展示 `1/2/3/5/7/9/12/14/17/21`。
3. 当平台为 LXLL 时，现有“正常 / 漏排 / 多排”核对结果保持不变。
4. 当平台为 BFD 时，核对复习计划不再依赖真实网站“实际复习列表”。
5. 当平台为 BFD，且当前核对日期命中 8 条应复习来源时，页面显示 8 个复习词数输入框。
6. 当平台为 BFD，且当前核对日期无命中来源时，页面显示“无应复习任务”提示。
7. BFD 结果表至少展示：复习日期、来源正课日期、复习节点、来源类型。
8. 切换平台、学员、复习日期后，BFD 的来源清单和输入框数量都会重新计算。

---

## 15. 2026-08-21 增补：抗遗忘反馈提交前日期确认

### 15.1 背景

老师可能昨天打开了 `anti-forgetting.html` 后没有关闭浏览器标签页，第二天继续在旧页面上点击“抗遗忘课堂反馈”或“新版反馈”。由于页面没有重新初始化，`reviewTime` 仍可能停留在昨天，导致反馈统计和遗忘词记录落到过期日期。

单纯在页面初始化时刷新默认值，不能覆盖“旧标签页跨天未关闭”的真实场景。因此本次采用 MVP 方案：不强制改日期，而是在提交反馈前比对复习日期和当前北京时间日期，不一致时弹出确认。

### 15.2 目标

1. 在“抗遗忘课堂反馈”和“新版反馈”提交前检查复习日期。
2. 只比较日期 `YYYY-MM-DD`，不比较时分秒；该页面的复习时间字段只承担记录日期的作用。
3. 当前系统日期必须按北京时间 `Asia/Shanghai` 计算，避免用户设备或运行环境时区影响。
4. 日期不一致时提示用户：可以继续按所选日期提交，也可以取消后改成当天日期。
5. 保留手动补打过去日期的能力，不自动覆盖用户选择。

### 15.3 需求规则

| 场景 | 复习日期 | 当前北京时间日期 | 预期行为 |
|------|----------|------------------|----------|
| 正常当天提交 | 今天 | 今天 | 不弹提示，直接提交 |
| 旧标签页跨天提交 | 昨天 | 今天 | 弹确认，用户确认后继续按昨天提交 |
| 旧标签页跨天提交后取消 | 昨天 | 今天 | 用户取消后停止提交，不复制文案，不写统计 |
| 补打历史日期 | 过去日期 | 今天 | 弹确认，用户确认后继续按过去日期提交 |
| 时分秒不同 | 今天任意时间 | 今天 | 不弹提示，时分秒不参与判断 |

### 15.4 技术方案

代码位置：`commonFunctions.js`。

| 函数 | 职责 |
|------|------|
| `getBeijingDateYmd(now)` | 用 `Intl.DateTimeFormat` 和 `Asia/Shanghai` 输出当前北京时间日期 |
| `getReviewDateYmd()` | 从 `#reviewTime` 提取日期部分 `YYYY-MM-DD` |
| `confirmAntiForgettingReviewDateMatchesToday(now)` | 复习日期与北京时间今天不一致时弹 `window.confirm` |
| `handleAntiForgettingFeedbackClick()` | 提交前先执行日期确认，取消则直接返回 |
| `handleNewVersionFeedbackClick()` | 提交前先执行日期确认，取消则直接返回 |

确认文案需要同时包含：当前选择的复习日期、当前北京时间日期、继续提交和返回修改的含义。

### 15.5 测试覆盖

新增回归测试：`tests/test-anti-forgetting-review-date-confirm.js`。

| 用例 | 断言 |
|------|------|
| 新版反馈日期不是北京时间今天且用户取消 | 弹确认；不复制文案；不写统计 |
| 抗遗忘课堂反馈日期不是北京时间今天且用户取消 | 弹确认；不复制文案；不写统计；不写遗忘词 |
| 复习日期等于北京时间今天 | 不弹确认；正常复制文案并写统计 |

### 15.6 验收标准增补

| 编号 | 标准 | 验证方式 |
|------|------|---------|
| AC-8 | 旧标签页跨天后点击任一反馈按钮会弹日期确认 | 自动化测试 + 手工验收 |
| AC-9 | 用户点击取消后不会复制反馈文案或写入统计 | 自动化测试 |
| AC-10 | 用户点击确定后仍可按过去日期补打记录 | 手工验收 |
| AC-11 | 复习日期与北京时间今天一致时不弹提示 | 自动化测试 |
| AC-12 | 时分秒不参与日期判断 | 手工验收 |