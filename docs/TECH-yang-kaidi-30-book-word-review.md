# 杨开迪 30 册单词复习工具技术设计

- 文档日期：2026-09-25
- 版本：v0.1（评审稿）
- 关联需求：`docs/PRD-yang-kaidi-30-book-word-review.md`

## 0. 方案结论

MVP 采用现有静态站点架构，新增浏览器端独立 IndexedDB，不新增服务端数据库：

1. 在 `anti-forgetting.html` 增加入口，打开独立复习页面。
2. 独立页面按日期升序展示 30 册，但老师可以任选一册开始或继续。
3. 浏览器运行时读取 TXT，按第一个 Tab 严格拆分英文和释义，不硬编码词数。
4. 英文发音优先使用 `sounds/` 已有 MP3，缺失时调用新增的仅英文单次发音 Netlify Function。
5. 逐词草稿和正式完成结果保存到 IndexedDB；localStorage 只保留现有小体积 BFD 计费账本。
6. 每册完成时批量提交遗忘词，并按完成时的北京时间重算模式 2 当日总词数。
7. BFD 日账本分别保存模式 1、模式 2 的词数来源，最终按两者合计匹配一次计费档位。
8. MVP 支持按北京时间复习日期复制群报告和导出 TXT，不展示费用。

## 1. 文件边界

建议新增：

| 文件 | 职责 |
| --- | --- |
| `yang-kaidi-word-review.html` | 册列表、单册复习、全部遗忘词三个视图 |
| `yang-kaidi-word-review.css` | 独立页面样式和响应式布局 |
| `yang-kaidi-word-review.js` | 页面事件、数据加载、播放、保存和视图切换 |
| `yang-kaidi-word-review-core.mjs` | TXT 解析、进度、正确率、完成结果、日汇总、群报告和 TXT 导出的纯函数 |
| `yang-kaidi-word-review-db.mjs` | 独立 IndexedDB 的 schema、草稿与正式结果读写 |
| `netlify/functions/generate-word-pronunciation.mjs` | 缺失静态 MP3 时生成一次纯英文发音 |
| `tests/test-yang-kaidi-word-review.mjs` | 核心纯函数和业务边界测试 |
| `tests/test-yang-kaidi-word-review-ui.js` | 页面入口、控件和不展示费用的静态测试 |

需要修改：

| 文件 | 改动 |
| --- | --- |
| `anti-forgetting.html` | 增加“杨开迪历史单词复习”入口 |
| `package.json` | 增加该功能的聚焦测试命令，并纳入相关测试集合 |

不修改现有 `1-99 / 100-199 / 200+` 计费函数和 `index` 页工资展示逻辑。

## 2. 页面状态与流程

### 2.1 册列表

页面启动后加载固定的 30 个 TXT 文件名，逐个读取实际内容并计算词数。文件名按日期升序展示，但没有顺序限制：

- 每册按日期升序显示序号 1-30。
- 未开始显示“开始复习”。
- 有草稿显示“继续复习”。
- 已完成显示“查看结果”。
- 点击哪一册，就只进入哪一册。

每册只展示序号、册名、总词数、已测试数、遗忘数、正确率、完成状态和实际复习日期。实际复习日期取完成本册时的北京时间；开始和完成跨天时仍归完成日。页面不得读取或展示费用字段。

### 2.2 单册复习

每个词条保存三个独立状态：

```text
tested   是否已经测试
revealed 是否已经显示释义
forgotten 是否标记遗忘
```

状态变化：

1. 第一次点击英文：`tested=true`，播放一次英文，`revealed=false`。
2. 第二次点击英文：播放一次英文，`revealed=true`。
3. 后续点击英文：继续播放一次英文，保持释义可见。
4. 点击叉号：`tested=true`、`forgotten=true`，不触发播放或释义显示。
5. 再次点击叉号：`forgotten=false`，`tested` 保持为 `true`，因此进度不倒退。

正确率由纯函数计算：

```text
testedCount = tested=true 的词条数
forgottenCount = forgotten=true 的词条数
accuracy = (testedCount - forgottenCount) / testedCount * 100
```

`testedCount=0` 时返回空状态，由 UI 显示 `--`。

### 2.3 完成本册

全部测试完成时，显示一次完成确认，内容包括已测试数、遗忘数和正确率。

存在未测试词时只显示一次确认，内容必须同时展示已测试数、遗忘数、正确率和剩余数。取消不写正式结果、不写计费账本，只保留草稿；确认后提前完成。

最终确认成功后一次性执行：

1. 从草稿生成正式完成结果。
2. 批量保存本册遗忘词快照。
3. 记录提交瞬间的北京时间和业务日期。
4. 重算该业务日期的模式 2 全部完成册词数。
5. 只更新 BFD 额外复习日账本中的模式 2 来源，再与模式 1 来源合计计费。

### 2.4 修改已完成结果

已完成册可以重新打开并修改遗忘标记。修改过程先形成编辑草稿，点击“保存修改”后批量替换正式遗忘词快照并重算正确率。

修改正式遗忘词时禁止修改：

- 原实际测试词数。
- 原完成时间和北京时间业务日期。
- 已同步的计费词数、档位和金额。

因此修改遗忘词不会再次写入或删除工资记录。

## 3. TXT 解析

### 3.1 输入格式

每个非空行要求为：

```text
英文单词或短语<Tab>词性及中文释义
```

解析必须只寻找第一个 Tab，不能按普通空格或“中文开始位置”猜测：

```js
const separatorIndex = line.indexOf("\t");
const english = line.slice(0, separatorIndex).trim();
const meaning = line.slice(separatorIndex + 1).trim();
```

例如：

```text
abruptly\tadv 突然地；无礼地
```

解析结果必须为：

```json
{
  "english": "abruptly",
  "meaning": "adv 突然地；无礼地"
}
```

发音模块只能接收 `english`，不得接收原始行或 `meaning`。

英文词组中的普通空格属于英文内容，例如 `catch up with` 会完整保留并作为一个词组发音。Tab 只允许作为英文和释义的结构分隔符；如果英文词面本身需要表示 Tab，则当前 TXT 格式无法无歧义表达，应判为无效行而不是猜测拆分。

### 3.2 异常处理

- 空行：忽略。
- 没有 Tab：整册加载失败并指出行号，不使用空格猜测，避免误读词性。
- Tab 左侧为空：整册加载失败并指出行号。
- Tab 右侧为空：允许加载和播放英文，但显示“暂无释义”。
- 多个 Tab：当前数据不存在；为避免把字段边界误当成词面，判为无效行并指出行号。

册词数、总词数和进度均以成功解析的运行时结果为准，不硬编码当前的 37 或 1,528。

### 3.3 当前全量扫描基线

上线前测试必须扫描全部 30 个文件，而不是只用样例：

- 1,528 条非空行均具备且仅具备一个结构分隔 Tab，格式 invalid 为 0。
- 15 个含普通空格的英文词面均作为合法原始数据解析，包括 `ought modal`。
- 词库内容已由老师对照原始 PNG 确认；程序不得自动修正英文、大小写、连字符、斜杠、词性、释义或标点。
- 测试应输出 invalid 文件、行号和原因；只要 invalid 大于 0，聚焦测试失败并阻止交付。
- 内容待复核项只报告，不由程序自动纠正拼写、词性、大小写或标点。

### 3.4 词条标识与源文件变化

词条状态不能只使用数组下标。建议以“册名 + 原始规范化行 + 同行重复序号”生成稳定 `entryId`，并为整册原始文本生成 `sourceFingerprint`。

- 草稿指纹与当前 TXT 不一致：阻止直接恢复，提示源文件已更新，确认后清除该册旧草稿并重新开始。
- 已完成结果保存英文和释义快照，不因后续 TXT 更新而静默改变历史结果。
- 30 个文件名可以在 MVP 清单中固定登记，但每册词数和内容必须运行时读取。

## 4. 英文音频

### 4.1 播放策略

当前 1,480 个唯一英文中，现有 `sounds/` 已覆盖 1,392 个，缺失 136 个。因此采用两级策略：

1. 先尝试 `sounds/<小写英文>.mp3`。
2. 静态文件不存在或播放失败时，调用 `/.netlify/functions/generate-word-pronunciation`。
3. TTS 成功后把返回的 MP3 Blob URL 缓存在当前页面内，同一词后续点击直接复用。
4. 页面关闭后释放 Blob URL；MVP 不把二进制音频写入 `localStorage`。

短语和带标点词条在拼接静态资源 URL 时必须进行 URL 编码，不能直接拼接未转义文本。

音频使用独立的 `speechText`，不修改 `english` 原始值：

1. 普通空格保留，`catch up with` 作为完整词组发音。
2. Unicode 连字符统一映射为 ASCII `-`，例如 `easy‑going` 的 `speechText` 为 `easy-going`。
3. 英文字母之间的 `/` 替换为 ` or `，例如 `depend on/upon` 的 `speechText` 为 `depend on or upon`，避免朗读成 “slash”。
4. 其他合法英文标点保留；不得添加 Tab 右侧词性或中文。
5. 页面展示、entryId、IndexedDB 快照和 TXT 导出始终保留原始 `english`，只有静态音频查找和 TTS 请求使用规范化后的 `speechText`。

### 4.2 TTS 接口

请求：

```http
POST /.netlify/functions/generate-word-pronunciation
Content-Type: application/json

{"english":"abruptly"}
```

服务端规则：

1. 仅接受一个非空 `english` 字段；客户端传入经过上述规则规范化的纯英文 `speechText`。
2. 拒绝包含 Tab、换行或中文字符的输入，防止把原始 TXT 行误传进来。
3. 使用现有 `@andresaya/edge-tts` 和 `en-US-EmmaNeural`。
4. 只调用一次 `synthesize(english, ...)`，返回一个只读一遍英文的 `audio/mpeg`。
5. 不接受 `chinese`、词性、拼写开关或批量词组参数。

客户端在第一次和第二次点击时都调用同一个 `playEnglish(toSpeechText(entry.english))`。第二次点击会把 `revealed` 设为 `true`，让页面显示词性和中文释义，并再次播放一次英文；音频内容始终只包含英文单词或短语，不朗读词性和中文。

## 5. IndexedDB 本地数据

### 5.1 草稿

使用独立数据库和 object store：

```text
Database: YangKaidiWordReviewDB
Version: 1
Object store: drafts (keyPath: bookId)
```

每册草稿包含：

```json
{
  "bookId": "2026-09-12",
  "sourceFingerprint": "...",
  "entries": {
    "entry-id": { "tested": true, "revealed": false, "forgotten": true }
  },
  "startedAt": "2026-09-25T12:00:00.000Z",
  "updatedAt": "2026-09-25T12:30:00.000Z"
}
```

每次点击英文、叉号或撤销叉号后写入 IndexedDB 草稿。为避免快速连点导致并发写覆盖，同一册写操作按顺序排队，以最后一次状态为准。

### 5.2 正式完成结果

使用同一数据库的独立 object store：

```text
Object store: results (keyPath: bookId)
```

每册只保留一条正式结果：

```json
{
  "bookId": "2026-09-12",
  "sourceFingerprint": "...",
  "testedCount": 50,
  "totalCount": 50,
  "forgottenEntries": [
    { "entryId": "...", "english": "abruptly", "meaning": "adv 突然地；无礼地" }
  ],
  "completedAt": "2026-09-25T12:30:00.000Z",
  "reviewDateBeijing": "2026-09-25"
}
```

正式结果必须保存遗忘词文本快照，避免源 TXT 后续修改破坏历史导出。

不复用现有 `FeedbackDB`：该库由多处旧代码分别以固定版本打开，向其中新增 object store 会提高版本升级和兼容风险。独立数据库的容量足够保存 1,528 条布尔状态与文本快照，也不会占用 localStorage 的小容量配额。

### 5.3 写入一致性

IndexedDB 中 `drafts` 与 `results` 可使用同一事务完成草稿转正式结果。计费账本仍在 localStorage，因此跨两种存储无法形成单一事务，提交顺序固定为：

1. 在 IndexedDB 事务内写正式完成结果并删除该册普通草稿。
2. 重新读取正式结果并计算模式 2 当日总词数。
3. 调用来源感知的 BFD 同步函数，只更新模式 2 来源并重算整日合计。
4. 两步都成功后标记 UI 完成。

若第 1 步成功但第 3 步失败，保留正式结果并显示“结果已保存，工资同步失败，请重试”。重试必须从正式结果重算模式 2 当日总词数，只覆盖模式 2 来源，不能再次追加本册或覆盖模式 1。

## 6. 北京时间与 BFD 计费

使用 `Intl.DateTimeFormat` 的 `Asia/Shanghai` 生成显示时间和 `YYYY-MM-DD` 业务日期，不从设备本地日期直接截取。

模式 2 当日聚合纯函数接收全部正式结果：

```text
mode2DailyWords = sum(
  result.testedCount
  where result.reviewDateBeijing == targetDate
)
```

### 6.1 来源感知的日账本

现有业务唯一键和 localStorage key 保持不变，但单日记录增加可选 `sources`：

```json
{
  "platform": "baifendii",
  "studentName": "杨开迪",
  "reviewDateBeijing": "2026-09-25",
  "sources": {
    "antiForgetting": { "totalWords": 86, "reviewTime": "2026-09-25T19:30", "updatedAt": "..." },
    "yangKaidiHistory": { "totalWords": 112, "reviewTime": "2026-09-25T21:10", "updatedAt": "..." }
  },
  "totalWords": 198,
  "pricingTier": "100-199",
  "feeAmount": 5
}
```

同步函数新增 `source` 参数，只更新调用方自己的来源：

- 模式 1 使用 `antiForgetting`。
- 模式 2 使用 `yangKaidiHistory`。
- `totalWords` 始终由有效来源求和后生成。
- 取消某来源计费时只删除该来源；另一来源仍存在则保留记录，两者都不存在才删除整条日记录。

同一天模式 2 完成下一册后，先重算模式 2 来源，再与模式 1 合并。例如模式 1 为 86 词、模式 2 为 112 词，最终 `totalWords=198`，只计一笔 5 元。

旧记录没有 `sources` 时，在首次来源感知更新中将原 `totalWords` 惰性视为 `antiForgetting` 来源，避免覆盖已有模式 1 工资。账本顶层仍为 `version: 1`，现有 `index` 工资读取继续校验扁平 `totalWords/pricingTier/feeAmount`，无需改为异步读取 IndexedDB。

## 7. TXT 导出

导出只读取正式完成结果，不读取未完成草稿。规则如下：

1. 按册名日期升序分段。
2. 每段包含册名、北京时间复习日期、已测试数、遗忘数和正确率。
3. 遗忘词按源册原始顺序输出为 `english<Tab>meaning`。
4. 已完成但没有遗忘词的册输出“无遗忘词”。
5. 文件首部包含学生姓名和北京时间生成时间。
6. 不包含费用、档位、累计工资或 BFD 账本字段。
7. 文件名建议为 `杨开迪-历史单词复习遗忘词-YYYY-MM-DD.txt`。

### 7.1 按日群报告

新增纯函数 `buildDailyReviewReport(results, reviewDateBeijing)`，只读取所选北京时间日期的正式模式 2 结果：

1. 按册序号升序列出册序号、词库日期、已测试、遗忘和正确率。
2. 汇总完成册数、已测试、遗忘、正确词数和总体正确率。
3. 总体正确率按总正确词数除以总已测试词数，不平均各册百分比。
4. 遗忘词按册分组并保持原始顺序；无遗忘词显示“无遗忘词”。
5. 返回可直接复制的纯文本，不包含模式 1 明细、计费词数、档位或费用。

模式 1 与模式 2 的合并只影响工资账本；群报告是本页面对历史词库完成情况的业务反馈，不尝试拼接模式 1 的旧版反馈正文。

### 7.2 全部已复习 Summary

新增纯函数 `buildReviewSummaryReport(results, books, generatedAt)`：

1. 只读取全部正式模式 2 结果，不读取未完成草稿。
2. 输出总体完成册数、总册数、累计已测试数、当前词库总词数、遗忘数、正确数和总体正确率。
3. 按北京时间复习日期聚合每日完成册数、已测试数、遗忘数和正确率。
4. 按册序号输出全部已完成册明细。
5. 按册输出累计遗忘词并保持源顺序。
6. 总体和每日正确率均由各自总正确词数除以总已测试词数，不平均百分比。
7. 输出可直接复制的纯文本，不包含模式 1、计费或工资字段。

### 7.3 报告展示、复制与下载

按日报告和 Summary 共用一条输出管线，不各自实现剪贴板或下载逻辑：

```js
const reportText = reportType === "daily"
  ? buildDailyReviewReport(results, selectedDate)
  : buildReviewSummaryReport(results, books, generatedAt);

showReportText(reportText);
const copied = copyToClipboard(reportText);
showReportStatus(copied);
```

其中：

1. `reportText` 是唯一文案来源，使用纯文本换行，不生成两份 HTML/TXT 内容。
2. `showReportText()` 使用 `textContent` 或等价安全方式在可滚动长文本弹窗/结果区展示，不能用未转义的 `innerHTML`。
3. 向后兼容地扩展现有 `commonFunctions.copyToClipboard(text)`：成功返回 `true`，`execCommand('copy')` 返回 `false` 或抛错时返回 `false`；现有忽略返回值的调用不受影响。
4. 报告所需的 IndexedDB 数据在打开报告面板或切换条件时预先加载；生成按钮的点击处理器内同步执行生成、展示和复制，保留浏览器用户手势上下文。
5. “复制”按钮再次复制当前 `reportText`；成功后显示“报告已生成并复制，可直接粘贴到微信”。
6. 剪贴板复制失败不能阻止 UI 展示；提示“报告已生成，自动复制失败，请点击复制按钮”，并保留可选中文本和“复制”按钮供重试。
7. “下载 TXT”使用同一个 `reportText` 创建 `text/plain;charset=utf-8` Blob，不重新计算报告。
8. 生成操作只展示并复制，不自动触发下载；老师主动点击“下载 TXT”才保存文件。
9. 按日模式没有匹配结果时，生成函数返回明确的空结果状态；控制层提示“该日期暂无已完成复习记录”，不调用 UI 报告弹窗、剪贴板或下载。

## 8. 测试策略

实现严格按 Red -> Green -> Refactor：

1. 先为 `parseTabbedWordList()` 写失败测试：首个 Tab 拆分、多 Tab、空行、缺 Tab、空英文。
2. 再测状态变化：第一次点击、第二次揭示、叉号推进进度、撤销后进度不倒退。
3. 再测正确率：零词、全对、部分遗忘、全错。
4. 再测完成流程：完整完成、一次提前确认的取消与确认、批量遗忘词快照。
5. 再测北京时间日聚合：同日 50 + 62 = 112、跨日按完成日期隔离、重复保存不重复累计。
6. 再测完成后修改遗忘词不改变测试词数、完成日期和计费数据。
7. 再测 TXT 导出顺序、无遗忘词、Tab 格式及不包含工资字段。
8. 再测按日群报告的日期筛选、册序号、总体正确率、无遗忘词和不含工资信息。
9. 再测 Summary 的总体进度、按日期聚合、册顺序、累计遗忘词和不含模式 1/工资信息。
10. 再测两类报告的 UI 展示文本、剪贴板文本和 TXT Blob 文本逐字一致；再测 `copyToClipboard()` 的成功、返回 `false` 和抛错分支，复制失败仍显示，空日期不复制。
11. 再测音频请求只包含 `english`，并验证 `catch up with -> catch up with`、`easy‑going -> easy-going`、`depend on/upon -> depend on or upon`；拒绝 Tab、换行和中文输入。
12. 为 IndexedDB 封装测试草稿/结果 store 隔离、事务提交和源文件指纹冲突。
13. 扩展 BFD 计费测试：仅模式 1、仅模式 2、模式 1+2 合计、更新一个来源不覆盖另一来源、旧 V1 记录惰性兼容。
14. UI 静态测试验证入口、册序号、任意选册按钮、单次确认、按日报告、Summary 和页面不存在费用文案。
15. 最后运行现有 `npm run test:anti-forgetting`、`npm run test:bfd-extra-review-fee` 和新增聚焦测试，防止影响原工资链路。

## 9. 浏览器验收

使用外部 Chrome 验收桌面和手机视口：

1. 从抗遗忘页进入独立页面，任选非第一册开始。
2. 第一次点击只播放一遍英文，第二次显示释义并再播放一遍英文。
3. 使用包含词性的真实行确认音频没有读出 `n`、`v`、`adj`、`adv` 或中文。
4. 分别验证一个已有静态 MP3 的词和一个缺失静态 MP3、走 TTS 回退的词。
5. 点击叉号后进度增加且正确率下降，撤销后进度不倒退。
6. 刷新和关闭后从 IndexedDB 恢复草稿。
7. 未测完整时验证单次确认的取消和确认分支。
8. 跨北京时间零点开始和完成一册，验证实际复习日期归完成日。
9. 同日在两册分别完成 50 和 62 词，验证模式 2 来源为 112 词；再写入模式 1 的 86 词，验证当天最终为一条 198 词、5 元记录。
10. 分别重新提交模式 1 和模式 2，验证不会覆盖另一来源。
11. 修改已完成册遗忘词，验证 TXT 与正确率更新、工资记录不变。
12. 按北京时间日期复制群报告，确认册序号、当日汇总和遗忘词分组正确。
13. 复制全部已复习 Summary，确认总体、每日、按册和累计遗忘词四层数据正确。
14. 验证按日和 Summary 生成后均完整显示并自动复制，可直接粘贴到微信。
15. 验证剪贴板失败时文案仍可见且可重试；无当日数据时不覆盖剪贴板。
16. 分别下载两类 TXT，确认与 UI、剪贴板逐字一致且不存在任何费用信息。