# 命令清单与每条命令的坑

> 全部 pnpm 脚本的用途、前置条件、env 变量形态与已知坑。命令名以 package.json 的 scripts 为准（唯一真源），这份是「每条命令的注意事项」缓存。**要跑烟测/单测/构建期取数/票册自检前读这份**。

（本文由 `AGENTS.md` 的「命令清单与每条命令的坑」一节迁出；内容逐字保留。）

## 常用命令

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
pnpm test:contributions  # 贡献日历数据脚本离线单测（node --test，注入 fetchImpl 不访问真实网络）
pnpm test:nice-books  # Nice Books 单测（数据契约/随机去重/搜索/封面，node --test，已串入 build 链头部）
pnpm test:site-stats # Giscus 同步单测（fetchImpl/输出路径全注入，无需令牌、0.6s，已串入 build 链头部）
pnpm test:utils      # src/utils 纯函数单测（content-utils 排序/评分/邻篇 + pagination canonical）
pnpm test:friend-icons  # 友链图标缓存单测（离线注入 fetchImpl，不访问真实网络）
pnpm smoke:ai-news   # MAIN_SITE_URL 为站点根（默认 http://localhost:4321/）；本地只检查桌面/移动入口 DOM
# 线上同源完整旅程：$env:MAIN_SITE_URL="https://caiyan12.github.io/"; $env:AI_NEWS_INTEGRATION_LIVE="1"; pnpm smoke:ai-news
pnpm test:ai-news-ownership  # build 后检查主站不发布日报文件且 sitemap 保留日报地址
pnpm smoke:series    # 文集（series）接线烟测，39 条判据：组内相邻 href／组内边界不渲染／非成员跳过整块／两行提示／侧栏目录／三页 200+封面／粘性跟随；SERIES_BASE_URL 传**站点根**（与 FANCY_BASE_URL / UI_SMOKE_BASE_URL 同形），需先 `pnpm build && pnpm preview --port 4322`；**不进 CI 只手工跑**
pnpm qa:nice-books-geometry  # Nice Books 统一 3D 几何运行时检查（默认 127.0.0.1:4321；NICE_BOOKS_BASE_URL 可覆盖。注意另一个 `scripts/nice-books-design-qa.mjs` 默认才是 4322 preview）
pnpm smoke:nice-books  # Nice Books 三页 Playwright Smoke；支持 NICE_BOOKS_BASE_URL 指向 build + preview
pnpm test:fancybox     # 灯箱 Playwright Smoke（关闭不跳位/焦点归还/定位按钮/下载新标签页/中文文案，需先 build + preview；FANCY_BASE_URL 可覆盖地址）
pnpm test:fancybox 打线上时 FANCY_BASE_URL 传的是**站点根**（脚本自己拼 /posts/... 与 /albums/...），而 NICE_BOOKS_BASE_URL 传的是**完整页面地址** —— 两者形态不同，传错会表现为「选择器等不到」的假失败。2026-09-20 起放大两项改为等原图解码 + 轮询到高度稳定，本地与线上均 27/27
pnpm smoke:ui           # 主站 UI 缺陷修复实机烟测（UI 整改票册的缝隙 A，需先 build + preview）；UI_SMOKE_BASE_URL 传**站点根**，与 FANCY_BASE_URL 同形。断言只落在计算值/几何/键盘结果/ARIA 属性上，绝不锁 CSS 源文本、类名字符串或行号；相对判据（"只有预期项变化"与"零差异"）由 scripts/upgrade-style-audit.mjs 的 24 页指纹 capture/diff 承担，其采集排除表现含 iframe.giscus-frame（远端 postMessage 改 class 与高度，否则同码连采两遍也会翻脸）；套件在 **context 级别掐掉 YouTube / Bilibili 请求**（`stubExternalEmbeds`）——文章正文里有裸的视频 iframe，而整套用 `waitUntil:"load"` 导航，load 要等这些子帧；它们可达与否取决于本地网络当时的状态，2026-09-30 实测两次 30s 超时把整套打断、失败点还随网络漂移，看着像新加判据的锅。判据不依赖外部视频站的可用性。**凡是读动画中间态/几何的判据，相位一律由状态定义，不用 `waitForTimeout`**：等 `getAnimations()` 落定、等计算值到达某个阈值、或逐帧采样要求每帧都满足不变量。2026-10-01 两条老 flake 就是这么来的——「票 22 Tab 首站」把 sleep 从 200ms 加到 400ms 仍是症状修复（`.skip-link` 未展开时 top = 10 − 2×37 = **−64**，那次读到 −39 就是走到约 34%）；「两段黑幕」等 2300ms 而它自己拉长的 2s 过渡实测 420ms 就落定，只剩 300ms 余量。同日把余下 23 处墙钟分桶扫完，又学到两条承重事实：**① `data-fancybox` 是 `initFancybox()` 运行时才给 `.post-context img` 打上去的**（构建期产物里根本没有这个属性，见 `docs/agents/emlog-mapping.md` 的「图片灯箱」条），所以凡以 `.prose img[data-fancybox]` 为入口的判据必须等它出现——睡固定毫秒会把「还没标记」读成「灯箱打不开」（变异：把产物里那次 `setAttribute` 换成别的属性名，「票 22：灯箱确实打开」与顶层层那条立刻 2 红、exit 1）。**② 站点脚本是模块脚本，`waitUntil:"load"` 必然晚于它执行完**，所以 `document` 级委托监听（`src/utils/site-modal.ts` 约 158 行的点击触发）在 load 时早已绑好，点击**之前**的保险睡眠纯属浪费；省下来的是点击**之后**该等的那一等：`#site-modal .site-modal__panel` 入场是 `scale(0.96)→1` / 220ms，未等落定读到的仍是 `matrix(0.96, …)`、控件底边少报 6px——量盒判据因此偏向假绿而不是假红。**③ 读「hover 有没有造成位移」必须用与滚动无关的坐标**：`scripts/ui-smoke.mjs` 的 `hoverProbe()` 取「视口坐标 + 每个祖先容器的 `scrollLeft`/`scrollTop`」。原因：Playwright 的 `hover()` 做 actionability 时会 `scrollIntoViewIfNeeded()`，目标若在 `overflow:hidden` 且内容超宽的容器里（`overflow:hidden` 仍可被程序化滚动），容器 `scrollLeft` 会被改动、容器内所有元素的视口坐标整体平移——那是**测试自己造的读数**，不是 hover 引起的布局位移。2026-10-26 实测：文章卡标题那行 inline 内容（标签 + 箭头 + 文集徽章 + 标题）约 787.9px 宽、超出 h2 内容盒 23px，h2.scrollLeft 由 0 变 23，「票 20：卡片标题悬停零布局位移」被读成位移 23px（2026-10-10 记的 30px 同源，见 issue #106）。**改判据口径后必须做变异验证确认它仍会咬**（往产物里注入 hover 改盒宽/改位置的真缺陷），否则等于把判据削弱成永远绿；也不许靠放宽阈值解决。另有一条**跨帧比较的判据，其「终态」必须等整棵子树**（`getAnimations({subtree:true})`）而不是父元素：该判据要抓的正是「子元素比父慢」，只等父的话缺陷会同时污染两个读数、差值互相抵消（变异实测：注入 4s 的子层黑，等父版读到 半程 −16.5/展现 −16.3 判据绿；等子树版读到 −87.2/−14.2 立刻红）。像素采样还要**每次重新量盒并复核截图前后盒未移动**——盒是视口坐标，量盒与截图是两次异步调用，中间任何 reflow 或滚动锚定都会让同一组像素落到别的内容上。**已知限制（站长 2026-10-01 裁定：只记录、不改代码）**：远端音乐播放器主机 `myhkw.cn` 抖动或不可达时，整套会在某个 `page.goto(..., {waitUntil:"load"})` 上 30s 超时**中途死掉，且不产生任何 FAIL 行**（实测两次：一次跑到 102 项后断、一次连首个导航都没过、0 项），看着像「套件没跑完」而不是「有判据红」——排查时先 `curl -w "%{time_total}" https://myhkw.cn/player/js/jquery.min.js` 与 `…/api/player/<id>`（后者是 302，重定向目标慢也会挂住 load），再决定重跑。**不能照 `stubExternalEmbeds` 把它掐掉**：`#myhkplayer` 是那段远端脚本创建的，票 22 比 z-index 的两条判据正读它，掐掉等于把那两条一起废掉。
pnpm smoke:pelican      # 鹈鹕骑车 /pelican-bike/ 实机烟测（vendored Three.js 单文件游戏，25 项判据：HTTP 200 / body.ready / canvas 与 window.__pelican / 两处返回入口 / 署名与 .tools 恒为 8 / 零外部请求 / 开局状态机 / 六档视口几何 / Tab 环 / 真实点回主站 / pageerror 与 console.error 双零；实测 25/25，**需先 `pnpm build && pnpm preview --port 4322`**）；PELICAN_BASE_URL 传**站点根**（脚本自己拼 /pelican-bike/，与 FANCY_BASE_URL / UI_SMOKE_BASE_URL 同形，不同于 NICE_BOOKS_BASE_URL 的**完整页面地址**）。默认 http://localhost:4322 而非 127.0.0.1——Astro preview 在 Windows 只绑 [::1]，与 test:fancybox / smoke:ui 同口径。全脚本没有一个 waitForTimeout，等的是 body.ready / body.started / #intro 的 computed visibility 三个真实状态信号
pnpm qa:weather-mainland  # wttr.in 大陆直连实测（issue #67 那道发布门已由站长本人在大陆网络实测并裁定通过、票已关闭；本工具留作复测。必须在大陆网络跑并用 $env:NET/$env:WINDOW 标注，缺这两栏不算证据，境外出口机只作旁证）。默认 API 直连 10 次，`-- --site` 量首页侧栏卡片整路径（注入北京粗坐标，因此不测浏览器定位），`-- --rounds N`、`-- --with-egress`；细则见 `docs/agents/weather-capsule.md`
pnpm build:weather-cities  # 重新生成 public/weather/city-catalog.js（367 个地级市官方中文名+中心点，数据源阿里 DataV 行政区划图集；显式运行、不进 pnpm build，需网络）
pnpm build:weather-bg -- --from <目录>  # 重新导出侧栏天气卡的 7 张壁纸 public/weather/bg/<kind>.webp（502px 宽保竖向原高；显式运行、不进 pnpm build，输入是站主的 640px 原图、不入库）
pnpm build:favicon         # 从 public/images/avatar.png（站长头像，1080×1080）重出 favicon.ico 到两处使用点（根 / public/domain/），16/32/48/256 四档 PNG 内嵌；显式运行、不进 pnpm build，不引第三方 ico 库
pnpm audit:ledger <票册.md> [--offline]   # 票册自检：把票册「本文件怎么用」一节写成可跑判据（R1 编号票要有镜像／R2 状态行唯一且终态／R3 无未勾判据／R4「已验收」须引用在 HEAD 链上的 sha／R5 镜像 issue 已关闭／R6 划掉的判据须写「作废」）。R5 是唯一依赖网络与令牌的一条，`--offline` 跳过它并在结论行写「R5 未验」；跳过时不得报无保留 GREEN。刻意不接进 pnpm build 与 CI（断网会让构建假红，票册只在收口期自检）；issue 快照刷新命令见 scripts/ledger-audit.mjs 头注释
pnpm format      # Prettier 格式化（tabWidth 4, useTabs true）
```

注意：Windows 上 pnpm build 失败时尾部可能看不到完整错误（esbuild 崩溃断言），务必看完整输出而非 tail。

## A-8 全页非预期错误门禁

`pnpm smoke:console` 手工检查 `scripts/lib/smoke-pages.mjs` 的 `AUDIT_PAGES` 声明集合。先构建并启动 preview；`CONSOLE_BASE_URL` 默认 `http://localhost:4322`，必须是**不带尾斜杠的站点根**。`CONSOLE_REPORT_PATH` 默认 `output/console-smoke.json`，保存逐页原始事件、分类理由、完成数与观察窗口。实现与本地验收记录见 `docs/plans/2026-10-28-a8-console-gate.md`、[issue #108](https://github.com/CaiYan12/caiyan12.github.io/issues/108)。

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
