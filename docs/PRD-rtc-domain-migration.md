# PRD：`h5.lxll.com` 迁移到 `rtc.lxll.com` 的页面与接口改造

文档日期：2026-07-21  
版本：v0.1（调研版）

## 1. 结论先行

当前前端不能直接把 `h5.lxll.com` 全量替换为 `rtc.lxll.com` 后上线。

原因有两类：

1. 部分请求把 `origin` / `referer` 写死为 `https://h5.lxll.com`。
2. 部分请求按 `window.location.hostname === "h5.lxll.com"` 决定是否直连上游 API。

但如果本次迁移明确去掉以下功能，迁移会明显更简单：

1. 浏览器扩展 `copy-word-2026`
2. 正式课页面中的“查看课时数”

原因是这样可以直接减少一类域名白名单问题，以及一条重复的课时查询链路。

因此，本次改造仍需先完成“后端/新接口可用性确认”，再进入前端替换与联调；如果正式课页面的该功能一并下线，则联调范围可以进一步收缩到排课总览页。

截至 2026-07-22 的实测结论是：对排课总览相关的已验证接口，不需要把 API host 改成 `rtc.lxll.com`，但前端代码层仍有两类适配需要处理：

1. 去掉或改造写死的 `h5.lxll.com` 来源头
2. 决定 `rtc.lxll.com` 下排课接口是继续直连 `apiv2.lxll.com`，还是保留代理策略

## 2. 目标

### 2.1 业务目标

1. 将与李校 H5 站点强绑定的前端域名依赖，从 `h5.lxll.com` 迁移到 `rtc.lxll.com`。
2. 保证迁移后，保留范围内的课时查询、排课总览、实际上课工资统计等关键功能可正常工作。
3. 在改造前先确认后端是否支持通过 `rtc.lxll.com` 或新的 API 方案拉取相同业务数据。

### 2.2 技术目标

1. 梳理所有硬编码域名与 host 分流点。
2. 区分“仅替换前端域名即可”与“依赖后端/CORS/网关策略”的功能。
3. 为后续逐页联调提供明确测试清单。

## 3. 本期范围

### 3.1 In Scope

1. 排课总览页：
   - 查看课时数
   - 最近 7 天排课匹配
   - 按实际上课生成工资统计
2. `schedule-board` 代理函数与其上游 API 依赖。
3. 与本次迁移直接相关的 PRD、联调前置项和测试顺序。

### 3.2 Out of Scope

1. 浏览器扩展 `copy-word-2026` 不纳入本次迁移范围。
2. 正式课页面中的“查看课时数”从 UI 与调用链中移除，不纳入本次迁移范围。
3. 不在本 PRD 中直接改代码。
4. 不在本 PRD 中确认生产发布窗口。
5. 不假设 `rtc.lxll.com` 一定继续复用现有 `api.lxll.com` / `apiv2.lxll.com`。

## 4. 当前实现现状

### 4.1 已确认的前端耦合类型

1. 请求头耦合：请求头中存在硬编码 `origin: https://h5.lxll.com` 与 `referer: https://h5.lxll.com/`。
2. host 分流耦合：当前代码只把 `h5.lxll.com` 与 `.onrender.com` 视作可直连 `apiv2.lxll.com` 的运行环境。
3. 页面间存在重复链路：正式课页面与排课总览页都包含“查看课时数”能力；本次已将前者作为下线对象处理。

### 4.2 已确认的数据来源

1. 课时查询接口：`https://api.lxll.com/request/CustomerTeacherListClient`
2. 排课板接口：`https://apiv2.lxll.com/customer/training/board`
3. 已完成课程接口：`https://apiv2.lxll.com/customer/training/orders?...&status=COMPLETED`
4. Netlify 代理：`/.netlify/functions/schedule-board`

说明：当前仓库内没有任何 `rtc.lxll.com` 或“新 API base URL” 的现成实现痕迹。

### 4.3 2026-07-22 实测结论（Chrome DevTools MCP）

在 `https://rtc.lxll.com` 登录后，已实际抓到以下请求：

1. 首页“最近7天预约训练”对应接口：
   - `GET https://apiv2.lxll.com/customer/training/board`
2. 训练记录页“已完成”对应接口：
   - `GET https://apiv2.lxll.com/customer/training/orders?pageNumber=1&pageSize=10&status=COMPLETED`
3. 训练记录页默认列表接口：
   - `GET https://apiv2.lxll.com/customer/training/orders?pageNumber=1&pageSize=10&status=`

本次实测得到三个关键事实：

1. `rtc.lxll.com` 站点本身并没有把这些业务接口替换成 `rtc.lxll.com` 或 `rtc-api.lxll.com`。
2. 这些核心业务请求仍然直连 `apiv2.lxll.com`。
3. 即使页面实际运行在 `rtc.lxll.com`，请求头里的 `origin` 与 `referer` 仍然是：
   - `origin: https://h5.lxll.com`
   - `referer: https://h5.lxll.com/`

同时，上游返回的 CORS 头为：

- `access-control-allow-origin: https://h5.lxll.com`

进一步使用 `curl` 直接以 `Origin: https://rtc.lxll.com` 实测后，已确认以下接口均可返回成功，且 CORS 已接受 `rtc`：

1. `GET https://apiv2.lxll.com/customer/training/board`
2. `GET https://apiv2.lxll.com/customer/training/orders?pageNumber=1&pageSize=10&status=COMPLETED`
3. `POST https://api.lxll.com/request/CustomerTeacherListClient`
4. `POST https://api.lxll.com/request/CustomerTeacherQueryDetail`

这些请求的响应头均返回：

- `access-control-allow-origin: https://rtc.lxll.com`

这意味着：

1. 当前没有证据支持“把排课匹配/工资统计/训练记录接口 host 直接替换成 `rtc.lxll.com`”这一做法。
2. 后端已放开本次实测覆盖接口对 `rtc.lxll.com` 来源的支持。
3. 对本仓库来说，真正需要改的是前端调用策略，而不是 API 域名本身：
   - 继续调用现有 `apiv2.lxll.com` / `api.lxll.com`
   - 去掉对 `h5` 来源头的硬编码依赖
   - 再决定 `rtc` 下是直连还是走代理

## 5. 页面与功能点清单

### 5.1 通用逻辑 `commonFunctions.js`

功能点：查看课时数（通用版本，当前不再作为正式课页入口）

- 主要实现：`viewTotalHoursClick()`
- 接口：`POST https://api.lxll.com/request/CustomerTeacherListClient`
- 当前依赖：请求头写死 `origin/referer = h5.lxll.com`
- 风险：与首页相同，属于来源域名兼容问题。
- 迁移建议：正式课页面入口已移除，这条链路仅保留给其他仍在使用的页面或后续清理。

### 5.2 排课总览页 `schedule.html`

功能点 A：查看课时数

- 主要实现：`checkQuotaFromSchedule(scope)`
- 接口：`POST https://api.lxll.com/request/CustomerTeacherListClient`
- 当前依赖：请求头写死 `origin/referer = h5.lxll.com`
- 实测对照：后端已接受 `Origin/Referer = https://rtc.lxll.com` 的同接口请求
- 风险：主要不是后端不支持 `rtc`，而是本地代码仍写死了 `h5` 来源头

功能点 B：最近 7 天排课匹配

- 主要实现：`refreshBoardScheduleMatches()`
- 依赖函数：`ScheduleCourseMatch.resolveBoardQueryPlan(window.location.hostname)`
- 直连接口：`GET https://apiv2.lxll.com/customer/training/board`
- 代理接口：`POST /.netlify/functions/schedule-board`
- 当前依赖：host 为 `h5.lxll.com` 时直连，否则走代理
- 实测对照：`rtc.lxll.com` 线上页面本身也在直连 `GET https://apiv2.lxll.com/customer/training/board`
- 风险：迁移到 `rtc.lxll.com` 后，本仓库当前默认会改为走代理，和线上真实行为不一致。

功能点 C：按实际上课生成工资统计

- 按钮：`generateScheduleSalaryButton`
- 主要实现：`fetchCompletedRecordsForSalary(startDate, endDate)`
- 依赖函数：`ScheduleCourseMatch.resolveCompletedQueryPlan(window.location.hostname)`
- 直连接口：`GET https://apiv2.lxll.com/customer/training/orders?...&status=COMPLETED`
- 代理接口：`POST /.netlify/functions/schedule-board?mode=completed`
- 当前依赖：host 为 `h5.lxll.com` 时直连，否则走代理
- 实测对照：训练记录页“已完成”实际使用 `GET https://apiv2.lxll.com/customer/training/orders?pageNumber=1&pageSize=10&status=COMPLETED`
- 风险：迁移到 `rtc.lxll.com` 后，本仓库当前默认可能改为走代理，和线上真实行为不一致。

### 5.3 `schedule-course-match.js`

功能点：排课页 API 查询策略

- `resolveBoardQueryPlan(hostname)`
- `resolveCompletedQueryPlan(hostname)`
- 当前逻辑：
  - `h5.lxll.com` => 直连 `apiv2`
  - `.onrender.com` => 直连 `apiv2`
  - 其他 host => 走 Netlify 代理
- 风险：这是迁移后行为变化的主控制点，不确认策略前不能盲改。

### 5.4 复杂度收缩结论

如果确认移除“浏览器扩展 `copy-word-2026`”和“正式课页面查看课时数”，本次迁移会更简单，原因如下：

1. 少掉浏览器扩展白名单与脚本注入兼容问题。
2. 少掉一条重复的 `CustomerTeacherListClient` 查询入口。
3. 联调页面从“首页 + 正式课页 + 排课总览页 + 插件”收缩为“排课总览页”。
4. 迁移核心将集中在两个问题：
   - `CustomerTeacherListClient` 是否接受 `rtc` 来源
   - `schedule-board` / completed orders 在 `rtc` 下是直连还是走代理

当前判断：是，更简单，但仍不能跳过后端确认。

## 6. 后端与新 API 的前置确认项（Gate 0）

在任何前端替换开始前，后端需要先确认以下问题。

### 6.1 域名来源兼容

1. `https://api.lxll.com/request/CustomerTeacherListClient` 是否接受：
   - `Origin: https://rtc.lxll.com`
   - `Referer: https://rtc.lxll.com/`
2. 该项已实测确认：接受。
3. 当前剩余问题转为前端是否继续手写来源头，以及是否改为动态来源头。

### 6.2 `apiv2` 直连策略

1. `https://apiv2.lxll.com/customer/training/board` 是否允许从 `rtc.lxll.com` 直连。
2. `https://apiv2.lxll.com/customer/training/orders?...&status=COMPLETED` 是否允许从 `rtc.lxll.com` 直连。
3. 若不允许直连：
   - 是否统一要求通过 `/.netlify/functions/schedule-board` 代理
   - 或后端是否提供新的 BFF / 网关 API

补充说明：本次 `curl` 实测已确认这两类 `apiv2` 接口接受真实 `rtc` 来源，因此这里待决定的主要是“前端是否要与线上一样走直连”，而不是“后端是否支持”。

### 6.3 认证兼容

1. 当前 `x-token-c`、`x-user-id`、`authorization: Bearer` 是否继续适用于 `rtc.lxll.com` 场景。
2. 登录后 token 获取流程是否仍保持不变。
3. 若 `rtc` 使用新登录体系，需后端提供新的 token 获取方式与字段说明。

### 6.4 新 API 口径确认

若后端要求前端改为“new api”而不是继续访问现有 `api.lxll.com` / `apiv2.lxll.com`，至少需要明确：

1. 新 API base URL
2. 鉴权方式
3. 请求方法与请求头
4. 返回字段是否兼容当前前端消费逻辑
5. 分页参数与排序口径
6. CORS / 来源域名策略

当前结论：仓库内没有可供前端直接切换的“new api”定义，因此该项必须由后端先给出。

## 7. 改造策略建议

### 7.1 建议的实施顺序

1. 先拿到后端对 Gate 0 的明确答复。
2. 再决定本次迁移属于哪一种方案：
   - 方案 A：仅替换前端域名与白名单
   - 方案 B：替换域名 + 调整直连/代理策略
   - 方案 C：替换域名 + 切换到新 API
3. 基于最终方案补测试，再改代码，再逐页联调。

补充：截至本轮验证，方案 C 没有证据支撑，应优先按方案 B 处理。

### 7.2 建议的实现原则

1. 不在多处散落写死域名，统一抽成配置常量。
2. 不把“是否直连”直接绑定单个 host 字符串，改成可配置环境判断。
3. 对 `origin/referer` 统一封装，避免页面间漏改。
4. 先删除重复能力，再做域名迁移，避免为即将移除的入口做适配。
5. 不要把 `apiv2.lxll.com` / `api.lxll.com` 机械替换成 `rtc.lxll.com`；应以实测请求和后端确认结果为准。

## 8. 联调与验收顺序

### 8.1 联调前置

1. 用户登录 `rtc.lxll.com`。
2. 打开 Chrome DevTools / MCP 观察 Network。
3. 逐功能核对：
   - 请求 URL
   - 请求方法
   - 请求头中的 `origin` / `referer`
   - 响应状态码
   - 响应 payload 结构

### 8.2 联调顺序

1. 排课总览页“查看课时数”
2. 排课总览页“最近 7 天排课匹配”
3. 排课总览页“按实际上课生成工资统计”

补充：本次已通过外部 `rtc` 站点实测确认“最近7天预约训练”和“训练记录已完成”对应的上游接口与字段结构，可作为排课匹配与工资统计的回归基线。

### 8.3 验收标准

1. 所有保留范围内功能在 `rtc.lxll.com` 下可正常拉取数据。
2. 不出现因 `origin/referer` 或 CORS 导致的 401/403/跨域失败。
3. 排课匹配与工资统计的“直连/代理”行为符合后端确认的目标方案。
4. 排课匹配依赖的 `board` 响应结构，与工资统计依赖的 `completed orders` 响应结构，不因迁移发生字段回归。

## 9. 风险与应对

1. 风险：后端只接受 `h5.lxll.com` 来源。
   - 应对：后端放开 `rtc` 域名，或前端改走代理/新 API。

2. 风险：`rtc.lxll.com` 下 `apiv2` 直连被拦截。
   - 应对：统一切代理，或由后端补充 CORS/网关策略。

3. 风险：后端给出 new api，但字段不兼容旧前端。
   - 应对：先出接口对照表，再实施前端适配。

## 10. 待确认项

1. `rtc.lxll.com` 是否只是前端新入口，还是配套新的后端 API 域名。
2. 后端口中的“new api”具体指哪一组接口。
3. `CustomerTeacherListClient` 是否会继续保留，还是被新接口替代。
4. `apiv2` 相关接口在 `rtc` 环境下的推荐接入方式是直连还是代理。
5. 排课总览页“查看课时数”是否也应进一步从产品范围中移除。

## 11. 执行建议

在后端未给出 Gate 0 答复前，不建议直接提交“全量替换 `h5.lxll.com` 为 `rtc.lxll.com`”的代码改动。

已确认删除“浏览器扩展 `copy-word-2026`”和“正式课页面查看课时数”后，建议在此基础上再开始域名迁移。这样可以减少迁移时必须兜住的接口与页面数量。

建议下一步先由后端明确：

1. `rtc` 是否继续使用现有接口
2. 如果不是，new api 的 base URL 与鉴权规则是什么
3. 哪些接口允许前端直连，哪些必须走代理