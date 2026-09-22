# WindowsIt's Music Club

由 Emlog Colorful（明月浩空）主题迁移而来的纯静态 Astro 博客。

## 技术栈

- **Astro 6.4.8** + TypeScript + Svelte 5（搜索组件）
- **React 19 + @astrojs/react** — 独立 AI 日报阅读页
- **Tailwind CSS 3**（样式重写，视觉还原 Colorful 海洋绿主题）
- **Swup.js** — 无刷新页面切换（替代原 Pjax）
- **Pagefind** — 构建期静态搜索索引
- **Giscus** — 评论系统（GitHub Discussions，文章评论区与留言板已启用；文章尾部使用 Giscus 原生表情；主题样式见 `public/giscus-theme.css`）
- **Fancybox** — 图片灯箱（替代原 Highslide）
- **Expressive Code** + **KaTeX** — 代码高亮与数学公式
- **@astrojs/rss / @astrojs/sitemap** — 订阅与 SEO

## 常用命令

```bash
pnpm install     # 安装依赖
pnpm dev         # 本地开发（http://localhost:4321）
pnpm build       # 构建到 dist/（项目目录 + LQIP + GitHub 数据 + 佛祖横幅 + Pagefind 已串联）
pnpm new-post -- <yyyymmddhhmmss> [标题]  # 按规范创建文章目录
pnpm fetch-projects        # 刷新“我的项目”GitHub 仓库与 Pinned 快照
pnpm test:projects         # 项目同步、缓存、合并与排序测试
pnpm fetch-repos --refresh  # 全量刷新 GitHub 仓库卡片元数据缓存
pnpm fetch-friend-icons     # 增量补齐缺失的友链图标缓存
pnpm fetch-friend-icons --refresh  # 手动刷新当前友链图标缓存
pnpm preview     # 预览构建产物
pnpm check       # 类型检查
pnpm smoke:ai-news  # AI 日报入口、详情、返回与离线快照 Smoke（默认 127.0.0.1:4321 dev；AI_NEWS_BASE_URL 传**完整页面地址**）
pnpm smoke:nice-books  # Nice Books 三页全链路 Smoke（随机/换一换/书库/详情/swup；默认 4321，但**权威环境是 build + preview**，用 NICE_BOOKS_BASE_URL 指过去）
pnpm qa:nice-books-geometry  # Nice Books 统一3D几何运行时检查（默认 127.0.0.1:4321，BASE_URL 可覆盖）
pnpm smoke:ui      # 主站 UI 缺陷修复实机烟测（UI 整改票册的缝隙 A；**需先 build + preview**，UI_SMOKE_BASE_URL 传站点根）
pnpm test:utils  # src/utils 纯函数单测（content-utils 排序/评分/邻篇 + pagination canonical）
pnpm test:contributions  # 贡献日历数据脚本离线单测（注入 fetchImpl，不访问真实网络）
pnpm test:site-stats  # Giscus 同步单测（fetchImpl/输出路径全注入，无需令牌，已串入 build 链头部）
pnpm test:friend-icons  # 友链图标缓存单测（离线注入 fetchImpl）
pnpm test:nice-books  # Nice Books 单测（数据契约/随机去重/六字段搜索/SVG 封面，node --test）
pnpm test:fancybox  # 灯箱 Smoke（关闭不跳位/焦点归还/定位到文章位置/下载新标签页/中文文案，需先 pnpm build && pnpm preview；默认 4322，FANCY_BASE_URL 传**站点根**）
pnpm format      # Prettier 格式化（含 astro/svelte 插件；覆盖 src/scripts/tailwind.config）
```

> ⚠️ **踩坑警告**：修改 Markdown 渲染插件（remark/rehype）后构建产物没变化？Astro 的 content layer 会复用旧渲染结果（Astro 5 与 6 皆有此行为，本站实测在 6.4.8 上复现）——先删除 `node_modules/.astro/`，并在存在时删除 `.astro/data-store.json`，再构建；touch 文件无效。CI 侧 `deploy.yml` 已对 `withastro/action` 传 `cache: false` 关闭同类缓存，任何 workflow 改动勿恢复。

## 测试与生产环境

- **测试环境（本地）**：`http://localhost:4321`（`pnpm dev`；`pnpm preview` 验证构建产物，可 `--port` 指定端口）。交互、布局、Swup 切页的验证都在本地做。已知 dev 限制：Pio 看板娘因 Svelte hydration 报错不渲染，验证 Pio 必须 `pnpm build && pnpm preview`。
- **生产环境（线上）**：`https://caiyan12.github.io/`（GitHub Actions 自动部署）。验证部署是否生效：看响应头 `Last-Modified` 是否晚于部署完成时间，或下载 Actions run 的 `github-pages` artifact；Fastly 边缘缓存 HTML `max-age=600` 且缓存键不含查询串（加 `?cb=` 破缓存无效），刚部署完可能最多等 10 分钟才看到新版本。
- 两环境行为差异须留意：dev 下评论 mock 数据（`src/data/comments.ts` 等）与生产构建期同步的真实数据不同；Mermaid、OG 图等一切以生产实测为准。

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
    friends.json         ← 友链数据源
    friends.ts           ← 友链类型与兼容导出
    comments.ts          ← 最新评论小部件数据
    guestbook.ts         ← 留言板单条换一批数据
  pages/                 ← 路由（首页/文章/归档/说说/友链/相册/留言板/…）
  ai-news/               ← AI 日报 React 阅读器运行时
  layouts/               ← 页面骨架（Layout / MainGridLayout）
  components/            ← 组件（导航/侧栏/文章卡片/小部件/评论…）
  styles/global.css      ← 主题样式（Colorful 视觉还原）
  styles/markdown-extended.css ← Markdown 扩展组件样式（全站正文共用）
  plugins/               ← Markdown 与构建期转换插件
  utils/                 ← 工具函数
  constants/             ← 构建期生成数据（项目目录、LQIP、GitHub 卡片、友链图标 manifest）
scripts/                 ← 构建脚本（项目目录、LQIP、GitHub 数据、友链图标、新建文章、佛祖横幅）
public/
  ai-news/snapshot/      ← AI 日报离线 RSS 快照
  friend-icons/          ← 友链图标本地缓存（与 src/constants/friend-icons.json 一起提交）
  images/albums/         ← 相册（每个文件夹一个相册）
  images/_variants/      ← 构建生成的 WebP 图片变体（勿手动编辑，gitignore）
  fonts/                 ← Font Awesome 4 图标字体（仅 woff）
  style/                 ← 自定义光标
```

## Markdown 扩展与全站正文样式

主站统一由 `src/layouts/Layout.astro` 引入 `src/styles/markdown-extended.css`。所有经 `MainGridLayout` 渲染的主站页面（文章、关于、归档、搜索、友链、留言板等）共享 `.post-context` 下的扩展组件样式；独立的 `/ai-news/` React 阅读页不使用这套 Layout，保持自己的运行时和视觉边界。

- **GitHub 仓库卡片**：文章中的 `::github{repo="owner/name"}` 由 `src/plugins/remark-extended.mjs` 在构建期输出 `.github-card`。卡片左侧显示 owner 的 GitHub 头像（`https://github.com/<owner>.png?size=128`），桌面端为 `48×48`，移动端（`≤680px`）为 `40×40`；右侧显示仓库名、描述、star、fork 和语言。元数据来自 `src/constants/github-repos.json`，浏览器不请求 GitHub API；缓存缺失时保留可用的回退链接。
- **“我的项目”自动目录**：`scripts/fetch-github-projects.mjs` 在构建期通过 GitHub GraphQL 分页读取 `CaiYan12` 的公开仓库与 Profile Pinned 顺序，排除 fork 和归档仓库，写入 `src/constants/github-projects.json`。`src/data/projects.ts` 再叠加中文简介、完整技术栈、状态等人工覆盖与私有项目；已收录 Pinned 按 GitHub 顺序置顶，其余按开始时间倒序。刷新失败时复用有效快照，没有有效快照则构建失败；页面运行时不请求 GitHub API。
- **友链图标缓存**：`src/data/friends.json` 是友链单一数据源，`src/data/friends.ts` 仅提供 `Friend` 类型和兼容导出。`pnpm fetch-friend-icons` 只补齐缺失图标，`--refresh` 才会刷新当前友链，也会重试负缓存条目；成功资产和清单分别写入 `public/friend-icons/` 与 `src/constants/friend-icons.json`。失败时保留旧缓存，首次失败记录受控的负缓存状态并显示首字占位；普通模式命中负缓存不会重试，删除友链也保留历史记录。页面只引用本地路径，运行时不请求友链域名或 Google favicon 服务。CI 构建生成的缓存只进入当次部署 artifact；要长期复用，需在本地运行命令并提交上述资产和清单。
- **信纸稿纸面板**（/about/ 专用）：`:::letter-paper` 容器指令由 `src/plugins/remark-extended.mjs` 输出 `.letter-paper` 稿纸面板（暖纸底 + 32px 横线 + 红装订线 + 蓝红双笔手绘涂鸦层），内部结构为巨型头部（topbar/眉题/标题/手绘线）、黄色便签贴纸（承载原"写在前面"内容）、"✎ 碎碎念"小节标题、裸 `<div class="letter-paper-body">` 横线正文（逐字符静态微随机，见 `theme-script.ts` 的 `initPaperHandwriting()`）、"✦ NOW / NEXT" 时间线与页尾签名行（签名由插件固定输出，不写入 md）。**陷阱**：micromark 容器指令的一个 `:::` 会关闭整层嵌套栈，横线区必须用裸 div 包裹而非嵌套容器指令；**字体**：稿纸整体 `var(--font-hand)` 平方时光体（global.css 元素级 reset 会切断继承，容器需显式重声明），横线对齐 `--lp-shift` 与字体度量耦合、换字体须实测。
- **Markdown 表格**：`src/styles/global.css` 中的 `.post-context table` 与 `.table-scroll` 规则在主站正文统一生效。Markdown 表格由 `src/plugins/rehype-table-wrapper.mjs` 包裹，原生 HTML 表格由 `src/plugins/remark-extended.mjs` 包裹；表格默认满正文宽度、居中，单元格文字上下居中，边框为 `#c4c4c4`，过宽内容只在自身滚动容器内横向滚动。
- 修改上述插件或表格/卡片样式后，应至少检查一篇旧文章和一篇新文章的桌面、移动端布局，并补跑 `pnpm check`、`pnpm exec prettier --check ./src` 与 `pnpm build`。

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
- 文章卡片列表统一采用固定每页 6 篇的分页，覆盖首页、分类、标签和月归档列表。各列表根路径是第 1 页规范地址；生成的 `/page/1/` 别名仍可访问，但 canonical 指向根路径，并从 sitemap 排除。
- 分页控件视觉统一为无圆角 40×40 方块：正常态品牌色边框、组件背景和黑字，hover 为品牌色底/边框与白字，当前/禁用态为深灰边框、组件背景和黑字；跳转输入框为 120×40 并隐藏数字箭头，导航符号为 `<<`、`<`、`>`、`>>`、`→`，移动端仅保留首、前、当前、后、末五项。

## Giscus 评论

文章评论区与留言板 `/guestbook/` 均已启用 Giscus，当前配置位于 `src/config.ts` 的 `commentConfig`：

- 仓库：`CaiYan12/caiyan12.github.io`
- 仓库 ID：`R_kgDOUJeNhw`
- Discussions 分类：`Announcements`
- 分类 ID：`DIC_kwDOUJeNh84DEonO`
- 页面映射：文章评论区为 `pathname`；留言板为 `specific`，`data-term="guestbook"`
- 表情反应：`reactionsEnabled: "1"`，由文章页底部 Giscus 原生界面显示；`emitMetadata: "0"`，不复制或单独同步表情数量
- 语言：`zh-CN`
- 主题：`https://caiyan12.github.io/giscus-theme.css`，源文件为 `public/giscus-theme.css`

评论区主题沿用 Colorful 风格：白底、细边框、圆角卡片和海洋绿 hover 阴影；头像框不加阴影，站长徽标复用 `public/images/admin.png` 并显示“站长”。Giscus iframe 生成的原始身份文本仍由 Giscus 控制，主题 CSS 只做视觉替换。

### 评论数自动同步

- **COMMENTS**：`deploy.yml` 在构建前运行 `scripts/sync-site-stats.mjs`，通过 GitHub GraphQL 读取 `Announcements` 分类下的 Discussions（口径：顶层评论 + 全部回复），按 `posts/<14位目录名>/` 精确匹配文章后写入 `src/data/site-stats.json`（原子写入，生成结果不提交回仓库；`guestbook` 与欢迎帖不计入）。没有 Discussion 的文章回退 frontmatter 历史值。
- **最新评论**：同一次构建期同步写入最多 20 条符合口径的评论到 `src/data/site-stats.json`；首页静态渲染最多 5 条，“换一批”只在浏览器内切换已嵌入数据，不请求 GitHub/Giscus。评论内容按展示长度截断，开发环境保留本地 mock 便于视觉验收。
- **吐槽水军**：同一同步脚本单独读取标题为 `guestbook` 的 Discussion 顶层留言，按时间倒序写入 `guestbookComments`（最多 20 条）；侧栏 `WidgetBlogger` 每次只展示 1 条并复用最新评论的“换一批”系统，只使用构建期快照。
- 定时同步：`deploy.yml` 每 6 小时第 17 分钟（UTC）运行，另支持 push 与手动触发；同步失败会阻止当次部署，线上保留上一个成功版本。
- 首页卡片、文章页头部与热门排序中的吐槽数统一读取 `src/utils/site-stats.ts` 的有效值；文章页底部的表情数由 Giscus 原生界面显示，不再单独维护围观数。

如需重新接入或更换仓库：

1. 在 GitHub 仓库 **Settings → Features** 开启 **Discussions**
2. 安装 [giscus app](https://github.com/apps/giscus)
3. 到 [giscus.app](https://giscus.app) 生成新的 `repo / repoId / category / categoryId`
4. 更新 `src/config.ts` 的 `commentConfig`，确认 `enable` 为 `true`，并保留主题文件路径

## 如何添加相册

在 `public/images/albums/` 下新建文件夹，放入图片即可自动生成相册。

## 界面维护说明

- 图片墙 `/images/` 的桌面端图片保持 `180×120` 与 `object-fit: cover`；移动断点改为流体宽度，但始终保持 `3:2` 比例，确保日期栏对齐且不产生横向溢出。
- 响应式图片：文章封面、幻灯片、相册、图片墙经 `src/components/control/ResponsiveImage.astro`（`<picture>` + WebP 变体）渲染；变体由 `scripts/generate-lqips.mjs` 在构建时生成到 `public/images/_variants/`（480/720/1080/1440 四档）。Fancybox 灯箱仍打开原图（缩略图用变体省流量）。新增图片无需手动生成变体，构建自动处理。
- 键盘 skip link（“跳到正文”）位于 `Layout.astro` body 首元素、Swup 容器之外——移动或包进 `main` 会导致切页后丢失；样式在 `global.css` 的 `.skip-link`（默认视觉隐藏，`:focus-visible` 归位显示）。
- 顶部导航 QQ/微信的 hover 二维码弹层保持白色圆角卡片，四周 `10px` 内距，内部二维码裁切框统一为 `140×140`。两张现有源图的留白比例不同，裁切定位维护在 `src/styles/global.css`，更换二维码资源后需要重新检查实际码区尺寸。
- 桌面头部标题（`#header h1`）与左侧 `100px` 浮动 logo 并排：其 `max-width` 必须为 `calc(100% - 100px)` 扣除 logo 占位。`#header` 固定 `height:180px; overflow:hidden`，若标题宽度超过 `.box` 内容宽减去浮动宽，会被挤到 logo 下方落入裁切区并与 `#head-nav` 重叠（681–1100px 区间实测触发，2026-09-04 修复）。调整头部布局或 `.box` 宽度规则后，须在 681/770/860/980/1100px 等断点复查标题位置。
- 头部微言轮播（`#header .text`）由 `src/utils/theme-script.ts` 的 `initHeaderTicker()` 驱动：机制复刻原版 AutoScroll（每 4s 上滚一条 0.8s ease，滚完把首条 li 移到末尾无限轮转，无克隆条、任意条数无缝；hover 暂停、移出恢复；`prefers-reduced-motion` 下不启动）。条数取 `src/data/diary.ts` 前 4 条（`Navbar.astro` 的 `slice(0, 4)`）。**节奏对齐迁移前 CSS 关键帧版（勿改回原版 300ms）**；步长 `-24px` 与 `global.css` 的 `#header .text li` 行高耦合，改行高须同步；头部在 Swup 容器外，脚本随 `pagefindReady()` 初始化一次，勿加进 after-swap hook。
- 涉及上述界面的样式调整后，应在本地开发服务器中检查主要宽度、hover 状态、裁切效果、日期/弹层对齐和页面横向溢出，并补跑 `pnpm check` 与 `pnpm build`。
- 首页右侧文章推荐上方固定为“最新 / 手气不错”两栏，使用普通箭头＋日期列表；下方只保留一个“热门推荐”，按既有热度排序显示旗帜形序号。随机文章在构建期生成，浏览器不新增 GitHub 请求。
- 3D 标签/分类云（`/tag/` 与 `/category/` 云集页）：由 `src/components/layout/TagCloud3D.astro` 渲染，数据与下方 `#blogtags` 药丸云同源（药丸云保留：当前项高亮 + `prefers-reduced-motion` 回退）。库为 vendored `public/vendor/svg3dtagcloud/`（npm `svg-3d-tag-cloud@0.0.20`，MIT），标签颜色走库内置 10 色调色板；hover 放大 1.15 倍、“N篇文章”tooltip 上浮已内置；实例经 `window.__tagCloud3D` 跨页交接，Swup 互切安全。
- Pio 看板娘（`public/pio/static/`，vendored 但随本项目自维护）：
  - 操作按钮列顺序为 `home → info → side（停靠切换）→ close`，停靠支持左/右切换并写入 `localStorage.pioSide`，加载时恢复偏好；右侧停靠时按钮列、折叠按钮（`.pio-show`）、消息框位置均已对称适配。
  - 看板娘默认折叠，仅显示“点击召唤Pio”按钮（hover 有提示）；折叠状态记忆在 `localStorage.posterGirl`（召唤 = `1` 展开，关闭 = `0` 折叠，其余值一律折叠）。
  - 消息框居中于人物并带底部三角尾巴，`max-width: 100%` 限制长消息左缘不溢出视口；再现按钮与操作按钮已上移避开 myhkw 播放器歌词框与展开面板。
  - “关于我”按钮的跳转仓库由 `src/config.ts` 的 `pioConfig.dialog.link` 配置（现为 Pio 官方仓库）。
  - 已知问题：`pnpm dev` 下 Pio 因 Svelte hydration 报错不渲染（仅 dev，生产构建正常）；排查 pio 视觉问题请用 `pnpm build && pnpm preview`。

## 与 Emlog 原站的差异

- 移除：IP 归属地显示、用户注册、Flash 播放器、原 Emlog 评论表情面板（现由 Giscus 原生表情反应提供）
- 评论数据由 Giscus 承载（侧栏“最新评论”使用构建期同步快照，开发环境 mock 可在 `src/data/comments.ts` 维护）
- 首页幻灯片图片在 `src/config.ts` 的 `slideshowConfig` 中配置

## TODO:

以下条目为历史排行的销项索引，编号保持不变；完成记录已按惯例清理，实现细节见 git history 与 AGENTS.md 对应维护约束：优化项排行第 1–7 项于 2026-09-04 销项；内容扩充第 10 项（标签云集 `/tag/`，2026-09-04）、第 11 项（分类云集 `/category/`，2026-09-05）、第 12 项（热门页 `/hot/`，2026-09-05）、第 13 项（全站字体策略，2026-09-05）已完成；Nice Books「私人藏书桌」升级（2026-09-07）已交付，视觉契约见 `docs/nice-books-design.md`、验收记录见 `docs/nice-books-design-test.md`；TODO 13 遗留的「稿纸横线贯穿整纸」已于 2026-09-19 完成——网格改画在 `.letter-paper` 面板层，相位由脚本运行时按正文首行基线反推，头部高度无需确定化，同批把 `/about/` 装饰元件换成手绘墨迹 SVG（维护约束见 AGENTS.md「信纸稿纸」条目）；远期规划第 8 项（Astro 5 → 6）已于 2026-09-20 完成——先做 Tailwind 接入改造（去掉 @astrojs/tailwind，改由根 `postcss.config.mjs` 直连），再升 astro 6.4.8 / @astrojs/react 5.0.7 / @astrojs/svelte 8.1.2 / astro-expressive-code 0.43.1，`pnpm check` 零错误、206 页构建通过、三套 Playwright smoke（fancybox 27/27、nice-books 72/72、ai-news 9/9）全绿，样式经 24 页 15,554 个元素的计算样式逐元素比对确认零变化（详见 AGENTS.md「构建链与依赖约束」）；同批把 Astro 6 标记为 deprecated 的 `markdown.remarkPlugins` / `rehypePlugins` 迁到 `markdown.processor: unified({...})`（2026-09-20）——`@astrojs/markdown-remark` 按 astro 6.4.8 的硬钉版本 7.2.0 作直接依赖，构建告警清零，固定构建期随机后完整产物 1114 个文件（含 pagefind 索引）逐字节零差异，全站门禁（astro check 零错误 + fancybox 27/27 + nice-books 单测 51/51 与 smoke 72/72 + ai-news 9/9）全绿。

### 评估已完成、明确不实施（保留结论以防重复评估）

- [x] **纯 HTML 页面资源移植**（2026-09-19 完成评估；结论：全部候选不移植，本项关闭）：源为 2020–2022 的手写多页站，实际路径 `C:\Users\Einn Tzai\Documents\HTML5网页`（本条目旧写法「文档\HTML5页面」按字面搜不到），入口 `index.html`（"WindowsIt's Music Site"）链向 `about/`、`login/`、`quesion/` 与 5 个 `tools/` 子页，全站 25 个 HTML 已逐一核对。排除理由分四类：**第三方「另存为」产物**（版权与外部依赖风险）——`!downloaded/`（Google 翻译镜像、jQuery MP4 播放器、css3 3D 翻牌）、`tools/eeslap`、`tools/burymewithmymoney`、`tools/smashthewalls`，特征为 `*_files/` 子目录 + 脚本文件名带 `.下载` + 内嵌 analytics/firebase/three.js，`login/index.html` 标题本身即下载代码片段且静态站无鉴权场景；**已被本站取代的前代模板残留**——`myblog/`、`HACKEREMPIER/`、`officialblog/`、`about/index.html`、需后端的 `_UNUSED TESTED PAGE/` 留言表单；**纯 CSS 演示无内容增量**——`tools/chemicals`（诞生石药水瓶）、`tools/newtonbai`（牛顿摆）、`tools/moonnight`（星空月景）虽零依赖可搬，但属装饰性 demo；`tools/makebridge` 系 freeCodeCamp "Santa's Helper" 教程复刻（`santaX`/`perfectAreaSize` 变量名原样），移植需去圣诞主题化并注明来源，收益不抵成本；`tools/daojishi` 倒计时硬编码 `12/31/2020 23:59:59`，原样移植即死页；**原创文字资产不宜沿用页面形态**——`quesion/`（恶搞产品文案）与 `slide/`（"HOT IDEAS" 卡片）为站主 2020 年的吐槽，若将来启用应以重新撰写的文章呈现，旧页面不搬。`MainSources/` 仅字体与两个未核授权的音视频，同样不动。

- [x] **原模板未移植页面评估**（2026-09-04 完成）：对 `../limh.me` 全部 12 个 page-*.php / t.php / reg.php / function/*.php 逐一核对，与 myblog 现有 14 个路由 + sidebarConfig 侧栏清单对齐。结论：已移植清单（log_list/echo_log/header/footer/side/options→config.ts/归档/微语/留言板/关于/友链/图片墙/相册/404/全部侧栏 widget/文章尾部表情/吐槽水军）无遗漏。未移植 9 项取舍：**标签云集页**已作为 TODO 10 落地为 `/tag/`（2026-09-04 完成）；**读者墙**与**微语分页+[F*]表情码解析**移入远期规划（触发条件见该节）；分享组件（分享目标大半死链）、日历 widget（Emlog ajax 依赖，交互已被归档/时间线替代）、读者等级（Giscus 无访客邮箱数据源）不移植；前台注册（需后端写库+验证码）、评论 UA/IP 属地（Giscus 不提供该数据）、通用页面模板变体 page-test/page1/page-colorful（已被 `spec` collection 的 `[...slug]` 覆盖）为架构性/数据源排除项，永久排除。原 `module.php`（eval 漏洞）与 `function/favicon.php`、`image.php`（开放代理）维持严禁搬运。

### 远期规划（观望项，均已完成评估、明确触发条件，未触发不排期）

- **9. /ai-news/ React 岛屿瘦身**（2026-09-04 评估完成）：技术可行但 ROI 为负。dist 实测该页客户端 JS 为 react-dom chunk（178KB）+ AiNewsApp chunk（57KB）≈ 235KB 未压缩（gzip 估 70–80KB），且经 Astro 岛屿架构隔离**仅此一页加载**，其他页面零成本；Svelte 重写估省 40–50KB gzip，对低频单访客的日报阅读页无感知收益。重写成本被低估：`src/ai-news/` 共 43 文件 / 约 135KB 源码（2 个 zustand store、5 套橘鸦视觉模板 × 亮暗双变体、RSS 解析 / 离线快照兜底 / 搜索 / hash 路由 / localStorage 持久化）。迁移难点集中在 `useAppStore.ts` 的 `transitionRoute`：列表↔详情交叉淡入淡出依赖 `document.startViewTransition` + React `flushSync` 在回调内同步提交 DOM，Svelte 无直接等价 API，行为保真是最大风险点；回归面为 5 套模板 × 亮暗 × 列表/详情 = 20 种视觉组合。有利因素：hooks 仅 useState/useEffect/useMemo/useRef，zustand store 为纯 TS 逻辑可平移 runes，lucide-react 有 lucide-svelte 对应。附带收益：移除 6 个依赖。（TODO 8 的 @astrojs/react 未知项已在 2026-09-20 升级时实测消除——@astrojs/react 5.0.7 与 astro 6.4.8 兼容，ai-news 页 9/9 smoke 通过）**触发条件：① Astro 升级受阻于 @astrojs/react 兼容性（重写从可选变被迫，届时正确时机）；② 该页出现真实访问量增长使 payload 成为可测量瓶颈**。实施时建议先降级橘鸦模板（保留 1–2 套风格）压缩回归面。验收（实施时适用）：功能与视觉对齐（列表、筛选、20 种模板组合、View Transitions 过渡），构建产物无 React runtime 残留。

- **11. 读者墙**（limh.me 移植评估得分 10，条件观望）：原版 `function/page-guest.php` 为评论区活跃者头像墙（Gravatar + 评论次数 top200）。技术上可行——Giscus 走 GitHub Discussions，`sync-site-stats.mjs` 可扩展按 author 聚合，`author.avatar_url` 替代 Gravatar；但当前站评论量极小，移植即空页。**触发条件：留言板/文章评论参与者明显增长（>20 人）**。

- **12. 微语分页 + [F*] 表情码解析**（limh.me 移植评估，数据层无当前需求）：原版 `t.php` 含 pagenavi 分页与 `[F1]`–`[F18]` 表情码 → gif 替换；本站 `diary.ts` 仅 3 条数据（无分页需求）、内容零 `[F*]` 码（rg 实测）、表情 gif 资源未迁移。**触发条件：说说条数增长到单页过长（>30 条）或迁移历史说说数据含表情码时**，一并补 `public/images/face/` 资源。
