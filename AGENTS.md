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

### Triage labels

沿用五个默认标签串（`needs-triage` / `needs-info` / `ready-for-agent` / `ready-for-human` / `wontfix`），与角色名一一对应，不另设映射。见 `docs/agents/triage-labels.md`。

### Domain docs

单上下文布局：根 `CONTEXT.md` 术语表 + `docs/adr/`（现仅 0001）。探索、命名或写 issue 前先取用 `CONTEXT.md` 的既定称呼；ADR 只记「难以回退、有真实取舍、令人意外」的决策。见 `docs/agents/domain.md`。

## 项目背景

WindowsIt 个人博客（WindowsIt's Music Club），由 Emlog Colorful（明月浩空）主题迁移而来的纯静态 Astro 博客。视觉必须还原 Colorful 原版（海洋绿 `#00c000` 主色、白底圆角卡片、自定义光标），技术栈对齐 `D:\pages\mizuki`。迁移任务的完整背景与取舍见 `D:\pages\emlog-to-astro-migration-prompt.md`。

## 常用命令

```bash
pnpm install     # 安装依赖（中国网络需先设 registry 为 https://registry.npmmirror.com）
pnpm dev         # 本地开发 http://localhost:4321
pnpm build       # 构建 dist/（项目目录 + LQIP + GitHub 仓库/贡献数据 + astro build + Pagefind，已串联）
pnpm new-post -- <yyyymmddhhmmss> [标题]  # 按强制 URL 规范创建文章
pnpm fetch-projects        # 刷新“我的项目”GitHub 仓库与 Pinned 快照
pnpm test:projects         # 项目同步、缓存、合并与排序测试
pnpm fetch-repos --refresh  # 全量刷新 GitHub 仓库卡片元数据缓存（默认增量只拉缺失）
pnpm fetch-friend-icons     # 增量补齐缺失的友链图标缓存
pnpm fetch-friend-icons --refresh  # 手动刷新当前友链图标缓存
pnpm preview     # 预览构建产物（需先 build）
pnpm check       # astro check 类型检查
pnpm test:contributions  # 贡献日历数据脚本离线单测（node --test，注入 fetchImpl 不访问真实网络）
pnpm test:nice-books  # Nice Books 单测（数据契约/随机去重/搜索/封面，node --test，已串入 build 链头部）
pnpm test:site-stats # Giscus 同步单测（fetchImpl/输出路径全注入，无需令牌、0.6s，已串入 build 链头部）
pnpm smoke:nice-books  # Nice Books 三页 Playwright Smoke；支持 NICE_BOOKS_BASE_URL 指向 build + preview
pnpm test:fancybox     # 灯箱 Playwright Smoke（关闭不跳位/焦点归还/定位按钮/下载新标签页/中文文案，需先 build + preview；FANCY_BASE_URL 可覆盖地址）
pnpm test:fancybox 打线上时 FANCY_BASE_URL 传的是**站点根**（脚本自己拼 /posts/... 与 /albums/...），而 NICE_BOOKS_BASE_URL / AI_NEWS_BASE_URL 传的是**完整页面地址** —— 三者形态不同，传错会表现为「选择器等不到」的假失败。2026-09-20 起放大两项改为等原图解码 + 轮询到高度稳定，本地与线上均 27/27
pnpm format      # Prettier 格式化（tabWidth 4, useTabs true）
```

注意：Windows 上 pnpm build 失败时尾部可能看不到完整错误（esbuild 崩溃断言），务必看完整输出而非 tail。

OG 图端点在**构建期**从 `fonts.googleapis.com` 拉字体交给 satori，本机网络抖动会让 `astro build` 以 `Error: No fonts are loaded. At least one font is required to calculate the layout.` 失败（日志里伴随 `host: 'fonts.googleapis.com'` 的连接错误对象）。这不是代码问题：先用 `curl -o /dev/null -w "%{http_code}" https://fonts.googleapis.com/css2?family=Noto+Sans+SC` 确认连通性，再重跑 `pnpm build` 即可（2026-09-20 实测一次抖动、随后两次全绿）。

## 环境区分（必须遵守）

- **测试环境（本地）**：`http://localhost:4321`（`pnpm dev`；preview 可用 `pnpm preview --port 4322` 等指定端口）。验证交互、布局、Swup 切页均在本地做；注意 `pnpm dev` 下 Pio 不渲染（见 Pio 段），验证 Pio 必须 `pnpm build && pnpm preview`。
- **生产环境（线上）**：`https://caiyan12.github.io/`（GitHub Actions 部署）。验证部署是否生效看响应头 `Last-Modified` 是否晚于部署完成时间，或下载 run 的 `github-pages` artifact；Fastly 边缘缓存 HTML `max-age=600` 且缓存键不含查询串（加 `?cb=` 无效）。playwright 线上偶发 30s 超时时可用 `Invoke-WebRequest` 直接下载 HTML/JS 做内容断言。

## 架构要点

### 构建链与依赖约束（2026-09-20 起 Astro 6）

- 版本：astro 6.4.8 / @astrojs/react 5.0.7 / @astrojs/svelte 8.1.2 / astro-expressive-code 0.43.1（`^0.43` 而非 0.44）/ @swup/astro 1.8.0 / tailwindcss 3.4.x。**Tailwind 不再经 @astrojs/tailwind**——该集成 peer 只到 Astro 5，是当初升级的硬阻碍；现由根 `postcss.config.mjs` 直连 `[tailwindcss/nesting, tailwindcss, autoprefixer]`，顺序照集成原先的实际产出，`autoprefixer` 已转为直接依赖。原配置文件里 import 的 `postcss-import` 既非声明依赖、全站 CSS 又零 `@import`，会让该文件在集成内静默加载失败，已移除；**不要再加回 @astrojs/tailwind**。
- **Markdown 处理器已迁到 `markdown.processor: unified({...})`（2026-09-20，构建告警已清零）**：Astro 6.4.0 起提供 `processor`，且它的默认值本就是 `unified()`，所以这一步只是把插件从「隐式默认 + 事后折叠」改成显式声明，`git diff -w` 只剩 import 与包裹两行。要点：① `@astrojs/markdown-remark` 必须作为直接依赖并**精确对齐 astro 自己解析到的版本**——astro 6.4.8 的 package.json 里是硬钉 `7.2.0`（不是范围），装 latest 7.3.1 不会去重、会变成两份副本；② 旧的 `markdown.remarkPlugins` 由 `core/config/validate.js` 的 `coerceLegacyMarkdownPlugins` 在 **resolveConfig 内部** push 进 `processor.options`，而 `build()` 是先 resolveConfig 再跑集成钩子，所以 expressive-code 的 `rehypePlugins.push(rehypeExpressiveCode)` 在两条路径下都排在我们插件**之后**，顺序不变；③ `gfm`/`smartypants` 在 7.2.0 内有 `processor.options.gfm ?? shared.gfm` 兜底，本站未设置。**改 markdown 管线的 A/B 验收方法（下次直接复用）**：两侧都用 `pnpm exec astro build`（绕开 fetch 脚本以保证输入相同）并先删 `node_modules/.astro/` 与 `.astro/data-store.json`；`dist/_astro/**` 全部资源应逐字节相同（最强信号）；HTML 侧必须先剥掉 `<div class="widget tab-widget" data-tab-widget>`（侧栏「文章推荐」含构建期随机挑选），否则每次构建都有约 122 个页面的假性差异；用 `--import` 预加载去改 `Math.random` **消不掉**这层噪声（Astro 的 markdown 渲染跑在 worker 线程里，预加载只在主线程生效，实测无效）。要把噪声归零做全量证明：把 `src/utils/shuffle.ts` 的 `shuffleArray` 临时改成原样返回，两侧都跑 `astro build` + `inject-buddha-banner` + `pagefind`，再比对完整产物（本次结果：1114 个文件逐字节 0 差异，含 pagefind 索引）。（升级当时另有比对：三篇文章正文 HTML 与 Astro 5 完全一致，含 73KB 的 Markdown 语法示例文。）
- `getTagList()` / `getCategoryList()` **必须保持全序**（文章数倒序 → 最早引入该标签/分类的文章时间 → 名称）。原因：并列名次若只靠 `Array.prototype.sort` 的稳定性，顺序取决于 `getCollection()` 的遍历顺序，而 Astro 5 与 6 定义不同——升级实测会让侧栏标签云 32 个药丸重排，并连带改变 `#blogtags` 的 nth-child 六色轮换归属。任何新增的"按计数排序"列表同理。
- 本地安装须带项目内 store：`pnpm add --store-dir .pnpm-store <pkg>`（`node_modules/.modules.yaml` 记录 `storeDir: <repo>/.pnpm-store/v10`，全局配置已不指向它，裸跑 add 会报 store 版本不匹配）。
- 升级回归验证脚本 `scripts/upgrade-style-audit.mjs`（Astro 6→7 时复用）：`capture` 用 Playwright 对 24 个关键页逐元素采集计算样式指纹（含 `::before/::after`），`diff` 支持顺序无关比对。采集前必须冻结动画、种子化 `Math.random`（否则稿纸逐字符抖动不可复现），并排除明月浩空播放器（远端异步、含 `#myhk*` 的 id 选择器，`[class*=]` 抓不到）、看板娘、轮播、3D 标签云、swup 瞬时类名与带端口的绝对 url——这些都是实测过的假阳性来源。**同数据的新旧构建 A/B 才是有效比对**；线上产物与本地基线必然存在差异（CI 会重新生成 GitHub 快照与贡献日历、幻灯片当前帧与播放器歌单属异步状态），不要拿线上比对当样式结论。配合 `Last-Modified` 与内容断言使用。`deploy.yml` 的 `cache: false` 仍不得回退。

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
- 特殊页面：`src/content/spec/about.md`（关于）
- 数据文件：`src/data/diary.ts`（说说）、`friends.json`（友链单一数据源）+ `friends.ts`（`Friend` 类型与兼容导出）、`comments.ts`（开发环境最新评论 mock）、`guestbook.ts`（开发环境留言板单条换一批 mock）、`site-stats.json`（构建期同步快照）
- 相册：**文件夹驱动**——`public/images/albums/<相册名>/` 下放图即自动生成相册（`src/utils/album-scanner.ts` 构建期扫描，中文目录名没问题，slug 用原始名不要预编码）

### 文章 URL 硬规则（必须遵守）
- `src/content/posts/` 的所有直接子目录（公开、私密、草稿、模板示例均包括）必须严格匹配 `^\d{14}$`，格式为 `yyyymmddhhmmss`。
- 文章路由固定为 `/posts/<yyyymmddhhmmss>/`；禁止使用标题、中文或其他自定义目录名作为 slug。
- `published` 只有日期时，时间部分统一补 `000000`；已有时分秒必须与目录名保持对应，不得用文件系统时间替代。
- 新文章使用 `pnpm new-post -- <yyyymmddhhmmss> [标题]`；`scripts/validate-post-slugs.mjs` 已接入 `pnpm build`，目录不合规时构建必须失败。
- 整理旧文章目录后，必须同步检查 README、CHANGELOG、文章正文示例及其他静态引用中的旧 `/posts/.../` 路径。

### 静态替代动态功能的映射
| 原 Emlog 功能 | 现实现 |
|---|---|
| Pjax 无刷新 | Swup.js（`astro.config.mjs` 的 swup 集成，容器 `main`） |
| 搜索 | Pagefind（构建期索引，`src/components/control/Search.svelte`） |
| 评论/留言板 | Giscus（`src/components/comment/Giscus.astro`，按 `commentConfig.enable` 开关；文章尾部保留原生表情；主题样式见 `public/giscus-theme.css`） |
| 主页吐槽水军 | 构建期从 guestbook Discussion 同步最多 20 条顶层留言到 `guestbookComments`，侧栏单条展示并复用“最新评论—换一批”系统，不在浏览器请求 GitHub/Giscus |
| 图片灯箱 | Fancybox 6（`src/utils/theme-script.ts` 的 `initFancybox()` 懒加载绑定，unbind→bind 单例协议）；工具栏文案走官方 `@fancyapps/ui/dist/fancybox/l10n/zh_CN.js` **在本地合并扩展**（`l10n` 是整体替换，缺 key 会露出 `{{KEY}}`，新按钮文案 `LOCATE_TO_ARTICLE` 就合并在此处，不改 vendor 文件）；右上角 `download` 按钮的点击由 document **捕获阶段**监听拦截并 `window.open(src, "_blank", "noopener")`（库默认是 `a[download].click()` 直接落盘保存，勿改回默认行为，也别用冒泡阶段监听——晚于 Carousel 自身处理）；**`placeFocusBack: false`** 取消库默认的"关闭时把页面滚到当前图"（库内 `Te()` 仅在触发元素离屏时才 `scrollIntoView`），关闭后的键盘焦点归还改由 `on.destroy` 手动 `focus({preventScroll:true})` 补回（正文 `<img>` 不可聚焦，此调用只对 `album`/`qr-code` 的 `<a>` 生效，勿为此给 `<img>` 加 `tabindex`）；`locate`（定位到文章位置）按钮仅 `post-gallery` 组出现，靠**函数型 `Carousel` 选项**按 `triggerEl` 的 `data-fancybox` 判定 `display.right`——库运行时支持函数型选项但 `.d.ts` 只声明对象形态，故 bind 选项处有一处 `as unknown as Parameters<...>[1]` 断言，勿"顺手修掉"；灯箱打开期间 `html.with-fancybox body.hide-scrollbar{overflow:hidden}` 锁死滚动，任何"滚到某处"的逻辑必须排在关闭之后（`pendingLocateEl` → `on.destroy` 的 rAF），`destroyFancybox()` 需清空该状态。**文内图标记只认内容图**：`initFancybox()` 给 `.post-context img` 打 `data-fancybox="post-gallery"` 时必须跳过 `img.closest(".qrimg, .github-card, table")` 与 `data:` URI——仓库卡片 owner 头像（`remark-extended.mjs` 输出，`alt=""` + `aria-hidden="true"`）与文章对比表格里手写的 24px `github.com/<user>.png` 头像都是元件/行内图标，计入会让灯箱多出上百个不可读翻页项（实测全站 87 + 167 个，表格内真实内容图为 0，故按 `table` 整容器排除无损失）；将来若确需在表格内放可放大正文图，须改为按尺寸/显式标记放行而非直接删这条。**顶部净空**：`global.css` 里 `.fancybox__container .fancybox__slide{padding-top:calc(var(--f-button-height)+16px)}`（=62px，正好等于绝对定位工具栏高度）——库默认 slide padding 为 0，大图顶边会被左上 X/X 计数与右上按钮压住；该留白**常置**而非按放大态切换（曾用 `:has(.will-zoom-out)` 在放大时释放，实测会让 panzoom 按留白前的盒子算目标、放大结果从原图 3072px 过冲到 3392px），放大态该带保持空白、图片仍按自然尺寸呈现。**指针样式与触发状态同源**：`global.css` 里 `.prose img{cursor:zoom-in}` 已收窄为 `.prose img[data-fancybox]{cursor:zoom-in}`（`data-fancybox` 由 `initFancybox()` 运行时打上），非触发图自动回落站点默认光标；仓库卡片整卡可点击，`.post-context .github-card-link` 显式 `cursor: pointer` 让头像与文字统一手型。回归由 `pnpm test:fancybox`（`scripts/fancybox-smoke.mjs`，需 build+preview，仅本地）覆盖 |
| GitHub 仓库卡片 | 构建期渲染：`scripts/fetch-github-repos.mjs` 拉取元数据缓存到 `src/constants/github-repos.json`，`remark-extended.mjs` 直接输出完整卡片 HTML；卡片左侧使用 `https://github.com/<owner>.png?size=128` owner 头像（桌面 `48×48`，移动 `40×40`），右侧为名称/描述/star/fork/语言；**客户端零 GitHub API 请求**（规避访客 IP 匿名 API 60 次/小时限流），令牌解析 `GITHUB_TOKEN`/`GH_TOKEN` → `gh auth token` → 匿名，拉取失败渲染回退链接不阻塞构建 |
| “我的项目”目录 | `scripts/fetch-github-projects.mjs` 构建期通过 GitHub GraphQL 分页读取 `CaiYan12` 的公开仓库与 Profile Pinned 顺序，排除 fork/归档仓库，写入 `src/constants/github-projects.json`；`src/data/projects.ts` 以大小写精确的 `nameWithOwner` 叠加人工字段与私有项目。已收录 Pinned 按 GitHub 顺序置顶，外部 Pinned 不扩张收录范围，其余按开始时间倒序；无人工状态不显示徽章。刷新失败复用有效缓存，无有效缓存则构建失败；**客户端零 GitHub API 请求** |
| 友链图标 | `scripts/fetch-friend-icons.mjs` 构建期维护 `src/constants/friend-icons.json` 与 `public/friend-icons/`；普通模式只补缺，`--refresh` 手动刷新当前友链并重试负缓存条目，成功写入本地缓存，失败保留旧缓存或记录受控的负缓存状态并显示首字占位，删除友链不清理历史记录；页面运行时只请求本地路径，CI 生成的缓存仅随当次部署 artifact，长期复用需本地生成并提交资产和清单 |
| Markdown 表格 | Markdown 表格经 `rehype-table-wrapper.mjs` 包裹 `.table-scroll`，原生 HTML 表格由 `remark-extended.mjs` 包裹；`global.css` 统一提供满宽、居中、边框和单元格上下居中样式，过宽表格仅在自身容器内滚动 |
| 代码高亮/公式 | Expressive Code + KaTeX（KaTeX CSS 按需动态导入；`expressiveCode` 必须保持 `useDarkModeMediaQuery: false`，否则系统暗色访客的代码块变暗色） |
| Mermaid 图表 | 客户端懒加载渲染（`theme-script.ts` 的 `renderMermaid()`，仅页面存在 `pre.mermaid` 时 `import("mermaid")`）。**体积治理已评估关闭（2026-09-04）**：mermaid 11 对全部 38 种 diagram 均为动态 import，访客只下载实际用到的类型（实测约 450KB gzip），未用 chunk 是 dist 死产物但无访客成本；注册表硬编码在 `mermaid.core.mjs` 不可外部裁剪；预渲染（rehype-mermaid + playwright）需引入 Chromium 构建依赖性价比不足。构建期 3 个大 chunk 警告（cynefin/core/cytoscape）为已知问题保留，勿重新评估 |
| 标签云集页 | `/tag/`（`src/pages/tag/index.astro`，原 `function/page-tags.php` 的 shuffle 随机云改为文章数降序）+ 单标签页 `/tag/xxx/`（`tag/[tag].astro` + `tag/[tag]/page/[page]/` 分页，每页 `siteConfig.tagPostsPerPage: 5`）。两类标签页头部同为 `/tag/` 形态：h2 + 面包屑（首页 » 标签云集 » 标签名）+ `.post-context` 统计行 + 全量 `#blogtags` 药丸云；单标签页当前标签 `a.is-current` 品牌绿高亮 + `aria-current="page"`。构建期静态渲染，数据复用 `getTagList()`，客户端零请求 |
| 分类云集页 | `/category/`（`src/pages/category/index.astro`，2026-09-05 新增，与 `/tag/` 同模式）+ 单分类页 `/category/xxx/`（`category/[category].astro` + `category/[category]/page/[page]/` 分页，每页维持 `siteConfig.postsPerPage: 6` 不另设配置）。两类分类页头部同为 `/tag/` 形态：h2（`fa-folder-open-o`）+ 面包屑（首页 » 分类云集 » 分类名）+ `.post-context` 统计行 + 全量 `#blogtags` 药丸云（含 `.tag-count` ×N）；单分类页当前分类 `a.is-current` 品牌绿高亮 + `aria-current="page"`。构建期静态渲染，数据复用 `getCategoryList()`，客户端零请求；导航入口为 `archiveSite` 下拉的"文章分类" |
| 热门页 | `/hot/`（`src/pages/hot/index.astro` + `hot/page/[page]/` 分页，2026-09-05 新增）：数据复用 `getHotPosts(allPosts, Infinity)` 取全量排序（侧栏部件用默认 `limit=6`），每页 `siteConfig.postsPerPage: 6`；头部对齐列表页形态（h2 `fa-fire` + 面包屑 + `.post-context` 统计行），正文用 `PostCard` 而非复制侧栏 `#hotlog` 排行元件；评论数来自构建期 `site-stats.json` 快照，客户端零请求。导航入口为 `archiveSite` 下拉的"热门推荐" |
| About 页贡献日历 | `/about/` 正文前的 GitHub 贡献日历（2026-09-05 新增）：`scripts/fetch-github-contributions.mjs` 经 GraphQL `contributionsCollection` 拉取近 12 个月写入 `src/constants/github-contributions.json`（已接入 build 链，位于 fetch-github-repos 之后；拉取失败/无令牌 warn 不中断，复用旧缓存或由 about.astro 渲染回退卡），`about.astro` 构建期经 `src/utils/contributions-calendar.ts` 纯函数渲染 `.widget` 形态卡片（统计行+图例+中文月标/周几标签，规格见 GitHub Issue #7）；**客户端零请求零 JS**，动效仅列级入场 stagger（8ms×53 列，从上方 -6px 落下）与格子 hover 缩放 1.3（120ms 仅精确指针），均随附 `prefers-reduced-motion` 变体；`.gh-calendar-scroll` 右 3px/下 4px padding 是为放大溢出预留的，**勿删**（否则悬停最右/最下行会突然弹出滚动条），入场位移方向勿改回从下方升起（同理会瞬时报纵向滚动条）；53 列随容器流式铺满，方形由整体 `aspect-ratio: 53/7` + wrapper `subgrid` 构造保证——**勿改回单格 aspect-ratio**（与 stretch 组合在 Chrome 下循环撑破轨道），窄屏触 `--gh-cell-min` 下限后局部横滚；about.astro 读缓存必须用 `process.cwd()` 相对路径（`import.meta.url` 打包后指向 dist/chunks，会静默走回退卡）；不引入 Bloggify/github-calendar 运行时库（第三方代理单点，违背客户端零请求原则），勿重新评估 |

### 客户端脚本与 Swup 生命周期
- `src/utils/theme-script.ts` 是唯一的客户端逻辑中枢：导航高亮、返回顶部、双击回顶、移动端菜单、Fancybox/KaTeX 初始化
- **Swup 重初始化协议（2026-09-06 审查后统一，新增客户端代码必须遵守）**：`main` Swup 容器内的组件统一监听自定义事件 `colorful:page:loaded`（切换后重跑）并配 `dataset` 守卫防重复初始化（如 Slideshow 的 `data-initialized`）；`main` 容器外的布局级组件（导航/移动菜单/返回顶部/背景）只随 `pagefindReady()` 初始化一次，靠 `*Bound` 旗帜或 dataset 守卫防重入，勿自行监听 `astro:*` 原生事件——容器外布局级确需 before-swap 清理（如 Fancybox destroy）才允许直接听 `astro:*`。历史上四轨并存（*Bound 委托/dataset 守卫/自定义事件/内联 astro:*），新代码不得新增第四种形态；theme-script 按"唯一协议 + 多 init 函数"保持单文件，按关注面拆分为远期独立一期（2026-09-06 审查决策）
- **Swup 切换页面时组件脚本不会重跑**，所以需要重绑定的东西（Fancybox、导航高亮）都注册在 `initSwupHooks()` 的 `content:replace`/`page:view` 里；新增交互若依赖新页面 DOM，必须加到这两个 hook 中
- **`updateHead` 按环境分叉（`astro.config.mjs`，2026-09-20）**：dev 传 `{ persistAssets: true }`、生产保持 `true`。Vite 在 dev 下把懒加载的第三方 CSS（fancybox、katex）以运行时注入的 `<style>` 挂进 head，swup 的 head 同步按"新页面没有此节点"把它删掉，而模块已在 Vite 图里、不会再注入一次，于是客户端切页后灯箱与公式失去样式（灯箱容器从视口尺寸塌成文档高度，首页→文章→点图必现）。**勿改成 `updateHead: false`**（会连带停掉 title/meta 同步），**也不要把 `persistAssets` 带进生产**——生产各页 CSS 是独立 `<link>`，必须照常增删以免跨页样式泄漏。dev 判定用 `process.argv` 含 `dev`（Astro 6 的 `defineConfig` 只接受对象，无 `({ command })` 函数形态）。
- **SwupScriptsPlugin 重建的是整个 document 的 script，不只 swup 容器**（`reloadScripts` 默认 true，scope 为 `head`+`body`）：常驻容器外的第三方经典脚本每次切页都会被 `replaceWith` 重新执行——myhkw 播放器的 `jquery.min.js` 与 `/api/player/` 因此抛 `明月浩空音乐播放器已加载，禁止重复添加！`。这类"元素在容器外、本就不必重跑"的脚本必须显式标 `data-swup-ignore-script`（插件选择器 `script:not([data-swup-ignore-script])`），`Layout.astro` 的两个播放器脚本已加；勿凭"它在 `main` 之外"推断不会被重跑。
- 导航高亮 `syncNavHighlight()`：逐锚点 toggle 时**跳过 `javascript:void(0)` 锚点**（下拉父项按钮，永不匹配），下拉父项与 MMenu 分组的 current 由其子链接 `some()` 统一计算——直接加载（`pagefindReady`）与 `astro:after-swap`（Swup 不替换 `main` 外的导航）都会重算；勿回退为逐锚点裸 toggle，否则构建期写入的下拉父项 current 每次加载都会被抹掉。路由前缀匹配连带效果：/tag/xxx/ 与 /category/xxx/ 页上"文章归档"下拉及"标签分类"/"文章分类"子项呈 current（语义正确，保留）
- 头部微言轮播（`#header .text`，2026-09-05 重写）：机制复刻原版 AutoScroll（limh.me `global-pjax.js`）——`theme-script.ts` 的 `initHeaderTicker()` 每 4s 将 ul 上滚一条（0.8s ease），`transitionend` 后把首条 li 移到末尾实现无限轮转（无克隆条，任意条数无缝，条数取 `diary.slice(0, 4)`），hover 暂停、移出恢复，`prefers-reduced-motion` 不启动，dataset 守卫防定时器叠加（原版 pjax 重复加载会叠加，勿学）。**节奏 4s/条 = 停留 3.2s + 滑动 0.8s 对齐迁移前 CSS 关键帧版手感，勿改回原版 300ms**（2026-09-05 用户确认）；步长 `-24px` 与 global.css `#header .text li` 行高耦合，改行高须同步。头部在 Swup 容器外，随 `pagefindReady()` 初始化一次即可，勿加进 after-swap hook
- 键盘 skip link（"跳到正文"）必须是 `Layout.astro` body 的首元素且在 Swup 容器（`main`）之外，否则切页后丢失；`.skip-link` 默认 `translateY(-200%)` 视觉隐藏、`:focus-visible` 归位显示，目标 `href="#main"`
- 生产 console 清理在 `astro.config.mjs` 的 vite `esbuild` 段（`drop: ["debugger"]`、`pure: ["console.log", "console.debug"]`）；`console.warn/error` 保留供线上排错，勿移除该配置；mermaid cynefin chunk 内 2 处残留为第三方压缩代码，已知且接受
- 页面内 `<script>` 若含 `{...}` 模板插值必须加 `is:inline`（否则 Astro 当 TS 模块处理会解析失败）

### 侧栏“最新评论”换一批交互硬约束
- “换一批”必须提供可感知的加载状态：切换期间显示加载图标动画与“加载中…”文案，设置 `aria-busy="true"` 并禁用按钮，防止重复点击。
- 切换完成、异常或空数据时必须恢复默认图标/文案、`aria-busy="false"` 与可用状态；不得让按钮永久停留在加载中。
- 加载动画仅作用于“换一批”操作图标，必须遵守 `prefers-reduced-motion: reduce`；不得恢复最新评论头像的旋转效果。
- “换一批”只能操作构建期嵌入的评论数据，客户端不得新增 GitHub/Giscus 请求或其他评论数据依赖。

### Pio 看板娘（public/pio/static/）
- `pio.js` / `pio.css` 为 vendored 第三方代码但随本项目自维护（无上游升级管道），可直接修改；入口组件是 `src/components/widget/Pio.svelte`，文案与“关于我”链接配置在 `src/config.ts` 的 `pioConfig`。
- 操作按钮列固定顺序 `home → info → side（停靠切换）→ close`；左/右停靠通过容器 `.left`/`.right` 类驱动，偏好存 `localStorage.pioSide`；折叠状态存 `localStorage.posterGirl`，**默认折叠**（仅 `=== "1"` 时展开）。新增按钮必须用 `appendChild` 按顺序追加，不得用 `insertBefore` 引用尚未入 DOM 的节点。
- 右侧停靠时所有元素必须对称适配：按钮列（`.pio-action`）、折叠按钮（`.pio-show`，含 hover 方向与“点击召唤Pio”提示方向）、消息框（`.pio-dialog`）。消息框居中 + 底部三角，`max-width: 100%` + `width: max-content` 防止长消息溢出视口。
- pio 定位样式在 `pio.css`（`public/` 静态文件，不走构建管线），改动后需同步 `dist/` 才能在 preview 验证；**`pnpm dev` 下 Pio 因 Svelte hydration 报错不渲染（仅 dev），验证 pio 必须用 `pnpm build && pnpm preview`**。
- myhkw 播放器以 `z-index` 压制 Pio（Layout.astro 内联样式）；Pio 的按钮/消息框位置调整需同时考虑播放器展开面板与底部歌词框的遮挡。

### Nice Books 每日好书（src/nice-books/ + src/pages/books/，2026-09-06 移植）
- **独立壳**模块（仿 ai-news 先例）：`/books/`（今日好书随机 + 换一换 + 站长推荐 + 探索更多）、`/books/archive/`（书库：六字段搜索 × 标签叠加 × 双视图 × 载入更多 × `?q=`/`?tag=` 直达）、`/books/:id/`（getStaticPaths 22 静态页 + 同架 top4；无效 id 自然落站级 404）。不加载博客 Layout/global.css/Pio/播放器；产品契约=访问级随机（禁日期映射）、无评论/评分/购买。
- 数据单一真相源 `src/nice-books/data/books.ts`（22 本 V1 fixture + 顶层运行时断言 fail-fast，build 链头部 `pnpm test:nice-books` 把关）；查询函数纯函数化（`lib/random.ts` RNG 可注入、`lib/search.ts` 六字段、`lib/cover.ts` 确定性 SVG 书封兜底——`coverUrl` 非空走 `<img>`、onerror 由 shared 的捕获监听重建 SVG）。
- **SSR/客户端标记单源**：凡会被客户端 innerHTML 重渲染的片段（hero 卡/网格卡/便签/标签药丸/列表行）一律由 `lib/render.ts` 字符串构造器输出（.astro 侧 `set:html` 引用同一函数），禁止在 .astro 里另写一份标记。
- 样式：`styles/books.css` 是 books 页面唯一样式源（含 `@tailwind` 三指令 → 有 preflight）；2026-09-07 用户批准「私人藏书桌」设计升级，`docs/nice-books-design.md` 替代旧 handoff §5–§8 的固定视觉值。继续使用 `--nb-*` token、Tailwind v3 `nb.` 命名空间（勿与 ai-news 色板混淆），`font-nb-body` 映射正文思源黑体。网格 `<360px` 单列、`360–759px` 两列、`>=760px` 三列，同架图书 `>=1080px` 四列。**坑：Tailwind utility 的 display 会覆盖 `[hidden]` 属性**，books.css @layer base 的 `[hidden]{display:none!important}` 勿删。
- swup 协议（模块脚本）：顶层直接 init（首次整页加载）+ `document.addEventListener("astro:page-load", init)`（swup 导航进入时重跑）+ main 内 `dataset.nbInit` 守卫 + 目标元素缺失早退；document 级监听（archive 的「/」快捷键、封面 onerror）只在模块顶层注册一次。注意 `@swup/astro` 默认 `loadOnIdle`——swup 实例在页面空闲后才存在（`window.swup` 需等待），未就绪窗口内点击链接无害降级为整页加载。
- 两套 Playwright Smoke 的**计时与等待不能用固定毫秒数**（2026-09-20 线上实测教训）：`test:fancybox` 的放大两项原先点完死等 1500ms，远端 4608×3072 的原图还没解码，量出来「放大后仍等于适配态」，改为 `waitForFunction(complete && naturalHeight>0)` + 轮询到高度连续一致；`smoke:nice-books` 的「主书换书约 420ms」原先把计时起点放在 `page.click()` 之前，于是 Playwright 的可操作性等待与后续四次 `getAttribute` 往返全被算进动画窗口（本地约 +40ms、远端 +400ms 以上），改为在按钮的 capture 监听里打 `performance.now()` 戳、settle 后先在页面内取差值再做其它跨进程调用 —— 修好后本地读数 422ms，正对设计值 240+170=410ms。**但 `smoke:nice-books` 仍以本地 build+preview 为权威**：打线上时该项仍会到 ~996ms，而单独隔离测量线上换书只花 428–482ms 且期间零请求，差值来自该 smoke 自身在同一个 context 里开的一堆远端页面对主线程与网络的挤占，不是站点缺陷。
- books 全部页面 main 带 `data-pagefind-ignore="all"`（决策：博客全局搜索只搜正式文章，详情页也不进索引）；导航入口在 `navBarConfig.resourceSite`「每日好书」（`noSwup: true`，Navbar/MMenu 数据驱动自动渲染）；`pnpm smoke:nice-books` 覆盖三页业务、Swup 切页/后退/重复初始化与忙碌中断；`node scripts/nice-books-design-qa.mjs` 补充设计、响应式及故障检查（先 build + preview，默认4322端口）。实际项目数与截图见 `docs/nice-books-design-test.md`；字体 CDN 的网络层失败单独统计。
- 2026-09-07 书封展示：`lib/display.ts` 按 ID 确定四种原创 SVG 家族，未知 ID 回退文学；不往 `Book` 加展示字段。`coverHTML` 支持 `hero/card/list`，精选书主图和卡片带腰封，列表省略腰封，普通书裸封。封面硬壳最大、纸块内缩、右侧书口、左侧装订；外壳允许厚度和胶带外伸，图像内层独立裁切，真实图片 `object-contain`。腰封只引用现有荐语，禁止编造奖项或销量。
- 2026-09-07 动效生命周期：GSAP 按需用于 books 主书时间线，常规反馈用 CSS/WAAPI；两个今日换书入口共享全周期忙碌状态并在 finally 恢复。`shared.ts` 统一注册 `astro:before-swap` 清理，页面卸载取消请求/计时器/动画并 settle 未完成的换书 Promise。书库失败必须解除初始化守卫并显示重试；搜索输入不重播入场，标签/视图短过渡可中断。不要恢复额外240ms模拟等待或旧 Hero CSS 动画。

### 统计与表情边界
- 独立浏览量与 GoatCounter 已移除；frontmatter 的 `views` 仅作迁移兼容字段，不参与页面渲染。
- Giscus 表情只由文章页尾部的原生评论组件显示，不复制到首页卡片、文章头部或热门排序；吐槽数仍由 Giscus 同步结果驱动。
- 留言板顶层留言单独写入 `site-stats.json` 的 `guestbookComments`，不参与文章吐槽数与“最新评论”随机池；侧栏单条展示与“换一批”只消费构建期嵌入数据。

### 样式
- `src/layouts/Layout.astro` 全站引入 `src/styles/markdown-extended.css`；所有经 `MainGridLayout` 渲染的主站正文页共享 GitHub 卡片、提示块、spoiler、图片网格、Mermaid 等扩展样式，选择器统一收敛在 `.post-context` 下。独立的 `/ai-news/` React 页面不使用该 Layout，保持隔离。
- GitHub 卡片的结构由 `remark-extended.mjs` 生成：`.github-card-link` 使用两列 grid，`.github-card-avatar` 为装饰性图片（`alt=""` + `aria-hidden="true"`），`.github-card-body` 必须 `min-width: 0`，仓库名允许任意位置换行，避免长仓库名撑破正文。
- 表格通用规则位于 `global.css`：`.prose table`/`.prose th`/`.prose td` 提供 `#c4c4c4` 边框、`vertical-align: middle` 和表头底色；`.post-context table` 统一 `width: 100%`，`.table-scroll` 负责过宽表格的局部横向滚动。新增表格不要在文章内另写宽度或滚动容器样式。
- `src/styles/global.css`：Tailwind 指令 + 大量自定义 class（`.post-list`、`.tw`、`.widget`、`.pagenavi` 等，命名直接对应原主题 CSS），**视觉还原以 custom class 为主、utility 为辅**
- 正文行内代码（2026-09-19 定）：字号 `max(12px, 0.9em)` 随所在文字等比缩放，**各级标题共用同一倍率**，字体走 `var(--font-mono)`；规则写在 `global.css` 的 `.post-context code` 附近，选择器必须是 `.post-context :not(pre) > code`（0,1,2 才压得住 legacy 的 `.post-context code`，同时避开 Expressive Code 的 `PRE.wrap > CODE`，代码块仍归它自己的 14px mono）。**必须同时关掉 `@tailwindcss/typography` 给行内 code 前后注入的反引号伪元素**（`.prose :not(pre) > code::before/::after { content: none }`）——该插件默认把行内代码画成 markdown 源码模样，与本站已有的边框+底色芯片叠加后被访客读成「反引号漏渲染」；选择器不排除 `pre code` 会连带抹掉 Expressive Code 自己的 `code::before` diff 标记。另注意 `.prose code { font-size:13px; font-family:var(--font-mono) }` 整条被关在 `@media (max-width:680px)` 内（桌面永不生效），legacy `.post-context code { font:12px Arial,"Microsoft JhengHei" }` 因此仍是行内代码的兜底来源，改字号/字体要改上面那条新规则而不是它。**折行**：`.post-context { word-break: break-all }`（原主题为中文排版所加，global.css ~3042 行）会被行内代码继承，长命令在任意字符处断——实测把 `setup-matt-pocock-skills` 切到第二行只剩 1 个字母（两行宽 166/7）；故同一条 `:not(pre) > code` 规则里必须带 `word-break: normal` + `overflow-wrap: break-word`，让断点回到连字符/斜杠边界（同处实测 130/43）且超长 token 仍不撑破版面。中文正文的 `break-all` 保持原样，只有行内代码退出
- 返回顶部按钮与灯箱（2026-09-20 定）：`.backtop` 以 `left:50%; margin-left:-614px` 相对视口居中锚定。Fancybox 打开时给 `html` 加 `with-fancybox`、给 `body` 加 `hide-scrollbar{overflow:hidden}`，把本站固定 10px 的根滚动条（`::-webkit-scrollbar{width:10px}`）收掉，fixed 元素的包含块因此从 1430 变 1440 → 按钮右移半格；正文列有 Fancybox 自身的 padding 补偿并不动，差值就是访客看到的「开灯箱后按钮偏移」。修法是 `global.css` 里 `html.with-fancybox .backtop{margin-left:-619px}`（紧跟 `.backtop:hover` 之前，实测 1440 视口下位移从 +4.9px 收敛到 -0.1px）。**勿改成 `html{scrollbar-gutter:stable}`**——实测那样灯箱容器只盖到 1430，右缘会露出一条未变暗的页面；也不要用「开灯箱就藏掉按钮」绕过去（`.backtop` 的 display 由 JS 内联样式切换，得写 `!important` 且会闪）。量测这条改动只能用真实浏览器，且要避开两个**测量陷阱**：其一，headless Chromium 走 overlay 滚动条（`innerWidth === clientWidth`），滚动条宽度类问题完全量不出来，必须 `chromium.launch({ headless:false, channel:"msedge" })`；其二，Playwright 的 `locator.click()` 会先把目标滚进视口，于是量到 12～3244px 不等的 `scrollTop` 变化 —— 那是自动化工具在滚页面，不是站点缺陷（曾被误判成「开灯箱后页面跳位」，实测图已在视口内时用 `page.mouse.click(x,y)` 或合成 `el.click()`，Δ 均为 0）。
- 分页控件（`src/components/layout/Pagination.astro` / `.pagenavi`）统一使用无圆角 40×40 方块；正常态为品牌色边框，当前/禁用态为深灰边框，跳转输入框为 120×40 且隐藏数字微调箭头；导航符号为 `<<`、`<`、`>`、`>>`、`→`，移动端仅保留首、前、当前、后、末五项。
- `src/styles/colorful-original.css`：原主题 73KB 原始样式表，仅作对照参考，**不要直接引入**（路径基于 Emlog 模板目录）
- `public/giscus-theme.css`：Giscus iframe 的 Colorful 主题覆盖；评论卡沿用白底、细边框、圆角和海洋绿 hover 阴影，头像框无阴影，站长徽标复用 `public/images/admin.png` 并显示“站长”
- `src/styles/font-awesome.css`：Font Awesome 4，class 名与原站一致（`fa fa-xxx`）；字体仅保留 `public/fonts/fontawesome-webfont.woff`（eot/ttf/svg 已删，2026-09-04），`@font-face` src 只写 woff，勿再引入旧格式
- 字体策略（README TODO 13，2026-09-05 落地）：全站字体收敛到 `:root` 四 token——`--font-body` 思源黑体可变字重（`@fontsource-variable/noto-sans-sc`，Layout 引入，**微软雅黑已从所有主栈退场**消除版权风险，兜底苹方/文泉驿）、`--font-mono`（JetBrains Variable，`.prose code`/`.friend-domain`/稿纸小标签等 6 处统一引用）、`--font-serif`（方正书宋，token 就位暂无主用场景）、`--font-hand`（/about/ 稿纸手写：平方时光体，ZeoSeven FontsAPI CDN `fontsapi.zeoseven.com/156/main/result.css`，src 含 `local()` 本机优先零下载）。**陷阱：global.css 的元素级 reset（`p/div{font-family:var(--font-body)}`，原主题块 ~1809 行）会切断稿纸继承，稿纸内文字容器必须显式重声明 `var(--font-hand)`**；方正书宋走 jsDelivr CDN（`cn-fontsource-fz-shu-song-z-01-regular/font.css`）+ `public/fonts/方正书宋-简体.ttf` 本地回退；稿纸横线相位 `--lp-shift` 已由 `syncPaperRulePhase()` 运行时反推（人工只维护 `--lp-baseline`，换字体不再手调偏移）；ai-news（--t-font-*/--jy-font-*）与 OG 图 satori 字体不在策略内
- /about/ 信纸稿纸（`:::letter-paper` 容器指令 → `remark-extended.mjs` 输出 `.letter-paper` 面板，样式在 markdown-extended.css）：子块顺序 = paper-doodles 涂鸦层（aria-hidden、pointer-events none、z-index 0）→ paper-hero 头部 → paper-note 便签（原"写在前面"内容）→ paper-section-head（✎）→ 裸 `<div class="letter-paper-body">` 横线正文 → paper-section-head（✦ NOW/NEXT + paper-timeline）→ paper-footer（签名行由 remark-extended 固定输出，不写入 md）。**陷阱一：micromark 容器指令的一个 `:::` 会关闭整层嵌套栈，横线区必须用裸 `<div class="letter-paper-body">` 而非嵌套容器指令**；**陷阱二：global.css 元素级 reset 切断继承，稿纸内每一个文字容器都必须显式重声明 `var(--font-hand)`，含 `.paper-section-head` 这类小节标题（2026-09-19 就是漏了它，两个标题掉回思源黑体被用户当场看出）**；逐字符微随机由 theme-script 的 `initPaperHandwriting()` 施加（dataset 守卫 + after-swap 重挂，西文整段防词中换行）；**网格相位（2026-09-19 改造）**：横线网格画在 `.letter-paper` 面板层、贯穿整张纸（含头部区），相位 `--lp-shift` 由 theme-script 的 `syncPaperRulePhase()` 运行时反推 =（正文盒顶相对面板 padding box 顶边 + `--lp-baseline`）mod `--lp-cycle`，并配 `ResizeObserver` 跟随字体 swap／换行／缩放，**头部高度因此无需确定化**（巨型标题是 `clamp(58px,9vw,98px)` 流式字号）；人工只需维护 `--lp-baseline`（桌面 24／窄屏 17，即基线相对正文盒顶的距离），勿把它改回静态 `--lp-shift` 手调，也勿给面板网格用 `background-size: 100% 100%`（会被非等比压扁，必须 `contain`）；无 JS 时网格仍连续、正文不严格落线，属接受范围（详见「字体策略」条目）；**装饰元件（2026-09-19）**：涂鸦与笔画一律走 `public/images/about/ink/*.svg` 的手绘路径，不内联进 `about.md`、也不用 data-URI 堆进 CSS——人味来自路径本身的误差（多段不等粗、形状不闭合、末段越界压过起点、复描半透明叠笔、箭头两片不共尖），用户提供参考路径时几何原样保留、不套用我自己的合成规则；尺寸仍以各 `.d-*` 的 `font-size` 为唯一旋钮（宽高写 `em`，窄屏那条整层缩放规则继续有效），因此 `stroke-width` 与渲染尺寸是折算耦合，改尺寸必须同步改笔画数值；蓝／墨／红三色已烘进 SVG，`.paper-doodle-blue`/`.paper-doodle-red` 两条 color 规则已删
- 自定义光标：`public/style/default.cur` / `link.cur`
- 响应式图片变体：`scripts/generate-lqips.mjs` 在 LQIP 之外生成 WebP 变体到 `public/images/_variants/`（480/720/1080/1440 四档，q82，仅对宽度 > 档位×1.2 的图生成），manifest 尺寸表写入 `src/constants/image-variants.json`（构建产物，gitignore）；文章封面/幻灯片/相册/图片墙经 `src/components/control/ResponsiveImage.astro`（`<picture>` WebP + 原图兜底）渲染。变体目录已加入 LQIP 扫描的 IGNORE_DIRS，勿删；中文路径 URL 编码规则与 album-scanner 一致
- 图片墙：`src/pages/images.astro` 的卡片图片桌面端保持 `180×120` 与 `object-fit: cover`；`max-width: 680px` 时图片宽度流体化，但必须通过 `height: auto` 与 `aspect-ratio: 3 / 2` 保持比例，避免日期栏错位或页面横向溢出。
- 相册缩略图与索引封面沿用图片墙同一套 **3:2 裁切**：`.photo-grid img`（桌面 `175px` 宽）与 `.album-grid .album-card .album-cover img`（`170px` 宽）均为 `height: auto` + `aspect-ratio: 3 / 2` + `object-fit: cover`，`max-width: 680px` 的共享规则同样带 `object-fit: cover`。相册原图比例不可控（全景图 4.6:1、竖拍 2:3 都有），去掉 `aspect-ratio` 或 `object-fit` 任一者都会让卡片高度参差或把图拉扁。`/albums/` 索引页封面必须用 `ResponsiveImage`（原图常 1MB+，裸 `<img>` 会绕过 WebP 变体）。注意 `@layer components` 里的同名旧规则（`.photo-grid img{height:130px}`）会被无层级规则逐条覆盖，改这里要看非层级那处。
- 顶部二维码弹层：`src/components/layout/Navbar.astro` 中 QQ/微信共用 `.qrcode-frame`；`src/styles/global.css` 保持弹层四周 `10px` 内距、内部裁切框 `140×140`。由于 `public/images/qq-qrcode.jpg` 与 `public/images/wechat-qrcode.jpg` 的原图留白比例不同，两者使用独立的绝对定位裁切参数；更换资源后必须重新做真实 hover 视觉检查。
- 桌面头部标题：`#header` 固定 `height:180px; overflow:hidden`，`#header h1` 与左侧 `100px` 浮动 logo 并排，其 `max-width` 必须为 `calc(100% - 100px)` 扣除 logo 占位；否则 `.box` 在 ≤1100px 收缩为 `calc(100% - 40px)` 时标题会被挤到 logo 下方落入裁切区并与 `#head-nav` 重叠（2026-09-04 实测修复）。改头部布局后须在 681–1100px 各断点复查标题位置。
- 标签药丸 `#blogtags`（global.css 约 3477 行起，源自原版 colorful-original.css）：6 色轮换 + `::before` 三角 + `::after` 圆点，`/tag/` 两类标签页、`/category/` 两类分类页、侧栏 WidgetTag **五处共用**同一 DOM 结构，勿另写药丸样式；`.tag-count`（×N 数字，11px 白色）与 `a.is-current`（当前标签/分类品牌绿 `--colorful-green` 底 + 三角同色）为仅有的两处新增规则，**必须保持在 nth-child 轮换规则之后**（同 specificity 靠源顺序覆盖），移动位置会丢失高亮。
- 3D 标签/分类云（2026-09-08）：`src/components/layout/TagCloud3D.astro`（Props `items: {name,count}[]` + `base: "tag"|"category"`，空数组自隐藏），仅 `/tag/` 与 `/category/` 云集页调用，药丸云保留（当前项高亮 + `prefers-reduced-motion` 回退）；单标签/单分类页与侧栏 WidgetTag 不加。库为 vendored `public/vendor/svg3dtagcloud/SVG3DTagCloud.global.js`（npm `svg-3d-tag-cloud@0.0.20`，MIT，LICENSE 随附；标签颜色走库内置 10 色调色板，`fontColor` 设置不生效；`isDrawSvgBg` 默认黑底必须显式关）。加载按 Pio 先例运行时注入 `<script>`（Vite 禁止 ESM import public/ 内 JS，dev 500），组件脚本必须置于 swup 容器内（dev 下容器外脚本换页即丢）；实例挂 `window.__tagCloud3D` 跨页交接，init 在"新容器+守卫未设置"先 destroy 残留（rAF/resize 监听），切往无云页面由无容器分支销毁。hover 动效：标签 scale(1.15)/150ms（`(hover:hover)+(pointer:fine)` 门控）、tooltip 上浮由库写死的 `opacity="1.0"/"0.0"` 属性选择器驱动——CSS 必须放 `<style is:global>`（scoped 管线会转义坏 `:global()` 内属性选择器引号致永不匹配）；禁 `transition: all`（会缓动库逐帧写的 x/y 产生拖影）；reduced-motion 去位移保淡入。生产构建时组件脚本内联进 `<main>` 内 HTML，swup scripts-plugin 每次进入克隆重执行，靠注册表+守卫收敛（已实测）。
- 首页右侧文章推荐固定为“最新 / 手气不错”两栏：两者使用普通箭头＋日期列表；“手气不错”仅在构建期随机抽取。首页下方只保留一个“热门推荐”，按 `getHotPosts` 的既有排序输出旗帜形序号标记；禁止复制热门元件或在浏览器端请求评论/文章数据。例外：`/hot/` 热门页（2026-09-05 经用户批准）为构建期渲染的独立列表页，正文用 `PostCard`，不复制 `#hotlog` 元件；侧栏热门部件仍仅首页显示。

### 工具函数
`src/utils/content-utils.ts`：`getSortedPosts`（置顶+时间）、`getTagList`、`getCategoryList`、`getArchiveList`（YYYY年M月）、`getHotPosts`（hotness*100+comments 排序）、`getNeighbors`（前一篇/后一篇）、`getCover`（frontmatter image 兜底 hash 选 `public/images/random/tb1-40.jpg`）

## 加入文章的流程

当用户提到从某个特定的文件导入现有文章时，请遵循以下流程（期间参考已有文章的实现）

1. **定位源文件**：在用户指定位置（如桌面）找到外部 `.md`；含中文内容时按 chinese-encoding 规范以 UTF-8 读取。
2. **创建文章**：建 `src/content/posts/<yyyymmddhhmmss>/index.md`（目录名即 slug，硬规则见上节；`published` 必须与目录名对应）。
3. **代拟 frontmatter**：`title` 取原文 H1；`description` 按文中事实撰写；`category`/`tags` 对齐既有文章用法；`draft/private/views/comments/hotness` 给默认值。不设 `image` 时封面走 `getCover()` 的 hash 随机图兜底。
4. **迁移图片资源**：源文引用的本地图片（如 Typora 的 `typora-user-images`）复制到 `public/images/posts/<yyyymmddhhmmss>/`，正文图片路径重定向为 `/images/posts/<yyyymmddhhmmss>/<文件名>`。
5. **正文逐字保留**：不修错别字、不改标点/引号样式、保留原文主体示例；仅允许结构调整——原文 H1 移入 `title` 后正文不再保留（`[...slug].astro` 用 title 渲染 `<h1>`，重复会显示两次标题），以及第 4 条的图片路径重定向。
6. **逐字节校验**：用脚本 diff"原文（做过路径替换、去掉首行 H1）"与"新文件正文（剥掉 frontmatter）"，逐行严格比较确认零差异；发现差异必须改回与原文一致。
7. **头图（可选）**：你需要询问清楚用户关于文章的头图信息，例如，你可以从文中截图生成 `<主题>-cover.jpg` 放同图片目录——缩放至 1320×880、JPEG q85（详情页封面桌面最大显示 660 CSS px，`sizes` 见 `[...slug].astro`，×2 DPR = 1320；源宽 1320 > 1080×1.2，下次 build 命中 1080 档 WebP 变体 + LQIP；dev 环境直接显示原图属正常），frontmatter `image:` 指向它。
8. **GitHub 卡片（可选，文末裸仓库链接适用）**：`https://github.com/<owner>/<repo>` 改为 `::github{repo="owner/repo"}`（与既有文章同语法），随后运行 `pnpm fetch-repos` 增量拉取元数据缓存。**顺序坑**：先改文章、后拉缓存时，dev 的 content layer 会把"缓存缺失→回退链接"的渲染结果缓存住（即下方 ⚠️ 大坑警告在新增 `::github` 引用场景的表现）；对内容文件再做一次真实改动（如追加并收敛尾部换行）触发重渲染即可，remark 插件每次转换惰性读 JSON，无需重启 dev。文件尾部保持单个换行过 Prettier check。
9. **验证与提交**：提交前对 `src/` 下改动文件跑 `pnpm exec prettier --write`——lint.yml 只查 `./src`（根目录 AGENTS.md 不在内），手写 `index.md` 的 `*emphasis*`/`***bold-italic***` 会被 Prettier 归一化为 `_…_`/`_**…**_`（remark 管线语义等价转换，渲染输出不变，文字零变动，可直接放行）。提交后确认 Lint / Build and Check / Deploy 三条工作流全绿；dev 服务器请求 `/posts/<slug>/` 返回 200、HTML 含标题与图片引用、各图片 URL 返回 200；含 `::github` 引用时确认卡片为完整态（有 `github-card-name`、无 `github-card-error`——注意 dev 下样式表文本也含该类名，须查卡片标记而非全局字符串）；用户要求自行验证时不要代做浏览器检查以外的多余操作。

## 注意

- 原始 Emlog 主题 `D:\pages\limh.me` 的 `module.php` 含 `/e` 修饰符 eval 漏洞、`function/favicon.php`/`image.php` 是开放代理——不可搬回本项目
- 图片等静态资源都放 `public/` 直接引用，不走 Astro 的 import 管线

## ⚠️ 大坑警告：Astro content layer 缓存会"吃掉"插件改动（本地与 CI 都会踩）

**症状**：修改了 remark/rehype 插件（或任何影响 Markdown 渲染的逻辑）后构建，产物仍是旧 HTML，全程无任何报错。本地和线上都可能发生，2026-08-31 两侧均已实际踩坑。

**根因**：Astro 5 content layer 会把渲染结果缓存到 data store；内容文件未变时构建直接复用缓存、**不重跑插件**；touch 内容文件 mtime 也无法使其失效。当前命令可能在 `node_modules/.astro/data-store.json` 或 `.astro/data-store.json` 生成 data store，不能只依赖其中一处。

**本地规则**：改插件逻辑后先删除 `node_modules/.astro/`，并在存在时删除 `.astro/data-store.json`，再构建。

**CI 规则**：`withastro/action` 默认 `cache: true` 会跨 run 缓存 `node_modules/.astro`，同样复用旧渲染——**`deploy.yml` 已传 `cache: false` 关闭，任何 workflow 改动都不得恢复该缓存**。`build.yml` 用 `setup-node`（仅缓存 pnpm store）不受影响。

**CI 执行拓扑**：Pull Request 由 `build.yml` 执行 `Astro Check` 和完整 `Astro Build`，`lint.yml` 执行 Prettier 检查；`main` push 时 `build.yml` 的 `Astro Build` job 通过 `if: ${{ github.event_name == 'pull_request' }}` 跳过，完整构建只由 `deploy.yml` 执行一次后部署。`deploy.yml` 也支持 `workflow_dispatch`，并通过 `concurrency` 取消同一 workflow/ref 的旧部署。

**线上验证部署是否生效**：Fastly 边缘缓存 HTML `max-age=600`，且缓存键不含查询串（加 `?cb=` 无效）；看响应头 `Last-Modified` 是否晚于部署完成时间，或下载 Actions run 的 `github-pages` artifact 直接查 HTML（确定性验证）。
