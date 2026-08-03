# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目背景

WindowsIt 个人博客（WindowsIt's Music Club），由 Emlog Colorful（明月浩空）主题迁移而来的纯静态 Astro 博客。视觉必须还原 Colorful 原版（海洋绿 `#00c000` 主色、白底圆角卡片、自定义光标），技术栈对齐 `D:\pages\mizuki`。迁移任务的完整背景与取舍见 `D:\pages\emlog-to-astro-migration-prompt.md`。

## 常用命令

```bash
pnpm install     # 安装依赖（中国网络需先设 registry 为 https://registry.npmmirror.com）
pnpm dev         # 本地开发 http://localhost:4321
pnpm build       # 构建 dist/（含 Pagefind 索引生成，build 脚本已串联）
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
