# studyEN

静态站点（Netlify）英语教学工具集合。

## 当前发布结论

- 当前这版可以发布，**不需要再改业务代码**。
- 已做的安全策略：
  - JS 不缓存（部署后实时生效）
  - 关键模块加版本参数，避免旧缓存错配
  - `schedule.html` 对旧版导出缺失做了兼容兜底

## 已落地改动

- `netlify.toml`
  - `/*.js` 响应头：`Cache-Control = "no-store, no-cache, must-revalidate"`
- `index.html`
  - `./commonFunctions.js?v=20260402-2`
  - `./classFormal.js?v=20260402-2`
- `schedule.html`
  - 两处 `./commonFunctions.js?v=20260402-2`
  - `safeConfigureLxCredentials()` 兼容旧缓存脚本

## 发布流程（建议）

1. 修改代码。
2. 若改动了 JS 逻辑，同步递增页面中的 `?v=` 版本号（例如 `20260402-3`）。
3. 部署到 Netlify。
4. 线上强刷（`Cmd+Shift+R`）后执行验证清单。

## 验证清单（必须）

### 1) 缓存验证

确认 JS 为不缓存策略：

```bash
curl -I "https://<your-domain>/commonFunctions.js?v=20260402-2"
curl -I "https://<your-domain>/classFormal.js?v=20260402-2"
```

预期响应头包含：

- `Cache-Control: no-store, no-cache, must-revalidate`

### 2) 页面可用性验证

- `index.html` 可正常打开，无模块导入报错。
- `schedule.html` 可正常打开，无 `configureLxCredentials` 导出错误。

### 3) 工资导出验证（核心）

- 首页：进入 `index.html`，点击“工资统计”，可成功下载导出文件。
- 排课页：进入 `schedule.html`，点击“按排课生成工资统计”，可成功下载导出文件。
- 对比导出内容：字段完整、金额与期望一致。

## 回滚建议

如线上异常，优先：

1. 回滚到上一版部署。
2. 保留 `no-store` 配置不变。
3. 恢复后再定位具体页面脚本问题。

### 一键回滚（Sync 功能）

已提供脚本：`scripts/rollback_sync.sh`

- 回滚范围仅包含本次同步功能相关文件：
  - `schedule.html`
  - `netlify.toml`
  - `netlify/functions/schedule-sync.mjs`
  - `package.json`
  - `package-lock.json`
  - `.gitignore`
  - `docs/PRD-schedule-sync.md`
- 默认回滚到 `HEAD~1`（通常是同步功能上线前一个提交）
- 安全保护：工作区不干净会直接退出（避免误伤未提交改动）

常用命令：

```bash
# 先看会改什么，不落盘
npm run rollback:sync:dry

# 一键生成回滚提交（不自动 push）
npm run rollback:sync

# 需要时可直接推送
bash ./scripts/rollback_sync.sh --target HEAD~1 --yes --push
```

## 维护约定

- 每次修改 JS 后，统一递增 `?v=`。
- 不随意改动工资导出函数入口：
  - `index.html` -> `script.generateSalaryReport`
  - `schedule.html` -> `generateScheduleSalaryButton` 点击导出链路

---

## Python 工具：工资单月份统计（V5 HTML 解析）

### 唯一的 Python 调用入口

```python
from tool_generate_xls import TestGenerateTool

# 实例化工具
tester = TestGenerateTool()

# 调用主方法，传入 V5.html 文件路径和目标月份（可选）
df = tester.calc_month_fee_from_training_list(
    file_path='temp/v5.html',
    target_month='2026-04'  # 可选：'YYYY-MM' 格式，不传则默认统计上月
)

# DataFrame 包含列：学生名 | 课程名 | 开始时间 | 课时 | 课程类别 | 实际价格（工资）
# 自动按 开始时间 升序排列，仅包含"已完成"状态的课程
```

### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `file_path` | str | ✅ | V5 HTML 文件的完整路径（含文件名） |
| `target_month` | str | ❌ | 目标月份，格式 `'YYYY-MM'`（如 `'2026-04'`）；不传则统计上一自然月 |

### 返回值

- **DataFrame**：已按 `开始时间` 升序排序
- **包含列**：`学生名`、`课程名`、`开始时间`、`课时`、`课程类别`、`实际价格`
- **数据过滤**：仅 `"已完成"` 状态的课程
- **时间范围**：该月 1 日 00:00 ~ 下月 1 日 00:00（闭开区间）

### 使用示例

```python
# 示例 1：统计指定月份（2026 年 4 月）
df_april = tester.calc_month_fee_from_training_list('temp/v5.html', target_month='2026-04')
print(f"4月工资合计: {df_april['实际价格'].sum()} 元")
print(f"课程数: {len(df_april)}")

# 示例 2：默认统计上月（今天是 2026-05-01，则统计 2026-04）
df_last_month = tester.calc_month_fee_from_training_list('temp/v5.html')
print(f"上月工资合计: {df_last_month['实际价格'].sum()} 元")

# 示例 3：导出为 Excel
df.to_excel('工资单_2026年4月.xlsx', index=False)
```

### 回归测试

#### 课时核对逻辑（必须）

每次修改 `schedule.html` 的排课/课时核对逻辑时运行：

```bash
npm run test:quota  # Node.js 课时核对测试（7 个场景）
```

#### 工资单解析（可选）

独立的 Python 工具测试，用于验证 V5.html 解析逻辑：

```bash
python -m pytest tool_generate_xls.py::TestGenerateTool::test_v5_calc_personal_fee_from_training_list -v
```

或直接调用（见上文示例）
