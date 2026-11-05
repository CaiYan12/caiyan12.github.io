# AGENTS.md

## Skill Rule:

按**当前会话宿主注入的技能清单**选用斜杠技能（宿主清单是唯一真源，本文件不再复述条目）。项目专属用法见 `docs/agents/`；改技能行为改下面「Agent skills」三份配置，不重跑 setup。

---

## Running Environment

Your agent and bash are running on:

### System & Device

- Windows 11 Home Chinese Version x64
- Device
- LENOVO Legion Y7000P IRX9
- Intel Core i7-14700HX
- 15.7 GB (16 GB) RAM
- NVIDIA GeForce RTX 4070 Laptop GPU
- Realtek 8852CE WiFi 6E

### Dev Tools

- Shell: PowerShell 7.6.5
- Legacy PowerShell: 5.1 also available
- Git: 2.48.1
- Node.js: 24.18.0
- npm: available through `npm.ps1`
- Filesystem access: unrestricted in the current environment
- Network access: enabled

# Project Info:

**!IMPORTANT: Above are fixed and read-only finale context, you MUST follow these rules strictly, you CANNOT write, delete or add new words when updating or initializing AGENTS.md. Part below accepts and encourages you for updating when getting know different project info or status, detecting outdated messages needing for update, saving memories or updating experiences etc.**

## Agent skills

工程技能（`grill-with-docs` / `to-spec` / `to-tickets` / `triage` / `wayfinder` 等）从下面三份配置读取本仓库约定，改配置即改技能行为，无需重跑 setup。

### Slash 技能发现（2026-10-30）

技能可用性从**当前会话宿主自身提供的技能清单或配置**查起；文件目录（如 `~/.claude/skills/`、`~/.codex/skills/`、`~/.agents/skills/` 等）只是候选来源，不把有限示例当成完整目录表。同名技能多份并存时，遵守宿主自身的解析规则及用户指定的来源，报告实际采用的路径；来源存在歧义时不静默混用。宿主无法加载但允许读取文件时，可读取明确来源的 `SKILL.md`，并准确披露加载方式。不安装、同步或修改技能。

### Issue tracker

本仓库（`CaiYan12/caiyan12.github.io`）的 issue 与 spec 记在 GitHub Issues，一律用 `gh` CLI 读写；PR 不作为需求入口。见 `docs/agents/issue-tracker.md`。

`/wayfinder` 的地图/子票/阻塞边操作也走 GitHub：子票用原生 sub-issues，阻塞用原生 issue dependencies（该仓库两者均已启用，`blocked_by` 取的是数据库 id 不是 `#number`）。**五个 `wayfinder:*` 标签当前不存在**，建图前须先 `gh label create`，否则 `--label` 会 not found 且什么都不建。实测细节见 `docs/agents/issue-tracker.md` 的「Wayfinding reality」一节。

### Triage labels

五个默认标签串（`needs-triage` / `needs-info` / `ready-for-agent` / `ready-for-human` / `wontfix`）是技能侧的**约定词表**，与角色名一一对应，不另设映射。2026-09-24 实测本仓库 GitHub 端只有 `wontfix` 与 `ready-for-agent` 两个；2026-10-06 补建 `needs-triage`（#fbca04）、`needs-info`（#d4c5f9）、`ready-for-human`（#1d76db），五个角色现全部可用。贴标签前仍先 `gh label list` 核可用值（现值现测，本文件不记标签总数）。见 `docs/agents/triage-labels.md`。

### 文档写作约定（2026-09-22 立，Q45-B）

- **约束以「选择器 + 文件路径」为锚点**，行号只作辅助且必须写「约」。本轮 UI 整改里三次误判的根源都是拿旧行号当现值（药丸样式记录漂了约 220 行、`.prose code` 的定位两次都错）。
- 带日期的历史实测数字**保留原样**（它们是那次测量的记录，不是当前事实）；需要当前值就重新测。
- 无法本地复核的数字（第三方图种数量、历史构建文件数）标 `UNKNOWN` 或明确写「未复核」，不得当作改动依据。
- **本文件（`AGENTS.md`）不写会随仓库增长的计数**（ADR 份数、标签个数、模块数……）。这类现值一改就漂。需要数字时现测，别在这里留一份快照。**本文件自 2026-11-03 起已纳入格式门禁**（`lint.yml` 的 Prettier 范围含 `./*.md`，本地 pre-commit 同步覆盖仓库根的 md）；但**格式门禁不检查内容正确性**——数字写错不会因此变红，仍须实测。改动时注意：Prettier 只填充表格列宽、不碰文首声明的固定上下文（实测：格式化只改表格列宽填充，不碰 `!IMPORTANT` 以上的固定上下文；行号不写，它随增删漂移）。
- **参考材料按分支拆在 `docs/agents/`**，本文件只留指针（见「深入文档」表）。**新增约束时先判断它属于哪条分支**：只对某一类工作成立的（改样式 / 改天气 / 动组件 / 改构建 / 写文章 / 跑命令）就写进对应那份，别塞回本文件——常驻上下文里每一行都在每轮计价。**注入预算的现值与改法不在本文件记录**（会漂）：见 `~/.dsh/AGENTS.md` §4，核验跑 `node ~/.dsh/tools/verify-maxbytes-override.mjs`；唯一要记住的是**这份预算由整条指令链共享，超了会从最宽泛的文件开始丢且无提示**。
- **交付纪律（门禁级）**：未经允许**不 commit、不 push**，改完停在本地；只做点名的那几条，做完即停；选项选中后先讲清含义与后果再等指令。**push 到 `main` 等于生产部署**（`deploy.yml` 在 `push: branches [main]` 上触发），不是「备份一下」。 提交流程与 push 前核对见 [`docs/agents/commands.md`](docs/agents/commands.md)。
- **写交接文档、台账或报告里的 git 状态与提交区间时**（远端状态分哪几档、历史区间怎么落死）→ `docs/agents/commands.md` 的「git 远端状态与提交区间的表述纪律」节（2026-10-30 立）。
- **脚本输出编码、heredoc 吃掉转义等「跑命令」类坑**（Windows GBK 控制台、`print` 带 emoji 崩溃、正则转义被 shell 吃掉）→ [`docs/agents/commands.md`](docs/agents/commands.md) 的「脚本输出编码」节。本文件不再复述细节。
- **命令被 CC Safety Net 拦下时**（`BLOCKED by CC Safety Net` 文本错误，不是退出码）→ [`docs/agents/commands.md`](docs/agents/commands.md) 的「CC Safety Net 的实测拦截型态与被拦后的处置」节。要点：**被拦不绕过**（不换 shell / 不拼字符串 / 不改走别的 CLI）；`git.push-delete`、`git.stash-drop` 无安全等价物，须交回用户手动执行；恢复被构建改写的 `src/constants/*.json` 用 `git show HEAD:<path>` 写回，不用 `git restore`。
- **一次性探针脚本写在哪** → `output/<批次名>/`，不是系统临时目录。判据值钱的脚本另存进 `scripts/`。详见 [`docs/agents/commands.md`](docs/agents/commands.md) 的「一次性探针脚本该放哪」节。
- **用 CodeGraph 之前** → 先看 `codegraph_status` 的 `pendingChanges`；非零就 `codegraph_sync`（增量、秒级）。索引会静默失真（2026-11-04 实测列出 60 多个已迁出的文件）。**磁盘才是权威**。详见 [`docs/agents/commands.md`](docs/agents/commands.md) 的「CodeGraph 索引会静默失真」节。
- **查 CI / 部署状态** → `gh run list` / `gh run view --json`，**不需要代理**，也**不要**为它新写脚本或接 MCP。核对部署生效必须比对 `headSha` 与目标 commit，不是「最近一次成功」。详见 [`docs/agents/commands.md`](docs/agents/commands.md) 的「查 CI / 部署状态」节。
- **改 `scripts/upgrade-style-audit.mjs` 或新增样式判据** → 该工具现已在静态指纹之外采样 `:hover` / `:focus-visible` / `:active` / `:disabled` 四种状态（CDP 强制伪类），且**指纹格式随状态数变化，旧采集结果不可与新采集互比**。改动它之后**必须做变异验证**：故意改坏产物 CSS，确认工具真的报差异，否则等于把判据削弱成永远绿。详见 [`docs/agents/commands.md`](docs/agents/commands.md) 的「样式指纹的状态采样」节。
- **决定这次改动要验到什么程度** → 分**承重档**（换构建工具 / 升大版本依赖 / 改级联层语义 / 动全站样式入口 / 换渲染管线）与**轻量档**（单组件微调 / 文案 / 单页 / 明确 bug）。承重走四道判据，轻量走两道；拿不准按承重。详见 [`docs/agents/commands.md`](docs/agents/commands.md) 的「两档验证力度」节。

### Domain docs

单上下文布局：根 `GLOSSARY.md` 术语表 + `docs/adr/`（按序编号；**本文件不记份数**，需要现值就 `ls docs/adr/`）。探索、命名或写 issue 前先取用 `GLOSSARY.md` 的既定称呼；ADR 只记「难以回退、有真实取舍、令人意外」的决策。见 `docs/agents/domain.md`。

## 项目背景

WindowsIt 个人博客（WindowsIt's Music Club），由 Emlog Colorful（明月浩空）主题迁移而来的纯静态 Astro 博客。视觉必须还原 Colorful 原版（海洋绿 `#00c000` 主色、白底圆角卡片、自定义光标），技术栈对齐 `D:\pages\mizuki`。迁移任务的完整背景与取舍见 `D:\pages\emlog-to-astro-migration-prompt.md`。

**AI 日报归属（2026-11-02 收尾）**：AI News 移植已完成，独立仓库为 `CaiYan12/ai-news`；本项目不再包含其页面源码、RSS 快照、React 页面运行时或发布实现。主站按 ADR 0009 仅保留 `/ai-news/` 桌面/移动导航、sitemap 条目与边界验证脚本；这些入口不是未清理的实现。历史 ADR、CHANGELOG、文章及项目展示中的引用保留作追溯。项目记忆索引：`.codex/memories/index.md`。

**元件设计约束（2026-10-06 站长声明）**：新增任何元件前，先最大化复用站内既有设计资产；确需新元件时，其风格与 taste 必须最大化继承既有元件。落地优先级：**直接引用现成组件 → 复用既有类名的 DOM 语法 → 才新写样式**，且新样式的色值 / 字号 / 线型一律取自 `global.css` 既有 token，不引入新设计语言。复用前先看有没有现成的：`ListingHeader.astro`（列表页头）、`WidgetLayout.astro`（侧栏小部件外框）、`PostCard.astro` + `Pagination.astro`（卡片与分页）、`ResponsiveImage.astro` + `getLqipProps()`（带 LQIP 的图）。图标限定在 vendored 的 **Font Awesome 4** 内（`fa-book-open`、`fa-clone`、`fa-layer-group` 这类 FA5+ 新名在本仓库不存在）。

## 深入文档（按需读，别整篇背）

本仓库的参考材料按分支拆开了。**命中下面哪一条，就去读那一份**；别把整份 AGENTS.md 背下来。

| 触发条件                                                                                             | 读哪份                                                                                              |
| ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 查 Colorful 原版某功能本站怎么实现的 / 动主题行为                                                    | `docs/agents/emlog-mapping.md`                                                                      |
| 改任何样式、token、组件类名                                                                          | `docs/agents/styles.md`                                                                             |
| 改天气胶囊、天气判据、天气取数                                                                       | `docs/agents/weather-capsule.md`                                                                    |
| 动客户端脚本、Swup 生命周期、看板娘、Nice Books、评论/表情/统计                                      | `docs/agents/components.md`                                                                         |
| 改构建链、依赖、部署，或**动 remark/rehype 插件**（不删 content layer 缓存会构建出旧 HTML 且无报错） | `docs/agents/build-and-deploy.md`                                                                   |
| 写文章、把外部 Markdown 导进来、生成头图                                                             | `docs/agents/post-authoring.md`                                                                     |
| 跑烟测 / 单测 / 构建期取数 / 票册自检（每条命令的 env 形态与坑）                                     | `docs/agents/commands.md`（含冒烟台子 `makeHarness` / base URL 结尾斜杠 / `norm` 聚合三条承重契约） |
| 领域术语与 ADR                                                                                       | `GLOSSARY.md`、`docs/adr/`                                                                          |
| 想知道某一轮做过什么，或取回已归档的规格 / 票册原文                                                  | `docs/history/history.md`（已归档文档的索引：结果、落地提交、`git show` 恢复命令）                  |
| issue 规范、标签                                                                                     | `docs/agents/issue-tracker.md`、`docs/agents/triage-labels.md`                                      |

## 文档同步（门禁级 · 每一轮变更都要做）

> **为什么有这一节**：这些文档是下一个 agent 唯一的上下文，落后就会让后来者照过期口径改回去。这个仓库为此付过代价——具体三例与教训见 [`docs/agents/commands.md`](docs/agents/commands.md) 的「文档同步的历史代价」节。

### 1. 硬规则

- **改了代码就改文档，同一笔 commit 里改完**。不许"等下次一起补"——2026-11-02 那次补记就是"下次"的代价：只能从 git log 反推出事实，当时的实测读数全丢了。
- **文档与代码矛盾时，先证明哪边是真的，再改表述**；不许为了少改一行而把代码往过期文档上凑。
- **写进文档的每个数字都要能指回来源**：当天实测（写日期 + 环境）、或某个 commit / ADR / issue。反推出来的必须标「补记」并写清证据来源。
- **不许写会自己漂的计数**（ADR 份数、标签个数、烟测判据数、组件个数……）。要数字就现测；必须写时写成"由 X 派生、现测方式为 Y"。
- 改完自查一遍：**文档里被这次改动推翻的句子**（旧数字、旧口径、旧文件路径）有没有残留。用 `grep` 找旧值，别靠记忆。

### 2. 改什么 → 必须同步哪一份

| 这轮改了什么                                     | 必须同步                                                                                                                   |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| 任何用户可见的行为 / 视觉 / 交互                 | `CHANGELOG.md`（新条目，日期在最新一条之上）+ 相关 `docs/agents/*.md`                                                      |
| 样式、token、类名、层叠值、光标                  | `docs/agents/styles.md`（层叠关系表是契约，改值前先核对）                                                                  |
| 客户端脚本、Swup 生命周期、layout 级组件         | `docs/agents/components.md`（含"新增客户端代码必须遵守"的协议条）                                                          |
| 构建链、依赖、部署、remark/rehype 插件           | `docs/agents/build-and-deploy.md`                                                                                          |
| 命令 / env 形态 / 烟测判据条数 / 已知坑          | `docs/agents/commands.md`                                                                                                  |
| 领域术语、称呼、"它是什么不是什么"               | `GLOSSARY.md`（`_Avoid_` 行也要跟着改）                                                                                    |
| 难以回退、有真实取舍、令人意外的决定             | 新建 `docs/adr/NNNN-*.md`（按序编号，不记份数）；**改了某个 ADR 的决定**就写新 ADR 并在开头写明替代谁，旧 ADR 保留为历史   |
| 天气判据 / 取数                                  | `docs/agents/weather-capsule.md`                                                                                           |
| 文章写法、外部 Markdown 导入、头图               | `docs/agents/post-authoring.md`                                                                                            |
| issue / 标签规范                                 | `docs/agents/issue-tracker.md`、`docs/agents/triage-labels.md`                                                             |
| 归档 / 删除既有的计划、规格、票册                | `docs/history/history.md`（新增索引行：结果 + 落地提交 + `git show` 恢复命令）**并且**全仓库改掉指向旧路径的引用，别留死链 |
| 本文件里的事实（工具名、命令、路径、协议、约束） | **本文件**；只改「项目背景」以下的可编辑区，上面的固定上下文一个字都不许动（见文首 `!IMPORTANT`）                          |

### 3. `CHANGELOG.md` 的写法

- **一条 = 一天或一批相关变更**，标题 `## YYYY-MM-DD：一句话说清"变了什么"`，**新的在最上面**。
- 正文写四类东西，能少写但不能不写：**改了什么**（含选择器 / 文件锚点）、**为什么这么定**（裁决点，尤其"看起来该改但不许改"的地方）、**实测证据**（数字 + 日期 + 环境；没测就写"未验证"）、**怎么验证的**（命令 / 判据）。
- 失败路径与踩坑要写进去——那是后来者最容易重复踩的部分。
- 细节不在这里复述：指向 commit、ADR、`docs/agents/*.md`。
- **允许补记**，但必须在该条目或该段开头标「补记（日期）」并写清证据来源（git log / ADR），且只写证据支持得住的结论。

### 4. `docs/adr/` 的写法

- 只记**难以回退、有真实取舍、令人意外**的决定；能顺手改回去的、纯实现细节的，写进 `CHANGELOG.md` 或 `docs/agents/` 就够。
- 结构：一句话决定 → 背景（为什么需要决定）→ 决定 → **被否掉的其他方案及否决理由**（这一段最有价值）→ 代价与边界 → 守卫在哪（哪条判据/哪份文档守着它）。
- ADR 里不复制代码全文，只写路径与锚点。

### 5. 什么时候必须停下来问站长

- 文档改动会**推翻一条既有裁决**（比如"这是有意为之，勿改"的那类）——先问，不要自行改写口径。
- 发现**文档与代码矛盾但你无法证明哪边对**——把两边的证据摆出来问，不要猜。
- 想删/归档既有文档——先问。

## 常用命令

命令名与参数以 `package.json` 的 scripts 为准（**唯一真源**）。每条命令的用途、前置条件、env 变量形态与已知坑见 `docs/agents/commands.md` —— 要跑烟测/单测/构建期取数/票册自检时先读那一份。

最常用的四个：`pnpm install` / `pnpm dev` / `pnpm build` / `pnpm check`。

提交时有本地 prettier 门禁（只查暂存内容，`git commit --no-verify` 可单次绕过）：启用方式、worktree 影响与边界见 `.githooks/README.md`。

两条不做就会白跑的事实：

- **Windows 上 `pnpm build` 失败时，尾部可能看不到完整错误**（esbuild 崩溃断言）——看完整输出，不要只 tail。
- **OG 图端点在构建期从 `fonts.googleapis.com` 拉字体交给 satori**：Node 内置 fetch **默认不读 `HTTP_PROXY`**，只有 `NODE_USE_ENV_PROXY=1` 才读（坏代理对照实测：不设变量请求成功、设了 `ECONNREFUSED`）。但**本机没有真直连**：Clash Verge 的 Mihomo TUN 用 fake-ip 接管 DNS 与流量（`dns.lookup` 返回 `198.18.0.108`，网卡 `Mihomo` Up），不设变量的那条路照样经代理，只是走 TUN 而非 `HTTP_PROXY`。两条路依赖同一份订阅节点，节点抖动时都会超时——**报字体错误先换节点或重试，别改构建代码**。**用 curl 或 PowerShell 探这个域名返回 200 证明不了 Node 那条路能过**——两者走的不是同一条路。

## 环境区分（必须遵守）

- **测试环境（本地）**：`http://localhost:4321`（`pnpm dev`；preview 可用 `pnpm preview --port 4322` 等指定端口）。验证交互、布局、Swup 切页均在本地做。**`pnpm dev` 下 Pio 是正常渲染的**（`start.bat` = `pnpm start --open` = `astro dev`，与 `pnpm dev` 同一条命令；2026-11-02 实测 `.pio-container` 存在、水合成功、pageerror 为 0）。它「看起来没渲染」是因为**默认折叠**（`posterGirl` 不为 `"1"` 时带 `hidden`、盒子 0×0），点左下角「召唤」才展开。旧文档「dev 下 Pio 不渲染、必须 build && preview」的结论已作废，别再按它判断。
- **生产环境（线上）**：`https://caiyan12.github.io/`（GitHub Actions 部署）。验证部署是否生效看响应头 `Last-Modified` 是否晚于部署完成时间，或下载 run 的 `github-pages` artifact；Fastly 边缘缓存 HTML `max-age=600` 且缓存键不含查询串（加 `?cb=` 无效）。playwright 线上偶发 30s 超时时可用 `Invoke-WebRequest` 直接下载 HTML/JS 做内容断言。

## 架构要点

### 配置驱动（改配置 = 改站点）

`src/config.ts` 是所有站点行为的控制中心：

- `siteConfig` — 标题、作者、URL、每页文章数、备案号等
- `navBarConfig` — 平铺导航项（首页/微言碎语/留言板）+ 四组下拉：`archiveSite`（文章归档：全部文章 `/archive/` + 标签分类 `/tag/` + 文章分类 `/category/` + 热门推荐 `/hot/`）、`aboutSite`、`extra`、`resourceSite`；`social`（B站/QQ/微信/RSS 图标）仍在 `Navbar.astro` 的 `.m-nav` 渲染；下拉渲染分列在 `Navbar.astro`（桌面 hover 下拉）与 `MMenu.astro`（移动端全屏菜单），**两处必须同步修改**，父项 current 由子链接 `some()` 判定
- `sidebarConfig` — 侧栏小部件顺序
- `commentConfig` — **Giscus 评论**，已开启并绑定 `CaiYan12/caiyan12.github.io` 的 `Announcements` 分类；文章评论区使用 `pathname`，留言板使用 `specific` + `data-term="guestbook"`；`reactionsEnabled: "1"`、`emitMetadata: "0"`；其余 `repoId`、`categoryId`、语言和主题 URL 在 `src/config.ts` 中维护
- `slideshowConfig` — 首页幻灯片（图片在 `public/images/slide/`）

### 内容组织

- 文章：`src/content/posts/<yyyymmddhhmmss>/index.md`（**目录名即 URL slug**，可放封面图在同目录），schema 在 `src/content.config.ts`（posts + spec 两个 collection）
- frontmatter 字段：title/published/category/tags/description/image/pinned/views/comments/hotness(0-5)/draft 等，其中 comments/hotness 用于首页吐槽与热门展示；views 为迁移兼容字段，当前不渲染围观数
- 文章页的分类/标签链接**只对真的生成出来的路由发**（`src/pages/posts/[...slug].astro`）：合法性判据与 `/tag/[tag]`、`/category/[category]` 的 `getStaticPaths` **同源**，即 `getTagList(publicPosts)`／`getCategoryList(publicPosts)` 的名字集合——这两个函数都先过 `isPublicPost`，所以 `private: true` 文章独占的那一项从不生成页面。无路由的项降为**纯文字 `<span>`**，不是整行删除：私有文章若用的是公开分类（实测 `技术` 就是有路由的），链接照常保留。勿改回无条件发 `<a>`，那会重新制造 404（GitHub issue #41）。冒烟 `pnpm smoke:ui` 的 `#41` 三项判据守着这条，**被检页面清单取自 sitemap** 而不是从站内链接爬——私有文章页不被任何公开页链出，爬是爬不到的。**将来若改 sitemap 收录策略，必须在同一笔 commit 里给那条判据换页面清单来源**，否则它会静默退化成「只查公开页」（spec #42 登记的跨轮硬约束）
- 特殊页面：`src/content/spec/about.md`（关于）
- 数据文件：`src/data/diary.ts`（说说）、`friends.json`（友链单一数据源）+ `friends.ts`（`Friend` 类型与兼容导出）、`comments.ts`（开发环境最新评论 mock）、`guestbook.ts`（开发环境留言板单条换一批 mock）、`site-stats.json`（构建期同步快照）
- 相册：**文件夹驱动**——`public/images/albums/<相册名>/` 下放图即自动生成相册（`src/utils/album-scanner.ts` 构建期扫描，中文目录名没问题，slug 用原始名不要预编码）

### 文章 URL 硬规则（必须遵守）

- `src/content/posts/` 的所有直接子目录（公开、私密、草稿、模板示例均包括）必须严格匹配 `^\d{14}$`，格式为 `yyyymmddhhmmss`。
- 文章路由固定为 `/posts/<yyyymmddhhmmss>/`；禁止使用标题、中文或其他自定义目录名作为 slug。
- `published` 只有日期时，时间部分统一补 `000000`；已有时分秒必须与目录名保持对应，不得用文件系统时间替代。
- 新文章使用 `pnpm new-post -- <yyyymmddhhmmss> [标题]`；`scripts/validate-post-slugs.mjs` 已接入 `pnpm build`，目录不合规时构建必须失败。
- 整理旧文章目录后，必须同步检查 README、CHANGELOG、文章正文示例及其他静态引用中的旧 `/posts/.../` 路径。

## 注意

- 原始 Emlog 主题 `D:\pages\limh.me` 的 `module.php` 含 `/e` 修饰符 eval 漏洞、`function/favicon.php`/`image.php` 是开放代理——不可搬回本项目
- 图片等静态资源都放 `public/` 直接引用，不走 Astro 的 import 管线
