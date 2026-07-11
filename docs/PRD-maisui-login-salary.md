# 麦穗英语登录 Token 与实际课次工资统计 PRD

文档日期：2026-07-11  
版本：v1.0

## 1. 背景

排课总览页当前“设置登录信息”“按实际上课生成工资统计”仅支持李校来啦平台。多平台扩展后，麦穗英语也需要通过平台账号密码登录获取 token，并基于麦穗实际已完成课次生成工资统计。

## 2. 目标

1. 当排课总览页平台选择为“麦穗英语”时，点击“设置登录信息”弹出手机号、密码输入。
2. 调用麦穗英语教练端登录 API 获取 access token，并保存到本地 localStorage。
3. 当平台选择为“麦穗英语”时，点击“按实际上课生成工资统计”使用麦穗 token 拉取实际课次。
4. 工资规则：
   - 麦穗正式课：1 小时 50 元，半小时按 25 元折算。
   - 麦穗体验课：半小时 10 元，即 20 元/小时。
5. 本期不实现麦穗“查看课时数”。

## 3. 接口探测结论

登录页：`https://ms.aiyingsi.com/teacher/#/login`

登录接口：
- Method: `GET`
- URL path: `https://ms.aiyingsi.com/api/teacher/auth`
- Query 字段：`mobile`、`password`、`code`、`placeholderInput`
- Response token 路径：`data.accessToken`
- Token 类型：`data.tokenType`，值为 `bearer`
- 有效期：`data.expiresIn`

登录后用户信息接口：
- Method: `GET`
- URL path: `https://ms.aiyingsi.com/api/teacher/auth/user`
- Header：`authorization: <accessToken>`，不带 `Bearer ` 前缀

销课记录列表接口：
- Method: `GET`
- URL path: `https://ms.aiyingsi.com/api/teacher/learn-union/list-page`
- Query 字段：
   - `page`：页码，从 1 开始
   - `pageSize`：每页数量
   - `userName`：学员名筛选，可空
   - `timeRange[0]`：开始日期 00:00:00（北京时间）对应的毫秒时间戳
   - `timeRange[1]`：结束日期 00:00:00（北京时间）对应的毫秒时间戳
   - `listenType`、`sourceType`：可空
- Header：`authorization: <accessToken>`
- 返回结构：`data.total`、`data.perPage`、`data.list[]`
- 课次字段包含：
   - 学员：`user.name`
   - 课程：`course.name`
   - 课程类型：`course.category.name`，如“单词速记”
   - 课时时长：`courseType.name`，如“30分钟”
   - 上课时间：`startTime` / `endTime`，页面按北京时间展示和筛选
   - 状态：`status.name`，已完成记录为“学习完成”

## 4. 范围

### In Scope

1. 增加麦穗登录凭据和 token 的 localStorage key。
2. `schedule.html` 的“设置登录信息”按当前平台分流：
   - 李校来啦：沿用现有登录。
   - 麦穗英语：调用麦穗登录。
3. `schedule.html` 的“按实际上课生成工资统计”按当前平台分流：
   - 李校来啦：沿用现有完成记录接口。
   - 麦穗英语：调用麦穗销课记录接口，按工资月份换算 `timeRange[0]` / `timeRange[1]` 过滤，并分页拉取已完成记录。
4. 工资计算模块支持麦穗平台体验课费率。

### Out of Scope

1. 麦穗“查看课时数”功能。
2. 百分缔登录与实际课次工资统计。
3. 后端代理改造。

## 5. 验收标准

1. 平台选择“麦穗英语”后，点击“设置登录信息”会提示输入手机号和密码。
2. 麦穗登录成功后，本地保存 access token，不覆盖李校来啦 token。
3. 平台选择“麦穗英语”后，工资统计使用麦穗 token 和麦穗销课记录接口。
4. 选择工资月份 2026-07 时，请求麦穗销课记录接口应带上 2026-07-01 至 2026-07-31 的北京时间边界 `timeRange`。
5. 麦穗半小时体验课工资为 10 元。
6. 麦穗 1 小时正式课工资为 50 元。
7. 平台选择“李校来啦”时，现有登录和工资统计流程不受影响。

## 6. 安全约束

1. 密码仅保存在本机 localStorage，和现有李校流程一致。
2. 日志、测试和文档不得记录真实手机号、密码或 token 值。
3. UI 弹窗和错误提示不得输出 token。
