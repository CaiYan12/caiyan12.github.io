# 执行票册：文集（series）——同主题文章的封闭阅读序列

- 来源：`docs/plans/2026-10-06-collection-series-spec.md`（spec）／ 父规格 issue #76
- 已发布：本册 **10 张票 = issue #77–#86**，全部挂在 #76 下为 sub-issue，阻塞边为 tracker 原生链接；每张票标题下的 `> Issue: #NN` 即其镜像
- 证据登记册：本册各票的 **证据** 行；决策全文与 23 条已定默认值在 spec 文档与 issue #76
- 动工前边界：`b29183b` —— 本册、spec、ADR 0007、`AGENTS.md`、`GLOSSARY.md` 的落地提交（其父 `2baadc8` 即当时的 `origin/main`）。`feat/series` 集成分支在该提交之后建立；分支下除本行的边界更正外，没有先于票 01 的其它提交
- 上位决策：`docs/adr/0007-series-closed-reading-sequence.md`；`GLOSSARY.md` 的「文集 / 文集成员 / 非成员文章 / 文集目录 / 文集封面」五个词条；`AGENTS.md` 的「元件设计约束」与「文档写作约定」（锚点用「选择器 + 文件路径」，行号写「约」）
- 评审来源：2026-10-06 的 grilling 逐题裁决（五轮 + 三次追加事项），全文见 spec 文档的逐条裁决
- **硬约束（站长原话）**：「关于元件设计：最大化复用现有设计资产，若要求新元件，最大化复用现有设计风格与 taste」；「文集属性我偏好用 markdown 文章的 frontmatter 判定，若 frontmatter 内有文集属性，即判定属于某个文集」

## 本文件怎么用（checkbox 更新规则）

- 每张票的 `- [ ]` 是**验收判据**，不是待办清单：一条判据被真实观测到成立才勾，勾时必须能给出证据（命令输出、比对结果、红→绿两次读数）。
- 每张票开工时在其标题下追加一行 `> 状态：进行中 @日期`，完成时改为 `> 状态：已验收（commit sha）`。
- 任何一张票被退回，只回滚该票的 commit，不牵连同批其他票。
- 判据一律断言外部行为（计算值、链接 href、元素存在性、退出码、产物字节），**不断言 CSS 源文本或行号**。
- **每一票都要有红证据**：不接受「它本来就是绿的」（沿用 `#49` 立下的测试文化）。
- 套件总数**不用 `tail`** 读（`test:projects` 串两次 `node --test`）。
- **开册期本册自检必红是预期**：`scripts/ledger-audit.mjs` 的 R2 要求每票恰一条**终态**状态行，而开册期各票还没有状态行。收口时才跑 `pnpm audit:ledger docs/plans/2026-10-06-collection-series-tickets.md`。
- 本册**带文件路径**（仓库「文档写作约定」要求），而 GitHub 上的票正文**不带路径**（技能模板要求）；两者分工如此，不是漏写。

## 已确认参数（不再重议）

1. **文集是独立轴**，与标签、分类并列；归属只有 frontmatter 一处记录，元数据里**不放成员名单**。
2. **归属判据 = frontmatter 有没有 `series` 属性**；判定层不查登记表。写了未登记的标识是内容错误（校验报错），不是判定降级。
3. **组内顺序由 `seriesOrder` 决定**，不跟发布时间；`pinned` 不参与组内排序。
4. **非成员文章的导航跳过整个文集**（有意为之，不要「顺手修好」）；组内边界不渲染该方向的按钮。
5. **进度分母取已发布成员数**，不引入计划总章数。已知代价：每发一章，此前所有成员文章页上的分母都会变；站长明确接受。
6. **单归属**（`series: string`，非数组）；与 B 站专栏文集同约束（其开放平台接口原文「一篇文章只能属于一个文集」）。
7. **封面回退刻意不用 `getCover()`**（它的兜底是无关随机缩略图）。
8. **判定点各处自判**（侧栏读 URL、正文用页面变量），不加页面级 prop；零客户端脚本——侧栏在 swup 容器 `<main>` 内，换页自动重新求值。
9. **测试缝**：逻辑走**缝隙 B**（既有 `test:utils`，已在 `pnpm build` 链头）；接线新增一套**缝隙 A** 冒烟；不塞进既有 `smoke:ui`。
10. **一票一 commit**；全部完成后等站长同意再推送（推送触发 Pages 公开部署）。

## 基础与内容（01–03）

### 01. 文集字段与组内相邻（tracer）

> Issue: #77

**Blocked by**: 无（可立即开始）

**Delivers**：给两篇 Matt Pocock 文章写上文集属性与序号后，文章页左右按钮只在组内相邻；末篇该方向无按钮；不属于任何文集的文章，左右按钮跳过整组。

> 状态：已验收（`3e2ca54`）@2026-10-06

- [x] `src/utils/posts-schema.ts` 新建并从 `src/content.config.ts` 抽出 `postsSchema`；`content.config.ts` 改为 `schema: postsSchema`（`spec` 的 schema 留在原处）
- [x] `postsSchema` 增 `series: z.string().min(1).optional()` 与 `seriesOrder: z.number().int().nonnegative().optional()`
- [x] `src/utils/posts-schema.test.ts` 新建：`series` 接受 `"matt-pocock"`、**拒绝 `""`**、接受缺省；`seriesOrder` 接受 `0`、拒绝 `-1` 与 `1.5`、接受缺省。**不改 `scripts/test-hooks.mjs`**
- [x] `src/utils/content-utils.ts` 增 `isSeriesMember(post)`（只看属性）与 `getSeriesNeighbors(posts, slug)`（组内分组 + 非成员剔除后复用既有 `getNeighbors`）
- [x] `src/utils/content-utils.test.ts` 增用例：组内中间篇 / 首篇 `prev === null` / 末篇 `next === null` / 单篇文集两侧皆 `null` / 非成员跳过整块 / **两篇 `series` 值相同即互为相邻，即使该 slug 未登记**
- [x] `src/pages/posts/[...slug].astro` 约 `:48` 的 `getNeighbors(allPosts, post.id)` 换成 `getSeriesNeighbors(allPosts, post.id)`
- [x] `20260919135000` 加 `series: "matt-pocock"`、`seriesOrder: 0`；`20261006110122` 加 `series: "matt-pocock"`、`seriesOrder: 1`
- [x] 红证据：先改坏一条断言让 `pnpm test:utils` 翻红（记录输出），再还原
- [x] `pnpm test:utils` 与 `pnpm check` 全绿；`prettier --check ./src ./docs` 全绿

**证据**：commit `3e2ca54`。`pnpm test:utils` **20/20**。红证据：`posts-schema.test.ts` 的「series 拒绝空串」断言变异翻红（`expected: true / actual: false`，`# fail 1`）后回绿；独立评审另造两种等价变异（非成员分支不剔除 series／组内排序反向），各自命中不同断言翻红。

### 02. 文集目录页 + 本书回填

> Issue: #78

**Blocked by**: 01（#77）

**Delivers**：`/series/<slug>/` 按序号列出全部成员并可翻页；本书四章归入文集，旧标签被移除。

> 状态：已验收（`c0998a7`）@2026-10-06

- [x] `src/data/series.ts` 新建，导出 `seriesList`，两笔：`webapp-vibe-coding`（`name` 看懂 AI 写的网站，`unit` 章）与 `matt-pocock`（`name` Matt Pocock 技能选讲，`unit` 篇）
- [x] `src/utils/content-utils.ts` 增 `resolveSeriesMeta(slug)`，查不到时回退 `{ slug, name: slug, unit: "篇", description: "" }`
- [x] `src/components/layout/SeriesListing.astro` 新建，只引用 `ListingHeader` / `PostCard` / `Pagination`；**不碰** `TaxonomyListing.astro` 与 `TagPillCloud.astro`
- [x] 页头用 `ListingHeader`（`icon` / `title` / `crumbs`）；计数行沿用 `post-context`，写作「共 4 章」/「共 2 篇」
- [x] `src/pages/series/[slug].astro` 与 `src/pages/series/[slug]/page/[page].astro` 新建；分页沿用 `siteConfig.postsPerPage`
- [x] 两个路由不带 `data-no-swup`、`searchIndex` 缺省 `false`（与 `/tag/` `/category/` 一致）
- [x] 四章 frontmatter：`tags` 去掉 `看懂AI写的网站`；加 `series: "webapp-vibe-coding"` 与 `seriesOrder: 0..3`
- [x] `git grep "看懂AI写的网站"` 只应命中 frontmatter 中的文集值之外无残留；`/tag/看懂AI写的网站/` 不再生成
- [x] `pnpm check` 与 `pnpm build` 全绿

**证据**：commit `c0998a7`。绿证据：`pnpm build` **219 页** exit 0；`git grep "看懂AI写的网站"` 仅剩 docs 命中，`dist/tag/` 无该目录。红证据：摘掉第〇章 `series` 后重建，目录页计数行「共 4 章」→「共 3 章」。评审另用 `postsPerPage=1` 探针实证分页：`page/1`–`page/4` 生成、`page/5` 不存在（随后完整还原）。

### 03. 完整性校验

> Issue: #79

**Blocked by**: 02（#78）

**Delivers**：四类内容错误让构建当场失败并逐条指出文件与原因。

> 状态：已验收（`9085845`）@2026-10-06

- [x] `src/utils/series-integrity.ts` 新建：规则 1–3 为纯函数（入参全部文章 + `seriesList`，出参违规清单）
- [x] 规则 1：`series` 值必须能解析到 `seriesList` 一笔；规则 2：同一文集内 `seriesOrder` 不重复（分组按 `series` 值）；规则 3：带 `series` 必带 `seriesOrder`
- [x] 规则 4（读了 `cover` 就必须在 `public/` 下存在）放在调用侧，不进纯函数
- [x] `src/utils/series-integrity.test.ts` 新建：四条规则各一条违规用例 + 一条全合规用例
- [x] `src/pages/series/[slug].astro` 的 `getStaticPaths` 调用校验，违规时 `throw` 一条逐条清单错误
- [x] 渲染代码里**不存在**「未登记的 series 按非成员处理」这一分支
- [x] 红证据：造一条重复 `seriesOrder`，证明 `pnpm build` 失败并指名到文件；还原后 exit 0
- [x] `pnpm test:utils` 全绿

**证据**：commit `9085845`。`pnpm test:utils` **27/27**。红证据：把 `20261002081331` 的 `seriesOrder: 1→0` 造成组内重复 → `pnpm build` **exit 1** 且输出指名两篇文章（`20261002071103、20261002081331：series "webapp-vibe-coding" 内 seriesOrder 0 重复`）；还原后 exit 0。

## 页面（04–08）

### 04. 文集总览页与导航入口

> Issue: #80

**Blocked by**: 02（#78）

**Delivers**：导航栏进得去总览页，看到站内全部文集。

> 状态：已验收（`3bb3729`）@2026-10-06

- [x] `src/pages/series/index.astro` 新建，页头用 `ListingHeader`
- [x] 顺序 = `seriesList` 数组顺序（不需要 `getTagList` 那种并列名次兜底）
- [x] 每张卡的 DOM 语法照 `PostCard` 抄：根用 `.post-list`、左位用 `.post-thumbnail`（加 modifier 放到 240×135，≤680px 降 150×84）、右侧复用标题与 `.post-excerpt`、底部 `.goon` 文案改「进入目录 »」
- [x] 封面解析为 `null` 时左位不渲染，文字占满整行
- [x] `src/config.ts` 的 `navBarConfig.archiveSite`（约 `:57`）在「文章分类」之后插入 `{ name: "文章文集", url: "/series/" }`
- [x] 不带 `data-no-swup`；不进 Pagefind 索引
- [x] `pnpm check` 与 `pnpm build` 全绿

**证据**：commit `3bb3729`。`pnpm build` **220 页** exit 0（+1 即 `/series/`）。红证据两条：临时删导航项 → 产物中 `文章文集` 与 `href="/series/"` 命中 2→0；卡序反转让「共 4 章／共 2 篇」对调。**已记档偏差**：票面「`.post-thumbnail` 是 150×90」是错误前提，实测 160×120（外框 168×128）；总览卡 modifier 照票面字面值 240×135 实现，待站长目视裁决（票 10 清单）。**目视后改名（2026-10-06 站长指令）**：导航项「文章文集」改为「文集精选」，并同步总览页标题与面包屑、目录页面包屑共 5 处（`src/config.ts`、`src/pages/series/index.astro` ×3、`src/components/layout/SeriesListing.astro`）；冒烟不断言该文案，32 项判据不受影响。

### 05. 文章页的归属两行

> Issue: #81

**Blocked by**: 02（#78）、04（#80）

**Delivers**：文章页顶部与末尾各一行归属提示，末章改为收尾。

> 状态：已验收（`9d48187`）@2026-10-06

- [x] `src/pages/posts/[...slug].astro` 增顶部一行（`.post-metaa` 之下、正文之前）与末尾一行（`.cutline` 之下、`.post-navigation` 之上）
- [x] 视觉取 `.post-metaa` 的小灰字规格（12px + `var(--text-light)` + 链接 hover `var(--primary)`），**不带下边框**（上方已有 `1px dotted`）；新类只写字体与颜色，不引新 token
- [x] 进度写作「第 3 / 4 章」，量词取 `unit`，分母取已发布成员数
- [x] 顶部「目录」指向 `/series/<slug>/`；末章末尾行改为「《X》已读完 · 看其它文集」指向 `/series/`
- [x] 非成员文章不渲染任何一行
- [x] 窄屏（≤768px）顶部那行仍在（侧栏目录在窄屏隐藏）
- [x] `pnpm check` 与 `pnpm build` 全绿

**证据**：commit `9d48187`。`pnpm test:utils` **28/28**（新增 `buildSeriesNote` 纯函数进缝隙 B）。红证据：`index`→`index+1` 变异翻红（`expected '…第 3 / 4 章' / actual '…第 4 / 4 章'`）；产品级两处变异后 `pnpm build` **仍 exit 0**（构建成功但接线错），第三章读成「第 2 / 4 章」、公开非成员 `20260927082016` 冒出两行；还原后归零。

### 06. 侧栏章节目录

> Issue: #82

**Blocked by**: 02（#78）

**Delivers**：文章页侧栏的有序章节目录，当前章高亮，可跳组内任意篇。

> 状态：已验收（`d080186`）@2026-10-06

- [x] `src/components/widget/WidgetSeries.astro` 新建，**外框用 `WidgetLayout`**（`title` + `icon="fa-list-ol"`），本组件零外框样式
- [x] 在 `src/components/layout/SideBar.astro` 的 `widgetMap` 注册为 `series`；在 `src/config.ts` 的 `sidebarConfig.widgets` 排在 `"related"` **之前**
- [x] 组件自行从 URL 取当前文章（同 `WidgetRelatedPosts.astro` 的做法），只在文章页且该文属于文集时渲染
- [x] 按 `seriesOrder` 列出全部成员；当前章有 `.current` 高亮**且**存在消费它的样式（「当前页态」约定：算了就必须有人画）与 `aria-current`
- [x] 「查看目录」指向 `/series/<slug>/`
- [x] `pnpm check` 与 `pnpm build` 全绿

**证据**：commit `d080186`。红证据两条：注掉 `widgetMap` 的 `series` 注册 → 产物目录计数 1→0；撤掉 `.current` 消费样式 → CSS 规则消失而 HTML 仍带 `class="current"`（「算了但没人画」）。还原后回绿。站长 2026-10-06 目视后调整：series 移至侧栏末位并加 CSS 粘性跟随，覆盖票面「排在 related 之前」的定位；布局机制由浮体改为 grid（列宽逐像素等价，真实浏览器五宽度对比验证）。站长 2026-10-06 目视后再移除 `.current` 的绿色底边框（`border-bottom-color: var(--colorful-green)` 一条）——分割线回默认 `1px dashed #ccc`，文字的加粗与绿色高亮保留；该绿边框是本票加的，且末章因 `.widget li:last-child { border-bottom: none }` 本就不显示，前后行为不一致。站长 2026-10-06 目视后调整：「查看目录」由元件左下角移入标题栏 actions 槽（对齐「换一批」的图标/hover/指针），原 `series-toc-more` 块删除。

### 07. 文集封面

> Issue: #83

**Blocked by**: 02（#78）、04（#80）

**Delivers**：目录页顶部 260px 横幅、总览卡封面、两页 `og:image`；缺省回退到第一篇成员头图。

> 状态：已验收（`eba8892`）@2026-10-06

- [x] `src/utils/content-utils.ts` 增 `resolveSeriesCover(series, posts)` → `string | null`：显式 `cover` → 按 `seriesOrder` 升序取首位带 `image` 的成员 → `null`
- [x] **不调用 `getCover()`**；在代码注释里写明该偏离的理由
- [x] `SeriesListing` 顶部插封面（在 `ListingHeader` **之前**），复用 `.page .post-cover`（260px + 底部渐隐 + `object-fit: cover`）+ `ResponsiveImage` + `.lqip-placeholder`；窄屏同为 260px
- [x] 总览卡左位用同一张封面（240×135，≤680px 降 150×84）
- [x] 两页都把封面传给 `MainGridLayout` 的 `image`（`og:image`）；`null` 时不传，落回 `Layout.astro` 约 `:44` 的头像降级
- [x] `alt` / `title` 取 `series.name`；目录页 `loading="eager"`、总览卡 `lazy`；不进灯箱
- [x] 本次两本文集都不写 `cover`，都走回退（本书取 `webapp-vibe-coding-ch0-cover.jpg`，Matt 系列取 `matt-pocock-workflow-cover.jpg`）
- [x] 红证据：把一个文集临时指向 `public/images/series/<slug>.jpg` 的新图，确认 `pnpm build` 生成了它的 LQIP 与四档 WebP 变体（`src/constants/lqips.json` 与 `image-manifest.json` 有该键）
- [x] `pnpm check` 与 `pnpm build` 全绿

**证据**：commit `eba8892`。红证据：临时新建 `public/images/series/webapp-vibe-coding.jpg` 并给 `series.ts` 加 `cover` → `src/constants/lqips.json` 与 `image-manifest.json` 出现该键、`public/images/_variants/series/` 生成 480/720/1080/1440 四档 WebP；还原后两 JSON 零 diff。评审当场修掉一条真违规（初稿 101 行 diff 大半是无谓重排缩进，违反 Surgical Changes，改到 35 行）；后补 `page/[page].astro` 封面接线（`postsPerPage=1` 探针证明 page/2 有横幅与 og:image）。

### 08. 列表卡片徽章

> Issue: #84

**Blocked by**: 02（#78）

**Delivers**：首页／归档／分类／标签／热门的卡片标题前出现 `《文集名》`。

> 状态：已验收（`6818bc2`）@2026-10-06

- [x] `src/components/layout/PostCard.astro` 的 `h2` 内，在既有的 `置顶` / `近期更新` / `热门` label 序列（约 `:26-49`）之后追加一枚 `《文集名》`，沿用 `span.*-label` 结构
- [x] **不含章号**
- [x] 非成员文章不出现徽章
- [x] 卡片数量与 `.post-list:nth-child` 色带顺序不变（注意 `MainGridLayout` 那条「任何进入 `#content` 的前置兄弟节点都会让整排色带位移」的约束）
- [x] `pnpm check` 与 `pnpm build` 全绿

**证据**：commit `6818bc2`。红证据：把归属判断变异成恒真 → 首页 `series-label` 计数 6→10、非成员卡被污染出徽章；还原回 6。色带未位移由产物对照证明：parse5 读首页／archive／category／tag／hot 五类列表页，每张 `.post-list` 在其父下的 1-based 兄弟序号 `before == after` 逐页一致。

## 验收与交付（09–10）

### 09. 接线冒烟（缝隙 A）

> Issue: #85

**Blocked by**: 01（#77）、02（#78）、04（#80）、05（#81）、06（#82）、07（#83）、08（#84）

**Delivers**：把「页面有没有把算出来的导航接上」变成可跑判据。

> 状态：已验收（`e4bec91`）@2026-10-06

- [x] `scripts/series-smoke.mjs` 新建，复用 `scripts/lib/smoke-harness.mjs` 的 `makeHarness`，不重写 `check` / `finish`
- [x] 断言：成员页左右按钮 href 指向同文集相邻篇；首章无该方向按钮、末章无该方向按钮
- [x] 断言：顶部与末尾两行的在/不在；侧栏章节目录的在/不在
- [x] 断言：非成员文章页（用置顶那篇 `20260728000000`）不出现任何文集 UI
- [x] 断言：`/series/webapp-vibe-coding/`、`/series/matt-pocock/`、`/series/` 返回 200 且含封面
- [x] `package.json` 增 `smoke:series` 脚本；判据总数写死在脚本里，同批固定后不得增减
- [x] 红证据：临时把某章 `seriesOrder` 改重 → 断言翻红（记录输出）→ 还原后全绿
- [x] 不修改 `scripts/ui-smoke.mjs`（其 121 项判据被 `#49` 票册当基线引用过）

**证据**：commit `e4bec91`。`pnpm smoke:series` 读数**合计 32 项，失败 0 项**（`EXPECTED_CHECKS = 32` 写死，自守卫在数不符时以退出码 2 拒绝）。红证据：第〇章 `seriesOrder: 0→4`（组内仍唯一、不触发票 03 校验，故以错位变异而非票面所写「改重」来咬住顺序接线）→ **12 条判据翻红**，含「封面回退从 ch0 移到 ch1」（证明回退真按「序号升序取首位带 image 的成员」实现）；还原后复绿 32/0。**票面偏离**：非成员样本由票面的 `20260728000000` 改为 `20260927082016`——前者 `private: true` 会被 `getSortedPosts` 的 `isPublicPost` 剔出时间线，判据天然为真；后者实测 `private:false / draft:false / series:none`，且紧邻本书四章在时间线上的位置；spec 验收第 4 条只说「非成员页」未指定样本，故不违背 spec。整批评审修复 `df0d8ed`（implement-spec 步骤 7：S3 注释与代码矛盾、S1 抽 `getSeriesMembers` 收敛六处重复、S2 两处冗余查表、S4 PostCard 改具名函数直查、S7 冒烟注释「五章→四章」；冒烟 32/0 零漂移）。

### 10. 全链验证与交付

> Issue: #86

> 状态：已验收（`d1f10ea`）@2026-10-06

**Blocked by**: 03（#79）、09（#85）

**Delivers**：本批收口，构建与 CI 全绿、站长目视通过、文档与票册同步完成。

- [x] `pnpm check` 0 error；`prettier --check ./src ./docs` 全绿
- [x] `pnpm build` 全绿（含 `test:utils` 与新增校验）
- [x] `pnpm smoke:series` 跑通并把读数记入本册 09 的**证据**行
- [x] 后台留 `astro dev`（`http://localhost:4321`）给站长逐页核对；清单：`/posts/20261002204249/`（末章无右按钮、两行、侧栏目录）、`/posts/20261002071103/`（首章无左按钮）、`/posts/20261006110122/`（左按钮 = Matt 另一篇；右按钮不再指 7-28 那篇）、`/series/webapp-vibe-coding/`、`/series/matt-pocock/`、`/series/`、首页与 `/archive/` 徽章、≤680px 表现、临时换封面后变体重建
- [x] 复用核对：侧栏 `WidgetSeries` 外框与既有 widget 同族；总览卡与文章卡同族；两行提示与 `.post-metaa` 同字号同色；目录页页头与 `/tag/` 索引页结构一致
- [x] 文档同步：`GLOSSARY.md` 五词条已在；`docs/adr/0007-…` 已在；`AGENTS.md` 的元件设计约束已在
- [x] 提交后 CI 三条工作流全绿（lint / build and check / deploy）
- [x] 本册逐票勾完，`pnpm audit:ledger docs/plans/2026-10-06-collection-series-tickets.md` 得 GREEN
- [x] 站长明确同意后再推送

**证据**：merge commit `d1f10ea`（PR #87，merge 方法 = merge commit，九票原始 sha 原样进入 main 祖先链，R4 由此成立）。CI 三条工作流在 `d1f10ea` 上全绿：Lint ✅ / Build and Check ✅ / Deploy to GitHub Pages ✅（完整构建链随 withastro/action 真实执行，站点已上线）。`pnpm smoke:series` 读数 **合计 36 项，失败 0 项**（基线 32 → 35 粘性 → 36 标题栏入口，两次提升均有据并写进脚本头注释与票 09 证据行）。站长 2026-10-06 逐页目视通过，并追加四项调整（均各自成 commit）：导航项改名「文集精选」（`1992cc9`）、侧栏目录移至末位并 CSS 粘性跟随（`b8b042f`，`.main-grid` 浮体转 grid，真实浏览器五宽度 80 组几何读数 0 差异）、当前章分割线回中性（`9a470dd`）、「查看目录」移入标题栏 actions 槽并补 hover 过渡（`fd8d0af` + `65cd263`）。三处文档更正（AGENTS.md 补 smoke:series 与五个新 util、ADR 0007:19、spec 位次表私密帖）已报备站长、未擅动。
