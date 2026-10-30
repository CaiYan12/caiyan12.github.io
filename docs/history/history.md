# 历史记录索引

本文件是**已归档计划文档**的索引。被索引的原文件已从仓库删除，全文仍可从 Git 历史按「恢复命令」一列逐字取回。

- 归档日期：2026-10-30
- 归档范围：`docs/plans/` 下 23 份已完成或已冻结的计划 / 规格 / 票册
- 保留在原处：`docs/plans/2026-09-28-weather-capsule-spec.md` 与 `docs/plans/2026-09-28-weather-capsule-plan.md`（`docs/history/qweather-settingup-history-sessions.md` 里有 40 处不可修改的原文引用；`README.md` 也直接链向它们）

## 怎么用这一页

- **想知道某一轮做过什么**：读「结果」列。
- **想核对某次验收的提交**：读「验收 / 落地提交」列。
- **想读原文**：复制「恢复命令」列到终端执行，文件会恢复到原路径。

```bash
# 示例：取回 2026-10-14 侧栏文章目录 spec
git show 4a35268:docs/plans/2026-10-14-article-toc-spec.md > /tmp/toc-spec.md
```

> 「恢复命令」里的提交是该文件**最后一次被修改**的提交，不是它入库的那一次。用它可以取到归档时的最终内容。

## 归档清单

| 日期       | 文档                                        | 结果                                                                                                                                                  | 验收 / 落地提交                                                       | 恢复命令                                                                   |
| ---------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 2026-09-06 | `2026-09-06-review-fixes`                   | 全仓库七维审查 16 项发现，7 阶段 60 个判据全部勾选完成并推送 `03ce7f2`；Astro 升级仅评估未实施。                                                      | `30ad855` `03ce7f2` `e540a5b`                                         | `git show a2810cd:docs/plans/2026-09-06-review-fixes.md`                   |
| 2026-09-07 | `2026-09-07-nice-books-design-upgrade`      | Nice Books 视觉/立体/动效三维升级，本地 build4 验收完成交付人工审查；当时保留工作区、未提交未推送。                                                   | —                                                                     | `git show a2810cd:docs/plans/2026-09-07-nice-books-design-upgrade.md`      |
| 2026-09-14 | `2026-09-14-friend-icon-cache`              | 友链图标改构建期缓存，避免每次构建重复拉取；20 个判据完成，收口提交 `321c922`。                                                                       | —                                                                     | `git show 321c922:docs/plans/2026-09-14-friend-icon-cache.md`              |
| 2026-09-21 | `2026-09-21-ui-adjust-t0-t3`                | T0–T3 主站 UI 缺陷修复的正式 spec（耐久意图与验收缝隙），23 票由票册执行，issue #18–#40 全关。                                                        | `78e64c3` `1d0cf4a` `2de963e`                                         | `git show 4a35268:docs/plans/2026-09-21-ui-adjust-t0-t3.md`                |
| 2026-09-21 | `2026-09-21-ui-adjust-tickets`              | 23 张票的执行票册，122 个验收判据全部勾选；每票状态行带验收 sha，全组 issue #18–#40 关闭。                                                            | `8dd329f` `b223518` `008cbf0` `dacf42d` `8a973ba` `8d83fcb` …共 31 个 | `git show a2810cd:docs/plans/2026-09-21-ui-adjust-tickets.md`              |
| 2026-09-23 | `2026-09-23-next-round-spec`                | 四项裁决（微言轮播不做反馈、`#blogtags` 去重、标签文档对齐、票册自检长期化），镜像 issue #42，由 #43–#48 实施。                                       | —                                                                     | `git show 170c262:docs/plans/2026-09-23-next-round-spec.md`                |
| 2026-09-23 | `2026-09-23-next-round-tickets`             | T0–T2 三票执行记录，38 个判据勾选；含 `#blogtags` 重复 id 的负扫判据（修复提交 `05841ac`）。                                                          | `144849c` `bc329f6` `05841ac` `669b254` `b96ea8d` `ad392ad` …共 13 个 | `git show a2810cd:docs/plans/2026-09-23-next-round-tickets.md`             |
| 2026-09-25 | `2026-09-25-pelican-bike-tickets`           | 鹈鹕骑车 3D 游戏接入本站资源，GC-1～GC-3 三组硬约束；25/25 烟测通过。**该文件含必须逐字保留的上游源码片段**（见 `.prettierignore`）。                 | `54adc1f`                                                             | `git show 170c262:docs/plans/2026-09-25-pelican-bike-tickets.md`           |
| 2026-09-25 | `2026-09-25-scripts-architecture-spec`      | 脚本层架构加深（构建结果逐字节不变）的 spec，硬约束是「同时保证不改变构建结果」，每票以产物字节为验收对象。                                           | `4416cd1`                                                             | `git show 4a35268:docs/plans/2026-09-25-scripts-architecture-spec.md`      |
| 2026-09-25 | `2026-09-25-scripts-architecture-tickets`   | 9 张票的执行票册，63 个判据勾选；`check()` 六份实现三种签名收敛到共享台子，子票 issue #50–#58 挂在父票 #49 下。                                       | `4416cd1` `b4d74fc` `ac4b8f9` `87eed09` `bb68258` `e792124` …共 13 个 | `git show a2810cd:docs/plans/2026-09-25-scripts-architecture-tickets.md`   |
| 2026-09-25 | `2026-09-25-scripts-round-handoff`          | 脚本层架构轮 → 下一轮交接；记录了「留给下一轮的四件」与「一件未落地的设计（console 零报错门禁）」。                                                   | `aeaff05` `b4d74fc` `ac4b8f9` `87eed09` `bb68258` `e792124` …共 15 个 | `git show 170c262:docs/plans/2026-09-25-scripts-round-handoff.md`          |
| 2026-10-06 | `2026-10-06-collection-series-spec`         | 文集（series）封闭阅读序列的设计 spec；归属判据按 frontmatter，非成员文章跳过整个文集是有意为之。                                                     | `d1f10ea`                                                             | `git show c70eb73:docs/plans/2026-10-06-collection-series-spec.md`         |
| 2026-10-06 | `2026-10-06-collection-series-tickets`      | 10 张票的执行票册，77 个判据勾选；文集 module、封面回退、组内导航与粘性侧栏，子票 issue #77–#86 挂在父票 #76 下。                                     | `b29183b` `2baadc8` `3e2ca54` `c0998a7` `3bb3729` `9d48187` …共 17 个 | `git show 833acdf:docs/plans/2026-10-06-collection-series-tickets.md`      |
| 2026-10-06 | `2026-10-06-deepening-round2-spec`          | 结构加深第二轮 spec（文集 module · 运行时装配 · 天气单源），镜像 issue #88；运行时改为每块一文件、自足幂等。                                          | `f141d08`                                                             | `git show 9fe68fc:docs/plans/2026-10-06-deepening-round2-spec.md`          |
| 2026-10-06 | `2026-10-06-deepening-round2-tickets`       | 7 张票的执行票册，44 个判据勾选；装配表单源化，语录条/液态玻璃两块 tracer 迁入 `src/utils/runtime/`，子票 issue #89–#95 挂在父票 #88 下。             | `f141d08` `8aa9754` `737565e` `981ed4a`                               | `git show 84ffec7:docs/plans/2026-10-06-deepening-round2-tickets.md`       |
| 2026-10-14 | `2026-10-14-article-toc-spec`               | 侧栏文章目录（可粘性跟随、激活态随阅读位置）的 spec；含三条被实测推翻的初始判断。父票 #96、子票 #97–#103，PR #104 以 merge commit `d9db0d0` 入 main。 | `d9db0d0`                                                             | `git show 4a35268:docs/plans/2026-10-14-article-toc-spec.md`               |
| 2026-10-27 | `2026-10-27-doc-todo-inventory`             | 文档待办盘点台账：17 条 + 2 条待归类，最终 **16 个勾选框 16 打勾 + 0 空框**；C-2/C-3 转 #112–#114 延期管理。                                          | `6852f88` `d67689b` `f754760` `52a55a741425`                          | `git show 3509bc1:docs/plans/2026-10-27-doc-todo-inventory.md`             |
| 2026-10-28 | `2026-10-28-a8-console-gate`                | A-8 全页非预期错误门禁实施计划，32 个判据勾选；PASS 只表示声明集合在规定窗口内没有未接受错误，不等于绝对零错误。                                      | —                                                                     | `git show 80fee3d:docs/plans/2026-10-28-a8-console-gate.md`                |
| 2026-10-28 | `2026-10-28-ai-news-extraction-preparation` | AI 日报拆仓准备与 Q1–Q11 决策记录。**原文含 13 个未勾选框，是计划期冻结快照**：七张实施票（ai-news #2–#7）实施后全部 CLOSED。                         | —                                                                     | `git show f620d54:docs/plans/2026-10-28-ai-news-extraction-preparation.md` |
| 2026-10-28 | `2026-10-28-ai-news-extraction-spec`        | AI 日报迁为独立项目的 SPEC，已发布为 ai-news #1（父规格仍 OPEN、有意不关）；独立项目已上线 `https://caiyan12.github.io/ai-news/`。                    | —                                                                     | `git show f620d54:docs/plans/2026-10-28-ai-news-extraction-spec.md`        |
| 2026-10-28 | `2026-10-28-ai-news-extraction-tickets`     | 七张实施票与八条原生阻塞边的发布记录。**原文 42 个未勾选框同样是冻结快照**，实施后票全 CLOSED。                                                       | —                                                                     | `git show f620d54:docs/plans/2026-10-28-ai-news-extraction-tickets.md`     |
| 2026-10-29 | `2026-10-29-doc-ledger-handoff`             | 台账收口轮 → 下一轮的交接文档（非待办清单）；记录 #112–#114 延期、U-2 保留、稿纸观察器疑点与第三方 REVIEW 的裁定边界。                                | `3922bff` `b3ab081` `f730548`                                         | `git show 170c262:docs/plans/2026-10-29-doc-ledger-handoff.md`             |
| 2026-10-30 | `2026-10-30-u2-remediation-record`          | U-2 治理记录：209 条 `output/` 引用 / 132 token / 130 归一化目标，存在 14、未找到 116；含 C-4 两处统计偏差的纠正。                                    | `6852f88` `d67689b` `f373a05` `6e550d0` `ed22119`                     | `git show 170c262:docs/plans/2026-10-30-u2-remediation-record.md`          |

## 归档清单（第二批：过程记录与研究）

第二批于 2026-10-30 同日归档，性质是「一次性过程记录」与「选型研究」，不是计划或票册。`docs/nice-books-design.md` 与 `docs/quotes-review.md` **有意保留在原处**：前一份被生产代码 `src/nice-books/styles/books.css:4` 声明为「设计 token 权威来源」，后一份被 `public/quotes/quote-catalog.js` 头注释两次引用为语料一手出处与署名依据。

| 日期       | 文档                           | 结果                                                                                                                                     | 恢复命令                                          |
| ---------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| 2026-10-05 | `ai-news-migration-test`       | AI 日报原生迁移的 9/9 断言测试记录。日报已于 2026-10-28 迁为独立项目（ADR 0009），该记录属迁移期过程数据。                               | `git show a2810cd:docs/ai-news-migration-test.md` |
| 2026-09-07 | `nice-books-design-test`       | Nice Books 设计升级验收记录：45 项单测、1,239 项 Book3D 几何 QA、56 项 smoke、65 项设计 QA 通过；主书动作 432.6ms。                      | `git show 170c262:docs/nice-books-design-test.md` |
| 2026-10-05 | `weather-api-research`         | 天气 API 选型研究：Open-Meteo 免 key 支持 CORS 需经纬度、CC BY 4.0 须署名；wttr.in 按城市/IP 即可但无 SLA。最终选定 wttr.in 单源。       | `git show a2810cd:docs/weather-api-research.md`   |
| 2026-10-30 | `2026-09-28-weather-capsule-*` | **未归档**，保留在 `docs/plans/`。`docs/history/qweather-settingup-history-sessions.md` 内有 4 处不可修改的 `Ran Get-Content` 原文引用。 | —                                                 |

## 归档清单（第三批：决策登记册）

第三批于 2026-10-30 归档。它是 **T0–T3 全轮 Q1–Q50 的决策登记册**，不是计划也不是票册：每条记着选了什么、否决了什么、为什么推翻旧结论。归档后它的**结论**以可检索的形式留在下面「结果」列里——「为什么当初不做 X」这类问题仍能在活树中直接搜到，不必只剩 `git show` 一条路。它已不是任何文档的权威源，承重约束早已落在 `docs/agents/styles.md`、`docs/agents/components.md` 与 ADR 0004。

| 日期       | 文档             | 结果                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | 恢复命令                                  |
| ---------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| 2026-09-21 | `ui-adjust-0921` | T0–T3 全轮 Q1–Q50 的决策登记册（每条记选了什么、否决了什么、为何推翻旧结论），全轮已结案。收口时登记的三项均已处置完毕：`#header .text a` 悬停无反馈**裁「不做」**（既定设计，见 `docs/agents/components.md` 约 :16，勿重开）、`id="blogtags"` 同页重复**已修**（`05841ac`，issue #47）、私有文章页进 sitemap **判维持现状**（`astro.config.mjs` 的 `sitemap({filter})` 勿改，改了须同步 `scripts/ui-smoke.mjs` 的枚举依赖）。仍在生效的否定裁决：17px 内联链接命中区**不修**（WCAG 2.5.8 Inline 豁免，嵌在 12px 文字流里加内距会撑坏原版 meta 行）、桌面药丸盒值与六色轮换**不动**（与原版 `colorful-original.css` 约 :162 逐字节相同）、卡片宽 182/182/190 与 `.prose{14px/1.9}`、`:324/:327` 死规则**保留** | `git show f84b983:docs/ui-adjust-0921.md` |

## 按轮次索引

| 轮次                           | 文档                                                                                                          | 状态                                      |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| 2026-09-06 全仓库七维审查修复  | `2026-09-06-review-fixes`                                                                                     | 已完成，16 项 7 阶段                      |
| 2026-09-07 Nice Books 设计升级 | `2026-09-07-nice-books-design-upgrade`                                                                        | 已完成，交付审查                          |
| 2026-09-14 友链图标构建期缓存  | `2026-09-14-friend-icon-cache`                                                                                | 已完成                                    |
| 2026-09-21 UI 缺陷修复 T0–T3   | `2026-09-21-ui-adjust-t0-t3`（spec）+ `2026-09-21-ui-adjust-tickets`（23 票）+ `ui-adjust-0921`（决策登记册） | 已完成，父票 #17 + 子票 #18–#40 全关      |
| 2026-09-23 UI 收口后续轮       | `2026-09-23-next-round-spec`（spec）+ `2026-09-23-next-round-tickets`（3 票）                                 | 已完成，#42–#48 全关                      |
| 2026-09-25 鹈鹕骑车接入        | `2026-09-25-pelican-bike-tickets`                                                                             | 已完成，25/25 烟测                        |
| 2026-09-25 脚本层架构加深      | `2026-09-25-scripts-architecture-spec` + `…-tickets`（9 票）+ `2026-09-25-scripts-round-handoff`              | 已完成，父票 #49 + 子票 #50–#58 全关      |
| 2026-09-28 天气胶囊            | `2026-09-28-weather-capsule-spec` + `…-plan`                                                                  | **仍保留在原处**，#60–#67 全关            |
| 2026-10-06 文集（series）      | `2026-10-06-collection-series-spec` + `…-tickets`（10 票）                                                    | 已完成，父票 #76 + 子票 #77–#86 全关      |
| 2026-10-06 结构加深第二轮      | `2026-10-06-deepening-round2-spec` + `…-tickets`（7 票）                                                      | 已完成，父票 #88 + 子票 #89–#95 全关      |
| 2026-10-14 侧栏文章目录        | `2026-10-14-article-toc-spec`                                                                                 | 已上线，父票 #96 + 子票 #97–#103，PR #104 |
| 2026-10-27 文档待办盘点        | `2026-10-27-doc-todo-inventory`                                                                               | 已收口，16☑/0☐                            |
| 2026-10-28 A-8 console 门禁    | `2026-10-28-a8-console-gate`                                                                                  | 已完成                                    |
| 2026-10-28 AI 日报拆仓         | `2026-10-28-ai-news-extraction-preparation` + `…-spec` + `…-tickets`                                          | 已上线，ai-news #2–#7 全关                |
| 2026-10-29 台账收口交接        | `2026-10-29-doc-ledger-handoff`                                                                               | 交接文档                                  |
| 2026-10-30 U-2 治理            | `2026-10-30-u2-remediation-record`                                                                            | 治理记录                                  |

## 未完成或未实施的事项（归档时如实保留）

以下从被归档文档中提取，**不因归档而消失**：

| 事项                                   | 状态                           | 去向                                                                                                 |
| -------------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------- |
| 读者墙                                 | 需求延期、功能未实现           | [Issue #112](https://github.com/CaiYan12/caiyan12.github.io/issues/112)，触发条件：评论参与者 >20 人 |
| 微言碎语分页                           | 需求延期、功能未实现           | [Issue #113](https://github.com/CaiYan12/caiyan12.github.io/issues/113)                              |
| 微言碎语旧表情码                       | 需求延期、功能未实现           | [Issue #114](https://github.com/CaiYan12/caiyan12.github.io/issues/114)                              |
| AI 日报独立性能基线                    | 目标已转移，**尚未登记**       | 见 [ADR 0009](../adr/0009-ai-news-separate-deployment.md)；ai-news 仓库内尚无性能基线记录            |
| `/about/` 稿纸 ResizeObserver 生命周期 | 已实测、未修，单独裁决         | 台账 C-4 结案记录的「遗留独立缺陷」；原读数归档于 `D:/backups/myblog-c4-20261029-evidence.zip`       |
| `design-qa.mjs` 迁共享台子             | 明确不做（三条实测理由）       | 台账 A-5；重开条件：有人真的给它传 `extra`，或它变成门禁                                             |
| 3 处纯变色链接补非颜色辅助             | 站长判定现状已足够，样式不改   | 台账 A-1                                                                                             |
| U-2 的 111/116 条陈旧 `output/` 指针   | 已调查并分类，B 类 27 条已处置 | `2026-10-30-u2-remediation-record`（本文件亦为归档对象）                                             |

> 归档不等于结案声明。上表各项的**功能实现状态**以对应 Issue 或台账原文为准；本文件只记录它们在被归档时处于什么状态。

## 相关文档

- 仍在生效的维护约束：[`docs/agents/`](../agents/)、[AGENTS.md](../../AGENTS.md)
- 领域术语：[GLOSSARY.md](../../GLOSSARY.md)
- 架构决策：[docs/adr/](../adr/)
- 长期规划与延期项：[README.md](../../README.md) 的「TODO 与远期规划」节
- 天气胶囊（保留未归档）：[`docs/plans/2026-09-28-weather-capsule-spec.md`](../plans/2026-09-28-weather-capsule-spec.md)、[`docs/plans/2026-09-28-weather-capsule-plan.md`](../plans/2026-09-28-weather-capsule-plan.md)
