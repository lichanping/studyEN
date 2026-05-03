(function (global) {
    const MEETING_ID = "957-2306-5683";
    const TENCENT_MEETING_TAG = `#腾讯会议：${MEETING_ID}`;

    global.APP_MEETING_CONFIG = Object.freeze({
        meetingId: MEETING_ID,
        tencentMeetingTag: TENCENT_MEETING_TAG
    });
})(window);
