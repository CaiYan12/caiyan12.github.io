# 阶段五剩余四项跨版本迁移：逐项评估

评估日期：2026-11-03。**本文件是评估，未做任何变更**（不改 `package.json` / 锁文件 / 源码）。
所有结论基于当次实测与官方发布记录，未实测的地方都明确标注。

## 总览

| 项       | 当前    | 目标   | 本站用量                                                    | 破坏性变更                                 | 风险                           | 建议顺序    |
| -------- | ------- | ------ | ----------------------------------------------------------- | ------------------------------------------ | ------------------------------ | ----------- |
| KaTeX    | 0.16.47 | 0.19.1 | **307 个公式 / 4 篇**（原写「11 篇」有误，2026-11-03 修正） | **3 条**（原写 1 条有误，2026-11-03 修正） | **低→已改判为「需 override」** | 1（已完成） |
| Mermaid  | 11.17.2 | 12.2.0 | **99 个图表 / 14 篇**                                       | 3 条，其中 1 条会命中                      | **中**                         | 2           |
| Tailwind | 3.4.19  | 4.3.4  | 全站两套样式                                                | 接入方式重写                               | **高**                         | 3           |
| Satori   | 0.26.0  | 0.63.2 | 33 张 OG 图                                                 | 33 个 minor，无 CHANGELOG                  | **最高/依据最少**              | 4           |

---

## 一、KaTeX 0.16.47 → 0.19.1（**已执行完成；原始风险判定经实测改判**）

> **2026-11-03 修正（复盘时发现原文有两处事实错误，已就地更正，原判断保留在下方作对照）**
>
> 1. **破坏性变更不是 1 条，是 3 条。** 原文只查了 0.19.0，漏掉两个更早的版本：
>     - **0.18.0**：内部 CSS 类名统一加 `katex-` 前缀（[#4229](https://github.com/KaTeX/KaTeX/pull/4229)），20 个类改名。**这条命中本站全部 307 个公式的 HTML。**
>     - **0.17.0**：内部 API `__defineFunction` 变更（本站不受影响）。
> 2. **「风险低」不成立。** `rehype-katex@7.0.1` 已是 latest，但把 katex 锚在 `^0.16.0`（对 0.x 等于 `>=0.16.0 <0.17.0`）。只升根包会让**构建期 HTML 用嵌套的 0.16.47（旧类名）而运行期 CSS 用根包的 0.19.1（新类名）**，样式错配。必须在 `package.json` 加 `"pnpm": { "overrides": { "katex": "0.19.1" } }`。
> 3. **另有原文完全没记的 [CVE-2026-103923](https://nvd.nist.gov/vuln/detail/CVE-2026-103923)**：KaTeX `>=0.11.0 <0.18.2` 原型污染→XSS，0.18.2 修复。本站因静态、无外部输入、未传 `trust` 而实际不可利用，但这是本批唯一的硬性收益。
> 4. **原文「11 篇文章含公式」有误**：实测是 **4 篇**（`20260320000000` 298 个、`20260831000000` 4 个、`20261006110122` 4 个、`20260728000000` 1 个）。
>
> 完整实测结论见 [KaTeX 专项验收](2026-11-03-katex-upgrade.md)。

**用量实测**：`pnpm test:prettier-math` 报告 **307 个公式 / 36 个内容文件**，分布在 **4 篇文章**里（块级 91 / 行内 216）。构建期经 `src/plugins/pipeline.mjs` 的 `rehypeKatex`（**未传任何选项**）渲染，并配套 `katex.BPpMaF0t.css` 与字体文件。

**官方破坏性变更（原文只记了 0.19.0 这一条，实际还有两条）**：

> Missing character metrics now reported via strict with error code `symbolNotInFont`, changing warning formatting, calling any strict callbacks, and producing errors in `strict: "error"` mode.

**本站是否触发**：`rehypeKatex` 无选项 = KaTeX 默认 `strict: "warn"`，**不是 `"error"`**。所以缺字符度量只会变成新格式的 warning，不会中断构建。**这条判断本身正确，但它不是「风险低」的充分条件**——真正会坏的是 0.18.0 的 CSS 类名前缀 + `rehype-katex` 的依赖范围。

**仍需验证的点**：

- 0.16→0.19 跨两个 minor，公式**渲染字形**可能变化（字体度量更新）。必须逐公式比对 KaTeX 输出 HTML 与实机截图。
- `katex.BPpMaF0t.css` 会随版本变，需确认 CSS 与 JS 同源（跨版本混用会出现排版错乱）。**实测确实会错配**，见上方修正说明。
- 本站有 `Q_2^*` 这类带星号的公式（Prettier 议题里出现过），需确认 0.19 的解析不退化。

**验收方案**：全 307 个公式用新旧版本各渲染一次，比对 KaTeX HTML 输出；实机截图比对含公式的文章；确认 CSS/字体同源。**补一条原文没有的关键判据**：产物 HTML 里旧类名 `.base`/`.strut` 出现次数必须为 0——这是唯一能抓住「CSS 与 HTML 版本错配」的判据。

---

## 二、Mermaid 11.17.2 → 12.2.0（风险：中）

> **站长裁定（2026-11-03，Task 6）**：**接受 Safari 17.4+ 浏览器下限，继续升级 Mermaid 12。**
>
> 裁定原文：站长在「接受下限继续升级 / 不接受保持 11.17.2 / 先量化访客分布」三个选项中选择了**接受下限、继续升级**。
>
> **这条决定的代价必须写清楚**：老 iOS 设备拿不到 Safari 大版本更新，**这部分访客将无法渲染本站任何图表**（99 个图表 / 14 篇文章全部失效）。这是产品决策，不是技术权衡——技术上没有回退到 dagre 就解决浏览器下限的办法（下限来自 Mermaid 编译目标 ES2024，不是配置项）。
>
> **执行时新发现的耦合（2026-11-03，重要）**：`mermaid@12.2.0` 声明 `katex: ^0.18.0`（即 `>=0.18.0 <0.19.0`），与第五批已经落地的 `katex@0.19.1` **范围冲突**。12.1.0 及之前声明 `^0.16.47`，同样不含 0.19.1。这意味着：
>
> - 第五批引入的 `pnpm.overrides: { katex: "0.19.1" }` 是全局的，**它同时覆盖 mermaid 的 katex 依赖**；
> - 因此装上 mermaid 12.2.0 后，mermaid 仍会拿到 0.19.1（超出其声明范围），**不会**退回 0.18.x；
> - 这个组合已在第五批实测过：mermaid 14/14 图表正常渲染、0 pageerror（当时用的是 mermaid 11.17.2 + katex 0.19.1）。
> - **但 mermaid 12.2.0 + katex 0.19.1 这个新组合还没测过**，必须在 Mermaid 批次内单独验证，不能沿用第五批的结论。

**用量实测**：**99 个图表 / 14 篇**，类型分布：

| 类型                                         | 数量   |
| -------------------------------------------- | ------ |
| flowchart                                    | **86** |
| sequenceDiagram                              | 5      |
| stateDiagram-v2                              | 2      |
| graph / gantt / classDiagram / pie / mindmap | 各 1   |

**官方破坏性变更（12.0.0，三条）**：

1. **ELK 成为默认布局算法**（#8155）——原文：_"This changes how existing diagrams look. Flowchart, state, class, entity-relationship, requirement, use-case and agentflow diagrams that do not specify a `layout` are now laid out by ELK instead of dagre."_
    - **本站会命中**：`src/utils/runtime/mermaid.ts` 的 `mermaid.initialize({...})` **没有设置 `layout`**，而那 86 个 flowchart 也都没有 frontmatter 指定布局。
    - 缓解明确：全局加 `layout: "dagre"` 即可保持现状。
2. **`redux-color` 主题 + `neo` look 成为默认**（#8148）
    - **本站已规避**：`initialize` 里显式设了 `theme: "base"` 与 `look: "classic"`。
3. **要求 ES2024 / Safari 17.4+ / Node ≥22.12**（#8213）
    - 本机 Node 24.18.0 满足；CI 用 Node 24 也满足。
    - **但 Safari 17.4+ 是浏览器下限**——这是对访客的硬要求，需要站长确认是否可以接受。老 iOS 设备拿不到 Safari 大版本更新，这意味着**部分旧 iPhone 将无法渲染图表**。

**此外还有一条必须注意的**：`mermaid.ts` 里两处**视觉契约**（字体就绪门、themeCSS 换行终态），由 `mermaid.test.ts` 按字面量断言。这些断言不依赖 Mermaid 版本，但**渲染结果**依赖——`buildMermaidThemeCss` 里的选择器（`.node rect`、`.mindmap-node.section-root` 等）是 Mermaid 内部 DOM 结构，12 版换了布局引擎后可能对不上。

**验收方案**：99 个图表全部渲染对照（新旧截图逐图比对）；`pnpm test:lib` 的 mermaid 断言仍绿；字体就绪门与换行终态在实机复验；决定是否显式 `layout: "dagre"`。

---

## 三、Tailwind 3.4.19 → 4.3.4（风险：高，属接入方式重写）

**用量实测**：全站两套样式都用 v3 三指令——

- `src/styles/global.css`：`@tailwind base/components/utilities`
- `src/nice-books/styles/books.css`：同样三条

配置是 `tailwind.config.cjs`（CommonJS）+ `postcss.config.mjs`（PostCSS 插件链 `[tailwindcss/nesting, tailwindcss, autoprefixer]`）。

**这不是升级，是重写**：

- **Tailwind 4 不再是 PostCSS 插件**，改用 `@tailwindcss/postcss`，或走 Vite 插件。
- **配置从 CJS 迁到 CSS-first**（`@theme` 块），`tailwind.config.cjs` 里的 `theme.extend.colors`（含 `primary: "#00c000"`、`nb.*` 命名空间、nice-books 纸墨色板）全要重写。
- **`@tailwind` 三指令作废**，两套样式文件的入口都要改。
- **Preflight 行为变化**，会影响 `.prose`、表格、按钮等既有外观。
- 本站严重依赖 v3 的 `@layer` **构建期指令**语义（`build-and-deploy.md` 明确记录：产物里根本没有 `@layer`，冲突按「特异性 → 源顺序」判定）。v4 引入真实 CSS 级联层，**这条承重事实会变**。

**官方元数据**：`tailwindcss@4.3.4` 无 engines、无 peer、**零运行时依赖**（2026-11-02 发布）。

**为什么排第三**：它影响面最大（全站视觉），且会推翻一条已固化的文档结论。总计划原本就要求「先讨论浏览器最低版本、Preflight、utility、真实级联层和插件配置」。

**验收方案**：不能只改依赖。需要先出迁移方案（配置怎么写、两套样式怎么拆、`@layer` 语义变化如何影响现有规则），再以「计算样式指纹 + 截图 + 交互 + 多浏览器」验收。参考本次 Autoprefixer 批次的 `upgrade-style-audit.mjs` 23 页指纹法。

---

## 四、Satori 0.26.0 → 0.63.2（风险：最高，依据最少）

**用量实测**：`src/pages/og/[...slug].png.ts` 单点调用，产出 **33 张 OG 图**。API 用法很基础：

```ts
await satori(template, { width: 1200, height: 630, fonts });
```

**为什么风险最高**：

1. **跨 33 个 minor**（0.26→0.63），0.x 语义下 minor 位承担破坏性变更。
2. **上游仓库没有 CHANGELOG**（`vercel/satori` 根目录无 CHANGELOG.md），60 条 release 里**没有一条标注 BREAKING**——但这不代表没有破坏，只是**没有书面依据**。这是四项里唯一「无法从官方文档判断影响面」的。
3. **依赖栈大改**：0.63.2 的依赖里有 `harfbuzzjs`、`@shuding/opentype.js`、`css-to-react-native`、`emoji-regex-xs` 等，与 0.26 差异巨大，**字体排版引擎可能整体换过**。
4. **构建期联网拉字体**：OG 端点从 `fonts.googleapis.com` 取字体交给 satori，本机 Node 的 fetch 不读 `HTTP_PROXY`（须 `NODE_USE_ENV_PROXY=1`）。换版本后字体处理链路一旦变化，本地难复现、CI 才暴露。

**验收方案**：33 张 OG 图逐张像素比对（尺寸、文本换行、字体、截断）；必须实际跑通 Node 字体网络链；CI 构建通过。**建议先在一个隔离环境试装 0.63.2 跑一次 OG 生成，看是否直接报错**，再决定是否值得投入。

---

> **2026-11-03 后续裁定**：本评估覆盖的四项里，**KaTeX（第五批）与 Mermaid（第六批）已完成本地验收**（未推送），详见 [KaTeX 专项](2026-11-03-katex-upgrade.md)、[Mermaid 专项](2026-11-03-mermaid-upgrade.md)。
> **Tailwind 与 Satori 不在依赖升级会话内推进**，已移交独立工作流，登记在 `README.md` 的「待办（依赖跨版本迁移，需独立工作流排期）」。理由：两者复杂度已超出「接在后面顺手做」的范围（Tailwind 是接入方式重写、Satori 无上游书面依据），适合专门跑一次 `/grill-spec-tickets-implement`。**本文件对这两项的评估仍有效，作为那份工作流的输入。**

## 建议执行顺序与理由

1. ~~**KaTeX**（低风险）：唯一破坏性变更本站不触发（`strict` 默认 `warn`），307 个公式可全量机器比对，收益是公式渲染修复。~~ **已完成（2026-11-03，仅本地）。** 风险判断已改判：破坏性变更实为 3 条，其中 0.18.0 的 CSS 类名前缀命中全部公式，且 `rehype-katex` 的依赖范围使必须引入 `pnpm.overrides`。绝不能说「低风险直接升」。见 [KaTeX 专项验收](2026-11-03-katex-upgrade.md)。
2. **Mermaid**（中）：需要先回答一个**产品问题**——能否接受 Safari 17.4+ 的浏览器下限；技术上有 `layout: "dagre"` 明确回退路径。
3. **Tailwind**（高）：需要先出迁移方案并单独讨论，不能当版本升级做。
4. **Satori**（依据最少）：建议先做一次「能否装上并跑通」的探索性验证，再决定是否排期。

## 未验证事项（诚实标注）

- ~~四项**都没有实际安装试跑**~~ **KaTeX 已于 2026-11-03 实装并全量验收**（307 公式逐条 A/B、构建 A/B、真实浏览器、mermaid 回归），结论见 [专项验收](2026-11-03-katex-upgrade.md)。其余三项仍未实装。
- Mermaid 12 的 ELK 默认布局对本站 86 个 flowchart 的**具体视觉影响**未实测，只知道「会变」。
- Satori 0.26→0.63 的实际 API 兼容性**无官方依据**，release body 里未标注 breaking 不等于兼容。
- ~~KaTeX 0.16→0.19 的**渲染字形差异**未实测。~~ **已实测**：307/307 公式为纯类名重命名，剥掉 `class` 属性后逐字节相同；正确配对下 40 个样本几何尺寸 0 差异。
- Tailwind 4 对本站 `@layer` 承重语义的影响**未实测**。
- **本评估的方法论教训（写给下一次）**：只查「目标版本的 CHANGELOG」会漏掉中间版本的破坏性变更。0.16→0.19 跨了 0.17、0.18 两个版本，只读 0.19.0 条目就得出「1 条破坏性变更」的结论，实际是 3 条。**跨多个版本时必须逐个版本读完，并且要额外核对被升级包自己的依赖范围（peer/dependencies）是否允许新版本**——本次真正会让站点坏掉的正是后者，而不是 CHANGELOG 里写的那条。
