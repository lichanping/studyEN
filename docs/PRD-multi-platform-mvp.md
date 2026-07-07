# 多平台扩展与学生管理灵活化（MVP）PRD

文档日期：2026-07-07  
版本：v1.0（MVP）

## 1. 背景

当前系统默认围绕单一平台“李校来啦”运行，存在两个问题：

1. 品牌与话术存在硬编码，无法自然扩展到“百分缔”等新平台。
2. 学生信息来源分散，新增学生虽可通过部分本地配置生效，但没有“平台维度”的统一管理，难以在多平台下保持一致。

## 2. 需求目标

### 2.1 业务目标

1. 平台从单平台扩展为多平台（首批包含“李校来啦”“百分缔”）。
2. 教练仍为一个人，但可在不同平台下维护独立学生池。
3. MVP 阶段实现“新增百分缔学生不需要改代码”，仅通过页面配置完成。

### 2.2 产品目标

1. 页面可切换“当前平台”。
2. 学生下拉按平台过滤，避免跨平台混用。
3. 话术中的平台名称可动态替换。
4. `schedule.html` 仍作为同一教练的统一排课视图，跨平台排课在同一时间轴统筹避免冲突。
5. 会议号按平台区分（李校来啦与百分缔独立会议号）。

## 3. 当前现状（与本需求相关）

1. 排课维护主入口：schedule-students-manage.html + schedule-students-manage.js（已支持本地覆盖与保留学生名）。
2. 课程页面学生来源存在多源合并，但不带平台字段：
- classFormal.js
- classRead.js
- classTrial.js
- anti-forgetting.html
3. 目前存在品牌硬编码文本：
- classTrial.js 中“希望你喜欢李校来啦这个平台”
- commonFunctions.js 中“我是【李校来啦】...”

## 4. MVP 范围

### 4.1 In Scope

1. 增加“平台”配置与切换能力。
2. 学生维护增加“所属平台”字段。
3. 各课程页面学生下拉按平台过滤。
4. 关键话术支持平台名动态化。
5. 保持现有本地存储方案（localStorage）以降低改造成本。

### 4.2 Out of Scope

1. 不引入后端数据库。
2. 不做多教练权限与账号隔离。
3. 不处理跨设备自动同步。

## 5. 页面改动清单（MVP）

### P0（必须改）

1. schedule-students-manage.html
- 新增“平台”字段（新增/编辑条目时可选）。
- 新增平台筛选器（只看某平台学生）。

2. schedule-students-manage.js
- 条目结构增加 platform 字段。
- ensureStudentRetained 扩展为按平台保留（避免同名跨平台污染）。
- 导出 JSON 包含平台字段。

3. schedule.html
- 顶部新增当前平台选择器。
- 排课列表展示维持“跨平台合并视图”，用于同一教练统筹时间避免冲突。
- `getConfig()` 新增平台维度读取能力（条目带 `platform` 字段），并可按场景做过滤。
- 所有会议提醒文案中的会议号按学生所属平台动态选择。
- 工资统计在 `schedule.html` 仅对“李校来啦”执行结算；切换到“百分缔”时提示“暂不支持工资统计”。
- 当 entry 无 platform 时，按默认平台兼容。

4. class-trial.html
- 增加平台选择控件（默认记忆上次选择）。

5. classTrial.js
- updateTrialUserOptions 按平台过滤学生。
- 抗遗忘结束语中平台名改为动态变量（例如：currentPlatform.displayName）。

6. index.html（正式课入口页）
- 增加平台选择控件。

7. classFormal.js
- getMergedStudentNames 支持按当前平台过滤。
- teacherData 仅作为历史兜底，不再作为唯一来源。
- `index.html` / `classFormal.js` 需支持按当前平台进行工资计算与导出（不受 `schedule.html` 的平台限制影响）。

8. class-read.html
- 增加平台选择控件。

9. classRead.js
- updateUserNameOptions2 支持按当前平台过滤。

10. commonFunctions.js
- 开场话术中的“李校来啦”改为动态平台名。

11. meeting-config.js
- 从单一会议号升级为“按平台会议号映射”。
- 提供统一方法供全局页面读取当前平台会议号。

### P1（建议本期顺带）

1. anti-forgetting.html
- 学生列表按平台过滤，保持与其他页面一致。

2. schedule-guide.md
- 补充“新增平台学生”操作说明。

## 6. 数据设计（MVP）

### 6.1 新增存储键

1. platform-config-v1
- 用于定义平台列表与默认平台。

示例：
{
  "defaultPlatform": "lixiaolaila",
  "platforms": [
    { "id": "lixiaolaila", "displayName": "李校来啦", "active": true },
    { "id": "baifendii", "displayName": "百分缔", "active": true }
  ]
}

2. current-platform-v1
- 记录当前页面选择的平台 id。

3. 会议号平台映射（建议放在 `meeting-config.js`）

示例：
{
  "lixiaolaila": "957-2306-5683",
  "baifendii": "684-1587-8369"
}

### 6.2 兼容扩展字段

1. schedule-config-override-v1.entries[].platform
2. custom-students-v1 从 string[] 升级为对象数组（或新增 custom-students-by-platform-v1）

推荐结构：
[
  { "name": "张三", "platform": "baifendii", "updatedAt": "2026-07-07T10:00:00Z" },
  { "name": "李四", "platform": "lixiaolaila", "updatedAt": "2026-07-07T10:05:00Z" }
]

兼容规则：旧 string 结构默认归属 defaultPlatform。

## 7. 核心流程（满足“不改代码新增百分缔学生”）

### 7.1 一次性上线后的日常操作

1. 进入排课学生管理页。
2. 选择平台为“百分缔”。
3. 新增学生并保存。
4. 在体验课/正式课/阅读课切换到“百分缔”后即可直接选择该学生。

### 7.2 关键前提

1. 平台及学生数据来源已统一为“配置驱动”。
2. 课程页面均支持平台过滤。

## 8. 验收标准（AC）

1. AC-01：平台可选“李校来啦”“百分缔”，并在页面刷新后保留最近选择。
2. AC-02：在“百分缔”新增学生后，无需改代码即可在体验课、正式课、阅读课下拉中看到。
3. AC-03：切回“李校来啦”时，默认不出现“百分缔”学生。
4. AC-04：旧数据不丢失，历史无 platform 字段条目可正常展示（归默认平台）。
5. AC-05：开场与结束话术中平台名随当前平台变化。
6. AC-06：`schedule.html` 在跨平台排课时可统一查看，避免同一教练时间冲突。
7. AC-07：百分缔学生的会议文案使用独立会议号 `#腾讯会议：684-1587-8369`。
8. AC-08：仅 `schedule.html` 在切换到百分缔平台时不执行工资统计，并有明确提示；`index.html` 仍可按当前平台计算工资。

## 9. 风险与应对

1. 风险：同名学生存在于不同平台。
- 应对：内部主键使用 name + platform，展示层仅显示 name。

2. 风险：旧数据结构混用。
- 应对：读取时做 schema 兼容转换，写入统一新结构。

3. 风险：部分页面忘记加平台过滤。
- 应对：抽出统一 helper（如 getCurrentPlatform、filterStudentsByPlatform）并复用。

## 10. 里程碑建议

1. M1（0.5 天）：完成数据结构与读取兼容。
2. M2（1 天）：完成 4 个主页面（排课、体验、正式、阅读）平台切换与过滤。
3. M3（0.5 天）：文案动态化 + 验收 + 回归。

## 11. 成功定义

上线后，新增“百分缔”学生不再需要改任何 JS/HTML 代码；仅通过页面维护即可完成新增与使用。

## 12. 开发任务拆解（执行清单）

### 12.1 任务 A：会议号平台化（P0）

1. 改造 `meeting-config.js` 为平台映射配置。
2. 增加统一读取接口（按平台 id 获取会议号、读取当前平台会议号）。
3. 全局替换会议号引用页面，确保不再假设单一会议号：
- `schedule.html`
- `classFormal.js`
- `classRead.js`
- `classTrial.js`
- `commonFunctions.js`

### 12.2 任务 B：schedule 跨平台统筹 + 会议号按学生平台（P0）

1. `schedule.html` 保持跨平台合并排课展示。
2. 每条提醒文案按学生所属平台注入对应会议号。
3. 对旧数据（无 platform）按 defaultPlatform 兼容。

### 12.3 任务 C：工资统计平台开关（P0）

1. `schedule.html` 工资统计仅在 `lixiaolaila` 平台执行；`baifendii` 平台点击时提示“暂不支持”。
2. `index.html` / `classFormal.js` 保持支持新平台工资计算（按当前平台口径统计与导出）。
3. 不改动李校来啦现有工资统计口径与导出格式。

### 12.4 任务 D：测试与回归（P0）

1. 更新 `tests/test-meeting-config.js`：校验平台会议号映射与统一接口。
2. 更新 `tests/test-schedule-salary-ui.js`：校验 `schedule.html` 中非李校平台禁用/阻断工资统计逻辑。
3. 更新 `classFormal.js` 对应测试：校验 `index.html` 仍支持新平台工资计算。
4. 运行相关测试并记录结果。

## 13. 本轮缺陷修复补充（2026-07-07）

### 13.1 修复范围

1. schedule.html
- 排课列表需展示学生所属平台（含基础排课与临时加课）。
- 课时检查（查看课时数）与工资生成均仅在李校平台可执行；非李校平台提示暂不支持。
- 抗遗忘通知需按平台使用对应会议号。
- 非李校平台学生不应出现在“异常学生”充值提示中。
- 临时加课表单新增平台选择，写入条目平台字段。

2. schedule-students-manage.html
- 管理页维护的平台字段应完整映射到 schedule.html 的排课展示。

3. class-trial.html / commonFunctions.js
- 体验课页面平台选择与开场话术平台名保持一致，避免显示错平台品牌名。

4. anti-forgetting.html
- 学员下拉需兼容 `custom-students-v1` 对象结构，禁止出现 `[object Object]` 脏数据。
- 学员列表增加平台信息，并支持按平台过滤展示。

### 13.2 补充验收标准（AC）

1. AC-09：schedule 页面每条排课可识别所属平台，临时加课创建后平台可见。
2. AC-10：在非李校平台点击“查看课时数”或“按实际上课生成工资统计”均给出不可用提示，且不触发异常学生充值文案。
3. AC-11：抗遗忘通知在李校/百分缔平台分别使用对应会议号。
4. AC-12：体验课开场话术中的平台品牌名与当前平台选择一致。
5. AC-13：anti-forgetting 学员下拉不出现 `[object Object]`，并能展示平台维度信息。