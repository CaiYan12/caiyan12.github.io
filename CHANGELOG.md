# 更新日志

## 2026-09-01：AI日报迁移

- 从 `D:\pages\test\ai-news` 迁移完整 React 运行时到本站 `/ai-news/`，保留 RSS 实时抓取、离线快照、搜索、筛选、阅读状态、主题、布局和橘鸦阅读风格。
- “本站资源”菜单在“我的项目”后新增“AI日报”；AI日报顶栏和页脚均提供“返回主站”。
- AI日报保持独立页面外壳，不加载博客导航、侧栏、Pio、樱花背景或 Colorful 页脚；页面进入 sitemap，不进入 Pagefind 博客搜索。
- 新增 `pnpm smoke:ai-news` 作为本站可执行的基础 Smoke 验证命令。
- 详细测试记录：[`docs/ai-news-migration-test.md`](docs/ai-news-migration-test.md)。

## 2026-08-31：博客文章正式测试

### 测试范围

- 仓库：`CaiYan12/caiyan12.github.io`
- 测试基线：`1126198ac729db6051e55594e4d75358198277f0`
- 测试方式：Windows PowerShell 本地构建产物、Chromium 实际浏览器、GitHub Pages 线上页面
- 本地预览：`http://127.0.0.1:4321/`
- 线上站点：`https://caiyan12.github.io/`
- 浏览器视口：桌面 `1366×900`，移动端文章页 `390×844`
- 文章样本：公开文章、私密文章、草稿、Markdown 扩展测试文章、Mermaid 测试文章

本记录验证文章的构建、路由、渲染和交互，不对文章正文中的知识内容或题目答案作事实审阅。

### 构建与自动化检查

| 检查项                             | 结果                                                 |
| ---------------------------------- | ---------------------------------------------------- |
| `pnpm exec prettier --check ./src` | 通过，所有文件格式匹配                               |
| `pnpm check`                       | 通过，0 errors、0 warnings、0 hints                  |
| `pnpm build`                       | 通过，构建 49 个页面                                 |
| Pagefind                           | 通过，索引 9 个页面、1790 个词                       |
| GitHub Actions 基线运行            | Lint、Build and Check、Deploy to GitHub Pages 均成功 |

构建输出仍有 Vite 单个大 chunk 警告；Pagefind 仍提示中文不支持 stemming。二者均未导致构建失败。

### 文章功能验证

| 场景                            | 验证结果                                                                            |
| ------------------------------- | ----------------------------------------------------------------------------------- |
| 首页公开文章列表                | 通过，HTTP 200，显示 4 篇公开文章；私密帖和草稿标题均未出现在首页                   |
| 公开文章 `/posts/20260402161000/` | 通过，HTTP 200，文章正文、目录、版权区域正常                                      |
| 文章字号调节                    | 通过，点击字号控件后正文样式变为 `font-size: 14px; line-height: 1.9;`               |
| 私密文章 `/posts/20240115000000/` | 通过，HTTP 200，可通过直链访问                                                  |
| 草稿 `/posts/20220701000000/`    | 通过，HTTP 404，未生成文章内容                                                   |
| Markdown 提示块                 | 通过，渲染 2 个容器提示块和 2 个 GitHub 风格 alert                                  |
| GitHub 仓库卡片                 | 通过，2 个卡片均完成 API 加载并显示仓库名称                                         |
| 图片网格                        | 通过，3 个网格分别渲染为 4、2、2 列，图片均加载成功                                 |
| 外链与站内链接                  | 通过，外链带 `target="_blank"` 与 `rel="noopener noreferrer"`；站内链接不带外链属性 |
| 邮箱保护                        | 通过，链接使用 `data-encoded-email` 和点击解码脚本，HTML 未直接暴露邮箱地址         |
| Spoiler                         | 通过，点击后 class 从 `spoiler` 变为 `spoiler revealed`                             |
| Mermaid                         | 通过，6 个 Mermaid 代码块均渲染出 SVG                                               |
| Pagefind 搜索                   | 通过，搜索“数据库原理”返回 4 条结果，无错误信息                                     |
| 移动端文章页 `390×844`          | 通过，HTTP 200，无横向溢出                                                          |

本地浏览器网络检查中，文章、Pio 模型资源、Pagefind 资源和 GitHub API 请求均返回成功。草稿 URL 的 404 请求属于本次预期验证结果。

### Pio 验证与已知限制

- `1366×900` 首次打开首页：通过，`Paul_Pio` 和 `Live2D` 均已加载，Canvas 尺寸为 `280×250`。
- `1280px` 默认视口：按 `pioConfig.hiddenOnMobile` 配置隐藏，Pio 库不初始化。
- 页面先以 `1280px` 打开、再调整到 `1366px`：当前实现不会重新触发初始化，Pio 仍未加载；刷新页面后恢复正常。

上述响应式切换限制位于 `src/components/widget/Pio.svelte` 的一次性初始化逻辑中，属于后续可单独处理的交互问题，不影响本次文章构建和文章页面测试结论。

> **2026-08-31 销项**：该限制已修复（提交 `171f3be`）。`onMount` 改用 `matchMedia("(max-width: 1280px)")` 的 `change` 监听，窄屏起载后首次拉宽到超过 1280px 时补一次初始化，`pioInitialized` 守卫防止重复实例化。本地 Playwright 与线上复验均通过：1280px 打开后拉宽到 1366px 时脚本加载、`Paul_Pio` 初始化、Canvas 为 `280×250`；宽窄来回切换不重复加载；宽屏直接加载行为不变。

### GitHub Pages 线上验收

本次更新日志首次推送提交 `2b418c6a2eaab9b20fee7043ff18ee6c80ac8bce` 后，远端确认如下：

- [`CHANGELOG.md`](https://github.com/CaiYan12/caiyan12.github.io/blob/main/CHANGELOG.md) 已存在于 GitHub `main`。
- [Lint](https://github.com/CaiYan12/caiyan12.github.io/actions/runs/33372277525)、[Build and Check](https://github.com/CaiYan12/caiyan12.github.io/actions/runs/33372277628)、[Deploy to GitHub Pages](https://github.com/CaiYan12/caiyan12.github.io/actions/runs/33372277557) 均为 `completed / success`。
- 线上首页 HTTP 200，显示 4 篇公开文章，私密帖和草稿标题未出现在首页；`1366×900` 首次加载时 Pio 的 `Paul_Pio`、`Live2D` 均加载成功，Canvas 为 `280×250`。
- 线上公开文章 `/posts/20260402161000/` HTTP 200，标题、正文和目录正常；私密文章 `/posts/20240115000000/` HTTP 200；草稿 `/posts/20220701000000/` HTTP 404；线上 Pagefind 搜索“数据库原理”返回 4 条结果且无搜索错误。
- 线上 Markdown 扩展文章 HTTP 200，提示块、alert、图片网格、外链属性、邮箱保护和 Spoiler 结构正常；Mermaid 文章的 6 个图表均渲染出 SVG。
- 线上两个 GitHub 仓库卡片请求返回 HTTP 403，响应正文明确为 `API rate limit exceeded for 4.154.77.32.`，响应头为 `x-ratelimit-limit: 60`、`x-ratelimit-used: 60`、`x-ratelimit-remaining: 0`。页面按既有降级逻辑显示仓库信息加载失败链接；这是未认证 GitHub API 的 IP 限流，需后续决定是否改为构建期数据或带认证的服务端代理。

> **2026-08-31 销项**：已按"构建期数据"方案修复。新增 `scripts/fetch-github-repos.mjs` 在构建期拉取仓库元数据并缓存到 `src/constants/github-repos.json`（令牌解析顺序：`GITHUB_TOKEN`/`GH_TOKEN` 环境变量 → `gh auth token` → 匿名；拉取失败仅告警），`remark-extended.mjs` 改为构建期直接渲染完整卡片 HTML，客户端 `renderGithubCards()` 已移除——页面不再请求 `api.github.com`，访客 IP 限流问题随之消除。CI 的 build 与 deploy 工作流已注入 Actions 自动提供的 `GITHUB_TOKEN`。首次部署后线上仍短暂显示旧占位符，排查实锤为 `withastro/action@v6` 默认 `cache: true` 跨 run 缓存 `node_modules/.astro`（Astro content layer 数据存储），导致 CI 复用旧渲染产物；已在 `deploy.yml` 传 `cache: false` 关闭（提交 `82f966d`）。

因此，线上文章本身已发布并可用；GitHub 动态仓库卡片在本次线上浏览器环境中处于降级状态，不能记录为完整通过。

### 结论

当前提交的博客文章构建、公开/私密/草稿路由、Markdown 扩展、搜索及移动端文章布局均通过本次正式测试，并已完成 GitHub Pages 发布验收。GitHub 动态仓库卡片的线上未认证 API 限流降级已于 2026-08-31 改为构建期数据方案修复（见上文销项）；Pio 的视口切换限制已于 2026-08-31 由提交 `171f3be` 修复并经线上复验销项（见上文）。
