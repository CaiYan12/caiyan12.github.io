# Spec：访客所在地天气胶囊（wttr.in 单源）

- 日期：2026-09-28（Asia/Shanghai）；2026-09-29 按站长裁决收敛为 wttr.in 单源
- 镜像 issue：[#60](https://github.com/CaiYan12/caiyan12.github.io/issues/60)
- 状态：**已实现、已上线、七票全部结案**（子票 #61–#67 全部 CLOSED，父规格 #60 于 2026-09-30 随之一并关闭；收口时 `pnpm audit:ledger docs/plans/2026-09-28-weather-capsule-plan.md` 为 GREEN）（`84fed51` 单源实现 → `249affe` 视觉与图标资产化 → `64a6192` 门禁修复 → `704b820` 中文地名本地解析 → `c302a8b`/`7870d1f`/`e133e11` 版式与参数行 → `f376b29` 严格绑定侧栏；三条工作流全绿，线上 `Last-Modified` 已核对）。最后一道门（wttr.in 大陆直连实测）已由**站长本人在大陆网络实测并裁定通过**，#67 关闭 —— 读数由站长持有、未入仓库，故本台账记录的是站长裁定而非可复核数字。数据源切换议题已关闭（见下「已作废条款」）。
- 术语：根目录 `CONTEXT.md` 的「访客所在地天气」「附近城市」「天气胶囊」；`/domain/` 继续遵守 `docs/adr/0002-domain-page-independent-shell.md`
- 范围：主站所有原本显示侧栏的页面，以及 `/domain/` 既有天气行
- 来源：本轮站主逐题裁决（全文见 `docs/history/qweather-settingup-history-sessions.md`）、`README.md`「附近天气胶囊」、`docs/weather-api-research.md`、当前源码

## Problem Statement

主站没有天气胶囊。`/domain/` 虽有天气行，但改造前的脚本会尝试浏览器定位、失败后**按 IP** 调 wttr.in；如果脚本本身未加载，HTML 中的「天气加载中…」会永久保留。访客无法明确知道天气对应的地点、数据来源和失败原因。

## Solution 与裁决边界

1. **产品形态。** 展示访客授权定位对应的「附近城市」当前天气，不把粗略城市名说成精确行政归属；定位失败**不按 IP 猜**。主站桌面侧栏第一项是「附近天气」小部件，手机上放在主内容前；`/domain/` 只修天气行为，保持终端外观。
2. **数据源只有 `wttr.in`。** 一次 GET 同时返回附近区域与当前天气，无需凭据、无需代理、无第二来源。
3. **本站不引入需要保管密钥的天气数据源。** 见「已作废条款」。

## 二次改判（2026-09-29，站主裁定）：天气只属于侧栏

首轮实现同时挂在桌面侧栏与 `≤768px` 主内容前。站主实机查看后裁定：**手机端任何页面都出现天气太违和，取消竖屏天气模块，把元件严格绑定为侧栏的子元件**。本文件所有涉及「手机挂载 / `.mobile-weather-slot` / 两个响应式挂载点共享会话 / 390 与 768px 各有一张可见卡」的条款一律作废，以本节为准；镜像票 #66 随之作废关闭，PLAN 的 06 票同样作废。

界面从三处收敛为两处：主站侧栏首位、`/domain/` 终端天气行。实现上不只是删挂载点——`#sidebar` 在窄屏只是 `display:none`、节点仍在 DOM 里，若照旧初始化，手机访客会为一张永不显示的卡被弹定位授权、并发出一条永远看不见的天气请求，这比视觉违和更糟。副带好处：`#content` 里从此没有天气节点，文章卡 `nth-child` 色带不再需要额外保护。

## User Stories

1. As a desktop visitor, I want one nearby-weather widget above the existing sidebar widgets, so that I can glance at local conditions on every page that has a sidebar.
2. ~~As a mobile visitor, I want the same weather information before the main content~~ —— **撤销（2026-09-29 二次改判）**：手机访客不需要天气卡。
3. As a visitor granting location access, I want the site to explain why it is locating me and then show a nearby city, current temperature, icon, and condition, so that the data has a clear meaning.
4. As a visitor refreshing the whole page, I want my location read again, so that moving to another city can update the weather.
5. As a visitor navigating within the site, I want the current weather result reused during Swup page changes, so that navigation does not repeat the permission prompt or requests.
6. As a visitor pressing the successful card's refresh button, I want only the weather reloaded for the current coarse location, so that I can update the reading without another location prompt.
7. As a visitor denying location permission, I want a reason-specific message and a retry action, so that I know how to recover without being assigned an IP-based city.
8. As a visitor whose location request times out, I want the loading state to end and a retry action to appear, so that I am not left waiting indefinitely.
9. As a visitor using a browser without geolocation support, I want an explanatory static failure state without a futile retry button, so that the page does not imply it can fix missing browser support.
10. As a visitor with JavaScript disabled or a blocked weather script, I want useful static text instead of permanent "loading," so that the page remains honest.
11. As a visitor near an administrative boundary, I want the city prefixed as "nearby," so that a neighboring city name is not misrepresented as my exact location.
12. As a visitor whose weather is available but city name is missing, I want the card to say "unknown city" rather than invent a place, so that a real reading still shows without a fake label.
13. As a visitor whose weather request fails, I want a clear failure state and manual retry; if a prior result exists in this tab, I want it marked as old, so that stale data is never presented as fresh.
14. As a visitor, I want the actual source and fetch time visible on the main card, so that I can judge where and when the reading came from.
15. As a visitor of `/domain/`, I want the existing terminal weather line to recover from failures without changing the page's terminal character, so that this independent page stays familiar.
16. As a keyboard or screen-reader visitor, I want announced status changes, usable refresh and retry buttons, and readable source links, so that the feature does not depend on hover or an icon.
17. As a visitor sensitive to motion, I want a gentler icon animation when my system requests reduced motion, so that the information stays comfortable to read.
18. As the site owner, I want the feature to add no credential, no proxy, and no second backend, so that a small widget cannot create a bill or an operational dependency.

## Implementation Decisions

### 页面与视觉

- `src/config.ts` 的 `sidebarConfig.widgets` 与 `src/components/layout/SideBar.astro` 是主站桌面入口；天气小部件排在现有 `blogger`（吐槽水军）**之前**，只在 `showSidebar` 为真的页面出现。复用 `WidgetLayout.astro` 及现有 `.widget` 白底、有边框、直角标题框架，不顺手重做侧栏。
- ~~`src/layouts/MainGridLayout.astro` 负责在侧栏隐藏的 `≤768px` 视口把同一天气组件放在主内容前~~ —— **作废（2026-09-29 二次改判）**：天气是侧栏的子元件，窄屏不显示也不初始化（`#sidebar` 在窄屏只是 `display:none`、节点仍在 DOM，故 `sidebar-widget.js` 的 `pageReady()` 按侧栏是否真的渲染来过滤挂载点）。两个响应式位置共享一份会话状态与同一轮请求，不得因两个 DOM 实例而定位或请求两次。新节点不得插入 `#content` 的文章卡片兄弟序列，避免影响现有 `nth-child` 色带。
- 标题「附近天气」；地点行「附近：{城市}」；温度与本地天气图标为主视觉，天气描述次一级，底部写「获取于 HH:mm · 实际来源」。时间是访客浏览器的**获取时间**，不冒充气象观测时间。摄氏度沿用 `/domain/` 既有口径。城市中文优先，来源未给中文时允许原文（wttr.in 对北京坐标实测返回 `Beijing`）。
- 天气图标用本地 SVG 资源、海洋绿强调，不加载供应商返回的第三方图片。图标默认轻微循环，支持 hover 的精细指针进入整卡时平滑增强，离开回到默认；文字与卡片不位移。触屏无伪 hover，`prefers-reduced-motion` 减轻运动。成功态在标题处有可聚焦刷新按钮。
- `/domain/` 保留 `src/domain.html` 与 `public/domain/css/` 的独立终端排版；成功态不加刷新按钮、不另加获取时间行；失败时可在天气行后显示同字体 `[重试]`。来源链接以终端语汇内联显示实际来源。

### 定位、状态与数据契约

- 整页载入调用浏览器 `getCurrentPosition()`：普通精度、`maximumAge: 0`、8 秒定位超时；仅授权成功后查天气。原始坐标只留在当前进程，不进 URL、日志、存储或第三方请求。对外发送前粗化到一位小数（约 10 公里尺度）；边界附近出现邻市属「附近城市」语义。
- 同一标签页内 Swup 导航复用当前结果；整页刷新重新定位并请求。主站成功态手动刷新**仅重取天气**，沿用本轮粗化位置；`/domain/` 成功态无手动刷新。不按 IP 回退，不做定时后台刷新。
- 唯一上游请求：GET `https://wttr.in/<lat>,<lon>?format=j1&lang=zh`。归一化结果：`{cityName（可空）, temperatureC, condition, description, conditionCode, icon, fetchedAt, source:"wttr.in", sourceUrl, stale}`。
- 天气请求失败（网络错误或超过 8 秒）**不自动重试**，直接进入可重试失败态。城市缺失但天气有效时显示「未知城市」与真实天气，不编造地名。本标签页已有成功结果时，失败可保留该结果但必须标为旧数据。
- 定位拒绝、定位超时、定位不支持分别给原因文本；前两者可重试，不支持则不放无效按钮。HTML 初始文案是「启用 JavaScript 后可查看附近天气」一类静态说明；脚本确实启动后才改「正在获取位置，用于显示附近天气」「正在读取天气」，不留永久「天气加载中…」。状态更新可访问播报；图标不重复朗读；按钮与来源链接支持键盘焦点。

## 已作废条款（2026-09-29 站长裁决）

以下 2026-09-28 的裁决**不再适用**，理由与当时的实现、已验证边界、配额账本终值和重启步骤一并留档在 `docs/history/weather-qweather-proxy/README.md`：

- 以和风天气为优先主源、wttr.in 作自动兜底的双源方案，以及「两来源总等待上限 12 秒（各 6 秒）」——单源后天气上限收回 **8 秒**。
- 独立代理保管 API KEY、`X-QW-Api-Key` 请求头、DPAPI 本机凭据流程、`/geo/v2/city/lookup` 与 `/weather/v1/current` 两次上游调用契约。
- 45,000 次/月原子截流、Cloudflare Workers Free + Durable Objects 选型、以及「大陆直连完整链路实测」这道发布门。
- 和风署名要求带来的「额外归因列表」渲染通道（`attributions` 字段、`[data-weather-attribution]` DOM 与对应 CSS）——wttr.in 单源下恒为空，已删除。
- 「城市查询最多自动重试两次后回退未知城市」——该判据依附于和风的两段式契约；wttr.in 一次请求同时给城市与天气，城市缺失即直接显示「未知城市」。

作废不等于验证通过：**`wttr.in` 自身在中国大陆网络下的可达性与耗时仍未实测。**

## Testing Decisions / Acceptance Criteria

1. **服务边界。** 在可注入 `fetchImpl` 的最高层服务接口离线验证（`pnpm test:weather`）：坐标只以一位小数粗化值进入唯一请求；正常城市+天气；城市缺失仍成功并给空城市；失败重试后返回同位置旧数据并标 stale；8 秒期限内挂起即 timeout 且 `sources` 为 `["wttr.in"]`。不访问真实网络。
2. **浏览器边界。** 基于 `scripts/lib/smoke-harness.mjs`，在 build + preview 的真实 Chromium 中覆盖：授权成功、拒绝、定位超时、不支持、天气超时、城市缺失、旧数据标记、手动刷新不重新定位、Swup 切页不重复请求、脚本加载失败与禁用 JS 不留死加载文案；断言计算值/可见状态/请求次数/ARIA 与键盘结果，不锁 CSS 源文本或行号。两个烟测：`scripts/sidebar-weather-smoke.mjs`（含窄屏零可见卡＋零定位＋零请求的负扫）与 `scripts/domain-weather-smoke.mjs`；原 `scripts/mobile-weather-smoke.mjs` 随手机挂载一并删除（见「二次改判」）。
3. **布局与动效。** 在 390 与 768px 确认天气**一处都不可见、且零定位零请求**（负扫，已做变异验证），769px 与桌面宽度确认恰有一处可见、侧栏顺序在吐槽水军之前、无横向溢出；默认与 hover 图标动效均可见，触屏无伪 hover，减少动态效果下运动减轻；`/domain/` 终端布局不被重排。
4. **既有门禁。** `pnpm check`、`pnpm test:weather`、`pnpm build`、两份天气烟测（`sidebar-weather-smoke` / `domain-weather-smoke`），并确认既有 `pnpm smoke:ui` 与 `/domain/` 返回路径无回归。
5. **来源诚实。** 卡片与终端行显示实际来源 `wttr.in`。**任何文档不得把没有读数的表现写成已验证数字**：大陆实测这道门的状态是「站长本人实测并裁定通过（#67）」，读数不在仓库里，所以不得转写成「P90 = 某毫秒」这类本仓库无法复核的表述；境外出口数字一律标注为旁证。

## Out of Scope

- 不做固定城市天气、按 IP 猜位置、访客手选城市、城市搜索、完整天气预报页、今日高低温、空气质量或天气预警。
- **改判（2026-09-29，站主）**：卡片原句把「湿度」也列为不做项，现予放开 —— 侧栏卡片增加通栏参数行 **体感 / 风力 / 湿度**。约束是三条：数值全部来自**同一份 j1 响应**（`FeelsLikeC` / `windspeedKmph` / `humidity`，零额外请求、零新上游）；**风向不显示**（wttr 的 `winddir16Point` 是英文十六方位，会重新引入一层翻译面）；今日高低温、空气质量与天气预警**仍然不做**。
- 不做构建期天气快照、后台定时刷新、浏览器持久化精确坐标、服务器端定位。
- 不重做 `/domain/` 独立壳、不把终端页纳入主站 Layout、不改播放器/Giscus 等既有外部资源策略。
- 不再引入需要凭据或需要自建代理保管密钥的天气数据源，除非重新经过「公开代理 + 大陆实测 + 零费用硬上限」三道门禁。

## References

- 仓库：`CONTEXT.md`、`README.md`、`docs/weather-api-research.md`、`docs/adr/0002-domain-page-independent-shell.md`、`src/config.ts`、`src/components/layout/SideBar.astro`、`src/layouts/MainGridLayout.astro`、`src/domain.html`、`public/weather/`、`public/domain/js/weather.js`。
- 归档：`docs/history/weather-qweather-proxy/README.md`（搁置的和风代理）、`docs/history/qweather-settingup-history-sessions.md`（Q1–Q62 决策访谈全文）。
- 官方：[wttr.in JSON 与用法](https://github.com/chubin/wttr.in#readme) · [浏览器 Geolocation](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/getCurrentPosition)。
