const assert = require("assert");
const { execFileSync } = require("child_process");
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
        segments.map((segment) => segment.text || segment.letter),
        ["book", "book", "B", "O", "O", "K", "book", "书本"],
        "spelling 开启时应按逐字母片段插入拼写和一次英文回读"
    );

    assert.deepStrictEqual(
        segments.slice(2, 6).map((segment) => segment.assetPath),
        [
            "static/sounds/spelling-letters/B.mp3",
            "static/sounds/spelling-letters/O.mp3",
            "static/sounds/spelling-letters/O.mp3",
            "static/sounds/spelling-letters/K.mp3",
        ],
        "spelling 开启时应引用本地字母音频资产"
    );
}

async function testWordAudioSegmentsShouldOmitChineseWhenMissing() {
    const { buildWordAudioSegments } = await loadWordAudioFormatModule();
    const segments = buildWordAudioSegments({ english: "book", chinese: "", spellingEnabled: true });

    assert.deepStrictEqual(
        segments.map((segment) => segment.text || segment.letter),
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
        segments.map((segment) => segment.text || segment.letter),
        ["- activity", "- activity", "A", "C", "T", "I", "V", "I", "T", "Y", "- activity", "活动"],
        "前缀词命中时，拼写应基于原单词而不是带前缀文本"
    );
}

async function testSpellingSegmentShouldUseLocalAssetInsteadOfTtsVoiceAndRate() {
    const { buildWordAudioSegments, getWordAudioRateForSegment, getWordAudioTextForSegment, getWordAudioVoiceForSegment } = await loadWordAudioFormatModule();
    const segments = buildWordAudioSegments({ english: "book", chinese: "书本", spellingEnabled: true });
    const normalRate = getWordAudioRateForSegment(segments[0]);
    const spellingRate = getWordAudioRateForSegment(segments[2], "medium");

    assert.strictEqual(normalRate, "+30%", "普通英文段应保持现有语速");
    assert.strictEqual(spellingRate, null, "spelling 本地资产段不应再请求 TTS 语速");
    assert.strictEqual(getWordAudioTextForSegment(segments[2]), "", "spelling 本地资产段不应再提供 TTS 文本");
    assert.strictEqual(getWordAudioVoiceForSegment(segments[2]), null, "spelling 本地资产段不应再提供 TTS speaker");
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
        buildWordAudioBatchRequestPayload,
        getWordAudioPauseFramesAfterSegment,
        normalizeWordAudioSpellingSpeedPreset,
    } = await loadWordAudioFormatModule();
    const segments = buildWordAudioSegments({ english: "book", chinese: "书本", spellingEnabled: true });
    const payload = buildWordAudioRequestPayload({ english: "book", chinese: "书本" }, true, "fast");
    const batchPayload = buildWordAudioBatchRequestPayload([
        { english: "book", chinese: "书本" },
        { english: "apple", chinese: "苹果" },
    ], true, "fast");

    assert.strictEqual(payload.spellingSpeedPreset, "fast", "payload 应透传 spellingSpeedPreset");
    assert.deepStrictEqual(
        batchPayload.wordPairs,
        [
            { english: "book", chinese: "书本", spellingWord: "book" },
            { english: "apple", chinese: "苹果", spellingWord: "apple" },
        ],
        "批量 payload 应一次性携带整份词表"
    );
    assert.strictEqual(batchPayload.spellingEnabled, true, "批量 payload 应共享 spellingEnabled 开关");
    assert.strictEqual(normalizeWordAudioSpellingSpeedPreset("unknown"), "medium", "非法 preset 应回退到 medium");
    assert.strictEqual(getWordAudioPauseFramesAfterSegment(segments[2], segments[3], "slow"), 3, "slow 档字母停顿应更长");
    assert.strictEqual(getWordAudioPauseFramesAfterSegment(segments[2], segments[3], "fast"), 0, "fast 档字母间不应再额外停顿");
}

function testMockLetterAudioFilesShouldExistForAllTwentySixLetters() {
    const lettersDir = path.resolve(__dirname, "../static/sounds/spelling-letters");
    const expectedFiles = Array.from({ length: 26 }, (_, index) => `${String.fromCharCode(65 + index)}.mp3`);

    assert(fs.existsSync(lettersDir), "应提供 static/sounds/spelling-letters 目录用于替换真人录音");

    expectedFiles.forEach((fileName) => {
        assert(
            fs.existsSync(path.join(lettersDir, fileName)),
            `应存在可替换的 mock 字母音频 ${fileName}`
        );
    });
}

function testMockLetterAudioFilesShouldMatchEdgeTtsMp3Encoding() {
    const lettersDir = path.resolve(__dirname, "../static/sounds/spelling-letters");
    const expectedFiles = Array.from({ length: 26 }, (_, index) => `${String.fromCharCode(65 + index)}.mp3`);

    expectedFiles.forEach((fileName) => {
        const filePath = path.join(lettersDir, fileName);
        const metadata = execFileSync("afinfo", [filePath], { encoding: "utf8" });

        assert(
            metadata.includes("Data format:     1 ch,  24000 Hz"),
            `${fileName} 应编码为 24kHz 单声道，避免破坏与 Edge TTS 的 MP3 拼接`
        );
        assert(
            metadata.includes("bit rate: 48000 bits per second"),
            `${fileName} 应编码为 48kbps，避免与 Edge TTS 的 MP3 帧参数不一致`
        );
    });
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
        commonFunctionsContent.includes("buildWordAudioBatchRequestPayload") && commonFunctionsContent.includes("wordPairs"),
        "commonFunctions.js 应一次性提交整份词表，避免按词逐个调用函数"
    );

    assert(
        functionContent.includes("wordPairs") && functionContent.includes("Buffer.concat(wordAudioBuffers)"),
        "generate-forget-words-audio.mjs 应在服务端一次性拼接整份词表音频"
    );

    assert(
        functionContent.includes("assetPath.startsWith(\"/\")") && functionContent.includes("new URL(normalizedAssetPath, requestUrl)") && functionContent.includes("fetch(assetUrl)"),
        "generate-forget-words-audio.mjs 应将字母音频资产固定解析到站点根路径，避免错误落到 /.netlify/functions/static"
    );
}

async function run() {
    await testWordAudioSegmentsShouldKeepLegacyOrderWhenSpellingDisabled();
    await testWordAudioSegmentsShouldInsertSpellingBetweenEnglishAndChinese();
    await testWordAudioSegmentsShouldOmitChineseWhenMissing();
    await testWordAudioSegmentsShouldUseBaseWordForSpellingWhenTtsPrefixExists();
    await testSpellingSegmentShouldUseLocalAssetInsteadOfTtsVoiceAndRate();
    await testSpellingBoundariesShouldUseShorterPauseThanNormalSegments();
    await testSpellingSpeedPresetShouldControlPayloadRateAndPause();
    testMockLetterAudioFilesShouldExistForAllTwentySixLetters();
    testMockLetterAudioFilesShouldMatchEdgeTtsMp3Encoding();
    testAudioRequestShouldReferenceSpellingFlagAcrossClientAndServer();
    console.log("test-word-audio-spelling passed");
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});