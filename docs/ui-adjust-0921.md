# UI 改进 · 决策登记册（T0–T3）

- 日期：2026-09-21
- 技能链：`design-flow` → lanes `/redesign-skill`（审计）→ `grill-with-docs`（grilling + domain-modeling）→ `to-spec`（综合成 spec）
- 审计基线：线上 `https://caiyan12.github.io`，HEAD `2de963e`（源码与产物同版；因并发会话正推进仓库，未在共享工作区跑 build）
- 状态：**T0–T3 四轮问答（Q1-Q50）已裁完；已综合成 spec `docs/plans/2026-09-21-ui-adjust-t0-t3.md`。四个前置未满足，尚不开工，未改任何源码**
- 本文结构：方法与证据 → T0 决策菜单与三轮裁决 → ADR/术语转正 → T1 取证与执行清单 → T2 死规则与文档失真 → T3 对比度让步与候选色 → 交付节奏
- 正式 spec（耐久意图与验收缝隙）：`docs/plans/2026-09-21-ui-adjust-t0-t3.md`；两者冲突时以本文的实测值为准
- 问答载体：Qoder 内置对话框，两问四题 + 一问四题；本文即决策登记，落地时逐项勾选

## 方法与证据来源

| 路 | 内容 | 产物 |
|---|---|---|
| 代码审计 ×3 | 交互与状态 / 语义与 a11y / 排版与布局（含动效配对、对比度、z-index） | 子代理报告，关键结论已逐条回源码核实 |
| 渲染实测 ×1 | 22 路由 × 1440/390px，另 1100/860/680px 定点 | `output/design-audit.mjs`、`output/target-probe.mjs`、`output/measure.mjs`、`output/h1-check.mjs`（均在 gitignore 的 `output/` 内） |

体检合格项（说明缺陷是局部而非普遍）：全站**零横向溢出、零断图、零标题孤字**；Tab 序列未见缺焦点环的控件；`/books/` 全过其自身对比度契约（`--nb-ink` 13.9、`--nb-muted` 5.04、`--nb-blue` 4.67、`--nb-seal` 5.23）；`/about/` 稿纸 1549 个文字节点全落 `平方时光体`；侧栏「换一批」完全符合硬约束；9 处 `javascript:void(0)` 逐个核实均为下拉父项。

## 对上一版清单的三处自我修正

1. **审计 #5 备案链接今日并不渲染**：`Footer.astro:23` 是 `siteConfig.icp && (...)`，而 `config.ts:36` 的 `icp: ""` → 整块短路。降级为潜在项（改了 URL 也只有在你填备案号之后才可见）。
2. **审计 #6 改判为升级项**：原版 `colorful-original.css:86` 只有 `#menu-index li.current a{border-bottom:2px solid #0c0;color:#0c0}`（桌面），原版 `#mmenu` **同样没有** current 样式。不是漏还原，但存在「照抄自家桌面图案」的零争议路径。
3. **审计 #1 定性反转**：原版**根本没有 `.post-header` 这个类**（其省略号家族只用在 `#header h1`、`#mmenu` 项、`#record li` 等）。且 `global.css:2493-2508` 是**一条组合选择器同时管着文章页 `h1` 与列表卡 `h2`**。故放宽文章页标题不触碰还原契约。

## 待回收的事实

- [x] Astro 的 `fallback` 机制 → **已核实，且推翻本文初稿 Q3 示例**：Astro 6 没有 `fallback` prop，只有 `slot="fallback"` 子元素（详见文末「第一轮裁决」）。

---

## T0 决策菜单

裁决栏在得到答复后填写；每项格式为 **方法 → 优势 / 风险 / 具体改动**。

### Q1 文章页标题截断（最严重：63 字标题 1440px 丢 194px，390px 丢 573px）

实测（`.post-header h1`，`white-space:nowrap` + `overflow:hidden` + `text-overflow:ellipsis` + `height:25px`，生效字号 20px）：

| 视口 | 可视宽 | 需要宽 | 丢失 |
|---|---|---|---|
| 1440 | 711 | 905 | 194px |
| 1100 | 671 | 905 | 234px |
| 860 | 471 | 905 | 434px |
| 680 | 622 | 905 | 283px |
| 390 | 332 | 905 | 573px |

- **A 只放宽文章页 h1**：把 `.post-header h1` 从组合规则中摘出，`height:auto; white-space:normal; line-height:1.35; font-size:20px; text-wrap:balance`。
  优势：一个选择器；首页/归档信息密度不动。
  风险：`.post-header{border-left:3px solid #000}`（`global.css:2486-2491`）的黑竖线会随标题变两三行而拉长，文章首屏高度与 Swup 切页位移随之变化。
- **B A + 同时放宽列表卡 h2**：卡片也不丢字。优势：彻底。风险：卡片一行一条是这里唯一接近原版 `#record li` 节奏的地方，属观感改动，需你亲眼验收。
- **C 仅补 `title=` 属性**（`[...slug].astro:99`）：几乎零风险，但触屏不显示 title，窄屏仍半截标题 → 只适合当 A 的附加项。
- **D 仅 `min-width:681px` 放宽**：桌面修好、移动首屏不变，但 390px 丢 63% 这个最差场景未修。

裁决：☐ 待填　建议：**A + C 的 title 属性**

### Q2 剧透块 spoiler（原版无此类，自研件）

现状：`remark-extended.mjs:161` 输出 `<span class="spoiler" tabindex="0" role="button">`，`theme-script.ts:656-662` **只有 click 委托** → 可聚焦、被读屏宣告为按钮，键盘按下去无反应。全站 `:active` 目前仅 `.open-nav`/`.close-nav`/字号滑杆三处。

- **A 只补键盘**：旁挂同源 keydown（Enter/Space）+ 同步 `aria-expanded`。优势：纯功能零视觉。风险：无。
- **B A + 补按下态**：原版 `colorful-original.css:317` 有 `.post-context button:active{background:#FF262E;color:#fff}`，迁移时整体漏搬；补 `.post-context .spoiler:active`（先只挂 spoiler）。优势：这是还原缺失而非新增风格，红色为原版钦定。风险：真 `<button>`（复制按钮等）若一并铺上会改变观感，需先数清分布。
- **C 改真 `<button>`**：语义/键盘/焦点免费获得。风险：`<button>` 默认样式与「不允许块级子元素」，剧透块内可能含段落/代码块，属结构性改动，回归面大。

裁决：☐ 待填　建议：**B（:active 先只挂 .spoiler）**

### Q3 无 JS / 未水合访客的地板线（`search.astro:23`、`ai-news/index.astro:23` 两处 `client:only` 零 fallback）

- **A 不管**：零改动。风险：禁 JS 访客在导航可达的 `/search/` 看到整块空白，像坏站。
- **B 静态说明**：`<noscript>`（或 `fallback`）给一句「站内搜索需 JS」+ 标签/分类/归档三条入口。优势约 6 行、不动组件、不与水合冲突。风险：仍搜不了，只是不再显得坏。
- **C 可用降级表单**：复用移动抽屉已有的 `.msearch` 原生 GET 表单。**判定为伪选项**：Pagefind 是纯客户端索引，GitHub Pages 静态托管无服务端可跑 `pagefind --serve`，故 C 最多做到 B+（带词跳转 + 提示）。
- **D ai-news 单独给载入态**：一句「正在载入日报…」＋离线快照说明（`public/ai-news/snapshot/` 已存在）。

裁决：☐ 待填　建议：**B + D**

### Q4 `/domain/` 站外页定性（桌面 logo 落点即 `Navbar.astro:39 → /domain/`，`data-no-swup`）

事实：`src/domain.html:2` 全中文却 `lang="en"`；viewport 含 `maximum-scale=1.0,minimum-scale=1.0,user-scalable=no`（WCAG 1.4.4 硬失败）；`<main>`/`<h*>` 计数为 0；`public/domain/css/FiraCode.css:1` 是 `*{font-family:FiraCode}`（无汉字字形→逐字回退）；品牌绿内联写成 `#00be00`（应为 `#00c000`）；窗口按钮实测 18×18；`nutssss.css` 零 `font-family`，`--font-body` 到不了它；字号用 `rem` 而主站正文 13px 制。

- **A 就地最小修正**：`lang="zh-CN"`、删 zoom 锁、FiraCode 收窄到终端风格元素、`#00be00→#00c000`、文字容器补 `--font-body`。优势：便宜、页面个性全留。风险：仍与主站脱节（无 swup/header/footer，两套度量继续并存）。
- **B 纳入主站体系**：走 `Layout.astro`。优势：一次性根治。风险：等于重写该页，其满屏终端动画与 `site-modal.css` 独立壳会撞，工作量与回归面超过其余 T0 之和。
- **C 修无障碍 + logo 指回 `/`**：把「访客第一眼会踩到的站外页」变为自选入口。风险：若你视其为门面，等于把它藏了——需你判断产品定位。
- **D 不动**，只在 AGENTS.md 记「/domain/ 永久豁免全站样式契约」。

裁决：☐ 待填　建议：**A**（B 建议单独立项，不混进本轮）

### Q5 备案号链接（今日未渲染）

- **A 只改 href** → `https://beian.miit.gov.cn/`（一行，将来填了 `icp` 自动正确）。
- **B 连文案一起定**：你给备案号，我填 `config.ts:36`，页脚随即出现该行。
- **C 不动**，仅登记。

裁决：☐ 待填　建议：**A**（若已有备案号则 B 省一次往返）

### Q6 移动端抽屉「当前页」是否给视觉

现状：`theme-script.ts:906-931` 与 `MMenu.astro:30,53` **已在算** `.current` + `aria-current`，但 `global.css` 里 `.current` 只有两处桌面选择器（`:216/:220` 的 `.head-nav .nav > li.current`、`:2083-2094` 的 `#menu-index li.current`），34 条 `#mmenu` 规则零命中 → 一套用不上的死状态。

- **A 照抄原版桌面图案**：`#mmenu li.current > a{border-bottom:2px solid var(--colorful-green);color:var(--colorful-green)}`。优势：不发明风格，只把自家已有图案搬到移动菜单。风险：`#mmenu` 每项自带 `border-bottom:1px solid #dfdfdf`（原版 38/39 行），绿边需实测能否盖住。
- **B 只加粗**：`font-weight:600`。优势最轻；风险是 14px 上 600/700 差别弱，位置感仍不清。
- **C 不做**（理由：原版也没有）。

裁决：☐ 待填　建议：**A**

### Q7 「附加功能」组 current 计算漏两处

`Navbar.astro:145` 的 `li.dropdown` 缺 `current:` 表达式（同文件 90-99 / 117-126 / 162-168 三组都有）；`MMenu.astro:98-104` 子项缺 `current`/`aria-current`。

- **A 两处都补齐**，与同文件三组同构（父项 `navBarConfig.extra.some(isCurrent)`，子项 `{current: isCurrent(item.url)}` + `aria-current`）。优势：一致性修复，且「父项 current 由子链接 some() 判定」正是 AGENTS.md 已写明的既有协议。风险：补完后 `/albums/`、`/images/`、`/books/`、`/ai-news/` 页上「附加功能」下拉会开始呈 current——语义正确但立刻可见。
- **B 只补 Navbar 桌面**，MMenu 留到 Q6 一起处理。

裁决：☐ 待填　建议：**A**（与 Q6 同链条：Q7 让状态被算出，Q6 让状态被看见）

### Q8 `/search/` 岛屿两处小修

`Search.svelte:99` 的 `outline-none` 关掉了全局 `:focus-visible` 环（只剩换边框）；搜索按钮无 `disabled={searching}` → 可连点起两次搜索、结果可能乱序。模块其余部分完好（pending/error/empty/`aria-live` 齐备）。

- **A 两处都修**：去掉 `outline-none`；加 `disabled={searching}` + `aria-disabled` 样式。
- **B 只修焦点环**（无障碍收益更大）。
- **C 只修禁用**。
- **A′ 变体**：保留 `outline-none`，把 `:focus-visible` 边框改为 2px 主色 —— 保持现有观感，但不满足「不依赖颜色」的要求。

裁决：☐ 待填　建议：**A**（注意焦点环样式会可见地变化）

### Q9 验收方式（横跨全题）

- **A 逐项 `build` + `preview` 实测**：用现有量测脚本复测（标题 `scrollWidth` vs 可视宽、`#mmenu` 计算色、`/domain/` lang/viewport、spoiler 键盘触发）。优势证据是真实渲染；风险是慢，且 build 会脏 `src/constants/*.json`（需令牌/中国网络），改插件须先删 `node_modules/.astro/`。
- **B dev 服务器量测**：快，但 Pio 与懒加载 CSS 在 dev 下有已知假象（AGENTS.md 记录在案），不作验收依据。
- **C 扩现有 smoke**：把「标题不截断」「`#mmenu` current 上色」写成断言进 `scripts/`。防复发；代价是给本轮加工作量且 smoke 需 build+preview。

裁决：☐ 待填　建议：**A，并挑两件最易复发的加进 C**

---

## 未列入 T0、留给后续轮次的关联问题

- [x] `@layer components` 那批副本 → **已在 T1 判定完毕**，见下文「死规则逐条判定」表：`:315`/`:318`/`:432` 全死、`:438-451` 部分幸存、`:324/:327` 无效果但保留、`.prose{14px/1.9}` 活着。
- [x] `html{font-size:13px}`（`global.css:31`，在 `@layer base` 内）实测根字号 **16px** → 该 13px 意图全站从未生效；所有 `rem` 推算随之偏。**机制已更正**：不是「无层胜过有层」，而是 Tailwind v3 把 `@layer` 内容搬到前部后，被 `:1767 html{font-size:100%}` 靠同特异性的**源顺序**压过（详见 T1「机制更正」节）。属 T2。
- [x] AGENTS.md 关于 `.prose code{font-size:13px}`「整条被关在 `@media (max-width:680px)` 内（桌面永不生效）」的断言为**假**（实际在 `@layer components` `:58-1666` 内，`@media (max-width:768px)` 从 `:1669` 才开始；而压住它的是特异性 `(0,1,2)` vs `(0,1,1)`，与源顺序无关）。属 T2 文档修正项。
- [ ] `.header-ticker` + `@keyframes ticker-scroll`（`global.css:143-170`、1693）为死代码：src/scripts/public 与线上 HTML 均零命中，活的是 `#header .text` + `initHeaderTicker()`。
- [ ] WCAG 与海洋绿的三处让步裁决（`#00c000` 作前景 2.46:1、药丸六色 1.92–4.32:1、z-index 无标度）——T3，需你亲自定，不属本轮。

---

## 第一轮裁决（2026-09-21 已定，按此执行）

| 题 | 裁决 | 落地要点 |
|---|---|---|
| Q1 | **A + C 的 `title=`** | `.post-header h1` 从 `global.css:2493-2508` 组合规则中摘出：`height:auto; white-space:normal; line-height:1.35; font-size:20px; text-wrap:balance`；列表卡 h2 **保持**单行省略；`[...slug].astro:99` 补 `title={title}` |
| Q2 | **B** | keydown(Enter/Space) 挂在与现有 click 同一处委托上 + 同步 `aria-expanded`；`.post-context .spoiler:active{background:#FF262E;color:#fff}` 先只挂 spoiler，真 `<button>` 是否铺开等清点后再议 |
| Q3 | **B + D** | `/search/` 与 `/ai-news/` 各给静态说明；机制用 `slot="fallback"`（见下） |
| Q4 | **A + 两项追加** | `lang="zh-CN"`、删 zoom 锁、FiraCode 从 `*` 收窄、`#00be00→#00c000`、文字容器补 `var(--font-body)`；**favicon 一律不动**；`div.headPhoto` 改为返回主站的入口 |
| Q5 | 默认 A（未占用提问额度） | `Footer.astro:25` → `https://beian.miit.gov.cn/`；若你给备案号则同时填 `config.ts:36` 的 `icp` |

### 更正：Astro 6 的 fallback 不是 prop，是 slot

本文初稿 Q3 示例里的 `fallback={<div/>}` **在 Astro 6 无效**，核实如下：

- Astro 6 类型中已无 `fallback` prop；文档只在 `client:only` 一节给出 `slot="fallback"`——“Use `slot="fallback"` on any child element to create content that will be displayed only until your client component is available”。
- 运行时已落地：`node_modules/astro/dist/runtime/server/render/component.js:220` 中 `if (metadata.hydrate === "only") html = await renderSlotToString(result, slots?.fallback)` → 降级内容确实由服务端渲染进岛屿内部，禁 JS 时原样留存。
- Svelte 侧曾有的「fallback 不被替换」缺陷（astro#12513 → PR#13470，2025-03-20 合并）在本项目 `@astrojs/svelte` 8.1.2 已修（`dist/client.svelte.js` 含 `if (!shouldHydrate) target.innerHTML = ""`）；`@astrojs/react` 5.0.7 走 `createRoot`，首次 render 清空容器。两条路径都安全。
- `server:defer` 不可用（静态输出无 adapter）；`<noscript>` 官方无指引，仅作备选。
- Pagefind 确认纯浏览器：本项目走 `package.json:11` 末尾的手工 `pagefind --site dist` + `Search.svelte:35` 动态 `import("/pagefind/pagefind.js")`，无任何集成；`--serve` 只是开发预览，Node API 只做索引不做检索 → **Q3 的 C 方案（真·降级搜索）确认不可行**，非取舍问题。

```astro
<Search client:only="svelte">
	<div slot="fallback" class="post-context">
		<p>站内搜索需要 JavaScript。也可以从 <a href="/tag/">标签云集</a>、
		<a href="/category/">文章分类</a> 或 <a href="/archive/">归档</a> 浏览。</p>
	</div>
</Search>
```

### /domain/ 的两项追加约束

- **favicon 不变**：`src/domain.html:22` 的 `/domain/favicon.ico` 与主站 `Layout.astro:64` 的 apple-touch-icon 均保持现状，本轮任何改动不得触碰。
- **`div.headPhoto` 变返回入口**：`src/domain.html:30` 目前是空 `<div>`，样式在 `public/domain/css/nutssss.css:39`，且 `:52`（`.meBox:hover .headPhoto`）与 `:59`（`.headPhoto:hover`）**已有 hover 反馈** → 加返回链接与该页既有交互语言一致。具体形态待第二轮 Q10 定。

---

## 第二轮裁决（2026-09-21）

| 题 | 裁决 | 落地要点 |
|---|---|---|
| Q10 | **B 外面包一层 `<a>`** | `.headPhoto` 仍是 div、仍是 block，`nutssss.css:39/:52/:59` 原样命中；`aria-label` 给读屏；补一条 `a:focus-visible .headPhoto` 轮廓。不换标签、不动背景规则 |
| Q11 | **A 两处都补＋移动上色** | `Navbar.astro:145` 补 `current: navBarConfig.extra.some(isCurrent)`；`MMenu.astro:98-104` 子项补 `current`/`aria-current`；`global.css` 在 `#mmenu .submenu a`（`:4566` 附近）后加 `#mmenu li.current > a, #mmenu li.current > ul.submenu a{color:var(--colorful-green);border-bottom:2px solid var(--colorful-green)}`。已知副作用：`/albums/`、`/images/`、`/books/`、`/ai-news/` 上「附加功能」父项开始呈 current（语义正确） |
| Q12 | **A 两处都修** | `Search.svelte:99` 去 `outline-none`；按钮加 `disabled={searching}` + `aria-disabled` + 忙碌态样式 |
| Q13 | **A ＋两项进 smoke** | 逐项 `build`+`preview` 实测；把「标题不截断」「`#mmenu` current 上色」写成断言进 `scripts/` |

### T0 执行清单（裁决已定，含第三轮待决的下游点）

- [ ] 1 拆 `.post-header h1` 组合规则 + `[...slug].astro:99` 补 `title` → 验证：`output/h1-check.mjs` 五档 `lost` 归零或多行
- [ ] 2 spoiler keydown（Enter/Space）+ `aria-expanded` + `.spoiler:active` 红 → 验证：键盘可开关；**改了 remark 输出须先删 `node_modules/.astro/`**
- [ ] 3 `/search/`、`/ai-news/` 加 `slot="fallback"` 静态说明 → 验证：`javaScriptEnabled:false` 上下文里说明文字存在，开 JS 后被替换
- [ ] 4 `/domain/` 五项最小修正 + `headPhoto` 包 `<a>` → 验证：`lang=zh-CN`、viewport 无 zoom 锁、品牌绿、返回链接可达
- [ ] 5 `Footer.astro:25` 备案 href → 验证：源码断言（今日仍不渲染，除非填 `icp`）
- [ ] 6 导航 current 两处计算 + `#mmenu` 上色 → 验证：390px 下计算色/边框，`/albums/` 上父项态
- [ ] 7 `Search.svelte` 焦点环与禁用态 → 验证：Tab 到搜索框有环；搜索中按钮不可点
- [ ] 8 两条 smoke 断言入库 → 验证：`pnpm test:fancybox` 同类跑法全绿

### 第三轮裁决（2026-09-21）

| 题 | 裁决 | 要点 |
|---|---|---|
| Q14 | **A 黑竖线保持现状** | `.post-header{border-left:3px solid #000}` 随标题拉长，先看预览；不通过再补 B（`::before` 锁第一行高） |
| Q15 | **A 验证用 `pnpm exec astro build`，收尾跑一次完整 `pnpm build`** | 绕开 fetch 脚本 → 不脏 `src/constants/*.json`、不吃网络与令牌；并发会话正在动仓库，不把别人的生成结果混进本轮 diff |
| Q16 | **A 全改完停下给你预览，预览通过后按一项一 commit 拆** | push 等你点头 |
| Q17 | **A 只做 T0** | T1 度量一致性与 T2 死代码/文档修正各另开一轮 |

## 最终执行序（裁决已全定，待你确认后开工）

按「互不牵连、失败可单独回退」排序，每项后附验收判据。

- [ ] 1 `Footer.astro:25` 备案 href → `https://beian.miit.gov.cn/` ｜验收：源码断言（`icp` 仍为空，今日不渲染）
- [ ] 2 `Search.svelte:99` 去 `outline-none`；按钮加 `disabled={searching}` + `aria-disabled` + 忙碌态 ｜验收：390/1440 下 Tab 到搜索框有全局环；搜索中连点只起一次查询
- [ ] 3 `search.astro:23`、`ai-news/index.astro:23` 加 `slot="fallback"` 静态说明 ｜验收：`javaScriptEnabled:false` 的 context 里说明文字存在；开 JS 后被岛屿内容替换（不残留）
- [ ] 4 `.post-header h1` 从 `global.css:2493-2508` 组合规则摘出 + `[...slug].astro:99` 补 `title={title}` ｜验收：`output/h1-check.mjs 20260831000000` 五档（1440/1100/860/680/390）`lost` 全为 0；列表卡 h2 仍单行省略
- [ ] 5 导航 current：`Navbar.astro:145` 父项 `some(isCurrent)`、`MMenu.astro:98-104` 子项 `current`/`aria-current`、`global.css` `:4566` 后加 `#mmenu li.current` 上色 ｜验收：`/albums/` 上「附加功能」父项呈 current；390px 下 `#mmenu` 当前项计算色为品牌绿且绿边压得住 `1px #dfdfdf`
- [ ] 6 spoiler：`theme-script.ts:656` 同一委托里加 keydown（Enter/Space）+ 同步 `aria-expanded`；`markdown-extended.css` 加 `.post-context .spoiler:active{background:#ff262e;color:#fff}` ｜验收：纯键盘可开关；**本项不改 `remark-extended.mjs`，因此无需删 content-layer 缓存**（若后续采纳换标签方案则必须删）
- [ ] 7 `/domain/` 最小修正 + `headPhoto` 包 `<a>` ｜验收：`lang="zh-CN"`、viewport 无 `user-scalable=no`/`maximum-scale`、无 `*{font-family:FiraCode}`、无 `#00be00`、favicon 两处保持原值、`headPhoto` 可点回 `/` 且键盘可达
- [ ] 8 两条 smoke 断言入库（标题不截断、`#mmenu` current 上色），`package.json` 加一条脚本 ｜验收：与 `test:fancybox` 同法跑通
- [ ] 9 收尾：`rm -rf node_modules/.astro` → 完整 `pnpm build` → `pnpm check` → `pnpm exec prettier --check ./src`

## 已转正的 ADR 与术语（2026-09-21 落盘）

- `docs/adr/0002-domain-page-independent-shell.md` —— `/domain/` 保持独立壳、只做就地最小修正；含被否方案（纳入 `Layout.astro` / logo 指回首页）与「favicon 不在范围内」。
- `docs/adr/0003-post-title-wraps-cards-truncate.md` —— 文章页 `h1` 多行、列表卡 `h2` 保持单行省略，**同类名下故意分叉**，并记下方圆角/黑竖线被拉长的接受代价。
- `CONTEXT.md` 新增三条术语：**独立壳**（`/ai-news/`、`/books/`、`/domain/`）、**当前页态**（`.current` + `aria-current` 成对，「算了就必须有人画」）、**无 JS 地板线**（`slot="fallback"` 只承诺静态说明，不承诺降级功能）。

---

# T1 · 度量与一致性（第二轮 grilling）

## T1 第一轮裁决（2026-09-21，四题全 A）

| 题 | 裁决 | 含义 |
|---|---|---|
| Q18 | **九项全入** | #9 正文度量、#10 灰阶五源、#11 `#999aaa`、#12 双 h1 与跳级、#13 命中区、#14 日历 9/10px、#15 等宽数字、#16 三族缩略图圆角/宽度、#17 h4 上边距与 24/25 行高。取证若证明某项是原版原样，该项自动退出（见 Q19） |
| Q19 | **原版优先，a11y 硬失败例外** | 政策题：凡 `docs/reference/colorful-original.css` 里就是这个值的，不动；只有我们自己的漂移才收敛。唯一例外是无障碍硬失败（如 `#999aaa` 的 2.78:1、禁缩放）一律修 |
| Q20 | **站点 h1 降级 + 跳级拉平** | `Navbar.astro:27/:43` 的 `<h1>` 改为非标题元素，侧栏部件 `h3`、文章页 `h1→h3` 一并拉平 |
| Q21 | **24×24 为底线，药丸仅窄屏放宽** | 主要控件全部 ≥24；药丸这类高密度元件只在 `<680px` 扩内距，桌面保持原值（药丸是五处共用 DOM + 六色 nth-child，桌面动它等于动版式） |

### Q20 的影响面（自查所得，不在取证代理范围内）

- 需重指的选择器共 6 条：`global.css:128` `.site-header h1`、`:135` `.site-header h1 a`、`:138` `.site-header h1 a:hover`、`:1690` `.site-header h1`（媒体块内）、`:1962` `#header h1`、`:1970` `#header h1 a`。
- **没有任何 JS 依赖头部 h1**：全站 `querySelector("...h1")` 只出现在 `scripts/nice-books-design-qa.mjs:940,1140`，查的是 `article h1`，属 `/books/` 独立壳，不受影响。
- 原版 `colorful-original.css:76/:81` 自己就是用 `#header h1` 元素选择器的，因此降级标签等于**偏离原版的 CSS 结构**（视觉可做到逐像素一致）。
- **必须复查的已知脆弱点**：AGENTS.md 写明 `#header` 固定 `180px` + `overflow:hidden`、`#header h1` 与 100px 浮动 logo 并排且 `max-width` 必须为 `calc(100% - 100px)`，「改头部布局后须在 681–1100px 各断点复查标题位置」。这条约束要原样迁移到新类名上，并按 AGENTS.md 在 681/770/860/980/1100px 复查。

### T1 验收方式（建议，待你确认）

用仓库现成的 `scripts/upgrade-style-audit.mjs`（Astro 升级时为「证明改动不改样式」而写）：

1. 改前：`node scripts/upgrade-style-audit.mjs capture --base <preview> --out output/fp-before`（24 个关键页逐元素计算样式指纹，含 `::before/::after`）
2. 改后同样 capture 到 `output/fp-after`，再 `diff`
3. 预期差异**只允许**出现在我们本轮明确要改的项上（文章页 h1 行数、`#mmenu` current 上色、药丸窄屏内距…），其余必须逐元素等值

采集前须按 AGENTS.md 冻结动画、种子化 `Math.random`，并排除 myhkw 播放器、看板娘、轮播、3D 标签云、swup 瞬时类名与带端口绝对 url——这些都是该脚本实测过的假阳性来源。这比人眼比对强在它能证明「没动的东西真的没动」。

## T1 取证结果：九项里四项被撤销或降级

取证两条线（路由与灰阶归属 / 原版对照与死规则）+ 一次真实浏览器量测。**结论有四处推翻了我自己上一轮的审计条目**：

| 审计项 | 取证结论 | 处置 |
|---|---|---|
| #9 正文度量 1020px 失控 | 长文只在文章页（本就 745px 窄列）与 `/about/` 稿纸（行宽由 `.letter-paper` 的 `padding … clamp(28px,6vw,82px)` 自治）；其余满宽页是网格页，宽是设计意图。给 `.post-context` 加 max-width 会挪动 `6vw` 与 `--lp-baseline` 相位（AGENTS.md 锁定的耦合） | **撤销**（Q24-A） |
| #17 行高 24/25 不一致 + h4 无上边距 | 原版**同时**有 `#content{line-height:25px}`（`colorful-original.css:222`）与 `.post-context{line-height:24px}`（`:304`），我们两条各自对应原版；原版 `.post-context h4` 本身也是 `margin-bottom:15px` 无上边距 + `border-left:3px solid #000` + `18px`（`:305`） | **整项撤销**（Q28-A） |
| #15 等宽数字用反了地方 | 实测线上正文 `Noto Sans SC Variable` 下 `"1111111"`/`"0000000"`/`"1472580"` 在 14px 全为 **54.39px**，`tabular-nums` 开与关**逐字节相同** → 西文数字本来等宽；归档日期列左沿参差的真因是「9月」比「10月」少一个汉字 | 前提不成立，但**仍加声明作换字体保险**（Q33-B） |
| #13 命中区 | 药丸盒值 `margin:4px 5px 0 8px; padding:3px 7px; font-size:11px; line-height:14px`（20px 高）与原版 `:162` **逐字节相同**，六色 hex 集合亦相同；幻灯片点 10×10 就是原版 `:716` 的值；那些 17px 高的链接全是**内联在 12px 文字流里的**目标（`.post-metaa`、`#footer .copyright`、`.post-lisence`），落 WCAG 2.5.8 的 Inline 豁免 | 只修独立控件：药丸 `<680px` 局部放宽、幻灯片点用 `::before` 扩热区（视觉不动）；内联链接**不修**（Q35-A） |
| #16 三族缩略图圆角/宽度 | `.photo-grid`/`.album-grid`/`.album-cover`/`.image-card` **原版都不存在**（只有 `.imageswall`，且无圆角）→ 纯我们的漂移，不受「原版优先」保护。真 bug 只有一个：`.photo-grid img` 圆角 10px（`:4512`）比其卡片 `a` 的 5px（`:5346`）还大，图角会从卡片里露出来 | 只把该 10px 收齐到 5px；宽度 182/182/190 分属不同页面族，不动（Q26-A） |
| #10/#11 灰阶五源 | 因果反了：`#999aaa` **就是原版的 meta 灰**（`:251 .post-meta`、`:183 #newcomment .time`、`:334 .modified`、`:446-479` 评论 meta 群），而 `global.css:5070-5078` 用 `--colorful-text-secondary:#666` 重刷 `.post-meta`/`#sidebar` 是**我们的漂移**——但 `#666` 是 5.74:1、`#999aaa` 只有 2.78:1。原版 meta 家族里根本没有 `#888`，那四处确属漂移 | 政策加「漂移更优则转正」条款（Q22-A）；全站 meta 收敛到单一值 **#666**（Q23-A）；`#sidebar` 的 `#808080`（`:2418/:2423`）已被 `:5070` 覆盖，属近似死规则 |
| #12 双 h1 与跳级 | 需重指 6 条选择器（`:128/:135/:138/:1690/:1962/:1970`）；**无任何 JS 依赖头部 h1**（全站 `querySelector("…h1")` 只在 books QA 脚本里查 `article h1`）；原版自己就用 `#header h1` 元素选择器（`:76/:81`），所以降级标签等于偏离原版 CSS 结构 | 做，但必须按 AGENTS.md 在 681/770/860/980/1100px 复查标题位置（Q20-A） |
| #14 日历标签 10/9px | 与格子几何**不耦合**（`aspect-ratio:53/7` 只挂在 `.gh-calendar-cols`，月份行是独立网格 + `minmax(0,1fr)`）；AGENTS.md 锁的是 padding、53/7、subgrid、入场方向，**没锁字号** | 提到桌面 11px / 窄屏 10px，需同步四处：`--gh-wd :809`、`:843` 里重复硬写的字面量 `14px`、窄屏 `--gh-wd:12px :1006`、9px 覆盖 `:1009-1012`。验证点：月份行有 `overflow:hidden` 会裁切、周几行无裁切保护会外溢（Q34-B） |

### 新发现：原版正文按钮家族整体漏搬

`colorful-original.css:315/316/317` 是一整套 `.post-context button`——基态 `height:30px` + `1px #0c0` 绿边 + `color:#0c0` + `border-radius:3px`、hover 绿渐变 `#080→#0c0` 加阴影、`:active` 红 `#FF262E`。我们一条都没搬（全站 `:active` 现只剩 `.open-nav` 与字号滑杆）。裁决：**搬回并只作用于正文真 `<button>`**；`.spoiler` 保持自研暗底（遮挡语义要求藏字，白底绿字的原版钮不遮字），另按 T0 已裁的 Q2 补 keydown 与 `:active` 红。开工前先数清正文里真 `<button>` 的分布以免误伤（Q27-C）。

### 机制更正：Tailwind v3 的 `@layer` 不是 CSS 级联层

**这推翻了我自己写进本文与审计清单的解释**，也影响 AGENTS.md 的一处表述：

- `src/styles/global.css:10/:58` 的 `@layer base/components {` 是 **Tailwind v3 的构建期指令**，PostCSS 消费后把内容搬到 `@tailwind components` 的位置输出为**普通 CSS**。证据：九个 `dist/_astro/*.css` 里 `grep -c '@layer'` **全为 0**。
- 因此竞争规则是「特异性 → 输出顺序」，不是「无层胜过有层」。`@layer base` 里那条 `html{font-size:13px}`（`:31`）之所以从未生效，是因为它被搬到输出前部后，被后面同特异性 `(0,0,1)` 的 `:1767 html{font-size:100%}` 靠**源顺序**压过——实测根字号 16px 这个现象不变，解释要改。
- 同一更正适用于 AGENTS.md 那句「`.prose code{font-size:13px}` 整条被关在 `@media (max-width:680px)` 内（桌面永不生效）」：它其实关在 `@layer components`（`:58-1666`）里、**不在任何 @media 内**（`@media (max-width:768px)` 从 `:1669` 才开始）。而 T0 新加的行内代码规则本来就是靠**特异性**赢的：`.post-context :not(pre) > code` 是 `(0,1,2)`，压得住 `.prose code` 的 `(0,1,1)`——与源顺序无关。

### 死规则逐条判定（Q36 的裁决依据）

| 位置 | 判定 | 依据 |
|---|---|---|
| `:315` `.post-list .post-header{padding:5px 0}` | **全死** | 被 `:2485`（`padding:0 0 0 20px` + margin/border）同特异性后置全量覆盖 |
| `:318` `.post-list .post-header h2{display:inline;19px;1.4}` | **全死** | 被 `:2493-2508`（`display:block;18px;25px`）覆盖 → 卡片标题实际 18px，不是 19px |
| `:432` `.pagenavi{float:right;…}` | **全死** | 被 `:2636`（`float:none` 等四属性）覆盖 |
| `:438-451` `.pagenavi a/span/em` | **部分幸存** | `:2650` 用 `>` 遗漏嵌套 `span.pagenavi-icon`，故 `float:left`+`text-align:center` 存活；float 因父为 `inline-flex` 而无效。`em` 分支从不渲染 |
| `:324/:327` `.post-list .post-header h2 a[:hover]` | **无效果但保留** | 特异性更高（`0,3,2` vs `0,2,2`）会赢，但 `--primary` 就是 `--colorful-green` = `#00c000`，值相同；删掉会改变层叠语义，留着 |
| `:1514` `.prose{font-size:14px;line-height:1.9}` | **活着** | 后面无未层的 `.prose{}`；但行高被 `:3041` 的 `.post-context{line-height:24px}` 压住 |
| `:2418/:2423` `#sidebar{color:#808080}` | **近似死** | 被 `:5070-5078` 的 `--colorful-text-secondary` 重刷 |

裁决：删 `:315`、`:318`、`:432` 三段全死的 + `:438-451` 的 `em` 分支；其余保留（Q36-A）。

## T1 执行清单（裁决已全定，共 6 项）

- [ ] T1-1 灰阶收敛：全站次要文字统一到 `#666`（含侧栏三处 `#999aaa`——换一批按钮 `:3360`、最新评论时间 `:3461`、留言板时间 `:3654`，以及 `#888` 四处、`#767676`）；同步把 `:1763` 那条自称 AA「≈4.65:1」的注释改成实测事实 ｜验收：三处计算色 = `#666`，对比度 5.74:1
- [ ] T1-2 删死规则：`:315`/`:318`/`:432` 三段 + `:438-451` 的 `em` 分支 ｜验收：删除前后样式指纹比对，除卡片标题本就 18px 外无差异
- [ ] T1-3 站点标题降级：`Navbar.astro:27/:43` 的 `<h1>` → 非标题元素，重指 `:128/:135/:138/:1690/:1962/:1970`；侧栏部件 `h3`、文章页 `h1→h3` 跳级拉平 ｜验收：每页仅 1 个 h1；`#header` 在 681/770/860/980/1100px 复查（AGENTS.md 硬要求）；标题视觉逐像素不变
- [ ] T1-4 命中区：药丸仅 `<680px` 放宽、幻灯片点用 `::before` 扩热区（视觉保持 10×10）｜验收：390px 下药丸 ≥24、点命中区 ≥24 而外观不变；内联链接不动（WCAG 2.5.8 Inline 豁免）
- [ ] T1-5 日历标签 10/9 → 11/10，四处同步（`--gh-wd :809`、`:843` 字面量、`:1006`、`:1009-1012`）｜验收：11px 下「12月」不被 `overflow:hidden` 裁切、周几不外溢；53/7 与 subgrid 未动
- [ ] T1-6 原版按钮家族搬回（`:315/316/317` 三态），仅作用正文真 `<button>`；`.spoiler` 保持自研 ｜验收：先数清正文真 button 清单，逐个截图
- [ ] T1-7 等宽数字保险：给日期/计数类加 `font-variant-numeric: tabular-nums`（实测当前为空操作）｜验收：无回归即可
- [ ] T1-8 三族圆角：`.photo-grid img` 10px → 5px ｜验收：图角不再超出卡片圆角

### T1 明确不做（防止下轮重报）

- 正文度量上限（#9）、行高 24/25 与 h4 上边距（#17）、内联链接命中区（#13 的 17px 部分）——**都是原版原样或标准豁免**，不是缺陷。
- 卡片宽度 182/182/190、`:324/:327` 与 `:438-451` 的幸存部分——保留。

## 收尾两笔（已决，2026-09-21）

1. **Q37 T1 验收启用 `scripts/upgrade-style-audit.mjs` 指纹比对**。T1 六项多是「值应当变、其他一律不许变」，删死规则与 h1 降级尤其需要证明波及面为零。流程：同数据下改前 `capture --base <preview> --out output/fp-before` → 改后 capture 到 `fp-after` → `diff --verbose`；差异只允许落在本轮明确要改的项上。采集前冻结动画、种子化 `Math.random`，并按 AGENTS.md 排除 myhkw 播放器、看板娘、轮播、3D 标签云、swup 瞬时类名与带端口绝对 url。
2. **Q38 「漂移更优则转正」已固化为 `docs/adr/0004-fidelity-policy-drift-promotion.md`**，并在 `CONTEXT.md` 加了术语 **转正基线**。ADR 同时列出被该政策保护为「不是缺陷」的四项：正文 24/25 双行高、`.post-context h4` 无上边距、药丸 20px 与六色轮换、幻灯片点 10×10。

### T1 剩余裁决补录（Q33-Q36）

| 题 | 裁决 |
|---|---|
| Q33 | 等宽数字：**照样加 `tabular-nums` 当换字体保险**，尽管实测它对当前字体是空操作（该项因此不进验收判据，只要求无回归） |
| Q34 | 日历标签：**桌面 11px / 窄屏 10px**，四处同步（`--gh-wd :809`、`:843` 字面量 `14px`、窄屏 `:1006`、`:1009-1012`） |
| Q35 | 17px 内联链接：**不修**，依据 WCAG 2.5.8 的 Inline 豁免（这些目标嵌在 12px 文字流里，加内距会撑坏原版 meta 行） |
| Q36 | 死代码：**只删全死的 `:315`/`:318`/`:432` 三段 + `.pagenavi` 的 `em` 分支**；`:324/:327`、`:438-451` 幸存部分、`.prose{14px/1.9}` 全部保留 |

## T0 / T1 两轮 grilling 状态：frontier 已空，等待开工确认

- T0：8 项，裁决见「第一轮/第二轮/第三轮裁决」与「最终执行序」。
- T1：6 项，裁决见「T1 第一轮裁决」「T1 剩余裁决补录」与「T1 执行清单」。
- T2（死代码剩余项、`html{font-size:13px}` 是否启用、AGENTS.md 三处失真更正、`.header-ticker` 死块、768 双写法、`100dvh`）与 T3（海洋绿 vs WCAG 的三处让步、z-index 标度）**尚未开始问答**。
- 目前**未改任何源码**；已落盘的是三份决策文档（`docs/ui-adjust-0921.md`、`docs/adr/0002、0003、0004`）、`CONTEXT.md` 四条术语，以及 gitignore 内的四个量测脚本。

---

# T2 · 死规则与文档失真（已裁决，2026-09-21）

| 题 | 裁决 | 落地 |
|---|---|---|
| Q39 | **B** | 删 `global.css:31` 的 `html{font-size:13px}`，并显式写一条 `html{font-size:100%}` 钉住 16px 基线；AGENTS.md 记明「本站根字号 16px，主题尺寸全靠 px」（主题 CSS 里 `rem` 出现 0 次，删它零影响；启用 13px 会让 Tailwind 全部 rem 工具类缩 19%，属全站重排，否决） |
| Q40 | **B** | 删 `.header-ticker` 整块（`:143-170` 含 `@keyframes ticker-scroll`）+ `:1693` 媒体覆盖；AGENTS.md 头部轮播条补「实现只有 `#header .text` + `initHeaderTicker()`」，并新增一条认知约束：**Tailwind v3 的 `@layer` 是构建期指令、产物里无级联层，比较规则是「特异性 → 源顺序」** |
| Q41 | **A** | 只删 `:1669` 块里那条 no-op 的 `.main-grid{grid-template-columns:1fr}`。**680/681 不是缺陷**——`max-width:680` 与 README:158「681 起为活动带」正好自洽，是我上一轮读错；两处 768 断点规则分工不同，合并属断点重构，单独立项 |
| Q42 | **B** | `site-modal.css:37` → `max-height: min(80vh, 80dvh)`（该弹窗仅移动端触发，正是 `100vh` 陷阱场景；`min()` 换掉「旧浏览器不认 dvh」的赌注） |
| Q43 | **C** | **先查再定**：`span.text-[0.85em].text-nb-seal`（实测 11.9px，违反 `docs/nice-books-design.md` 的「辅助文字 ≥13px」）承担什么语义——承载可读信息就改代码，纯装饰就改契约。查清后给 A/B 的确切后果 |
| Q44 | **A** | `404.astro` 补一个 `<h1>`（现在 `div.code`/`div.msg`，整页无标题）；列表页 description/title 带页码后缀（`index.astro:21`、`page/[page].astro:24` 全站同一条 subtitle；`/hot/page/N/` 标题无页码） |
| Q45 | **B** | 文档失真逐条改（见下表）+ 新增写作约定：**约束以选择器/路径为锚点，行号只作辅助并写「约」**，只对新写内容生效 |
| Q46 | **B** | 同上，不动历史实测数字的表述 |
| Q42-验收 | **A** | T2 的验收判据收紧为**删前后指纹零差异**（`upgrade-style-audit` 24 页逐元素，含 `::before/::after`）——删的都是不参与渲染的规则，「完全等值」正是正确结果 |

## T2 · 文档失真清单（11 条，取证代理报的 16 条里我抽查证伪 5 条后剩下的）

| 位置 | 失真 | 现实 |
|---|---|---|
| AGENTS.md 正文行内代码条 | 「`.prose code{font-size:13px}` 整条被关在 `@media (max-width:680px)` 内（桌面永不生效）」 | 在 `@layer components`（`:58` 开、`:1666` 闭）内，`:1585`，**桌面一直生效**；文件里 `:1392`/`:1441` 两个 media 块都在它之前已闭合 |
| 同条推论 | 「legacy `.post-context code` 因此仍是行内代码的兜底来源」 | 覆盖关系由**特异性**决定：`.post-context :not(pre) > code` 是 `(0,1,2)`，压得住 `.prose code` 的 `(0,1,1)`（取证代理说「靠源顺序」也不准确） |
| AGENTS.md Nice Books 条 | 「`books.ts`（22 本 V1 fixture）」「`/books/:id/` getStaticPaths 22 静态页」 | 实际 **70 条**（`id:`/`author:`/`},` 三向计数一致）；`books.ts` 文件头注释也停在「V1 fixture 22 本（01–22）」 |
| AGENTS.md 样式条 | 「标签药丸 `#blogtags`（global.css 约 3477 行起）」 | 实际 `:3697`（块 3697-3800），漂移约 +220 |
| AGENTS.md Agent skills | 「`docs/adr/`（现仅 0001）」 | 现有 4 份（0002/0003/0004 是本次会话所落） |
| README.md:7 / :40 | 「Astro 5.16」、「Astro 5 content layer」 | 6.4.8；且 README:176 自己记录「Astro 5→6 已于 2026-09-20 完成」，README 内部自相矛盾 |
| AGENTS.md 常用命令 | 缺 `test:friend-icons`、`test:utils`、`smoke:ai-news`、`qa:nice-books-geometry` | `package.json` 里都存在（已列出的脚本名无一失效） |
| README.md 常用命令 | 缺 `test:site-stats`、`test:contributions` | 同上 |
| README.md:32-33 | `smoke:nice-books`/`qa:nice-books-geometry` 写「需先启动 pnpm dev」 | 两个脚本默认端口不同（`nice-books-smoke.mjs:7` → 4321 dev；`fancybox-smoke.mjs:7` → 4322 preview）；AGENTS.md 认定 smoke 权威是 build+preview，需统一注明 |
| AGENTS.md 构建链条目 | 「@swup/astro 1.8.0」 | 装的是 1.8.0，但 `package.json` 范围仍写 `^1.7.0` |
| AGENTS.md 行号类引用 | 「`#header h1` 的 max-width 必须为 `calc(100% - 100px)`」等无行号约束 | 已核对无误（`:5121` 一带）；本轮所有误判的根源是**拿旧行号当现值**，故立 Q45-B 的锚点约定 |

**已核对无误**（不必再动）：`.post-context{word-break:break-all}` 确在 `:3042`；药丸盒值与原版逐字节相同；`html.with-fancybox .backtop{margin-left:-619px}` 确在 `.backtop:hover` 之前；`.prettierignore` 只剩 font-awesome；`upgrade-style-audit.mjs` 恰 24 页；CI 事实（`cache:false`、Giscus 同步早于安装、cron `17 */6`、`build.yml` 的 `if: pull_request`）全部成立；被点名的路径与选择器全部存在。

**被证伪、不采纳的取证条目**：`test:utils` 等脚本「不存在」（实存于 `package.json:27`）、astro 版本「应为 ^6.4.10」（实为 `6.4.8`）、`astro.config.mjs` 「297 行且缺 gfm」（实为 159 行、`processor: unified({` 在 `:111`）、`.letter-paper-body` 「不存在」（实在 `about.md:54` 与 md-ext `:576/717/726`）、albums 索引「裸 img」（`:46` 用的就是 `ResponsiveImage`）、`.post-context` 「只有 break-word」（`:3042` 是 break-all）。

---

# T3 · 对比度与品牌让步（已裁决，2026-09-21）

| 题 | 裁决 | 落地 |
|---|---|---|
| Q47 | **A + B** | `--colorful-green: #00c000` 不动（26 处绿字**实测全是瞬时态或装饰伪元素**：`a:hover`、`#nav li ul a:hover`、`#sidebar a:hover`、`.post-header h2 a:hover`、`#menu-index > li > a:focus-visible`、`#header .text li::before`；默认态黑字 21:1）。改为给这些瞬时态加一层**不依赖颜色**的辅助（下划线或字重），满足 1.4.1；字重方案须实测宽度跳动 |
| Q48 | **保白字、换背景色**（否决了我推荐的「改黑字一处搞定」） | 原版无可借先例——它的白字标签用 `#0c0`(2.18) 与 `#ffba00`(1.94)，本身就不管对比度。故按「保色相压亮度」出三档候选，见下表。**待定项**：琥珀要过 4.5 必须压成偏棕的 `#a56200`（亮度 50%→32%），是否接受、或只对琥珀用黑字（现状黑字 9.06✓）——留到 T3 批次预览时定 |
| Q49 | **B + C** | 只修三处真实风险：skip-link `10000000001` 与播放器 `10000000000 !important` 只差 1、`.click-word`(9999, `pointer-events:none`) 会浮在灯箱上、`.colorful_loading`(99999) 压住 site-toast(10000)。其余 22 个散值不动（AGENTS.md 锁着 myhkw>Pio、Fancybox>.backtop 等既定关系，全局重排风险大于收益）；同时在 AGENTS.md 记一张「谁必须在谁上面」的关系表 |
| Q50 | **C** | 交付节奏：代码一批一停预览，文档改动（T2 文档侧 + 各项 AGENTS.md/ADR 补记）单独一停 |

## Q48 候选色三档（实测对比度，`output/pill-candidates.mjs` 可复算）

| 档 | 红 | 琥珀 | 绿 | 紫 | 棕 | 蓝 | 白字结果 |
|---|---|---|---|---|---|---|---|
| 现状 | `#ff002b` 3.97 | `#ffa900` 1.92 | `#00a753` 3.16 | `#b433ff` 4.32 | `#b37333` 3.88 | `#0089fa` 3.52 | 六色全不达 AA |
| **同族压暗** | `#c9001f` 5.99 | `#a56200` 4.83 | `#00794a` 5.48 | `#8e1fd0` 6.45 | `#8f5a26` 5.74 | `#0066c9` 5.61 | **全过** |
| 更狠一档 | `#b3001c` 7.16 | `#8f5400` 6.11 | `#006b41` 6.61 | `#7d1ab8` 7.74 | `#7d4e21` 7.04 | `#005aa8` 6.94 | 全过（更暗） |
| 保守一档 | `#d40024` 5.49 | `#b06900` **4.32×** | `#008552` 4.69 | `#9c25e8` 5.46 | `#9a6129` 5.10 | `#0070dc` 4.83 | 琥珀不达标 |

六色可辨性：按亮度排序后最相邻的一对，现状是 红↔棕 ΔE=61.6，同族压暗是 红↔棕 ΔE=50.7 → **压暗没有把任何两色拉到难以区分的程度**。

改动落点集中在 `global.css:3699-3704` 的 `--tag-c1..c6` 六个 token：背景与三角 `::before` 的 `border-right-color` 都读同一组 token（`:3713/:3727/:3746…`），所以**一处改值即可同步六处轮换 + 五个共用 DOM**，不触碰 `nth-child` 顺序、`.tag-count` 与 `a.is-current` 的源顺序（AGENTS.md 锁定项）。

---

# 交付节奏（Q50-C）

1. **T0 代码批**（8 项）→ 停下交本地预览 → 通过后一项一 commit
2. **T1 代码批**（6 项，含 `upgrade-style-audit` 指纹比对）→ 一停
3. **T2 代码批**（删规则 + dvh + 404 h1 + meta 页码）→ 一停，判据是**指纹零差异**
4. **T3 代码批**（瞬时态非颜色辅助 + 药丸 token + z-index 三处）→ 一停
5. **文档批**（AGENTS.md 11 条失真更正 + 锚点约定 + ADR 补记）→ 单独一停

---

# 子决策闭结（Q43 / Q48，2026-09-21）

## Q43 → 改契约，不改代码（并更正我自己审计里的一个假阳性）

`src/pages/books/index.astro:51`（另有 `:103` 同形）的那个 11.9px 元素是：

```html
<span class="text-[0.85em] text-nb-seal" aria-hidden="true">✦</span>
```

**它不承载任何可读信息**——一个 `aria-hidden` 的装饰星标。按我在 Q43 立的判据（承载可读信息则改代码，纯装饰则改契约），结论是改 `docs/nice-books-design.md`：给「辅助文字至少 13px」补一句适用域——**该条约束文字内容，不约束 `aria-hidden` 的装饰字形**。

同时更正：审计条目 #23「`/books/` 11.9px 违反自身契约」是**假阳性**，是我把装饰字形按文字判了。

## Q48 → 琥珀色的确切取舍（数值已扫到边界）

保白字、只压背景，则琥珀必须从 `#ffa900` 降到约原亮度 63%：

| 候选 | 白字 | 黑字 | 判定 |
|---|---|---|---|
| `#ffa900`（现状） | 1.92× | **10.93✓** | 琥珀是唯一「黑字远优于白字」的一格 |
| `#b87a00` | 3.61× | 5.82✓ | 白字仍不达标 |
| `#b06900` | 4.32× | 4.87✓ | 差一点 |
| **`#aa6600`** | **4.56✓** | 4.61✓ | 保白字的最亮实用值（亮度约 63%） |
| `#9c5d00` | 5.28✓ | 3.98× | 更暗，且黑字反过头不达标 |

其余五色的同族压暗值（`#c9001f` `#00794a` `#8e1fd0` `#8f5a26` `#0066c9`，白字 5.48–6.45）不受此争议影响，六色可辨性 ΔE 由 61.6 降到 50.7，仍远高于易混阈值。

**待你在两者间定**：① 六色统一压暗、白字不动（观感代价集中在琥珀一格变棕）；② 五色压暗 + 琥珀单独改黑字保留鲜亮（一处不一致换一处鲜艳）。改动都集中在 `--tag-c1..c6` 六个 token，不触碰 `nth-child` 轮换与 `a.is-current` 源顺序。

---

# 整轮收口 · 全链验证与指纹归档（票 23，2026-09-23）

> 站长 2026-09-22 选乙法后落地的三票，与 T0–T2 合起来构成 23 票全数交付。本节是票册「改后指纹与基线比对报告归档」这一条的落点。

## 一、终版指纹：基线 `output/fp-t3-base` → 末态 `output/fp-t3-final`

两端同一端口（4399）、同一 23 页清单、同一构建输入（先还原被 `pnpm build` 改写的 GitHub 快照再重建，避免贡献日历随远端漂移），采集前照例删过 `node_modules/.astro`。

| 项 | 读数 |
|---|---|
| 页面数 | 23 → 23 |
| 逐页元素总数 | 15223 → **15223**（零增删，即没有一张票动过 DOM 结构） |
| 变化元素 | **459**，分布在 20/23 页 |
| 变化属性种类 | **2**：`background-color` 439 处、`z-index` 20 处，无第三种 |
| 未变化的三页 | `/books/`、`/books/archive/`、`/books/01/`——独立壳不引 `Layout` 与 `global.css`，本就没有 skip link 与药丸，属预期 |
| console 报错 | 两端各 5 条、逐页对应相同（远端资源加载失败，与样式无关） |

归因到票：

- **439 处 `background-color` = 票 21**。全部落在药丸锚点（叶标签 `a`），每处只差这一个属性——三角与圆点两个伪元素一条没变，证明六色确实只由 `--tag-c1..c6` 单源驱动，没有第二处硬编码。按页：`/tag/` 65、文章页 37–40（云 + 侧栏 + `.post-tags`）、主站壳页 33（侧栏 32 + skip link 1）、`/category/` 39。
- **20 处 `z-index` = 票 22**。逐页一处，全是 `a.skip-link` 的 `2147483647 → 1000000`。旧产物算出的正是 int32 顶值——**缺陷本身被印在改前证据里**，这条是票 22「源文本看不出来」那两层陷阱（超界静默钳位、模态 `<dialog>` 走顶层层）的实物照。
- **票 20 = 零漂移**。它只加 hover 态，而采集从不驱动 hover/focus，与 T3 前置结论一致：这一票的判据只能落在缝隙 A，写「指纹零差异」才是假绿。

**归因脚本自己翻过一次车**：第一版按 `;` 直接拆属性，没先按 ` | ` 分段——一条记录里锚点与 `::before`/`::after` 有同名属性（`display`/`width`/`inset`…），于是拿锚点的值去比伪元素的值，虚报成 6166 处变化、多出六种「属性」。改成段感知后得 459，与指纹工具自报的数逐一对齐。**教训：归因表也要先证明它数对了，才能拿它当证据。**

## 二、本地全链（2026-09-23 跑；起点 HEAD `ae07945`，缝隙 A 的那 1 项是本票未提交的改动）

> 表头这一处我原先直接写「HEAD `ae07945`」而把 112 项塞进同一行——那是错的：112 项里有 1 项是收口时新加的，`ae07945` 上只有 111。带日期的读数属于**那一次运行**，运行时的树是什么就写什么。

| 环节 | 结果 |
|---|---|
| `rm -rf node_modules/.astro .astro/data-store.json` → `pnpm build` | exit 0（链头三组单测各 `fail 0`；validate-post-slugs / LQIP / GitHub 拉取 / astro build / 佛祖横幅 / Pagefind 全过） |
| 构建改写的跟踪文件 | `github-contributions.json`、`github-projects.json` → `git checkout --` 还原；其余五个 constants 与 `site-stats.json` 零漂移 |
| 确定性复检 `pnpm exec astro build` + banner + pagefind | exit 0。**第一次在 `/og/*.png` 处失败**：`fonts.googleapis.com` 连接超时 → `No fonts are loaded`，是 AGENTS.md 记录的已知网络抖动；curl 复探 200/0.99s 后原样重跑即过 |
| `pnpm check` | 159 files，**0 errors / 0 warnings** / 2 hints |
| `prettier --check ./src ./scripts tailwind.config.cjs` | All matched files use Prettier code style! |
| 离线单测 | 六个脚本共**七次 `node --test` 调用**（`test:projects` 内串了两组）：utils 16、contributions 11、friend-icons 32、projects 6＋7、nice-books 51、site-stats 15 ＝ **138 项 0 fail**。我第一版记成「六组 132 项」，起因是每个脚本我只取了 `tail -6`，把 projects 的第二组整个漏在读数外——**记总数要按调用次数逐组累加，不能信 tail** |
| 缝隙 A `pnpm smoke:ui`（build + preview:4399） | **112/112**（111 → 112 见下） |
| 其余浏览器套件（同端口） | `test:fancybox` 27/27、`smoke:nice-books` 72/72、`smoke:ai-news` 9/9；外部服务失败单独统计不计 FAIL。**这三份读数今天在同一个 dist 上复跑过、结果一致，但归档的日志文件是 09-22 那一份**（`output/t3-fancy.log` / `t3-nb.log` / `t3-ainews.log`）——站长在我准备为它们另存日志时叫停了，所以别把那两个日期不同的文件当成本票的产物。缝隙 A 的 112 项有本票当日日志：`output/t23-smoke-ui-local.log`（本地）与 `output/t23-smoke-ui-prod.log`（线上） |

## 三、收口时把票 21 的最后一格判据补成了机检

票 21 原文「预览：五处共用该 DOM 的页面同屏比对」长期没勾，因为缝隙 A 只机检了两面（`/tag/` 云与文章页 `.post-tags`）。收口时补了一条判据，**而这条判据自己被抓出两个错——都是跑一遍才看得见的**：

1. **第一版裸写 `#blogtags`，而云集页上这个 id 有两个元素。** `src/components/layout/TagPillCloud.astro` 是唯一发射器，但 `/tag/`、`/category/`、单标签页、单分类页上都同时渲染**正文云 + 侧栏部件**两份（实测 `document.querySelectorAll('#blogtags').length === 2`）。裸选择器把两处并成一处，于是「五处」其实不到五处。现按容器限定：正文侧 `#content #blogtags a:not(.is-current)`、侧栏 `#sidebar #blogtags a:not(.is-current)`，并在细节里打印每处的 `色数/格数`（实测 32／31／6／5／32 格，五个数各自独立，才证明真的分开读到了）。
2. **第一版硬判「每处恰好 6 色」，第一次跑就在单分类页翻红。** 全站分类一共 6 个，单分类页排掉当前项只剩 5 格，永远凑不出 6 色。规则改为：越界（不在六色内）一律红；**格数 ≥6 时才要求出满六色**（防塌色），格数不足只报实际读数。这条不是设想出来的，是它自己报出来的。

同时更正我在这条判据上说过的一句错话：原先写「比的是集合，所以 `nth-child` 轮换若被改动仍会翻红」——**恰好相反**，集合相等对换序不敏感，把六色轮换整个打乱它照样绿。这条判据守的是**底色单源**（另一处硬编码、或某个界面漏接 token 会变红）；`nth-child` 六色轮换那条 AGENTS.md 锁由**缝隙 B 的逐元素指纹**守（票 21 的 439 处差异逐格归属可见）。两件事必须分开说，之前那句把 B 的功劳记到了 A 头上。

**这条判据会咬，做过变异验证**：给 `dist/_astro/*.css`（9 个文件）注入 `#sidebar #blogtags a{background-color:rgb(18,52,86)!important}` 后重跑，FAIL 明细为 `标签云集页=6色/32格 | 单标签页=6色/31格 | 分类云集页=6色/6格 | 单分类页=5色/5格 | 侧栏部件=1色/32格 问题：侧栏部件越界 32 格；侧栏部件 32格只出 1 色（疑似塌色）`——**只有被注入的那一处翻红，正文侧四处读数不变**，这既证明判据会咬，也反证容器限定真的把两处隔开了（若仍是裸 `#blogtags`，云页会跟着一起变红）。之后按备份还原 dist，九份 CSS 与还原前 `md5sum` 逐一相同，再跑 112/112。

另有一处评审提出的重复：新加的 `pillsAt` 与上方既有的 `pillFaces` 是同一形状（goto + evaluate + 读底色）。已把 `pillFaces` 改成 `pillsAt` 之上的一行 `.slice(0, 6)`，两处比对也统一到同一个键形（都先 `parseRgb().join()`，不再一处比原始串一处比解析值）。`/tag/` 仍被取两次是**故意**的：两次的选择器不同（含当前项的六色基准 vs 排除当前项的五界面比对），不是同一份数据。

## 四、收口期间新测得、未修、待站长定

`#header .text a`（头部微言轮播里的日期链接）静息计算值为 `text-decoration-line: none` + `color: rgb(255,255,255)`，而 `global.css` 里 `#header .text` 全族**没有任何 `:hover` 规则**（`grep -n '#header .text[^{]*:hover' src/styles/global.css` 零命中，命中数 0）。也就是这族链接悬停时既不变色也不出线。它不在票 20 的缺陷面内——票 20 修的是「状态只靠颜色传达」，这里是**根本没有状态反馈**——且补它属于新增视觉行为、必须过预览门禁，故票 23 只登记不改码，留给下轮。

**`id="blogtags"` 在四类页面上出现两次**：`src/components/layout/TagPillCloud.astro` 是唯一发射器（`<ul id="blogtags">`），但云集页与单页都要「头部全量云 + 侧栏部件」各一份。实测 `querySelectorAll('#blogtags').length`：`/tag/` = 2、`/category/` = 2、`/tag/xxx/` = 2、首页 = 1。CSS 不因此出错（选择器两处都命中），但 **HTML 的 id 必须全文唯一**，这属有效性／可访问性问题：锚点、`getElementById` 与辅助技术引用都只会指向第一处。本轮不修——换侧栏 id 等于动 AGENTS.md 锁定的「五处共用同一 DOM 结构」，参数化组件则是新增结构决策，两者都改 DOM 且要重开指纹基线。**顺带一条事实更正**：所谓「五处共用该 DOM」，在四类页面上其实是**同屏两处**；缝隙 A 那条新判据的第一版就是被这一点骗到的（裸 `#blogtags` 把两处并成一处）。
