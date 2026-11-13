# Pages artifact 与公开响应核验

## 部署身份

- 仓库：`CaiYan12/caiyan12.github.io`
- 合并提交：`b76d657544238bb0fa0b47dc7ff6853c82d4e260`
- Pages run：`43411464223`（root 已核对 build/deploy 均 SUCCESS，`headSha` 一致）
- deployment：`7763262102`（success，`2026-11-13T10:46:45Z`，环境 URL 为 `https://caiyan12.github.io/`）
- artifact：`github-pages`，artifact ID `14030086241`

## Artifact 身份与安全解包

- artifact ZIP 为 `173,782,967` 字节，与 run 的 artifact 元数据大小一致；SHA-256：`e3136dd2755d2543a1fe0a045c0bfa437261de384c7b760b148f33dfb47d0bf5`。
- Range 能力探测返回 HTTP `206`、`Content-Range: bytes 0-0/173782967`、`Content-Length: 1`。随后 21 个连续、无重叠的字节区间全部返回 `206`，每段的 Content-Range、长度和 SHA-256 均通过。ZIP CRC 检查通过，包含 1 个 `artifact.tar`；tar 的 1,679 个成员均在目标目录内，符号链接及非普通文件被拒绝。安全解包后有 1,316 个文件。
- 两次整包请求未完成，原样保留为 partial 证据；转为分段下载后没有分段失败。详见 `download-attempts.jsonl`、`ranges/*.json`、`assembled-artifact.json`。
- 提取出的站点目录：`site/`；artifact 下载、ZIP 与 tar 路径检查结果见 `artifact-download.json`。

## 公开 URL 逐字节核验

- 共请求 90 个原始 URL，没有添加 query string：4 个代表页面（首页、关于、搜索、文章）、72 个旧 `/books/` 兼容页、2 个 sitemap 文件、11 个从代表页面 HTML 提取的同源 CSS/JS/字体资源，以及旧 `/books/data.json` 端点。
- 89 个页面与资源均 HTTP `200`，每个响应 body 的 SHA-256 都与该 run 的 `github-pages` artifact 对应文件完全相同。72/72 兼容页逐页通过；1 个旧数据端点因 artifact 中不存在而 HTTP `404`。总计 90/90 个请求通过预期状态和字节判据，0 个公开响应不匹配。
- 页面路径、状态、artifact expected hash、公开 actual hash、UTC 请求时间、run/commit 标识、响应头和最终 URL 均逐条记在 `http-requests.jsonl`；汇总见 `verification.json`。
- 所有 90 个响应的 `Age` 均为 `0`；89 个 200 响应的 `Cache-Control` 为 `max-age=600`。首页 `Last-Modified` 为 `2026-11-13 10:46:34 GMT`，比 deployment success 早 11 秒，但 homepage body SHA 与 artifact 完全相同；响应身份以字节比对为准。没有观察到旧缓存内容，因此没有公开 URL 重试。

## Artifact 内容判据

- 72 个兼容页都声明正确目标（`/nice-books/`、`/nice-books/archive/` 或对应详情 `/nice-books/NN/`），并设置 `data-pagefind-ignore="all"`。
- artifact 不含 `books/data.json`；公开端点 `/books/data.json` 返回 404。
- sitemap 含 `https://caiyan12.github.io/nice-books/`，没有 `/books/` 路径。
- 桌面 `#head-nav` 和移动 `#mmenu` 各有一个「每日好书」链接，href 均为 `/nice-books/`，且带 `data-no-swup`。
- artifact 的 Pagefind 1.6.0 manifest 记录 `zh-cn.page_count=28`；HTML 中符合索引条件的路由也有 28 条，与 t6 验收记录的完整路由集合一致，`/books/` 与 `/nice-books/` 兼容/独立路径均为 0。详见 `pagefind-metadata-check.json`。

## 失败尝试与边界

- `gh run download` 约 90 秒无可见目标文件进展后由本任务中止；这不是“网络零字节”的结论。
- 标准 artifact API 整包流式尝试 1 收到 63,193,088 字节后以 `unexpected EOF` 结束；attempt 2 在收到 29,241,344 字节时主动停止，以便切换到已验证的 Range 分段方式。两个不完整 ZIP 均保留，未用于验收。
- 公开端核验覆盖题定的代表页面、72 个兼容页、两个 sitemap、从代表 HTML 抽取的 11 个同源资源和旧数据端点；其余博客页面未逐页请求。本项未代替真实浏览器旅程，浏览器证据由联合验收的另一位执行者提供。

## 原始证据

- `artifact-download.json`
- `assembled-artifact.json`
- `verification.json`
- `pagefind-metadata-check.json`
- `http-requests.jsonl`
- `download-attempts.jsonl`
- `ranges/`
- `downloaded/github-pages.zip`
- `site/`
