const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

async function loadWordAudioFormatModule() {
    const fileUrl = pathToFileURL(path.resolve(__dirname, "../word-audio-format.mjs")).href;
    return import(fileUrl);
}

async function testWordAudioSegmentsShouldKeepLegacyOrderWhenSpellingDisabled() {
    const { buildWordAudioSegments } = await loadWordAudioFormatModule();
    const segments = buildWordAudioSegments({ english: "book", chinese: "书本", spellingEnabled: false });

    assert.deepStrictEqual(
        segments.map((segment) => segment.text),
        ["book", "book", "书本"],
        "spelling 关闭时应保持现有 英文->英文->中文 顺序"
    );
}

async function testWordAudioSegmentsShouldInsertSpellingBetweenEnglishAndChinese() {
    const { buildWordAudioSegments } = await loadWordAudioFormatModule();
    const segments = buildWordAudioSegments({ english: "book", chinese: "书本", spellingEnabled: true });

    assert.deepStrictEqual(
        segments.map((segment) => segment.text),
        ["book", "book", "B", "O", "O", "K", "book", "书本"],
        "spelling 开启时应按逐字母片段插入拼写和一次英文回读"
    );
}

async function testWordAudioSegmentsShouldOmitChineseWhenMissing() {
    const { buildWordAudioSegments } = await loadWordAudioFormatModule();
    const segments = buildWordAudioSegments({ english: "book", chinese: "", spellingEnabled: true });

    assert.deepStrictEqual(
        segments.map((segment) => segment.text),
        ["book", "book", "B", "O", "O", "K", "book"],
        "缺少中文时不应追加空中文片段"
    );
}

async function testWordAudioSegmentsShouldUseBaseWordForSpellingWhenTtsPrefixExists() {
    const { buildWordAudioSegments } = await loadWordAudioFormatModule();
    const segments = buildWordAudioSegments({
        english: "- activity",
        spellingWord: "activity",
        chinese: "活动",
        spellingEnabled: true,
    });

    assert.deepStrictEqual(
        segments.map((segment) => segment.text),
        ["- activity", "- activity", "A", "C", "T", "I", "V", "I", "T", "Y", "- activity", "活动"],
        "前缀词命中时，拼写应基于原单词而不是带前缀文本"
    );
}

async function testSpellingSegmentShouldUseSlowerRateThanNormalEnglish() {
    const { buildWordAudioSegments, getWordAudioRateForSegment } = await loadWordAudioFormatModule();
    const segments = buildWordAudioSegments({ english: "book", chinese: "书本", spellingEnabled: true });
    const normalRate = getWordAudioRateForSegment(segments[0]);
    const spellingRate = getWordAudioRateForSegment(segments[2], "medium");

    assert.strictEqual(normalRate, "+30%", "普通英文段应保持现有语速");
    assert.strictEqual(spellingRate, "+20%", "spelling 段应进一步提速");
}

async function testSpellingSegmentsShouldUseDirectUppercaseLettersForTts() {
    const {
        buildWordAudioSegments,
        getWordAudioTextForSegment,
        getWordAudioVoiceForSegment,
    } = await loadWordAudioFormatModule();
    const segments = buildWordAudioSegments({ english: "book", chinese: "书本", spellingEnabled: true });
    const spellingTexts = segments.slice(2, 6).map((segment) => getWordAudioTextForSegment(segment));
    const spellingVoices = segments.slice(2, 6).map((segment) => getWordAudioVoiceForSegment(segment));

    assert.deepStrictEqual(spellingTexts, ["B", "O", "O", "K"], "book 的 spelling 应直接使用大写字母本身");
    assert.deepStrictEqual(
        spellingVoices,
        ["zh-CN-XiaoxiaoNeural", "zh-CN-XiaoxiaoNeural", "zh-CN-XiaoxiaoNeural", "zh-CN-XiaoxiaoNeural"],
        "spelling 段应统一使用中文 speaker"
    );
}

async function testSpellingBoundariesShouldUseShorterPauseThanNormalSegments() {
    const {
        buildWordAudioSegments,
        getWordAudioPauseFramesAfterSegment,
    } = await loadWordAudioFormatModule();
    const segments = buildWordAudioSegments({ english: "book", chinese: "书本", spellingEnabled: true });

    assert.strictEqual(
        getWordAudioPauseFramesAfterSegment(segments[0], segments[1]),
        6,
        "普通英文之间应保持现有 0.15s 停顿"
    );
    assert.strictEqual(
        getWordAudioPauseFramesAfterSegment(segments[2], segments[3], "medium"),
        2,
        "spelling 字母之间应再小幅缩短停顿"
    );
}

async function testSpellingSpeedPresetShouldControlPayloadRateAndPause() {
    const {
        buildWordAudioSegments,
        buildWordAudioRequestPayload,
        getWordAudioPauseFramesAfterSegment,
        getWordAudioRateForSegment,
        normalizeWordAudioSpellingSpeedPreset,
    } = await loadWordAudioFormatModule();
    const segments = buildWordAudioSegments({ english: "book", chinese: "书本", spellingEnabled: true });
    const payload = buildWordAudioRequestPayload({ english: "book", chinese: "书本" }, true, "fast");

    assert.strictEqual(payload.spellingSpeedPreset, "fast", "payload 应透传 spellingSpeedPreset");
    assert.strictEqual(normalizeWordAudioSpellingSpeedPreset("unknown"), "medium", "非法 preset 应回退到 medium");
    assert.strictEqual(getWordAudioRateForSegment(segments[2], "slow"), "+0%", "slow 档应保守一点");
    assert.strictEqual(getWordAudioRateForSegment(segments[2], "fast"), "+60%", "fast 档应明显更快");
    assert.strictEqual(getWordAudioPauseFramesAfterSegment(segments[2], segments[3], "slow"), 3, "slow 档字母停顿应更长");
    assert.strictEqual(getWordAudioPauseFramesAfterSegment(segments[2], segments[3], "fast"), 0, "fast 档字母间不应再额外停顿");
}

function testAudioRequestShouldReferenceSpellingFlagAcrossClientAndServer() {
    const commonFunctionsContent = fs.readFileSync(path.resolve(__dirname, "../commonFunctions.js"), "utf8");
    const functionContent = fs.readFileSync(
        path.resolve(__dirname, "../netlify/functions/generate-forget-words-audio.mjs"),
        "utf8"
    );

    assert(
        commonFunctionsContent.includes("spellingEnabled"),
        "commonFunctions.js 应向词汇音频接口透传 spellingEnabled"
    );

    assert(
        functionContent.includes("spellingEnabled"),
        "generate-forget-words-audio.mjs 应读取 spellingEnabled 决定音频顺序"
    );
}

async function run() {
    await testWordAudioSegmentsShouldKeepLegacyOrderWhenSpellingDisabled();
    await testWordAudioSegmentsShouldInsertSpellingBetweenEnglishAndChinese();
    await testWordAudioSegmentsShouldOmitChineseWhenMissing();
    await testWordAudioSegmentsShouldUseBaseWordForSpellingWhenTtsPrefixExists();
    await testSpellingSegmentShouldUseSlowerRateThanNormalEnglish();
    await testSpellingSegmentsShouldUseDirectUppercaseLettersForTts();
    await testSpellingBoundariesShouldUseShorterPauseThanNormalSegments();
    await testSpellingSpeedPresetShouldControlPayloadRateAndPause();
    testAudioRequestShouldReferenceSpellingFlagAcrossClientAndServer();
    console.log("test-word-audio-spelling passed");
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});