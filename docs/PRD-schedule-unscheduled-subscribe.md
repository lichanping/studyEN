# PRD：未排课订阅提醒

> 文档日期：2026-08-02

## 1. 背景

当前 `schedule.html` 已支持查询李校来啦课程的 `已排课 / 未排课 / 已完成` 状态，但状态刷新依赖：

- 页面初次打开时自动查询一次
- 手动点击“查看课时数”后再次查询

一旦课程长时间停留在“未排课”，老师仍需人工记得回来看，容易遗漏催排，已经发生过风险事件。

## 2. 目标

- 对 `未排课` 的李校来啦课程提供“一键订阅”入口。
- 订阅后，系统每隔 1 小时自动复查一次该节课是否已排好。
- 若已排好，自动停止订阅。
- 若仍未排好，发送邮件提醒，促使老师及时催排；单条订阅最多提醒 3 次。
 
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

- 生产环境使用 Netlify Scheduled Function 每 1 小时执行一次
- GitHub Actions 只保留 `pull_request` / `workflow_dispatch` 的 dry-run 校验入口，不再承担生产轮询
- 对到期订阅：
  - 直接在 Netlify Function 运行时读取 Netlify Blobs 中的有效订阅
  - 调用现有李校首页排课接口 + 已完成接口
  - 复用现有 `ScheduleCourseMatch` 匹配规则判断是否已排好
  - 若已排好：移除订阅
  - 若未排好：发送邮件提醒，并把 `nextCheckAt` 顺延 1 小时

### 3.4 邮件方案

- 采用 `nodemailer + SMTP` 发送
- MVP 收件人默认硬编码为 `lichanping@126.com`
- 如后续需要多收件人或更换收件人，再升级为服务端环境变量或后台配置
- Netlify Scheduled Function 优先复用既有 `FX_ALERT_SMTP_*` / `FX_ALERT_MAIL_*` 环境变量
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

### 3.6 Netlify 环境变量

Netlify 生产环境需要配置：

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

本功能的后台轮询会直接消耗 Netlify Functions 调用量，因此需要严格控制频率和重试次数。

- Netlify Function 在以下场景会被调用：
  - 用户点击 `订阅`
  - 用户点击 `取消订阅`
  - Netlify Scheduled Function 每小时自动执行一次 checker
- 页面不再在渲染时向后端请求订阅 `status`，避免无意义消耗 Functions 次数。

会随轮询增加的是：

- Netlify Scheduled Function 执行次数：每小时一次，即每天最多 24 次。
- Netlify Blobs 读写次数：每次 checker 至少读取一次 active subscriptions，检查完成后写回一次。
- 李校来啦接口调用次数：当前实现按到期订阅逐条查询，每条到期订阅约调用 2 个接口（board + completed orders）。

MVP 预期订阅量很小，可以接受按订阅逐条查询。若后续同一时间 active subscription 超过 20 条，应优化为一次 checker 只拉取一次李校来啦 board/completed 数据，再对所有订阅复用同一份匹配结果，避免外部接口调用随订阅数线性增长。

### 3.8 最大重试与自动终止

为避免学生长期未排课导致 endless polling，订阅需要增加最大提醒次数限制。

建议 MVP 规则：

- `maxNotifyCount = 3`
- 只统计已经成功发送提醒邮件的次数，不统计“还没到检查时间”的跳过。
- 当课程仍未排课且 `notifyCount < maxNotifyCount`：发送提醒，`notifyCount + 1`，`nextCheckAt` 顺延 1 小时。
- 当课程仍未排课且本次发送后达到 `maxNotifyCount`：发送最后一封提醒，然后将订阅状态改为 `expired` 或直接从 active subscriptions 中移除。
- 当课程已排课或已完成：发送一封排课成功邮件，告知订阅已自动停止，然后移除订阅。
- 当查询或发信失败：不增加 `notifyCount`，记录 `lastError`，`nextCheckAt` 顺延 1 小时，避免因为临时故障消耗用户提醒次数。

推荐最终邮件文案在最后一次提醒中明确说明：

```text
本订阅已连续提醒 3 次仍未检测到排课，系统将自动停止轮询。请手动确认是否需要重新订阅。
```

### 3.9 页面与后端状态一致性

当前页面的 `取消订阅` 状态完全来自浏览器 localStorage。后端如果因为“已排课”或“超过最大提醒次数”自动停止订阅，页面不会再额外请求后端 `status` 做同步，以节省 Functions 次数。

当前一致性策略：

- 若页面查询到课程状态已经变成 `已排课` 或 `已完成`，页面应立即清理本地订阅状态。
- 若用户点击 `取消订阅`，必须以后端删除成功为准，再更新本地状态；失败时保留 `取消订阅` 并提示重试。
- 若订阅因达到最大提醒次数而被后端自动停止，页面仍可能继续显示 `取消订阅`；此时用户手动点一次 `取消订阅` 清掉本地缓存后，可再次点击 `订阅` 发起新一轮 3 次提醒。

一致性优先级：

1. 后端 active subscriptions 是事实来源。
2. 页面 localStorage 只作为 UI 缓存，不主动轮询后端状态。
3. 页面仅在课程状态已经显示为 `已排课` / `已完成` 时主动清理本地订阅。

## 4. 非目标

- 不支持百分缔 / 麦穗英语平台的自动订阅提醒
- 不做短信、微信、企业 IM 推送
- 不做多用户权限隔离

## 4.1 异常学生订阅扩展（2026-08-11）

为避免重复建设，异常学生订阅应直接复用本 PRD 已定义的整套技术栈与巡检机制，包括：

- 页面仍在 `schedule.html` 内触发。
- 后端仍使用 Netlify Function + Netlify Scheduled Function + Netlify Blobs。
- 邮件仍使用 `nodemailer + SMTP`。
- 本地 UI 缓存仍使用 localStorage，loading / 成功 / 失败交互与未排课订阅一致。
- `maxNotifyCount = 3`、按小时巡检、成功后自动停订等策略保持一致。

异常学生订阅只补充“订阅目标”和“匹配键”差异，不另起一套实现：

- 订阅对象：从“某一条未排课课程”扩展为“某一个异常学生”。
- 巡检目标：从“这节课是否已排好”扩展为“该学员在订阅时关注的课时余额字段是否恢复”。
- 匹配结果：沿用当前异常学生判定规则，基于 `quota30 / quota60 / quotaAccompany` 与 `requiredQuota30 / requiredQuota60 / requiredAccompanyHours / zeroFields` 复查是否仍异常。
- 存储模型建议新增 `subscriptionType` 字段区分：`unscheduled-course` / `abnormal-student`。
- `abnormal-student` 订阅至少额外记录：异常说明摘要 `issueText`、订阅发起时所在页面日期窗口或检查上下文、订阅时关注的额度字段与需求值，便于邮件回溯与复查。

### 4.1.1 巡检规则补充

- `unscheduled-course`：继续沿用“按单节课是否排好”判断。
- `abnormal-student`：每轮巡检时，按学员维度重新调用 `CustomerTeacherListClient` 查询李校课时余额。
- 若订阅时关注的 `zeroFields` 在本轮均已恢复：发送“课时已恢复”邮件并停订。
- 若订阅时关注的任一字段仍不足：发送“课时仍不足”提醒，并按现有 `notifyCount` 逻辑推进。
- 若学员不在查询结果内：按“仍未恢复”处理，不自动停订。

异常学生邮件正文要求：

- 必须展示学员名、异常说明、订阅关注字段。
- 必须展示本轮最新的 `quota30 / quota60 / quotaAccompany` 查询值，便于老师直接判断额度是否恢复。
- 必须展示本轮是第几次轮询：第 1/2 次分别显示 `轮询次数：1`、`轮询次数：2`，最后一次显示 `轮询次数：3(last)`。
- 不展示 `sourceScopeLabel`、`检查范围`、`基础排课X条 + 临时加课Y条` 等排课上下文，因为这些信息不直接服务于额度订阅决策。

未排课提醒邮件正文要求补充：

- 同样展示本轮是第几次轮询：第 1/2 次分别显示 `轮询次数：1`、`轮询次数：2`，最后一次显示 `轮询次数：3(last)`。
- 其余未排课邮件正文继续保持原有字段与申请排课文案，不受本次异常学生订阅扩展影响。

### 4.1.2 前端显示补充

- 顶部“异常学生”列表中的李校学员行，除现有 `复制` 外，新增 `订阅 / 取消订阅` 按钮。
- 若同一学员在异常列表中出现多段异常说明，按钮状态按“学员维度”去重，不为每段异常说明分别订阅。
- 若页面后续再次查询到该学员已不在异常学生列表中，应清理本地异常学生订阅缓存。

## 5. 验收标准

- AC-01：未排课的李校课程显示 `订阅` 按钮。
- AC-02：点击 `订阅` 后，页面显示已订阅状态，并将订阅写入后端存储。
- AC-03：后台每 1 小时检查一次；若课程仍未排课，则发送邮件提醒。
- AC-04：若课程已排课或已完成，则后台发送一封排课成功邮件后自动停止继续检查。
- AC-05：点击 `取消订阅` 后，后台不再继续检查该课程。
- AC-06：同一订阅达到最大提醒次数后，后台自动停止继续轮询，并不再无限发送提醒。
- AC-07：后端订阅已自动停止但页面仍显示 `取消订阅` 时，用户手动先取消再重新订阅，应能发起一轮新的 3 次提醒。
- AC-08：Netlify Scheduled Function 日志应输出本次检查的 active、resolved、notified、expired、skipped 汇总，便于验收。
- AC-09：异常学生列表中的李校学员显示 `订阅` 按钮，点击后写入 `abnormal-student` 类型订阅。
- AC-10：异常学生订阅复用同一套小时级巡检、邮件发送、最大提醒次数和自动停订机制，不额外引入新的基础设施。
- AC-11：异常学生订阅在检测到订阅关注的额度字段已恢复后，发送结果邮件并自动停订。
- AC-12：同一学员即使有多条异常说明，前端也只维护一条异常学生订阅状态。
- AC-13：未排课提醒邮件与异常学生提醒邮件均展示当前轮询次数；最后一次提醒明确标记为 `3(last)`。

## 6. TDD 范围

- 先补测试：
  - 订阅 API 的新增 / 取消 / 巡检停订 / 未排发信
  - 页面仅在 `未排课` 条目渲染订阅入口
  - 达到最大提醒次数后停止轮询
  - 后端超次停止后，用户先取消本地缓存再重新订阅可以开启新一轮提醒
  - 异常学生列表仅对李校学员渲染订阅入口
  - `abnormal-student` 订阅与 `unscheduled-course` 共用同一套巡检器，并按 `subscriptionType` 分流为“排课状态复查”或“额度恢复复查”
  - 同一学员存在多条异常说明时仅创建一条异常学生订阅
- 再做最小实现并回归测试。