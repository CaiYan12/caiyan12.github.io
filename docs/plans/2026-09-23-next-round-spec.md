# Spec：UI 收口后续轮（2026-09-23 四项裁决）

- 镜像 issue：**#42**（label `ready-for-agent`）
- 拆票：`docs/plans/2026-09-23-next-round-tickets.md` = issue **#43–#48**（六张，`#42` 的 sub-issue，阻塞边为 tracker 原生链接）
- 来源：`C:\Users\Einn Tzai\AppData\Local\Temp\myblog-handoff-20260923-next-round.md` 的 ①②③⑥，站长已于 2026-09-23 逐项裁决
- 上位文档：`docs/plans/2026-09-21-ui-adjust-tickets.md`（上一轮票册，已收口）、`docs/ui-adjust-0921.md`（证据登记册）、`docs/adr/0002–0004`、`CONTEXT.md` 词汇表
- 动工前边界：`HEAD` == `origin/main` == `03f42e7`，工作树干净，三条工作流全绿，开放 issue 0 个
- 本文是**裁决的固化**，不是待办清单：四项均已定案，实现阶段不得重开选项
- 决策映射：① = 站长选「不做 + 写成约束」；② = 方案 A；③ = 方案 A；⑥ = 方案 A

---

## Problem Statement（问题陈述）

访客与站长现在面对四件事，彼此独立：

1. **头部微言轮播的链接悬停时毫无反应。** 首页顶部那 4 条「日期 - 内容」链接可以点、鼠标形状会变，但悬停时既不变色也不出线——因为 `#header .text a{color:#fff}`（`src/styles/global.css`，约 1957 行，特异性 1,1,1）把通用 `a:hover{color:var(--colorful-green)}`（同文件，约 1770 行，0,1,1）吃掉了，而全族没有任何 `:hover` 的 `text-decoration` 规则。键盘访客反而**有**反馈（`:where(a,button,input,textarea,select):focus-visible` 的 2px 描边，约 5152 行）。
2. **同一页面出现两个 `id="blogtags"`。** `/tag/`、`/category/`、单标签页、单分类页上正文全量云与侧栏部件同由 `src/components/layout/TagPillCloud.astro`（根标记 `<ul id="blogtags">`）发射，各出现 2 次；首页 1 次。页面看起来完全正常（CSS 两处都命中），但违反 HTML id 唯一性：锚点、`getElementById`、辅助技术引用永远指第一处，而冒烟脚本已被迫用容器前缀选择器绕开它（`scripts/ui-smoke.mjs` 约 1763-1765 行的注释就是这件事的记录）。
3. **`docs/agents/triage-labels.md` 与现实不符。** 该表把五个 triage 角色 1:1 映射到五个标签串，但 2026-09-23 实测 `gh label list` 有 13 条，其中 `wontfix` 与 `ready-for-agent` 存在，`needs-triage`／`needs-info`／`ready-for-human` **从未创建**（`AGENTS.md` 的「Triage labels」段已如实记录）。照着表贴标签会直接 not found。
4. **票册自检脚本活在会被清掉的目录里。** 把票册「本文件怎么用」一节写给自身的 6 条契约变成可跑判据的脚本（82 行）当前在 gitignored 的 `output/t23-ledger-audit.mjs`，清工作区即丢，等于放弃这 6 条判据；而它读镜像票状态的那条规则依赖网络与令牌，直接串进构建链会在断网时假红。

## Solution（方案）

1. **①：判定为既定设计，零视觉改动，改为「锁住现状」。** 不给微言轮播补任何悬停视觉反馈（既不下划线也不换色），并把这条边界写进 `AGENTS.md` 与本 spec；同时在缝隙 A 加一条**反向判据**：悬停时计算值必须与静息**逐字相同**（`color: rgb(255,255,255)`、`text-decoration-line: none`），使将来任何人放开 hover 都会翻红。键盘 focus 环与 hover 暂停滚动不属于「悬停视觉反馈」，**明确保留**。
2. **②：类名挂点接管样式，id 只留正文那一份。** `TagPillCloud` 发射 `<ul class="blogtags">`，`id="blogtags"` 由组件参数控制且**只在正文/云集页那份输出**（首页只有一份，仍是那份）。`global.css` 的 23 处 `#blogtags` 选择器全部换成 `.blogtags`；冒烟脚本 11 处引用同步迁移，并新增一条**全站重复 id 负扫**判据。缝隙 B 预期漂移形态是「锚点改名、逐属性同值」，不是零漂移（见 Testing Decisions）。
3. **③：改文档对齐现实，不动 GitHub。** 在 `docs/agents/triage-labels.md` 保留五行角色词表，加注「本仓库 GitHub 端现存仅 `wontfix` 与 `ready-for-agent`，其余三条从未创建；贴标签前先 `gh label list` 核对或先建再用」。**不创建远端标签**。
4. **⑥：脚本提为 `scripts/` 的一等判据，网络规则可关。** 移到 `scripts/ledger-audit.mjs`，票册路径与 issue 快照路径均为参数，新增 `--offline` 跳过镜像票状态规则并在结论行显式写出「R5 未验（离线）」；注册 `pnpm audit:ledger`。**不串进 `pnpm build`、不入 CI**。

## 验收缝隙（seams，全部复用既有，零新增）

| 缝隙 | 本体 | 本轮用途 |
|---|---|---|
| A | `pnpm smoke:ui`（`scripts/ui-smoke.mjs`，`UI_SMOKE_BASE_URL` 传**站点根**；先 build + preview，端口保持 4399） | ① 的反向 hover 判据；② 的全站重复 id 负扫 + 药丸计算值等价 |
| B | `node scripts/upgrade-style-audit.mjs` 的 23 页逐元素指纹（`capture`/`diff`） | ② 的「改名同值」漂移归因 |
| C（脚本自证） | 直接跑 `pnpm audit:ledger` 与一次变异验证 | ⑥ 的可用性与其判据确实咬人 |

- ① **只能**走缝隙 A：缝隙 B 的采集排除表里 `#header .text` 整族被显式排除（`scripts/upgrade-style-audit.mjs` 约 97 行），它对头部轮播算不出任何东西。
- 缝隙 B 不驱动 hover／focus，所以 ① 在 B 上必然零漂移，**那不能当「验过了」**。
- ③ 无测试缝隙：纯文档，验收方式是在评审时重跑一次 `gh label list` 并核对表的每一条与输出一致。

## User Stories（用户故事）

1. 作为首页访客，我把鼠标移到顶部微言上时不需要看到站点「变脸」，以便我读到的头部文字始终是同一套白色文字，而滚动暂停与指针形状已经足够告诉我这里可以点。
2. 作为键盘访客，我 Tab 到顶部微言链接时仍能看到 2px 品牌绿描边，以便我不依赖鼠标也知道焦点在哪。
3. 作为读屏访客，顶部微言区有 `aria-label="最新微言"` 且链接文案自带日期，以便我不需要颜色或下划线就能判断这条链接讲什么、跳到哪。
4. 作为站长，我希望「微言轮播无悬停反馈」被写成明文约束，以便将来某个会话把它当缺陷顺手补上时我能一句话回退。
5. 作为将来接手样式的 agent 会话，我需要一条会翻红的判据告诉我这条族规则是**承重墙**，以便我不会因为重构通用 `a:hover` 而意外改变头部文字颜色。
6. 作为使用页内锚点或 `getElementById` 的访客，我点到的必须是我期望的那一团标签药丸，以便一个 id 在同一页只指向一个元素。
7. 作为辅助技术用户，我希望标签/分类药丸云在语义树里没有重名地标，以便屏幕阅读器的地标跳转不落到侧栏却播报成正文。
8. 作为桌面访客，我希望侧栏药丸云与正文药丸云看起来、点起来和今天完全一样，以便修 id 这件事对我是零可感知成本。
9. 作为触屏访客，我希望窄屏下药丸命中区仍是 24px 高（垂直内距 5px），以便 6 色轮换盘的三角与圆点不因改名而错位。
10. 作为 `/tag/` 与 `/category/` 页的访客，我希望当前标签/分类仍是品牌绿高亮 + `aria-current="page"`，以便我在药丸海里一眼找到自己所在的那一类。
11. 作为读 `AGENTS.md` 的维护者，我希望「五处共用同一 DOM 结构」这句话仍然为真且写出新的挂点，以便下一次改药丸时不用重新考古。
12. 作为运行冒烟的会话，我希望重复 id 这件事本身成为一条判据，以便将来谁再发射一份同名 id 会立刻红，而不是靠注释提醒。
13. 作为比对指纹的会话，我希望 ② 的漂移被明确预期为「锚点改名、逐属性同值、同路径零差异」，以便我不会把改名误读成样式回归，也不会把真回归当成改名放过。
14. 作为用工程技能跑 triage 的维护者，我希望标签文档直说 GitHub 端只有两条可用，以便我不再对不存在的标签执行 `gh issue edit --add-label`。
15. 作为想统一五标签的维护者，我需要一个明确结论「本轮不建远端标签」，以便文档改动不夹带共享状态写入。
16. 作为下一轮票册的书写者，我希望台账自检脚本随仓库长期存在并有一条 `pnpm` 入口，以便清 `output/` 不再等于放弃自检。
17. 作为离线/断网环境下的会话，我希望 `--offline` 能跳掉唯一依赖网络的规则且显式声明未验，以便 `pnpm audit:ledger` 不因外因假红。
18. 作为收口时的站长，我希望自检报 GREEN 之外还能看到「几段/几条不合规」与「R5 未验」这类口径，以便我知道它到底验了哪几条。
19. 作为审计证据的人，我希望自检脚本被变异验证过一次，以便我知道「GREEN」不是「判据没跑起来」的别名。
20. 作为未来改 sitemap 收录策略的人，我需要在动手前被告知缝隙 A 的 `#41` 判据靠 sitemap 枚举私有文章页，以便同一笔改动里同时换掉判据的页面清单来源。

## Implementation Decisions（实现决策）

### ① 微言轮播：判定「不做」+ 反向锁定

- **零 CSS 视觉改动。** 不新增 `#header .text a:hover`，不改 `#header .text a{color:#fff}`（`src/styles/global.css`），不引入下划线、字重、`::after` 线条或换色。
- 保留项写清：hover 暂停滚动（`src/utils/theme-script.ts` 的 `initHeaderTicker()`，纯 JS 行为）与 `:focus-visible` 描边（键盘可达性，WCAG 2.4.7）**不在本轮动它**的范围之内；「无 hover 效果」只指悬停时的**视觉**状态。
- 约束落点：`AGENTS.md` 项目信息段「头部微言轮播」条目补一句——该族链接的静息白字与无下划线是**既定设计**（2026-09-23 裁决），`#header .text a` 的 id 特异性规则是它之所以「无 hover」的承重结构，补 hover 反馈属新增视觉行为、必须重新过站长裁决；同时登记它**不属**票 20 缺陷面。
- 判据落点：缝隙 A 新增一条，用脚本里**已有的** `hoverProbe()` 助手（返回 `{deco,color,w,h}` 静息/悬停对照，且选择器零命中时返回 `missing:true`）对首页那 4 个链接取静息与悬停两组计算值，断言 `color` 与 `text-decoration-line` 两项**差值为零**。选择器按容器锚定（`.text a` 级别，别裸写会被别处 `#header .text` 家族规则牵连）。
- 不做的事：不顺手给 `.post-list h2 a` 或其他族补 hover；不动通用 `a:hover{color:var(--colorful-green)}`（它仍服务正文与侧栏等全部其他链接）。

### ② `#blogtags` → `.blogtags`：id 只留正文那份

- **组件契约**：`TagPillCloud.astro` 的根元素固定带 `class="blogtags"`；新增一个可选参数决定是否输出 `id="blogtags"`（默认输出，供正文云/云集页用），侧栏部件（`src/components/widget/WidgetTag.astro`）不传 → 侧栏那份只有类。除挂点外 DOM 结构、层级、`aria-current`、`is-current`、`.tag-count`、`{" "}` 空白与 `&times;` 实体的既有约定**一个字节都不动**。
- **CSS**：`src/styles/global.css` 内 `#blogtags` 共 **23 处**（2026-09-23 `grep -c`，范围限该文件）全部替换为 `.blogtags`；与 `.post-tags` 成对的组合选择器保持成对，六色轮换盘、`.tag-count`、`a.is-current` 与窄屏命中区放宽各条的**源顺序不许移动**（同特异性靠源顺序覆盖，是 `AGENTS.md` 锁定项）。
- **特异性重算（不得只按「改名」交差）**：原 `#sidebar #blogtags a:hover`（2,1,1）用双 id 压过 `#sidebar a:hover`（1,1,1）；换成 `.blogtags` 后为 `#sidebar .blogtags a:hover`（1,2,1），**仍**高于 1,1,1，结论不变但注释里那句「双 id 特异性高于」的措辞要按计算值改写，否则留下错误解释。
- **冒烟**：`scripts/ui-smoke.mjs` 内 `#blogtags` 共 **11 处**（2026-09-23 `grep -n`，范围限该文件）逐条迁移。带容器前缀的（`#content #blogtags a`、`#sidebar #blogtags a`、`a:not(#blogtags a)`）改为类版本——**它们是刻意区分两团云的**，若漏改，`#sidebar #blogtags` 会命中 0 个元素；`hoverProbe` 的零命中护栏与 `readPills` 等处已有的非零断言会把这种漏改显形，但**不接受「靠护栏兜住」**，迁移完必须 `grep -c '#blogtags' scripts/ui-smoke.mjs` 为 0。
- **新增判据（缝隙 A）**：对**由 sitemap 枚举的每个页面**扫描全部元素 id，断言无重复（负扫，不是「只查四张标签页」的点名单）；本轮起 `#blogtags` 只在 ≤1 处出现。白名单只允许 `/this-page-should-404/` 那条既有例外，**不得为迁就现状而加放行条目**。
- **`AGENTS.md`**：标签药丸条目的锚点从 `#blogtags a` 改写为 `.blogtags a`（保留「五处共用同一 DOM 结构」「`.tag-count` 与 `is-current` 必须在其后」「窄屏命中区放宽」三条约束的原意），并按 Q45-B 约定用「选择器 + 文件路径」表述、行号写「约」。
- **缝隙 B 前置**：在**改动前的 HEAD** 上重新 `capture` 一份 before 基线（不要复用 `output/fp-t3-final`——上一轮 T1/T2 中途已改过药丸样式，复用它会把不属于本轮的差异算进来）；改后 `capture` + `diff`。
- 文档侧记一笔：`scripts/upgrade-style-audit.mjs` 里 `#blogtags` 唯一命中在某条注释内（约 376 行，讲 nth-child 上色放宽 `background-color`），**不是选择器**，所以缝隙 B 的采集逻辑不因改名而失效；但它的元素锚点由 `tagName + "#" + id + "." + class` 构造（约 275-278 行），侧栏那份 `<ul>` 失去 id 后锚点必然变化——这就是「预期漂移」的来源。

### ③ 标签文档对齐现实

- 只改 `docs/agents/triage-labels.md`：五行为词表保留（它是技能侧约定词表），新增一段现状说明——GitHub 端现存 `wontfix` / `ready-for-agent` 两条（2026-09-23 `gh label list` 实测 13 条标签），另三条从未创建，`gh issue create --label needs-triage` 会直接 not found；贴标签前先 `gh label list` 核对，或先建再用。
- 与 `AGENTS.md`「Triage labels」段互指，两处措辞不得再分叉；本轮以 `AGENTS.md` 为准（它是实测结论）。
- **不**调用 `gh label create`（那是共享状态写入，需站长另行批准）。

### ⑥ 票册自检脚本长期化

- 目标位置 `scripts/ledger-audit.mjs`（去掉 `t23-` 前缀，因为它守的是**任何**票册）；票册路径已是位置参数，issue 快照路径改为可传参（默认仍指 `output/` 下的快照文件名）。
- `--offline`：跳过读快照的那条规则（R5 镜像票须已关闭），其余 R1–R4、R6 全部离网可跑（R4 用 `git merge-base --is-ancestor`）。跳过后结论行必须显式写「R5 未验（离线）」，**不得**继续打印无保留 GREEN。
- 注册 `pnpm audit:ledger`（离线跑法即默认形态，网络快照刷新命令写进脚本头注释，沿用 `curl` + `$(gh auth token)` 形态）。
- **不串进 `pnpm build` / `build.yml` / `deploy.yml`**：票册只在收口期需要，且 `deploy.yml` 那条跑在 `pnpm install` 之前的链路上加任何依赖都会 13 秒内假红。
- 脚本头部注释必须写清 6 条规则各是什么、以及「`[x]` 与划掉（作废）判据的区分」这条它自己发明的判据为什么存在——防止未来会话把它当普通 lint 随手放宽。

## Testing Decisions（测试决策）

- **只测外部行为**：计算值、几何、键盘/悬停结果、ARIA 属性、DOM 属性计数。断言**绝不**锁 CSS 源文本、类名字符串、行号（缝隙 A 的既有铁律）。本轮所有判据都写成「量出来是什么」而非「源码里有没有某行」。
- **①（锁现状型判据）的红证据来自变异**：它落地即绿是**预期**（现状本就无 hover 反馈）。必须做一次变异验证——临时把 `#header .text a` 的 `color:#fff` 改掉（让通用 `a:hover` 的绿在悬停时露出）——证明该判据翻红，随后回滚该临时改动。不要求「先红后绿」的常规顺序，但**不接受没有咬合证据的绿灯**。
- **②（缺陷型判据）必须真红过**：在改动前的 `HEAD`（`03f42e7`）上跑重复 id 负扫，拿到「四张页面各 2 次」的 FAIL 读数作为红证据；改码后同一条判据转绿。这条是本组唯一「以线上/改前产物为基准取红」的票。
- **② 的样式等价判据**：药丸在 1440 与 681 两档的盒高/内距/外距/行距/三角盒高/圆点中心偏差（缝隙 A 既有 `PILL_DESKTOP_BASE` 与 `readPills` 一族断言）改前后读数必须**逐字相同**，且 `/tag/`、`/category/`、单标签、单分类、首页侧栏五处都各测一次——这是「改名没动级联」的行为学证明，比缝隙 B 的漂移归因更硬。
- **缝隙 B 的验收形态**（预先约定，避免临场找理由）：差异必须**全部**落在被改名侧栏云那棵子树的「锚点改名」上，且**同路径逐属性零差异**；出现任何 `color/padding/width/行数` 差异即判失败。允许按既有 `diff` 的 reorder-only 归类机制报告，**不得**为过关而向 `diff` 加豁免规则（白名单是缺陷的藏身处）。
- **⑥ 的验收**：离线跑一次 GREEN、故意把某张票的未勾判据留在票册副本上跑一次 RED（变异验证），两次的读数都记进证据；RED 输出必须点名规则号 + 段落 + 行号。
- **③ 无自动化**：文档改动，评审时以 `gh label list` 输出为唯一事实源逐条核对新表。
- 全组共同门禁：`pnpm check` 0 error、`pnpm exec prettier --check ./src` 全绿、`pnpm test:utils` 等既有单测与 `test:fancybox` / `smoke:nice-books` / `smoke:ai-news` 三套既有冒烟不回退；读套件总数**不用 `tail`**（`pnpm test:projects` 串两次 `node --test`，会截断）。
- 判据变更以**线上为基准至少复跑一次**缝隙 A（依赖远端注入或自带动画的项尤其），等待一律用「几何连续两次一致」。

## Out of Scope（范围之外）

- 不给微言轮播或任何其他族**新增**悬停视觉反馈；不改通用 `a:hover`；不改 `initHeaderTicker()` 的 4s/条节奏与 `-24px` 步长。
- 不重开已裁决项：四页内容级 `h1→h3` 跳级按站长「不拉平」原判保留；私有文章页全部进 `sitemap-0.xml` 按 2026-09-23「维持现状」裁决结案（不改 `astro.config.mjs` 的 `sitemap({filter})`、不加 `noindex`、不动 robots.txt）。
- 不在 GitHub 创建标签（③ 选文档路线）。
- 不把 `pnpm audit:ledger` 接入构建链或 CI（⑥ 不选 C 方案）。
- 不做与本组无关的顺手清理：不重构 `global.css` 分组、不动 `.post-tags` 的既有语义、不重排 z-index 层叠表、不碰 `docs/reference/colorful-original.css` 与 `src/styles/font-awesome.css`（须与上游逐字节一致）。
- 不改 `deploy.yml` 的 `cache: false`，不加回 `@astrojs/tailwind`，不改品牌绿 `#00c000`，不重开 ADR 0002/0003/0004。
- 不新建 GitHub Pages 相关功能、不引入 HTML 校验器或任何新依赖。

## Further Notes（备注）

**建议实现顺序**（①③⑥ 互不依赖，② 最重）：

> **已被票册取代（2026-09-23）**：拆票时站长确认 T0 三票（③ 文档／⑥ 脚本／① 判据）与 ② 的 expand 票**并行开工、不设依赖边**，真实阻塞边只有「contract ← expand」与「收口 ← 全部」。执行顺序、预览点与 commit 节奏以 `docs/plans/2026-09-23-next-round-tickets.md`（镜像 issue #43–#48）的「本轮计划的五项已确认参数」为准；下面这段保留仅作当初推理的记录。

1. ③ 文档（纯文本，单 commit）
2. ⑥ 脚本搬迁 + `--offline` + 变异验证（单 commit）
3. ① 约束文本 + 缝隙 A 反向判据 + 变异验证（单 commit，零视觉改动）
4. ② 组件/参数 + 23 处 CSS + 11 处冒烟 + AGENTS.md 锚点 + 新负扫判据 + 缝隙 B 前后基线（单 commit）

**停顿点**：② 会改 DOM 属性与选择器挂点，属视觉面改动，**落地后先停下让站长本地预览**（`/tag/`、单分类页、首页侧栏各一眼），通过后才 commit；①③⑥ 无视觉变化，可直接成 commit。**一项一 commit**，push 后以三条工作流 + 响应头 `Last-Modified` + 以线上为基准复跑判据共同判定生效，不凭刷新可见。

**环境约束**（本项目已付过学费）：预览端口保持 **4399**（自定义光标是带端口的绝对 url，换端口造数千条假差异）；`pnpm build` 会改写 `src/constants/github-contributions.json` 与 `github-projects.json`，验证后 `git checkout --` 还原；`fonts.googleapis.com` 偶发抖动会让 `astro build` 在 `/og/*.png` 失败且 `dist/` 已清空，须整链重跑；`gh` 本机偶发 TLS 超时改走 `curl` + `$(gh auth token)`；工作树有并行会话，任何依赖树状态的结论前重跑 `git status` / `git log --oneline -5`，**禁止裸 `git stash`**。

**两条跨轮硬约束**（写在这里以免被后来者当成可选优化）：

- 缝隙 A 的 `#41` 判据用 **sitemap 枚举被检文章页**（私有文章页不被任何公开页链出，爬链爬不到）。将来若要改收录策略，**必须同一笔 commit 里给那条判据换页面清单来源**，否则它会静默退化成「只查公开页」。
- ② 之后重复 id 负扫成为常驻判据：任何新增「同一组件在正文与侧栏各渲染一次」的部件，发射 id 的那一刻就会红。若某个新部件确需 id，请给它**唯一**的 id 而不是复用。

**若本 spec 与 `AGENTS.md`／票册／证据文档冲突**：以 `AGENTS.md` 与实测读数为准，并回改本文件，不要留下两套事实。
