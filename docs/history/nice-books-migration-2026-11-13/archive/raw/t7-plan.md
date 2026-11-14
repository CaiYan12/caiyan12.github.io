# Nice Books T7 发布与联合验收

本轮用户显式调用 implement #160，授权该票的博客生产发布和联合线上验收。本轮覆盖发布所需的实施与 PR 合并步骤。

博客发布前远端 main 经 GitHub API 查询为 `550c3da9d0808cf3d55f8c2aa53b8b29fc520e19`，本地待发布分支为 `codex/nice-books-integration`，目标头提交为 `f98bf4ce00f2694e53c120250ba5bb66a7da17c1`。

## 阶段一　核对前置和发布内容

- [x] #159 CLOSED，#160 OPEN，未完成前置为 0。
- [x] 两个博客工作区干净，待发布区间只有迁移文档、归属清理和审查修正三笔提交。
- [x] 独立项目远端 main 为 `10f6a4edf7a482647d116834cfb8185f02b5b7a4`，#158 的通过先于本轮发布。

验收要求是授权、来源和发布范围可复查。

## 阶段二　PR 与发布前审查

- [x] 迁移分支已推送，PR #161 合并并保留原迁移提交历史。
- [x] PR 的 Astro Check、Astro Build 和 Prettier Check 均通过，关联头提交 `f98bf4ce00f2694e53c120250ba5bb66a7da17c1`。
- [x] 两名新上下文代理完成审查，Standards 与 Spec 均为 0 项发现。

验收要求是目标 diff 审查通过，检查关联具体提交。

## 阶段三　生产发布与生效

- [x] 2026-11-13T10:44:51Z 合入 main，实际提交为 `b76d657544238bb0fa0b47dc7ff6853c82d4e260`，合并树与审查版本相同，本地 main 已同步。
- [x] Pages run `43411464223` 的 build、deploy 成功，对应上述 SHA。Deployment `7763262102` 同 SHA，于 2026-11-13T10:46:45Z 记录 success。
- [x] 精确 run 的 artifact 下载与 ZIP CRC 通过，89 个公开 HTTP 200 页面/资源 SHA-256 相同，旧数据端点为预期 404，共 90/90 判据通过，72 个兼容映射全部通过。
- [x] 真实线上浏览器旅程 18/18 通过，桌面与移动入口、独立站导航和返回、直开刷新、中文参数与锚点、Swup 及真实 404 都有记录。证据为 `browser/browser-result.md` 与 `browser/online-journey.json`。

验收要求是 #160 中的往返、旧址、参数和刷新要求在线上成立。

## 阶段四　结果记录

- [x] Spec 代理核对最终部署、浏览器和 artifact 证据，确认全部 AC 有证据，无剩余缺项。
- [x] #160 全部 AC 勾选，2026-11-13T11:25:21Z CLOSED。父 #153 阶段五已勾选，七张子票全部关闭，父票于 11:25:38Z CLOSED。
- [x] main 发布 SHA、Actions、deployment、Git 状态和本地证据入口已记录于 #160 完成评论。

旧地址退役依后续站长任务安排。验收记录归档到本目录及 GitHub 票面。

现有 `pnpm verify:live` 已在真实生产地址执行，29/29 通过，退出码 0。日志为 `verify-live.log`，部署元数据和完整日志为 `pages-run.json`、`deployments.json`、`deployment-statuses.json` 与 `pages-run.log`。

#160 完成评论为 https://github.com/CaiYan12/caiyan12.github.io/issues/160#issuecomment-6851434225，父票收尾评论为 https://github.com/CaiYan12/caiyan12.github.io/issues/153#issuecomment-6851441281。工作区和证据目录保留供站长查看。

