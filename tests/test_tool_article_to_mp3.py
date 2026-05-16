from tool_article_to_mp3 import TextToSpeechConverter


def test_extract_english_article_skips_chinese_header():
    converter = TextToSpeechConverter()
    text = """训前准备原文

Scientists believe the Earth is 4.6 billion years old.
The Earth is always changing.
科学家认为地球已有46亿年的历史。
"""

    result = converter.extract_english_article(text)

    assert "Scientists believe the Earth is 4.6 billion years old." in result
    assert "The Earth is always changing." in result
    assert "科学家" not in result


def test_extract_english_article_handles_mixed_line():
    converter = TextToSpeechConverter()
    text = """训前准备原文
Scientists believe the Earth is 4.6 billion years old.科学家认为地球已有46亿年的历史。
"""

    result = converter.extract_english_article(text)

    assert result == "Scientists believe the Earth is 4.6 billion years old."
