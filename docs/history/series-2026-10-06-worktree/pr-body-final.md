## Summary

文集（series）：与标签、分类并列的独立轴，成员的阅读序列**封闭在组内**。归属只看 frontmatter 的 `series` 属性，组内顺序由 `seriesOrder` 决定；非成员文章的导航**跳过整个文集**（ADR 0007，刻意为之）。

```diff
 src/
 ├── utils/
+│   ├── posts-schema.ts        # series / seriesOrder 进 zod schema（抽出以进单测）
+│   └── series-integrity.ts    # 四条内容规则，构建期响亮失败并指名文章
 ├── data/
+│   └── series.ts              # 文集登记表（slug / name / description / unit）
 ├── components/
+│   ├── layout/SeriesListing.astro   # 目录页列表体（复用 ListingHeader/PostCard/Pagination）
+│   └── widget/WidgetSeries.astro    # 侧栏文集目录（末位 + CSS 粘性跟随）
 ├── pages/series/
+│   ├── index.astro                  # /series/ 总览（导航入口）
+│   ├── [slug].astro                 # /series/<slug>/ 目录页
+│   └── [slug]/page/[page].astro     # 分页
 └── scripts/
+    └── series-smoke.mjs        # 缝隙 A 冒烟，36 条判据（pnpm smoke:series）
```

导航语义（纯函数，`src/utils/content-utils.ts`）：

```text
getSeriesNeighbors(posts, slug)
  成员   → 同 series 值按 seriesOrder 升序取相邻（首篇无 prev、末篇无 next，不跨出文集）
  非成员 → 剔除全部成员后复用既有 getNeighbors（时间线跳过整个文集）
```

## Evidence

- **Before**：文章页左右按钮走在一条全站时间线上——《看懂 AI 写的网站》第三章的右按钮指向 Matt Pocock 那篇，Matt 篇的左按钮落进本书第三章（spec 的 Problem Statement 实测位次表）。
- **After**：
  - `pnpm smoke:series` → **合计 36 项，失败 0 项**（组内相邻 href、边界不渲染、非成员跳过整块、两行提示、侧栏目录、三页 200 + 封面、粘性跟随）
  - `pnpm test:utils` → 29/29（schema 拒绝 `""` 与负数/小数、完整性四规则、相邻/回退/封面五类用例）
  - `pnpm check` 0 errors；`prettier --check ./src ./docs` 绿；`astro build` 220 页 exit 0
  - 红证据（每票先红后绿）：`seriesOrder` 错位 → 冒烟 12 条翻红；组内重复 → 构建期 `exit 1` 指名两篇文章；新建封面图 → LQIP 与四档 WebP 变体生成后还原
  - CI：`3bb3729` / `eba8892` 上 Lint 与 Build and Check 双绿
- 站长已逐页目视通过（2026-10-06）：导航项改名「文集精选」、侧栏目录移至末位并粘性跟随、当前章分割线回中性、标题栏入口对齐「换一批」。

## Merge Danger

**Door:** two-way

revert 这一个 merge commit 即整体回退；无数据迁移、无破坏性操作。

**Blast Radius:** 全站布局

`.main-grid` 的两栏机制由浮体改为 grid（列宽逐像素等价：`minmax(0,1fr) 255px` + `column-gap: 20px`，浮体几何为 容器−275 / 255 / 20）——已用真实浏览器在 1440/1100/980/860/769 五宽度对 `#content`/`#sidebar`/首卡/天气卡做了 80 组改前改后对比，全部 0 差异。已知边界：≤980px 因 `#wrapper` 的 `overflow:hidden` 粘性不跟随（布局不破）；`smoke:series` 与 `smoke:ui` 不进 CI、需手工跑。

逐票证据见 `docs/plans/2026-10-06-collection-series-tickets.md`（票 01–09 已回填，票 10 随本合并关闭）；mirror issue #77–#86 在合并后逐票关闭并附 commit。
