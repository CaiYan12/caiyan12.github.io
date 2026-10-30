# 交接：文档台账收口轮 → 下一轮（2026-10-29）

- 本轮：`docs/plans/2026-10-27-doc-todo-inventory.md` 台账全量处置（U-1 取证结案、D-1/D-2 核对结案），台账 **16 个勾选框 = 16 打勾 + 0 空框**（grep 复算 ☐=0、☑=16）
- 收口时刻：`HEAD` 与本地跟踪引用 `origin/main` 一致，均为 **`3922bff`**；推送前经 `git merge-base --is-ancestor` 确认纯快进（`b3ab081..3922bff`）
- CI：对 `3922bff` 三条工作流全 success——Lint（runs/40887153543）、Build and Check（runs/40887153551）、Deploy to GitHub Pages（runs/40887153913）
- 本文件性质：**交接文档，不是待办清单**。遗留事项的裁定边界已由站长给定，接手者不需要重新推导本轮的实测事实
- 入库状态（2026-10-30 更新）：本文件已以单独提交 `f730548` 入库（提交时未推送；后经站长授权快进推送至 `origin/main`，三条工作流全绿）。

---

## 一、本轮交付

| 项        | 终值                                                                                                                                                                                                                                                    |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| U-1       | `c3a4828`：定性「**编号跳号、内容无缺**」——跳号沿自已灭失的 handoff 文件的原始编号体系，④⑤ 作为内容从未存在，不是两条真悬空。`2026-09-23-next-round-spec.md` Implementation Decisions 节首补站长给定注记（逐字）；取证依据与剩余历史不确定性见台账 §3.5 |
| D-1 / D-2 | `3922bff`：台账层面结案，**原文件全部保留**（`.learnings/`、`.zcode/` 零改动，不做删除或归档）。结案口径与证据边界（不判定 `pending` 字段性质、不补认 D-2 计划完成度）见台账 §3.4「D 类结案记录（2026-10-29，站长批准）」                               |
| 台账状态  | §1 汇总表全类结案（C 类仍按原始登记 4 条：2 转出 + 2 结案，转出不计入已结案或已实现）；历史计数条目原样保留，未重写                                                                                                                                     |
| 关键口径  | 「本地台账全部处置完成」**不等于**「全部功能已实现」——该声明写进台账 §1 判断 1 与 §3.3 当前值条目；C-2、C-3 仍由 #112–#114 延期管理                                                                                                                     |

---

## 二、遗留事项（三类，边界已定，勿混淆）

### 1. #112–#114 —— 延期需求：未实施，未经确认不启动

- **#112 读者墙**（标签 `ready-for-human` / `enhancement`，保持打开）：触发条件（留言板/文章评论参与者 >20 人）2026-10-29 10:36 复核仍未满足——2 条顶层评论、0 回复、外部人类读者 0。统计口径、过滤规则、排序、展示形态等待决项全部在 issue 正文。
- **#113 微言碎语分页 / #114 旧表情码**：2026-10-29 转出的两张独立延期票，独立触发、独立关闭；台账 §3.3 记录的「20 条」经 Git 历史复核更正为 19 条（依据见分页 Issue）。
- **边界**：三张均为「需求延期、功能未实现」，不计入已实现数量；台账只留交接记录，不维护第二份规格。**未经站长确认，任何会话不得启动实施。**

### 2. U-2 —— 本地保留说明（无勾选框，未建票）

- 内容（台账 §3.1「#### U-2」）：`docs/`、`README.md`、`AGENTS.md` 里指向 `output/` 的路径去重 115 条，**仅 4 条真实存在，111 条陈旧**。相当一部分本就是历史快照（记录当次测量方法，非「现在能跑的命令」），处置是分类不是一律删。
- 现状：维持登记、未处置。剩余三选一（逐条标注「已不可复核」/ 只处理被当作「现在能跑」的条目 / 维持现状并登记口径）留待站长裁决。
- **补充输入（2026-10-30 核实的新事实）**：台账 §3.3 C-4 结案记录引用的 `D:/c4-worktrees/evidence/` **已不存在**——C-4 worktree 合并 PR #126 后被清理（`git worktree list` 无该副本，`output/` 内亦无副本）。该引用本身已成了 U-2 所指的那类陈旧指针；处置 U-2 时应把这条一并纳入分类，本轮未改台账。
- **归档核实（2026-10-30，只读）**：上述已消失的原始证据已于 2026-10-29 归档至 `D:/backups/myblog-c4-20261029-evidence.zip`（`D:/backups/` 下唯一现存项；站长所记的 `D:/backups/myblog-c4-20261029/` 目录经实测不存在）。核对结果与分类见 §三。

### 3. 稿纸观察器疑点 + 生产第三方 REVIEW —— 保留已有证据与裁定边界，不自动转为缺陷修复

- **稿纸观察器**：台账 §3.3 C-4 结案记录「遗留独立缺陷（已实测，未修）」——`/about/` 稿纸的 `ResizeObserver` 每次切页新建一个（5 轮点击累计 2→7，7 个观察目标强制 GC 后均未报告回收），**观测结果不构成「永久泄漏」判定**；保活机制隔离为「回调闭包捕获 + 观察器未断开」。属 `src/utils/runtime/paper-handwriting.ts` 自身生命周期问题，按 C-4「只搬家不改造」范围排除，**单独裁决**。
- **生产第三方 REVIEW**：console 冒烟对第三方域报错走 `pending-review` 分类（输出形态见 `scripts/console-smoke.mjs:464`），不直接判失败。C-4 基线侧首轮 console 门禁因 pending-review 判为 REVIEW，单独复跑后 **23/23 页 PASS**；台账口径为「并发与外部资源时序抖动，现有证据不支持 PASS 集合完全一致的说法，也未证明抖动有唯一成因」。
- **边界**：两条均引用台账已固化的读数与裁定，不自动转为缺陷修复；重开需站长立项。

---

## 三、证据归档位置（2026-10-30 逐项核实）

- **已推送（`3922bff` 内，仓库真源）**：
    - 台账 `docs/plans/2026-10-27-doc-todo-inventory.md`——全部结案记录与读数原文（U-1 §3.5、D 类 §3.4、C 类 §3.3 含集成门禁与 A/B 读数）
    - U-1 注记：`docs/plans/2026-09-23-next-round-spec.md` Implementation Decisions 节首
- **issue 侧（GitHub）**：#112–#114（延期规格）；#115（C-4 规格）与 #116–#125（C-4 实施票）；#42 与 #43–#48（U-1 取证源，全部 CLOSED）
- **本地（gitignored，原样保留）**：工作日志 `D:\pages\myblog\.workbuddy\memory\2026-10-29.md`（本轮全程逐节记录，含「零写入」表述更正）；`output/ledger-issues.json`（2026-10-06 issue 快照，A-7 结案时确认保留）
- **原路径失效、归档可复核（2026-10-30 只读核实）**：`D:/c4-worktrees/evidence/` 原路径已随 C-4 清理消失（非本轮所为）；原始材料归档于 `D:/backups/myblog-c4-20261029-evidence.zip`（103 个文件，自含 `MANIFEST-README.md` / `MANIFEST-files.txt` / `MANIFEST-sha256.txt`，归档自述来源即 `D:/c4-worktrees/evidence/`）。台账 §3.3 与本文件点名的材料**全部在档**，无一缺失；其中 14 项实测 SHA256 与归档清单逐一相符、`unzip -t` 全包无错误——`observer-check.mjs`、`observer-result.md`、`observer-result.json`、`observer-result-dev.json`、`ab-result.md`、`ab-check.mjs`、`ab-full-diff.mjs`、`check-final.log`、`check-baseline.log`、`integration-dev.log`、`recovery-20261029.md`、`suites-baseline/ui-smoke-rerun.log`、`suites-baseline/sidebar-weather-rerun.log`、`suites-baseline/console-rerun.log`。以下仅清点在档、未做哈希校验：台账所引 A/B 采集 JSON（`baseline.json`、`baseline-verify.json`、`integration.json`、`integration-run2.json`、`integration-final.json`）、三套套件日志（`suites-baseline/`、`suites-integration/`、`suites-final/`）与 `archive/` 页面快照（6 个 html）。
    - **归档中未找到**：无——点名材料无一缺失。
    - **尚未核实**：归档读数与台账正文数字的内容级一致性（本轮只核对在档与哈希，未逐项重读读数）；重放可行性（归档自述 A/B 脚本引用的临时 worktree 已移除，重放需按其 `MANIFEST-README.md` 重建环境，本轮未验证）。
- **保护清单（原样保留）**：`stash@{0}`（`ai-news-root-sync-markdown-20261028`）；codex worktree `C:/Users/Einn Tzai/.codex/worktrees/ai-news-t6/myblog`（`e683da0`）；`.learnings/` 与 `.zcode/` 全部内容
