# WindowsIt's Music Club

由 Emlog Colorful（明月浩空）主题迁移而来的纯静态 Astro 博客。

## 技术栈

- **Astro 5.16** + TypeScript + Svelte 5（搜索组件）
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
pnpm build       # 构建到 dist/（LQIP 占位图 + GitHub 仓库数据 + 佛祖横幅注入 + Pagefind 已串联）
pnpm new-post -- <yyyymmddhhmmss> [标题]  # 按规范创建文章目录
pnpm fetch-repos --refresh  # 全量刷新 GitHub 仓库卡片元数据缓存
pnpm preview     # 预览构建产物
pnpm check       # 类型检查
pnpm smoke:ai-news  # AI 日报入口、详情、返回与离线快照 Smoke（需先启动 pnpm dev）
pnpm format      # Prettier 格式化
```

> ⚠️ **踩坑警告**：修改 Markdown 渲染插件（remark/rehype）后构建产物没变化？Astro 5 content layer 可能复用旧渲染结果——先删除 `node_modules/.astro/`，并在存在时删除 `.astro/data-store.json`，再构建；touch 文件无效。CI 侧 `deploy.yml` 已对 `withastro/action` 传 `cache: false` 关闭同类缓存，任何 workflow 改动勿恢复。

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
    friends.ts           ← 友链
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
  constants/             ← 构建期生成数据（LQIP 占位色、GitHub 仓库卡片元数据缓存）
scripts/                 ← 构建脚本（LQIP 生成、GitHub 仓库数据拉取、新建文章、佛祖横幅注入）
public/
  ai-news/snapshot/      ← AI 日报离线 RSS 快照
  images/albums/         ← 相册（每个文件夹一个相册）
  images/_variants/      ← 构建生成的 WebP 图片变体（勿手动编辑，gitignore）
  fonts/                 ← Font Awesome 4 图标字体（仅 woff）
  style/                 ← 自定义光标
```

## Markdown 扩展与全站正文样式

主站统一由 `src/layouts/Layout.astro` 引入 `src/styles/markdown-extended.css`。所有经 `MainGridLayout` 渲染的主站页面（文章、关于、归档、搜索、友链、留言板等）共享 `.post-context` 下的扩展组件样式；独立的 `/ai-news/` React 阅读页不使用这套 Layout，保持自己的运行时和视觉边界。

- **GitHub 仓库卡片**：文章中的 `::github{repo="owner/name"}` 由 `src/plugins/remark-extended.mjs` 在构建期输出 `.github-card`。卡片左侧显示 owner 的 GitHub 头像（`https://github.com/<owner>.png?size=128`），桌面端为 `48×48`，移动端（`≤680px`）为 `40×40`；右侧显示仓库名、描述、star、fork 和语言。元数据来自 `src/constants/github-repos.json`，浏览器不请求 GitHub API；缓存缺失时保留可用的回退链接。
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

### 待办（优化项排行，2026-09-04 与 Firefly AB 对比制定）

排行依据：必要性 ×2 + 进步大小 ×1.5 + 易于修改 ×1（各 5 分制）；必要性对齐站点实际内容需求，权重最高。原第 1–7 项已于 2026-09-04 全部销项，完成记录已从本节清理，详见 git history 与 AGENTS.md 中的对应维护约束；第 8、9 项已完成评估并移入"远期规划"；第 10 项为 limh.me 移植评估（2026-09-04）产生的新待办，已于同日完成；编号保持与原排行一致。

### 待办（内容扩充，既有事项）

- [x] **10. 标签云集独立页**（2026-09-04 完成；limh.me 移植评估得分 13.75，唯一过 10 分项）

  实现形态（grill 后定稿）：新增 `/tag/` 标签云集页（`src/pages/tag/index.astro`，骨架复刻 `archive.astro`：`.page` + `post-header` h2"标签云集" + `post-metaa` 面包屑；初版为 `/tags/`，2026-09-04 按路由层级逻辑改为 `/tag/` 索引 + `/tag/xxx/` 详情，与 `/archive/` 模式一致）；数据复用 `getTagList()` 按文章数降序，统计行"共 N 个标签 · 收录 M 篇文章"置于 `.post-context`（M=全部公开文章数，与归档页同口径），空标签数组渲染空态；标签列表复用 `#blogtags` 药丸（6 色轮换，DOM 与侧栏 WidgetTag 一致），药丸内全部追加 `×N` 数字（唯一新增样式 `#blogtags a .tag-count`，11px 白色，零动画）。导航"文章归档"平铺项改为下拉组 `navBarConfig.archiveSite`（全部文章 `/archive/` + 标签分类 `/tag/`），Navbar 桌面下拉与 MMenu 移动端菜单同步渲染，父项按既有 `some()` 模式高亮；顺带修复既有 bug：`theme-script.ts` 的 `syncNavHighlight()` 会因 `javascript:void(0)` 锚点把构建期写入的下拉父项 current 抹掉（影响全部下拉与移动端菜单），现跳过 void 锚点并按子链接统一计算父项高亮。侧栏 WidgetTag 未动。

  后续优化（同日）：`×N` 数字由灰色 `#999` 改白色；单标签页 `/tag/xxx/`（含 `page/[page]` 第 2+ 页）头部复刻 `/tag/` 标签云集页形态——h2"标签：xxx" + 面包屑"首页 » 标签云集 » 标签名"（补齐返回标签云集入口）+ `.post-context` 统计行 + 全量 `#blogtags` 药丸云，当前标签 `is-current` 品牌绿高亮（`--colorful-green`，含三角，`aria-current="page"`），文章列表与分页维持主页同款机制（`Pagination` 组件 + `tag/[tag]/page/[page]/` 路由）；新增 `siteConfig.tagPostsPerPage: 5`（标签页独立于主页的每页 6 篇；当前最大标签 3 篇暂无分页，阈值远期随标签增长调整）。路由改 `/tag/` 后单标签页命中前缀匹配，导航"文章归档"下拉及"标签分类"子项在 /tag/xxx/ 页呈 current（语义正确：当前处于标签栏目）。

- [x] **11. 分类云集页**（2026-09-05 完成；与 TODO 10 配套，分类侧对齐标签体系）

  实现形态：新增 `/category/` 分类云集页（`src/pages/category/index.astro`，逐行镜像 `tag/index.astro`：h2"分类云集"（`fa-folder-open-o`）+ 面包屑 + `.post-context` 统计行"共 N 个分类 · 收录 M 篇文章" + 空态"暂无分类。"）；单分类页 `/category/xxx/`（含 `page/[page]` 第 2+ 页）头部同步复刻 `/tag/xxx/` 形态——去掉旧式 h2 内嵌计数，补面包屑"首页 » 分类云集 » 分类名"（补齐返回分类云集入口）+ `.post-context` 统计行 + 全量分类药丸云，当前分类 `is-current` 品牌绿高亮 + `aria-current="page"`。药丸复用 `#blogtags` 共享样式（含 `.tag-count` ×N），零新增 CSS；每页条数维持 `siteConfig.postsPerPage: 6` 不另设配置。导航 `archiveSite` 下拉追加"文章分类 `/category/`"（Navbar/MMenu 均遍历 config 渲染，仅改 config 一处即两端同步）；`syncNavHighlight()` 前缀匹配自动覆盖 /category/xxx/，无客户端脚本改动。侧栏 WidgetSort 未动。

- [x] **12. 热门文章页**（2026-09-05 完成）

  实现形态：新增 `/hot/` 热门推荐页（`src/pages/hot/index.astro` + `hot/page/[page]/` 分页，双文件模式与 tag/category 一致）；数据复用 `getHotPosts(allPosts, Infinity)` 取全量排序（hotness×100 + 有效评论数，同分按发布时间倒序；评论数来自构建期 `site-stats.json` 快照，客户端零请求），每页维持 `siteConfig.postsPerPage: 6`。头部对齐列表页形态：h2"热门推荐"（`fa-fire`，与侧栏热门部件同图标）+ 面包屑 + `.post-context` 统计行"共 N 篇文章"；正文用 `PostCard` 标准卡片而非复制侧栏 `#hotlog` 排行元件（侧栏部件不动、仍仅首页显示）。导航 `archiveSite` 下拉追加"热门推荐 `/hot/`"（第 4 项，config 一处改 Navbar/MMenu 两端同步）；`syncNavHighlight()` 前缀匹配自动覆盖 `/hot/` 与 `/hot/page/N/`，无客户端脚本改动、零新增 CSS。

- [x] **13. 全站字体策略**（2026-09-05 完成；速度优先、多方案并存、全免费许可）

  实现形态：`:root` 四 token 收敛全站字体——`--font-body` 思源黑体（`@fontsource-variable/noto-sans-sc` 可变字重 100–900 自托管分包，Layout 全站引入，**微软雅黑从所有主栈退场**消除版权风险，兜底苹方/文泉驿）、`--font-mono`（JetBrains Variable 栈，统一 `.prose code`/`.friend-domain`/稿纸小标签等 6 处散落声明）、`--font-serif`（方正书宋，token 就位暂无主用场景）、`--font-hand`（/about/ 稿纸手写体）。三方交付按可用性定制：思源黑体与霞鹜文楷系走 fontsource/cn-fontsource 自托管分包；方正书宋走 jsDelivr CDN（`cn-fontsource-fz-shu-song-z-01-regular/font.css`）+ 本地 `public/fonts/方正书宋-简体.ttf` 回退；平方时光体走 ZeoSeven FontsAPI CDN（`fontsapi.zeoseven.com/156/main/result.css`，src 含 `local()` 本机优先）。稿纸手写体决策链：霞鹜文楷 → 智勇手书体 → 平方乔木体 → **平方时光体**（用户定稿；方正书宋交付后无现成 CDN 的行楷字体，最终在 ZeoSeven 目录选定）。逐字符微随机由 `theme-script.ts` 的 `initPaperHandwriting()` 补齐（信纸正文切 span 施加静态微变换，无动画）。
  
  实施要点：global.css 的元素级 reset（`p/div { font-family: var(--font-body) }`）会切断稿纸继承，稿纸内文字容器必须显式重声明 `var(--font-hand)`；字体切换后横线对齐偏移 `--lp-shift` 已实测无需调整；思源黑体首访分包下载数百 KB～1MB（swap 不阻塞），dist 增量约 11MB（noto 分包 98 文件 + 书宋回退 TTF）。spec 见 GitHub Issue #8。**遗留**：稿纸横线贯穿整纸（含头部区，此前确认的配套需求）仍未实施——头部高度随视口浮动，容器级网格锚定需与头部尺寸确定化一并设计。

- [ ] **纯 HTML 页面资源移植**

  详细需求：将其他项目“文档\HTML5页面”下的纯 HTML 页面适配为本站资源页（静态路由或文章形式），样式融入 Colorful 视觉体系。

  验收结果：移植页面站内样式协调、移动端无横向溢出、`pnpm build` 通过。

  预期：充实站内资源内容。

- [x] **原模板未移植页面评估**（2026-09-04 完成）：对 `../limh.me` 全部 12 个 page-*.php / t.php / reg.php / function/*.php 逐一核对，与 myblog 现有 14 个路由 + sidebarConfig 侧栏清单对齐。结论：已移植清单（log_list/echo_log/header/footer/side/options→config.ts/归档/微语/留言板/关于/友链/图片墙/相册/404/全部侧栏 widget/文章尾部表情/吐槽水军）无遗漏。未移植 9 项取舍：**标签云集页**转为 TODO 10（移植）；**读者墙**与**微语分页+[F*]表情码解析**移入远期规划（触发条件见该节）；分享组件（分享目标大半死链）、日历 widget（Emlog ajax 依赖，交互已被归档/时间线替代）、读者等级（Giscus 无访客邮箱数据源）不移植；前台注册（需后端写库+验证码）、评论 UA/IP 属地（Giscus 不提供该数据）、通用页面模板变体 page-test/page1/page-colorful（已被 `spec` collection 的 `[...slug]` 覆盖）为架构性/数据源排除项，永久排除。原 `module.php`（eval 漏洞）与 `function/favicon.php`、`image.php`（开放代理）维持严禁搬运。

### 远期规划（观望项，均已完成评估、明确触发条件，未触发不排期）

- **8. Astro 5 → 6 升级**（2026-09-04 评估完成）：生态已就绪但有 1 个硬阻碍。npm 实测 latest 已是 Astro 7.3.1（"等生态就绪再升 6"的前提过时）。逐项核验：@swup/astro 1.8.0 / astro-expressive-code 0.43.1 / @astrojs/svelte 8.1.2 的 peer 均含 `^6.0.0-beta` 且 Firefly（astro 6.4.6）实用同款配置实证可行；本站代码对 Astro 6 移除项（`Astro.glob` / `emitESMImage` / `ViewTransitions` / legacy collections / `%25` 路由文件名）零命中，content.config.ts 已用 Content Layer + `astro/zod`，Node 本机 24 / CI 22 均满足 ≥22.12；schema 无 Zod 4 破坏的 `transform + default` 组合。**硬阻碍：@astrojs/tailwind 最新 6.0.2 的 peer 仅 `^3 || ^4 || ^5`，无 Astro 6 支持**，升级前必须先改 Tailwind 接入方式（方案 A：保留 TW3 + postcss.config 接入，改动小；方案 B：迁 TW4 + @tailwindcss/vite，global.css 深度依赖 v3 语义风险高，须独立立项，禁止与 Astro 升级捆绑）。未知项：@astrojs/react 的 Astro 6 兼容版本（无 peer 声明，Firefly 不用 React，需试装验证）。收益有限：18 篇文章的小型静态站构建提速收益小，新特性（Fonts API/CSP/Live Collections）需求匹配度低；且 6→7 还有 Sätteri 默认 Markdown 处理器更换（本站 5 个自有 remark/rehype 插件需走 `processor: unified()` 逃生舱）+ `compressHTML: 'jsx'` 空白处理变化，不是免费跳板。**触发条件：需要升级依赖链（安全修复 / 新功能）或 Tailwind 改造完成时**；届时走 5→6（Firefly 实证路线），本地先删 `node_modules/.astro/`，`deploy.yml` 的 `cache: false` 不得回退。验收（升级时适用）：`pnpm check` / `pnpm build` / `pnpm preview` 全过；线上抽查首页 / 文章 / 相册 / 留言板 / ai-news 无回归。

- **9. /ai-news/ React 岛屿瘦身**（2026-09-04 评估完成）：技术可行但 ROI 为负。dist 实测该页客户端 JS 为 react-dom chunk（178KB）+ AiNewsApp chunk（57KB）≈ 235KB 未压缩（gzip 估 70–80KB），且经 Astro 岛屿架构隔离**仅此一页加载**，其他页面零成本；Svelte 重写估省 40–50KB gzip，对低频单访客的日报阅读页无感知收益。重写成本被低估：`src/ai-news/` 共 43 文件 / 约 135KB 源码（2 个 zustand store、5 套橘鸦视觉模板 × 亮暗双变体、RSS 解析 / 离线快照兜底 / 搜索 / hash 路由 / localStorage 持久化）。迁移难点集中在 `useAppStore.ts` 的 `transitionRoute`：列表↔详情交叉淡入淡出依赖 `document.startViewTransition` + React `flushSync` 在回调内同步提交 DOM，Svelte 无直接等价 API，行为保真是最大风险点；回归面为 5 套模板 × 亮暗 × 列表/详情 = 20 种视觉组合。有利因素：hooks 仅 useState/useEffect/useMemo/useRef，zustand store 为纯 TS 逻辑可平移 runes，lucide-react 有 lucide-svelte 对应。附带收益：移除 6 个依赖并连带消除 TODO 8 的 @astrojs/react 未知项。**触发条件：① Astro 升级受阻于 @astrojs/react 兼容性（重写从可选变被迫，届时正确时机）；② 该页出现真实访问量增长使 payload 成为可测量瓶颈**。实施时建议先降级橘鸦模板（保留 1–2 套风格）压缩回归面。验收（实施时适用）：功能与视觉对齐（列表、筛选、20 种模板组合、View Transitions 过渡），构建产物无 React runtime 残留。

- **11. 读者墙**（limh.me 移植评估得分 10，条件观望）：原版 `function/page-guest.php` 为评论区活跃者头像墙（Gravatar + 评论次数 top200）。技术上可行——Giscus 走 GitHub Discussions，`sync-site-stats.mjs` 可扩展按 author 聚合，`author.avatar_url` 替代 Gravatar；但当前站评论量极小，移植即空页。**触发条件：留言板/文章评论参与者明显增长（>20 人）**。

- **12. 微语分页 + [F*] 表情码解析**（limh.me 移植评估，数据层无当前需求）：原版 `t.php` 含 pagenavi 分页与 `[F1]`–`[F18]` 表情码 → gif 替换；本站 `diary.ts` 仅 3 条数据（无分页需求）、内容零 `[F*]` 码（rg 实测）、表情 gif 资源未迁移。**触发条件：说说条数增长到单页过长（>30 条）或迁移历史说说数据含表情码时**，一并补 `public/images/face/` 资源。

