# AGENTS.md

## Skill Rule: 

We have compiled a set of "skills": folders of best practices for different forms of work. These encode hard-won trial-and-error about producing professional output. Several may apply to one task, so don't read just one. You need always be smart to use skills like:

- /grill-me on big changes sessions or any other you need to know.

- /frontend-design on any changes at frontend coding sessions.

- /animate, /find-animation-opportunities, /improve-animations, /review-aniamtions or other animation skills on animation designing or animation adjustments.

- /self-improvement when you make mistakes.

- /wayfinder on loose or unclear messages.

- /chinese-encoding on chinese language write-in sessions.

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
- When a proactive search finds nothing, you should continue the person's task without mentioning the search, so the person is not distracted by catalog mechanics that produced no result. When the person asked for a recommendation or asked whether a plugin or skill exists, you should say plainly that nothing relevant turned up.
- Your tone should be direct and precise.

# Project Info:

**!IMPORTANT: Above are fixed and read-only finale context, you MUST follow these rules strictly, you CANNOT write, delete or add new words when updating or initializing AGENTS.md, getting know project info, saving memories or updating experiences etc.**



## 项目背景

WindowsIt 个人博客（WindowsIt's Music Club），由 Emlog Colorful（明月浩空）主题迁移而来的纯静态 Astro 博客。视觉必须还原 Colorful 原版（海洋绿 `#00c000` 主色、白底圆角卡片、自定义光标），技术栈对齐 `D:\pages\mizuki`。迁移任务的完整背景与取舍见 `D:\pages\emlog-to-astro-migration-prompt.md`。

## 常用命令

```bash
pnpm install     # 安装依赖（中国网络需先设 registry 为 https://registry.npmmirror.com）
pnpm dev         # 本地开发 http://localhost:4321
pnpm build       # 构建 dist/（LQIP 生成 + GitHub 仓库数据拉取 + astro build + Pagefind，已串联）
pnpm new-post -- <yyyymmddhhmmss> [标题]  # 按强制 URL 规范创建文章
pnpm fetch-repos --refresh  # 全量刷新 GitHub 仓库卡片元数据缓存（默认增量只拉缺失）
pnpm preview     # 预览构建产物（需先 build）
pnpm check       # astro check 类型检查
pnpm format      # Prettier 格式化（tabWidth 4, useTabs true）
```

注意：Windows 上 pnpm build 失败时尾部可能看不到完整错误（esbuild 崩溃断言），务必看完整输出而非 tail。

## 环境区分（必须遵守）

- **测试环境（本地）**：`http://localhost:4321`（`pnpm dev`；preview 可用 `pnpm preview --port 4322` 等指定端口）。验证交互、布局、Swup 切页均在本地做；注意 `pnpm dev` 下 Pio 不渲染（见 Pio 段），验证 Pio 必须 `pnpm build && pnpm preview`。
- **生产环境（线上）**：`https://caiyan12.github.io/`（GitHub Actions 部署）。验证部署是否生效看响应头 `Last-Modified` 是否晚于部署完成时间，或下载 run 的 `github-pages` artifact；Fastly 边缘缓存 HTML `max-age=600` 且缓存键不含查询串（加 `?cb=` 无效）。playwright 线上偶发 30s 超时时可用 `Invoke-WebRequest` 直接下载 HTML/JS 做内容断言。

## 架构要点

### 配置驱动（改配置 = 改站点）
`src/config.ts` 是所有站点行为的控制中心：
- `siteConfig` — 标题、作者、URL、每页文章数、备案号等
- `navBarConfig` — 平铺导航项（首页/微言碎语/留言板）+ 四组下拉：`archiveSite`（文章归档：全部文章 `/archive/` + 标签分类 `/tag/` + 文章分类 `/category/`）、`aboutSite`、`extra`、`resourceSite`；`social`（B站/QQ/微信/RSS 图标）仍在 `Navbar.astro` 的 `.m-nav` 渲染；下拉渲染分列在 `Navbar.astro`（桌面 hover 下拉）与 `MMenu.astro`（移动端全屏菜单），**两处必须同步修改**，父项 current 由子链接 `some()` 判定
- `sidebarConfig` — 侧栏小部件顺序
- `commentConfig` — **Giscus 评论**，已开启并绑定 `CaiYan12/caiyan12.github.io` 的 `Announcements` 分类；文章评论区使用 `pathname`，留言板使用 `specific` + `data-term="guestbook"`；`reactionsEnabled: "1"`、`emitMetadata: "0"`；其余 `repoId`、`categoryId`、语言和主题 URL 在 `src/config.ts` 中维护
- `slideshowConfig` — 首页幻灯片（图片在 `public/images/slide/`）

### 内容组织
- 文章：`src/content/posts/<yyyymmddhhmmss>/index.md`（**目录名即 URL slug**，可放封面图在同目录），schema 在 `src/content.config.ts`（posts + spec 两个 collection）
- frontmatter 字段：title/published/category/tags/description/image/pinned/views/comments/hotness(0-5)/draft 等，其中 comments/hotness 用于首页吐槽与热门展示；views 为迁移兼容字段，当前不渲染围观数
- 特殊页面：`src/content/spec/about.md`（关于）
- 数据文件：`src/data/diary.ts`（说说）、`friends.ts`（友链）、`comments.ts`（开发环境最新评论 mock）、`guestbook.ts`（开发环境留言板单条换一批 mock）、`site-stats.json`（构建期同步快照）
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
| 图片灯箱 | Fancybox（`src/utils/theme-script.ts` 的 `initFancybox()` 懒加载绑定） |
| GitHub 仓库卡片 | 构建期渲染：`scripts/fetch-github-repos.mjs` 拉取元数据缓存到 `src/constants/github-repos.json`，`remark-extended.mjs` 直接输出完整卡片 HTML；卡片左侧使用 `https://github.com/<owner>.png?size=128` owner 头像（桌面 `48×48`，移动 `40×40`），右侧为名称/描述/star/fork/语言；**客户端零 GitHub API 请求**（规避访客 IP 匿名 API 60 次/小时限流），令牌解析 `GITHUB_TOKEN`/`GH_TOKEN` → `gh auth token` → 匿名，拉取失败渲染回退链接不阻塞构建 |
| Markdown 表格 | Markdown 表格经 `rehype-table-wrapper.mjs` 包裹 `.table-scroll`，原生 HTML 表格由 `remark-extended.mjs` 包裹；`global.css` 统一提供满宽、居中、边框和单元格上下居中样式，过宽表格仅在自身容器内滚动 |
| 代码高亮/公式 | Expressive Code + KaTeX（KaTeX CSS 按需动态导入；`expressiveCode` 必须保持 `useDarkModeMediaQuery: false`，否则系统暗色访客的代码块变暗色） |
| Mermaid 图表 | 客户端懒加载渲染（`theme-script.ts` 的 `renderMermaid()`，仅页面存在 `pre.mermaid` 时 `import("mermaid")`）。**体积治理已评估关闭（2026-09-04）**：mermaid 11 对全部 38 种 diagram 均为动态 import，访客只下载实际用到的类型（实测约 450KB gzip），未用 chunk 是 dist 死产物但无访客成本；注册表硬编码在 `mermaid.core.mjs` 不可外部裁剪；预渲染（rehype-mermaid + playwright）需引入 Chromium 构建依赖性价比不足。构建期 3 个大 chunk 警告（cynefin/core/cytoscape）为已知问题保留，勿重新评估 |
| 标签云集页 | `/tag/`（`src/pages/tag/index.astro`，原 `function/page-tags.php` 的 shuffle 随机云改为文章数降序）+ 单标签页 `/tag/xxx/`（`tag/[tag].astro` + `tag/[tag]/page/[page]/` 分页，每页 `siteConfig.tagPostsPerPage: 5`）。两类标签页头部同为 `/tag/` 形态：h2 + 面包屑（首页 » 标签云集 » 标签名）+ `.post-context` 统计行 + 全量 `#blogtags` 药丸云；单标签页当前标签 `a.is-current` 品牌绿高亮 + `aria-current="page"`。构建期静态渲染，数据复用 `getTagList()`，客户端零请求 |
| 分类云集页 | `/category/`（`src/pages/category/index.astro`，2026-09-05 新增，与 `/tag/` 同模式）+ 单分类页 `/category/xxx/`（`category/[category].astro` + `category/[category]/page/[page]/` 分页，每页维持 `siteConfig.postsPerPage: 6` 不另设配置）。两类分类页头部同为 `/tag/` 形态：h2（`fa-folder-open-o`）+ 面包屑（首页 » 分类云集 » 分类名）+ `.post-context` 统计行 + 全量 `#blogtags` 药丸云（含 `.tag-count` ×N）；单分类页当前分类 `a.is-current` 品牌绿高亮 + `aria-current="page"`。构建期静态渲染，数据复用 `getCategoryList()`，客户端零请求；导航入口为 `archiveSite` 下拉的"文章分类" |

### 客户端脚本与 Swup 生命周期
- `src/utils/theme-script.ts` 是唯一的客户端逻辑中枢：导航高亮、返回顶部、双击回顶、移动端菜单、Fancybox/KaTeX 初始化
- **Swup 切换页面时组件脚本不会重跑**，所以需要重绑定的东西（Fancybox、导航高亮）都注册在 `initSwupHooks()` 的 `content:replace`/`page:view` 里；新增交互若依赖新页面 DOM，必须加到这两个 hook 中
- 导航高亮 `syncNavHighlight()`：逐锚点 toggle 时**跳过 `javascript:void(0)` 锚点**（下拉父项按钮，永不匹配），下拉父项与 MMenu 分组的 current 由其子链接 `some()` 统一计算——直接加载（`pagefindReady`）与 `astro:after-swap`（Swup 不替换 `main` 外的导航）都会重算；勿回退为逐锚点裸 toggle，否则构建期写入的下拉父项 current 每次加载都会被抹掉。路由前缀匹配连带效果：/tag/xxx/ 与 /category/xxx/ 页上"文章归档"下拉及"标签分类"/"文章分类"子项呈 current（语义正确，保留）
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

### 统计与表情边界
- 独立浏览量与 GoatCounter 已移除；frontmatter 的 `views` 仅作迁移兼容字段，不参与页面渲染。
- Giscus 表情只由文章页尾部的原生评论组件显示，不复制到首页卡片、文章头部或热门排序；吐槽数仍由 Giscus 同步结果驱动。
- 留言板顶层留言单独写入 `site-stats.json` 的 `guestbookComments`，不参与文章吐槽数与“最新评论”随机池；侧栏单条展示与“换一批”只消费构建期嵌入数据。

### 样式
- `src/layouts/Layout.astro` 全站引入 `src/styles/markdown-extended.css`；所有经 `MainGridLayout` 渲染的主站正文页共享 GitHub 卡片、提示块、spoiler、图片网格、Mermaid 等扩展样式，选择器统一收敛在 `.post-context` 下。独立的 `/ai-news/` React 页面不使用该 Layout，保持隔离。
- GitHub 卡片的结构由 `remark-extended.mjs` 生成：`.github-card-link` 使用两列 grid，`.github-card-avatar` 为装饰性图片（`alt=""` + `aria-hidden="true"`），`.github-card-body` 必须 `min-width: 0`，仓库名允许任意位置换行，避免长仓库名撑破正文。
- 表格通用规则位于 `global.css`：`.prose table`/`.prose th`/`.prose td` 提供 `#c4c4c4` 边框、`vertical-align: middle` 和表头底色；`.post-context table` 统一 `width: 100%`，`.table-scroll` 负责过宽表格的局部横向滚动。新增表格不要在文章内另写宽度或滚动容器样式。
- `src/styles/global.css`：Tailwind 指令 + 大量自定义 class（`.post-list`、`.tw`、`.widget`、`.pagenavi` 等，命名直接对应原主题 CSS），**视觉还原以 custom class 为主、utility 为辅**
- 分页控件（`src/components/layout/Pagination.astro` / `.pagenavi`）统一使用无圆角 40×40 方块；正常态为品牌色边框，当前/禁用态为深灰边框，跳转输入框为 120×40 且隐藏数字微调箭头；导航符号为 `<<`、`<`、`>`、`>>`、`→`，移动端仅保留首、前、当前、后、末五项。
- `src/styles/colorful-original.css`：原主题 73KB 原始样式表，仅作对照参考，**不要直接引入**（路径基于 Emlog 模板目录）
- `public/giscus-theme.css`：Giscus iframe 的 Colorful 主题覆盖；评论卡沿用白底、细边框、圆角和海洋绿 hover 阴影，头像框无阴影，站长徽标复用 `public/images/admin.png` 并显示“站长”
- `src/styles/font-awesome.css`：Font Awesome 4，class 名与原站一致（`fa fa-xxx`）；字体仅保留 `public/fonts/fontawesome-webfont.woff`（eot/ttf/svg 已删，2026-09-04），`@font-face` src 只写 woff，勿再引入旧格式
- 自定义光标：`public/style/default.cur` / `link.cur`
- 响应式图片变体：`scripts/generate-lqips.mjs` 在 LQIP 之外生成 WebP 变体到 `public/images/_variants/`（480/720/1080/1440 四档，q82，仅对宽度 > 档位×1.2 的图生成），manifest 尺寸表写入 `src/constants/image-variants.json`（构建产物，gitignore）；文章封面/幻灯片/相册/图片墙经 `src/components/control/ResponsiveImage.astro`（`<picture>` WebP + 原图兜底）渲染。变体目录已加入 LQIP 扫描的 IGNORE_DIRS，勿删；中文路径 URL 编码规则与 album-scanner 一致
- 图片墙：`src/pages/images.astro` 的卡片图片桌面端保持 `180×120` 与 `object-fit: cover`；`max-width: 680px` 时图片宽度流体化，但必须通过 `height: auto` 与 `aspect-ratio: 3 / 2` 保持比例，避免日期栏错位或页面横向溢出。
- 顶部二维码弹层：`src/components/layout/Navbar.astro` 中 QQ/微信共用 `.qrcode-frame`；`src/styles/global.css` 保持弹层四周 `10px` 内距、内部裁切框 `140×140`。由于 `public/images/qq-qrcode.jpg` 与 `public/images/wechat-qrcode.jpg` 的原图留白比例不同，两者使用独立的绝对定位裁切参数；更换资源后必须重新做真实 hover 视觉检查。
- 桌面头部标题：`#header` 固定 `height:180px; overflow:hidden`，`#header h1` 与左侧 `100px` 浮动 logo 并排，其 `max-width` 必须为 `calc(100% - 100px)` 扣除 logo 占位；否则 `.box` 在 ≤1100px 收缩为 `calc(100% - 40px)` 时标题会被挤到 logo 下方落入裁切区并与 `#head-nav` 重叠（2026-09-04 实测修复）。改头部布局后须在 681–1100px 各断点复查标题位置。
- 标签药丸 `#blogtags`（global.css 约 3477 行起，源自原版 colorful-original.css）：6 色轮换 + `::before` 三角 + `::after` 圆点，`/tag/` 两类标签页、`/category/` 两类分类页、侧栏 WidgetTag **五处共用**同一 DOM 结构，勿另写药丸样式；`.tag-count`（×N 数字，11px 白色）与 `a.is-current`（当前标签/分类品牌绿 `--colorful-green` 底 + 三角同色）为仅有的两处新增规则，**必须保持在 nth-child 轮换规则之后**（同 specificity 靠源顺序覆盖），移动位置会丢失高亮。
- 首页右侧文章推荐固定为“最新 / 手气不错”两栏：两者使用普通箭头＋日期列表；“手气不错”仅在构建期随机抽取。首页下方只保留一个“热门推荐”，按 `getHotPosts` 的既有排序输出旗帜形序号标记；禁止复制热门元件或在浏览器端请求评论/文章数据。

### 工具函数
`src/utils/content-utils.ts`：`getSortedPosts`（置顶+时间）、`getTagList`、`getCategoryList`、`getArchiveList`（YYYY年M月）、`getHotPosts`（hotness*100+comments 排序）、`getNeighbors`（前一篇/后一篇）、`getCover`（frontmatter image 兜底 hash 选 `public/images/random/tb1-40.jpg`）

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
