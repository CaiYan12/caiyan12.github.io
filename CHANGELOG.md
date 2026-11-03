# 更新日志

## 2026-11-03：Mermaid 升至 12.2.0，99 个图表逐图恢复原有尺寸

- `package.json` / `pnpm-lock.yaml` 将 `mermaid` 从 `^11.17.2` 升至**精确 12.2.0**，直接依赖仅此一行变化。`pnpm add --save-exact` 实测写入 `^12.2.0`，已手工改回并重新 `pnpm install` 同步锁文件 specifier。
- **站长已裁定接受 Safari 17.4+ 浏览器下限**（Mermaid 12 编译目标改为 ES2024，[#8213](https://github.com/mermaid-js/mermaid/pull/8213)）。**代价明确记录**：老 iOS 设备拿不到 Safari 大版本更新，这部分访客**将无法渲染本站任何图表**（99 个图 / 14 篇文章全部失效）。该下限来自编译目标，不是配置项，无法通过参数回退。
- **四条破坏性变更逐条核对**：`ELK` 成为默认布局（[#8155](https://github.com/mermaid-js/mermaid/pull/8155)，**命中**本站 86 个未声明 layout 的 flowchart）；十种图表默认主题改 `redux-color` / look 改 `neo`（[#8148](https://github.com/mermaid-js/mermaid/pull/8148)，本站原本就显式写 `base`+`classic`，不命中但需保持显式）；移除 `defaultRenderer`（[#8211](https://github.com/mermaid-js/mermaid/pull/8211)，本站从未使用）；ES2024 要求（产品决策，见上）。
- **`src/utils/runtime/mermaid.ts` 是本次唯一源码改动**，在 `initialize` 里新增三组钉值。除 `layout: "dagre"` 外，还发现一条**官方 CHANGELOG 未单列**的默认值变更：`flowchart.wrappingWidth` 从 **200 降到 120**、并新增 `minNodeWidth: 120`。这会让标签更早换行、节点被压窄、行数增加——实测全站 **宽度 66 个变窄 / 高度 75 个变高 / 无一变矮**，真实页图表区总高 5136px → **6009px（+17%）**。
- **这条不是布局引擎差异，`layout: "dagre"` 挡不住**。只钉 dagre 而不处理 wrappingWidth，会让全站图表变形而**所有常规判据都绿**（渲染成功数、节点数、标签文本、溢出、pageerror 全不受影响）。修复方式：显式设回 `flowchart: { wrappingWidth: 200, minNodeWidth: 0 }` 与 `state: { wrappingWidth: 200, minNodeWidth: 0 }`；`minNodeWidth` 设 `0` 而非 120，因为 11.17.2 里该配置不存在（等价于不约束）。**类型约束**：`wrappingWidth` 不在顶层 `MermaidConfig` 也不在 `MindmapDiagramConfig`，写错位置会让 `pnpm check` 报 `ts(2353)`。
- **恢复效果（全站 99 个图表全量，非抽样）**：宽度完全一致 **99/99**；宽高都完全一致 **96/99**；SVG 哈希与旧版逐字节相同 **89/99**（另 10 个不同中 7 个几何量完全一致）。残余 3 个为浮点取整级、视觉不可见：`#10` 高度 207→208（1px）、`#11` mindmap 403.25→404.92（1.7px）、`#44` 70.996→71（0.004px）。
- **真实页面** `/posts/20261002081331/`（14 个图表）：块数 14、含 SVG 14、已标记渲染 14、节点标签 72、`foreignObject` 131、**图表区总高 5136px** —— 与升级前逐项相同，**14 个图表逐图宽高全部一致（14/14）**；横向溢出 0、长中文标签被裁 0、`pageerror` 0。
- **证明 `layout: "dagre"` 确实生效**：在 mermaid 12 上对比 `dagre` 与 `elk`，**12/12 样本输出显著不同**（如 `#6` viewBox 宽 1346 vs 1296）。因此「99/99 全变」不是 dagre 失效，而是上面那条 wrappingWidth 造成。
- **与第五批 KaTeX 的耦合已查清**：mermaid 12.2.0 声明 `katex: ^0.18.0`，与已落地的 `0.19.1` 范围冲突；但 `pnpm.overrides` 是全局的，**实测 mermaid 拿到 `katex@0.19.1` 且只有一份副本**。mermaid 只调 `katex.renderToString`，该 API 在 0.19.1 存在可用；本站 99 个图表无一使用 `$$…$$` 数学语法。
- **对照器两次失败的教训（这批最贵的成本）**：(1) roughjs 的 `handDrawnSeed` 默认 `0` = 每次随机，导致圆角矩形贝塞尔控制点每次都变（`C-31.2`/`C-18.4`/`C-25.2`），必须固定种子；同时 webfont 分片未就绪会按回退字体度量算控制点，须按站点运行时的 `fonts.load`+`fonts.ready` 门补上。(2) **同一 page 内连续渲染 99 个图表会互相干扰**，不稳定项会在 classDiagram/gantt 之间转移；改为**每个 worker 独立 page** 后两版各自 99/99 两次渲染完全相同。不做隔离就拿不到可信基线。
- **门禁**：`pnpm check` 0 errors / 0 warnings / 6 hints；`test:lib` 16/16（含两处视觉契约：字体就绪门、themeCSS 换行终态）；`test:utils` 261/261；`prettier --check ./src ./docs` 通过；`pnpm install --frozen-lockfile --offline` exit 0。
- **连带传递依赖与 Node 边界**：mermaid 12 依赖栈整体换代——新增 `elkjs@0.9.3`（12 把 ELK 内置，原来要单独装 `@mermaid-js/layout-elk`；本站钉 dagre，不参与渲染）、`chevrotain` 11.1.2→13.2.0、`@mermaid-js/parser` 1.2.1→2.0.1，并**移除 `fastdom@1.0.12`**（`pnpm why fastdom` 已确认输出为空，不是遗漏）。**`mermaid@12.2.0` 要求 `node >=22.12.0`**（连同第五批带入的 `commander@15.0.0` 同要求）：本机 24.18.0、`build.yml`/`deploy.yml` 的 Node 24 均满足；`lint.yml` 的 `node-version: 22` 解析为最新 22.x（2026-11-03 为 22.23.4）也满足。**残留风险**：若把 lint.yml 钉到 22.11.0 及以下或启用 `engine-strict`，安装会警告甚至失败（当前 `engine-strict` 未设置）。
- **未验证边界**：只验 Chromium，未在 Safari 17.4 以下实测（无法实机），也未在 Safari 17.4+ 验证渲染正确性；未跑远端 CI、未推送、未部署；未验证 ELK 布局的实际观感（本站钉回 dagre，ELK 路径从未在真实页面跑过）；mindmap 的 1.7px 差异未归因到底；只比对本站 99 个图表，未跑 mermaid 官方语料。详见 `docs/plans/2026-11-03-mermaid-upgrade.md`。

## 2026-11-03：KaTeX 升至 0.19.1，307 个公式逐条 A/B

- `package.json` / `pnpm-lock.yaml` 将 `katex` 从 `^0.16.25`（安装 0.16.47）升至**精确 0.19.1**，并新增 **`pnpm.overrides: { katex: "0.19.1" }`**。其他直接依赖安装版本不变。
- **为什么必须加 override（本次核心）**：`rehype-katex@7.0.1` 已是 latest，但它把 katex 锚在 `^0.16.0`（对 0.x 等于 `>=0.16.0 <0.17.0`，不含 0.19.1）。只升根包的话 pnpm 会给它一份嵌套的 0.16.47，于是**构建期 HTML 输出旧类名 `.base`/`.strut`、运行期 CSS 选择新类名 `.katex-base`/`.katex-strut`**，样式对不上。反证实验（真实 Chromium，40 个真实公式样本）：错配下 **20/40 几何尺寸改变**、页面 2139→2269 px、**5.02% 像素不同**；正确配对下 **0 差异**。override 把 `rehype-katex`、`mermaid`、`micromark-extension-math` 三个消费者统一到 0.19.1，`0.16.47` 目录虽仍在 store 里但无任何符号链接指向它。**这是本仓库第一次引入 `pnpm.overrides`，属超出「每批只动一个直接依赖」的决定，已获站长批准。**
- **评估文档漏掉的破坏性变更**：原评估只记了 0.19.0 的 `strict` / `symbolNotInFont`。核对上游 CHANGELOG 后实际还有两条——0.17.0 的 `__defineFunction` 内部 API 变更（本站不受影响），以及 **0.18.0 给 20 个内部 CSS 类统一加 `katex-` 前缀**（[#4229](https://github.com/KaTeX/KaTeX/pull/4229)），后者影响全部 307 个公式的 HTML。本站实际用到其中 6 个：`katex-base` 669 次、`katex-strut` 669、`katex-sizing` 529、`katex-underline` 64、`katex-overline` 48、`katex-accent` 11。
- 另补一条计划完全没有的：**[CVE-2026-103923](https://nvd.nist.gov/vuln/detail/CVE-2026-103923)**，KaTeX `>=0.11.0 <0.18.2` 存在原型污染→XSS（CWE-807），0.18.2 修复。当前 0.16.47 **在受影响区间内**，但本站是静态站、Markdown 由站长撰写、构建期无外部输入、`rehypeKatex` 未传 `trust`，前置条件（`Object.prototype` 被污染）无产生路径，**实际不可利用**。这是本批升级唯一的硬性收益。
- **公式级 A/B**：全站 **307 个公式 / 4 篇文章 / 36 个内容文件**（块级 91 + 行内 216），新旧版本各渲染一次逐条比对。结果 **307/307 全部为 `class-rename-only`**：结构化变化 0、**新错误 0**、修复 0、原本报错 0。独立判据交叉验证——把两侧 HTML 的所有 `class` 属性剥掉后 **307/307 逐字节相同**，不依赖归一化逻辑自证。
- **构建 A/B**：1322 文件对 1322，`onlyA=onlyB=59`、非 HTML 差异 **0**。59 个改名资产按文件族配对后，**57 个归一化哈希后完全相同**（mermaid 各 chunk 因 import katex chunk 的路径哈希变化而连锁改名），**真正有内容变化的只有 `katex.css`（32131→33084 B）和 `katex.js`**。156 页 HTML 差异全部是 asset 哈希引用，归一化后只剩 4 页，即 4 篇有公式的文章；这 4 页的差异**双向证明**是纯类名重命名（还原类名后逐字节相同，不还原则 4/4 全不同）。
- **资产同源**：`_astro` 内 KaTeX 相关文件 61 个 / 21 个族，**缺失 0、新增 0**。字体族缺一个就会静默回退到系统字体、字形错但不报错，按阻断项处理。
- **门禁**：`pnpm check` 0 errors / **0 warnings** / 6 hints；公式保护 38/38；`prettier --check ./src ./docs` 通过；`test:lib` 16/16；`test:utils` 261/261；`pnpm install --frozen-lockfile --offline` exit 0（CI 冻结锁不会红）。
- **真实浏览器**：文章页 298 个 `.katex`、零尺寸 0、原生 MathML 298、`.katex-base`/`.katex-strut` 各 652 次而**旧类 `.base`/`.strut` 均为 0**（CSS 与 HTML 同源的直接证据）、`.katex-error` 0、横向溢出 0、`pageerror` 0、本站 `requestfailed` 0；移动端 390×900 同样 298 个公式、零溢出。加载的样式表为 `/_astro/katex.qjoI73Dg.css`。
- **mermaid 回归**：override 把 mermaid 的 katex 也拉到 0.19.1，取图表最多的文章验证 **14/14 图表渲染成功**（14 个 `<svg>`、14 个已标记渲染、72 个节点标签、0 溢出、0 `pageerror`）。本站 99 个图表里没有一个使用 `$$…$$` 数学语法，该依赖是死代码。
- **方法论收获（已写进构建文档）**：计划原本的三项判据**全部会绿而站点已坏**——Task 2 的公式 A/B 脚本 `import katex` 命中的是根包（恒 0.19.1）、根本不测构建用的那份；「字体族是否都在」在错配下两侧都是 61 个；「`.katex` 盒子宽高 > 0」在错配下也非零只是高度错了。补上的判据是**直接数产物 HTML 里的旧类名出现次数必须为 0**。
- **连带传递依赖**：`katex@0.19.1` 声明 `commander: ^15.0.0`（0.16.47 是 `^8.0.0`），锁文件因此把 `commander@8.3.0` 换成 `commander@15.0.0`，`engines.node` 从 `>= 12` 抬到 **`>=22.12.0`**。已核对三处 Node：本机 24.18.0、`build.yml`/`deploy.yml` 的 Node 24 均满足；`lint.yml` 的 `node-version: 22` 由 `actions/setup-node` 解析为最新 22.x（2026-11-03 为 22.23.4）也满足。**产物不受影响**——`commander` 只被 `katex/cli.js` 用，`katex/dist/katex.js` 与 `katex.mjs` 两个库入口完全不引用它，本站也从不调用 katex 的 bin。残留风险：若把 lint.yml 钉到 22.11.0 以下或启用 `engine-strict`，安装会警告甚至失败（当前 `engine-strict` 未设置）。
- 顺带修正：计划里的安装命令 `--store-dir .pnpm-store` 是错的，本机实际 store 在 `D:\.pnpm-store\v10`，照抄会报 `ERR_PNPM_UNEXPECTED_STORE`。
- **未验证边界**：只验 Chromium，未在 Safari / Firefox 实机跑；未跑远端 CI、未推送、未部署；只比对了本站 307 个公式，未跑 KaTeX 官方完整语料；未测 `strict: "error"` 场景；错配反证只用了 40 个去重样本而非全部 307 个。详见 `docs/plans/2026-11-03-katex-upgrade.md`。

## 2026-11-03：四批依赖升级发布上线，线上功能验证 9/9

- 推送 `93b90e7..8f19b98`（5 个提交：Astro 检查器 0.9.12、Pagefind 1.6.0、Svelte 5.57.3、Autoprefixer 10.6.2、`@swup/astro` 声明对齐），远端 `main` 现为 `8f19b98`。三个 workflow 全部 success：Lint `41592304534`、Build and Check `41592304545`、Deploy to GitHub Pages `41592304550`，headSha 均为 `8f19b98`。Linux CI 上 `Astro Check` 0 errors / 6 hints，与本机一致。
- **部署身份判定踩了一个方法论坑**：最初用「线上 JS chunk 哈希是否等于本地」判定，三个 chunk 全部对不上（本地 `Pio.sk4GzkC6.js`、线上 `Pio.CS2Sx7XP.js`），差点误判成部署没生效。**真因是 JS chunk 的内容寻址哈希与 Pagefind 索引哈希都平台相关**，Windows 与 Linux 构建必然不同，这类判据不可用于跨平台部署验证。改用平台无关证据后全部对上：CSS 资源名两侧完全一致（`Layout.BkMsQfIt.css` / `MainGridLayout.CKaYaVTj.css` / `katex.BPpMaF0t.css` / `noto-sans-sc.WH83ST03.css`）、6 个代表页中 5 页可见文本逐字节一致、Svelte 运行时特征字符串计数一致（`svelte` 19 次 / `state_unsafe_mutation` 1 次 / `each_key_duplicate` 1 次）、CSS 作用域 hash 一致（`svelte-a15wih`）。
- 唯一文本差异是 `/about/` 的 GitHub 贡献日历：线上 1912 次 / 连续 17 天，本地 1881 次 / 连续 16 天。这是 CI 构建链 `fetch-github-contributions.mjs` 实时抓取所致，**反而是「线上确为本次新构建」的正面证据**。
- **线上功能实测 9/9**（真实 Chromium 打 `https://caiyan12.github.io`）：搜索岛完成水合（无 `ssr` 属性），中文「看板娘」2 条、英文「Astro」12 条；Swup 切页未整页刷新且后退恢复关键词与结果；文章页 298 个 KaTeX、首个公式盒 734×20 且含原生 MathML，截图确认公式排版正确；看板娘 `window.Paul_Pio` 存在且容器/canvas 各 1；移动端 390×900 搜索 12 条、零横向溢出；两视口 pageerror 与本站 requestfailed 均为 0。
- **已知边界**：线上导航用 `waitUntil:"load"` 会因第三方播放器拖住 load 事件而超时，改 `domcontentloaded` 后正常，属既有环境问题，与本次升级无关。
- 阶段五剩余 4 类跨版本迁移（Tailwind 4 / Mermaid 12 / Satori 0.63 / KaTeX 0.19）与 Prettier 上游阻塞仍未处理，站长已定「逐个做、每次单独授权」。完整发布证据见 `docs/plans/2026-11-03-dependency-upgrade-roadmap.md` 阶段六。

## 2026-11-03：修正 @swup/astro 的声明偏差，触发一次 postcss 去重

- `package.json` 的 `@swup/astro` 由 `^1.7.0` 改为 `^1.8.0`，与实际安装版本对齐（构建文档长期记录该偏差：lockfile 存 specifier，改 `package.json` 不改 lock 会让 CI 的 `--frozen-lockfile` 失败，因此必须连 lock 一起改并实测）。已核实 **1.8.0 就是当前 latest**，这次修改不带动任何版本解析前进。
- **但安装后锁文件发生了超出预期的去重**：净 143 增 207 删。原因是 `@swup/astro` 的 specifier 变化让 pnpm 重算整棵依赖图，把 `postcss@8.5.25` 上下文下的那一整套副本（`cssnano` 族、`postcss-calc`/`colormin`/`minify-*` 等约 40 个包）并到了 `postcss@8.5.32` 上下文，`autoprefixer` 的 postcss peer 上下文也随之从 `8.5.25` 变为 `8.5.32`。同时 `browserslist@4.28.7`、`caniuse-lite@1.0.30001806`、`acorn@8.18.0` 等旧条目从锁文件中消失——**它们是同一批去重的副产品，不是版本倒退**：磁盘目录仍在，锁文件不再引用。
- **已实测这次去重对产物零影响**：`pnpm list --depth 0` 直接依赖**零变化**；重新构建后与升级前基线逐字节比对，**1176 项产物完全相同、0 增 0 删**，146 个 HTML 差异剥除随机侧栏后归零；`pnpm check` 0 errors / 0 warnings / 6 hints，公式保护 38/38，格式门禁通过，浏览器 32/32。
- `--frozen-lockfile --offline` 安装通过，CI 的冻结锁路径不受影响。
- 这条记录的重点是：**改 specifier 不等于零风险**，它会触发依赖图重算。以后遇到同类"声明纠偏"必须像本次一样先比对 `pnpm list --depth 0` 与完整产物，不能只看 `package.json` 那一行 diff。

## 2026-11-03：Autoprefixer 升至 10.6.2，caniuse 数据更新但 CSS 零变化

- `package.json` / `pnpm-lock.yaml` 将 `autoprefixer` 从 `^10.5.4` 升至**精确 10.6.2**，其他直接依赖安装版本不变（`src/` 与 `postcss.config.mjs` 零改动，`[tailwindcss/nesting, tailwindcss, autoprefixer]` 顺序保持，未连带迁 Tailwind 4）。
- **本批不是「只改一行版本号」**：10.6.x 抬高了数据依赖下限，升级必然联动 `browserslist 4.28.7→4.29.5`、`caniuse-lite 1.0.30001806→1.0.30001820`。本项目**没有显式 browserslist 配置**（走 `defaults`），解析出的目标集因此从 **31 项变成 36 项**（`chrome 150→156`、`safari 26.5→27`、`firefox 152→159` 等，19 项移出、24 项移入）。
- **但产物 CSS 逐字节零变化**：15 份 CSS 全部 SHA-256 一致（含 8 份走构建管线的 `_astro/*.css` 与 7 份 `public/` 直拷贝），厂商前缀普查也完全一致——152 处（`-webkit-` 86 / `-o-` 33 / `-moz-` 32 / `-ms-` 1），逐文件 0 差异。原因是本站用到的前缀属性（`object-fit`、`user-select`、`text-size-adjust`、`appearance`、`line-clamp`、`column-gap`、`tab-size`、`mask-image` 等）在旧、新目标集的**最低版本上都需要同样前缀**，前后都跨不过那条分界线。不是数据没生效，是这些属性恰好落在稳定区间。
- **变量隔离实验**排除了「构建缓存导致假相同」：用 `postcss` 直接处理同一份产物 CSS，A 组（旧代码+旧数据，31 目标）与 B 组（新代码+新数据，36 目标）输出**逐字节相同**，并含「同版本重复跑必须一致」的自检。一次失败尝试备查：把旧目标集喂给新 caniuse 数据会报 `Unknown version 156 of android`——目标集版本号必须与对应数据匹配，跨版本混搭技术上不成立。
- 同输入构建 A/B：两侧均 229 页 / 230 HTML / 28 篇索引；全产物 **1176 项逐字节相同、0 增 0 删**，146 个 HTML 差异全部来自侧栏随机推荐，剥除后 **0 差异**。
- **样式指纹 A/B**（`scripts/upgrade-style-audit.mjs`，23 页逐元素计算样式）：**21/23 页完全相同**（含三页 Nice Books 与文章页、404）；仅 `/albums/`、`/timeline/` 两页有 208 条差异，且**全部落在同一个 `figure:5` 语录块内**（`span.quote-band__char` 逐字符宽度）。对**同一份构建**再采一次自检，差异页集合与 A/B **完全相同**，证明这是 `crypto.getRandomValues` 的语录随机噪声，与升级无关。
- **踩坑记录**：`upgrade-style-audit.mjs` 的 URL 归一化只匹配 `localhost:<port>`，**不匹配 `127.0.0.1:<port>`**；首次用两个不同端口采集时 diff 出 15820 条假差异（全是 `cursor`/`background-image` 里的端口号），统一端口重采后归零。
- `pnpm check` 0 errors / 0 warnings / 6 hints，公式保护 38/38，格式门禁通过，`test:lib` 16/16、`test:utils` 261/261；浏览器验收沿用 32 条判据打本批产物 **32/32**（两视口 pageerror、本站 requestfailed、非资源类 console.error 均为 0）。
- 只验证 Chromium（前缀集合零变化，跨浏览器风险与升级前等同）；未跑远端 CI 或部署。方法与证据见 `docs/plans/2026-11-03-autoprefixer-upgrade.md`。

## 2026-11-03：Svelte 升至 5.57.3，浏览器判据升级前后逐条一致

- `package.json` / `pnpm-lock.yaml` 将 `svelte` 从安装版 5.56.8 升至**精确 5.57.3**（跨 minor），其他直接依赖安装版本不变。锁文件 36 增 36 删，范围为 svelte 自身、其平台无关传递依赖（`@sveltejs/acorn-typescript`、`acorn`、`devalue`、`esrap`、`@jridgewell/sourcemap-codec`）与四处 peer 重绑定；未联动 Astro、`@astrojs/svelte`、Prettier 插件本体或 Pagefind。
- **跨 minor 逐条核对而非假定安全**：区间 5.56.9→5.57.3 共 116 条变更（4 条 `feat` + 112 条 patch）。唯一具破坏性的是 #18900（`{:else}` 后接 `{:else}`/`{:else if}` 改为编译期报错），本站用合法 `{:else if}` 串联、两版编译器实测均无 warning。**本站 Svelte 语法面比预想更窄**：全仓 `.svelte` 无任何 `on:` 指令（`Search.svelte` 用属性式 `onsubmit`），所以「legacy `on:` 指令是否仍支持」这条对本站不适用。
- **本次升级不带来安全收益**：OSV 全量查询 14 条 advisory 中最高的 fixed 版本为 5.55.7，低于区间下界。5.56.8 已含全部已知修复，安全不能作为升级理由。
- 同输入构建 A/B（`astro build` + 横幅注入 + Pagefind，不跑联网快照链）：两侧均 229 页 / 230 个 HTML / 28 篇索引 / 47574 词。**先测噪声底线**——同版本连做两次构建，非 HTML 产物逐字节 0 差异、HTML 差异全来自侧栏随机推荐；在此基础上，升级前后**非 HTML 且非 Svelte chunk 的产物逐字节 0 差异**，156 个 HTML 在归一化 `_astro` 两种哈希命名后 **0 差异**。只有 5 个 chunk 因编译产物改名：`client.*` +727 B、`Search.*` −5 B，其余三个字节数不变（`legacy.*` 的版本标记仍是 `add("5")`）。
- **编译级证据**：把两版 Svelte 编译器同时指向本站真实组件源码——`Pio.svelte` 的 client/server 两路输出逐字节相同；`Search.svelte` 的差异精确对应上游两条 perf（`$.child()+$.reset()`→`$.only_child()` #18717；SSR 分支标记并入首次 `push` #18712）。真正的 ground truth 是用两版编译器 + 两版 `svelte/server` 运行时实际 `render()`，**SSR HTML 逐字节相同**（Search 608 B、Pio 171 B）。公开 API 零移除。
- **实机 A/B 用同一份探针、同一套 32 条判据分别打升级前后产物**：升级前 32/32、升级后 32/32，**同一断言名逐条 `ok` 与读数完全一致、0 处差异**（含 CSS 作用域 hash `svelte-a15wih`）。覆盖搜索水合/URL 预填/中英查询/空查询静默/无结果/忙碌重复提交防护/Swup 切页与后退恢复/零横向溢出，以及看板娘默认折叠·召唤·收起·Swup 往返后实例唯一·重载后仍可用，两视口 pageerror、本站 requestfailed、非资源类 console.error 均为 0。
- **清了两条容易误判的口径**：① `pioConfig.hiddenOnMobile` 的断点是 `(max-width: 1280px)`，所以 1280×900 下 Pio 按设计不初始化、页面里没有 `.pio-show`——桌面验证必须用 >1280 的视口；② Pagefind 1.6.0 对随机字母串会返回弱相关部分匹配（如 `zzzqqqxxxnotfound` 得 5 条），「无结果」用例必须用前批已记录的 `zzz没有这条内容987654321`（实测 0 命中）。另：Swup 会重建 script 节点，切页后 `script[src*='pio.js']` 计数归 0 属既有行为，升级前后一致。
- dev HMR 实测：改 `Search.svelte` 的 placeholder 热更新生效、改回即还原、`window.__hmrSentinel` 存活证明非整页刷新；源码 SHA-256 与原始文件逐字节相同。`pnpm check` 0 errors / 0 warnings / 6 hints，公式保护 38/38，`prettier --check ./src ./docs` 通过，`test:lib` 16/16、`test:utils` 261/261。
- 仅验证 Chromium，未跑 Firefox/WebKit（本次不动 CSS 前缀与层叠）；未运行远端 CI 或部署。方法与完整证据见 `docs/plans/2026-11-03-svelte-upgrade.md`。

## 2026-11-02：Pagefind 升至 1.6.0，完成中文检索 A/B

- Pagefind 1.5.2→精确 1.6.0，锁文件只联动其平台包；保留 Svelte、`Search.svelte`、收录规则和权重。Extended 改用 ICU4X 分词，部署需完整包含同轮生成的脚本、WASM 与索引。
- 2026-11-02 Windows / Node 24.18.0 本地：28 个收录文档集合/标题保持；31 组完整 API 查询中 6 组集合变化、18 组顺序变化、29 组摘要变化。“看板娘”23→2，减少仅匹配“看”的结果；“技术架构”“经济学”“AI 编程”等也新增弱相关部分匹配，存在精确性取舍，不宣称统一质量提升。
- 新旧桌面/移动的查询、空态、忙碌重复提交、Swup 切页后退通过，正常页面异常/本站失败请求均为零。分片故障首轮两版仍显示“没有找到”，第二轮旧版未恢复、新版恢复结果；没有把它写成所有网络错误都有提示或自动恢复。
- 同输入 Astro 构建均 229 页；搜索外产物无未解释变化。Pagefind 目录 53→67 文件、约 1.57→2.13 MB（整目录总量），不是访客查询下载量。Check 为 0 errors / 0 warnings / 6 hints，公式保护 38/38。
- 变化明细、故障注入、索引文本空白差异及本地验证边界见 `docs/plans/2026-11-02-pagefind-upgrade.md`。同步构建、组件和命令约定；未运行远端 CI 或发布。

## 2026-11-02：独立升级 Astro 检查器至 0.9.12

- `package.json` / `pnpm-lock.yaml` 将 `@astrojs/check` 0.9.10 升至精确 0.9.12，其他直接依赖不变。必要传递变化包括语言服务 2.17.3、新增 astro2tsx/WASM 检查链、chokidar 5、yargs 18.2.0 与语言服务使用的 vscode-uri 3.2.0；未联动 Svelte、Pagefind 或 TypeScript。
- 2026-11-02 Windows / Node 24.18.0 本地检查新旧均为 0 errors / 0 warnings / 6 hints；公式保护 38/38。旧新版监听对照中，已有 TS/Astro 文件错误依次检出、修正后清零，单次负向检查 exit 1。**新建文件漏检两版均复现**，记录为既有限制；新增文件后需重新执行单次检查或重启 watch，未修改依赖代码规避。
- 同数据构建均 229 页、产物文件清单相同；全部非 HTML 逐字节一致，146 个 HTML 仅随机推荐侧栏不同。1280px / 390px 本地搜索、公式、切页后退验证通过，页面异常和本站请求失败为零。
- 对照入口的新 CLI/旧 API 边界、失败路径、依赖审查及命令见 `docs/plans/2026-11-02-astro-check-upgrade.md`；同步 `docs/agents/build-and-deploy.md` 和 `docs/agents/commands.md`。本地验收，未运行远端 CI 或发布。

## 2026-11-02：Prettier 升至 3.9.8，加入公式保护门禁

- `package.json` / `pnpm-lock.yaml` 将 Prettier 从 3.9.6 升至精确版本 3.9.8，其他直接依赖安装版本保持不变。保留 Astro/Svelte 插件、文章单美元公式与现有格式化范围，不忽略文章、不切 MDX、不修改渲染管线。
- **暂缓 3.9.9 / 3.9.10**：上游关闭单美元公式识别后会把公式星号当成 emphasis。当前已找到单行最小复现，修正旧文档“需要整篇解析态”的推论；历史测量数字保留。详见 `docs/agents/build-and-deploy.md` 与上游 issue #20199。
- 新增 `scripts/prettier-math.test.mjs` / `pnpm test:prettier-math` 并接入 `lint.yml`。用独立 remark-math 比较格式化前后的公式类型、原文与 KaTeX 渲染，不以格式化器自己的 AST 自证。2026-11-02 Windows 本地覆盖 36 个内容文件、307 个公式，3.9.8 为 38/38；3.9.10 的最小样例与真实文章按预期失败。
- 升级前后 342 个受检文件的格式化输出一致（实际加载 78 个 Astro 文件、2 个 Svelte 文件的插件）；同数据 Astro 构建均为 229 页。1308 个产物的清单一致，非 HTML 逐字节一致；146 个 HTML 只在随机推荐侧栏有差异。Check 为 0 errors / 0 warnings / 6 hints，桌面 1280px / 移动 390px 的公式、Swup 切页后退与布局验证通过，页面异常和本站失败请求均为零。
- 完整命令、测试计数、失败路径及验收边界见 `docs/plans/2026-11-02-prettier-upgrade.md`。本轮本地验收未执行网络快照刷新链、远端 CI 或发布；文章源文件未改变。

## 2026-11-02：Astro 7 验收剩余项收口

- **技能图标脱网**：`skills.astro` 改用 `public/skill-icons/` 的原始 SVG，去掉访客 Iconify 请求，保留既有图形/配色与首字回退。手动同步脚本不进构建链；来源 hash、作者、许可及完整 Apache-2.0 等许可副本随资源入库。外网阻断的桌面/移动解码测试通过；console 门禁现完整采集 23/23 页 **PASS**，没有扩大放行清单。
- **文章目录真实竞态**：防抖到期前位置已变、scroll 的 rAF 未处理时，缓存激活项会让旧动画提前启动并跳过新目标静默期。定时器到期先现量位置，再按 update 重排；真实 DOM + 可控时钟先复现 1354≠1415，再验证 2/2。文集烟测也修正相位：先等前段动画静止、确认首次真实激活再立即反向，不再同步连发两次会合并的 scrollTo。
- **相册脚本错误归属**：同一第二标签中同时复现播放器“已在其他页面加载”异常和 window 的 opaque `Script error.`，与供应商 storage 心跳互斥规则一致。灯箱测试全部页面补异常/本站请求监听，独立场景隔离 context；不改播放器互斥、不屏蔽异常。正常流程 27/27，给相册注入错误则按预期失败，证明后续页面错误不会遗漏。
- **旧版间距恢复**：`WidgetHotLog.astro` / `WidgetSeries.astro` 的固定静态 Fragment 保持图标与 span 相邻；两处动作宽度恢复 60.4375 / 62.15625px，复用原 3px 图标 margin，未改共用 CSS。
- 本地构建 229 页，check 0 errors / 0 warnings / 6 hints，utils 261/261，文集产物烟测 88/88。命令、红绿证据及失败路径见 `docs/plans/2026-11-02-astro7-followup.md`；此前初轮“待复核”记录保留历史，并补最新结果指针。未推送或部署。

## 2026-11-02：Astro 7 联动升级与同数据构建验收

- Astro 6.4.8→7.4.4、Svelte 集成 8.1.2→9.1.2、Markdown 7.2.0→7.3.5、Expressive Code 与两插件 0.43.1→0.44.3；仅这六个直接包改变安装版本，更新锁文件。保持 Tailwind 3、TypeScript 5、Prettier 3.9.6 及现有 unified 插件管线，未把独立项目 AI News 加回主站。
- `astro.config.mjs` 显式 `compressHTML: true`；将 Vite 8 不再自动迁移的 `esbuild.drop/pure` 改为 Oxc minify 配置。探针先复现日志仍输出，再验证日志/调试器被剔除、实参副作用与 warn/error 保留。CI 检查/构建的 Node 改为 24，部署缓存策略不变。
- **2026-11-02 Windows 本地 A/B**：两侧 Astro 均构建 229 页，完整产物均 230 个 HTML；路由、链接、图片、标题、代码与公式语义一致，49 页仅总文本空白有差异。OG 与 Pagefind 目录逐字节一致。16 组同状态桌面/移动首屏截图像素差异为零；原始样式指纹差异保留，区分 CSS 等价序列化、随机/外部服务状态与两处链接约 2.5/3px 宽度变化，不声称全部资源 hash 相同或性能提升。
- **发现并处理**：dev 首次文件监听阻塞导致 Vite 模块通信超时、文章集合为空；CPU profile 的主要时间落在 `fs.watch` 注册。排除本地 `.pnpm-store` / `output` 后，默认 CLI 约 13 秒同步内容并启动；真实内容、CSS 与 Svelte 热更新及恢复通过。没有增加超时、外部化整包或修改依赖源码。
- 本地 check 为 0 errors / 0 warnings / 6 hints，相关单测通过；UI 142/142、好书 72/72、灯箱 27/27、壁纸 47/47、AI News 主站边界通过。文集首次目录防抖判据失败、独立确认 88/88，首次失败仍保存；全页 console 门禁新旧均 REVIEW（技能页 32 个外部 Iconify 请求），不写成全绿。dev 相册另出现一条来源待核的 `Script error.`，调查结果在实施记录维护。
- 范围、命令、逐项差异、失败日志与剩余边界见 `docs/plans/2026-11-02-astro7-upgrade.md`；当前为本地升级验收，未运行线上 CI、未推送或部署。

## 2026-11-02：构建系统升级复核（尚未升级）

- AI News 迁出后重新查询官方发布信息：Astro 当前 6.4.8、最新稳定版 7.4.4；Svelte 集成、Markdown 处理器和 Expressive Code 的最小联动组已在临时独立 workspace 中通过严格 peer 解析。主站依赖保持原版本，未用解析成功代替构建或实机验收。
- Prettier 3.9.6 → 3.9.10 的内存对照覆盖当前 34 篇 Markdown，1 篇的 13 行仍会改坏公式，KaTeX 样例实测报错；文章未写回。Tailwind 4、TypeScript 7 等独立升级不捆绑进 Astro 联动组。
- 本日 registry 来源、官方迁移说明、命令与验证边界见 `docs/plans/2026-11-02-build-system-upgrade-recheck.md`；`docs/agents/build-and-deploy.md` 已补充复核指针。未升级、提交、推送或发布。

## 2026-11-02：AI 日报独立项目迁移收尾

- **归属定稿**：AI News 移植已完成，本项目不再包含日报实现。README 移除独立项目内部维护表项，技术栈不再把 React 日报页列为本站功能；旧性能评估明确为迁移前历史，非主站待办。GLOSSARY、相关 `docs/agents/`、历史索引及 ADR 0001 的替代提示同步更新，AGENTS 可编辑区加入项目记忆入口。
- **配置清理**：`tailwind.config.cjs` 删除无消费者的日报 `--t-*` 色板/字体/圆角映射，`tsconfig.json` 删除无 JSX/TSX 消费者的 React JSX 设置，`package.json` / `pnpm-lock.yaml` 移除 `react` 运行时依赖。OG 图仍给 Satori 传普通元素对象，`ReactNode` 类型仍被使用，故保留 `@types/react`。冻结锁文件的离线安装确认仅移除该运行时包，未升级依赖。
- **边界与回归**：按 ADR 0009 保留 `/ai-news/` 桌面/移动导航、sitemap 与现有边界脚本；历史 ADR/日志、文章和项目展示保留。`scripts/ai-news-ownership.test.mjs` 改查源目录及整个日报产物目录缺席；通用测试 fixture 与脚本注释不再沿用旧日报页面地址或 `AI_NEWS_BASE_URL`。
- **2026-11-02 本地 Windows 实测**：`pnpm check` 为 0 error / 0 warning / 6 hints；`pnpm test:lib` 16/16；修改前后 `pnpm exec astro build` 均成功生成 229 页，12 份 CSS 逐字节相同，33 张 OG PNG 均为 1200×630；`pnpm test:ai-news-ownership` 通过，临时产物目录注入多余日报文件后按预期失败。`MAIN_SITE_URL=http://localhost:4323/` 的 `pnpm smoke:ai-news` 在无窗口 Chromium 下通过 1280px / 390px 两档入口 DOM 检查；变更文件 Prettier 与 `git diff --check` 见本轮计划的最终复核记录。
- **环境失败路径**：首次沙箱构建字体域名 DNS 返回 `ENOTFOUND`，联网环境设 `NODE_USE_ENV_PROXY=1` 后构建成功；原子写入测试在沙箱默认临时目录 rename 返回 `EPERM`，将 `TEMP` / `TMP` 指向工作区证据目录后通过；沙箱浏览器缓存缺席、沙箱 preview 端口不可达，改用本机已有浏览器与本机 preview 后通过。未修改生产代码来绕开这些限制。完整证据、剩余引用分类与命令边界见 `docs/plans/2026-11-02-ai-news-closeout.md`；未执行完整 `pnpm build` 联网刷新链、线上旅程或独立项目内部验收，未推送/发布。

## 2026-11-02（下午）：减少动效判定收敛，两件遗留收口

- **减少动效判定统一到唯一判定点**：删掉 `src/nice-books/scripts/shared.ts` 与 `src/utils/site-modal.ts` 里两份**逐字重复**的 `prefersReducedMotion()` 本地实现，改为转发 `src/utils/runtime/reduced-motion.ts`（`shared.ts` 保留同名 re-export，`archive.ts` 的导入路径不变）；`Sakura.astro` 与 `src/nice-books/scripts/home.ts` 的 4 处裸 `window.matchMedia("(prefers-reduced-motion: reduce)")` 一并换掉。理由：判定点一旦分裂，将来改语义（加监听、换 `matchMedia().addEventListener`）就会漏掉某几处。来源是搁了三周的 `stash@{0}`「T7 超范围：全站 reduced-motion 收敛」，动手前先用 `git stash show -p | git apply --check` 验证仍可干净套用。行为不变（两者都是每次调用现查一次）。
- **`src/constants/github-*.json` 生成物刷新**（`chore(data)`）：只动 `generatedAt` 与 10-31 / 11-01 / 11-02 三天贡献计数（10→57 / 0→21 / 0→9）。提交它的额外价值是**刷新回退缓存**——`fetch-github-*.mjs` 取数失败时保留已提交文件供页面渲染（`SKIP … About page will use stale cache`）。
- **`docs/plans/wallpaper-pull-handoff/` 按惯例归档**进 `docs/history/history.md`：这批 4 个文件原本 **untracked**（没有历史 = 删了永久丢失），所以拆两步——先入库（`070e1a9`）让恢复命令有源，再删除并登记。恢复命令从 `git show <sha>:<path>` 换成 `git archive <sha> <dir> \| tar -x`：`git restore --worktree` 被本机 CC Safety Net 拦（`git.restore-worktree`），照抄会让下一个人卡住，新版已实跑验证能还原 4 文件 368 KB。
- 验证：prettier 干净；`astro check` 196 文件 0 error；`src/utils` 单测 261 通过；`astro build` 229 页；`smoke:nice-books` **72/72**（受本次受影响面正好是 Nice Books 与 Sakura）；CI 三条 workflow 全 success。

## 2026-11-02：拉绳壁纸挂件重做为 360 原版小挂件，导航宽度收敛为单一真源

- **视觉重做**（用户提供 2013–2017 年 360 壁纸原版截图作为唯一设计依据）：T 恤由 130px SVG 盒里的 64×84 路径（含 3px 描边实渲染 67×87）缩到 **墨迹 26.8×27.6 CSS px**（盒 30×28），绳由 2px 紫渐变直线改 **1px 双股细线**（主股 `#4257be` + 0.4px 高光股，`vector-effect="non-scaling-stroke"` 保证拉长不变粗）并带自然垂坠弧度与领口绳结；整件 30×50，衣服顶边距视口顶边 22px。新尺寸对照原版实测（1103 宽截屏：T 恤 28×25、绳约 24、中心线 81.3%）。
- **横向锚点**：站长两次纠正后定死为「**中心线压在主导航 `#head-nav` 右缘**」，不是视口百分比。GLOSSARY「拉绳壁纸挂件」同步改写。
- **导航宽度收敛为单一真源（ADR 0010）**：`global.css` 的 `:root` 定义 `--nav-w`（宽档固定宽）与 `--nav-side`（窄档两侧留白），`#head-nav`、`#header .box`、`.wpull` 三方只消费这两个变量。挂件的 CSS 兜底写成三选一 `min()`（宽档右缘 / 窄档右缘 / 视口 8px 边距夹取），**不带断点**——导航的断点改了挂件也不会脱钩。原先挂件里硬编码镜像 1100/40 是本次的隐患来源。
- **修强刷闪动**：运行时 `--wpull-left` 要等 `pagefindReady()` 才写（实测首帧 140ms、写入 370–395ms），而 CSS 兜底当时是个近似值，中间 240ms 停在错位置——1440 档首帧 1166.39 / 落定 1270（Δ=103.61）、1170 档 Δ=187.31、1024 档 Δ=171.56。改法：CSS 兜底直接由 token 算出与运行时相同的值，首帧即落定位置。**诊断方法**：以「禁用 JS 的渲染」作为浏览器第一帧的替身，与实际落定值比对（`wpull-fouc-probe`，临时探针，用完即删）。
- **无导航路径去重**：删掉运行时里的 `LEFT_RATIO = 0.81` 近似；导航不可用（不存在 / `display:none` / rect 全 0）时**撤掉 `--wpull-left` 交给 CSS**，提示位置改从盒子实际矩形反读。实测把导航设为 `display:none` 后中心仍在 1270、变量变 `(none)`，零跳变。
- **常驻回归（`pnpm smoke:wallpaper-pull`，43 → 47 条）**：新增「首帧定位 = 落定定位」×2（1440 / 1024）、「绳尾与衣服顶边相接」（守 `ROPE_REST` ↔ `--wpull-rope-rest`）、「改 `--nav-w` 后导航确实变宽且挂件首帧仍等于落定值」（守单一真源；不硬编码期望坐标，只要求「导航变了」+「挂件跟上了」）。判据相位仍由真实状态定义，不睡固定毫秒。
- **评审与驳回**：`code-review` 双轴跑完，采纳 6 条（`readNavRect` 对零尺寸盒的防御、无导航双口径、`#header .box` 同源、三处陈旧注释、hint 测试底数重标、拖动中不保持悬停倾斜），驳回 3 条（hover 0.8° 属用户明确允许的「轻微摆动」而非「明显旋转」；`--nav-w:900` 会闪 52px 的反例建模时漏了导航窄档 `calc(100% - 40px)`，`--nav-w` 在 ≤1100 本就不生效；衣服渐变+1px 投影属用户原文「允许轻微柔和阴影」）。
- 验证：`astro check` 196 文件 0 error；`src/utils/**` 单测 261 通过；`pnpm build` 229 页 EXIT 0；`pnpm smoke:wallpaper-pull`（build + preview）**47 项全过**；另用临时闭环在 1920 / 1440 / 1200 / 1146 / 1140 / 1101 / 1100 / 1099 / 1024 / 900 / 760 / 681 十二档实测「首帧 = 落定 = 导航右缘」，Δ 全为 0（含 1099–1101、1140–1146 两个断点邻域）。
- 未验证：真机触屏手感；线上首帧（Fastly 边缘缓存 HTML `max-age=600`，故部署后以构建产物为准）；`PULL_THRESHOLD` 仍为 80px（用户要求「达到原有触发条件时换壁纸」），对 28px 高的衣服相当于 2.9 个身位，偏长，已提请站长裁决。

> **补记说明（2026-11-02）**：下面 2026-09-26 – 2026-11-01 的条目是事后从 `git log` 与 `docs/adr/` 补的——那段时间有变更没随手登记。因此它们只写 **commit / ADR 能直接支持的事实**，不写当时的实测读数（那些数没保存下来）；要看细节请按条目里给的 commit 与 ADR 路径去读原文。

## 2026-11-01：首页礼物气泡按钮

- 首页接入 QQ 礼物气泡按钮（`QQBubbleView` 的贝塞尔轨迹），见 `32b27e9`。
- 与既有首页元件同族：不引入新 UI 框架，样式走 `global.css` 既有 token。

## 2026-10-30：提交前 prettier 门禁落地，文集闭环口径定稿

- 提交前 prettier 门禁与 retro 文档约定（S1–S5），见 `3509bc1` 与 `.githooks/README.md`：只查暂存内容、`git commit --no-verify` 可单次绕过。
- 文集（series）确立为与标签/分类并列的**独立轴**，成员阅读序列封闭在组内，非成员文章的时间线跳过整个文集——这是裁决不是缺陷，见 `docs/adr/0007-series-closed-reading-sequence.md`。
- 过程文档大规模归档：23 份已完成计划迁入 `docs/history/`，新增 `docs/history/history.md` 索引（`37097dd`）。

## 2026-10-29：客户端运行时迁入独立宿主（spec #115–#125）

- `src/utils/theme-script.ts` 收薄为「装配表 + 生命周期声明 + page-load 辅助」三件，各功能块按关注面拆到 `src/utils/runtime/`，由 `runtimeTable` 的 `init` / `swap` 两个字段驱动。
- 迁移顺序按宿主分组（T3 文章页六块 / T4 外壳组 / T5 Mermaid+KaTeX / T6 灯箱 / T7 装饰与小件 / T8 稿纸与技能环 / T9 评论换一批），每个宿主一块一个合并提交（`aba9f47`、`3eb6b48`、`d2b7fc0`、`e13f5ec`、`198ba46`、`2e16a6b`、`6afb8b1`）。
- 收尾时删掉迁移后失去使用者的导入（`f373a05`），并按 T10 #125 修正三处陈述失真、补四个关注面的行为证据（`ed22119`、`4e49302`）。协议本身见 `docs/agents/components.md` 的「Swup 重初始化协议」条。

## 2026-10-28：AI 日报迁至独立仓库（ADR 0009）

- 日报源码、测试与 Pages 发布迁到 [CaiYan12/ai-news](https://github.com/CaiYan12/ai-news)，主站保留原路径 `/ai-news/` 的导航与 sitemap 条目；替代 `docs/adr/0001-ai-news-independent-react-page.md` 里「主站统一构建部署」的决定，见 `docs/adr/0009-ai-news-separate-deployment.md` 与 `e683da0`。
- 这是**工程归属**的变化：C-1 原定的客户端瘦身方案被独立项目替代，性能目标转移，未证明主站客户端瘦身。

## 2026-10-27：导航液态玻璃定稿、天气胶囊加载态

- 导航条与四个下拉面板改为液态玻璃（白膜 + 背景模糊 + 边缘折射透镜，折射场按元素实际尺寸与圆角半径生成 SDF 位移贴图）：初版 `6254273`（2026-09-26），裁决与实现要点见 `docs/adr/0005-navbar-liquid-glass.md`。位移刻意改在**像素空间沿 SDF 梯度**算——上游实现用归一化 uv，放到 1100×55 的横条上会把横向位移放大 20 倍。
- 天气胶囊补加载态：固定高度避免加载时塌陷（`a7371e9`），随后转圈改自绘 SVG（更细的线、更大的开口，`1cfcfa1`、`ee73b99`）。判据与取数口径见 `docs/agents/weather-capsule.md`。

## 2026-10-23：AI 日报内容区缩放胶囊

- `/ai-news/` 内容区加缩放胶囊（`46cdf1e`），与站内既有的字号滑块同族，不引入新控件范式。

## 2026-10-14~15：侧栏「文章目录」小部件与同页锚点平滑滚动

- 侧栏新增「文章目录」（`11225a9`）：激活态跟随阅读位置（`3b38f62`）、换页后重建并重置高亮（`6df1387`）、激活项居中与到达动画（`58d3df9`）。
- **必须与文集目录共用一个粘性容器**：实测同一侧栏内两个独立粘性元素滚后会互相压住 87.9px（前者 10–230，后者 142.1–342.1），后者整块盖住前者。结构与取舍见 `docs/adr/0008-sidebar-article-toc-sticky-stack.md`。
- 标题栏补阅读进度条（`162535e`）与「查看目录」按钮（`11cadbb`），图标与标题同族对齐（`30ad519`）。
- 同页锚点点击改为平滑滚动（`a386067`，pushState 保留 hash、捕获阶段避开 swup 抢事件）；swup 不检查 `defaultPrevented`，故接管时 `stopPropagation` 防止气泡阶段同步瞬移覆盖动画（`25c9edd`，站长实测报告）。

## 2026-10-11：本站资源下拉新增「跳出茧房」

- 「附加功能 → 本站资源 → AI日报」下新增入口（`6c89bef`）。下拉分列在 `Navbar.astro`（桌面 hover）与 `MMenu.astro`（移动全屏菜单）两处，两处必须同步改。

## 2026-10-10：文章页与 /about/ 正文段落首行缩进

- 正文段落加首行缩进 `2em`（= 2 字符），规则 `global.css` 的 `.post-body p`，紧邻既有那条 `.post-context p { margin }`。用 `em` 不用 `px`：`.post-context` 的字号由字号滑块写内联 px（12–24），`em` 才能跟着缩放；基准字号实测 13px，故文章页默认缩进 26px。
- 挂点 `.post-body` 只加在两处真的渲染 markdown 正文的容器上——文章页（`[...slug].astro`）与 `/about/` 信纸页（`about.astro`）。`/tag/xxx/`、`/category/xxx/`、`/series/xxx/` 的统计行共用 `.post-context` 但**不带**此挂点，因此写成 `.post-context p` 会连它们一起缩进——这条边界由反向判据守着。
- 原版主题对正文段落零 `text-indent`，本规则是 ADR 0004 意义上的**已转正偏离**（中文长文段段首行缩进是阅读惯例，原版缺失属主题年代局限），审计时勿按"漂移"修回原版。
- **八条例外 + 两处就地归零**（均为实测得来，非预设）：图片段 `<p><img …></p>`（`.post-context img` 是行内图，缩进会把图右移 2em 并溢出容器）、`.admonition-title` / `.markdown-alert-title`、`blockquote` 内段落（含嵌套）、**mermaid 图内标签**（节点文字是 SVG `foreignObject` 里的 `<p>`，全站三百余个，是最大的一处误伤面）、表格单元格段落 `td/th`、列表项段落 `li`（条目已有编号/符号与 `padding-left`）、模板与元件段落 `.post-last-updated` / `.post-series`（文集提示行在文章头尾各一处，只有尾处落在正文容器内）、`/about/` 的居中装饰标题 `.paper-hero-title` / `.paper-hero-sub`。另有两处**不另起规则、直接写进既有那条里**：右对齐的日期落款写进 `markdown-extended.css` 的 `.letter-paper-body p:last-child`（那条本来就是 `text-align: right`；右对齐单行再吃 `text-indent` 会被顶离右缘），逐字 span 写进 `.paper-hand-char`（见下条）。
- **踩坑：`text-indent` 是可继承属性，会打进 `display: inline-block` 子元素并各自生效。** 稿纸的逐字符微随机把每个字包成 `inline-block`（= 独立块容器），段落那条缩进因此继承进每一个字、每个字各自缩进一次——实测稿纸正文各段高度翻到三倍（64→192 / 128→352 / 192→544px）、面板高度 2691→4771px，而字符矩形数与网格相位变量一个没变，很容易被误读成"CDN 字体换了"。判定手段：**同一浏览器会话内摘/挂挂点类做 A/B**，可完全排除字体时序噪声（跨会话重开浏览器时会误判）。解法是给 `.paper-hand-char` 显式 `text-indent: 0`，缩进只留在段落首行。**复核口径必须是"段落内所有 `inline-block` 后代的 `text-indent` 都为 0"这条扫描**，不是看段落自身的缩进值——段落值全程都是对的。
- 验证（一次性实机量测，未加常驻判据，共 34 项全绿）：`/about/` 15 个段落分类完备（2 个装饰标题 + 1 个右对齐落款无缩进；便签 2 段 38px、稿纸正文 9 段 36px、署名行 26px），稿纸网格相位（`--lp-shift` / `--lp-cycle` / `--lp-baseline`）与首段行盒 offsetY 在挂/摘挂点两态下逐值相同、面板高度零增量；文章页按段落形态穷举扫描 29 篇——普通正文 2392 / 章末小结正文 25 / 提示块正文 18 全 2em，图片段 18、图形内标签 318、表格单元格 252、列表项 33、引用块 104、提示块标题 15、模板段落 7 全 0；字号滑块 24px→48px、12px→24px；`/about/` 在 1440/1100/860/680/390 五档零横向溢出；`/tag/习题/`、`/category/技术/`、`/series/matt-pocock/` 三处反向判据通过。`pnpm check` 0 error、`prettier --check ./src ./docs` 干净。
- `pnpm smoke:ui` 144 项中「票 20：卡片标题悬停零布局位移」失败（合计位移 30px，来自 `.post-list .post-header h2 a` 的 `left` 变化）。**与本改动无关**：把本次源文件 stash 掉、`pnpm exec astro build` 重建后同一条判据以同一读数复现（首页无 `.post-body`，新规则结构上匹配不到它）。

## 2026-10-01：底部语录条（ADR 0006）

- 站长要求嵌入 `rushhiii/notion-widgets` 的 `/quotes` 元件，最终**没有嵌**：按它的卡面语法在本地重写了「语录条」（英文原句 + 中文译文 + 英文署名，每次整页加载换一句）。三条备选路径都走通过才否掉，取舍见 `docs/adr/0006-quote-band-borrows-shape-not-runtime.md`。
- 逐字切分带上真体引号，保证 JS 与无 JS 两种状态同形（`3d6ef19`）。

## 2026-09-19：相册内容改版与灯箱交互修正

- 相册改版为文件夹驱动的三册结构（日常随手拍 32 / 背景收藏 11 / 轻松一刻 47，共 90 张）：一张 11.9MB 的 13624×2936 全景截图压到 3000×646 / 324KB，一张 425×10000 的超长图移出站点；补齐两篇文章与全部相册图此前缺失的 LQIP/manifest 条目（相册 LQIP 74 条、变体 53 条，零指向已删文件的残留）。
- **缩略图统一 3:2 裁切**：`.photo-grid img` 与相册索引封面 `.album-cover img` 改为 `height: auto` + `aspect-ratio: 3 / 2` + `object-fit: cover`，与图片墙同一套范式；此前桌面端按原图比例出图，全景图会塌成 174×39 的细条并让网格参差。`/albums/` 索引页封面由裸 `<img>` 改为 `ResponsiveImage`，三张合计约 2.9MB 的原图直出改走 WebP 变体。
- **灯箱关闭不再跳位**：`placeFocusBack: false` 取消 Fancybox 默认的"关闭时把页面滚到当前图"，改由 `on.destroy` 手动 `focus({preventScroll:true})` 归还键盘焦点（正文 `<img>` 不可聚焦，实际受益的是相册与二维码的 `<a>` 触发元素）。
- **灯箱新增「定位到文章位置」按钮**：位于右上角下载之后，仅 `post-gallery`（文内图）组出现——按 `triggerEl` 的 `data-fancybox` 用函数型 `Carousel` 选项决定工具栏；点击后关闭灯箱再把该图滚到视口居中（灯箱开启期间 `body` 锁滚动，故必须"先关后滚"），`prefers-reduced-motion` 下降级为瞬时。
- 灯箱工具栏文案中文化：引入官方 `zh_CN` 语言包并在本地合并扩展新按钮文案；右上角「下载」按钮改为捕获阶段拦截并在新标签页打开图片文件链接（库默认直接落盘保存）。
- **灯箱顶部净空**：`.fancybox__slide` 常置 `padding-top` 62px（等于绝对定位工具栏高度），此前库默认内边距为 0，够大的图片顶边会被左上 X/X 计数与右上按钮压住、视觉中心偏低；实测适配态重叠由 62px 降为 0，放大态仍按原图自然尺寸呈现（曾尝试用 `:has(.will-zoom-out)` 在放大时释放留白，会让放大目标过冲，故弃用）。
- **指针样式与触发状态同源**：`global.css` 的 `.prose img{cursor:zoom-in}` 收窄为 `.prose img[data-fancybox]{cursor:zoom-in}`，仓库卡片头像、表格行内头像、二维码不再显示放大指针；`.post-context .github-card-link` 显式 `cursor: pointer`，整张卡片（头像/名称/描述）统一手型。
- 新增常驻回归 `pnpm test:fancybox`（`scripts/fancybox-smoke.mjs`，Playwright 27 项：关闭不跳位含"触发图确已离屏"的有效性前置、焦点归还、定位按钮分组与位置、点定位生效、reduced-motion、下载新标签页、中文文案无 `{{KEY}}` 残留、卡片/表格/二维码图标不计入文内图、卡片手型与正文放大指针的同源断言、顶部净空（适配态零重叠 + 放大态按原图自然尺寸呈现）、Escape 关闭、本地资源零失败零报错）；需先 `pnpm build && pnpm preview`，与 `smoke:nice-books` 同层级，不进 `build` 链与 CI。验证：`pnpm check` 0 errors、`pnpm build` 通过、相册视觉验收 90 项与灯箱 27 项全绿。

## 2026-09-08：标签云集/分类云集 3D 标签云上线

- 新增 `src/components/layout/TagCloud3D.astro`：基于 svg3dtagcloud（vendored `public/vendor/svg3dtagcloud/`，npm `svg-3d-tag-cloud@0.0.20`，MIT，LICENSE 随附）的 3D 旋转标签/分类云，`/tag/` 与 `/category/` 云集页调用；数据与 `#blogtags` 药丸云同源（药丸云保留：当前项高亮 + 无动画回退），空数据自隐藏。
- 视觉与主题融合：透明底卡片（1px 细边框）、库内置 10 色调色板轮换（`fontColor` 设置不生效）、hover 标签放大 1.15 倍（150ms，`(hover:hover)+(pointer:fine)` 门控）、“N篇文章”tooltip 淡入上浮（由库写死的 `opacity="1.0"/"0.0"` 属性选择器驱动，CSS 走 `<style is:global>`——Astro scoped 管线会转义坏 `:global()` 内属性选择器引号）；`prefers-reduced-motion` 去位移保淡入；禁 `transition: all` 防拖影。
- 工程要点：库为自包含 global 构建（9.9KB），按 Pio 先例运行时 `<script>` 注入加载（Vite 禁止 ESM import public/ 内 JS），注入标签带 `data-swup-ignore-script`；组件脚本置于 swup 容器内（dev 下容器外脚本换页即丢）；实例挂 `window.__tagCloud3D` 跨页交接，云集页互切先销毁残留实例（rAF/resize 监听）再重建，切往无云页面自动销毁。
- 验证：dev 与 `pnpm build && pnpm preview` 生产路径（组件脚本内联进 `<main>` 内 HTML）均实测 Swup 往返、tooltip 上浮、375px 无横向溢出；astro check 0 错误。

## 2026-09-06：Nice Books 每日好书 V1 移植上线

- 从 `D:\pages\test\nice-books\prototype`（Design Agent 交付的 V1 参考原型 + design-handoff.md）正式移植为 `/books/` 生产模块：「今日好书」访问级随机单本 + 换一换（新 ≠ 当前）、「站长推荐」featured 池随机 6 本整组替换（新组排除旧组、组内无重复）、探索更多、书库（六字段即时搜索 × 标签叠加 × 书架/列表双视图 × 每页 12 载入更多 × `?q=`/`?tag=` URL 直达）、书籍详情（22 本 getStaticPaths 静态页 + 同架图书 top4 + 无效 id 站级 404）。
- **独立壳**架构（仿 `/ai-news/` 先例）：`src/nice-books/`（数据/查询/渲染构造器/交互脚本/样式）+ `src/pages/books/` 三路由；不加载博客 Layout/global.css，自带「纸墨书架」页眉页脚；全部页面 `data-pagefind-ignore="all"`（决策：博客全局搜索只搜正式文章）。
- **零框架交互岛**：换一换/书库过滤为 vanilla TS module script（SSR 标记与客户端渲染由 `src/nice-books/lib/render.ts` 字符串构造器单源保证）；swup 协议 =「顶层 init + `astro:page-load` 重跑 + main 内 dataset 守卫 + 元素缺失早退」，books 内部切页由全局注入的 @swup/astro 接管。
- **视觉 token 锁定 design-handoff §5–§8**：`--nb-*` 变量（paper/surface/note/ink/blue/seal 等）+ Tailwind `nb.` 命名色彩板（避免与 ai-news `--t-*` 映射键冲突）；封面为按 id 确定性的程序化 SVG 书封（handoff §12.3 兜底外壳，`coverUrl` 填入本地路径后自动切换真图）；字体复用仓库策略（方正书宋 CDN/思源黑体 VF/JetBrains VF/本地楷体），零新依赖。
- 「本站资源」下拉在 AI日报 后新增「每日好书」（`navBarConfig.resourceSite` 数据驱动，`noSwup: true`）。
- 新增 `pnpm test:nice-books`（node --test 27 例：数据契约/可注入 RNG 随机去重/六字段搜索/SVG 确定性）并接入 `pnpm build` 链头部；新增 `pnpm smoke:nice-books`（Playwright 43 项实机检查：随机契约/loading/去重/视图/搜索/直达/404/swup 切页与后退/重复初始化防护，三连跑稳定）。
- 已知边界：荐语/标签进入书库搜索范围（比原型多两字段，按主提示词 §18 裁决）；jsDelivr 字体 CDN 在部分网络下可能加载失败（与 `/about/` 同渠道，降级系统宋体，不影响功能）。

## 2026-09-06：全仓库深度审查修复（七阶段 16 项，详见 docs/plans/2026-09-06-review-fixes.md〔2026-10-30 已归档，全文见 docs/history/history.md〕）

- **速胜**：canvas 粒子爆炸/轮播自动播放/平滑滚动补 `prefers-reduced-motion` 守卫（此前 canvas 特效无任何降级）；Prettier 补装 astro/svelte 插件修复 `.astro/.svelte` 被 `--check` 静默跳过的格式化盲区（全量格式化 67 文件）；`image-variants` 非 WebP `srcset` 撤除混入的 webp 候选（无格式协商会导致旧浏览器裂图）。
- **构建脚本容错**：`fetch-github-repos` 缓存损坏备份重建（防限流时静默清空）；`generate-lqips` LQIP 变更检测改源图字节数（CI 友好）+ 逐图容错；`sync-site-stats` 空白内容评论/留言降级跳过不再阻塞部署（网络失败维持 fail-closed）；`fetch-github-contributions` IO 失败对齐"只告警不中断"。
- **客户端 bug**：动态标题快速切换不再永久丢失真实标题；Fancybox/KaTeX/Mermaid/背景配置四处静默降级补 `console.warn`；Fancybox 异步导入与 Swup 竞态去重；导航高亮前缀匹配加路径段边界；返回顶部/移动菜单补重入守卫；点击特效倒序回收。
- **a11y**：移动菜单 Escape/焦点管理/`aria-expanded`；轮播指示点按钮化（键盘可达）；导航 `aria-current="page"`（SSR+客户端双侧）；返回顶部改原生 button；消除 main 嵌套地标；搜索状态 `aria-live`；JSON-LD 转义 `<`；邮箱保护去内联 onclick 改事件委托（CSP 兼容）。
- **视觉敏感（克制版）**：Giscus 加载失败超时检测 + Colorful 风格提示卡与重试（懒加载先确认用户看过评论区）；20 个页面主标题 h2→h1（站名 h1 保留，文章标题去掉 50 字无声截断）；正文级灰字对比度达 WCAG AA（`--text-light` #999→#767676 等，装饰色不动）。
- **架构**：新增 `TagPillCloud` / `ListingHeader` / `TaxonomyListing` 组件收敛 tag/category/hot 家族 9 处复制；`src/utils` 纯函数测试面（content-utils/pagination，`pnpm test:utils` 9 例）+ 构建脚本容错单测（累计 38 例全过）；GitHub 令牌解析/客户端洗牌抽共享模块。
- **卫生**：样式 token 收敛（品牌绿单一真源、药丸 6 色盘变量化、768/770 断点统一、`--shadow-wrapper`、绿 tint color-mix 化）；清理死代码死数据（skills 悬空项目 ID、projects 死字段、`#totop`、`navBarConfig.type`、双重 draft 过滤）；Search/Pio 类型化与轮询上限；`.learnings/` 移出版本库并随 `.superpowers/` 补 gitignore；CI workflow 三方 action 全部钉 commit SHA；`githubUser` 入 config（消除组件硬编码）、站名/描述副本引用 siteConfig。

## 2026-09-05：关于页手写信纸化与全站字体革新

- `/about/` 正文区整体信纸化（参考用户 about.html 设计稿 1:1）：巨型"关于我"头部（topbar/眉题/手绘线）、黄色便签贴纸（胶带/折角/红勾，承载原"写在前面"内容）、"✎ 碎碎念"小节标题、横线稿纸信纸（`:::letter-paper` 容器指令 + 裸 div 横线区，行高与 32px 横线周期严格对齐、逐字符静态微随机）、"✦ NOW / NEXT" 时间线、页尾签名行；另新增 GitHub 贡献日历卡与蓝红双笔手绘涂鸦层（星形/箭头/波浪/边注，仅装订边距区不遮正文）。
- **全站字体策略落地**（README TODO 13）：`:root` 四 token 收敛全站字体——`--font-body` 思源黑体（`@fontsource-variable/noto-sans-sc` 可变字重自托管分包，**微软雅黑从所有主栈退场**消除版权风险）、`--font-mono` JetBrains（6 处散落声明统一）、`--font-serif` 方正书宋（jsDelivr CDN 优先 + `public/fonts/方正书宋-简体.ttf` 本地回退，暂无主用场景）、`--font-hand` 平方时光体（ZeoSeven FontsAPI，src 含 `local()` 本机优先，仅 /about/ 引入）。稿纸内文字容器显式重声明手写体以绕过元素级 reset 的继承切断。
- 逐字符微随机与横线对齐偏移 `--lp-shift` 随字体度量实测校准；spec 见 GitHub Issue #8。

## 2026-09-05：关于页新增 GitHub 贡献日历

- `/about/` 面包屑之下、正文之前新增 GitHub 贡献日历卡片（近 12 个月，53 列），复用原版 Colorful 的 `.widget` 小部件形态：图标头 + 统计行（总贡献/最长连续/当前连续）+ 品牌绿梯度格子 + 少→多图例。
- 构建期渲染：`scripts/fetch-github-contributions.mjs` 经 GitHub GraphQL `contributionsCollection` 拉取数据写入 `src/constants/github-contributions.json`（已接入 `pnpm build` 链），客户端零请求零 JS；不引入 Bloggify/github-calendar 运行时库（避免第三方代理单点，延续仓库卡片的构建期渲染策略）。
- 拉取失败或无令牌时构建不中断：复用旧缓存，缺失时渲染指向 GitHub 主页的回退卡；令牌解析顺序与既有脚本一致（`GITHUB_TOKEN` → `GH_TOKEN` → `gh auth token`）。
- 响应式：53 列随容器宽度流式伸缩铺满，格子方形由整体 `aspect-ratio: 53/7` + subgrid 构造保证；窄屏触到格子下限后由容器局部横滚兜底。
- 克制动效（/animate 规格并随附 `prefers-reduced-motion` 变体）：53 列入场 8ms 递进 stagger（240ms ease-out）、格子 hover 1.3 倍缩放（120ms，仅精确指针设备）。
- 新增 `pnpm test:contributions`（注入 fetchImpl 的离线单测 10 例）；spec 见 GitHub Issue #7，实施记录见 `docs/superpowers/plans/2026-09-05-about-github-contributions-calendar.md`。

## 2026-09-01：AI日报迁移

- 从 `D:\pages\test\ai-news` 迁移完整 React 运行时到本站 `/ai-news/`，保留 RSS 实时抓取、离线快照、搜索、筛选、阅读状态、主题、布局和橘鸦阅读风格。
- “本站资源”菜单在“我的项目”后新增“AI日报”；AI日报顶栏和页脚均提供“返回主站”。
- AI日报保持独立页面外壳，不加载博客导航、侧栏、Pio、樱花背景或 Colorful 页脚；页面进入 sitemap，不进入 Pagefind 博客搜索。
- 新增 `pnpm smoke:ai-news` 作为本站可执行的基础 Smoke 验证命令。
- 详细测试记录：见 [历史记录索引 · AI 日报迁移测试](docs/history/history.md)（原 `docs/ai-news-migration-test.md` 已于 2026-10-30 归档；AI 日报已迁为独立项目，全文见该条目「恢复命令」列）。

## 2026-08-31：博客文章正式测试

### 测试范围

- 仓库：`CaiYan12/caiyan12.github.io`
- 测试基线：`1126198ac729db6051e55594e4d75358198277f0`
- 测试方式：Windows PowerShell 本地构建产物、Chromium 实际浏览器、GitHub Pages 线上页面
- 本地预览：`http://127.0.0.1:4321/`
- 线上站点：`https://caiyan12.github.io/`
- 浏览器视口：桌面 `1366×900`，移动端文章页 `390×844`
- 文章样本：公开文章、私密文章、草稿、Markdown 扩展测试文章、Mermaid 测试文章

本记录验证文章的构建、路由、渲染和交互，不对文章正文中的知识内容或题目答案作事实审阅。

### 构建与自动化检查

| 检查项                             | 结果                                                 |
| ---------------------------------- | ---------------------------------------------------- |
| `pnpm exec prettier --check ./src` | 通过，所有文件格式匹配                               |
| `pnpm check`                       | 通过，0 errors、0 warnings、0 hints                  |
| `pnpm build`                       | 通过，构建 49 个页面                                 |
| Pagefind                           | 通过，索引 9 个页面、1790 个词                       |
| GitHub Actions 基线运行            | Lint、Build and Check、Deploy to GitHub Pages 均成功 |

构建输出仍有 Vite 单个大 chunk 警告；Pagefind 仍提示中文不支持 stemming。二者均未导致构建失败。

### 文章功能验证

| 场景                              | 验证结果                                                                            |
| --------------------------------- | ----------------------------------------------------------------------------------- |
| 首页公开文章列表                  | 通过，HTTP 200，显示 4 篇公开文章；私密帖和草稿标题均未出现在首页                   |
| 公开文章 `/posts/20260402161000/` | 通过，HTTP 200，文章正文、目录、版权区域正常                                        |
| 文章字号调节                      | 通过，点击字号控件后正文样式变为 `font-size: 14px; line-height: 1.9;`               |
| 私密文章 `/posts/20240115000000/` | 通过，HTTP 200，可通过直链访问                                                      |
| 草稿 `/posts/20220701000000/`     | 通过，HTTP 404，未生成文章内容                                                      |
| Markdown 提示块                   | 通过，渲染 2 个容器提示块和 2 个 GitHub 风格 alert                                  |
| GitHub 仓库卡片                   | 通过，2 个卡片均完成 API 加载并显示仓库名称                                         |
| 图片网格                          | 通过，3 个网格分别渲染为 4、2、2 列，图片均加载成功                                 |
| 外链与站内链接                    | 通过，外链带 `target="_blank"` 与 `rel="noopener noreferrer"`；站内链接不带外链属性 |
| 邮箱保护                          | 通过，链接使用 `data-encoded-email` 和点击解码脚本，HTML 未直接暴露邮箱地址         |
| Spoiler                           | 通过，点击后 class 从 `spoiler` 变为 `spoiler revealed`                             |
| Mermaid                           | 通过，6 个 Mermaid 代码块均渲染出 SVG                                               |
| Pagefind 搜索                     | 通过，搜索“数据库原理”返回 4 条结果，无错误信息                                     |
| 移动端文章页 `390×844`            | 通过，HTTP 200，无横向溢出                                                          |

本地浏览器网络检查中，文章、Pio 模型资源、Pagefind 资源和 GitHub API 请求均返回成功。草稿 URL 的 404 请求属于本次预期验证结果。

### Pio 验证与已知限制

- `1366×900` 首次打开首页：通过，`Paul_Pio` 和 `Live2D` 均已加载，Canvas 尺寸为 `280×250`。
- `1280px` 默认视口：按 `pioConfig.hiddenOnMobile` 配置隐藏，Pio 库不初始化。
- 页面先以 `1280px` 打开、再调整到 `1366px`：当前实现不会重新触发初始化，Pio 仍未加载；刷新页面后恢复正常。

上述响应式切换限制位于 `src/components/widget/Pio.svelte` 的一次性初始化逻辑中，属于后续可单独处理的交互问题，不影响本次文章构建和文章页面测试结论。

> **2026-08-31 销项**：该限制已修复（提交 `171f3be`）。`onMount` 改用 `matchMedia("(max-width: 1280px)")` 的 `change` 监听，窄屏起载后首次拉宽到超过 1280px 时补一次初始化，`pioInitialized` 守卫防止重复实例化。本地 Playwright 与线上复验均通过：1280px 打开后拉宽到 1366px 时脚本加载、`Paul_Pio` 初始化、Canvas 为 `280×250`；宽窄来回切换不重复加载；宽屏直接加载行为不变。

### GitHub Pages 线上验收

本次更新日志首次推送提交 `2b418c6a2eaab9b20fee7043ff18ee6c80ac8bce` 后，远端确认如下：

- [`CHANGELOG.md`](https://github.com/CaiYan12/caiyan12.github.io/blob/main/CHANGELOG.md) 已存在于 GitHub `main`。
- [Lint](https://github.com/CaiYan12/caiyan12.github.io/actions/runs/33372277525)、[Build and Check](https://github.com/CaiYan12/caiyan12.github.io/actions/runs/33372277628)、[Deploy to GitHub Pages](https://github.com/CaiYan12/caiyan12.github.io/actions/runs/33372277557) 均为 `completed / success`。
- 线上首页 HTTP 200，显示 4 篇公开文章，私密帖和草稿标题未出现在首页；`1366×900` 首次加载时 Pio 的 `Paul_Pio`、`Live2D` 均加载成功，Canvas 为 `280×250`。
- 线上公开文章 `/posts/20260402161000/` HTTP 200，标题、正文和目录正常；私密文章 `/posts/20240115000000/` HTTP 200；草稿 `/posts/20220701000000/` HTTP 404；线上 Pagefind 搜索“数据库原理”返回 4 条结果且无搜索错误。
- 线上 Markdown 扩展文章 HTTP 200，提示块、alert、图片网格、外链属性、邮箱保护和 Spoiler 结构正常；Mermaid 文章的 6 个图表均渲染出 SVG。
- 线上两个 GitHub 仓库卡片请求返回 HTTP 403，响应正文明确为 `API rate limit exceeded for 4.154.77.32.`，响应头为 `x-ratelimit-limit: 60`、`x-ratelimit-used: 60`、`x-ratelimit-remaining: 0`。页面按既有降级逻辑显示仓库信息加载失败链接；这是未认证 GitHub API 的 IP 限流，需后续决定是否改为构建期数据或带认证的服务端代理。

> **2026-08-31 销项**：已按"构建期数据"方案修复。新增 `scripts/fetch-github-repos.mjs` 在构建期拉取仓库元数据并缓存到 `src/constants/github-repos.json`（令牌解析顺序：`GITHUB_TOKEN`/`GH_TOKEN` 环境变量 → `gh auth token` → 匿名；拉取失败仅告警），`remark-extended.mjs` 改为构建期直接渲染完整卡片 HTML，客户端 `renderGithubCards()` 已移除——页面不再请求 `api.github.com`，访客 IP 限流问题随之消除。CI 的 build 与 deploy 工作流已注入 Actions 自动提供的 `GITHUB_TOKEN`。首次部署后线上仍短暂显示旧占位符，排查实锤为 `withastro/action@v6` 默认 `cache: true` 跨 run 缓存 `node_modules/.astro`（Astro content layer 数据存储），导致 CI 复用旧渲染产物；已在 `deploy.yml` 传 `cache: false` 关闭（提交 `82f966d`）。

因此，线上文章本身已发布并可用；GitHub 动态仓库卡片在本次线上浏览器环境中处于降级状态，不能记录为完整通过。

### 结论

当前提交的博客文章构建、公开/私密/草稿路由、Markdown 扩展、搜索及移动端文章布局均通过本次正式测试，并已完成 GitHub Pages 发布验收。GitHub 动态仓库卡片的线上未认证 API 限流降级已于 2026-08-31 改为构建期数据方案修复（见上文销项）；Pio 的视口切换限制已于 2026-08-31 由提交 `171f3be` 修复并经线上复验销项（见上文）。
