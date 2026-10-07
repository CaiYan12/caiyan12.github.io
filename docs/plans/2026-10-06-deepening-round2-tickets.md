# 执行票册：结构加深第二轮（文集 module · 运行时装配 · 天气单源）

- 来源：`docs/plans/2026-10-06-deepening-round2-spec.md`（spec）／ issue **#88**
- 已发布：本册 7 张票 = issue **#89–#95**，全部挂在 #88 下为 sub-issue，阻塞边为 tracker 原生链接；每张票标题下的 `> Issue: #NN` 即其镜像
- 证据登记册：本册各票的 **证据** 行（决策全文与已确认参数在 spec #88）
- 动工前边界：`HEAD` == `origin/main` == `f141d08`（本轮**不设 tag**，一票一 commit 单点退回）
- 上位决策：ADR 0001–0007；`AGENTS.md` 的构建链与依赖约束、文档写作约定（Q45-B：锚点用「选择器 + 文件路径」，行号写「约」）
- 评审来源：`improve-codebase-architecture` 报告（系统临时目录，不入库）+ 两轮 grilling 12 项已确认参数
- **硬约束**：「尽量不要触及页面的更改」——口径 = **访客可见的产物与行为不变**，页面源码只允许「换成调用新 module」的最小 diff。T1 票以「三段式逐字节」验收；T2–T7 以「判据集合前后不变」验收

## 本文件怎么用（checkbox 更新规则）

- 每张票的 `- [ ]` 是**验收判据**，不是待办清单：一条判据被真实观测到成立才勾，勾时必须能给出证据（命令输出、比对结果、红→绿两次读数）。
- 每张票开工时在其标题下追加一行 `> 状态：进行中 @日期`，完成时改为 `> 状态：已验收（commit sha）`。
- 任何一张票被退回，只回滚该票的 commit，不牵连同批其他票。
- 判据一律断言外部行为（计算值、几何、退出码、产物字节），**不断言 CSS 源文本、类名字符串或行号**。
- 浏览器类判据一律走 `pnpm build && pnpm preview --port 4322`，不走 dev。
- **每一票都要有红证据**：不接受「它本来就是绿的」。锁现状型判据的红证据由变异验证提供。
- 套件总数**不用 `tail`** 读。
- 开册期本册自检必红是预期（`pnpm audit:ledger` 的 R3 守的是收口：判据全部勾完才算收口）。

## 已确认参数（grilling Q1–Q12，不再重议）

1. **口径**（Q1）：访客可见产物与行为不变；页面源码最小 diff（只换 import 与调用行）。
2. **交付形态**（Q2）：一份 spec + 一本票册 + issue 镜像；一票一 commit；全部完成后等站长同意推送。
3. **①落点**（Q3）：新 series module 收拢六个 series 函数；校验宿主（ADR 0007 记录的 getStaticPaths）、双分页机制、`pathname.split` 提 slug **全部不动**。
4. **①interface**（Q4）：`listSeries` / `getSeriesView` 两入口；cover 由同一份已排成员内部派生；unit 缺省「篇」单源；`getSeriesNeighbors` 重建其上；`isSeriesMember` / `resolveSeriesMeta` / `buildSeriesNote` 原样导出。
5. **②范围**（Q5）：装配表单源 + 迁两块 tracer（语录条、液态玻璃）；其余 19 块后续轮照形状复制。
6. **②形状**（Q6）：每块一文件、自足幂等（自己的 ready 守卫）、import 无副作用；装配处持显式清单；不加事件总线、不做模块自注册（「给零件、不反转控制」）。
7. **②验收**（Q7）：六套件 PASS 总数与失败集合前后不变；纯函数进 `test:utils`；液态玻璃另跑 24 页样式指纹。
8. **②落点**（Q10）：新 `src/utils/runtime/`；`theme-script.ts` 仍是装配 + 未迁块的家，`pagefindReady` 导出签名不变；`test:utils` glob 扩为 `src/utils/**/*.test.ts`（原 glob 不递归，实测）。
9. **①证明**（Q11）：T1 三段式逐字节（`content-utils` 只被 .astro frontmatter 与 `rss.xml.ts` 引用、零客户端引用，实测核实可达）。
10. **③seam**（Q8）：kind 单源落 `weather-service.js` 经 `window.WeatherCapsule` 暴露；优先级链以现行 sidebar 版为准；`conditionIcon` 变 kind→emoji 映射保持现输出（overcast→☁️）。
11. **③契约**（Q9）：`roundedCoordinates` 共享版返回数字对或 **null**；service 调用处把 null 翻译成既有 `serviceError("invalid_location")`；12 个 kind 用例迁单测后**从冒烟删除**；AGENTS.md 计数同 commit 更新。
12. **票划分与顺序**（Q12）：T1→T7 七票，风险递增，每票独立退回。

---

## 篇① 文集 module

### T1. 文集取数收拢：新建 series module（listSeries / getSeriesView）

> Issue: #89

**Blocked by**: 无（可立即开始）

> 状态：已验收（8aa9754）

**Delivers**：发新章零页面改动成为常态——目录页、分页、侧栏目录的文集数据全部来自一个 module；「调用方备料被无视」的 interface 谎言与「篇」缺省散布消除。

- [x] 新 module 导出 `listSeries(posts)` 与 `getSeriesView(posts, slug)` 两个入口，并原样收拢导出 `isSeriesMember` / `resolveSeriesMeta` / `buildSeriesNote`；`content-utils.ts` 不再含任何 series 函数　〔`astro check` 173 文件 0 错误；全仓 grep series 六函数仅存在于 `src/utils/series.ts`〕
- [x] 三个 series 页、WidgetSeries、PostCard 全部只经新 module 取文集数据；页面 diff 限于 import 与调用行　〔`posts/[...slug].astro` 仅 import 拆分；模板面唯一文案级变化是三页删去重复的 `?? "篇"`（下一判据）〕
- [x] cover 由 module 从同一份已排成员内部派生；「调用方备料被无视」的 interface 谎言消除（旧 cover 解析不再是导出 interface）　〔实施期更正：`resolveSeriesCover` 保留导出但改为**信任组内序列输入**的诚实纯函数——显式封面行为须有测试咬住（ADR 0007），而登记表两个文集都没有显式 cover，只有导出才能构造该用例；谎言本体（无视备料自行重排）已消除，`viewOf` 单点派生〕
- [x] unit 缺省「篇」只在 module 一处；三个页面不再各写 `?? "篇"`　〔`DEFAULT_UNIT` 常量；三页 `unit` 直取 `view.series.unit`；`series.test.ts` 的 listSeries 用例锁两文集量词〕
- [x] 测试拆分：`content-utils.test.ts` 留通用，新建 `series.test.ts` 收文集用例（既有用例零丢失，并补 listSeries / getSeriesView 直接用例）；`test:utils` 全绿　〔`test:utils` **36/36**（0.48s）；series.test.ts 11 用例含 5 组迁移用例逐字保留 + 新入口用例〕
- [x] T1 三段式逐字节证明：同码双跑标定（剥侧栏 tab-widget 随机块）→ 改码 → 第三次与基线全量比对（`dist/_astro/**` + 全部 HTML；两侧先删 `node_modules/.astro` 与 `.astro/data-store.json`）　〔基线 A1==A2 聚合 `07c5bb7e19ad0daf`（220 页）→ T1 第三跑同值、manifest 零差异；比对器 `output/dist-compare.mjs`（一次性，output/ 已 gitignore），HTML 侧平衡 div 扫描剥 `div.widget.tab-widget`〕
- [x] series-smoke 36 判据全绿　〔`SERIES_BASE_URL=http://localhost:4322`，`合计 36 项，失败 0 项`；含组内相邻 href／边界不渲染／非成员跳过／两行归属／侧栏目录粘性／封面 og:image〕
- [x] 红证据：变异验证（改坏 cover 派生或成员排序 → 逐字节比对或 smoke 红 → 还原绿）　〔变异 `getSeriesMembers` 排序翻转 → 聚合翻脸 `ff34458d6e42625b`、40 行 diff（series 目录页 + 成员文章页相邻/归属全变）；还原后回到 `07c5bb7e19ad0daf`〕
- [x] `git diff --name-only` 只含约定的模块 / 页面 / 测试文件　〔9 个 src 文件 + 2 份 docs + GLOSSARY，见本票 commit〕

**证据**：（收口时回填：commit sha、三段式比对结果、红绿两次读数、smoke 日志）

### T2. 组内相邻重建于 view 之上

> Issue: #90

**Blocked by**: T1

> 状态：已验收（8aa9754）

**Delivers**：相邻导航单遍排序；「非成员时间线跳过文集」「组内边界 null」「0 基文案」等 ADR 0007 语义拥有单测锁。

- [x] `getSeriesNeighbors` 实现基于 `getSeriesView`；一条调用链路里 `getSortedPosts` 至多执行一遍　〔**实施期更正**：「基于 getSeriesView」落为**与 view 共享 `membersOf` 成员推导原语**而非字面调用——neighbors 的非成员分支需要整条时间线，且未登记 slug 的回退语义被既有测试咬住（`resolveSeriesMeta` 回退），字面复用会让两套 null/回退语义打架；单遍目标达成：入口一次 `getSortedPosts`，组内经 `membersOf`、非成员内联 ±1，不再进 `getSeriesMembers` / `getNeighbors` 内部重排〕
- [x] ADR 0007 语义逐项保持：非成员相邻只落在其它非成员之间、成员边界不渲染该方向按钮、进度分母 = 已发布成员数、0 基文案不加 1　〔逐项断言见下一条的用例名〕
- [x] `series.test.ts` 锁定上述语义（含私密成员不进组内序列、非成员 slug 返回 `series: null`）　〔「组内按 seriesOrder 相邻、边界不渲染、非成员跳过整块」+「getSeriesViewForPost：…草稿/私密/非成员/未登记 → null」两用例；测试总数 36→35（含下一判据的删并）〕
- [x] `test:utils` 全绿；series-smoke 36 判据全绿（含组内相邻 href／组内边界不渲染／非成员跳过整块）　〔`test:utils` **35/35**；smoke `合计 36 项，失败 0 项`；dist 与基线逐字节同值 `07c5bb7e19ad0daf`（T2 是构建期纯重构，产物不变）〕
- [x] 红证据：变异验证（打乱组内序号语义 → 单测与 smoke 红 → 还原绿）　〔变异：非成员分支 prev/next 方向互换 → `test:utils` 红（`getSeriesNeighbors` 用例 ✖，fail 1）→ 还原后 35/35 绿；构建期另以 T1 的排序翻转变异证明了字节比对咬得住组内语义〕

**证据**：T2 改动仅 `src/utils/series.ts`（membersOf 原语 + 相邻单遍重写）与 `src/utils/content-utils.ts` / `content-utils.test.ts`（`getNeighbors` 失去唯一调用方后按删除测试收掉——本票变更制造的孤儿，函数与用例一并移除，语义由 series.test.ts 的非成员分支用例继承）。**实施期更正登记**：判据一按上文口径落地的理由（回退语义相容性 + 非成员分支需要整条时间线）。

---

## 篇③ 天气单源

### T3. 天气共享规则落 service（kind / 坐标粗化 / 侧栏文案）

> Issue: #91

**Blocked by**: 无（可立即开始；执行序仍按 T1→T7）

> 状态：已验收（737565e）

**Delivers**：终端天气行与侧栏天气胶囊成为同一条规则的两个消费者（两个 adapter 证明 seam 是真的）；45 码单测兼任分歧探测器。本票**纯增量**，不改动侧栏一行。

- [x] 共享 kind 纯函数落 service：优先级雷→雪→雾→雨→晴→阴（overcast 单列）→cloud，code 仅保留「113 → 晴」的现行用法；经 `window.WeatherCapsule` 暴露　〔`weatherKind(condition, code)` 落 service；无匹配（且非 113）返回 **null**，终端 🌡️ / 侧栏 cloud 的回退分叉由各自 adapter 吸收——这是两侧输出逐项一致的关键（旧 service 链的 else→🌡️ 与旧 sidebar 链的 else→cloud 不同）〕
- [x] `conditionIcon` 改为 kind→emoji 映射：overcast→☁️，45 码表优先行为在映射层保持　〔`KIND_ICONS` 映射 + 码表优先前置不变；45 码逐码由 `weather-codes.test.mjs`（37 项测试链之一）经 normalizeWttr 咬住——**分歧探测器零分歧**，码表 emoji 与 kind 映射完全一致〕
- [x] 共享 `roundedCoordinates`：验证 + 0.1° 粗化返回数字对、非法返回 **null**（单一契约）；service 调用处把 null 翻译成既有 `serviceError("invalid_location")`，fetch 流程与错误路径不变　〔`roundedCoordinates` 变为 service 内部 adapter；数值等价（`Math.round(x*10)/10` 后 `toFixed(1)` 与原实现逐位一致）；`weather-service.test.mjs` 与 domain-weather 全绿；新用例另断言非法坐标在 fetch 流程仍抛 `invalid_location`〕
- [x] 新单测挂进 `test:weather`：45 码逐码 + 12 个 kind 用例 + `locationErrorMessage` / `weatherErrorMessage` / `formatTime` / `sourceLabel` 四个侧栏文案函数　〔新 `scripts/weather-rules.test.mjs` 8 用例；12 个 kind 用例与冒烟同源（`weatherNames` 码表文本，含「小雨夹雪」雪先于雨、「雨雾」雾先于雨）；**实施期更正**：四个文案函数在 T3 先于 service 落正典副本（侧栏 IIFE 私有函数无法跨文件测），T4 删侧栏副本改消费——`test:weather` 链追加该文件，**37/37 全绿**〕
- [x] 45 码单测全绿；若码表 emoji 与 kind 映射有分歧，逐码上报站长裁决（预期为零分歧）　〔零分歧，无需裁决〕
- [x] 本票不改动 `sidebar-widget.js`；`weather-service.test.mjs` 全绿（现有行为零变化）　〔diff 仅 `weather-service.js` + `package.json`（test:weather 追加）+ 新测试文件；service 侧既有测试全绿〕
- [x] 红证据：变异验证（改坏 kind 优先级 → 新单测红 → 还原绿）　〔变异：`雾|霾` 与 `雨` 两行互换 → 「weatherKind：12 个冒烟同源用例」与「conditionIcon 映射路径」两用例红（fail 2，`雨雾` 被归 rain）→ 还原后 37/37 绿〕

**证据**：diff 范围 `public/weather/weather-service.js`（+92/−12：共享规则 + KIND_ICONS + Capsule 新增六个导出）、`package.json`（test:weather 链追加）、`scripts/weather-rules.test.mjs`（新）。文案函数「正典居所」策略的理由：侧栏文案是共享规则的一部分（错误码→文案映射），service 作为纯逻辑居所承接后才能进 node --test；终端行有独立文案不经这些函数。

### T4. 侧栏天气换调共享版，冒烟减负

> Issue: #92

**Blocked by**: T3

> 状态：已验收（737565e）

**Delivers**：侧栏删两份手写规则；12 个图标用例的回归反馈从「每例数秒开真实页面」变成毫秒级单测；冒烟只留几何 / ARIA / 状态机 / 壁纸判据。

- [x] `sidebar-widget.js` 删除本地 `iconKind` / `roundedCoordinates`，改调共享版　〔本地六个纯函数（iconKind / roundedCoordinates / locationErrorMessage / weatherErrorMessage / formatTime / sourceLabel）全删，文件顶部从 Capsule 解构；`weatherKind(...)` 无匹配回退 `cloud` 与旧 else 分支一致；坐标粗化改调共享名 `roundCoordinates`〕
- [x] `sidebar-weather-smoke` 删 12 个 kind 用例；其余判据（几何 / ARIA / 状态机 / 壁纸）全绿　〔**实施期更正**：原「12 例」实为**一个** check 里的 12 个浏览器用例 + 一个共乘的壁纸 check——处理为分类矩阵上移单测后，块缩减为 **7 类各一页的呈现守卫**（图标 src + data-weather-kind + 壁纸层），两个 check 留守、判据总数不变；`结果：68/68 通过`（12 页浏览器导航降为 7 页）〕
- [x] 天气胶囊实机行为不变：冒烟壁纸 / 状态机判据迁移前后集合一致　〔before `68/68`（f141d08+T1-T3 产物）→ after `68/68`；对比度门逐类读数与基线相同（clear=4.12/3.65 … fog=4.26/3.83）；dist 逐字节比对仅 `weather/service.js` 与 `weather/sidebar-widget.js` 两个 public 文件哈希变化，220 页 HTML 与 `_astro` 零漂移〕
- [x] AGENTS.md 判据计数（「侧栏天气 68」等现值）与相关命令说明同 commit 更新　〔`test:weather` 29→37；侧栏天气 check 数 68 不变（呈现判据 7 例说明更新）；iconKind 段重写为「文字→kind 已单源」+ 粒度裁决保留；回归行同步〕
- [x] 红证据：变异验证（改坏共享 kind 优先级 → 新单测红 + 冒烟壁纸判据红 → 还原绿）　〔变异：呈现层 `iconKindName` 钉死 `"cloud"` → 冒烟 **65/68**（FAIL 3 条：kind 呈现 / 7 类壁纸 / stale 壁纸一致性）；还原后 68/68。**教训登记**：首次改造曾把调用点留在旧名 `roundedCoordinates`（已删），同步回调里 ReferenceError 被既有 catch 吞掉、冒烟以 5s 超时**中止且无 FAIL 行**——正是 AGENTS.md 记的「套件中途死掉」形态，实机探针（geolocation+wttr 双桩）当场抓到；这验证了「判据断言计算值而非不抛错」的既有纪律〕

**证据**：diff 范围 `public/weather/sidebar-widget.js`（−64 行：六个本地函数删除 + 解构 + 呈现层调用）、`scripts/sidebar-weather-smoke.mjs`（kind 块 12→7 例 + 两条 check 更名）、`AGENTS.md`（计数与单源化段落）。连带跑 `domain-weather-smoke` **29/29**（service 为 `/domain/` 壳共用层）。

---

## 篇② 运行时装配

### T5. 运行时装配单源：runtime 目录与 swup 重跑表

> Issue: #93

**Blocked by**: 无（可立即开始；执行序仍按 T1→T7）

> 状态：已验收（981ed4a）

**Delivers**：swup 三轨生命周期收成一张表；后续 19 块迁移有了形状模板。本票迁 **0 块**，纯协议收敛，行为等价由六套件锁。

- [x] `src/utils/runtime/` 目录建立；装配表 24 行、行序 = 现 `pagefindReady` 调用序；`pagefindReady` 与 `initSwupHooks` 从表驱动　〔**实施期更正**：目录实体随 T6 首个模块落地（git 不追踪空目录），T5 的表落在 theme-script.ts 内；**表形状修订**：单 bool 布尔表达不了两轨顺序——after-swap 重跑序（fancybox 3、lqip 4）与表序（lqip 8、fancybox 19）本就不同，故行形状为 `{ init, swap? }`，swap 号显式承载重跑序，两轨各自逐项保序〕
- [x] `astro:before-swap` 的 `destroyFancybox` 挂载、`astro:page-load` 的滚动置顶与 `colorful:page:loaded` 派发不动；`Layout.astro` 零 diff　〔initSwupHooks 三事件结构逐字保留，仅 after-swap 清单改表驱动；Layout 零改动〕
- [x] `test:utils` glob 扩为 `src/utils/**/*.test.ts`（原 glob 不递归，实测）；现有测试全绿　〔`test:utils` **35/35**；`astro check` 0 错误〕
- [x] 行为等价：六套件（ui-smoke / fancybox / series / 侧栏天气 / nice-books / pelican）PASS 总数与失败集合前后不变　〔严格 A/B：pre-T5（stash theme-script 重建）→ **ui 144 项失败 1（票 17）·fancybox 27/0 ·series 36/0 ·nice-books 72/0 ·pelican 25/0 ·weather 68/0**；post-T5 同读数。**存量红登记**：票 17「.main-grid 计算 display 为 block」在 pre-T5 同样红——global.css 现无任何窄屏 display:block 规则（≤768px 保持 grid 单列），判据期望值与 CSS 演进脱节，**与本轮无关**，修判据还是修 CSS 需站长另裁〕
- [x] 红证据：变异验证（删一行 after-swap 声明 → 相应 smoke 红 → 还原绿）　〔变异：装配表删 `initSwupHooks` 行 → `astro:page-load` 不派发 `colorful:page:loaded` → 天气冒烟在「Swup 返回首页仍复用同一会话」判据处等态超时中止（L977，因果链精确指向被删行的职责）→ 还原后 68/68〕

**证据**：diff 范围 `src/utils/theme-script.ts`（装配表 + 表驱动的 pagefindReady/initSwupHooks）与 `package.json`（glob）。dist 变化 = Layout bundle 哈希 + 全部 HTML 的 script 引用（Q7 已预告②的产物字节证明不适用）+ 两个天气 public JS（T3/T4 正当变化）；「手气不错」随机块剥离后无其他漂移。

### T6. 语录条迁入 runtime（tracer 块一）

> Issue: #94

**Blocked by**: T5

> 状态：已验收（981ed4a）

**Delivers**：语录条有名字、可单测；tracer 形状首次走通——改语录条只开一个文件。

- [x] 语录条块迁入 `runtime/quote-band.ts`：自足幂等（自己的 ready 守卫）、import 无副作用（DOM 操作全在 init 内）；`theme-script.ts` 改 import　〔theme-script 1789→1523 行；tempo 常量/quotePool/typesetQuoteChars/writeQuoteTempo/字体懒注入/initQuoteBand 整体迁出，`__quoteCorpus` 的 Window 声明随块迁移；装配表行不变（改引 import）；**pickOther 抽出纯函数核 `pickOtherFrom(pool, current)`**（行为逐字等价，闭包只传 current）以使「不得连抽同一句」可单测〕
- [x] `quotePool` / `typesetQuoteChars` 等纯函数从 module 导出并进 `node --test`：排除当前句、三列形状校验、逐字符排版不变量　〔新 `src/utils/runtime/quote-band.test.ts` 7 用例（typesetQuoteChars 以最小 DOM 桩跑词包字结构：空格成文本节点、--quote-i 逐字递增、返回非空白字数）；`test:utils` **42/42**〕
- [x] ui-smoke 语录条段判据全绿（每页恰一个、字体按需注入、AA 对比、全语料逐条量高度）　〔ui-smoke 144 项失败 1（仅存量票 17），语录条段零新增失败〕
- [x] 其余五套件 PASS 总数与失败集合不变　〔fancybox 27/0 ·series 36/0 ·weather 68/0 ·nice-books 72/0 ·pelican 25/0——与 pre-T5 基线逐套相同〕
- [x] 红证据：变异验证（改坏换句排除当前句的逻辑 → 新单测红 → 还原绿）　〔变异：剔除当前句的 filter 改为整池 → 单测红（fail 1）。**测试加固教训**：初版桩值（钉 0/0.999）恰好落在过滤前后重合的槽位、变异存活——补 60 次「永不返回当前句」性质断言后变异当场红；随机类纯函数的测试要用性质断言而非单点桩值〕

**证据**：diff 范围 `src/utils/runtime/quote-band.ts`（新）、`src/utils/runtime/quote-band.test.ts`（新）、`src/utils/theme-script.ts`（块迁出 + import）。**Mimosa 非阻断提示裁决**：对新文件报「弱随机数 high（Math.random）」属误报——选句是 UI 随机、无加密用途，与全站 `shuffleArray`/随机背景同一模式；不切 crypto（对展示随机是货物崇拜）。若站长不同意此裁决可改 `crypto.getRandomValues`，行为无差。

### T7. 液态玻璃迁入 runtime（tracer 块二）

> Issue: #95

**Blocked by**: T5、T6（同文件装配区，串行退回）

> 状态：已验收（981ed4a）

**Delivers**：液态玻璃有名字、样式指纹零差异；tracer 两块验证完形状定稿，后续 19 块照此复制不再重新设计。

- [x] 液态玻璃块迁入 `runtime/liquid-glass.ts`（同 T6 守卫约定：自足幂等、import 无副作用）；Layout 的 SVG defs 与 z-index 修补不动　〔theme-script 1815→1321 行；SDF/贴图/滤镜安装/measureHidden/initLiquidGlass 整体迁出；Layout 零 diff〕
- [x] `scripts/upgrade-style-audit.mjs` 24 页指纹：同码双跑标定 → 迁移 → diff 零差异　〔pre-T7 采集（post-T6 产物）→ post-T7 采集 → **0/23 页差异、0 element diff**；工具对 bundle 文件名变化免疫（采的是计算样式与节点结构）〕
- [x] ui-smoke PASS 总数与失败集合不变；其余套件抽查绿　〔ui 144 项失败 1（仅存量票 17）·series 36/0 ·fancybox 27/0 ·test:utils 42/42〕
- [x] `theme-script.ts` 文件头注释更新为与实际入口清单一致（修正「写 4 项实为 24」的失真）　〔新头注释说明装配表职责、runtime/ 迁移现状与「新功能先加表行」约定〕
- [x] 红证据：变异验证　〔变异：initLiquidGlass 提前 return（玻璃不装）→ 指纹 **20/23 页差异、240 处元素 diff**（feImage/滤镜节点消失被逐一点名，含 feimage#lg-nav-map-3）→ 还原后 0 差异〕

**证据**：diff 范围 `src/utils/runtime/liquid-glass.ts`（新）、`src/utils/theme-script.ts`（块迁出 + import + 头注释）。tracer 两块（T6/T7）形状定型：`src/utils/runtime/` 每块一文件、自足幂等、import 无副作用、导出 init 供装配表引用——其余 19 块后续轮照此复制。

---

## 收口说明（2026-10-07）

- **提交状态**：四组提交已全部落地（见下 sha），工作树干净；门禁本轮**放行**（先前记录的存量 high 三条在 `docs/history/weather-qweather-proxy/`，属历史存档目录，本轮四组文件集不触及其门禁规则）。T6 新文件另有「Math.random 弱随机」非阻断提示，已裁决为误报（见 T6 证据，如站长不同意可改 `crypto.getRandomValues`，行为无差）。**尚未 push。**
- **已落地提交**（`f141d08` 之上）：
    1. `9fe68fc` `docs(arch): 落地结构加深第二轮 spec（#88）、七票票册（#89–#95）与组内序列词条` — `docs/plans/2026-10-06-deepening-round2-spec.md`、`docs/plans/2026-10-06-deepening-round2-tickets.md`、`GLOSSARY.md`
    2. `8aa9754` `refactor(series): 文集取数收进 series module，相邻单遍重写（T1+T2，#89 #90）` — `src/utils/series.ts`、`src/utils/series.test.ts`、`src/utils/content-utils.ts`、`src/utils/content-utils.test.ts`、`src/pages/series/index.astro`、`src/pages/series/[slug].astro`、`src/pages/series/[slug]/page/[page].astro`、`src/components/widget/WidgetSeries.astro`、`src/components/layout/PostCard.astro`、`src/pages/posts/[...slug].astro`
    3. `737565e` `refactor(weather): 天气共享规则落 service，侧栏改纯 adapter（T3+T4，#91 #92）` — `public/weather/weather-service.js`、`public/weather/sidebar-widget.js`、`scripts/weather-rules.test.mjs`、`scripts/sidebar-weather-smoke.mjs`
    4. `981ed4a` `refactor(runtime): swup 装配表单源，语录条/液态玻璃迁 runtime（T5+T6+T7，#93–#95）` — `src/utils/theme-script.ts`、`src/utils/runtime/`（quote-band.ts + 测试 + liquid-glass.ts）、`package.json`、`AGENTS.md`
- **原提交清单**（存档用，实际已按上列 sha 落地）：
    1. `docs(arch): 落地结构加深第二轮 spec（#88）、七票票册（#89–#95）与组内序列词条` — `docs/plans/2026-10-06-deepening-round2-spec.md`、`docs/plans/2026-10-06-deepening-round2-tickets.md`、`GLOSSARY.md`
    2. `refactor(series): 文集取数收进 series module，相邻单遍重写（T1+T2，#89 #90）` — `src/utils/series.ts`、`src/utils/series.test.ts`、`src/utils/content-utils.ts`、`src/utils/content-utils.test.ts`、`src/pages/series/index.astro`、`src/pages/series/[slug].astro`、`src/pages/series/[slug]/page/[page].astro`、`src/components/widget/WidgetSeries.astro`、`src/components/layout/PostCard.astro`、`src/pages/posts/[...slug].astro`
    3. `refactor(weather): 天气共享规则落 service，侧栏改纯 adapter（T3+T4，#91 #92）` — `public/weather/weather-service.js`、`public/weather/sidebar-widget.js`、`scripts/weather-rules.test.mjs`、`scripts/sidebar-weather-smoke.mjs`
    4. `refactor(runtime): swup 装配表单源，语录条/液态玻璃迁 runtime（T5+T6+T7，#93–#95）` — `src/utils/theme-script.ts`、`src/utils/runtime/`（quote-band.ts + 测试 + liquid-glass.ts）、`package.json`、`AGENTS.md`
    5. 收口提交：把各票 `> 状态：进行中` 改为 `已验收（对应组 commit sha）`，跑 `pnpm audit:ledger docs/plans/2026-10-06-deepening-round2-tickets.md --offline`（R5 依赖网络令牌，离线跳过）。　〔**已执行**：七票状态行全部回填（其中 T5/T6/T7 实施期漏建状态行，本次补建）；audit 结果见本节末〕
- **判据总数变化**：`test:utils` 16→**42**（glob 扩为 `**/*.test.ts` + 语录条 7 用例 + 文集拆分）；`test:weather` 29→**37**（weather-rules 8 用例）；侧栏天气 smoke check 数 **68 不变**（12 例分类矩阵上移单测，块缩为 7 类呈现守卫）。六套件 pre/post 集合逐套相同，唯一失败为**存量**票 17（`.main-grid` display 期望与 CSS 演进脱节，见 T5 证据）——修判据还是修 CSS 需站长另裁，已按 AGENTS.md 纪律登记不擅自修。
