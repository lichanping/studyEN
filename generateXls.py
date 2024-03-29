import os
import re
from os.path import dirname, abspath

import pandas as pd


def get_sub_folder_path(sub_dir_name='user_data'):
    """
    Create the destination folder if not exists.
    :param sub_dir_name: default is 'data'
    :return: sub folder's absolute path.
    """
    # warnings.warn("Please call another", PendingDeprecationWarning)
    current_dir_name = dirname(__file__)
    abs_path = abspath(current_dir_name)
    sub_folder = os.sep.join([abs_path, sub_dir_name])
    return sub_folder


class TxtToXLSX:
    def __init__(self):
        self.data_folder = get_sub_folder_path()
        self.ori_file = None
        self.generate_file = None

    def convert(self, file_name):
        extracted_data = self.read_text(file_name)
        self.create_excel(extracted_data)

    def read_text(self, file_name):
        self.ori_file = file_name
        self.generate_file = os.path.join(self.data_folder, file_name.split('.')[0] + "_抗遗忘单词.xlsx")
        file_path = os.path.join(self.data_folder, file_name)
        data = []
        pattern = re.compile(r'([a-zA-Z\-\s\.\/]+)\s*(.*)')
        with open(file_path, 'r', encoding='utf-8') as file:
            for line in file:
                match = pattern.match(line.strip())
                if match:
                    english_word, translation = match.groups()
                    print(f"English: {english_word}, Translation: {translation}")
                    data.append({"单词": english_word, "释意": translation})

                else:
                    print(f"Invalid format in line: {line.strip()}")
        return data

    def create_excel(self, data):
        df = pd.DataFrame(data)
        df.insert(0, '序号', range(1, len(df) + 1))
        df.insert(3, '词频', 1)

        df.to_excel(self.generate_file, index=False)
        print(f"Excel file '{self.generate_file}' created successfully.")


if __name__ == "__main__":
    tool = TxtToXLSX()
    tool.convert('蔡青青.txt')
