# 文章页标题允许多行，列表卡标题保持单行省略

`.post-header` 的一条组合规则（`global.css:2493-2508`）同时给文章页 `h1` 与列表卡 `h2` 上了 `white-space:nowrap + overflow:hidden + text-overflow:ellipsis + height:25px`。实测 63 字的标题在 1440px 桌面就丢掉 194px，在 390px 丢掉 573px（占 63%）——canonical 页面上的标题被无声截断。我们决定只把文章页 `h1` 摘出该规则放宽为多行（`height:auto; white-space:normal`），列表卡 `h2` 继续单行省略。

**Why**：canonical 页面丢字是内容损失；列表里「一行一条」是有意的密度节奏，对应原版 `#record li` 那一族省略号规则（尽管 `.post-header` 这个类本身在原版 `colorful-original.css` 里并不存在，所以放宽它不违背 Colorful 还原契约）。

**Consequences**：同一个类名下 `h1` 与 `h2` 的截断行为**故意分叉**，后来者不要「顺手统一」回一条规则。副作用是 `.post-header` 的 `border-left:3px solid #000` 黑竖线会随标题变成两三行而拉长，这是本次接受的结果。
