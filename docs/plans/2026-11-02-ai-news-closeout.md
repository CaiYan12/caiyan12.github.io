# AI 日报迁移收尾

目标：AI 日报移植已完成，主站不再包含其实现；清理遗漏配置与当前文档，并写入项目记忆。

依据：站长 2026-11-02 本轮要求、迁移清理提交 `e683da0`、ADR 0009。

## 阶段一：核对归属与残留

- [x] 检索源码、配置、脚本、文档与文件名，区分当前实现、独立项目入口和历史记录。
- [x] 核对 ADR 0009：保留桌面/移动导航及 sitemap，不把入口误删为实现残留。
- [x] 确认 Tailwind 日报 token 无消费者；无 JSX/TSX 源码；OG 图仅使用 `ReactNode` 类型。
- [x] 执行修改前 `astro build`，留存 CSS 产物摘要作为对照。

验收：每项拟清理内容都有当前源码证据，历史记录与独立项目不受改写。

## 阶段二：最小清理与文档同步

- [x] 移除 `tailwind.config.cjs` 中日报的 `--t-*` 映射及 `tsconfig.json` 的 React JSX 设置。
- [x] 移除无运行时消费者的 `react`，同步 lockfile；保留 OG 图需要的 `@types/react`。
- [x] 更新 README、GLOSSARY、相关 `docs/agents/`、冒烟脚本注释与历史 ADR 的替代提示。
- [x] 强化已有 ownership 检查，覆盖源目录及整个日报产物目录；保留入口与 sitemap 检查。
- [x] 更新 CHANGELOG 与 AGENTS 可编辑区，明确迁移完成和主站维护边界。

验收：当前指南不再把日报列为本项目实现；历史日志、文章、项目展示和迁移依据保留。

## 阶段三：验证、记忆与复核

- [x] `pnpm check`、`pnpm test:lib`、变更文件 Prettier 检查、`git diff --check`。
- [x] 修改后 `astro build` 成功，CSS 与基线逐字节一致，OG PNG 正常生成。
- [x] `pnpm test:ai-news-ownership` 通过；以临时目录注入日报文件确认检查会失败。
- [x] 本地 preview + `pnpm smoke:ai-news`，验证桌面/移动入口。
- [x] 全量复搜旧口径，逐项确认剩余引用用途。
- [x] 写入项目记忆及 Codex 记忆追加记录，记载本轮实际结果与边界。

验收：以上检查均有本轮输出；未提交、推送或发布；未更改独立项目及 stash。

## 本轮证据（2026-11-02，Windows 本地）

- 修改前/后 `NODE_USE_ENV_PROXY=1 pnpm exec astro build` 均 exit 0，229 页；完整日志分别在 `output/ai-news-closeout-before-build-network.log`、`output/ai-news-closeout-after-build.log`。本轮仅重建产物，不运行 `pnpm build` 中的联网数据刷新链。
- `output/ai-news-closeout-before-css.json` 与修改后全部 CSS 的路径/摘要一致（12 份）；33 张 OG PNG 均经 sharp 解码验证为 1200×630。结果在 `output/ai-news-closeout-verification.json`，由 `output/ai-news-closeout-verify.mjs` 生成；该脚本同时核对 AGENTS 固定区原文未变。
- `pnpm check` exit 0，0 error / 0 warning / 6 hints；`TEMP` / `TMP` 指向 `output/ai-news-closeout-temp` 后 `pnpm test:lib` 16/16。
- `pnpm test:ai-news-ownership` exit 0。变异证据目录见上述 JSON 的 `fixture` 字段：只有 sitemap 时检查通过，加入 `ai-news/unexpected.txt` 后 exit 1，报 `main build must not publish any AI news files`；未改动真正的源目录或独立项目。
- 本机 preview `http://localhost:4323/` 返回 HTTP 200；以该地址设置 `MAIN_SITE_URL` 后 `pnpm smoke:ai-news` 在无窗口 Chromium 下 1280px / 390px 两档均通过（入口数量、`data-no-swup`、pageerror）。未启用 `AI_NEWS_INTEGRATION_LIVE`，不声称本轮验证了独立项目内的旅程。
- 变更范围的 Prettier 检查与 `git diff --check` 均 exit 0；README、CHANGELOG 和 AGENTS 沿用已有排版，仅作必要内容修订。项目记忆索引 `.codex/memories/index.md`、迁移完成记录及 Codex `extensions/ad_hoc/notes/2026-11-02-myblog-ai-news-migration-complete.md` 已写入并回读验证；AGENTS 已给出索引入口。

## 残留引用的归类

- 保留：`src/config.ts` 导航、`astro.config.mjs` sitemap，以及 `scripts/ai-news-smoke.mjs` / `scripts/ai-news-ownership.test.mjs` 的集成与归属检查。
- 保留：ADR 0001 原文（新增 ADR 0009 替代提示）、ADR 0009、CHANGELOG 与 history 索引、README 明确冻结的迁移前评估、微言碎语和个人项目展示；它们不是日报实现文件。
- 已更新：README、GLOSSARY、AGENTS、`docs/agents/`、通用测试 fixture 与脚本注释；历史索引的独立性能基线仅注明归档时状态，当前进度归独立项目核对。
- 无实现残留：`src/ai-news`、`src/pages/ai-news`、`public/ai-news`、`dist/ai-news` 均不存在；根运行时不再安装 `react`，保留的 `@types/react` 有 OG 图类型消费者。

## 遇到的失败路径

- 沙箱字体 DNS `ENOTFOUND`：读取完整构建日志后，使用可联网的本机环境构建，未修改字体策略。
- pnpm 10.26.2 的 `remove` 不接受 `--offline` / `--ignore-scripts`；改为对清单与 lockfile 作最小删除，再用 `pnpm install --frozen-lockfile --offline --ignore-scripts --store-dir .pnpm-store` 验证并同步安装。未冻结的离线安装尝试因缺少 postcss 元数据失败，不用于验证结论；冻结安装仅移除 `react 19.2.8`，exit 0。
- 默认沙箱临时目录 rename `EPERM`：工作区内临时目录可通过原测试，无需改测试或原子写入实现。
- 沙箱虚拟用户目录无浏览器缓存；本机浏览器不能访问沙箱 preview 端口。使用同一本机环境的已有浏览器与临时 preview 端口 4323 后，HTTP 与入口检查通过；未下载或安装新浏览器。
