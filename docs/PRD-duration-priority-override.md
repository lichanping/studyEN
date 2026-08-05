# PRD: 课时时长（duration）跨页面优先级统一

## 问题背景

在"排课学生管理"页面修改学生课时后，切换到 index（正式课）页面时，时长下拉框仍显示旧值。
例如：邸睿在排课管理里已改为 30 分钟，但 index 页面选择邸睿后默认仍为 1 小时。

## 根因分析

### 当前各页面 duration 数据源

| 页面 | 文件 | duration 来源 | 是否读取 schedule-config-override |
|------|------|--------------|----------------------------------|
| 正式课 | classFormal.js | 硬编码 teacherData.duration | ❌ 否 |
| 阅读课 | classRead.js | 硬编码 teacherData.duration | ❌ 否 |
| 体验课 | classTrial.js | 平台默认值（按 platformId） | ❌ 否 |
| 排课页 | schedule.html | schedule-config + localStorage override | ✅ 是（数据源头） |
| 排课学生管理 | schedule-students-manage.js | schedule-config + localStorage override | ✅ 是（写入端） |

### 问题

- 排课管理写入 `schedule-config-override-v1` 到 localStorage
- classFormal / classRead / classTrial **完全不读取** schedule-config-override
- 三个页面各自维护独立的硬编码 duration，与排课数据源脱节

## 期望优先级（从高到低）

1. **localStorage override**（`schedule-config-override-v1`）— 用户在排课学生管理的自定义设置
2. **内置 schedule-config JSON**（schedule.html 中的默认排课配置）
3. **硬编码 teacherData**（classFormal.js / classRead.js 的 fallback）

## 实现方案

### 1. 新增共享函数 `resolveStudentDurationMinutes`

位置：`commonFunctions.js`（已有 schedule-config-override 相关逻辑）

```
输入：studentName, courseType（可选，用于匹配具体课程）
输出：durationMinutes（数字，如 30 或 60）

查找逻辑：
1. 读取 localStorage schedule-config-override-v1
2. 找到匹配 student + course 的 entry → 返回 entry.durationMinutes
3. 如果 override 无匹配，读取内置 schedule-config JSON
4. 找到匹配 entry → 返回 entry.durationMinutes
5. 如果仍无匹配，返回 null（由调用方 fallback）
```

### 2. 修改 classFormal.js `updateLabel()`

```
现有逻辑：
  let duration = userInfo.duration.toString()
  durationSelect.value = duration

修改为：
  const scheduleDurationMinutes = resolveStudentDurationMinutes(userName, "单词")
  if (scheduleDurationMinutes) {
      durationSelect.value = (scheduleDurationMinutes / 60).toString()
  } else {
      durationSelect.value = userInfo.duration.toString()  // fallback
  }
```

### 3. 修改 classRead.js `updateLabel2()`

同上逻辑，course 参数改为 "阅读"。

### 4. 修改 classTrial.js

体验课 duration 当前按平台默认值（李校来啦=1h，迈碎英语=0.5h），暂不改动。
体验课无固定课程类型，不适合从排课配置推导。

## 影响范围

- classFormal.js：updateLabel() 中 duration 设置
- classRead.js：updateLabel2() 中 duration 设置
- commonFunctions.js：新增 resolveStudentDurationMinutes 函数
- classTrial.js：不改动

## 验收标准

1. 在排课学生管理修改学生 duration → 刷新 index 页面 → 时长下拉框显示新值
2. 如果排课配置无该学生 → 仍使用硬编码 fallback
3. 阅读课页面同理
4. 全量测试通过
