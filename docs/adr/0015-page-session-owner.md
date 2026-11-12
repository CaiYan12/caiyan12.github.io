# 0015：页面级 runtime 收进会话 owner，常驻模块不进

## 背景

页面级功能的初始化原本散在各自 `.astro` 的内联脚本里：自己监听 `colorful:page:loaded`，自己用 `dataset` 守卫防重入。这套形态只有「同一页里别重复跑」，没有「离开这一页要收摊」。

2026-11-10 实测：首页轮播的 4s `setInterval` 在 `#slider` 已脱离 DOM 之后仍在跑，回到首页再起一条，逐次累积（2 → 2 → 3），整个过程中 `clearInterval` 一次都没被调用。另外三处各有各的糊法——字号用 `window.__fontSizeClickAwayBound` 全局旗标压重复注册，那个旗标没有「页面结束」的出口；tabs 的监听绑在会被换页丢弃的节点上，靠「不可达」冒充清理；3D 云的销毁挂在「下一次 init」上，离开后不再进云集页就一直活着。

## 决定

**一、新增 `createPageSessionOwner(sessions)`，只做 start / stop 调度。** 不碰 DOM，不承载任何功能的 implementation。四个功能（`slideshow` / `font-size` / `sidebar-tabs` / `tag-cloud-3d`）各自导出 `{ name, start, stop }`，owner 只负责按清单顺序调用。

**二、不新增第四轨。** 初始装载与换页重跑复用 `runtimeTable` 的一行 `{ init: pageSessions.start, swap: 9 }`；离开前停止挂在既有的 `runtimeHooks.beforeSwap`，排在 `destroyFancybox` 之后。表内既有 28 行的次序、`swap` 1–8 的相对次序一律不动。

**三、清单即家谱。** 哪些功能是页面级，只在 `theme-script.ts` 的 `pageSessions` 这一处声明。功能模块不得自行注册，也不得自行监听页面事件——否则「谁在这一页起了表」要靠 grep 回答。

**四、常驻模块不进清单。** 判据是 DOM 是否随页面替换：头部微言、拉绳壁纸、导航、液态玻璃、随机背景的宿主不随 Swup 换页重建，它们不进会话。

**五、新增页面级功能必须同时给出 start 与 stop，且 stop 可被观测**——清定时器、解绑监听、销毁实例，三样至少占一样。

## 被否掉的方案及理由

**新建一条独立生命周期轨道（`page:leave` 之类的事件）。** 否掉：轨道越多，装配顺序越难复现；现有的两条重跑轨（表序、swap 序）加一条钩子轨已经够表达，问题从来不是没有轨道，而是没有人为「离开」负责。

**在功能模块里自注册（`owner.register(...)`）。** 否掉：家谱会分叉，顺序会变成 import 顺序的副产物，而 import 顺序在本仓库是打包器的自由。

**把常驻模块也收进来。** 否掉：它们的 stop 无处触发——换页时宿主还在，收了就等于每次换页把导航和壁纸停掉再起。

**继续用 `colorful:page:loaded` + `dataset` 守卫。** 否掉：那套语义里没有「结束」，只能靠「下次 init 时顺手清理上一次」，而那要求用户一定会回到这一页。

**给每个功能单独写一套 teardown 钩子。** 否掉：那就是现在这个问题的原样重写。

## 代价与边界

- **`Layout` 那个 chunk 由 45,732 B 增至 51,380 B**（+5,648；gzip9 +1,691、brotli +1,429）。每页实读 `decodedBodySize` 恰好 +5,648，请求数不变；站内 JS 总量 +0.10%。这是把四段内联脚本搬进共享 chunk 的必然结果，不是新增功能。
- **相位有位移但首帧不变**：`slider:initialized` 从 355.7ms 到 419.2ms，两次都与 `domcontentloaded` 同刻。init 只写 `data-initialized` 并起计时器，首张 `active` 由构建期决定。
- **只在「换页前」停止，不在「页面卸载」停止**：关标签页由浏览器回收，owner 不管。
- **3D 云的 rAF 仍由库的 `destroy()` 回收**，没有显式 `cancelAnimationFrame`——不为了统一而去重写 vendored 库。
- **异步竞态要靠功能自己守**：库加载 resolve 时若页面已离开，不得创建实例。owner 只能在 `beforeSwap` 时把「已停止」这件事告诉模块，查不查是模块的事（实测靠 `disposed || !container.isConnected` 守住）。

## 守卫在哪

- `theme-script.ts` 里 `swap: 9` 是**追加序号**，不是「第 9 个跑的功能」。不要为了让表看起来整齐去重排 1–8。
- `beforeSwap` 的顺序有意义：先收 Fancybox，再收页面功能的定时器与监听。别按字母序整理。
- 别把 `pageSessions.stop` 挂到 `astro:after-swap`——那时新页面已经开始 init，stop 会把刚起来的东西停掉。
- 常驻 / 页面级判错的两种后果都很难查：宿主还在却被 stop（换页后功能哑了），宿主没了还在 start（定时器复活、监听挂在游离节点上）。

## 落地状态（2026-11-12）

实现于 `91a5255`。新增 `src/utils/runtime/page-session.ts`（47 行）与四个功能 module（`slideshow.ts` 148 行、`font-size.ts` 135 行、`sidebar-tabs.ts` 84 行、`tag-cloud-3d.ts` 136 行）；`theme-script.ts` 装配表 28 → 29 行；四个 `.astro` 各删一个 `<script>` 块（markup、样式、类名、DOM 顺序零改动）。证据目录 `output/architecture-2026-11-10/F2.*`（git-ignored）。

### 实测结果

- **生命周期**：修前 2 → 2 → 3；修后 2 → 1 → 1 → 1 → 2。判据从 7 条长到 17 条（逐步加：轮播 → 字号指针监听与 tabs 旧节点 → 3D 云异步竞态）。
- **监听计数**（直接读，不靠行为推断）：文章页 `document` 的 pointerdown 1 → 离开后 0 → 回来仍 1；旧 tab 节点的 click 1 → 0。
- **异步竞态**：把 `SVG3DTagCloud.global.js` 压住 1.5s，进 `/tag/` 后立刻换页，2.2s 后 `window.__tagCloud3D` 为 `undefined`、页面无 `.tag3d-stage svg`（前置断言 `libRequests=1` 保证请求真被拦过）。
- **四组变异各自红**：轮播 `stop()` 不 teardown 回到 2 → 2 → 3；字号 stop 不清理 → `pointerAfter=1`、`pointerBack=2`；tabs stop 不清理 → `tabClickAfter=1`；3D 云删掉「已离开则不创建」守卫 → `registry="object"`。四次都退出码 1，恢复后 sha256 与备份一致。
- **可见性**：`smoke:ui` 142/142、0 失败（F2.2 / F2.3 / F2.4 各跑一次，均与改前基线同读数）；样式指纹 `origin/main` vs `HEAD` 在 [ADR 0014](0014-nonrendering-verdict.md) 的补丁到位后为 0/23、0 条；CSS 8 个同名文件逐字节相同。
