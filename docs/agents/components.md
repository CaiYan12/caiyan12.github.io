# 站点组件与客户端脚本约定

> 客户端脚本与 Swup 生命周期、侧栏「最新评论」交互、Pio 看板娘、Nice Books 每日好书、表情与统计边界、工具函数清单。**动这些组件或写客户端脚本时读对应那节**。

（本文由 `AGENTS.md` 的「站点组件与客户端脚本约定」一节迁出；内容逐字保留。）

## 客户端脚本与 Swup 生命周期

- `src/utils/theme-script.ts` 已收薄为装配表、生命周期声明与 page-load 辅助三件：功能块按关注面分文件置于 `src/utils/runtime/`
- **Swup 重初始化协议（2026-09-06 审查后统一，新增客户端代码必须遵守）**：`main` Swup 容器内的组件统一监听自定义事件 `colorful:page:loaded`（切换后重跑）并配 `dataset` 守卫防重复初始化（如 Slideshow 的 `data-initialized`）；`main` 容器外的布局级组件（导航/移动菜单/返回顶部/背景）只随 `pagefindReady()` 初始化一次，靠 `*Bound` 旗帜或 dataset 守卫防重入，勿自行监听 `astro:*` 原生事件——容器外布局级确需 before-swap 清理（如 Fancybox destroy）才允许直接听 `astro:*`。历史上四轨并存（_Bound 委托/dataset 守卫/自定义事件/内联 astro:_），新代码不得新增第四种形态；theme-script 按"唯一协议 + 多 init 函数"保持单文件，按关注面拆分已于 2026-10-29 完成，见规格 #115
- **Swup 切换页面时组件脚本不会重跑**，所以需要重绑定的东西（Fancybox、导航高亮）都注册在 `initSwupHooks()` 里监听的 `astro:before-swap`/`astro:after-swap`/`astro:page-load` 事件中（swup/astro 把 swup 自身的换页 hook 转译成这组 `astro:*` 事件）；新增交互若依赖新页面 DOM，必须加到这三个事件里
- **`updateHead` 按环境分叉（`astro.config.mjs`，2026-09-20）**：dev 传 `{ persistAssets: true }`、生产保持 `true`。Vite 在 dev 下把懒加载的第三方 CSS（fancybox、katex）以运行时注入的 `<style>` 挂进 head，swup 的 head 同步按"新页面没有此节点"把它删掉，而模块已在 Vite 图里、不会再注入一次，于是客户端切页后灯箱与公式失去样式（灯箱容器从视口尺寸塌成文档高度，首页→文章→点图必现）。**勿改成 `updateHead: false`**（会连带停掉 title/meta 同步），**也不要把 `persistAssets` 带进生产**——生产各页 CSS 是独立 `<link>`，必须照常增删以免跨页样式泄漏。dev 判定用 `process.argv` 含 `dev`（Astro 6 的 `defineConfig` 只接受对象，无 `({ command })` 函数形态）。
- **SwupScriptsPlugin 重建的是整个 document 的 script，不只 swup 容器**（`reloadScripts` 默认 true，scope 为 `head`+`body`）：常驻容器外的第三方经典脚本每次切页都会被 `replaceWith` 重新执行——myhkw 播放器的 `jquery.min.js` 与 `/api/player/` 因此抛 `明月浩空音乐播放器已加载，禁止重复添加！`。这类"元素在容器外、本就不必重跑"的脚本必须显式标 `data-swup-ignore-script`（插件选择器 `script:not([data-swup-ignore-script])`），`Layout.astro` 的两个播放器脚本已加；勿凭"它在 `main` 之外"推断不会被重跑。
- 导航高亮 `syncNavHighlight()`：逐锚点 toggle 时**跳过 `javascript:void(0)` 锚点**（下拉父项按钮，永不匹配），下拉父项与 MMenu 分组的 current 由其子链接 `some()` 统一计算——直接加载（`pagefindReady`）与 `astro:after-swap`（Swup 不替换 `main` 外的导航）都会重算；勿回退为逐锚点裸 toggle，否则构建期写入的下拉父项 current 每次加载都会被抹掉。路由前缀匹配连带效果：/tag/xxx/ 与 /category/xxx/ 页上"文章归档"下拉及"标签分类"/"文章分类"子项呈 current（语义正确，保留）
- 头部微言轮播（`#header .text`，2026-09-05 重写）：机制复刻原版 AutoScroll（limh.me `global-pjax.js`）——`src/utils/runtime/header-ticker.ts` 的 `initHeaderTicker()` 每 4s 将 ul 上滚一条（0.8s ease），`transitionend` 后把首条 li 移到末尾实现无限轮转（无克隆条，任意条数无缝，条数取 `diary.slice(0, 4)`），hover 暂停、移出恢复，`prefers-reduced-motion` 不启动，dataset 守卫防定时器叠加（原版 pjax 重复加载会叠加，勿学）。**节奏 4s/条 = 停留 3.2s + 滑动 0.8s 对齐迁移前 CSS 关键帧版手感，勿改回原版 300ms**（2026-09-05 用户确认）；步长 `-24px` 与 global.css `#header .text li` 行高耦合，改行高须同步。头部在 Swup 容器外，随 `pagefindReady()` 初始化一次即可，勿加进 after-swap hook。**实现只有这一条**：主容器文本块 `#header .text` + `initHeaderTicker()`。曾并存的 CSS-only 死块 `.header-ticker` + `@keyframes ticker-scroll`（含窄屏副本）从未被任何标记或脚本引用，已于 2026-09-22 删除——不要再把它当「缺 `prefers-reduced-motion` 配对的活跃动画」上报
- **微言轮播链接「无悬停视觉反馈」是既定设计（2026-09-23 裁决，勿重开）**：`#header .text a{color:#fff}`（`src/styles/global.css`，选择器锚点，行号约 1957）以 id 特异性 (1,1,1) 压掉通用 `a:hover{color:var(--colorful-green)}`（约 1770 行，(0,1,1)），且 `#header .text` 全族没有任何 `:hover` 的 `text-decoration` 规则，于是头部那 4 条 `<a href="/diary/">` 悬停时**既不变色也不出线**。站长判定**保持无反馈**：不要补下划线、不要换色、不要给它加 `::after` 线条（补它属于新增视觉行为，须重新过裁决）。**这条 id 规则是承重结构**——删它或降它的特异性等于悄悄给头部开启绿色 hover，动通用 `a:hover` 前必须先想清楚这点。两件事**不在**本次「无 hover」的范围内、也不得顺手删除：hover 暂停滚动（`initHeaderTicker()`，纯 JS 行为）与 `:focus-visible` 描边（键盘可达性）。回归由缝隙 A 承担（`pnpm smoke:ui` 用 `hoverProbe()` 取静息/悬停计算值，断言 `color` 与 `text-decoration-line` 差值为零）——**缝隙 B 的采集排除表显式含 `#header .text` 整族，对它必然零漂移，不能当验过了**；该判据属「锁现状」型，落地即绿，其红证据由变异验证提供。
- 键盘 skip link（"跳到正文"）必须是 `Layout.astro` body 的首元素且在 Swup 容器（`main`）之外，否则切页后丢失；`.skip-link` 默认 `translateY(-200%)` 视觉隐藏、`:focus-visible` 归位显示，目标 `href="#main"`
- 生产 console 清理在 `astro.config.mjs` 的 vite `esbuild` 段（`drop: ["debugger"]`、`pure: ["console.log", "console.debug"]`）；`console.warn/error` 保留供线上排错，勿移除该配置；mermaid cynefin chunk 内 2 处残留为第三方压缩代码，已知且接受
- 页面内 `<script>` 若含 `{...}` 模板插值必须加 `is:inline`（否则 Astro 当 TS 模块处理会解析失败）

### 侧栏“最新评论”换一批交互硬约束

- “换一批”必须提供可感知的加载状态：切换期间显示加载图标动画与“加载中…”文案，设置 `aria-busy="true"` 并禁用按钮，防止重复点击。
- 切换完成、异常或空数据时必须恢复默认图标/文案、`aria-busy="false"` 与可用状态；不得让按钮永久停留在加载中。
- 加载动画仅作用于“换一批”操作图标，必须遵守 `prefers-reduced-motion: reduce`；不得恢复最新评论头像的旋转效果。
- “换一批”只能操作构建期嵌入的评论数据，客户端不得新增 GitHub/Giscus 请求或其他评论数据依赖。

### Pio 看板娘（public/pio/static/）

- `pio.js` / `pio.css` 为 vendored 第三方代码但随本项目自维护（无上游升级管道），可直接修改；入口组件是 `src/components/widget/Pio.svelte`，文案与“关于我”链接配置在 `src/config.ts` 的 `pioConfig`。
- 操作按钮列固定顺序 `home → info → side（停靠切换）→ close`；左/右停靠通过容器 `.left`/`.right` 类驱动，偏好存 `localStorage.pioSide`；折叠状态存 `localStorage.posterGirl`，**默认折叠**（仅 `=== "1"` 时展开）。新增按钮必须用 `appendChild` 按顺序追加，不得用 `insertBefore` 引用尚未入 DOM 的节点。
- 右侧停靠时所有元素必须对称适配：按钮列（`.pio-action`）、折叠按钮（`.pio-show`，含 hover 方向与“点击召唤Pio”提示方向）、消息框（`.pio-dialog`）。消息框居中 + 底部三角，`max-width: 100%` + `width: max-content` 防止长消息溢出视口。
- pio 定位样式在 `pio.css`（`public/` 静态文件，不走构建管线），改动后需同步 `dist/` 才能在 preview 验证；**`pnpm dev` 下 Pio 因 Svelte hydration 报错不渲染（仅 dev），验证 pio 必须用 `pnpm build && pnpm preview`**。
- myhkw 播放器以 `z-index` 压制 Pio（Layout.astro 内联样式）；Pio 的按钮/消息框位置调整需同时考虑播放器展开面板与底部歌词框的遮挡。

### Nice Books 每日好书（src/nice-books/ + src/pages/books/，2026-09-06 移植）

- **独立壳**模块（仿 ai-news 先例）：`/books/`（今日好书随机 + 换一换 + 站长推荐 + 探索更多）、`/books/archive/`（书库：六字段搜索 × 标签叠加 × 双视图 × 载入更多 × `?q=`/`?tag=` 直达）、`/books/:id/`（getStaticPaths **70** 静态页，与 `books.ts` 条目数一致 + 同架 top4；无效 id 自然落站级 404）。不加载博客 Layout/global.css/Pio/播放器；产品契约=访问级随机（禁日期映射）、无评论/评分/购买。
- 数据单一真相源 `src/nice-books/data/books.ts`（**70 条书目**，`id:`/`author:`/收尾 `},` 三向计数一致；早期 V1 fixture 为 01–22，其后逐批扩充，文档曾长期停在「22 本」——改动时一并核对文件头注释与 `/books/:id/` 的 getStaticPaths 页数 + 顶层运行时断言 fail-fast，build链头部 `pnpm test:nice-books` 把关）；查询函数纯函数化（`lib/random.ts` RNG 可注入、`lib/search.ts` 六字段、`lib/cover.ts` 确定性 SVG 书封兜底——`coverUrl` 非空走 `<img>`、onerror 由 shared 的捕获监听重建 SVG）。
- **SSR/客户端标记单源**：凡会被客户端 innerHTML 重渲染的片段（hero 卡/网格卡/便签/标签药丸/列表行）一律由 `lib/render.ts` 字符串构造器输出（.astro 侧 `set:html` 引用同一函数），禁止在 .astro 里另写一份标记。
- 样式：`styles/books.css` 是 books 页面唯一样式源（含 `@tailwind` 三指令 → 有 preflight）；2026-09-07 用户批准「私人藏书桌」设计升级，`docs/nice-books-design.md` 替代旧 handoff §5–§8 的固定视觉值。继续使用 `--nb-*` token、Tailwind v3 `nb.` 命名空间（勿与 ai-news 色板混淆），`font-nb-body` 映射正文思源黑体。网格 `<360px` 单列、`360–759px` 两列、`>=760px` 三列，同架图书 `>=1080px` 四列。**坑：Tailwind utility 的 display 会覆盖 `[hidden]` 属性**，books.css @layer base 的 `[hidden]{display:none!important}` 勿删。
- swup 协议（模块脚本）：顶层直接 init（首次整页加载）+ `document.addEventListener("astro:page-load", init)`（swup 导航进入时重跑）+ main 内 `dataset.nbInit` 守卫 + 目标元素缺失早退；document 级监听（archive 的「/」快捷键、封面 onerror）只在模块顶层注册一次。注意 `@swup/astro` 默认 `loadOnIdle`——swup 实例在页面空闲后才存在（`window.swup` 需等待），未就绪窗口内点击链接无害降级为整页加载。
- 两套 Playwright Smoke 的**计时与等待不能用固定毫秒数**（2026-09-20 线上实测教训）：`test:fancybox` 的放大两项原先点完死等 1500ms，远端 4608×3072 的原图还没解码，量出来「放大后仍等于适配态」，改为 `waitForFunction(complete && naturalHeight>0)` + 轮询到高度连续一致；`smoke:nice-books` 的「主书换书约 420ms」原先把计时起点放在 `page.click()` 之前，于是 Playwright 的可操作性等待与后续四次 `getAttribute` 往返全被算进动画窗口（本地约 +40ms、远端 +400ms 以上），改为在按钮的 capture 监听里打 `performance.now()` 戳、settle 后先在页面内取差值再做其它跨进程调用 —— 修好后本地读数 422ms，正对设计值 240+170=410ms。**但 `smoke:nice-books` 仍以本地 build+preview 为权威**：打线上时该项仍会到 ~996ms，而单独隔离测量线上换书只花 428–482ms 且期间零请求，差值来自该 smoke 自身在同一个 context 里开的一堆远端页面对主线程与网络的挤占，不是站点缺陷。
- books 全部页面 main 带 `data-pagefind-ignore="all"`（决策：博客全局搜索只搜正式文章，详情页也不进索引）；导航入口在 `navBarConfig.resourceSite`「每日好书」（`noSwup: true`，Navbar/MMenu 数据驱动自动渲染）；`pnpm smoke:nice-books` 覆盖三页业务、Swup 切页/后退/重复初始化与忙碌中断；`node scripts/nice-books-design-qa.mjs` 补充设计、响应式及故障检查（先 build + preview，默认4322端口）。实际项目数与截图见 `docs/nice-books-design-test.md`；字体 CDN 的网络层失败单独统计。
- 2026-09-07 书封展示：`lib/display.ts` 按 ID 确定四种原创 SVG 家族，未知 ID 回退文学；不往 `Book` 加展示字段。`coverHTML` 支持 `hero/card/list`，精选书主图和卡片带腰封，列表省略腰封，普通书裸封。封面硬壳最大、纸块内缩、右侧书口、左侧装订；外壳允许厚度和胶带外伸，图像内层独立裁切，真实图片 `object-contain`。腰封只引用现有荐语，禁止编造奖项或销量。
- 2026-09-07 动效生命周期：GSAP 按需用于 books 主书时间线，常规反馈用 CSS/WAAPI；两个今日换书入口共享全周期忙碌状态并在 finally 恢复。`shared.ts` 统一注册 `astro:before-swap` 清理，页面卸载取消请求/计时器/动画并 settle 未完成的换书 Promise。书库失败必须解除初始化守卫并显示重试；搜索输入不重播入场，标签/视图短过渡可中断。不要恢复额外240ms模拟等待或旧 Hero CSS 动画。

### 统计与表情边界

- 独立浏览量与 GoatCounter 已移除；frontmatter 的 `views` 仅作迁移兼容字段，不参与页面渲染。
- Giscus 表情只由文章页尾部的原生评论组件显示，不复制到首页卡片、文章头部或热门排序；吐槽数仍由 Giscus 同步结果驱动。
- 留言板顶层留言单独写入 `site-stats.json` 的 `guestbookComments`，不参与文章吐槽数与“最新评论”随机池；侧栏单条展示与“换一批”只消费构建期嵌入数据。

## 工具函数

`src/utils/content-utils.ts`：`getSortedPosts`（置顶+时间）、`getTagList`、`getCategoryList`、`getArchiveList`（YYYY年M月）、`getHotPosts`（hotness*100+comments 排序）、`getNeighbors`（前一篇/后一篇）、`getCover`（frontmatter image 兜底 hash 选 `public/images/random/tb1-40.jpg`）、`getSeriesMembers`（同 series 值按 seriesOrder 升序）、`getSeriesNeighbors`（组内相邻／非成员跳过整块，返回 prev/next/series）、`isSeriesMember`（只看 frontmatter 有无 series 属性）、`resolveSeriesMeta`（slug → name/unit/description，未登记回退 slug/篇）、`resolveSeriesCover`（显式 cover → 序号升序首位带 image 成员 → null）、`buildSeriesNote`（文章页两行提示文案，index 为 0 基）；另有 `src/utils/series-integrity.ts`（文集完整性四规则，由 /series/[slug].astro 的 getStaticPaths 调用并 throw）
