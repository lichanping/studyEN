# PR 与 Preview URL 流程

当用户要求"提交 remote / 新建 PR / 给 preview URL"时，按以下流程执行：

## 流程

1. 先确认当前分支和工作区：执行 `git status --short` 和 `git branch --show-current`
2. 运行与本次改动直接相关的自测；如果有前端 UI 改动，至少运行对应的 UI 静态测试，并在交付中给出必要回归验收场景
3. 自测通过后，执行 `git add` 暂存本次相关文件
4. 执行 `git status` 和 `git diff --staged`，向用户展示待提交内容
5. 给出且只给出 1 条简短 commit message，等待用户明确确认后再执行 `git commit`
6. commit 后展示将要推送的远程分支，例如 `origin <current-branch>`，等待用户明确确认后再执行 `git push -u origin <current-branch>`
7. push 成功后新建 PR；若仓库存在 PR 模板，必须按模板填写，否则使用简洁的 Summary / Tests / Regression Scenarios 结构
8. PR 创建后获取并返回 PR URL；等待部署服务生成 preview 后，返回 preview URL。如果暂时没有 preview URL，说明已创建 PR，并告知需要等待对应部署检查完成
9. 不要把未确认、未自测通过或与本次任务无关的文件提交进 PR
