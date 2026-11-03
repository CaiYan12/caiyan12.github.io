# 第四批 Autoprefixer 独立升级：10.5.4 → 10.6.2

目标：仅把直接依赖 `autoprefixer` 从安装版本 10.5.4 升至精确版本 10.6.2，保留 Tailwind 3.4.19、PostCSS 管线顺序与两套样式（主站 `src/styles/global.css` + Nice Books `src/nice-books/styles/books.css`）。按[升级总计划](2026-11-03-dependency-upgrade-roadmap.md)的阶段二共用流程验收并独立本地提交，不推送或部署。

## 本批的特殊风险：这不是「只改一行版本号」

Autoprefixer 的前缀输出 = **代码逻辑** × **caniuse-lite 浏览器支持数据** × **browserslist 解析出的目标集**。本批两个依赖范围都抬高了：

| 包             | 当前解析     | 10.6.2 要求     | 最新         |
| -------------- | ------------ | --------------- | ------------ |
| `browserslist` | 4.28.7       | `^4.28.9`       | 4.29.5       |
| `caniuse-lite` | 1.0.30001806 | `^1.0.30001810` | 1.0.30001820 |

**本项目没有显式 browserslist 配置**（`package.json` 无 `browserslist` 键、无 `.browserslistrc`），走的是 `defaults`，2026-11-03 实测解析出 31 项目标（含 `last 2 versions` 这类会随浏览器发布自动前进的查询）。因此 **caniuse 数据一旦更新，即使 Autoprefixer 代码一字未改，前缀也可能增减**。

这意味着本批的归因必须分离两个变量：

- **变量 A**：caniuse-lite / browserslist 数据更新造成的前缀变化（上游数据漂移，不是回归，也不是本批代码的问题）
- **变量 B**：Autoprefixer 10.5.4 → 10.6.2 代码逻辑造成的变化

验收要求：**每一处 CSS 差异都要能归到 A 或 B，并说明是等价序列化、真实前缀增减，还是规则改写**。归不到任何一边的差异必须阻断本批。

## 阶段一：基线

- [x] 保存起点 SHA、工作区、直接依赖安装版本、Node/pnpm、peer/engines 与 registry 元数据。
- [x] 保存升级前全部产物 CSS 的逐文件 SHA-256 与字节数，以及厂商前缀分布普查。
- [x] 记录 `browserslist` 实际解析出的目标集，不猜测默认集合。
- [x] 确认 CSS 在两次同版本构建间逐字节稳定（沿用第三批已测的噪声底线：非 HTML 产物 0 差异）。

## 阶段二：升级与 A/B

- [x] 精确升级 `autoprefixer` 至 10.6.2；严格 peer 安装，审阅锁文件；frozen/offline 安装通过。
- [x] 记录 `browserslist` / `caniuse-lite` 是否随锁变化，保留 `[tailwindcss/nesting, tailwindcss, autoprefixer]` 顺序，不连带迁 Tailwind 4。
- [x] 同输入构建，逐项解释前缀、规则删除/新增、压缩或排序变化；若 CSS 无差异也如实记录，不强造变化。

## 阶段三：检查与实机

- [x] `pnpm check`、`pnpm test:prettier-math`、格式门禁、相关单测。
- [x] 用样式审计脚本 + 真实浏览器核对主站与 Nice Books：正文/代码/公式、导航/侧栏、搜索、图片与布局。
- [x] 1280×900 与 390×900 截图并实际查看，采 pageerror 与本站 requestfailed、横向溢出。
- [x] 根据实际变化规则判断是否需要 Firefox/WebKit 补验；缺环境就写明未验证边界，不把 Chromium 通过写成全浏览器通过。

## 阶段四：收口

- [x] 同步本计划、总计划状态、CHANGELOG 与构建/样式/命令文档。
- [x] 清理仅本轮自有的探针与进程，独立本地提交，确认工作区状态。

## 方法与证据

证据目录 `output/autoprefixer-upgrade/`。两侧保持文章与数据快照不变，使用 `NODE_USE_ENV_PROXY=1`，运行 `pnpm exec astro build` + `node scripts/inject-buddha-banner.mjs` + `pnpm exec pagefind --site dist`；不运行联网快照刷新链。

CSS 对比分三层：

1. **逐字节**：15 份产物 CSS 的 SHA-256 直接比对。
2. **前缀普查**：按 `-webkit-` / `-moz-` / `-ms-` / `-o-` 统计声明、`@keyframes`、伪选择器与函数前缀的出现次数与具体属性名。
3. **逐规则 diff**：对字节不同的文件做 CSS 规则级对比，逐条归因到变量 A 或 B。

注意：`dist/` 下 15 份 CSS 里只有 8 份走构建管线（`_astro/*.css`），其余 7 份（`domain/css/*`、`giscus-theme.css`、`pio/static/pio.css`、`pagefind/*.css`）是 `public/` 直接复制或第三方产物，**不经过 Autoprefixer**，它们若有变化属异常。

## 执行结果

2026-11-03，Windows 11 / Node 24.18.0 / pnpm 10.26.2 / Playwright 1.62.1 / Chromium 无窗口。起点 `daf85c9afbf8c1a4f56b5cad4e3aacc3c3267bf2`（第三批 Svelte 的提交）。

### 风险兑现情况：数据确实更新了，但 CSS 输出没变

`autoprefixer` 声明由 `^10.5.4` 改为**精确 `10.6.2`**。升级同时**必然**联动两个数据包（这是 10.6.x 抬高的依赖下限，不是可选项）：

| 包             | 升级前       | 升级后           |
| -------------- | ------------ | ---------------- |
| `browserslist` | 4.28.7       | **4.29.5**       |
| `caniuse-lite` | 1.0.30001806 | **1.0.30001820** |
| 解析出的目标集 | **31 项**    | **36 项**        |

目标集变化幅度不小：`chrome 150→156`、`safari 26.5→27`、`edge 150→155`、`firefox 152→159`、`ios_saf 26.5→27.0` 等，19 项移出、24 项移入。按常理这足以改变前缀输出。

**但实测产物 CSS 逐字节完全相同**：15 份 CSS 全部 SHA-256 一致，包括 8 份走构建管线的 `_astro/*.css` 与 7 份由 `public/` 直接复制的静态 CSS。厂商前缀普查也完全一致——152 处（`-webkit-` 86 / `-o-` 33 / `-moz-` 32 / `-ms-` 1），逐文件 0 差异。

**为什么没变**：本站 CSS 用到的那些前缀属性（`object-fit`、`user-select`、`text-size-adjust`、`appearance`、`line-clamp`、`column-gap`、`tab-size`、`mask-image`、`tap-highlight-color`、`print-color-adjust`），在旧目标集和新目标集的**最低版本**上都仍然需要同样前缀。`defaults` 查询取的是「最近的浏览器版本」，而这些属性的前缀分界线远在更早的版本，两端都跨不过那条线，所以判定不变。这不是「数据没生效」，而是**本站用到的属性恰好都落在稳定区间**。

### 变量隔离实验

为排除「构建缓存导致假相同」的可能，另做隔离实验（`output/autoprefixer-upgrade/isolate/report2.json`）：

- **A 组**：旧代码 `autoprefixer@10.5.4` + 其依赖树里的 `browserslist@4.28.7`（31 项目标）
- **B 组**：新代码 `autoprefixer@10.6.2` + 其依赖树里的 `browserslist@4.29.5`（36 项目标）
- 用 `postcss` 直接处理**同一份产物 CSS**，不经 Vite、不吃构建缓存

结果：6 份含前缀的 CSS 在 A/B 两组下输出**逐字节相同**。并带自检——同版本重复跑必须与首次完全相同（`selfCheckIdentical: true`），排除流程随机性。

> 一次失败尝试记在这里备查：最初想把「旧目标集」喂给「新 caniuse 数据」，两边都报 `Unknown version 156 of android`。原因是目标集里的版本号必须与对应的 caniuse 数据匹配，**跨版本混搭目标集在技术上不成立**。正确做法是每组用自己解析出的目标集。

### 安装

- 首次 `pnpm add --save-exact autoprefixer@10.6.2` 写入 `^10.6.2`，与第三批同样的坑；已手工改为精确 `10.6.2` 并重新 `pnpm install` 同步锁文件 specifier。
- 严格 peer 安装 exit 0；`--frozen-lockfile --offline` exit 0。直接依赖安装版本对比：**只有 autoprefixer 一行变化**。
- 锁文件 59 增 11 删，范围为 autoprefixer、browserslist、caniuse-lite 与必要传递变化。**`postcss.config.mjs` 未改，`[tailwindcss/nesting, tailwindcss, autoprefixer]` 顺序保持**，未连带迁 Tailwind 4。

### 同输入构建 A/B

两侧均 `astro build` + 横幅注入 + Pagefind，不跑联网快照链。

- 两侧均 229 页 / 230 个 HTML / 28 篇索引。
- 全产物比对：**1176 项逐字节相同、0 项新增、0 项删除**；146 个 HTML 有差异但全部来自侧栏随机推荐，剥除后 **0 差异**。这与第三批测出的噪声底线完全一致。

### 样式指纹 A/B（本批最重的 CSS 证据）

用 `scripts/upgrade-style-audit.mjs` 对 `AUDIT_PAGES` 的 23 个页面逐元素采集计算样式指纹（含伪元素），升级前后各采一次再 diff。

- **21/23 页完全相同**（含 `/books/`、`/books/archive/`、`/books/01/` 三页 Nice Books，以及文章页、404）。
- 2 页有差异：`/albums/` 与 `/timeline/`，共 208 条元素差异。
- **全部 208 条差异都落在 `body:2>div:8>figure:5` 这一个语录块内**（`span.quote-band__char` 的逐字符宽度），没有任何一条溢出到其它元素。
- **决定性归因**：对**同一份构建**再采一次做自检，仍然只在这 2 页、仍然是同一个语录块出现差异（235 条）。即 A/B 的差异页集合与「同构建两次」的差异页集合**完全相同**。这是 `crypto.getRandomValues` 造成的语录随机（`docs/agents/build-and-deploy.md` 已记录该噪声源），与 Autoprefixer 无关。

> 一次性踩坑备查：第一次采集用了 `127.0.0.1:4327` 与 `127.0.0.1:4326` 两个不同端口，diff 出 15820 条差异，全部是 `cursor: url(...)` 与 `background-image: url(...)` 里的端口号不同。`upgrade-style-audit.mjs` 的归一化正则只匹配 `localhost:<port>`，**不匹配 `127.0.0.1:<port>`**。后来统一用同一端口的 `localhost` 重采才得到有效结论。

### 检查与实机

- `pnpm check`：196 文件，**0 errors / 0 warnings / 6 hints**。
- `pnpm test:prettier-math`：**38/38**；`prettier --check ./src ./docs` 通过；`test:lib` 16/16、`test:utils` 261/261。
- 浏览器验收（沿用第三批 32 条判据打本批产物）：**32/32 通过**，两视口 pageerror、本站 requestfailed、非资源类 console.error 均为 0。

### 已知边界

- **只验证 Chromium**。本批虽然改的是 Autoprefixer 本身，但实测前缀集合零变化，所以跨浏览器风险与升级前等同；未跑 Firefox/WebKit，不把 Chromium 通过写成全浏览器通过。
- 未跑远端 Linux CI、未部署。
- 语录随机导致 `/albums/` 与 `/timeline/` 无法用样式指纹做零差异判定，这是既有工具限制，非本批引入。

### 本地提交

本批为 `main` 上紧跟 `daf85c9`（第三批 Svelte）之后的独立本地提交，**未推送、未部署**。不写死自身 SHA（amend 会使其自指失效），需要现值就 `git log --oneline -2`。提交内容：`package.json` / `pnpm-lock.yaml`、本专项计划、总计划、CHANGELOG，以及 `docs/agents/` 的构建 / 样式 / 命令文档同步。`src/` 与 `postcss.config.mjs` 零改动。
