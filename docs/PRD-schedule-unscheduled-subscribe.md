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

- 使用 GitHub Actions 每小时执行一次
- 对到期订阅：
  - 通过 `NETLIFY_AUTH_TOKEN` / `NETLIFY_SITE_ID` 读取 Netlify Blobs 中的有效订阅
  - 调用现有李校首页排课接口 + 已完成接口
  - 复用现有 `ScheduleCourseMatch` 匹配规则判断是否已排好
  - 若已排好：移除订阅
  - 若未排好：发送邮件提醒，并把 `nextCheckAt` 顺延 1 小时

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

## 4. 非目标

- 不支持百分缔 / 麦穗英语平台的自动订阅提醒
- 不做短信、微信、企业 IM 推送
- 不做多用户权限隔离

## 5. 验收标准

- AC-01：未排课的李校课程显示 `订阅` 按钮。
- AC-02：点击 `订阅` 后，页面显示已订阅状态，并将订阅写入后端存储。
- AC-03：后台每小时检查一次；若课程仍未排课，则发送邮件提醒。
- AC-04：若课程已排课或已完成，则后台自动停止继续检查，不再发提醒。
- AC-05：点击 `取消订阅` 后，后台不再继续检查该课程。

## 6. TDD 范围

- 先补测试：
  - 订阅 API 的新增 / 取消 / 巡检停订 / 未排发信
  - 页面仅在 `未排课` 条目渲染订阅入口
- 再做最小实现并回归测试。