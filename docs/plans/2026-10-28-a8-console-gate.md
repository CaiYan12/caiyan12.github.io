# A-8 全页非预期错误门禁实施计划

> 执行方式：本会话由主 agent 直接实施；采用 `executing-plans` 的逐项验证方式。站长未授权 commit / push；本计划的交付点为本地审阅。

- 正式立项：[issue #108](https://github.com/CaiYan12/caiyan12.github.io/issues/108)。需求以该 issue 为准。
- 来源：2026-10-28 两页 console 调查与站长「后续事务在你的会话中进行，继续」。
- 基线：`main` / `8898ce9`；两份既有 `src/constants/github-*.json` 漂移不纳入本项。
- 目标：声明页面集合中的每页均监听；本站非预期错误可阻断，预期 404 与第三方网络问题有可审阅记录。
- 架构：新建一个独立命令，复用 `AUDIT_PAGES` 与 `makeHarness` 的判据登记；保留丰富错误元数据，单页结束后分类。既有台子与套件不改。
- 技术：现有 Node、Playwright 与 node:test；不新增依赖。

## 全局约束

- 不改站点运行时、页面清单、样式、依赖、CI、既有门禁或完整构建链。
- 所有 pageerror、主动 console.error、本站非预期 HTTP / 请求失败均阻断。仅确认关联资源响应的浏览器资源报错可分流。
- 复核后的当前规则：未知第三方网络错误为 REVIEW / 退出 2；已确认 Iconify 冒号形式 SVG 图片地址的 404 为 FAIL / 退出 1；只有 PASS / 退出 0 时 `ok:true`。FAIL 优先于 REVIEW。
- origin 精确比较；无法识别来源不放行。例外只在新命令中声明，不进入共享台子。
- 只将当前被访问的精确哨兵 URL 的 document/fetch 404 作为预期；状态必须独立断言。
- Giscus “Discussion not found” 例外必须同时核对 origin、GET、路径、404 与 JSON 正文。
- 导航等 DOMContentLoaded，30 秒上限；观察至少 10 秒，本站请求归零且连续 500ms 静默，观察上限 20 秒。到期仍不完整就失败。报告回显窗口。
- 测试缝隙：新命令公共运行入口的返回报告 / 退出码。离线 fixture 用真实 headless Chromium 触发事件，不伪造内部采集器。

## 重点检查

1. 第二页才发生的错误不能漏掉，跨页不能互吞。
2. 哨兵例外不能吞其他 URL、图片资源或主动 console.error。
3. 外域脚本主动报错、无来源异常不能被外部网络 NOTE 吞掉。
4. response 404/503 与 requestfailed 是两类事件，必须都覆盖。
5. 本站请求挂起、导航超时和异常退出必须有失败报告，不能全绿。

## 阶段一：立项与基线

- [x] 核对调查、当前源码、术语与现有套件覆盖。
- [x] 查重 issue、核标签，用 `gh` 创建并读回 #108。
- [x] 记录工作区基线、两份 constants 哈希与现有 `_astro` 构建哈希。

验收：正式 issue 的范围、策略、窗口、测试和授权边界均明确；未动门禁代码前已立项。

## 阶段二：最小垂直切片

文件：新增 `scripts/console-smoke.mjs`、`scripts/console-smoke.test.mjs`；修改 `package.json` 仅增加两个手工命令。

接口：`runConsoleSmoke({ base, paths, reportPath, timing })` 返回结构化报告，CLI 通过报告的 ok 设置退出码。默认 paths 为 `AUDIT_PAGES`，默认 base 为 `http://localhost:4322`；`CONSOLE_BASE_URL` 为站点根，`CONSOLE_REPORT_PATH` 默认 `output/console-smoke.json`。timing 的缩短值仅用于离线 fixture 测试，不改变手工命令默认窗口。

- [x] 先写正常多页与第二页 console.error 的真实浏览器测试，实跑红证据。
- [x] 最小实现逐页监听、导航、观察、报告与退出码，测试转绿。
- [x] 逐个增加 pageerror、本站 404/503、请求中断、外域脚本主动报错的红绿切片。
- [x] 增加哨兵精确例外、Giscus 正文验证、第三方网络 NOTE 与不完整采集的红绿切片。
- [x] 增加 package 命令：`smoke:console`、`test:console`；不接完整 build 或 CI。

验收：离线测试通过，注入缺陷可靠失败；现有 smoke-harness 契约测试通过；新文件格式检查通过。

## 阶段三：真实构建与文档

文件：`docs/agents/commands.md` 增加新命令边界；本计划更新实测证据；台账 A-8 只回填本地状态，不冒充提交或上线。

- [x] 用原有数据执行 `NODE_USE_ENV_PROXY=1` 下的 `pnpm exec astro build`，退出 0，`_astro` 文件名与内容 SHA-256 无变化；两份既有 constants 哈希不变。
- [x] headless Chromium 对声明集合完整执行，保存逐页原始事件、分类理由与完成数；23/23 页完整，非预期错误 0，命令退出 0，路径顺序与 `AUDIT_PAGES` 一致。
- [x] 对实际构建首页分别注入主动 console.error、未捕获异常、缺图 404，三类均得到失败报告并命中预期错误；注入只在测试 browser context 中，不改源文件或线上内容。
- [x] 新增 11 项真实浏览器 fixture 测试通过；与既有 harness 合跑 20/20，通过现有 `test:lib` 16/16（两组包含重复的 harness 测试，不相加为唯一测试数）。`pnpm check` 0 errors / 0 warnings / 6 hints；本项文件 Prettier 检查通过。
- [x] 完成 Standards / Spec 两轴只读审查与一次缺陷修复复核；记录边界与本地结果，关闭本次 preview 和采集浏览器，交站长审阅。本项未 commit / push / 部署，#108 保持开启，台账 A-8 未勾。

验收：每页完成或明确失败；异常没有被例外掩盖；真实注入红证据可复查；不提交、不推送、不部署。

## 执行记录

### 复核修订（2026-10-28，站长确认）

上一版 23/23 PASS 只说明“第三方网络错误不阻断”的旧规则通过，不能作为 A-8 结案依据。站长已确认继续查清 32 个 Iconify 404，并将未经确认的第三方错误改为待裁定。本次不修改技能图谱或站点运行时、不提交推送。

- [x] 对照源码、官方 API 契约和实际响应，逐条核对 32 个 URL；浏览器确认 34 个图标位置全部 fallback，另有两个懒加载 URL 不在原采集的 32 条里。
- [x] 先用真实浏览器测试复现“未确认外站错误仍得到 PASS”的问题，再实现 PASS / FAIL / REVIEW 三态；分别退出 0 / 1 / 2，待裁定时 `ok:false`。真实 CLI 的 REVIEW / 退出 2 已用本地脱网 fixture 验证；已确认的 Iconify 错拼 SVG 404 直接 FAIL。
- [x] 保留原始错误，验证待裁定不能掩盖本站失败、主动报错或未完成采集；13 项浏览器测试全过，既有库测试 16 项全过。完整声明清单复验采集 23/23 页，3 PASS / 19 REVIEW / 1 FAIL，总体 FAIL、`ok:false`、退出 1；唯一 FAIL 页为 `/skills/`，命中 32 个错误路径对应的 64 条事件。
- [x] 已更新并读回 #108 的新规格，更新命令说明、台账和本记录；旧策略原始产物保留并增加历史说明。图标页和其他运行时源文件未改；未提交推送，A-8 不结案。

验收：已知例外有精确证据；未知外站失败不会无条件绿色通过；真实图标缺陷不被本票顺手修改。

#### Iconify 事实调查

- 来源：`src/data/skills.ts` 的 `icon` 保存 `prefix:name` 标识；`src/pages/skills.astro` 的 `.skill-card-icon img[data-skill-icon]` 直接用 `https://api.iconify.design/${skill.icon}.svg` 拼 raw SVG 地址。
- [Iconify 官方 SVG API](https://iconify.design/docs/api/svg.html) 的契约是 `https://api.iconify.design/{prefix}/{name}.svg`。这与组件/数据中使用的冒号标识形式不同；本页在构造 URL 时没有做这一步转换。
- 独立 HTTP 实测：原始报告的 32 个不同地址全部返回 404。按官方格式构造对照地址，28 个返回 200 且含 SVG；余下 4 个返回 429，已停止继续请求，不能报告为验证成功。
- 真实浏览器滚动后：34 个不同图标位置均 `naturalWidth=0`，图片隐藏、文字 fallback 为 grid。额外两个懒加载图标不在原来的直接导航错误清单中，不能把“32 个采到错误的 URL”当成全页所有图标。
- 浏览器路径改写对照同样遭遇 429，未加载成功；这组对照不能作为图标修复成功的证据。本次仅确认错误来源与退化结果，未修改图标页面。
- 门禁处理：Iconify API 的冒号形式 SVG 图片地址返回 404，作为已确认的错误路径判 FAIL；其他未经确认的外站资源失败判 REVIEW。不存在笼统的外域放行。
- 修订原始证据在 gitignored 的 `output/a8-review-20261028/`：`iconify-http.json`（逐条 HTTP 对照）、`iconify-browser.json`（图片及 fallback 计算状态）、`tests-final.log`、`cli-review.json`。这是临时验收产物，不是未来命令的必要输入。
- 全页复验为本地构建页面；仅对原来精确 32 个 Iconify URL 回放已记录的 404，其余 Iconify 请求阻止联网。该模式用于验证门禁识别已知缺陷，不能声称验证远端当前可用性。
- 复核构建退出 0，`dist/_astro` 资源仍与调查基线逐字节一致；两份既有 constants 漂移哈希不变。新规则原始结果为 `console-replay.json`，真实 CLI 待裁定退出码结果为 `cli-review.json`，都在上述临时证据目录。
- 定向独立复核确认：脱网三页分别得到 REVIEW、主动报错 FAIL、已确认 Iconify 坏地址 FAIL；总体 FAIL、`ok:false`、退出 1，跨页优先级与 console 资源关联正确。未再请求 Iconify。

### 技能页图标修复（2026-10-28，站长另行点选授权）

范围：仅修 `src/pages/skills.astro` 的现有 Iconify URL 拼接，保留标识、DOM、尺寸及 fallback；不处理播放器或广告脚本，不提交推送。此前“不修改技能页”的边界在本次点选范围内解除。

- [x] 阶段一：保存当前工作区与既有改动基线，只修改现有 `src` URL 表达式中的 `skill.icon.replace(":", "/")`。
- [x] 阶段二：同数据 `pnpm exec astro build` 退出 0；`pnpm check` 0 errors / 0 warnings / 6 hints；格式检查通过。产物 34 个图标 URL 全部符合官方 SVG API 路径。
- [x] 阶段三：真实 Chromium 滚动加载全部 34 个图标，34 个响应全部 200、34 个图片成功解码且 fallback 全隐藏，无 429。桌面 1440×900 与手机 390×844 截图已检查，未改尺寸或布局。
- [x] 阶段四：源码 diff 为 1 行替换；前序门禁脚本、package 和两份 constants 哈希与本步前一致。回填本地结果后停止；未解决的播放器 / 广告外部 REVIEW 不在本步处理。

验收：生产构建通过，34 个图标均正常解码或明确列出未解决项，修改没有覆盖前序门禁或既有 constants 漂移。

本步图标修复已达到本地验收条件；这不代表 A-8 整体通过，未复跑完整 A-8 清单或处理其余 REVIEW，也未 commit / push / 部署。原始证据在 gitignored 的 `output/a8-icon-fix-20261028/`：`browser.json`、`urls.json`、`build.log`、`check.log` 与桌面 / 手机截图。该目录是本轮临时产物，不是未来运行的必要输入。

### 剩余外部 REVIEW 调查（2026-10-28，站长继续授权）

范围：定位 myhkw 占位音频中止与 YouTube 广告脚本断连的来源、复现条件和实际功能影响；保留既有改动，不提交推送。不得仅凭外域或 ERR_ABORTED 自动放行。

- [x] 阶段一：读取嵌入源码，采集本地两页与线上两页的错误、frame / initiator、播放器状态，确认相同嵌入在两种环境结果不同。
- [x] 阶段二：CDP 确认 `/api/tts` 302 到 `err.mp3`、响应 206 后被浏览器取消；本地提示音和线上真实歌曲均静音播放进度超过 1 秒。原样广告脚本断连时，视频实际播放超过 2 秒；空 JS 对照未播放，不能当作安全修复。
- [x] 阶段三：调查结果及精确例外草案已写入本轮本地报告；未修改分类代码，等待站长裁定例外是否满足验收要求。

验收：每类 REVIEW 都能关联到来源与功能状态；无法验证的功能明确保留 REVIEW。

临时原始证据与详细报告在 gitignored 的 `output/a8-external-review-20261028/`，`report.md` 汇总事实、对照失败与待裁定条件。关于播放器，已确定本地授权提示分支与线上歌曲分支不同，未核对服务商后台的授权清单；关于视频，仅确认本轮原样断连时可播放，不承诺未来所有环境。

### 已裁定精确例外实施（2026-10-28）

站长已分别接受本地播放器与广告脚本的精确例外；中断后的继续指令仍在该范围内。仅改变新门禁调用点，不改共享台子或站点运行时，不提交推送。

- [x] 阶段一：补真实浏览器脱网红证据：符合条件的本地提示音、YouTube 子帧精确广告失败在改动前均得到 REVIEW，记录分别为 `player-red.log`、`ad-red.log`。
- [x] 阶段二：采集请求资源类型 / frame 来源及当次本地媒体状态，按精确条件分类；22 项浏览器测试通过，验证生产来源、条件缺失、其他 URL / 错误类型、主动报错均不放行，原有库测试 16 项通过。
- [x] 阶段三：真实外部请求完整复跑 23/23 页，不安装路由、不替换资源；最终 PASS、`ok:true`、退出 0，FAIL 0 / REVIEW 0。34 条预期事件仍全部保留，路径列表与 `AUDIT_PAGES` 一致。
- [x] 阶段四：#108 已记录站长接受的精确规则，命令说明与台账已回填；保护项（图标修复、两份 constants、package、共享台子）哈希不变。完成本地验收后停待站长审阅，未提交推送。

验收：两条例外仅在条件齐全时生效；不是整域放行，也不是每轮视频点播保证。完整结果如实记为 PASS / FAIL / REVIEW，未完成采集不得通过。

本轮独立复核发现并修复两项边界问题：授权文字仅出现在 body.innerText 不足以证明渲染可见，现核对精确文本节点、原生 CSS 可见性与非零文字盒；状态 page.evaluate 原先无期限，现仅筛选匹配候选后采集，另设最多 2 秒上限，超时仍 REVIEW。原始反例均已复核消除。

实现曾额外加入“必须与视口相交”的条件，真实歌词提示在首屏外导致 REVIEW；该门槛不在站长接受的规则中，已移除并明确记录：CSS 可见不保证首屏可见。透明、hidden、display:none 的反例继续拒绝；正常渲染但屏外的文字盒不额外否决。原生 API 的范围见 [MDN checkVisibility](https://developer.mozilla.org/en-US/docs/Web/API/Element/checkVisibility)。

新增中文 fixture 需显式 `text/html; charset=utf-8`；缺少 charset 会把提示文字解码错误，造成“没有授权提示”的假读数。该测试侧问题已修正，没有因此放宽生产规则。

临时原始证据在 gitignored 的 `output/a8-approved-exceptions-20261028/`，不是未来执行的必要输入。当前验收以 `tests-current.log` 与 `console-accepted.json` 为准；此前额外视口门槛的采集保留为诊断记录，不作为最终结果。

最终结果：22 项门禁浏览器测试、16 项既有库测试、构建与格式检查均通过；独立复核的两项问题均已修复并定向重验。CLI 的 PASS / 退出 0 由完整真实清单证明，FAIL / 退出 1 由非预期 404 注入证明，REVIEW / 退出 2 由脱网外部失败 fixture 证明。`summary.json` 为最终汇总，完整原始记录包含 `playerState`、来源 frame 和每条例外理由。

该 PASS 只表示声明集合在规定窗口内没有未接受错误；不等于原始 console 绝对零错误，不包含每轮主动点播视频或本地真实歌单验收。A-8 本地实现与验收已完成，仍待站长审阅，issue 未关闭、台账未勾、未提交推送或部署。

### 发布与结案（2026-10-28，站长已明确授权）

站长已确认按“限定文件提交 → 推送 → CI / Pages / 线上图标验证 → 回填台账 → 关闭 #108”流程执行。本次允许该流程中的 commit / push / 部署与 issue 收口；两份既有 GitHub 数据漂移仍不纳入提交。

- [x] 阶段一：保存生成数据，完整 `pnpm build`、`pnpm check`（0 errors / 0 warnings / 6 hints）、CI 范围 Prettier 与 22 项门禁测试通过；恢复全部范围外生成数据，仅暂存本轮 7 个目标文件。Markdown AST 与全部 fenced code（含缩进块）审计确认 A-8 以外结构、代码内容未改。
- [ ] 阶段二：提交并推送 main，核对远端 SHA；等待匹配 SHA 的 Lint、Build and Check、Deploy to GitHub Pages。
- [ ] 阶段三：线上技能页确认新 URL，真实浏览器验证 34 个图标；记录响应头与部署时间 / 构建产物证据。
- [ ] 阶段四：线上通过后更新台账与结案记录，单独提交文档并验证最终远端 CI；关闭 #108 并读回关闭状态。

验收：提交范围准确、既有数据漂移保留；最终远端 SHA、CI 和实际线上功能均有证据，issue 与台账状态一致。

### 上一版实施记录

- 2026-10-28：立项前先用 Context7 查 Playwright 官方事件契约：HTTP 404/503 不触发 requestfailed，须同时监听 response；使用 DOMContentLoaded 避免外站 iframe 挂住 load / networkidle。
- 实现选择：仅一张垂直切片 issue；不为单次可验收工作另建横向子票。
- 实现选择：公共运行入口提供 `configureContext`，只用于真实浏览器边界的脱网 fixture 与缺陷注入；CLI 不安装路由、不拦第三方。报告在启动前和每页后更新，运行未结束时保持 `ok:false`，避免中断沿用旧绿报告。
- 独立审查：Standards 轴无阻断发现；Spec 轴复现一项 P2——主动输出完全仿冒浏览器 404 的 console.error 会被误放行。已补真实浏览器回归测试，见红再绿；使用 ConsoleMessage 的 JS 参数数量区分主动调用和 Chromium 网络日志，审查员用原复现再次验证该问题消除。
- 测试环境修正：Windows `listen(0)` 曾分配 Chromium 禁止端口 6668；门禁正确报红。fixture 已改为选用空闲高位端口，未放宽门禁。
- CLI 红证据：仅在独立子进程内把输入清单替换为一个非预期 404 URL，真实 CLI 完整采集 1/1 页、报告失败并以 1 退出；未修改共享清单源文件。
- 观察边界实测：本轮直接导航的 10 秒最短观察窗口内没有捕获文章页的 Giscus 404；不能据此声称其消失。此前独立调查已复现，新增 fixture 也验证了正文分类；本命令不滚动触发懒加载。原始 console 绝对为零仍不是本门禁承诺。
- 本轮原始事件：预期 4 条（哨兵 2 个响应 + 2 条浏览器日志）；第三方网络 86 条（播放器域 20、视频广告域 2、Iconify API 域 64）。这是事件条数，不能当成独立故障数；原始事件完整保留，没有因为门禁通过而删除。
- 本地原始证据保存在 gitignored 的 `output/a8-console-20261028-23e65188/`。这是本轮临时验收产物，不是永久依赖或未来必定存在的命令输入；删除后按命令重跑。`console-final.json` 为逐页记录，`summary.json` 为集合核对，`tests-final.log` / `lib-all.log` / `check.log` / `build-final.log` 为验证输出，`mutation-*.json` 与 `cli-negative.json` 为红证据。
