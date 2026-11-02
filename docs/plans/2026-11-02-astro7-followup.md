# Astro 7 验收剩余项收口

日期：2026-11-02。接续 [升级实施记录](2026-11-02-astro7-upgrade.md)。用户已授权处理剩余问题，保留此前全部未提交改动；不推送、不部署。

- [x] 阶段一：复核图标响应、文集防抖采样相位与相册错误采集缺口。验收：每项有当前源码与可复核证据；不靠重跑次数宣称修复。
- [x] 阶段二：最小修正已证明的问题。验收：图标不再依赖访客外域请求、视觉保持；文集测试能真实区分防抖与在飞追新；相册错误可定位且不被遗漏；两处链接宽度按旧版恢复。
- [x] 阶段三：构建、相关测试及浏览器回归，更新上下文。验收：完整采集 console 页面集合；文集/灯箱的检测口径有效；已确认 opaque 来源，不新增宽泛放行。

本轮原始证据与一次性诊断放 `output/astro7-followup/`。只修复本轮有证据的缺陷；不升级其他依赖，不替换既有设计语言。

## 图标：去掉访客外域依赖

当前 Iconify `/prefix/name.svg` 地址正确，Node 实际请求返回 200 / SVG；浏览器原记录为 `ERR_BLOCKED_BY_ORB`，不能把它写成错拼 URL。用脱网浏览器先证红（`skills-red.log`）：原技能图标均依赖外域，无法解码。`src/pages/skills.astro` 现改用本地 `public/skill-icons/<prefix>/<name>.svg`，保持原标识、原 SVG 字节及首字回退；不修改图形和配色。

手动 `node scripts/sync-skill-icons.mjs` 验证 HTTP 状态、SVG 类型、结构与危险外部引用后写入资源及来源记录，不进普通构建链。本日保存 34 个 SVG，逐一校验 SOURCES.json 的 SHA-256；许可来自 Iconify 集合元数据，附上游作者、源 URL、MIT/Apache/CC0 原许可副本，Arcticons 的 CC-BY-SA-4.0 来源与作者在 README / SOURCES.json 保留。SVG 原文件加入 Prettier ignore，JSON 仍由统一 formatJson 写入，保护来源哈希。

`pnpm smoke:skills` 在 1280 / 390 两档主动阻断外部网络、强制所有懒加载图标解码；4/4 通过，所有图标均来自本站且未落入首字回退。它只验证图标，不能代替全站 console 门禁。

失败路径保留：首次下载脚本误用 `formatJson` 的参数次序，资源下载完但来源 JSON 写入失败；按实际 `(filePath, data)` 签名修正后完整重跑成功。GitHub 未认证 API 请求许可目录返回 403，改为 `gh api .../license` 取得实际 raw URL，再保存许可正文；未安装额外依赖。

## 文集：修复真实的到期/rAF 竞态并修正烟测前提

旧定时器只比较 `revealPendingIndex` 与缓存的 `activeIndex`。阅读位置已经变化、但 scroll 的 rAF 尚未更新缓存时，旧定时器会启动动画；随后 rAF 进入“已有动画追新”分支，绕过新目标应有的静默期。

`scripts/article-toc-browser.test.mjs` 用真实 Chromium DOM、生产 TS 源码和可控时钟验证两种相位，目标几何独立计算为 scrollTop 1415 / 1265。到期前 4ms 改变阅读位置，并明确断言旧定时器尚未触发；修复前在最新目标静默期已滚到 1354，期望仍为 1415（`toc-race-valid-red.log`）。定时器到期先现量真实阅读索引，若变化则交给 update 重排防抖；修复后两项均通过（`toc-race-valid-green.log`），未改动画时长、手动让位或在飞追新策略。

调查时曾用固定“第112ms”作为边界；实际首次 rAF 的相位会使旧定时器此前已经触发，所以那组失败不算 bug 证据。后改为观察真实定时器 deadline，显式自证“尚未触发”，才形成上述红绿证据。

真实文集烟测也有两个前提缺口：接近中心 ±2px 不能证明前段动画已经结束；同步连发 scrollTo 会被合并，不能证明真的出现两次激活。现先等连续 8 帧静止，再用 MutationObserver 确认首次激活后立即反向，记录时间差且不自动重试洗绿。到期相位边界由独立测试负责。

## 相册：opaque 错误归属和采集修正

播放器原始脚本的跨页规则已确认：`myhk_player_load` 为 true 且 `myhk_player_feed` 心跳不足 1000ms 时，另一同源页面会抛“明月浩空音乐播放器已在其他页面加载！”。`player-multitab.json` 在同一次第二标签访问中同时采到该真实 pageerror 和 DOM 的 `Script error.` / 空文件名 / null error；隔离 context 后播放器正常出现且没有错误。因此此前 opaque 错误已定位到供应商的跨页互斥守卫，不是 Vite 自身抛错，也不是凭一次干净重跑推定来源。

`fancybox-smoke.mjs` 原来只监听首个文章页，现在所有页面都挂错误与本地请求失败采集；同时独立场景使用独立 browser context，避免旧场景留下的活动播放器污染下一场景。全页采集但未隔离时已实测失败（`fancybox-all-pages.log`），隔离后 dev 27/27（`fancybox-isolated.log`）。没有修改/屏蔽供应商错误、改写其 storage 心跳或绕过播放互斥，真实多标签互斥仍按上游规则执行。

## 两处动作链接：恢复旧版宽度

Astro 6 的条件 JSX 输出相邻图标/文字节点；Astro 7 会在换行处加入空白。实际宽度：热门推荐链接 60.4375→63.140625px，文集目录链接 62.15625→64.859375px。仅这两个 JSX 动作使用固定字面量 Fragment `set:html`，让图标和 span 保持相邻，继续使用既有 3px 图标 margin；不新增 CSS，不接用户或外部 HTML。其余动作不改。

`link-widths-red.json` 保存原差异，`link-widths-green.json` 保存修复后的精确匹配，文章目录的 `#toc` 动作也随同检查保持原宽度。

## 最终验收与边界

- Windows / Node 24.18.0：`pnpm check` 为 0 errors / 0 warnings / 6 hints；`pnpm test:utils` 261/261；`pnpm test:article-toc-browser` 2/2。静态构建 229 页，再执行 banner 与 Pagefind；日志为 `check.log` / `utils.log` / `toc-race-valid-green.log` / `build.log`。
- 当前生产产物：console 门禁完整采集 23/23 页且为 **PASS**（`console-final.json` / `.log`）；技能页的外域 REVIEW 已消除，没有修改分类器或加放行。
- 当前产物的文集 88/88（`series-production.log`），灯箱 27/27（`fancybox-production.log`），dev 亦通过灯箱 27/27 和真实文集 88/88。新增图标脱网两档验证 4/4。
- 相册故障注入：仅向轻松一刻相册加 `throw new Error("album-coverage-probe")`，同一套灯箱流程明确失败在“全程无 console/page 报错”，退出 1。调用方确认退出码及探针文字，证明后续页面没有漏采；`fancybox-fault.log` 保留预期失败证据。原始产物未被注入修改，故障只在临时静态服务器响应中。
- 一次独立只读审查未发现新增运行时阻塞；指出 MDI 上游文件是摘要，需要完整 Apache-2.0，已补官方全文及来源/hash，未删除上游摘要。
- 许可补齐后再次静态构建 229 页（`build-final.log`），banner / Pagefind 后处理通过；最终产物的技能脱网测试 4/4、AI News 所有权检查通过；SVG/许可的来源 hash 与 dist 副本逐一匹配。两处链接在生产产物也精确对齐旧版（`link-widths-production.json`）；技能页桌面/移动的总览与图标卡片截图已实看，未见图标溢出或卡片错位。冻结严格离线安装、全 src/docs 及本轮脚本/资源元数据的 Prettier、`git diff --check` 均通过。
- 上游播放器的真实多标签互斥仍保留。这轮修正的是独立测试的状态污染和错误采集，不承诺多个标签同时播放。未推送、提交、部署或验证线上 CI；此轮不扩展到独立 AI News。
