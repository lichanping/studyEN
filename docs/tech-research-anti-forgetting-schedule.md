# 技术调研：抗遗忘复习计划核对功能

> 日期：2026-05-07
> 状态：已完成
> 范围：现有代码分析 + API 调研

---

## 1. 现有代码分析

### 1.1 训练记录已完成 API 读取方式

**来源：`schedule.html`**

```javascript
// 获取训练记录已完成数据
const completedPlan = {
    url: "https://apiv2.lxll.com/customer/training/orders?pageNumber=1&pageSize=50&status=COMPLETED",
    useProxy: false
};

// API 调用方式
const completedResponse = completedPlan.useProxy
    ? await fetch(completedPlan.url, {
        method: "POST",
        headers: {
            "accept": "application/json, text/plain, */*",
            "content-type": "application/json"
        },
        body: JSON.stringify({
            token,
            userId,
            xUa: BOARD_DEFAULT_X_UA,
            mode: "completed"
        })
    })
    : await fetch(completedPlan.url, {
        method: "GET",
        headers: {
            "accept": "application/json, text/plain, */*",
            "authorization": "Bearer " + token,
            "x-token-c": token,
            "x-user-id": userId,
            "x-ua": BOARD_DEFAULT_X_UA
        }
    });

// 响应解析
const completedData = await completedResponse.json();
const completedList = Array.isArray(completedData?.data?.data) ? completedData.data.data : [];
```

**关键信息**：
- API 地址：`https://apiv2.lxll.com/customer/training/orders`
- 查询参数：`pageNumber=1&pageSize=50&status=COMPLETED`
- 响应结构：`data.data` 数组
- 每个记录包含：`trainingTime`（训练时间）、`userName`（学员名）、`courseName`（课程名）等

### 1.2 抗遗忘复习计划计算逻辑

**来源：`classFormal.js`**

```javascript
// 复习节点偏移（天）
const REVIEW_OFFSETS = [1, 2, 3, 5, 7, 9, 12, 14, 17, 21];

// 计算复习日期
function calculateReviewDates(trainingDate) {
    return REVIEW_OFFSETS.map(offset => {
        const reviewDate = new Date(trainingDate);
        reviewDate.setDate(reviewDate.getDate() + offset);
        return reviewDate;
    });
}

// 示例：正课日期 2026-04-22
const trainingDate = new Date('2026-04-22');
const reviewDates = calculateReviewDates(trainingDate);
// 结果：[2026-04-23, 2026-04-24, 2026-04-25, 2026-04-27, 2026-04-29, 2026-05-01, 2026-05-04, 2026-05-06, 2026-05-09, 2026-05-13]
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

### 1.3 学生列表数据来源

**来源：`classFormal.js` + `anti-forgetting.html`**

1. **teacherData**（classFormal.js 中的硬编码数据）
   ```javascript
   const teacherData = {
       "liTeacher": {
           users: {
               "陈怡睿": { schedule, course, hours, duration },
               "徐智浩": { schedule, course, hours, duration },
               // ...
           }
       },
       "shiTeacher": {
           users: { /* ... */ }
       }
   };
   ```

2. **localStorage 数据源**
   - `schedule-config-override-v1`：排课配置学生
   - `custom-students-v1`：自定义学生
   - `schedule-extra-entries-v1`：临时加课学生
   - `*_classStatistics`：有上课记录的学生

3. **lxll API 教师列表**
   ```
   GET https://api.lxll.com/request/CustomerTeacherListClient
   ```

### 1.4 当前系统 Bug 分析

**问题描述**：排班逻辑错误，存在漏排 + 多排

**复现案例**：
- 用户：于熠凡
- 日期：2026-05-06 ~ 2026-05-07

| 正课日期 | 应排复习日期 | 实排复习日期 | 问题 |
|----------|-------------|-------------|------|
| 4.22 | 4.23, 4.24, 4.25, 4.27, 4.29, 4.31, 5.4, 5.6, 5.9, 5.13 | 5.6, 5.4 | **漏排 8 个** |
| 5.3 | 5.4, 5.5, 5.6, 5.8, 5.10, 5.12, 5.15, 5.17, 5.20, 5.24 | 5.6, 5.4 | **漏 5.5** |
| 5.4 | 5.5, 5.6, 5.7, 5.9, 5.11, 5.13, 5.16, 5.18, 5.21, 5.25 | 5.6, 5.7 | **漏 5.5** |
| 5.6 | 4.22(应排), 5.3, 5.4 | 仅 5.3, 5.4 | **漏 4.22** |
| 5.7 | 4.25, 5.4 | 4.22(多排), 5.1(多排), 5.3(多排), 4.25, 5.4 | **多排 3 个** |

**根因分析**：
1. 日期换算逻辑错误
2. 仅依赖 localStorage，无法获取服务端已完成训练记录
3. 历史数据可能丢失或不完整

---

## 2. API 调研

### 2.1 已完成训练记录 API

**接口地址**：
```
GET https://apiv2.lxll.com/customer/training/orders?pageNumber=1&pageSize=100&status=COMPLETED
```

**请求头**：
```
Authorization: Bearer {token}
x-token-c: {token}
x-user-id: {userId}
x-ua: ct=2&v=5.0.96
accept: application/json, text/plain, */*
```

**响应结构**：
```json
{
    "code": 0,
    "data": {
        "data": [
            {
                "id": 123456,
                "userName": "于熠凡",
                "trainingTime": "2026-04-22T19:30:00",
                "courseName": "托福高频词汇",
                "status": "COMPLETED",
                // ... 其他字段
            }
        ],
        "total": 1234
    }
}
```

**分页策略**：
- 初始 pageSize=100
- 若 total > pageSize，需要分页获取
- 缓存已获取数据，避免重复请求

### 2.2 抗遗忘复习记录 API（已验证）

**接口地址**：
```
GET https://apiv2.lxll.com/customer/anti-forget/record/teacher
```

**Playwright 线上探测结果**：
- 响应 `code=0`, `msg=成功`
- 结构：`data[].time -> data[].students[].studentName -> antiForgets[]`
- `antiForgets[]`关键字段：`antiForgetId`, `trainTime`, `materialName`, `status`
- 状态枚举：`PENDING`, `PROGRESS`

**状态语义（用于核对口径）**：
- `PENDING` 与 `PROGRESS` 都属于系统已排复习内容
- 核对场景不按状态过滤，统一纳入 actual 列表

---

## 3. 技术方案

### 3.1 实现方式

在现有 `anti-forgetting.html` 页面新增功能模块，不新增页面。

### 3.2 新增功能模块

#### 模块一：复习计划核对按钮

```html
<button id="checkReviewScheduleBtn" type="button">📋 核对复习计划</button>
```

#### 模块二：核对结果展示区

```html
<div id="reviewScheduleCheckPanel" class="panel" style="display:none;">
    <h3>📊 复习计划核对结果</h3>
    <div id="reviewScheduleSummary"></div>
    <div id="reviewScheduleDiff"></div>
    <button id="exportReviewScheduleCSV">📥 导出CSV</button>
    <button id="closeReviewPanel">关闭</button>
</div>
```

#### 模块三：学生选择器

复用现有学生列表逻辑，自动获取当前页面的学生列表。

### 3.3 核心逻辑

#### 3.3.1 获取已完成训练记录

```javascript
const REVIEW_OFFSETS = [1, 2, 3, 5, 7, 9, 12, 14, 17, 21];

async function fetchCompletedTrainingRecords(token, userId) {
    const allRecords = [];
    let pageNumber = 1;
    const pageSize = 500;
    
    while (true) {
        const url = `https://apiv2.lxll.com/customer/training/orders?pageNumber=${pageNumber}&pageSize=${pageSize}&status=COMPLETED`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'x-token-c': token,
                'x-user-id': userId,
                'x-ua': 'ct=2&v=5.0.96',
                'accept': 'application/json, text/plain, */*'
            }
        });
        
        if (!response.ok) {
            throw new Error(`API 调用失败: ${response.status}`);
        }
        
        const data = await response.json();
        const records = data?.data?.data || [];
        
        allRecords.push(...records);
        
        if (pageNumber * pageSize >= (data?.data?.total || 0)) {
            break;
        }
        pageNumber++;
    }
    
    return allRecords;
}
```

#### 3.3.2 复习计划计算

```javascript
function calculateReviewSchedule(trainingRecords, targetStudent) {
    const reviewSchedule = new Map(); // reviewDate -> [reviewItems]
    
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

#### 3.3.3 获取实际复习列表

```javascript
async function fetchActualReviewList(token, userId, targetStudent, reviewDate) {
    const url = `https://apiv2.lxll.com/customer/anti-forget/record/teacher`;
    
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'x-token-c': token,
            'x-user-id': userId,
            'x-ua': 'ct=2&v=5.0.96',
            'accept': 'application/json, text/plain, */*'
        }
    });
    
    const data = await response.json();
    // map to [{ reviewDate, trainingDate }]
    return mapTeacherRecordToActualList(data, targetStudent, reviewDate);
}
```

#### 3.3.4 对比差异

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
    
    // 去重比较：按 trainingDate 粒度
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

    // 实际在非预期日期出现也判定为多排
    // ...
    
    return diff;
}
```

### 3.4 单日核对口径（最终）

- 输入：页面当前 `学员 + 复习日期`
- 期望值：该学员 `复习日期-21天` 到 `复习日期` 的正课，按复习偏移推算后命中该复习日期的来源正课
- 实际值：API2 中同学员同复习日期对应的 `trainTime` 来源正课
- 对比粒度：正课日期去重

---

## 4. 学生列表数据来源分析

### 4.1 现有学生列表

`anti-forgetting.html` 页面已有学生列表，数据来源：

1. **排课配置学生**：`schedule-config-override-v1`（localStorage）
2. **自定义学生**：`custom-students-v1`（localStorage）
3. **临时加课学生**：`schedule-extra-entries-v1`（localStorage）
4. **排课总览配置**：`schedule.html` 中的 `schedule-config`
5. **有上课记录的学生**：localStorage 中以 `_classStatistics` 结尾的 key

### 4.2 学生列表为空的原因

从代码来看，`loadStudentOptions()` 函数从多个来源加载学生列表，但如果所有这些来源都没有数据，学生列表就会为空。

**解决方案**：
1. 优先复用现有学生列表
2. 若现有列表为空，则从 `classFormal.js` 的 `teacherData` 补充
3. 若 `teacherData` 也无数据，则从 lxll API 教师列表补充

---

## 5. 风险评估

| 风险 | 等级 | 缓解 |
|------|------|------|
| API 响应结构不符 | 高 | 阶段一先验证 |
| 历史数据缺失 | 中 | 明确保留策略 |
| 分页限制 | 中 | 实现分页获取 |
| 学生列表为空 | 中 | 多数据源补充 |

---

## 6. 实施计划

### 阶段一：在 anti-forgetting.html 新增功能

- [x] 新增"核对复习计划"按钮
- [x] 新增核对结果面板（可折叠）
- [ ] 复用现有学生列表
- [ ] 实现核心核对逻辑

### 阶段二：API 验证

- [ ] 调用 `/customer/training/orders?status=COMPLETED` API
- [ ] 验证响应字段名
- [ ] 确认分页策略

### 阶段三：测试验证

- [ ] 用例：于熠凡 2026-05-06 ~ 2026-05-07
- [ ] 验证：应排 vs 实排
- [ ] 回归测试

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