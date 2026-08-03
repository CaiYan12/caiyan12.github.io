# WindowsIt's Music Club

由 Emlog Colorful（明月浩空）主题迁移而来的纯静态 Astro 博客。

## 技术栈

- **Astro 5.16** + TypeScript + Svelte 5（搜索组件）
- **Tailwind CSS 3**（样式重写，视觉还原 Colorful 海洋绿主题）
- **Swup.js** — 无刷新页面切换（替代原 Pjax）
- **Pagefind** — 构建期静态搜索索引
- **Giscus** — 评论系统（GitHub Discussions）
- **Fancybox** — 图片灯箱（替代原 Highslide）
- **Expressive Code** + **KaTeX** — 代码高亮与数学公式
- **@astrojs/rss / @astrojs/sitemap** — 订阅与 SEO

## 常用命令

```bash
pnpm install     # 安装依赖
pnpm dev         # 本地开发（http://localhost:4321）
pnpm build       # 构建到 dist/（含 Pagefind 索引）
pnpm preview     # 预览构建产物
pnpm check       # 类型检查
pnpm format      # Prettier 格式化
```

## 目录结构

```
src/
  config.ts              ← 站点配置（标题、导航、侧栏、Giscus 等都在这里改）
  content.config.ts      ← 文章/页面的字段定义（schema）
  content/
    posts/<slug>/index.md   ← 文章（目录即 slug，可放封面图）
    spec/about.md           ← 关于页面
  data/
    diary.ts             ← 微言碎语
    friends.ts           ← 友链
    comments.ts          ← 最新评论小部件数据
  pages/                 ← 路由（首页/文章/归档/说说/友链/相册/留言板/…）
  layouts/               ← 页面骨架（Layout / MainGridLayout）
  components/            ← 组件（导航/侧栏/文章卡片/小部件/评论…）
  styles/global.css      ← 主题样式（Colorful 视觉还原）
  utils/                 ← 工具函数
public/
  images/albums/         ← 相册（每个文件夹一个相册）
  fonts/                 ← Font Awesome 4 图标字体
  style/                 ← 自定义光标
```

## 怎么写文章

1. 在 `src/content/posts/` 新建文件夹（文件夹名 = URL slug）
2. 在文件夹里创建 `index.md`，frontmatter 字段见 `src/content.config.ts`
3. `git add . && git commit && git push` → Vercel 自动部署

## 如何开启评论（Giscus）

1. 在 GitHub 仓库 **Settings → Features** 开启 **Discussions**
2. 安装 [giscus app](https://github.com/apps/giscus)
3. 到 [giscus.app](https://giscus.app) 生成 `repo / repoId / category / categoryId`
4. 填入 `src/config.ts` 的 `commentConfig`，并将 `enable` 改为 `true`

## 如何添加相册

在 `public/images/albums/` 下新建文件夹，放入图片即可自动生成相册。

## 与 Emlog 原站的差异

- 移除：IP 归属地显示、用户注册、Flash 播放器、评论表情面板
- 评论数据由 Giscus 承载（侧栏"最新评论"小部件可手动维护 `src/data/comments.ts`）
- 首页幻灯片图片在 `src/config.ts` 的 `slideshowConfig` 中配置
