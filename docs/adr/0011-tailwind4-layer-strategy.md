# 0011：Tailwind v4 迁移走「保留 JS 配置 + 站点设计规则移出所有层」

2026-11-04。`tailwindcss` 3.4.19 → 4.3.4 不是版本升级，是接入方式重写：v4 不再是 PostCSS 插件（改由 `@tailwindcss/vite` 接管）、配置不再自动加载（须显式 `@config`）、`@tailwind` 三指令作废（改 `@import "tailwindcss"`）、并且**引入了真实 CSS 级联层**。本 ADR 记的是两条不易回退、且有真实取舍的决定。

## 背景

`docs/agents/build-and-deploy.md` 记着一条承重事实：**「Tailwind v3 的 `@layer` 是构建期指令，产物里根本不存在 `@layer`，冲突按『特异性 → 源顺序』判定」**。这条结论对 v3 成立（实测主检出的 v3 产物 `dist/_astro/MainGridLayout.CKaYaVTj.css` 的 `@layer` 计数为 0），但 v4 引入真实级联层后它不再成立，且**推翻它的不只是文档**——它直接改变本站的渲染结果。

实测（worktree `D:/pages/myblog-wt-tailwind4`，分支 `feat/tailwind4-migration`，229 页构建通过）：

- **站点规则被插件压倒**：typography 插件的 `.prose` 规则落在 `@layer utilities`，站点的 28 条 `.prose` 规则落在 `@layer components`。v4 层序 `theme < base < components < utilities` 让 utilities 层无条件胜出——尽管站点规则特异性更高（0-1-1 vs 0-1-0）。正文标题 24px→36px、段落 14px→16px、链接品牌绿 `rgb(0,170,0)` 变插件蓝 `rgb(68,136,187)` 且失去下划线、全部 margin 归零。
- **提高特异性一律无效**：实测 `.prose p code`(0-1-2) / `.prose :where(code)` / `.prose :is(code)` / `.post-content .prose code`(0-2-1) 四种方案全部仍是 14px。层序压过特异性。
- **层外规则反压层内**：CSS Cascade 5 规定 unlayered normal declarations 排在所有 layered normal declarations 之后。站点 `global.css` 里那条层外的 `body,div,...,h1{margin:0}` 会无条件压过层内的 `.prose h1{margin:1.2em 0 .6em}`。
- **v3 的误解析被纠正**：v3 把源码里的 `.nav` 当成 important 前缀语法解析（v3 产物实测为 `.head-nav .\!nav>li{float:left!important;height:55px!important;padding:0 18px!important;...}`），v4 不再误判 → 该规则丢了 `!important`。**但这不构成可见回归**：真实站点的导航项有更高优先级的 `#menu-index > li{padding:0}`（ID 选择器，特异性 1-0-1）在压着它，v3 与 v4 实测计算值**完全一致**（padding 0px、height 55px、float left、链接色 rgb(0,0,0)）。**教训**：判断某条规则是否生效，必须用**真实 DOM 结构**量，不能用手写 fixture——本轮最初用 fixture 测出「v3=18px / v4=0px」的假回归，实为 fixture 缺少 `#menu-index` 所致。

## 决定

**一、保留 `tailwind.config.cjs`，用 `@config` 显式加载，不迁到 CSS-first `@theme`。**

**二、把站点的 `@layer base` / `@layer components` 包裹去掉，让站点的**设计规则**以 unlayered 身份参与级联；**声明 Tailwind 也会声明的属性的三条约规则**（元素级重置、两份手型光标）留在 `@layer base`。**

## 被否掉的方案及理由

- **迁到 CSS-first `@theme`**：官方推荐方向，但实测**丢失全部自定义色板 utility**——`.text-nb-muted` / `.font-nb-serif` / `.text-nb-seal` / `.bg-primary` / `.rounded-box` 全部消失（`theme.extend` 的值不生成 `--color-*` 变量，utility 直接消失）。本站 `nb.*` 色板是 Nice Books 独立壳的主色板，用量现测为 165 处 utility 引用、覆盖 24 个不同的 `nb-*` 工具类（现测方式：`grep -roE '\b(text|bg|border|font|ring|from|to|via|shadow|decoration|outline)-(nb-[a-z-]+)\b' src/`），迁移成本与风险都远超收益。且 `--shadow-wrapper: var(--shadow-wrapper)` 在 `@theme` 里会自引用：变量虽发射，单独存在时浏览器判 invalid → `.shadow-wrapper` 的 box-shadow 变 `none`。**保留 JS 配置是可用退路**（v4 的 `@config` 仍吃旧 config，且本站全站零处引用 `var(--color-*)`，无损失）。
- **只改层序声明（`@layer components` 改名 `site` + `@layer theme, base, components, utilities, site;`）**：不够。站点的 `body,div,...,h1{margin:0}` 是**层外**规则，unlayered 依然优先于任何层，`.prose h1` 仍被压掉。实测此项只把可见回归从 21 项降到 17 项，`.prose h1` 的 4 项全坏。
- **提高特异性来救 `.prose`**：实测四种方案全部无效（层序压过特异性）。
- **用 `@utility` 逐条重建站点规则**：机制上可行，但要把 28 条 `.prose` 规则逐条改写成 utility 形式，改动面远大于解包，且丢掉「站点样式集中在一处 CSS」的可读性。
- **接受 typography 插件的默认排版**：与本站 Colorful 原版还原目标冲突（ADR 0004 的顶层契约），且用户明确要求「不产生任何意料之外的变动」。

## 代价与边界

- **站点规则恒胜**：unlayered 压过一切 layered，包括 Tailwind 的 utility。这与 v3 里「utility 在 components 层之后展开、站点 components 层规则赢不了 utility」的语义相反。**方向性风险**：将来若某个站点类与 utility 撞名（如站点写 `.flex`），站点规则会赢。当前已核：全站无此类撞名（utility 类名与站点类名无交集），但这是需要持续守住的边界。
- **两层入口都要解包**：`src/styles/global.css` 与 `src/nice-books/styles/books.css` 各自有独立的 `@layer base`/`@layer components`。
- **`postcss-nesting` 不能移除**：`global.css` 有 8 处**无 `&` 符号的隐式嵌套**（拉绳壁纸 SVG 的 `.wpull__cord` / `.wpull__art` 子规则），没有嵌套处理器时这些规则是非法 CSS 会被整条丢弃。**来源变了**：v3 时该插件是 `tailwindcss` 包内附带的（`tailwindcss/nesting/index.js`），v4 的包不再导出该子路径（`ERR_PACKAGE_PATH_NOT_EXPORTED`），故改为显式依赖 `postcss-nesting@13.0.2`。
- **五处显式补偿**（不是三条；其中两处在 `.astro` 里。**实施中从四处增为五处**）：`.prose a` 需写 `text-decoration: underline`（v3 靠插件的 `:where(a)` 规则胜出，v4 层序反转后链接失去下划线）；`.prose li` 需写 `padding-inline-start: 0.375em`（v4 Preflight 把 padding 归零；v3 里缩进来自 typography 插件的 `.prose :where(ul > li){padding-inline-start:.375em}` —— **em 相对值**，正文 13px 下实测计算值 4.875px。**复刻同一个 em 相对值而不是写死像素**：字号变了缩进仍按比例跟着走，与 v3 行为完全一致）；`input`/`textarea` 需补 `background-color: #fff`（v3 Preflight 给表单控件设白底，v4 改透明，搜索框自身无背景声明会露出灰色）；**第四处是 `src/pages/books/index.astro` 里那处 `class="text-[0.85em] leading-[20px] text-nb-seal"` 的绝对行高**——v4 把字号工具类的行高从绝对长度改成比值（`--text-sm--line-height:calc(1.25 / .875)`），继承到用 em 相对字号的子元素时按子元素字号重算（20px → 17px），混排行盒少 1px。**不能用 `leading-[inherit]` 修**——继承的是比值不是计算值，实测无效；⑤ 同文件简介段落的 `max-[540px]:[--tw-leading:1.5rem]` —— **这一处是走到移动视口验收才发现的**：v4 的字号工具类行高走 `var(--tw-leading,…)`，元素只要带 `leading-*` 就由 `--tw-leading` 决定；而 v3 里两者是字面量、按源顺序决胜，响应式变体 `max-[540px]:text-base` 更靠后因而胜出。移动端行高 24px → 35.2px、整页文档高度 +42px。全站审计共 4 组合，只有具名字号（`text-base` 等自带行高字面量）会撞，其余 3 组实测一致。
- **元素级重置必须留在 `@layer base`**：站点那条 `body,div,...,input,textarea{margin:0;padding:0}` 若也移到层外，会压过 `@layer utilities` 里的工具类（层外普通声明排在所有层内之后）。实测后果：`/search/` 页搜索框的左右内边距 12px → 0px、「正在搜索…」提示的上边距 16px → 0px。改法：把这条重置放回 `@layer base`（base 在 utilities 之前，工具类照常赢，与 v3 一致），其余站点设计规则仍留层外。**这是「站点规则恒胜」这条代价的具体边界**——恒胜的是**设计规则**，不是**重置**。
- **响应式字号变体与 `leading-*` 同处一个元素时，移动端行高会变**：v4 的字号工具类行高是 `var(--tw-leading, var(--text-<size>--line-height))`，`leading-*` 设的 `--tw-leading` 必胜；v3 里两者都是字面量，按源顺序决胜，响应式变体（`max-[540px]:text-base`）更靠后因而胜出。实测 `/books/` 的简介段落在移动端行高 24px → 35.2px、整页文档高度 +42px。改法：在移动断点上把 `--tw-leading` 覆盖回 `1.5rem`。**只有具名字号（`text-base` 等，自带行高字面量）会撞**；任意值字号（`text-[19px]`）不带行高，不受影响——全站审计共 4 组合，仅 1 组需处理。
- **v3 的 purge 行为是反向风险**：v3 会把 `@layer components` 里按 content 扫描判定为「未使用」的纯 CSS 类名 purge 掉（实测 15 条规则在 v3 产物里缺失，如 `.slideshow` / `.slideshow .dots` / `.slideshow .dots span`，v4 里全部保留），v4 不再 purge。迁移会把这些死 class 补回——**必须逐条核实无元素使用**（本次已逐条核实：15 条规则的类名在全部源文件与 230 个产物 HTML 的 class 属性里零引用；处置见提交 `37c2ae9`，那笔提交只把这批类移出样式层、不删除它们）。

## 守卫在哪

- **验收判据**：计算样式指纹 A/B（`scripts/upgrade-style-audit.mjs`，同输入两版产物对采；页数取自 `scripts/lib/smoke-pages.mjs` 的 `AUDIT_PAGES`，别在别处抄一份数字）+ 桌面/移动截图 + 关键交互。
    - **判据口径**（spec 的原话是「可见差异为零」，实施时把它落成三类，**这是一次实质性的判据解释，不是等价改写**）：
        1. **不渲染**：计算值变了但渲染结果不变 —— 零宽边框的颜色、`sr-only` 上的几何、被尺寸钳制的圆角（`9999px` vs `calc(infinity*1px)`）、box-shadow 的全透明层、以及 `transform` 族（v3 用 shorthand、v4 拆成 `translate`/`rotate`/`scale`，逐属性比会重复计数，按有效矩阵比）。**这几类都有独立的像素级或几何级实测佐证**（渲染截图逐字节相同、四角坐标逐项相同）。
        2. **等价色**：字面量变了、也参与渲染，但 ΔE76 < 2（实测 `#374151` → `oklch(37.3% .034 259.733)` 的 ΔE = 1.32，8bit 上差 1–2 个色阶）。**这一类是判据扩容**：spec 的白名单只写了「零宽边框的颜色」，没有预见到 v3→v4 的调色板整体从 hex 换成 oklch 会让每个用到色板 token 的元素都产生一条字面量差异。
        3. **真回归**：以上两类之外的一切，必须修掉。本轮靠这一条抓出并修掉了 **5 处**真实回归（元素重置与手型光标压过工具类、`.prose li` 缩进基准错、书库页移动端行高），全部有「v3 与 v4 计算值不同且都在渲染」的直接证据。
    - **为什么接受这次扩容**：ΔE < 2 在 8bit 显示上不可分辨，且 930 条「等价色」的**两端色值都能指回同一套设计 token**（v3 的 hex 与 v4 的 oklch 是同一个 `theme.extend.colors` 条目的两种序列化）。若坚持「字面量不同即失败」，等于要求 v4 不得把调色板换成 oklch —— 那不是本次迁移的可选项。**代价**：这类差异从此不再触发失败，日后真有「色板被改错」的情况需要靠视觉复核而非指纹发现。
- **判据纪律**：五条踩坑（预览服务器把路径返回首页、截图要先定噪声底线、要用真实 DOM 而不是手写 fixture、v4 的行高继承规则变化、样式测试对缩进的硬依赖）写在 [`docs/agents/commands.md`](../agents/commands.md#样式-ab-的五条判据纪律2026-11-04-立tailwind-v4-迁移实测得出)；样式覆盖关系的推导纪律写在 [`docs/agents/styles.md`](../agents/styles.md)。
- **相关实测记录**：见 [`docs/plans/2026-11-04-tailwind4-migration-design.md`](../plans/2026-11-04-tailwind4-migration-design.md)（迁移设计）与 [`docs/plans/2026-11-04-tailwind4-migration-spec.md`](../plans/2026-11-04-tailwind4-migration-spec.md)（规格，GitHub Issue #136）；接入方式与层策略的条目在 [`docs/agents/build-and-deploy.md`](../agents/build-and-deploy.md#构建链与依赖约束2026-11-02-起-astro-7) 与 [`docs/agents/styles.md`](../agents/styles.md)。
- **回退路径**：本次分三笔提交（① 15 条死类移出样式层、仍在 Tailwind v3 下；② Tailwind 4 接入方式重写；③ 站点设计规则移出所有 `@layer` + 五处显式补偿）。合并推送后线上只看最终态；单独回退第三笔会回到「站点规则在层内、被插件压倒」的中间态，不是可用状态。
