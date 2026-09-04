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
pnpm build       # 构建到 dist/（LQIP 占位图 + GitHub 仓库数据 + Pagefind 已串联）
pnpm new-post -- <yyyymmddhhmmss> [标题]  # 按规范创建文章目录
pnpm fetch-repos --refresh  # 全量刷新 GitHub 仓库卡片元数据缓存
pnpm preview     # 预览构建产物
pnpm check       # 类型检查
pnpm smoke:ai-news  # AI 日报入口、详情、返回与离线快照 Smoke（需先启动 pnpm dev）
pnpm format      # Prettier 格式化
```

> ⚠️ **踩坑警告**：修改 Markdown 渲染插件（remark/rehype）后构建产物没变化？Astro 5 content layer 可能复用旧渲染结果——先删除 `node_modules/.astro/`，并在存在时删除 `.astro/data-store.json`，再构建；touch 文件无效。CI 侧 `deploy.yml` 已对 `withastro/action` 传 `cache: false` 关闭同类缓存，任何 workflow 改动勿恢复。

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
scripts/                 ← 构建脚本（LQIP 生成、GitHub 仓库数据拉取、新建文章）
public/
  ai-news/snapshot/      ← AI 日报离线 RSS 快照
  images/albums/         ← 相册（每个文件夹一个相册）
  fonts/                 ← Font Awesome 4 图标字体
  style/                 ← 自定义光标
```

## Markdown 扩展与全站正文样式

主站统一由 `src/layouts/Layout.astro` 引入 `src/styles/markdown-extended.css`。所有经 `MainGridLayout` 渲染的主站页面（文章、关于、归档、搜索、友链、留言板等）共享 `.post-context` 下的扩展组件样式；独立的 `/ai-news/` React 阅读页不使用这套 Layout，保持自己的运行时和视觉边界。

- **GitHub 仓库卡片**：文章中的 `::github{repo="owner/name"}` 由 `src/plugins/remark-extended.mjs` 在构建期输出 `.github-card`。卡片左侧显示 owner 的 GitHub 头像（`https://github.com/<owner>.png?size=128`），桌面端为 `48×48`，移动端（`≤680px`）为 `40×40`；右侧显示仓库名、描述、star、fork 和语言。元数据来自 `src/constants/github-repos.json`，浏览器不请求 GitHub API；缓存缺失时保留可用的回退链接。
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
- 顶部导航 QQ/微信的 hover 二维码弹层保持白色圆角卡片，四周 `10px` 内距，内部二维码裁切框统一为 `140×140`。两张现有源图的留白比例不同，裁切定位维护在 `src/styles/global.css`，更换二维码资源后需要重新检查实际码区尺寸。
- 桌面头部标题（`#header h1`）与左侧 `100px` 浮动 logo 并排：其 `max-width` 必须为 `calc(100% - 100px)` 扣除 logo 占位。`#header` 固定 `height:180px; overflow:hidden`，若标题宽度超过 `.box` 内容宽减去浮动宽，会被挤到 logo 下方落入裁切区并与 `#head-nav` 重叠（681–1100px 区间实测触发，2026-09-04 修复）。调整头部布局或 `.box` 宽度规则后，须在 681/770/860/980/1100px 等断点复查标题位置。
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

排行依据：必要性 ×2 + 进步大小 ×1.5 + 易于修改 ×1（各 5 分制）；必要性对齐站点实际内容需求，权重最高。原第 1–4 项已于 2026-09-04 完成并移入下方“已完成”；编号保持与原排行一致。

- [ ] **5. Font Awesome 4 冗余字体清理**

  详细需求：`public/fonts/` 中 `fontawesome-webfont` 的 `.eot`（55KB）/ `.svg`（281KB）/ `.ttf`（110KB）仅服务古董浏览器；将 `src/styles/font-awesome.css` 的 `@font-face` src 收敛为 woff 后删除这三个文件。

  验收结果：全站图标显示正常（重点复查导航社交图标、侧栏 widget、Pio 按钮、分页箭头）；`dist/fonts/` 仅剩 woff；`pnpm build` 通过。

  预期：部署产物减重约 446KB。

- [ ] **6. Mermaid 体积治理**

  详细需求：现有 3 篇文章使用 mermaid（20231001000000、20260831000000、20240401000000），懒加载 chunk 合计超 2MB（mermaid.core 638KB、cynefin 672KB、cytoscape 433KB 等，对应已知问题“Vite 大 chunk 警告”）。评估按需注册实际用到的 diagram 类型，或构建期预渲染 SVG 替代客户端渲染。

  验收结果：构建大 chunk 警告消除或显著减少；三篇文章图表渲染正常（含 Swup 切页后的重绑定）。

  预期：含图表页面的按需 JS 体积大幅下降，构建警告清零。

- [ ] **7. 构建卫生：生产 console 清理**

  详细需求：`astro.config.mjs` 的 vite esbuild 配置加 `drop: ["debugger"]`、`pure: ["console.log", "console.debug"]`（warn / error 保留，生产出错可查）。

  验收结果：`pnpm build` 通过；产物 JS 无 `console.log` 调用残留；线上功能无回归。

  预期：生产日志干净，包体略有缩减。

- [ ] **8. 评估：Astro 5 → 6 升级（观望项）**

  详细需求：本站 Astro 5.16.4，Firefly 已用 6.4.6；升级需验证 content layer、@swup/astro、astro-expressive-code、@astrojs/react / svelte 兼容性，警惕 `node_modules/.astro` 缓存坑，`deploy.yml` 的 `cache: false` 约束不得回退。

  验收结果：升级后 `pnpm check` / `pnpm build` / `pnpm preview` 全过；线上抽查首页 / 文章 / 相册 / 留言板 / ai-news 无回归。

  预期：构建性能与新特性收益；非急需，待依赖生态完全就绪再评估。

- [ ] **9. 评估：/ai-news/ React 岛屿瘦身（观望项）**

  详细需求：React 19 + react-dom + zustand + lucide-react 仅服务 `/ai-news/` 单页；若长期访问量低，可用 Svelte 重写并移除 `@astrojs/react` 集成。

  验收结果：重写后 /ai-news/ 功能与视觉对齐（列表、筛选、样式），构建产物无 React runtime 残留。

  预期：依赖树与客户端 payload 显著缩减；属产品决策，先观测再定。

### 待办（内容扩充，既有事项）

- [ ] **原模板未移植页面评估**

  详细需求：评估原模板 `../limh.me`（Emlog 原站）下未移植页面是否值得带入本站；严禁搬运 `module.php`（`/e` 修饰符 eval 漏洞）与 `function/favicon.php`、`image.php`（开放代理）。

  验收结果：输出页面取舍清单，确定移植的转为具体 TODO。

  预期：明确移植边界，避免范围无限扩散。

- [ ] **纯 HTML 页面资源移植**

  详细需求：将其他项目“文档\HTML5页面”下的纯 HTML 页面适配为本站资源页（静态路由或文章形式），样式融入 Colorful 视觉体系。

  验收结果：移植页面站内样式协调、移动端无横向溢出、`pnpm build` 通过。

  预期：充实站内资源内容。

### 已完成

- [x] **1. SEO 元数据与结构化数据补齐**（2026-09-04）：`Layout.astro` 补 `og:url`（与 canonical 同值）、`og:site_name`、`twitter:card`（`summary_large_image`）及 `twitter:title/description/image`；修复 `og:image` 兜底相对路径，统一输出绝对地址；文章页 `og:type` 为 `article`（其余页 `website`）；文章页注入 `BlogPosting` JSON-LD（headline/datePublished/dateModified/description/image/mainEntityOfPage/author）。本地 Playwright 与 dist 产物均已验证 meta 齐全无空值。
- [x] **2. 图片响应式与格式现代化**（2026-09-04）：`scripts/generate-lqips.mjs` 追加 WebP 变体生成（480/720/1080/1440 四档、q82、mtime 增量、孤儿清理），变体输出至 `public/images/_variants/`（`.gitignore` 排除、随构建进 dist）；新增 `image-variants.ts`（manifest 查询 + `existsSync` 兜底降级）与 `ResponsiveImage.astro`（`<picture>` + WebP source + 原图 srcset 兜底），文章封面 / 幻灯片 / 相册 / 图片墙四类图片补 `srcset`/`sizes` 与 `width`/`height` 防 CLS；`global.css` 幻灯片选择器改为后代选择器适配 picture 包裹。实测文章封面 1787KB→66KB（-96%），图片墙 3:2 多断点无回归，相册灯箱与幻灯片切换正常。
- [x] **3. Expressive Code 暗色代码块修复**（2026-09-04）：`astro.config.mjs` 的 `expressiveCode` 显式加 `useDarkModeMediaQuery: false`，消除产物 CSS 中 `prefers-color-scheme: dark` 包裹的整套暗色变量（旧产物实测含 `--ec-codeFg:#626466` 等暗色覆盖）。删除 `node_modules/.astro/` 后重建，新 CSS `prefers-color-scheme: dark` 为 0 处（文件 hash 变化确认非缓存）；Chrome DevTools 暗色模拟下代码块背景 `#f7f7f9`、文字 `#24292e` 保持亮色。
- [x] **4. 键盘可访问性：skip link**（2026-09-04）：`Layout.astro` body 顶部加“跳到正文”链接（`href="#main"`，指向 `MainGridLayout` 的 `<main>` 容器）；`global.css` 新增 `.skip-link` 默认 `translateY(-200%)` 视觉隐藏（保持可聚焦）、`:focus-visible` 归位显示，品牌绿底白字，`z-index` 高于 myhkw 播放器，过渡用既有 `--ease-out` token。实测 Tab 首焦点即链接并显示、Enter 后焦点落入 `<main>` 且视口对齐、Swup 切页后行为保持（链接在 Swup 容器外）。
- [x] 主页——最新评论使用构建期真实数据，最多展示 5 条并支持“换一批”（开发环境保留本地 mock）
- [x] 主页右侧文章推荐去重：上方为“最新 / 手气不错”，下方保留唯一“热门推荐”，列表样式与排行旗帜标记按 Colorful 原主题语义区分
- [x] 吐槽水军：单条展示留言板内容并支持“换一批”
- [x] nav订阅左侧新增同风格链接，并接入站长 QQ 与微信 hover 二维码
- [x] 图片墙页面：桌面端统一 `180×120`，移动端保持 `3:2`，日期栏对齐且无横向溢出
- [x] 顶部导航 QQ/微信 hover 二维码：圆角弹层内距统一为 `10px`，二维码视觉尺寸统一
- [x] 相册图库：UI部分问题修复
- [x] 宽屏模式当屏幕较窄时（平板模式？）标题会有部分文字掉到nav之下等其他UI问题
- [x] 首页banner当标题过长时会换到第二行，需要智能"..."截断
- [x] 目前测试得到/category/技术架构/ 下分类标题距离第一篇文章的距离异常过远
- [x] 文章卡片列表分页：首页、分类、标签和月归档统一固定每页 6 篇；根路径作为第 1 页规范地址，`/page/1/` 别名可访问并 canonical 到根路径，且从 sitemap 排除；分页按钮采用无圆角 40×40 方块，输入框为 120×40 并隐藏数字箭头
- [x] 明月浩空播放器的歌词部分可能挡住pio的按钮，需要将pio的探头按钮向上移动一个按钮尺寸的距离，这样既不会被歌词挡住，也不会被未展开的播放器挡住。

