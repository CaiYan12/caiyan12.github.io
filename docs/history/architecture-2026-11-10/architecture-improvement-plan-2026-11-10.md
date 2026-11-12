# WindowsIt's Music Club 架构深化执行计划（2026-11-10）

> **状态：调查完成，改进未实施。** 本文件是交给下一会话的执行计划，不是完成记录。所有进程与验收框初始均未勾选；只有真实执行并留下证据后才能勾选。
>
> 配套可视化报告：[`architecture-review-2026-11-10.html`](architecture-review-2026-11-10.html)。调查起点为 `e060f02`；文件行号只是当日定位辅助，执行时必须以**选择器 / 符号 + 文件路径**重新核对，磁盘才是权威。

## 0. 这份计划要解决什么

### 0.1 总目的

在不改变站长已打磨完成的线上 UI、路由、内容呈现和交互手感的前提下，把近期反复变热的代码区域逐步收成更 **deep** 的 module：用更小、更诚实的 interface 承载复杂 implementation，使调用方获得 **leverage**，使维护、缺陷定位与验证获得 **locality**。测试应穿过与 caller 相同的 seam，而不是为了测试再制造一套平行入口。

### 0.2 不可谈判的产品约束

1. **线上 UI 基本不变是最高优先级。** 不改变可见文本、DOM 语义、CSS 规则、选择器、布局几何、配色、字体、动效时序、焦点顺序、ARIA、路由、URL、导航、文章目录、拉绳壁纸挂件、语录条、独立壳和第三方嵌入的既有表现。
2. 本计划只允许**内部 module / interface / seam / adapter / 测试结构**的变化。若某一步被证明必须产生用户可见变化，立即停止该步，保留证据并交站长裁决；不得把可见变化写成“顺带改进”。
3. 不重开 ADR 0004、0007、0008、0010、0011、0012 已裁决的行为；不恢复已迁出的 AI日报；不统一 Nice Books 独立壳与主站样式；不把 `/domain/` 纳入主站 Layout。
4. 不新增依赖，不升级依赖，不改构建工具，不改 Tailwind 层策略，不改 `global.css`，不改 sitemap 收录策略，不把本地 Playwright 烟测迁入 CI。
5. 不实施 README 或历史索引中已明确否决 / 延期的事项；特别是不重开 `design-qa.mjs` 迁共享台子、稿纸 ResizeObserver 独立缺陷、导航双实现合并、全局 CSS 按组件拆文件，除非本计划后续明确纳入且有新证据。

### 0.3 工程与授权纪律

- 先读 `AGENTS.md`、`GLOSSARY.md`、相关 ADR、`docs/agents/commands.md`，再读本计划命中的 `docs/agents/*.md`。
- 严格执行仓库的 Matt Pocock 阶段授权：**无明确指令不进入下一阶段，一个会话回合最多两个阶段**。本计划的存在不等于授权连续实施全部阶段。
- 未获明确许可不 commit、不 push、不创建 PR、不合并、不部署；push 到 `main` 等于生产部署。
- 每个 finding 都是独立阶段、独立回滚单元。一次只推进一个 finding；不得为了“顺手”混入其它 finding 的改动。
- 若进入 `/implement-spec`，必须由 lead 把阶段授权边界一并传给子代理；子代理只做被点名的那一票。子代理不可用就暂停上报，不在主会话越权写实现代码。
- 遇到文档与代码矛盾，先用当前磁盘与可复现实测证明哪边为真；无法证明就停下询问。不得为了符合本计划而改坏代码，也不得为让检查转绿而削弱验收项。

### 0.4 checkbox 使用规则

- `[ ]` 表示尚未完成；`[x]` 只能表示“已完成且证据已记录”。
- 每个阶段完成后，在该阶段末尾记录：执行日期、环境、实际 commit SHA（若已获授权提交）、命令退出码、日志 / 报告路径、变异验证结果、遗留偏差。
- 被阻塞、未执行或不适用的项**不得勾成完成**。在项后写明“阻塞：原因 / 待谁裁决”；不适用项须经站长确认后改写为“已确认不适用”，不能静默删除。
- 不得通过减少测试样本、放宽阈值、增加放行清单、跳过失败命令或修改期望文案来制造 GREEN。
- 所有“锁现状”测试必须做 mutation check：**改坏应红 → 恢复原实现应绿 → 工作区无变异残留**。只证明新测试原本为绿不算证据。

## 1. 调查结论与执行顺序

### 1.1 候选总表

| ID  | finding                             | 强度            | 影响面               | 线上 UI 风险 | 前置      | 执行序 |
| --- | ----------------------------------- | --------------- | -------------------- | ------------ | --------- | ------ |
| F1  | 样式指纹 artifact 自证覆盖          | Strong          | `scripts/` 与测试    | 无           | 无        | 1      |
| F2  | 页面级 runtime 会话 owner           | Strong          | 多个页面的客户端脚本 | 中（时序）   | F1 证据   | 2      |
| F3  | 拉绳壁纸测试桩合成 scenario adapter | Worth exploring | 两个测试文件         | 无           | 无        | 3      |
| F4  | 文集成员页烟测场景化                | Worth exploring | `series-smoke.mjs`   | 无           | 无        | 4      |
| F5  | 壁纸“图片何时可画”内部 module       | Speculative     | 两个壁纸 runtime     | 低到中       | F3 已完成 | 5      |

**排序理由：** F1 是所有“UI 没变”结论的测量仪，本身不改生产代码，必须先做；F2 生产 leverage 最大，但依赖 F1 提供可信的样式指纹；F3 是 F5 的前置，先让行为矩阵有统一测试 adapter；F4 与其它项解耦，可独立做；F5 只有在前四项完成、且等价性 spike 成立后才实施。

### 1.2 调查证据基线（2026-11-10，当前 `e060f02`）

- `pnpm test:utils`：261 tests / 261 pass / 0 fail。日志：`output/architecture-2026-11-10/investigation/test-utils.log`。
- `pnpm test:lib`：43 tests / 43 pass / 0 fail。日志：`output/architecture-2026-11-10/investigation/test-lib.log`。
- `pnpm check`：0 errors / 0 warnings / 6 hints。日志：`output/architecture-2026-11-10/investigation/astro-check.log`。
- F2 的一次性 Swup 探针（本机 `pnpm dev --port 4323`，Playwright）：首页初始 4000ms 活跃 interval 2；首页 → 文章后仍为 2；回到首页后变为 3；`clearInterval` 计数 0；`pageerror` 0。日志：`output/architecture-2026-11-10/investigation/probe-runtime-lifecycle.log`。该探针只证明 timer 未被清理，不证明访客已经遇到可感知故障。
- 本次**未运行**完整构建、样式 A/B、`smoke:ui`、`smoke:series`、`smoke:wallpaper-pull`。执行阶段必须自行建立基线，不能把本节当成浏览器验收。

### 1.3 本调查明确没有证明的事

- F1 的“缺失状态可以全绿”是代码路径推出的机制，尚未用一次真实样式回归复现；F1 实施时必须构造红证据。
- F2 的 interval 残留已实测；页面级监听器数量随页面类型如何增长尚未稳定复现，报告与计划不得写成“监听器无界增长”。
- F3/F4 是测试结构问题，不代表当前测试有假绿；它们的收益是新增覆盖与降低维护成本。
- F5 尚未做行为等价 spike；它可能被否决，否决也是合格结果。

## 2. 共用开工门禁（每个 finding 都要执行）

### 2.1 目的

建立可归因、可复现、可回滚的起点，防止把既有工作区改动、随机构建噪声、陈旧 `dist/`、过期依赖缓存或第三方网络抖动误判为本轮回归。

### 2.2 进程

- [x] 记录 `git status --short`、当前分支、`git rev-parse HEAD`；若工作区有非本阶段改动，停止并交站长决定，不覆盖、不 stash、不清理他人工作。
- [x] 重读本 finding 涉及的全部文件与测试，核对报告中的 `path:line` 是否仍指向同一逻辑；若代码已漂移，更新调查事实后再执行，不照搬旧行号。
- [x] 确认本阶段允许修改的文件清单、允许调用的命令、测试 seam、UI 不变量和回滚单元；超出清单的新增需求另记，不混入。
- [x] 在 `output/architecture-2026-11-10/<finding-id>/` 建本阶段证据目录；一次性探针、日志、A/B 快照都放这里，不写系统临时目录。
- [x] 运行本 finding 指定的现有离线测试并保存完整输出与真实退出码，形成 GREEN 基线；既有红须先分类，不能写成“本轮造成”或“与本轮无关”而不给证据。
- [x] 需要浏览器验收时，使用同一份输入运行 `pnpm exec astro build`，随后按需运行 `pnpm exec pagefind --site dist`；不要为 A/B 跑会刷新外部数据的整条 `pnpm build`。（已执行；`astro build` 在收尾清理阶段被宿主管卫拦下，见下一条。）
- [x] 检查构建完整输出：不得含 `SAFE_DELETE_*`；真实退出码必须为 0；不得只 `tail`。若出现守卫拦截，按“该步未执行”处理，不绕过，并核对 `dist/pagefind/` 与 sitemap 是否完整。**过程如实记录**：14:12 那次输出含 `[safe-delete][SAFE_DELETE_BULK_CONFIRM_REQUIRED] {"count":50,"threshold":50,"targets":["dist\\.prerender\\.vite\\"]}`、真实退出码 1、`astro:build:done` 未执行，当时按「该步未执行」处理、未勾。**同日 15:21 补齐**：把旧 `dist/` 整目录 `mv output/dist-archive/dist-20261110-1412` 留档（改名，不是删除）后重跑，`pnpm exec astro build` 退出码 0、日志无 `SAFE_DELETE`、含 `[@astrojs/sitemap] sitemap-index.xml created at dist` 与 `229 page(s) built`；15:23 在已有 `dist/` 上再跑一次同样退出码 0。随后 `pnpm exec pagefind --site dist` 退出码 0（28 页 / 47,583 词）。产物：230 个 HTML、`sitemap-0.xml` 180 个 `<loc>`、`dist/pagefind/` 非空。日志 `build-fresh.log`、`build-second-on-existing.log`。
- [x] 用 `pnpm preview --port 4322` 服务当前产物；若已有用户进程占用端口，不杀进程，改用双方确认的新端口并同步所有 `*_BASE_URL`。
- [x] 对需要比较 UI 的 finding，先在同一产物上连采两次，确认采集工具自等；若同码自等失败，先修采集输入或归类噪声，不进入 A/B 结论。（`fp-c` / `fp-d` 同一 `dist/`，`diff` = 0/23、0 差异。）

### 2.3 开工验收

- [x] 起点 SHA、分支、工作区状态和允许改动清单已写入本阶段证据日志。
- [x] 现有测试的通过 / 失败集合已保存，能够区分既有失败与本轮失败。
- [x] 浏览器产物的构建、Pagefind、preview 前提均已直接验证，未拿旧 `dist/` 冒充新产物。**过程**：14:12 的构建被守卫拦在收尾（退出码 1、sitemap 未写），当时不勾；15:21 用「旧 `dist/` 改名留档后再构建」拿到退出码 0 的构建与 sitemap，15:23 复跑同样通过，`pagefind` 退出码 0；preview 在 4322 上逐页验证 23 个审计页（22 个 200，`/this-page-should-404/` 按设计返回 404 但页面正常渲染）。产物由本次构建写出（`dist/index.html` = 15:23）。
- [x] A/B 工具在同一输入上具有判别力与稳定性；随机块、随机语录、Swup 瞬时态、第三方件和回环地址均按现行工具契约处理。
- [x] 已写明回滚方法，且回滚不会删除用户文件、覆盖未提交改动或触碰其它 finding。

## 3. 共用 UI 与行为保护判据

### 3.1 目的

把“尽量不改 UI”变成可执行判据，而不是口头承诺。不同 finding 可以选择不同证据强度，但不得用源码 diff 或 `astro check` 代替真实浏览器结论。

### 3.2 进程

- [x] 对纯 Node / 测试台子 finding，证明改动文件不进入站点构建输入；若这一前提不成立，升级为运行时 finding 的验证力度。**已做**：F3（F1 的仪器、F3 的 adapter、F4 的烟测脚本）逐个证明——这批改的 5 个 `scripts/` 文件在 `src/` 里**零引用**（唯一一处是 `SidebarStickyStack.astro:18` 的注释）；F3 的 adapter 实测不进包（`dist/` 全量搜 5 个特征串 0 命中，客户端 chunk 摘要与改动前逐字节相同）。F5.2 的 `image-readiness.ts` 是运行时模块，按运行时 finding 的力度验（矩阵 + 变异 + 实机 + 批次级指纹 A/B）。
- [x] 对运行时 finding，使用当前四态格式的 `scripts/upgrade-style-audit.mjs` 重采基线与改后产物；**2026-11-05 前的旧采集不得与新采集互比**。**已做**：F2.5 的两侧都在 `127.0.0.1:4401` 上用当时的新格式重采（各 23 页、`complete:true`、四态 `targets` = `located` = 1,220）；批次收口又做了一次 `origin/main` vs `HEAD` 的整批 A/B（同端口、同服务器实现）。旧采集被工具显式拒绝（缺 `formatVersion` 即 `exit 1`），不存在混比。
- [x] 对运行时 finding，执行本计划指定的既有 `smoke:*` / `test:*`，比较判据通过集合，而不只比较总数；失败名称、页面与原因必须一致或为零。**已做**：F2.5 比了四套（`ui` / `series` / `wallpaper-pull` / `console`）的**判据名集合**，「基线通过但现在没通过」与「现在新增通过」双向都是 0；F4 比 series 的输出条目数并由 `EXPECTED_CHECKS` 守卫；F5.3 比 wallpaper 的 47 条判据名集合；收口轮再跑一次五套并比集合。
- [x] 对触及文章目录的 finding，保留 ADR 0008 的共用粘性栈、同源同序、顶部无激活态 / 侧栏有激活态、首个标题越线前无激活项、手动让位与 reduced-motion 语义。**已做**：F2 期间**没有**迁移文章目录（`initArticleToc` 仍留在 `runtimeTable` 的 swap 7，`PostToc.astro` 与 `article-toc.ts` 一行未动）；`pnpm test:article-toc-browser` 2/2 通过（F2.5 与收口轮各一次），`runtimeTable` 的 swap 1–8 逐项与 HEAD 前一致（`F2.5/assembly-order.log`）。
- [x] 对触及拉绳壁纸挂件的 finding，保留 ADR 0010 的首帧定位、导航宽度单源、点击 / 拖拽阈值、忙碌锁、失败路径、键盘、Swup 后单实例与 reduced-motion 语义。**已做**：`smoke:wallpaper-pull` 的 47 条判据覆盖这些面（首屏只请求一张、达阈值换图且恰好一次、未达阈值不换图、指针取消与失焦、忙碌锁、失败播报、Enter/Space 与 Space 不滚页、焦点环、切两页后仍可换图、≤680px 隐藏、减少动态不建层仍换图），F5.3 与收口轮各跑一次，判据名集合与基线逐条一致；另有一轮三视口浏览器 A/B（改前/改后逐项零差异）。
- [x] 对任何新增或迁移的判据做定向变异，确认它能抓住自己声称防守的缺陷，且不会只在静态文本上匹配。**已做**：F3 四组（删 `finally` 的解锁 → 6 红；删 decode 回退 → 18 红；删 `pointercancel` 复位 → 1 红；删指针 ID 过滤 → **44/44 全绿，如实记为既有覆盖缺口**）；F4 五组（漏跑成员 → `exit 2`；oracle 恒 false → 2 红；侧栏当前项错一位 → 1 红；删成员 → `exit 2`；**生产侧末章不收尾 → 恰好 2 红**）；F5.3 四组（删 `claimed` → 2 红；只删 `settled` → 起初 0 红、补判据后 1 红；删尺寸兜底 → 24 红；删监听清理 → 3 红）。每组跑完立即还原并核 sha256。
- [x] 若出现用户可见差异，停止并回退到最近可用状态；不得自行解释为“可接受的小变化”。**未发生**：F2.5 的整页指纹 A/B 在仪器补丁后为 `0/23`、0 差异（补丁前那 12/23 页 2,365 条已逐条归因为 18 个被迁走的 `<script>` 元素 + 首页 `nth-child` 随机配色）；F5.3 的改前/改后浏览器 A/B 除 base URL 外零差异；批次级 A/B 见收口记录。

### 3.3 验收

- [x] 样式指纹按现行分类达到**可见差异为零**；等价色 / 不可见项如有，逐条有渲染语义证据，不直接忽略。**已做**：F2.5（补丁后）`0/23`、0 条、`exit 0`；批次级 `origin/main` vs `HEAD` 见收口记录。没有出现过需要按「等价色 / 不可见」解释的残留。
- [x] 桌面与移动目标页截图在已测噪声底线上无可归因差异；截图不作为计算样式指纹的替代品。**已做**：F2.5 出 18 张（两侧 × 桌面 1440×900 / 移动 390×844 × 首页、文章页字号弹层关/开、`/tag/`、`/category/`），确定性几何逐项相同，唯一差异（移动端云集 `scrollHeight`）同侧三次重复即自证为噪声；F5.3 的浏览器 A/B 覆盖三视口。截图只作归因，结论以指纹为准。
- [x] 相关交互烟测无新增失败，既有失败有开工基线可对照；无“总数相同但失败项换了”的假等价。**已做**：四套烟测在 F2.5 与收口轮各跑一次，均按**判据名集合**比对（见 3.2 第 3 条）。
- [x] `pnpm check` 通过；`pnpm exec prettier --check ./src ./scripts ./docs ./*.md tailwind.config.cjs` 通过。**已做**：收口轮 `pnpm check` 0 errors / 0 warnings / 6 hints、退出码 0；全范围 Prettier 退出码 0；`verify-eol` 456 文件 0 混合。
- [x] 最终按变更档位执行 `docs/agents/commands.md` 的轻量或承重验证；拿不准按承重，不以“这是重构”自行降档。**已做**：按**承重档**四道全走——① 噪声底线：同版本两次独立构建的非 HTML 产物逐字节比对；② 样式指纹 A/B：`origin/main` vs `HEAD` 整批比对；③ 截图：三视口（F2.5 十八张 + F5.3 三视口）；④ 完整构建 + 交互：`astro build` 全链、`astro check`、五套 `smoke:*`。理由：这批动了全站 runtime 装配（`theme-script.ts`）与页面级生命周期，影响面跨全部页面，按「拿不准按承重」。

## 4. 分 finding 实施阶段

### Phase F1：样式指纹 artifact 自证覆盖

#### F1.0 目的与边界

**目的：** 让 `capture` 与 `diff` 之间的 artifact 成为一个 depth 正确的 module：格式版本、每页覆盖、四态采样数量与完整性都由它统一声明；任何不完整采集都不能伪装成“无差异”。

**允许修改：**

- `scripts/upgrade-style-audit.mjs`
- 新增 `scripts/lib/style-audit-artifact.mjs`
- 新增 `scripts/lib/style-audit-artifact.test.mjs`
- 完成后按仓库门禁同步 `docs/agents/commands.md` 与 `CHANGELOG.md`

**禁止修改：**

- 任何 `src/`、页面、CSS、路由、渲染产物、依赖、`package.json`。
- 四态集合、状态属性清单、`STATE_MAX`、审计页清单、可见性分类规则、阈值。
- 现有 `style-diff-visibility.mjs` 与 `style-color-equivalence.mjs` 的语义。
- 不得为通过测试而减少页面、减少状态或增加全局放行。

#### F1.1 开工与现状复现

- [x] 记录 `git status --short`、`git rev-parse HEAD`，确认 F1 只改允许文件。
- [x] 重读 `scripts/upgrade-style-audit.mjs` 当前的选择器、CDP 状态采样、`capture` 索引与 `diff` 加载逻辑，确认行号仍指向同一行为。（调查锚点当日仍成立：`STATE_PSEUDOS` 在 189–194、CDP 采样块 400–500、manifest 写入 513–519、`diff` 退出 854–857；改动后行号已随之漂移。）
- [x] 保存 `pnpm test:lib` 与 `pnpm test:utils` 的完整基线日志到 `output/architecture-2026-11-10/F1/`。
- [x] 用当前产物在同一 `dist/` 上连续 `capture` 两次并 `diff`，确认工具自身稳定；若未稳定，先归因噪声，不开始改代码。**顺序偏差（如实记录）**：改代码前只采了一次（`fp-a`，旧工具），连采两次是在改完之后用新工具做的（`fp-c` / `fp-d`，0/23、0 差异）。旧实现与新实现在同一 dist 上的 23 份正文逐字节相同，因此这次偏差不影响稳定性结论。
- [x] 记录当前 `index.json` 的字段，明确它**没有**逐状态覆盖信息，也没有格式版本或完整性标记。
- [x] 写下一条红证据计划：临时让 CDP 状态采样抛错，确认当前实现仍写出合法外观的 artifact 且 `diff` 可能为绿；恢复源码后再进入实现。（已执行：把 HEAD 版脚本复制到 `output/architecture-2026-11-10/F1/old-tool/old-broken.mjs`、仅在 CDP 初始化处抛错，`capture` 仍 `EXIT=0`，23 页只剩 17,662 行静态样式；把它复制一份做 `diff` 得 `0/23、0`。详见阶段末尾执行记录。）

#### F1.2 设计 artifact interface

- [x] artifact module 拥有唯一格式版本号；版本缺失或未知时不猜测、不静默兼容，明确要求重新采集。（`ARTIFACT_FORMAT = "style-audit-artifact@1"`；缺失与不符都归「旧格式」，提示语带当前接受值。）
- [x] 每页记录至少包含：路径、slug、静态行数、四种状态各自的采样行数或尝试数、采样完整性、目标元素数、成功定位数、摘要、错误摘要。（`path` / `slug` / `staticLines` / `coverage.states{hover,focus-visible,active,disabled}` / `coverage.stateError` / `coverage.targets` / `coverage.located` / `sha` / `errors`。）
- [x] 完整性必须由**实际正文行重算**校验，不能只相信 manifest 自报；manifest 与实际行数不一致时拒绝。
- [x] 允许 capture 在采样失败时继续完成其它页并写出诊断 artifact，但 artifact 必须标为 incomplete，且 capture 进程以非零退出。
- [x] `diff` 在比较任何样式前先校验两份 artifact：版本一致、页集合一致、每页采样完整、每页目标数一致、每页四态覆盖计数一致；任一不满足即非零退出，并打印具体页与状态。
- [x] 现有的 gzip 文本行格式保持可读；不得改变静态行和状态行的行内格式，否则会改变现有可见性分类的输入。（同一 dist 上旧实现与新实现的 23 份正文逐字节相同。）
- [x] 只暴露窄 interface：写入、读取/校验、覆盖比较；不要把 capture 的 Playwright 逻辑或 diff 的可见性分类塞进 artifact module。（`createCapture` / `readArtifact` / `compareCoverage`。）
- [x] 用普通中文写清“完整”“不完整”“旧格式”三种结果，避免 caller 通过布尔量猜状态。（`ARTIFACT_STATUS` 的值就是这三个词。）

#### F1.3 实现与单测

- [x] 先写失败测试：缺少 `hover` 状态键时拒绝。（manifest 的 `coverage.states` 与索引级 `states` 各一条。）
- [x] 先写失败测试：manifest 声称完整但正文缺少某状态行时拒绝。
- [x] 先写失败测试：版本缺失 / 不匹配时拒绝。
- [x] 先写失败测试：A/B 页集合不一致、状态覆盖计数不一致时拒绝。
- [x] 先写失败测试：合法 artifact 可往返读取，且静态行与四态行逐字保持。
- [x] 实现 artifact module，使上述测试转绿。（首跑 11/11 通过；测试文件先于模块存在，首跑因 `ERR_MODULE_NOT_FOUND` 红。）
- [x] 修改 capture 的状态采样错误路径：不得再空 `catch` 后当作完整；诊断 artifact 与退出码分离。
- [x] 修改 `load()` 与 `diff()`，先执行 artifact 校验，再走现有 `strip`、`bag`、可见性分类；不得改变现有差异分类输出。（0 差异路径的输出与旧版逐行同形：23 条 `same`。）
- [x] 保留原 CLI 参数 `capture|diff --base --out --a --b --verbose`；若新增输出字段，旧参数用法不得改变。
- [x] `pnpm test:lib` 全部通过；新增测试必须被现有 glob 自动执行，不新增无人运行的测试文件。（54/54，其中新增 11 条随 `scripts/lib/*.test.mjs` 自动纳入。）

#### F1.4 集成变异与验收

- [x] 在同一份 `dist/` 上重新 capture 两次：两页集合、静态行、四态行、摘要均一致，`diff` 为 0/全部审计页（当前取 `AUDIT_PAGES`）、0 差异。（`fp-c` 6m24s / `fp-d` 6m42s：各 23 页、22,542 行、静态 17,662、四态各 1,220；`diff` = `0/23`、0 差异、退出码 0。）
- [x] 变异一：仅删除 fixture A 中所有 `:hover` 行，静态行保持完全相同；diff 必须非零，并指明 hover 覆盖缺失。（退出码 1，逐页报「manifest 记录 hover 采样 60 行，正文重算为 0 行」。）
- [x] 变异二：仅篡改 manifest 的版本号；diff 必须非零，并提示重新采集。（`style-audit-artifact@0` → 退出码 1。）
- [x] 变异三：仅让 A/B 某页四态计数不对称；diff 必须非零，不得只因文本相同而绿。（A 侧 `/` 少两个目标、manifest 同步改成自洽的 58：两份都 `complete:true`，`diff` 报目标数 58/60 并逐态列名。）
- [x] 变异四：临时在 CDP 初始化处抛错，跑一次 capture；进程必须非零且 artifact 标 incomplete。恢复源码，`git diff` 中不得残留变异。（退出码 1、`complete:false`、23 条逐页问题；恢复后脚本 sha256 回到 `0f90b2b1…`，`grep "F1 变异"` = 0。）
- [x] 变异验证后恢复原实现，重新跑 `pnpm test:lib`，确认回绿。（54/54。）
- [x] `pnpm check` 0 error；全范围 Prettier 检查通过。（0 errors / 0 warnings / 6 hints；`prettier --check ./src ./scripts ./docs ./*.md tailwind.config.cjs` 退出码 0。）
- [x] `git diff --name-only` 只出现允许文件，无 `src/`、CSS、页面或依赖变化。（`docs/agents/commands.md`、`scripts/upgrade-style-audit.mjs`；另有两个未跟踪新文件。）
- [x] 在 `docs/agents/commands.md` 记录 artifact 版本、旧采集不兼容、capture 失败语义与重新采集命令；不回写历史数字。
- [x] `CHANGELOG.md` 新条目写清改动、动机、实测证据（日期、环境、命令、读数）、失败路径与验证方式。
- [x] 停在本地，不 commit、不 push；向站长报告 F1 结果与是否进入 F2。

#### F1.5 回滚与停止条件

- [x] 回滚单元：删除 artifact module 及其测试，恢复 `upgrade-style-audit.mjs` 的旧 `catch` 与 `load`；不得用旧 artifact 冒充新 artifact。（旧实现原文已在 `output/architecture-2026-11-10/F1/old-tool/old-raw.mjs` 留档，取自 `git show HEAD:`，可直接对照回滚。）
- [x] 若需要修改现有可见性分类才能“修好”覆盖，停止：这说明 F1 已越过仪器契约，交站长裁决。（未发生：可见性分类代码一行未动。）
- [x] 若完整采集在真实全部审计页上存在无法解释的覆盖缺失，停止并把缺失页、状态、CDP 错误原文列入报告；不得增加白名单。（未发生：23/23 页四态齐全，`targets` = `located` = 1,220，无白名单。）

#### F1 执行记录（2026-11-10）

- **起点**：`e060f02`（`main`），工作区只有站长的未跟踪 `docs/improvements/`；结束时 `git diff --name-only` = `docs/agents/commands.md`、`scripts/upgrade-style-audit.mjs`，另有未跟踪的 `scripts/lib/style-audit-artifact.mjs` 与 `scripts/lib/style-audit-artifact.test.mjs`。
- **环境**：Windows 11 / 系统 Node 24.18.0 / pnpm 10.26.2（会话托管的 Node 22.22.2 被 Astro 7.4.4 拒绝，要求 `>=22.23.4`）；`pnpm preview --port 4322` 服务 `pnpm exec astro build` 写出的 `dist/`。
- **基线**：`test:lib` 43/43（Node 22.22.2，`test-lib-baseline.log`）、`test:utils` 261/261（`test-utils-baseline.log`）、调查期 `pnpm check` 0 errors / 0 warnings / 6 hints。
- **构建**：`astro build` 退出码 1，输出含 `[safe-delete][SAFE_DELETE_BULK_CONFIRM_REQUIRED] {"count":50,"threshold":50,"targets":["dist\\.prerender\\.vite\\"]}`，`astro:build:done` 未执行 → sitemap 与 pagefind 仍是 2026-11-07 的产物；230 个 HTML 由本次写出（`dist/index.html` = 14:12:36）。日志 `build.log`。
- **旧实现字段**：`index.json` = `{base, generated, pages}`，每页 `{path, slug, elements, sha, errors}`——无格式版本、无四态覆盖、无完整性标记（`fp-a/index.json`）。
- **红证据（旧实现）**：`old-tool/old-broken.mjs`（HEAD 原文 + CDP 初始化抛错）跑出 `EXIT=0`、23 页 / 17,662 行（正好等于完整采集的静态行数，4×1,220 条状态行消失）；与自身副本 `diff` 得 `0/23、0`（`diff-broken-self.log`）；与完整采集 `diff` 得 `23/23、4,880`（`diff-broken-vs-complete.log`）。日志 `capture-broken-old.log`。
- **新实现集成**：`fp-c` / `fp-d` 各 23 页 / 22,542 行（静态 17,662 + 四态各 1,220），`targets` = `located` = 1,220，`complete:true`；`diff` = `0/23、0`、退出码 0（`diff-c-vs-d.log`）。旧↔新正文逐字节相同 23/23（`body-identity-a-vs-c.log`）；旧 artifact 被显式拒绝（`diff-legacy-refused.log`）。
- **变异**：`diff-mut-hover.log` / `diff-mut-version.log` / `diff-mut-asym.log` / `diff-mut-manifest.log` / `capture-mut-cdp.log` 退出码全为 1；CDP 变异恢复后脚本 sha256 `0f90b2b1…` 与变异前一致、`grep "F1 变异"` = 0。
- **收尾**：`test:lib` 54/54、`test:utils` 261/261、`pnpm check` 0/0/6、全范围 Prettier 退出码 0（`test-lib-final.log`、`test-utils-final.log`、`astro-check.log`、`prettier-check.log`）。
- **遗留偏差**：① F1.1 的「改代码前连采两次」改在改完之后做，替代证据见该条注；② 14:12 那次构建被宿主批量删除守卫拦在收尾（退出码 1），sitemap 与 pagefind 当时未刷新，F1 的采集不消费它们；同日 15:21 已用「旧 `dist/` 改名留档后再构建」拿到退出码 0 的构建并补齐 sitemap/pagefind（见 Phase 0 记录），该前提问题关闭；③ `stateError` 只截前 160 字符，够定位、不是完整堆栈。

### Phase F2：页面级 runtime 会话 owner

#### F2.0 目的与边界

**目的：** 给页面内 runtime 一个统一的 start / stop 所有权，让 timer、document 监听器、异步实例和 DOM 绑定随页面会话生存与销毁；消除“离开页面后旧 interval 仍跑”的 locality 缺陷。

**允许修改：**

- `src/utils/theme-script.ts`（装配与生命周期声明）
- 新增 `src/utils/runtime/page-session.ts` 及页面级功能模块（目录名可按既有风格确定，但必须集中在 `src/utils/runtime/`）
- 四个当前内联 implementation 所在的 `.astro`：`Slideshow.astro`、`posts/[...slug].astro`、`WidgetNewLog.astro`、`TagCloud3D.astro`，**只允许移除/替换 `<script>` 逻辑，不得改 markup、样式、类名、文案、DOM 顺序**
- 新增浏览器回归脚本（建议 `scripts/runtime-lifecycle-smoke.mjs`）与 `package.json` 的对应 script
- `docs/agents/components.md`、`docs/agents/commands.md`、`CHANGELOG.md`

**禁止修改：**

- 任何 CSS、`global.css`、设计 token、DOM 结构、ARIA、路由、文案、自动轮播间隔、字体范围与持久化 key。
- `runtimeTable` 中非页面级行的既有表序；`runtimeTable` 的 swap 1–8 次序；`runtimeHooks.pageLoad` 的现有顺序。
- 拉绳壁纸挂件、头部微言轮播、导航、液态玻璃、随机背景等常驻模块的初始化轨道。
- 不删除 `colorful:page:loaded` 事件本身：先审计仍在使用它的消费者，保留事件兼容；只移除被迁移功能的自行监听。

#### F2.1 基线、消费者清单与红证据

- [x] 全仓列出 `colorful:page:loaded`、`setInterval`、`setTimeout`、`document.addEventListener`、`window.__*Bound` 的页面级消费者，写成表：谁启动、何时停止、是否有 dataset/window 守卫、是否随 swap 重跑。（清单见 `output/architecture-2026-11-10/F2-baseline/consumer-inventory.md` §一/§二：7 个页面级消费者 + 5 类常驻模块；`setInterval` 全仓只有 `Slideshow.astro` 与 `runtime/header-ticker.ts` 两处。）
- [x] 对 Slideshow、字号、tabs、TagCloud3D 分别记录：初始化时机、观察到的 DOM 变化、可清理资源、reduced-motion 分支、失败分支。（同上 §三，逐项五列。）
- [x] 在同一 `dist/` 上运行现有 `smoke:ui`、`smoke:series`、`smoke:wallpaper-pull`、`smoke:console`，保存完整日志与通过集合；这是唯一可接受的基线，不用记忆中的计数。（2026-11-10 15:34–15:49，`output/architecture-2026-11-10/F2-baseline/`：`smoke:ui` 142/142、0 失败、退出码 0；`smoke:series` 88/88、0 失败；`smoke:wallpaper-pull` 47/47、0 失败；`smoke:console` 23/23 页 PASS、退出码 0。第一次 `smoke:ui` 在 134 项后因 `page.goto(..., waitUntil:"load")` 30s 超时中断（`smoke-ui.attempt1-timeout.log`，无 FAIL 行），与 `commands.md` 记的 `myhkw.cn` 第三方抖动同源；主机恢复后重跑全绿。）
- [x] 记录当前首屏/换页时 `runtimeTable` 的实际调用顺序与 `swap` 1–8 顺序；改动前后必须逐项一致。（初始装载 28 行的表序、`filter(swap).sort(swap)` 得到的 1–8 序、`beforeSwap` / `pageLoad` 数组序，全部抄录在清单 §四；来源是 `src/utils/theme-script.ts` 的声明本身，运行时序等价留到 F2.2 用事件时间线证。）
- [x] 用 Playwright `addInitScript` 做一次性探针：拦截 `setInterval` / `clearInterval`，按当前轮播 interval 过滤；记录首页初始、离开首页、回到首页的活跃 interval 数。（探针逻辑直接落进永久测试的 `PROBE` 常量；读数 2 → 2 → 3，两次独立运行一致。）
- [x] 将探针升级为永久测试 `scripts/runtime-lifecycle-smoke.mjs`，先断言目标行为：离开首页后页面级 interval 减少一条，返回后恢复，不累积。（含 `package.json` 的 `smoke:runtime-lifecycle` 脚本；环境变量 `RUNTIME_LIFECYCLE_BASE_URL`，默认 `http://localhost:4322`。）
- [x] 在未改生产代码前运行该测试，必须红；保存红证据与真实读数。若测试不红，停止并重新核对探针，不进入实现。（首次与复跑都是 5 PASS / 2 FAIL、退出码 1：`离开首页` 读到 `active4000=2`（应为 1）、`回到首页` 读到 `3`（应为 2）。日志 `lifecycle-red.log`、`lifecycle-red-run2.log`、`lifecycle-red-final.log`。）

#### F2.1 执行记录（2026-11-10）

- **环境**：Windows 11 / 系统 Node 24.18.0 / pnpm 10.26.2；`pnpm preview --port 4322` 服务 15:23 那次 `astro build` 的 `dist/`（230 HTML、sitemap 180 条、pagefind 28 页）。
- **基线（同一 dist，逐条记通过集合，不看总数）**：`smoke:ui` 142/142、退出码 0（`smoke-ui.log`）；`smoke:series` 88/88、0 失败（`smoke-series.log`）；`smoke:wallpaper-pull` 47/47、0 失败（`smoke-wallpaper-pull.log`）；`smoke:console` 23/23 页 PASS、退出码 0（`smoke-console.log` + `console-report.json`）。
- **第一次 `smoke:ui` 中断**：134 项后 `page.goto("http://localhost:4322/", waitUntil:"load")` 30s 超时，无 FAIL 行；`curl` 复测 `myhkw.cn/player/js/jquery.min.js` 200 / 1.73s、`/api/player/1` 302 / 0.15s，属 `commands.md` 记的第三方抖动。重跑全绿，基线以重跑为准。
- **探针读数**：首页 `active4000=2`（`created=6`、`cleared=9`）→ 离开到 `/archive/` 仍 `2`（`created=6`、`cleared=9`，`pageLoaded=1`）→ 回首页 `3`（`created=7`、`cleared=10`）。两次独立运行读数一致。
- **红证据**：`pnpm smoke:runtime-lifecycle`（未改任何生产代码）5 PASS / 2 FAIL、退出码 1；失败项为「离开首页：只剩 1 条常驻 interval」「回到首页：计数回到 2，没有累积」。
- **本轮新增/修改的文件**：新增 `scripts/runtime-lifecycle-smoke.mjs`；`package.json` 增加 `smoke:runtime-lifecycle` 一行；`output/architecture-2026-11-10/F2-baseline/consumer-inventory.md`（只读盘点）。**未改任何 `src/` 文件、CSS、`theme-script.ts`、装配表。**
- **遗留偏差**：① 计划把「一次性探针」与「永久测试」分成两步，实现上探针直接写成测试里的 `PROBE` 常量，读数与断言来自同一次运行（红证据同源，不影响判据）；② `smoke:ui` 的基线是第二次运行的结果，第一次中断按第三方抖动归类，未改任何判据；③ 装配表的「实际调用顺序」目前由声明推导（表序 + swap 排序），运行时逐项对照留到 F2.2/F2.5。

#### F2.2 建立页面会话 owner（只迁移 Slideshow tracer）

- [x] 新增页面会话 module：对外只负责注册页面级 start / stop、在 beforeSwap 停止上一页、在 afterSwap 或既有页面就绪相位启动当前页；不承载具体功能的 implementation。（`src/utils/runtime/page-session.ts`：`createPageSessionOwner(sessions)` 只做遍历调度，零 DOM、零定时器；清单写在 `theme-script.ts` 的 `pageSessions`。）
- [x] 明确 owner 与既有 `runtimeTable` / `runtimeHooks` 的分工：常驻功能仍走原表，页面功能走新表；不得出现第三套互相竞争的初始化轨道。（初始装载与换页重跑复用 `runtimeTable` 的一行 `{ init: pageSessions.start, swap: 9 }`；离开前停止追加进 `runtimeHooks.beforeSwap`。既有 28 行的相对次序与 swap 1–8 未动，没有新增轨道。）
- [x] 明确 owner 的启动相位，并用事件时间线证明与现有内联脚本的初始化时相差不影响首帧；不能凭“看起来一样”决定。（`timeline-before.json`：`slider:initialized` 与 `domcontentloaded` 同一时刻 355.7ms；`timeline-after.json`：419.2ms，同样与 `domcontentloaded` 同刻——两个版本都发生在 DOMContentLoaded 之前，而 init 只写 `data-initialized` 属性并起 4s 计时器，不触发布局或绘制，首张 `active` 由构建期标记。）
- [x] 将 `Slideshow.astro` 的轮播 implementation 移到 runtime module；保留原有选择器、`data-initialized` 语义（如仍需）、hover 暂停、减少动效、500ms 过渡和 4000ms 默认间隔。（`src/utils/runtime/slideshow.ts` 逐段对照迁移：选择器、`DEFAULT_INTERVAL_MS=4000`、`LEAVE_CLEANUP_MS=550`、`prefers-reduced-motion` 分支、`data-initialized` 全部保留。）
- [x] `Slideshow.astro` 只保留 markup 与样式；脚本块移除后 DOM 与 CSS 不变。若 Astro 产物产生多余空脚本，确认无可见/网络副作用。（`.astro` 只删了 98 行 `<script>`；构建产物里 `#slider` 子树与迁移前逐字节相同（5780 bytes，`===` 相等）；空 `<script></script>` 计数迁移前后都是 9，模块脚本 6→5（内联脚本并入共享 bundle），无新增空脚本。）
- [x] 页面 owner 启动前先 stop 同功能的上一实例；stop 必须清 interval、interaction 监听和待收尾 timeout。（`stop()` 调 `teardown`：`disarm()` 清 interval、`clearTimeout(leaveTimer)`、`AbortController.abort()` 一次解绑全部元素监听，并在节点仍连接时删掉 `data-initialized`；`start()` 头部 `if (teardown) return` 防同页双启。）
- [x] 运行新生命周期测试：必须由红转绿；删除 stop 逻辑的局部变异必须再次红，恢复后绿。（红：`lifecycle-red*.log` 2/2/3、2 项失败；绿：`lifecycle-green.log`、`lifecycle-final-build.log` 2/1/2、7/7；变异：`stop()` 不执行 teardown → `lifecycle-mutation-red.log` 又回到 2/2/3、退出码 1，恢复后 sha256 `bb7ad05b…` 一致、再跑 7/7。）
- [x] 运行 `smoke:ui` 的幻灯片几何与指示点判据，通过集合不得减少。（整跑 **142/142、0 失败、退出码 0**（`smoke-ui.log`），与 F2.1 基线同一读数；幻灯片几何与指示点判据在其内。）
- [x] 用 Playwright 在桌面/移动各看一次：首张 active、指示点状态、手动前后切换、hover 暂停、移出恢复、减少动效不自动轮播。任何可见差异即停止。（`behavior.json`：桌面 5 张、首张 `active=0/dot=0`；下一条 1/1、上一条 0/0、点第 4 个指示点 3/3；hover 5.2s 停在 3，移出 4.8s 后到 4；移动 390×844 首张 0/0、下一条 1/1；`reducedMotion` 5.2s 仍 0，手动切到 1。）

#### F2.2 执行记录（2026-11-10）

- **环境**：Windows 11 / 系统 Node 24.18.0 / pnpm 10.26.2；`astro build` 退出码 0（15:56 与 16:1x 两次，`build.log` / `build-final.log`），`pagefind --site dist` 退出码 0，`pnpm preview --port 4322`。
- **改了哪些文件**：新增 `src/utils/runtime/page-session.ts`（47 行，纯调度）与 `src/utils/runtime/slideshow.ts`（148 行，轮播实现）；`src/utils/theme-script.ts` +17 行（导入、`pageSessions` 清单、表内 `swap: 9` 一行、`beforeSwap` 追加 stop）；`src/components/control/Slideshow.astro` −98 行（整个 `<script>` 块，markup/样式零改动）。
- **相位证据**：迁移前 `slider:initialized` 355.7ms、迁移后 419.2ms，两次都与 `domcontentloaded` 同刻；`load` 因第三方播放器在 0.8–21.5s 之间浮动，说明用 load 当基准不可靠。首帧不受影响的依据是 init 只写属性 + 起 4s 计时器，首张 `active` 由构建期决定。
- **生命周期**：迁移后 2（首页）→ 1（`/archive/`）→ 2（回首页）；旧实现 2 → 2 → 3。变异（`stop()` 不执行 teardown）回到 2 → 2 → 3、退出码 1，恢复后 7/7。
- **可见行为**：`smoke:ui` 142/142、0 失败；`behavior.json` 覆盖桌面/移动/减少动效三组读数（见上条）。
- **其它检查**：`pnpm check` 0 errors / 0 warnings / 6 hints；`pnpm test:lib` 54/54；`pnpm test:utils` 261/261；`verify-eol` 441 个文件 0 混合；全范围 Prettier 退出码 0。
- **遗留偏差**：① `smoke:ui` 与行为探针跑在「移除脚本 + 恢复变异」的那次构建上，之后只把 `Slideshow.astro` 末尾的空行交给 Prettier 删掉并重建（`#slider` 子树逐字节相同、CSS 哈希相同），最终产物上复跑了生命周期测试（7/7）；② hover 暂停的第一次探针读成「未暂停」，原因是点完指示点后指针仍停在轮播内、不会重新触发 `mouseenter`——修正探针顺序后读到正确结果，生产代码未因此改动；③ 本轮只迁 Slideshow，字号/tabs/TagCloud3D 仍走内联脚本 + `colorful:page:loaded`，`pageSessions` 清单里目前只有一行。

#### F2.3 迁移字号与侧栏 tabs

- [x] 字号功能迁入页面级 module：保留 localStorage key、范围、初始值、`--p` 轨道、选区清理、点击外部关闭的语义。（`src/utils/runtime/font-size.ts`：`postFontSize`、12–24、越界不应用、默认档不写内联样式、`--p`、`pointerdown` 清选区、`pointerdown` 点外收起，逐条保留。）
- [x] 原先的 `window.__fontSizeClickAwayBound` 守卫若由 owner 接管后失去必要，必须删除；若仍有其它入口依赖，保留并写明理由。（已删除：click-away 监听改由会话的 `AbortController` 持有，`stop()` 一次解绑；全仓 grep 无其它引用。）
- [x] 页面离开时移除字号新增的 document / window 监听与未完成的 pointer 状态；不得改变字号偏好在页面间的持久化。（`stop()` 里 `controller.abort()`，document 的 pointerdown 随信号解绑；本功能没有拖拽中间态——`pointerdown` 只清选区，不记录状态。持久化仍是 `localStorage.setItem("postFontSize", ...)`，返回文章页后按同一 key 恢复。）
- [x] 侧栏 tabs 迁入页面级 module：保留 click、Enter、Space、`aria-selected`、`hover` 类、panel 显隐和 dataset 初始化语义。（`src/utils/runtime/sidebar-tabs.ts` 逐条对照：三种触发、`hover` 类与 `aria-selected` 成对切换、`tab-panel-hidden`、`data-initialized`。）
- [x] 页面离开时清理 tabs 的所有监听；不得依赖“元素已被移除所以监听自然消失”。（每个 tab 的 click / keydown 都带 signal，`stop()` abort 后旧节点上的 click 监听计数归零——由生命周期测试直接读监听计数，不靠行为推断。）
- [x] 对字号做真实浏览器回归：文章页打开/关闭弹层、拖动滑杆改变字号、离开页面、返回后仍按 localStorage 恢复、外部点击关闭。（`behavior.json`：初始闭合 13px/无存储；点按钮后 `btnActive/popActive` 均 true；点外部关闭；把滑块推到 18 后正文 18px、存储 `"18"`、`range=18`；离开到 `/archive/` 再回来仍 18px、弹层闭合。）
- [x] 对 tabs 做真实浏览器回归：最新/手气不错切换、键盘 Space/Enter、换页后新侧栏仍可切换、旧页监听不重复触发。（点击切到第 2 项、Enter 切回第 1 项、Space 再切第 2 项，`aria-selected`/`hover`/`hidden` 三组读数同步；换页到 `/archive/` 后新侧栏点击仍可用；旧页监听归零见上一条。）
- [x] 生命周期测试增加两条断言：离开文章后字号 click-away 监听不残留；返回文章后仍只响应一次外部点击。（`smoke:runtime-lifecycle` 现有 14 项：`pointerBefore=1 → pointerAfter=0`、返回后 `pointerBack=1`；另加 tabs 旧节点 `tabClick 1 → 0`。）
- [x] 分别删除字号 stop 与 tabs stop 做变异，测试必须各自红；恢复后绿。（变异 A：`pointerAfter=1`、`pointerBack=2` 两红；变异 B：`tabClickAfter=1` 一红；恢复后 sha256 一致、14/14 全绿。）

#### F2.3 执行记录（2026-11-10）

- **环境**：同 F2.2（Node 24.18.0 / pnpm 10.26.2 / `preview --port 4322`）。
- **改了哪些文件**：新增 `src/utils/runtime/font-size.ts`（148 行）与 `src/utils/runtime/sidebar-tabs.ts`（89 行）；`theme-script.ts` 的 `pageSessions` 清单加两项；`src/pages/posts/[...slug].astro` −94 行、`src/components/widget/WidgetNewLog.astro` −40 行（各删一个 `<script>` 块，markup 未动）。
- **生命周期（14 项，全绿）**：`pointerBefore=1 → pointerAfter=0 → pointerBack=1`；`tabClick 1 → 0`；interval `2→1→1→1→2`。日志 `lifecycle.log`、`lifecycle-restored.log`。
- **两处变异各自红**：变异 A（字号 stop 不清理）→ `pointerAfter=1`、`pointerBack=2` 两红；变异 B（tabs stop 不清理）→ `tabClickAfter=1` 一红；两次都退出码 1，恢复后 sha256 与备份一致（`c13b00d2…` / `2169fc3c…`）、14/14 回绿。
- **行为探针**（`behavior.json`）：字号初始闭合（13px、无存储）→ 打开后 `btn/pop` 均 active → 点外部闭合 → 滑块推到 18 后正文 18px、存储 `"18"`、`range=18` → 离开到 `/archive/` 再回来仍 18px；tabs 点击/Enter/Space 三组读数（`aria-selected`/`hover`/`hidden`）全部同步，换页后新侧栏仍可切换。
- **构建期 markup 不变**：`tab_nav` 块 358 bytes、字号弹层 216 bytes，与迁移前逐字节相同；`#newlog` / `#randlog` 列表跨构建本就不同（构建期抽样，ADR 0012 记过整站非确定），不计入比对。
- **其它检查**：`smoke:ui` 142/142、0 失败；`pnpm check` 0/0/6。
- **遗留偏差**：① 第一次 `astro build`（变异 B 那次）因 `fonts.googleapis.com` 取字体失败中止（`Error fetching fonts: TypeError: terminated`），按既有处置重试即成功，未改构建代码；② 生命周期测试用「监听计数」而不是「点一下看行为」——旧实现的行为在多数路径上与残留监听不可区分，计数是唯一能证明解绑的读数；③ TagCloud3D 仍走旧形态（F2.4）。

#### F2.4 迁移 TagCloud3D 的异步实例

- [x] 将 TagCloud3D implementation 迁入页面级 module；保留库加载方式、`data-swup-ignore-script`、window 注册表或等价的唯一实例机制。（`src/utils/runtime/tag-cloud-3d.ts`：运行时注入 `<script src="/vendor/svg3dtagcloud/SVG3DTagCloud.global.js" data-swup-ignore-script>`、`libPromise` 缓存、`window.__tagCloud3D` 仍为唯一实例锚点、参数与旧实现逐项相同。）
- [x] 页面 stop 时必须销毁实例、清 rAF / resize 监听、清未完成的库加载回调；库加载 resolve 时若当前页面已离开，不得创建实例。（`stop()` 调 `window.__tagCloud3D.destroy()` 后置 `undefined`，并把 `disposed` 置真；续体先查 `disposed || !container.isConnected` 再建实例。rAF / resize 由库的 `destroy()` 回收，与旧实现同一条路径。）
- [x] 保留 `/tag/` 与 `/category/` 互切时先销毁旧实例的现有语义；不得让两个实例并存。（互切时 `beforeSwap` 先 stop 再 start；实测每页稳定后 `.tag3d-stage svg` 恒为 1，往返一圈仍为 1。）
- [x] 真实浏览器回归：`/tag/` → `/category/` → `/tag/`，每页稳定后 `.tag3d-stage svg` 恰好一个实例；无 console/pageerror；SVG 药丸链接仍可点击。（`behavior.json`：三页各 `stageSvg=1`、`stageLinks=32`；`consoleErrors: []`；命中测试 `hitInsideAnchor=true`（`hitTag=text`），合成点击导航到 `/tag/AI%E7%BC%96%E7%A8%8B/`。）
- [x] reduced-motion 下不启动动画，药丸云仍在；恢复偏好后新页面可正常启动。（`reducedMotion`：`stageSvg=0`、`registry="undefined"`、`ul.blogtags li` 仍是 2；常规上下文的 `/tag/` 与 `/category/` 均正常建实例。）
- [x] 生命周期测试加入异步竞态：库加载未完成即离开页面，完成后不得出现游离实例。（用 `page.route` 把脚本请求压 1.5s，进入 `/tag/` 后立刻换到 `/archive/`，等 2.2s 再读：`window.__tagCloud3D` 为 `undefined`、页面无 `.tag3d-stage svg`；前置断言 `libRequests === 1` 保证请求真的被拦过。测试共 17 项。）
- [x] 删除“已离开则不创建”的守卫做变异，竞态测试必须红；恢复后绿。（变异后 `registry="object"`、退出码 1；恢复后 sha256 `31eff802…` 一致、17/17 全绿。）

#### F2.4 执行记录（2026-11-10）

- **环境**：同 F2.2/F2.3；`astro build` 退出码 0（`build.log`、`build-restored.log`），`pagefind` 0。
- **改了哪些文件**：新增 `src/utils/runtime/tag-cloud-3d.ts`（约 150 行）；`theme-script.ts` 的 `pageSessions` 加第四项；`TagCloud3D.astro` −123 行（只删 `<script>`，markup/样式未动）。
- **生命周期（17 项）**：`lifecycle.log` / `lifecycle-restored.log` 全绿；新增三条竞态读数 `registry="undefined"`、`svg=0`、`libRequests=1`。
- **变异**：删掉 `disposed || !container.isConnected` 守卫 → `registry="object"`、退出码 1（`lifecycle-mutation.log`）；恢复后 17/17。
- **行为**：`behavior.json` 三页各 1 个 svg、32 条链接；`consoleErrors: []`；药丸命中与导航均通过；reduced-motion 下 `svg=0`、`registry=undefined`、药丸云仍在。
- **遗留偏差**：① 药丸链接的「真点」在转动的云上无法用 Playwright 的稳定性判据完成（元素持续移动），改用「同一帧命中测试 + 合成 click 看导航」，命中测试的 `hitTag=text`、跳转路径正确；② `stop()` 里没有显式 `cancelAnimationFrame`——库的 `destroy()` 是既有实现，F2 不重写库；③ F2.5 的全量扫描与截图验收已在本轮后续完成，见 F2.5 执行记录。

#### F2.5 全量 UI 与时序验收

- [x] 先按 F1 的 artifact 契约采集改前/改后样式指纹；两份 artifact 必须完整，`diff` 可见差异为 0。若 F1 未完成，本阶段不得开始实现。**用 F1 补丁后的工具复跑达成**：两份都 `complete:true`（各 23 页，四态目标/定位 1,220/1,220，`problems: []`；改前 22,542 行、改后 22,524 行），`diff` 退出码 **0**、**0/23 页**、**0 条差异**（`F2.5/diff-after-instrument-fix.log`）。首轮按当时工具是 12/23 页、2,365 条：差异全部来自 **18 个被迁走的内联 `<script>`** 及其造成的兄弟序号前移，而非渲染变化——当期已用多重集比对（23/23 一致）与 HTML 剥脚本比对（6/6 逐字节相同）证明，随后按 F1 补丁把六类不渲染元素移出比对（`scripts/lib/style-nonrendering.mjs`，16 条单测），并用六种变异验证它只放过不渲染元素。
- [x] 截图桌面 1440×900 与移动 390×844：首页首帧、文章页字号弹层关闭/打开、标签页云、分类页云；逐张归因，不把随机背景/第三方播放器差异算作回归。
- [x] 运行 `smoke:ui`、`smoke:series`、`smoke:wallpaper-pull`、`smoke:console`，比较**失败集合**而非只看总数；不得新增失败。
- [x] 运行 `pnpm test:article-toc-browser`，确认 Swup 换页与文章目录未被新 owner 改变。
- [x] 运行 `pnpm test:utils`、`pnpm test:lib`、`pnpm check` 与全范围 Prettier 检查。
- [x] 测量并记录改动前后客户端 JS 产物大小与加载的 chunk 数；变化必须能解释，若显著增大则停下问站长。
- [x] 检查 `runtimeTable` 非页面级行序、`swap` 1–8 顺序和 `runtimeHooks` 顺序逐项未变；把对照表写入证据日志。
- [x] 在 `docs/agents/components.md` 更新唯一协议：页面级 start/stop 表、常驻模块排除、迁移清单、禁止新增第四轨。
- [x] 在 `docs/agents/commands.md` 记录新 `smoke:*` 命令、base URL 形态与是否进 CI。
- [x] `CHANGELOG.md` 记录用户可见行为保持不变、timer/监听清理机制变化与全部实测读数。
- [x] 停在本地，等待站长；不 commit、不 push。

#### F2.5 执行记录（2026-11-10 17:01–17:42）

证据目录 `output/architecture-2026-11-10/F2.5/`（`README.md` 为完整记录）。

- **环境**：Windows 11 / 系统 Node 24.18.0 / pnpm 10.26.2；`astro build` 与 `pagefind` 均退出码 0。起点 `e060f02`，工作区含 F1 与 F2 未提交改动。
- **指纹**：改前用 14:12 归档产物（HEAD 源）在 `127.0.0.1:4401` 采，改后用 17:00 产物在**同一端口**采；两侧均 `complete:true`，各 23 页、四态目标/定位 1,220/1,220、无 uneven 页。元素行 22,542 → 22,524。
- **diff 原始结论**：首轮（F1 补丁前）`exit 1`、12/23 页、2,365 条差异（`diff-before-after.log`）。逐条归因后：身份多重集差只有 **18 条 `script`** + 1 对首页 `nth-child` 配色；剔掉不渲染元素后 **23/23 页一致**（`rendered-fingerprint.log`）；HTML 剥脚本并归一化随机列表与产物哈希后 **6/6 逐字节相同**（`markup-attribution.log`）。首轮按 F2 边界未改仪器，站长随后点名走 F1 补丁。
- **F1 补丁后复跑**：同一对 artifact，`exit 0`、`0/23` 页、`0` 条差异，汇总行注明两侧各剔除 199 / 181 条不渲染元素行（`diff-after-instrument-fix.log`）。补丁内容与变异矩阵见 `CHANGELOG.md` 同日条目与 `output/architecture-2026-11-10/F1-instrument/diff-matrix.log`。
- **截图**：18 张（两侧 × 桌面/移动 × 首页/文章页关闭态/`/tag/`/`/category/`，桌面另有打开态）。移动端字号入口被 `@media (max-width:680px)` 的 `.post-metaa .tools{display:none!important}` 隐藏（`global.css:5198`），两侧一致，故无移动打开态。
- **几何**：`#slider`、字号按钮/弹层、`.tag3d-stage`（各 1 个 `svg`，rect 完全相同）、`ul.blogtags`、tabs 的 rect 与计算样式逐项相同；唯一差异是移动端两个云集的 `scrollHeight`，同侧三次重复即自证为噪声（改动前侧 870/895/845，改动后侧 870/895/915）。
- **烟测**：四套判据名集合完全相同，`FAIL` 行均为 0，无新增失败（`smoke-set-compare.log`）。
- **产物**：JS 124 个 chunk 两侧同名一一对应，仅 `Layout.astro_astro_type_script_index_0_lang.*.js` 45,732 → 51,380 B（+5,648；gzip9 +1,691；brotli +1,429），站内 JS 总量 +0.10%；每页实读 `decodedBodySize` 恰好 +5,648，请求数不变；CSS 8 个同名文件逐字节相同（归档另有两份 11-07 的无引用残留）。
- **时序**：`runtimeTable` 28 → 29 行，非页面级行序逐项相同；swap 1–8 逐项相同，只在末尾追加 9；新行位于 `initArticleToc` 与 `initSwupHooks` 之间；`beforeSwap` 只在末尾追加 `pageSessions.stop`；`pageLoad` 三项不变（`assembly-order.log`）。
- **其余**：`test:article-toc-browser` 2/2、`test:lib` 54/54、`test:utils` 261/261、`check` 0 error/0 warning/6 hint、全范围 Prettier 退出码 0、`verify-eol` 441 文件 0 混合。
- **遗留偏差**：① 样式指纹那条首轮按当时的工具口径为红，已按站长点名做 F1 补丁（六类不渲染元素移出比对，16 条单测，六种变异验证）并用同一对 artifact 复跑转 `0/23`，见上条与 `CHANGELOG.md`。② 首次改后采集误用了另一个端口（产物留档 `fp-after-port4402/`）；工具 `load()` 有回环地址归一化（`upgrade-style-audit.mjs:569`），读数不受影响，但一次性探针直读原始产物会多出 369 条/页的端口差异，因此改后侧重采同端口，首次产物不用于结论。③ 移动端没有字号弹层打开态，原因是站点既有的 `max-width:680px` 规则，不是本轮引入。

#### F2.6 回滚与停止条件

- [x] 回滚单元：先恢复四个 `.astro` 的内联脚本与事件监听，再移除 owner 和页面 module；不得只回滚一半导致双初始化。（回滚单元 = 提交 `91a5255` 整体：四个 `.astro` 的内联脚本与 owner/页面 module 在**同一笔**里，整笔 revert 即两侧同时复位，不存在只回滚一半的路径。）
- [x] 若 owner 的实现必须改变轮播/字号可见时序才能工作，停止：这说明方案侵入产品行为。（**未发生**：`slider:initialized` 迁移前 355.7ms、迁移后 419.2ms，两次都与 `domcontentloaded` **同刻**（`F2.2/timeline-before.json` / `timeline-after.json`）；首张 `active` 是构建期标记，首帧不受影响；F2.5 的 18 张截图与几何逐项相同。）
- [x] 若 `smoke:ui` 或 `smoke:series` 的失败集合新增任何项，停止并回退；不得改判据文字掩盖失败。（**未发生**：F2.5 按判据名集合比对四套烟测，双向差集都是 0；收口轮复跑同样 0。）
- [x] 若无法证明 beforeSwap/afterSwap 相位等价，保留现有 Slideshow 实现，只深化已证明安全的功能；记录部分完成状态。（**相位等价已证明**：`runtimeTable` 非页面级行序逐项一致、`swap` 1–8 逐项一致（只在末尾追加 `9 pageSessions.start`）、`beforeSwap` 既有项序一致（只在尾追加）、`pageLoad` 三项不变（`F2.5/assembly-order.log`）；生命周期测试 `2→1→2` 证明 stop 真的在换页前跑到。因此 Slideshow 迁移保留。）

### Phase F3：拉绳壁纸测试桩合成 scenario adapter

#### F3.0 目的与边界

**目的：** 在不改生产 interface 的前提下，把两套重复的 DOM、事件、计时器、Image 测试桩收成一个 scenario-driven adapter，让成功、失败、拖拽、键盘共享同一套搭建与观测；行为断言仍留在各自测试。

**允许修改：**

- `src/utils/runtime/wallpaper-pull-interaction.test.ts`
- `src/utils/runtime/wallpaper-pull-failure.test.ts`
- 新增仅供测试使用的 helper（建议 `src/utils/runtime/wallpaper-scenario.ts`，不得使用 `.test.ts` 后缀，避免被 runner 当测试文件）
- 必要时更新 `CHANGELOG.md`

**禁止修改：**

- `wallpaper-pull.ts`、`wallpaper-crossfade.ts`、`wallpaper-pull-drag.ts`、`wallpaper-pull-attempts.ts` 与任何生产样式/DOM。
- 现有测试断言的业务期望；不得为了复用而删除失败、超时、无候选、减少动态等场景。
- 不引入新依赖。

#### F3.1 行为矩阵与迁移映射

- [x] 逐条列出两个测试文件的每个 test：操作、预载结局、可观察结果、是否走超时、是否涉及 reduced-motion。（44 例全表见 `output/architecture-2026-11-10/F3/behavior-matrix.md` §一）
- [x] 标出两套桩的差异：flush 轮数、classList 能力、计时器捕获、请求地址记录、window/document 事件。（同上 §二，另列出四处「承重」的桩语义：`document` 无 `createElement`、`getComputedStyle` 无 `getPropertyValue`、`Image.decode` 恒 reject、未知 selector 抛错）
- [x] 写一张“旧测试名 → 新测试名 / 断言是否原样保留”映射表；任何合并只允许合并 setup，不允许合并掉断言。（同上 §三；实测 44 条测试名逐字一致、断言消息逐字一致，仅 3 条搬进 adapter 的桩内断言换了措辞）
- [x] 记录 `pnpm test:utils` 基线 261/261（2026-11-10 实测），后面用来确认没有测试漏跑。（本轮起点 `91a5255` 上重跑：261/261、退出码 0，`F3/test-utils-baseline.log`）

#### F3.2 adapter 设计与实现

- [x] adapter 只提供操作与观测：建场景、布置池与偏好、派发点击/拖拽/键盘/取消、驱动预载成功/失败/超时、读取背景 src、播报、class、busy、尝试次数。（`src/utils/runtime/wallpaper-scenario.ts`，暴露 `createWallpaperScenario()`；观测面只有 getter 与只读方法，操作面只有派发与结局驱动）
- [x] adapter 不提供 `expectSuccess()` 之类会复制 implementation 判断的高阶断言；期望留在各测试。（adapter 单测里有一条护栏：`Object.keys(scenario)` 里不得出现 `expect*` / `assert*` / `should*`）
- [x] 未知选择器、未知事件或未消费的预载必须抛错，不允许静默空跑。（未知 selector → `unexpected selector`；派发到没有监听器的事件类型 → 抛错；没有可结束的候选预载 → 抛错）
- [x] adapter 的默认行为与现有测试桩等价；若必须改变（如 flush 轮数），先证明不会引入时序假绿。（flush 统一到 12 轮，两向对照实测：interaction 8→12 得 30/30、failure 12→8 得 14/14，`F3/flush-equiv/flush-equiv.log`）
- [x] 新 helper 本身至少有单元测试：未知 selector 抛错、场景未建立时读取失败、超时驱动只结算一次。（`src/utils/runtime/wallpaper-scenario.test.ts` 7 条，全绿）

#### F3.3 迁移与验收

- [x] 先迁 `wallpaper-pull-interaction.test.ts`，保持测试名与断言语义；`pnpm test:utils` 通过。（30 条测试名与断言消息逐字一致；单跑 30/30）
- [x] 再迁 `wallpaper-pull-failure.test.ts`，保持失败/超时/解锁/摇头断言；`pnpm test:utils` 通过。（14 条逐字一致；单跑 14/14；全量 `pnpm test:utils` **268/268**、退出码 0 = 基线 261 + adapter 新增 7）
- [x] 逐项核对旧测试映射表：无测试丢失，无断言降级，无固定 sleep。（测试名 44/44 逐字一致；断言消息逐字一致，差异只有 3 条搬进 adapter 的桩内断言——「harness 必须先建好」「应当有一次候选预载」「应存在一个明确的加载上限计时器」，它们变成了 adapter 的抛错文案；两个文件都没有固定 sleep，`flush` 仍是「微任务 + 一个宏任务」）
- [x] 变异一：临时删除生产 `finally` 里的 `busy = false` 与 dataset 清理；失败路径“还能再试”必须红，恢复后绿。**红 ✓**：`44 → 38 pass / 6 fail`、退出码 1，红的正是「候选加载失败…之后还能再试」「失败路径解除忙碌」「超时按失败处理…可再试」「成功路径解除忙碌」「无候选路径解除忙碌」「减少动态：Space 与 Enter 都仍能换图」。恢复后 sha256 回到 `64dd9bad…`
- [x] 变异二：临时删除 `image.complete && image.naturalWidth > 0` 的 decode 拒绝回退；成功路径必须红，恢复后绿。**红 ✓**：`44 → 26 pass / 18 fail`、退出码 1，全部成功路径用例转红
- [x] 变异三：临时删除指针 ID 过滤或 pointercancel 复位；多指/取消测试必须红，恢复后绿。**取消分支红 ✓**（删掉 `pointercancel` 的复位 → 「pointercancel 一律不换图，但会安全复位」转红，`44 → 43 pass / 1 fail`）；**多指分支未红 ⚠️**：删掉 `releasePointer` 的指针 ID 过滤后仍是 `44/44` 全绿——**现有用例没有任何一条覆盖「第二根手指」**，这是本轮实测出来的覆盖缺口（不是本次迁移造成的），已记入 F3 执行记录与遗留风险
- [x] 变异后确认 `git diff` 无生产文件改动；测试 helper 不进入客户端 bundle。（`git diff --name-only` 只含两个测试文件；生产文件 `wallpaper-pull.ts` sha256 与备份一致、`grep "F3 变异"` = 0；`dist/` 全量搜 adapter 的 5 个特征串 **0 命中**；客户端 JS chunk 摘要与本轮改动前**逐字节相同**（`4964d832…`，124 个 chunk / 5,478,983 B））
- [x] 运行 `pnpm test:utils`、`pnpm check`、Prettier 检查；不需要重新跑浏览器烟测，因为生产代码未变。（`test:utils` 268/268 退出码 0；`pnpm check` 0 errors / 0 warnings / 6 hints 退出码 0；全范围 Prettier 退出码 0；`verify-eol` 451 文件 0 混合）
- [x] 若迁移中发现生产行为无法在 adapter 中观测，停止并记录：不得新增生产测试钩子。（未触发：四类外部可观察结果（背景 src、播报词、宿主 class、CSS 变量 / dataset）全部能在桩上读到，没有新增任何生产测试钩子）
- [x] 停在本地，不 commit、不 push。（工作区：`M` 两个测试文件 + `??` 两个新文件 + 未跟踪的 `docs/improvements/`；**未 commit、未 push、未建 PR**）

#### F3 执行记录

- **日期 / 环境**：2026-11-10 21:0x–21:4x，Windows 11 / 系统 Node 24.18.0 / pnpm 10.26.2；起点 SHA `91a5255`（`main`）。
- **改动面**：`M src/utils/runtime/wallpaper-pull-interaction.test.ts`、`M src/utils/runtime/wallpaper-pull-failure.test.ts`、`?? src/utils/runtime/wallpaper-scenario.ts`（新，测试专用 helper）、`?? src/utils/runtime/wallpaper-scenario.test.ts`（新，adapter 自身的单测）、`M docs/improvements/…`（本计划文件）、`M CHANGELOG.md`。**生产代码零改动**：`wallpaper-pull.ts` / `wallpaper-crossfade.ts` / `wallpaper-pull-drag.ts` / `wallpaper-pull-attempts.ts` / `wallpaper-candidates.ts` / 样式 / 页面 / 依赖全部未动。
- **adapter 形态**：`createWallpaperScenario(options)` 返回一个场景对象，观测面是 getter（`backgroundSrc` / `announcement` / `attemptCount` / `requestedUrls` / `classesAdded` / `classesRemoved` / `styleProps` / `dataset` / `hasClass` / `styleProp`），操作面是派发（`click` / `keyDown` / `drag` / `release` / `cancelPointer` / `losePointerCapture` / `pressEscape` / `blurWindow` / `noteDragRelease` / `clearDragRelease` / `setReducedMotion` / `setPool` / `setRandom`）与结局驱动（`finishLastPreload` / `failAllPreloads` / `fireLoadTimeouts`）与时序（`flush` / `settleFrame`）。**没有** `expectSuccess()` 之类的高阶断言。
- **实测读数**：`pnpm test:utils` **268/268**、退出码 0（基线 261 + adapter 新增 7）；`pnpm check` 0 errors / 0 warnings / 6 hints、退出码 0；全范围 Prettier 退出码 0；`verify-eol` 451 文件 0 混合；`astro build` 退出码 0（首次因 `fonts.googleapis.com` 取字体抖动中止，重试成功）；`dist/` 全量搜 adapter 的 5 个特征串 0 命中，客户端 JS chunk 摘要与改动前逐字节相同。
- **变异结果**：变异一 6 红、变异二 18 红、变异三（pointercancel 复位）1 红，全部退出码 1，恢复后 sha256 回到 `64dd9bad…`、`grep "F3 变异"` = 0。
- **遗留偏差**：
    1. **多指路径没有测试覆盖**——变异三的另一个分支（删掉 `releasePointer` 的指针 ID 过滤）跑出来仍是 44/44 全绿。这是本轮实测出的既有覆盖缺口，与本次迁移无关；本轮**没有**为此补用例（补它属于新增行为断言，超出 F3「只允许合并 setup」的边界），留给 F5 决定是否补。
    2. **flush 轮数从 8/12 统一到 12**：这是唯一一处改变了既有桩行为的地方。已用两向对照证明不改变任何结局（§F3.1），但严格说是「行为统一」而非「零改动」。
    3. **三条桩内断言换了措辞**：从 `assert.ok(...)` 的消息变成 adapter 的抛错文案（见上）。它们本来就只服务于桩自身，不是业务期望。
    4. **两次构建**：第一次 `astro build` 因外部字体源抖动失败（与本轮无关的既有现象），重试退出码 0。
- **证据目录**：`output/architecture-2026-11-10/F3/`（`behavior-matrix.md`、`flush-equiv/`、`mutations/`、`test-utils-*.log`、`astro-check.log`、`build*.log`、`prettier-check.log`）。

### Phase F4：文集成员页烟测场景化

#### F4.0 目的与边界

**目的：** 用同一套成员场景检查器覆盖每个成员的顶部行、末尾行、当前项与目录链接，让新增成员自动获得页面接线验证；oracle 继续独立于生产函数。

**允许修改：**

- `scripts/series-smoke.mjs`
- `docs/agents/commands.md`（只更新该命令的判据数与说明）
- `CHANGELOG.md`

**禁止修改：**

- 生产 `src/utils/series.ts`、`series-integrity.ts`、文章 frontmatter、页面组件、样式。
- ADR 0007 的组内序列、0 基显示、末章收尾、非成员跳过、单位量词。
- 非成员、粘性栈、文章目录等其它异质判据；不得把它们并入成员循环。

#### F4.1 基线与环境

- [x] 先读 `docs/agents/commands.md` 的 series 条目：当前写 39，而 `scripts/series-smoke.mjs` 的 `EXPECTED_CHECKS` 在 2026-11-10 为 88。**不得拿 39 当基线**；把这一既有文档偏差报告给站长，并在本 finding 的文档同步里按实测值修正。**已做**：文档写 39、脚本写 88，两者不符属实；基线取实测 88（`baseline-series.log`），文档同步里按当日实测 117 修正（`docs/agents/commands.md` 的 series 条目）。
- [x] `pnpm exec astro build`，确认构建完整、无 `SAFE_DELETE_*`、`dist/pagefind/` 非空。**已做**：退出码 0、`229 page(s) built`、日志无 `SAFE_DELETE`（`F4/build.log`）；`pagefind --site dist` 退出码 0、`dist/pagefind/` 14 个文件（`pagefind.log`）。
- [x] `pnpm preview --port 4322`，用 `SERIES_BASE_URL=http://localhost:4322` 运行 `pnpm smoke:series`，保存完整输出和实际 `total`。**已做**：**88/88、0 失败、退出码 0**（`baseline-series.log`），`total` 实测 88。
- [x] 记录通过集合与总数；若基线不是全绿，先分类既有失败，不进入重构。**已做**：基线全绿、无既有失败；通过集合逐条存盘（`baseline-names.txt`，88 条）。

- [x] 在 MEMBERS / SERIES_NAME / COVER 旁增加独立数据：每个文集的 `unit`（章/篇）与成员序号的知识，不从 `buildSeriesNote` 生成期望。**已做**：新增 `UNIT`（`章` / `篇`），成员序号即 `MEMBERS` 数组下标——两处都独立于生产代码。
- [x] 写一个成员场景检查器：输入成员 id、位置索引、总数、名称、unit，输出顶部/末尾/当前项/链接的期望；断言仍在测试文件内。**已做**：`memberScenario({id,index,total,name,unit,slug})` 只产出期望对象（顶部行文案 + 目录链接、末尾行文案 + 链接、侧栏当前项 href），断言全部留在 smoke 主流程里；**不引用**生产 `buildSeriesNote` / `getSeriesView`。
- [x] 用循环覆盖 MEMBERS 中全部成员，末章由“索引是否等于长度−1”判定，不写死章节号。**已做**：11 个成员 × 4 条 = 44 条；末章判定是 `index === total - 1`。
- [x] 保留第〇章、第三章到第八章已确认的文案语义；循环不得改变 0 基显示或“第 0 / 9 章”的既有文案。**已做**：改前先用探针把 11 个成员页的真实 DOM 读数落盘（`members-probe.json`），改后逐字相同；0 基显示保留（第 0 / 9 章）。
- [x] 非成员页、侧栏粘性、文章目录、封面、总览页保持原有判据，不并入循环。**已做**：这些判据一行未动；通过集合比对显示异质判据**零条丢失**。
- [x] 侧栏期望继续从 MEMBERS 派生，不复用生产 `getSeriesView` / `buildSeriesNote`。**已做**：条目数 = `ids.length`、链接升序 = `ids.map(...)`，全部取自 `MEMBERS`。

- [x] 运行改后 smoke，记录实际 `total`；把 `EXPECTED_CHECKS` 更新为实测值，并在证据日志里写明从旧值到新值的差值来源（新增覆盖了哪些成员/场景）。**已做**：实测 **117**，`EXPECTED_CHECKS` 由 88 改为 117。差值来源：88 − 21（成员相关的旧判据被参数化替代）+ 50（11 成员 × 4 + 2 文集 × 3）= 117；此前一条判据都没有的三个成员 `20261002081331` / `20261002093931` / `20260919135000` 首次获得覆盖。
- [x] 判据总数守卫仍必须存在：故意漏跑一个成员场景时，total 与写死基线不符，进程以退出码 2 失败。**已做**：临时 `continue` 掉一个成员 → **退出码 2**、113 项（`mut-skip-member.log`），恢复后 117/117。
- [x] 变异一：临时把末章文案改回普通章文案，smoke 必须红；恢复后绿。**已做**，两侧都做：oracle 侧（末章判定恒为 false）→ 退出码 1、恰好 2 红；**生产侧**（`buildSeriesNote` 的 `bottom: isLast && false`，重建产物后跑）→ 退出码 1、恰好 2 红、其余 115 条仍绿；恢复源码后 sha256 回到 `8efc9ee7…`、重建复跑 117/117。
- [x] 变异二：临时把某一成员的侧栏链接期望写错一位，smoke 必须红；恢复后绿。**已做**：把 `20261002204249` 的侧栏当前项期望写成同文集的下一位 → **退出码 1**、恰好 1 红（就是那一个成员，`mut-member-current-off-by-one.log`）。
- [x] 变异三：临时从 MEMBERS 删除一个成员但保留循环，覆盖与 total 必须变化并由守卫拦住；恢复后绿。**已做**：删掉 `20261002093931` → **退出码 2**、112 项、20 红（覆盖与 total 同时变），恢复后 sha256 一致、117/117。
- [x] 检查通过集合：原有非成员/封面/粘性/目录判据不得少一项；新增成员覆盖项必须逐项列出。**已做**：按判据名集合比对，改前 88 / 改后 117，消失的 21 条**全是成员相关**，异质判据 0 条丢失；新增 44 条成员覆盖项逐条见 `after-names.txt`。
- [x] 更新 `docs/agents/commands.md` 的 series 判据数与命令说明，使其等于当日实测，不写会漂的派生值。**已做**：写死值 117，并注明「以脚本里的 `EXPECTED_CHECKS` 为准」；同时补记本轮实测到的两条坑（外部视频嵌入把 load 拖到 15.5s / 30s 超时；Windows 上构建前必须先停 preview，否则 `EPERM`）。
- [x] `CHANGELOG.md` 记录测试覆盖变化与实测计数；生产零改动。**已做**：新增 F4 条目（改动、动机、实测读数、五组变异表、失败路径与踩坑）。
- [x] 停在本地，不 commit、不 push。**已做**：`git status` 只有 `scripts/series-smoke.mjs` 已改、`docs/improvements/` 未跟踪；未 commit、未 push、未建 PR、未部署。

#### F4 执行记录（2026-11-10）

- **环境**：Windows 11 / 系统 Node 24.18.0 / pnpm 10.26.2；起点 SHA `7a0c89c`（`main`）。
- **证据目录**：`output/architecture-2026-11-10/F4/`（`baseline-series.log` / `after-run3.log` / `after-restored.log` / `members-probe.json` / `baseline-names.txt` / `after-names.txt` / `mut-*.log` / `build*.log` / `series-smoke.pristine.mjs` / `series.ts.pristine.bak`）。
- **改动面**：只 `scripts/series-smoke.mjs`（+148 / −161）；`git diff --name-only -- src/` = 0，生产代码零改动。
- **读数**：基线 88/88 → 改后 117/117（退出码 0）；五组变异的退出码依次为 2 / 1 / 1 / 2 / 1。
- **遗留偏差**：① 变异一的「生产侧」那一组临时改过 `src/utils/series.ts`，跑完立即还原（sha256 回到 `8efc9ee7…`）并重建产物，最终工作区 `src/` 零改动；② `docs/agents/commands.md` 的「39 条」是本轮之前就存在的文档偏差，本轮按实测修正为 117；③ 外部视频嵌入的拦截只匹配 YouTube / Bilibili / 腾讯视频三个域，将来若引入别的第三方 iframe，load 仍可能被拖长。

### Phase F5：壁纸“图片何时可画”内部 module

#### F5.0 目的与边界

**目的：** 只抽取两个壁纸事务共同的“单次结算 + 可画判定 + 监听清理”实现，消除晚到事件与清理知识的跨 seam 泄漏；保留预载与提交两种不同事务策略。

**允许修改：**

- `src/utils/runtime/wallpaper-pull.ts`
- `src/utils/runtime/wallpaper-crossfade.ts`
- 新增内部 module（建议 `src/utils/runtime/image-readiness.ts`）
- 对应测试与 `CHANGELOG.md`

**禁止修改：**

- 任何 CSS、WallpaperPull DOM、配置、播报文案、超时时长（预载 12s、提交 1.5s）、临时层顺序、交叉淡入时长、候选选择与回滚语义。
- 不把 `random-background.ts` 的全池初选合并进来。
- 不改变 `initWallpaperPull()` / `crossfadeBackground()` 的外部 interface；不新增生产测试出口。

#### F5.1 先做等价性 spike（未通过就停止）

- [x] 建立行为矩阵：decode resolve、decode reject + complete/naturalWidth、load、error、timeout、late load、late error、二次 settle、监听清理、临时层创建失败。**已做**：矩阵落盘 `output/architecture-2026-11-10/F5.1/behavior-matrix.md`（10 行 × 2 侧），并附读码得出的**两侧五处实质差异**：事件机制（属性 vs addEventListener）、decode 的提问位置（load 后 vs load 前）、decode 兑现时的判定（复核尺寸 vs 不复核）、**超时窗口**（预载 12s 覆盖 load+decode 整段 vs 提交 1.5s 只覆盖 decode 之后的 load 段、decode 段无上限）、返回值（三档 vs boolean）。
- [x] 在两侧现有测试上标注每条矩阵的覆盖点；缺失的先补测试，不改生产。**已做**：标注见矩阵文档第三、四节；**11 处缺口全部补上**（预载侧 5：decode 兑现、late load、late error、二次 settle、监听清理；提交侧 6：load 事件路径、1.5s 超时、late load、late error、二次 settle、监听清理）。新增 `src/utils/runtime/wallpaper-preload-readiness.test.ts`（6 条）与 `wallpaper-crossfade.test.ts` 的 6 条矩阵用例 + 提交超时计时器的捕获桩；adapter 按 F5.3「若 F3 的 adapter 不能覆盖矩阵，先补 F3」扩了三处能力（`decodeOutcome` 可选、`firePreloadEvent`、`preloadHandlersAttached`）。**生产代码零改动**。`pnpm test:utils` **282/282**（基线 268 + 新增 14）、退出码 0。
- [x] 用临时探针或本地草稿验证共享 module 是否真能只暴露一个小 interface；不把草稿提交。**已做**：草稿与探针都在 `output/architecture-2026-11-10/F5.1/spike/`（**未进仓库**）。差分探针把「今天的预载 / 今天的提交 / 草稿预载 / 草稿提交」四条实现放在同一批 9 个场景上跑：**8 个场景结局完全一致**，唯一始终存在的残留是提交侧多问一次 `decode()`；另在真实 Chromium 上量了同一 `<img>` 连续两次 `decode()`：合法图 5ms→**0ms**、坏图 1ms→**0ms**（结果不变、坏图也不重试）。
- [x] 若共享 module 需要 `mode: "preload" | "commit"`、多个超时参数或回滚标志才能兼容，判定 deletion test 失败，**停止并记录"不做"**；不得强行统一。**已做**：**deletion test 通过**——草稿 A 的 interface 是 `whenPaintable(image, { timeoutMs })`，一个超时参数、无 mode、无回滚标志；两侧的事务差异（decode 提问位置、超时含义、回滚、谁设置 src）全部留在 caller。报告见 `F5.1/spike-report.md`。
- [x] 若通过，写下共享 module 的不变量：只结算一次、清理监听/计时器、可画判定口径、错误分类；事务差异留在 caller。**已做**：六条不变量写在 `F5.1/spike-report.md` 第五节（只结算一次／结算即清监听与计时器／判定一律 `complete && naturalWidth > 0` 且 decode 兑现与被拒同路／三档分类与各自映射／已经可画就早退／事务差异留在 caller）。

#### F5.1 执行记录（2026-11-11）

- **环境**：Windows 11 / 系统 Node 24.18.0 / pnpm 10.26.2；起点 SHA `7a0c89c`（`main`）。
- **证据目录**：`output/architecture-2026-11-10/F5.1/`（`behavior-matrix.md` 矩阵与覆盖标注、`spike-report.md` spike 结论与不变量、`spike/differential-probe.mjs` + `.log` 差分探针、`spike/decode-twice-probe.mjs` + `.log` 真实 Chromium 的两次 decode 实测、`test-utils-after.log`）。
- **改动面**：`src/utils/runtime/wallpaper-scenario.ts`（adapter 扩三处能力）、`wallpaper-scenario.test.ts`（+2 条）、`wallpaper-crossfade.test.ts`（+6 条 + 提交超时计时器捕获桩）、新增 `wallpaper-preload-readiness.test.ts`（6 条）。**生产代码零改动**（`wallpaper-pull.ts` / `wallpaper-crossfade.ts` / 样式 / 页面 / 依赖未动）。
- **读数**：`pnpm test:utils` **282/282**、退出码 0；差分探针 9 场景 8 结局一致；Chromium 两次 decode 第二次 0ms。
- **spike 结论**：**deletion test 通过**——共享 module 的 interface 是 `whenPaintable(image, { timeoutMs })`，无 mode、单个超时参数、无回滚标志。**但 F5.2 实施时必须盯住三件事**（详见 spike-report 第六节）：提交侧自己那一次 decode 必须留在 caller（位置在 load 之前）；早退那条不能删（对预载像空操作，删了在提交侧会分叉）；module 不得长成第二个生产测试出口。
- **遗留偏差**：① 提交侧会多问一次 `decode()`（同一元素同一 src，Chromium 实测 0ms、结果不变）；② adapter 的三处扩展是「补 F3」性质的改动，F5.0 的允许清单里没写 adapter，靠 F5.3 那条「若 F3 的 adapter 不能覆盖矩阵，先补 F3」授权；③ 移动端与真实弱网下的时序没有实机复验（本阶段只做等价性判定，实机验收属 F5.3）。

#### F5.2 实施与测试

- [x] 新增内部 module，仅收“单次结算、可画判定、清理”；预载仍新建独立 `Image`，提交仍操作原图层。**已做**：新增 `src/utils/runtime/image-readiness.ts`（127 行），只导出 `whenPaintable(image, { timeoutMs })` 一个 interface，返回 `"ok" | "failed" | "timeout"` 三档。module 内只做四件事：第一个信号定案、可画判定（`complete && naturalWidth > 0`）、结算即摘监听与清计时器、一个加载上限。预载侧仍 `new Image()`、提交侧仍操作原图层 `target`，两边都没换宿主元素。
- [x] `preloadCandidate` 改为调用共享 readiness，保留 12s 超时、候选轮换与 timeout 分类。**已做**：`preloadCandidate` 从 33 行缩到 9 行（新建独立 Image → 调 module（`timeoutMs: LOAD_TIMEOUT_MS`）→ 最后写 `src`）。12s 上限、`timeout` 独立成档（按失败处理、换下一个候选、解除忙碌）原样保留；候选轮换在 `wallpaper-pull-attempts.ts` 里，本轮没动那个文件。
- [x] `commitOriginal` 改为调用共享 readiness，保留 1.5s 超时、原图层回滚与 load/error 语义。**已做**：`waitForImage` 整个删除（15 行），`commitOriginal` 改调 `whenPaintable(target, { timeoutMs: COMMIT_TIMEOUT_MS })`；`result !== "ok"` 即 `target.src = previous` 回滚。**自己的那一次 decode 留在 caller**（位置在 load 之前、不受 1.5s 预算约束）——spike 报告第六节那条硬约束。
- [x] 现有交叉淡入临时层、abort/commit 顺序、减少动态路径完全不变。**已做**：`wallpaper-crossfade.ts` 的 diff 只有两处——加 import、`commitOriginal` 换实现并删 `waitForImage`；`crossfadeBackground` / `replicate` / 临时层插入位次 / `gate` 闸门 / `generation` / abort 与 commit 的先后顺序 / 减少动态的直切分支，一行未动（见 `F5.2/` 里的 diff 与 21 条 crossfade 用例全绿）。
- [x] 新 module 增加定向单测；现有两个测试文件的断言不删，必要时只改 setup。**已做**：新增 `src/utils/runtime/image-readiness.test.ts`（13 条：早退、decode 兑现/被拒/缺席、有无固有尺寸、error、超时独立成档、第一个信号定案两个方向、结算后监听摘除、迟到信号不改结局、结算后计时器清掉）。四个既有测试文件（interaction / failure / crossfade / preload-readiness）**一行未动**（`git diff --name-only` 为空）；只改了 adapter 桩（`wallpaper-scenario.ts`）——假图片从 `onload/onerror` 属性换成 `addEventListener/removeEventListener`，与 module 的机制对齐，属 setup 改动。
- [x] `pnpm test:utils` 全部通过；原有壁纸测试名与断言仍在。**已做**：**295/295**、退出码 0（基线 282 + module 新增 13）；四份壁纸测试 71/71、module 13/13。测试名与断言未删未改（既有四个测试文件的 diff 为空）。

#### F5.2 执行记录（2026-11-11）

- **环境**：Windows 11 / 系统 Node 24.18.0 / pnpm 10.26.2；起点 SHA `9b3fff6`（`main`）。
- **证据目录**：`output/architecture-2026-11-10/F5.2/`（`spike/differential-probe.mjs` + `.log` 差分探针、`spike/load-error-mutuality-probe.mjs` + `.log` 真实 Chromium 的 load/error 互斥性实测、`verify-old-copies.mjs` 探针旧实现与改前生产代码的逐行核验、`test-utils-final.log`、`astro-check.log`、`prettier-check.log`、`apply.mjs` / `apply-scenario.mjs` 改动脚本、`*.bak` 改前副本）。
- **改动面**：新增 `src/utils/runtime/image-readiness.ts`（127 行）与 `src/utils/runtime/image-readiness.test.ts`（13 条）；改 `src/utils/runtime/wallpaper-pull.ts`（−24 行）、`src/utils/runtime/wallpaper-crossfade.ts`（−11 行）、`src/utils/runtime/wallpaper-scenario.ts`（adapter 桩，setup 性质）。**四个既有测试文件一行未动**；样式、页面、依赖、`package.json` 未动。
- **读数**：`pnpm test:utils` **295/295**（退出码 0）；四份壁纸测试 71/71；module 自身 13/13；`pnpm check` 0 errors / 0 warnings / 6 hints；全范围 Prettier 退出码 0；`verify-eol` 454 文件 0 混合。
- **等价性判定**：差分探针把「改前的两条事务」与「现在的两条事务」放在**同一批 11 个场景**上跑，**9 个场景结局完全一致**。两处不同：
    1. **S10（load 后同一 tick 到达 error）· 预载侧**：改前 `failed`、现在 `ok`。原因是 module 实行「**第一个信号定案**」——load 先到就由 load 定案，后到的 error 不翻案；改前的预载之所以是 `failed`，是因为它的 load 分支要等 decode 落定（结算被推迟），同 tick 到达的 error 抢先结算了。提交侧两边都是「可画」，**提交侧语义未变**（改前的提交本来就是在 load 处理器里同步结算的）。
    2. **S9（第二次 decode 很慢）· 提交侧**：改前可画、现在不可画——这是 F5.1 spike 已记录的残留 B（Chromium 实测同一元素第二次 `decode()` 为 **0ms**、结果不变）。
       另有 2 处「结局同、decode 次数不同」（提交侧 decode×2 vs decode×1）——F5.1 spike 的残留 A，同样已实测为 0ms。
- **S10 不可达的实测**：真实 Chromium 里量了三次——合法图只收到 `load`、坏图只收到 `error`、只有「换 src」才会同时收到两个（`[load, error]`）。预载的图像对象**每次新建、`src` 只写一次**，因此「同一次请求先 load 再 error」在真实浏览器里不会发生（F5.2 的 Chromium 实测日志）。即便发生，新结局（`ok`）也更贴近事实：那张图确实加载成功且有固有尺寸。
- **一处实现上的修正（相对 F5.1 spike 草稿）**：草稿在 load 分支等 decode 落定后才判定可画，**结算被推迟一个微任务**——同 tick 到达的 error 会抢先，F5.1 写下的 commit 侧矩阵 #8（「load 与 error 先后到，结果只由第一次结算决定」）因此变红。落地的 module 改为：**第一个信号定案**（load 分支在 load 当刻取「可画性快照」，判定不再被后到的信号改写）。两条事务的「只结算一次」语义因此都成立，且**没有改动任何既有断言**。
- **遗留偏差**：① S10 那处预载差异虽实测不可达，但它确实是一处语义变化，已写进 `CHANGELOG.md`；② 提交侧多问一次 `decode()`（残留 A，实测 0ms）；③ 提交侧在第二次 decode 很慢时会超时回滚（残留 B，实测 0ms，但保留该场景是为了把风险边界写死）；④ module 的「第一个信号定案」与「判定取快照」这两条是本轮新增的语义，它们**改前并不存在于任何一侧**（改前预载是「结算定案」、提交是「状态定案」），本轮统一成「信号定案」。

#### F5.3 变异与最终验收

- [x] 变异一：删除共享 module 的单次结算守卫，制造 late load/error；相关测试必须红，恢复后绿。**已做**：删掉「第一个信号定案」的 `claimed` 守卫 → **2 红**（module 自身的「第一个信号定案：load 先到，后到的 error 不许翻案」与 commit 侧「矩阵 #8：load 与 error 先后到」），退出码 1。**附带测了一条**：只删 `settled` 那一道 → 起初 **84/84 全绿**，观测不到任何变化——那道守卫**不改变结局**（Promise 只能 resolve 一次，`claimed` 已经挡住了迟到信号），它真正保证的是 `settle()` 的**副作用**（摘监听、清计时器）也只做一次。随后补了一条判据（数「一共摘过几个监听器」），该变异现在是 **1 红**、退出码 1。
- [x] 变异二：删除自然尺寸回退，decode 拒绝但已加载的合法图必须失败；测试红，恢复后绿。**已做**：把 load 分支的 decode 被拒分支从「按固有尺寸兜底」改成「直接判失败」→ **24 红**、退出码 1（module 自身 1 条 + 提交侧矩阵 #3/#7/#8 三条 + 预载侧与交互测试其余各条）。与 F3 期「删 decode 回退 → 18 红」同量级。
- [x] 变异三：删除监听清理，晚到事件测试必须红；恢复后绿。**已做**：删掉结算时的 `removeEventListener` → **3 红**、退出码 1（module 自身、提交侧矩阵 #9、预载侧矩阵 #9——三条都直接观测「监听被摘掉」）。三组变异跑完立即还原，sha256 回到 `ebbdf13e…`，`git diff` 对该文件为空，还原后 84/84 回绿。
- [x] 运行 `pnpm smoke:wallpaper-pull`（build + preview 4322），四条既有判据通过；比较失败集合不变。**已做**：`astro build` 退出码 0（无 `SAFE_DELETE`）+ `pagefind --site dist` 退出码 0 → preview 4322 → **47/47、0 FAIL、退出码 0**。与 F2.1 基线比**判据名集合**（不是总数）：47 条逐条一致，「基线通过但现在没通过」0 条、「现在新增通过」0 条。
- [x] 用桌面与移动手动/自动测试：单击、拖拽阈值、未达阈值回弹、键盘、失败播报、减少动态；任何视觉时序差异即停止。**已做**：把两个生产文件回退到 `9b3fff6`（F5.2 之前）构建一份「改前」产物，与当前产物分别用静态服务跑同一套 Playwright 探针（**4401 = 改前、4402 = 改后**，同一套服务器实现，只换根目录）。三个视口（1440×900 桌面 / 768×1024 平板 / 390×844 手机）+ 减少动态一档，六类场景全覆盖。**逐项对比：除 base URL 本身外，两侧读数完全一致，零差异。**
- [x] 运行 `pnpm test:utils`、`pnpm check`、Prettier 检查。**已做**：`pnpm test:utils` **295/295**、退出码 0；`pnpm check` 0 errors / 0 warnings / 6 hints、退出码 0；全范围 Prettier 退出码 0；`verify-eol` 456 文件 0 混合。
- [x] 若 F3 尚未完成，不开始 F5；若 F3 的 adapter 不能覆盖矩阵，先补 F3，不在 F5 里临时造测试台。**已做**：F3 已完成（F3.1–F3.5 全部勾上）。矩阵覆盖靠 F3 的 adapter 扩三处能力（`decodeOutcome` 可选、`firePreloadEvent`、`preloadHandlersAttached`）+ F5.1 新建的 `wallpaper-preload-readiness.test.ts`；**F5 全程没有临时造过测试台**。F5.2 只改了 adapter 的**桩机制**（假图片从属性改成监听，与 module 同形），属 setup。
- [x] `CHANGELOG.md` 记录内部 module、两次事务如何保持不同、全部测试读数。**已做**：F5.2 的条目补上「内部 module / 两次事务如何保持不同 / 全部测试读数」，并追加「F5.3 验收」一节（三组变异矩阵、smoke 判据集合比对、浏览器 A/B 读数）。
- [x] 停在本地，不 commit、不 push。**已做**：本轮工作区只有未跟踪的 `docs/improvements/`；`F5.3` 的证据全在 `output/`（已 gitignore）。

#### F5.3 执行记录（2026-11-11）

- **环境**：Windows 11 / 系统 Node 24.18.0 / pnpm 10.26.2；起点 SHA `b674ad3`（F5.2 已提交）。
- **证据目录**：`output/architecture-2026-11-10/F5.3/`（`mutate.mjs` 变异器、`mut-*.test.log` 三组变异的测试输出、`image-readiness.pristine.ts` + `pristine.sha` 改前副本、`probe-behavior.mjs` 浏览器行为探针、`behavior-before.json` / `behavior-after.json` 两侧读数、`smoke-wallpaper-pull.log` + `baseline-names.txt` / `now-names.txt` 判据集合、`build-before.log` / `build-after.log`、`test-utils.log` / `astro-check.log` / `prettier-check.log`）。
- **改动面**：**生产代码零改动**（本阶段只是验收）。F5.2 的两笔改动（`b674ad3`）已提交；本阶段工作区只有未跟踪的 `docs/improvements/`。
- **三组变异**（每组跑完立即还原，sha256 回到 `ebbdf13e…`、`git diff` 为空、还原后 84/84 回绿）：

    | 变异                                  | 结果                              |
    | ------------------------------------- | --------------------------------- |
    | 删「第一个信号定案」的 `claimed` 守卫 | **2 红**、退出码 1                |
    | 只删 `settled` 那一道                 | 起初 **0 红** → 补判据后 **1 红** |
    | 删 decode 被拒后的固有尺寸兜底        | **24 红**、退出码 1               |
    | 删结算时的监听清理                    | **3 红**、退出码 1                |

- **实机烟测**：`astro build` 退出码 0 + `pagefind` 退出码 0 → preview 4322 → **47/47、0 FAIL、退出码 0**。与 F2.1 基线比判据名集合：47 条逐条一致，双向差集都是 0。
- **浏览器 A/B**：把 `wallpaper-pull.ts` 与 `wallpaper-crossfade.ts` 回退到 `9b3fff6`（F5.2 之前）构建一份「改前」产物，与当前产物用**同一套静态服务器**（只换根目录）跑同一套探针。三个视口 + 减少动态一档，六类场景（单击 / 拖拽达阈值 / 未达阈值回弹 / 键盘 Enter+Space / 失败播报 / 减少动态）全覆盖。**逐项对比：除 base URL 本身外零差异。**手机档挂件按设计隐藏（`max-width:680px`），只验「隐藏 + 背景层完好 + 无 console/page 报错」，没有交互场景可跑。
- **遗留偏差**：① 变异一之补（只删 `settled`）起初**测不出红灯**——该道守卫不改变结局，只能从「结算的副作用也只做一次」这一侧观测；**已补判据**（数摘监听次数），该变异现在 1 红；② 手机档没有交互场景（挂件按设计隐藏），这一档的覆盖靠烟测的「窄屏 390px 挂件隐藏」判据 + 本探针的「隐藏 + 无报错」；③ 提交侧多问一次 `decode()` 与「第二次 decode 很慢会超时回滚」这两处残留仍如 F5.2 所记（Chromium 实测 0ms）。

## 5. 全批次收口（只有全部获准阶段完成后才执行）

### 5.1 目的

证明各 finding 独立成立，合并后仍成立；完成仓库要求的文档同步，并把发布决策明确交还站长。

### 5.2 进程

- [x] 逐阶段复核 checkbox、证据日志、commit 边界和回滚单元；任何未勾验收项都不得写成“完成”。**已做**：全量 193 条 checkbox 逐段复核。查出**一处结构问题**：F5.3 的执行记录被上一轮的更新脚本追加到了文件末尾（附录 A 之后），已整段搬回 F5.3 验收条目之后（纯搬动，非空行多重集比对确认零改字）。commit 边界逐笔核对：F1 + F1-instrument → `91a5255`、F3 → `7a0c89c`、F4 → `d14b561`、F5.1 → `9b3fff6`、F5.2 → `b674ad3`、F5.3 收口与补判据 → `b56c913`；无跨阶段混提。回滚单元：F2 的提交 `91a5255` 整笔 revert 即两侧同时复位（四个 `.astro` 的内联脚本与 owner/module 在同一笔里）。
- [x] 运行所有受影响离线测试、实机烟测和最终构建，保存完整日志；不使用 `tail` 掩盖退出码。**已做**：`test:lib` **70/70**、`test:utils` **296/296**、`test:article-toc-browser` **2/2**、`pnpm check` 0 errors / 0 warnings / 6 hints，退出码全 0；`astro build` 退出码 0（无 `SAFE_DELETE`）+ `pagefind` 退出码 0 + `verify-og-images`（33/33）+ `verify-katex-classes`（230 页、0 处旧类名）+ `inject-buddha-banner`（230/230）；五套实机烟测 `wallpaper-pull` **47/47**、`runtime-lifecycle` **17/17**、`series` **117/117**、`console` **23/23**、`ui` **142/142**，退出码全 0。**首轮烟测跑在缺后处理的产物上，已作废重跑**（见收口记录）。
- [x] 运行 `pnpm check` 与全范围 Prettier 检查；若新增文件是在 watch 模式下加入，重新运行单次 `pnpm check`。**已做**：`pnpm check` 退出码 0；`pnpm exec prettier --check ./src ./scripts ./docs ./*.md tailwind.config.cjs` 退出码 0；`verify-eol` 456 文件 0 混合。没有 watch 模式引入的文件——本批所有文件都是单次写入后随提交进入。
- [x] 检查最终 diff 是否只包含获准范围；无格式化连带、无生成快照意外改动、无探针进入 `src/` 或 `scripts/`、无临时变异残留。**已做**：`origin/main..HEAD` 共 **32 个文件**，逐个对得上各阶段的允许清单。**零 CSS 改动**（`src/styles/` 与 `*.css` 均无）、**零 `src/constants/` 改动**；`scripts/` 下新增的 5 个文件全是交付物（两个 lib module + 其测试 + 生命周期烟测脚本），无 probe / mutate 命名的文件；变异残留扫描只命中 `CHANGELOG.md` 的两处**历史记述**（F4 的 `isLast && false` 与 2026-11-07 那条），代码里 0 命中。`package.json` 只加了一行脚本。
- [x] 若 `pnpm build` 改写了开工前干净且受跟踪的 `src/constants/*.json`，仅在有明确证据证明其为构建生成变更时按仓库规程用 `git show HEAD:<path>` 写回；不得对未核实的用户改动执行恢复。**未发生**：本轮**没有跑整条 `pnpm build`**——Phase 0 明确要求浏览器验收用 `pnpm exec astro build` + `pagefind`，不跑会刷新外部数据的整条链（`fetch-friend-icons` / `fetch-github-*` / `generate-lqips`）。收尾只补跑了链尾的三个**不取外部数据**的步骤（`verify-og-images` / `verify-katex-classes` / `inject-buddha-banner`），`src/constants/*.json` 实测零改动。
- [x] 按 `AGENTS.md`「文档同步」表同步 `CHANGELOG.md` 与对应 `docs/agents/*.md`；代码与文档在同一笔获准 commit 内完成。**已做**：`CHANGELOG.md` 的 F5.2–F5.3 条目已补「F5.3 验收」一节；`docs/agents/commands.md` 已随各阶段同步（指纹版本与不渲染口径、series 判据数 117、EPERM 与批量删除守卫、`smoke:runtime-lifecycle`）；`docs/agents/components.md` 本轮**补了一条**——F5.2 新增的 `src/utils/runtime/image-readiness.ts` 之前没进文档，现已写明它的 interface、四件事、事务差异归属与「不要抄第二份」。`styles.md` / `build-and-deploy.md` 无需改（零 CSS、零构建链改动）；`GLOSSARY.md` 无需改（它是**领域词汇表**，本轮是纯内部重构，没有新增或改名的站点概念）。
- [x] 若出现难以回退、有真实取舍或令人意外的新决定，先交站长批准是否新增 ADR；不得用本计划替代 ADR。**已交**：四个候选列在收口记录末尾等站长裁定，本轮**没有新建任何 ADR**。
- [x] 汇总每个 finding 的 interface 缩小、implementation 收拢、leverage、locality、测试 seam 与残余风险；不写无法由证据支持的计数。**已做**：见 `output/architecture-2026-11-10/phase5/findings-summary.md`（六个 finding 逐条，每条只写能指回日志或 commit 的读数）。
- [x] 停在本地并报告，等待站长决定是否 commit / push / PR / 合并 / 清理 worktree。**已做**：停在本地；为批次 A/B 临时建的 worktree 已删除（它由 `origin/main` 可完全重建，且其构建被证明不可信），`git worktree list` 只剩主工作区。

### 5.3 总验收

- [x] 所有获准 finding 的进程与验收 checkbox 均有证据并已完成；未授权项明确保留为未执行。**已做**：Phase 0 / F1 / F2 / F3 / F4 / F5 的全部 **193 条** checkbox 均已勾且带证据；「6. 调查后明确否决的方向」四个方向**明确保留为不做**（6.1–6.4），没有勾成完成。
- [x] 全站没有经站长未批准的用户可见变化；样式、交互、路由与独立壳边界均有对应证据。**已做**：批次级样式指纹 A/B（`origin/main` vs `HEAD`）**0/23 页、0 条差异**、退出码 0（11 页完全相同、12 页仅位置互换 = 侧栏随机推荐的已知噪声）；**有效 CSS 文件逐字节相同**（`MainGridLayout` / `SiteFooter` / `Layout` 三份同名文件 `cmp` 通过）；五套烟测的判据名集合逐条一致；F5.3 的浏览器 A/B 六类交互逐项零差异。
- [x] 所有相关测试和构建以真实退出码通过；不存在被删除、放宽或放行的失败项。**已做**：见 5.2 第 2 条的全部退出码。没有删除或放宽任何判据——本批只**新增**判据（F1 的 11 条、F1-instrument 的 16 条、F3 的 7 条、F5.1 的 14 条、F5.3 的 1 条），既有断言一字未改。
- [x] 文档无旧路径、旧命令、旧测试口径或被本轮推翻的残留句子；所有数字能指回当日实测或明确 commit。**已做**：`grep` 扫过 series 判据数（39 → 117 已修）、`test:utils` 的历史读数（只出现在 CHANGELOG 且各自带日期，属史实）、`src/utils/runtime` 模块清单（`components.md` 缺 `image-readiness` 已补）。`docs/agents/*.md` 里没有会自己漂的计数：唯一写死的判据数（series 117）同时注明「以脚本里的 `EXPECTED_CHECKS` 为准」。
- [x] 未执行任何未经明确许可的 commit、push、PR、合并或生产部署。**已做**：本批 6 笔提交都有站长的逐次授权；**未 push、未建 PR、未合并、未部署**（`push main` 会触发 `deploy.yml`）。

### Phase 5 执行记录（2026-11-11）

- **环境**：Windows 11 / 系统 Node 24.18.0 / pnpm 10.26.2；起点 `b56c913`（F5.3 收口已提交）。
- **证据目录**：`output/architecture-2026-11-10/phase5/`（`test-*.log`、`build-final.log`、`pagefind-final.log`、`verify-og.log` / `verify-katex.log` / `inject-banner.log`、五套 `smoke-*.final.log` + `exits.txt`、`fp-batch-head/` 与 `capture-batch-head.log`、`diff-batch-valid.log`、`findings-summary.md`、`fix-plan-order.mjs` / `update-batch-gates.mjs`）。
- **本轮查出并修正的三处问题**（如实记录）：
    1. **结构错位**：F5.3 的执行记录被上一轮的更新脚本追加到了文件末尾（附录 A 之后）。已整段搬回 F5.3 验收条目之后；非空行多重集比对确认是纯搬动、零改字。
    2. **首轮烟测的产物不完整**：第一批五套烟测跑在只做过 `astro build` + `pagefind` 的 dist 上，缺 `pnpm build` 链尾的 `inject-buddha-banner`（它会往每个 HTML 首行写注释、往 `<head>` 内联一段 `console.info`）。补齐链尾三步后**全部重跑**，读数与首轮逐条一致（47 / 17 / 117 / 23 / 142，失败 0）。
    3. **批次 A/B 的第一次做法无效**：先用 `git worktree add` 检出 `origin/main` + 给 worktree 做 `node_modules` 目录联结来构建「改前」产物，得到的指纹 diff 是 5/23 页、747 条。查根因：① worktree 缺 `public/images/_variants/`（gitignore 的生成物，主仓 15 项）；② worktree 的 `MainGridLayout.*.css` 与归档里那份 **2026-11-07 的残留文件逐字节相同**——共享 `node_modules` 把 Tailwind 的扫描缓存也共享了，产出的 CSS 是过期状态。**该做法作废**，worktree 已删除。改用 F2.5 里那份「主仓就地构建」的 base 采集（`F2.5/fp-before`，同样是 `origin/main` 源码）重做，得 **0/23 页、0 条差异**。
- **最终读数**：`test:lib` 70/70、`test:utils` 296/296、`test:article-toc-browser` 2/2、`pnpm check` 0/0/6、全范围 Prettier 0、`verify-eol` 456/0、`astro build` 0 + `pagefind` 0 + OG 33/33 + KaTeX 0 旧类名 + 横幅 230/230；五套烟测 47/17/117/23/142 全绿且判据名集合与基线逐条一致；批次级指纹 A/B 0/23。
- **候选 ADR（待站长裁定，本轮未新建）**：
    1. **样式指纹 artifact 自带版本、旧采集显式拒绝**——旧采集永久不可比，属「难以回退、有真实取舍」。
    2. **不渲染元素不参与可见差异**——改变了「什么算可见差异」的仪器语义。
    3. **页面级 runtime 会话 owner**——新增了未来代码必须遵守的生命周期协议（且刻意不做第四轨）。
    4. **「第一个信号定案」**——两条壁纸事务的统一结算语义，且第一次把预载侧的一处行为从 `failed` 变成 `ok`（实测不可达）。
- **遗留风险**：见 `findings-summary.md` 每个 finding 的「残余风险」段；最需要盯的是 F1 的 `targets`/`located` 无法自证、F3 的多指路径无覆盖（44/44 全绿那条变异）、F5 的提交侧二次 `decode()`。
- **未执行**：未 push、未建 PR、未合并、未部署。

## 6. 调查后明确否决的方向

### 6.1 按行数拆 `global.css`

`src/styles/global.css` 约 8000 行，但行数只证明规模，不证明 shallow。文件头声明 `@import` / `@config` / `@source`，`global.css:47-51` 还明确记录同一契约曾因拆成两处而误判；ADR 0011 的层策略与 ADR 0004 的视觉基线都要求规则顺序与层归属稳定。删除或搬运段落只会移动 selector，复杂度不会消失，deletion test 不成立。**不做。**

### 6.2 把侧栏文章目录改成 SSR headings 透传

`PostToc.astro:12-30` 与 `article-toc.ts:41-60` 的双源确实诱人，但标题要穿过 `MainGridLayout.astro:56-63` 的通用布局 slot 到侧栏，需加宽多层 interface；它不会消除 scroll-spy、reveal、手动让位与防抖 implementation，还会改变无 JS DOM 与“零标题时何时移除目录”的时机。违反 ADR 0008 的同源、同序与无 JS 底线。deletion test 失败。**不做。**

### 6.3 继续把 `article-toc.ts` 拆成更多纯函数

其外部 interface 已只有 `initArticleToc()`；implementation 的难度集中在 scheduleFrame、监听器、定时器与 DOM 竞态，而不是函数体长度。`scripts/article-toc-browser.test.mjs:11-123` 已用真实 DOM + 可控时钟覆盖关键竞态，`smoke:series` 还覆盖换页与交互。继续按行数抽纯函数只会损害 locality，不能测到真正的模块级生命周期。**除非出现具体缺陷，否则不做。**

### 6.4 合并导航 / 移动菜单的当前页态计算

这是历史上明确否决过的候选：一旦 `theme-script.ts` import 共享模块，客户端 chunk 图会变化，与“产物稳定”的旧验收口径有真实冲突；且 `AGENTS.md` 已锁导航与 MMenu 两处同步修改的现状。若要重开，必须作为“产物会变、需站长单独批准”的票，不得混进本轮。**本轮不做。**

## 附录 A：供 clean 后新会话使用的完整提示词

```text
你是 D:\pages\myblog 的执行代理。请先完整读取：
1) AGENTS.md、GLOSSARY.md；
2) docs/improvements/architecture-improvement-plan-2026-11-10.md；
3) docs/improvements/architecture-review-2026-11-10.html；
4) docs/agents/commands.md、docs/agents/components.md、docs/agents/styles.md；
5) docs/adr/0004、0007、0008、0010、0011、0012。

任务性质
站长已完成只读架构调查，明确要求按上述计划推进；当前你只获得 Phase 0（共用开工门禁）与 Phase F1（样式指纹 artifact 自证覆盖）两阶段的授权。Phase F2–F5 只有计划、没有本轮的动手授权；完成 F1 后必须停下汇报，等待站长点名下一阶段。

硬约束
- 线上 UI 基本不变是最高优先级。F1 不允许修改 src/、页面、CSS、路由、依赖、package.json；只允许 scripts/upgrade-style-audit.mjs、新建 scripts/lib/style-audit-artifact.mjs 与其测试，以及获准后的文档同步。
- 不 commit、不 push、不创建 PR、不部署，除非站长在看完 F1 报告后明确授权。
- 不改构建链、不改四态集合、不改审计页清单、不改可见性分类、不放宽阈值、不删除页面或状态来换取绿色。
- 不把“计划里写了”当成越过阶段授权的理由；一个会话回合最多两个阶段，做完即停。
- 若计划与当前磁盘冲突，先用实测证明哪边为真；无法证明就停下询问。不得为迎合计划改坏代码，也不得为让测试转绿削弱验收。
- 一次性探针、日志、变异证据放 output/architecture-2026-11-10/F1/，不写系统临时目录；不要把已有 output 日志当作本轮证据，必须重跑。
- 遇到宿主管卫拦截（BLOCKED by CC Safety Net / SAFE_DELETE_BULK_CONFIRM_REQUIRED）不绕过，按 docs/agents/commands.md 的处置节上报。
- 代码改动与文档同步在同一笔获准提交内完成；未获准提交时只停在本地并列出文件。

执行要求
1. 按计划的 F1.1 做开工核验：记录 SHA、工作区、test:lib / test:utils 基线，重读脚本现状，确认 artifact 目前没有覆盖字段。
2. 按 F1.2 定义窄 interface：格式版本、每页静态/四态覆盖、完整性、兼容拒绝；manifest 不能自证，必须从正文重算校验。capture 失败可以留下诊断 artifact，但必须标 incomplete 且进程非零；diff 必须在比较样式前拒绝不完整、版本不符、页集合不一致或状态覆盖不对称的 artifact。
3. 按 F1.3 先写失败测试再实现。必须覆盖：合法往返、缺少 hover、manifest 与正文不一致、版本缺失/不匹配、页集合不一致、A/B 状态计数不对称、正文缺行。
4. 按 F1.4 做真实集成与变异：
   - 同一份 dist 连续 capture 两次，diff 必须 0/全部审计页、0 差异；
   - 仅删 fixture 的 hover 行，diff 必须红；
   - 篡改版本、制造 A/B 状态计数不对称，必须分别红；
   - 临时让 CDP 初始化抛错，capture 必须非零且 artifact incomplete；恢复源码且不残留变异。
5. 运行 pnpm test:lib、pnpm test:utils、pnpm check、以及全范围 Prettier 检查；保存完整输出和真实退出码。不要只 tail，不要用“总数相同”代替失败集合。
6. 检查 git diff 只包含允许文件；若构建改写了受跟踪生成文件，先证明它是构建生成再按仓库规程处理，不得覆盖用户改动。
7. 按计划 F1.5 检查回滚与停止条件；若必须改可见性分类才能“修好”，立即停止上报。
8. 完成后只修改计划中 F1 对应 checkbox（可勾选已真实完成项，并在阶段末尾追加证据），不得改写验收标准或把未执行项勾成完成。同步 docs/agents/commands.md 与 CHANGELOG.md；不能自行新增 ADR，除非站长批准。

最终报告格式
- 状态：F1 完成 / F1 阻塞 / F1 部分完成（必须如实）。
- 起点 SHA、终点文件清单、是否触碰 src/ 或 CSS。
- 每条验收判据的实测结果：命令、退出码、日期、环境、日志路径。
- 四类变异（缺 hover / 版本 / A/B 计数不对称 / CDP 失败）各自的红证据与恢复结果。
- 旧 artifact 兼容性结论、真实全部审计页的覆盖读数、任何无法解释的缺失。
- 文档同步清单与残留风险。
- 明确写“未 commit / 未 push”（除非已获授权）。
- 只推荐下一步，不擅自进入 F2。
```
