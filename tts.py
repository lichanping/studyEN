import os
import asyncio
import random
import time

import edge_tts
from edge_tts import VoicesManager

from generateXls import get_sub_folder_path


# Function to read texts from a text file
def read_texts_from_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as file:
        # Read each line and remove leading/trailing whitespace
        texts = [line.strip() for line in file.readlines() if line.strip()]
    return texts


# Path to the text file under user_data directory
text_file_path = os.path.join(get_sub_folder_path(), '吉李辰K-no sound.txt')

# Generate the TEXT_LIST from the text file
TEXT_LIST = read_texts_from_file(text_file_path)

# Get the sound folder path
sound_folder = get_sub_folder_path('sounds')


# Async function to process a single text and convert it to speech
async def process_text(text):
    # Create output file path for each text
    output_file = os.path.join(sound_folder, f"{text}.mp3")

    # Create VoicesManager instance
    voices = await VoicesManager.create()

    # Choose voice from the voice library
    voice = voices.find(Gender="Female", Language="en")

    # Use Edge TTS API to convert text to speech and save as MP3 file
    communicate = edge_tts.Communicate(text, random.choice(voice)["Name"])
    await communicate.save(output_file)


# Main function to process the entire TEXT_LIST
async def _main() -> None:
    start_time = time.time()  # Record start time
    # Create a list of tasks for processing each text
    tasks = [process_text(text) for text in TEXT_LIST]

    # Concurrently execute all tasks
    await asyncio.gather(*tasks)
    end_time = time.time()  # Record end time
    elapsed_time = end_time - start_time  # Calculate elapsed time
    print(f"Total elapsed time: {elapsed_time:.2f} seconds")

if __name__ == "__main__":
    # Execute the main function
    asyncio.run(_main())
