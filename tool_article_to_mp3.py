import asyncio
import os
import re
import time

import edge_tts

from tool_generate_xls import get_sub_folder_path


class TextToSpeechConverter:
    NUMBERED_PARAGRAPH_PATTERN = re.compile(r"^\s*【\d+】\s*(.+?)\s*$")
    CJK_PATTERN = re.compile(r"[\u4e00-\u9fff]")
    SECTION_STOP_PATTERN = re.compile(r"^\s*(主旨大意|文章大意|中心思想|长难句|重点词汇|词汇|答案|解析|参考译文|参考答案)\s*[:：]?")
    HEADER_SKIP_PATTERN = re.compile(r"^\s*(训前准备原文|原文|阅读原文)\s*$")
    CJK_PAREN_SEGMENT_PATTERN = re.compile(r"[（(]([^）)]*[\u4e00-\u9fff][^）)]*)[）)]")

    def __init__(self, voice_name=None, rate="-10%"):
        self.voice_name = voice_name or "Microsoft Server Speech Text to Speech Voice (en-US, EmmaNeural)"
        self.rate = rate

    async def read_text_files(self, input_folder):
        # Get the path of the input folder
        input_folder_path = os.path.join(get_sub_folder_path(), input_folder)
        # Get the list of all text files in the input folder
        text_files = sorted([file for file in os.listdir(input_folder_path) if file.endswith('.txt')])
        return input_folder_path, text_files

    async def read_text_from_file(self, text_file_path):
        with open(text_file_path, 'r', encoding='utf-8') as file:
            # Read the entire content of the file
            return file.read().strip()  # Remove leading/trailing whitespace

    def extract_english_article(self, text_content):
        """Extract article content for TTS.

        Rule 1: Prefer lines like "【1】...".
        Rule 2: For mixed bilingual texts, keep English content first, then
        append Chinese explanations before summary/analysis sections.
        """
        lines = [line.strip() for line in text_content.splitlines() if line.strip()]

        numbered_lines = []
        for line in lines:
            match = self.NUMBERED_PARAGRAPH_PATTERN.match(line)
            if match:
                numbered_lines.append(match.group(1).strip())

        if numbered_lines:
            return "\n".join(numbered_lines)

        english_lines = []
        chinese_lines = []
        started = False

        for line in lines:
            if self.HEADER_SKIP_PATTERN.match(line):
                continue
            if self.SECTION_STOP_PATTERN.match(line):
                break

            has_cjk = bool(self.CJK_PATTERN.search(line))
            has_latin = bool(re.search(r"[A-Za-z]", line))

            if has_latin and has_cjk:
                glosses = [item.strip() for item in self.CJK_PAREN_SEGMENT_PATTERN.findall(line) if item.strip()]
                line_without_glosses = self.CJK_PAREN_SEGMENT_PATTERN.sub("", line)
                line_without_glosses = re.sub(r"[（(]\s*[）)]", "", line_without_glosses)

                if re.search(r"[A-Za-z]", line_without_glosses) and not self.CJK_PATTERN.search(line_without_glosses):
                    english_part = re.sub(r"\s+", " ", line_without_glosses).strip()
                    if re.search(r"[A-Za-z]", english_part):
                        english_lines.append(english_part)
                        started = True
                    if started:
                        chinese_lines.extend(glosses)
                    continue

                first_cjk = self.CJK_PATTERN.search(line)
                suffix = line[first_cjk.start():] if first_cjk else ""
                has_latin_after_cjk = bool(re.search(r"[A-Za-z]", suffix))

                if has_latin_after_cjk:
                    # Keep English sentence continuity when CJK only appears in inline glosses.
                    english_part = self.CJK_PAREN_SEGMENT_PATTERN.sub("", line)
                    english_part = re.sub(self.CJK_PATTERN, "", english_part)
                    english_part = re.sub(r"\s+", " ", english_part).strip()
                    english_part = english_part.replace("（）", "").replace("()", "")

                    if re.search(r"[A-Za-z]", english_part):
                        english_lines.append(english_part)
                        started = True

                    if started:
                        chinese_lines.extend(glosses)
                    continue

                english_part = line[:first_cjk.start()].strip() if first_cjk else ""
                chinese_part = suffix.strip()

                if re.search(r"[A-Za-z]", english_part):
                    english_lines.append(english_part)
                    started = True
                if started and self.CJK_PATTERN.search(chinese_part):
                    chinese_lines.append(chinese_part)
                continue

            if has_latin:
                english_lines.append(line)
                started = True
                continue

            if has_cjk and started:
                chinese_lines.append(line)

        if not english_lines:
            return ""
        if not chinese_lines:
            return "\n".join(english_lines).strip()
        return "\n".join(english_lines + chinese_lines).strip()

    def normalize_tts_text(self, text):
        """Clean punctuation to reduce cases where '.' is read as 'dot'."""
        cleaned = text
        # Normalize uncommon symbols found in source files.
        cleaned = cleaned.replace("﹣", "-")
        cleaned = cleaned.replace("，", ",")
        cleaned = cleaned.replace("。", ".")

        # Remove spaces before punctuation: "owl ." -> "owl."
        cleaned = re.sub(r"\s+([,.;:!?])", r"\1", cleaned)

        # Add a space after period between letters: St.Pancras -> St. Pancras
        cleaned = re.sub(r"(?<=[A-Za-z])\.(?=[A-Za-z])", ". ", cleaned)
        # Replace isolated dot tokens with comma pauses.
        cleaned = re.sub(r"\s+\.\s+", ", ", cleaned)
        # Collapse repeated dots.
        cleaned = re.sub(r"\.{2,}", ".", cleaned)
        # Normalize repeated spaces.
        cleaned = re.sub(r"[ \t]+", " ", cleaned)
        # Normalize blank lines.
        cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
        return cleaned.strip()

    async def process_text_file(self, text_file_name, input_folder_path, output_folder):
        # Create the input file path
        input_file_path = os.path.join(input_folder_path, text_file_name)
        text_content = await self.read_text_from_file(input_file_path)

        english_content = self.extract_english_article(text_content)
        if not english_content:
            print(f"Skip (no English article extracted): {text_file_name}")
            return False

        cleaned_content = self.normalize_tts_text(english_content)
        output_file_name = f"{text_file_name}".replace(".txt", "") + ".mp3"
        output_file = os.path.join(output_folder, output_file_name)
        tmp_output_file = output_file + ".tmp"

        last_error = None
        for attempt in range(1, 4):
            try:
                communicate = edge_tts.Communicate(cleaned_content, self.voice_name, rate=self.rate)
                await communicate.save(tmp_output_file)
                last_error = None
                break
            except Exception as exc:
                last_error = exc
                if os.path.exists(tmp_output_file):
                    os.remove(tmp_output_file)
                # Short backoff for transient network/DNS failures.
                await asyncio.sleep(attempt * 1.5)

        if last_error is not None:
            print(f"Failed (tts error): {text_file_name} | {last_error}")
            return False

        if os.path.exists(tmp_output_file) and os.path.getsize(tmp_output_file) > 0:
            os.replace(tmp_output_file, output_file)
            print(f"Generated: {output_file_name}")
            return True
        else:
            if os.path.exists(tmp_output_file):
                os.remove(tmp_output_file)
            print(f"Failed (empty output): {text_file_name}")
            return False

    async def convert_text_to_speech(self, input_folder, output_folder):
        start_time = time.time()
        # Read all text files from the input folder
        input_folder_path, text_files = await self.read_text_files(input_folder)
        success_count = 0
        failed_count = 0
        # Process each text file
        for text_file_name in text_files:
            ok = await self.process_text_file(text_file_name, input_folder_path, output_folder)
            if ok:
                success_count += 1
            else:
                failed_count += 1
        end_time = time.time()  # Record end time
        elapsed_time = end_time - start_time  # Calculate elapsed time
        print(f"Processed {len(text_files)} files in {elapsed_time:.2f} seconds")
        print(f"Success: {success_count}, Failed: {failed_count}")


if __name__ == "__main__":
    input_folder = "!【5.0】【中级】-中阶-阅读50篇"  # Relative to user_data/
    output_folder_path = os.path.join(get_sub_folder_path(), input_folder, "audio")

    # Create the output folder if it doesn't exist
    os.makedirs(output_folder_path, exist_ok=True)

    converter = TextToSpeechConverter()
    asyncio.run(converter.convert_text_to_speech(input_folder, output_folder_path))
