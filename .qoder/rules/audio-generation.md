# 音频生成规范

## 阅读文章 TXT 转 MP3

- 优先使用可复用的 shell 入口：
  ```bash
  bash scripts/generate_article_audio.sh "<user_data子目录名>"
  ```

- 默认输出位置必须是：
  ```
  user_data/<子目录名>/audio/
  ```

- 当 `scripts/generate_article_audio.sh` 已满足任务时，不要创建一次性转换脚本

- 如果调整了提取逻辑，在以下位置添加/更新 pytest 覆盖：
  ```
  tests/test_tool_article_to_mp3.py
  ```
