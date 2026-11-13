# Nice Books 博客迁移与生产收尾

归档博客侧 Nice Books 迁移、生产切换与当前清理边界。业务源码、书目、当前设计及产品 QA 由独立仓库 `CaiYan12/nice-books` 维护。博客保留 `/nice-books/` 入口和 sitemap、过渡期 `/books/` 兼容跳转及归属检查。旧地址退役由后续单独任务安排。

## 交付结果

- GitHub issue #153 与 #154–#160 均已 CLOSED。博客 PR [#161](https://github.com/CaiYan12/caiyan12.github.io/pull/161) 已合并。
- 本次生产切换提交为 `b76d657544238bb0fa0b47dc7ff6853c82d4e260`。GitHub Pages run [43411464223](https://github.com/CaiYan12/caiyan12.github.io/actions/runs/43411464223) 与 deployment `7763262102` 均成功，二者 `headSha` / `sha` 与该提交相同。
- 真实生产浏览器旅程通过 **18/18**。公开 HTTP/hash 核验通过 **90/90**，其中 89 个 HTTP 200 页面或资源的响应体 SHA-256 与该 run 的 `github-pages` artifact 对应文件一致。旧 `/books/data.json` 端点按预期返回 404。
- 博客一般 `pnpm verify:live` 为 **29/29**。该判据检查博客通用线上内容，不替代独立项目的业务验收。

## 文档与证据

迁出前设计契约与博客迁移验收摘要从仓库根 `docs/` 移至本目录。使用以下命令可从生产合并提交逐字恢复原文。

```powershell
git show b76d657544238bb0fa0b47dc7ff6853c82d4e260:docs/nice-books-design.md
git show b76d657544238bb0fa0b47dc7ff6853c82d4e260:docs/nice-books-migration-acceptance.md
```

五份执行计划、评审及验收摘要逐字保存在 [`archive/raw/`](archive/raw/)。文件内容与 `D:/pages/myblog/output/nice-books-migration/` 下对应源文件的 SHA-256 和长度已逐一核对。

`archive/raw/` 以源文件字节校验为准，保留 `t7-plan.md` 原有的 EOF 空行。Git 属性仅对此目录关闭 `blank-at-eof` 检查，其余空白检查保持开启。

| 归档文件                     | 原始证据来源                                   |
| ---------------------------- | ---------------------------------------------- |
| `archive/raw/t6-plan.md`     | `t6/plan.md`                                   |
| `archive/raw/t7-plan.md`     | `t7/plan.md`                                   |
| `archive/raw/t7-review.md`   | `t7/review-summary.md`                         |
| `archive/raw/t7-browser.md`  | `t7/browser/browser-result.md`                 |
| `archive/raw/t7-artifact.md` | `t7/artifact-proof/run-43411464223/summary.md` |

完整原始证据仍保存在 `D:/pages/myblog/output/nice-books-migration/t6/` 与 `D:/pages/myblog/output/nice-books-migration/t7/`。浏览器旅程摘要在 `t7/browser/browser-result.md`。artifact 内容、公开响应 hash 与 90 项核验清单见 `t7/artifact-proof/run-43411464223/summary.md` 和 `verification.json`。博客一般线上检查记录在 `t7/verify-live.log`。证据搬迁账本保存在 `D:/pages/myblog/output/nice-books-closeout-2026-11-13/evidence-copy-summary.json` 和 `D:/pages/myblog/output/nice-books-closeout-2026-11-13/evidence-copy-manifest.json`。账本记录 2,793 个文件、1,030,971,754 字节，SHA-256 全部匹配。

## Git 与工作树清理实况

- 博客本地分支 `codex/nice-books-integration`、`codex/nice-books-t6` 及远端 `codex/nice-books-integration` 已删除。C 盘的 Nice Books T6 worktree 仍保留，当前为 `b76d657` 的 detached HEAD。归档工具因它是当前任务的 primary checkout 而拒绝移除。
- 独立项目五个迁移分支及空目录 `D:/pages/nice-books-worktrees/` 仍保留。清理命令被自动审批策略在进程启动前拒绝。
- 独立项目本地 `main` 为 `b602572`，比远端多一条文档提交。本次提交保持在本地，没有推送。

博客旧分支已清理，C 盘 worktree 尚待手动移除。独立项目五个分支及空目录仍待处理，手动清理清单见 `D:/pages/myblog/output/nice-books-closeout-2026-11-13/MANUAL-CLEANUP.md`。相关决定与归档索引见 [ADR 0017](../../adr/0017-nice-books-separate-deployment.md) 和[历史记录索引第八批](../history.md)。
