# WindowsIt's Music Club

由 Emlog Colorful（明月浩空）主题迁移而来的纯静态 Astro 博客。

## 技术栈

- **Astro 5.16** + TypeScript + Svelte 5（搜索组件）
- **React 19 + @astrojs/react** — 独立 AI 日报阅读页
- **Tailwind CSS 3**（样式重写，视觉还原 Colorful 海洋绿主题）
- **Swup.js** — 无刷新页面切换（替代原 Pjax）
- **Pagefind** — 构建期静态搜索索引
- **Giscus** — 评论系统（GitHub Discussions，留言板已启用；主题样式见 `public/giscus-theme.css`）
- **Fancybox** — 图片灯箱（替代原 Highslide）
- **Expressive Code** + **KaTeX** — 代码高亮与数学公式
- **@astrojs/rss / @astrojs/sitemap** — 订阅与 SEO

## 常用命令

```bash
pnpm install     # 安装依赖
pnpm dev         # 本地开发（http://localhost:4321）
pnpm build       # 构建到 dist/（LQIP 占位图 + GitHub 仓库数据 + Pagefind 已串联）
pnpm new-post -- <yyyymmddhhmmss> [标题]  # 按规范创建文章目录
pnpm fetch-repos --refresh  # 全量刷新 GitHub 仓库卡片元数据缓存
pnpm preview     # 预览构建产物
pnpm check       # 类型检查
pnpm smoke:ai-news  # AI 日报入口、详情、返回与离线快照 Smoke（需先启动 pnpm dev）
pnpm format      # Prettier 格式化
```

> ⚠️ **踩坑警告**：修改 Markdown 渲染插件（remark/rehype）后构建产物没变化？Astro 5 content layer 缓存（`node_modules/.astro/`）会复用旧渲染结果——先删除该目录再构建，touch 文件无效。CI 侧 `deploy.yml` 已对 `withastro/action` 传 `cache: false` 关闭同类缓存，任何 workflow 改动勿恢复。

## CI 构建与部署

- Pull Request：`build.yml` 执行 `Astro Check` 和完整 `Astro Build`，`lint.yml` 执行 Prettier 检查。
- `main` push：`build.yml` 只执行 `Astro Check`，其中的 `Astro Build` job 会跳过；完整构建由 `deploy.yml` 执行一次后部署到 GitHub Pages，避免重复构建。
- 手动触发 `deploy.yml`：仍执行完整构建和部署。
- `deploy.yml` 的 `withastro/action@v6` 必须保持 `cache: false`，避免跨 run 复用 `node_modules/.astro` 中过期的 content layer 渲染结果；同一 workflow/ref 的并发部署会取消旧 run。

## 目录结构

```
src/
  config.ts              ← 站点配置（标题、导航、侧栏、Giscus 等都在这里改）
  content.config.ts      ← 文章/页面的字段定义（schema）
  content/
    posts/<yyyymmddhhmmss>/index.md   ← 文章（目录即 URL slug，可放封面图）
    spec/about.md           ← 关于页面
  data/
    diary.ts             ← 微言碎语
    friends.ts           ← 友链
    comments.ts          ← 最新评论小部件数据
  pages/                 ← 路由（首页/文章/归档/说说/友链/相册/留言板/…）
  ai-news/               ← AI 日报 React 阅读器运行时
  layouts/               ← 页面骨架（Layout / MainGridLayout）
  components/            ← 组件（导航/侧栏/文章卡片/小部件/评论…）
  styles/global.css      ← 主题样式（Colorful 视觉还原）
  utils/                 ← 工具函数
  constants/             ← 构建期生成数据（LQIP 占位色、GitHub 仓库卡片元数据缓存）
scripts/                 ← 构建脚本（LQIP 生成、GitHub 仓库数据拉取、新建文章）
public/
  ai-news/snapshot/      ← AI 日报离线 RSS 快照
  images/albums/         ← 相册（每个文件夹一个相册）
  fonts/                 ← Font Awesome 4 图标字体
  style/                 ← 自定义光标
```

## 怎么写文章

1. 运行 `pnpm new-post -- <yyyymmddhhmmss> [标题]` 创建文章目录；构建规则会拒绝标题或中文 slug
2. 在目录里编辑 `index.md`，frontmatter 字段见 `src/content.config.ts`
3. `git add . && git commit && git push` → GitHub Actions 自动构建并部署到 GitHub Pages（`https://caiyan12.github.io/`）

## 文章 URL 规范（强制）

- 所有 `src/content/posts/` 的直接子目录（包括公开文章、私密文章和草稿）必须严格是 14 位数字：`yyyymmddhhmmss`。
- 文章 URL 固定为 `/posts/<yyyymmddhhmmss>/`，禁止使用文章标题、中文或其他自定义 slug。
- 目录名是文章 `id`，站内卡片、归档、RSS、二维码和“本文链接”都会从该目录名生成 URL。
- `published` 只有日期时，目录时间部分统一使用 `000000`；已有时分秒应原样对应目录名。
- `pnpm build` 会先运行 `scripts/validate-post-slugs.mjs`；新增文章应使用 `pnpm new-post -- <yyyymmddhhmmss> [标题]`。

## Giscus 评论

留言板 `/guestbook/` 已启用 Giscus，当前配置位于 `src/config.ts` 的 `commentConfig`：

- 仓库：`CaiYan12/caiyan12.github.io`
- 仓库 ID：`R_kgDOUJeNhw`
- Discussions 分类：`Announcements`
- 分类 ID：`DIC_kwDOUJeNh84DEonO`
- 页面映射：`pathname`
- 语言：`zh-CN`
- 主题：`https://caiyan12.github.io/giscus-theme.css`，源文件为 `public/giscus-theme.css`

评论区主题沿用 Colorful 风格：白底、细边框、圆角卡片和海洋绿 hover 阴影；头像框不加阴影，站长徽标复用 `public/images/admin.png` 并显示“站长”。Giscus iframe 生成的原始身份文本仍由 Giscus 控制，主题 CSS 只做视觉替换。

### 评论数与浏览量自动同步

- **COMMENTS**：`deploy.yml` 在构建前运行 `scripts/sync-site-stats.mjs`，通过 GitHub GraphQL 读取 `Announcements` 分类下的 Discussions（口径：顶层评论 + 全部回复），按 `posts/<14位目录名>/` 精确匹配文章后写入 `src/data/site-stats.json`（原子写入，生成结果不提交回仓库；`guestbook` 与欢迎帖不计入）。没有 Discussion 的文章回退 frontmatter 历史值。
- **views**：仅在仓库配置 `GOATCOUNTER_SITE`、`GOATCOUNTER_START`（Actions Variables）与 `GOATCOUNTER_API_KEY`（Actions Secret）后启用，按文章路径读取 GoatCounter 统计；口径为**页面加载次数**（需在 GoatCounter 的 Data collection → Sessions 关闭会话去重），并叠加在 frontmatter 迁移历史基线之上。
- 定时同步：`deploy.yml` 每小时第 17 分钟（UTC）运行，另支持 push 与手动触发；同步失败会阻止当次部署，线上保留上一个成功版本。
- 首页卡片、文章页头部、站点总统计与热门排序统一读取 `src/utils/site-stats.ts` 的有效值，不再直接使用 frontmatter 静态值。

如需重新接入或更换仓库：

1. 在 GitHub 仓库 **Settings → Features** 开启 **Discussions**
2. 安装 [giscus app](https://github.com/apps/giscus)
3. 到 [giscus.app](https://giscus.app) 生成新的 `repo / repoId / category / categoryId`
4. 更新 `src/config.ts` 的 `commentConfig`，确认 `enable` 为 `true`，并保留主题文件路径

## 如何添加相册

在 `public/images/albums/` 下新建文件夹，放入图片即可自动生成相册。

## 与 Emlog 原站的差异

- 移除：IP 归属地显示、用户注册、Flash 播放器、评论表情面板
- 评论数据由 Giscus 承载（侧栏"最新评论"小部件可手动维护 `src/data/comments.ts`）
- 首页幻灯片图片在 `src/config.ts` 的 `slideshowConfig` 中配置

## TODO:

- [ ] COMMENTS：自动同步 Giscus 评论数到首页、文章页、站点统计和热门排序
- [ ] 主页——最新评论部分为Mock，无实际资源
- [ ] 吐槽水军：考虑轮播展示留言板内容
- [ ] nav订阅左侧新增同风格链接，考虑接入站长QQ与微信
- [ ] 本站资源添加：部分原纯HTML页面的移植
- [ ] 图片墙页面：每个照片元件底部的日期高度不一，图片需要合适展示到一个固定的元件大小
- [ ] 相册图库：UI部分问题修复
