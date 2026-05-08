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
| 4 | +5 | 第 5 天 |
| 5 | +7 | 第 7 天 |
| 6 | +9 | 第 9 天 |
| 7 | +12 | 第 12 天 |
| 8 | +14 | 第 14 天 |
| 9 | +17 | 第 17 天 |
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
    复习公式：复习日期 = 正课日期 + 1/2/3/5/7/9/12/14/17/21 天。<br>
    例如正课是 2026-04-17，则对应复习日依次为 2026-04-18、04-19、04-20、04-22、04-24、04-26、04-29、05-01、05-04、05-08。
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
const REVIEW_OFFSETS = [1, 2, 3, 5, 7, 9, 12, 14, 17, 21];

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