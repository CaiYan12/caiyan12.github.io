# 执行票册：UI 收口后续轮（T0–T2）

- 来源：`docs/plans/2026-09-23-next-round-spec.md`（spec）／ issue #42
- 已发布：本册 6 张票 = issue **#43–#48**，全部挂在 #42 下为 sub-issue；每张票标题下的 `> Issue: #NN` 即其镜像
- 证据登记册：本册各票的 **证据** 行（本轮无独立登记册——决策全文、影响面与两条跨轮硬约束都在 spec #42）
- 动工前边界：`HEAD` == `origin/main` == `144849c`（本轮**不设 tag**：六张票都是小改动，无跨批次回滚需求，退回按「一票一 commit」单点 revert）
- **推送状态（2026-09-24）**：站长指示本轮先不推送远程。票 01–05 的 commit 全部只在本地（`bc329f6`…`05841ac`），`origin/main` 仍停在 `669b254`；票 01–03 停下等站长 review，票 04–05 停在 T1 本地预览点。**已知越界一处**：票 04 与 05 按确认参数应「预览通过后才 commit」，我在预览前先各提交了一笔本地 commit（内容、验收读数与 diff 范围均如票面，只是顺序提前）——退回时按 commit 单点 revert 即可，不影响「未推送」这一事实
- 上位决策：ADR 0002（独立壳）、0003（标题分叉）、0004（还原度政策三条款）；上一轮票册 `docs/plans/2026-09-21-ui-adjust-tickets.md` 已收口，**本册不得回改它的状态行**
- 两条验收缝隙（其余都不算证据）：缝隙 A `pnpm smoke:ui`（`UI_SMOKE_BASE_URL` 传站点根，端口保持 4399）；缝隙 B `node scripts/upgrade-style-audit.mjs` 的逐页指纹

## 本文件怎么用（checkbox 更新规则）

- 每张票的 `- [ ]` 是**验收判据**，不是待办清单：一条判据被真实观测到成立才勾，勾时必须能给出证据（命令输出、指纹差异行、截图编号）。
- 每张票开工时在其标题下追加一行 `> 状态：进行中 @日期`，完成时改为 `> 状态：已验收（commit sha）`。批次停下预览时在批次标题下追加 `> 预览：通过 / 退回（原因）`。
- 任何一张票被退回，只回滚该票的 commit，不牵连同批其他票。
- 判据一律断言外部行为（计算值、几何、操作结果、可访问性树属性），**不断言 CSS 源文本、类名字符串或行号**。
- 所有验证走 `build && preview`，不走 dev（dev 下看板娘不渲染、懒加载样式被 swup 抹掉，均为已知假象源）。
- 约束以「选择器 + 文件路径」为锚点，行号只作辅助且必须写「约」（Q45-B）。
- **开册期本册自检必红是预期**：票 02 的自检脚本按「状态行须终态 + 判据须全勾」判定，未开工的票当然不合规。票 02 的 GREEN 证明跑的是**上一轮已收口票册**，不是本册。

## 本轮计划的五项已确认参数（2026-09-23 问答框选定，不再重议）

1. **粒度**：`#blogtags` 迁移保持 expand（票 04）+ contract（票 05）两票，不合并也不拆三票——退回时可单独回滚任一步。
2. **阻塞边**：票 04 与 T0 三票**并行**，不设依赖；真实阻塞边只有 05←04 与 06←全部，已用 `gh` 原生 `--blocked-by` 落在 tracker 上（回读：#47 blockedBy=[46]、#48 blockedBy=[43,44,45,46,47]）。
3. **预览门禁**：T1 两票**各停一次**本地预览（票 04 看「看起来完全没变」，票 05 看「侧栏那份不再带 id 但样式仍在」）；T0 三票无站点视觉改动，不设预览点。
4. **commit 节奏**：一票一 commit，T0 三票做完即 commit 并 push，不攒批次。
5. **格式边界**：「照上一轮格式」只约束**本票册文档**；issue 用 `to-tickets` 自带模板四段（Parent／What to build／Acceptance criteria／Blocked by），不跟随票册排版。

## T0 · 独立项：文档、工具与约束

### 01. triage 标签文档对齐 GitHub 现实
> Issue: #43

**Blocked by**: 无（可立即开始）

**Delivers**：维护者与工程技能读 `docs/agents/triage-labels.md` 得到的标签说法，与 GitHub 端真实存在的标签一致，不再出现「照表执行却 not found」。

> 状态：已验收（`bc329f6` + `b96ea8d`）@2026-09-24

- [x] 五行角色词表保留（那是技能侧的约定词表），另加一段现状说明，其列举的现存标签与当日 `gh label list` 输出**逐条一致**　〔`gh label list --limit 100 --json name` 当日 **13 条**，文档逐条列出；五角色只命中 `wontfix` 与 `ready-for-agent`。顺带更正 spec 里抄错的「12 条」——那是我把 `--limit 50` 的表格输出数少一行（`b96ea8d`）〕
- [x] 写明「贴标签前先 `gh label list` 核对可用值，或先建再用」，并与 `AGENTS.md`「Triage labels」段互指，两处措辞不再分叉；本轮以 `AGENTS.md`（实测结论）为准　〔文档新增「Reality on this repo's GitHub side」段，第 3 条把 `AGENTS.md` 立为权威副本并说明理由〕
- [x] **未在本仓库 GitHub 端创建或删除任何标签**：本票前后各跑一次 `gh label list`，条数与内容完全相同　〔`output/t01-labels-before.json` 与 `after.json` 逐字节相同（diff 无输出，13 条）。反证：`gh issue edit 43 --add-label needs-triage` exit 1，报 `failed to update .../issues/43: 'needs-triage' not found`，#43 标签仍是 `[ready-for-agent]`——这条实测同时是「照表执行会 not found」的原始证据，已引全文进文档〕
- [x] 只改文档：`src/` 零改动，`pnpm check` 与 `pnpm exec prettier --check ./src` 不受影响　〔两笔 commit 只含 `docs/`〕

**证据**：commit `bc329f6`（文档）+ `b96ea8d`（spec 计数更正）。当日 `gh label list` 全量输出留档 `output/t01-labels-before.json`，本票收尾重取 `output/t01-labels-after.json`，两者逐字节相同。

### 02. 票册自检脚本提为 `scripts/` 一等判据 + `--offline`
> Issue: #44

**Blocked by**: 无（可立即开始）

**Delivers**：任何人 `pnpm audit:ledger <票册>` 在离线状态下就能得到票册自检结论；断网不会因为读不到镜像票状态而假红，也不会在跳过规则后仍报无保留 GREEN。

> 状态：已验收（`ad392ad`）@2026-09-24

- [x] 脚本从 gitignored 的 `output/` 提到 `scripts/` 并随仓库跟踪，票册路径与 issue 快照路径都是入参（不再硬编码上一轮的快照文件名），脚本头部注释写清 R1–R6 各是什么、以及 R6「划掉的判据须写作废」为什么存在　〔`scripts/ledger-audit.mjs`，142 行，`git add` 后随仓库跟踪；`LEDGER` 是位置参数、快照走 `--issues=`，默认 `output/ledger-issues.json`〕
- [x] `--offline` 跳过唯一依赖网络的镜像票规则（R5），结论行显式写「R5 未验（离线）」；**不得**在跳过该规则时打印无保留 GREEN　〔三种形态各跑一次：① 离线跑上一轮票册 → `26 段 / 0 条不合规 → GREEN（R5 未验：离线）`，exit 0；② 用旧快照在线跑 → `→ GREEN`（无「未验」字样），exit 0；③ 快照缺失又不带 `--offline` → exit 2 并打印刷新命令与「或加 --offline 跳过 R5」〕
- [x] `package.json` 注册 `audit:ledger` 入口；联网快照的刷新命令写进脚本头注释，沿用 `curl` + `$(gh auth token)` 形态　〔`"audit:ledger": "node scripts/ledger-audit.mjs"`；头注释含 curl 形态的快照刷新命令，且注明长中文与令牌都不经 argv〕
- [x] 对**上一轮已收口票册**跑离线一次：GREEN，读数含「N 段 / 0 条不合规」，并留档　〔26 段 / 0 条不合规 / exit 0（见判据 2 的 ① ）〕
- [x] 变异验证一次：在临时副本上留一条未勾判据 → 必须 RED 且点名规则号 + 段落 + 行号；副本删除，正式票册未被改动（`git status` 干净为证）　〔只把副本里第一条 `- [x]` 改回 `- [ ]` → `FAIL R3 判据未勾 | 01（output/mutation-ledger.md:28） | 在工作树干净状态下采集**改前**样式指纹基线（24 页逐元素，含 \`::bef…` + `26 段 / 1 条不合规 → RED`，exit 1。RED 与 GREEN 两个退出码分别脱离管道单独复验（管道会把 `$?` 变成 `tail` 的）。副本已删，`git status` 只剩两个构建改写的 constants 文件〕
- [x] 未串入 `pnpm build` / `build.yml` / `deploy.yml`（`git diff --name-only` 里不得出现这三个文件），也不引入任何新依赖　〔本票 diff 只含 `AGENTS.md`、`package.json`（新增一行 script）、`scripts/ledger-audit.mjs`；无新依赖。开册期对本票册跑一次 → `6 段 / 38 条不合规 → RED`，与「本文件怎么用」里预告的预期一致〕

**证据**：commit `ad392ad`。`pnpm check` 0 errors / 0 warnings（2 hints 为既有第三方提示）；`prettier --check ./src ./scripts package.json` 全绿（新脚本首跑被 Prettier 判为不合规，`--write` 后行为不变、仍 26 段 0 不合规）。

### 03. 微言轮播「无悬停视觉反馈」的反向判据
> Issue: #45

**Blocked by**: 无（可立即开始；约束文本已随 `144849c` 写进 `AGENTS.md`）

**Delivers**：「头部微言轮播链接悬停时与静息完全一致」这项既定设计从此有机器判据守着——将来任何人放开 hover（或改动通用 `a:hover` 连带放行）都会翻红，而不是靠下一位读者重新发现它。

> 状态：已验收（`82e1ef9`）@2026-09-24

- [x] 缝隙 A 新增一条：对首页 `#header .text` 内那 4 条链接取**静息与悬停两组计算值**，断言 `color` 与 `text-decoration-line` 两项差值为零　〔两条判据（颜色 / 划线），读数 `静息 rgb(255, 255, 255) → 悬停 rgb(255, 255, 255)` 与 `静息 none → 悬停 none`。取数前 `emulateMedia({reducedMotion:"reduce"})` 冻结轮转——轮播每 4s 上滚一条并把首条 li 搬到末尾，真实悬停会在动画中途丢 `:hover`，而 `initHeaderTicker()` 在该偏好下根本不启动；取数后复位 `no-preference`〕
- [x] 该判据只用计算值，不锁 CSS 源文本、类名字符串或行号；复用脚本里既有的悬停探针（其「选择器零命中即报 missing」的护栏正好防住判据空转），不新增第四种客户端初始化轨道　〔复用 `hoverProbe()`，未新增初始化轨道、未改 `theme-script.ts`；判据失败信息里带两组计算值。护栏有效性：若把链接删成纯文字，`missing` 即令判据红（判据要求 `!missing`）〕
- [x] 变异验证：临时把 `#header .text a` 的白字改掉（让通用 `a:hover` 的品牌绿在悬停时露出）→ 该判据必须翻红；随后回滚临时改动，正式提交里不含它（`git diff` 与两次读数同时留档）　〔两次变异，各只翻红一条、其余 119 项仍绿：① 在 `dist/_astro/MainGridLayout.*.css` 里把 `#header .text a{color:#fff}` 摘成空声明 → `FAIL …颜色不变 :: 静息 rgb(68,136,187) → 悬停 rgb(0,192,0)`；② 还原后追加 `#header .text a:hover{text-decoration:underline}` → `FAIL …不出下划线 :: 静息 none → 悬停 underline`。两次都 exit 1 / 「合计 120 项，失败 1 项」。还原证明：备份与新产物的 sha256 同为 `90d60130…`，且 `#header .text a:hover` 在产物中命中 0；变异只落在 gitignored 的 `dist/`，`git status` 全程没有 `src/styles` 改动，本票 commit 只含 `scripts/ui-smoke.mjs`〕
- [x] 明确不越界：hover 暂停滚动与键盘 `:focus-visible` 描边**仍在**（各取一次读数证明没被顺手删），节奏 4s/条与步长 `-24px` 未动　〔`悬停前 "2026年9月19日 - 哦对了，Z八分钱。" → 5.2s 后 同一条`（暂停生效）与 `移出 5.2s 后 "2026年9月4日 - …"`（恢复生效）；焦点环读数 `solid 2px`。`theme-script.ts` 与 `global.css` 零改动（diff 范围可证），4s/`-24px` 原样〕
- [x] 本票不改任何样式文件；套件总数增长以非 `tail` 读法记录（`tail` 会截断 `node --test` 的分组总数）　〔diff 只含 `scripts/ui-smoke.mjs`；套件 115 → **120**（`node scripts/ui-smoke.mjs` 末行原文「合计 120 项，失败 0 项」，未用 tail 截断读）〕

**证据**：commit `82e1ef9`。判据落点在 `scripts/ui-smoke.mjs` 的 `#45：` 段——刻意用 issue 号而不是「票 03」做前缀，因为上一轮票册的 03/04/05 号票已有同名标签在同一文件里（`checkClean("票 03")` 等），混用会让读数归属不清。

> 预览：本票与票 01／02 均无站点视觉改动，不设预览点（票 03 只加判据、不改样式）。

## T1 · `#blogtags` 挂点迁移（expand → contract）

### 04. 药丸样式改由类挂点承载（双挂点共存，id 暂不撤回）
> Issue: #46

**Blocked by**: 无（可与 T0 并行；但票 05 强依赖本票）

**Delivers**：标签/分类药丸的样式改由类挂点提供，正文云与侧栏云在页面上与改前**逐像素相同**；这一步刻意让新旧两种挂点共存，使「撤回重复 id」变成一次独立的、可单独回滚的收缩。

> 状态：已验收（`ced004f`）@2026-09-24
>
> 预览：**待站长本地预览**——本票 commit 已在本地、未推送远程。

- [x] 在**改动前的干净 HEAD** 上重新 capture 一份 before 指纹（不复用上一轮终版基线——上一轮 T1/T2 中途动过药丸样式，复用会把不属于本轮的差异算进来），端口保持 4399　〔`output/fp-r2-before`，23 页，`capture` exit 0。端口 4399、`pnpm build` exit 0 后起 preview；采集时源码侧只有票 03 的冒烟改动，站点文件与 `82e1ef9` 相同〕
- [x] `TagPillCloud.astro` 两团云都带上类挂点，且此步 **id 原样保留**（expand 阶段零撤回）；除挂点外 DOM 结构、层级、`aria-current`、`is-current`、`.tag-count`、`{" "}` 空白与 `&times;` 实体的既有约定一个字节都不动　〔产物 `dist/tag/index.html` 里两处 `<ul id="blogtags" class="blogtags">`；组件 diff 只有 `<ul>` 一行与头注释〕
- [x] `src/styles/global.css` 内 `#blogtags` 选择器 **23 处**（2026-09-23 `grep -c`，范围限该文件）全部改指类挂点；与 `.post-tags` 成对的组合选择器保持成对；六色轮换盘、`.tag-count`、`a.is-current`、窄屏命中区放宽各条的**源顺序一条都不移动**　〔机械比对：把改前文件按 `#blogtags→.blogtags` 归一后与改后逐行比，选择器行（剔除注释行）old/new **41/41 完全一致**；`.post-tags` 命中数 19/19 未变。残留的字面 `#blogtags` 仅 1 处，在那条 hover 例外规则的注释里，作为「旧挂点已作废」的说明保留，不是选择器〕
- [x] `#sidebar` 内那条挡掉药丸下划线的例外规则按**计算值**重新确认仍胜过通用侧栏悬停规则（特异性重算，不再靠双 id），其注释里「双 id 特异性高于」的措辞按实测改写　〔`#sidebar .blogtags a:hover` = (1,2,1) 仍高于 `#sidebar a:hover` 的 (1,1,1)；实机判据「侧栏六色药丸不被那条 hover 划线」在迁移后仍 PASS，悬停读数 `none`。注释改为按计算值陈述并点名旧的「双 id」说法已随挂点作废〕
- [x] `scripts/ui-smoke.mjs` 内 `#blogtags` 引用 **11 处**（当日 `grep -n`，范围限该文件）全部迁移；迁移后该文件内 `#blogtags` 命中数为 0；那六处**刻意用容器前缀区分两团云**的判据仍各自命中非零元素（不得靠「零命中即报 missing」的护栏兜住漏改）　〔迁移后 `grep -c '#blogtags' scripts/ui-smoke.mjs` = **0**；`#content`/`#sidebar` 前缀各归各的，容器前缀判据给出的是非零实数读数（正文云 32 格、侧栏云 32 格、单页 6/5 格），不是「未命中」。`readPills` 原先裸写 `querySelector` 靠 DOM 顺序取第一团，本轮显式改成 `#content .blogtags`，去掉对顺序的隐式依赖〕
- [x] 五处界面（`/tag/`、`/category/`、单标签页、单分类页、首页侧栏）药丸的盒高／内距／外距／行距／三角盒高／圆点中心偏差，在 1440 与 681 两档的读数与改前**逐字相同**　〔`桌面药丸盒值与色带几何逐档等于改前` PASS：`1440: h=20 pad=3px 7px 3px 7px rows=4/32 距=26 | 681: h=20 rows=5 距=26`；窄屏命中高 24、三角盒高 24、圆点偏心 0；五处底色数 6/6/5/6/6 与格数 32/31/6/5/32 同改前〕
- [x] 缝隙 B 改后 diff 的差异**全部**落在「锚点改名」类且同路径逐属性零差异；未向 `diff` 加任何豁免规则（白名单是缺陷的藏身处）　〔`before → after04`：12/23 页有差异、19 处元素差＝**14 处 `(segment change)`**（`ul#blogtags` → `ul#blogtags.blogtags`，逐页只命中两团云）＋ **5 处属性差，全部在 `/guestbook/`**，与本轮无关（归因见票 05 证据段）。**没有**动 `upgrade-style-audit.mjs` 的比对规则〕
- [x] `AGENTS.md` 药丸条目的选择器锚点改指类挂点，「五处共用同一 DOM 结构」「`.tag-count` 与 `is-current` 必须在其后」「窄屏命中区放宽」三条约束原意保留，行号写「约」　〔含 `getTagList` 全序那条与 `/tag/`、`/category/` 两行表格里的挂点指称一并改到类〕

**证据**：commit `ced004f`。套件此刻 120/120（本票不新增判据，改的是既有判据的选择器挂点）。

> 预览：**停下等站长**——本票改了 DOM 属性与选择器挂点，属视觉面改动，须本地预览 `/tag/`、单分类页、首页侧栏三处通过后才 commit。

### 05. 撤回侧栏那份 id + 全站重复 id 负扫常驻
> Issue: #47

**Blocked by**: 04

**Delivers**：任何页面上 `id="blogtags"` 至多一处（HTML id 唯一性缺陷结案），并且「同页出现重复 id」从此是**全站常驻判据**——任何新部件复用 id 的那一刻就会翻红。

> 状态：已验收（`05841ac`）@2026-09-24

- [x] **先取红**：重复 id 负扫判据在票 04 完成态（两挂点共存、id 仍双份）的产物上必须 FAIL，读数为 `/tag/`、`/category/`、单标签页、单分类页各 2 次　〔`FAIL #47：sitemap 每个页面的 id 都唯一（重复 id 负扫） :: 扫 160 页，重复 40 条：/category/ → #blogtags×2、…`，该刻「合计 121 项，失败 1 项」。40 条＝**33 个标签页 + 7 个分类页**各 2 次——比票面点到的四类页面更宽，凡带侧栏部件的标签/分类路由都在内〕
- [x] 组件参数撤回侧栏那份 id（正文云与云集页那份保留，首页仍是一份）；除挂点外 DOM 与文案零改动　〔新增 `dedupeId?: boolean`，`WidgetTag` 传 `dedupeId`。产物核对：`/tag/` 与单分类页各为「`<ul id="blogtags" class="blogtags">` + `<ul class="blogtags">`」；首页只有侧栏那份 → `<ul class="blogtags">`（首页本就没有正文云，撤回后它不再占用 id）〕
- [x] 负扫覆盖**由 sitemap 枚举的每一个页面**，断言无任何重复 id；放行清单只保留既有的 `/this-page-should-404/` 一条，**不得为过关新增豁免**　〔159 个 sitemap 页 + 404 页本身 = **扫 160 页**；判据里 `res.ok || status===404` 是为了把 404 页的 HTML 也纳入扫描，不是放行条件；`KNOWN_DEAD` 未被这条使用。页面清单复用 `#41` 段已有的 sitemap 解析（在那里顺手收 `allSitemapPaths`），避免两处清单各自漂移〕
- [x] 判据转 GREEN，且 `#blogtags` 在任一页面上的出现次数 ≤ 1（读数取自判据本身，不取源码）　〔`PASS #47：… :: 扫 160 页，重复 0 条`。红→绿是**同一条判据、同一份 160 页清单**，只换了源码〕
- [x] 缝隙 B 再做一次 before/after：差异仍只限被撤回 id 的那棵子树（锚点改名），其余零漂移；锚点构造含 `#id`，故「改名 churn」是本步预期而非回归　〔`after04 → after05`：12/23 页、20 处元素差＝**11 处 segment change**（侧栏那团 `ul#blogtags.blogtags → ul.blogtags`）＋ **9 处属性差全部在 `/guestbook/`**（归因见下）。整轮 `before → after05`：23 处＝13 处 segment change（11 侧栏 + 2 正文云）＋ 10 处 `/guestbook/` 属性差；逐页元素总数未变（457→457 等）。比对规则一行未动〕
- [x] 真实浏览器抽查 `/tag/` 与首页：侧栏药丸与正文药丸外观无变化（六色轮换归属、三角、圆点、`×N` 计数、当前项高亮各读一次）　〔1440 下逐团读：侧栏 32 格、盒高 20、三角 20、圆点偏心 0、前六底色 `rgb(238,0,40) (162,107,0) (0,137,68) (177,43,255) (76,49,22) (0,119,218)`、无 `×N`（部件规则本就是 `showCount=false`）；正文那份带 `×N` 且当前项底色 `rgb(0,192,0)`。参照图 `output/r05-shot-tag.png`、`output/r05-shot-home.png`〕
- [x] `AGENTS.md` 与本票相关的锚点描述与最终形态一致（不留「两种挂点都存在」的中间态说法）　〔药丸条目改为「id 只由正文/云集页那一份发射，侧栏 WidgetTag 那份带类不带 id」并写明理由与 issue #47，删掉「票 05 才撤回」的将来式；组件头注释同步〕

**证据**：commit `05841ac`。套件 **121/121**（120 → 121，新增本条负扫）。`astro check` 0 errors / 0 warnings、`prettier --check ./src ./scripts` 全绿。
**归因（缝隙 B 的已知活口，写给下一位）**：`/guestbook/` 那族属性差与本轮无关——同一份构建把 `giscus.app` 拦掉即复现「改前」读数（`.giscus-wrap` 153px、`.giscus-fallback` 104px 显示、无 iframe），放行即「改后」（620px、fallback `display:none`、iframe 在）。排除表只挡了 `iframe.giscus-frame` 子树，**没挡它的祖先容器**，所以留言板的高度类属性会随远端评论框是否就位而翻脸：`after04 → after05 → final` 三采给出 796 / 932 / 932，而**同码连采两次时另外 22 页逐字节一致**——本轮就是靠这两条把它与真回归分开，没有为此改动比对规则。

> 预览：**停下等站长**——本票真正改变渲染出的 DOM，须预览通过后才 commit。

## 收尾

### 06. 全链验证与交付
> Issue: #48

**Blocked by**: 01–05 全部

**Delivers**：本地全链绿、线上生效可证、票册状态全部回填并被自己的脚本承认。

> 状态：未开始 @2026-09-23

- [ ] 删 content layer 缓存后完整 `pnpm build` 通过（改了 remark/rehype 之外的东西也要清缓存，是因为组件挂点变化会经 content layer 影响渲染缓存 —— 本票按既有规程处理并留 exit 0 证据）
- [ ] `pnpm check` 零错误、`pnpm exec prettier --check ./src` 通过
- [ ] 既有全部冒烟与单测绿（灯箱、好书、日报、工具函数、项目、书籍、统计、友链图标）；套件总数用**非 `tail`** 读法记录
- [ ] 缝隙 A 以**线上**为基准复跑全绿；push 与 Pages 部署以三条工作流 + 响应头 `Last-Modified` 判定，不凭刷新可见
- [ ] 本册每票状态行回填为终态 + commit sha；`pnpm audit:ledger`（联网跑法，含 R5）对**本册**报 GREEN，并做一次变异证明它确实咬
- [ ] 两条跨轮硬约束原样留在文档里：缝隙 A 的 `#41` 判据仍靠 sitemap 枚举私有文章页（将来改收录策略必须同笔换判据清单来源）；重复 id 负扫成为常驻判据
- [ ] 构建改写的 `src/constants/github-contributions.json` 与 `github-projects.json` 已 `git checkout --` 还原，工作树干净、`HEAD` == `origin/main`
- [ ] `.design-flow.json` stage 与 next 更新

**证据**：（回填：逐笔 commit 清单、三条工作流状态、`Last-Modified`、自检 GREEN 输出）
