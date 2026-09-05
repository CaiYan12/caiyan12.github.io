# 计划：/about/ 页新增 GitHub 贡献日历（构建期静态渲染 + 响应式 + 克制动效）

- 日期：2026-09-05（当日全部完成并验证）
- Spec：GitHub Issue #7（`ready-for-agent`）
- 状态：✅ 已实施完成

## 决策记录

1. **不引入 Bloggify/github-calendar 运行时**：该库默认浏览器端经 @Bloggify 第三方代理抓取 GitHub 页 HTML，与「构建期渲染、客户端零 GitHub 请求」原则冲突且代理是可用性单点。借鉴展示形态，数据与渲染全部构建期完成。
2. 跨度 12 个月（53 列）；品牌绿梯度配色（#ebedf0 空格 + 四档 `--colorful-green` 明度梯度）；统计行（总贡献/最长连续/当前连续）+ 原生 title 提示。
3. 动画按 /animate 技能门槛设计：列级入场 stagger（occasional 档 delight，呼应原版 logo bounceIn 语言）+ 格子 hover 缩放（高频反馈档 120ms）；拒绝数字 count-up 与卡片级 hover 阴影。
4. 回退语义：拉取失败/无 token → 复用旧缓存 → 否则回退链接卡；构建 warn 不中断（对齐 fetch-github-repos）。
5. 测试缝隙单一：脚本级注入 fetchImpl + fixture（先例 sync-site-stats.test.mjs）。
6. 2026-09-05 用户追加要求：样式对齐原版 limh.me Colorful 设计案；放开零动画限制做克制动画；格子改为**响应式流式布局**（不再固定 11px）。

## 实施记录（全部完成）

- [x] Spec 发布 Issue #7
- [x] `scripts/fetch-github-contributions.mjs`：token 链（GITHUB_TOKEN → GH_TOKEN → gh auth token）+ GraphQL contributionsCollection + 归一化 + 统计（长连/当前连，末位零日回看）+ tmp+rename 原子写 `src/constants/github-contributions.json`；失败 warn 不中断保留旧缓存
- [x] `package.json`：build 链在 fetch-github-repos 后追加；`test:contributions`
- [x] 单测 10 例（正常/HTTP 错/非法载荷/无令牌/网络异常/旧缓存保留/零贡献/末位零日/排序校验/Authorization 断言）
- [x] `src/utils/contributions-calendar.ts` 纯渲染函数（含回退卡、月标/周几中文标签、aria-label）
- [x] `src/pages/about.astro` 面包屑后、正文前注入；cwd 相对路径读 JSON（import.meta.url 在打包后指向 dist/chunks 会扑空——已踩坑并修复）
- [x] `markdown-extended.css`：`.gh-calendar-*` 系列，卡片复用 `.widget` 形态

## 响应式布局要点（用户追加后的返工）

- 固定 11px 格子在宽屏不满宽 → 改流式：`.gh-calendar-cols` 用 `grid-template-columns: var(--gh-wd) repeat(53, minmax(0,1fr))` + `aspect-ratio: 53/7` 整体定高，格子方形由构造保证。
- 踩坑三连（Chrome 轨道解析）：① `grid-auto-columns: max(4px, calc(%…))` 的 % 在 intrinsic sizing 下反向撑破外层 `1fr` 轨 → 外层改 `minmax(0,1fr)`；② 单格 `aspect-ratio` + wrapper `align-content: stretch` 循环尺寸把行撑到 25px → 弃单格比例，改整体 aspect-ratio + wrapper `grid-template-rows: subgrid`；③ 周几独立网格 1fr 行与 cols 高度耦合失准 → 周几标签并入 cols 网格第一列，对齐由构造保证。
- 月份行与 cols 同构模板（含周几列占位）逐列对齐；`overflow: hidden` 裁掉标签可见溢出造成的 ~5px 假横滚。
- 窄屏：`--gh-cell-min`（桌面 4px / ≤680px 6px）触底后由 `.gh-calendar-scroll` 横滚兜底，外层 `min-width` 计算式表达下限。

## 验证记录

- `pnpm test:contributions` 10/10；`pnpm check` 0 errors；`pnpm build` 全链通过
- 产物断言：dist/about 371 格 + 5 图例色块、0 回退卡、`<strong>207</strong>`
- Playwright 实机（dev，1280/1600/680/375）：铺满、对齐（周几中心=行中心）、hover matrix(1.3)、reduced-motion 切 `gh-calendar-col-fade` 0.2s 且 hover 无位移、Swup 首页→关于重播一次、移走 JSON 出回退卡
- Console 无新增错误（Pio effect_orphan 与 myhk 防重复加载为既有已知）

## Out of Scope

不动 projects.astro 的 profile-summary embed；不加暗色模式；零新依赖零日期库；不请求 12 个月以上历史；客户端零新增请求零 JS。
