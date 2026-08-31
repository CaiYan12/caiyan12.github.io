# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, Codex, etc.) when working with code in this repository.

## **#0: Always be smart to use skills** like

- /grill-me on big changes sessions or any other you need to know.

- /frontend-design on any changes at frontend coding sessions.

- /animate, /find-animation-opportunities, /improve-animations, /review-aniamtions or other animation skills on animation designing or animation adjustments.

- /self-improvement when you make mistakes.

- /wayfinder on loose or unclear messages.

- /chinese-encoding on chinese language write-in sessions.

- /context7-mcp or other needing mcp servers.

  Read the skills, and involve the useful skills in your plan before you already know what to plan and to do.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

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

## 4. Goal-Driven Execution

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



## 项目背景

WindowsIt 个人博客（WindowsIt's Music Club），由 Emlog Colorful（明月浩空）主题迁移而来的纯静态 Astro 博客。视觉必须还原 Colorful 原版（海洋绿 `#00c000` 主色、白底圆角卡片、自定义光标），技术栈对齐 `D:\pages\mizuki`。迁移任务的完整背景与取舍见 `D:\pages\emlog-to-astro-migration-prompt.md`。

## 常用命令

```bash
pnpm install     # 安装依赖（中国网络需先设 registry 为 https://registry.npmmirror.com）
pnpm dev         # 本地开发 http://localhost:4321
pnpm build       # 构建 dist/（LQIP 生成 + GitHub 仓库数据拉取 + astro build + Pagefind，已串联）
pnpm fetch-repos --refresh  # 全量刷新 GitHub 仓库卡片元数据缓存（默认增量只拉缺失）
pnpm preview     # 预览构建产物（需先 build）
pnpm check       # astro check 类型检查
pnpm format      # Prettier 格式化（tabWidth 4, useTabs true）
```

注意：Windows 上 pnpm build 失败时尾部可能看不到完整错误（esbuild 崩溃断言），务必看完整输出而非 tail。

## 架构要点

### 配置驱动（改配置 = 改站点）
`src/config.ts` 是所有站点行为的控制中心：
- `siteConfig` — 标题、作者、URL、每页文章数、备案号等
- `navBarConfig` — 导航项、"附加功能"下拉、文章分类下拉、社交图标
- `sidebarConfig` — 侧栏小部件顺序
- `commentConfig` — **Giscus 评论**，`enable` 目前为 false；启用需填 repo/repoId/category/categoryId
- `slideshowConfig` — 首页幻灯片（图片在 `public/images/slide/`）

### 内容组织
- 文章：`src/content/posts/<slug>/index.md`（**目录名即 URL slug**，可放封面图在同目录），schema 在 `src/content.config.ts`（posts + spec 两个 collection）
- frontmatter 字段：title/published/category/tags/description/image/pinned/views/comments/hotness(0-5)/draft 等，其中 views/comments/hotness 是静态化后的历史值，用于首页"围观/吐槽/热门"展示
- 特殊页面：`src/content/spec/about.md`（关于）
- 数据文件：`src/data/diary.ts`（说说）、`friends.ts`（友链）、`comments.ts`（侧栏最新评论，默认空数组）
- 相册：**文件夹驱动**——`public/images/albums/<相册名>/` 下放图即自动生成相册（`src/utils/album-scanner.ts` 构建期扫描，中文目录名没问题，slug 用原始名不要预编码）

### 静态替代动态功能的映射
| 原 Emlog 功能 | 现实现 |
|---|---|
| Pjax 无刷新 | Swup.js（`astro.config.mjs` 的 swup 集成，容器 `main`） |
| 搜索 | Pagefind（构建期索引，`src/components/control/Search.svelte`） |
| 评论/留言板 | Giscus（`src/components/comment/Giscus.astro`，按 `commentConfig.enable` 开关） |
| 图片灯箱 | Fancybox（`src/utils/theme-script.ts` 的 `initFancybox()` 懒加载绑定） |
| GitHub 仓库卡片 | 构建期渲染：`scripts/fetch-github-repos.mjs` 拉取元数据缓存到 `src/constants/github-repos.json`，`remark-extended.mjs` 直接输出完整卡片 HTML；**客户端零请求**（规避访客 IP 匿名 API 60 次/小时限流），令牌解析 `GITHUB_TOKEN`/`GH_TOKEN` → `gh auth token` → 匿名，拉取失败渲染回退链接不阻塞构建 |
| 代码高亮/公式 | Expressive Code + KaTeX（KaTeX CSS 按需动态导入） |

### 客户端脚本与 Swup 生命周期
- `src/utils/theme-script.ts` 是唯一的客户端逻辑中枢：导航高亮、返回顶部、双击回顶、移动端菜单、Fancybox/KaTeX 初始化
- **Swup 切换页面时组件脚本不会重跑**，所以需要重绑定的东西（Fancybox、导航高亮）都注册在 `initSwupHooks()` 的 `content:replace`/`page:view` 里；新增交互若依赖新页面 DOM，必须加到这两个 hook 中
- 页面内 `<script>` 若含 `{...}` 模板插值必须加 `is:inline`（否则 Astro 当 TS 模块处理会解析失败）；站点统计数据通过 `<body data-site-stats>` 传给客户端，勿用 inline 插值

### 样式
- `src/styles/global.css`：Tailwind 指令 + 大量自定义 class（`.post-list`、`.tw`、`.widget`、`.pagenavi` 等，命名直接对应原主题 CSS），**视觉还原以 custom class 为主、utility 为辅**
- `src/styles/colorful-original.css`：原主题 73KB 原始样式表，仅作对照参考，**不要直接引入**（路径基于 Emlog 模板目录）
- `src/styles/font-awesome.css`：Font Awesome 4，class 名与原站一致（`fa fa-xxx`），字体在 `public/fonts/`
- 自定义光标：`public/style/default.cur` / `link.cur`

### 工具函数
`src/utils/content-utils.ts`：`getSortedPosts`（置顶+时间）、`getTagList`、`getCategoryList`、`getArchiveList`（YYYY年M月）、`getHotPosts`（hotness*100+comments 排序）、`getNeighbors`（前一篇/后一篇）、`getCover`（frontmatter image 兜底 hash 选 `public/images/random/tb1-40.jpg`）

## 注意
- 原始 Emlog 主题 `D:\pages\limh.me` 的 `module.php` 含 `/e` 修饰符 eval 漏洞、`function/favicon.php`/`image.php` 是开放代理——不可搬回本项目
- 图片等静态资源都放 `public/` 直接引用，不走 Astro 的 import 管线

## ⚠️ 大坑警告：Astro content layer 缓存会"吃掉"插件改动（本地与 CI 都会踩）

**症状**：修改了 remark/rehype 插件（或任何影响 Markdown 渲染的逻辑）后构建，产物仍是旧 HTML，全程无任何报错。本地和线上都可能发生，2026-08-31 两侧均已实际踩坑。

**根因**：Astro 5 content layer 把渲染结果缓存在 `node_modules/.astro/data-store.json`，内容文件未变时构建直接复用缓存、**不重跑插件**；touch 内容文件 mtime 也无法使其失效。根目录 `.astro/` 只有 types/schema，删除它无效。

**本地规则**：改插件逻辑后必须先删除 `node_modules/.astro/` 再构建。

**CI 规则**：`withastro/action` 默认 `cache: true` 会跨 run 缓存 `node_modules/.astro`，同样复用旧渲染——**`deploy.yml` 已传 `cache: false` 关闭，任何 workflow 改动都不得恢复该缓存**。`build.yml` 用 `setup-node`（仅缓存 pnpm store）不受影响。

**CI 执行拓扑**：Pull Request 由 `build.yml` 执行 `Astro Check` 和完整 `Astro Build`，`lint.yml` 执行 Prettier 检查；`main` push 时 `build.yml` 的 `Astro Build` job 通过 `if: ${{ github.event_name == 'pull_request' }}` 跳过，完整构建只由 `deploy.yml` 执行一次后部署。`deploy.yml` 也支持 `workflow_dispatch`，并通过 `concurrency` 取消同一 workflow/ref 的旧部署。

**线上验证部署是否生效**：Fastly 边缘缓存 HTML `max-age=600`，且缓存键不含查询串（加 `?cb=` 无效）；看响应头 `Last-Modified` 是否晚于部署完成时间，或下载 Actions run 的 `github-pages` artifact 直接查 HTML（确定性验证）。
