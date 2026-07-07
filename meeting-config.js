(function (global) {
    const CURRENT_PLATFORM_STORAGE_KEY = "current-platform-v1";
    const DEFAULT_PLATFORM_ID = "lixiaolaila";
    const PLATFORM_MEETING_IDS = {
        lixiaolaila: "957-2306-5683",
        baifendii: "684-1587-8369"
    };

    function normalizePlatformId(raw) {
        const value = String(raw || "").trim().toLowerCase();
        if (value && PLATFORM_MEETING_IDS[value]) {
            return value;
        }
        return DEFAULT_PLATFORM_ID;
    }

    function getCurrentPlatformId() {
        try {
            const value = global.localStorage?.getItem(CURRENT_PLATFORM_STORAGE_KEY);
            return normalizePlatformId(value);
        } catch (_) {
            return DEFAULT_PLATFORM_ID;
        }
    }

    function getMeetingIdByPlatform(platformId) {
        const normalized = normalizePlatformId(platformId);
        return PLATFORM_MEETING_IDS[normalized] || PLATFORM_MEETING_IDS[DEFAULT_PLATFORM_ID];
    }

    function getTencentMeetingTagByPlatform(platformId) {
        return `#腾讯会议：${getMeetingIdByPlatform(platformId)}`;
    }

    function getCurrentTencentMeetingTag() {
        return getTencentMeetingTagByPlatform(getCurrentPlatformId());
    }

    global.APP_MEETING_CONFIG = Object.freeze({
        CURRENT_PLATFORM_STORAGE_KEY,
        defaultPlatformId: DEFAULT_PLATFORM_ID,
        platformMeetingIds: Object.freeze({ ...PLATFORM_MEETING_IDS }),
        normalizePlatformId,
        getCurrentPlatformId,
        getMeetingIdByPlatform,
        getTencentMeetingTagByPlatform,
        getCurrentTencentMeetingTag,
        get meetingId() {
            return getMeetingIdByPlatform(getCurrentPlatformId());
        },
        get tencentMeetingTag() {
            return getCurrentTencentMeetingTag();
        }
    });
})(window);
