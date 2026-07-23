#!/usr/bin/env python3

from __future__ import annotations

import argparse
import array
import shutil
import subprocess
import tempfile
import wave
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent.parent
DEFAULT_LETTERS_DIR = ROOT_DIR / "static" / "sounds" / "spelling-letters"
SILENCE_THRESHOLD = 700
TRIM_PADDING_MS = 20


def run_command(args: list[str]) -> None:
    subprocess.run(args, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def decode_mp3_to_wav(source_mp3: Path, decoded_wav: Path) -> None:
    run_command(["afconvert", "-f", "WAVE", "-d", "LEI16", str(source_mp3), str(decoded_wav)])


def write_trimmed_mono_wav(source_wav: Path, trimmed_wav: Path) -> tuple[float, float]:
    with wave.open(str(source_wav), "rb") as reader:
        sample_rate = reader.getframerate()
        sample_width = reader.getsampwidth()
        channel_count = reader.getnchannels()
        frame_count = reader.getnframes()
        pcm_bytes = reader.readframes(frame_count)

    if sample_width != 2:
        raise ValueError(f"Unsupported sample width: {sample_width}")

    interleaved_samples = array.array("h")
    interleaved_samples.frombytes(pcm_bytes)

    if channel_count == 1:
        mono_samples = interleaved_samples
    else:
        mono_samples = array.array("h")
        for index in range(0, len(interleaved_samples), channel_count):
            mono_samples.append(sum(interleaved_samples[index:index + channel_count]) // channel_count)

    original_seconds = len(mono_samples) / sample_rate
    trim_padding_frames = int(sample_rate * TRIM_PADDING_MS / 1000)

    non_silent_indices = [index for index, sample in enumerate(mono_samples) if abs(sample) >= SILENCE_THRESHOLD]
    if non_silent_indices:
        start_index = max(0, non_silent_indices[0] - trim_padding_frames)
        end_index = min(len(mono_samples), non_silent_indices[-1] + trim_padding_frames + 1)
        trimmed_samples = mono_samples[start_index:end_index]
    else:
        trimmed_samples = mono_samples

    trimmed_seconds = len(trimmed_samples) / sample_rate

    with wave.open(str(trimmed_wav), "wb") as writer:
        writer.setnchannels(1)
        writer.setsampwidth(2)
        writer.setframerate(sample_rate)
        writer.writeframes(trimmed_samples.tobytes())

    return original_seconds, trimmed_seconds


def resample_wav_to_24k_mono(source_wav: Path, resampled_wav: Path) -> None:
    run_command([
        "afconvert",
        "-f",
        "WAVE",
        "-d",
        "LEI16@24000",
        "-c",
        "1",
        str(source_wav),
        str(resampled_wav),
    ])


def encode_wav_to_mp3(source_wav: Path, target_mp3: Path) -> None:
    run_command(["lame", "-b", "48", "-m", "m", str(source_wav), str(target_mp3)])


def normalize_letter_mp3(letter_mp3: Path) -> tuple[float, float]:
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        decoded_wav = temp_path / "decoded.wav"
        trimmed_wav = temp_path / "trimmed.wav"
        resampled_wav = temp_path / "resampled.wav"
        normalized_mp3 = temp_path / "normalized.mp3"

        decode_mp3_to_wav(letter_mp3, decoded_wav)
        original_seconds, trimmed_seconds = write_trimmed_mono_wav(decoded_wav, trimmed_wav)
        resample_wav_to_24k_mono(trimmed_wav, resampled_wav)
        encode_wav_to_mp3(resampled_wav, normalized_mp3)
        shutil.move(str(normalized_mp3), str(letter_mp3))

    return original_seconds, trimmed_seconds


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Normalize spelling letter MP3 assets for safe Edge TTS concatenation.")
    parser.add_argument("letters_dir", nargs="?", default=str(DEFAULT_LETTERS_DIR))
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    letters_dir = Path(args.letters_dir).resolve()
    letter_files = sorted(letters_dir.glob("*.mp3"))
    if len(letter_files) != 26:
        raise SystemExit(f"Expected 26 MP3 files in {letters_dir}, found {len(letter_files)}")

    for letter_file in letter_files:
        original_seconds, trimmed_seconds = normalize_letter_mp3(letter_file)
        print(f"{letter_file.name}: {original_seconds:.3f}s -> {trimmed_seconds:.3f}s")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())