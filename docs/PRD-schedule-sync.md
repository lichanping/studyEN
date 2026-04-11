# 排课数据跨设备同步（MVP）- PRD

> 文档日期：2026-04-10
> 状态：实施中

## 1. 背景与痛点

在 `schedule.html` 的今日/明日排课中，用户可通过"临时加课"添加自定义学生、修改上课时间、标记请假等。
这些数据全部保存在浏览器 `localStorage`，导致：

- **痛点**：在电脑 A 上设置了排课（临时加课、调时间、标请假等），回家打开电脑 B 时需要重新设置。
- 现有工作流依赖单台设备，无法跨设备协作。

## 2. 目标

### 2.1 本期目标（MVP）

- 在排课总览页新增"上传排课"/"下载排课"操作，以 **天** 为单位将排课状态同步到云端。
- 用户在电脑 A **上传**今天+明天的排课快照 → 在电脑 B **下载**后覆盖本地对应日期数据。
- 使用 Netlify Functions + Netlify Blobs，无需外部服务，零成本。
- **no regression**：所有现有 localStorage 读写逻辑不变，同步为纯增量功能。

### 2.2 非目标

- 不做实时自动同步（无 WebSocket/轮询）。
- 不做多用户冲突合并（last-write-wins 覆盖即可）。
- 不同步工资账本数据（已有独立补录机制）。
- 不做全量 localStorage 同步。

## 3. 技术方案

### 3.1 架构

```
[浏览器 A]                  [Netlify Blobs]                [浏览器 B]
    │                            │                              │
    │── POST /api/schedule-sync ─▶│  存储 {syncKey}/{date}      │
    │                            │                              │
    │                            │◀── GET /api/schedule-sync ───│
    │                            │     返回 payload             │
```

### 3.2 同步数据范围（per-date）

| localStorage 键 | 描述 | 同步粒度 |
|---|---|---|
| `schedule-extra-entries-v1` | 临时加课条目 | 提取 `state[date]` |
| `schedule-cancellations-v1` | 请假状态 | 提取所有 `date::*` 键 |
| `schedule-time-overrides-v1` | 时间覆盖 | 提取所有 `date::*` 键 |
| `schedule-lesson-overrides-v1` | 课程/时长覆盖 | 提取所有 `date::*` 键 |
| `custom-students-v1` | 长期学生名册 | 全量合并（union） |

### 3.3 API 设计

**Endpoint:** `/.netlify/functions/schedule-sync`

#### 上传 (POST)

```json
{
  "syncKey": "my-secret-key",
  "date": "2026-04-10",
  "payload": {
    "extraEntries": [...],
    "cancellations": { "2026-04-10::id1": {...} },
    "timeOverrides": { "2026-04-10::id1": "20:00" },
    "lessonOverrides": { "2026-04-10::id1": {...} },
    "customStudents": ["张三", "李四"]
  }
}
```

#### 下载 (GET)

```
GET /.netlify/functions/schedule-sync?syncKey=xxx&date=2026-04-10
```

Response:
```json
{
  "success": true,
  "date": "2026-04-10",
  "payload": { ... },
  "uploadedAt": "2026-04-10T14:30:00.000Z"
}
```

### 3.4 冲突策略

- **Last-write-wins**：上传直接覆盖云端同日期数据。
- **下载覆盖本地**：下载时直接用云端数据覆盖本地对应日期的条目。
- Custom students 采用**合并（union）**策略，不删除本地已有的学生名。

### 3.5 Sync Key（同步密钥）

- 用户首次使用时设置一个 sync key（保存在 localStorage `schedule-sync-key`）。
- 同一 sync key 的设备共享同一份云端数据。
- 简单防止他人读写数据（非加密，仅命名空间隔离）。

## 4. UI 设计

在排课总览页"今天/明天"面板上方，新增同步控制区：

```
┌─────────────────────────────────────────────────┐
│  🔑 同步密钥: [********] [设置]                   │
│  [⬆️ 上传今日+明日排课]  [⬇️ 下载今日+明日排课]   │
│  提示文字: 上传会覆盖云端同日数据；下载会覆盖本地。 │
└─────────────────────────────────────────────────┘
```

### 4.1 交互流程

**上传：**
1. 点击"上传" → 收集今天 + 明天的 5 类数据
2. 分别 POST 两个日期到云端
3. Toast 提示"已上传 2026-04-10、2026-04-11"

**下载：**
1. 点击"下载" → GET 今天 + 明天的数据
2. 覆盖本地 localStorage 对应日期的条目
3. 刷新页面渲染
4. Toast 提示"已下载并覆盖 2026-04-10、2026-04-11"

## 5. 文件变更清单

| 文件 | 变更类型 | 说明 |
|---|---|---|
| `package.json` | 新增 | 添加 `@netlify/blobs` 依赖 |
| `netlify/functions/schedule-sync.mjs` | 新增 | 同步 API 函数 |
| `netlify.toml` | 修改 | 添加 functions 目录配置 |
| `schedule.html` | 修改 | 添加同步 UI + 上传/下载逻辑 |

## 6. Smoke Case

| # | 操作 | 预期结果 |
|---|---|---|
| S1 | 首次点击"上传"，未设置 sync key | 弹出 prompt 让用户输入 sync key |
| S2 | 设置 sync key 后点击"上传" | Toast 显示上传成功 + 日期 |
| S3 | 在另一设备设置相同 sync key，点击"下载" | 本地数据被覆盖，排课列表刷新 |
| S4 | 下载后检查今日临时加课 | 临时加课条目与上传端一致 |
| S5 | 下载后检查请假状态 | 请假标记与上传端一致 |
| S6 | 下载后检查时间覆盖 | 上课时间与上传端一致 |
| S7 | 云端无数据时下载 | Toast 提示"云端无数据" |
| S8 | 上传后不影响现有功能（排课申请、通知复制等） | 所有按钮正常工作 |
| S9 | 工资统计功能不受影响 | 补录、生成工资 CSV 正常 |

