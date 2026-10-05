# Repository Instructions (TDD First)

These instructions apply to all coding tasks in this repository.

## 工作规约

### 分支规约

- 默认禁止直接在 `main` 分支上提交、推送或继续叠加功能改动。
- 只要任务涉及代码、文档、测试或配置变更，开始动手前必须先确认当前分支；若当前在 `main`，必须先新建并切换到工作分支，再继续修改。
- 若用户明确要求“先新建分支再工作”，必须优先执行，不能省略。
- 若已经误在 `main` 上产生了未提交改动，应先告知用户当前状态，并优先建议切到新分支后再继续提交，不要直接把改动提交到 `main`。
- 只有在用户明确要求且风险已说明的情况下，才允许继续在非工作分支上做例外操作。

### 提交和推送授权规则

默认情况下，执行 `git commit` 和 `git push` 前必须先向用户展示待提交内容、commit message 和推送目标，并获得明确确认。若本次请求要求“创建/更新 PR 并获取或测试 Preview URL”（包括“当前 PR 加上功能，部署 Preview 后自测”等同义表达），按下述“一次性端到端授权”处理，不再逐步等待提交或推送确认。

**默认确认流程：**
1. 执行 `git status` 和 `git diff --staged`，展示待提交内容及唯一 commit message。
2. 等待用户明确确认后执行 `git commit`。
3. 展示推送远程分支，等待用户明确确认后执行 `git push`。

**可直接执行的常规操作**（提交和推送仍遵守上方授权规则）：
- 分支创建和切换
- 文件读取和查看
- 代码分析和调研
- 文档编写

### 一次性端到端授权（PR + Preview）

- 用户要求创建或更新 PR 并验证 Preview URL，即授权当前任务自动完成相关的 `commit`、`push`、创建/更新 PR、等待 Preview 和浏览器验收，无需逐步确认。
- 提交前仍必须运行相关测试，核对 `git status`、`git diff --staged`，确认仅包含本次相关文件并完成敏感信息检查；在过程更新中告知待提交文件摘要、唯一 commit message 和目标远程分支，但不暂停等待确认。
- 推送当前任务工作分支到其已确认的 upstream；已有对应 PR 时更新该 PR，不存在时创建 PR。随后等待 Preview 部署完成，按下方“词库更新验证范围”选择检查方式，并报告 PR URL、Preview URL、已执行检查与未验证项；取得 Preview URL 不等于必须执行浏览器验收。
- 此授权仅适用于当前任务和当前工作分支，不延续到后续任务；不包含合并 PR、强推、删除分支或其他破坏性操作。PR 合并必须另行得到用户明确指示。
- 若测试失败、暂存内容包含无关文件或敏感信息、工作区存在无法安全归属的改动、目标分支/远程不明确、推送冲突或出现其他安全风险，停止自动流程并向用户说明阻塞点。
- Preview 尚未生成时，继续等待对应部署检查；若部署失败或无法取得 Preview URL，应报告 PR 状态和具体阻塞，不得将其表述为验收通过。

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

- 本项目没有 Figma MCP 连接需求。UI 实施以仓库现有 HTML、CSS 和交互规约为准，不主动连接 Figma MCP、不请求 Figma 授权，也不将 Figma 连接作为实施或验收前置条件；仅在用户另行明确要求 Figma 工作时使用。
- Prefer small, focused tests close to the changed behavior.
- Add regression tests for bug fixes.
- If there is no existing test file, create one using the project's current test style.
- For Python code, prefer `pytest` style tests unless the target area already uses another framework.
- For schedule or quota logic changes, run `npm run test:quota` before and after implementation, and report both results.
- For any MCP-driven UI verification, always launch and inspect the page in an external Chrome browser via Chrome DevTools MCP. Do not use VS Code embedded pages for UI acceptance checks, because the viewport is too small for reliable review.
- 验证范围由实际改动决定，不因创建 PR、生成 Preview 或更换词库日期而重复完整浏览器回归。纯词库数据更新遵循下方轻量检查规则；用户明确要求浏览器验收时才覆盖该默认规则。
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

## 杨开迪词表日期规约

- 为杨开迪根据图片制作词表时，图片里的打印日期就是上课日期。TXT 文件名、词库日期、MP3 文件名及任务分支名均使用该日期，不使用操作当天日期或其他推测日期。例如打印时间 `2026-10-04 22:06` 对应 `2026-10-04.txt` 和含 `2026-10-04` 的任务分支名。
- 多张图片必须先核对打印日期一致；缺少日期、日期不一致或用户指定日期与图片冲突时，先向用户确认，不自行猜测。
- 正课词表保存至 `data/杨开迪-我的/`，每条使用 `英文<TAB>释义` 且恰好一个 Tab，保留图片中的拼写、释义和词目顺序。图片未标词性时不自行添加词性；运行 `npm run build:yang-kaidi-word-manifest` 自动生成册目录，无需手动编辑 `bookDates`，不修改已有册的记录标识。
- 词库清单 `yang-kaidi-word-review-books.mjs` 由构建脚本扫描正课和历史目录中的 `YYYY-MM-DD.txt` 生成，不手工维护。Netlify 部署、本地 npm 启动和复习测试会自动生成；直接使用普通静态服务器时，新增或删除 TXT 后先运行清单构建命令。PNG、非日期 TXT 和目录不作为词库册。

### 词库更新验证范围

- 仅新增、替换或删除词库 TXT/PNG、补齐逐词 MP3，或重新生成册目录清单时，属于纯数据更新：默认不启动 Chrome、不调用 Chrome DevTools MCP、不重测既有播放交互、草稿恢复、完成记录、报告、来源隔离、工资或响应式布局。生成清单中的日期变化不属于业务代码变更。
- 纯数据更新只检查本次图片日期、词目/释义/顺序、单 Tab 格式、清单生成结果及旧册标识、逐词音频覆盖，复用已有脚本和相关数据测试。不要为每册复制一套交互测试，也不要为未改动的逻辑重复运行整套回归；同一内容和提交已通过的检查不重复运行。
- 需要 PR/Preview 时仍核对提交范围、敏感信息和对应提交的部署状态；必要时用少量 HTTP 请求检查新 TXT、音频或清单可访问，不用浏览器遍历词目，也不重复下载所有已有音频。报告“数据检查通过”，不冒称“浏览器验收通过”。
- 页面、交互、解析/加载、清单生成脚本、构建/缓存、存储或计费逻辑发生变化，或用户明确要求浏览器验收时，才评估是否需要 Chrome MCP；只验证本次改变的关键路径，不自动扩展为全部历史功能回归。

### 快捷触发流程

- 用户输入 `杨开迪词表更新` 时，按以下流程执行，无需用户重复长提示词。该提示词包含本次任务的 PR + Preview 一次性端到端授权，提交和推送仍遵守上文的测试、范围及敏感信息检查要求。
1. 读取 `data/杨开迪-我的/` 中本次新增或替换的 PNG；无法确定本次图片范围时先确认，避免重复处理旧图片。核对全部图片的打印日期一致，以该日期作为上课日期；缺少日期或存在冲突时先询问。
2. 按分支规约核对当前任务及上一 PR 状态。独立新任务从已同步的 `main` 创建含上课日期的工作分支；同一未合并任务的小修复复用原工作分支，不在 `main` 修改。
3. 按 TDD first，先添加词目、释义、顺序、单 Tab 格式及册目录的失败测试，再创建 `data/杨开迪-我的/YYYY-MM-DD.txt` 并运行 `npm run build:yang-kaidi-word-manifest` 自动更新清单，不手改 `bookDates`。保留图片原内容，不自行添加词性，不改变已有册编号、记录标识或工资逻辑；已有同日词表不擅自覆盖。
4. 检查逐词英文音频覆盖，缺失时使用已有脚本 `npm run build:yang-kaidi-word-audio` 补齐。默认不生成整份磨耳朵 MP3，只有用户另行明确要求时才生成。
5. 按“词库更新验证范围”运行本次相关检查，通过后仅提交本次文件，推送工作分支，创建或更新对应 PR，等待 Netlify Preview。GitHub 工具若要求用户提交交互表单，应说明阻塞，不将待提交表单当作已创建 PR。
6. 纯数据更新确认清单和对应提交部署成功即可，不执行 Chrome MCP 浏览器验收；有相关代码改动或用户明确要求时，再对改变的路径做窄范围浏览器检查。报告 PR URL、Preview URL、实际检查结果及未验证项。
- 不自动合并 PR，不强推或删除分支；合并仍需用户另行明确授权。Preview 尚未生成、部署失败或自测失败时，不报告验收通过。
