# AI日报原生迁移测试记录

- 日期：2026-09-01
- 项目：WindowsIt's Music Club（Astro）
- 页面：`/ai-news/`
- 范围：构建与基础链路验收，不扩展为完整交互回归。

## 本地检查

| 检查项 | 命令或证据 | 结果 |
| --- | --- | --- |
| Astro 类型检查 | `pnpm check` | 通过：0 errors、0 warnings；1 个既有 hint |
| 源码格式检查 | `pnpm exec prettier --check ./src` | 通过 |
| 生产构建 | `pnpm build` | 通过：60 个页面、Pagefind 11 个页面 |
| 工作区差异检查 | `git diff --check` | 通过 |
| 构建产物 | `dist/ai-news/`、快照、sitemap、Pagefind | 通过：页面、快照、sitemap 与 Pagefind 文件均存在 |
| UTF-8 | 中文源码、文档与快照读取检查 | 通过 |

## AI日报 Smoke 覆盖

执行命令：`pnpm smoke:ai-news`

- 主站 `/` 的“本站资源”中存在“AI日报”入口。
- AI日报页面标题、首屏 RSS/快照内容和顶部“返回主站”入口。
- 首条资讯进入 hash 详情页，详情页“返回”回到首页 hash。
- 页脚“返回主站”链接指向 `/`。
- 阻断 RSS 请求时仍能显示 `juya.xml` 离线快照。

结果：通过，9/9 项断言通过，未发现控制台错误。

## 发布与线上检查

发布方式：本地预检后直接提交并推送 `main`，观察现有 Build、Lint、Deploy 工作流。

线上目标：`https://caiyan12.github.io/ai-news/`

| 检查项 | 结果 |
| --- | --- |
| GitHub Actions | 功能提交 `3f9ade87aaa410cad3280961c3b9941eb59aea11`：Build and Check、Lint、Deploy 均通过；Build and Check 按现有 main push 条件仅执行 Astro Check |
| 页面 HTTP 状态、标题与资源加载 | 通过：主站与 AI日报均 HTTP 200；`Last-Modified: Tue, 01 Sep 2026 07:49:51 GMT`；浏览器同源响应无 4xx/5xx 或请求失败 |
| 主站 AI日报入口、页面顶部/页脚返回主站 | 通过：线上浏览器检查入口、标题、顶部返回和页脚返回 |

对应工作流：

- [Build and Check run 33483950684](https://github.com/CaiYan12/caiyan12.github.io/actions/runs/33483950684)
- [Lint run 33483950655](https://github.com/CaiYan12/caiyan12.github.io/actions/runs/33483950655)
- [Deploy to GitHub Pages run 33483950670](https://github.com/CaiYan12/caiyan12.github.io/actions/runs/33483950670)
