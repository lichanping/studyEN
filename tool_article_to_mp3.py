import asyncio
import os
import time
import random

import edge_tts
from edge_tts import VoicesManager

from tool_generate_xls import get_sub_folder_path


class TextToSpeechConverter:
    def __init__(self):
        pass

    async def read_text_from_file(self, text_file_name):
        file_path = os.path.join(get_sub_folder_path(), text_file_name)
        with open(file_path, 'r', encoding='utf-8') as file:
            # Read the entire content of the file
            return file.read().strip()  # Remove leading/trailing whitespace

    async def process_text_file(self, text_file_name, output_folder):
        text_content = await self.read_text_from_file(text_file_name)

        # Create output file path
        output_file_name = text_file_name.replace(".txt", "") + ".mp3"
        output_file = os.path.join(output_folder, output_file_name)
        # Create VoicesManager instance
        voices = await VoicesManager.create()
        voice = voices.find(Gender="Female", Language="en")
        communicate = edge_tts.Communicate(text_content, random.choice(voice)["Name"])
        await communicate.save(output_file)

    async def convert_text_to_speech(self, text_file_names, output_folder):
        start_time = time.time()
        for text_file_name in text_file_names:
            await self.process_text_file(text_file_name, output_folder)
        end_time = time.time()  # Record end time
        elapsed_time = end_time - start_time  # Calculate elapsed time
        print(f"Total elapsed time: {elapsed_time:.2f} seconds")


if __name__ == "__main__":
    text_file_names = ["writing1.txt", "writing2.txt"]  # Specify the text file names here as a list
    output_folder = "article_to_mp3"  # Specify the output folder here
    output_folder_path = os.path.join(get_sub_folder_path(), output_folder)

    # Create the output folder if it doesn't exist
    os.makedirs(output_folder_path, exist_ok=True)

    converter = TextToSpeechConverter()
    asyncio.run(converter.convert_text_to_speech(text_file_names, output_folder_path))
