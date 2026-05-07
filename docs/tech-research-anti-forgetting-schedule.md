# 技术调研文档：抗遗忘复习排班修复

> 日期：2026-05-07
> 状态：初稿

---

## 1. 问题概述

### 1.1 Bug 描述

| 项目 | 内容 |
|------|------|
| **模块** | 抗遗忘复习排班 |
| **影响用户** | 于熠凡等 |
| **日期范围** | 2026-05-06 ~ 2026-05-07 |
| **问题** | 排班逻辑错误，存在漏排 + 多排，复习任务与规则不符 |

### 1.2 规则

- **正课次日为第 1 天**
- **复习节点**：第 1/2/3/5/7/9/12/14/17/21 天
- 即：若正课日期为 D，则复习日期为 D+1, D+2, D+3, D+5, D+7, D+9, D+12, D+14, D+17, D+21

### 1.3 复现案例

| 正课日期 | 应排复习日期 | 实排复习日期 | 问题 |
|----------|-------------|-------------|------|
| 4.22 | 4.23, 4.24, 4.25, 4.27, 4.29, ... | 仅 5.3、5.4 | **漏排** |
| 5.3 | 5.4, 5.5, 5.6, 5.8, 5.10, ... | 5.4, 5.6 | **漏 5.5** |
| 5.4 | 5.5, 5.6, 5.7, 5.9, 5.11, ... | 5.6, 5.7 | **漏 5.5** |
| 5.6 | 4.22(应排), 5.3, 5.4 | 仅 5.3、5.4 | **漏 4.22** |
| 5.7 | 4.25, 5.4 | 4.22(多排), 5.1(多排), 5.3(多排), 4.25, 5.4 | **多排 4.22、5.1、5.3** |

### 1.4 根因分析

**日期换算逻辑错误**：当前系统基于 `localStorage` 中的 `${userName}_末次复习` 值计算复习计划，但该值仅记录"最后一次复习日期"，丢失了历史训练记录，导致：

1. **无法回溯**：只能从末次复习日期推算，历史正课记录丢失
2. **精度丢失**：日期字符串比较存在边界问题
3. **无数据源**：没有读取服务端"训练记录已完成"的 API

---

## 2. 现有代码分析

### 2.1 获取训练记录已完成的 API（schedule.html）

**位置**：`schedule.html` → `refreshBoardScheduleMatches()` 函数

```javascript
// 首页排课接口（待排课）
{
    url: "https://apiv2.lxll.com/customer/training/board",
    useProxy: false
}

// 训练记录已完成接口（已完成）
{
    url: "https://apiv2.lxll.com/customer/training/orders?pageNumber=1&pageSize=50&status=COMPLETED",
    useProxy: false
}
```

**请求方式**：

```javascript
// 非代理模式（直接请求）
fetch(completedPlan.url, {
    method: "GET",
    headers: {
        "accept": "application/json, text/plain, */*",
        "authorization": "Bearer " + token,
        "x-token-c": token,
        "x-user-id": userId,
        "x-ua": BOARD_DEFAULT_X_UA  // "ct=2&v=5.0.96"
    }
})
```

**响应处理**：

```javascript
const completedData = await completedResponse.json();
const completedList = Array.isArray(completedData?.data?.data) 
    ? completedData.data.data 
    : [];
```

**关键发现**：
- API 返回 `completedData.data.data` 数组
- 每条记录包含训练完成信息（日期、学员、课程类型等）
- 当前仅用于首页排课匹配，**未用于抗遗忘复习计算**

### 2.2 抗遗忘复习计划计算逻辑（classFormal.js）

**位置**：`classFormal.js` → `showTodayReviewDates()` 函数

```javascript
function showTodayReviewDates(userName) {
    const statsKey = `${userName}_classStatistics`;
    const classStats = JSON.parse(localStorage.getItem(statsKey)) || {};

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const reviewOffsets = [1, 2, 3, 5, 7, 9, 12, 14, 17, 21];
    const matchedStudyDates = [];

    Object.keys(classStats).forEach(dateStr => {
        const studyDate = new Date(dateStr);
        studyDate.setHours(0, 0, 0, 0);

        reviewOffsets.forEach(offset => {
            const reviewDate = new Date(studyDate);
            reviewDate.setDate(reviewDate.getDate() + offset);

            if (reviewDate.getTime() === today.getTime()) {
                matchedStudyDates.push(studyDate);
            }
        });
    });
    // ...
}
```

**末次复习更新逻辑**（`handleClassFeedbackClick`）：

```javascript
// 计算第21天的复习日期
const reviewDate = new Date(classDateTime);
reviewDate.setDate(reviewDate.getDate() + 21);
const formattedReviewDate = reviewDate.toISOString().split('T')[0];

const existingReviewDate = localStorage.getItem(`${userName}_末次复习`);
if (!existingReviewDate || formattedReviewDate > existingReviewDate) {
    localStorage.setItem(`${userName}_末次复习`, formattedReviewDate);
}
```

**关键问题**：
1. **数据源局限**：仅依赖 `localStorage` 中的 `${userName}_classStatistics`
2. **无服务端同步**：历史训练记录未同步到服务端
3. **日期计算边界**：`new Date(dateStr)` 可能存在时区问题

### 2.3 课堂反馈提交逻辑（handleClassFeedbackClick）

**数据持久化**：

```javascript
storeClassStatistics(userName, classDate, newWord, reviewWordCount, classDuration, "词汇课");
storeNewLearnedWords(userName, newLearnedWordsText);
```

**存储结构**（`classStatistics`）：

```javascript
{
    "2026-05-06": {
        date: "2026-05-06",
        newWord: 30,
        reviewWordCount: 20,
        duration: 1,
        type: "词汇课"
    },
    // ...
}
```

---

## 3. 数据流图

```
┌─────────────────────────────────────────────────────────────────┐
│                        数据源                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  本地存储 (localStorage)                                         │
│  ├── ${userName}_classStatistics                                │
│  │   └── { "2026-05-06": { newWord, reviewWordCount, ... } }  │
│  ├── ${userName}_末次复习                                        │
│  │   └── "2026-05-06"                                           │
│  └── ${userName}_总课时                                          │
│      └── "10.0"                                                 │
│                                                                  │
│  服务端 API                                                      │
│  ├── GET /customer/training/board                               │
│  │   └── 待排课列表                                               │
│  └── GET /customer/training/orders?status=COMPLETED             │
│      └── 已完成训练记录 ← **这是修复的关键数据源**                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     复习计划计算                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  当前逻辑：                                                      │
│  1. 读取 localStorage[${userName}_classStatistics]              │
│  2. 对每个日期 D，计算 D+1, D+2, D+3, D+5, ... D+21            │
│  3. 判断今天是否等于某个复习日期                                   │
│                                                                  │
│  问题：                                                          │
│  - 数据仅来自本地，可能丢失                                        │
│  - 末次复习仅记录单个日期，丢失历史                               │
│  - 日期计算存在边界问题                                           │
│                                                                  │
│  修复方案：                                                      │
│  1. 从服务端 API 获取已完成训练记录                               │
│  2. 过滤出当前学员的训练记录                                       │
│  3. 对每个训练日期 D，计算复习节点                                  │
│  4. 生成正确的复习计划                                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. API 响应结构推测

基于现有代码，推测 API 响应结构：

```json
{
    "data": {
        "data": [
            {
                "id": "xxx",
                "userName": "于熠凡",
                "status": "COMPLETED",
                "trainingDate": "2026-04-22",
                "courseType": "词汇课",
                "newWordCount": 30,
                "reviewWordCount": 20,
                "duration": 1,
                // ...
            },
            // ...
        ],
        "total": 100
    }
}
```

**需要验证**：
- [ ] 训练日期字段名（`trainingDate` / `date` / `completedDate`）
- [ ] 学员名称字段名（`userName` / `studentName`）
- [ ] 课程类型字段名（`courseType` / `type`）
- [ ] 分页参数（`pageNumber`, `pageSize`）
- [ ] 是否需要额外的查询参数

---

## 5. 修复方案概要

### 5.1 核心思路

1. **新增功能**：为每个学生获取已完成的训练记录
2. **正确计算**：基于训练日期 D，计算 D+1, D+2, D+3, D+5, D+7, D+9, D+12, D+14, D+17, D+21
3. **界面展示**：提供 Web 界面供用户查看和核对复习计划

### 5.2 技术方案

| 组件 | 方案 |
|------|------|
| **数据获取** | 调用 `/customer/training/orders?status=COMPLETED` API |
| **数据缓存** | 本地 IndexedDB 缓存，避免重复请求 |
| **复习计算** | 新增 `calculateReviewSchedule(trainingDates, offsets)` 函数 |
| **界面** | 新建 `anti-forgetting-schedule.html` 页面 |
| **导出** | 支持导出 CSV/Excel 格式 |

### 5.3 复习节点常量

```javascript
const REVIEW_OFFSETS = [1, 2, 3, 5, 7, 9, 12, 14, 17, 21];
```

### 5.4 核心算法伪代码

```javascript
function calculateReviewSchedule(trainingRecords) {
    const reviewSchedule = new Map(); // date -> [trainingDates]

    trainingRecords.forEach(record => {
        const trainingDate = record.trainingDate;
        const reviewDates = [];

        REVIEW_OFFSETS.forEach(offset => {
            const reviewDate = addDays(trainingDate, offset);
            reviewDates.push(reviewDate);

            if (!reviewSchedule.has(reviewDate)) {
                reviewSchedule.set(reviewDate, []);
            }
            reviewSchedule.get(reviewDate).push({
                trainingDate,
                student: record.userName,
                offset
            });
        });
    });

    return reviewSchedule;
}
```

---

## 6. 风险评估

| 风险 | 等级 | 说明 | 缓解措施 |
|------|------|------|---------|
| API 响应结构不符 | 高 | 推测的字段名可能不正确 | 先做 API 调用测试 |
| 分页限制 | 中 | pageSize=50 可能不够 | 实现分页获取 |
| 历史数据缺失 | 中 | 服务端可能只保留最近记录 | 明确数据保留策略 |
| Token 过期 | 低 | 认证可能失效 | 添加 Token 刷新机制 |

---

## 7. 下一步行动

1. ✅ 技术调研（本文档）
2. ⏳ API 响应结构验证（需要实际调用测试）
3. ⏳ PRD 编写
4. ⏳ PRD 审核
5. ⏳ 功能实施
6. ⏳ 测试验证

---

## 附录：相关代码位置

| 文件 | 函数/位置 | 说明 |
|------|----------|------|
| `schedule.html` | `refreshBoardScheduleMatches()` | API 调用逻辑 |
| `schedule.html` | `completedPlan` | 已完成训练记录 API 配置 |
| `classFormal.js` | `showTodayReviewDates()` | 复习日期计算 |
| `classFormal.js` | `handleClassFeedbackClick()` | 课堂反馈提交 |
| `classFormal.js` | `storeClassStatistics()` | 课时统计存储 |
| `commonFunctions.js` | `storeClassStatistics()` | 课时统计函数实现 |