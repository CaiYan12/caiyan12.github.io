# 命令清单与每条命令的坑

> 全部 pnpm 脚本的用途、前置条件、env 变量形态与已知坑。命令名以 package.json 的 scripts 为准（唯一真源），这份是「每条命令的注意事项」缓存。**要跑烟测/单测/构建期取数/票册自检前读这份**。

（本文由 `AGENTS.md` 的「命令清单与每条命令的坑」一节迁出；内容逐字保留。）

## 常用命令

**升级批次 A/B 的两条实测前提（2026-11-03 立）**：

- **先测噪声底线再判 A/B**。同版本连做两次构建，本仓库的非 HTML 产物应逐字节 0 差异，HTML 差异全部集中在侧栏「文章推荐」随机块（2026-11-03 实测 146/230 个 HTML 有差异、剥除后 0 差异）。不先量这条底线，就无法区分「升级造成的差异」与「构建自身的随机噪声」。
- **归一化 `_astro` 资源名要覆盖两种分隔形式**：Rollup 默认产物是 `<name>-<HASH>.ext`，而 Astro/Vite 的 island chunk 是 `<name>.<HASH>.ext`。只处理前者会把 156 个 HTML 全部误报成差异（2026-11-03 实际踩过），补上点分形式后降到 0。

- **样式指纹 A/B 两侧必须用同一个 `localhost:<端口>`**：`scripts/upgrade-style-audit.mjs` 第 307 行的归一化正则只匹配 `localhost:\d+`，**不匹配 `127.0.0.1:\d+`**。用两个不同端口采集再 `diff`，会把 `cursor: url(...)`、`background-image: url(...)` 里的端口号判成整页差异（2026-11-03 一次得到 15820 条假差异）。另外 `capture` 全量 23 页约需 5–8 分钟，属长任务，按纪律放后台跑。
- **判「随机噪声」还是「真回归」：对同一份构建连采两次**。`crypto.getRandomValues` 会让 `/albums/`、`/timeline/` 的语录块（`figure:5` 内 `span.quote-band__char` 逐字符宽度）每次不同。若「升级前后 A/B」的差异页集合与「同一构建两次」的差异页集合**完全一致**，即为随机噪声；不一致才需要继续查。

Pagefind 当前固定 1.6.0；`pnpm exec pagefind --site dist` 需要在 Astro 构建之后运行，并完整发布该次 `dist/pagefind/` 的脚本、WASM 与分片。升级比较应使用完整 API 结果，本站 UI 的 12 条上限不能代替命中总量；31 组查询、桌面/移动 UI 与分片失败重试的 A/B 方法见 [Pagefind 专项验收](../plans/2026-11-02-pagefind-upgrade.md)。

**KaTeX 类名判据已接进 `pnpm build`（2026-11-03 立）**：`scripts/verify-katex-classes.mjs`（`pnpm test:katex-classes`）扫 `dist/**/*.html`，要求旧类名 `base`/`strut` 为 **0**、新类名 `katex-base`/`katex-strut` **非零**；两侧全零也判失败（否则 Markdown 管线坏掉时会空转通过）。它排在 `astro build` 之后、`inject-buddha-banner` 之前，因此 **`pnpm build` 与 CI 的 `Build and Check`、`Deploy to GitHub Pages` 两条路径都会执行**，不需要单独改 workflow。判据为什么必须存在见 [构建链文档](build-and-deploy.md) 的 KaTeX 条目：版本错配下渲染成功数、字体族、`.katex` 盒子宽高**三项常规判据全部照绿**，只有类名与几何尺寸能看出来。类名匹配必须按 **class 属性逐 token 精确切分**，不能用 `\bbase\b` 之类的词边界——`katex-base`、`skills-donut-segment-base`、`text-base` 都会命中制造假阳性（2026-11-03 实测全站 230 个 HTML 里精确计数为 0）。

**线上验收脚本已入库（2026-11-03 立）**：`pnpm verify:live [baseUrl]`（29 条判据：部署身份、微言、KaTeX、Mermaid、移动端）与 `pnpm verify:live:swup [baseUrl]`（文档级 Swup 接管证明）。两者可用参数改指 preview 或本地站，内部约定 base URL 不带结尾斜杠。**来源**：它们原先是 gitignore 的 `output/live-verify*.mjs`，与产物一起在下次会话蒸发；判据值钱、脚本不该跟着删。移植时把写死的 `D:/pages/myblog` 改成 `createRequire(new URL("../package.json", import.meta.url))` 锚到仓库根，因此换机器、换检出目录都能跑。

**实机烟测为什么不进 CI——这是取舍，不是遗漏（2026-11-03 立）**：`smoke:ui`、`test:fancybox`、`smoke:console`、`test:console`、`smoke:series`、`smoke:skills`、`smoke:pelican`、`smoke:nice-books`、`qa:nice-books-geometry`、`qa:weather-mainland` 等约 250 条判据**都不在 CI 里，而且不应被当成待补的 backlog**。原因是结构性的，不是偷懒：① 它们共用 `scripts/lib/smoke-harness.mjs`，该模块 `import { chromium } from "playwright"` 并真的 `chromium.launch()`（脚本自身不写 `import playwright` 不代表不用浏览器，2026-11-03 实测在无 server 下跑 `smoke:console` 直接 `browser.newContext: Target page, context or browser has been closed`）；② 每条都要求**先 `pnpm build` 再起 preview**，因为断言落在真实页面的计算样式与 DOM 上；③ 接入意味着 CI 每次要装 Chromium、跑完整构建、起 server，单次数分钟起。**现有 CI 的分工是有意的**：`build.yml` 的 `Astro Build` 只在 PR 跑一次真实构建，`lint.yml` 只做格式与公式保护，纯 node 单元测试串在 `pnpm build` 里。要跑实机验证就在本地按上面各条的 env 形态手动跑，或对线上跑 `pnpm verify:live`。**不要因为「CI 三项全绿」就认为升级没有回归**——250 条实机判据一条都没跑。

`pnpm check` 的检查器现固定为 `@astrojs/check` 0.9.12。使用 `pnpm exec astro check --watch --preserveWatchOutput` 时，新增文件需要重新运行单次检查或重启 watch：2026-11-02 在旧版 0.9.10 和新版 0.9.12 均复现当前监听诊断清单未纳入新文件；已有文件修改可检出错误并在修正后清零。该限制与本次升级的验证边界见 [检查器专项验收](../plans/2026-11-02-astro-check-upgrade.md)。

```bash
pnpm install     # 安装依赖（中国网络需先设 registry 为 https://registry.npmmirror.com）
pnpm dev         # 本地开发 http://localhost:4321
pnpm build       # 构建 dist/（项目目录 + LQIP + GitHub 仓库/贡献数据 + astro build + Pagefind，已串联）
pnpm new-post -- <yyyymmddhhmmss> [标题]  # 按强制 URL 规范创建文章
pnpm fetch-projects        # 刷新“我的项目”GitHub 仓库与 Pinned 快照
pnpm test:projects         # 项目同步、缓存、合并与排序测试
pnpm fetch-repos --refresh  # 全量刷新 GitHub 仓库卡片元数据缓存（默认增量只拉缺失）
pnpm fetch-friend-icons     # 增量补齐缺失的友链图标缓存
pnpm fetch-friend-icons --refresh  # 手动刷新当前友链图标缓存
pnpm preview     # 预览构建产物（需先 build）
pnpm check       # astro check 类型检查
pnpm test:prettier-math # 内存格式化 src/content 的 Markdown，比较公式内容与 KaTeX 渲染；只读，已接入 lint.yml
pnpm test:article-toc-browser # 手动 Chromium + 可控时钟验证目录防抖边界，无需 dev server，不接 CI/build
pnpm smoke:skills # 构建并启动预览后验证技能图标在外网不可用时仍全部解码；SKILLS_BASE_URL 传不带尾斜杠的站点根
node scripts/sync-skill-icons.mjs # 手动更新本地技能图标及来源记录；不进普通构建链，原图/许可见 public/skill-icons/README.md
pnpm test:contributions  # 贡献日历数据脚本离线单测（node --test，注入 fetchImpl 不访问真实网络）
pnpm test:nice-books  # Nice Books 单测（数据契约/随机去重/搜索/封面，node --test，已串入 build 链头部）
pnpm test:site-stats # Giscus 同步单测（fetchImpl/输出路径全注入，无需令牌、0.6s，已串入 build 链头部）
pnpm test:utils      # src/utils 纯函数单测（content-utils 排序/评分/邻篇 + pagination canonical）
pnpm test:friend-icons  # 友链图标缓存单测（离线注入 fetchImpl，不访问真实网络）
pnpm smoke:ai-news   # MAIN_SITE_URL 为站点根（默认 http://localhost:4321/）；本地只检查桌面/移动入口 DOM
# 线上同源完整旅程：$env:MAIN_SITE_URL="https://caiyan12.github.io/"; $env:AI_NEWS_INTEGRATION_LIVE="1"; pnpm smoke:ai-news
pnpm test:ai-news-ownership  # build 后检查 src/ai-news、src/pages/ai-news、public/ai-news 与整个 dist/ai-news 均不存在，且 sitemap 保留独立项目地址
pnpm smoke:series    # 文集（series）接线烟测，39 条判据：组内相邻 href／组内边界不渲染／非成员跳过整块／两行提示／侧栏目录／三页 200+封面／粘性跟随；SERIES_BASE_URL 传**站点根**（与 FANCY_BASE_URL / UI_SMOKE_BASE_URL 同形），需先 `pnpm build && pnpm preview --port 4322`；**不进 CI 只手工跑**
pnpm qa:nice-books-geometry  # Nice Books 统一 3D 几何运行时检查（默认 127.0.0.1:4321；NICE_BOOKS_BASE_URL 可覆盖。注意另一个 `scripts/nice-books-design-qa.mjs` 默认才是 4322 preview）
pnpm smoke:nice-books  # Nice Books 三页 Playwright Smoke；支持 NICE_BOOKS_BASE_URL 指向 build + preview
pnpm test:fancybox     # 灯箱 Playwright Smoke（关闭不跳位/焦点归还/定位按钮/下载新标签页/中文文案，需先 build + preview；FANCY_BASE_URL 可覆盖地址）
pnpm test:fancybox 打线上时 FANCY_BASE_URL 传的是**站点根**（脚本自己拼 /posts/... 与 /albums/...），而 NICE_BOOKS_BASE_URL 传的是**完整页面地址** —— 两者形态不同，传错会表现为「选择器等不到」的假失败。2026-09-20 起放大两项改为等原图解码 + 轮询到高度稳定，本地与线上均 27/27
pnpm smoke:ui           # 主站 UI 缺陷修复实机烟测（UI 整改票册的缝隙 A，需先 build + preview）；UI_SMOKE_BASE_URL 传**站点根**，与 FANCY_BASE_URL 同形。断言只落在计算值/几何/键盘结果/ARIA 属性上，绝不锁 CSS 源文本、类名字符串或行号；相对判据（"只有预期项变化"与"零差异"）由 scripts/upgrade-style-audit.mjs 的整页指纹 capture/diff 承担（页数现测取自 scripts/lib/smoke-pages.mjs 的 AUDIT_PAGES，别在别处抄一份数字），其采集排除表现含 iframe.giscus-frame（远端 postMessage 改 class 与高度，否则同码连采两遍也会翻脸）；套件在 **context 级别掐掉 YouTube / Bilibili 请求**（`stubExternalEmbeds`）——文章正文里有裸的视频 iframe，而整套用 `waitUntil:"load"` 导航，load 要等这些子帧；它们可达与否取决于本地网络当时的状态，2026-09-30 实测两次 30s 超时把整套打断、失败点还随网络漂移，看着像新加判据的锅。判据不依赖外部视频站的可用性。**凡是读动画中间态/几何的判据，相位一律由状态定义，不用 `waitForTimeout`**：等 `getAnimations()` 落定、等计算值到达某个阈值、或逐帧采样要求每帧都满足不变量。2026-10-01 两条老 flake 就是这么来的——「票 22 Tab 首站」把 sleep 从 200ms 加到 400ms 仍是症状修复（`.skip-link` 未展开时 top = 10 − 2×37 = **−64**，那次读到 −39 就是走到约 34%）；「两段黑幕」等 2300ms 而它自己拉长的 2s 过渡实测 420ms 就落定，只剩 300ms 余量。同日把余下 23 处墙钟分桶扫完，又学到两条承重事实：**① `data-fancybox` 是 `initFancybox()` 运行时才给 `.post-context img` 打上去的**（构建期产物里根本没有这个属性，见 `docs/agents/emlog-mapping.md` 的「图片灯箱」条），所以凡以 `.prose img[data-fancybox]` 为入口的判据必须等它出现——睡固定毫秒会把「还没标记」读成「灯箱打不开」（变异：把产物里那次 `setAttribute` 换成别的属性名，「票 22：灯箱确实打开」与顶层层那条立刻 2 红、exit 1）。**② 站点脚本是模块脚本，`waitUntil:"load"` 必然晚于它执行完**，所以 `document` 级委托监听（`src/utils/site-modal.ts` 约 158 行的点击触发）在 load 时早已绑好，点击**之前**的保险睡眠纯属浪费；省下来的是点击**之后**该等的那一等：`#site-modal .site-modal__panel` 入场是 `scale(0.96)→1` / 220ms，未等落定读到的仍是 `matrix(0.96, …)`、控件底边少报 6px——量盒判据因此偏向假绿而不是假红。**③ 读「hover 有没有造成位移」必须用与滚动无关的坐标**：`scripts/ui-smoke.mjs` 的 `hoverProbe()` 取「视口坐标 + 每个祖先容器的 `scrollLeft`/`scrollTop`」。原因：Playwright 的 `hover()` 做 actionability 时会 `scrollIntoViewIfNeeded()`，目标若在 `overflow:hidden` 且内容超宽的容器里（`overflow:hidden` 仍可被程序化滚动），容器 `scrollLeft` 会被改动、容器内所有元素的视口坐标整体平移——那是**测试自己造的读数**，不是 hover 引起的布局位移。2026-10-26 实测：文章卡标题那行 inline 内容（标签 + 箭头 + 文集徽章 + 标题）约 787.9px 宽、超出 h2 内容盒 23px，h2.scrollLeft 由 0 变 23，「票 20：卡片标题悬停零布局位移」被读成位移 23px（2026-10-10 记的 30px 同源，见 issue #106）。**改判据口径后必须做变异验证确认它仍会咬**（往产物里注入 hover 改盒宽/改位置的真缺陷），否则等于把判据削弱成永远绿；也不许靠放宽阈值解决。另有一条**跨帧比较的判据，其「终态」必须等整棵子树**（`getAnimations({subtree:true})`）而不是父元素：该判据要抓的正是「子元素比父慢」，只等父的话缺陷会同时污染两个读数、差值互相抵消（变异实测：注入 4s 的子层黑，等父版读到 半程 −16.5/展现 −16.3 判据绿；等子树版读到 −87.2/−14.2 立刻红）。像素采样还要**每次重新量盒并复核截图前后盒未移动**——盒是视口坐标，量盒与截图是两次异步调用，中间任何 reflow 或滚动锚定都会让同一组像素落到别的内容上。**已知限制（站长 2026-10-01 裁定：只记录、不改代码）**：远端音乐播放器主机 `myhkw.cn` 抖动或不可达时，整套会在某个 `page.goto(..., {waitUntil:"load"})` 上 30s 超时**中途死掉，且不产生任何 FAIL 行**（实测两次：一次跑到 102 项后断、一次连首个导航都没过、0 项），看着像「套件没跑完」而不是「有判据红」——排查时先 `curl -w "%{time_total}" https://myhkw.cn/player/js/jquery.min.js` 与 `…/api/player/<id>`（后者是 302，重定向目标慢也会挂住 load），再决定重跑。**不能照 `stubExternalEmbeds` 把它掐掉**：`#myhkplayer` 是那段远端脚本创建的，票 22 比 z-index 的两条判据正读它，掐掉等于把那两条一起废掉。
pnpm smoke:wallpaper-pull  # 拉绳壁纸挂件实机烟测（47 项判据：首屏只请求池中一张／单击与拖动达阈值换图且相邻不同张／未达阈值不换图／指针取消与失焦不换图且可继续／忙碌锁连发只落一次／候选全失败背景不变且播报「加载失败」／Enter 与 Space 可激活且 Space 不滚页／焦点环计算值／aria-live=polite／切两页后仍可换图／≤680px 隐藏／减少动态不建临时层仍换图）。WALLPAPER_PULL_BASE_URL 传**站点根**（与 UI_SMOKE_BASE_URL 同形，不带尾斜杠），默认 http://localhost:4322，需先 `pnpm build && pnpm preview --port 4322`；判据相位一律由真实状态定义（等背景地址落定／临时层归零／--wpull-pull 归零），不用固定 sleep
pnpm smoke:pelican      # 鹈鹕骑车 /pelican-bike/ 实机烟测（vendored Three.js 单文件游戏，25 项判据：HTTP 200 / body.ready / canvas 与 window.__pelican / 两处返回入口 / 署名与 .tools 恒为 8 / 零外部请求 / 开局状态机 / 六档视口几何 / Tab 环 / 真实点回主站 / pageerror 与 console.error 双零；实测 25/25，**需先 `pnpm build && pnpm preview --port 4322`**）；PELICAN_BASE_URL 传**站点根**（脚本自己拼 /pelican-bike/，与 FANCY_BASE_URL / UI_SMOKE_BASE_URL 同形，不同于 NICE_BOOKS_BASE_URL 的**完整页面地址**）。默认 http://localhost:4322 而非 127.0.0.1——Astro preview 在 Windows 只绑 [::1]，与 test:fancybox / smoke:ui 同口径。全脚本没有一个 waitForTimeout，等的是 body.ready / body.started / #intro 的 computed visibility 三个真实状态信号
pnpm qa:weather-mainland  # wttr.in 大陆直连实测（issue #67 那道发布门已由站长本人在大陆网络实测并裁定通过、票已关闭；本工具留作复测。必须在大陆网络跑并用 $env:NET/$env:WINDOW 标注，缺这两栏不算证据，境外出口机只作旁证）。默认 API 直连 10 次，`-- --site` 量首页侧栏卡片整路径（注入北京粗坐标，因此不测浏览器定位），`-- --rounds N`、`-- --with-egress`；细则见 `docs/agents/weather-capsule.md`
pnpm build:weather-cities  # 重新生成 public/weather/city-catalog.js（367 个地级市官方中文名+中心点，数据源阿里 DataV 行政区划图集；显式运行、不进 pnpm build，需网络）
pnpm build:weather-bg -- --from <目录>  # 重新导出侧栏天气卡的 7 张壁纸 public/weather/bg/<kind>.webp（502px 宽保竖向原高；显式运行、不进 pnpm build，输入是站主的 640px 原图、不入库）
pnpm build:favicon         # 从 public/images/avatar.png（站长头像，1080×1080）重出 favicon.ico 到两处使用点（根 / public/domain/），16/32/48/256 四档 PNG 内嵌；显式运行、不进 pnpm build，不引第三方 ico 库
pnpm audit:ledger <票册.md> [--offline]   # 票册自检：把票册「本文件怎么用」一节写成可跑判据（R1 编号票要有镜像／R2 状态行唯一且终态／R3 无未勾判据／R4「已验收」须引用在 HEAD 链上的 sha／R5 镜像 issue 已关闭／R6 划掉的判据须写「作废」）。R5 是唯一依赖网络与令牌的一条，`--offline` 跳过它并在结论行写「R5 未验」；跳过时不得报无保留 GREEN。刻意不接进 pnpm build 与 CI（断网会让构建假红，票册只在收口期自检）；issue 快照刷新命令见 scripts/ledger-audit.mjs 头注释
pnpm format      # Prettier 格式化（tabWidth 4, useTabs true）
```

### 本地预览该用哪一条（2026-11-02 立）

- **Astro 7 本地监听（2026-11-02）**：`astro.config.mjs` 的 `vite.server.watch.ignored` 排除 `.pnpm-store` / `output`。Windows 上监听大量缓存/审计文件曾使启动阻塞到内容 RPC 超时，不能仅看首页 200 判断正常；检查日志有 `Synced content`、实际文章存在，以及内容/CSS/Svelte 的改动与恢复确实热更新。`pnpm dev` 会检查已有 dev server，换端口也不会绕过；先确认并停止本轮启动的旧进程，不要直接替换用户的服务。证据见 `docs/plans/2026-11-02-astro7-upgrade.md`。

- **`pnpm dev` / `start.bat`（= `pnpm start --open`）就是 `astro dev`**，两者同一个命令；日常改样式、验交互、验 Pio 用它即可，热更新、无需构建。
- **`pnpm preview` 只是给「构建产物」用的**：验 `dist/` 相关的东西（`public/` 下不经构建管线的文件、`pio.css` 改动、pagefind 索引、需要在产物里才成立的行为）才需要它。preview **默认也用 4321**，与 dev 撞端口时显式 `--port 4322`。
- **建产物只跑 `pnpm exec astro build` 就够了**，不要为了预览跑整条 `pnpm build`——后者还串了 `fetch-github-*` / `fetch-friend-icons` / `generate-lqips` 等联网脚本，慢且易被网络拖垮。
- **本机构建只需设 `NODE_USE_ENV_PROXY=1`**（与 AGENTS.md 的既有口径一致）。2026-11-02 实测纠正过一条错记：当时记录「必须同时设 `HTTPS_PROXY`、缺一即红」，但该次 A/B 对照**本身失效**——实验 shell 里 `HTTPS_PROXY` 本来就是未设置状态（`env -u` 清了个空），两组跑的其实是同一条件；两组都 exit 0、都没有 `No fonts are loaded`。结论回到既有口径：设 `NODE_USE_ENV_PROXY=1` 即可；仅当该变量开启后仍报字体错误时才考虑补 `HTTPS_PROXY`。

注意：Windows 上 pnpm build 失败时尾部可能看不到完整错误（esbuild 崩溃断言），务必看完整输出而非 tail。

## A-8 全页非预期错误门禁

`pnpm smoke:console` 手工检查 `scripts/lib/smoke-pages.mjs` 的 `AUDIT_PAGES` 声明集合。先构建并启动 preview；`CONSOLE_BASE_URL` 默认 `http://localhost:4322`，必须是**不带尾斜杠的站点根**。`CONSOLE_REPORT_PATH` 默认 `output/console-smoke.json`，保存逐页原始事件、分类理由、完成数与观察窗口。实现与本地验收记录见 `docs/plans/2026-10-28-a8-console-gate.md`〔2026-10-30 已归档，全文见 `docs/history/history.md`〕、[issue #108](https://github.com/CaiYan12/caiyan12.github.io/issues/108)。

`pnpm test:console` 运行脱网的真实 headless Chromium fixture 测试；不依赖 preview，不访问真实第三方服务。两条命令均**不接 CI 或完整 build 链**，不能用这套测试替代既有交互烟测。

“全页”指声明集合中的逐页直接导航，不是 sitemap 全量或所有交互。每页导航前挂监听；DOMContentLoaded 最多等 30 秒，之后至少观察 10 秒，并要求本站请求归零、连续 500ms 静默，观察最多 20 秒。本站挂起或导航超时明确失败；外站长连接不阻塞完整性。固定观察窗口用于采集错误，不用于推断动画或几何状态。

最终结果分三态：`PASS` / 退出 0；`FAIL` / 退出 1；`REVIEW`（待裁定）/ 退出 2。只有 PASS 的 `ok` 为 true；采集过程中为 `RUNNING`、`ok:false`，不能拿完成页数当作通过页数。

任意来源的 pageerror、主动 console.error、来源未知错误，以及本站非预期 HTTP / 请求失败均阻断。浏览器资源错误只有与已采到的资源失败关联后才分流：未经确认的第三方网络问题进入 REVIEW，不再因来自外域就整体 PASS；已确认的 Iconify 冒号形式 SVG 图片地址返回 404 判为 FAIL（本站错拼路径，见本项调查记录）。Giscus 404 必须同时验证 GET、精确 origin/path 与 `Discussion not found` 正文，才标为预期。只有当前被访问的 `/this-page-should-404/` 自身 document/fetch 的 404 被精确放行，其状态另有断言，页内其他坏资源仍失败。FAIL 优先于 REVIEW；所有记录保留。

站长另行接受两条精确环境例外：① loopback 本地来源、主 frame 的精确 `https://myhkw.cn/player/err.mp3` media 请求发生 `net::ERR_ABORTED`，且当次精确授权提示文字具备 CSS 可见状态和非零文字盒、`#myhkaudio` 的音源为 `https://myhkw.cn/api/tts`、`readyState ≥ 2`、`error:null`，才标为预期；生产与条件缺失不继承。CSS 可见不等于首屏可见，不额外要求视口相交。媒体状态只在候选匹配时读取，另设最多 2 秒上限，超时保留 REVIEW 并记录原因。② 精确 `https://static.doubleclick.net/instream/ad_status.js` script 请求发生 `net::ERR_CONNECTION_CLOSED`，且实际请求 frame 是 `https://www.youtube.com/embed/…` 子帧，才标为预期。两者都不拦截请求、不删除日志、不放行主动报错；视频例外不表示每轮主动点播验证。调查与裁定见本项实施计划。

## 冒烟台子与指纹比对的三条承重契约（2026-10-27 立）

> 这三条此前只写在代码头注释里（`scripts/lib/smoke-harness.mjs` 与 `scripts/upgrade-style-audit.mjs`），命令清单里查不到。踩过一次就当已解决，下次换个会话还会再踩一遍——所以搬到这里。

- **`makeHarness` 契约（触发：新写或迁移任何一套 `smoke:*` / `qa:*`）**
    - **签名是 `check(name, ok, detail, extra)`，参数顺序不可换。** 历史坑：`nice-books-geometry-qa.mjs` 的旧签名是 `check(ok, message)`，与其余脚本**顺序相反**；一行判据从一套复制到另一套会静默错位——`ok` 收到一个非空字符串（真值），于是**永远 PASS**。迁移或新增时必须按 `(name, ok)` 写；把那两套统一过来的活记在盘点台账的 A-5 条。
    - **`isNoise` 必须写在调用点，不许塞进台子。** 台子不预设放行清单——放行名单是缺陷的藏身处，每条都得可被读到。
    - **`createSink()` 的 `checkClean` 游标按汇各存一份**，不共用整数。共用时 A 汇先收 5 条、再查 B 汇，B 的前 5 条会被当成「上一段已报过」而漏掉；多页面场景（离线快照另开一页）必须各建一个汇。
    - **`finish()` 的退出码只按判据成败决定**，`checkClean` 报的错是否算失败由各 smoke 自己的判据担，台子不重复计。
- **base URL 的结尾斜杠（触发：给任何 `*_BASE_URL` 传值，或写 `base + "/path"`）**
    - **两种形态不能混**：`FANCY_BASE_URL` / `UI_SMOKE_BASE_URL` / `SERIES_BASE_URL` / `PELICAN_BASE_URL` 传**站点根**（脚本自己拼路径）；`NICE_BOOKS_BASE_URL` 传**完整页面地址**。传错的表现是「选择器等不到」的假失败，不是报错。
    - **站点根不能带结尾斜杠。** `https://x/` 加上脚本里的 `base + "/posts/..."` 会拼出 `//posts/...`，浏览器按**协议相对 URL** 解析它（host 变成 `posts`），于是一整段 `Failed to construct 'URL': Invalid URL` 与 replaceState 拒绝全是脚手架自己造的——2026-09-25 就这样把一次线上复跑读成 20 项红。
    - **判形态看 `new URL(base).pathname`，不看结尾有没有斜杠**：站点根写成带斜杠时结尾也有斜杠，光看结尾区分不出「站点根」与「目录地址」。`makeHarness` 启动时会把这个形态打在 `[smoke]` 那行里，先读那行再怀疑判据。
- **norm 聚合与顺序无关比对（触发：给任何页面拍样式指纹、或判「只有预期项变化」）**
    - **采集期归一化**：`norm(s)` 把 `url(#xxx)` 里的随机 id 换成 `(#ref)`——mermaid 等库给元素与引用随机命名，不归一化则同码连采两遍也会不同。
    - **比对期归一化**：宿主地址（`localhost:<port>` 与线上域名）替换成 `/`；`html.swup-enabled`、`body.transition-swup-*` 以及 `is-changing|to-page-load|removing|leaving` 这些 swup 切页瞬间的类名一并抹掉——采集时机不同就会出现「local-only」假阳性。明月浩空播放器（`myhk` / `musicbottom` / `musicheader`）是远端三方件、随远端响应变化，整行剔除。
    - **归一化后必须重算 sha**，否则「仅端口不同」会被判成整页差异。
    - **顺序无关比对**用 `bag()`：去掉每行的位置段、只比「元素标识 + 样式」这个多重集合，并额外忽略 `background-color`（药丸六色按 `nth-child` 轮换，换位置就换颜色，属位置派生而非规则变化）。判出 `reorder-only` 不等于零差异，但等价于「每条样式都相同、只有名次换了」。
    - **`load()` 之后 `p.sha` 已被重算过**，所以想看原始摘要只能读 `index.json` 里 capture 时写的那份。

OG 图端点在**构建期**从 `fonts.googleapis.com` 拉字体交给 satori，本机网络抖动会让 `astro build` 以 `Error: No fonts are loaded. At least one font is required to calculate the layout.` 失败（日志里伴随 `host: 'fonts.googleapis.com'` 的连接错误对象）。这不是代码问题：先用 `curl -o /dev/null -w "%{http_code}" https://fonts.googleapis.com/css2?family=Noto+Sans+SC` 确认连通性，再重跑 `pnpm build` 即可（2026-09-20 实测一次抖动、随后两次全绿）。

## 样式 A/B 的五条判据纪律（2026-11-04 立，Tailwind v4 迁移实测得出）

> 这五条是本轮踩出来的，每一条都曾让一个**假结论**差点成立。适用于任何「升级后站点外观是否改变」的验收。

- **预览服务器会把所有路径返回首页 —— 指纹采集会拿到假数据。**
  `serve -s dist`（SPA fallback）、`astro preview`、Python `http.server` 三种都踩过：访问 `/posts/xxx/` 返回的是首页 HTML。
  **症状**：指纹采集显示所有页面元素数完全相同（本例采集的每一页都是 851 个元素）、多页 sha 一致、连 404 页都和文章页同 sha。
  **正解**：自写静态服务器，按 Astro 的 `trailingSlash: "always"` 把 `/a/b/` 映射到 `/a/b/index.html`，**不做 fallback**。改正后元素数应各异（851 / 1078 / 2308 / 332 …），404 页只剩几个元素。
- **截图对比必须先定噪声底线，且要区分两类随机源。**
    - **运行时随机**：背景壁纸是 `Math.random` 从 4 张候选里选一张（`src/utils/wallpaper-candidates.ts`，候选池见 `src/config.ts` 的 `backgroundConfig.images`），**每次加载都不同，覆盖整页** —— 是差异的最大来源。
    - **构建期随机**：侧栏「手气不错」用 `shuffleArray` 挑 8 篇文章（`src/components/widget/WidgetNewLog.astro`），**两次构建之间就不同**。
      本例实测：不排除背景层时 `/archive/` 的构建间噪声高达 29.96%，数字没有判据力；排除后降到 4.58%，而 v3-vs-v4 的 4.13% 落回噪声内。
      **噪底线要用「两份独立构建」量**（同版本连拍两次会低估，因为后者的随机内容来自同一份产物）。
- **判断某条规则是否生效，必须用真实 DOM 结构量，不能用手写 fixture。**
  本例曾用手写 fixture 测出「导航项 padding v3=18px / v4=0px，导航挤成一团」的**假回归**；真实 DOM 里 `<nav class="head-nav"><div id="nav"><ul class="nav"><li class="common">`，而 `#menu-index > li{padding:0}`（ID 选择器，特异性 1-0-1）本就压过 `.head-nav .nav>li`（0-2-1）——**v3 与 v4 实测完全一致（pad=0px）**。fixture 缺了 `#menu-index` 就让结论整个反过来。
  配套：**量「差异是否可见」要按渲染语义筛，不能按属性名筛**。本轮 23 页指纹的元素级差异里，差异属性只有 `border-*-color` 两类（v3 的 gray-200 → v4 的 currentColor）；但**只有 `border-width > 0` 时颜色才渲染** —— 另取 6 个页面逐个量所有有边框的元素（每页 219–556 个），**边框颜色 0 处不同**，其余差异全部落在 `border-width = 0` 的边上，不可见。**验收口径因此是「可见差异为零」，不是「差异条目为零」。**
- **「文档高度差 1px」这类小数级差异，不能只看属性名筛，也不能只看那条规则的声明。**
  本例 `/books/` 页 v3 = 2223px、v4 = 2222px（固定差 1px，非噪声）。逐元素二分定位到那个段落高 21px vs 20px；CDP 权威级联显示**两条相关规则的声明看起来完全一样**（`.text-\\[0\\.85em\\]{font-size:.85em}`，两版一致），差异来自**继承**：v3 的 `.text-sm{line-height:1.25rem}` 是**绝对值**，v4 的 `.text-sm{line-height:var(--tw-leading,var(--text-sm--line-height))}` 是**比值** `calc(1.25/0.875)` —— 子元素按自身字号重算（20px → 17px），混排行盒少 1px，其后内容整体上移。
  配套两点：① **v4 把字号 utility 的 line-height 从绝对长度改成比值**，凡是父级用 `text-*`、子元素用 `text-[<em 值>]` 的组合都要复核；② **修法不能用 `leading-[inherit]`** —— `inherit` 继承的是比值不是计算值，实测无效，要写绝对长度。
- **样式测试可能对 CSS 缩进有硬依赖**：`src/nice-books/styles/styles.test.ts` 用 `@media \\(hover: hover\\) and \\(pointer: fine\\) \\{[\\s\\S]*?\\n  \\}` 提取块，靠「2 空格缩进的 `}`」作块尾标记。站点规则移出 `@layer` 后 Prettier 把块内缩进从 4 空格改成 2 空格，该正则就匹配到块内某条规则的收尾而非块尾，断言随之失配（`pnpm test:nice-books` 报 `.nb-book-card:hover .nb-book3d` 匹配失败，而 CSS 规则本身完全正确）。**改法**：匹配 0 缩进的块尾 `\\n\\}`。**教训**：凡是靠缩进/空白定位 CSS 片段的断言，改 CSS 结构或重排格式后都要重跑；「测试红但规则看着没错」先怀疑断言对格式的依赖。

## git 远端状态与提交区间的表述纪律（2026-10-30 立）

> 源自两次真实纠正：交接文档曾把「`HEAD` == `origin/main`」写成对 GitHub 远端当前 SHA 的确认，实际只核对了本地跟踪引用；台账 §3.3 曾把 `6852f88..HEAD` 写进历史统计，HEAD 前进后区间漂移（叙述为 6 笔提交，实测 5 笔）。

- **述远端状态分三档，各附查询时点**：① 本地跟踪引用 `origin/main`（未 fetch 时的只读近似）；② fetch 更新后的本地引用；③ 对远端的直接查询（`gh api` / `gh run list` 等）。三档都只是查询时点的事实，不构成永久保证；写进文档时注明当时依据哪一档。
- **述历史提交区间用明确起止 SHA**（如 `6852f88..d67689b`）：`HEAD` 会随新提交前进，凡需要事后复核的区间统计，起止都必须落死在 SHA 上。

## 证据目录清理的记录约定（2026-10-30 立）

> U-2 核验时发现 `output/` 在 2026-10-27 与 10-30 之间发生过无记录变更，`fp-t3-*` 等历史证据产物消失且成因不可追溯——本节防复发。

清理（删除、清空、迁移）`output/` 等证据目录时记录四件事：操作**时间**、**范围**（文件清单——条目数不能替代清单）、**归档位置**（如有）、**结果**（完成 / 部分 / 失败）。有工作日志则记录于日志；存在相关交接时同步必要信息，不要求为每次清理新建交接文件。条目数也不能据此推断未知历史。不新增快照脚本，不追补猜测性的旧记录。

## 脚本输出编码：Windows 控制台是 GBK（2026-11-03 立）

> 源自本轮实测两次崩溃。规矩是「脚本只打 ASCII」，理由不是洁癖——GBK 编码器根本不接受这些字符，脚本会直接死在 `print` 上。

- **现象**：本机 Windows 控制台编码为 GBK，Python 脚本 `print` 里带中文或 `✅` 会抛
  `UnicodeEncodeError: 'gbk' codec can't encode character '\u2705' in position 3: illegal multibyte sequence`。
  最小复现：`printf 'print("ok \u2705")\n' > t.py && python t.py`（2026-11-03 实测稳定复现）。
  Node 侧同理：含 emoji 的 `console.log` 在部分重定向场景下也会失败。
- **应做**：脚本 stdout 只输出 ASCII；中文与 emoji 一律不进 `print` / `console.log`。确需输出中文时，Python 显式 `sys.stdout.reconfigure(encoding="utf-8")` 或设 `PYTHONIOENCODING=utf-8`；结论文字写进**文件**（UTF-8），让调用方单独读取，而不是打在控制台。
- **长脚本一律写文件再跑**（`node <file>` / `python <file>`），不要塞进 `bash -c` 的 heredoc。2026-11-03 实测两次被 shell 吃掉转义：正则 `/^[^/]+\.md$/` 写进 heredoc 后变成 `/^[^/]+.md$/`——点号失去转义、能匹配任意单字符（`README-amd` 也会命中）。**这类错误不会报错，只会让判据静默变宽**，因此更危险。
- **判据自查**：把正则或字符串放进脚本文件后，先拿 3–5 个边界用例跑一遍再使用（本轮用 8 个用例才发现 `.md` 未转义）。

## 文档同步的历史代价（2026-11-03 立，自 `AGENTS.md` 下沉）

> 这三件事是「改了代码就改文档」这条硬规则的由来。读过一次就够了，不需要每轮都占 `AGENTS.md` 的位置。

Pio「dev 下不渲染」的过期结论误导了一整轮排查；挂件里硬编码镜像导航宽度导致首帧错位 187px；CHANGELOG 空窗三周，2026-10-01 ~ 11-01 的九批变更事后才补。

三条的共同点：**过期文档不会报错，只会让人按错误方向排查或补记**。第一例烧掉了一整轮排查，第二例是硬编码量值不改的后果，第三例是「等下次一起补」的代价——那次补记只能从 `git log` 反推事实，当时的实测读数全丢了。
