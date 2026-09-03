from tool_article_to_mp3 import TextToSpeechConverter


def test_extract_english_article_skips_chinese_content():
    converter = TextToSpeechConverter()
    text = """训前准备原文

Scientists believe the Earth is 4.6 billion years old.
The Earth is always changing.
科学家认为地球已有46亿年的历史。
"""

    result = converter.extract_english_article(text)

    assert "Scientists believe the Earth is 4.6 billion years old." in result
    assert "The Earth is always changing." in result
    assert "科学家认为地球已有46亿年的历史。" not in result


def test_extract_english_article_handles_mixed_line():
    converter = TextToSpeechConverter()
    text = """训前准备原文
Scientists believe the Earth is 4.6 billion years old.科学家认为地球已有46亿年的历史。
"""

    result = converter.extract_english_article(text)

    assert result == "Scientists believe the Earth is 4.6 billion years old."


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
    assert "你是软饮料的受害者吗？" not in result
    assert "尽管有很多公共健康运动" not in result
    assert "主旨大意" not in result
    assert "长难句" not in result


def test_extract_english_article_keeps_sentence_after_inline_chinese_parenthetical():
    converter = TextToSpeechConverter()
    text = """Wag Tails
Researchers in Italy examined responses to a range of stimuli（刺激物） with video cameras.
"""

    result = converter.extract_english_article(text)

    assert "Researchers in Italy" in result
    assert "stimuli with video cameras" in result
    assert "with video cameras" in result
    assert "刺激物" not in result
    assert "stimuli（" not in result


def test_extract_english_article_handles_trailing_chinese_gloss_parenthetical():
    converter = TextToSpeechConverter()
    text = """Slide With Kids
The most common injury was lower leg fractures （骨折）.
"""

    result = converter.extract_english_article(text)

    assert "lower leg fractures" in result
    assert "fractures （" not in result
    assert "骨折" not in result


def test_extract_english_article_stops_at_translation_marker_for_english_only_mvp():
    converter = TextToSpeechConverter()
    for translation_marker in ("--- 中文翻译 ---", "【中文翻译】"):
        text = f"""Have you ever drunk the water directly from a river?
The water was cool and sweet.

{translation_marker}

你曾经直接喝过河水吗？
【重点单词】
directly /dəˈrektli/ adv. 直接地
【重点短语搭配】
bend down：弯腰
"""

        result = converter.extract_english_article(text)

        assert result == (
            "Have you ever drunk the water directly from a river?\n"
            "The water was cool and sweet."
        )


def test_extract_numbered_english_article_ignores_numbered_chinese_translation():
    converter = TextToSpeechConverter()
    text = """The Dancing Discovery
【1】Gillian Lynne never did well in school as a child.
【2】Everyone is special.
【中文翻译】
【1】Gillian小时候在学校表现一直不好。
【2】每个人都是独特的。
"""

    result = converter.extract_english_article(text)

    assert result == (
        "Gillian Lynne never did well in school as a child.\n"
        "Everyone is special."
    )
