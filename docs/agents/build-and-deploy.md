# 构建链、依赖与部署约定

> Astro 7 构建链与依赖约束、依赖升级裁决、部署流水线，以及 **content layer 缓存吃掉插件改动** 那个大坑。**改构建/依赖/部署，或动 remark/rehype 插件前读这份**。

（本文由 `AGENTS.md` 的「构建链、依赖与部署约定」一节迁出，随实际升级维护；带日期的历史证据保留。）

## 升级路线与交接（2026-11-03）

完整分批顺序、已发布/仅本地提交的区别、剩余阻塞与解除条件、同输入构建 A/B 及最终发布门禁统一见[升级总计划](../plans/2026-11-03-dependency-upgrade-roadmap.md)。第三批 Svelte、第四批 Autoprefixer 与第五批 KaTeX 均已完成本地验收（详见下方对应条目），阶段四结束；**阶段五的 KaTeX 已先落地，Tailwind 4 / Mermaid 12 / Satori 0.63 仍未开始**；重大版本迁移先讨论，不直接全量更新。各专项报告保留原阶段的历史结果，发布状态以总计划中的固定提交与发布证据为准。

## 构建链与依赖约束（2026-11-02 起 Astro 7）

- **KaTeX 独立升级（2026-11-03）**：`katex` 精确固定 **0.19.1**（原 `^0.16.25` / 安装 0.16.47），并在 `package.json` 新增 **`"pnpm": { "overrides": { "katex": "0.19.1" } }`**。**这条 override 不是可选优化，是必需项**：`rehype-katex@7.0.1`（latest）把 katex 锚在 `^0.16.0`，对 0.x 等于 `>=0.16.0 <0.17.0`，不含 0.19.1；只升根包会让构建期 HTML（由嵌套 0.16.47 生成）输出旧类名 `.base`/`.strut`，而运行期 CSS（来自根包 0.19.1）选择新类名 `.katex-base`/`.katex-strut`，样式对不上、公式基线漂移。实测错配下 40 个真实公式样本有 **20 个几何尺寸改变**、页面 2139→2269 px、**5.02% 像素不同**。
  **破坏性变更比评估文档多两条**：0.17.0 改内部 `__defineFunction`（本站不受影响）；**0.18.0 给 20 个内部 CSS 类加 `katex-` 前缀**（[#4229](https://github.com/KaTeX/KaTeX/pull/4229)），影响全部公式 HTML——若将来在 CSS 或内容消毒器白名单里写 KaTeX 内部类名，必须跟着改。另有 [CVE-2026-103923](https://nvd.nist.gov/vuln/detail/CVE-2026-103923)（`>=0.11.0 <0.18.2` 原型污染→XSS，0.18.2 修复），本站静态、无外部输入、未传 `trust`，实际不可利用。
  **验收必须加一条判据（三项常规判据抓不到这类错配）**：直接数产物 HTML 里旧类名出现次数——`.base` 与 `.strut` 必须为 **0**，`.katex-base` 与 `.katex-strut` 必须非零。原因是：公式 A/B 脚本若 `import katex` 会命中根包、根本不测构建用的那一份；「字体族是否齐全」在错配下两侧都齐；「`.katex` 盒子宽高 > 0」在错配下也非零，只是高度错了。另外，`micromark-extension-math` 的包入口会 re-export `html.js`（其顶层 `import katex`），所以那份 katex 在构建期**确实会被加载**，不能当作「本站不经过」。
  **`pnpm.overrides` 是本仓库第一次引入的机制**，它让 `rehype-katex` 与 `mermaid` 跑在超出各自声明范围的 katex 上（已获站长批准）。将来 `rehype-katex` 发布支持 katex 0.19+ 的版本后，应重新评估这条 override 是否还需要。证据见 [KaTeX 专项验收](../plans/2026-11-03-katex-upgrade.md)。
- **Autoprefixer 独立升级（2026-11-03）**：`autoprefixer` 精确固定 **10.6.2**（原 `^10.5.4`）。10.6.x 抬高了数据依赖下限，升级**必然**联动 `browserslist 4.28.7→4.29.5`、`caniuse-lite 1.0.30001806→1.0.30001820`；本项目**没有显式 browserslist 配置**（无 `browserslist` 键、无 `.browserslistrc`），走 `defaults`，目标集因此由 **31 项变 36 项**。**实测 15 份产物 CSS 逐字节零变化、152 处前缀逐文件 0 差异**——本站用到的那些前缀属性在旧新目标集的最低版本上都需要同样前缀，前后都跨不过分界线。变量隔离实验（postcss 直处理同一份产物 CSS，旧代码+旧数据 vs 新代码+新数据）输出逐字节相同并含自检，排除了构建缓存造成的假相同。**不要把这个结论外推**：一旦本站新增使用某个处于前缀分界线附近的属性，或将来把 `defaults` 换成更保守的显式目标集，这次「数据更新零影响」就不再成立，必须重测。证据见 [Autoprefixer 专项验收](../plans/2026-11-03-autoprefixer-upgrade.md)。
- **样式指纹 A/B 的端口陷阱（2026-11-03 实测）**：`scripts/upgrade-style-audit.mjs` 的 URL 归一化正则只匹配 `localhost:<port>`，**不匹配 `127.0.0.1:<port>`**。用两个不同端口分别 `capture` 再 `diff`，会把 `cursor: url(...)` 与 `background-image: url(...)` 里的端口号全判成差异（2026-11-03 一次性得到 15820 条假差异）。**两侧必须用同一个 `localhost:<port>`**；换端口就等于换了输入。
- **`crypto.getRandomValues` 让语录页无法零差异判定**：`/albums/` 与 `/timeline/` 的语录块（`figure:5` 内的 `span.quote-band__char`）每次加载随机选句、逐字符宽度不同，`Math.random` 种子化也压不住。判断它是不是真噪声的方法：**对同一份构建连采两次**，若差异页集合与 A/B 的完全相同，即可归因为随机而非回归（2026-11-03 按此法把 208 条差异归零）。

- **Svelte 独立升级（2026-11-03）**：`svelte` 精确固定 **5.57.3**（原 `^5.45.5` / 安装 5.56.8），跨 minor。`@astrojs/svelte` 9.1.2、`@sveltejs/vite-plugin-svelte` 7.3.1、`svelte2tsx` 0.7.63、`prettier-plugin-svelte` 4.1.1 本体均未动，只做了 peer 重绑定。**本站 Svelte 语法面很窄**：全仓 `.svelte` 文件里没有任何 `on:` 指令，`Search.svelte` 用属性式 `onsubmit={submit}`、`Pio.svelte` 无 DOM 事件绑定，因此「legacy 事件指令兼容性」这类风险对本站不适用；两个组件都用 `onMount` 与 `bind:`。同输入 A/B 中非 HTML 且非 Svelte chunk 的产物逐字节 0 差异，156 个 HTML 归一化资源哈希后 0 差异；两版编译器实际 SSR `render()` 出的 HTML 逐字节相同。**这次升级不带来安全收益**（OSV 最高 fixed 版本 5.55.7 < 5.56.8），别把它写成安全修复。证据见 [Svelte 专项验收](../plans/2026-11-03-svelte-upgrade.md)。
- **依赖升级必须是精确版本**：本仓库对逐个升级的包一律写成不带 `^` 的固定版本（`astro: "7.4.4"`、`pagefind: "1.6.0"`、`prettier: "3.9.8"`、`@astrojs/check: "0.9.12"`、`svelte: "5.57.3"`）。注意 `pnpm add --save-exact <pkg>@<ver>` 之外还要复核写进去的 specifier——2026-11-03 实测 `pnpm add --save-exact svelte@5.57.3` 写入的是 `^5.57.3`，需手工改回并重新 `pnpm install` 让锁文件 specifier 跟着变；只改 `package.json` 不改锁会让 `--frozen-lockfile` 直接失败。

- **Pagefind 独立升级（2026-11-02）**：精确固定 1.6.0，Extended 构建使用 ICU4X 分词；部署应包含同一轮生成的整个 `dist/pagefind/`，含 JS、WASM 与索引分片。保留自定义 `Search.svelte`、Svelte 版本、收录规则与默认权重。本地 A/B 收录文档集合与标题相同；查询候选集、排名、摘要和索引大小有变化，既有单字误匹配减少，也出现新的弱相关部分匹配，不能统称检索质量提升。分片失败后再次提交在新版可恢复，但首轮仍表现为“没有找到”；主模块加载失败才走现有通用错误提示。具体变化、故障对照和验收边界见 [Pagefind 专项验收](../plans/2026-11-02-pagefind-upgrade.md)。

- **检查器独立升级（2026-11-02）**：`@astrojs/check` 精确固定 0.9.12；语言服务更新至 2.17.3，检查链新增 `@astrojs/astro2tsx` 0.1.3 及其 WASM 依赖，文件监听使用 chokidar 5。TypeScript 仍为 5.9.3，其他直接依赖不联动。旧新版本地单次检查均为 0 errors / 0 warnings / 6 hints；已有 `.ts` / `.astro` 文件的错误修改、修正及单次检查失败码均已验证。**watch 的既有限制**：0.9.10 与 0.9.12 均复现新增文件未进入当前诊断清单；不能把“Watching for changes”或零错误视为新文件已检查，新增文件后应重新运行单次检查或重启 watch。没有为此修改依赖源码或放宽诊断级别。对照方法和构建/浏览器证据见 [检查器专项验收](../plans/2026-11-02-astro-check-upgrade.md)。

- **Astro 7 实施（2026-11-02）**：已安装 Astro 7.4.4 / Svelte 集成 9.1.2 / Markdown 7.3.5 / Expressive Code 与两插件 0.44.3。升级信息的原始快照见 [复核报告](../plans/2026-11-02-build-system-upgrade-recheck.md)，实际构建与 A/B、浏览器结果及剩余边界见 [实施验收](../plans/2026-11-02-astro7-upgrade.md)。该批保持 Tailwind 3.4.19、TypeScript 5.9.3、Prettier 3.9.6、pnpm 10.26.2；随后 Prettier 单独升至精确版本 3.9.8，见下条。
- **Prettier 公式保护（2026-11-02）**：当前精确固定 `prettier: "3.9.8"`，不放宽为 caret；保留 Astro/Svelte 插件及现有格式化覆盖范围。3.9.9 / 3.9.10 的 Markdown 解析器内部关闭单美元公式识别，会把公式星号识别为 emphasis；这是 [PR #20140](https://github.com/prettier/prettier/pull/20140) 与未关闭的 [issue #20199](https://github.com/prettier/prettier/issues/20199) 所记录的问题，不是本站 KaTeX 渲染器故障。`pnpm test:prettier-math` 以本站 remark-math 提取格式化前后的公式，比较公式内容与 KaTeX 渲染结果；已接入 `lint.yml`。它不依赖 Prettier 内部 AST，不忽略文章、不改美元分隔符、不切 MDX、不打私有补丁。实施证据与验证边界见 [专项验收](../plans/2026-11-02-prettier-upgrade.md)。
- **AI 日报迁移已完成（2026-11-02 收尾）**：本仓库不再包含日报源码、快照或 React 页面集成；`tailwind.config.cjs` 的日报 `--t-*` 映射与 `tsconfig.json` 的 JSX 设置已清理，`react` 运行时依赖已移除。OG 图 `src/pages/og/[...slug].png.ts` 给 Satori 传普通元素对象，仍使用 `ReactNode` 类型，因此保留 `@types/react`。主站仅维护导航/sitemap 与边界验证；`pnpm test:ai-news-ownership` 在构建后检查源目录及日报产物目录缺席。独立项目的配置、应用测试与发布均在 `CaiYan12/ai-news` 维护，历史回退说明不代表主站仍持有其实现。
- 版本：astro 7.4.4 / @astrojs/svelte 9.1.2 / astro-expressive-code 0.44.3（六包联动组精确固定）/ @swup/astro 1.8.0（**声明已于 2026-11-03 从 `^1.7.0` 改为 `^1.8.0`，与安装版本对齐**；改 specifier 必须连 lock 一起改，否则 CI 的 `pnpm install --frozen-lockfile` 会直接失败） / tailwindcss 3.4.x。**Tailwind 不再经 @astrojs/tailwind**——该集成 peer 只到 Astro 5，是当初升级的硬阻碍；现由根 `postcss.config.mjs` 直连 `[tailwindcss/nesting, tailwindcss, autoprefixer]`，顺序照集成原先的实际产出，`autoprefixer` 已转为直接依赖。原配置文件里 import 的 `postcss-import` 既非声明依赖、全站 CSS 又零 `@import`，会让该文件在集成内静默加载失败，已移除；**不要再加回 @astrojs/tailwind**。
- **Tailwind v3 的 `@layer` 是构建期指令，不是 CSS 级联层——产物里根本不存在 `@layer`**（实测：`dist` 内九个 css 文件 `grep -c '@layer'` 全为 0）。因此源码里的 `@layer base/components/utilities` 只影响"被展开到何处"，**冲突一律按「特异性 → 源顺序」判定**，不存在"无层规则胜过 @layer"这种级联层语义。本仓库两处历史结论曾据此误判：① 根字号 `html{font-size:13px}`（写在层内）失效的真因是它被更靠后源顺序的同特异性 `html{font-size:100%}` 压掉，而非层序；② 行内代码 `.prose code{font-size:13px}` 被描述成"关在 `@media (max-width:680px)` 内、桌面永不生效"，实际它在 `@layer components` 内、桌面一直生效，压住它的是另一条规则的更高特异性。推断样式覆盖关系时请直接量计算值，别按层语义推理。
- **Markdown 处理器已迁到 `markdown.processor: unified({...})`（2026-09-20，构建告警已清零）**：Astro 6.4.0 起提供 `processor`，且它的默认值本就是 `unified()`，所以这一步只是把插件从「隐式默认 + 事后折叠」改成显式声明，`git diff -w` 只剩 import 与包裹两行。以下为 2026-09-20 的 Astro 6 迁移历史，不是 Astro 7 的依赖规则；当前仍显式使用 unified，Astro 7.4.4 的 Markdown 可选 peer 为 `^7.3.0`，本站直接固定 7.3.5。历史要点：① `@astrojs/markdown-remark` 必须作为直接依赖并**精确对齐 astro 自己解析到的版本**——astro 6.4.8 的 package.json 里是硬钉 `7.2.0`（不是范围），装 latest 7.3.1 不会去重、会变成两份副本；② 旧的 `markdown.remarkPlugins` 由 `core/config/validate.js` 的 `coerceLegacyMarkdownPlugins` 在 **resolveConfig 内部** push 进 `processor.options`，而 `build()` 是先 resolveConfig 再跑集成钩子，所以 expressive-code 的 `rehypePlugins.push(rehypeExpressiveCode)` 在两条路径下都排在我们插件**之后**，顺序不变；③ `gfm`/`smartypants` 在 7.2.0 内有 `processor.options.gfm ?? shared.gfm` 兜底，本站未设置。**同版本 Markdown 管线调整的历史 A/B 方法**：两侧都用 `pnpm exec astro build`（绕开 fetch 脚本以保证输入相同）并先删 `node_modules/.astro/` 与 `.astro/data-store.json`；同版本、同配置时 `dist/_astro/**` 逐字节相同是最强信号；跨编译器升级不以资源 hash 相同为门禁，而比较路由、正文语义、计算样式和交互；HTML 侧必须先剥掉 `<div class="widget tab-widget" data-tab-widget>`（侧栏「文章推荐」含构建期随机挑选），否则每次构建都有约 122 个页面的假性差异；用 `--import` 预加载去改 `Math.random` **消不掉**这层噪声（Astro 的 markdown 渲染跑在 worker 线程里，预加载只在主线程生效，实测无效）。要把噪声归零做全量证明：把 `src/utils/shuffle.ts` 的 `shuffleArray` 临时改成原样返回，两侧都跑 `astro build` + `inject-buddha-banner` + `pagefind`，再比对完整产物（本次结果：1114 个文件逐字节 0 差异，含 pagefind 索引）。（升级当时另有比对：三篇文章正文 HTML 与 Astro 5 完全一致，含 73KB 的 Markdown 语法示例文。）
- `getTagList()` / `getCategoryList()` **必须保持全序**（文章数倒序 → 最早引入该标签/分类的文章时间 → 名称）。原因：并列名次若只靠 `Array.prototype.sort` 的稳定性，顺序取决于 `getCollection()` 的遍历顺序，而 Astro 5 与 6 定义不同——升级实测会让侧栏标签云 32 个药丸重排，并连带改变 `.blogtags` 的 nth-child 六色轮换归属。任何新增的"按计数排序"列表同理。
- `src/constants/*.json` 与 `src/data/site-stats.json` 的排版由 `scripts/lib/write-json.mjs` 的 `formatJson()` 在生产端保证（`JSON.stringify(x, null, 制表符)` 再过一遍 Prettier），七个产物幂等、`prettier --check ./src` 覆盖它们。旧写法下六个 constants 用同一种序列化，四个只是碰巧没有短数组才合规 —— 短数组（如 `"variants": [480, 720, 1080, 1440]`）会被 Prettier 折行而 `JSON.stringify` 每行一个元素，这正是 `image-manifest.json` / `github-projects.json` 当初被塞进 `.prettierignore` 的原因。**新增写 JSON 产物的脚本请走同一个写入器，别再为 JSON 生成物加 ignore**。vendored/逐字保留的原件按 `.prettierignore` 维护；技能 SVG 因来源 SHA-256 保持原字节，来源 JSON 仍由 formatJson 统一排版。
- **deploy.yml 的 "Sync Giscus comments" 步骤跑在 `pnpm install` 之前**（`node scripts/sync-site-stats.mjs`，那时 `node_modules` 还不存在），所以这条链路上的脚本只能用 Node 内置模块。`formatJson()` 因此对 prettier 用 `try { await import("prettier") }` 延迟加载、缺失即回落到纯 tab 缩进 —— CI 那次写出的排版只留在 runner 工作区、不回提交，站点内容不受影响；本地装了 devDependencies 才是 Prettier 排版。给这条链路加任何包依赖都会让部署在 13 秒内以 `ERR_MODULE_NOT_FOUND` 失败（实测踩过）。
- 本地安装须带项目内 store：`pnpm add --store-dir .pnpm-store <pkg>`（`node_modules/.modules.yaml` 记录 `storeDir: <repo>/.pnpm-store/v10`，全局配置已不指向它，裸跑 add 会报 store 版本不匹配）。
- **依赖升级是人工决策，`.github/dependabot.yml` 把已钉死的包按名字整条 `ignore`（2026-10-01 立）**。原先的通配 `ignore` 只挡 `version-update:semver-major`，挡不住 0.x 包——实测 Dependabot 把 `satori 0.26.0→0.33.5`、`katex 0.16.47→0.18.9`、`astro-expressive-code 0.43.1→0.44.2` 全归进「minor」组提了 PR（expressive-code 那条还**改写了范围本身**：caret 在 0.x 上本就跨不过 minor，`^0.43.1` 被改成 `^0.44.2`）。于是名单内整条忽略：`astro`、`@astrojs/svelte`、`@astrojs/markdown-remark`、`astro-expressive-code` 与两个 `@expressive-code/plugin-*`、`satori`、`katex`、`@swup/astro`、`prettier`。**为什么必须人工看**：本仓库 CI 的主要检查是 `Astro Check`、`prettier --check ./src ./docs` 与 `Astro Build`（2026-11-02 另加只读公式保护测试），约 250 条实机判据（`smoke:ui` 144／侧栏天气 68／`test:fancybox` 27／`domain-weather` 29／`test:weather` 37）**一条都不在 CI 里**，所以「PR 三项全绿」不构成升级依据。**`prettier` 尤其只能人工升**：3.9.6→3.9.9 会把行内 `$…$` 里的 `*` 当 emphasis 改写——24 篇文章逐篇双版本跑下来只有 `src/content/posts/20260320000000/index.md` 变化，13 行，形如 `$Q_2^*>Q_1^*$` → `$Q_2^_>Q_1^_$`，后者拿本项目 katex 直接喂 `renderToString` 实测抛 `KaTeX parse error: Expected group after '^'`（`Q_1^*=Q_1^u` → `Q_1^_=Q_1^u` 同错）。该篇有 764 个 `$`、35 处「行内公式里带 `*`」却只被改了 13 行，当时未能抽取最小样例；2026-11-02 已确认单行 `$Q_2^*>Q_1^*$` 即可复现，原“需要整篇解析态”的推论作废。历史数字保留，但不能据此认为只有这一篇文章会受影响。**「CI 红了就跑 `pnpm format`」这条路会把已发布文章的公式打断**。日报的 DOMPurify 消毒依赖由独立项目维护。
- 升级回归验证脚本 `scripts/upgrade-style-audit.mjs`（2026-11-02 Astro 6→7 已复用）：`capture` 用 Playwright 对 `AUDIT_PAGES` 声明的关键页逐元素采集计算样式指纹（含 `::before/::after`），`diff` 支持顺序无关比对。采集前必须冻结动画、种子化 `Math.random`（否则稿纸逐字符抖动不可复现），并排除明月浩空播放器（远端异步、含 `#myhk*` 的 id 选择器，`[class*=]` 抓不到）、看板娘、轮播、3D 标签云、swup 瞬时类名与带端口的绝对 url——这些都是实测过的假阳性来源。**同数据的新旧构建 A/B 才是有效比对**；线上产物与本地基线必然存在差异（CI 会重新生成 GitHub 快照与贡献日历、幻灯片当前帧与播放器歌单属异步状态），不要拿线上比对当样式结论。2026-11-02 新增注意：语录随机使用 `crypto.getRandomValues`，只固定 Math.random 仍会有选句/高度噪声；截图还要冻结或遮罩 canvas 樱花。Lightning CSS 的渐变方向/终点和零单位存在等价序列化差异，必须保留原始值再解释，不能把原始指纹红自动写成回归。配合 `Last-Modified` 与内容断言使用。`deploy.yml` 的 `cache: false` 仍不得回退。

## Astro 7 配置守卫（2026-11-02）

- `astro.config.mjs` 显式 `compressHTML: true`，保留旧版行内空格策略；Markdown 继续走 `unified(markdownPipeline())`，不切换 Sätteri、不调整插件顺序。
- Vite 8 不自动迁移旧 `esbuild.drop/pure`。生产使用 `build.rolldownOptions.output.minify.compress`，`dropDebugger: true` 与 `treeshake.manualPureFunctions: ["console.log", "console.debug"]`；实测保留日志实参副作用及 warn/error，不能换成删全部 console 的选项。
- `vite.server.watch.ignored` 排除本地 `.pnpm-store` 与 `output`。本轮 Windows CPU profile 显示启动主要阻塞于文件监听注册；原配置曾让内容初始化 RPC 超时、文章集合为空。排除这两个非源码目录后须验证真实文章路由，不能只看首页 HTTP 200。详细首失败、复测与边界见实施报告；不要外部化整个 Astro 或增加 RPC 超时来掩盖。
- `.github/workflows/build.yml` 检查/构建均用 Node 24，与本地及固定 Pages action 的默认主版本一致；Astro 7.4.4 包要求 Node `>=22.23.4`。线上验证以具体发布提交对应的 Actions 结果与实际产物为准，不以本地结果冒充发布验证。

## 改 specifier 会触发依赖图重算，不等于零风险（2026-11-03 实测）

把 `@swup/astro` 的声明从 `^1.7.0` 改成 `^1.8.0`（只是对齐已安装版本，1.8.0 本就是 latest），结果 pnpm 重算整棵树后锁文件**净 143 增 207 删**：

- `postcss@8.5.25` 上下文下的整套副本（`cssnano` 族、`postcss-calc`/`colormin`/`minify-*` 等约 40 个包）被并到 `postcss@8.5.32` 上下文，`autoprefixer` 的 postcss peer 上下文随之从 `8.5.25` 变 `8.5.32`。
- `browserslist@4.28.7`、`caniuse-lite@1.0.30001806`、`acorn@8.18.0` 等旧条目从锁文件消失——**是去重副产品，不是版本倒退**；磁盘目录仍在，只是不再被引用。

**本次实测对产物零影响**：直接依赖 `pnpm list --depth 0` 零变化；重建后与基线逐字节比对 1176 项完全相同、0 增删。

**所以规矩是**：任何 specifier 改动（哪怕「只是对齐版本」）都必须走完整验证链——`pnpm list --depth 0` 前后比对 → 重建 → 全产物逐字节比对 → locked 安装，不能只看 `package.json` 那一行 diff 就认为安全。

## ⚠️ 大坑警告：Astro content layer 缓存会"吃掉"插件改动（本地与 CI 都会踩）

**症状**：修改了 remark/rehype 插件（或任何影响 Markdown 渲染的逻辑）后构建，产物仍是旧 HTML，全程无任何报错。本地和线上都可能发生，2026-08-31 两侧均已实际踩坑。

**根因**：Astro 5 content layer 会把渲染结果缓存到 data store；内容文件未变时构建直接复用缓存、**不重跑插件**；touch 内容文件 mtime 也无法使其失效。当前命令可能在 `node_modules/.astro/data-store.json` 或 `.astro/data-store.json` 生成 data store，不能只依赖其中一处。

**本地规则**：改插件逻辑后先删除 `node_modules/.astro/`，并在存在时删除 `.astro/data-store.json`，再构建。

**CI 规则**：`withastro/action` 默认 `cache: true` 会跨 run 缓存 `node_modules/.astro`，同样复用旧渲染——**`deploy.yml` 已传 `cache: false` 关闭，任何 workflow 改动都不得恢复该缓存**。`build.yml` 用 `setup-node`（仅缓存 pnpm store）不受影响。

**CI 执行拓扑**：Pull Request 由 `build.yml` 执行 `Astro Check` 和完整 `Astro Build`，`lint.yml` 执行 Prettier 检查与公式保护测试；`main` push 时 `build.yml` 的 `Astro Build` job 通过 `if: ${{ github.event_name == 'pull_request' }}` 跳过，完整构建只由 `deploy.yml` 执行一次后部署。`deploy.yml` 也支持 `workflow_dispatch`，并通过 `concurrency` 取消同一 workflow/ref 的旧部署。

**线上验证部署是否生效**：Fastly 边缘缓存 HTML `max-age=600`，且缓存键不含查询串（加 `?cb=` 无效）；看响应头 `Last-Modified` 是否晚于部署完成时间，或下载 Actions run 的 `github-pages` artifact 直接查 HTML（确定性验证）。

**跨平台部署验证不能用 JS chunk 哈希或 Pagefind 索引哈希当身份证据（2026-11-03 实测）**：同一次提交，本地 Windows 构建出 `Pio.sk4GzkC6.js`，CI Linux 构建出 `Pio.CS2Sx7XP.js`，Pagefind 索引哈希也不同（`zh-cn_8c3aa7783188c` vs `zh-cn_c626e8a99f542`）。**这不是部署没生效**，而是内容寻址哈希与索引字节受平台影响。当时差点据此误判发布失败。

可用的平台无关证据，按可靠性排序：

1. **CSS 资源名**——实测两侧完全一致（`Layout.BkMsQfIt.css`、`MainGridLayout.CKaYaVTj.css`、`katex.BPpMaF0t.css`、`noto-sans-sc.WH83ST03.css`）。
2. **页面可见文本**——剥掉 `data-tab-widget` 块（客户端脚本渲染，抓取时机不同会读到占位态或渲染态）、脚本、样式与空白后逐字节比。实测 6 个代表页 5 页全等。
3. **Svelte 运行时特征字符串计数**——不随压缩改变的内部错误码，如 `svelte` 19 次、`state_unsafe_mutation` 1 次、`each_key_duplicate` 1 次。
4. **CSS 作用域 hash**——如 Pio 容器的 `svelte-a15wih`，两侧一致即同一份源码编译。
5. **真实浏览器功能**——搜索水合、Swup 切页、KaTeX 渲染、看板娘实例数，最终判据。

**注意 `/about/` 的贡献日历两侧必然不同**：构建链里的 `fetch-github-contributions.mjs` 会实时抓 GitHub 数据，CI 抓到的比本地新（实测线上 1912 次 / 本地 1881 次）。这是「线上确为新构建」的正面证据，不要当回归。

**线上导航不要用 `waitUntil:"load"`**：第三方播放器会拖住 `load` 事件导致 30s 超时，改用 `domcontentloaded`。

- 日报 `/ai-news/` 由独立项目发布，主站 sitemap 使用 `customPages` 保留地址；#41 私有文章检查仍从 sitemap 获取页面清单。恢复主站清理前版本时，先从主站历史定位 `remove main AI news implementation` 清理提交，在主站 `main` 对该提交执行普通 `git revert <清理提交SHA>`，解决可能的后续冲突并验证构建，然后按正常主站流程推送部署；新项目取消发布本身不能恢复已删除的主站文件。以上为恢复步骤，未声称本次演练过清理后的回退。恢复时需核对部署与边缘缓存、浏览器缓存及两项目实际资源身份。
