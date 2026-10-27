# AGENTS.md

## Skill Rule:

We have compiled a set of "skills": folders of best practices for different forms of work. These encode hard-won trial-and-error about producing professional output. Several may apply to one task, so don't read just one. You need always be smart to use skills like:

- /grill-me on big changes sessions or any other you need to know.

- /design-flow on every ui/ux designing, changing or frontend processing. This is a leader skill, you need to dynamically check what position you are and load needing subskills matching the current status.

- /self-improvement when you make mistakes.

- /wayfinder on loose or unclear messages.

- /chinese-encoding on chinese language write-in or bash sessions.

- /obsidian-vault for local knowledge base, query firstly when needing knowledges.

- /context7-mcp or other needing MCP servers.

- /thesvg for needing brand icons.

- /pexels for needing actual no-copyright pictures.

- If it's the first time setting up the project be sure to use /setup-matt-pocock-skills and /using-superpowers to setup a skill-driven workflow, then strictly tighten the workflow with their skill series in this document.

    Read the skills, and involve the useful skills in your plan before you already know what to plan and to do.

---

## Coding Rule:

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

## Plan Mode Rule

### 1. Automatically triggers Plan Mode on

- Custom code solving a specific or foggy user problem

- Any long-form creative writing

- Structured reference content users will save or follow

- Modifying/iterating on an existing artifact; content that will be edited or reused

- A standalone text-heavy uploaded document >100 lines, or a plan or a handoff file mentioned by the user.

### 2. Plan File

When generating a plan, follow these instructions to sharpen a plan:

1. Get precise project info directly in project docs, git history, important codes, etc.
2. Run /grill-with-docs for a grilling session for more detailed info.
3. Turn the detailed task into different workable steps.

A finale plan should be detailed into phases and steps, A checkbox is needed for a step. When working for a plan, you need to update the status of each steps.

---

## Memory & Experience Rule

You have a persistent memory filesystem. You could reach your direct memories simply at "\.codex\memories" in Appdata

### 1. Project Memory is Needed

Except for your persist memory system, You could setup your specific project-based memory filesystem "\.codex\memories" on the project to make it enable to transfer messages between different agent sessions, kept for future-you, who re-reads these files at the start of every conversation.

When a question concerns the user or their world — anything they may have told you before — check the memory listing before
answering from conversation memory alone: if any file's description could plausibly hold the answer, read it first.

Always read before saying you DON'T have or know something.

You are ABLE to lead the user and the session to go with the relevant memories.

### 2. Memory Settings

- You are running in **chat**. Other running sessions may also write to the same filesystem, so you may see files you didn't create.
- When it's a begin of a session, you need to load project memories for knowing the work status we're. Memories are needed for primal context.
- For faster querying, the memory filesystem requires an index file.

### 3. Memory Querying

- When you've hit a wall, you can find the answers in your memories.
- When you notice you've been in similar tasks, you can query the memories to find similar experience.
- If the memory is `(empty)` or `<profile>` shows `(not yet written)`, you're starting from nothing. Just help the user and answer from the conversation.
- Index file will help you querying.
- You are able to query other agents' project memories by reaching their memory folder like .zcode/, .trae/, .workbuddy/, or .learning/, etc.

### 4. Memory Appending

- When user are stressing a point or you noticed some important messages, append that into your memories.

### 5. Outdated Memories

- Mission-completed tasks and dated over 60 days memories are considered outdated. When user are speaking of cleaning the memories, clear those outdated files.

---

## Git Rule

### 1. Commit Rule

- .git folder, README.md, AGENTS.md, .gitignore or other any git needing file are needing for a git commit.
- At most of the time, the .gitignore file is convincing and precise as long as it's updated. You can do the commit directly without file analysis.
- An closely updated README.md, AGENTS.md or other needing docs shall never be ignored in a commit.

### 2. Push Rule

- Normally when a commit passed real testing, a push should be ready to lead by you.
- Do not create branches unless the user mentions.
- Do not add GitHub contributors or co-founders unless the users mentions.
- Open-source publish uses MIT.

### 3. .gitignore Updating Rule

Agents memories(like .zcode/, .trae/, .workbuddy/, .claude/, .codex/), plugin files(like .mimosa/, playwright files), node modules or other files you think it's not necessary should be listed into a gitignore file.

The gitignore file should be updated when:

- New functions updated, or previous functions changed or deleted.
- New essential library or dependency added.
- User mentioned.

---

## How to suggest

- You should call online and local search with keywords drawn from the task itself and suggest only results genuinely relevant to what the person is doing, because irrelevant suggestions teach the person to ignore the cards — if nothing fits well, you should suggest nothing.
- You should render at most one suggestion card per conversation total, unless the person asks for more, because repeated suggestions interrupt the conversation and feel pushy. If the person dismisses or doesn't engage with a card, you should not suggest again in that conversation.
- You should keep in mind that not all the users are fully professional, they may find them in a wall if your responses are involving with mass professional terminologies. You should explain the current problem or progress in an easy-to-understand, a way that even a freshman could understand. Sometimes a metaphor would be useful.
- Give me a simplified conclusion at the end if the responses are too long, the users' got limited time and patience.
- You have the responsibility to lead the user what to do next. You can guess the user's intention this time and give the proper way to continue our task.
- Your tone should be direct and precise, do not go around the bush.

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

### Issue tracker

本仓库（`CaiYan12/caiyan12.github.io`）的 issue 与 spec 记在 GitHub Issues，一律用 `gh` CLI 读写；PR 不作为需求入口。见 `docs/agents/issue-tracker.md`。

`/wayfinder` 的地图/子票/阻塞边操作也走 GitHub：子票用原生 sub-issues，阻塞用原生 issue dependencies（该仓库两者均已启用，`blocked_by` 取的是数据库 id 不是 `#number`）。**五个 `wayfinder:*` 标签当前不存在**，建图前须先 `gh label create`，否则 `--label` 会 not found 且什么都不建。实测细节见 `docs/agents/issue-tracker.md` 的「Wayfinding reality」一节。

### Triage labels

五个默认标签串（`needs-triage` / `needs-info` / `ready-for-agent` / `ready-for-human` / `wontfix`）是技能侧的**约定词表**，与角色名一一对应，不另设映射。2026-09-24 实测本仓库 GitHub 端只有 `wontfix` 与 `ready-for-agent` 两个；2026-10-06 补建 `needs-triage`（#fbca04）、`needs-info`（#d4c5f9）、`ready-for-human`（#1d76db），五个角色现全部可用。贴标签前仍先 `gh label list` 核可用值（现值现测，本文件不记标签总数）。见 `docs/agents/triage-labels.md`。

### 文档写作约定（2026-09-22 立，Q45-B）

- **约束以「选择器 + 文件路径」为锚点**，行号只作辅助且必须写「约」。本轮 UI 整改里三次误判的根源都是拿旧行号当现值（药丸样式记录漂了约 220 行、`.prose code` 的定位两次都错）。
- 带日期的历史实测数字**保留原样**（它们是那次测量的记录，不是当前事实）；需要当前值就重新测。
- 无法本地复核的数字（第三方图种数量、历史构建文件数）标 `UNKNOWN` 或明确写「未复核」，不得当作改动依据。
- **本文件（`AGENTS.md`）不写会随仓库增长的计数**（ADR 份数、标签个数、模块数……）。这类现值一改就漂，而且没有 CI 看管——`lint.yml` 只跑 `prettier --check ./src ./docs`，`AGENTS.md` 不在检查范围内。需要数字时现测，别在这里留一份快照。
- **参考材料按分支拆在 `docs/agents/`**，本文件只留指针（见「深入文档」表）。**新增约束时先判断它属于哪条分支**：只对某一类工作成立的（改样式 / 改天气 / 动组件 / 改构建 / 写文章 / 跑命令）就写进对应那份，别塞回本文件——本文件只有 32KB 的注入预算，塞满了后面 87% 的内容会**永远进不了任何 agent 的上下文**（2026-10-27 实测：搬迁前本文件 247KB，运行时只注入前 32KB，样式/天气胶囊/大坑警告三节全在被截掉的那一半里）。

### Domain docs

单上下文布局：根 `GLOSSARY.md` 术语表 + `docs/adr/`（按序编号；**本文件不记份数**，需要现值就 `ls docs/adr/`）。探索、命名或写 issue 前先取用 `GLOSSARY.md` 的既定称呼；ADR 只记「难以回退、有真实取舍、令人意外」的决策。见 `docs/agents/domain.md`。

## 项目背景

WindowsIt 个人博客（WindowsIt's Music Club），由 Emlog Colorful（明月浩空）主题迁移而来的纯静态 Astro 博客。视觉必须还原 Colorful 原版（海洋绿 `#00c000` 主色、白底圆角卡片、自定义光标），技术栈对齐 `D:\pages\mizuki`。迁移任务的完整背景与取舍见 `D:\pages\emlog-to-astro-migration-prompt.md`。

**元件设计约束（2026-10-06 站长声明）**：新增任何元件前，先最大化复用站内既有设计资产；确需新元件时，其风格与 taste 必须最大化继承既有元件。落地优先级：**直接引用现成组件 → 复用既有类名的 DOM 语法 → 才新写样式**，且新样式的色值 / 字号 / 线型一律取自 `global.css` 既有 token，不引入新设计语言。复用前先看有没有现成的：`ListingHeader.astro`（列表页头）、`WidgetLayout.astro`（侧栏小部件外框）、`PostCard.astro` + `Pagination.astro`（卡片与分页）、`ResponsiveImage.astro` + `getLqipProps()`（带 LQIP 的图）。图标限定在 vendored 的 **Font Awesome 4** 内（`fa-book-open`、`fa-clone`、`fa-layer-group` 这类 FA5+ 新名在本仓库不存在）。

## 深入文档（按需读，别整篇背）

本仓库的参考材料按分支拆开了。**命中下面哪一条，就去读那一份**；别把整份 AGENTS.md 背下来。

| 触发条件 | 读哪份 |
| --- | --- |
| 查 Colorful 原版某功能本站怎么实现的 / 动主题行为 | `docs/agents/emlog-mapping.md` |
| 改任何样式、token、组件类名 | `docs/agents/styles.md` |
| 改天气胶囊、天气判据、天气取数 | `docs/agents/weather-capsule.md` |
| 动客户端脚本、Swup 生命周期、看板娘、Nice Books、评论/表情/统计 | `docs/agents/components.md` |
| 改构建链、依赖、部署，或**动 remark/rehype 插件**（不删 content layer 缓存会构建出旧 HTML 且无报错） | `docs/agents/build-and-deploy.md` |
| 写文章、把外部 Markdown 导进来、生成头图 | `docs/agents/post-authoring.md` |
| 跑烟测 / 单测 / 构建期取数 / 票册自检（每条命令的 env 形态与坑） | `docs/agents/commands.md`（含冒烟台子 `makeHarness` / base URL 结尾斜杠 / `norm` 聚合三条承重契约） |
| 领域术语与 ADR | `GLOSSARY.md`、`docs/adr/` |
| issue 规范、标签 | `docs/agents/issue-tracker.md`、`docs/agents/triage-labels.md` |

## 常用命令

命令名与参数以 `package.json` 的 scripts 为准（**唯一真源**）。每条命令的用途、前置条件、env 变量形态与已知坑见 `docs/agents/commands.md` —— 要跑烟测/单测/构建期取数/票册自检时先读那一份。

最常用的四个：`pnpm install` / `pnpm dev` / `pnpm build` / `pnpm check`。

两条不做就会白跑的事实：

- **Windows 上 `pnpm build` 失败时，尾部可能看不到完整错误**（esbuild 崩溃断言）——看完整输出，不要只 tail。
- **OG 图端点在构建期从 `fonts.googleapis.com` 拉字体交给 satori**：本机 Node 的 fetch **不读 `HTTP_PROXY`**（直连 TUN 假 IP 会超时），构建前须设 `$env:NODE_USE_ENV_PROXY='1'`。**用 curl 或 PowerShell 探这个域名会返回 200，但那证明不了构建能过** —— 那条路走代理，Node 那条不走。

## 环境区分（必须遵守）

- **测试环境（本地）**：`http://localhost:4321`（`pnpm dev`；preview 可用 `pnpm preview --port 4322` 等指定端口）。验证交互、布局、Swup 切页均在本地做；注意 `pnpm dev` 下 Pio 不渲染（见 Pio 段），验证 Pio 必须 `pnpm build && pnpm preview`。
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

