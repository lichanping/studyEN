# PRD: 体验课 duration 从排课配置加载

## 问题背景

体验课是一次性的，通常通过 schedule 页面"临时加课"添加（含学生名、平台、课程类型"体验"、时长）。
但体验课页面（classTrial.js）当前完全不读取排课配置中的 duration，仅按平台给默认值（李校来啦=1h，迈碎英语=0.5h）。

## 期望行为

在体验课页面选择学生后：
1. 从 `schedule-extra-entries-v1`（临时加课）中查找该学生 + 当前平台的"体验"条目
2. 从 `schedule-config-override-v1`（排课覆盖配置）中查找该学生 + 当前平台的"体验"条目
3. 找到匹配条目 → 用 `entry.durationMinutes` 覆盖时长下拉框
4. 未找到 → 保持平台默认值（现有逻辑）

## 优先级（从高到低）

1. `schedule-extra-entries-v1` — 临时加课（最近添加的体验课）
2. `schedule-config-override-v1` — 排课覆盖配置中的体验条目
3. 平台默认值 — `getDefaultTrialDurationHours(platformId)`

## 数据源结构

### schedule-extra-entries-v1
```json
{
  "2026-08-05": [
    { "student": "张三", "course": "体验", "durationMinutes": 60, "platform": "lixiaolaila" }
  ]
}
```

### schedule-config-override-v1
```json
{
  "entries": [
    { "student": "张三", "course": "体验", "durationMinutes": 30, "platform": "lixiaolaila" }
  ]
}
```

## 实现方案

### 1. commonFunctions.js 新增 `resolveTrialDurationMinutes(studentName, platformId)`

```
查找逻辑：
1. 读取 schedule-extra-entries-v1，遍历所有日期的 entries
   → 找到 student + platform + course="体验" 匹配 → 返回 durationMinutes
2. 读取 schedule-config-override-v1 的 entries
   → 找到 student + platform + course="体验" 匹配 → 返回 durationMinutes
3. 未找到 → 返回 null
```

### 2. classTrial.js 新增 userName change 事件监听

```
userName select 变化时：
  const trialDuration = resolveTrialDurationMinutes(userName, platformId)
  if (trialDuration) {
      durationSelect.value = (trialDuration / 60).toString()
  } else {
      syncTrialDurationDefaultByPlatform()  // 回退到平台默认
  }
```

### 3. 页面加载时也触发一次

在 `updateTrialUserOptions` 完成后，对当前选中的学生执行同样的 duration 查找。

## 影响范围

- commonFunctions.js：新增 `resolveTrialDurationMinutes`
- classTrial.js：新增 userName change 监听 + 页面加载时覆盖

## 验收标准

1. schedule 临时添加体验课（30分钟） → 体验课页面选择该学生 → 时长显示 0.5 小时
2. 无排课配置的学生 → 仍使用平台默认值
3. 切换平台后 → 重新查找对应平台的排课配置
4. 全量测试通过
