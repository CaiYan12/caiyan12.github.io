# Svelte 第三批独立升级：5.56.8 → 5.57.3

目标：仅把直接依赖 `svelte` 从安装版本 5.56.8 升至精确版本 5.57.3，保留 Astro 7.4.4、`@astrojs/svelte` 9.1.2、`@sveltejs/vite-plugin-svelte` 7.3.1、TypeScript 5.9.3、Prettier 3.9.8 插件、Pagefind 1.6.0 与两个既有 Svelte 组件源码。按[升级总计划](2026-11-03-dependency-upgrade-roadmap.md)的阶段二共用流程验收并独立本地提交，不推送或部署。

**跨 minor 定性**：5.56.8 → 5.57.3 是跨 minor（0.x 语义下 minor 位承担破坏性变更的位置）。本计划不以「是 minor 所以安全」为前提，逐条核对发行说明后才安装。

## 阶段一：基线

- [x] 保存起点 SHA、工作区 diff、直接依赖安装版本、源码摘要、Node/pnpm 版本、peer/engines 与 npm registry 元数据。
- [x] 读取两个 Svelte 组件的实际语法面（事件写法、生命周期、绑定），确认迁移面。
- [x] 用 5.56.8 从当前源码构建，保存完整产物清单与哈希。

## 阶段二：升级与 A/B

- [x] 核对目标版本发行说明、peer 范围、engines 与传递依赖变化，确认无需改组件语法。
- [x] 仅精确升级 `svelte`；严格 peer 安装，审阅锁文件；frozen/offline 安装通过。
- [x] 同输入构建 A/B：文件清单、路由、HTML 正文/公式、JS/CSS、OG、Pagefind 资源，逐类解释差异。
- [x] Pagefind 对新旧构建各跑一次，确认搜索文档集合与标题不变。

## 阶段三：检查与实机

- [x] `pnpm check`、`pnpm test:prettier-math`、格式门禁、相关单测。
- [x] 搜索 UI：URL 预填、中文/英文、Enter、空查询、无结果、忙碌重复提交、结果 Swup 切页与后退。
- [x] 看板娘：默认折叠、召唤/收起、交互后切页返回、重复 DOM 与定时器/事件残留。
- [x] dev 下修改并恢复 Svelte 文件，确认 HMR 实际生效。
- [x] 1280×900 与 390×900 截图并实际查看，采 pageerror 与本站 requestfailed、横向溢出。

## 阶段四：收口

- [x] 同步本计划、总计划状态、CHANGELOG 与构建/组件/命令文档。
- [x] 清理仅本轮自有的探针与进程，独立本地提交，确认工作区状态。

## 方法与证据

日志、产物清单与对照脚本存放 `output/svelte-upgrade/`。两侧保持文章与数据快照不变，使用 `NODE_USE_ENV_PROXY=1`，运行 `pnpm exec astro build`、`node scripts/inject-buddha-banner.mjs`、`pnpm exec pagefind --site dist`；不运行网络快照刷新链（`fetch-github-*` / `fetch-friend-icons` / `generate-lqips`），以免联网取数污染差异。

A/B 四层判据：

1. 文件清单：两侧路径集合比对；`dist/_astro/` 内的内容寻址文件名会因 Svelte chunk 变化而改名，需单列。
2. 非 HTML、非 `dist/_astro/` 的产物：要求逐字节相同（图片、字体、OG PNG、RSS、sitemap 等）。
3. `dist/_astro/` 产物：区分「含 Svelte 运行时标记的 chunk」与其余资源；前者允许变化并记录，后者要求逐字节相同。
4. HTML：先剥除侧栏「文章推荐」随机块（`div.widget.tab-widget`），再把 `_astro/*.js` 内容哈希归一化为占位符，然后比较；同时比较路由集合与正文可见文本。

## 执行结果

2026-11-03，Windows 11 / Node 24.18.0 / pnpm 10.26.2 / Playwright 1.62.1 / Chromium 无窗口。起点 `23a924ddfe82ac53b4801ac7d76300cb842ed330`，工作区初始只有上一批遗留的文档改动（`docs/agents/build-and-deploy.md` 的路线入口 + 未跟踪的总计划），源码与锁文件干净。

### 目标版本核查

- `registry.npmjs.org/svelte`：5.57.3 发布于 **2026-10-26T18:16:20.865Z**，`dist-tags.latest = 5.57.3`；`engines.node >= 18` 与 5.56.8 相同；**无 peerDependencies**。
- 区间为 5.56.9 / 5.56.10 / 5.57.0 / 5.57.1 / 5.57.2 / 5.57.3，共 116 条（4 条 minor `feat` + 112 条 patch）。逐条读自 `https://raw.githubusercontent.com/sveltejs/svelte/main/packages/svelte/CHANGELOG.md`（仓库根路径与 `master` 分支均为 404，正确路径在 `packages/svelte/`）。
- 唯一具破坏性的条目是 5.57.2 的 #18900「`{:else}` 后接 `{:else}` 或 `{:else if …}` 改为编译期报错」。本站 `Search.svelte` 用的是合法的 `{:else if}` 串联、无裸 `{:else}`，两版编译器实测均无 warning。
- **本站 Svelte 语法面比计划假设更窄**：全仓 `.svelte` 文件中 `on:[a-z]+` 指令 **0 匹配**；`Search.svelte` 用属性式 `onsubmit={submit}`，`Pio.svelte` 无 DOM 事件绑定。因此「legacy `on:` 指令是否仍受支持」这条风险对本站根本不适用。
- **peer 全部兼容**：`@astrojs/svelte@9.1.2` 要 `^5.43.6`、`@sveltejs/vite-plugin-svelte@7.3.1` 要 `^5.46.4`、`svelte2tsx@0.7.63` 要 `^3.55||^4||^5.0.0-next.0`、`prettier-plugin-svelte@4.1.1` 要 `^5.0.0`。
- **本次升级不带来安全收益**：OSV 全量查询 14 条 advisory 中最高的 fixed 版本为 5.55.7，低于区间下界 5.56.8。5.56.8 已含全部已知修复。安全不能作为这次升级的理由，实测收益是 Svelte 运行时 chunk 净减与若干内部修复。

### 安装

- `svelte` 声明由 `^5.45.5` 改为**精确 `5.57.3`**（沿用本仓库既有约定：`pagefind: "1.6.0"`、`prettier: "3.9.8"`、`astro: "7.4.4"` 均不带 `^`）。首次 `pnpm add --save-exact` 写成 `^5.57.3`，已手工改回精确并重新 `pnpm install` 让锁文件 specifier 同步为 `5.57.3`。
- 严格 peer 安装 exit 0；`pnpm install --frozen-lockfile --offline --ignore-scripts --strict-peer-dependencies --store-dir .pnpm-store` exit 0。
- 直接依赖安装版本对比（`pnpm list --depth 0` 前后 diff）：**只有 svelte 一行变化**。
- 锁文件只有 36 增 36 删，范围为：`svelte 5.56.8→5.57.3`、其平台无关的必要传递变化（`@sveltejs/acorn-typescript 1.0.11→1.0.13`、`acorn 8.18.0→8.19.0`、`devalue 5.9.0→5.9.4`、`esrap 2.3.0→2.4.0`、`@jridgewell/sourcemap-codec 1.5.5→1.6.0`、`@types/trusted-types` 转为 optional），以及三处 peer 重绑定（`@astrojs/svelte`、`@sveltejs/vite-plugin-svelte`、`svelte2tsx`、`prettier-plugin-svelte` 的 `svelte@` 后缀）。**未联动 Astro、Svelte 集成、Prettier 插件本体或 Pagefind。**
- `node_modules/.pnpm/svelte@5.56.8` 目录仍在磁盘上，但锁文件已 0 处引用，`node_modules/svelte` 软链接指向 5.57.3，`import("svelte/package.json")` 解析为 5.57.3。它是 pnpm 的陈旧残留，不参与构建。

### 同输入构建 A/B

两侧均 `pnpm exec astro build` + `inject-buddha-banner` + `pagefind --site dist`，不跑网络快照刷新链（`fetch-github-*` / `fetch-friend-icons` / `generate-lqips`）。

- 两侧均 **229 页、230 个 HTML、28 篇索引、47574 词**——Pagefind 分词计数与第二批报告完全一致，交叉印证构建输入稳定。
- **先测噪声底线**：用 5.56.8 连做两次构建，非 HTML 产物逐字节 0 差异，146 个 HTML 差异全部来自侧栏随机推荐，剥除后 0 差异。因此后面任何非随机差异都可明确归因。
- **升级前后**：非 HTML、非 Svelte chunk 的产物 **逐字节 0 差异**（含全部 CSS、OG PNG、RSS、sitemap、字体、图片）。156 个 HTML 有差异，但把 `_astro` 的两种哈希命名形式（`<name>-<HASH>.ext` 与 `<name>.<HASH>.ext`）都归一化后，**0 差异**。
- **只有 5 个 chunk 因 Svelte 编译产物变化而改名**：`client.*`（39,104→39,831 B，+727）、`Search.*`（2,845→2,840 B，−5）、`legacy.*`（110→110 B，仅 import 名变化，版本标记仍是 `add("5")`）、`Pio.*`（1,610→1,610 B）、`client.svelte.*`（1,005→1,005 B）。无新增、无遗漏、无第三方 chunk 变动。

### 编译级证据（排除压缩器噪声）

Rollup/minifier 的标识符重编号会掩盖真实差异，所以另做一层：把 `node_modules/.pnpm/svelte@5.56.8` 与 `svelte@5.57.3` 两套编译器同时指向**本站真实组件源码**编译。

- `Pio.svelte`：client 与 server 两路**逐字节相同**（3,211 / 2,750 B）。
- `Search.svelte`：CSS 输出相同、warning 列表相同（两版均空）；JS 有变化，且差异点精确对应 CHANGELOG 里的两条 perf：client 侧 `$.child()+$.reset()` → `$.only_child()`（#18717），server 侧 SSR 分支标记并入首次 `push`（#18712）。
- **Ground truth 是真正执行 SSR**：用两版编译器 + 两版 `svelte/server` 运行时分别 `render()` 同一组件，**HTML 逐字节相同**（Search 608 B、Pio 171 B）。`$.only_child` 在非水合路径等价于 `get_first_child`，语义未变。
- 公开 API 零移除：`internal/client` 只增 3 个导出（`set_default_select_value`/`unsave`/`only_child`），不删任何；`disclose-version.js` 两版逐字节相同。

### 检查

- `pnpm check`：196 文件，**0 errors / 0 warnings / 6 hints**，与上一批数字一致。
- `pnpm test:prettier-math`：**38/38**。
- `pnpm exec prettier --check ./src ./docs`：通过；两个 Svelte 文件单独再查也通过。
- `pnpm test:lib` 16/16；`pnpm test:utils` 261/261。

### 实机 A/B（同一脚本跑两侧产物）

同一份探针脚本、同一套 32 条判据，分别打**升级前 `dist`** 与**升级后 `dist`**（各自用独立静态服务，避免共用端口掩盖问题）。

- 升级前：**32/32 通过**；升级后：**32/32 通过**；**同一断言名逐条 `ok` 与读数完全一致，0 处差异**（含 CSS 作用域 hash `svelte-a15wih`）。
- 覆盖：`/search/` 水合、URL 预填、中文（2 条，含 `/posts/` 真实路由）、英文（12 条）、空查询静默清空、无结果文案、忙碌重复提交防护（gate 命中 1 次、忙碌期 disabled+aria-disabled、第二次 Enter 被挡、放行后仍是第一轮结果）、结果 Swup 切页（`window.__docMarker` 存活证明未整页刷新）与后退恢复关键词、横向零溢出；Pio 默认折叠（`hidden` + 盒面积 0）、召唤展开（canvas 280×250）、收起、交互后 Swup 往返后实例仍唯一（1 容器 / 1 canvas / 1 `.pio-show`）、重载后仍可展开；窄屏 390 按设计 `display:none` 且 `window.Paul_Pio` 不存在；文章页标题/公式/图片/布局；两视口的 pageerror、本站 requestfailed、非资源类 console.error **均为 0**。
- **一处既有行为的澄清**：Swup 的 `SwupScriptsPlugin` 会重建整个 document 的 script 节点，所以切页后 `script[src*='pio.js']` 计数归 0，但脚本副作用仍在（`window.Paul_Pio` 存在）。这在升级前后**完全一致**，属既有行为，判据因此只锁实例唯一性与副作用，不锁 script 标签数量。
- 外部播放器（`myhkw.cn`）与 YouTube/Bilibili 在 context 级掐断；浏览器对被 abort 的请求固定报 `Failed to load resource: net::ERR_FAILED`，这类 error 单独归类为 `resourceOnly`，不与站内真实错误混算。

### dev HMR

`astro dev --port 4325` 日志有 `Synced content`（未复现内容 RPC 超时）。改 `Search.svelte` 的 placeholder → 浏览器热更新生效；改回 → 热更新还原；改第三次时 `window.__hmrSentinel` 存活，证明是热更新而非整页刷新。源码最终 SHA-256 `ac30fa1158a3f6bf1b45f2373a7dae920c4154f4e386bbd53321654ca9c958e4` 与原始文件逐字节相同，`git diff` 为空。dev 下无 Pagefind 索引时显示「搜索暂时不可用」属既有设计，不是回归。

### 本地提交

本批为 `main` 上**紧跟 `23a924ddfe82ac53b4801ac7d76300cb842ed330`（第二批 Pagefind）之后的独立本地提交**，**未推送、未部署**。这里不写死本次提交自身的完整 SHA：任何 amend 都会改变它，写死即自指失效；需要现值就 `git log --oneline -2`。提交内容：`package.json` / `pnpm-lock.yaml` 的精确升级、本专项计划、总计划、CHANGELOG，以及 `docs/agents/` 的 build-and-deploy / components / commands 三份同步。`src/` 零改动。

### 已知边界

- 只验证 Chromium；未跑 Firefox/WebKit。本次不改 CSS 前缀与层叠，跨浏览器风险由第四批 Autoprefixer 承担。
- 未跑远端 Linux CI、未部署——Linux 平台包只有锁文件解析层面，本地实测不冒充线上结果。
- `.pnpm` 里残留的 `svelte@5.56.8` 目录未手工删除（pnpm 自身清理范围），已确认不被锁文件引用。
- 探针脚本全部在 `output/svelte-upgrade/`（git-ignored），不入库。
