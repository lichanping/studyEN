#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PYTHON_BIN="${PYTHON_BIN:-$ROOT_DIR/.venv/bin/python}"
FOLDER="${1:-!【5.0】【中级】-中阶-阅读50篇}"

if [[ ! -x "$PYTHON_BIN" ]]; then
  echo "Python executable not found: $PYTHON_BIN" >&2
  echo "Set PYTHON_BIN or create venv at .venv" >&2
  exit 1
fi

cd "$ROOT_DIR"

echo "Generating article audio for folder: $FOLDER"
"$PYTHON_BIN" - "$FOLDER" <<'PY'
import asyncio
import os
import sys

from tool_article_to_mp3 import TextToSpeechConverter
from tool_generate_xls import get_sub_folder_path

folder = sys.argv[1]
output_folder = os.path.join(get_sub_folder_path(), folder, "audio")
os.makedirs(output_folder, exist_ok=True)

asyncio.run(TextToSpeechConverter().convert_text_to_speech(folder, output_folder))
print(f"Audio output folder: {output_folder}")
PY
