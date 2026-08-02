# PRD：未排课订阅提醒

> 文档日期：2026-08-02

## 1. 背景

当前 `schedule.html` 已支持查询李校来啦课程的 `已排课 / 未排课 / 已完成` 状态，但状态刷新依赖：

- 页面初次打开时自动查询一次
- 手动点击“查看课时数”后再次查询

一旦课程长时间停留在“未排课”，老师仍需人工记得回来看，容易遗漏催排，已经发生过风险事件。

## 2. 目标

- 对 `未排课` 的李校来啦课程提供“一键订阅”入口。
- 测试阶段订阅后，系统每隔 10 分钟自动复查一次该节课是否已排好。
- 若已排好，自动停止订阅。
- 若仍未排好，发送邮件提醒，促使老师及时催排。

## 3. 方案

### 3.1 前端交互

- 页面：`schedule.html`
- 范围：今天 / 明天列表中的李校来啦课程
- 规则：
  - 当排课状态为 `未排课` 时，在状态标签旁显示 `订阅` 按钮
  - 已订阅后，按钮改为 `取消订阅`
  - 非李校平台、`已排课`、`已完成`、`未获取`、`查询中` 不显示订阅按钮

### 3.2 订阅存储

- 使用 Netlify Blobs 存储有效订阅
- 每条订阅至少记录：
  - 学生名
  - 日期
  - 时长（分钟）
  - 课程名
  - 平台
  - 当前登录的 `x-token-c` / `x-user-id`
  - 下次检查时间 `nextCheckAt`
  - 最近提醒时间 `lastNotifiedAt`

### 3.3 后台巡检

- 测试阶段使用 GitHub Actions 每 10 分钟执行一次
- 为了支持 merge 前 PR 验证，workflow 也会在 `pull_request` 事件运行一次 checker，但 PR 校验必须使用 dry-run：不发真实邮件、不修改 active subscriptions，只验证巡检和汇总逻辑
- 对到期订阅：
  - 通过 `NETLIFY_AUTH_TOKEN` / `NETLIFY_SITE_ID` 读取 Netlify Blobs 中的有效订阅
  - 调用现有李校首页排课接口 + 已完成接口
  - 复用现有 `ScheduleCourseMatch` 匹配规则判断是否已排好
  - 若已排好：移除订阅
  - 若未排好：发送邮件提醒，并把 `nextCheckAt` 顺延 10 分钟

### 3.4 邮件方案

- 采用 `nodemailer + SMTP` 发送
- MVP 收件人默认硬编码为 `lichanping@126.com`
- 如后续需要多收件人或更换收件人，再升级为服务端环境变量或后台配置
- GitHub Actions 优先复用既有 `FX_ALERT_SMTP_*` / `FX_ALERT_MAIL_*` secrets
- 也兼容项目专用 `SCHEDULE_SUBSCRIPTION_SMTP_*` / `SCHEDULE_SUBSCRIPTION_MAIL_*` 环境变量，便于本地测试

### 3.5 126 邮箱 SMTP 配置建议

若使用 126 邮箱作为发件人，需要先在 126 邮箱设置中开启 SMTP 服务，并生成“客户端授权码”。`SCHEDULE_SUBSCRIPTION_SMTP_PASS` 应填写授权码，而不是邮箱登录密码。

推荐配置：

```text
FX_ALERT_SMTP_HOST=smtp.126.com
FX_ALERT_SMTP_PORT=465
FX_ALERT_SMTP_SECURE=true
FX_ALERT_SMTP_USER=<你的126发件邮箱>
FX_ALERT_SMTP_PASS=<126客户端授权码>
FX_ALERT_MAIL_FROM=<你的126发件邮箱，可省略>
FX_ALERT_MAIL_TO=lichanping@126.com
```

### 3.6 GitHub Actions Secrets

GitHub Actions 需要配置：

```text
NETLIFY_AUTH_TOKEN=<可访问 Netlify Blobs 的 token>
NETLIFY_SITE_ID=<当前 Netlify site id>
FX_ALERT_SMTP_HOST=smtp.126.com
FX_ALERT_SMTP_PORT=465
FX_ALERT_SMTP_SECURE=true
FX_ALERT_SMTP_USER=<你的126发件邮箱>
FX_ALERT_SMTP_PASS=<126客户端授权码>
FX_ALERT_MAIL_FROM=<你的126发件邮箱，可省略>
```

### 3.7 调用量与成本评估

本功能不会因为 10 分钟轮询而持续调用 Netlify Function。

- Netlify Function 只在用户点击 `订阅` / `取消订阅` 时调用一次，用于写入或删除订阅。
- GitHub Actions 轮询时直接通过 `NETLIFY_AUTH_TOKEN` / `NETLIFY_SITE_ID` 读写 Netlify Blobs，不会经过 `/.netlify/functions/schedule-subscription`。
- 因此 Netlify Function 调用量主要取决于用户点击次数，而不是后台轮询次数。

会随轮询增加的是：

- GitHub Actions 执行次数：测试阶段每 10 分钟一次，即每天最多 144 次；合并前 PR 验证只在手动 rerun 或 PR 更新时执行。
- Netlify Blobs 读写次数：每次 checker 至少读取一次 active subscriptions，检查完成后写回一次。
- 李校来啦接口调用次数：当前实现按到期订阅逐条查询，每条到期订阅约调用 2 个接口（board + completed orders）。

MVP 预期订阅量很小，可以接受按订阅逐条查询。若后续同一时间 active subscription 超过 20 条，应优化为一次 checker 只拉取一次李校来啦 board/completed 数据，再对所有订阅复用同一份匹配结果，避免外部接口调用随订阅数线性增长。

### 3.8 最大重试与自动终止

为避免学生长期未排课导致 endless polling，订阅需要增加最大提醒次数限制。

建议 MVP 规则：

- `maxNotifyCount = 7`
- 只统计已经成功发送提醒邮件的次数，不统计“还没到检查时间”的跳过。
- 当课程仍未排课且 `notifyCount < maxNotifyCount`：发送提醒，`notifyCount + 1`，`nextCheckAt` 顺延 10 分钟。
- 当课程仍未排课且本次发送后达到 `maxNotifyCount`：发送最后一封提醒，然后将订阅状态改为 `expired` 或直接从 active subscriptions 中移除。
- 当课程已排课或已完成：发送一封排课成功邮件，告知订阅已自动停止，然后移除订阅。
- 当查询或发信失败：不增加 `notifyCount`，记录 `lastError`，`nextCheckAt` 顺延 10 分钟，避免因为临时故障消耗用户提醒次数。

推荐最终邮件文案在最后一次提醒中明确说明：

```text
本订阅已连续提醒 7 次仍未检测到排课，系统将自动停止轮询。请手动确认是否需要重新订阅。
```

### 3.9 页面与后端状态一致性

当前页面的 `取消订阅` 状态来自浏览器 localStorage，后端如果因为“已排课”或“超过最大提醒次数”自动停止订阅，页面在未刷新后端状态前可能仍显示 `取消订阅`。

为保证一致性，后续实现需要增加轻量同步机制：

- 订阅 API 增加 `status` 查询能力，支持页面按订阅 id 查询后端是否仍 active。
- 页面渲染今天 / 明天课程时，对本地已订阅记录做一次后端校验。
- 若后端已不存在该订阅，页面清理 localStorage，并恢复显示 `订阅`。
- 若页面查询到课程状态已经变成 `已排课` 或 `已完成`，页面也应立即清理本地订阅状态。
- 若用户点击 `取消订阅`，必须以后端删除成功为准，再更新本地状态；失败时保留 `取消订阅` 并提示重试。

一致性优先级：

1. 后端 active subscriptions 是事实来源。
2. 页面 localStorage 只作为 UI 缓存。
3. GitHub Actions 自动停止订阅后，页面下次打开或下次渲染时必须同步清理。

## 4. 非目标

- 不支持百分缔 / 麦穗英语平台的自动订阅提醒
- 不做短信、微信、企业 IM 推送
- 不做多用户权限隔离

## 5. 验收标准

- AC-01：未排课的李校课程显示 `订阅` 按钮。
- AC-02：点击 `订阅` 后，页面显示已订阅状态，并将订阅写入后端存储。
- AC-03：测试阶段后台每 10 分钟检查一次；若课程仍未排课，则发送邮件提醒。
- AC-04：若课程已排课或已完成，则后台发送一封排课成功邮件后自动停止继续检查。
- AC-05：点击 `取消订阅` 后，后台不再继续检查该课程。
- AC-06：同一订阅达到最大提醒次数后，后台自动停止继续轮询，并不再无限发送提醒。
- AC-07：后端订阅已自动停止时，页面再次打开或重新渲染后不应继续显示 `取消订阅`。
- AC-08：GitHub Actions 日志应输出本次检查的 active、resolved、notified、expired、skipped 汇总，便于 merge 前后验收。

## 6. TDD 范围

- 先补测试：
  - 订阅 API 的新增 / 取消 / 巡检停订 / 未排发信
  - 页面仅在 `未排课` 条目渲染订阅入口
  - 达到最大提醒次数后停止轮询
  - 后端已停止订阅时页面清理本地缓存
- 再做最小实现并回归测试。