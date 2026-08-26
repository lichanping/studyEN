from scripts.convert_exam_question_bank import partition_valid_questions, parse_document_xml, validate_questions


def cell(text="", answer=False, merge=None):
    answer_style = '<w:highlight w:val="red"/>' if answer else ""
    merge_style = f'<w:tcPr><w:vMerge w:val="{merge}"/></w:tcPr>' if merge else ""
    return f"""
    <w:tc>
      {merge_style}
      <w:p><w:r><w:rPr>{answer_style}</w:rPr><w:t>{text}</w:t></w:r></w:p>
    </w:tc>
    """


def row(*values):
    return f"<w:tr>{''.join(values)}</w:tr>"


def document(*rows):
    return f"""<?xml version="1.0" encoding="UTF-8"?>
    <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:body><w:tbl>{''.join(rows)}</w:tbl></w:body>
    </w:document>
    """.encode()


def test_parse_document_xml_recovers_question_types_answers_and_continuations():
    xml = document(
        row(cell("序号"), cell("类型"), cell("题目"), cell("选项1"), cell("选项2"), cell("选项3")),
        row(cell("1"), cell("单选题"), cell("安全生产应当以什么为本？"), cell("人民", answer=True), cell("设备"), cell("效率")),
        row(cell(""), cell(""), cell("（请选择一项）"), cell(), cell(), cell()),
        row(cell("401"), cell("多选题"), cell("哪些属于防护用品？"), cell("安全帽", answer=True), cell("安全带", answer=True), cell("纸张")),
        row(cell("1201"), cell("判断题"), cell("进入现场应佩戴安全帽。"), cell("正确", answer=True), cell("错误"), cell()),
    )

    questions = parse_document_xml(xml)

    assert questions == [
        {
            "id": "source-1",
            "sourceNumber": 1,
            "type": "single",
            "question": "安全生产应当以什么为本？（请选择一项）",
            "options": [
                {"id": "A", "text": "人民"},
                {"id": "B", "text": "设备"},
                {"id": "C", "text": "效率"},
            ],
            "answers": ["A"],
        },
        {
            "id": "source-401",
            "sourceNumber": 401,
            "type": "multiple",
            "question": "哪些属于防护用品？",
            "options": [
                {"id": "A", "text": "安全帽"},
                {"id": "B", "text": "安全带"},
                {"id": "C", "text": "纸张"},
            ],
            "answers": ["A", "B"],
        },
        {
            "id": "source-1201",
            "sourceNumber": 1201,
            "type": "boolean",
            "question": "进入现场应佩戴安全帽。",
            "options": [
                {"id": "A", "text": "正确"},
                {"id": "B", "text": "错误"},
            ],
            "answers": ["A"],
        },
    ]
    validate_questions(questions)


def test_validate_questions_rejects_partial_multiple_choice_answer():
    questions = [{
        "id": "source-9",
        "sourceNumber": 9,
        "type": "multiple",
        "question": "请选择两项",
        "options": [{"id": "A", "text": "甲"}, {"id": "B", "text": "乙"}],
        "answers": ["A"],
    }]

    try:
        validate_questions(questions)
    except ValueError as error:
        assert "multiple" in str(error)
    else:
        raise AssertionError("multiple-choice questions with one answer must be rejected")


def test_parse_document_xml_rebuilds_question_split_before_its_numbered_row():
    xml = document(
        row(cell("95"), cell("单选题"), cell("上一题"), cell("甲"), cell("乙", answer=True), cell("丙"), cell("")),
        row(cell(""), cell(""), cell(""), cell("前缀甲"), cell("前缀乙"), cell("前缀丙"), cell("", merge="restart")),
        row(cell("96"), cell("单选题"), cell("下一题"), cell("后缀甲"), cell("后缀乙"), cell("后缀丙", answer=True), cell("", merge="continue")),
        row(cell(""), cell(""), cell("题干结尾"), cell(), cell(), cell("选项结尾"), cell("", merge="continue")),
    )

    questions = parse_document_xml(xml)

    assert questions[0]["question"] == "上一题"
    assert [option["text"] for option in questions[0]["options"]] == ["甲", "乙", "丙"]
    assert questions[1]["sourceNumber"] == 96
    assert questions[1]["question"] == "下一题题干结尾"
    assert [option["text"] for option in questions[1]["options"]] == [
        "前缀甲后缀甲",
        "前缀乙后缀乙",
        "前缀丙后缀丙选项结尾",
    ]
    assert questions[1]["answers"] == ["C"]


def test_partition_valid_questions_reports_invalid_answers_without_losing_valid_questions():
    valid = {
        "id": "source-1",
        "sourceNumber": 1,
        "type": "boolean",
        "question": "有效题",
        "options": [{"id": "A", "text": "正确"}, {"id": "B", "text": "错误"}],
        "answers": ["A"],
    }
    missing_answer = {**valid, "id": "source-2", "sourceNumber": 2, "answers": []}
    conflicting_answer = {**valid, "id": "source-3", "sourceNumber": 3, "answers": ["A", "B"]}

    accepted, rejected = partition_valid_questions([valid, missing_answer, conflicting_answer])

    assert accepted == [valid]
    assert [item["sourceNumber"] for item in rejected] == [2, 3]
    assert all(item["reason"] for item in rejected)