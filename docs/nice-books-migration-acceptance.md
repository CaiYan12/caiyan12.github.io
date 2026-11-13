# Nice Books 博客侧迁移验收记录

日期：2026-11-13。基线 commit：`fd89f7e3baf16e1be01374c5da746ba787dc7162`。此记录覆盖博客仓库 #159 的本地实现与验收，不代表生产站切换或独立项目发布验收。工作区为 Windows 11、Node.js 24.18.0、pnpm 10.26.2。

## 结果

- 桌面和移动资源菜单共用 `src/config.ts` 的 `/nice-books/` 入口，保留 `noSwup`。博客 sitemap 保留新入口并排除整个 `/books/` 前缀。
- `/books/`、`/books/archive/` 与固定 ID `01`–`70` 共 72 个旧地址生成静态兼容页，映射到相同后缀的 `/nice-books/` 地址。跳转保留原 query 与 hash。ID 清单由博客自己的 `src/data/nice-books-legacy-ids.ts` 持有，不导入独立项目业务数据；兼容页不进入 Pagefind。
- 博客侧 Nice Books 业务实现、数据端点与专属 QA 已移除。已确认 `gsap` 是唯一专用依赖并移除；共享字体、Playwright、Swup 与构建依赖保留。
- 本次“延续现有搜索范围”按基线实测解释为 28 个路由：23 篇文章，加 `/about/`、`/diary/`、`/projects/`、`/skills/`、`/timeline/`。迁移后与基线集合完全相同，新增和缺失路由均为 0；`/books/` 与 `/nice-books/` 均未索引。此前“Pagefind 只收文章”的维护文档前提已按此测量纠正，没有改变博客搜索页面集合。
- 最终文档复核将样式审计页数说明改为从 `scripts/lib/smoke-pages.mjs` 的 `SHELL_PAGES` 与 `AUDIT_EXTRA_PAGES` 派生；当前命令说明不再将已移除的 `NICE_BOOKS_BASE_URL` 列为 pelican 对照。

## 本地验证

| 命令或判据                        | 结果                                                                                                                                                            | 本地原始证据                                                                                                                                          |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`  | exit 0；锁文件最新，跳过重新解析                                                                                                                                | `output/nice-books-migration/t6/frozen-install-final.log`                                                                                             |
| `pnpm check`                      | exit 0；184 files、0 errors、0 warnings、5 hints                                                                                                                | `output/nice-books-migration/t6/check-final.log`                                                                                                      |
| `pnpm build`                      | exit 0；229 Astro pages；Pagefind 1.6.0 索引 28 pages / 47,585 words；构建调用 6 条 `test:*` 命令（其中 `test:projects` 含两个阶段），合计 452 项通过、0 failed | `output/nice-books-migration/t6/build-final.log`、`build-final.exitcode.txt`                                                                          |
| `pnpm test:nice-books-ownership`  | exit 0；源码归属、固定 `01`–`70` 清单、72 个映射产物、Pagefind 忽略、数据端点移除及 sitemap 边界断言通过                                                        | `output/nice-books-migration/t6/ownership-final.log`、`ownership-final.exitcode.txt`                                                                  |
| Pagefind 产物集合比较             | 前后各扫描 230 个 HTML、28 个索引路由；集合完全相同，`added=[]`、`removed=[]`，兼容路由索引数为 0                                                               | `output/nice-books-migration/t6/pagefind-route-comparison.json`；前后路由分别见 `pagefind-body-routes-before.json`、`pagefind-body-routes-after.json` |
| `pnpm smoke:nice-books-migration` | exit 0；1280px 验证导航、首页/书库/详情旧址、中文 query/hash、浏览器后退及返回博客；390px 验证移动入口；pageerror 为 0                                          | `output/nice-books-migration/t6/smoke-final.log`、`smoke-final.exitcode.txt`                                                                          |
| 首页和搜索页基线对照              | 1440px / 390px 共 4 组；测量样式和盒尺寸、搜索结果与基线一致，0 pageerror、无横向溢出。导航的 noSwup 与外观不变，href 变为 `/nice-books/`                       | `output/nice-books-migration/t6/browser-baseline-comparison.json`；采集记录 `baseline-pages-before.json`、`baseline-pages-after.json`                 |

跨项目烟测使用 `NICE_BOOKS_DIST=D:\pages\nice-books\dist`，`MAIN_DIST` 默认指向博客 `dist/`。脚本在测试进程中将 `https://caiyan12.github.io/` 映射到本地同源服务；本次实测映射为 `http://127.0.0.1:2968/`，端口由本地服务动态分配。独立项目产物只挂在本地服务的 `/nice-books/` 路径下，其他请求由博客产物响应；非本地同源请求被拦截。该测试没有访问生产业务页面，也没有改变生产 URL 或博客构建依赖。

## 失败记录与边界

开发期间的 TDD 红测及浏览器测试夹具修正记录保留在本地 `output/nice-books-migration/t6/`，包括 `smoke-first-failed.log` 至 `smoke-fourth-failed.log`。最终构建后的首次 smoke 调用遗漏必需的 `NICE_BOOKS_DIST`，在启动浏览器前退出；原始日志保存在 `smoke-env-missing.log`，随后设置该变量的完整运行通过并记录于 `smoke-final.log`。该失败是命令环境缺失，不是兼容页面行为失败。

`output/nice-books-migration/t6/` 是本地验收证据目录，不随仓库提交。最终摘要保留关键命令、环境、结果和产物边界，便于本地日志清理后继续审查。此工作未执行 push、部署或 PR；票册状态由 lead 在双轴审查后更新，生产切换由后续阶段负责。
