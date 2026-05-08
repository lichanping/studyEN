# PRD：抗遗忘复习计划核对功能（MVP）

> 日期：2026-05-07
> 状态：待审核
> 优先级：高
> 范围：在现有 `anti-forgetting.html` 页面新增功能，不新增页面

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

### 1.3 复现案例

**用户：于熠凡**
**核对日期：2026-05-06 ~ 2026-05-07**

> **说明**：
> - 正课日期只显示从 `today-21`（即 2026-04-15）开始的正课，因为更早的正课产生的复习日期已全部 < today，无法通过 API 获取到实排记录，对比无意义。
> - 应排复习日期只列 >= today 的节点，因为第三列实排日期都是 >= today 的。

| 正课日期 | 应排复习日期（>= 5.6） | 实排复习日期（API 获取） | 问题 |
|----------|----------------------|------------------------|------|
| 2026-04-22 | **5.6**(+14), 5.9(+17), 5.13(+21) | **5.6**, 5.4 | **5.4 多排**（4.22 的 +12 节点 5.4 < 5.6，不应排） |
| 2026-05-03 | **5.6**(+3), 5.8(+5), 5.10(+7), 5.12(+9), 5.15(+12), 5.17(+14), 5.20(+17), 5.24(+21) | **5.6**, 5.4 | **5.4 多排**（5.3 的 +1 节点 5.4 < 5.6，不应排） |
| 2026-05-04 | **5.6**(+2), 5.7(+3), 5.9(+5), 5.11(+7), 5.13(+9), 5.16(+12), 5.18(+14), 5.21(+17), 5.25(+21) | **5.6**, 5.7 | ✅ 5.6 和 5.7 正确 |
| 2026-05-06 | 5.7(+1), 5.8(+2), 5.9(+3), 5.11(+5), 5.13(+7), 5.15(+9), 5.18(+12), 5.20(+14), 5.23(+17), 5.27(+21) | — | 待验证 |
| 2026-05-07 | 5.8(+1), 5.9(+2), 5.10(+3), 5.12(+5), 5.14(+7), 5.16(+9), 5.19(+12), 5.21(+14), 5.24(+17), 5.28(+21) | — | 待验证 |

> **核心问题**：
> 1. **多排问题**：5.6 实排了 5.4（来自 4.22 的 +12 节点，但 5.4 < 5.6 不应排）；5.7 实排了 4.22、5.1、5.3（这些日期均 < 5.7，不应排）
> 2. **漏排问题**：5.6 应排 4.22(+14)=5.6、5.3(+3)=5.6、5.4(+2)=5.6，但 4.22 的 +17=5.9、+21=5.13 未排
> 3. **根本原因**：日期换算逻辑错误，影响复习节奏

---

## 2. 目标

1. **修复排班逻辑**：基于服务端已完成训练记录，正确计算复习计划
2. **提供核对功能**：在抗遗忘页面内集成复习计划核对功能
3. **支持导出**：导出 CSV/Excel 格式用于线下核对

---

## 3. MVP 功能需求

### 3.1 实现方式

**在现有 `anti-forgetting.html` 页面新增功能模块，不新增页面。**

### 3.2 新增功能模块

> **重要约束**：本次修改不修改现有 `anti-forgetting.html` 页面的学生列表数据来源逻辑，避免引入 regression bug。新增功能模块独立获取学生列表用于核对。

#### 模块一：复习计划核对按钮

在页面顶部或控制区新增按钮：

```html
<button id="checkReviewScheduleBtn">📋 核对复习计划</button>
```

#### 模块二：核对结果展示区

新增一个可折叠的面板用于展示核对结果：

```html
<div id="reviewScheduleCheckPanel" style="display:none;">
    <h3>📊 复习计划核对结果</h3>
    <div id="reviewScheduleSummary"></div>
    <div id="reviewScheduleDiff"></div>
</div>
```

> **说明**：MVP 阶段不包含导出 CSV 功能，优先确保页面展示结果准确。

#### 模块三：学生选择器（独立获取）

**核对功能独立获取学生列表**，不修改现有学生列表逻辑：

```javascript
// 核对功能独立获取学生列表，不影响现有页面逻辑
function getStudentsForScheduleCheck() {
    const students = new Set();
    
    // 1. teacherData 硬编码数据
    Object.values(teacherData).forEach(teacher => {
        Object.keys(teacher.users || {}).forEach(name => students.add(name));
    });
    
    // 2. localStorage 自定义学生
    try {
        const custom = JSON.parse(localStorage.getItem('custom-students-v1') || '[]');
        custom.forEach(name => students.add(name));
    } catch (_) {}
    
    // 3. 排课配置学生
    try {
        const override = JSON.parse(localStorage.getItem('schedule-config-override-v1') || 'null');
        (override?.entries || []).forEach(entry => {
            if (entry?.student) students.add(entry.student);
        });
    } catch (_) {}
    
    return [...students].sort();
}
```

> **说明**：此函数独立获取学生列表，不修改现有 `anti-forgetting.html` 的学生列表渲染逻辑。

### 3.3 核心逻辑

#### 3.3.1 获取已完成训练记录

**API 调用**：

```
POST https://apiv2.lxll.com/customer/training/orders?pageNumber=1&pageSize=100&status=COMPLETED
```

**请求头**：

```
accept: application/json, text/plain, */*
content-type: application/json
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

- 解析 `data.data` 数组
- 过滤出当前学员的训练记录
- 提取训练日期、课程类型等关键字段

**分页处理**：

- 初始 pageSize=100
- 若 total > pageSize，分页获取
- 缓存已获取数据，避免重复请求

**性能优化**：

- 首次页面加载时不自动获取训练记录
- 仅当用户点击"核对复习计划"按钮时触发 API 调用
- 首次加载时仅针对当前默认加载的学生做核对（可选）

#### 3.3.2 复习计划计算

**核心算法**：

```javascript
const REVIEW_OFFSETS = [1, 2, 3, 5, 7, 9, 12, 14, 17, 21];

function calculateReviewSchedule(trainingRecords, targetStudent) {
    const reviewSchedule = new Map(); // date -> [reviewItems]

    trainingRecords.forEach(record => {
        const studentName = (record.userName || record.studentName || '').trim();
        if (studentName !== targetStudent) return;
        
        const trainingDate = parseDate(record.trainingTime || record.trainingDate || record.date);
        
        REVIEW_OFFSETS.forEach(offset => {
            const reviewDate = addDays(trainingDate, offset);
            const reviewItem = {
                trainingDate: formatDate(trainingDate),
                reviewDate: formatDate(reviewDate),
                offset: offset,
                student: studentName,
                courseType: record.courseName || record.type || '未知课程'
            };

            if (!reviewSchedule.has(reviewDate)) {
                reviewSchedule.set(reviewDate, []);
            }
            reviewSchedule.get(reviewDate).push(reviewItem);
        });
    });

    return reviewSchedule;
}
```

**复习节点规则**：

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

#### 3.3.3 获取实际复习列表（API2）

从抗遗忘复习记录 API 获取：

```
GET https://apiv2.lxll.com/customer/anti-forget/record/teacher
```

**响应处理**：

- 按复习日期分组：`data[].time`
- 按学员过滤：`data[].students[].studentName`
- 提取来源正课时间：`antiForgets[].trainTime`
- 前端映射为核对结构：`{ reviewDate, trainingDate }`

**状态字段说明**：

- `status=PENDING` 与 `status=PROGRESS` 均表示“系统已排入复习列表”的内容
- MVP 核对口径：**不按 status 过滤**，两种状态都纳入实际值

#### 3.3.4 对比差异（单日核对）

**对比逻辑**：

- 输入：页面当前选中的 `学员 + 复习日期`
- 期望值：
    - 获取该学员 `T-21` 至当前复习日期之间的已完成正课
    - 按复习偏移 `[1,2,3,5,7,9,12,14,17,21]` 推算复习日期
    - 仅保留 `推算复习日期 == 页面选中复习日期` 的来源正课
- 实际值：
    - 从 API2 中提取 `同学员 + 同复习日期` 的来源正课
- 比较粒度：**正课日期去重**（同一天多材料按同一来源日期计算）

```javascript
function compareSchedules(expectedSchedule, actualList) {
    const diff = {
        normal: [],      // 正常
        missing: [],     // 漏排
        extra: [],       // 多排
        nodeError: []
    };
    
    // 构建实际复习 Map
    const actualMap = new Map();
    actualList.forEach(item => {
        if (!actualMap.has(item.reviewDate)) {
            actualMap.set(item.reviewDate, []);
        }
        actualMap.get(item.reviewDate).push(item);
    });
    
    // 去重比较：以 trainingDate 为粒度
    expectedSchedule.forEach((items, reviewDate) => {
        const actualItems = actualMap.get(reviewDate) || [];
        const expectedByTrainingDate = new Map();
        items.forEach(item => expectedByTrainingDate.set(item.trainingDate, item));

        const actualByTrainingDate = new Map();
        actualItems.forEach(item => actualByTrainingDate.set(item.trainingDate, item));
        
        expectedByTrainingDate.forEach((expected, trainingDate) => {
            if (actualByTrainingDate.has(trainingDate)) {
                diff.normal.push(expected);
            } else {
                diff.missing.push(expected);
            }
        });
        
        actualByTrainingDate.forEach((actual, trainingDate) => {
            if (!expectedByTrainingDate.has(trainingDate)) {
                diff.extra.push(actual);
            }
        });
    });

    // 实际存在但预期日期不存在，全部判定多排
    // ...
    
    return diff;
}
```

### 3.4 核对结果展示

**展示策略**：

| 场景 | 策略 |
|------|------|
| 首次页面加载 | 不自动获取核对结果，避免 API 调用耗时 |
| 用户点击按钮 | 触发 API 调用，获取完成后展示结果 |
| 结果展示超时 | 若超过 3 秒未完成，显示"加载中"状态 |

**摘要展示**：

| 指标 | 样式 |
|------|------|
| ✅ 正常数量 | 绿色 |
| ❌ 漏排数量 | 红色 |
| ⚠️ 多排数量 | 黄色 |
| 🎉 完全正确提示 | 绿色大提示 |

**差异详情**：

- 漏排：红色行，显示应来自训练日、复习节点
- 多排：黄色行，显示来自训练日、备注
- 正常：可折叠展示

#### 3.4.1 核对结果展示样例

**展示内容**：

| 列名 | 说明 |
|------|------|
| 复习日期 | 应复习的日期 |
| 应排来源 | 来自哪天的正课训练 |
| 复习节点 | 正课后第几天 |
| 状态 | 正常/漏排/多排 |
| 备注 | 额外说明 |

**样例输出（于熠凡 2026-05-06）**：

| 复习日期 | 应排来源 | 复习节点 | 状态 | 备注 |
|----------|---------|---------|------|------|
| 2026-05-06 | 2026-04-22 | +14 | ✅ 正常 | - |
| 2026-05-06 | 2026-05-03 | +3 | ✅ 正常 | - |
| 2026-05-06 | 2026-05-04 | +2 | ✅ 正常 | - |

**样例输出（于熠凡 2026-05-07）**：

| 复习日期 | 应排来源 | 复习节点 | 状态 | 备注 |
|----------|---------|---------|------|------|
| 2026-05-07 | 2026-04-25 | +12 | ✅ 正常 | - |
| 2026-05-07 | 2026-05-04 | +3 | ✅ 正常 | - |

**漏排样例**：

| 复习日期 | 应排来源 | 复习节点 | 状态 | 备注 |
|----------|---------|---------|------|------|
| 2026-05-06 | 2026-04-22 | +14 | ❌ 漏排 | 应从4.22正课复习 |

**多排样例**：

| 复习日期 | 应排来源 | 复习节点 | 状态 | 备注 |
|----------|---------|---------|------|------|
| 2026-05-07 | 2026-04-22 | +15 | ⚠️ 多排 | 不应排，规则无+15节点 |

---

## 4. 学生列表数据来源

### 4.1 现有学生列表

`anti-forgetting.html` 页面已有学生列表，数据来源如下：

1. **teacherData 硬编码数据**：从 `classFormal.js` 中 `teacherData.liTeacher.users` 获取（李教练的学生列表）
2. **localStorage 自定义学生**：`custom-students-v1`
3. **排课配置学生**：`schedule-config-override-v1`

> **注意**：不通过 `https://api.lxll.com/request/CustomerTeacherListClient` 获取学生列表。该 API 仅用于获取教师课时余额信息，不用于获取学生名单。

### 4.2 MVP 策略

**核对功能独立获取学生列表**，不修改现有页面逻辑：

1. `teacherData` 硬编码数据（李教练/施教练的学生列表）
2. `custom-students-v1`（localStorage）
3. `schedule-config-override-v1`（localStorage）

---

## 5. 非功能需求

### 5.1 性能

| 场景 | 目标 | 说明 |
|------|------|------|
| 首次页面加载 | 不触发 API 调用 | 避免等待，提升体验 |
| 用户点击核对按钮 | ≤ 3s（含 API 调用） | 显示加载状态 |
| 刷新计划（缓存命中） | ≤ 1s | 缓存已获取的训练记录 |

### 5.2 兼容性

- 浏览器：Chrome, Safari, Edge
- 移动端：适配

### 5.3 数据安全

- Token 不持久化
- 本地缓存加密（可选）

---

## 6. 实施计划

### 6.1 阶段一：在 anti-forgetting.html 新增功能

- [ ] 新增"核对复习计划"按钮（不自动触发）
- [ ] 新增核对结果面板（可折叠）
- [ ] 独立获取学生列表（不修改现有逻辑）
- [ ] 实现核心核对逻辑
- [ ] 硕硕姓名映射处理
- [ ] **回归测试：验证现有学生列表不受影响**

### 6.2 阶段二：API 验证与实现

- [ ] 验证 `/customer/training/orders` API 响应字段名
- [ ] 确认分页策略
- [ ] 实现训练记录获取逻辑

### 6.3 阶段三：测试验证

- [ ] 用例：于熠凡 2026-05-06 ~ 2026-05-07
- [ ] 验证：应排 vs 实排
- [ ] 回归测试

### 6.4 清理工作

- [x] 删除 `anti-forgetting-schedule.html`（独立页面，功能已整合到 anti-forgetting.html）

---

## 7. 验收标准

| 编号 | 标准 | 验证方式 |
|------|------|---------|
| AC-1 | 在 anti-forgetting.html 页面内展示核对结果 | 界面核对 |
| AC-2 | 于熠凡 5.6 应排：4.22(+14), 5.3(+3), 5.4(+2) | 界面核对 |
| AC-3 | 于熠凡 5.7 应排：4.25(+12), 5.4(+3) | 界面核对 |
| AC-4 | 核对结果展示准确 | 界面核对 |
| AC-5 | 学生列表不为空 | 界面核对 |

---

## 8. 风险与缓解

| 风险 | 等级 | 缓解 |
|------|------|------|
| API 响应结构不符 | 高 | 阶段一先验证 |
| 历史数据缺失 | 中 | 明确保留策略 |
| 分页限制 | 中 | 实现分页获取 |
| 学生列表为空 | 中 | 多数据源补充 |

---

## 附录：复习节点计算示例

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