# WindowsIt's Music Club

[![Astro](https://img.shields.io/badge/Astro-6.4.8-BC52EE?logo=astro&logoColor=white)](https://astro.build/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![GitHub Pages](https://img.shields.io/badge/Deploy-GitHub_Pages-222?logo=github&logoColor=white)](https://caiyan12.github.io/)

由 Emlog Colorful（明月浩空）主题迁移而来的**纯静态**个人博客。没有后台、没有数据库——**所有内容都是这个仓库里的文件**：改完 `git push`，GitHub Actions 自动构建上线。

> 📖 **这份 README 是站长的内容编辑手册。** 想改什么，先从下面「🧭 我想改点什么」一行找到该动哪个文件，再进对应小节看细节。
> 实现细节、踩坑记录与维护红线（z-index 层叠、光标单源、天气对比度门……）不在 README 重复，见 [AGENTS.md](AGENTS.md)。

- 线上：<https://caiyan12.github.io/>
- 本地：`pnpm dev` → <http://localhost:4321>
- 文章 URL 硬规则：`/posts/<14位时间戳>/`，目录名即 slug，**不能用标题或中文当 slug**

---

## 🧭 我想改点什么

一行一件事。**「改这里」是唯一入口**，不用去别处找。

### ✍️ 内容

| 我想…                                | 改这里                                                                                     | 生效                                                                               |
| ------------------------------------ | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| 发一篇文章                           | `pnpm new-post -- <yyyymmddhhmmss> [标题]` → 生成的 `src/content/posts/<14位>/index.md`    | dev 热更新                                                                         |
| 改文章标题/正文/标签/分类/简介       | 同上文件的 frontmatter 与正文                                                              | dev 热更新                                                                         |
| 给文章配头图                         | 图放 `public/images/posts/<14位>/`，frontmatter 写 `image: "/images/posts/<14位>/xxx.jpg"` | 头图变更后跑 `pnpm lqips` 或 `pnpm build` 才出模糊占位与 WebP 变体（不跑也能显示） |
| 临时藏起一篇                         | frontmatter `draft: true`                                                                  | dev 热更新                                                                         |
| 发一篇但不进任何列表（URL 直连可见） | frontmatter `private: true`                                                                | dev 热更新                                                                         |
| 让一篇上「热门推荐」                 | frontmatter `hotness: 0–5`                                                                 | dev 热更新                                                                         |
| 置顶一篇                             | frontmatter `pinned: true`                                                                 | dev 热更新                                                                         |
| 发一条微言碎语                       | `src/data/diary.ts`，**插到数组最前面**                                                    | dev 热更新                                                                         |
| 新建相册 / 加照片                    | 往 `public/images/albums/<相册名>/` 放图                                                   | dev 热更新                                                                         |
| 删一个相册                           | 删掉 `public/images/albums/<相册名>/` 整个文件夹                                           | dev 热更新                                                                         |
| 改「关于」页正文                     | `src/content/spec/about.md`                                                                | dev 热更新                                                                         |
| 改「我的技能」                       | `src/data/skills.ts`                                                                       | dev 热更新                                                                         |
| 改「时间线」                         | `src/data/timeline.ts`                                                                     | dev 热更新                                                                         |
| 改「每日好书」书单                   | `src/nice-books/data/books.ts`                                                             | dev 热更新                                                                         |
| 换 AI 日报的 RSS 源                  | `src/ai-news/config/sources.ts` 的 `DEFAULT_SOURCE`                                        | dev 热更新                                                                         |
| 换 AI 日报的离线快照                 | 把当期 RSS 的 XML 原样覆盖到 `public/ai-news/snapshot/juya.xml`                            | 强刷浏览器                                                                         |

### 🤝 友链与项目

| 我想…                                    | 改这里                                                        | 生效            |
| ---------------------------------------- | ------------------------------------------------------------- | --------------- |
| 加/改/删友情链接                         | `src/data/friends.json`                                       | 文字 dev 热更新 |
| 让新友链有图标                           | `pnpm fetch-friend-icons`（缺省只补缺，`--refresh` 强制刷新） | 立即            |
| 改友链页的「申请须知」文案               | `src/pages/friends.astro` 底部                                | dev 热更新      |
| 改「我的项目」卡片的中文简介/技术栈/状态 | `src/data/projects.ts` 的 `projectOverrides`                  | dev 热更新      |
| 刷新 GitHub 仓库卡片元数据               | `pnpm fetch-repos [--refresh]`                                | 立即            |
| 刷新「我的项目」快照（含 Pinned 顺序）   | `pnpm fetch-projects`                                         | 立即            |

### 🎨 外观与设置

| 我想…                                              | 改这里                                                                                                                                                                                | 生效              |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| 站点标题/副标题/关键词/作者/建站时间/备案号/页脚字 | `src/config.ts` → `siteConfig`                                                                                                                                                        | dev 热更新        |
| 站点头像                                           | 站点各处显示的是 `/images/avatar.webp`（`siteConfig.avatar` / `desktopLogo` 都指向它，直接替换该文件）；`public/images/avatar.png` 只是 favicon 的源图，换图后跑 `pnpm build:favicon` | 立即              |
| 顶部导航的菜单项                                   | `src/config.ts` → `navBarConfig`                                                                                                                                                      | dev 热更新        |
| 侧栏部件的顺序/增删                                | `src/config.ts` → `sidebarConfig.widgets`                                                                                                                                             | dev 热更新        |
| 侧栏部件的标题（如「吐槽水军」）                   | 对应 `src/components/widget/Widget*.astro` 里的 `<WidgetLayout title="…">`                                                                                                            | dev 热更新        |
| 首页幻灯片切换速度                                 | `src/config.ts` → `slideshowConfig.interval`                                                                                                                                          | dev 热更新        |
| 首页幻灯片的大图                                   | ⚠️ 见下方「三个想当然会错的地方」——改的是文章头图                                                                                                                                     | dev 热更新        |
| 背景壁纸                                           | `src/config.ts` → `backgroundConfig.images` + `public/images/bg/`                                                                                                                     | dev 热更新        |
| 看板娘 Pio 开关/位置/台词                          | `src/config.ts` → `pioConfig`                                                                                                                                                         | dev 热更新        |
| 音乐播放器开关/皮肤/ID                             | `src/config.ts` → `myhkwPlayerConfig`                                                                                                                                                 | 运行时            |
| 樱花动效数量/速度                                  | `src/config.ts` → `sakuraConfig`                                                                                                                                                      | dev 热更新        |
| 文章底部版权协议                                   | `src/config.ts` → `licenseConfig`                                                                                                                                                     | dev 热更新        |
| 页脚「勉强运行 N 天」是否显示                      | `src/config.ts` → `footerConfig.showRuntime`                                                                                                                                          | dev 热更新        |
| 评论仓库/分类/主题                                 | `src/config.ts` → `commentConfig` + `src/data/giscus-sync.json`                                                                                                                       | dev 热更新        |
| 天气卡的 7 枚天气图标                              | `public/weather/icons/*.svg`（平涂、禁渐变）                                                                                                                                          | dev 热更新        |
| 天气卡的 7 张摄影壁纸                              | 准备 640px 原图后跑 `pnpm build:weather-bg -- --from <原图目录>`                                                                                                                      | 立即              |
| 光标                                               | 整体替换 `public/style/default.cur` / `link.cur`                                                                                                                                      | dev 热更新        |
| 站点图标 favicon                                   | `pnpm build:favicon`（源图 `public/images/avatar.png`，四档输出到三处）                                                                                                               | 立即              |
| 佛祖保佑横幅的文案                                 | 仓库根 `佛祖保佑.xml`                                                                                                                                                                 | 必须 `pnpm build` |

### ✏️ 页面上的文字

| 我想…                                           | 改这里                                                                               |
| ----------------------------------------------- | ------------------------------------------------------------------------------------ |
| 留言板欢迎语                                    | `src/pages/guestbook.astro`                                                          |
| 友链申请须知                                    | `src/pages/friends.astro`                                                            |
| 404 页全部文案                                  | `src/pages/404.astro`                                                                |
| 搜索页无 JS 兜底文案                            | `src/pages/search.astro`                                                             |
| 各列表页的 `title=` / `description=` / 空态文案 | 对应 `src/pages/` 下的 `.astro`（每页 frontmatter 里就是）                           |
| 技能页的分类/等级中文名                         | `src/pages/skills.astro` frontmatter 的 `categoryLabels` / `levelLabels`             |
| 时间线的类型中文名                              | `src/pages/timeline.astro` frontmatter 的 `typeLabels`                               |
| 标签云/分类云集的标题与前缀                     | `src/components/layout/TaxonomyListing.astro` 的 `KIND_CONFIG`                       |
| 面包屑首项「首页」                              | `src/components/layout/ListingHeader.astro`                                          |
| 文章卡「N 次吐槽 / 抢沙发」                     | `src/components/layout/PostCard.astro`                                               |
| 版权声明整句                                    | `src/components/misc/License.astro`                                                  |
| `/domain/` 终端壳的名片、自述、友链、署名       | `src/domain.html`（整份都是硬编码）                                                  |
| `/books/` 三页的标题与导航                      | `src/nice-books/components/SiteHead.astro` / `SiteHeader.astro` / `SiteFooter.astro` |
| `/ai-news/` 的界面文案                          | `src/ai-news/components/*.tsx`                                                       |

### 🔌 需要跑命令的刷新

| 我想…                                  | 命令                                                                    |
| -------------------------------------- | ----------------------------------------------------------------------- |
| 刷新评论数 / 最新评论 / 吐槽水军快照   | `pnpm sync-site-stats`（**不在 `pnpm build` 里**，CI 每次部署前自动跑） |
| 重新生成文章封面的模糊占位与 WebP 变体 | `pnpm lqips`（`--refresh` 强制全量）                                    |
| 重新生成中文地级市目录                 | `pnpm build:weather-cities`                                             |
| 重新导出 favicon                       | `pnpm build:favicon`                                                    |

### 🚫 这些不要手改

它们由脚本在构建期覆写，手改会被下一次构建/部署冲掉。

| 文件                                              | 谁写的                                   |
| ------------------------------------------------- | ---------------------------------------- |
| `src/constants/lqips.json`、`image-manifest.json` | `scripts/generate-lqips.mjs`             |
| `src/constants/github-repos.json`                 | `scripts/fetch-github-repos.mjs`         |
| `src/constants/github-projects.json`              | `scripts/fetch-github-projects.mjs`      |
| `src/constants/github-contributions.json`         | `scripts/fetch-github-contributions.mjs` |
| `src/constants/friend-icons.json`                 | `scripts/fetch-friend-icons.mjs`         |
| `src/data/site-stats.json`                        | `scripts/sync-site-stats.mjs`            |
| `public/images/_variants/`（整个目录，且未入库）  | `scripts/generate-lqips.mjs`             |

---

## 📝 写文章

### 三步

```bash
# 1. 建目录（目录名 = URL slug，必须 14 位数字 yyyymmddhhmmss）
pnpm new-post -- 20260930120000 文章标题
#    --dry-run 可先只预览不落盘

# 2. 编辑刚生成的 src/content/posts/<上面那个目录名>/index.md

# 3. 推送即上线
git add . && git commit && git push
```

- `new-post` 会自动按目录名生成 `published`（`2026-09-30 12:00:00`），**别手改它**，必须与目录名对应。
- 目录名不合规时 `pnpm build` 会直接失败（`scripts/validate-post-slugs.mjs` 把关），这是故意的。
- 文章正文里的图片放 `public/images/posts/<14位>/`，用 `/images/posts/<14位>/<文件名>` 引用；正文图会自动进灯箱可放大。

### frontmatter 全字段

schema 定义在 `src/content.config.ts`，未列出的字段不要自己加。

| 字段                      | 必填    | 默认                  | 说明                                                                                                 |
| ------------------------- | ------- | --------------------- | ---------------------------------------------------------------------------------------------------- |
| `title`                   | ✅      | —                     | 文章标题，文章页渲染为 `<h1>`                                                                        |
| `published`               | ✅      | —                     | 发布时间，由 `new-post` 按目录名生成                                                                 |
| `description`             |         | `""`                  | 摘要与 SEO 描述，留空则由正文自动截取                                                                |
| `image`                   |         | `""`                  | 封面图路径；留空按目录名哈希稳定选一张 `public/images/random/tb1.jpg`–`tb40.jpg`（不会每次构建乱跳） |
| `tags`                    |         | `[]`                  | 标签数组，驱动 `/tag/` 与侧栏标签云                                                                  |
| `category`                |         | `""`                  | 单个分类（不是数组），驱动 `/category/`                                                              |
| `pinned`                  | `false` |                       | 置顶，排在所有文章之前                                                                               |
| `draft`                   | `false` |                       | 草稿：**不生成页面**，任何列表/归档/RSS/搜索都没有它                                                 |
| `private`                 | `false` |                       | 私密：页面照常生成、URL 可直连，但所有列表隐藏、不进 Pagefind 索引                                   |
| `hotness`                 | `0`     |                       | 热门指数 0–5，热门分 = `hotness × 100 + 评论数`                                                      |
| `comments`                | `0`     |                       | 历史评论数兜底；真实值以 `src/data/site-stats.json` 为准，没有对应条目时才用它                       |
| `views`                   | `0`     |                       | 迁移兼容字段，**当前不渲染任何围观数**                                                               |
| `updated`                 | —       |                       | 「最后更新于」显示的日期                                                                             |
| `author` / `lang`         |         | `WindowsIt` / `zh_CN` | 很少需要改                                                                                           |
| `readingTime` / `excerpt` | —       |                       | 由 remark 插件自动注入，不用手写                                                                     |

### 配图与封面的两个细节

- 换封面图后要跑 `pnpm lqips`（或 `pnpm build`）才会重新生成模糊占位与 WebP 变体。不跑也能正常显示，只是没有占位动画、也拿不到变体省流量。
- 不设 `image` 时走 hash 兜底随机图——**这是稳定的**（同一个目录名永远挑到同一张），换文章时间戳才会变。

### 可见性对照

| 设置            | 各列表/首页 | 归档·标签·分类 | 文章页        | RSS | OG 分享图 | 站内搜索 |
| --------------- | ----------- | -------------- | ------------- | --- | --------- | -------- |
| 默认（公开）    | ✅          | ✅             | ✅            | ✅  | ✅        | ✅       |
| `draft: true`   | ❌          | ❌             | ❌ 页面不生成 | ❌  | ❌        | ❌       |
| `private: true` | ❌          | ❌             | ✅ URL 直连   | ❌  | ✅        | ❌       |

私有文章若用了公开分类（例如「技术」），分类链接照常保留；只有它独占的那个标签/分类因为不生成页面，会降级成纯文字而不是死链。

### 正文可用的 Markdown 扩展

| 写法                                                | 效果                                                                                                                             |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `::github{repo="owner/repo"}`                       | GitHub 仓库卡片（星标/描述/语言）。元数据来自 `pnpm fetch-repos` 的缓存，**浏览器不请求 GitHub API**；文末裸仓库链接建议都换成它 |
| `:::letter-paper`                                   | 信纸稿纸面板（`/about/` 在用）                                                                                                   |
| 普通 Markdown 表格                                  | 自动包 `.table-scroll`，过宽只在容器内横滚                                                                                       |
| Mermaid 图表（三个反引号围栏 + `mermaid` 语言标注） | 客户端懒加载渲染流程图等                                                                                                         |
| `$...$` / `$$...$$`                                 | KaTeX 数学公式                                                                                                                   |

改这些插件或正文样式的维护约束在 [AGENTS.md](AGENTS.md)（当前一节「Markdown 处理器」「样式」两条）。

---

## 💬 微言碎语

数据在 `src/data/diary.ts`，一个普通 TS 数组：

```ts
export const diary: DiaryItem[] = [
	{
		date: "2026-09-19 07:13", // YYYY-MM-DD HH:mm，补零
		content: "哦对了，Z八分钱。", // 纯文本，不渲染 Markdown
		image: "/images/diary/202609190713.jpg", // 可选
	},
	// …
];
```

四条规则：

1. **顺序就是数组顺序，最新在最上面，没有任何自动排序**——新条目必须手动插到数组头部。
2. `date` 保持 `YYYY-MM-DD HH:mm` 并补零。这个字符串会原样显示在页面底部那行，不补零会看得参差不齐。
3. `content` 是纯文本，不要写 HTML 或 Markdown 语法（不会渲染，只会露出来）。
4. 配图放 `public/images/diary/<yyyymmddhhmmss>.jpg`，用站点根绝对路径引用。

**插在哪里有额外后果**：同一份数组被三处消费——

| 消费方                                    | 取多少                    |
| ----------------------------------------- | ------------------------- |
| `/diary/` 页面（`src/pages/diary.astro`） | 全量                      |
| 侧栏「最新微语」（`WidgetTwitter.astro`） | 前 4 条，正文截断到 30 字 |
| 顶部头部轮播（`Navbar.astro`）            | 前 4 条，**不截断**       |

所以插进前 4 条 = 同时出现在侧栏和头部；单条过长时注意头部是固定高度、超出会被裁掉。页面标题与面包屑在 `src/pages/diary.astro` 改。

---

## 📷 相册 / 图片墙 / 幻灯片 / 背景图

### 相册（文件夹驱动）

往 `public/images/albums/<相册名>/` 放图就自动生成相册，**没有任何配置文件、也不需要命令**：

- 相册名同时是页面标题和 URL（中文名没问题）。
- 文件夹内**按文件名排序的第一张图**当封面，所以想指定封面就用 `01-xxx.jpg` 这类前缀。
- 支持 `.jpg/.jpeg/.png/.gif/.webp/.avif`。
- 删文件夹 = 删相册；删图 = 删照片。
- 新图在 dev 下立刻出卡片；模糊占位与 WebP 变体仍需 `pnpm build`（或 `pnpm lqips`）。
- 索引页与详情页的空态文案在 `src/pages/albums.astro` / `albums/[id].astro`。

### 图片墙 `/images/`（全自动）

取最新 40 篇文章的封面图，**没有任何东西需要手动维护**——想改图片墙就去改文章头图。

### ⚠️ 三个想当然会错的地方

1. **首页顶部的大轮播不是 `slideshowConfig` 挑的图。** `src/components/control/Slideshow.astro` 取的是**最新 5 篇公开文章**，每张用该文的 frontmatter `image`；只有那篇文章没设头图时，才回退到 `slideshowConfig.slides[index].image`。
   所以「想换首页大图」的正确做法是**改这 5 篇文章的头图，或者发一篇新文章**。`slideshowConfig.slides` 只是缺图兜底，数组长度同时决定轮播张数上限（最多 5），`interval` 是切换毫秒数。
2. **侧栏部件的标题不在配置里。** `sidebarConfig.widgets` 只管顺序和增删；「吐槽水军」「附近天气」「最新微语」这些字面硬编码在各自的 `src/components/widget/Widget*.astro` 里。想改名要动组件。
3. **导航下拉的组名不在配置里。** 「文章归档 / 关于本站 / 附加功能 / 本站资源」四组组名和「B站 / QQ / 微信 / 订阅」写在 `Navbar.astro`（桌面）和 `MMenu.astro`（移动端全屏菜单）两处，**只改一处会导致桌面和手机不一致**。

### 背景壁纸

`src/config.ts` 的 `backgroundConfig.images` 列路径，图放 `public/images/bg/`。现有 4 张的来源记录在 `public/images/bg/PEXELS-SOURCES.md`。

---

## 📄 独立页面与数据页

### 关于页 `/about/`

- 正文：`src/content/spec/about.md`（一个 Markdown 文件，可用 `:::letter-paper` 信纸稿纸）。
- 正文前的 GitHub 贡献日历由 `pnpm build` 拉取生成；没有令牌时显示回退卡而不是报错。
- ⚠️ 同目录的 `src/content/spec/friends.md` **是孤儿文件**——全仓只有 `about.astro` 读 spec collection 且只取 `about`，友链页走的是 `friends.json`。改它不会改变任何页面。

### 我的技能 `/skills/`

数据 `src/data/skills.ts`，每条：`id` / `name` / `description` / `icon`（Iconify 名）/ `category` / `level` / `experience{years,months}` / `color`。
分类与等级的**中文显示名**不在这里，在 `src/pages/skills.astro` 的 frontmatter（`categoryLabels` / `levelLabels`）。

### 时间线 `/timeline/`

数据 `src/data/timeline.ts`，每条：`id` / `title` / `description` / `type`(education|work|project|achievement) / `startDate` / `endDate`（留空＝至今）/ `location` / `organization` / `position` / `skills` / `achievements` / `links` / `icon` / `featured`。
类型中文名在 `src/pages/timeline.astro` 的 `typeLabels`。按 `startDate` 倒序自动排。

### 友情链接 `/friends/`

数据 `src/data/friends.json`：

```json
{
	"name": "站点名",
	"url": "https://example.com/",
	"description": "一句话简介",
	"tags": ["Blog"],
	"avatar": "/friend-icons/xxxxxxxx.png"
}
```

- `avatar` 可以留空——构建期自动抓对方 favicon 缓存到 `public/friend-icons/`，凭 `pnpm fetch-friend-icons`（普通模式只补缺，`--refresh` 才刷新已有的）。所以**加新友链后要跑一次这条命令**，否则只有首字占位。
- 也可以直接填一个外链图片地址（`https://.../icon.png`），绕过缓存。
- 页面上的申请须知文案在 `src/pages/friends.astro`。

### 我的项目 `/projects/`

两层数据：`src/data/projects.ts` 是人工策展层（中文简介、技术栈、状态、起止日期、是否推荐），仓库的 star/语言/fork 来自构建期 GitHub 快照。只收录公开仓库，私有项目也能手工加。
刷新：`pnpm fetch-projects`。统计卡的主人由 `siteConfig.githubUser` 决定。

### 每日好书 `/books/`

书单 `src/nice-books/data/books.ts`（当前 70 本，模块导入时会做字段断言，不合规则直接构建失败）：

```ts
{
	id: "01",
	title: "百年孤独",
	author: ["加西亚·马尔克斯", "范晔 译"],
	publisher: "南海出版公司",
	firstEdition: { year: 2011, edition: "第一版" },
	coverUrl: null,              // null = 用程序生成的 SVG 书封
	description: "……",           // 内容简介
	recommendationReason: "……",  // 站长荐语（第一人称）
	excerpts: ["……"],            // 精选摘抄
	tags: ["文学", "小说"],
	featured: true,              // 进「站长推荐」
}
```

`/books/`、`/books/archive/`、`/books/:id/` 三个页面全部由这一份数据生成，页面文案在 `src/pages/books/*.astro` 与 `src/nice-books/components/`。

### AI 日报 `/ai-news/`

- 换订阅源：`src/ai-news/config/sources.ts` 的 `DEFAULT_SOURCE`（`name` + `url`）。⚠️ `id` 必须保持 `juya-daily`，它是橘鸦定制阅读风格的唯一身份判据，改了会静默回退成通用阅读页。目标 RSS 必须返回 CORS 头，否则浏览器读不到。
- 离线快照：`public/ai-news/snapshot/juya.xml`。断网或上游抽风时页面回退到它。刷新方法就是把当期 RSS 的 XML 原样覆盖上去。
- 界面文案在 `src/ai-news/components/*.tsx`。

### 留言板 `/guestbook/`

欢迎语硬编码在 `src/pages/guestbook.astro`。评论由 Giscus 承载（`data-term="guestbook"`），**留言内容只能在 GitHub Discussions 里增删**，本地任何文件都不存留言。`src/data/guestbook.ts` 里的假留言只在 `pnpm dev` 生效，用于本地看效果。

### `/domain/` 终端壳

整份 `src/domain.html` 都是硬编码：`<title>`、meta description、`I'mWindowsIt`、四行自我介绍、`主站/联系` 弹窗文案、两个伪终端的命令与自述、底部 `WINDOWSIT 2018 - 2026` 和 `THX @NUTSSSS` 署名。样式在 `public/domain/css/`。
它不走博客 Layout，天气行走公共的 `public/weather/weather-service.js`。

---

## ⚙️ 站点配置（`src/config.ts` 十一段）

改配置 = 改站点。每一段控制什么：

| 段                  | 控制什么                                                                                        |
| ------------------- | ----------------------------------------------------------------------------------------------- |
| `siteConfig`        | 站点标题、副标题、URL、关键词、作者、头像、建站时间、每页文章数、摘要字数、备案号、页脚附加信息 |
| `backgroundConfig`  | 背景壁纸图片列表                                                                                |
| `navBarConfig`      | 顶部导航：`items`（首页/微言碎语/留言板）+ 四个下拉组 + 右侧 `social`（B站/QQ/微信/RSS）        |
| `sidebarConfig`     | 侧栏小部件的显示顺序（`hotlog` 仅首页、`related` 仅文章页，组件自己判断）                       |
| `licenseConfig`     | 文章底部版权协议名与外链                                                                        |
| `commentConfig`     | Giscus 开关、映射方式、表情反应、主题URL                                                        |
| `slideshowConfig`   | 首页幻灯片开关、切换间隔、缺图兜底 banner                                                       |
| `pioConfig`         | 看板娘开关、模型、停靠侧、尺寸与全部台词                                                        |
| `myhkwPlayerConfig` | 明月浩空播放器开关、播放器 ID、皮肤、位置                                                       |
| `sakuraConfig`      | 樱花环境动效数量/尺寸/透明度/速度/层级                                                          |
| `footerConfig`      | 页脚运行天数、Emlog 致谢行                                                                      |

配套的数据文件：`src/data/giscus-sync.json`（评论仓库与分类 ID，被 `config.ts` 和 Node 同步脚本共用，改这里两边同步）。

---

## 🔧 工程信息

### 技术栈

Astro 6.4.8 + TypeScript + Svelte 5（搜索组件）+ React 19（AI 日报独立页）；Tailwind CSS 3（经根 `postcss.config.mjs` 直连，**不要加回 `@astrojs/tailwind`**）；Swup.js 无刷新切页；Pagefind 构建期搜索；Giscus 评论；Fancybox 6 灯箱；Expressive Code + KaTeX。

### 常用命令

**日常**

| 命令                                         | 作用                                                                |
| -------------------------------------------- | ------------------------------------------------------------------- |
| `pnpm install`                               | 安装依赖（国内先设 `registry` 为 `https://registry.npmmirror.com`） |
| `pnpm dev`                                   | 本地开发 <http://localhost:4321>                                    |
| `pnpm build`                                 | 完整构建到 `dist/`（16 步，见下）                                   |
| `pnpm preview`                               | 预览构建产物（可 `--port 4322`）                                    |
| `pnpm check`                                 | `astro check` 类型检查                                              |
| `pnpm new-post -- <14位> [标题] [--dry-run]` | 新建文章                                                            |
| `pnpm format`                                | Prettier 格式化 `src`、`scripts` 与 `tailwind.config.cjs`           |

**数据刷新**（都不在 `pnpm build` 里，需要主动跑）

| 命令                                     | 作用                                                              |
| ---------------------------------------- | ----------------------------------------------------------------- |
| `pnpm sync-site-stats`                   | 同步 Giscus 评论数/最新评论/吐槽水军到 `src/data/site-stats.json` |
| `pnpm lqips`                             | 重新生成模糊占位与 WebP 变体（`--refresh` 强制全量）              |
| `pnpm fetch-repos [--refresh]`           | 刷新 `::github{}` 卡片的仓库元数据缓存                            |
| `pnpm fetch-projects`                    | 刷新「我的项目」快照                                              |
| `pnpm fetch-friend-icons [--refresh]`    | 补齐/刷新友链图标                                                 |
| `pnpm build:favicon`                     | 从 `public/images/avatar.png` 重出 favicon 到三处                 |
| `pnpm build:weather-cities`              | 重新生成 367 个地级市目录（需网络）                               |
| `pnpm build:weather-bg -- --from <目录>` | 重新导出天气卡 7 张壁纸（需 640px 原图）                          |

**测试与冒烟**（离线单测注入 `fetchImpl`，不访问真实网络）

| 命令                          | 作用                                                          |
| ----------------------------- | ------------------------------------------------------------- |
| `pnpm test:utils`             | `src/utils` 纯函数（排序/评分/邻篇/canonical）                |
| `pnpm test:nice-books`        | Nice Books 数据契约与搜索                                     |
| `pnpm test:site-stats`        | Giscus 同步                                                   |
| `pnpm test:contributions`     | 贡献日历数据脚本                                              |
| `pnpm test:friend-icons`      | 友链图标缓存                                                  |
| `pnpm test:projects`          | 项目同步/缓存/合并/排序                                       |
| `pnpm test:lib`               | `scripts/lib` 与 `src/plugins` 单测                           |
| `pnpm test:weather`           | 天气码表与城市目录（**不在 build 链**）                       |
| `pnpm smoke:ui`               | 主站 UI 实机烟测，需先 `build + preview`                      |
| `pnpm test:fancybox`          | 灯箱冒烟，需先 `build + preview`                              |
| `pnpm smoke:nice-books`       | Nice Books 三页冒烟                                           |
| `pnpm smoke:ai-news`          | AI 日报冒烟                                                   |
| `pnpm smoke:pelican`          | 鹈鹕骑车冒烟，需先 `build + preview --port 4322`              |
| `pnpm qa:nice-books-geometry` | Nice Books 3D 几何检查                                        |
| `pnpm qa:weather-mainland`    | wttr.in 大陆直连实测（须在大陆网络，`NET`/`WINDOW` 两栏必填） |
| `pnpm audit:ledger <票册.md>` | 票册自检（刻意不接进 build 与 CI）                            |

> 三类冒烟脚本的基址参数形态不同，传错会表现为「选择器等不到」的假失败：`FANCY_BASE_URL` / `UI_SMOKE_BASE_URL` / `PELICAN_BASE_URL` 传**站点根**；`NICE_BOOKS_BASE_URL` / `AI_NEWS_BASE_URL` 传**完整页面地址**。

### 构建链

`pnpm build` 是一条 16 步的 `&&` 链：

```
7 组单测（projects / nice-books / site-stats / utils / contributions /
          friend-icons / lib）
→ validate-post-slugs       文章目录名不合规 → 构建失败
→ fetch-friend-icons        拉友链图标
→ generate-lqips            LQIP + WebP 变体 + 两份 manifest
→ fetch-github-projects     「我的项目」快照
→ fetch-github-repos        ::github{} 卡片缓存
→ fetch-github-contributions  贡献日历
→ astro build
→ inject-buddha-banner      给 dist 全部 HTML 注入佛祖横幅
→ pagefind --site dist      生成搜索索引
```

**会中断构建**：任一组单测失败、文章目录名不合规、`generate-lqips` 抛错、没有有效快照时的 `fetch-github-projects`、`astro build`（含 OG 图拉字体失败）、佛祖横幅 XML 格式不符、pagefind。
**只告警不中断**：单个友链图标拉取失败（记负缓存）、`fetch-github-repos` 单个仓库失败、`fetch-github-contributions` 的全部分支。

两个已知的坑：

1. **改 Markdown 插件后产物没变？** Astro 的 content layer 会复用旧渲染结果。先删 `node_modules/.astro/`，存在时再删 `.astro/data-store.json`，再构建；touch 文件无效。CI 侧 `deploy.yml` 已对 `withastro/action` 传 `cache: false`，**任何 workflow 改动都不要恢复这个缓存**。
2. **`astro build` 报 `No fonts are loaded`** 是 OG 图端点在构建期访问 `fonts.googleapis.com` 拉字体时网络抖了，不是代码问题。用 `curl` 确认连通性后重跑即可。

### 环境

- **本地**：`pnpm dev` → `http://localhost:4321`。已知 dev 限制：Pio 看板娘因 Svelte hydration 报错不渲染，验证 Pio 必须 `pnpm build && pnpm preview`；dev 下评论/留言是 mock 数据。
- **线上**：<https://caiyan12.github.io/>。GitHub Actions 部署；Fastly 边缘缓存 HTML `max-age=600` 且缓存键不含查询串（加 `?cb=` 无效），刚推送完最多等 10 分钟。验证部署是否生效看响应头 `Last-Modified`，或直接下载 run 的 `github-pages` artifact。

### CI 与部署

- **PR**：`build.yml` 跑 `Astro Check` + 完整 `Astro Build`；`lint.yml` 跑 `prettier --check ./src`。
- **push 到 main**：`build.yml` 的 Build job 跳过，完整构建只由 `deploy.yml` 执行一次后部署。
- **定时**：`deploy.yml` 每 6 小时跑一次同步评论数据再部署；同步失败会阻止当次部署，线上保留上一个成功版本。
- `deploy.yml` 的同步步骤跑在 `pnpm install` **之前**，所以那条链路只能用 Node 内置模块——给它加任何包依赖都会让部署秒失败。

### 目录结构

```
src/
  config.ts              ← 站点配置中枢（见上一节）
  content.config.ts      ← 文章/页面的字段定义
  content/
    posts/<14位>/index.md  ← 文章（目录即 slug）
    spec/about.md          ← 关于页
    spec/friends.md        ← ⚠️ 孤儿文件，无渲染入口
  data/                  ← 微言/友链/技能/时间线/项目/留言 mock 等手改数据
  pages/                 ← 路由
  nice-books/            ← /books/ 独立壳（数据/lib/组件/样式）
  ai-news/               ← /ai-news/ React 阅读器
  layouts/ components/ plugins/ utils/ constants/
public/
  images/albums/         ← 相册（文件夹驱动）
  images/posts/<14位>/   ← 文章配图
  images/slide/  bg/  random/  diary/
  weather/               ← 天气服务、图标、壁纸、城市目录
  pio/                   ← 看板娘（vendored，自维护）
  ai-news/snapshot/      ← AI 日报离线快照
  vendor/                ← 3D 标签云等 vendored 库
scripts/                 ← 构建脚本、单测、冒烟；scripts/lib/ 是共用写入器与校验器
vendor/pelican-bike/     ← 鹈鹕骑车源码（不参与 pnpm build）
佛祖保佑.xml             ← 构建后注入全部 HTML 的横幅
```

### Giscus 评论

文章评论区用 `pathname`，留言板用 `specific` + `data-term="guestbook"`；文章尾部的表情反应由 Giscus 原生界面显示。评论数、侧栏「最新评论」与「吐槽水军」都来自构建期同步的 `src/data/site-stats.json`，**浏览器不请求 GitHub**。
换仓库/分类：开 Discussions → 装 giscus app → 到 [giscus.app](https://giscus.app) 生成新的 `repo / repoId / category / categoryId` → 更新 `src/data/giscus-sync.json` 与 `src/config.ts` 的 `commentConfig`。主题样式在 `public/giscus-theme.css`。

### 天气胶囊

侧栏首位的小部件，数据**只有一个上游 `wttr.in`**：浏览器定位（普通精度、不按 IP 猜）→ 坐标粗化到一位小数 → 一次请求拿温度/体感/风速/湿度；中文地名由本地 367 城目录解析。侧栏卡与 `/domain/` 终端行共用一套服务（`public/weather/weather-service.js`）。
规格与验收台账：[`docs/plans/2026-09-28-weather-capsule-spec.md`](docs/plans/2026-09-28-weather-capsule-spec.md)、[`docs/plans/2026-09-28-weather-capsule-plan.md`](docs/plans/2026-09-28-weather-capsule-plan.md)。维护约束（码表覆盖门、对比度门、禁改理由）在 [AGENTS.md](AGENTS.md)。

---

## 与 Emlog 原站的差异

- 移除：IP 归属地显示、用户注册、Flash 播放器、原 Emlog 评论表情面板（现由 Giscus 原生表情反应提供）
- 评论数据由 Giscus 承载（侧栏「最新评论」使用构建期同步快照，开发环境 mock 可在 `src/data/comments.ts` 维护）
- 首页幻灯片图片由最新文章头图驱动（见「三个想当然会错的地方」）

---

## TODO 与远期规划

以下条目为历史排行的销项索引，编号保持不变；完成记录已按惯例清理，实现细节见 git history 与 AGENTS.md 对应维护约束：优化项排行第 1–7 项于 2026-09-04 销项；内容扩充第 10 项（标签云集 `/tag/`，2026-09-04）、第 11 项（分类云集 `/category/`，2026-09-05）、第 12 项（热门页 `/hot/`，2026-09-05）、第 13 项（全站字体策略，2026-09-05）已完成；Nice Books「私人藏书桌」升级（2026-09-07）已交付，视觉契约见 `docs/nice-books-design.md`、验收记录见 `docs/nice-books-design-test.md`；TODO 13 遗留的「稿纸横线贯穿整纸」已于 2026-09-19 完成——网格改画在 `.letter-paper` 面板层，相位由脚本运行时按正文首行基线反推，头部高度无需确定化，同批把 `/about/` 装饰元件换成手绘墨迹 SVG（维护约束见 AGENTS.md「信纸稿纸」条目）；远期规划第 8 项（Astro 5 → 6）已于 2026-09-20 完成——先做 Tailwind 接入改造（去掉 @astrojs/tailwind，改由根 `postcss.config.mjs` 直连），再升 astro 6.4.8 / @astrojs/react 5.0.7 / @astrojs/svelte 8.1.2 / astro-expressive-code 0.43.1，`pnpm check` 零错误、206 页构建通过、三套 Playwright smoke（fancybox 27/27、nice-books 72/72、ai-news 9/9）全绿，样式经 24 页 15,554 个元素的计算样式逐元素比对确认零变化（详见 AGENTS.md「构建链与依赖约束」）；同批把 Astro 6 标记为 deprecated 的 `markdown.remarkPlugins` / `rehypePlugins` 迁到 `markdown.processor: unified({...})`（2026-09-20）——`@astrojs/markdown-remark` 按 astro 6.4.8 的硬钉版本 7.2.0 作直接依赖，构建告警清零，固定构建期随机后完整产物 1114 个文件（含 pagefind 索引）逐字节零差异，全站门禁（astro check 零错误 + fancybox 27/27 + nice-books 单测 51/51 与 smoke 72/72 + ai-news 9/9）全绿。

### 评估已完成、明确不实施（保留结论以防重复评估）

- [x] **纯 HTML 页面资源移植**（2026-09-19 完成评估；结论：全部候选不移植，本项关闭）：源为 2020–2022 的手写多页站，实际路径 `C:\Users\Einn Tzai\Documents\HTML5网页`（本条目旧写法「文档\HTML5页面」按字面搜不到），入口 `index.html`（"WindowsIt's Music Site"）链向 `about/`、`login/`、`quesion/` 与 5 个 `tools/` 子页，全站 25 个 HTML 已逐一核对。排除理由分四类：**第三方「另存为」产物**（版权与外部依赖风险）——`!downloaded/`（Google 翻译镜像、jQuery MP4 播放器、css3 3D 翻牌）、`tools/eeslap`、`tools/burymewithmymoney`、`tools/smashthewalls`，特征为 `*_files/` 子目录 + 脚本文件名带 `.下载` + 内嵌 analytics/firebase/three.js，`login/index.html` 标题本身即下载代码片段且静态站无鉴权场景；**已被本站取代的前代模板残留**——`myblog/`、`HACKEREMPIER/`、`officialblog/`、`about/index.html`、需后端的 `_UNUSED TESTED PAGE/` 留言表单；**纯 CSS 演示无内容增量**——`tools/chemicals`（诞生石药水瓶）、`tools/newtonbai`（牛顿摆）、`tools/moonnight`（星空月景）虽零依赖可搬，但属装饰性 demo；`tools/makebridge` 系 freeCodeCamp "Santa's Helper" 教程复刻（`santaX`/`perfectAreaSize` 变量名原样），移植需去圣诞主题化并注明来源，收益不抵成本；`tools/daojishi` 倒计时硬编码 `12/31/2020 23:59:59`，原样移植即死页；**原创文字资产不宜沿用页面形态**——`quesion/`（恶搞产品文案）与`slide/`（"HOT IDEAS" 卡片）为站主 2020 年的吐槽，若将来启用应以重新撰写的文章呈现，旧页面不搬。`MainSources/` 仅字体与两个未核授权的音视频，同样不动。

- [x] **原模板未移植页面评估**（2026-09-04 完成）：对 `../limh.me` 全部 12 个 page-_.php / t.php / reg.php / function/_.php 逐一核对，与 myblog 现有 14 个路由 + sidebarConfig 侧栏清单对齐。结论：已移植清单（log_list/echo_log/header/footer/side/options→config.ts/归档/微语/留言板/关于/友链/图片墙/相册/404/全部侧栏 widget/文章尾部表情/吐槽水军）无遗漏。未移植 9 项取舍：**标签云集页**已作为 TODO 10 落地为 `/tag/`（2026-09-04 完成）；**读者墙**与**微语分页+[F\*]表情码解析**移入远期规划（触发条件见该节）；分享组件（分享目标大半死链）、日历 widget（Emlog ajax 依赖，交互已被归档/时间线替代）、读者等级（Giscus 无访客邮箱数据源）不移植；前台注册（需后端写库+验证码）、评论 UA/IP 属地（Giscus 不提供该数据）、通用页面模板变体 page-test/page1/page-colorful（已被 `spec` collection 的 `[...slug]` 覆盖）为架构性/数据源排除项，永久排除。原 `module.php`（eval 漏洞）与 `function/favicon.php`、`image.php`（开放代理）维持严禁搬运。

### 远期规划（观望项，均已完成评估、明确触发条件，未触发不排期）

- **9. /ai-news/ React 岛屿瘦身**（2026-09-04 评估完成）：技术可行但 ROI 为负。dist 实测该页客户端 JS 为 react-dom chunk（178KB）+ AiNewsApp chunk（57KB）≈ 235KB 未压缩（gzip 估 70–80KB），且经 Astro 岛屿架构隔离**仅此一页加载**，其他页面零成本；Svelte 重写估省 40–50KB gzip，对低频单访客的日报阅读页无感知收益。重写成本被低估：`src/ai-news/` 共 43 文件 / 约 135KB 源码（2 个 zustand store、5 套橘鸦视觉模板 × 亮暗双变体、RSS 解析 / 离线快照兜底 / 搜索 / hash 路由 / localStorage 持久化）。迁移难点集中在 `useAppStore.ts` 的 `transitionRoute`：列表↔详情交叉淡入淡出依赖 `document.startViewTransition` + React `flushSync` 在回调内同步提交 DOM，Svelte 无直接等价 API，行为保真是最大风险点；回归面为 5 套模板 × 亮暗 × 列表/详情 = 20 种视觉组合。有利因素：hooks 仅 useState/useEffect/useMemo/useRef，zustand store 为纯 TS 逻辑可平移 runes，lucide-react 有 lucide-svelte 对应。附带收益：移除 6 个依赖。（TODO 8 的 @astrojs/react 未知项已在 2026-09-20 升级时实测消除——@astrojs/react 5.0.7 与 astro 6.4.8 兼容，ai-news 页 9/9 smoke 通过）**触发条件：① Astro 升级受阻于 @astrojs/react 兼容性（重写从可选变被迫，届时正确时机）；② 该页出现真实访问量增长使 payload 成为可测量瓶颈**。实施时建议先降级橘鸦模板（保留 1–2 套风格）压缩回归面。验收（实施时适用）：功能与视觉对齐（列表、筛选、20 种模板组合、View Transitions 过渡），构建产物无 React runtime 残留。

- **11. 读者墙**（limh.me 移植评估得分 10，条件观望）：原版 `function/page-guest.php` 为评论区活跃者头像墙（Gravatar + 评论次数 top200）。技术上可行——Giscus 走 GitHub Discussions，`sync-site-stats.mjs` 可扩展按 author 聚合，`author.avatar_url` 替代 Gravatar；但当前站评论量极小，移植即空页。**触发条件：留言板/文章评论参与者明显增长（>20 人）**。

- _*12. 微语分页 + [F*] 表情码解析_*（limh.me 移植评估，数据层无当前需求）：原版 `t.php` 含 pagenavi 分页与 `[F1]`–`[F18]` 表情码 → gif 替换；本站 `diary.ts` 当前条数远不到单页过长的程度、内容零 `[F*]` 码（rg 实测）、表情 gif 资源未迁移。**触发条件：说说条数增长到单页过长（>30 条）或迁移历史说说数据含表情码时**，一并补 `public/images/face/` 资源。

---

## 致谢与许可

- 视觉与交互还原自 Emlog **Colorful**（明月浩空）主题；看板娘来自 [Dreamer-Paul/Pio](https://github.com/Dreamer-Paul/Pio)，3D 标签云来自 `svg-3d-tag-cloud`，OG 图实现参考了 [CuteLeaf/Firefly](https://github.com/CuteLeaf/Firefly)（MIT）。各自的许可与署名保留在对应子目录。
- 鹈鹕骑车游戏来自上游 `riba2534/claude-opus-5-5-demo`，按 ISC 声明落地，源码留档 `vendor/pelican-bike/`。
- 背景图来源 Pexels，逐张口径见 `public/images/bg/PEXELS-SOURCES.md`。
- 本仓库自身**没有 LICENSE 文件**，内容与代码版权归站长所有。
