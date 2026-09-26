# 导航条与其下拉采用液态玻璃（运行时生成折射贴图）

我们决定把 `#head-nav` 与它的四个下拉面板从静态白卡（`background: var(--content-surface)`）改成液态玻璃：白膜 + 背景模糊 + **边缘折射透镜**，折射场由客户端按每个元素的实际尺寸与四角半径生成一张圆角矩形 SDF 位移贴图，灌进 `Layout.astro` 里的 `<feImage> → <feDisplacementMap>`，再用 `backdrop-filter: url(#…) blur(15px) contrast(1.05) brightness(1.06) saturate(1.2)` 施加。路线参考 `github.com/shuding/liquid-glass`，但位移改在**像素空间沿 SDF 梯度**计算——原实现用归一化 uv，放到 1100×55 的横条上会把横向位移放大 20 倍而纵向几乎为零。

这是一条刻意选择的复杂度：导航栏通常只是一行底色。选它是因为本站导航条长期"朴素"，而折射透镜能在不动任何几何的前提下给出材质与深度，且它采的是站点自己的真实背景照，不是通用装饰。

## 约束（后续改动不得"顺手修好"）

1. **玻璃必须画在 `#head-nav::before` 上，不能画在 `#head-nav` 自己身上。** 带 `backdrop-filter` 的元素会建立 backdrop root，后代的 `backdrop-filter` 只能采到该层之内的内容。玻璃挂在元素上时，作为其后代的下拉面板滤镜彻底空转——实测"关掉面板自己的 backdrop-filter，面板内部像素变化 **0.0%**"。
2. **`#head-nav` 必须显式 `background: none`。** 玻璃挪走后元素自身不再写 background，`@layer components` 里那条 legacy `.head-nav{background-color:#fff}` 就会接管成不透明白，而它正落在 `::before` 的 backdrop 里被采样——导航条会**静默退回原样**。computed style 里 `backdrop-filter` 依然显示正确，只有像素能发现。
3. **`#nav li ul a` 必须保持透明。** 生产原值是不透明白（hover 时 `#f6f6f6`），四行链接拼起来正好盖满整个面板。实测把面板膜从 .75 改到 .35，渲染**零变化**；改透明后同一操作得到 rgb(243)→rgb(148)。行分隔仍由 `li` 的 1px 边框承担。
4. **透镜带宽与折射强度按元素短边等比**（`bandRatio .16` / `strengthRatio .51`，比例反推自选定值：横条 55×0.16≈9px、55×0.51≈28px）。写死 9/28 的话，横条上占短边 16%（抢眼），到 108px 宽的面板上只剩 8%，面板就读成一块白板。
5. **描边用 `outline` 而非 `border`。** `border: 1px` 会同时吃掉上下，实测把首项 y 从 180 顶到 181、社交项 186→187；`outline-offset:-1px` 视觉等价且不占盒内空间。
6. **滤镜区域按 `Math.ceil` 取整。** 按 `round` 会把 107.8×125.44 的面板算成 108×125，`userSpaceOnUse` 的区域外不施加效果，右缘/下缘留一条未折射的缝。

## Considered options

- **纯 CSS 半透 + 模糊（普通 glassmorphism）**：零 JS、零新节点，但用户明确否掉——它没有边缘折射，就是"白膜"。
- **WebGL/WebGPU 折射**（如 `liquid-dom`、`liquidGL`）：效果最真，但要为一条导航栏引入渲染上下文与每帧合成，且与 Swup 的 head/脚本同步协议相互干扰。
- **构建期预生成 PNG 贴图**：省掉运行时 JS，但导航是流式宽度（≤1100 变 `calc(100% - 40px)`），贴图尺寸会与实际元素脱节，且换背景照后仍需重算。
- **只给横条上玻璃、下拉保持白卡**：改动最小，但条与面板材质打架，实测读起来像"面板浮在导航外面"。

## Consequences

- **几何契约不变，且已被测量**：横条 1100×55 @y180、项 110px（≤1100→96、≤980→80）、下拉 110 宽 / `top:53` / 行高 30、社交 64×43、正文卡顶 255——与改动前的构建产物逐字段比对为零差异。
- **可达性上有一处已知的、由站长明确接受的让步**：面板链接色保持 `#555`（未采纳提到 `#333` 的建议）。膜 .75 时面板平均 rgb(208)、对比度约 4.8:1 过 AA；但背景照是四张随机城市图，压到暗部时面板约 rgb(191)、降到 4.06:1，14px 文字不足 4.5。站长裁决保持现色，本 ADR 记录该取舍成立，后续审计**不得**再把它当缺陷上报。导航条上品牌绿文字（当前页与 hover）对比度 1.7~2.2:1 属改动前既有问题，与本决策无关，尚未处理。
- **Safari 系不支持 `backdrop-filter: url()`**：CSS 里把纯 blur 版本写在 url() 版本之前作为回落，JS 侧用 `CSS.supports` 判定后不生成贴图、也不置 `html[data-liquid-glass]`，因此那些浏览器得到的是"白膜 + 毛玻璃"，不会引用到空滤镜。
- **运行时成本**：每个目标一张 canvas（横条 1100×55 ≈ 6 万像素，面板 108×126 ≈ 1.4 万），随 `ResizeObserver` 重算；面板平时 `display:none`，需临时显形测量尺寸，且必须赶在置 `data-liquid-glass` 之前完成，否则面板会以无贴图状态闪一帧。
- **回归门禁目前不在 CI 里**：判定用的 `check-glass.mjs` / `verify-live.mjs` 放在 gitignore 的 `testpics/` 下。本 ADR 的约束 1–3 都只能靠像素级断言守住（computed style 全部会显示"正确"），后续应把它提升为 `pnpm smoke:*` 系列并进 CI；在完成前，任何触碰 `#head-nav` / `#nav li ul` 的改动都必须手工重跑一次该判定。
