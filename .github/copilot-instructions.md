# Repository Instructions (TDD First)

These instructions apply to all coding tasks in this repository.

## 工作规约

### 分支规约

- 默认禁止直接在 `main` 分支上提交、推送或继续叠加功能改动。
- 只要任务涉及代码、文档、测试或配置变更，开始动手前必须先确认当前分支；若当前在 `main`，必须先新建并切换到工作分支，再继续修改。
- 若用户明确要求“先新建分支再工作”，必须优先执行，不能省略。
- 若已经误在 `main` 上产生了未提交改动，应先告知用户当前状态，并优先建议切到新分支后再继续提交，不要直接把改动提交到 `main`。
- 只有在用户明确要求且风险已说明的情况下，才允许继续在非工作分支上做例外操作。

### 提交和推送前必须确认

在执行 `git commit` 和 `git push` 操作之前，必须先向用户展示将要提交的内容和消息，并获得用户的明确确认后才能执行；用户已按下述“一次性授权”明确授权当前任务时除外。

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

### 一次性授权自动提交和推送

- 当用户在当前任务中明确说“自测通过后自动提交并推送、新建 PR、Preview 自测，无需逐步确认”或同等含义时，视为对本次任务的 `commit`、`push`、创建 PR 和 Preview 验收的一次性明确授权。
- 获得一次性授权后，仍必须执行测试、`git status`、`git diff --staged` 和敏感信息检查，并在过程更新中展示待提交文件摘要及唯一 commit message，但不需要停下来逐步等待确认。
- 一次性授权只适用于当前任务和当前工作分支，不延续到后续任务，也不包含合并 PR、强推、删除分支或其他破坏性操作。
- 若测试失败、暂存内容包含无关文件或敏感信息、目标远程/分支不明确，必须停止自动流程并向用户确认。
- 未收到上述一次性授权时，继续严格执行默认的 commit 与 push 分步确认流程。
- 推荐精简指令：`自测通过后，一次性授权：自动提交并推送当前工作分支，新建 PR，等待 Preview 后用 Chrome DevTools MCP 验收；无需逐步确认，不要合并。`

### 提交远程、新建 PR、获取 Preview URL 流程

当用户要求“提交 remote / 新建 PR / 给 preview URL”时，按以下流程执行：

1. 先确认当前分支和工作区：执行 `git status --short` 和 `git branch --show-current`。
2. 运行与本次改动直接相关的自测；如果有前端 UI 改动，至少运行对应的 UI 静态测试，并在交付中给出必要回归验收场景。
3. 自测通过后，执行 `git add` 暂存本次相关文件。
4. 执行 `git status` 和 `git diff --staged`，向用户展示待提交内容。
5. 给出且只给出 1 条简短 commit message，等待用户明确确认后再执行 `git commit`。
6. commit 后展示将要推送的远程分支，例如 `origin <current-branch>`，等待用户明确确认后再执行 `git push -u origin <current-branch>`。
7. push 成功后新建 PR；若仓库存在 PR 模板，必须按模板填写，否则使用简洁的 Summary / Tests / Regression Scenarios 结构。
8. PR 创建后获取并返回 PR URL；等待部署服务生成 preview 后，返回 preview URL。如果暂时没有 preview URL，说明已创建 PR，并告知需要等待对应部署检查完成。
9. 不要把未确认、未自测通过或与本次任务无关的文件提交进 PR。

### Netlify 生产部署核验流程

用户询问“合并后 prod 是否已部署”时，不能只依据 PR 的 Deploy Preview 成功作结论。必须完成以下核验：

1. 执行 `git fetch origin main`，读取 `origin/main` 最新 SHA，并确认目标功能提交已包含在该提交历史中。
2. 确认 PR 状态为 merged，记录 merge commit SHA；PR 上的 Preview checks 仅作为预览环境证据。
3. 打开 `https://app.netlify.com/projects/engaid/deploys`，确认最新记录明确显示 `Production: main @<merge SHA>` 且状态为 `Published`。`Deploy Preview #<PR>` 不能替代 Production 记录。
4. 使用外部 Chrome DevTools MCP 打开 `https://engaid.netlify.app/` 的本次受影响页面，确认页面和新增静态资源返回 200，并执行至少一个能区分新旧版本的关键行为检查。
5. 检查浏览器 Console 和 Network；区分本次功能错误与既有无关错误，并在结论中说明。
6. 只有 `origin/main`、Netlify Production deploy 和生产页面行为三者一致时，才报告“prod 已部署”；否则说明当前停在哪一层并附对应 URL 或 SHA。

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
- For any MCP-driven UI verification, always launch and inspect the page in an external Chrome browser via Chrome DevTools MCP. Do not use VS Code embedded pages for UI acceptance checks, because the viewport is too small for reliable review.
- 当用户要求“给我回归验证用例 / 验证点 / 验收场景 / regression cases”时，在完成 coding 和相关自测后，输出必须优先使用表格格式。
- 该表格应只描述“本次改动对应的验证点”，不要把通用历史测试清单或整仓库固定测试样例直接写入规约或直接整段复用给用户。
- 推荐表头：`模块 | 回归点 | 操作步骤 | 预期结果 | 已跑自动化（可选）`。
- 若本次改动同时包含 UI、文案、数据口径、导出或存储行为，表格中应分别列出，不要混成一条。

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
- Reading article MP3 files must contain only the English article body.
  - Do not read Chinese translations, inline Chinese glosses, vocabulary, phrases, or analysis sections.
  - Preserve the original English paragraph order and stop at `--- 中文翻译 ---` or `【中文翻译】`.
- Do not create one-off conversion scripts when `scripts/generate_article_audio.sh` already satisfies the task.
- If extraction logic is adjusted, add/update pytest coverage in:
  - `tests/test_tool_article_to_mp3.py`