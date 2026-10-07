# Spec：结构加深第二轮（文集 module · 运行时装配 · 天气单源）

- 来源：`improve-codebase-architecture` 评审（报告 `architecture-review-20261006-231117.html`，系统临时目录，不入库）+ 两轮 grilling 12 项已确认参数（Q1–Q12，已由站长逐轮确认「均按推荐」）
- 镜像 issue：**#88**（parent），子票 7 张（T1–T7，由票册发布时挂到本 issue 下）
- 上位文档：`AGENTS.md`（构建链与依赖约束、文档写作约定 Q45-B）、`GLOSSARY.md`、`docs/adr/0001–0007`
- 动工前边界：`HEAD` == `origin/main` == `f141d08`（本轮不设 tag，一票一 commit 单点退回）
- **硬约束（站长原话）**：「尽量不要触及页面的更改」——口径（Q1 已裁定）：**访客可见的产物与行为不变**；页面源码只允许「换成调用新 module」的最小 diff；验收靠判据与产物比对，不靠目视。

## Problem Statement

近三个月每个全局功能（天气胶囊、语录条、文集、侧栏动作族）都要同时穿过 css / 运行时脚本 / Layout 多条轴：语录条一条带子 8 个文件、+305 行进 theme-script。具体到三处最疼的：

1. **文集这条最新的纵切轴没有自己的 module**。三个 series 页面各自手抄同一条「取集合 → 过滤 → 排序 → 取成员 → 解析封面」管线；`resolveSeriesCover` 的 interface 要求调用方传入已排成员、实现却无视入参整遍重算（interface 说谎）；「谁是成员」有两个权威出口且私密成员上口径分叉；unit 缺省「篇」在四处靠注释维持一致；一条链路里 `getSortedPosts` 跑三遍。连载还会继续，这套重复每一章都再付一遍。
2. **主站运行时是一个 1815 行的 god module**。21 个 init 块同模块作用域、8 个模块级 bound 标志、三轨 swup 生命周期（一次性 / after-swap 硬编码 7 个 / `colorful:page:loaded` 事件）并存且无 module 承载，真实 interface 是散落两端的 `data-*` 契约；文件头注释早已失真；运行时层零单测，唯一的行为回归网（六个冒烟套件）不在 CI。
3. **天气胶囊的纯逻辑只能靠浏览器冒烟验证**。同一条「天气 → 图标」规则在 service 与侧栏各写一份（注释自认按码段判定会归错三类、真出过 bug 的规则），坐标粗化两份且错误语义相反；锁 12 个图标用例要各开一个真实页面走完整 geolocation→fetch→render，每例数秒。

## Solution

三篇分章，每篇把一个浅散区域收成**有窄 interface 的深 module**，全部在「访客可见产物与行为不变」的硬约束下进行：

1. **篇① 文集 module**：新建读侧 module，`listSeries` / `getSeriesView` 两个入口收拢全部文集取数；封面从同一份已排成员内部派生；unit 缺省单源；相邻导航重建于 view 之上。
2. **篇② 运行时装配**：新建 runtime 目录按块拆文件；swup 三轨生命周期收成装配处**一张表**（是否 after-swap 重跑一行声明）；语录条与液态玻璃两块迁出作 tracer。
3. **篇③ 天气单源**：「文字+码 → kind」与坐标粗化单源落 service，经既有 `window.WeatherCapsule` seam 暴露；侧栏变纯 adapter；12 个图标用例迁毫秒级单测。

七票实施，风险递增排序：T1→T2→T3→T4→T5→T6→T7。

## User Stories

1. 作为准备嵌《看懂 AI 写的网站》后续章节的站长，我希望文集的目录页、分页与侧栏目录由一个 module 直接给出，以便发新章时只写 frontmatter 与登记表，不动任何页面代码。
2. 作为登记下一本文集的站长，我希望「新文集」= 登记表加一条 + 文章带 series/seriesOrder，以便不必在任何页面里再拼一遍取数管线。
3. 作为改文集封面规则的维护者，我希望「显式 cover → 首位带 image 的成员头图 → null」只在一处实现，以便规则改动不会在三个页面各自漂移。
4. 作为读封面解析函数的会话，我希望 interface 与实现一致（传入已排成员就真的用它），以便不再需要多行注释解释「为什么入参被无视」。
5. 作为维护侧栏文集目录的会话，我希望「谁是成员」只有组内序列一个权威出口，以便私密成员口径分叉的注释不再需要。
6. 作为在意量词文案的站长，我希望「篇」这个缺省只在 module 一处，以便改缺省不会漏掉某个页面。
7. 作为改相邻导航的会话，我希望它建立在 view 入口之上，以便同一条链路不再把全站排序跑三遍。
8. 作为给主站加新运行时功能的会话，我希望每个功能块是一个有名字的 runtime module，以便改语录条只开一个文件、不必理解 1815 行里的 8 个 bound 标志与三轨生命周期。
9. 作为写新组件的会话，我希望 swup 重初始化清单是装配处一张表，以便不必背「容器内五件套自足 / after-swap 硬编码 / 容器外一次性」三套协议。
10. 作为站长，我希望语录条与液态玻璃在拆分后逐项不变，以便访客看不到任何差别。
11. 作为跑测试的会话，我希望语录条的语料挑选与逐字符排版进 node --test，以便语料规则改动是毫秒级反馈而不是整套 Playwright。
12. 作为改天气码段规则的维护者，我希望「文字+码 → kind」只有一份实现，以便修 bug 不会只修到终端天气行、漏掉侧栏天气胶囊（或反之）。
13. 作为锁天气判据的会话，我希望 12 个图标用例是毫秒级单测，以便回归反馈不再依赖逐例开真实页面。
14. 作为站长，我希望坐标粗化只有一种契约（数字对或 null），以便 service 与侧栏的错误语义不再相反。
15. 作为评审者，我希望每票的红绿证据可复现（变异验证），以便「看起来没变」升级为「字节级/判据级没变」。
16. 作为直接 push 到 main 的站长，我希望六个冒烟套件的 PASS 集合在运行时拆分前后不变，以便冒烟纪律继续承担行为回归网。
17. 作为读 GLOSSARY 的会话，我希望「组内序列」与「文集成员」两个口径各有词条，以便私密成员上的分叉有名字可查。
18. 作为将来拆其余 19 块的会话，我希望 tracer 票确立的形状（目录布局 / 装配表 / 守卫约定）可以直接复制，以便后续轮次不再重新设计。

## Implementation Decisions

锚点遵循 Q45-B（选择器 + 文件路径为锚，行号写「约」）。以下均为 grilling 已确认参数，实施期不再重议。

### 根（三篇共用）

1. **口径**：访客可见产物与行为不变；页面源码最小 diff（Q1-A）。
2. **交付纪律**：一份 spec + 一本票册（七票）+ issue 镜像（本 issue 为 parent）；一票一 commit；锁现状判据的红证据一律变异验证；全部完成后等站长同意推送。

### 篇① 文集 module（T1–T2）

3. 新建 `src/utils/series.ts`，收拢 `content-utils.ts` 中六个 series 函数（约 `:125–287`）：`isSeriesMember` / `resolveSeriesMeta` / `getSeriesMembers` / `resolveSeriesCover` / `getSeriesNeighbors` / `buildSeriesNote`。`src/data/series.ts`（登记表）与 `src/utils/series-integrity.ts`（校验）不动。
4. **interface 两个入口**（Q4-A）：

    ```
    listSeries(posts)    → [{ series, members, cover, count }, …]   // 总览页
    getSeriesView(posts, slug) → { series, members, cover } | null  // 目录页 / 分页 / 侧栏目录
    ```

    `members` = **组内序列**（GLOSSARY 词条：成员排除草稿与私密帖后按站长排定的组内顺序升序）；`cover` 由 module 从**同一份已排成员**内部派生（interface 不再说谎）；unit 缺省「篇」单源在 module。

5. `getSeriesNeighbors` 重建于 `getSeriesView` 之上（T2）；「非成员文章的时间线跳过整个文集」「组内首篇 prev 为 null、末篇 next 为 null」等 ADR 0007 语义逐字保持；0 基文案规则（第〇章渲染「第 0 / 4 章」）不动。
6. 消费方换调用：三个 series 页、`WidgetSeries.astro`、`PostCard.astro`（只换 import 与调用行，谓词语义不变）。**不动**：校验宿主（`series/[slug].astro` 的 getStaticPaths，ADR 0007 记录的形状）、双分页机制（`[slug]` 手写第 1 页 / `[page]` 用 `paginate()`）、`pathname.split` 提 slug。
7. 测试拆分：`content-utils.test.ts` 留通用排序/邻篇，新建 `series.test.ts` 收文集用例；`posts-schema.test.ts` 不动。

### 篇② 运行时装配（T5–T7）

8. 新目录 `src/utils/runtime/`，每块一文件；迁出块**自足幂等**（自己的 ready 守卫）、**import 无副作用**（DOM 操作全在 init 内）。本轮迁两块 tracer：语录条（`theme-script.ts` 约 `:1488–1788`）与液态玻璃（约 `:1239–1437`）。
9. `theme-script.ts` 本轮仍是装配 + 未迁 19 块的家；`pagefindReady` 导出签名不变，`Layout.astro` 引入行不动（约 `:207–213`）。
10. **swup 重跑清单单源成装配处一张表**（Q6-A / Q10-A）：

    ```
    // 行序 = 现调用序；第二列声明是否随 astro:after-swap 重跑
    [initRandomBackground, false]
    [syncNavHighlight,     true ]
    …共 24 行（现 pagefindReady 的 24 个调用）
    ```

    `pagefindReady` 与 `initSwupHooks`（约 `:1440–1463`）都从这张表驱动。**行为等价不变量：初始 24 项顺序、after-swap 7 项顺序逐项保持**（`destroyFancybox` 在 `astro:before-swap` 的挂载、`astro:page-load` 的滚动与 `colorful:page:loaded` 派发不动）。

11. `test:utils` glob 扩为 `src/utils/**/*.test.ts`（现测全在顶层，扩 glob 零影响；实测原 glob 不递归）。

### 篇③ 天气单源（T3–T4）

12. 「天气文字+码 → kind」纯函数落 `weather-service.js`，经 `window.WeatherCapsule` 暴露（`resolveCityName` 先例）。kind 优先级链以**现行 sidebar 版为准**：雷→雪→雾→雨→晴→阴（overcast 单列）→cloud，code 仅保留「113 → 晴」的现行用法。service 的 `conditionIcon`（约 `:229`）改为 **kind→emoji 映射**，映射保持现输出（overcast→☁️），45 码表优先行为在映射层保持。
13. `roundedCoordinates` 共享版：验证 + 0.1° 粗化，**非法返回 null**（单一契约：null = 无法粗化）；service 调用处把 null 翻译成既有 `serviceError("invalid_location")`（fetch 流程与错误路径不变）、自行 `toFixed(1)` 出 URL 参数；widget 直用数字对。
14. 侧栏特有纯文案函数（`locationErrorMessage` / `weatherErrorMessage` / `formatTime` / `sourceLabel`）一并可单测。
15. `sidebar-widget.js` 换调共享版后删除本地 `iconKind` / `roundedCoordinates`；冒烟删 12 个 kind 用例，保留几何 / ARIA / 状态机 / 壁纸判据；AGENTS.md 判据数与命令说明同 commit 更新。

## Testing Decisions

- **好测试只断言外部行为**（计算值、产物字节、判据结果），不断言 CSS 源文本、类名字符串或行号——票册既有纪律照抄。
- **篇① 测试 seam（从高到低）**：
    1. 构建产物本身：T1 三段式逐字节（同码双跑标定 → 改码 → 第三次与基线全量比对 `dist/_astro/**` + 全部 HTML，先剥侧栏 tab-widget 随机块；两侧都删 `node_modules/.astro` 与 `.astro/data-store.json`）。`content-utils` 零客户端引用已核实（只被 .astro frontmatter 与 `rss.xml.ts` 引用），逐字节可达。
    2. module interface：`series.test.ts` 经 `scripts/test-hooks.mjs` 桩化 astro:content（prior art：`content-utils.test.ts`）。
    3. 实机：series-smoke 36 判据（prior art：本仓缝隙 A 纪律）。
- **篇② 测试 seam**：实机行为是最高 seam——六套件迁移前后 PASS 总数与失败集合不变；纯函数（语料挑选/逐字符排版）经 module 导出进 `test:utils`；液态玻璃另跑 `scripts/upgrade-style-audit.mjs` 24 页计算样式指纹 capture/diff（prior art：fancybox-smoke、ui-smoke 语录条段、9/25 轮 smoke-harness）。
- **篇③ 测试 seam**：`window.WeatherCapsule`（`vm.runInNewContext` 装载 + fetch/timer 注入）是唯一单测 seam——service 与侧栏两个消费者使它成为**真 seam**（one adapter = hypothetical, two = real）；实机只留几何/ARIA/状态机/壁纸判据。prior art：`weather-service.test.mjs`、`weather-codes.test.mjs`、`sidebar-weather-smoke.mjs`。
- **每票红证据**：变异验证（改坏→红→还原→绿）。篇③的 45 码单测同时是**分歧探测器**：码表 emoji 与 kind 映射若有分歧当场红，逐码上报站长裁决（预期为零分歧——码表本就按文字语义建立）。

## Out of Scope

- 校验宿主迁移与「有 seriesOrder 无 series」逆命题（评审候选 5，另案；ADR 0007 记录的宿主不动）
- 侧栏注册 fail-loud、widgetMap 死键、actions 小组件（候选 4）
- 导航双实现一致性护栏（候选 6）
- global.css 按组件族分文件（候选 7；与 Q45-B 锚点约定的成本冲突，列 Speculative）
- theme-script 其余 19 块的迁移（后续轮照 tracer 形状复制）
- 双分页机制统一、`pathname.split` 提 slug 方式、`WidgetSeries.astro` 的 URL 依赖
- 任何新冒烟套件；不改任何既有判据的文案与输出格式

## Further Notes

- **风险登记**：① T3 的 45 码分歧面（见 Testing Decisions）；② T5 表驱动行序等价性（逐项等于现调用序，六套件守）；③ T4 冒烟删 12 用例后 AGENTS.md「侧栏天气 68」等计数现值与票册引用必须同 commit 更新。
- **ADR 相抵项**：无。篇① 不碰 ADR 0007 任何既定语义；篇③ 的 kind 统一不改变任何可见输出，不构成需要 ADR 的决策。
- **GLOSSARY**：「组内序列」词条已随 grilling 写入工作区，随本轮落地 commit 入库。
- **命名**：代码标识符沿用 series（GLOSSARY「文集」词条的 Avoid 对照已覆盖中文名与标识符的关系）。
