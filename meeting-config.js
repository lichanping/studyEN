(function (global) {
    const CURRENT_PLATFORM_STORAGE_KEY = "current-platform-v1";
    const DEFAULT_PLATFORM_ID = "lixiaolaila";
    const PLATFORM_CONFIGS = Object.freeze({
        lixiaolaila: Object.freeze({
            id: "lixiaolaila",
            displayName: "李校来啦",
            meetingId: "957-2306-5683"
        }),
        baifendii: Object.freeze({
            id: "baifendii",
            displayName: "百分缔",
            meetingId: "684-1587-8369"
        }),
        maisuiyingyu: Object.freeze({
            id: "maisuiyingyu",
            displayName: "麦穗英语",
            meetingId: "569-8084-0547"
        })
    });

    const PLATFORM_MEETING_IDS = Object.freeze(Object.fromEntries(
        Object.values(PLATFORM_CONFIGS).map((platform) => [platform.id, platform.meetingId])
    ));

    function getAllPlatforms() {
        return Object.values(PLATFORM_CONFIGS).map((platform) => ({ ...platform }));
    }

    function getPlatformDisplayName(platformId) {
        const normalized = normalizePlatformId(platformId);
        return PLATFORM_CONFIGS[normalized]?.displayName || PLATFORM_CONFIGS[DEFAULT_PLATFORM_ID].displayName;
    }

    function populatePlatformSelect(select, options = {}) {
        if (!select) return;
        const includeAllOption = options.includeAllOption === true;
        const allOptionLabel = options.allOptionLabel || "全部";
        const selectedValue = String(options.selectedValue || select.value || "").trim().toLowerCase();

        select.innerHTML = "";

        if (includeAllOption) {
            const allOption = global.document?.createElement("option");
            if (allOption) {
                allOption.value = "all";
                allOption.textContent = allOptionLabel;
                select.appendChild(allOption);
            }
        }

        getAllPlatforms().forEach((platform) => {
            const option = global.document?.createElement("option");
            if (!option) return;
            option.value = platform.id;
            option.textContent = platform.displayName;
            select.appendChild(option);
        });

        if (includeAllOption && selectedValue === "all") {
            select.value = "all";
            return;
        }

        select.value = normalizePlatformId(selectedValue || DEFAULT_PLATFORM_ID);
    }

    function normalizePlatformId(raw) {
        const value = String(raw || "").trim().toLowerCase();
        if (value && PLATFORM_CONFIGS[value]) {
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
        platforms: Object.freeze(getAllPlatforms()),
        getAllPlatforms,
        getPlatformDisplayName,
        populatePlatformSelect,
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
