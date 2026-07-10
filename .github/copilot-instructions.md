# Repository Instructions (TDD First)

These instructions apply to all coding tasks in this repository.

## 工作规约

### 提交和推送前必须确认

在执行 `git commit` 和 `git push` 操作之前，必须先向用户展示将要提交的内容和消息，并获得用户的明确确认后才能执行。

**流程：**
1. 执行 `git status` 和 `git diff --staged` 展示待提交内容
2. 向用户说明将要提交的 message 内容
3. 等待用户确认（"可以提交" 或 "等一下" 等）
4. 用户确认后执行 `git commit`
5. 展示将要推送的远程分支
6. 等待用户确认后才能执行 `git push`

**例外情况**（仍需告知用户但不需要等待确认）：
- 分支创建和切换
- 文件读取和查看
- 代码分析和调研
- 文档编写（但最终推送需要确认）

## Core Rule

- Use TDD by default: Red -> Green -> Refactor.
- Do not write or change production code before adding a failing test that proves the target behavior.

## Required Workflow

1. Define expected behavior first.
2. Add or update a test that fails for the right reason.
3. Implement the minimum production change to make the test pass.
4. Refactor safely while keeping tests green.
5. Run relevant tests before finishing.

## Testing Expectations

- Prefer small, focused tests close to the changed behavior.
- Add regression tests for bug fixes.
- If there is no existing test file, create one using the project's current test style.
- For Python code, prefer `pytest` style tests unless the target area already uses another framework.
- For schedule or quota logic changes, run `npm run test:quota` before and after implementation, and report both results.

## Delivery Expectations

- In change summaries, explicitly report:
  - what test was added/updated first,
  - what implementation was changed after the failing test,
  - which tests were run and their result.
- After every code change, always provide exactly one concise recommended commit message for the user to use when committing.
- That commit message should be the shortest good option, not a list of alternatives.

## Exception Policy

- If a task cannot reasonably follow TDD (for example, one-off scripts or purely mechanical edits), state why and still add validation checks when possible.

## Additional Coding Constraints (andrej-karpathy-skills style)

Apply the following behavior by default in all coding tasks:

- Think before coding:
  - State key assumptions explicitly.
  - If requirements are ambiguous, ask or present options before implementation.
  - Call out simpler alternatives when they exist.

- Simplicity first:
  - Implement only what is requested.
  - Avoid speculative abstractions, configurability, or future-proofing not required by the task.
  - Prefer the smallest change that solves the stated problem.

- Surgical changes:
  - Touch only lines directly related to the request.
  - Do not refactor or reformat unrelated code.
  - Remove only dead code introduced by the current change; do not clean pre-existing unrelated code unless asked.

- Goal-driven execution:
  - Define clear success criteria before implementation.
  - For multi-step tasks, keep a short plan and verify each step.
  - For bug fixes, prefer reproducing the bug in a test before changing implementation.

## Audio Generation Convention (Project Level)

- For reading article TXT to MP3 generation, prefer the reusable shell entrypoint:
  - `bash scripts/generate_article_audio.sh "<user_data子目录名>"`
- Default output location must be:
  - `user_data/<子目录名>/audio/`
- Do not create one-off conversion scripts when `scripts/generate_article_audio.sh` already satisfies the task.
- If extraction logic is adjusted, add/update pytest coverage in:
  - `tests/test_tool_article_to_mp3.py`