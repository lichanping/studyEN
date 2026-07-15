function normalizeWordAudioText(value) {
    return String(value || "").trim();
}

export const WORD_AUDIO_SPELLING_LETTER_ASSET_DIR = "static/sounds/spelling-letters";

export const WORD_AUDIO_SPELLING_SPEED_PRESETS = Object.freeze({
    slow: Object.freeze({ rate: "+0%", pauseFrames: 3 }),
    medium: Object.freeze({ rate: "+20%", pauseFrames: 2 }),
    fast: Object.freeze({ rate: "+60%", pauseFrames: 0 })
});

export const WORD_AUDIO_RATES = Object.freeze({
    english: "+30%",
    chinese: "+30%"
});

export function normalizeWordAudioSpellingSpeedPreset(value) {
    const normalizedValue = String(value || "").trim().toLowerCase();
    return Object.prototype.hasOwnProperty.call(WORD_AUDIO_SPELLING_SPEED_PRESETS, normalizedValue)
        ? normalizedValue
        : "medium";
}

export function spellOutWordForTts(word) {
    const normalizedWord = normalizeWordAudioText(word);
    if (!normalizedWord) return [];

    return normalizedWord
        .split(/\s+/)
        .map((token) => token.replace(/[^A-Za-z0-9]/g, ""))
        .filter(Boolean)
    .flatMap((token) => Array.from(token.toUpperCase()));
}

export function getWordAudioLetterAssetPath(letter) {
    const normalizedLetter = String(letter || "").trim().toUpperCase();
    return normalizedLetter ? `${WORD_AUDIO_SPELLING_LETTER_ASSET_DIR}/${normalizedLetter}.mp3` : "";
}

function buildNormalizedWordAudioWordPair(wordPair) {
    return {
        english: normalizeWordAudioText(wordPair?.english),
        chinese: normalizeWordAudioText(wordPair?.chinese),
        spellingWord: normalizeWordAudioText(wordPair?.spellingWord || wordPair?.english),
    };
}

export function buildWordAudioRequestPayload(wordPair, spellingEnabled = false, spellingSpeedPreset = "medium") {
    return {
        ...buildNormalizedWordAudioWordPair(wordPair),
        spellingEnabled: Boolean(spellingEnabled),
        spellingSpeedPreset: normalizeWordAudioSpellingSpeedPreset(spellingSpeedPreset)
    };
}

export function buildWordAudioBatchRequestPayload(wordPairs, spellingEnabled = false, spellingSpeedPreset = "medium") {
    return {
        wordPairs: Array.isArray(wordPairs) ? wordPairs.map(buildNormalizedWordAudioWordPair).filter((wordPair) => wordPair.english) : [],
        spellingEnabled: Boolean(spellingEnabled),
        spellingSpeedPreset: normalizeWordAudioSpellingSpeedPreset(spellingSpeedPreset)
    };
}

export function buildWordAudioSegments({ english, chinese, spellingWord, spellingEnabled = false }) {
    const normalizedEnglish = normalizeWordAudioText(english);
    const normalizedChinese = normalizeWordAudioText(chinese);
    const normalizedSpellingWord = normalizeWordAudioText(spellingWord) || normalizedEnglish;

    if (!normalizedEnglish) return [];

    const segments = [
        { kind: "english", lang: "en", text: normalizedEnglish },
        { kind: "english", lang: "en", text: normalizedEnglish }
    ];

    if (spellingEnabled) {
        const spellingLetters = spellOutWordForTts(normalizedSpellingWord);
        if (spellingLetters.length > 0) {
            spellingLetters.forEach((letter) => {
                segments.push({
                    kind: "spelling",
                    lang: "en",
                    letter,
                    assetPath: getWordAudioLetterAssetPath(letter),
                });
            });
            segments.push({ kind: "english", lang: "en", text: normalizedEnglish });
        }
    }

    if (normalizedChinese) {
        segments.push({ kind: "chinese", lang: "zh", text: normalizedChinese });
    }

    return segments;
}

export function getWordAudioRateForSegment(segment, spellingSpeedPreset = "medium") {
    if (segment?.kind === "spelling") return null;
    if (segment?.lang === "zh") return WORD_AUDIO_RATES.chinese;
    return WORD_AUDIO_RATES.english;
}

export function getWordAudioVoiceForSegment(segment) {
    if (segment?.kind === "spelling") return null;
    if (segment?.lang === "zh") return "zh-CN-XiaoxiaoNeural";
    return "en-US-EmmaNeural";
}

export function getWordAudioTextForSegment(segment) {
    if (segment?.kind === "spelling") return "";
    return String(segment?.text || "");
}

export function getWordAudioPauseFramesAfterSegment(currentSegment, nextSegment, spellingSpeedPreset = "medium") {
    if (currentSegment?.kind === "spelling" && nextSegment?.kind === "spelling") {
        return WORD_AUDIO_SPELLING_SPEED_PRESETS[normalizeWordAudioSpellingSpeedPreset(spellingSpeedPreset)].pauseFrames;
    }
    return 6;
}