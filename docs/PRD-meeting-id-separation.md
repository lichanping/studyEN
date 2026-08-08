# 正课与抗遗忘复习腾讯会议号区分 PRD

文档日期：2026-08-05  
版本：v1.0

## 1. 背景

当前所有平台的通知功能（正课发送通知、抗遗忘通知、体验课通知、阅读课通知）共用同一个腾讯会议号 `meetingId`。业务上需要让同一平台的**正课**和**抗遗忘复习**使用不同的腾讯会议号，以便分开管理不同类型的课程。

## 2. 目标

1. 每个平台支持配置两个独立的腾讯会议号：正课会议号（`meetingId`）和抗遗忘会议号（`antiForgettingMeetingId`）。
2. 抗遗忘通知自动使用抗遗忘会议号，正课/体验课/阅读课通知继续使用正课会议号。
3. 三个平台（李校来啦、百分缔、麦穗英语）全部支持。
4. 向后兼容：如果某平台未配置 `antiForgettingMeetingId`，自动回退到 `meetingId`。

## 3. 范围

### In Scope

1. `meeting-config.js` 配置结构扩展，新增 `antiForgettingMeetingId` 字段。
2. 新增 `getAntiForgettingMeetingIdByPlatform()` 和 `getAntiForgettingTencentMeetingTagByPlatform()` 方法。
3. 抗遗忘通知调用点改用抗遗忘会议号（2 处）。
4. 正课/体验课/阅读课通知保持不变，继续使用正课会议号。

### Out of Scope

1. 不新增 UI 配置界面，会议号直接在 `meeting-config.js` 中硬编码。
2. 不修改体验课、阅读课的通知逻辑。
3. 不修改 `schedule.html` 正课发送通知逻辑（已按 entry.platform 区分，无需改动）。

## 4. 配置变更

### 4.1 当前配置

```js
PLATFORM_CONFIGS = {
    lixiaolaila:  { id: "lixiaolaila",  displayName: "李校来啦", meetingId: "957-2306-5683" },
    baifendii:    { id: "baifendii",    displayName: "百分缔",   meetingId: "684-1587-8369" },
    maisuiyingyu: { id: "maisuiyingyu", displayName: "麦穗英语", meetingId: "569-8084-0547" }
}
```

### 4.2 变更后配置

```js
PLATFORM_CONFIGS = {
    lixiaolaila:  { id: "lixiaolaila",  displayName: "李校来啦", meetingId: "957-2306-5683", antiForgettingMeetingId: "957-2306-5683" },
    baifendii:    { id: "baifendii",    displayName: "百分缔",   meetingId: "684-1587-8369", antiForgettingMeetingId: "684-1587-8369" },
    maisuiyingyu: { id: "maisuiyingyu", displayName: "麦穗英语", meetingId: "569-8084-0547", antiForgettingMeetingId: "569-8084-0547" }
}
```

> 初始值与现有 `meetingId` 一致（placeholder），后续按需替换为实际抗遗忘会议号。

## 5. 技术方案

### 5.1 文件：`meeting-config.js`

**变更 1：PLATFORM_CONFIGS 新增字段**

每个平台配置对象新增 `antiForgettingMeetingId` 字段。

**变更 2：新增 PLATFORM_ANTI_FORGETTING_MEETING_IDS 映射**

```js
const PLATFORM_ANTI_FORGETTING_MEETING_IDS = Object.freeze(Object.fromEntries(
    Object.values(PLATFORM_CONFIGS).map((platform) => [platform.id, platform.antiForgettingMeetingId || platform.meetingId])
));
```

回退逻辑：如果 `antiForgettingMeetingId` 未配置，使用 `meetingId` 兜底。

**变更 3：新增 API 方法**

```js
function getAntiForgettingMeetingIdByPlatform(platformId) {
    const normalized = normalizePlatformId(platformId);
    return PLATFORM_ANTI_FORGETTING_MEETING_IDS[normalized] || PLATFORM_ANTI_FORGETTING_MEETING_IDS[DEFAULT_PLATFORM_ID];
}

function getAntiForgettingTencentMeetingTagByPlatform(platformId) {
    return `#腾讯会议：${getAntiForgettingMeetingIdByPlatform(platformId)}`;
}

function getCurrentAntiForgettingTencentMeetingTag() {
    return getAntiForgettingTencentMeetingTagByPlatform(getCurrentPlatformId());
}
```

**变更 4：导出到 APP_MEETING_CONFIG**

```js
global.APP_MEETING_CONFIG = Object.freeze({
    // ... 现有字段保持不变
    getAntiForgettingMeetingIdByPlatform,
    getAntiForgettingTencentMeetingTagByPlatform,
    getCurrentAntiForgettingTencentMeetingTag,
    get antiForgettingMeetingId() {
        return getAntiForgettingMeetingIdByPlatform(getCurrentPlatformId());
    },
    get antiForgettingTencentMeetingTag() {
        return getCurrentAntiForgettingTencentMeetingTag();
    }
});
```

### 5.2 调用点变更

仅修改**抗遗忘通知**的 2 处调用，其余通知调用点不变。

| 文件 | 行号 | 当前调用 | 改为 |
|------|------|---------|------|
| `commonFunctions.js` | ~528 | `getCurrentTencentMeetingTag()` | `getCurrentAntiForgettingTencentMeetingTag()` |
| `schedule.html` | ~4261 | `getCurrentTencentMeetingTag()` | `getCurrentAntiForgettingTencentMeetingTag()` |

**不变的文件：**
- `classFormal.js` L419 — 正课通知，保持 `getCurrentTencentMeetingTag()`
- `classTrial.js` L252, L273 — 体验课通知，保持 `getCurrentTencentMeetingTag()`
- `classRead.js` L299, L301 — 阅读课通知，保持 `getCurrentTencentMeetingTag()`
- `schedule.html` L1363 — 正课发送通知 `getMeetingTagForEntry()`，保持 `getTencentMeetingTagByPlatform()`

## 6. 影响分析

### 6.1 向后兼容

- 现有 `meetingId`、`getMeetingIdByPlatform()`、`getTencentMeetingTagByPlatform()` 等 API 完全不变。
- 如果 `antiForgettingMeetingId` 未配置，自动回退到 `meetingId`，行为与当前一致。
- 现有测试 `test-meeting-config.js` 不受影响（只验证 `meetingId`）。

### 6.2 风险

- 低风险：仅新增字段和方法，不修改现有逻辑。
- 唯一风险点：抗遗忘通知的 2 处调用替换，需确认替换后输出格式一致（都是 `#腾讯会议：XXX` 格式）。

## 7. 验收标准

1. `meeting-config.js` 三个平台均包含 `antiForgettingMeetingId` 字段，初始值与 `meetingId` 相同。
2. `APP_MEETING_CONFIG` 暴露 `getAntiForgettingTencentMeetingTagByPlatform()` 和 `getCurrentAntiForgettingTencentMeetingTag()` 方法。
3. `commonFunctions.js` 抗遗忘提醒使用抗遗忘会议号。
4. `schedule.html` 抗遗忘通知按钮使用抗遗忘会议号。
5. 正课发送通知（`schedule.html` 和 `classFormal.js`）仍使用正课会议号，不受影响。
6. 体验课通知（`classTrial.js`）仍使用正课会议号，不受影响。
7. 阅读课通知（`classRead.js`）仍使用正课会议号，不受影响。
8. 将某平台的 `antiForgettingMeetingId` 改为不同值后，抗遗忘通知输出新会议号，正课通知仍输出旧会议号。
9. 现有 `test-meeting-config.js` 测试全部通过。
