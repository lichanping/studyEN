import argparse
import json
import re
import zipfile
from pathlib import Path
from xml.etree import ElementTree


WORD_NAMESPACE = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
W = f"{{{WORD_NAMESPACE}}}"
TYPE_MAP = {
    "单选题": "single",
    "多选题": "multiple",
    "判断题": "boolean",
}


def _cell_text(cell):
    return "".join(node.text or "" for node in cell.iter(f"{W}t")).strip()


def _cell_is_answer(cell):
    for run in cell.iter(f"{W}r"):
        properties = run.find(f"{W}rPr")
        if properties is None:
            continue
        highlight = properties.find(f"{W}highlight")
        if highlight is not None and highlight.get(f"{W}val") in {"red", "yellow"}:
            return True
        color = properties.find(f"{W}color")
        if color is not None and color.get(f"{W}val", "").upper() in {"FF0000", "F73131"}:
            return True
    return False


def _append_text(existing, addition):
    if not addition:
        return existing
    return f"{existing}{addition}" if existing else addition


def _row_merge_marker(cells):
    if not cells:
        return None
    merge = cells[-1].find(f"./{W}tcPr/{W}vMerge")
    if merge is None:
        return None
    return merge.get(f"{W}val", "continue")


def _logical_rows(root):
    groups = []
    merged_group = None
    for table_row in root.iter(f"{W}tr"):
        cells = list(table_row.findall(f"{W}tc"))
        marker = _row_merge_marker(cells)
        if marker == "restart":
            if merged_group:
                groups.append(merged_group)
            merged_group = [cells]
        elif marker == "continue" and merged_group is not None:
            merged_group.append(cells)
        else:
            if merged_group:
                groups.append(merged_group)
                merged_group = None
            groups.append([cells])
    if merged_group:
        groups.append(merged_group)
    return groups


def parse_document_xml(xml_content):
    root = ElementTree.fromstring(xml_content)
    records = []
    current = None

    for row_group in _logical_rows(root):
        column_count = max((len(cells) for cells in row_group), default=0)
        if column_count < 3:
            continue
        values = ["" for _ in range(column_count)]
        answer_flags = [False for _ in range(column_count)]
        for cells in row_group:
            for index, cell in enumerate(cells):
                values[index] = _append_text(values[index], _cell_text(cell))
                answer_flags[index] = answer_flags[index] or _cell_is_answer(cell)
        source_match = re.fullmatch(r"\d+", values[0])
        if source_match and values[1] in TYPE_MAP:
            if current:
                records.append(current)
            current = {
                "source_number": int(values[0]),
                "type": TYPE_MAP[values[1]],
                "question": values[2],
                "options": values[3:8],
                "answer_flags": answer_flags[3:8],
            }
        elif current:
            current["question"] = _append_text(current["question"], values[2])
            for index, value in enumerate(values[3:8]):
                if index >= len(current["options"]):
                    current["options"].append(value)
                    current["answer_flags"].append(answer_flags[index + 3])
                else:
                    current["options"][index] = _append_text(current["options"][index], value)
                    current["answer_flags"][index] = (
                        current["answer_flags"][index] or answer_flags[index + 3]
                    )

    if current:
        records.append(current)

    questions = []
    for record in records:
        options = []
        answers = []
        for index, text in enumerate(record["options"]):
            if not text:
                continue
            option_id = chr(ord("A") + index)
            options.append({"id": option_id, "text": text})
            if record["answer_flags"][index]:
                answers.append(option_id)
        questions.append({
            "id": f"source-{record['source_number']}",
            "sourceNumber": record["source_number"],
            "type": record["type"],
            "question": record["question"],
            "options": options,
            "answers": answers,
        })
    return questions


def validate_questions(questions):
    seen_ids = set()
    for question in questions:
        question_id = question.get("id")
        if not question_id or question_id in seen_ids:
            raise ValueError(f"invalid or duplicate question id: {question_id}")
        seen_ids.add(question_id)
        question_type = question.get("type")
        if question_type not in TYPE_MAP.values():
            raise ValueError(f"invalid question type for {question_id}")
        if not question.get("question") or not question.get("options"):
            raise ValueError(f"missing question text or options for {question_id}")
        option_ids = {option["id"] for option in question["options"]}
        answers = question.get("answers", [])
        if not set(answers).issubset(option_ids):
            raise ValueError(f"answer outside options for {question_id}")
        if question_type in {"single", "boolean"} and len(answers) != 1:
            raise ValueError(f"{question_type} question must have one answer: {question_id}")
        if question_type == "multiple" and len(answers) < 2:
            raise ValueError(f"multiple question must have at least two answers: {question_id}")


def partition_valid_questions(questions):
    accepted = []
    rejected = []
    for question in questions:
        try:
            validate_questions([question])
        except ValueError as error:
            rejected.append({
                "sourceNumber": question.get("sourceNumber"),
                "question": question.get("question"),
                "reason": str(error),
            })
        else:
            accepted.append(question)
    return accepted, rejected


def convert_docx(input_path, output_path, report_path=None):
    with zipfile.ZipFile(input_path) as archive:
        parsed_questions = parse_document_xml(archive.read("word/document.xml"))
    questions, rejected = partition_valid_questions(parsed_questions)
    validate_questions(questions)
    Path(output_path).write_text(
        json.dumps({"questions": questions}, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    if report_path:
        Path(report_path).write_text(
            json.dumps({"rejected": rejected}, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
    return questions, rejected


def main():
    parser = argparse.ArgumentParser(description="Convert the B certificate DOCX question bank to JSON")
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--report", type=Path)
    args = parser.parse_args()
    questions, rejected = convert_docx(args.input, args.output, args.report)
    counts = {question_type: 0 for question_type in TYPE_MAP.values()}
    for question in questions:
        counts[question["type"]] += 1
    print(json.dumps({"total": len(questions), "counts": counts, "rejected": len(rejected)}, ensure_ascii=False))


if __name__ == "__main__":
    main()