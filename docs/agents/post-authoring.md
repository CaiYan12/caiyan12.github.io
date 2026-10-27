# 写文章与导入文章的流程

> 新建文章、导入外部 Markdown、迁移图片、生成头图、提交前检查的完整流程。**要写文章或把外部稿子导进来时读这份**。

（本文由 `AGENTS.md` 的「写文章与导入文章的流程」一节迁出；内容逐字保留。）

## 加入文章的流程

当用户提到从某个特定的文件导入现有文章时，请遵循以下流程（期间参考已有文章的实现）

1. **定位源文件**：在用户指定位置（如桌面）找到外部 `.md`；含中文内容时按 chinese-encoding 规范以 UTF-8 读取。
2. **创建文章**：建 `src/content/posts/<yyyymmddhhmmss>/index.md`（目录名即 slug，硬规则见 `AGENTS.md` 的「文章 URL 硬规则」；`published` 必须与目录名对应）。
3. **代拟 frontmatter**：`title` 取原文 H1；`description` 按文中事实撰写；`category`/`tags` 对齐既有文章用法；`draft/private/views/comments/hotness` 给默认值。不设 `image` 时封面走 `getCover()` 的 hash 随机图兜底。
4. **迁移图片资源**：源文引用的本地图片（如 Typora 的 `typora-user-images`）复制到 `public/images/posts/<yyyymmddhhmmss>/`，正文图片路径重定向为 `/images/posts/<yyyymmddhhmmss>/<文件名>`。
5. **正文逐字保留**：不修错别字、不改标点/引号样式、保留原文主体示例；仅允许结构调整——原文 H1 移入 `title` 后正文不再保留（`[...slug].astro` 用 title 渲染 `<h1>`，重复会显示两次标题），以及第 4 条的图片路径重定向。
6. **逐字节校验**：用脚本 diff"原文（做过路径替换、去掉首行 H1）"与"新文件正文（剥掉 frontmatter）"，逐行严格比较确认零差异；发现差异必须改回与原文一致。
7. **头图（可选）**：你需要询问清楚用户关于文章的头图信息，例如，你可以从文中截图生成 `<主题>-cover.jpg` 放同图片目录——缩放至 1320×880、JPEG q85（详情页封面桌面最大显示 660 CSS px，`sizes` 见 `[...slug].astro`，×2 DPR = 1320；源宽 1320 > 1080×1.2，下次 build 命中 1080 档 WebP 变体 + LQIP；dev 环境直接显示原图属正常），frontmatter `image:` 指向它。
8. **GitHub 卡片（可选，文末裸仓库链接适用）**：`https://github.com/<owner>/<repo>` 改为 `::github{repo="owner/repo"}`（与既有文章同语法），随后运行 `pnpm fetch-repos` 增量拉取元数据缓存。**顺序坑**：先改文章、后拉缓存时，dev 的 content layer 会把"缓存缺失→回退链接"的渲染结果缓存住（即下方 ⚠️ 大坑警告在新增 `::github` 引用场景的表现）；对内容文件再做一次真实改动（如追加并收敛尾部换行）触发重渲染即可，remark 插件每次转换惰性读 JSON，无需重启 dev。文件尾部保持单个换行过 Prettier check。
9. **验证与提交**：提交前对 `src/` 下改动文件跑 `pnpm exec prettier --write`——lint.yml 只查 `./src`（根目录 AGENTS.md 不在内），手写 `index.md` 的 `*emphasis*`/`***bold-italic***` 会被 Prettier 归一化为 `_…_`/`_**…**_`（remark 管线语义等价转换，渲染输出不变，文字零变动，可直接放行）。提交后确认 Lint / Build and Check / Deploy 三条工作流全绿；dev 服务器请求 `/posts/<slug>/` 返回 200、HTML 含标题与图片引用、各图片 URL 返回 200；含 `::github` 引用时确认卡片为完整态（有 `github-card-name`、无 `github-card-error`——注意 dev 下样式表文本也含该类名，须查卡片标记而非全局字符串）；用户要求自行验证时不要代做浏览器检查以外的多余操作。
