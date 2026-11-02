# AI News 迁出后的构建系统升级复核

> 本文保留实施前的研究快照；同日后续已执行升级，当前版本、构建 A/B 和浏览器结果以 [Astro 7 实施验收](2026-11-02-astro7-upgrade.md) 为准。下文“未升级”描述的是本次复核阶段。

日期：2026-11-02。任务范围：重新检查升级信息、依赖声明与既有阻塞；**本轮未升级主站依赖，也未执行目标版本的构建或浏览器验收**。

## 结论

AI News 的 React 页面集成已退出主站升级范围，可以重新开展 Astro 7 的实施验证。当前 Astro 6.4.8 已是 6.x 最新稳定版，npm `latest` 为 7.4.4；不能仅把 Astro 一包改为最新版，也不能全包追 `latest`。[Astro 发布元数据](https://registry.npmjs.org/astro)

最小联动组已在独立临时 workspace 中通过 `--strict-peer-dependencies` 的 lockfile 解析；这证明该版本组可以完成依赖声明解析，**尚不证明原生包安装、项目编译、页面视觉或交互兼容**。Prettier 的数学公式改写问题本轮在 3.9.10 仍可复现，因此保留当前 3.9.6。

## 本轮阶段与验收

- [x] 阶段一：从 `package.json`、实际安装、配置、工作流与旧记录建立基线。验收：区分声明范围与安装版本，确认 React 页面集成已移除，保留上一轮未提交修改。
- [x] 阶段二：用 Context7、官方迁移指南、标签源码与 npm 官方 registry 核对版本。验收：目标版本、Node 要求及 peer 范围均有原始来源。
- [x] 阶段三：在独立临时 workspace 解析联动组；内存对比新旧 Prettier 并验证数学样例。验收：真实生成目标 lockfile、没有安装临时 `node_modules`、没有写回文章或修改主站依赖。
- [x] 阶段四：记录结论、验证边界与实施入口，检查新增文档格式和差异。验收：本报告与 `docs/agents/build-and-deploy.md`、CHANGELOG 同步，原有版本仍为主站现状。

本轮为研究与文档变更，未以旧版本的测试或构建冒充新版验证；不需要为文档改动重跑原版本构建。

## 最小联动组

“当前”来自本轮 `pnpm list --depth 0 --json`，不是 `package.json` 范围的下界。

| 包                                             | 当前安装 | 本次建议验证目标 | 依据                                                  |
| ---------------------------------------------- | -------- | ---------------- | ----------------------------------------------------- |
| `astro`                                        | 6.4.8    | 7.4.4            | 新稳定主版本；Vite 8 / Rust 编译器                    |
| `@astrojs/svelte`                              | 8.1.2    | 9.1.2            | 当前 peer 为 Astro `^6.0.0`；目标为 `^7.0.0`          |
| `@astrojs/markdown-remark`                     | 7.2.0    | 7.3.5            | Astro 7.4.4 的可选 peer 为 `^7.3.0`，本站显式使用此包 |
| `astro-expressive-code`                        | 0.43.1   | 0.44.3           | 目标 peer 明确包括 Astro `^7.0.0`                     |
| `@expressive-code/plugin-collapsible-sections` | 0.43.1   | 0.44.3           | 与 Expressive Code 同批验证                           |
| `@expressive-code/plugin-line-numbers`         | 0.43.1   | 0.44.3           | 与 Expressive Code 同批验证                           |

来源：[Astro](https://registry.npmjs.org/astro)、[Svelte 集成](https://registry.npmjs.org/%40astrojs%2Fsvelte)、[Markdown 处理器](https://registry.npmjs.org/%40astrojs%2Fmarkdown-remark)、[Expressive Code](https://registry.npmjs.org/astro-expressive-code)、[折叠插件](https://registry.npmjs.org/%40expressive-code%2Fplugin-collapsible-sections)、[行号插件](https://registry.npmjs.org/%40expressive-code%2Fplugin-line-numbers)。

保持当前 Svelte 5.56.8、TypeScript 5.9.3、Tailwind 3.4.19、Prettier 3.9.6、pnpm 10.26.2 即可完成本轮严格解析；无须为了 Astro 7 同时升级这些包。Vite 由 Astro 依赖管理，不在主站额外添加直接版本钉。

## 环境要求

- Astro 7.4.4 实际声明 `engines.node: ">=22.23.4"`，本地 Node 24.18.0 满足。**不要套用 v7 初版指南的 22.12.0 或 7.4 博客的 22.22.0**；以目标发布包元数据为准。[7.4.4 标签源码](https://raw.githubusercontent.com/withastro/astro/astro%407.4.4/packages/astro/package.json)、[7.4 发布说明](https://astro.build/blog/astro-740/#updated-minimum-nodejs-version)
- `.github/workflows/build.yml` 使用浮动 `node-version: 22`；不能仅凭主版本判定不满足，也不能证明实际 runner 补丁满足。实施时核对 runner 版本，或将检查/构建统一至与本地和 Pages 一致的 Node 24；本轮未改工作流。
- `.github/workflows/deploy.yml` 固定的 `withastro/action` SHA `e84f40bd8d2caa9e768ec82ad30dd81f0b280853` 的实际 `action.yml` 默认 Node 为 24，不只依赖本地注释。[该 SHA 的 action.yml](https://raw.githubusercontent.com/withastro/action/e84f40bd8d2caa9e768ec82ad30dd81f0b280853/action.yml)

## 旧阻塞的重新归类

| 事项                                              | 本轮裁定                                                                                                                   |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| AI News 的 React 集成、页面和专用 Tailwind token  | 已退出主站范围；不再作为主站升级前置条件。OG 的 `@types/react` 是类型消费者，不恢复 React 页面集成                         |
| 当前 Svelte / Markdown / Expressive Code 版本声明 | 需要以上联动组；新版已有对应声明，临时严格解析通过                                                                         |
| 默认 Markdown 管线改为 Sätteri                    | **不是必须重写本站插件的阻塞**。官方继续提供 `unified()`；本站已显式使用 `markdown.processor: unified(markdownPipeline())` |
| 旧 `@astrojs/tailwind`                            | 仍不恢复；npm 最新 6.0.2 的 Astro peer 仍仅 `^3.0.0                                                                        |     | ^4.0.0 |     | ^5.0.0`，主站已有的 PostCSS 直连路线继续保留 |
| Prettier 最新版                                   | **本轮确认仍受阻**：3.9.10 会破坏现有文章公式，独立于 AI News                                                              |
| Tailwind 4                                        | 独立迁移，不与 Astro 7 捆绑；主站与 Nice Books 仍使用 v3 指令、配置与层叠约定                                              |
| Swup 1.8.0                                        | 最新仍为 1.8.0，未声明 Astro peer；没有据此证明不兼容，仍需真实切页回归                                                    |

来源：[Astro v7 迁移指南](https://docs.astro.build/en/guides/upgrade-to/v7/)、[旧 Tailwind 集成发布元数据](https://registry.npmjs.org/%40astrojs%2Ftailwind)、[Swup 发布元数据](https://registry.npmjs.org/%40swup%2Fastro)。历史上 Astro 5→6 的 Tailwind 集成硬阻碍、React 当时的兼容实测仍按原日期保留；不将不同轮次的限制合并为一个原因。

## 实施前仍需处理或验证的变化

1. **HTML 空白**：Astro 7 的 `compressHTML` 默认从 `true` 改为 `'jsx'`；本站未显式配置。下一轮优先评估显式 `compressHTML: true` 以保留旧语义，再验证相邻行内元素的空格。[官方变化说明](https://docs.astro.build/en/guides/upgrade-to/v7/#new-default-whitespace-handling-compresshtml-jsx)
2. **编译与压缩**：Rust 编译器、Vite 8 的 Rolldown/Oxc/Lightning CSS 会影响产物。`astro.config.mjs` 的 `vite.esbuild.drop` / `pure` 需要迁移或证明等效，不能假定新版自动保持日志和 debugger 的剔除效果；即使 Tailwind 3 不变，也要比较样式。[Vite 迁移指南](https://vite.dev/guide/migration)
3. **Markdown 顺序**：保留 `src/plugins/pipeline.mjs` 的中文强调、数学、directive、图片网格、章末小结与标题锚点顺序；检查 Expressive Code 注入后的实际产物。Astro 7 使用可选 Markdown peer，不继续机械套用 Astro 6“直接依赖硬钉 7.2.0”的对齐理由。
4. **运行时**：Svelte 水合与销毁、Swup 切页/后退、dev 下 `persistAssets`、代码块、Fancybox、Pagefind、天气与壁纸挂件均须按现有契约验收。当前严格解析无法覆盖这些行为。
5. **缓存和可选特性**：保留现有 content layer 缓存清理与部署 `cache: false`；不同时启用增量构建或并行预渲染实验，以免扩大回归面。

Tailwind 4 还要求独立 PostCSS/Vite 插件、替换 `@tailwind` 指令、显式加载旧 JS 配置，并改变真实 CSS 级联层、部分 utility 和 Preflight。当前 `src/styles/global.css`、`src/nice-books/styles/books.css` 均有 v3 指令与 `@layer`，故 AI News 迁出不会消除这些差异。[Tailwind 官方升级指南](https://tailwindcss.com/docs/upgrade-guide)

## 其他升级信息（不是本轮联动要求）

| 包                      | 当前安装 → npm latest | 处置建议                                                                             |
| ----------------------- | --------------------- | ------------------------------------------------------------------------------------ |
| `typescript`            | 5.9.3 → 7.0.2         | 留 5.9.3；最新 `@astrojs/check` 0.9.12 peer 只含 TS 5/6，新 Svelte 集成也只含 TS 5/6 |
| `tailwindcss`           | 3.4.19 → 4.3.3        | 留 3.4.19；它仍是 3.x 最新稳定版，v4 另做样式迁移                                    |
| `prettier`              | 3.9.6 → 3.9.10        | 暂留；本轮实测公式回归仍存在                                                         |
| `prettier-plugin-astro` | 0.14.1 → 1.1.2        | 格式化链单独审查；本次临时解析仍保留当前版本                                         |
| `@astrojs/check`        | 0.9.10 → 0.9.12       | 后续可单独验证，不要求联动升级 TS                                                    |
| `svelte`                | 5.56.8 → 5.57.3       | 当前版本已满足新集成，补丁可独立验证                                                 |
| `pagefind`              | 1.5.2 → 1.6.0         | 独立验证搜索索引与前端检索                                                           |
| `pnpm`                  | 10.26.2 → 12.16.1     | 不捆绑包管理器大版本；10.x 最新为 10.34.9，当前版本已能解析本联动组                  |
| `autoprefixer`          | 10.5.4 → 10.6.2       | 单独验证 CSS 产物                                                                    |
| `mermaid`               | 11.17.2 → 12.2.0      | 图表大版本另审                                                                       |
| `satori`                | 0.26.0 → 0.63.2       | 0.x 跨 minor 另审 OG 渲染，不视为普通小升级                                          |
| `katex`                 | 0.16.47 → 0.19.1      | 0.x 跨 minor 另做公式回归                                                            |

`@astrojs/rss` 4.0.19、`@astrojs/sitemap` 3.7.4、`@swup/astro` 1.8.0、`sharp` 0.35.5 已等于本次查询的 npm `latest`。以上全部来自 npm 官方发布元数据，原始摘录与每包 URL 保存在 `output/build-upgrade-registry.json`；这是一份本日快照，不写作永久最新版。[Astro Check](https://registry.npmjs.org/%40astrojs%2Fcheck)、[TypeScript](https://registry.npmjs.org/typescript)、[Prettier](https://registry.npmjs.org/prettier)、[pnpm](https://registry.npmjs.org/pnpm)、[Pagefind](https://registry.npmjs.org/pagefind)

## 本轮实际验证与证据

- 基线：`output/build-upgrade-installed.json`；官方 registry 快照：`output/build-upgrade-registry.json`，查询时点 `2026-11-02T11:01:58.914Z`。抓取脚本 `output/build-upgrade-registry.mjs`。
- 依赖解析：`output/build-upgrade-resolution/package.json` 将直接依赖全部固定为当前安装版本，仅替换最小联动组。设置自己的 `pnpm-workspace.yaml` 后执行 `pnpm --dir output/build-upgrade-resolution install --lockfile-only --ignore-scripts --strict-peer-dependencies --store-dir D:\pages\myblog\.pnpm-store --registry https://registry.npmjs.org`，exit 0；真实生成包含 Astro 7.4.4 等目标的 `pnpm-lock.yaml`，且该目录没有 `node_modules`。日志 `output/build-upgrade-resolution-isolated.log`。出现过期传递依赖提示，不构成 strict peer 失败；未执行包脚本或原生依赖安装。
- 解析边界：最初没有独立 workspace 的命令拾取祖先 workspace，未生成目标 lockfile，**不计作验证通过**；后续确认临时 lockfile 的真实内容后才形成上述结论。主站 `package.json` / `pnpm-lock.yaml` 保持上一轮清理后的状态。
- 格式化：只把 Prettier 3.9.10 发布包下载到 `output/build-upgrade-prettier/`，按 npm `dist.integrity` 校验 SHA-512 后解包；新旧 `format()` 仅在内存比较当前 34 篇 Markdown，源文件逐一回读未变。只有 `src/content/posts/20260320000000/index.md` 的 13 行发生差异。`Q_2^*>Q_1^*` 被改为 `Q_2^_>Q_1^_`，当前 KaTeX 可渲染原式，新式抛 `Expected group after '^'`。结果 `output/build-upgrade-prettier-result.json` / `output/build-upgrade-prettier-math-proof.json`；脚本为 `output/build-upgrade-prettier-audit.mjs` / `output/build-upgrade-math-check.mjs`。没有格式化写回源文件，也没有更新主项目 Prettier。
- 官方资料详读：`output/astro-upgrade-primary-review.md`。它是一次性研究证据，主站维护结论以本报告为准。
- 本轮未运行新 Astro 的安装、构建、烟测、CI 或 Pages 部署，未新增分支、提交或推送。

## 下一轮实施入口

建议只实施最小 Astro 联动组，并先处理 HTML 空白策略、Vite 压缩配置和 CI Node 环境。用相同文章与快照完成升级前后构建，保持 Markdown 管线；按现有文档处理随机侧栏与缓存噪声。跨编译器升级不强求所有资源 hash 相同，而应核对正文语义、路由、样式计算值、搜索和交互。通过本地实机验收后再决定发布。Tailwind 4、TypeScript 7、Prettier 及其他独立升级不放进这一批。
