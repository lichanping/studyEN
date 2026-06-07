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
    assert "科学家认为地球已有46亿年的历史。" in result
    assert result.index("The Earth is always changing.") < result.index("科学家认为地球已有46亿年的历史。")


def test_extract_english_article_handles_mixed_line():
    converter = TextToSpeechConverter()
    text = """训前准备原文
Scientists believe the Earth is 4.6 billion years old.科学家认为地球已有46亿年的历史。
"""

    result = converter.extract_english_article(text)

    assert result == "Scientists believe the Earth is 4.6 billion years old.\n科学家认为地球已有46亿年的历史。"


def test_extract_english_article_stops_before_summary_section():
    converter = TextToSpeechConverter()
    text = """Are You a Victim of Soft Drinks?
你是软饮料的受害者吗？

Despite many public health campaigns, many people still drink them.
尽管有很多公共健康运动，很多人仍然喝它们。

主旨大意：文章讲了软饮料风险。
长难句：This is a hard sentence.
"""

    result = converter.extract_english_article(text)

    assert "Are You a Victim of Soft Drinks?" in result
    assert "Despite many public health campaigns" in result
    assert "你是软饮料的受害者吗？" in result
    assert "尽管有很多公共健康运动" in result
    assert "主旨大意" not in result
    assert "长难句" not in result
