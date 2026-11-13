# Nice Books T6 博客侧计划

基点：`fd89f7e3baf16e1be01374c5da746ba787dc7162`（2026-11-13 只读核对）

## 阶段 1：信息收集

- [x] 核对 #159 的范围与 #158 前置；#158 通过并收到 lead 的明确实施信号前不改产品代码。
- [x] 核对博客路由、导航、sitemap、Pagefind、样式审计和 Nice Books 专属代码/依赖。
- [x] 确认迁移基线下旧书籍 ID 为 `01`–`70`；后续兼容路由只依赖博客自身静态 ID 清单。

验收：改动边界、文件所有权、专用/共享依赖与验证路径已回报 lead。

## 阶段 2：改动前基线（lead 已授权；不改产品代码）

- [x] 核对隔离 worktree 的起点、包管理器版本、锁文件与现有 `dist` / `node_modules` 状态（SHA `fd89f7e3baf16e1be01374c5da746ba787dc7162`；pnpm 10.26.2；Node 24.18.0；安装前两目录均不存在）。
- [x] 冻结安装通过；`pnpm check` 退出码 0，206 files、0 errors、0 warnings、6 hints。
- [x] 基线构建 A、B：两次 `pnpm build` 均退出码 0；每次 229 Astro pages、sitemap、Pagefind 1.6.0 28 页 / 47,585 词。完整 B 日志 `build-b.log` 扫描 `SAFE_DELETE_` 为 0。
- [x] 同版噪声底线：A/B 各 1,324 个文件、230 HTML；146 个 HTML 有变化，剥除已知随机侧栏 `data-tab-widget` 后 HTML 差异 0，非 HTML 差异 0。结果见 `dist-noise-summary.json`。
- [x] 代表页浏览器基线：本地 preview `http://localhost:4322/`，1440×900 与 390×844 首页桌面/移动导航及搜索页面采集完成，0 pageerror、无横向溢出；截图与样式/DOM 记录见 `baseline-pages-before.json`、`screenshots-before/`。
- [x] 搜索索引基线：`pagefind-body-routes-before.json` 从本次 `dist` 的 230 份 HTML 核出 28 个可索引路由：23 篇 `/posts/.../` 与 `/about/`、`/diary/`、`/projects/`、`/skills/`、`/timeline/`。浏览器搜索 `TypeScript` 在桌面/移动均返回 12 条，包含文章及 `/projects/`、`/skills/`，没有旧书籍页。首次“只允许 `/posts/`”断言失败原始摘要保存在 `search-scope-discrepancy-initial.log`；按 lead 裁决，#159 保持该实测范围，迁移后对照 28 路由集合并排除 `/books/` 与 `/nice-books/`，当前维护文档应改为真实范围。
- [x] 构建快照恢复：受跟踪 JSON 以 `git show HEAD:<path>` 内容恢复并按该 checkout 的 CRLF 工作树约定落盘；恢复证据见 `snapshot-restore-evidence.json`，`git diff` 与状态均清洁。

验收：基线关联同一 SHA，构建和页面采集结果可复查；无源码或锁文件改动。

## 阶段 3：博客入口、兼容跳转与归属清理（完成）

- [x] 桌面与移动导航统一指向 `/nice-books/`，保留 `noSwup`。
- [x] 保留 `/nice-books/` sitemap 入口；旧 `/books/`、书库和 70 个详情地址保留兼容映射，并转发原 query 与 hash。
- [x] 删除博客持有的 Nice Books 业务页面、数据、组件、样式、客户端脚本及专属 QA；博客构建与兼容映射不依赖独立项目源码。
- [x] 只移除经调用方核验的专用依赖；保留博客共用字体、Playwright、Swup 与 Astro/Tailwind 构建依赖。
- [x] 更新边界检查、主站样式审计清单、README、GLOSSARY、当前 `docs/agents/` 维护说明及 CHANGELOG；保留历史记录和 `docs/nice-books-design.md`，标明其历史用途与独立项目权威位置。技术验收摘要见 `docs/nice-books-migration-acceptance.md`。

验收：博客源码/产物仅承担导航、兼容跳转与归属检查；Pagefind 保持基线实测的 28 路由集合（23 篇文章及 `/about/`、`/diary/`、`/projects/`、`/skills/`、`/timeline/`），旧 `/books/` 和 `/nice-books/` 均不收录；旧 ID 映射不导入独立项目实现。前后集合比较见 `pagefind-route-comparison.json`。

## 阶段 4：受影响验证（完成）

- [x] 最终 `pnpm install --frozen-lockfile` exit 0；`pnpm check` exit 0（184 files、0 errors、0 warnings、5 hints）；日志分别为 `frozen-install-final.log`、`check-final.log`。
- [x] 最终 `pnpm build` exit 0：229 Astro pages、Pagefind 28 pages / 47,585 words；构建调用 6 条 `test:*` 命令（`test:projects` 含两个阶段），合计 452 项通过、0 failed。日志 `build-final.log` 与 `build-final.exitcode.txt`。完整 `pnpm smoke:ui` 未运行；使用了定向页面与搜索回归。
- [x] 归属边界检查通过；固定 `01`–`70` 映射与 72 个兼容产物逐一匹配。主站 1440/390 首页和搜索页 4 组基线比较通过：测量样式/盒尺寸及搜索路由相同，0 pageerror，无横向溢出；导航视觉与 `noSwup` 保持，href 更新。证据 `ownership-final.log`、`browser-baseline-comparison.json`。
- [x] 本地同源浏览器旅程通过：`NICE_BOOKS_DIST=D:\pages\nice-books\dist`，博客 `MAIN_DIST` 默认 `dist`；测试专用 server 将 `https://caiyan12.github.io/` 映射到当次 `http://127.0.0.1:2968/`。1280px 验证入口、旧首页/书库/详情、中文 query/hash、history.back、返回博客；390px 验证移动入口。日志 `smoke-final.log`、`smoke-final.exitcode.txt`。
- [x] 文档旧引用、格式与最终 Git diff 复核；记录未覆盖的证明边界。联合 Prettier 检查及 `git diff --check` 均通过；完整 `pnpm smoke:ui` 未运行，生产与部署未验收。

验收：#159 本地验收项有可复查证据；不执行 push、部署或 #160 生产切换。生成物中的五份 snapshot JSON 已按 `git show HEAD:<path>` 恢复并核对，不纳入改动。

## 阶段 5：双轴审查与交接

- [x] 双轴审查完成：Standards 两处文档遗漏修正后复核剩余 0，Spec 初审与补充复核均 0。
- [x] 实现提交 `b185d512f9d084e23544345b8caceaba5ca8c9c8` 与审查修正 `f98bf4ce00f2694e53c120250ba5bb66a7da17c1` 已本地提交，并快进合入 `codex/nice-books-integration`；#159 已关闭，全部 AC 勾选。

验收：lead 可基于本地结果判断是否进入后续发布阶段。

## 当前交接状态

- #158 曾在主要线上取证完成后关闭，随后因补充的同架详情切页观察重新打开。2026-11-13，Swup 就绪后同架/01→/02 与 history.back 复核通过：documentUUID/timeOrigin 不变、document response 始终为 1，完整 Swup hooks；票已重新关闭，全 AC 勾选。证据见 [通过评论](https://github.com/CaiYan12/caiyan12.github.io/issues/158#issuecomment-6849250128)。#159 blockers 为 0，lead 已明确放行本地实施。
- 托管 worktree：`C:\Users\Einn Tzai\.codex\worktrees\nice-books-t6\myblog`；分支 `codex/nice-books-t6`；HEAD `f98bf4ce00f2694e53c120250ba5bb66a7da17c1`。本地集成分支已到相同提交。
- 阶段 3 代码、配置、包锁、边界测试与博客专属 smoke 已完成；文档 helper 已完成 README/GLOSSARY/CHANGELOG、指定 `docs/agents/` 与设计历史说明，技术验收摘要 `docs/nice-books-migration-acceptance.md` 已新增。联合 Prettier 与 `git diff --check` 已通过。
- 最终 evidence：build exit 0、ownership exit 0、migration smoke exit 0、check exit 0、frozen-lockfile install exit 0、Pagefind 集合 exact match。一次遗漏 `NICE_BOOKS_DIST` 的烟测启动失败已保留为 `smoke-env-missing.log`；更早 TDD/夹具失败也保留原始日志，不作为最终通过结果。
- `pnpm preview` 已停止，五份快照 JSON 已恢复。两个博客工作区干净；没有 push、部署、PR 或删除 worktree。保留当前 worktree 供站长审阅。
- #159 完成评论：https://github.com/CaiYan12/caiyan12.github.io/issues/159#issuecomment-6850450312。父 #153 已同步阶段三/四完成及搜索前提纠正；阶段五未完成。#160 为 OPEN、未完成前置数 0，停在站长单独授权生产发布之前。
