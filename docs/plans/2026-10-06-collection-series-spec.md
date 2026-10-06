# Spec：文集（series）——同主题文章的封闭阅读序列

- 日期：2026-10-06（Asia/Shanghai）；同日三次追加（文集封面、元件复用约束、**归属判据按 frontmatter**），均已并入本文件
- 父规格 issue：[#76](https://github.com/CaiYan12/caiyan12.github.io/issues/76)（`ready-for-agent`，已开）。子票由 `to-tickets` 出
- 状态：**方案已定，尚未实现**。本轮只落文档与父票；全文来自 2026-10-06 的 grilling 逐题裁决
- 术语：根 `GLOSSARY.md` 的「文集」「文集成员」「非成员文章」「文集目录」「文集封面」
- 配套决策记录：`docs/adr/0007-series-closed-reading-sequence.md`
- 来源：站长逐题裁决；本机参考项目实测（`../firefly`、`../mizuki`、`../overthecocoons`、`../limh.me`、`../webqianduan`）；B 站专栏文集语义与开放平台接口调研；`#49` 里已文档化的「缝隙 A / 缝隙 B」测试台约定

## 设计约束（2026-10-06 站长声明）

**新增元件前先最大化复用站内既有设计资产；确需新元件时，其风格与 taste 必须最大化继承既有元件。** 落地优先级：直接引用现成组件 → 复用既有类名的 DOM 语法 → 才新写样式，且新样式的色值 / 字号 / 线型一律取自 `global.css` 既有 token，不引入新设计语言。这条已同步进 `AGENTS.md` 的 `## 项目背景`（它是仓库级约束，不只管本次方案）。

本方案每处新元件对应的存量资产：

| 本方案元件           | 复用的既有资产                                                                                                                                  |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 目录页与总览页的页头 | `src/components/layout/ListingHeader.astro`——文件注释即「列表页头：post-header（图标 + 标题）与 post-metaa 面包屑」，零样式，`/tag/` 索引页在用 |
| 侧栏章节目录         | `src/components/widget/WidgetLayout.astro`——widget 外框（`title` + 可选 `icon` + `actions` 插槽），`icon="fa-list-ol"`                          |
| 目录页顶部封面       | `.page .post-cover`（`global.css` 约 `:438`），命中即用，零新 CSS                                                                               |
| 封面图渲染           | `src/components/control/ResponsiveImage.astro` + `src/utils/lqip-utils.ts` 的 `getLqipProps()`                                                  |
| 成员卡片 / 分页      | `PostCard.astro` + `Pagination.astro`                                                                                                           |
| 卡片徽章             | `PostCard.astro` 里 `span.*-label` 的既有语法（`置顶` / `近期更新` / `热门` 同族）                                                              |
| 总览页横向卡         | `PostCard` 的卡面语法：`.post-list` / `.post-thumbnail` / `.post-excerpt` / `.goon`，加一条 modifier 把左浮封面放到 240×135                     |
| 文章页两行提示       | `.post-metaa` 的小灰字规格：12px + `var(--text-light)` + 链接 hover `var(--primary)`，不带上边框                                                |
| 数据集               | `src/data/*.ts` 的 TS 模块体例（`projects.ts` / `skills.ts` / `timeline.ts`）                                                                   |

三条边界事实（决定了上表没有第四种可选）：

- **站内只有三种卡面语法**：`PostCard`（`.post-list` + `.post-thumbnail` 150×90 左浮图，**唯一「左图右文」**）、友链卡（`.link-content a` + `.friend-card-avatar` **52×52 方形**族，约 `:4461`）、项目卡（`.personal-card project-card` 纯文字块卡，**无图片位**）。
- **站内只有三套小字语言**：`.post-metaa`（12px / `var(--text-light)` / `1px dotted var(--line)` 下边框，约 `:462-476`）、`.post-lisence`（`1px dashed` 框 + `#f9f9f9` 底，是个「块」，约 `:499-507`）、`.post-context`（纯文字行，`padding-top:10px; line-height:1.8`，约 `:452-455`）。
- **图标限定在 vendored 的 Font Awesome 4 内**：`fa-list-ol` / `fa-book` / `fa-sitemap` / `fa-indent` / `fa-th-list` 已实测存在且 `src/` 零占用；`fa-book-open` / `fa-clone` / `fa-layer-group` / `fa-stream` 是 FA5+ 新名，**本仓库不存在**。

## Problem Statement

文章页的左右按钮由 `getNeighbors()`（`src/utils/content-utils.ts`，约 `:110`）给出，它在 `getSortedPosts()` 生成的**一条全站时间线**（同文件约 `:13`：`pinned` 优先 → `published` 倒序）上取相邻项。于是《看懂 AI 写的网站》四章在导航上不是一个整体。实测当前公开文章的排序头部：

| 位次 | 文章                                                              |
| ---- | ----------------------------------------------------------------- |
| 0    | `20260728000000` 你好，Astro！博客迁移正式完成（`pinned: true`）  |
| 1    | `20261006110122` Matt Pocock Skills v1.3 给大任务加了一条实现路线 |
| 2    | `20261002204249` 《看懂 AI 写的网站》第三章                       |
| 3    | `20261002093931` 《看懂 AI 写的网站》第二章                       |
| 4    | `20261002081331` 《看懂 AI 写的网站》第一章                       |
| 5    | `20261002071103` 《看懂 AI 写的网站》第〇章                       |

由此产生三处错位：

1. 第三章（`20261002204249`）的右按钮指向 Matt Pocock 那篇，它不属于本书。
2. Matt Pocock 那篇（`20261006110122`）的左按钮指向本书第三章。
3. 同一篇的右按钮指向 7 月 28 日那篇置顶文章——置顶把链头挪到了 2026-07-28。这第三处与文集无关，但同属这条时间线造成的副作用。

> **2026-10-06 实现期更正**：上表把 `20260728000000` 记为位次 0，实测该文 frontmatter 是 `private: true`，被 `getSortedPosts()` 的 `isPublicPost` 整段剔除——公开时间线的位次 0 是 `20261006110122`，上列错位 3（右按钮指向 7-28 那篇置顶）**不成立**；错位 1、2 不受影响。另注：本站唯一的置顶帖恰是私密帖，故 `pinned` 在当前公开时间线上没有可见效果。

访客既无法从文章页看出「这是一组有顺序的文章」，也无法把整组读完。

一条相关事实：文章页从未把 `prevUrl` / `nextUrl` 传给 `Layout.astro`，所以文章页**不输出** `<link rel="prev">` / `<link rel="next">`；`rel` 只写在可见的 `<a>` 上。本次不改这一点。

## Solution 与裁决边界

1. **文集是与标签、分类并列的独立轴。** 成员资格与组内顺序都由文章自己声明，标签与分类不参与。本书四章现有的 `看懂AI写的网站` 标签由文集取代，不再保留。
2. **组内顺序由每篇文章 frontmatter 的显式序号决定**，不跟发布时间。补写、插写会让顺序与时间脱钩；B 站专栏文集同样是作者手动定序（其基本信息接口 `/x/article/list/web/articles` 的 `articles[]` 按「第 1 篇、第 (n+1) 篇」的位次排列，而非时间序）。
3. **非成员文章的时间线跳过整个文集。** 不属于任何文集的文章，其左右按钮只在其它非成员之间相邻。已知代价：从 Matt 那篇往左读摸不到这本书，文集须靠文集目录页、总览页与导航项被发现。
4. **组内边界不渲染该方向的按钮。** 首篇没有左按钮、末篇没有右按钮；不跨出文集，也不另给「返回目录」替代按钮——在同一位置放语义不同的按钮，正是本次问题的成因。
5. **交付范围取最全一档**：左右按钮 + 文章页顶部与末尾各一行归属提示 + `/series/<slug>/` 目录页 + 文章页侧栏章节目录 + 列表卡片徽章 + `/series/` 总览页 + 导航项。
6. **文集封面开放自定义**，未定义时按组内序号取首位带 `image` 的成员文章的头图（追加裁决，见「文集封面」）。

**一处覆盖**：第三轮曾裁决「目录页视觉上与 `/tag/<x>/` 一致」。追加事项要求在目录页顶部铺一张封面，而 `/tag/<x>/` 顶部没有封面——该条**已被覆盖**：目录页从「与标签页同构」改为「与文章页同构」（图 → 标题）。仅当文集既无自定义封面、也回退不到任何成员头图时，目录页才回到与标签页同构的形态。

## User Stories

1. 作为读者，我读完《看懂 AI 写的网站》第三章时，右按钮不应把我送到一篇不属于这本书的文章。
2. 作为读者，我希望在文章页一眼看到「这是第几章、共几章」，以及进入目录的入口。
3. 作为读者，我希望能从某一章跳到同文集内的任意其它章。
4. 作为读者，我看到 Matt Pocock 那篇时，左按钮应指向另一篇同系列文章，而不是本书章节。
5. 作为读者，我应能从 `/series/` 看到站内全部文集。
6. 作为读者，我应能从导航栏进入文集总览页。
7. 作为读者，我应能从首页／归档／标签列表的卡片上认出这篇文章属于某个文集。
8. 作为读者，读完一个文集的最后一章时，我应得到一个明确的收尾，而不是一个悄悄消失的按钮。
9. 作为读者，当我读一篇不属于任何文集的文章时，左右按钮不应把我带进与它主题无关的文集的内部。
10. 作为站长，新建文章时我只需写两个字段；顺序写错应在构建时就报错，而不是上线后才发现。
11. 作为站长，我不应为了给文章排序而被迫改发布时间。
12. 作为站长，文集不应改变首页、归档、分类、标签、热门各列表页的既有排序。
13. 作为用键盘或读屏的访客，进度与目录入口应是可读文本与可聚焦链接，而不是依赖悬浮或图形。
14. 作为读者，我进入文集目录页时，应在最上方看到一张代表这个文集的封面。
15. 作为读者，当站长没有给文集配专属封面时，我看到的应来自它的第一篇成员文章，而不是一张与该主题无关的随机图。
16. 作为站长，我想给某个文集换一张专属封面，只需改一处、放一个文件。
17. 作为站长，封面路径写错时我希望构建就失败，而不是线上出现一张破图。
18. 作为分享过链接的人，我希望文集目录页与总览页在聊天窗口里显示的是封面，而不是站点头像。

## Implementation Decisions

### 数据模型

- `postsCollection` 的 schema 增两个**可选**字段。它们抽到新文件 `src/utils/posts-schema.ts` 里具名导出（`postsSchema`），`src/content.config.ts` 改为 `schema: postsSchema`；`spec` 的 schema 留在原处不动（它没有需要测的规则）。抽出的理由：`src/utils/*.test.ts` 是 `pnpm test:utils` 的扫描范围，抽出来这两条规则就能进自动门禁。实测 `astro/zod` 在裸 node 下可正常导入，所以这个文件不依赖 `astro:content`、也不需要改 `scripts/test-hooks.mjs`。
    - `series: z.string().min(1).optional()` —— 文集 slug。**`.min(1)` 是刻意的**：空字符串直接是 schema 错误，`astro build` 在内容层就报错，走不到判定逻辑。
    - `seriesOrder: z.number().int().nonnegative().optional()` —— 组内序号，从 0 起。
    - 两个字段都**可选**是刻意的：现有 29 篇文章零改动即可通过校验。
- 新增 `src/data/series.ts`，沿用 `src/data/projects.ts` / `skills.ts` / `timeline.ts` 的 TS 模块体例，导出 `seriesList`。每笔字段：`slug` / `name` / `description` / `cover?` / `unit?`（量词，缺省 `"篇"`）。本方案定两笔：

    | slug                 | name                 | unit |
    | -------------------- | -------------------- | ---- |
    | `webapp-vibe-coding` | 看懂 AI 写的网站     | 章   |
    | `matt-pocock`        | Matt Pocock 技能选讲 | 篇   |

    `webapp-vibe-coding` 取自本书已有封图命名（`/images/posts/20261002071103/webapp-vibe-coding-ch0-cover.jpg` 等四张），与仓库既有命名一致。

- **不引入 `plannedTotal`**。进度分母取当前已发布成员数（见下）。
- **归属判据：frontmatter 里有没有 `series` 属性。** 有属性即属于某个文集，没有即不属于——判定层**不查 `seriesList`**，不存在「写了一半的成员」这种中间态。文集定义里**不放**成员名单，归属只有文章 frontmatter 这一处记录。
- **判定层与元数据层分开**：判定只看属性存在与否；`seriesList` 只承担「这个 slug 叫什么、量词是什么、简介与封面是什么」。两者不一致（写了未登记的 slug）是**内容错误，由校验在构建期报错**（见「校验」第 1 条），不是判定降级——所以渲染代码里不出现「未登记则按非成员处理」这种分支。

### 导航语义

在 `src/utils/content-utils.ts` 新增纯函数，现有 `getNeighbors()` **保留不改**（新函数在非成员分支上复用它，因此它不会变成死代码，其既有测试也继续有效）：

- `isSeriesMember(post)` —— **只看 `post.data.series` 是否为 `undefined`**（schema 已保证非空字符串）。不查登记表。
- `resolveSeriesMeta(slug)` —— 从 `seriesList` 取元数据；取不到时回退为 `{ slug, name: slug, unit: "篇", description: "" }`。这条回退是**纯防御**：正常构建下不可达（校验先失败），它的存在是为了让「有属性即属于某文集」这句话在后半段也成立——不会出现「有属性，但因为查不到文集名所以整块不渲染」。
- `getSeriesNeighbors(posts, slug)` → `{ prev, next, series }`，其中 `series` 为 `{ slug, name, unit, index, total }` 或 `null`：
    - **文章属于文集时**：取**同 `series` 值**的成员（按 `seriesOrder` 升序），`prev` = 序号更小的一篇，`next` = 序号更大的一篇；首篇 `prev === null`，末篇 `next === null`。**不跨出文集**。分组只按 frontmatter 的值，与 `seriesList` 无关。
    - **文章不属于任何文集时**：把**所有带 `series` 属性的文章**从 `getSortedPosts(posts)` 的结果里剔除，得到一张非成员序列，再复用 `getNeighbors()` 取相邻项。
- 文案方向口径不变：时间更早／序号更小为上一篇（左），反之下一篇（右）。
- 文集内按钮上的 `rel="prev"` / `rel="next"` 属性保留。

### 文集封面（2026-10-06 追加）

- **声明**：`src/data/series.ts` 每笔的 `cover?` 显式写明，取站内图片路径（以 `/` 开头）。**不做按约定路径自动探测**——「文件在不在」若成为隐形状态，只看 `series.ts` 就不知道封面是什么。
- **文件位置**：`public/images/series/<slug>.<ext>`（与该层已有的 `posts/`、`random/`、`albums/` 等并列的新目录）。**无需改图片流水线**：`scripts/generate-lqips.mjs` 递归扫 `src/` 与 `public/`，只跳过 `public/fonts`、`public/pio`、`public/friend-icons`、`public/images/_variants`（变体侧另跳 `public/images/bg`），所以新目录自动获得 LQIP 与 480/720/1080/1440 四档 WebP 变体。
- **回退**：`resolveSeriesCover(series, posts)`（放在 `src/utils/content-utils.ts`）按以下顺序取值，返回 `string | null`：
    1. 该文集的 `cover`；
    2. 否则按 `seriesOrder` **升序**找**第一篇**设置了 `post.data.image` 的成员，取它的 `image`；
    3. 都没有则返回 `null`，**不渲染任何封面**。
       刻意不直接用 `getCover()`：它的兜底是 `/images/random/tb{n}.jpg`——由 slug 字符合计取模选出的无关缩略图（实测该目录 40 张）。作为列表卡片缩略图无妨，但把一张无关图当成「文集封面」是冒充。**这条偏离是有意的，不要简化回 `getCover()`。**
- **位置**：`/series/<slug>/` 顶部（`.post-header` 之前，与文章页的「图 → 标题」同序）与 `/series/` 总览页的文集卡（封面在左 240×135，≤680px 降为 150×84）。文章页顶部／末尾两行归属提示块**不带**封面，侧栏章节目录也不带。
- **版式**：目录页顶部复用文章页的 `.post-cover` 范式——`height: 260px`（`global.css` 约 `:438`，位于 `@layer components` 内，**无媒体查询覆盖**，故窄屏同为 260px）+ `overflow: hidden` + 底部 55% 起渐隐 mask + `img { object-fit: cover }`，配套 `ResponsiveImage` 与 `.lqip-placeholder`（`getLqipProps()`）。**不新增 CSS**：选择器是 `.page .post-cover`，而目录页容器是 `.page`，直接命中。
- **`og:image`**：目录页与总览页都把解析出的封面传给 `MainGridLayout` 的 `image`；解析结果为 `null` 时不传，落回 `Layout.astro` 既有的 `/images/avatar.webp` 降级（约 `:44`）。这里**只复用封面原图**，不生成 satori 分享卡。
- **可访问性**：`alt` 与 `title` 取文集名（`series.name`）；目录页顶部的封面 `loading="eager"`（首屏主视觉），总览页卡片的封面 `loading="lazy"`。与文章头图一致，**不进灯箱**。
- **校验**：`seriesList` 里写了 `cover` 的，映射到 `public/` 下的文件必须存在，否则构建失败（见「校验」第 4 条）。

### 页面与组件

- `src/pages/posts/[...slug].astro`
    - 把约 `:48` 的 `getNeighbors(allPosts, post.id)` 换成 `getSeriesNeighbors(allPosts, post.id)`。
    - 左右按钮已有的条件渲染天然满足「边界不渲染」：`prev` / `next` 为 `null` 时该方向不出现。
    - 新增**顶部一行**：位置在标题与文章元信息之下、正文之前。
    - 新增**末尾一行**：位置在 `.cutline` 之下、`.post-navigation` 之上。
    - 两行的视觉语言取 `.post-metaa` 的小灰字规格——12px + `var(--text-light)` + 链接 hover `var(--primary)`，**不带上边框**（`.post-metaa` 已在上方画过一条 `1px dotted` 分隔线，再画一条会连成双线）。实现上是新类（不能直接套 `<address class="post-metaa">`，语义壳不对），但字体与色值全部取自既有规则，不引入新 token。
    - 两行文案见「待确认的文案草案」。
- 新增 `src/components/widget/WidgetSeries.astro`（文章页侧栏的章节目录）
    - **外框必须用 `WidgetLayout.astro`**（`title` + 可选 `icon` + `actions` 插槽），与 `WidgetRelatedPosts.astro` 同一写法；本组件自己**零外框样式**。
    - 标题文案与图标：`icon="fa-list-ol"`（有序清单；FA4 实测存在且 `src/` 零占用）。标题草案见「待确认的文案草案」。
    - 内容为有序章节目录：当前章加 `.current` 高亮与 `aria-current`（注意 `GLOSSARY.md` 的「当前页态」约定——**算了就必须有人画**，任何 `.current` 计算都必须同时存在消费它的样式）。
    - 在 `src/components/layout/SideBar.astro` 的 `widgetMap` 中注册为 `series`。
    - 在 `src/config.ts` 的 `sidebarConfig.widgets` 中排在 `"related"` **之前**。
    - 组件自行从 URL 取当前文章、只在文章页且该文属于文集时渲染——与 `WidgetRelatedPosts.astro` 现有做法一致。
    - 提示：`#sidebar` 在 ≤768px 只是 `display:none`（节点仍在 DOM），移动端看不到这份目录。这是站长的既有裁决（见天气胶囊那轮的「天气只属于侧栏」），本次不推翻；移动端的目录入口由正文顶部那一行承担。
- `src/components/layout/PostCard.astro`
    - 在 `h2` 内既有的 label 序列（`置顶` / `近期更新` / `热门`，约 `:26-49`）之后追加一枚 `《文集名》`。全站列表页共用同一个卡片组件，故首页、归档、分类、标签、热门同时获得徽章。**不显示章号**——章号由侧栏目录与两行提示承担。
- 新增 `src/components/layout/SeriesListing.astro`
    - 只引用 `ListingHeader`（页头）、`PostCard`（成员卡）、`Pagination`（分页）三个既有组件。**不碰** `TaxonomyListing.astro` 与 `TagPillCloud.astro`。理由：`TaxonomyListing.astro` 约 `:76` 无条件渲染 `<TagPillCloud items={list} base={kind} current={name} />`，而 `TagPillCloud.astro` 的 `base` 类型写死为 `"tag" | "category"`；文集页要的是成员清单而不是药丸云，硬套要动 3 个共享组件并波及其 5 处调用点（标签云集、分类云集、单标签页、单分类页、侧栏 `WidgetTag`）。
    - 页头用 `ListingHeader`（`icon` / `title` / `crumbs` 三个 prop 都在），**不手写** `<header class="post-header">` + `<address class="post-metaa">`；计数行沿用 `post-context`，用 `unit` 写作「共 4 章」而不是「共 4 篇文章」。
    - 最顶部多一块封面（见「文集封面」），插在 `ListingHeader` **之前**，与文章页的「图 → 标题」同序。
- 新增路由
    - `src/pages/series/[slug].astro` 与 `src/pages/series/[slug]/page/[page].astro` —— 页头用 `ListingHeader`，列表体用 `SeriesListing`；分页沿用 `siteConfig.postsPerPage`（现为 10），即本书 15 章发布满时会变成 2 页。
    - `src/pages/series/index.astro` —— 总览页，页头同样用 `ListingHeader`。列出全部文集，**顺序即 `src/data/series.ts` 的数组顺序**（作者意图，本身就是全序，不需要像 `getTagList` 那样为并列名次兜底）。每张卡的 DOM 语法**照 `PostCard` 抄**：根元素复用 `.post-list`，左位复用 `.post-thumbnail`（加一条 modifier 把 150×90 放到 240×135，≤680px 降为 150×84），右侧复用标题与 `.post-excerpt` 的文字规格，底部 `.goon` 的「继续阅读 »」改为「进入目录 »」。**不新造第四种卡面语法。** 封面解析为 `null` 时左位不渲染，文字占满整行。
    - 两个路由都**不带** `data-no-swup`，与 `/tag/` `/category/` 一致（`/books/`、`/ai-news/` 那类独立壳才需要）。
    - 两个路由都**不进 Pagefind 索引**（`MainGridLayout` 的 `searchIndex` 缺省为 `false`），与既有标签页/分类页一致。
- 样式全部落在 `src/styles/global.css`，沿用 `.page` / `.post-header` / `.post-metaa` / `.post-context` / `.post-list` / `.post-navigation` / `.post-cover` 既有类；本次不新增设计语言。

### 站内入口

- `src/config.ts` 的 `navBarConfig.archiveSite`（约 `:57`）在「文章分类」之后插入 `{ name: "文章文集", url: "/series/" }`。
- 由于非成员导航跳过文集整块，时间线不再是文集的发现路径；`/series/` 总览页 + 导航项是主入口，两行提示与徽章是次级入口。
- 文集**没有** `rss.xml` 条目，也不改 `/rss.xml`。sitemap 由 `@astrojs/sitemap` 自动收录新路由，无需配置。

### 校验

四条规则：

1. 文章 `series` 的值必须能解析到 `seriesList` 里的一笔（否则 `name` / `unit` / `description` 无从取得）。注意这条是**内容错误**，不是判定降级——判定层只看属性在不在。
2. 同一文集内 `seriesOrder` 不得重复。分组按 `series` 的值，与登记表无关。
3. 带 `series` 的文章必须同时带 `seriesOrder`（不允许缺省回退发布时间）。
4. `seriesList` 里写了 `cover` 的，该路径映射到 `public/` 下的文件必须存在。

另有一条**不由校验函数承担**、由 schema 承担的规则：`series: ""` 直接是 schema 错误（`z.string().min(1)`）。它在内容层就被拒，比校验函数更早。

规则 1–3 写成 `src/utils/series-integrity.ts` 的**纯函数**（入参：全部文章 + `seriesList`；出参：违规清单），由 `src/pages/series/[slug].astro` 的 `getStaticPaths` 调用，有违规则 `throw` 一条自己拼好的清单错误（逐条列出违规文件与原因），`astro build` 随之失败。规则 4 需要 `node:fs`，放在调用侧。

**为什么不是独立校验脚本**（2026-10-06 追加裁决）：仓库没有 YAML 解析依赖——`package.json` 的 52 个依赖里没有 `yaml` 也没有 `gray-matter`，实测 `import('yaml')` 与 `import('gray-matter')` 都是 `ERR_MODULE_NOT_FOUND`；而 `scripts/validate-post-slugs.mjs` 只做 `readdirSync` 查目录名，**从不读 frontmatter**，仓库里没有可沿用的模式。硬写独立 `.mjs` 就只有两条路：新增解析依赖，或手写正则——后者的失效模式是**静默漏读**（非预期写法读不到字段，于是违规不报错），正是本方案要避免的。改成纯函数后：数据取自 Astro 已解析且已过 zod schema 的 frontmatter，零解析代码、零新依赖，规则本身还能进 `pnpm test:utils` 单测。**代价**：校验伴随 `/series/[slug].astro` 存在（路由若被移除，校验随之消失），且失败落在 `astro build` 那一步而不是 `build` 链里一个具名步骤。

另有一条已被证伪的备选：用原生 TS 导入 `series.ts` 是可行的（本机 Node v22.22.2 实测 `await import('./src/data/timeline.ts')` 直接成功，仓库已有先例 `scripts/site-stats-fixture.test.mjs:5`），所以「读不到 TS」不是障碍——障碍只在 frontmatter 的解析。

## 内容改动

| 文章                                                           | 改动                                                                              |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `20261002071103` 第〇章                                        | `tags` 去掉 `看懂AI写的网站`；加 `series: "webapp-vibe-coding"`、`seriesOrder: 0` |
| `20261002081331` 第一章                                        | 同上，`seriesOrder: 1`                                                            |
| `20261002093931` 第二章                                        | 同上，`seriesOrder: 2`                                                            |
| `20261002204249` 第三章                                        | 同上，`seriesOrder: 3`                                                            |
| `20260919135000` Matt Pocock 工作流在实际 Vibe Coding 中的应用 | 加 `series: "matt-pocock"`、`seriesOrder: 0`                                      |
| `20261006110122` Matt Pocock Skills v1.3                       | 加 `series: "matt-pocock"`、`seriesOrder: 1`                                      |

两个文集的 `cover` 本次**都不写**，即都走回退——本书取 `webapp-vibe-coding-ch0-cover.jpg`，Matt 系列取 `matt-pocock-workflow-cover.jpg`（六篇成员都设了 `image`，已逐一核实）。

移除 `看懂AI写的网站` 标签的影响面已实测：该字符串在**受版本控制**的文件里只出现于上述四篇的 frontmatter 第 6 行（`git grep` 复核）。`output/ch3-post-verify.mjs` 里有一处引用，但 `output/` 与 `.zcode/` 都在 `.gitignore` 的 `# local tool artifacts` 段内，不在版本控制中。

其余 23 篇（含 `20260318161300`／`20260318161900` 两篇 Linux 习题、`20260402161000` 数据库作业）本次**不建文集**。

## 已定默认值

以下条目在 grilling 中提出后站长未提异议，直接写死。

| #   | 项                     | 取值                                                                                                           |
| --- | ---------------------- | -------------------------------------------------------------------------------------------------------------- |
| 1   | `pinned` 在组内        | 不参与组内排序，只在首页/归档等列表页生效                                                                      |
| 2   | 草稿/私密帖            | 不占位次，沿用 `isPublicPost` 口径                                                                             |
| 3   | 卡片徽章               | `《文集名》` 置于标题 link 之前、既有 label 序列之后；不含章号                                                 |
| 4   | `rel` 属性             | 文集内按钮保留 `rel="prev"` / `rel="next"`；文章页仍不发射 `<link rel>`                                        |
| 5   | sitemap / RSS          | 新路由进 sitemap；`/rss.xml` 不动                                                                              |
| 6   | `scripts/new-post.mjs` | 本次不改，新建文章时手写两个字段                                                                               |
| 7   | `series.ts` 字段       | `slug` / `name` / `description` / `cover?` / `unit?`                                                           |
| 8   | 目录页分页             | 沿用 `siteConfig.postsPerPage`（10）                                                                           |
| 9   | 导航项                 | `archiveSite` 下拉内，插在「文章分类」之后，名为「文章文集」                                                   |
| 10  | 目录页计数行           | 用 `unit`：「共 4 章」/「共 2 篇」，不是「共 4 篇文章」                                                        |
| 11  | 总览页文集顺序         | `src/data/series.ts` 数组顺序                                                                                  |
| 12  | 封面 `alt` / `title`   | 取 `series.name`                                                                                               |
| 13  | 封面加载优先级         | 目录页顶部 `eager`，总览页卡片 `lazy`                                                                          |
| 14  | 侧栏小部件外框         | `WidgetLayout` + `icon="fa-list-ol"`                                                                           |
| 15  | 文章页两行提示的视觉   | `.post-metaa` 的小灰字规格（12px / `var(--text-light)` / hover `--primary`），不带上边框                       |
| 16  | 总览页卡面语法         | 照 `PostCard` 抄：`.post-list` / `.post-thumbnail` / `.post-excerpt` / `.goon`                                 |
| 17  | **归属判据**           | frontmatter 有 `series` 属性即属于某文集；判定层不查 `seriesList`                                              |
| 18  | `series` 空值          | schema 用 `z.string().min(1)` 拒绝，`series: ""` 在内容层就报错                                                |
| 19  | 判定点                 | 各处消费方自判（侧栏读 URL、正文用页面变量），不新增页面级 prop；零客户端脚本                                  |
| 20  | schema 位置            | `postsCollection` 的 schema 抽到 `src/utils/posts-schema.ts` 具名导出，供单测引用                              |
| 21  | 测试缝                 | 逻辑侧只走**缝隙 B**（既有 `test:utils`，已在 `build` 链头）；接线侧新增一套**缝隙 A** 冒烟，不塞进 `smoke:ui` |
| 22  | 新冒烟的判据基线       | 同批固定，此后不得增减（沿用 `#49` 的不变量做法）                                                              |
| 23  | issue 与文档的分工     | GitHub 父规格**不写文件路径**（技能模板要求）；路径、「约」行号与复用映射表留在本文件，issue 引用本文件        |

## 明确不做

- 不补文章页的 `<link rel="prev">` / `<link rel="next">`。
- 不改 `/rss.xml`。
- 不改 `scripts/new-post.mjs`。
- 不动 `TaxonomyListing.astro` 与 `TagPillCloud.astro`。
- 不支持一篇属于多个文集。
- 不引入 `plannedTotal` / 计划总章数。
- 不做拖拽排序 UI（顺序靠改 frontmatter 里的数字）。
- 不建习题类文集。
- 不做按约定路径自动探测封面（`public/images/series/<slug>.<ext>` 存在即用）。
- 不生成 satori 分享卡（`/og/series/*`）；文集页的 `og:image` 直接复用封面原图。
- 不把 `resolveSeriesCover` 的兜底简化成 `getCover()`。
- 不把文集判据塞进既有的 `smoke:ui`（其 121 项判据被 `#49` 当基线引用过），也不新增 CI 工作流——新冒烟用 `smoke:*` 手工跑。

## 测试缝（seams）

本仓库已把「缝」文档化为两条（定义见 issue `#49` 的正文，其票册也沿用这套词汇）：

| 缝                         | 形态                                                                        | 台子 / 入口                                                                                                                                                               | 是否进 CI                                                        |
| -------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| **缝隙 B** 纯函数 / 计算值 | `src/utils/*.test.ts` 一类，`node --import ./scripts/test-hooks.mjs --test` | 由 `#49` 票 01 前置进 `pnpm build` 链头                                                                                                                                   | 是（`deploy.yml` 的 `withastro/action` 默认跑 `pnpm run build`） |
| **缝隙 A** 冒烟            | 真 `dist` + 真浏览器                                                        | `scripts/lib/smoke-harness.mjs` 的 `makeHarness({envVar, defaultBase, launch?, isNoise?}) → {check, checkClean, finish, base}`；四套现有 smoke 判据数为 9 / 27 / 72 / 121 | **否**，`smoke:*` 手工跑                                         |

**本功能落在两条缝上**（2026-10-06 裁决）：

1. **逻辑侧只走缝隙 B。** 新增的一切逻辑都是纯函数形状（判定、分组、相邻、元数据回退、封面回退、完整性四规则、schema 约束），全部落在既有 `test:utils` 里，不新开测试入口。
2. **接线侧新增一套缝隙 A 冒烟**（`scripts/series-smoke.mjs`，复用既有台子，不重写 `check` / `finish`）。理由：本功能的可见契约就是**一组 href** 与**「某些元素不该存在」**，而纯函数测试盖不到「页面有没有把算出来的结果接上」——这正是「构建成功但链接指错、测试全绿」的失效模式。**缺口已接受**：冒烟不在 CI 里，只用 `smoke:*` 手工跑。
3. **不把判据塞进既有的 `smoke:ui`**：那是主站 UI 判据集合，现有 121 项被 `#49` 当基线引用过，往里加会让该基线漂走。

**红证据**（沿用 `#49` 立下的测试文化「每一票都要有红证据，不接受『它本来就是绿的』」，偏好变异式自证）：每一类判据都要先给一次红——schema 空值规则靠一条 `series: ""` 用例证明；完整性四规则各造一条违规；冒烟侧先临时把某章的 `seriesOrder` 改重，证明接线断言会红。

## 验收

**自动**

1. `src/utils/content-utils.test.ts`（已含 `getNeighbors` 用例，约 `:132`）增：
    - `getSeriesNeighbors` / `isSeriesMember`：组内中间篇、首篇（`prev === null`）、末篇（`next === null`）、单篇文集（两侧皆 `null`）、非成员跳过整块、**判定只看属性（两篇 `series` 值相同即互为相邻，即使该 slug 未登记）**。
    - `resolveSeriesMeta`：登记过的 slug 取到 `name` / `unit`；未登记的 slug 回退为 `name = slug`、`unit = "篇"`、`description = ""`。
    - `resolveSeriesCover`：显式 `cover` 优先；无 `cover` 时取序号 0 且带 `image` 的成员；序号 0 无 `image` 时**向后**取第一篇有 `image` 的；全部无 `image` 返回 `null`；未登记的 `series` 返回 `null`。
2. 新增 `src/utils/posts-schema.test.ts`：直接引用 `src/utils/posts-schema.ts` 的 `postsSchema`，断言 `series` 接受 `"matt-pocock"`、**拒绝 `""`**、接受缺省；`seriesOrder` 接受 `0`、拒绝 `-1` 与 `1.5`、接受缺省。`astro/zod` 在裸 node 下实测可导入，这个文件不依赖 `astro:content`。**这是把 schema 抽出去的唯一目的**——不改 `scripts/test-hooks.mjs`。
3. 新增 `src/utils/series-integrity.test.ts`：四条规则各一条违规用例 + 一条全合规用例。
4. 新增 `scripts/series-smoke.mjs`（缝 A，复用既有台子），对 `dist/` 断言接线：成员页左右按钮的 href 指向同文集相邻篇；首章该方向无按钮、末章该方向无按钮；顶部与末尾两行的在/不在；侧栏目录的在/不在；非成员页不出现任何文集 UI；目录页与总览页 200 且含封面。判据数与失败集合同批固定，此后不得增减。
5. `pnpm test:utils` 是构建链的一环；实测推 `main` 时 `deploy.yml` 用 `withastro/action`（约 `:35`），其默认 `build-cmd` 即 `pnpm run build`，故纯函数测试在 push 上真实执行，不是摆设。
6. `pnpm check` 与 `pnpm build` 全绿。

**手工（站长本人目视）**

7. 实现完成后，由我在后台留一个 `astro dev`（默认 `http://localhost:4321`）不关，供站长逐页核对：
    - `/posts/20261002204249/` —— 末章右按钮消失、顶部与末尾两行、侧栏目录
    - `/posts/20261002071103/` —— 首章左按钮消失
    - `/posts/20261006110122/` —— 左按钮 = Matt 另一篇；右按钮不再指向 7 月 28 日那篇
    - `/series/webapp-vibe-coding/` —— 顶部封面（应回退为 ch0 的头图）、面包屑、计数行写「共 4 章」
    - `/series/matt-pocock/` —— 顶部封面应回退为 `matt-pocock-workflow-cover.jpg`
    - `/series/` —— 两张横向卡的封面与文案；文集顺序与 `series.ts` 一致
    - 首页与 `/archive/` 卡片上的 `《文集名》` 徽章
    - 窄屏（≤680px）确认总览卡封面降到 150×84、目录页顶部封面仍为 260px、侧栏目录隐藏而顶部提示行仍在
    - 临时把某文集的 `cover` 指向一张新图 `/images/series/<slug>.jpg`，确认 `pnpm build` 会重新生成它的 LQIP 与 WebP 变体
    - **复用核对（对着「设计约束」那节逐项看）**：侧栏 `WidgetSeries` 的外框与上面几个 widget 完全同族；总览卡与文章卡看上去是一家人（同为 `.post-list` 语法）；两行提示与 `.post-metaa` 同字号同色；目录页页头与 `/tag/` 索引页页头结构一致

## 待确认的文案草案

以下为**草案**，实现前请站长直接改。语气按平实陈述句写，不拟营销腔。

- **顶部一行**（非成员文章不渲染）：`本文属于《看懂 AI 写的网站》· 第 3 / 4 章 · 目录`
  ——「目录」指向 `/series/webapp-vibe-coding/`，是可聚焦链接。
- **末尾一行（非末章）**：`本文属于《看懂 AI 写的网站》· 第 3 / 4 章`
- **末尾一行（末章）**：`《看懂 AI 写的网站》已读完 · 看其它文集`
  ——「看其它文集」指向 `/series/`。
- **总览页文集卡**：文集名 + 简介 + `共 4 章` / `共 2 篇` + `进入目录 »`；封面 `alt` 用文集名。
- **侧栏小部件标题**：`文集目录`（配 `fa-list-ol`）。
- **文集简介 `description`**：
    - `webapp-vibe-coding`：`在 AI 把十几件互相关联的事压成十几条命令之后，教你怎么判断每条命令在动什么。按 L0 到 L12 逐层展开现代 Web 技术栈，训练判断力而不是动手能力。`
    - `matt-pocock`：`围绕 Matt Pocock 那套 Claude Code 技能工作流的两篇实践记录：一篇讲把它用进实际的 Vibe Coding 里，一篇讲 v1.3.1 新增的 /implement-spec、/pr 与 /retro。`

## 顺带的仓库维护项

- `AGENTS.md` 的 `### Domain docs` 一行原本写着 `docs/adr/`（0001–0006 共六份）。本方案会新增 ADR 0007，该计数当场失真。已在 2026-10-06 按站长裁决改为**不写具体数字**的形式，并在 `### 文档写作约定` 下立了一条同类规则，避免下次重犯。
- `AGENTS.md` 的 `### Triage labels` 段里另有一处数字（`gh label list --limit 100` 共 16 个标签）。它是带日期的实测记录，按仓库既有政策「带日期的历史实测数字保留原样」**未改**；若要一并去掉，是独立的一小步。
