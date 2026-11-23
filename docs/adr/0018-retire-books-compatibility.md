# 0018：退役 /books/ 旧地址兼容层

2026-11-23。替代 [0017](0017-nice-books-separate-deployment.md) 中「过渡期保留 `/books/` 兼容跳转」的临时安排。

## 背景

ADR 0017 于 2026-11-13 把 Nice Books 迁为独立项目，博客保留 `/books/`、`/books/archive/` 与 `/books/01/`–`/books/70/` 共 72 个静态兼容页，并写明「旧地址退役由后续博客遗留代码清理任务安排」。迁移与生产验收完成后，这层兼容页成为博客里唯一为已迁出业务保留的运行时产物：它依赖 `src/data/nice-books-legacy-ids.ts` 的 70 个 ID、跳转组件、归属测试，以及一条只验证旧地址旅程的 smoke。

## 决定

- 删除 3 条兼容路由、跳转组件与 70 个 ID 清单；旧 `/books/*` 地址返回站内 404。
- 删除 `smoke:nice-books-migration` 与 `scripts/nice-books-migration-smoke.mjs`；它验证的旧地址旅程已不存在。
- `test:nice-books-ownership` 保留并改为**退役守卫**：断言兼容层源码、脚本与产物不再出现，同时继续守护 sitemap 的 `/nice-books/` 入口与 Tailwind 无 `nb` 色板。
- `astro.config.mjs` 的 sitemap 移除 `/books/` 前缀过滤（该路径已不存在）。
- 博客继续保留 `/nice-books/` 导航（`noSwup: true`）与 sitemap 地址；这部分属于 ADR 0017 的保留面，不随本决定移除。

## 被否掉的方案

1. **404 页兜底跳转**：在 `404.astro` 识别 `/books/*` 再跳到 `/nice-books/*`。旧链接仍可用，但需要一段只为历史路径存在的特判，且 GitHub Pages 对不存在的路径仍返回 404 状态；兼容层退役的目的就是减少这类常驻特判。
2. **只删 70 个书目页，保留两条入口跳转**：影响面最小，但留下两条仍需维护的兼容路由与对应测试分支，退役不彻底。
3. **继续保留全部兼容页**：与 ADR 0017 已写明的后续退役安排冲突，且每次构建都多出 72 页只含跳转脚本的产物。

## 代价与边界

- 旧 `/books/` 链接（含外部引用与历史分享）从 2026-11-23 起返回 404，不再转发 query 与 hash；需要旧地址时改走 `/nice-books/`。
- 兼容页本就未进入 sitemap 与 Pagefind 索引，本次不改变搜索基线。
- 归属检查仍守着「博客不重新引入 Nice Books 业务源码」；退役不等于移除入口，导航与 sitemap 保留。

## 守卫

- `pnpm test:nice-books-ownership`：源码目录、脚本、依赖、`astro.config.mjs` 与 sitemap 的断言。
- `pnpm build`：删除路由后构建不再产出 `dist/books/`，测试在产物上复核。
