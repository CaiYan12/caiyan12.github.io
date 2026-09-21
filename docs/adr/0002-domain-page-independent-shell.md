# /domain/ 保持独立壳，只做就地最小修正

`/domain/` 是桌面端 logo 的跳转目标（`Navbar.astro:39`），但它自带一套满屏终端风格样式（`src/domain.html` + `public/domain/css/`），不加载博客的 `Layout.astro`。我们决定继续保留这个独立壳，只对无障碍与品牌一致性做就地修正——`lang="zh-CN"`、解除 `user-scalable=no` 禁缩放、把 `FiraCode.css` 的 `*{font-family}` 收窄到终端风格元素、`#00be00` 统一为 `#00c000`、`div.headPhoto` 外包 `<a>` 作为返回入口——而不是把它纳入主站页面体系。

**Considered options**：纳入 `Layout.astro`（一次性统一字体、导航、Swup 与备案，但等于重写该页：满屏终端动画与 `site-modal.css` 独立壳冲突，回归面超过其余全部 T0 项之和）；只修无障碍并把 logo 指回首页（会把一个想展示的门面藏起来）。

**Consequences**：该页与主站的度量（`rem` 基准 vs 13px 正文制）继续并存，后续设计审计会再次报它——本 ADR 即为「已评估、有意保留」的凭据，不要重复评估。主站 `html{font-size:13px}` 在本页也不生效（该规则实际从未生效，见根字号层级问题），页面个性正是靠这一点维持。favicon（`/domain/favicon.ico` 与主站 apple-touch-icon）不在本次修正范围内，保持现状。
