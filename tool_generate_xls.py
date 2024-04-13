import asyncio
import os
import random
import re
import random
import shutil
import time
from datetime import datetime
from os.path import dirname, abspath

import edge_tts
import pandas as pd
from edge_tts import VoicesManager


def get_sub_folder_path(sub_dir_name='user_data'):
    """
    Create the destination folder if not exists.
    :param sub_dir_name: default is 'data'
    :return: sub folder's absolute path.
    """
    current_dir_name = dirname(__file__)
    abs_path = abspath(current_dir_name)
    sub_folder = os.sep.join([abs_path, sub_dir_name])
    return sub_folder


class TxtToXLSX:
    def __init__(self):
        self.data_folder = get_sub_folder_path()
        self.sound_folder = get_sub_folder_path('sounds')
        self.ori_file = None
        self.generate_file = None

    def convert(self, file_name):
        extracted_data = self.read_text(file_name)
        # self.create_excel(extracted_data)

    def read_text(self, file_name):
        """
        Generate MissingSound.txt if audio not exists
        :param file_name:
        :return:
        """
        self.ori_file = file_name
        self.generate_file = os.path.join(self.data_folder, file_name.split('.')[0] + "_抗遗忘单词.xlsx")
        missing_sound_file = os.path.join(self.data_folder, "MissingSound.txt")  # Path to store missing sound words
        file_path = os.path.join(self.data_folder, file_name)
        data = []
        missing_words = []  # List to store missing sound words
        pattern = re.compile(r'([a-zA-Z\'\s\-\.\/]+)\s*(.*)')
        with open(file_path, 'r', encoding='utf-8') as file:
            for line in file:
                match = pattern.match(line.strip())
                if match:
                    english_word, translation = match.groups()
                    media = os.path.join(self.sound_folder, f"{english_word.strip()}.mp3")
                    exist = os.path.exists(media)
                    # print(f"English: {english_word}, Translation: {translation}, Sound: {exist}")
                    data.append({"单词": english_word.strip(), "释意": translation, "音频": str(exist)})
                    if not exist:
                        missing_words.append(english_word.strip())
                else:
                    print(f"Invalid format in line: {line.strip()}")
        # Write missing words to MissingSound.txt
        with open(missing_sound_file, 'w', encoding='utf-8') as missing_file:
            missing_file.write("\n".join(missing_words))

        return data

    def create_excel(self, data):
        df = pd.DataFrame(data)
        df.insert(0, '序号', range(1, len(df) + 1))
        df.to_excel(self.generate_file, index=False)
        print(f"Excel file '{self.generate_file}' created successfully.")


class TextToSpeechConverter:
    def __init__(self, txt_to_xlsx):
        self.txt_to_xlsx = txt_to_xlsx

    async def convert_text_to_audio(self, file_name, repeat=2, max_items=None):
        extracted_data = self.txt_to_xlsx.read_text(file_name)

        if max_items is not None and 0 < max_items < len(extracted_data):
            extracted_data = random.sample(extracted_data, max_items)

        output_file = os.path.join(self.txt_to_xlsx.data_folder, file_name.split('.')[0] + ".mp3")

        voices = await VoicesManager.create()
        english_voice = voices.find(Gender="Female", Language="en")
        chinese_voice = voices.find(Language='zh'
                                    , Gender="Female"
                                    , Locale="zh-CN"
                                    )

        with open(output_file, "wb") as file:
            for item in extracted_data:
                english_word = item['单词']
                chinese_meaning = item['释意']
                print(f"English: {english_word}, Translation: {chinese_meaning}")
                english_voice_name = random.choice(english_voice)["Name"]
                chinese_voice_name = random.choice(chinese_voice)["Name"]

                # Repeat English audio twice
                for _ in range(repeat):
                    english_stream = edge_tts.Communicate(english_word, voice=english_voice_name).stream()
                    async for chunk in english_stream:
                        if chunk["type"] == "audio":
                            file.write(chunk["data"])

                chinese_stream = edge_tts.Communicate(chinese_meaning, voice=chinese_voice_name).stream()

                async for chunk in chinese_stream:
                    if chunk["type"] == "audio":
                        file.write(chunk["data"])

        print(f"Audio file '{output_file}' created successfully.")


def en_and_cn(file, max_items):
    start_time = time.time()  # Record start time
    converter = TextToSpeechConverter(tool)
    asyncio.run(converter.convert_text_to_audio(file, max_items=max_items))
    end_time = time.time()  # Record end time
    elapsed_time = end_time - start_time  # Calculate elapsed time
    print(f"Time taken: {elapsed_time} seconds")


def copy_review_to_forgetting():
    # Source and destination directories
    source_dir = "/Users/cnShirLi/flaskStudy/data/review"
    destination_dir = "/Users/cnShirLi/studyEN/user_data"

    # Ensure the destination directory exists
    if not os.path.exists(destination_dir):
        os.makedirs(destination_dir)

    # Get today's date in yyyy-mm-dd format
    today = datetime.now().strftime("%Y-%m-%d")

    # Find the review file for today
    review_file = os.path.join(source_dir, f"{today}.txt")

    # Check if the review file exists
    if os.path.exists(review_file):
        # Copy the contents of the review file to the destination forgetting file
        forgetting_file = os.path.join(destination_dir, "抗遗忘.txt")
        shutil.copyfile(review_file, forgetting_file)
        print(f"Copied {review_file} to {forgetting_file}")
    else:
        print(f"No review file found for {today}")


if __name__ == "__main__":
    # Run the function
    # copy_review_to_forgetting()

    tool = TxtToXLSX()
    # generate missing sounds
    tool.convert('悠然.txt')  # commented the create_excel due to uselessness.

    # TODO：Don't use except for needed
    # en_and_cn('悠然.txt', max_items=None)
