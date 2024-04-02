import asyncio
import os
import random

import edge_tts
from edge_tts import VoicesManager

from generateXls import get_sub_folder_path

TEXT = "error message"
sound_folder = get_sub_folder_path('sounds')
OUTPUT_FILE = os.path.join(sound_folder, f"{TEXT}.mp3")


async def _main() -> None:
    voices = await VoicesManager.create()
    voice = voices.find(Gender="Female", Language="en")

    communicate = edge_tts.Communicate(TEXT, random.choice(voice)["Name"])
    await communicate.save(OUTPUT_FILE)


if __name__ == "__main__":
    asyncio.run(_main())
