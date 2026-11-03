# 网站构建系统完整升级与交接计划

> **For agentic workers:** 使用宿主可用的 `superpowers:executing-plans` 按批执行；先发现并读取实际技能来源。步骤用 checkbox 跟踪，不因换 Harness 重跑已完成批次。

**Goal:** 在保留本站视觉、内容、公式和交互契约的前提下，完成适合当前项目的依赖升级；对暂不能升级的包记录证据、缓解措施和解除条件，不以追平所有 `latest` 作为成功标准。

**Architecture:** 一个直接依赖一批；只有经过证明必须联动的依赖组才能合批。每批先保存基线，再严格安装、同输入构建 A/B、真实浏览器验收、同步文档并独立本地提交。发布是另一个阶段，需要用户明确授权。

**Tech Stack:** Astro 7、Svelte 5、Tailwind 3 / PostCSS、Pagefind Extended、unified / KaTeX、pnpm 10、Node 24；具体安装版本以实际环境及锁文件为准。

**Spec / 裁决来源:** 本会话站长确认的分批升级顺序、仓库 `AGENTS.md`、`docs/agents/build-and-deploy.md`、各专项报告。本文汇总路线与接续步骤，不替代原始验收证据。

## 全局约束

- 工作区 `D:\pages\myblog`，仓库 `CaiYan12/caiyan12.github.io`；沿用 `main`，不擅自建分支、不混入其他修改或 stash。
- AI News 移植已完成，本项目不再包含其实现；保留 ADR 0009 规定的导航、sitemap 和主站边界验证，不能重新加入 React 日报运行时。
- 先读取 `AGENTS.md`、项目记忆索引 `.codex/memories/index.md`，以及本批命中的 `docs/agents/` 分支文档。AGENTS 固定上下文不改。
- 版本研究先用 Context7 resolve → query；发行版本、peer、engines、完整性以官方 registry、标签源码、实际安装核对。本文引用的目标是历史研究快照，不承诺仍为最新版。
- 保留文章、数据快照、Markdown unified 管线、视觉与交互；不为通过门禁修改依赖源码、扩大忽略或屏蔽错误。
- 直接依赖变更与必要传递变化分别记录；精确固定本批目标，同时同步锁文件，禁止全量 `update --latest`。
- 代码与相关文档同批提交；每批更新 CHANGELOG、构建文档及受影响的命令/组件/样式文档。文档数字注明日期、环境和证据。
- 只读接管后继续本地分批工作；本交接未授权新一轮 push、部署、外部发帖或 issue 写入。重大迁移须先讨论具体方案。

## Review Focus

1. 安装成功不等于构建、浏览器或 Linux CI 成功；每项只报告实际验证范围。
2. 同输入 A/B：全量构建的联网快照刷新会污染差异；随机推荐只作局部、明确的归一化，保留原始摘要。
3. Svelte / Swup 重复挂载、事件或计时器残留，不能仅以首屏截图通过判断；第三批承担交互与生命周期验证。
4. CSS 前缀、层叠、正文排版及独立 Nice Books 样式，不能只凭 CSS hash 或 Chromium 首屏判断；第四批及 Tailwind 迁移承担。
5. 公式改写、搜索分片故障和跨版本资源混用，不能被格式门禁绿或“无结果”空态掩盖；沿用既有负向证据并在相关批次复测。

## 阶段一：已经完成的工作

| 状态       | 批次                                     | 固定提交 / 详细证据                                                                                                                                                                                                                                                                                                                                                            |
| ---------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [x] 已发布 | AI News 收尾、Astro 7 六包联动及回归修复 | `a42a170c5b1f60fcee870c67aa50a3505d4ef780`；[初轮](2026-11-02-astro7-upgrade.md)、[收口](2026-11-02-astro7-followup.md)、[迁移收尾](2026-11-02-ai-news-closeout.md)                                                                                                                                                                                                            |
| [x] 已发布 | Prettier 3.9.8 与公式保护门禁            | `93b90e7b1cac2ab0518da55612fda6a61dce0883`；[专项报告](2026-11-02-prettier-upgrade.md)；发布证据 `output/prettier-release/final.json`                                                                                                                                                                                                                                          |
| [x] 仅本地 | 第一批 `@astrojs/check` 0.9.10→0.9.12    | `7bcea01474549f76ee4df45e084a7772ddd63388`；[专项报告](2026-11-02-astro-check-upgrade.md)                                                                                                                                                                                                                                                                                      |
| [x] 仅本地 | 第二批 Pagefind 1.5.2→1.6.0              | `23a924ddfe82ac53b4801ac7d76300cb842ed330`；[专项报告](2026-11-02-pagefind-upgrade.md)                                                                                                                                                                                                                                                                                         |
| [x] 仅本地 | 第三批 Svelte 5.56.8→5.57.3              | [专项报告](2026-11-03-svelte-upgrade.md)；本批是 `main` 上紧跟 `23a924d`（第二批 Pagefind）之后的独立本地提交，未推送；需要现值就 `git log --oneline -2`                                                                                                                                                                                                                       |
| [x] 仅本地 | 第四批 Autoprefixer 10.5.4→10.6.2        | [专项报告](2026-11-03-autoprefixer-upgrade.md)；本批是 `main` 上紧跟第三批之后的独立本地提交，未推送；需要现值就 `git log --oneline -3`                                                                                                                                                                                                                                        |
| [x] 仅本地 | 第五批 KaTeX 0.16.47→0.19.1              | [专项报告](2026-11-03-katex-upgrade.md)；紧跟第四批之后的独立本地提交，未推送；**本批新增 `pnpm.overrides: { katex: "0.19.1" }`**（`rehype-katex@7.0.1` 只声明 `^0.16.0`，不加会让构建期 HTML 与运行期 CSS 的类名错配）；需要现值就 `git log --oneline -2`                                                                                                                     |
| [x] 仅本地 | 第六批 Mermaid 11.17.2→12.2.0            | [专项报告](2026-11-03-mermaid-upgrade.md)；紧跟第五批之后的独立本地提交，未推送；**本批在 `src/utils/runtime/mermaid.ts` 加了四组钉值**（`layout: "dagre"` / `theme: "base"`+`look: "classic"` / `flowchart`+`state` 的 `wrappingWidth: 200, minNodeWidth: 0`），缺任何一个都会静默改变全站 99 个图表外观；站长已裁定接受 Safari 17.4+ 下限；需要现值就 `git log --oneline -1` |

2026-11-03 13:01（Asia/Shanghai）交接核对：`git status --short` 为空，以上 Pagefind 提交为本地 HEAD；`git ls-remote --heads origin main` 直接查询仍返回 `93b90e7b1cac2ab0518da55612fda6a61dce0883`。这是查询时点事实，不是对未来远端的保证。本轮后续新增的文档修改另看工作区 diff。

2026-11-03 接手核对（DeepSeek Harness）：本地 HEAD `23a924ddfe82ac53b4801ac7d76300cb842ed330`、分支 `main`、工作区仅上一轮遗留的 `docs/agents/build-and-deploy.md` 修改与未跟踪的本计划；`git ls-remote --heads origin main` 仍返回 `93b90e7`。两档一致，无他人变更。第三批完成后新增一个本地提交，远端未变（本批未推送）。

已发布 Prettier 的 Check / Lint / Pages run 分别为 [41454235595](https://github.com/CaiYan12/caiyan12.github.io/actions/runs/41454235595)、[41454235613](https://github.com/CaiYan12/caiyan12.github.io/actions/runs/41454235613)、[41454235994](https://github.com/CaiYan12/caiyan12.github.io/actions/runs/41454235994)。其旧报告“未发布”描述本地验收阶段；不能据此误判从未发布，也不能把这组 CI 归给后两批提交。

### 必须保留的验收边界

- 检查器：新旧版本均漏掉 watch 启动后新增文件，缓解是重新单次 check 或重启 watch；没有修复。有效已有文件修改对照为新版独立 CLI / 旧版公开 API，不冒充完整外层 Astro wrapper 覆盖。
- Pagefind：31 组全量 API 查询，28 个索引文档集合/标题相同；有检索取舍，例如“看板娘”23→2，“AI 编程”17→22 且部分弱相关。目录总量约 1.57→2.13 MB，不是单次查询流量。
- Pagefind 分片故障：两版首轮均可能显示“没有找到”；第二次查询新版可恢复，旧版未恢复。主模块加载失败有通用错误提示，不代表任意分片失败都有提示或自动重试。
- 前两批本地 Windows 构建 / 浏览器已验收；没有针对这两个提交执行远端 Linux CI 或发布。完整方法、统计与失败路径只引用专项报告，不重写为新的测量。

## 阶段二：每个剩余批次共用的验收流程

以下步骤每批各执行一次，在该批专项计划更新 checkbox；旧批证据不作为新批验证结果。

1. [ ] **基线**：保存固定起点 SHA、工作区 diff、安装版本、源码/数据摘要、Node/pnpm、peer/engines 和 registry 元数据；先在当前已验收版本构建并采集本批 UI / 行为。
2. [ ] **安装**：只改本批精确直接版本，执行 strict peer 安装，审阅锁文件及实际安装前后清单；再做 frozen/offline 安装。若必须联动另一个直接包，先记录兼容证据和调整范围，不静默合批。
3. [ ] **构建对比**：相同文章与快照执行下面的构建链；比较完整文件清单、路由、HTML 正文/公式、JS/CSS、OG、搜索资源。每种非预期差异必须解释或阻断本批。
4. [ ] **检查**：运行 `pnpm check`、`pnpm test:prettier-math`、格式门禁及本批相关测试；新失败先对旧版本复现，再区分既有限制和回归。
5. [ ] **实机**：本地真实无窗口 Chromium 至少 1280×900 / 390×900，同状态截图并实际查看；覆盖本批交互、Swup 往返、pageerror、本站 requestfailed、横向溢出。需要跨浏览器的变更另列环境，不能以 Chromium 替代。
6. [ ] **收口**：同步专项计划、本文状态、CHANGELOG 和相关代理文档；检查 diff 与原有源码摘要，清理仅本轮自有探针/进程，独立本地提交。阻断时保留失败日志和明确恢复点。

已验证过的命令形态（执行时仍以 `package.json` / 命令文档为真源）：

```powershell
$env:NODE_USE_ENV_PROXY = '1'
pnpm exec astro build
node scripts/inject-buddha-banner.mjs
pnpm exec pagefind --site dist
pnpm check
pnpm test:prettier-math
pnpm exec prettier --check ./src ./docs package.json
git diff --check
```

每条原生命令立即记录退出码和完整日志；上一条失败不得仍把整个序列写成通过。A/B 阶段不用完整 `pnpm build` 的联网刷新链代替固定输入。若动 remark/rehype，先按构建文档清除指定 content layer 缓存，避免旧 HTML 假通过；不要清空无关目录。

安装沿用项目 store：`pnpm install --ignore-scripts --strict-peer-dependencies --store-dir .pnpm-store --registry https://registry.npmjs.org`；随后 `pnpm install --frozen-lockfile --offline --ignore-scripts --strict-peer-dependencies --store-dir .pnpm-store`。`--ignore-scripts` 的解析成功不能证明未来新增原生依赖已可运行，需要额外实际构建验证。

## 阶段三：第三批 Svelte（已完成，仅本地）

**状态：** [x] 2026-11-03 完成本地验收并本地提交（未推送）。专项报告与完整证据见 [Svelte 专项验收](2026-11-03-svelte-upgrade.md)。

**结果摘要：** `svelte` 由 `^5.45.5`（安装 5.56.8）改为**精确 5.57.3**（跨 minor）。直接依赖安装版本只有 svelte 一行变化；未联动 Astro、`@astrojs/svelte`、Prettier 插件本体或 Pagefind。同输入 A/B：两侧均 229 页 / 230 HTML / 28 篇索引 / 47574 词，非 HTML 且非 Svelte chunk 的产物逐字节 0 差异，156 个 HTML 归一化资源哈希后 0 差异；两版编译器实际 SSR `render()` 的 HTML 逐字节相同。实机用同一套 32 条判据分别打升级前后产物，均 32/32 且**逐条读数一致**。dev HMR 7/7，源码 SHA-256 逐字节还原。Check 0/0/6，公式 38/38，格式门禁通过，`test:lib` 16/16、`test:utils` 261/261。

**两条必须记住的核查结论：** ① 该区间唯一具破坏性的条目是 #18900（`{:else}` 重复子句改报错），本站不触发；本站 `.svelte` 文件里**没有任何 `on:` 指令**，所以「legacy 事件指令兼容性」对本站不适用。② **本次升级不带来安全收益**——OSV 全量查询中最高的 fixed 版本是 5.55.7，低于区间下界 5.56.8，5.56.8 已含全部已知修复。

**原始计划条目（保留作追溯）：**

**范围 / 文件：** `package.json`、`pnpm-lock.yaml`；新增本批专项计划，更新 CHANGELOG、本文及 `docs/agents/build-and-deploy.md` / `components.md` / `commands.md`。默认不修改 `src/components/control/Search.svelte`、`src/components/widget/Pio.svelte`、`src/pages/search.astro`、`src/layouts/Layout.astro`。

**输入 / 输出：** 输入为已验收的 Pagefind 1.6.0 基线，Svelte 当前安装 5.56.8；输出为单独验收的精确 Svelte 目标及构建/行为差异报告。2026-11-02 查得目标 5.57.3，**这是跨 minor，不是 patch**。接手时重新核对该版本发行说明和 peer，不擅自替换为更高目标。

- [x] 按共用流程保存 Svelte 5.56.8 基线，读取集成 9.1.2 实际 peer、目标发行说明与相关修复；确认升级不需要迁移组件语法。
- [x] 仅将 Svelte 精确升级至经复核的既定目标，记录 Svelte 编译器及必要 peer 重新绑定，不混升集成、Prettier 插件或 Pagefind。
- [x] 同输入构建 A/B：重点比较 Svelte bundle 与水合标记，允许编译产物变化，要求正文/公式/路由/样式语义不变；运行 check、公式和格式检查。
- [x] 搜索 UI：URL 预填、中文/英文、Enter、空查询、无结果、忙碌重复提交、结果 Swup 切页及后退；采样内容与现有 Pagefind 新基线对齐，不把其分词差异再归给 Svelte。
- [x] 看板娘：清空或明确控制 `posterGirl` 初始状态，验证默认折叠、召唤/收起、交互后切页返回；检查重复 DOM、重复事件/定时器和销毁后的回调。`client:idle` 首屏默认折叠不等于水合失败。
- [x] 在 dev 验证现有 Svelte 文件实际修改、恢复的 HMR；只操作自有可恢复探针，先确认服务归属，不停止用户服务。
- [x] 桌面/移动截图、异常与请求检查通过后，独立提交并更新本表；不自动开始重大迁移或发布。

验收标准：只有该直接包升级；已有行为与视觉无未解释回归；必要编译差异有清单；每个异常说明是否旧版已存在。Svelte 5 官方仍支持旧 `on:event` 语法；生命周期清理返回值和挂载时机以[生命周期文档](https://svelte.dev/docs/svelte/lifecycle-hooks)、[迁移指南](https://svelte.dev/docs/svelte/v5-migration-guide)、[命令式 API](https://svelte.dev/docs/svelte/svelte#mount)为参考。本次交接用 Context7 `/sveltejs/svelte` 复核这些约定，不表示已验证目标版本。

## 阶段四：第四批 Autoprefixer（已完成，仅本地）

**状态：** [x] 2026-11-03 完成本地验收并本地提交（未推送）。专项报告与完整证据见 [Autoprefixer 专项验收](2026-11-03-autoprefixer-upgrade.md)。

**结果摘要：** `autoprefixer` 由 `^10.5.4` 改为**精确 10.6.2**。升级**必然**联动 `browserslist 4.28.7→4.29.5`、`caniuse-lite 1.0.30001806→1.0.30001820`，目标集由 31 项变 36 项。**但 15 份产物 CSS 逐字节零变化**，前缀普查 152 处逐文件 0 差异——本站用到的前缀属性在旧新目标集的最低版本上都需要同样前缀。变量隔离实验（postcss 直处理同一 CSS，旧代码+旧数据 vs 新代码+新数据）输出逐字节相同并有自检。全产物 1176 项逐字节相同、0 增删；样式指纹 21/23 页完全相同，余下 2 页差异经「同构建两次」自检证明是语录 `crypto.getRandomValues` 随机噪声。Check 0/0/6，公式 38/38，浏览器 32/32。

**范围 / 文件：** `package.json`、`pnpm-lock.yaml`；本批专项计划、CHANGELOG、本文及构建/样式/命令文档。默认保留 `postcss.config.mjs`、`tailwind.config.cjs`、`src/styles/global.css` 和 `src/nice-books/styles/books.css`。

**输入 / 输出：** 输入为上一批已验收构建，当前安装 Autoprefixer 10.5.4；2026-11-02 查得目标 10.6.2。输出为仅升级该包及必要传递依赖的 CSS 差异与浏览器报告。

- [x] 核对目标发布说明、PostCSS peer、项目实际 browserslist 解析；保存解析结果及旧 CSS，不猜测默认浏览器集合。
- [x] 按共用流程精确升级；记录 browserslist / caniuse 数据是否随锁变化，保留 `[tailwindcss/nesting, tailwindcss, autoprefixer]` 顺序，不连带迁 Tailwind 4。
- [x] 同输入构建，逐项解释前缀、规则删除/新增、压缩或排序变化；若 CSS 无差异也如实记录，不强造变化。
- [x] 用样式审计脚本和真实浏览器核对主站与 Nice Books：正文/代码/公式、导航/侧栏、搜索、图片与布局；视口与窄屏状态沿用既有契约。
- [x] 根据实际目标浏览器与变化规则确定是否需 Firefox/WebKit 等补验；缺少环境则明确未验证边界，不将 Chromium 通过写成全浏览器通过。
- [x] 检查、截图与相关烟测通过后同步文档，独立本地提交。

## 阶段五：其余依赖盘点与独立迁移

**2026-11-03 实测盘点（第三、四批完成后）：** 站长裁定**收尾阶段五、进入发布验收**，下列跨版本项作为独立事项另排，不阻塞发布：

| 项                    | 当前    | latest | 站长裁定                                                                |
| --------------------- | ------- | ------ | ----------------------------------------------------------------------- |
| Prettier              | 3.9.8   | 3.9.10 | **继续钉死 3.9.8**，定期重查 issue                                      |
| TypeScript            | 5.9.3   | 7.0.2  | 暂缓（check 与 svelte 集成 peer 只到 `^6.0.0`）                         |
| Tailwind              | 3.4.19  | 4.3.4  | 暂缓（属接入方式重写，非升级）                                          |
| Mermaid               | 11.17.2 | 12.2.0 | **已完成（第六批，仅本地）**：[专项报告](2026-11-03-mermaid-upgrade.md) |
| Satori                | 0.26.0  | 0.63.2 | 同上                                                                    |
| KaTeX                 | 0.16.47 | 0.19.1 | **已完成（第五批，仅本地）**：[专项报告](2026-11-03-katex-upgrade.md)   |
| prettier-plugin-astro | 0.14.1  | 1.1.2  | 暂缓                                                                    |
| @types/node           | 24.13.3 | 26.6.6 | 保持 Node 24 类型线                                                     |

**Prettier 仍钉 3.9.8 的硬依据**：2026-11-03 直接查询 GitHub，[issue #20199](https://github.com/prettier/prettier/issues/20199)（「Markdown regression in 3.9.9: inline math is modified after disabling singleDollarTextMath」）**状态仍为 OPEN，`closedAt` 为 null**；而 npm `latest` 就是有问题的 3.9.10。**上游至今没有可用修复版本**，不是我们拖延。

- [ ] 第三、四批完成后重新保存全部直接依赖的已安装/声明/目标版本及支持范围，结合官方发布记录分类，补充本表遗漏的新版本；不凭历史表直接安装。
- [ ] 将无变化的包记为无需升级；将低风险版本另排独立批次；以下跨版本迁移先形成具体方案和验收标准，再由站长确认实施。

| 项目                  | 已知现状 / 历史目标                                                               | 阻塞与缓解                                                                                                                                                                                              | 解除 / 验收要求                                                                                                                                                                               |
| --------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prettier              | 当前 3.9.8；3.9.9/3.9.10 已证明损坏公式                                           | 精确钉 3.9.8，保留公式门禁；不忽略文章、不改美元、不切 MDX、不打私有补丁                                                                                                                                | 重新核对 [issue #20199](https://github.com/prettier/prettier/issues/20199) 与修复版本；最小样例及完整语料公式类型/内容、KaTeX 结果、格式输出全量通过，再做 A/B                                |
| TypeScript            | 当前 5.9.3；历史目标 7.0.2                                                        | check 0.9.12 与 Svelte 集成 9.1.2 的已查 peer 只含 TS 5/6；不放宽 peer 或直接上 TS 7                                                                                                                    | 重新核对整个检查/语言服务/集成支持矩阵；TS 6 可独立评估但未授权实施；类型正负例、check/watch 边界及构建通过。peer 不支持不等于已证明运行时必坏                                                |
| Tailwind              | 当前 3.4.19；历史目标 4.3.3                                                       | 主站与 Nice Books 均为 v3 指令/层叠，另有 PostCSS 配置与 JS 配置加载变化；保留 v3                                                                                                                       | 先讨论浏览器最低版本、Preflight、utility、真实级联层和插件配置；独立迁移两套样式，以计算值、截图、交互及多浏览器验收，不能只改依赖                                                            |
| prettier-plugin-astro | 当前 0.14.1；历史目标 1.1.2                                                       | 格式化迁移独立处理，保留现插件                                                                                                                                                                          | 内存比较所有受影响 Astro 文件的输出，实际加载插件；必要格式修改独立审查，公式与构建仍通过                                                                                                     |
| pnpm                  | 当前 10.26.2；历史 10.x 目标 10.34.9、latest 12.16.1                              | 包管理器主版本独立；不全局替换以免影响其他项目                                                                                                                                                          | 研究 Node/lock/store/构建脚本批准规则及 CI 安装一致性；冻结锁和干净安装、完整构建、CI 后才替换项目 packageManager                                                                             |
| Mermaid               | **已完成 12.2.0**（第六批，仅本地）；原 11.17.2                                   | 已解：12 改了四处默认值（ELK 布局、redux-color/neo、wrappingWidth 200→120、+minNodeWidth 120），前三处需显式钉回，第四处 `layout: "dagre"` 挡不住。另 Safari 17.4+ 浏览器下限属产品决策，站长已裁定接受 | 已验收：99 个图表全量 A/B（宽度一致 99/99、宽高都一致 96/99、SVG 哈希逐字节相同 89/99），真实页 14 个图表逐图尺寸一致、图表区总高 5136px 与升级前相同、零溢出零裁切零报错；两处视觉契约 16/16 |
| Satori                | 当前 0.26.0；历史目标 0.63.2                                                      | 0.x 跨 minor 可能有破坏性变化，不能当常规补丁                                                                                                                                                           | 比较所有 OG 输出的尺寸、文本/字体/截断和像素差异；实际 Node 字体网络链与 CI 构建通过；保留 OG 所需 ReactNode 类型                                                                             |
| KaTeX                 | **已完成 0.19.1**（第五批，仅本地）；原 0.16.47 也落在 CVE-2026-103923 受影响区间 | 已解：`rehype-katex@7.0.1` 只声明 katex `^0.16.0`，必须用 `pnpm.overrides` 统一到 0.19.1，否则构建期 HTML 与运行期 CSS 类名错配                                                                         | 已验收：307 公式逐条 A/B（`class-rename-only` 全覆盖、新错误 0）、非 HTML 产物差异 0、KaTeX 字体族缺失 0、真实浏览器旧类 `.base`/`.strut` 计数为 0、mermaid 14/14 无回归                      |
| @types/node           | 当前 24.13.3；历史 latest 26.6.6                                                  | 保持 Node 24 类型线，不追跨主类型                                                                                                                                                                       | 与实际 Node/CI 相匹配，具体 24.x 新版本另复核                                                                                                                                                 |

历史查询中 typography 0.5.20、dayjs 1.11.23、@types/qrcode 1.5.6，以及 RSS 4.0.19、sitemap 3.7.4、Swup 1.8.0、sharp 0.35.5 无需升级（`@swup/astro` 的声明已于 2026-11-03 从 `^1.7.0` 对齐到 `^1.8.0`，安装版本未变）；这不构成 2026-11-03 对 `latest` 的新查询。完整旧发布快照见[原复核报告](2026-11-02-build-system-upgrade-recheck.md)与 `output/build-upgrade-registry.json`。旧报告把 Svelte 跨 minor 写成“补丁”，本文已纠正，旧文件作为历史研究保留。

## 阶段六：经授权后的发布与总验收（已发布）

**2026-11-03 已发布。** 站长明确授权推送后执行：`git push origin main` 推送 `93b90e7..8f19b98`（5 个本地提交），远端 `main` 现为 `8f19b980085e24534659d966d67007a866a5c205`。

### 发布证据（查询时点 2026-11-03 14:5x Asia/Shanghai）

| Workflow               | Run ID        | 结论    | headSha   |
| ---------------------- | ------------- | ------- | --------- |
| Lint                   | `41592304534` | success | `8f19b98` |
| Build and Check        | `41592304545` | success | `8f19b98` |
| Deploy to GitHub Pages | `41592304550` | success | `8f19b98` |

Linux CI 上 `Astro Check` 报 **0 errors / 6 hints**，与本机一致；构建日志确认安装的是 `svelte 5.57.3`、`autoprefixer 10.6.2`、`pagefind 1.6.0`，Pagefind 索引 28 页 / 47574 词，与本机逐项相同。

### 线上验证

**部署身份（关键方法论修正）**：最初想用「JS chunk 哈希是否等于本地」判部署身份，结果三个 chunk 全部对不上（本地 `Pio.sk4GzkC6.js`，线上 `Pio.CS2Sx7XP.js`）。**这不是部署没生效，而是判据选错了**——JS chunk 的内容寻址哈希与 Pagefind 索引哈希都是**平台相关**的，Windows 与 Linux 构建必然不同。改用平台无关证据后全部对上：

- **CSS 资源名两侧完全一致**：`Layout.BkMsQfIt.css`、`MainGridLayout.CKaYaVTj.css`、`katex.BPpMaF0t.css`、`noto-sans-sc.WH83ST03.css`。
- **页面可见文本逐字节一致**：6 个代表页中 5 页文本 + CSS 全 match。
- **唯一差异是 6/6 的 `/about/`**：线上 GitHub 贡献日历 1912 次 / 连续 17 天，本地 1881 次 / 连续 16 天。这是 CI 构建链里的 `fetch-github-contributions.mjs` 实时抓取造成的，**恰好是「线上是本次新构建」的正面证据**，不是回归。
- **Svelte 运行时特征字符串计数两侧完全一致**：`svelte` 19 次、`state_unsafe_mutation` 1 次、`each_key_duplicate` 1 次 —— 同一 Svelte 版本。
- **CSS 作用域 hash 一致**：线上 Pio 容器类是 `svelte-a15wih`，与本地编译产物相同。

**线上功能实测 9/9 通过**（真实 Chromium 打 `https://caiyan12.github.io`）：

- 搜索：Svelte 岛完成水合（`astro-island` 无 `ssr` 属性）、中文「看板娘」2 条、英文「Astro」12 条。
- Swup：点搜索结果切页**未整页刷新**（`window` 标记存活），后退后关键词与结果恢复。
- 公式：文章页 **298 个 KaTeX**，首个公式盒 734×20 且含原生 MathML；截图确认 `p(Q) = a − bQ, a > 0, b > 0` 排版正确。
- 看板娘：`window.Paul_Pio` 存在、1 个 `.pio-container`、1 个 `#pio` canvas。
- 移动端 390×900：搜索 12 条、零横向溢出。
- 两视口 `pageerror` 与本站 `requestfailed` **均为 0**。

**已知边界**：线上导航用 `waitUntil:"load"` 会超时（第三方播放器拖住 load 事件），改用 `domcontentloaded` 后正常——这是既有环境问题，与本次升级无关。第三方播放器与视频站资源在测试中被主动 abort，不计入本站失败判据。

### 待办（未完成，需站长决定）

- [x] ~~阶段五剩余 2 类跨版本迁移（Tailwind 4 / Satori 0.63）~~ **2026-11-03 站长裁定：移交独立工作流，不在依赖升级会话内推进。**
      **KaTeX 已于第五批（本地提交 `c5b622f`）、Mermaid 已于第六批（本地提交 `a9f4913`）完成本地验收，均未推送**，见 [KaTeX 专项](2026-11-03-katex-upgrade.md)、[Mermaid 专项](2026-11-03-mermaid-upgrade.md)。
      **Tailwind 4 与 Satori 0.63 已登记到 `README.md` 的「待办（依赖跨版本迁移，需独立工作流排期）」**，理由是复杂度已超出「接在依赖升级后面顺手做」的范围：Tailwind 属接入方式重写且会推翻既有的 `@layer` 文档结论；Satori 跨 33 个 minor、上游无 CHANGELOG。两项适合专门跑一次 `/grill-spec-tickets-implement` 工作流。本计划的 Task 11-16 原文降级为**后续工作流的调研输入**，不再是执行清单。
- [ ] Prettier 卡在 3.9.8，上游 issue #20199 仍 OPEN、npm latest 3.9.10 即有问题版本，**无可用修复版本**。

- [ ] 用户明确授权发布后，落死发布 SHA 与待发布固定提交范围；再次直接查询远端，核对是否有他人变更，保留无关工作。
- [ ] 按实际改动运行相关项目测试、完整 `pnpm build` 联网链、check、公式、格式与主站 AI News 边界；审阅联网生成数据变化，不把它混进此前 A/B 结论。
- [ ] 本地最终实机覆盖本次影响的功能；若涉及 CSS/框架迁移，补全站 UI、Nice Books、灯箱、目录/文集、壁纸与 console 等相关烟测，按 `docs/agents/commands.md` 配 env，报告实际完成情况。
- [ ] 仅推送已审阅授权的提交；验证该 SHA 的 Check、Lint、Pages build/deploy 结论和日志，不借用旧 run。
- [ ] 线上验证搜索脚本/WASM/索引来自同一完整产物，实际搜索及 Swup/后退、公式、桌面/移动布局；以 artifact 内容/响应字节等证据确认新部署，HTTP 200、旧 Astro generator 或查询串不能证明新版本。
- [ ] 记录本地、Linux CI、线上各自的验证结论与未验证边界，更新路线状态。不能写“全部升级完成”，除非所有约定批次及最终验收完成；明确保留的版本需有站长接受的冻结理由。

## 交接恢复与证据使用

接手第一步只读核对 `git status`、固定 SHA、直接远端、实际安装与计划文档；确认本次纯文档 diff 后，从阶段三 Svelte 开始。不要重新执行阶段一已经发布/验收的升级。若本文与实际工作区不同，先报告差异再收敛，不能覆盖他人的新工作。

证据目录保留：`output/astro7-upgrade/`、`output/astro7-followup/`、`output/astro7-release/`、`output/prettier-upgrade/`、`output/prettier-release/`、`output/check-upgrade/`、`output/pagefind-upgrade/`。它们被忽略，换机器或新克隆不会随 Git 自动携带；文件缺失就标缺失，不伪造旧测试。最新 `dist` 是第二批产物，下一批旧基线应重新从当前源码构建。

工具坑与命令契约以 `docs/agents/commands.md`、构建文档和 `.learnings/` 为准。Windows UTF-8；Node 字体 fetch 需要 `NODE_USE_ENV_PROXY=1`；不重用播放器共享 context 来掩盖其跨标签互斥；不把所有 Script error 放行；保留原始与归一化差异，最终关闭仅自己启动的服务。

## 本次文档整理验收（2026-11-03）

- [x] 重新核对本地提交、工作区、直接远端与安装版本；整理完整路线和发布边界。
- [x] 读取指定 handoff 技能；长期计划留在项目，临时交接只引用本计划及现有报告。
- [x] 检查新增 Markdown 的 UTF-8、格式、引用路径与 diff；交接文件放 `%TEMP%`。`pnpm exec prettier --check ./src ./docs` 与 `git diff --check` 通过，本地 Markdown 链接均存在；本轮纯文档整理未重跑产品构建或浏览器验收。
- [x] 交接边界确认：第三批与后续升级、构建及部署留待下一 Harness，本轮没有运行。没有提交、推送；未提交成果为新增本文及 `docs/agents/build-and-deploy.md` 的路线入口，其他跟踪文件未改。
