import asyncio
import os
import random

import edge_tts
from edge_tts import VoicesManager

from generateXls import get_sub_folder_path

# 要处理的文本列表
TEXT_LIST = ["error message 1", "error message 2", "error message 3"]

# 获取声音文件夹路径
sound_folder = get_sub_folder_path('sounds')

# 异步函数，用于处理单个文本并转换为语音
async def process_text(text):
    # 为每个文本创建输出文件路径
    output_file = os.path.join(sound_folder, f"{text}.mp3")

    # 创建 VoicesManager 实例
    voices = await VoicesManager.create()

    # 从语音库中选择语音
    voice = voices.find(Gender="Female", Language="en")

    # 使用 Edge TTS API 将文本转换为语音并保存为 MP3 文件
    communicate = edge_tts.Communicate(text, random.choice(voice)["Name"])
    await communicate.save(output_file)

# 主函数，用于处理整个文本列表
async def _main() -> None:
    # 创建任务列表
    tasks = [process_text(text) for text in TEXT_LIST]

    # 并发执行所有任务
    await asyncio.gather(*tasks)

if __name__ == "__main__":
    # 执行主函数
    asyncio.run(_main())
