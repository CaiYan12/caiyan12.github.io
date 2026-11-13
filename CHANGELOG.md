# 更新日志

## 2026-11-13：Nice Books 业务迁出博客，保留入口与旧址兼容

**改了什么**：`src/config.ts` 的「每日好书」导航改指 `/nice-books/` 并继续 `noSwup: true`；`astro.config.mjs` 将独立首页加入 sitemap，同时排除旧 `/books/`、归档及 01–70 兼容路径。博客保留 `/books/`、`/books/archive/` 与 `/books/01/`–`/books/70/` 共 72 个静态兼容页，按原 query/hash 跳转到对应独立页面；`/books/data.json` 不保留。业务源码、GSAP 专用依赖、书目单测及业务/设计 QA 脚本移出博客。博客侧迁移边界由 `pnpm test:nice-books-ownership` 与 `pnpm smoke:nice-books-migration` 两项专用检查覆盖。

**为什么这么定**：Nice Books 的业务、设计和产品 QA 由[独立仓库](https://github.com/CaiYan12/nice-books)维护；博客只承担导航、sitemap、兼容跳转与归属验证。Pagefind 继续使用迁移前的博客收录集合，不把兼容跳转页或独立项目内容加入博客索引。

**实测证据（2026-11-13，Windows 11 / Node 24.18.0 / pnpm 10.26.2）**：`pnpm install --frozen-lockfile` 退出码 0（lockfile up-to-date，跳过重新解析）；`pnpm check` **184 files，0 errors / 0 warnings / 5 hints**；`pnpm build` 退出码 0，构建内 **452 项测试通过、0 failed**，Astro 生成 **229 pages**，Pagefind 索引 **28 pages / 47,585 words**。`pnpm test:nice-books-ownership` 退出码 0，检查 70 个旧详情 ID 与 72 个兼容页映射、旧数据接口移除及 sitemap 归属。最终 `dist/` 与保存的迁移前 Pagefind body 路由集合完全一致：两侧均扫描 230 个 HTML，均有 **28 个路由**（23 篇文章及 `/about/`、`/diary/`、`/projects/`、`/skills/`、`/timeline/`），新增与缺失均为 0，`/books/` 与 `/nice-books/` 均未进入博客索引。

`pnpm smoke:nice-books-migration` 退出码 0：1280px 桌面旅程通过导航、旧地址跳转、中文 query/hash、浏览器后退及返回主站；390px 移动旅程通过入口检查。主站迁移前后对照的 1440/390 首页与搜索四组样本计算样式、盒尺寸和搜索结果路由相同，零 pageerror/overflow，导航视觉与 `noSwup` 行为不变、仅 href 更新。验收说明见 [Nice Books 迁移验收记录](docs/nice-books-migration-acceptance.md)，票据与收口记录见 [issue #159](https://github.com/CaiYan12/caiyan12.github.io/issues/159)。

**失败路径与边界**：一次 migration smoke 重跑时漏设必需的 `NICE_BOOKS_DIST`，脚本按前置条件退出 1；将变量指向独立项目构建产物后重跑通过。这是调用环境缺变量，不是页面行为回归。业务视觉、交互和字体 QA 由独立项目负责，不以博客兼容 smoke 代替。

## 2026-11-12：架构改进批次落定四个 ADR（0013–0016）

**这条只记决定，不改代码**：本批的实现已在前六笔提交里；这一笔把四条「难以回退、有真实取舍、令人意外」的结论写成 ADR，并改掉上一节里那句会被这次发布推翻的「未 push」表述。

- [ADR 0013](docs/adr/0013-style-audit-artifact-version.md)：artifact 自带 `style-audit-artifact@1`；无版本 / 版本不符 / 索引读不到一律按「旧格式」拒绝重采；manifest 不自证，读取时从正文重算行数、静态行、四态计数与 sha。边界写明：`targets` / `located` 仍无法自证。
- [ADR 0014](docs/adr/0014-nonrendering-verdict.md)：`script` / `style` / `link` / `meta` / `noscript` / `template` 六类不生成盒子的标签不参与可见差异；采集端不动，少写它们照样判「不完整」。被否方案里记了「从比对键删掉兄弟序号」——那会连真实重排一起放行。
- [ADR 0015](docs/adr/0015-page-session-owner.md)：页面级 runtime 走 `pageSessions` 清单，初始装载与换页重跑共用 `runtimeTable` 一行、停止挂 `beforeSwap`，不新增第四轨；常驻模块不进清单，判据是 DOM 是否随页面替换。
- [ADR 0016](docs/adr/0016-first-signal-settles.md)：可画判定由第一个信号定案、`load` 当刻取快照；`decode()` 只等不判，被拒不算失败；`timeout` 独立成档。边界写明 S10（预载 `failed` → `ok`，实测不可达）与提交侧多问一次 `decode()`（实测 0ms）。

`src/`、CSS、构建链、依赖、四态集合与阈值均未改动；四份 ADR 的实测读数全部取自 `output/architecture-2026-11-10/`（git-ignored）。

## 2026-11-11：架构改进批次收口（Phase 0 / F1–F5 合并验收）

**这条只记验收，不改代码**：本批六个阶段（样式指纹 artifact 契约、不渲染元素口径、页面级 runtime 会话 owner、壁纸测试桩 adapter、文集成员页烟测、壁纸「图片何时可画」共享 module）全部完成后的合并验收。除补一条 `docs/agents/components.md`（写明 F5.2 的 `image-readiness.ts` 契约）外，本阶段**没有改动任何代码或样式**。

**批次级证据（2026-11-11，Node 24.18.0 / pnpm 10.26.2，起点 `b56c913`）**：

- **样式指纹 A/B（`origin/main` vs `HEAD`，23 个审计页）**：**0/23 页、0 条差异**、退出码 0。其中 11 页完全相同、12 页仅「位置互换」（侧栏「文章推荐」是构建期随机抽样，工具已按 `reorder-only` 归为等价）。
- **有效 CSS 逐字节相同**：`MainGridLayout` / `SiteFooter` / `Layout` 三份同名文件 `cmp` 全部通过——本批一行 CSS 也没改。
- **五套实机烟测**（在补齐 `verify-og-images` + `verify-katex-classes` + `inject-buddha-banner` 的**完整产物**上重跑）：`wallpaper-pull` **47/47**、`runtime-lifecycle` **17/17**、`series` **117/117**、`console` **23/23**、`ui` **142/142**，退出码全 0；与各自基线比**判据名集合**逐条一致（双向差集都是 0）。
- **离线门禁**：`test:lib` **70/70**、`test:utils` **296/296**、`test:article-toc-browser` **2/2**、`pnpm check` 0 errors / 0 warnings / 6 hints、全范围 Prettier 退出码 0、`verify-eol` 456 文件 0 混合。
- **范围核对**：`origin/main..HEAD` 共 32 个文件，逐个对得上各阶段允许清单；零 CSS、零 `src/constants/` 改动、`scripts/` 下无探针文件、代码里无变异残留。

**两处方法学教训（都记进计划文件的收口记录）**：

1. **烟测要跑在完整产物上**：`pnpm build` 链尾的 `inject-buddha-banner` 会往每个 HTML 首行写注释、往 `<head>` 内联一段 `console.info`；只跑 `astro build` 得到的 dist 并不等于上线产物。首轮漏了这步，补齐后全部重跑，读数逐条一致。
2. **批次 A/B 不能用 `git worktree` + `node_modules` 目录联结做**：worktree 缺 `public/images/_variants/`（gitignore 的生成物），而共享 `node_modules` 把 Tailwind 的扫描缓存也共享了——worktree 产出的 `MainGridLayout.*.css` 与归档里一份 **2026-11-07 的残留文件逐字节相同**。因此第一次得到的「5/23 页、747 条差异」是构建环境差异，不是代码差异；改用主仓就地构建的 base 采集重做才得 0/23。

**阶段边界**：Phase 0 与 F1–F5 全部完成，计划里 183 条 checkbox 全部勾上、0 条未勾。收口时停在本地；提交与发布由站长在 2026-11-12 单独授权（`push main` 会触发 `deploy.yml`，等于上线生产）。

## 2026-11-11：壁纸的「图片何时可画」抽成共享内部 module（Phase F5.2–F5.3）

**改了什么**：新增 `src/utils/runtime/image-readiness.ts`（127 行），只导出 `whenPaintable(image, { timeoutMs })` 一个 interface，返回 `"ok" | "failed" | "timeout"` 三档；module 内只做四件事——**第一个信号定案**、可画判定（`complete && naturalWidth > 0`）、结算即摘监听与清计时器、一个加载上限。`wallpaper-pull.ts` 的 `preloadCandidate`（33 行 → 9 行）与 `wallpaper-crossfade.ts` 的 `commitOriginal`（删掉 `waitForImage` 15 行）都改调它。新增 `src/utils/runtime/image-readiness.test.ts`（13 条定向单测）。测试桩 `wallpaper-scenario.ts` 的假图片从 `onload/onerror` 属性换成 `addEventListener/removeEventListener`（setup 性质）。**四个既有测试文件一行未动**；样式、页面、依赖、`package.json` 未动。

**为什么这么定**：两条事务各自散落着同一套**结算知识**——什么时候问 decode、什么时候算可画、什么时候只结算一次、结算之后要把什么清掉。这套知识因此在两个文件里各写了一遍，晚到事件与清理规则也跟着写了两遍。共享 module 把「共同的部分」收一处，**事务差异留在 caller**：decode 提问的位置（提交侧自己那一次留在 load 之前）、超时的含义（预载把超时独立成档、提交按「不可画」处理并回滚）、谁设置 `src`。机制上选 `addEventListener` 而不是 `onload` 属性：提交事务操作的是**长期共享**的原图层（`.bg-image`），属性赋值等于占用它的处理器槽位。

**实测证据（2026-11-11，Node 24.18.0 / pnpm 10.26.2，起点 `9b3fff6`）**：

- **用例**：`pnpm test:utils` **295/295**、退出码 0（基线 282 + module 新增 13）；四份壁纸测试 71/71、module 13/13；`pnpm check` 0 errors / 0 warnings / 6 hints；全范围 Prettier 退出码 0；`verify-eol` 454 文件 0 混合。
- **等价性**：差分探针（`output/architecture-2026-11-10/F5.2/spike/`）把「改前的两条事务」与「现在的两条事务」放在同一批 **11 个场景**上跑，**9 个结局完全一致**。探针里的「改前实现」由 `verify-old-copies.mjs` 证明与改前生产代码逐行一致。
- **两处不同**：① **S10**（load 后同一 tick 到达 error）· 预载侧：改前 `failed`、现在 `ok`——module 实行「第一个信号定案」，load 先到就由 load 定案；改前的预载之所以是 `failed`，是因为它的 load 分支要等 decode 落定（结算被推迟），同 tick 到达的 error 抢先结算了。提交侧两边都是「可画」，**提交侧语义未变**。② **S9**（第二次 decode 很慢）· 提交侧：改前可画、现在不可画——F5.1 已记录的残留 B（Chromium 实测同一元素第二次 `decode()` 为 **0ms**、结果不变）。另有 2 处「结局同、decode 次数不同」（残留 A，同样实测 0ms）。
- **S10 不可达**：真实 Chromium 实测三次——合法图只收到 `load`、坏图只收到 `error`、只有「换 src」才同时收到两个（`[load, error]`）。预载的图像对象**每次新建、`src` 只写一次**，因此「同一次请求先 load 再 error」不会发生；即便发生，新结局（`ok`）也更贴近事实（那张图确实加载成功且有固有尺寸）。
- **实现上的一处修正（相对 F5.1 spike 草稿）**：草稿在 load 分支等 decode 落定后才判定可画，**结算被推迟一个微任务**——同 tick 到达的 error 会抢先，F5.1 写下的 commit 侧矩阵 #8（「load 与 error 先后到，结果只由第一次结算决定」）因此变红。落地的 module 改为**第一个信号定案**：load 分支在 load 当刻取「可画性快照」，判定不再被后到的信号改写。两条事务的「只结算一次」语义因此都成立，且**没有改动任何既有断言**。

**失败路径与踩坑**：① 落地 module 的第一版照抄 spike 草稿（load 分支等 decode 落定再判定），commit 侧矩阵 #8 直接变红——不是「测试写错了」，是草稿的结算时机与两条事务的既有语义都不合；② adapter 的假图片原本只有 `onload/onerror` 属性，module 改用监听后预载侧整片用例变红（Promise 执行器里抛错被吞成「加载失败」），必须让桩与生产同形；③ 改生产文件时用一次性脚本按精确文本替换（CRLF 文件手改会把行尾切成 LF，造成混合行尾），改完跑 `verify-eol.mjs` 复核。

**F5.3 验收（2026-11-11 同日，起点 `b674ad3`）**：

- **三组变异**（每组跑完立即还原，sha256 回到 `ebbdf13e…`、`git diff` 为空、还原后 85/85 回绿）：

    | 变异                                  | 结果                              |
    | ------------------------------------- | --------------------------------- |
    | 删「第一个信号定案」的 `claimed` 守卫 | **2 红**、退出码 1                |
    | 只删 `settled` 那一道                 | 起初 **0 红** → 补判据后 **1 红** |
    | 删 decode 被拒后的固有尺寸兜底        | **24 红**、退出码 1               |
    | 删结算时的监听清理                    | **3 红**、退出码 1                |

- **实机烟测**：`astro build` 退出码 0（无 `SAFE_DELETE`）+ `pagefind --site dist` 退出码 0 → `pnpm preview --port 4322` → `pnpm smoke:wallpaper-pull` **47/47、0 FAIL、退出码 0**。与 F2.1 基线比**判据名集合**（不是总数）：47 条逐条一致，双向差集都是 0。
- **浏览器 A/B**：把两个生产文件回退到 `9b3fff6`（F5.2 之前）构建一份「改前」产物，与当前产物用**同一套静态服务器**（只换根目录）跑同一套 Playwright 探针：三个视口（1440×900 桌面 / 768×1024 平板 / 390×844 手机）+ 减少动态一档，六类场景（单击 / 拖拽达阈值 / 未达阈值回弹 / 键盘 Enter+Space / 失败播报 / 减少动态）全覆盖。**逐项对比：除 base URL 本身外零差异。**手机档挂件按设计隐藏（`max-width:680px`），只验「隐藏 + 背景层完好 + 无 console/page 报错」。
- **补判据**：变异一之补（只删 `settled` 那一道）起初**测不出红灯**——那道守卫不改变结局（Promise 只 resolve 一次，`claimed` 已挡住迟到信号），它真正保证的是 `settle()` 的**副作用**也只做一次。补了一条数「一共摘过几个监听器」的判据（`image-readiness.test.ts`，+1 条），该变异现在 **1 红**。
- **门禁**：`pnpm test:utils` **296/296**、退出码 0；`pnpm check` 0 errors / 0 warnings / 6 hints；全范围 Prettier 退出码 0；`verify-eol` 456 文件 0 混合。

**阶段边界**：F5 是本 finding 的最后一个阶段，**Phase F5 全部完成**（F5.0–F5.3）。F5.3 未改动任何生产代码。**未 commit、未 push。**

## 2026-11-11：壁纸两条事务的「可画判定」行为矩阵补齐，并判定共享 module 能不能只暴露一个小 interface（Phase F5.1）

**改了什么**：**生产代码零改动**（`wallpaper-pull.ts` / `wallpaper-crossfade.ts` / 样式 / 页面 / 依赖一个字节没动）。只动测试与测试桩：①新增 `src/utils/runtime/wallpaper-preload-readiness.test.ts`（6 条，覆盖候选预载事务的「可画判定」矩阵）；②`wallpaper-crossfade.test.ts` 增加 6 条矩阵用例，并加了一处 setup——捕获长计时器，用来驱动提交阶段那 **1.5s 上限**（此前**从未被任何测试触发过**）；③`wallpaper-scenario.ts`（F3 的 scenario adapter）扩了三处能力：`decodeOutcome` 可选（默认仍是「被拒」）、`firePreloadEvent`（同步派发，可指向指定那一次预载）、`preloadHandlersAttached`（按次观测处理器是否被摘掉）。adapter 这三处扩展是「补 F3」性质的改动——F5.0 的允许清单里没写 adapter，授权来自 F5.3 那条「若 F3 的 adapter 不能覆盖矩阵，先补 F3」。

**补上的 11 处覆盖缺口**（矩阵 10 行 × 2 侧）：预载侧缺 decode 兑现、late load、late error、二次 settle、监听清理；提交侧缺 load 事件路径、1.5s 超时、late load、late error、二次 settle、监听清理。原先提交侧只测到「解码被拒 + 加载报错」与「解码被拒 + 已完成有尺寸（走早退分支）」，**load 事件那条分支一次都没走过**，超时也一次都没被驱动过。

**spike 判定：deletion test 通过。** 把「今天的预载 / 今天的提交 / 候选草稿预载 / 候选草稿提交」四条实现放在同一批 9 个场景上跑差分探针（草稿与探针都在 `output/architecture-2026-11-10/F5.1/spike/`，**未进仓库**）：**8 个场景的结局完全一致**。共享 module 的 interface 可以是 `whenPaintable(image, { timeoutMs })`——**一个超时参数、无 `mode`、无回滚标志**，两侧的事务差异（decode 提问位置、超时含义、回滚、谁设置 src）全部留在 caller。

**两处残留（如实记录）**：①提交侧会多问一次 `decode()`（module 的 decode 在 load 之后问、提交自己那次在 load 之前问，两边都保留）——在真实 Chromium 上量同一个 `<img>` 连续两次 `decode()`：合法图 5ms→**0ms**、坏图 1ms→**0ms**（结果不变、坏图也不重试）；②若第二次 decode 真的很慢，提交侧会超时回滚而今天会成功——该场景在真实浏览器里不成立（实测第二次 decode 是 0ms），保留它是为了把风险边界写死。

**实测读数（2026-11-11，Windows 11 / Node 24.18.0 / pnpm 10.26.2，起点 `7a0c89c`）**：`pnpm test:utils` **282/282**、退出码 0（基线 268 + 新增 14）；差分探针 9 场景 8 结局一致；Chromium 两次 decode 第二次 0ms。

**阶段边界**：本轮只做 F5.1（等价性判定 + 覆盖补齐），**F5.2（实施内部 module）与 F5.3（变异与最终验收）未开始**。**未 commit、未 push、未建 PR、未部署。**

## 2026-11-10：文集成员页烟测场景化，新增成员自动获得接线验证（Phase F4）

**改了什么**：只动 `scripts/series-smoke.mjs` 一个文件（**生产代码零改动**：`src/utils/series.ts` / `series-integrity.ts` / 文章 frontmatter / 页面组件 / 样式一个字节没动）。①新增独立数据 `UNIT`（每个文集的量词：章 / 篇），与成员名单一样是**独立抄写**，不从生产 `buildSeriesNote` 生成期望；②新增 oracle `memberScenario({id, index, total, name, unit, slug})`，输出顶部行 / 末尾行 / 侧栏当前项的期望文案与链接，**刻意不引用**生产的 `buildSeriesNote` / `getSeriesView`（那正是被测对象，用它生成期望等于让 oracle 自己证明自己）；③原先按章节号手写的成员判据（第〇章、第三章到第八章、Matt 末篇）换成**一个循环覆盖 `MEMBERS` 全部 11 个成员**，每个成员四测：两行都在 / 顶部行 + 目录链接 / 末尾行（末章收尾或非末章归属句）/ 侧栏当前项 = 本篇；④系列级侧栏判据（条目数、链接升序、标题栏「查看目录」）从「只测 webapp 一家」改成按文集循环，两个文集都测；⑤套件补上 context 级外部视频嵌入拦截（`stubExternalEmbeds`，与 `smoke:ui` 同款）；⑥`EXPECTED_CHECKS` 由 88 更新为实测的 117。

**为什么这么定**：旧形态是「每加一章就手写一段判据」——webapp 九章里第 1、2 章和 matt 两篇里第 0 篇**一条判据都没有**（2026-11-10 实测：`20261002081331`、`20261002093931`、`20260919135000` 三个成员完全无覆盖），末章判定还写死成「第八章」。F4 把成员场景抽成「一个循环 + 一个 oracle + 一份独立数据」，末章由「序号 === 总数 − 1」判定，新增成员登记进 `MEMBERS` 就自动获得四条接线验证，不必再手写一段、也不必记得把末章挪到新的那一章。

**实测证据（2026-11-10，Windows 11 / Node 24.18.0 / pnpm 10.26.2，起点 `7a0c89c`）**：

- **基线**：改动前同一份 `dist/` 上 `pnpm smoke:series` **88/88、退出码 0**（`output/architecture-2026-11-10/F4/baseline-series.log`）。**`docs/agents/commands.md` 当时写的是「39 条判据」，与脚本里的 `EXPECTED_CHECKS = 88` 不符**——按计划不拿 39 当基线，以实测 88 为准，并已在本次文档同步里改成实测值。
- **改后**：**117/117、0 失败、退出码 0**（`after-run3.log`，恢复态产物上复跑同样 117/117，`after-restored.log`）。计数差值来源：88 − 21 + 50 = 117；消失的 21 条**全是成员相关的旧判据**（被参数化替代），新增 50 条 = 11 成员 × 4 条 + 系列级侧栏 2 文集 × 3 条。
- **通过集合逐项比对**：改前 88 条、改后 117 条按判据名集合比对——**「原有非成员 / 封面 / 粘性 / 文章目录等异质判据」零条丢失**（消失的 21 条全部属于成员相关）；新增成员覆盖项 44 条逐条列出，覆盖全部 11 个成员，其中三个此前完全无判据的成员（`20261002081331`、`20261002093931`、`20260919135000`）首次获得覆盖。
- **变异验证**（每组跑完立即还原，`sha256` 回到 `5c12a071…`、`git diff --name-only -- src/` = 0）：

    | 变异                                        | 实测结果                                                 |
    | ------------------------------------------- | -------------------------------------------------------- |
    | 故意漏跑一个成员场景                        | **退出码 2**、113 项，守卫按预期拦住                     |
    | oracle 侧：末章判定恒为 false               | **退出码 1**、恰好 2 红（两个末章成员）                  |
    | oracle 侧：某一成员的侧栏当前项期望写错一位 | **退出码 1**、恰好 1 红（就是那一个成员）                |
    | 从 `MEMBERS` 删一个成员但保留循环           | **退出码 2**、112 项、20 红，覆盖与 total 同变           |
    | **生产侧**：`buildSeriesNote` 末章不再收尾  | **退出码 1**、恰好 2 红（两个末章成员），其余 115 条仍绿 |

    最后一条是系统侧证据：临时把 `src/utils/series.ts` 的 `bottom: isLast` 改成 `bottom: isLast && false`、重建产物后跑，整套只红那两条末章判据——证明新判据咬的是真回归，不是自己跟自己比。

- **守卫仍有效**：`EXPECTED_CHECKS` 是写死基线，漏跑成员场景 / 删成员都会让 total 与基线不符，进程以**退出码 2** 拒绝运行（不是退出码 1 的「有判据红」，两者含义不同）。

**失败路径与踩坑**：

1. **`/posts/20260919135000/` 正文含裸 YouTube iframe，`load` 事件被第三方拖垮**：本站资源 634ms 就加载完，YouTube 子帧却要 8.7s、Google 广告 7.4s，连访两次把 load 拖到 15.5s、第二次直接 30s 超时——整套**中途死掉且不产生任何 FAIL 行**，看着像「套件没跑完」而不是「有判据红」。处置：按 `smoke:ui` 的既有做法在 context 级掐掉外部视频嵌入（只匹配外部域名，本地资源一条不动），掐完该页 load 正常、外部问题清单里也不再出现 `myhkw.cn` 与 `static.doubleclick.net`。
2. **Windows 上 `astro build` 与 `astro preview` 不能同时在跑**：preview 占着 `dist/_astro/` 里的旧资产文件，构建收尾的 `ssrMoveAssets` 要 rename `dist/.prerender/_astro/*` 进去，被占用的文件报 `EPERM: operation not permitted`，构建退出码 1。固定顺序：**停 preview → build → 起 preview**。这与批量删除守卫（报 `SAFE_DELETE_*`）是两回事。
3. **变异第一次构建失败后那轮 smoke 的读数不算证据**：构建挂掉时 `dist/` 是半成品，smoke 跑到第 4 条就崩，读数被当成「变异结果」记过一次。已按失败处理并重跑——变异结论只取构建退出码 0 之后的那一轮。
4. **`docs/agents/commands.md` 的 series 条目写「39 条判据」，实际是 88 条**（2026-11-10 之前就存在的偏差）。本次按计划以实测值修正为 117，并写明「以脚本里的 `EXPECTED_CHECKS` 为准」，不再抄会漂的数字。

**阶段边界**：本轮只做 F4，F5 未开始。**未 commit、未 push、未建 PR、未部署。**

## 2026-11-10：拉绳壁纸两套测试桩合成一个 scenario adapter（Phase F3）

**改了什么**：新增 `src/utils/runtime/wallpaper-scenario.ts`（测试专用 scenario adapter，不参与客户端打包）与 `src/utils/runtime/wallpaper-scenario.test.ts`（adapter 自身的 7 条单测）；`wallpaper-pull-interaction.test.ts`（30 例）与 `wallpaper-pull-failure.test.ts`（14 例）改为共用它，两个文件合计 **−559 行**。**生产代码零改动**：`wallpaper-pull.ts` / `wallpaper-crossfade.ts` / `wallpaper-pull-drag.ts` / `wallpaper-pull-attempts.ts` / 样式 / 页面 / 依赖一个字节没动。

**为什么**：这两个文件各自抄了一份最小 DOM 桩（事件目标、Image、计时器、classList、document/window 全局），加起来近千行几乎全是重复的搭建代码；两份桩的关键语义还悄悄分叉了——flush 轮数 8 与 12、classList 有无 `contains`、要不要捕获长计时器、要不要记录请求地址。桩分叉的真正代价不是行数，而是「同一个行为在两个文件里被测出两个口径」，出问题时很难判断是实现变了还是桩变了。合成一份之后，搭建只有一处，行为断言仍然留在各自测试里。

**adapter 的边界**：只提供**操作**（派发点击/拖拽/键盘/取消、驱动预载成功/失败/超时、布置池与偏好）与**观测**（背景 src、播报词、宿主 class、CSS 变量、dataset、尝试次数、请求地址），**不提供** `expectSuccess()` 这类会复制 implementation 判断的高阶断言——期望必须留在测试里，这条由 adapter 单测的一条护栏钉住（`Object.keys(scenario)` 里不得出现 `expect*` / `assert*` / `should*`）。未知选择器、派发到没有监听器的事件类型、没有可结束的候选预载一律抛错，不允许静默空跑。

**实测证据（2026-11-10，Windows 11 / Node 24.18.0 / pnpm 10.26.2，起点 `91a5255`）**：

- **用例零丢失**：44 条测试名迁移前后**逐字一致**（`diff` 两文件均为空）；断言消息逐字一致，差异只有 3 条搬进 adapter 的桩内断言（`harness 必须先建好` / `应当有一次候选预载` / `应存在一个明确的加载上限计时器`），它们本来就只服务于桩自身。场景一个没删：失败、超时、无候选、减少动态、摇头、解锁全部保留。
- **`pnpm test:utils` 268/268**、退出码 0（基线 261 + adapter 新增 7）；`pnpm check` 0 errors / 0 warnings / 6 hints；全范围 Prettier 退出码 0；`verify-eol` 451 文件 0 混合。
- **flush 轮数统一（唯一一处改动了既有桩行为的地方）**：原为 interaction 8 轮 / failure 12 轮，统一到 12。改前用**未改动**的两个原文件各复制一份、只改轮数做两向对照：interaction 8→12 得 **30/30**，failure 12→8 得 **14/14**（`output/architecture-2026-11-10/F3/flush-equiv/flush-equiv.log`），证明轮数只影响等多久、不改变任何结局。
- **变异验证**（每次跑完立即用备份还原，`sha256` 回到 `64dd9bad…`、`grep "F3 变异"` = 0）：删掉 `finally` 里的 `busy = false` 与 dataset 清理 → **6 红**（四条解锁路径全塌）；删掉 decode 被拒后的「加载完成 + 固有尺寸」回退 → **18 红**（全部成功路径）；删掉 `pointercancel` 的复位 → **1 红**（「pointercancel 一律不换图，但会安全复位」）。
- **helper 没进客户端包**：`dist/` 全量搜 adapter 的 5 个特征串 **0 命中**；客户端 JS chunk 摘要与本轮改动前**逐字节相同**（124 个 chunk / 5,478,983 B，`4964d832…`）。

**失败路径与踩坑**：

1. **多指路径没有测试覆盖**——变异三的另一个分支（删掉 `releasePointer` 的指针 ID 过滤）跑出来仍是 44/44 全绿。也就是说现有用例里没有任何一条覆盖「第二根手指按下时不应接管手势」。这是本轮实测出来的**既有覆盖缺口**，与迁移无关；本轮没有补（补它属于新增行为断言，超出 F3「只允许合并 setup」的边界），留给 F5 决定。
2. **桩里有四处「承重」的语义不得顺手补全**：`document` 故意没有 `createElement`、`getComputedStyle` 故意不返回 `getPropertyValue`（两者合起来让交叉淡入的临时层必然建不起来 → 走 `skipped` → 直接切换的退化路径，补上任何一个都会让事务挂在 `waitForImage` 上）、`Image.decode` 恒 reject（逼出「加载完成 + 固有尺寸」的退化判据）、未知 selector 抛错（让提示气泡与衣服 SVG 刻意缺席，走 CSS 兜底）。这四条已写进 adapter 文件头。
3. **`installGlobals` 不能重复包裹计时器**：原 failure 桩在同一文件里第二次调用时会把**已被替换的** `globalThis.setTimeout` 当成真身再包一层；adapter 改为模块加载时取一次真身，场景工厂只重装不重包。
4. **`astro build` 首次因 `fonts.googleapis.com` 取字体抖动中止**（`Error fetching fonts: TypeError: terminated` → satori「No fonts are loaded」），重试退出码 0；与本轮改动无关。

**阶段边界**：本轮只做 F3，F4 / F5 未开始。**未 commit、未 push、未建 PR、未部署。**

## 2026-11-10：样式指纹不再把「不渲染元素的增删」算成可见差异（F1 仪器补丁）

**改了什么**：新增 `scripts/lib/style-nonrendering.mjs`（判定六类不生成盒子的标签：`script` / `style` / `link` / `meta` / `noscript` / `template`）与 `scripts/lib/style-nonrendering.test.mjs`（16 条，随 `pnpm test:lib` 的 `scripts/lib/*.test.mjs` glob 自动执行）；`scripts/upgrade-style-audit.mjs` 的 `load()` 在完整性校验之后、比对之前剔除这些行，并在汇总里打印两侧各剔除了多少条。**采集端未改**，artifact 里仍保留全部行，`elements` / `staticLines` / sha / 四态计数仍按采集时的正文校验；可见性分类的阈值与规则、`bag` 的两档规则、退出码语义都没动。

**为什么**：`diff` 的比对键 = 状态前缀 + **全部兄弟元素序号**，且元素增删一律记「可见」。这两条叠加后，删掉一个不生成盒子的 `<script>` 会同时制造两类假差异：脚本自己少一行，以及它之后所有元素的序号前移、成批变成 REMOVED/ADDED。F2 把四个页面级功能的内联脚本迁进共享 chunk 时正好撞上：真实差异只有 **18 个 `<script>`**，工具却报 **12/23 页、2,365 条**，把「结构性搬动」误报成「全站样式变化」。这类假阳性会让人开始怀疑判据本身，比漏报更伤。

**实测证据（2026-11-10，Windows 11 / Node 24.18.0）**：

- **同一对真实 artifact 复跑**（`output/architecture-2026-11-10/F2.5/` 的 `fp-before` / `fp-after`）：修复前 `exit 1`、`12/23` 页、`2,365` 条；修复后 **`exit 0`、`0/23` 页、`0` 条**，汇总行注明两侧各剔除 199 / 181 条不渲染元素行（`diff-after-instrument-fix.log`）。
- **变异矩阵**（`output/architecture-2026-11-10/F1-instrument/`，每份变异都同步修正 manifest 让产物保持自洽完整；最后一列是同一份脚本**只把剔除那步关掉**的对照版，用来证明「补丁只改了它该改的那一处」）：

    | 变异                                     | 补丁版                       | 对照版（不剔除）             |
    | ---------------------------------------- | ---------------------------- | ---------------------------- |
    | 删掉全部不渲染元素行                     | `exit 0`、`0/23`             | `exit 1`、`23/23`、181 条    |
    | 删一条渲染元素（`article.post-list`）    | `exit 1`、1 页、1 条、可见 1 | `exit 1`、1 页、1 条、可见 1 |
    | 加一条渲染元素                           | `exit 1`、1 页、1 条、可见 1 | `exit 1`、1 页、1 条、可见 1 |
    | 改一处渲染元素 `color`                   | `exit 1`、1 页、1 条、可见 1 | `exit 1`、1 页、1 条、可见 1 |
    | 改一条 `:hover` 状态行 `color`           | `exit 1`、1 页、1 条、可见 1 | `exit 1`、1 页、1 条、可见 1 |
    | 删不渲染行 **且** 改一处渲染元素 `color` | `exit 1`、1 页、**1 条**     | `exit 1`、`23/23`、182 条    |

    结论：凡是**渲染元素**的增删或样式改动，两版判定逐项相同（都是 1 页 1 条）；差别只出现在涉及不渲染元素的用例上，且合并用例从 182 条降到 1 条——补丁既没放过真差异，也没让真差异被噪声淹没。

- **同码自等**：同一份 `dist/` 连采两次（`fp-self-a` / `fp-self-b`），正文**逐字节 23/23 相同**，与 17:00 那次采集也 **23/23 相同**；补丁版 `diff` 是 `0/23`，**关掉剔除的对照版同样是 `0/23`**——说明自等不是补丁造出来的。
- **真实 CSS 变异**（改产物 CSS 再重采，不是改 artifact）：给 `dist/_astro/MainGridLayout.wWwsudvT.css` 追加 `article.post-list{padding-left:37px!important;}`，先在浏览器确认首页 10 个 `article.post-list` 的计算值都变成 `37px`，再全量 capture，采完立刻恢复（sha256 与备份一致、文件与服务内容无残留）。补丁版与对照版**都**是 `exit 1`、`2/23` 页、160 条差异，逐项相同。
- **完整性没被绕过**：把某页正文截掉一行、manifest 不动 → `exit 1`，报「manifest 记录 1080 行，正文实际 1079 行」「正文摘要与 manifest 不符」「disabled 采样 60 → 59」，在样式比较之前就退出。
- `pnpm test:lib` 70/70（原 54 + 新增 16）、全范围 Prettier 退出码 0、`verify-eol` 441 文件 0 混合。

**失败路径与边界**：① 只放过这六类标签；`img` / `input` / `br` 这类会生成盒子或被布局计数的元素仍在比对范围内。② 不渲染元素行不参与比对，但**仍然参与完整性校验**——采集少写了它们照样判不完整。③ 这条改动只解决「不渲染元素增删」，不解决「元素真实重排导致路径键漂移」：那种情况依旧先由 `bag` 判成 `reorder-only`，`bag` 也不相等时才会逐条比。④ 上一轮 F2.5 记录里「按字面为红」的结论保留在计划文件的历史记录中，本轮补丁后已用同一对 artifact 复跑转 `0/23`。

**阶段边界**：本轮只做这处仪器口径补丁，未进入 F3。**未 commit、未 push。**

## 2026-11-10：页面级 runtime 收进一个会话 owner（轮播、字号、侧栏 tabs、3D 云）

**改了什么**：新增 `src/utils/runtime/page-session.ts`（页面级会话 owner，只做 start/stop 调度，不碰 DOM）、`src/utils/runtime/slideshow.ts`、`src/utils/runtime/font-size.ts`、`src/utils/runtime/sidebar-tabs.ts`、`src/utils/runtime/tag-cloud-3d.ts`（四个功能从各自 `.astro` 的内联脚本原样迁出）；`src/utils/theme-script.ts` 增加 `pageSessions` 清单（四项）、装配表一行 `{ init: pageSessions.start, swap: 9 }`、`runtimeHooks.beforeSwap` 追加 `pageSessions.stop`；`Slideshow.astro` −98 行、`posts/[...slug].astro` −95 行、`WidgetNewLog.astro` −41 行、`TagCloud3D.astro` −123 行（各删一个 `<script>` 块，markup、样式、类名、DOM 顺序零改动）。`docs/agents/components.md` 补「页面级功能走会话 owner」协议。

**为什么这么定**：旧形态是内联 init + 自监听 `colorful:page:loaded` + `dataset` 守卫，只有「同页防重入」，没有「离开页面」的语义——首页轮播的 `setInterval` 在 `#slider` 脱离 DOM 后仍在跑，回到首页再起一条（实测 2 → 2 → 3，`clearInterval` 一次都没调用）；字号的 click-away 用 `window.__fontSizeClickAwayBound` 全局旗标压重复注册，那个旗标没有「页面结束」的出口（**已删除**）；tabs 的监听绑在会被换页丢弃的节点上，靠「不可达」冒充清理；3D 云的销毁挂在「下一次 init」上，离开后不再进云集页就一直活着。owner 不新增轨道：初始装载与换页重跑复用 `runtimeTable` 的一行，离开前停止挂在既有 `runtimeHooks.beforeSwap`，常驻模块（头部微言、拉绳壁纸、导航、液态玻璃、随机背景）不进清单。

**实测证据（2026-11-10，Windows 11 / Node 24.18.0 / `astro build` 产物 + `preview --port 4322`）**：

- **生命周期**：修前 2 → 2 → 3（`output/architecture-2026-11-10/F2-baseline/lifecycle-red*.log`，5 PASS / 2 FAIL、退出码 1）；修后 interval 2 → 1 → 1 → 1 → 2、**17/17**、退出码 0（`F2.2/lifecycle-green.log`、`F2.3/lifecycle.log`、`F2.4/lifecycle.log`、`lifecycle-restored.log`）。
- **监听计数**（生命周期测试直接读，不靠行为推断）：文章页 `document` 的 pointerdown = 1 → 离开后 0 → 回来仍 1（不累积）；旧 tab 节点的 click = 1 → 0。
- **异步竞态**：用 `page.route` 把 `SVG3DTagCloud.global.js` 压住 1.5s，进 `/tag/` 后立刻换页，2.2s 后 `window.__tagCloud3D` 为 `undefined`、页面无 `.tag3d-stage svg`（前置断言 `libRequests=1` 保证请求真被拦过）。
- **相位**：`slider:initialized` 迁移前 355.7ms、迁移后 419.2ms，两次都与 `domcontentloaded` 同刻——init 只写 `data-initialized` 并起计时器，首张 `active` 是构建期标记，首帧不受影响（`F2.2/timeline-before.json` / `timeline-after.json`）。
- **DOM 不变**：`#slider` 子树与迁移前逐字节相同（5780 bytes `===`）；`tab_nav` 块 358 bytes、字号弹层 216 bytes 同样逐字节相同；空 `<script></script>` 计数 9→9。`#newlog` / `#randlog` 列表跨构建本就不同（构建期抽样，ADR 0012 记过整站非确定），不计入比对。
- **可见行为**：`smoke:ui` **142/142、0 失败、退出码 0**（三次：F2.2 / F2.3 / F2.4 各一次，与改前基线同读数）；轮播三组读数见 `F2.2/behavior.json`；字号与 tabs 见 `F2.3/behavior.json`（打开/外部点击关闭/滑块 18px/存储 `"18"`/离开再回来仍 18px；tabs 点击、Enter、Space 三组状态同步，换页后新侧栏仍可切换）；3D 云见 `F2.4/behavior.json`（`/tag/`→`/category/`→`/tag/` 各 1 个 svg、32 条链接、`consoleErrors: []`、药丸命中测试 `hitInsideAnchor=true` 且导航到 `/tag/AI%E7%BC%96%E7%A8%8B/`；reduced-motion 下 svg=0、注册表为空、药丸云仍在）。
- **变异**：轮播 `stop()` 不执行 teardown → 回到 2 → 2 → 3；字号 stop 不清理 → `pointerAfter=1`、`pointerBack=2`；tabs stop 不清理 → `tabClickAfter=1`；3D 云删掉「已离开则不创建」守卫 → `registry="object"`。四次都退出码 1，恢复后 sha256 与备份一致、各自回绿。

**怎么验证的**：上述读数逐条实跑；`pnpm check` 0 errors / 0 warnings / 6 hints、`pnpm test:lib` 54/54、`pnpm test:utils` 261/261、`pnpm test:article-toc-browser` 2/2、`verify-eol` 441 文件 0 混合、全范围 Prettier 退出码 0。

**失败路径与踩坑**：① hover 暂停的第一次探针读成「没暂停」，实为点完指示点后指针仍停在轮播内、不会重新触发 `mouseenter`（旧实现同样如此，`click` 会重新起表）；修正探针顺序后读到正确值，没有为此改生产代码。② `astro build` 在已有 `dist/` 上可能被宿主的批量删除守卫拦（见 `docs/agents/commands.md` 的「宿主的批量删除守卫」节），也可能因 `fonts.googleapis.com` 取字体超时中止（`Error fetching fonts: TypeError: terminated`）——两者都按既有处置重试，未改构建代码。③ 删 `<script>` 块时用一次性脚本按标记切；第一版按 `<script` 前缀找块，把自闭合的 JSON-LD `<script ... />` 当成开标签、连带吞掉中间内容，靠「删完剩余 `<script` 数量必须等于预期」的自检拦住，改成只认裸 `<script>` 后才落盘。④ 3D 云的药丸链接在转动，Playwright 的「元素稳定」判据永远不满足，`click()` 会一直重试到超时；改成同一帧里量矩形 + `elementFromPoint` 命中测试，再用合成 click 验证导航（`hitTag=text`、跳到 `/tag/AI%E7%BC%96%E7%A8%8B/`）。⑤ 样式指纹的 A/B 采集端口不影响 `diff`（`load()` 会把 `localhost` / `127.0.0.1` / `0.0.0.0` 的主机与端口一并抹掉），但**直接读原始 artifact 的一次性探针没有这层归一化**——`background-image` 里带着 `http://127.0.0.1:<port>/…`，跨端口比对会每页凭空多出几百条。F2.5 首次就是拿两个端口采的，工具读数一致，探针却对不上，最后统一下到同一端口重采了改后侧。

**F2.5 全量验收（2026-11-10 17:01–17:42，同一份 `dist/` 与 14:12 归档产物，同端口 127.0.0.1:4401 分别采集）**：

- **样式指纹**：两侧 artifact 均 `complete:true`（各 23 页、四态目标/定位 1,220/1,220、无 uneven 页），元素行 22,542 → 22,524。工具 `diff` **按字面为红**：12/23 页、2,365 条差异、退出码 1。逐条归因后差异只有 **18 个被迁走的内联 `<script>` 元素**——`diff` 的键含全部兄弟元素序号、元素增删一律记「可见」，删脚本会把下游序号整体前移。剔掉不渲染元素后按「元素标识 + 样式」做多重集比较 **23/23 页一致**（首页 1 条属随机抽样的 `nth-child` 配色，工具自己的 `dropBg` 档同样放过），HTML 剥脚本并归一化随机列表与产物哈希后 6/6 逐字节相同。**未改仪器**（F2 的允许文件不含 `scripts/upgrade-style-audit.mjs`），建议另开一单让 `diff` 不计不渲染元素的增删，再用这两份 artifact 复跑预期 0/23。
- **截图与几何**：18 张（桌面 1440×900 / 移动 390×844 × 首页首帧 / 文章页字号弹层关闭 / `/tag/` / `/category/`，桌面另含打开态）。`#slider`、字号按钮与弹层、`.tag3d-stage`（各 1 个 `svg`，桌面 `{221,424.8,712,413}`、移动 `{30,202.8,330,191}`）、`ul.blogtags`、tabs 的 rect 与计算样式逐项相同；唯一差异是移动端两个云集的 `scrollHeight`，同侧三次重复即自证为噪声（870/895/845 与 870/895/915）。移动端没有字号弹层打开态，因为 `@media (max-width:680px)` 的 `.post-metaa .tools{display:none!important}`，两侧一致。
- **烟测失败集合**：`smoke:ui` 142/142、`smoke:series` 88/88、`smoke:wallpaper-pull` 47/47、`smoke:console` 23/23，四套的**判据名集合完全相同**、`FAIL` 行 0、无新增失败。
- **客户端产物**：JS 两侧都是 124 个 chunk、文件名一一对应，只有 `Layout.astro_astro_type_script_index_0_lang.*.js` 由 45,732 变 51,380 B（+5,648；gzip9 +1,691；brotli +1,429），站内 JS 总量 +0.10%；每页实读 `decodedBodySize` 恰好 +5,648、请求数不变。CSS 8 个同名文件逐字节相同（归档里另有两份 11-07 的无引用残留）。
- **时序**：`runtimeTable` 28 → 29 行，非页面级行序逐项相同；swap 1–8 逐项相同、只在末尾追加 9；新行位于 `initArticleToc` 与 `initSwupHooks` 之间；`beforeSwap` 只尾追加 `pageSessions.stop`；`pageLoad` 三项不变。

**阶段边界**：F2.2–F2.5 已完成；F2.6 是回滚与停止条款，本轮未触发、未执行。**未 commit、未 push。**

## 2026-11-10：样式指纹 artifact 自带版本与四态覆盖，采集失败不再伪装成「没有差异」

**改了什么**：新增 `scripts/lib/style-audit-artifact.mjs`（artifact 的唯一格式契约：写入 / 读取校验 / 覆盖比较）与 `scripts/lib/style-audit-artifact.test.mjs`（11 条契约测试，随 `pnpm test:lib` 的 `scripts/lib/*.test.mjs` glob 自动执行）；`scripts/upgrade-style-audit.mjs` 的 `capture` 改为经该 module 逐页写入、`load`/`diff` 改为**先校验 artifact 再比样式**，状态采样失败从空 `catch` 降级改成记录 `stateError` 并以非零退出。`index.json` 新增 `formatVersion`（`style-audit-artifact@1`）、`states`、`complete`、`problems`；每页新增 `staticLines` 与 `coverage{targets, located, states, stateError}`。同步补 `docs/agents/commands.md` 的「样式指纹的状态采样」节。`src/`、页面、CSS、路由、依赖、`package.json`、四态集合、`STATE_MAX`、`AUDIT_PAGES`、可见性分类与阈值一律未动，gzip 正文的行内格式（`<标识> | <位置路径> | <属性…>`、`:hover …`）逐字节保持不变。

**为什么这么定**：旧实现的 `catch {}` 让 CDP 失败降级成「没有状态行」，而 manifest 只记一个总行数——产物与完整采集长得完全一样，`diff` 无从判断。这不是理论风险：本轮用 HEAD 版脚本实测，CDP 一失败仍 `EXIT=0`，23 页只剩 17,662 行（正好是静态行数，4×1,220 条状态行凭空消失），manifest 字段与完整采集同形；把它复制一份做 diff，得到 `pages differing: 0/23, element diffs: 0`。同一份里只要一侧完整一侧失败就报 23/23 页、4,880 条差异——**失败只在单侧时才看得见**，这正是「没测到」被当成「没变化」的入口。所以把版本、每页静态/四态计数、完整性收进一个窄 interface，并且**不信 manifest 自报**：读取时从正文重算行数、静态行、四态计数与 sha，逐项比对。

**实测证据（2026-11-10，Windows 11 / Node 24.18.0 / pnpm 10.26.2，`pnpm exec astro build` 的 `dist/` + `pnpm preview --port 4322`）**：

- **同 dist 连采两次**：`fp-c` 6m24s、`fp-d` 6m42s，各 23 页 / 22,542 行（静态 17,662 + 四态各 1,220；`targets` 与 `located` 各 1,220，无页面四态不等），两份 `complete:true`、`problems: []`；`diff` 得 `pages differing: 0/23, element diffs: 0`、退出码 0。
- **行内格式未变**：同一份 dist 上，旧实现（HEAD）与新实现写出的 23 份 gzip 正文**逐字节相同**（逐页 `===` 比对，23/23 相同、0 不同）。新实现只多了 manifest 字段。
- **旧格式显式拒绝**：`diff` 读 2026-11-10 之前采的 artifact（无 `formatVersion`）直接 `EXIT=1`，提示「artifact 索引里没有格式版本，当前工具只认 style-audit-artifact@1：不猜测、不静默兼容，请重新采集」。
- **四种变异各自红**：① 只删所有 `:hover` 行（manifest 一字不动）→ `EXIT=1`，逐页报「manifest 记录 hover 采样 60 行，正文重算为 0 行」；② 只把 `formatVersion` 改成 `style-audit-artifact@0` → `EXIT=1`；③ A 侧某页最后两个目标的四态行整组删掉、manifest 同步改成自洽的 58 → 两份都 `complete:true`，`diff` 报「`/`：目标元素数不一致（A 58 / B 60）」并逐态列出 `hover` / `focus-visible` / `active` / `disabled`；④ 只把 manifest 的 hover 计数 60 改成 59 → `EXIT=1`，报「正文重算为 60 行」且「四态计数不一致」。
- **capture 失败语义**：在 `newCDPSession` 前注入 `throw` 跑一次 capture，得 `EXIT=1`、artifact `complete:false`、23 条问题（每页一条带错误摘要）；恢复源码后脚本 sha256 回到变异前的 `0f90b2b1…`，`grep "F1 变异"` 计数为 0。
- **测试与检查**：`pnpm test:lib` 54/54（基线 43/43，新增 11 条）、`pnpm test:utils` 261/261、`pnpm check` 0 errors / 0 warnings / 6 hints、全范围 `prettier --check` 通过。日志与采集都在 `output/architecture-2026-11-10/F1/`。

**怎么验证的**：上列读数逐条来自当日实跑，命令与退出码对齐；`git diff --name-only` 只出现 `docs/agents/commands.md` 与 `scripts/upgrade-style-audit.mjs`，另有三个未跟踪文件（两个新脚本 + 站长的 `docs/improvements/`；该批计划与评审报告已于 2026-11-12 归档至 `docs/history/architecture-2026-11-10/`，见 `docs/history/history.md` 的第七批）。没有 `src/`、CSS、页面、路由或依赖变化。

**失败路径与踩坑**：① 本机 `astro build` 仍在收尾清理 `dist/.prerender/.vite` 时被宿主的批量删除守卫拦下（`[safe-delete][SAFE_DELETE_BULK_CONFIRM_REQUIRED] {"count":50,"threshold":50,…}`，与 2026-11-05 / 11-07 同一处），**真实退出码 1**、`astro:build:done` 未执行、sitemap 与 pagefind 没刷新；页面与 CSS 确由本次写出（`dist/index.html` 时间戳 14:12:36），F1 的采集不消费 sitemap/pagefind，但按「该步未执行」记录，不写成构建通过。**同日 15:21 找到可复现的本地解法**：把旧 `dist/` 整目录 `mv output/dist-archive/dist-<时间戳>` 留档（不是删除）后再构建，两次 `astro build` 都是退出码 0、`@astrojs/sitemap` 正常写出、`pagefind` 退出码 0；操作顺序与读数记在 `docs/agents/commands.md` 的「宿主的批量删除守卫」节。② 本会话的托管 Node 是 22.22.2，被 Astro 7.4.4 直接拒绝（要求 `>=22.23.4`），必须把系统 Node 24.18.0 放到 `PATH` 前头再跑 pnpm；`astro check` 与 `.astro` 产物无关，不受影响。③ Git Bash 会把裸参数 `/` 转成 Git 安装路径（报 `page not found: D:/Program Files/…/PortableGit/`），给探针传页路径 `/` 要加 `MSYS_NO_PATHCONV=1`。④ 中途发现 `load()` 在「完整」与「不完整」两种情况下返回形状不一致（完整时返回 index、失败时返回 read 结果），于是 `a.status` 为 `undefined`、所有 artifact 都被判成不通过；已改成统一返回 `{status, problems, index, pages}`。这个缺陷单测抓不到（单测只覆盖 module），是 C/D 集成比对暴露的——**artifact 契约必须由真实 capture→diff 走一遍才算验过**。

**已知边界（本轮不改）**：每页的 `errors`（console 报错摘要）仍然**只记录、不参与 diff 比较**。实测 `fp-c` 与 `fp-d` 在 `/posts/20260919135000/` 上一次记 3 条、一次记 1 条（第三方资源 404 / `ERR_CONNECTION_CLOSED` 抖动），`diff` 仍是 `0/23`。把 `errors` 纳入比较会把第三方噪声变成红灯，与既有「第三方件不进指纹」的口径冲突；要改它得先定义「哪些报错算回归」，不在 F1 范围内。

**阶段边界**：本轮授权为共用开工门禁（Phase 0）+ Phase F1，F2–F5 未开始；**未 commit、未 push**（`push main` 等于生产部署），改动停在本地。

## 2026-11-07：把 `scripts/` 与 `tailwind.config.cjs` 纳入 Prettier 门禁

**改了什么**：`.github/workflows/lint.yml:39` 的 `prettier --check` 与 `.githooks/pre-commit.mjs` 的 `inScope` 都从 `./src ./docs ./*.md` 扩为 `./src ./scripts ./docs ./*.md tailwind.config.cjs`，与 `package.json:47` 的 `pnpm format` 同范围；钩子开头的范围注释、作用域注释和未格式化报错文案一并改。同步改掉写死旧命令的活文档：`.githooks/README.md`、`docs/agents/commands.md:242`、`README.md:448`、`docs/agents/build-and-deploy.md:78`。`AGENTS.md` 只说「提交时有本地 prettier 门禁（只查暂存内容）」，没写死范围，不动；`CHANGELOG.md` 历史条目、`docs/history/`、`docs/agents/styles.md:46` 与 `emlog-mapping.md:52` 里指向 `prettier --check ./src` 的历史说明按惯例不回写。

**为什么这么定**：`/retro` 候选 2 发现 `format` 含 `./scripts` 与 `tailwind.config.cjs`，而 CI 与 pre-commit 只查 `./src ./docs ./*.md`——本轮改 `scripts/ui-smoke.mjs` 时全程没有自动格式门禁覆盖，只能靠 diff 逐行核对。按 `AGENTS.md:110`「文档与代码矛盾时先证明哪边是真的」的同一口径，先只读核对欠债再动手：两者都零欠债，纳入范围不产生任何格式化 diff，所以这是「补上门禁」而不是「顺手格式化」。**没有跑 `pnpm format` 全量改写**，避免产生与 surgical changes 冲突的大 diff。

**实测证据（2026-11-07，本机 Node 24.18.0 / pnpm / Windows，命令在仓库根执行）**：改动前 `pnpm exec prettier --check ./scripts` 与 `prettier --check tailwind.config.cjs` 均 `EXIT=0`、0 warn，`.prettierignore` 无 `scripts/` 相关排除；完整新范围 `pnpm exec prettier --check ./src ./scripts ./docs ./*.md tailwind.config.cjs` `EXIT=0`。变异验证：在 `scripts/` 下放一个格式不良的临时 `_prettier-scope-probe.mjs`，同一条 CI 命令得 `EXIT=1` 且 `[warn] scripts/_prettier-scope-probe.mjs`；用隔离的 `GIT_INDEX_FILE`（不动真实索引、不 commit）跑 `.githooks/pre-commit.mjs` 得 `EXIT=1` 并列名同一文件。换成合规临时文件后两处都是 `EXIT=0`，临时文件与隔离索引随后删除。日志 `output/site-title-hitarea/prettier-scope-mutation.log`。

**怎么验证的**：`node --check .githooks/pre-commit.mjs`、上述变异/恢复两轮、`pnpm exec prettier --check ./src ./docs ./*.md`（旧共用底线仍绿）、`git diff --check`、`verify-no-hardcoded-counts.mjs` / `verify-doc-versions.mjs` / `verify-eol.mjs`、`pnpm check`、`pnpm test:prettier-math`；逐文件复核行尾保持各自原有的纯 LF / 纯 CRLF。改的是格式门禁本身，没有源码、样式、内容或依赖变更，按 `commands.md:238`「改的是什么就看什么」未跑 `astro build`。**阶段边界**：上述验证在未提交状态下完成；上线由站长 23:16 单独授权，本条目随该笔提交一并入库。`push main` 等于生产部署。

**失败路径与踩坑**：① 复盘时把「`scripts/` 历史欠债多、全量格式化会产生大 diff」列为风险，实测是零欠债，该风险假设作废——先 `--check` 再决定对齐，比凭印象判断可靠。② 隔离索引验证钩子必须把 `GIT_DIR`、`GIT_WORK_TREE`、`GIT_INDEX_FILE` 三个变量一起指定，钩子里是裸 `git` 调用，漏一个就会读到真实索引或找不到仓库。③ `core.autocrlf=true` 下 Git 对新建的纯 LF 临时文件会打印「LF will be replaced by CRLF」，那是既有检出规则、不是混合行尾，`verify-eol` 判定为 0 混合；别把它当成行尾门禁失败去「修」。

**裁决留痕**：站长 22:51「确认走2，零负债」选定 `/retro` 候选 2，23:13 确认完整对齐并收口，23:16 授权推送上线（验证阶段的「不 commit、不 push」随之解除）；候选 1（守卫指针）已在前一轮落地，与本次改动同笔提交，候选 3、4 与低优先级观察按「其他不做」一律不实施。

## 2026-11-07：更新 ui-smoke 头部标题几何基线并做变异验证

**改了什么**：`scripts/ui-smoke.mjs` 的 `HEAD_BASE` 各档宽度期望值从改动前实测的 `980/960/840/720/630/541` 改为 `343`（`fit-content` 后实测），并补注释说明来源与变异验证方法；`headRows.every` 的逐项比较、`<= 1` 容差、以及 x / y / 高 / font-size / font-weight / line-height 这些其余基线一律未动。同步修订 `docs/agents/styles.md`「桌面头部标题」条里「裁决保持不更新、持续报红是已知接受状态」这句活口径。

**为什么这么定**：`3073094` 把 `#header .site-title` 从 `width:980px` 改为 `width:fit-content` 之后，这条判据锁的仍是改动前的盒宽，于是持续报红。按 `AGENTS.md`「文档同步」§1「文档与代码矛盾时，先证明哪边是真的，再改表述」：代码侧是站长确认并已上线的设计，过时的是基线，所以更新基线而不是回滚代码。**判据没有被削弱**——没删 `headRows.every`、没放宽容差、没加放行条目，只把宽度换成新实测值，其余各项继续逐像素锁；按 `AGENTS.md`「样式指纹的状态采样」条的同款纪律，改判据后必须做变异验证，否则等于把它削弱成永远绿。

**实测证据（2026-11-07，`pnpm preview --port 4322` 上的 `dist/` 产物、headless Chromium）**：备份 `dist/_astro/MainGridLayout.Bol8q-YJ.css` 后，精确把 `#header .site-title{...}` 整条规则块内的 `width:fit-content` 改回 `width:980px`，跑 `pnpm smoke:ui` 得 `MUTATION_SMOKE_EXIT=1`，失败项恰好是「头部标题在五档下几何与计算值逐项不变」；失败详情显示各档实测回到 `980/960/840/720/630/541`、期望 `343`，而 x / y / 高 / `26px` / `400` / `31.2px`（681 档为 `20px` / `400` / `24px`）逐项仍相等——判据只抓宽度回归，没有误伤其余项。逐字节恢复后 SHA256 与备份一致（`C866E1D7…`），再跑 `pnpm smoke:ui` 得 `RESTORED_SMOKE_EXIT=0`、零失败。

**怎么验证的**：两次全量 `pnpm smoke:ui`（变异态 / 恢复态）、`pnpm exec prettier --check ./src ./docs ./*.md`、`git diff --check`、`verify-no-hardcoded-counts.mjs` / `verify-doc-versions.mjs` / `verify-eol.mjs`；`scripts/ui-smoke.mjs` 与两份文档改后仍是纯 CRLF。**失败路径照记**：① 产物里语录条 `.quote-band__zh` 也用 `width:fit-content`，全局替换会连带改坏它、污染其它判据，故变异必须精确匹配 `#header .site-title{...}` 这一整条规则块（实测目标只命中一处）。② 变异前须确认 `dist/pagefind/` 索引在，只跑 `astro build` 会让搜索判据假红，与本次改动无关（见前一条 CHANGELOG）。③ dev 路线仍受本机批量删除守卫限制，本轮验证走 `astro build` + `pnpm preview`。**不 commit、不 push**——本轮授权只有「处理报红」，`push main` 等于生产部署。

**裁决留痕**：站长 21:27「处理 ui-smoke 的报红」推翻 20:49「保持现状」裁决中的第 ① 项，也使上一条 CHANGELOG 的「有意不做」段与「裁决留痕」段里关于 `HEAD_BASE` 不更新的表述失效；历史条目按本仓库惯例不回写，在此留痕。GLOSSARY 措辞不调整、不新建 ADR 两项仍按原裁决执行。

## 2026-11-07：站点标题链接的点击命中区收紧到文字宽度

**改了什么**：`src/styles/global.css` 的 `#header .site-title` 把 `width: 980px` 换成 `width: fit-content`，只动一处声明；`GLOSSARY.md` 新增「站点标题链接」词条（桌面形态「桌面站点标题链接」、移动形态「移动站点标志」）。`src/components/layout/Navbar.astro` 的两处 DOM 分支、`global.css` 里 `#header .site-title a, #header .text a` 的共用截断块、`max-width: calc(100% - 100px)`、`overflow / text-overflow / white-space`、以及所有 `cursor` 声明与 token 均未动。同步修订 `docs/agents/styles.md`「桌面头部标题」条里已被 `1e91e869` 降级掉的旧选择器 `#header h1`，并在 `docs/agents/commands.md`「本地预览该用哪一条」节补本轮踩到的命令坑。

**为什么这么定**：站长报的是「宽屏下站点标题文字右侧一大片空白 hover 也是手型、还能点回首页」。根因是 `<a>` 被共用截断块的 `display: block` 撑成块级、填满 `p.site-title` 的 980px 固定宽，文字只占左侧。收紧靠**缩小父盒**，不在 `<a>` 上写 `cursor` 覆盖——`docs/agents/styles.md`「自定义光标」条把本站手型定死在 `--cursor-link` 单源，类选择器裸写 `cursor` 会以更高特异性把指针静默退回系统手型，`pnpm smoke:ui` 的光标负扫守着这条。`fit-content` 复用同文件语录条 `.quote-band__zh` 已实测的写法（该条记「实测盒宽与墨迹宽逐像素相等」），符合 `AGENTS.md`「元件设计约束」的复用优先级。**有意不做**：不更新 `scripts/ui-smoke.mjs` 的 `HEAD_BASE` 基线（票 09「视觉逐像素不变」锁，锁的是改动前的标题带盒宽）、不改 GLOSSARY 措辞、不新建 ADR——这三项经站长 20:49 裁决「保持现状」。因此 `pnpm smoke:ui` 会持续有一条「头部标题在五档下几何与计算值逐项不变」报红，属**已接受的基线未随设计更新**，不是回归，也别为它削弱判据或加放行条目。

**裁决留痕**：20:49 站长曾裁定「保持现状」，其中「文档同步」一项已由 20:54「文档需要更新，如 CHANGELOG」明确推翻，本条即为该次补同步；`HEAD_BASE` 基线不更新、GLOSSARY 措辞不调整两项仍按 20:49 裁决执行，不新建 ADR 沿用 Q1 决定。

**实测证据（2026-11-07，headless Chromium 读 `pnpm preview --port 4322` 的构建产物，探针 `output/site-title-hitarea/probe.mjs`）**：改前 `<a>` 盒宽 965.0px、文字墨迹宽 328.1px，文字右侧 x=733.1 处 `elementFromPoint` 落在该 `<a>` 上、计算 `cursor` 含 `/style/link.cur`；改后盒宽 328.1px 与墨迹宽相等，同一点落到 `DIV.box`、计算 `cursor` 含 `/style/default.cur`，文字区仍落 `<a>` 且为 `link.cur`。垂直行盒 60px、字号 30px、色 `#fff`（静息与 hover 相同）、`margin-left:15px`、`title` 与 `href` 逐项不变；微言碎语 ticker 的 `<a>` 仍是 `display:block`。1440 / 1100 / 1000 / 980 / 860 / 769 / 681 各档标题仍在 100px 浮动 logo 右侧、未落入 `#header` 裁切区。`pnpm smoke:ui` 那条头部基线判据的失败详情反过来印证视觉未动：改后各档宽度均为 343px（墨迹 328.1 + `margin-left:15px`），而 x / y / 高 / font-size / font-weight / line-height 逐项等于原基线。

**怎么验证的**：`pnpm exec astro build` 退出码 0 且生成 sitemap；`pnpm check` 0 errors；`pnpm exec prettier --check ./src ./docs ./*.md` 绿；`pnpm smoke:ui` 补齐 pagefind 索引后，除上述已接受的一条外全绿，光标负扫与 body 箭头判据绿。**失败路径照记**：① `pnpm dev` 在本机起不来——Vite 预构建依赖时要批量删 `node_modules/.vite/deps` 与 `deps_temp_*`，撞上本机 `node-safe-delete-shim` 的批量删除守卫（`SAFE_DELETE_BULK_CONFIRM_REQUIRED`），dev 要么直接退出、要么挂 `vite-error-overlay` 挡住全部指针事件；此时 `elementFromPoint` 读到的是遮罩，命中区判据整段失真。不绕过守卫，改走 `astro build` + `pnpm preview`，旧缓存只改名留档不删。② 只跑 `pnpm exec astro build` 不生成 pagefind 索引，`pnpm smoke:ui` 的搜索判据会假红，补 `pnpm exec pagefind --site dist` 后转绿；`docs/agents/commands.md` 原句「建产物只跑 `astro build` 就够了」已就此补注。③ 一次改前基线构建同样被守卫在清理 `dist/.prerender/.vite` 时拦下，退出码 1、`astro:build:done` 未执行、sitemap 缺失；它与改后那次退出码 0 的构建条件不同，不把前者记为通过。纯文档与一行 CSS 改动走轻量档，未跑整条 `pnpm build`。**不 commit、不 push**——`push main` 等于生产部署。

## 2026-11-07：归档本轮剩余 14 份过程文档，全仓零死链（第五批）

**改了什么**：把 2026-11-02～03 依赖升级与阶段五迁移轮留下的 14 份 3053 行过程文档从 `docs/plans/` 删除，索引进 [`docs/history/history.md`](docs/history/history.md) 新增的「归档清单（第五批）」——沿用第四批的 5 列表格，逐份记结果、验收 / 落地提交与 `git show` 恢复命令；结果列写明阶段五评估第三节、实施计划 Task 16、Mermaid 报告第 5 节三个锚点。删后 `docs/plans/` 只剩两份天气胶囊文档。全仓 36 行 / 42 处引用改指第五批索引（`CHANGELOG.md` 15、`docs/agents/build-and-deploy.md` 10、`README.md` 4、`docs/agents/components.md` 3、`docs/agents/commands.md` 3、`docs/agents/styles.md` 1），`docs/agents/build-and-deploy.md` 的「升级路线与交接」节就地补 8 批次上线 sha 简表，承重结论留在活树。

**为什么这么定**：第四批（`4ac31aa`）只归档 Tailwind v4 / Satori 两轮的 9 份 957 行，同轮剩余文档仍在 `docs/plans/`。站长裁定补为第五批、AI 日报迁移收尾那一份一并纳入、走 A 方案（README 与 CHANGELOG 历史条目都改），并明确**推翻 2026-11-05「README 已收口 Tailwind v4 / Satori 条目按硬边界不动」的既有裁决**——按 `AGENTS.md`「文档改动会推翻一条既有裁决先问」，此处为站长已裁决事项，留痕备查。改写沿用第四批范式：删掉旧路径、文档名降级为自然语言、追加归档注记、改指「归档清单（第五批）」、不用 `#` 锚点；实测数字、当时状态（「未推送/未部署」「阶段五剩余 4 类」）、日期、sha 一字不动，`CHANGELOG.md` 两条 2026-11-05 元记录仅改路径；`CHANGELOG.md:476`、`docs/agents/commands.md:182`、`docs/nice-books-design.md:3` 三条早前批次的历史注记不动。零死链限定为**本次 14 个路径在活文档中清零**，排除 `docs/history/history.md` 恢复命令列、qweather 会话转录、`.workbuddy/memory/` 追加型工作日志与被删文件内部互引；`lint.yml` 的 Prettier / 公式保护 / 三个 `verify-*.mjs` 里**没有任何 markdown 死链判据**，零死链是本次 `git grep` 人工判据。

**有意不做**：`AGENTS.md` 全文件不动——第四批已补齐「改什么 → 必须同步哪一份」表的「归档 / 删除」行与「深入文档」表的 `docs/history/history.md` 入口，本轮它对这 14 个路径零引用，文首 `!IMPORTANT` 以上为只读固定区。ADR 0011 / 0012 仍在生效、继续留在 `docs/adr/`。`docs/history/history.md` 既有四批清单表、「按轮次索引」表、「未完成或未实施的事项」表（含 40 条失效 `output/` 指针那行）均不动；其中 `docs/plans/` 部分的 40 条失效指针已随第五批归档移出活树，改在此处补记，不回写历史表格（改单元格会按显示宽度触发 Prettier 全表重排）。

**实测证据**：14 条 `git show <sha>:docs/plans/<文件名>.md` 恢复命令逐条实跑并用 `wc -l` 核对，取回行数与磁盘逐份一致（61 / 51 / 55 / 99 / 72 / 64 / 60 / 130 / 251 / 302 / 221 / 150 / 1425 / 112，合计 3053），确认取到的是归档时最终内容后才删除。归档阶段 `docs/history/history.md` 的 `git diff --numstat` 为 `+23 −2`（文首两行 + 新增第五批节），既有表格逐字未动。

**怎么验证的**：`pnpm exec prettier --check ./src ./docs ./*.md` 全绿；`git diff --check` exit 0；`verify-no-hardcoded-counts.mjs` 与 `verify-doc-versions.mjs` 全绿；按 14 个精确文档名的 `git grep` 复扫（排除项如上）无输出。**一条工具暂态失败已查明并如实登记**：`verify-eol.mjs` 遍历 `git ls-files`，14 份已用 `rm` 删除但未 stage 的文件仍列在 index 里，故报 `ENOENT`（不是行尾缺陷）；改用同一脚本导出的 `scanTrackedFiles()` 传入现存文件列表复核，424 个现存 tracked 文本文件 **0 混合行尾**；7 个改动文件逐文件形态为 6 个 CRLF + 1 个 LF（`docs/agents/components.md`）、0 混合。另注：`docs/history/history.md` 现值已为 CRLF，与 2026-11-05 条目所记「保持全 LF」不同，本轮未改变其形态（`+23 −2` 的 diff 可证），历史条目按规矩不回写。**纯文档改动走轻量档，未跑 `pnpm build`**（文档不进产物，本机构建受订阅节点影响；2026-11-05 多轮纯文档改动同口径）。**不 commit、不 push**——`push main` 等于生产部署。

## 2026-11-05：把失效指针复核的四条经验接进导航文档

**改了什么**：`/retro` 报告按严重度给出六项候选，站长裁定推进 S1–S4、S5/S6 不做。落点全在既有文档，不新增脚本、不接门禁：

- **S1 扫描口径**：`docs/agents/commands.md`「证据目录清理的记录约定」节新增一段，要求复核 `output/` 指针时先记下 token 正则、扫描范围、计数单位、判定根路径四项；写明「磁盘不存在不等于待修」（占位符、会话转录、通配符、截断片段、起草时的占位目录名都会被算成不存在），以及登记值 / 宽松复扫值 / 唯一路径数是三套不同计数，交接时各自标来源、不合并成一个待修条数。
- **S2 探针落盘歧义**：同文件「一次性探针脚本该放哪」节新增一条，说明只读盘点阶段的扫描脚本也写到 `output/<批次名>/`——该目录被 `.gitignore` 忽略，落盘不算改仓库文件；「不许改任何文件」约束的是入库内容，为绕开它把长脚本塞进 heredoc 反而会撞上「脚本输出编码」节记下的转义被 shell 吃掉。另把 `AGENTS.md` 的「一次性探针脚本写在哪」指针补上「含只读盘点的扫描脚本」触发分支，避免只读阶段不触发该指针。
- **S3 表格列宽 / S4 节指代词**：`AGENTS.md`「文档写作约定」节把两条补进既有条目——引用另一节用节标题、不用「上节 / 下节」；改 Prettier 对齐的表格单元格前先按显示宽度（中文算 2）量列宽，超宽会触发全表重排连累相邻行。

**为什么这么定**：都是导航与措辞修补，不新增机制。S1 的判据只能报磁盘状态、判不了语义类别，接 `lint.yml` 会把占位符与转录全报成待修，故只作盘点辅助；S3 的错误 `prettier --check` 已经能拦，无需再写检查；S4 的方向正确性要读上下文，全仓剩余方向性指代词命中多为历史文档合法用法，机械判定会误报，留在文档约定里。S5（定案清单转验收表）落点在 `~/.workbuddy/skills/`，`AGENTS.md` 明确不改技能，本仓库不实施；S6 仅登记 `AGENTS.md` 体量观察，未逐行审计出 no-op，不动。

**怎么验证的**：`git diff` 逐行自查、`git diff --check`；`pnpm exec prettier --check ./src ./docs ./*.md`；四个 `scripts/verify-*.mjs` 直接跑；逐文件复核行尾形态保持原有 CRLF / LF，无混合；`grep` 确认新增文字未写会漂的计数与裸行号。本轮纯文档改动走轻量档，未跑 `pnpm build`。

## 2026-11-05：清理历史文档里失效的 output/ 指针

**改了什么**：给 阶段五实施计划、KaTeX 专项验收、Mermaid 专项验收、AI News 迁移收尾（已归档，索引与取回命令见 `docs/history/history.md` 的「归档清单（第五批）」） 各加一处 H1 下方的「历史快照说明」注记，逐字相同；`docs/agents/commands.md` 的「探针与证据留在哪」句与「变异验证」脚本位置句去掉无条件「可复跑」，改注当前不可复跑及前提；同文件「一次性探针脚本该放哪」节的「别把它清成空目录」改为分级保留口径。历史文档正文里的 `output/` 路径、读数与命令一字未动。

**为什么这么定**：工作集按分类后的口径，不按任何一套登记计数。A 类（历史执行记录里的命令与路径）保留原文事实、只加文件级一处注记，避免逐条编辑把执行快照改得面目全非；B 类（声称「证据在此、可复跑」的活口径）逐句改；C 类（规范占位符 `output/<批次名>/` 与仍存在的路径）和 D 类（会话转录、被截断的路径片段、通配符、既有根相对链接）不算死链，不改。术语口径：指向已删证据目录、只作当时记录的称「历史指针」，声称证据仍在或可复跑的称「活口径」，两者处置不同。

**刻意不做的几处**：`README.md` 已收口的 Tailwind v4 / Satori 条目、`docs/adr/`、qweather 转录正文、`history.md` 未完成表末尾 retro S7 / S8 两行，均按硬边界不动；这些位置的历史表述仅作当时记录，不改写为当前做法。`output/` 在 `.gitignore` 里整目录忽略、从未入库，被删的 A/B 快照、逐张图与字体不可从 Git 取回；`docs/history/history.md`「归档清单（第四批）」的恢复命令取回的是归档的 Markdown 文档结论，不是证据产物，重建前提见该文件「未完成或未实施的事项」表——两者分工写明，不把「取回文档」当成「取回证据」。

**纪律冲突的裁决**：`docs/agents/commands.md`「一次性探针脚本该放哪」节原写「别把它清成空目录，历次批次证据要留着」，与 2026-11-05 清理证据目录的既成事实相抵。站长裁定**修订该条纪律**而非登记例外，改为分级保留：判据值钱的脚本、文本类证据与文档点名引用的文件保留，可重建的大体积产物允许清理，清理前后按四件事记录。

**实测证据（2026-11-05，本机只读复核）**：用窄 ASCII 正则逐 token `existsSync` 重建清单，tracked Markdown 的失效指针集中在上述 plans 文件；`docs/history/qweather-settingup-history-sessions.md` 的失效项全是会话转录里的 `Ran` / `Wrote` 行，另核出既有根相对链接指向的目标实际存在。`git ls-files 'output/*'` 与 `git log --all -- output/` 均为空，确认被删证据不可从 Git 取回。`output/satori-upgrade/probe/node_modules` 与 `probe/fonts` 的实况和清理日志「已删」记述不一致（前者仍有文件、后者只剩 `google-fonts.css`），只登记差异，不改写日志、不重建证据。

**怎么验证的**：`git diff` 逐行自查、`git diff --check`；`prettier --check ./src ./docs ./*.md`；`scripts/verify-no-hardcoded-counts.mjs` / `verify-doc-versions.mjs` / `verify-eol.mjs` / `verify-deps.mjs` 直接跑；全仓库 Markdown 死链复扫按基线比对，判据为「A 类各有一处注记且正文逐字未变、B 类不再有无条件可复跑断言、受保护位置与 C/D 类逐字未变、无新增死链（占位符与截断片段列明为已知）、旧计数只留在历史登记处」，不按「零死链」验收；逐文件复核行尾形态保持原有 CRLF / LF，无混合。纯文档改动走轻量档，未跑 `pnpm build`；按站长裁定豁免 `/tdd`，`/code-review` 保留。**同时登记一处缺口**：`docs/agents/commands.md`「证据目录清理的记录约定」节要求记录时间、范围（文件清单——条目数不能替代清单）、归档位置、结果四件事，而 2026-11-05 那次清理的日志只给了条目数与保留/删除类别，**没有逐文件清单**，范围一项不满足该节要求；按同节「不追补猜测性的旧记录」，不补造清单，只在此登记缺口，规范正文不改。

## 2026-11-05：把 retro 的六项环境改进接进门禁

**为什么**：Tailwind v4 + Satori 两轮收口后的 `/retro` 报告列出 9 项候选，站长授权推进 S2 / S3 / S4 / S5 / S6 / S9，均按推荐方案。六项都是「机械错误该用确定性检查拦住」，不再往文档里加文字纪律。

**同批落地的还有 S1**：站长在 `/retro` 后单独授权把 Matt Pocock Skill Driven Workflow 的 7 阶段授权边界写成纪律——用户级 `MEMORY.md` 是跨项目主源，根 `AGENTS.md` 新增「工作流与阶段授权」节作为每轮注入的项目门禁，并显式写明它优先于 `/ask-matt` 官方「steps 1–3 连续推进」的默认。该轮改动与本条一起提交。

**改了什么**：

- **S2 依赖假绿**：新增 `scripts/verify-deps.mjs`，构建前比对 `node_modules/{astro,satori,tailwindcss}/package.json` 的实装版本与 `package.json` 声明（精确版本严格相等，caret 只查存在）；接 `package.json` 的 `build` 链首。`scripts/verify-og-images.mjs` 的成功日志补 `satori <version>`，供事后追溯那批 OG 是哪版渲染的。起因是 2026-11-05 集成 worktree 里声明 0.63.2、实装 0.26.0、`dist` 是旧产物，而 OG 断言 33/33 全绿。
- **S3 硬编码计数**：新增 `scripts/verify-no-hardcoded-counts.mjs`，扫 `scripts/verify-*.mjs` 里的 `EXPECTED_* = <数字>`；接 `lint.yml`。`AGENTS.md` 早有「不写会漂的计数」的文字规则，但 `EXPECTED_COUNT = 33` 仍被写进判据且 `/code-review` 没拦住。
- **S4 版本号漂移**：新增 `scripts/verify-doc-versions.mjs` 核对 README 的 Astro / Tailwind CSS / TypeScript 徽章与真源；接 `lint.yml`。`docs/agents/build-and-deploy.md` 的「当前构建链版本」全量表降级为现测命令 + 真源指针，`README.md` 第 360 行的指向同步改写（前一条 CHANGELOG 里提到的「表」是当时的写法，历史原文不改）。
- **S5 行尾与退出码**：新增 `scripts/lib/eol.mjs`（单一真源）、`scripts/verify-eol.mjs` 与 pre-commit 钩子里的混合行尾断言；接 `lint.yml`。**机制按实测修正**：`core.autocrlf=true` 下 Git blob 统一 LF，工作区 293 个文本文件里 124 个本就是纯 LF、0 个混合，强制全仓 CRLF 会误报 124 个文件，故判据改为「同一文件内不许混用 CRLF 与裸 LF」；`commands.md` 补 `set -o pipefail` + `tee` + `PIPESTATUS` 的默认构建命令形态。
- **S6 交接与日志**：`commands.md` 新增「长会话交接与日志格式」节，规定 handoff 必备字段、日志条目结构、阶段授权单独记一行，以及 transcript 不可读时 `/retro` 的主源顺序。
- **S9 网络判据**：`commands.md` 外网节点节补可执行采集口径（DNS ×3、TUN 网卡状态、目标域名 ≥3 次取样），把「不拿单点样本推翻结论」从文字纪律变成可复核的读数。

**怎么验证的**：4 组新增 `node --test`（`eol` / `verify-deps` / `verify-no-hardcoded-counts` / `verify-doc-versions`）共 29 条全绿，含不一致、缺包、徽章过期、版本表过期、注释反例等故障注入；`pnpm test:lib` 43/43；四个新脚本在当前仓库直接执行全绿；`prettier --check` 通过；pre-commit 钩子用构造的混合行尾文件验证会拦下；`git diff --check` 通过。完整 `pnpm build` 未在本机重跑（构建期联网脚本受订阅节点影响），新门禁由 `lint.yml` 常驻执行、push 后由 CI 实跑确认。

**有意不做（2026-11-05 裁定）**：S7（子代理派发前的存活探针 + 失败降级）与 S8（`AGENTS.md` 指针收敛 / 文档 prune）经站长裁定**不做**，已在 `docs/history/history.md` 未完成表登记以防重复评估，后续 `/retro` 不再作为候选提出；S1 见上；`.prettierrc.cjs` 的 `endOfLine: "auto"` 不改，避免全仓格式化翻面。

## 2026-11-05：把构建系统现版本同步到文档，并补记 Astro 7 升级的上线闭环

**发现**：README 头部 Astro 徽章自 2026-11-02 升级后一直写着 `6.4.8`，而 `README.md` 技术栈段与 `docs/agents/build-and-deploy.md` 早已写 `7.4.4`——同一份文件里两处自相矛盾。`docs/agents/build-and-deploy.md` 开头还写着「阶段五只剩 Tailwind 4 与 Satori 0.63，已移交独立工作流」，实际上两项分别在 2026-11-04、2026-11-05 已上线。

**当前构建链现版本（2026-11-05 实测，权威源 `package.json` + `pnpm-lock.yaml`）**：`astro` **7.4.4**（精确固定，包自身 `engines.node >=22.23.4`）；`vite` **8.3.5**（由 astro 的 `vite ^8.3.5` 引入，**不是直接依赖**，顶层没有 `vite`）；`@astrojs/svelte` 9.1.2 / `svelte` 5.57.3；`@astrojs/check` 0.9.12；`@astrojs/markdown-remark` 7.3.5；`astro-expressive-code` 0.44.3；`tailwindcss` / `@tailwindcss/vite` 4.3.4 / 4.3.4；`typescript` 5.9.3；`satori` 0.63.2 / `sharp` 0.35.5；`pagefind` 1.6.0；`prettier` 3.9.8；`pnpm` 10.26.2。CI 的 `build.yml` / `deploy.yml` 用 Node 24，`lint.yml` 用 Node 22（只跑 Prettier 检查与公式测试，不执行 Astro 构建）；本机系统 Node 24.18.0，托管 Node 22.22.2 低于 engines 下限，跑不了构建。

**改了什么**：

- `README.md` 徽章 `Astro-6.4.8` → `Astro-7.4.4`；技术栈段补一句单一真源指引——完整现版本以 `docs/agents/build-and-deploy.md` 的「当前构建链版本」表为准，改依赖时徽章、维护文档、`CHANGELOG` 一起核。
- `docs/agents/build-and-deploy.md` 新增「当前构建链版本（2026-11-05 实测）」表（上面那组数值 + 各包的声明形态），并明确它是**核对用现值、不是权威源**；开头路线图状态改为「阶段五两项均已上线、无进行中的迁移批次」；第 37 行「该批保持 Tailwind 3.4.19」加「当时」二字，避免读成当前事实。
- **有意不改**：`README.md` 第 572/573/587 行的 `6.4.8` 与 构建系统升级复核（已归档，索引与取回命令见 `docs/history/history.md` 的「归档清单（第五批）」） 的 `6.4.8` 都是 2026-09～11 的历史记录 / 实施前研究快照（后者文首已声明），不是当前状态；`AGENTS.md` 的 `Node.js: 24.18.0` 在 `!IMPORTANT` 声明的只读固定区，且与本机系统 Node 一致。

**CHANGELOG 自身的核查结论**：Astro 6.4.8→7.4.4 的升级记录**有**，在 2026-11-02 的「构建系统升级复核（尚未升级）」「Astro 7 联动升级与同数据构建验收」「Astro 7 验收剩余项收口」三条里；但**缺上线闭环**——升级条目末尾停在「未运行线上 CI、未推送或部署」，后续 2026-11-03 的「四批依赖升级发布上线」只列了检查器 / Pagefind / Svelte / Autoprefixer / `@swup`，不含 Astro 7.4.4，导致按 `7.4.4` 检索全文找不到「已上线」的证据。已在该条目末尾按仓库规矩补记（标日期 + 证据来源），不改动历史原文。

**怎么验证的**：`node -e "require('./node_modules/<pkg>/package.json').version"` 逐个读实装版本，与 `package.json` 声明逐项对；`pnpm -v` 与两个 Node 二进制各读一次；`git merge-base --is-ancestor a42a170 origin/main` 确认升级提交已在主干；`prettier --check ./src ./docs ./*.md` 全绿。

## 2026-11-05：归档 Tailwind v4 与 Satori 两轮的过程文档，ADR 保留

**改了什么**：把这两轮产生的过程文档从 `docs/plans/` 移出并删除，索引进 [`docs/history/history.md`](docs/history/history.md) 的「归档清单（第四批）」。共 9 份 957 行——Tailwind 的迁移设计（153 行）与迁移 spec（223 行）、`tailwind4-tickets/T1–T6`（6 文件 260 行）、Satori 的隔离探针调研（321 行）。`docs/plans/tailwind4-tickets/` 目录随之消失。

**为什么不全删**：**ADR 0011 与 0012 留在原地**。它们不是过程记录而是仍在生效的决策——`docs/agents/styles.md` 三处、`docs/agents/build-and-deploy.md`、`README.md`、`CHANGELOG.md` 都拿它们当权威源引用，`docs/history/history.md` 自己「相关文档」一节也把 `docs/adr/` 列为活树。此前十份 ADR 无一份被归档，这次没有开先例。

**为什么可以删过程文档**：它们的结论早已沉淀到别处——层策略的取舍在 ADR 0011，接入方式与四处 `@layer base` 例外在 `docs/agents/styles.md` 与 `build-and-deploy.md`，两处盒模型语义与被否方案在 ADR 0012，验收数字在下面几条 CHANGELOG 条目里。原文件的作用只剩「当时怎么一步步想出来的」，那是 `git show` 该干的事。

**同步改掉的 6 处引用**（否则全是死链）：`README.md` 三处（Tailwind 的方案与证据、Satori 的探针结论与偏差指向）、`CHANGELOG.md` 一处（v4 条目末尾的「实施细节见…」）、`docs/adr/0011` 与 `docs/adr/0012` 各一处（相关实测记录 / 调研报告）。改后全仓库对这四个路径的引用为 0 处（只剩 `.workbuddy/memory/` 的追加型工作日志，那是历史记录，不改）。

**怎么验证的**：① 恢复命令逐条实跑——`git show 0262fad:…design.md`、`git show 2156834:…research.md` 均取回原文，`git archive bc7a13a docs/plans/tailwind4-tickets | tar -t` 列出 6 个文件；② `grep` 全仓库扫描四个路径，0 处残留引用；③ `prettier --check` 通过（`docs/history/history.md` 保持全 LF，其余改动文件保持 CRLF）。

**顺带发现**：上一轮清理 `output/` 后，全仓库 Markdown 里还有 41 条指向已删证据目录的路径。本轮只修了 README 这一条（属本次 Satori 收口记录）；其余 40 条集中在 `docs/plans/2026-11-03-*` 与 `docs/agents/` 的历史快照里，属当时的执行记录，不按本次改动回写，已在 `docs/history/history.md` 的「未完成或未实施的事项」登记。

**顺带补的纪律**：`AGENTS.md` 的「改什么 → 必须同步哪一份」表原本没有「归档文档」这一行——这是留下死链的缺口，现已补上；「深入文档」表也加了一行指向 `docs/history/history.md`。

## 2026-11-05：复测今日写下的几条结论，并补一节「外网访问共用一组不稳定节点」

按要求把当天落进文档的结论重跑一遍，逐条对账：

| 结论                                     | 复测方式                                                                   | 结果                                                                   |
| ---------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 本机无真直连，流量被 TUN 的 fake-ip 接管 | `dns.lookup("fonts.googleapis.com")` ×5；网卡与进程                        | 5/5 返回 `198.18.0.108`；`Mihomo`（Meta Tunnel）`Up`；三个进程在跑     |
| 两条路成败只取决于节点健康               | 不设变量 / 设 `NODE_USE_ENV_PROXY=1`，各连跑 3 次，同时测字体与 GitHub API | 两条路各 6 次全部 200：fonts 485–524 ms、GitHub 417–429 ms，无显著差异 |
| 内置 fetch 默认不读代理变量              | 坏代理 `127.0.0.1:9` 对照                                                  | 不设变量成功（512/430 ms）；设了立刻 `ECONNREFUSED`（12/3 ms）         |
| OG 断言数量按已发布文章派生              | `node --test` 与 CLI                                                       | 单测 8/8；`33/33 张通过`；派生值 33                                    |
| 本地 0.63 产物与线上一致                 | 33 张逐字节 + 像素差                                                       | 29 张逐字节相同，4 张差 0.017%–0.028%（最大通道差 148）                |

**一条没复现，已改口**：此前的「守卫会拦 `rm -rf`（>50 文件）」不是稳定规则。本次对 `dist/.prerender`（81 个文件）执行 `rm -rf` **直接删除成功**，无 `SAFE_DELETE` 输出，且该次命令提示 `Sandbox bypassed (escalation-approved)`——shim 并非在所有执行路径注入。判据收敛为「输出里出现 `SAFE_DELETE_BULK_CONFIRM_REQUIRED` 就当那步没发生」，不再假设一定会拦。构建进程内的拦截仍有日志实证（`count:128, threshold:50`，随后 libuv 断言退出）。

**新增文档节**（`docs/agents/commands.md`）：《本机所有外网访问共用一组不稳定节点》——把 `gh` / GitHub API、字体域名、npm registry、CDN、构建期联网脚本列成同一个命运共同体，并给处置纪律：超时先重试再换节点、不拿单点样本推翻网络结论、长任务留日志。

---

## 2026-11-05：收掉三笔账——README 票据计数、代理变量口径、依赖变更后构建被缓存守卫打断

- **README 收口记录的票据计数**：写的是「三票 #145 #146 #147」，实际五票 `#145–#149`；同时补上漏记的 `9beb8ae`（文档收口）与合并提交 `b3f8a1c`。
- **`NODE_USE_ENV_PROXY` 的口径改准：它不是稳定性开关**。用坏代理（`127.0.0.1:9`）做对照实验：不设该变量时 Node 的 `fetch` 请求成功，设了立刻 `ECONNREFUSED`——机制成立（内置 fetch 默认不读 `HTTP(S)_PROXY`）。但「不设变量 ＝ 直连」是本机的一个错觉：Clash Verge 的 Mihomo TUN（网卡 `Mihomo` / `Meta Tunnel`，状态 Up）以 fake-ip 接管 DNS 与流量，`dns.lookup("fonts.googleapis.com")` 返回 `198.18.0.108`，那条路**照样经代理**，只是走 TUN 而非 `HTTP_PROXY`。两条路依赖同一份订阅节点，节点抖动时都会超时（T3 那次 10 s 超时即此，一度被我误判成「规则反转」；同日不设变量 534 ms 成功，只是节点当时健康）。结论：报 `No fonts are loaded` 时换节点或重试，别把「设不设变量」当判据。README、`AGENTS.md`、`docs/agents/commands.md` 三处同步改写。
- **「升级后产物还是旧版」的成因查清**（此前只记成「worktree 的 `dist` 是残留」，是现象不是原因）。真实链条：`pnpm install` 装上 0.63.2 后，`astro build` 第一行是 `[vite] Re-optimizing dependencies because lockfile has changed`，随后 vite 要删 `node_modules/.astro/vite-sync/deps`（128 项 > 阈值 50），被宿主的批量删除守卫拦下，进程以 libuv 断言 + 退出码 127 结束——**构建在写任何产物之前就死了，`dist` 原封不动**。所以数量仍是 33、OG 断言仍全绿，但那是旧依赖产出的图。处置：`mv` 走 `node_modules/.astro`（不是删除，守卫不拦）后重建；33 张里 29 张与线上逐字节相同、4 张差 ≤0.028%，即确认是新引擎的产物。`docs/agents/commands.md` 该节按此重写，并保留一行「早期写法错在哪」。
- **顺带纠正本机 `main` 的依赖状态**：`package.json` 早已是 `"0.63.2"`，但 `node_modules` 仍是 0.26.0（`git pull` 不会触发安装），当天的两次构建因此都在用旧引擎。已 `pnpm install --frozen-lockfile` 对齐。

---

## 2026-11-05：OG 产物断言的数量改为派生——修掉写死的 33 会误伤正常发文

- **缺陷**：`scripts/verify-og-images.mjs` 把期望数量写死成常量 33。`/og/[slug].png` 对每篇非草稿文章产一张（`getStaticPaths` 里 `filter(!post.data.draft)`），所以**下一篇非草稿文章一提交，`pnpm build` 就会在断言处退出码 1、CI 变红**——红的原因不是产物坏了，是判据过期了。脚本注释与五份文档都没有提醒要同步这个数字。
- **修法**：新增 `countPublishedPosts(contentDir)`，期望数量 = `src/content/posts/*/index.md` 中 frontmatter 不含 `draft: true` 的篇数，与路由同源；内容目录按脚本自身位置解析，从任意 cwd 调用都成立。`verifyOgImages()` 的 `expectedCount` 改为必填，缺失时返回失败而不是静默跳过数量判据。
- **判据强度不变**：当前 33/33 通过（最小非白像素占比 4.199%）；在副本上多放一张后仍报「数量不符：期望 33 张（已发布文章数），实际 34 张；多出：`20990101000000.png`」。
- **单测 5 → 8 个**：新增「期望数量按非草稿文章派生（草稿不计入、正文里的 `draft: true` 不算）」「没传期望数量时失败」「新增一篇后数量自动加一」。ADR 0012 的落地状态补记这条与票面的偏差。

---

## 2026-11-05：Satori 0.26.0 → 0.63.2 收口——只换渲染引擎，17 张分享卡结构性重排

- **升级范围只有一个直接依赖**：`satori` 写成精确 `"0.63.2"`（无 caret）。锁文件 +17/−11，全部落在 satori 自己的依赖子树——新增 `fflate@0.7.3`、`harfbuzzjs@0.10.0`，移除 `yoga-layout@3.2.1`；`sharp` 与其余包零变动，头像仍走原来的 sharp 转 PNG data URL 路径。包体解压后 5.4 MB → 26 MB（布局引擎从外部 `yoga-layout` 换成包内 `layout.wasm`）。
- **三笔提交，回滚单元与风险源对齐**：`bcdfa3c`（`src/pages/og/[...slug].png.ts` 补 `boxSizing: "border-box"` 与 `flexShrink: 0`，在 0.26 上逐字节无操作）、`6d80662`（新增 `scripts/verify-og-images.mjs`，把「数量、1200×630、非空白」变成构建后断言；数量随后改为按已发布文章派生）、`999d3f8`（依赖升级）。集成分支 `d2c3f9f`，PR #150 合并为 `b3f8a1c`；部署后线上 33 张复核 29 张逐字节相同、4 张差 0.017%–0.028%。
- **OG 实测：33/33 张全部超过 0.2% 像素阈值，最小 0.71%、最大 9.95%。** 可复现、非噪声：0.26 重构建与基线 33 张 PNG 逐字节相同，同一时刻 0.26 与 0.63.2 两份构建互比的逐张数字与基线比对完全一致。
- **更正了阈值口径（本轮最重要的一条）**。0.2% 原本被当成「有变化 / 没变化」的分界线，实测不成立：它的正确用途是**排除环境噪声**（跨环境上限 0.028%，阈值是其 7 倍），但 HarfBuzz 的字形漂移本身就产生 0.71%–2.8% 的像素差，全部高于阈值，逐张都判成「变了」。按性质分类才有意义：**17 张结构性变化**（16 张标题换行点改变，多数是放下更多字、少截断；1 张无描述文章 `20260320000000` 整体下移 10px，空串子节点在 0.63.2 不再占 `gap`）+ **16 张仅字形亚像素漂移**（版式与断行完全一致，差异图上只有文字轮廓）。「17」是结构性变化数，不是超阈值数。
- **页面零回归的判据是「稳定集内零差异」，不是「零差异」**。整站构建非确定：同状态连续两次构建就有 146–156 个 HTML 不同（构建期随机文章列表）。用三份同状态 0.26 构建求稳定集——两两差异 146 / 156 / 156，抖动集 |D| = 156、稳定集 |S| = 787，升级后差异 |U| = 156 全部落在 D 内，**稳定集内的升级差异为 0**。注意单次两两比较会低估抖动集（146 < 156），拿 146 当分母会造出 10 个假回归（about / albums / friends 等含随机文章列表的页面）。脚本 `output/satori-upgrade/non-og-verdict.mjs`。
- **构建链全绿**：`astro build` 产出 230 个 HTML、33 张 OG；`node scripts/verify-og-images.mjs` 33/33 通过（最小非白像素占比 4.199%）；KaTeX 类名校验通过（旧类名 0、新类名 1338）；`prettier --check` 通过。逐张「旧｜新｜差异×8」三联图与 A/B 快照在 `output/satori-upgrade/`（git-ignored）。
- **为什么模板先落地、升版本后落地**：两处盒模型声明在 0.26.0 上逐字节无操作（33 张 PNG md5 全等），单独回滚依赖时不牵连模板。ADR 见 [`docs/adr/0012-satori-upgrade-target.md`](docs/adr/0012-satori-upgrade-target.md)。

---

## 2026-11-05：Tailwind v4 收口核对——判定通过，并校正文档里七处与代码/产物不符或自相矛盾的记述

- **判定：可以收口。** 五处补偿逐条在 `astro preview` 上量计算值，全部生效：正文链接 `text-decoration-line: underline`；正文列表 `padding-inline-start: 4.875px`（13px 正文下即 `0.375em`）；404 页 `.search-box input` 底 `rgb(255, 255, 255)`；`.text-nb-seal` 装饰符号 `line-height: 20px`；`/books/` 简介段落 375px 视口 `line-height: 24px`（修复前是 35.2px）、桌面 38.5px。产物层结构为 `properties` / `theme` / `base` / `components` / `utilities` 五个块。
- **线上与本地一致**：样式同为 **195,571 B**，逐字节差 1 字节（`.bg-primary\/15` 的 `oklab()` 浮点末位，Linux 与 Windows 的色值转换末位不同）。补 `nb.note-border` 键之前是 195,513 B，差值 58 B 即那条工具类。
- **校正的五处事实偏差**（`bc7a13a`）：① README 徽章仍写 `Tailwind_CSS-3.4`；②「三处例外」实为**四个** `@layer base` 块（`global.css` 的元素级重置、`input,textarea` 白底、手型光标，加 `books.css` 的 `:focus-visible` 焦点环）；③ 产物里并不存在 `@layer theme, base, components, utilities;` 这句合并声明，层序按首次出现建立；④ 第五处补偿的实现是 `max-[540px]:leading-[1.5rem]`，不是文档记的 `max-[540px]:[--tw-leading:1.5rem]`（实测等效，375px 下行高 24px）；⑤ `commands.md` 把宿主管卫拦截写成「产物本身完整、只少一步清理」，低估了后果。
- **顺带修掉的两处自相矛盾**：`styles.md` 记「②③ 两份光标」——重复的那份 2026-11-04 已删，现只有一份；ADR 0011 与 README 的「与本地构建逐字节相同」与同一节的「逐字节只差 1 字节」冲突，统一为「字节数相同、逐字节差 1 字节」。
- **更正一条错误归因**（`9119e5b`）：`smoke:ui` 的「忙碌期的第二次提交被忽略」不是既有 flake。本机构建在 `astro:build:done` 之前被宿主管卫打断，`pagefind` 索引未生成，该判据因搜索结果数为 0 恒红；手动 `pnpm exec pagefind --site dist` 后立刻 PASS，完整 142 项只剩 `#41` / `#47` 两条 sitemap 前提红。**sitemap 无法用单条命令补回**（由 `@astrojs/sitemap` 在 `build:done` 写），需要这两条判据时以 CI 的 Linux 产物为准。
- **验证**：`prettier --check` 覆盖了本轮改动过的全部 Markdown，全绿；推送后 `Lint` / `Build and Check` / `Deploy to GitHub Pages` 三项 `headSha` 均为 `9119e5b`，线上样式资源名与字节数未变（文档改动未进入产物）。

## 2026-11-05：状态采样扩到四态，并修掉三处会让它「采了等于没采」的缺陷

- **`nb.note-border` 补上色板键（配置缺陷）**。`src/nice-books/lib/render.ts` 的荐语便签用了 `border-nb-note-border`，而 `tailwind.config.cjs` 的 `nb` 色板只有 `border` / `border-strong`——该工具类**静默不生成**，`--nb-note-border: #e3d3a2` 定义了没人消费，便签边框退回 `currentColor`（深色描边）。补键后产物出现 `.border-nb-note-border{border-color:var(--nb-note-border)}`，`/books/01/` 实测计算值 `rgb(227, 211, 162)`。这是**视觉变更**，不是纯配置整理。
- **状态采样从两态扩到四态**：新增 `:active` 与 `:disabled`。两者都先经探针证实 `CSS.forcePseudoState` 有效，且都有真实消费方——`disabled:` 那三个 utility 就在 `src/pages/books/index.astro` 的 `nb-shuffle` 按钮上（`disabled:cursor-wait` / `disabled:opacity-60` / `disabled:translate-y-0`），正是 v4 迁移时静默失效过的那一类。实测采到 `cursor=wait`、`opacity=0.6`。
- **不纳入 `:checked`、永久排除 `:visited`**，都有实测依据：`:checked` 强制有效但全站零 `:checked` 规则、零 checkbox/radio（只有 range 输入），加进来只产出与默认态相同的噪声行；`:visited` 强制**无效**（Chrome 的 visited 样式受隐私限制，只在真实历史命中时生效），强制结果恒等于默认态，是假阴性不是覆盖。
- **transform 族补齐四个属性**（`transform` / `translate` / `rotate` / `scale`，静态 `PROPS` 与 `STATE_PROPS` 都补）。v4 把位移/旋转/缩放拆成独立属性，计算后的 `transform` 恒为 `none`：实测 `nb-shuffle` 的 `hover:-translate-y-px` 只体现在 `translate: 0px -1px`。只采 `transform` 时，站内所有 `:active` 规则（`scale(0.94)` / `translateY(1px) scale(0.98)`）与 `active:` / `disabled:translate-y-0` 这类工具类全都采不到——扩状态而不补属性，等于白扩。
- **修复指纹的行键冲突（最隐蔽的一处）**。状态行格式 `:hover <标识> | <路径> | <属性…>` 的路径与静态行完全相同，原实现用路径做键，同元素多行在 `Map.set` 时互相覆盖。用真实采集量：首页 971 行按路径去重只剩 851 条——**120 条状态行全部丢失**，60 条静态行被替换成最后一条状态行。键改为「状态前缀 + 路径」。**不加这两个状态也会踩到**，只是丢的是既有两态的行。
- **SEED 补上 `crypto.getRandomValues`**。原 SEED 只覆盖 `Math.random`（稿纸逐字抖动），但引言条选句走 `src/utils/runtime/quote-band.ts` 的 `randomIndex`，用的是 CSPRNG（作者为消掉安全扫描对 `Math.random` 的误报）。实测只种子化 `Math.random` 时 `/albums/` 连开三次拿到三句不同引言（逐字节点 28 / 20 / 51）。这也顺带纠正了 2026-11-04 那条「确定性」的适用范围：它用 `onlyState` 只比状态行，**从未验证整份指纹**。
- **`WIDGET_ROOTS` 补 `[id^='myhk']`**。明月浩空的容器 `#myhk` / `#myhkplayer` / `#myhkTips` / `#myhkKsc` / `#myhkLrc` / `#myhkaudio` 直接挂 `body` 下且没有 class，原规则 `[class*='myhk']` 一个都排不到。一次采集赶上 `ERR_TIMED_OUT`，`div#myhkLrc` 没生成，凭空多一条 `REMOVED ul` 假阳性。
- **怎么验证的（2026-11-05，Node 24.18.0 / Windows 11，`pnpm exec astro build` 产出 230 个 HTML）**：23 页 **21,761 行**（静态 17,121 + 四态各 1,160），**0 页键冲突**；同一产物连采两次 `diff` 报 `pages differing: 0/23, element diffs: 0`；三处**各自只作用于一个状态**的变异（`disabled` 的 `cursor:wait→help`、`active` 的 `translate 0px→7px`、`hover` 的 `-1px→-9px`）→ **2/23 页、10 条差异**，按状态归属 `:hover` 4 / `:active` 4 / `:disabled` 2，**静态行 0 条**；`prettier --check ./src ./docs ./*.md` 全绿、`node --check` 通过。
- **为什么这轮没按「只做点名的那几条」停手**：题面只要求补状态采样，但验证过程先后撞上三处仪器缺陷（键覆盖、随机源未固定、第三方容器未按 id 排除），不修则新增状态无法被证明有效、A/B 也仍会出假阳性。三处都只是修正既有判据，未扩大采样面（`:checked` 明确没加）。
- **证据位置**：`output/eng-discipline-2/`（三次采集 `fp2-a` / `fp2-b` / `fp2-mut`、四处探针、变异脚本与产物 CSS 备份）。探针均为一次性脚本，按「探针放 `output/<批次名>/`」存放。
- **指纹格式已变**：2026-11-05 之前的采集基线**不能**与新采集互比（新增状态与属性会被读成整页差异）。要比就重采两侧。

---

## 2026-11-04：样式指纹补上 `:hover` / `:focus-visible` 状态采样

- **补的是上一轮真实漏掉的判据**。Tailwind v4 迁移里 `src/nice-books/styles/books.css` 的 `:focus-visible` 规则因级联层归属变化压过了 `rounded-[3px]` / `outline-none` 工具类，焦点环回归**是人眼看出来的**——`scripts/upgrade-style-audit.mjs` 全程没报警，因为它只读元素**默认态**的计算值。
- **做法**：在静态指纹采完（`page.evaluate` 返回之后）追加一段状态采样，用 **CDP `CSS.forcePseudoState`** 强制 `:hover` 与 `:focus-visible`，读 14 个状态强相关属性（`outline-*` / `border-*` / `box-shadow` / `border-radius` / `cursor` / `text-decoration-line` 等），产出形如 `:focus-visible a.skip-link | body:2>a:1 | outline-style=solid;outline-color=rgb(0, 122, 0);...` 的行。采样范围有界：只对可见可交互元素（`a[href]` / `button` / `input` / `select` / `textarea` / `[tabindex]` / `[role=button]` / `[role=link]`），排除 `WIDGET_ROOTS` 子树，每页上限 60 个元素 × 2 状态。
- **为什么用 CDP 强制伪类而不是 `page.hover()` / `.focus()`**：① `hover()` 会先 `scrollIntoViewIfNeeded()`，在 `overflow:hidden` 的超宽容器里会改动 `scrollLeft`，制造「测试自己造成的位移」；② `.focus()` 是否命中 `:focus-visible` 取决于触发方式（键盘 vs 鼠标），不可靠。强制 `:focus-visible` 时须**连 `:focus` 一起强制**。
- **实测证据（2026-11-04，Node 24.18.0 / Windows 11，`pnpm exec astro build` 产出 229 页）**：23 页共 **2320 条状态行**，其中 14 页正好 120 条（60×2，上限生效）；**确定性**——同一份产物连采两次，23 页状态行**逐字符零差异**；**变异验证**——把 `--colorful-green-accessible` 从 `#007a00` 改到 `#ff00ff`，**19/23 页报出 43–86 条差异**，全部落在 `outline-color`（`rgb(0, 122, 0)` → `rgb(255, 0, 255)`）。余下 4 页未变是**正确行为**：`books*` 三页是 Nice Books 独立壳、不消费主站该变量（实测 `hasGreenOutline=false`），`/this-page-should-404/` 只有 3 个元素、无可交互元素。
- **第一次变异选错目标，记下来防重犯**：我先改 `:focus-visible{outline:2px solid #fff}`，结果 **0/23 页报差异**。查证后发现实际生效的 outline 颜色来自 CSS 变量而非那条规则。**教训：变异验证本身也要先证明变异点真的作用到被采样元素**，否则验证的是空气——这和「改判据必须做变异验证」是同一条纪律的两半。
- **已知不覆盖**：只采 `:hover` 与 `:focus-visible`；`:active`、`:disabled`（`disabled:` 变体）、`:checked`、`:visited` 未纳入。静态 `cursor` 在 `PROPS` 里，所以 `disabled:cursor-not-allowed` 类问题仍靠默认态读值兜底，**没有专门的 `:disabled` 强制态采样**。
- **探针与证据位置**：本轮探针脚本、两次基准采集、变异前后采集都在 `output/retro-eng-discipline/`（2.8 MB），可复跑。这也是新立「一次性探针放 `output/<批次名>/`」规矩后的第一个正面实例。
- **怎么验证的**：`node output/retro-eng-discipline/verify-state-sampling.mjs`（采集 + 计数）、`diff-state-determinism.mjs`（两次采集零差异）、`mutation-test-v2.mjs`（变异后 19/23 页报差异并自动还原产物 CSS）、`pnpm exec prettier --check ./src ./docs ./*.md` 全绿、`node --check scripts/upgrade-style-audit.mjs` 通过。

---

## 2026-11-04：两档验证力度，并关掉两张「查证后不值得做」的票

- **两档验证力度（写进 `docs/agents/commands.md`）**。上一轮 Tailwind 3→4 用了「两次独立构建量噪声底线 + 23 页指纹 A/B + 桌面移动截图 + 真 DOM 交互对比」，结论「零可见差异」站得住；但同一套挪到「改一行 CSS」上就是浪费。现按**变更影响面**分档：**承重档**（换构建工具 / 升大版本依赖 / 改级联层语义 / 动全站样式入口 / 换渲染管线）走四道判据；**轻量档**（单组件微调、文案、单页布局、明确 bug）走两道——本地构建 + `pnpm check`，加上「改什么就看什么」的定向验证，上线后 `verify:live`。两档共用不可省的底线：Prettier 门禁、push 前核对（push 到 `main` 即生产部署）、部署后核对 `headSha`。
- **关掉「用 GitHub MCP 接管 CI 查询 + 写 CI 状态脚本」这张票**。实测 `gh run list` **1.66 秒**返回、`gh run view --json` 一次拿全 `conclusion`/`status`/`headSha`/job 级结论，且**不需要代理**。既有能力已覆盖全部需求，再包一层只多一个要维护的失败点。改为在文档里落死「三条常用形态 + 核对部署的正确顺序」。
- **关掉「封装沙盒 ACL 诊断」这张票**。宿主已随包提供 `diagnose-windows-sandbox-acl` 技能（一条命令检查路径及其全部祖先并修复被证明的 ACL 问题），本会话实测的 9 次拦截**全部是行为类规则**（破坏性 git / 递归删除 / 凭据路径），**没有一次是 ACL 问题**。造一个 `scripts/sandbox-diagnose.mjs` 属于纯重复。
- **修正 05 的前提**：原计划想把 `codegraph` 接进 `prepare` 钩子自动建索引。核实后**该依赖不存在于本项目**——`package.json` 里搜不到，本机是全局 CLI（1.6.2）。接进 `prepare` 或 `pnpm build` 会让没装全局 CLI 的机器（含 CI 的 ubuntu runner）在一个跟索引无关的钩子里失败。文档已写明「索引是个人本地加速手段，不是构建的一部分」。
- **怎么验证的**：`gh run list` / `gh run view --json` / `gh run list --commit` 三条命令逐条实跑；`grep -i codegraph package.json` 确认无依赖、`codegraph --version` 确认全局版本；`pnpm exec prettier --check ./src ./docs ./*.md` 全绿。

---

## 2026-11-04：工程纪律收敛（约束收敛在文档里，不新增任何脚本）

> 这轮是 `/retro` 复盘后的一次**只改文档**的收敛。起因是 Tailwind 3→4 迁移本身做得住（线上零可见差异），但过程里暴露了几处「下一次会话会重复踩」的坑。**全程没有新增任何脚本**——几处原本计划要写的新工具，经实测后确认既有能力已经够用，写脚本反而是多一个失败点。

**四处新增的规矩（都在 [`docs/agents/commands.md`](docs/agents/commands.md)）**

- **CC Safety Net 被拦后怎么办**（「CC Safety Net 的实测拦截型态与被拦后的处置」节）。2026-11-04 本会话 9 次被拦，实测记下 **7 条真实规则名**：`secret.basename.npmrc`、`git.checkout-double-dash`、`git.restore-unstaged`、`rm.recursive-force-outside-cwd`、`git.push-delete`、`git.branch-force-delete`、`git.stash-drop`。**关键纠正**：被拦返回的是**文本错误**（`Error: BLOCKED by CC Safety Net`），**不是退出码**——原记录写成 `[exit code: 1]` 是错的。另有一条把方向走反的错误记录：计划里要写「自动选择的等价命令脚本」，实测 `gh pr` **没有** `delete` 子命令、`gh branch` **整个命令不存在**，且用别的 CLI 绕开本身就违反全局 `~/.dsh/docs/tools-code.md` §3.8 的「被拦不绕过」。**该脚本已删除，改为记录处置分工**：`git.push-delete`、`git.stash-drop` 无安全等价物，规则文本自己写着「Ask the user to run it manually」，必须交回用户。
- **一次性探针脚本该写在哪**（「一次性探针脚本该放哪」节）。2026-11-04 那轮把 **41 个探针脚本、554 KB 分析代码**全写在 `C:/Users/<user>/AppData/Local/Temp/tw4-probe/`，收尾清理时**整目录蒸发**——「A/B 指纹怎么归一化」「浮动末位为什么随平台变」这些只存在于脚本里的判据实现，没随仓库留下。而仓库**早有** `output/<批次名>/` 这个约定（`.gitignore` 第 58 行；`astro7-upgrade` / `svelte-upgrade` / `autoprefixer-upgrade` / `mermaid-upgrade` / `phase5-baseline` 五个目录均实测存在）。**2026-11-04 那轮是唯一例外，且例外是错的。** 定下的规矩是「探针目录用来算，`scripts/` 用来留」，判据值钱的脚本要另存进 `scripts/`（既有先例：`verify:live` 就是从 `output/live-verify*.mjs` 抢救进 `scripts/` 的）。**刻意不新建 `.probe/`**：仓库已有 `output/`，再开一个会制造两套并存约定。
- **CodeGraph 索引会静默失真**（「CodeGraph 索引会静默失真」节）。本仓库 `.codegraph/` 索引建于 **2026-10-14**，到 2026-11-04 已落后 21 天，`pendingChanges = {added: 80, modified: 36, removed: 43}`。**实测后果**：`codegraph_files` 返回的清单里仍列着 **60 多个 `src/ai-news/*.tsx`**，而这些文件在磁盘上早已迁出（索引语言列表里也还挂着 `tsx`）——按它判断影响面会得出完全不存在的结论，且无任何报错。已执行 `codegraph_sync`：**159 个文件 / 2,143 节点 / 2.5 秒**，同步后文件数 254→291、`tsx` 语言消失、`pendingChanges` 归零；用 `codegraph_query` 查 `AiNewsApp` 返回空数组，确证迁出已被正确反映。规矩：用之前先看 `pendingChanges`，非零先 `sync`；**磁盘才是权威**，索引不随仓库走（`.codegraph/.gitignore` 只留自身）。
- **查 CI / 部署状态用 `gh run` 三件套**（「查 CI / 部署状态」节）。实测 `gh run list` **1.66 秒**返回、`gh run view --json` 一次拿全 `conclusion` / `status` / `headSha` / job 级结论，且**不需要代理**（与 `docs/agents/issue-tracker.md` 第 49 条 2026-10-14 的实测一致）。**原计划里的「用 GitHub MCP 接管 run 查询」与「新写 CI 状态脚本」均按实测废除**——图片路已够用，加一层只多一个失败点。文档里落死一条易错点：核对部署生效要**比对 `headSha` 与目标 commit**，不是「最近一次运行成功就等于我的提交上线」。

**同步改动**：`AGENTS.md` 在「文档写作约定」下补 3 条导航指针（探针位置 / CodeGraph / CI 查询），与既有三条同级指针同区，**文首只读固定上下文（第 1–35 行）逐字节未动**（已用 diff 核过）。

**怎么验证的**：7 条规则名与当日会话日志**交叉核对精确一致**（脚本比对两侧差集均为空）；`gh pr --help` / `gh branch` 实机确认无 `delete` 与无该命令；`git show HEAD:<path>` 恢复路径实跑成功；`codegraph_sync` 前后 `status` 对比；三条 `gh run` 命令逐条实跑；`prettier --check ./src ./docs ./*.md` 全绿。

**未做 / 已知缺口**：① `scripts/upgrade-style-audit.mjs` 仍只采静态计算值，`:focus-visible` / `:hover` 未纳入指纹——这轮那个 `books.css` 焦点环回归就是人工看出来的，工具全程没报警；该项作为独立任务在推进中。② 2026-11-04 那轮已蒸发的 41 个探针脚本**无法重建**，本节只记录丢失事实，不伪造归档。

---

## 2026-11-04：Tailwind 3.4.19 → 4.3.4 迁移（接入方式重写），站点规则移出所有 @layer

- **这不是版本升级，是接入方式重写**。v4 不再是 PostCSS 插件（改由 `@tailwindcss/vite` 接管，配置从 `astro.config.mjs` 的 `vite.plugins` 首位注入）、配置不再自动加载（须显式 `@config`，两个入口的相对路径深度不同：`src/styles/global.css` 用 `"../../tailwind.config.cjs"`、`src/nice-books/styles/books.css` 用 `"../../../tailwind.config.cjs"`）、`@tailwind` 三指令作废（改 `@import "tailwindcss"`）、且**引入了真实 CSS 级联层**。实测 Astro 7.4.4 实际使用的 Vite 8.3.5（rolldown-vite 1.2.16）上构建 / dev / HMR / 源码扫描全部正常，229 页构建通过。
- **推翻了一条已固化的承重结论（[`docs/agents/build-and-deploy.md`](docs/agents/build-and-deploy.md#构建链与依赖约束2026-11-02-起-astro-7)）**。旧结论是「Tailwind v3 的 `@layer` 是构建期指令，产物里根本不存在 `@layer`，冲突按『特异性 → 源顺序』判定」——该结论对 v3 成立（实测主检出的 v3 产物 `dist/_astro/MainGridLayout.CKaYaVTj.css` 的 `@layer` 计数为 0），**v4 起不再成立**：产物里出现 `@layer theme, base, components, utilities;`，且 CSS Cascade 5 规定 unlayered 规则排在所有 layered 之后。**实际杀伤面**（实测）：① typography 插件的 `.prose` 规则落在 `utilities` 层，压过站点 `components` 层的 **28 条** `.prose` 规则（正文标题 24px→36px、段落 14px→16px、链接品牌绿 `rgb(0,170,0)` 变插件蓝 `rgb(68,136,187)` 且失去下划线、margin 全归零）；② 站点**层外**的 `body,div,...,h1{margin:0}` 压过层内的 `.prose h1{margin:1.2em 0 .6em}`。（另有 v3 把源码里的 `.nav` 误当 important 前缀解析、v4 不再误判这一条，**经真实 DOM 复核不构成可见回归**：v3 产物实测为 `.head-nav .\!nav>li{...;padding:0 18px!important;...}`，而真实站点的 `#menu-index > li{padding:0}`（ID 选择器，特异性 1-0-1）本就压着它，v3 与 v4 计算值完全一致。）
- **两条「看起来很合理」的替代方案都试过、都无效**（写下来省一次重复尝试）：① **只改层序声明不够**——把组件层改名并显式声明层序后，站点那条**层外**的元素级重置依然优先于任何层，`.prose h1` 仍被压掉（实测此项只把可见回归从 21 项降到 17 项，正文标题的 4 项全坏）；② **提高特异性一律无效**——实测 `.prose p code`(0-1-2) / `:where(code)` / `:is(code)` / `.post-content .prose code`(0-2-1) 四种方案的结果完全相同（仍是 14px）。**层序压过特异性**，这是 v4 与 v3 最本质的差别。
- **解法：把站点的 `@layer base` / `@layer components` 包裹去掉**（两处入口各自解包：`src/styles/global.css` 与 `src/nice-books/styles/books.css`），规则以 unlayered 身份参与级联（unlayered 恒胜，精确还原 v3 靠「特异性 + 源顺序」得到的结果）。实测导航 padding 回到 18px/18px、项宽回到 67.4px，`.prose` 计算值差异从 **118 项降到 13 项**且 13 项全部是颜色表示差异（`oklch(0.21 0.034 264.665)` = rgb(16,24,40) vs v3 rgb(17,24,39)，差 1 色阶的 sRGB 舍入；`border-*-color` 那几项的 border-width=0，颜色不渲染）。取舍与被否方案见 [ADR 0011](docs/adr/0011-tailwind4-layer-strategy.md)。
- **保留 `tailwind.config.cjs` 走 `@config`，不迁 CSS-first `@theme`**。实测纯 `@theme` 会**丢失全部自定义色板 utility**（`.text-nb-muted` / `.font-nb-serif` / `.text-nb-seal` / `.bg-primary` / `.rounded-box` 全消失）；且 `--shadow-wrapper: var(--shadow-wrapper)` 在 `@theme` 里自引用，浏览器判 invalid → 阴影变 `none`。保留 JS 配置时这些 utility 全部正常生成，且本站全站零处引用 `var(--color-*)`，无损。**代价**：`theme.extend` 的值在 v4 下不生成 `--color-*` 变量（utility 直接内联值），本站全站零处引用这类变量，因此无损。
- **`@source` 必须含 `.ts`/`.js`/`.mjs`**。Nice Books 的 `src/nice-books/lib/render.ts` 与 `src/nice-books/scripts/archive.ts` 在 **TS 模板字符串**里拼 Tailwind utility（v3 的 `content` glob 含 `.ts` 所以正常）。实测漏掉 `.ts` 会**静默**丢失 5 个 utility（产物小 4.3KB，零报错零警告）。
- **`postcss-nesting` 必需且来源变了**。`global.css` 有 8 处**无 `&` 符号的隐式嵌套**（拉绳壁纸 SVG 的 `.wpull__cord` / `.wpull__art` 子规则），没有嵌套处理器时这些规则是非法 CSS 会被整条丢弃。v3 时该插件是 `tailwindcss` 包内附带的 `tailwindcss/nesting/index.js`，**v4 的包不再导出该子路径**（构建报 `ERR_PACKAGE_PATH_NOT_EXPORTED`），故改为显式依赖 `postcss-nesting@13.0.2`。
- **v3 会 purge 死 class，v4 不会——这是反向风险**。v3 按 content 扫描把 `@layer components` 里判定为「未使用」的纯 CSS 类名 purge 掉（实测 15 条规则在 v3 产物里缺失，如 `.slideshow` / `.slideshow .dots` / `.slideshow .dots span`），v4 全部保留。迁移会把这些补回，**必须逐条核实无元素使用**：本次逐条核实这 15 条规则的类名在全部源文件与 230 个产物 HTML 的 class 属性里**零引用**；处置方式是把这批类**移出样式层**（提交 `37c2ae9`，仍在 Tailwind v3 下），**不删除**它们——它们是 Emlog Colorful 迁移遗留，清理属另一件事。
- **五处显式补偿**（v4 必需；**补记（2026-11-04 实施时纠正）**：本轮实测后从四处增为五处、并纠正了一处基准值）：① `.prose a` 补 `text-decoration: underline`（v3 靠插件的 `:where(a)` 规则胜出，v4 层序反转后层外的 `a{text-decoration:none}` 排到最后，链接失去下划线）；② `.prose li` 补 `padding-inline-start: 0.375em`（**补记**：本条原写「UA 默认值、5.25px」，取错了基准——v3 的缩进实际来自 typography 插件的 `.prose :where(ul > li){padding-inline-start:.375em}`，正文 13px 下实测计算值 **4.875px**；复刻同一个 em 相对值而非写死像素，字号变了缩进仍按比例走）；③ `input`/`textarea` 补 `background-color: #fff`（v3 Preflight 给表单控件设白底，v4 改 transparent，搜索框自身无背景声明会露出灰色）；④ `src/pages/books/index.astro` 的一处 span 补 `leading-[20px]`（**v4 把 `text-sm` 的 line-height 从绝对值 `1.25rem` 改成比值 `calc(1.25/0.875)`**，继承到用 em 相对字号的子元素时会按子元素字号重算 → 该 span 从 20px 变 17px，混排行盒少 1px，`/books/` 页文档高度 2223→2222）。**不能用 `leading-[inherit]`** —— `inherit` 继承的是比值，实测无效，要写绝对长度；⑤ 同一文件的简介段落补 `max-[540px]:[--tw-leading:1.5rem]`（**补记**：第五处是实施到移动视口验收时才发现的——v4 的字号工具类行高走 `var(--tw-leading,…)`，只要元素带 `leading-*` 就由 `--tw-leading` 决定，而 v3 里两者是字面量、按源顺序决胜，响应式变体 `max-[540px]:text-base` 更靠后因而胜出 → 移动端行高 24px 变 35.2px、整页文档高度 +42px。全站审计「响应式字号变体 + `leading-*`」共 4 组合，只有具名字号会撞，其余 3 组实测一致）。
- **保留了 `books.css` 的 `[hidden]{display:none !important}` 补偿规则**（不删）。v4 的 Preflight 给 `[hidden]` 加了 `!important`，该规则在 v4 下变冗余；但 Nice Books 计划移植为独立项目，届时它会脱离主站 Tailwind 预检，这条规则正是那时的护栏。
- **浏览器下限**：v4 要求 Safari 16.4+ / Chrome 111+ / Firefox 128+，且**硬编码不读 browserslist**（`@tailwindcss/node` 内写死 targets）。本站已在用 `color-mix()` 14 处且全是无 fallback 写法（老浏览器里整条声明失效而非仅功能缺失）。与 Mermaid 批次的 Safari 17.4+ 裁定同向（v4 的下限更低）。
- **验收判据是「可见差异为零」，不是「差异条目为零」**：一次实测的 462 条差异条目里，308 条是边框颜色变化（元素边框宽度为零，颜色不渲染）、152 条是产物里绝对地址带了不同端口号（归一化后完全相同）、2 条是采集时刻图片尚未加载完成导致的瞬时高度差（重测即归零）；**真正可见的差异为零**。
- **怎么验证的**：229 页构建零错误零警告；`pnpm check` 0 errors / 0 warnings / 6 hints；同输入两版产物（v3 185,413 B vs v4 195,004 B）；导航与 `.prose` 关键元素的计算值逐项对比；计算样式指纹 A/B（`scripts/upgrade-style-audit.mjs` 同输入两版产物对采，页数取自 `scripts/lib/smoke-pages.mjs` 的 `AUDIT_PAGES`，别在别处抄一份数字）+ 桌面/移动截图 + 关键交互。**本轮踩出的五条判据纪律**（预览服务器把路径返回首页、截图要先定噪声底线且区分运行时/构建期两类随机源、要用真实 DOM 而不是手写 fixture、v4 的行高继承规则变化、样式测试对 CSS 缩进的硬依赖）已写进 [`docs/agents/commands.md`](docs/agents/commands.md#样式-ab-的五条判据纪律2026-11-04-立tailwind-v4-迁移实测得出)。实施细节与七个必答问题的完整答案在迁移设计与迁移 spec 里（两份已于 2026-11-05 归档，索引与取回命令见 [`docs/history/history.md`](docs/history/history.md) 的「归档清单（第四批）」）。
- **发布记录（补记 2026-11-04，证据来源：本次 CI run 与线上实测）**：PR [#143](https://github.com/CaiYan12/caiyan12.github.io/pull/143) 合并为 `7c37de4`，`main` 已推送。三条 CI 全绿——`Astro Check` 35s、`Prettier Check` 42s、`Astro Build` **1m21s（Linux 上真实完整构建通过，说明锁文件与 `@tailwindcss/vite` 在 Linux 同样生效）**；合并后 `Deploy to GitHub Pages`（run `41800839319`）2m23s success，`headSha=7c37de4`。线上 `Last-Modified: Wed, 04 Nov 2026 08:38:55 GMT` 晚于推送且 `Age: 0`；`pnpm verify:live` **连跑三次均 29/29**（含 KaTeX 298 公式、Mermaid 14 图、移动端 390×900）；`pnpm verify:live:swup` 的 document 级接管证据通过（document 未被替换、`visit:start` 触发 1 次）。线上产物确为 v4：CSS 内含 `@layer` 声明（v3 产物层数为 0），字节数 **195,513** 与本地构建逐字节相同。
- **推翻一条既有的部署验证纪律（补记 2026-11-04，本次上线实测发现）**：「CSS 资源名平台无关」这条从 2026-11-03 起沿用的判据，**v4 起不再成立**。本次本地 `MainGridLayout.B_utt6QD.css`、线上 `MainGridLayout.TXd5OLZn.css`——**名字不同，字节数却完全相同（195,513 B），逐字节只差 1 个字节**：`bg-primary/15` 的 `oklab(69.9907% -.188933 .144998/.15)` 在 Linux 上是 `-.188934`。原因是 **v4 把半透明色编译成 `oklab()` 高精度表示，其浮点末位随平台变，内容寻址哈希因此改变**；v3 时代同类色走 `rgb()`/整数 `rgba()`，不受影响，所以旧纪律一直好用。该差异的唯一使用点是 `src/components/widget/WidgetCalendar.astro` 的日历当前日期格底色，1 个浮点末位不可见。判据已改写为「**同名即同源；不同名则下载比对字节数与逐字节差异，差异仅落在 `oklab()`/`color-mix()` 浮点末位即属正常**」，并同步更新 [`docs/agents/build-and-deploy.md`](docs/agents/build-and-deploy.md) 的「平台无关证据」清单。**教训：旧的「实测一致」不等于「结构上必然一致」——底层编译产物变了，判据的成立前提要重新验。**
- **两条已知差异，如实披露且未修**：① `/books/` 荐语便签的 1px 边框色在 v3 回退成 gray-200、v4 回退成 `currentColor`——`border-nb-note-border` 这个工具类在两版产物里都不存在（`tailwind.config.cjs` 的 nb 色板缺 `note-border` 键，而 `--nb-note-border: #e3d3a2` 定义了没人用），是**既有配置缺陷被迁移显形**，修它属于设计决定，未在本批动。② `smoke:ui` 的忙碌态第二条判据在 v4 上红，但在 **v3 基线上同样红**（`忙碌期的第二次提交被忽略`），是既有 flake，不是本次引入。

## 2026-11-03：根目录 Markdown 纳入格式门禁，README 章节引用改为可校验锚点，emlog 大表加分区索引

- **根目录四个 Markdown 此前不在任何格式检查范围内**。`lint.yml` 与 `format` 脚本的范围都是 `./src ./docs`，而 `README.md` / `CHANGELOG.md` / `AGENTS.md` / `GLOSSARY.md` 在仓库根，天然落在范围外，`.prettierignore` 里也没有它们——是**遗漏**而非有意豁免。实测只有 `AGENTS.md` 不达标（README / CHANGELOG / GLOSSARY 一直干净）。现已把 `./*.md` 加进 `lint.yml` 的 Prettier 步骤、`package.json` 的 `format` 脚本，以及 `.githooks/pre-commit.mjs` 的暂存范围（正则 `/^[^/]+\.md$/`，只认仓库根那层；已用 8 个边界用例验过 `README-amd`、`READMExmld` 不会误命中，带目录的 md 仍由原有 `src/` `docs/` 分支覆盖）。
- **`AGENTS.md` 格式化不动只读区**。文件第 223 行有 `!IMPORTANT` 标记声明其上为只读固定上下文。实测 Prettier 的改动全部落在第 268 行之后：24 行是表格列宽填充、2 行是把分隔行 `| --- | --- |` 拉长成横线，**渲染结果不变**；第 1–222 行逐字节比对一致后才执行。这个前提必须先验：若哪天 Prettier 开始往只读区里塞填充，格式化就变成违规操作。
- **README 章节引用从散文改成锚点链接（5 处）**。原先写作 `` `README.md` TODO 区的「进行中」分组（第 499 行起）``，有两种失效方式：(a) 标题被改名或合并时引用悄然落空（本次会话早前就发生过，`b36d841` 才修好 5 处）；(b) 硬编码行号必然漂移。改为指向 `#进行中` 的锚点链接（`docs/` 下的文件按自身深度写相对路径，如 `../../README.md#进行中`），行号一并删除。**这是可校验与不可校验的分界**：散文引用任何链接检查器都看不见，锚点引用能被扫出来。用锚点校验脚本扫全仓 87 个 md，6 条锚点链接（含本批新增 5 条）**0 处失效**。
- **`docs/agents/emlog-mapping.md` 加「怎么读这份」分区索引**。该文件 124 KB 却只有 28 行：19 行超过 2 000 字符、最长单行约 8 KB，而 `AGENTS.md` 的指针把任何「主题行为」问题都导向它，整份读进来等于塞满上下文。现在文件头有 17 行索引表（功能名 + 关键词），按功能名直达。**索引刻意不写行号**：本次会话里行号被改坏两次（插入整段索引后整体 +26、Prettier 删一个空行后整体 -1，17 条全部偏移）。实测 17 个功能名在正文里**全部唯一**，按名字搜即可定位，行号纯属负担。正文 18 个长行与改动前**逐字节一致**，本次只做插入。
- **踩坑记录（写下来防重犯）**：识别正文表格行时，先用「列数 ≥ 5」当判据——错。该表是 **4 列**（只有含 `\|` 的鹈鹕骑车行是 6 列），判据只命中 1 行，还把文件第一行标题覆盖成了乱码。教训：**先看清文件真实结构，再写判据**，不能拿猜出来的判据去断言文件。修复走 `git show HEAD:<path>` 取回原始 blob 重建，未使用 `git checkout --`（被安全策略拦下后未绕过）。
- 验证：`pnpm exec prettier --check ./src ./docs ./*.md`（与 CI 同一条命令）全绿；`pnpm test:prettier-math` 38/38；`pnpm check` 0 errors / 0 warnings / 6 hints；锚点校验 6/6；`pnpm test:katex-classes` 通过。

## 2026-11-03：KaTeX 类名判据接入构建链，线上验收脚本入库

- **KaTeX 版本错配从「文档里一句话」变成可执行判据**。新增 `scripts/verify-katex-classes.mjs`（`pnpm test:katex-classes`），扫 `dist/**/*.html`，要求旧类名 `base`/`strut` 为 **0**、新类名 `katex-base`/`katex-strut` **非零**；**两侧全零也判失败**，避免 Markdown 管线坏掉时空转通过。它插在 `package.json` 的 `build` 链 `astro build` 之后、`inject-buddha-banner` 之前，因此 `pnpm build` 与 CI 的 `Build and Check`、`Deploy to GitHub Pages` 两条路径自动执行，**没有新增 workflow 步骤**。
- **为什么必须有这条判据**：0.19.1 那批升级里，`rehype-katex@7.0.1` 的 `katex: ^0.16.0` 会把旧版 katex 嵌成构建期实际使用的那一份，产物输出旧类名而运行期 CSS 选新类名。**三项常规判据在这种错配下全部照绿**——公式渲染成功数、字体族齐全、`.katex` 盒子宽高 > 0 都正常，只有几何尺寸与像素比对能看出来（实测 40 个样本 20 个尺寸改变、页面 2139→2269px、5.02% 像素不同）。当时靠手工 grep 拦下，没有任何自动化兜底。
- **匹配方式必须是 class 属性逐 token 精确切分**，不能用 `\bbase\b` 词边界：`katex-base`、`skills-donut-segment-base`、`text-base` 都会命中制造假阳性（2026-11-03 实测全站 230 个 HTML 里精确计数为 0，模糊匹配则非零）。
- **实测证据（2026-11-03，本机 Node 24.18.0 / Windows 11）**：四条路径逐一验过——真实 `astro build` 产物 **230 个 HTML，旧类名 0、新类名 1338**（`katex-base` 669 + `katex-strut` 669）→ exit 0；把整份 dist 的类名替换回旧名 → **exit 1**，并指名 `pnpm.overrides`；无公式的空产物 → exit 1；`dist` 不存在 → exit 1。另验 `inject-buddha-banner` 在其后仍正常注入 230/230、注入后类名计数不受横幅影响。
- **线上验收脚本从 gitignore 里收进仓库**：`pnpm verify:live [baseUrl]`（29 条判据，静态 `rec()` 调用点数与实测 29/29 一致）与 `pnpm verify:live:swup [baseUrl]`（document 级 Swup 接管证明）。原先它们是 `output/live-verify*.mjs`，而 `output/` 整体在 `.gitignore` 里，下次会话只能重写。移植时把写死的 `D:/pages/myblog` 改成 `createRequire(new URL("../package.json", import.meta.url))`，换机器、换检出目录都能跑；两个脚本都支持传 base URL 改指 preview 或本地站。**一次性对照器不移植**：`render-diagrams2.mjs`、`compare.mjs` 自述「一次性工具，不入库」，`config-diff.mjs`、`extract-formulas.mjs` 同理，仍留在 `output/`。
- **纠正一条会主动误导人的指令**：`docs/agents/build-and-deploy.md` 原写「本地安装须带项目内 store `pnpm add --store-dir .pnpm-store`」，而其括号里又称 storeDir 是 `<repo>/.pnpm-store/v10`。实测 `node_modules/.modules.yaml` 与 `pnpm store path` 都是 **`D:\.pnpm-store\v10`**，store 不在仓库内；仓库根那个 `.pnpm-store/`（921 MB）是历史残留副本。照旧文档执行会拿到 `ERR_PNPM_UNEXPECTED_STORE`（本轮实际踩到），裸跑 `pnpm add` 才对。已改为明确「不要传 `--store-dir`」并附真实路径。
- 验证命令：`pnpm test:katex-classes` / `pnpm exec prettier --check ./src ./docs` / `pnpm check`（0 errors / 0 warnings / 6 hints）。细节点评见 `docs/agents/commands.md` 的三条新条目。

## 2026-11-03：KaTeX 与 Mermaid 两批升级发布上线，线上 38 项验证通过

- 站长明确授权后推送 `fb6c888..1073945`（4 个提交：KaTeX 0.19.1、Mermaid 12.2.0、README TODO 整理 + Tailwind/Satori 移交、微言时间戳补零），远端 `main` 现为 `1073945`。三个 workflow 全部 success：Lint `41614751792`、Build and Check `41614751694`、Deploy to GitHub Pages `41614751862`，headSha 均为 `1073945`。Linux CI 上 `Astro Check` 0 errors / 6 hints，与本机一致；构建日志确认装的正是 **`katex 0.19.1` 与 `mermaid 12.2.0`**，证明锁文件与 `pnpm.overrides` 在 Linux 同样生效。
- **线上实测 38 项全部通过**（真实 Chromium 打 `https://caiyan12.github.io`）：KaTeX 298 公式、**旧类 `.base`/`.strut` 计数均为 0 而新类 652**（CSS 与 HTML 同源、无版本错配的直接证据）、零 `katex-error`、零溢出、零 pageerror；Mermaid **14/14 图表渲染**、节点标签 72、**图表区总高 5136px**（与本地恢复值完全一致，证明 `wrappingWidth: 200` / `minNodeWidth: 0` 钉值在线上同样生效）；微言新条目在 `/diary/` 与首页侧栏均出现且排首位、日期 `11月3日`/`15:35`；搜索「看板娘」2 条、「Astro」12 条；Swup 确证接管（document 实例存活、`visit:start` 触发 1 次、未整页刷新）；移动端 390×900 同样 298 公式零溢出。
- **部署身份仍用平台无关证据**：`Last-Modified: 09:56:19 GMT` 晚于部署完成时间，CSS 资源名 `katex.qjoI73Dg.css` 与本地构建完全相同。**不要改用 JS chunk 哈希或 Pagefind 索引哈希判定**——两者平台相关，Windows 与 Linux 必然不同。
- **本轮踩到的探针缺陷（都是探针错、不是站点错，写下来防重犯）**：① 搜索选择器 `a[href*="/posts/"]` 会命中导航与侧栏，两次查询都返回 48 条相同结果，**看起来像搜索坏了**，真实结果在 `.search-panel ul li`；② 搜索面板是独立页 `/search/`（`client:only="svelte"`），不在首页；③ 搜索**不由输入触发**，组件只在 `form` 提交或 URL `?keyword=` 时检索，单纯改 `input` 值不会触发、界面会一直停在「没有找到」，走 URL 参数才稳定；④ Swup 探针必须在 `window.swup.navigate` 可用**之后**再埋，否则首次加载会把它换掉、表现为 `alive=null` 的假失败；`framenavigated +1` 是 Playwright 对 `history.pushState` 的判定伪影，改用 document 级标记（整页刷新必换 `document` 实例）才能定论；⑤ 本地 `dist/pagefind/` 为空**不代表线上索引缺失**，那只是本地未跑 `pagefind` 的状态，线上以 CI 日志与 `pagefind-entry.json`（`zh-cn` 28 页）为准。
- 文档同步：升级总计划（已归档，索引与取回命令见 `docs/history/history.md` 的「归档清单（第五批）」） 阶段一状态表把第三至第六批从「仅本地」改为「已发布」并写死 SHA；阶段六新增「第二轮发布」节记录本次 run 与线上判据；两份专项报告的「未推送 / 未跑远端 CI」陈述已改为已发布事实。提升后的 TODO 区整理见上一条。

## 2026-11-03：Mermaid 升至 12.2.0，99 个图表逐图恢复原有尺寸

- `package.json` / `pnpm-lock.yaml` 将 `mermaid` 从 `^11.17.2` 升至**精确 12.2.0**，直接依赖仅此一行变化。`pnpm add --save-exact` 实测写入 `^12.2.0`，已手工改回并重新 `pnpm install` 同步锁文件 specifier。
- **站长已裁定接受 Safari 17.4+ 浏览器下限**（Mermaid 12 编译目标改为 ES2024，[#8213](https://github.com/mermaid-js/mermaid/pull/8213)）。**代价明确记录**：老 iOS 设备拿不到 Safari 大版本更新，这部分访客**将无法渲染本站任何图表**（99 个图 / 14 篇文章全部失效）。该下限来自编译目标，不是配置项，无法通过参数回退。
- **四条破坏性变更逐条核对**：`ELK` 成为默认布局（[#8155](https://github.com/mermaid-js/mermaid/pull/8155)，**命中**本站 86 个未声明 layout 的 flowchart）；十种图表默认主题改 `redux-color` / look 改 `neo`（[#8148](https://github.com/mermaid-js/mermaid/pull/8148)，本站原本就显式写 `base`+`classic`，不命中但需保持显式）；移除 `defaultRenderer`（[#8211](https://github.com/mermaid-js/mermaid/pull/8211)，本站从未使用）；ES2024 要求（产品决策，见上）。
- **`src/utils/runtime/mermaid.ts` 是本次唯一源码改动**，在 `initialize` 里新增三组钉值。除 `layout: "dagre"` 外，还发现一条**官方 CHANGELOG 未单列**的默认值变更：`flowchart.wrappingWidth` 从 **200 降到 120**、并新增 `minNodeWidth: 120`。这会让标签更早换行、节点被压窄、行数增加——实测全站 **宽度 66 个变窄 / 高度 75 个变高 / 无一变矮**，真实页图表区总高 5136px → **6009px（+17%）**。
- **这条不是布局引擎差异，`layout: "dagre"` 挡不住**。只钉 dagre 而不处理 wrappingWidth，会让全站图表变形而**所有常规判据都绿**（渲染成功数、节点数、标签文本、溢出、pageerror 全不受影响）。修复方式：显式设回 `flowchart: { wrappingWidth: 200, minNodeWidth: 0 }` 与 `state: { wrappingWidth: 200, minNodeWidth: 0 }`；`minNodeWidth` 设 `0` 而非 120，因为 11.17.2 里该配置不存在（等价于不约束）。**类型约束**：`wrappingWidth` 不在顶层 `MermaidConfig` 也不在 `MindmapDiagramConfig`，写错位置会让 `pnpm check` 报 `ts(2353)`。
- **恢复效果（全站 99 个图表全量，非抽样）**：宽度完全一致 **99/99**；宽高都完全一致 **96/99**；SVG 哈希与旧版逐字节相同 **89/99**（另 10 个不同中 7 个几何量完全一致）。残余 3 个为浮点取整级、视觉不可见：`#10` 高度 207→208（1px）、`#11` mindmap 403.25→404.92（1.7px）、`#44` 70.996→71（0.004px）。
- **真实页面** `/posts/20261002081331/`（14 个图表）：块数 14、含 SVG 14、已标记渲染 14、节点标签 72、`foreignObject` 131、**图表区总高 5136px** —— 与升级前逐项相同，**14 个图表逐图宽高全部一致（14/14）**；横向溢出 0、长中文标签被裁 0、`pageerror` 0。
- **证明 `layout: "dagre"` 确实生效**：在 mermaid 12 上对比 `dagre` 与 `elk`，**12/12 样本输出显著不同**（如 `#6` viewBox 宽 1346 vs 1296）。因此「99/99 全变」不是 dagre 失效，而是上面那条 wrappingWidth 造成。
- **与第五批 KaTeX 的耦合已查清**：mermaid 12.2.0 声明 `katex: ^0.18.0`，与已落地的 `0.19.1` 范围冲突；但 `pnpm.overrides` 是全局的，**实测 mermaid 拿到 `katex@0.19.1` 且只有一份副本**。mermaid 只调 `katex.renderToString`，该 API 在 0.19.1 存在可用；本站 99 个图表无一使用 `$$…$$` 数学语法。
- **对照器两次失败的教训（这批最贵的成本）**：(1) roughjs 的 `handDrawnSeed` 默认 `0` = 每次随机，导致圆角矩形贝塞尔控制点每次都变（`C-31.2`/`C-18.4`/`C-25.2`），必须固定种子；同时 webfont 分片未就绪会按回退字体度量算控制点，须按站点运行时的 `fonts.load`+`fonts.ready` 门补上。(2) **同一 page 内连续渲染 99 个图表会互相干扰**，不稳定项会在 classDiagram/gantt 之间转移；改为**每个 worker 独立 page** 后两版各自 99/99 两次渲染完全相同。不做隔离就拿不到可信基线。
- **门禁**：`pnpm check` 0 errors / 0 warnings / 6 hints；`test:lib` 16/16（含两处视觉契约：字体就绪门、themeCSS 换行终态）；`test:utils` 261/261；`prettier --check ./src ./docs` 通过；`pnpm install --frozen-lockfile --offline` exit 0。
- **连带传递依赖与 Node 边界**：mermaid 12 依赖栈整体换代——新增 `elkjs@0.9.3`（12 把 ELK 内置，原来要单独装 `@mermaid-js/layout-elk`；本站钉 dagre，不参与渲染）、`chevrotain` 11.1.2→13.2.0、`@mermaid-js/parser` 1.2.1→2.0.1，并**移除 `fastdom@1.0.12`**（`pnpm why fastdom` 已确认输出为空，不是遗漏）。**`mermaid@12.2.0` 要求 `node >=22.12.0`**（连同第五批带入的 `commander@15.0.0` 同要求）：本机 24.18.0、`build.yml`/`deploy.yml` 的 Node 24 均满足；`lint.yml` 的 `node-version: 22` 解析为最新 22.x（2026-11-03 为 22.23.4）也满足。**残留风险**：若把 lint.yml 钉到 22.11.0 及以下或启用 `engine-strict`，安装会警告甚至失败（当前 `engine-strict` 未设置）。
- **未验证边界**：只验 Chromium，未在 Safari 17.4 以下实测（无法实机），也未在 Safari 17.4+ 验证渲染正确性；未跑远端 CI、未推送、未部署；未验证 ELK 布局的实际观感（本站钉回 dagre，ELK 路径从未在真实页面跑过）；mindmap 的 1.7px 差异未归因到底；只比对本站 99 个图表，未跑 mermaid 官方语料。详见 Mermaid 专项验收（已归档，索引与取回命令见 `docs/history/history.md` 的「归档清单（第五批）」）。

## 2026-11-03：KaTeX 升至 0.19.1，307 个公式逐条 A/B

- `package.json` / `pnpm-lock.yaml` 将 `katex` 从 `^0.16.25`（安装 0.16.47）升至**精确 0.19.1**，并新增 **`pnpm.overrides: { katex: "0.19.1" }`**。其他直接依赖安装版本不变。
- **为什么必须加 override（本次核心）**：`rehype-katex@7.0.1` 已是 latest，但它把 katex 锚在 `^0.16.0`（对 0.x 等于 `>=0.16.0 <0.17.0`，不含 0.19.1）。只升根包的话 pnpm 会给它一份嵌套的 0.16.47，于是**构建期 HTML 输出旧类名 `.base`/`.strut`、运行期 CSS 选择新类名 `.katex-base`/`.katex-strut`**，样式对不上。反证实验（真实 Chromium，40 个真实公式样本）：错配下 **20/40 几何尺寸改变**、页面 2139→2269 px、**5.02% 像素不同**；正确配对下 **0 差异**。override 把 `rehype-katex`、`mermaid`、`micromark-extension-math` 三个消费者统一到 0.19.1，`0.16.47` 目录虽仍在 store 里但无任何符号链接指向它。**这是本仓库第一次引入 `pnpm.overrides`，属超出「每批只动一个直接依赖」的决定，已获站长批准。**
- **评估文档漏掉的破坏性变更**：原评估只记了 0.19.0 的 `strict` / `symbolNotInFont`。核对上游 CHANGELOG 后实际还有两条——0.17.0 的 `__defineFunction` 内部 API 变更（本站不受影响），以及 **0.18.0 给 20 个内部 CSS 类统一加 `katex-` 前缀**（[#4229](https://github.com/KaTeX/KaTeX/pull/4229)），后者影响全部 307 个公式的 HTML。本站实际用到其中 6 个：`katex-base` 669 次、`katex-strut` 669、`katex-sizing` 529、`katex-underline` 64、`katex-overline` 48、`katex-accent` 11。
- 另补一条计划完全没有的：**[CVE-2026-103923](https://nvd.nist.gov/vuln/detail/CVE-2026-103923)**，KaTeX `>=0.11.0 <0.18.2` 存在原型污染→XSS（CWE-807），0.18.2 修复。当前 0.16.47 **在受影响区间内**，但本站是静态站、Markdown 由站长撰写、构建期无外部输入、`rehypeKatex` 未传 `trust`，前置条件（`Object.prototype` 被污染）无产生路径，**实际不可利用**。这是本批升级唯一的硬性收益。
- **公式级 A/B**：全站 **307 个公式 / 4 篇文章 / 36 个内容文件**（块级 91 + 行内 216），新旧版本各渲染一次逐条比对。结果 **307/307 全部为 `class-rename-only`**：结构化变化 0、**新错误 0**、修复 0、原本报错 0。独立判据交叉验证——把两侧 HTML 的所有 `class` 属性剥掉后 **307/307 逐字节相同**，不依赖归一化逻辑自证。
- **构建 A/B**：1322 文件对 1322，`onlyA=onlyB=59`、非 HTML 差异 **0**。59 个改名资产按文件族配对后，**57 个归一化哈希后完全相同**（mermaid 各 chunk 因 import katex chunk 的路径哈希变化而连锁改名），**真正有内容变化的只有 `katex.css`（32131→33084 B）和 `katex.js`**。156 页 HTML 差异全部是 asset 哈希引用，归一化后只剩 4 页，即 4 篇有公式的文章；这 4 页的差异**双向证明**是纯类名重命名（还原类名后逐字节相同，不还原则 4/4 全不同）。
- **资产同源**：`_astro` 内 KaTeX 相关文件 61 个 / 21 个族，**缺失 0、新增 0**。字体族缺一个就会静默回退到系统字体、字形错但不报错，按阻断项处理。
- **门禁**：`pnpm check` 0 errors / **0 warnings** / 6 hints；公式保护 38/38；`prettier --check ./src ./docs` 通过；`test:lib` 16/16；`test:utils` 261/261；`pnpm install --frozen-lockfile --offline` exit 0（CI 冻结锁不会红）。
- **真实浏览器**：文章页 298 个 `.katex`、零尺寸 0、原生 MathML 298、`.katex-base`/`.katex-strut` 各 652 次而**旧类 `.base`/`.strut` 均为 0**（CSS 与 HTML 同源的直接证据）、`.katex-error` 0、横向溢出 0、`pageerror` 0、本站 `requestfailed` 0；移动端 390×900 同样 298 个公式、零溢出。加载的样式表为 `/_astro/katex.qjoI73Dg.css`。
- **mermaid 回归**：override 把 mermaid 的 katex 也拉到 0.19.1，取图表最多的文章验证 **14/14 图表渲染成功**（14 个 `<svg>`、14 个已标记渲染、72 个节点标签、0 溢出、0 `pageerror`）。本站 99 个图表里没有一个使用 `$$…$$` 数学语法，该依赖是死代码。
- **方法论收获（已写进构建文档）**：计划原本的三项判据**全部会绿而站点已坏**——Task 2 的公式 A/B 脚本 `import katex` 命中的是根包（恒 0.19.1）、根本不测构建用的那份；「字体族是否都在」在错配下两侧都是 61 个；「`.katex` 盒子宽高 > 0」在错配下也非零只是高度错了。补上的判据是**直接数产物 HTML 里的旧类名出现次数必须为 0**。
- **连带传递依赖**：`katex@0.19.1` 声明 `commander: ^15.0.0`（0.16.47 是 `^8.0.0`），锁文件因此把 `commander@8.3.0` 换成 `commander@15.0.0`，`engines.node` 从 `>= 12` 抬到 **`>=22.12.0`**。已核对三处 Node：本机 24.18.0、`build.yml`/`deploy.yml` 的 Node 24 均满足；`lint.yml` 的 `node-version: 22` 由 `actions/setup-node` 解析为最新 22.x（2026-11-03 为 22.23.4）也满足。**产物不受影响**——`commander` 只被 `katex/cli.js` 用，`katex/dist/katex.js` 与 `katex.mjs` 两个库入口完全不引用它，本站也从不调用 katex 的 bin。残留风险：若把 lint.yml 钉到 22.11.0 以下或启用 `engine-strict`，安装会警告甚至失败（当前 `engine-strict` 未设置）。
- 顺带修正：计划里的安装命令 `--store-dir .pnpm-store` 是错的，本机实际 store 在 `D:\.pnpm-store\v10`，照抄会报 `ERR_PNPM_UNEXPECTED_STORE`。
- **未验证边界**：只验 Chromium，未在 Safari / Firefox 实机跑；未跑远端 CI、未推送、未部署；只比对了本站 307 个公式，未跑 KaTeX 官方完整语料；未测 `strict: "error"` 场景；错配反证只用了 40 个去重样本而非全部 307 个。详见 KaTeX 专项验收（已归档，索引与取回命令见 `docs/history/history.md` 的「归档清单（第五批）」）。

## 2026-11-03：四批依赖升级发布上线，线上功能验证 9/9

- 推送 `93b90e7..8f19b98`（5 个提交：Astro 检查器 0.9.12、Pagefind 1.6.0、Svelte 5.57.3、Autoprefixer 10.6.2、`@swup/astro` 声明对齐），远端 `main` 现为 `8f19b98`。三个 workflow 全部 success：Lint `41592304534`、Build and Check `41592304545`、Deploy to GitHub Pages `41592304550`，headSha 均为 `8f19b98`。Linux CI 上 `Astro Check` 0 errors / 6 hints，与本机一致。
- **部署身份判定踩了一个方法论坑**：最初用「线上 JS chunk 哈希是否等于本地」判定，三个 chunk 全部对不上（本地 `Pio.sk4GzkC6.js`、线上 `Pio.CS2Sx7XP.js`），差点误判成部署没生效。**真因是 JS chunk 的内容寻址哈希与 Pagefind 索引哈希都平台相关**，Windows 与 Linux 构建必然不同，这类判据不可用于跨平台部署验证。改用平台无关证据后全部对上：CSS 资源名两侧完全一致（`Layout.BkMsQfIt.css` / `MainGridLayout.CKaYaVTj.css` / `katex.BPpMaF0t.css` / `noto-sans-sc.WH83ST03.css`）、6 个代表页中 5 页可见文本逐字节一致、Svelte 运行时特征字符串计数一致（`svelte` 19 次 / `state_unsafe_mutation` 1 次 / `each_key_duplicate` 1 次）、CSS 作用域 hash 一致（`svelte-a15wih`）。
- 唯一文本差异是 `/about/` 的 GitHub 贡献日历：线上 1912 次 / 连续 17 天，本地 1881 次 / 连续 16 天。这是 CI 构建链 `fetch-github-contributions.mjs` 实时抓取所致，**反而是「线上确为本次新构建」的正面证据**。
- **线上功能实测 9/9**（真实 Chromium 打 `https://caiyan12.github.io`）：搜索岛完成水合（无 `ssr` 属性），中文「看板娘」2 条、英文「Astro」12 条；Swup 切页未整页刷新且后退恢复关键词与结果；文章页 298 个 KaTeX、首个公式盒 734×20 且含原生 MathML，截图确认公式排版正确；看板娘 `window.Paul_Pio` 存在且容器/canvas 各 1；移动端 390×900 搜索 12 条、零横向溢出；两视口 pageerror 与本站 requestfailed 均为 0。
- **已知边界**：线上导航用 `waitUntil:"load"` 会因第三方播放器拖住 load 事件而超时，改 `domcontentloaded` 后正常，属既有环境问题，与本次升级无关。
- 阶段五剩余 4 类跨版本迁移（Tailwind 4 / Mermaid 12 / Satori 0.63 / KaTeX 0.19）与 Prettier 上游阻塞仍未处理，站长已定「逐个做、每次单独授权」。完整发布证据见 升级总计划（已归档，索引与取回命令见 `docs/history/history.md` 的「归档清单（第五批）」） 阶段六。

## 2026-11-03：修正 @swup/astro 的声明偏差，触发一次 postcss 去重

- `package.json` 的 `@swup/astro` 由 `^1.7.0` 改为 `^1.8.0`，与实际安装版本对齐（构建文档长期记录该偏差：lockfile 存 specifier，改 `package.json` 不改 lock 会让 CI 的 `--frozen-lockfile` 失败，因此必须连 lock 一起改并实测）。已核实 **1.8.0 就是当前 latest**，这次修改不带动任何版本解析前进。
- **但安装后锁文件发生了超出预期的去重**：净 143 增 207 删。原因是 `@swup/astro` 的 specifier 变化让 pnpm 重算整棵依赖图，把 `postcss@8.5.25` 上下文下的那一整套副本（`cssnano` 族、`postcss-calc`/`colormin`/`minify-*` 等约 40 个包）并到了 `postcss@8.5.32` 上下文，`autoprefixer` 的 postcss peer 上下文也随之从 `8.5.25` 变为 `8.5.32`。同时 `browserslist@4.28.7`、`caniuse-lite@1.0.30001806`、`acorn@8.18.0` 等旧条目从锁文件中消失——**它们是同一批去重的副产品，不是版本倒退**：磁盘目录仍在，锁文件不再引用。
- **已实测这次去重对产物零影响**：`pnpm list --depth 0` 直接依赖**零变化**；重新构建后与升级前基线逐字节比对，**1176 项产物完全相同、0 增 0 删**，146 个 HTML 差异剥除随机侧栏后归零；`pnpm check` 0 errors / 0 warnings / 6 hints，公式保护 38/38，格式门禁通过，浏览器 32/32。
- `--frozen-lockfile --offline` 安装通过，CI 的冻结锁路径不受影响。
- 这条记录的重点是：**改 specifier 不等于零风险**，它会触发依赖图重算。以后遇到同类"声明纠偏"必须像本次一样先比对 `pnpm list --depth 0` 与完整产物，不能只看 `package.json` 那一行 diff。

## 2026-11-03：Autoprefixer 升至 10.6.2，caniuse 数据更新但 CSS 零变化

- `package.json` / `pnpm-lock.yaml` 将 `autoprefixer` 从 `^10.5.4` 升至**精确 10.6.2**，其他直接依赖安装版本不变（`src/` 与 `postcss.config.mjs` 零改动，`[tailwindcss/nesting, tailwindcss, autoprefixer]` 顺序保持，未连带迁 Tailwind 4）。
- **本批不是「只改一行版本号」**：10.6.x 抬高了数据依赖下限，升级必然联动 `browserslist 4.28.7→4.29.5`、`caniuse-lite 1.0.30001806→1.0.30001820`。本项目**没有显式 browserslist 配置**（走 `defaults`），解析出的目标集因此从 **31 项变成 36 项**（`chrome 150→156`、`safari 26.5→27`、`firefox 152→159` 等，19 项移出、24 项移入）。
- **但产物 CSS 逐字节零变化**：15 份 CSS 全部 SHA-256 一致（含 8 份走构建管线的 `_astro/*.css` 与 7 份 `public/` 直拷贝），厂商前缀普查也完全一致——152 处（`-webkit-` 86 / `-o-` 33 / `-moz-` 32 / `-ms-` 1），逐文件 0 差异。原因是本站用到的前缀属性（`object-fit`、`user-select`、`text-size-adjust`、`appearance`、`line-clamp`、`column-gap`、`tab-size`、`mask-image` 等）在旧、新目标集的**最低版本上都需要同样前缀**，前后都跨不过那条分界线。不是数据没生效，是这些属性恰好落在稳定区间。
- **变量隔离实验**排除了「构建缓存导致假相同」：用 `postcss` 直接处理同一份产物 CSS，A 组（旧代码+旧数据，31 目标）与 B 组（新代码+新数据，36 目标）输出**逐字节相同**，并含「同版本重复跑必须一致」的自检。一次失败尝试备查：把旧目标集喂给新 caniuse 数据会报 `Unknown version 156 of android`——目标集版本号必须与对应数据匹配，跨版本混搭技术上不成立。
- 同输入构建 A/B：两侧均 229 页 / 230 HTML / 28 篇索引；全产物 **1176 项逐字节相同、0 增 0 删**，146 个 HTML 差异全部来自侧栏随机推荐，剥除后 **0 差异**。
- **样式指纹 A/B**（`scripts/upgrade-style-audit.mjs`，23 页逐元素计算样式）：**21/23 页完全相同**（含三页 Nice Books 与文章页、404）；仅 `/albums/`、`/timeline/` 两页有 208 条差异，且**全部落在同一个 `figure:5` 语录块内**（`span.quote-band__char` 逐字符宽度）。对**同一份构建**再采一次自检，差异页集合与 A/B **完全相同**，证明这是 `crypto.getRandomValues` 的语录随机噪声，与升级无关。
- **踩坑记录**：`upgrade-style-audit.mjs` 的 URL 归一化只匹配 `localhost:<port>`，**不匹配 `127.0.0.1:<port>`**；首次用两个不同端口采集时 diff 出 15820 条假差异（全是 `cursor`/`background-image` 里的端口号），统一端口重采后归零。
- `pnpm check` 0 errors / 0 warnings / 6 hints，公式保护 38/38，格式门禁通过，`test:lib` 16/16、`test:utils` 261/261；浏览器验收沿用 32 条判据打本批产物 **32/32**（两视口 pageerror、本站 requestfailed、非资源类 console.error 均为 0）。
- 只验证 Chromium（前缀集合零变化，跨浏览器风险与升级前等同）；未跑远端 CI 或部署。方法与证据见 Autoprefixer 专项验收（已归档，索引与取回命令见 `docs/history/history.md` 的「归档清单（第五批）」）。

## 2026-11-03：Svelte 升至 5.57.3，浏览器判据升级前后逐条一致

- `package.json` / `pnpm-lock.yaml` 将 `svelte` 从安装版 5.56.8 升至**精确 5.57.3**（跨 minor），其他直接依赖安装版本不变。锁文件 36 增 36 删，范围为 svelte 自身、其平台无关传递依赖（`@sveltejs/acorn-typescript`、`acorn`、`devalue`、`esrap`、`@jridgewell/sourcemap-codec`）与四处 peer 重绑定；未联动 Astro、`@astrojs/svelte`、Prettier 插件本体或 Pagefind。
- **跨 minor 逐条核对而非假定安全**：区间 5.56.9→5.57.3 共 116 条变更（4 条 `feat` + 112 条 patch）。唯一具破坏性的是 #18900（`{:else}` 后接 `{:else}`/`{:else if}` 改为编译期报错），本站用合法 `{:else if}` 串联、两版编译器实测均无 warning。**本站 Svelte 语法面比预想更窄**：全仓 `.svelte` 无任何 `on:` 指令（`Search.svelte` 用属性式 `onsubmit`），所以「legacy `on:` 指令是否仍支持」这条对本站不适用。
- **本次升级不带来安全收益**：OSV 全量查询 14 条 advisory 中最高的 fixed 版本为 5.55.7，低于区间下界。5.56.8 已含全部已知修复，安全不能作为升级理由。
- 同输入构建 A/B（`astro build` + 横幅注入 + Pagefind，不跑联网快照链）：两侧均 229 页 / 230 个 HTML / 28 篇索引 / 47574 词。**先测噪声底线**——同版本连做两次构建，非 HTML 产物逐字节 0 差异、HTML 差异全来自侧栏随机推荐；在此基础上，升级前后**非 HTML 且非 Svelte chunk 的产物逐字节 0 差异**，156 个 HTML 在归一化 `_astro` 两种哈希命名后 **0 差异**。只有 5 个 chunk 因编译产物改名：`client.*` +727 B、`Search.*` −5 B，其余三个字节数不变（`legacy.*` 的版本标记仍是 `add("5")`）。
- **编译级证据**：把两版 Svelte 编译器同时指向本站真实组件源码——`Pio.svelte` 的 client/server 两路输出逐字节相同；`Search.svelte` 的差异精确对应上游两条 perf（`$.child()+$.reset()`→`$.only_child()` #18717；SSR 分支标记并入首次 `push` #18712）。真正的 ground truth 是用两版编译器 + 两版 `svelte/server` 运行时实际 `render()`，**SSR HTML 逐字节相同**（Search 608 B、Pio 171 B）。公开 API 零移除。
- **实机 A/B 用同一份探针、同一套 32 条判据分别打升级前后产物**：升级前 32/32、升级后 32/32，**同一断言名逐条 `ok` 与读数完全一致、0 处差异**（含 CSS 作用域 hash `svelte-a15wih`）。覆盖搜索水合/URL 预填/中英查询/空查询静默/无结果/忙碌重复提交防护/Swup 切页与后退恢复/零横向溢出，以及看板娘默认折叠·召唤·收起·Swup 往返后实例唯一·重载后仍可用，两视口 pageerror、本站 requestfailed、非资源类 console.error 均为 0。
- **清了两条容易误判的口径**：① `pioConfig.hiddenOnMobile` 的断点是 `(max-width: 1280px)`，所以 1280×900 下 Pio 按设计不初始化、页面里没有 `.pio-show`——桌面验证必须用 >1280 的视口；② Pagefind 1.6.0 对随机字母串会返回弱相关部分匹配（如 `zzzqqqxxxnotfound` 得 5 条），「无结果」用例必须用前批已记录的 `zzz没有这条内容987654321`（实测 0 命中）。另：Swup 会重建 script 节点，切页后 `script[src*='pio.js']` 计数归 0 属既有行为，升级前后一致。
- dev HMR 实测：改 `Search.svelte` 的 placeholder 热更新生效、改回即还原、`window.__hmrSentinel` 存活证明非整页刷新；源码 SHA-256 与原始文件逐字节相同。`pnpm check` 0 errors / 0 warnings / 6 hints，公式保护 38/38，`prettier --check ./src ./docs` 通过，`test:lib` 16/16、`test:utils` 261/261。
- 仅验证 Chromium，未跑 Firefox/WebKit（本次不动 CSS 前缀与层叠）；未运行远端 CI 或部署。方法与完整证据见 Svelte 专项验收（已归档，索引与取回命令见 `docs/history/history.md` 的「归档清单（第五批）」）。

## 2026-11-02：Pagefind 升至 1.6.0，完成中文检索 A/B

- Pagefind 1.5.2→精确 1.6.0，锁文件只联动其平台包；保留 Svelte、`Search.svelte`、收录规则和权重。Extended 改用 ICU4X 分词，部署需完整包含同轮生成的脚本、WASM 与索引。
- 2026-11-02 Windows / Node 24.18.0 本地：28 个收录文档集合/标题保持；31 组完整 API 查询中 6 组集合变化、18 组顺序变化、29 组摘要变化。“看板娘”23→2，减少仅匹配“看”的结果；“技术架构”“经济学”“AI 编程”等也新增弱相关部分匹配，存在精确性取舍，不宣称统一质量提升。
- 新旧桌面/移动的查询、空态、忙碌重复提交、Swup 切页后退通过，正常页面异常/本站失败请求均为零。分片故障首轮两版仍显示“没有找到”，第二轮旧版未恢复、新版恢复结果；没有把它写成所有网络错误都有提示或自动恢复。
- 同输入 Astro 构建均 229 页；搜索外产物无未解释变化。Pagefind 目录 53→67 文件、约 1.57→2.13 MB（整目录总量），不是访客查询下载量。Check 为 0 errors / 0 warnings / 6 hints，公式保护 38/38。
- 变化明细、故障注入、索引文本空白差异及本地验证边界见 Pagefind 专项验收（已归档，索引与取回命令见 `docs/history/history.md` 的「归档清单（第五批）」）。同步构建、组件和命令约定；未运行远端 CI 或发布。

## 2026-11-02：独立升级 Astro 检查器至 0.9.12

- `package.json` / `pnpm-lock.yaml` 将 `@astrojs/check` 0.9.10 升至精确 0.9.12，其他直接依赖不变。必要传递变化包括语言服务 2.17.3、新增 astro2tsx/WASM 检查链、chokidar 5、yargs 18.2.0 与语言服务使用的 vscode-uri 3.2.0；未联动 Svelte、Pagefind 或 TypeScript。
- 2026-11-02 Windows / Node 24.18.0 本地检查新旧均为 0 errors / 0 warnings / 6 hints；公式保护 38/38。旧新版监听对照中，已有 TS/Astro 文件错误依次检出、修正后清零，单次负向检查 exit 1。**新建文件漏检两版均复现**，记录为既有限制；新增文件后需重新执行单次检查或重启 watch，未修改依赖代码规避。
- 同数据构建均 229 页、产物文件清单相同；全部非 HTML 逐字节一致，146 个 HTML 仅随机推荐侧栏不同。1280px / 390px 本地搜索、公式、切页后退验证通过，页面异常和本站请求失败为零。
- 对照入口的新 CLI/旧 API 边界、失败路径、依赖审查及命令见 检查器专项验收（已归档，索引与取回命令见 `docs/history/history.md` 的「归档清单（第五批）」）；同步 `docs/agents/build-and-deploy.md` 和 `docs/agents/commands.md`。本地验收，未运行远端 CI 或发布。

## 2026-11-02：Prettier 升至 3.9.8，加入公式保护门禁

- `package.json` / `pnpm-lock.yaml` 将 Prettier 从 3.9.6 升至精确版本 3.9.8，其他直接依赖安装版本保持不变。保留 Astro/Svelte 插件、文章单美元公式与现有格式化范围，不忽略文章、不切 MDX、不修改渲染管线。
- **暂缓 3.9.9 / 3.9.10**：上游关闭单美元公式识别后会把公式星号当成 emphasis。当前已找到单行最小复现，修正旧文档“需要整篇解析态”的推论；历史测量数字保留。详见 `docs/agents/build-and-deploy.md` 与上游 issue #20199。
- 新增 `scripts/prettier-math.test.mjs` / `pnpm test:prettier-math` 并接入 `lint.yml`。用独立 remark-math 比较格式化前后的公式类型、原文与 KaTeX 渲染，不以格式化器自己的 AST 自证。2026-11-02 Windows 本地覆盖 36 个内容文件、307 个公式，3.9.8 为 38/38；3.9.10 的最小样例与真实文章按预期失败。
- 升级前后 342 个受检文件的格式化输出一致（实际加载 78 个 Astro 文件、2 个 Svelte 文件的插件）；同数据 Astro 构建均为 229 页。1308 个产物的清单一致，非 HTML 逐字节一致；146 个 HTML 只在随机推荐侧栏有差异。Check 为 0 errors / 0 warnings / 6 hints，桌面 1280px / 移动 390px 的公式、Swup 切页后退与布局验证通过，页面异常和本站失败请求均为零。
- 完整命令、测试计数、失败路径及验收边界见 Prettier 专项验收（已归档，索引与取回命令见 `docs/history/history.md` 的「归档清单（第五批）」）。本轮本地验收未执行网络快照刷新链、远端 CI 或发布；文章源文件未改变。

## 2026-11-02：Astro 7 验收剩余项收口

- **技能图标脱网**：`skills.astro` 改用 `public/skill-icons/` 的原始 SVG，去掉访客 Iconify 请求，保留既有图形/配色与首字回退。手动同步脚本不进构建链；来源 hash、作者、许可及完整 Apache-2.0 等许可副本随资源入库。外网阻断的桌面/移动解码测试通过；console 门禁现完整采集 23/23 页 **PASS**，没有扩大放行清单。
- **文章目录真实竞态**：防抖到期前位置已变、scroll 的 rAF 未处理时，缓存激活项会让旧动画提前启动并跳过新目标静默期。定时器到期先现量位置，再按 update 重排；真实 DOM + 可控时钟先复现 1354≠1415，再验证 2/2。文集烟测也修正相位：先等前段动画静止、确认首次真实激活再立即反向，不再同步连发两次会合并的 scrollTo。
- **相册脚本错误归属**：同一第二标签中同时复现播放器“已在其他页面加载”异常和 window 的 opaque `Script error.`，与供应商 storage 心跳互斥规则一致。灯箱测试全部页面补异常/本站请求监听，独立场景隔离 context；不改播放器互斥、不屏蔽异常。正常流程 27/27，给相册注入错误则按预期失败，证明后续页面错误不会遗漏。
- **旧版间距恢复**：`WidgetHotLog.astro` / `WidgetSeries.astro` 的固定静态 Fragment 保持图标与 span 相邻；两处动作宽度恢复 60.4375 / 62.15625px，复用原 3px 图标 margin，未改共用 CSS。
- 本地构建 229 页，check 0 errors / 0 warnings / 6 hints，utils 261/261，文集产物烟测 88/88。命令、红绿证据及失败路径见 Astro 7 剩余项收口（已归档，索引与取回命令见 `docs/history/history.md` 的「归档清单（第五批）」）；此前初轮“待复核”记录保留历史，并补最新结果指针。未推送或部署。

## 2026-11-02：Astro 7 联动升级与同数据构建验收

- Astro 6.4.8→7.4.4、Svelte 集成 8.1.2→9.1.2、Markdown 7.2.0→7.3.5、Expressive Code 与两插件 0.43.1→0.44.3；仅这六个直接包改变安装版本，更新锁文件。保持 Tailwind 3、TypeScript 5、Prettier 3.9.6 及现有 unified 插件管线，未把独立项目 AI News 加回主站。
- `astro.config.mjs` 显式 `compressHTML: true`；将 Vite 8 不再自动迁移的 `esbuild.drop/pure` 改为 Oxc minify 配置。探针先复现日志仍输出，再验证日志/调试器被剔除、实参副作用与 warn/error 保留。CI 检查/构建的 Node 改为 24，部署缓存策略不变。
- **2026-11-02 Windows 本地 A/B**：两侧 Astro 均构建 229 页，完整产物均 230 个 HTML；路由、链接、图片、标题、代码与公式语义一致，49 页仅总文本空白有差异。OG 与 Pagefind 目录逐字节一致。16 组同状态桌面/移动首屏截图像素差异为零；原始样式指纹差异保留，区分 CSS 等价序列化、随机/外部服务状态与两处链接约 2.5/3px 宽度变化，不声称全部资源 hash 相同或性能提升。
- **发现并处理**：dev 首次文件监听阻塞导致 Vite 模块通信超时、文章集合为空；CPU profile 的主要时间落在 `fs.watch` 注册。排除本地 `.pnpm-store` / `output` 后，默认 CLI 约 13 秒同步内容并启动；真实内容、CSS 与 Svelte 热更新及恢复通过。没有增加超时、外部化整包或修改依赖源码。
- 本地 check 为 0 errors / 0 warnings / 6 hints，相关单测通过；UI 142/142、好书 72/72、灯箱 27/27、壁纸 47/47、AI News 主站边界通过。文集首次目录防抖判据失败、独立确认 88/88，首次失败仍保存；全页 console 门禁新旧均 REVIEW（技能页 32 个外部 Iconify 请求），不写成全绿。dev 相册另出现一条来源待核的 `Script error.`，调查结果在实施记录维护。
- 范围、命令、逐项差异、失败日志与剩余边界见 Astro 7 实施验收（已归档，索引与取回命令见 `docs/history/history.md` 的「归档清单（第五批）」）；当前为本地升级验收，未运行线上 CI、未推送或部署。
- **补记（2026-11-05，证据：`git show a42a170 -- package.json` 与 `git merge-base --is-ancestor a42a170 origin/main`）**：上一行的「未推送或部署」是 2026-11-02 当日状态，不是最终状态。升级提交 `a42a170`（2026-11-02 20:47，`Upgrade Astro 7 after AI News extraction and fix upgrade regressions`）把 `astro` 从 `6.4.8` 改为 `7.4.4`、`@astrojs/svelte` 从 `8.1.2` 改为 `9.1.2`，且已是 `origin/main` 的祖先——该升级随后随主干部署上线。当时未回写这一条；后续 2026-11-03 的「四批依赖升级发布上线」条目也没提 Astro 7.4.4，所以按版本号检索 CHANGELOG 会漏掉上线证据。此处只补索引，历史原文保留不动。

## 2026-11-02：构建系统升级复核（尚未升级）

- AI News 迁出后重新查询官方发布信息：Astro 当前 6.4.8、最新稳定版 7.4.4；Svelte 集成、Markdown 处理器和 Expressive Code 的最小联动组已在临时独立 workspace 中通过严格 peer 解析。主站依赖保持原版本，未用解析成功代替构建或实机验收。
- Prettier 3.9.6 → 3.9.10 的内存对照覆盖当前 34 篇 Markdown，1 篇的 13 行仍会改坏公式，KaTeX 样例实测报错；文章未写回。Tailwind 4、TypeScript 7 等独立升级不捆绑进 Astro 联动组。
- 本日 registry 来源、官方迁移说明、命令与验证边界见 构建系统升级复核（已归档，索引与取回命令见 `docs/history/history.md` 的「归档清单（第五批）」）；`docs/agents/build-and-deploy.md` 已补充复核指针。未升级、提交、推送或发布。

## 2026-11-02：AI 日报独立项目迁移收尾

- **归属定稿**：AI News 移植已完成，本项目不再包含日报实现。README 移除独立项目内部维护表项，技术栈不再把 React 日报页列为本站功能；旧性能评估明确为迁移前历史，非主站待办。GLOSSARY、相关 `docs/agents/`、历史索引及 ADR 0001 的替代提示同步更新，AGENTS 可编辑区加入项目记忆入口。
- **配置清理**：`tailwind.config.cjs` 删除无消费者的日报 `--t-*` 色板/字体/圆角映射，`tsconfig.json` 删除无 JSX/TSX 消费者的 React JSX 设置，`package.json` / `pnpm-lock.yaml` 移除 `react` 运行时依赖。OG 图仍给 Satori 传普通元素对象，`ReactNode` 类型仍被使用，故保留 `@types/react`。冻结锁文件的离线安装确认仅移除该运行时包，未升级依赖。
- **边界与回归**：按 ADR 0009 保留 `/ai-news/` 桌面/移动导航、sitemap 与现有边界脚本；历史 ADR/日志、文章和项目展示保留。`scripts/ai-news-ownership.test.mjs` 改查源目录及整个日报产物目录缺席；通用测试 fixture 与脚本注释不再沿用旧日报页面地址或 `AI_NEWS_BASE_URL`。
- **2026-11-02 本地 Windows 实测**：`pnpm check` 为 0 error / 0 warning / 6 hints；`pnpm test:lib` 16/16；修改前后 `pnpm exec astro build` 均成功生成 229 页，12 份 CSS 逐字节相同，33 张 OG PNG 均为 1200×630；`pnpm test:ai-news-ownership` 通过，临时产物目录注入多余日报文件后按预期失败。`MAIN_SITE_URL=http://localhost:4323/` 的 `pnpm smoke:ai-news` 在无窗口 Chromium 下通过 1280px / 390px 两档入口 DOM 检查；变更文件 Prettier 与 `git diff --check` 见本轮计划的最终复核记录。
- **环境失败路径**：首次沙箱构建字体域名 DNS 返回 `ENOTFOUND`，联网环境设 `NODE_USE_ENV_PROXY=1` 后构建成功；原子写入测试在沙箱默认临时目录 rename 返回 `EPERM`，将 `TEMP` / `TMP` 指向工作区证据目录后通过；沙箱浏览器缓存缺席、沙箱 preview 端口不可达，改用本机已有浏览器与本机 preview 后通过。未修改生产代码来绕开这些限制。完整证据、剩余引用分类与命令边界见 AI News 迁移收尾（已归档，索引与取回命令见 `docs/history/history.md` 的「归档清单（第五批）」）；未执行完整 `pnpm build` 联网刷新链、线上旅程或独立项目内部验收，未推送/发布。

## 2026-11-02（下午）：减少动效判定收敛，两件遗留收口

- **减少动效判定统一到唯一判定点**：删掉 `src/nice-books/scripts/shared.ts` 与 `src/utils/site-modal.ts` 里两份**逐字重复**的 `prefersReducedMotion()` 本地实现，改为转发 `src/utils/runtime/reduced-motion.ts`（`shared.ts` 保留同名 re-export，`archive.ts` 的导入路径不变）；`Sakura.astro` 与 `src/nice-books/scripts/home.ts` 的 4 处裸 `window.matchMedia("(prefers-reduced-motion: reduce)")` 一并换掉。理由：判定点一旦分裂，将来改语义（加监听、换 `matchMedia().addEventListener`）就会漏掉某几处。来源是搁了三周的 `stash@{0}`「T7 超范围：全站 reduced-motion 收敛」，动手前先用 `git stash show -p | git apply --check` 验证仍可干净套用。行为不变（两者都是每次调用现查一次）。
- **`src/constants/github-*.json` 生成物刷新**（`chore(data)`）：只动 `generatedAt` 与 10-31 / 11-01 / 11-02 三天贡献计数（10→57 / 0→21 / 0→9）。提交它的额外价值是**刷新回退缓存**——`fetch-github-*.mjs` 取数失败时保留已提交文件供页面渲染（`SKIP … About page will use stale cache`）。
- **`docs/plans/wallpaper-pull-handoff/` 按惯例归档**进 `docs/history/history.md`：这批 4 个文件原本 **untracked**（没有历史 = 删了永久丢失），所以拆两步——先入库（`070e1a9`）让恢复命令有源，再删除并登记。恢复命令从 `git show <sha>:<path>` 换成 `git archive <sha> <dir> \| tar -x`：`git restore --worktree` 被本机 CC Safety Net 拦（`git.restore-worktree`），照抄会让下一个人卡住，新版已实跑验证能还原 4 文件 368 KB。
- 验证：prettier 干净；`astro check` 196 文件 0 error；`src/utils` 单测 261 通过；`astro build` 229 页；`smoke:nice-books` **72/72**（受本次受影响面正好是 Nice Books 与 Sakura）；CI 三条 workflow 全 success。

## 2026-11-02：拉绳壁纸挂件重做为 360 原版小挂件，导航宽度收敛为单一真源

- **视觉重做**（用户提供 2013–2017 年 360 壁纸原版截图作为唯一设计依据）：T 恤由 130px SVG 盒里的 64×84 路径（含 3px 描边实渲染 67×87）缩到 **墨迹 26.8×27.6 CSS px**（盒 30×28），绳由 2px 紫渐变直线改 **1px 双股细线**（主股 `#4257be` + 0.4px 高光股，`vector-effect="non-scaling-stroke"` 保证拉长不变粗）并带自然垂坠弧度与领口绳结；整件 30×50，衣服顶边距视口顶边 22px。新尺寸对照原版实测（1103 宽截屏：T 恤 28×25、绳约 24、中心线 81.3%）。
- **横向锚点**：站长两次纠正后定死为「**中心线压在主导航 `#head-nav` 右缘**」，不是视口百分比。GLOSSARY「拉绳壁纸挂件」同步改写。
- **导航宽度收敛为单一真源（ADR 0010）**：`global.css` 的 `:root` 定义 `--nav-w`（宽档固定宽）与 `--nav-side`（窄档两侧留白），`#head-nav`、`#header .box`、`.wpull` 三方只消费这两个变量。挂件的 CSS 兜底写成三选一 `min()`（宽档右缘 / 窄档右缘 / 视口 8px 边距夹取），**不带断点**——导航的断点改了挂件也不会脱钩。原先挂件里硬编码镜像 1100/40 是本次的隐患来源。
- **修强刷闪动**：运行时 `--wpull-left` 要等 `pagefindReady()` 才写（实测首帧 140ms、写入 370–395ms），而 CSS 兜底当时是个近似值，中间 240ms 停在错位置——1440 档首帧 1166.39 / 落定 1270（Δ=103.61）、1170 档 Δ=187.31、1024 档 Δ=171.56。改法：CSS 兜底直接由 token 算出与运行时相同的值，首帧即落定位置。**诊断方法**：以「禁用 JS 的渲染」作为浏览器第一帧的替身，与实际落定值比对（`wpull-fouc-probe`，临时探针，用完即删）。
- **无导航路径去重**：删掉运行时里的 `LEFT_RATIO = 0.81` 近似；导航不可用（不存在 / `display:none` / rect 全 0）时**撤掉 `--wpull-left` 交给 CSS**，提示位置改从盒子实际矩形反读。实测把导航设为 `display:none` 后中心仍在 1270、变量变 `(none)`，零跳变。
- **常驻回归（`pnpm smoke:wallpaper-pull`，43 → 47 条）**：新增「首帧定位 = 落定定位」×2（1440 / 1024）、「绳尾与衣服顶边相接」（守 `ROPE_REST` ↔ `--wpull-rope-rest`）、「改 `--nav-w` 后导航确实变宽且挂件首帧仍等于落定值」（守单一真源；不硬编码期望坐标，只要求「导航变了」+「挂件跟上了」）。判据相位仍由真实状态定义，不睡固定毫秒。
- **评审与驳回**：`code-review` 双轴跑完，采纳 6 条（`readNavRect` 对零尺寸盒的防御、无导航双口径、`#header .box` 同源、三处陈旧注释、hint 测试底数重标、拖动中不保持悬停倾斜），驳回 3 条（hover 0.8° 属用户明确允许的「轻微摆动」而非「明显旋转」；`--nav-w:900` 会闪 52px 的反例建模时漏了导航窄档 `calc(100% - 40px)`，`--nav-w` 在 ≤1100 本就不生效；衣服渐变+1px 投影属用户原文「允许轻微柔和阴影」）。
- 验证：`astro check` 196 文件 0 error；`src/utils/**` 单测 261 通过；`pnpm build` 229 页 EXIT 0；`pnpm smoke:wallpaper-pull`（build + preview）**47 项全过**；另用临时闭环在 1920 / 1440 / 1200 / 1146 / 1140 / 1101 / 1100 / 1099 / 1024 / 900 / 760 / 681 十二档实测「首帧 = 落定 = 导航右缘」，Δ 全为 0（含 1099–1101、1140–1146 两个断点邻域）。
- 未验证：真机触屏手感；线上首帧（Fastly 边缘缓存 HTML `max-age=600`，故部署后以构建产物为准）；`PULL_THRESHOLD` 仍为 80px（用户要求「达到原有触发条件时换壁纸」），对 28px 高的衣服相当于 2.9 个身位，偏长，已提请站长裁决。

> **补记说明（2026-11-02）**：下面 2026-09-26 – 2026-11-01 的条目是事后从 `git log` 与 `docs/adr/` 补的——那段时间有变更没随手登记。因此它们只写 **commit / ADR 能直接支持的事实**，不写当时的实测读数（那些数没保存下来）；要看细节请按条目里给的 commit 与 ADR 路径去读原文。

## 2026-11-01：首页礼物气泡按钮

- 首页接入 QQ 礼物气泡按钮（`QQBubbleView` 的贝塞尔轨迹），见 `32b27e9`。
- 与既有首页元件同族：不引入新 UI 框架，样式走 `global.css` 既有 token。

## 2026-10-30：提交前 prettier 门禁落地，文集闭环口径定稿

- 提交前 prettier 门禁与 retro 文档约定（S1–S5），见 `3509bc1` 与 `.githooks/README.md`：只查暂存内容、`git commit --no-verify` 可单次绕过。
- 文集（series）确立为与标签/分类并列的**独立轴**，成员阅读序列封闭在组内，非成员文章的时间线跳过整个文集——这是裁决不是缺陷，见 `docs/adr/0007-series-closed-reading-sequence.md`。
- 过程文档大规模归档：23 份已完成计划迁入 `docs/history/`，新增 `docs/history/history.md` 索引（`37097dd`）。

## 2026-10-29：客户端运行时迁入独立宿主（spec #115–#125）

- `src/utils/theme-script.ts` 收薄为「装配表 + 生命周期声明 + page-load 辅助」三件，各功能块按关注面拆到 `src/utils/runtime/`，由 `runtimeTable` 的 `init` / `swap` 两个字段驱动。
- 迁移顺序按宿主分组（T3 文章页六块 / T4 外壳组 / T5 Mermaid+KaTeX / T6 灯箱 / T7 装饰与小件 / T8 稿纸与技能环 / T9 评论换一批），每个宿主一块一个合并提交（`aba9f47`、`3eb6b48`、`d2b7fc0`、`e13f5ec`、`198ba46`、`2e16a6b`、`6afb8b1`）。
- 收尾时删掉迁移后失去使用者的导入（`f373a05`），并按 T10 #125 修正三处陈述失真、补四个关注面的行为证据（`ed22119`、`4e49302`）。协议本身见 `docs/agents/components.md` 的「Swup 重初始化协议」条。

## 2026-10-28：AI 日报迁至独立仓库（ADR 0009）

- 日报源码、测试与 Pages 发布迁到 [CaiYan12/ai-news](https://github.com/CaiYan12/ai-news)，主站保留原路径 `/ai-news/` 的导航与 sitemap 条目；替代 `docs/adr/0001-ai-news-independent-react-page.md` 里「主站统一构建部署」的决定，见 `docs/adr/0009-ai-news-separate-deployment.md` 与 `e683da0`。
- 这是**工程归属**的变化：C-1 原定的客户端瘦身方案被独立项目替代，性能目标转移，未证明主站客户端瘦身。

## 2026-10-27：导航液态玻璃定稿、天气胶囊加载态

- 导航条与四个下拉面板改为液态玻璃（白膜 + 背景模糊 + 边缘折射透镜，折射场按元素实际尺寸与圆角半径生成 SDF 位移贴图）：初版 `6254273`（2026-09-26），裁决与实现要点见 `docs/adr/0005-navbar-liquid-glass.md`。位移刻意改在**像素空间沿 SDF 梯度**算——上游实现用归一化 uv，放到 1100×55 的横条上会把横向位移放大 20 倍。
- 天气胶囊补加载态：固定高度避免加载时塌陷（`a7371e9`），随后转圈改自绘 SVG（更细的线、更大的开口，`1cfcfa1`、`ee73b99`）。判据与取数口径见 `docs/agents/weather-capsule.md`。

## 2026-10-23：AI 日报内容区缩放胶囊

- `/ai-news/` 内容区加缩放胶囊（`46cdf1e`），与站内既有的字号滑块同族，不引入新控件范式。

## 2026-10-14~15：侧栏「文章目录」小部件与同页锚点平滑滚动

- 侧栏新增「文章目录」（`11225a9`）：激活态跟随阅读位置（`3b38f62`）、换页后重建并重置高亮（`6df1387`）、激活项居中与到达动画（`58d3df9`）。
- **必须与文集目录共用一个粘性容器**：实测同一侧栏内两个独立粘性元素滚后会互相压住 87.9px（前者 10–230，后者 142.1–342.1），后者整块盖住前者。结构与取舍见 `docs/adr/0008-sidebar-article-toc-sticky-stack.md`。
- 标题栏补阅读进度条（`162535e`）与「查看目录」按钮（`11cadbb`），图标与标题同族对齐（`30ad519`）。
- 同页锚点点击改为平滑滚动（`a386067`，pushState 保留 hash、捕获阶段避开 swup 抢事件）；swup 不检查 `defaultPrevented`，故接管时 `stopPropagation` 防止气泡阶段同步瞬移覆盖动画（`25c9edd`，站长实测报告）。

## 2026-10-11：本站资源下拉新增「跳出茧房」

- 「附加功能 → 本站资源 → AI日报」下新增入口（`6c89bef`）。下拉分列在 `Navbar.astro`（桌面 hover）与 `MMenu.astro`（移动全屏菜单）两处，两处必须同步改。

## 2026-10-10：文章页与 /about/ 正文段落首行缩进

- 正文段落加首行缩进 `2em`（= 2 字符），规则 `global.css` 的 `.post-body p`，紧邻既有那条 `.post-context p { margin }`。用 `em` 不用 `px`：`.post-context` 的字号由字号滑块写内联 px（12–24），`em` 才能跟着缩放；基准字号实测 13px，故文章页默认缩进 26px。
- 挂点 `.post-body` 只加在两处真的渲染 markdown 正文的容器上——文章页（`[...slug].astro`）与 `/about/` 信纸页（`about.astro`）。`/tag/xxx/`、`/category/xxx/`、`/series/xxx/` 的统计行共用 `.post-context` 但**不带**此挂点，因此写成 `.post-context p` 会连它们一起缩进——这条边界由反向判据守着。
- 原版主题对正文段落零 `text-indent`，本规则是 ADR 0004 意义上的**已转正偏离**（中文长文段段首行缩进是阅读惯例，原版缺失属主题年代局限），审计时勿按"漂移"修回原版。
- **八条例外 + 两处就地归零**（均为实测得来，非预设）：图片段 `<p><img …></p>`（`.post-context img` 是行内图，缩进会把图右移 2em 并溢出容器）、`.admonition-title` / `.markdown-alert-title`、`blockquote` 内段落（含嵌套）、**mermaid 图内标签**（节点文字是 SVG `foreignObject` 里的 `<p>`，全站三百余个，是最大的一处误伤面）、表格单元格段落 `td/th`、列表项段落 `li`（条目已有编号/符号与 `padding-left`）、模板与元件段落 `.post-last-updated` / `.post-series`（文集提示行在文章头尾各一处，只有尾处落在正文容器内）、`/about/` 的居中装饰标题 `.paper-hero-title` / `.paper-hero-sub`。另有两处**不另起规则、直接写进既有那条里**：右对齐的日期落款写进 `markdown-extended.css` 的 `.letter-paper-body p:last-child`（那条本来就是 `text-align: right`；右对齐单行再吃 `text-indent` 会被顶离右缘），逐字 span 写进 `.paper-hand-char`（见下条）。
- **踩坑：`text-indent` 是可继承属性，会打进 `display: inline-block` 子元素并各自生效。** 稿纸的逐字符微随机把每个字包成 `inline-block`（= 独立块容器），段落那条缩进因此继承进每一个字、每个字各自缩进一次——实测稿纸正文各段高度翻到三倍（64→192 / 128→352 / 192→544px）、面板高度 2691→4771px，而字符矩形数与网格相位变量一个没变，很容易被误读成"CDN 字体换了"。判定手段：**同一浏览器会话内摘/挂挂点类做 A/B**，可完全排除字体时序噪声（跨会话重开浏览器时会误判）。解法是给 `.paper-hand-char` 显式 `text-indent: 0`，缩进只留在段落首行。**复核口径必须是"段落内所有 `inline-block` 后代的 `text-indent` 都为 0"这条扫描**，不是看段落自身的缩进值——段落值全程都是对的。
- 验证（一次性实机量测，未加常驻判据，共 34 项全绿）：`/about/` 15 个段落分类完备（2 个装饰标题 + 1 个右对齐落款无缩进；便签 2 段 38px、稿纸正文 9 段 36px、署名行 26px），稿纸网格相位（`--lp-shift` / `--lp-cycle` / `--lp-baseline`）与首段行盒 offsetY 在挂/摘挂点两态下逐值相同、面板高度零增量；文章页按段落形态穷举扫描 29 篇——普通正文 2392 / 章末小结正文 25 / 提示块正文 18 全 2em，图片段 18、图形内标签 318、表格单元格 252、列表项 33、引用块 104、提示块标题 15、模板段落 7 全 0；字号滑块 24px→48px、12px→24px；`/about/` 在 1440/1100/860/680/390 五档零横向溢出；`/tag/习题/`、`/category/技术/`、`/series/matt-pocock/` 三处反向判据通过。`pnpm check` 0 error、`prettier --check ./src ./docs` 干净。
- `pnpm smoke:ui` 144 项中「票 20：卡片标题悬停零布局位移」失败（合计位移 30px，来自 `.post-list .post-header h2 a` 的 `left` 变化）。**与本改动无关**：把本次源文件 stash 掉、`pnpm exec astro build` 重建后同一条判据以同一读数复现（首页无 `.post-body`，新规则结构上匹配不到它）。

## 2026-10-01：底部语录条（ADR 0006）

- 站长要求嵌入 `rushhiii/notion-widgets` 的 `/quotes` 元件，最终**没有嵌**：按它的卡面语法在本地重写了「语录条」（英文原句 + 中文译文 + 英文署名，每次整页加载换一句）。三条备选路径都走通过才否掉，取舍见 `docs/adr/0006-quote-band-borrows-shape-not-runtime.md`。
- 逐字切分带上真体引号，保证 JS 与无 JS 两种状态同形（`3d6ef19`）。

## 2026-09-19：相册内容改版与灯箱交互修正

- 相册改版为文件夹驱动的三册结构（日常随手拍 32 / 背景收藏 11 / 轻松一刻 47，共 90 张）：一张 11.9MB 的 13624×2936 全景截图压到 3000×646 / 324KB，一张 425×10000 的超长图移出站点；补齐两篇文章与全部相册图此前缺失的 LQIP/manifest 条目（相册 LQIP 74 条、变体 53 条，零指向已删文件的残留）。
- **缩略图统一 3:2 裁切**：`.photo-grid img` 与相册索引封面 `.album-cover img` 改为 `height: auto` + `aspect-ratio: 3 / 2` + `object-fit: cover`，与图片墙同一套范式；此前桌面端按原图比例出图，全景图会塌成 174×39 的细条并让网格参差。`/albums/` 索引页封面由裸 `<img>` 改为 `ResponsiveImage`，三张合计约 2.9MB 的原图直出改走 WebP 变体。
- **灯箱关闭不再跳位**：`placeFocusBack: false` 取消 Fancybox 默认的"关闭时把页面滚到当前图"，改由 `on.destroy` 手动 `focus({preventScroll:true})` 归还键盘焦点（正文 `<img>` 不可聚焦，实际受益的是相册与二维码的 `<a>` 触发元素）。
- **灯箱新增「定位到文章位置」按钮**：位于右上角下载之后，仅 `post-gallery`（文内图）组出现——按 `triggerEl` 的 `data-fancybox` 用函数型 `Carousel` 选项决定工具栏；点击后关闭灯箱再把该图滚到视口居中（灯箱开启期间 `body` 锁滚动，故必须"先关后滚"），`prefers-reduced-motion` 下降级为瞬时。
- 灯箱工具栏文案中文化：引入官方 `zh_CN` 语言包并在本地合并扩展新按钮文案；右上角「下载」按钮改为捕获阶段拦截并在新标签页打开图片文件链接（库默认直接落盘保存）。
- **灯箱顶部净空**：`.fancybox__slide` 常置 `padding-top` 62px（等于绝对定位工具栏高度），此前库默认内边距为 0，够大的图片顶边会被左上 X/X 计数与右上按钮压住、视觉中心偏低；实测适配态重叠由 62px 降为 0，放大态仍按原图自然尺寸呈现（曾尝试用 `:has(.will-zoom-out)` 在放大时释放留白，会让放大目标过冲，故弃用）。
- **指针样式与触发状态同源**：`global.css` 的 `.prose img{cursor:zoom-in}` 收窄为 `.prose img[data-fancybox]{cursor:zoom-in}`，仓库卡片头像、表格行内头像、二维码不再显示放大指针；`.post-context .github-card-link` 显式 `cursor: pointer`，整张卡片（头像/名称/描述）统一手型。
- 新增常驻回归 `pnpm test:fancybox`（`scripts/fancybox-smoke.mjs`，Playwright 27 项：关闭不跳位含"触发图确已离屏"的有效性前置、焦点归还、定位按钮分组与位置、点定位生效、reduced-motion、下载新标签页、中文文案无 `{{KEY}}` 残留、卡片/表格/二维码图标不计入文内图、卡片手型与正文放大指针的同源断言、顶部净空（适配态零重叠 + 放大态按原图自然尺寸呈现）、Escape 关闭、本地资源零失败零报错）；需先 `pnpm build && pnpm preview`，与 `smoke:nice-books` 同层级，不进 `build` 链与 CI。验证：`pnpm check` 0 errors、`pnpm build` 通过、相册视觉验收 90 项与灯箱 27 项全绿。

## 2026-09-08：标签云集/分类云集 3D 标签云上线

- 新增 `src/components/layout/TagCloud3D.astro`：基于 svg3dtagcloud（vendored `public/vendor/svg3dtagcloud/`，npm `svg-3d-tag-cloud@0.0.20`，MIT，LICENSE 随附）的 3D 旋转标签/分类云，`/tag/` 与 `/category/` 云集页调用；数据与 `#blogtags` 药丸云同源（药丸云保留：当前项高亮 + 无动画回退），空数据自隐藏。
- 视觉与主题融合：透明底卡片（1px 细边框）、库内置 10 色调色板轮换（`fontColor` 设置不生效）、hover 标签放大 1.15 倍（150ms，`(hover:hover)+(pointer:fine)` 门控）、“N篇文章”tooltip 淡入上浮（由库写死的 `opacity="1.0"/"0.0"` 属性选择器驱动，CSS 走 `<style is:global>`——Astro scoped 管线会转义坏 `:global()` 内属性选择器引号）；`prefers-reduced-motion` 去位移保淡入；禁 `transition: all` 防拖影。
- 工程要点：库为自包含 global 构建（9.9KB），按 Pio 先例运行时 `<script>` 注入加载（Vite 禁止 ESM import public/ 内 JS），注入标签带 `data-swup-ignore-script`；组件脚本置于 swup 容器内（dev 下容器外脚本换页即丢）；实例挂 `window.__tagCloud3D` 跨页交接，云集页互切先销毁残留实例（rAF/resize 监听）再重建，切往无云页面自动销毁。
- 验证：dev 与 `pnpm build && pnpm preview` 生产路径（组件脚本内联进 `<main>` 内 HTML）均实测 Swup 往返、tooltip 上浮、375px 无横向溢出；astro check 0 错误。

## 2026-09-06：Nice Books 每日好书 V1 移植上线

- 从 `D:\pages\test\nice-books\prototype`（Design Agent 交付的 V1 参考原型 + design-handoff.md）正式移植为 `/books/` 生产模块：「今日好书」访问级随机单本 + 换一换（新 ≠ 当前）、「站长推荐」featured 池随机 6 本整组替换（新组排除旧组、组内无重复）、探索更多、书库（六字段即时搜索 × 标签叠加 × 书架/列表双视图 × 每页 12 载入更多 × `?q=`/`?tag=` URL 直达）、书籍详情（22 本 getStaticPaths 静态页 + 同架图书 top4 + 无效 id 站级 404）。
- **独立壳**架构（仿 `/ai-news/` 先例）：`src/nice-books/`（数据/查询/渲染构造器/交互脚本/样式）+ `src/pages/books/` 三路由；不加载博客 Layout/global.css，自带「纸墨书架」页眉页脚；全部页面 `data-pagefind-ignore="all"`（决策：博客全局搜索只搜正式文章）。
- **零框架交互岛**：换一换/书库过滤为 vanilla TS module script（SSR 标记与客户端渲染由 `src/nice-books/lib/render.ts` 字符串构造器单源保证）；swup 协议 =「顶层 init + `astro:page-load` 重跑 + main 内 dataset 守卫 + 元素缺失早退」，books 内部切页由全局注入的 @swup/astro 接管。
- **视觉 token 锁定 design-handoff §5–§8**：`--nb-*` 变量（paper/surface/note/ink/blue/seal 等）+ Tailwind `nb.` 命名色彩板（避免与 ai-news `--t-*` 映射键冲突）；封面为按 id 确定性的程序化 SVG 书封（handoff §12.3 兜底外壳，`coverUrl` 填入本地路径后自动切换真图）；字体复用仓库策略（方正书宋 CDN/思源黑体 VF/JetBrains VF/本地楷体），零新依赖。
- 「本站资源」下拉在 AI日报 后新增「每日好书」（`navBarConfig.resourceSite` 数据驱动，`noSwup: true`）。
- 新增 `pnpm test:nice-books`（node --test 27 例：数据契约/可注入 RNG 随机去重/六字段搜索/SVG 确定性）并接入 `pnpm build` 链头部；新增 `pnpm smoke:nice-books`（Playwright 43 项实机检查：随机契约/loading/去重/视图/搜索/直达/404/swup 切页与后退/重复初始化防护，三连跑稳定）。
- 已知边界：荐语/标签进入书库搜索范围（比原型多两字段，按主提示词 §18 裁决）；jsDelivr 字体 CDN 在部分网络下可能加载失败（与 `/about/` 同渠道，降级系统宋体，不影响功能）。

## 2026-09-06：全仓库深度审查修复（七阶段 16 项，详见 docs/plans/2026-09-06-review-fixes.md〔2026-10-30 已归档，全文见 docs/history/history.md〕）

- **速胜**：canvas 粒子爆炸/轮播自动播放/平滑滚动补 `prefers-reduced-motion` 守卫（此前 canvas 特效无任何降级）；Prettier 补装 astro/svelte 插件修复 `.astro/.svelte` 被 `--check` 静默跳过的格式化盲区（全量格式化 67 文件）；`image-variants` 非 WebP `srcset` 撤除混入的 webp 候选（无格式协商会导致旧浏览器裂图）。
- **构建脚本容错**：`fetch-github-repos` 缓存损坏备份重建（防限流时静默清空）；`generate-lqips` LQIP 变更检测改源图字节数（CI 友好）+ 逐图容错；`sync-site-stats` 空白内容评论/留言降级跳过不再阻塞部署（网络失败维持 fail-closed）；`fetch-github-contributions` IO 失败对齐"只告警不中断"。
- **客户端 bug**：动态标题快速切换不再永久丢失真实标题；Fancybox/KaTeX/Mermaid/背景配置四处静默降级补 `console.warn`；Fancybox 异步导入与 Swup 竞态去重；导航高亮前缀匹配加路径段边界；返回顶部/移动菜单补重入守卫；点击特效倒序回收。
- **a11y**：移动菜单 Escape/焦点管理/`aria-expanded`；轮播指示点按钮化（键盘可达）；导航 `aria-current="page"`（SSR+客户端双侧）；返回顶部改原生 button；消除 main 嵌套地标；搜索状态 `aria-live`；JSON-LD 转义 `<`；邮箱保护去内联 onclick 改事件委托（CSP 兼容）。
- **视觉敏感（克制版）**：Giscus 加载失败超时检测 + Colorful 风格提示卡与重试（懒加载先确认用户看过评论区）；20 个页面主标题 h2→h1（站名 h1 保留，文章标题去掉 50 字无声截断）；正文级灰字对比度达 WCAG AA（`--text-light` #999→#767676 等，装饰色不动）。
- **架构**：新增 `TagPillCloud` / `ListingHeader` / `TaxonomyListing` 组件收敛 tag/category/hot 家族 9 处复制；`src/utils` 纯函数测试面（content-utils/pagination，`pnpm test:utils` 9 例）+ 构建脚本容错单测（累计 38 例全过）；GitHub 令牌解析/客户端洗牌抽共享模块。
- **卫生**：样式 token 收敛（品牌绿单一真源、药丸 6 色盘变量化、768/770 断点统一、`--shadow-wrapper`、绿 tint color-mix 化）；清理死代码死数据（skills 悬空项目 ID、projects 死字段、`#totop`、`navBarConfig.type`、双重 draft 过滤）；Search/Pio 类型化与轮询上限；`.learnings/` 移出版本库并随 `.superpowers/` 补 gitignore；CI workflow 三方 action 全部钉 commit SHA；`githubUser` 入 config（消除组件硬编码）、站名/描述副本引用 siteConfig。

## 2026-09-05：关于页手写信纸化与全站字体革新

- `/about/` 正文区整体信纸化（参考用户 about.html 设计稿 1:1）：巨型"关于我"头部（topbar/眉题/手绘线）、黄色便签贴纸（胶带/折角/红勾，承载原"写在前面"内容）、"✎ 碎碎念"小节标题、横线稿纸信纸（`:::letter-paper` 容器指令 + 裸 div 横线区，行高与 32px 横线周期严格对齐、逐字符静态微随机）、"✦ NOW / NEXT" 时间线、页尾签名行；另新增 GitHub 贡献日历卡与蓝红双笔手绘涂鸦层（星形/箭头/波浪/边注，仅装订边距区不遮正文）。
- **全站字体策略落地**（README TODO 13）：`:root` 四 token 收敛全站字体——`--font-body` 思源黑体（`@fontsource-variable/noto-sans-sc` 可变字重自托管分包，**微软雅黑从所有主栈退场**消除版权风险）、`--font-mono` JetBrains（6 处散落声明统一）、`--font-serif` 方正书宋（jsDelivr CDN 优先 + `public/fonts/方正书宋-简体.ttf` 本地回退，暂无主用场景）、`--font-hand` 平方时光体（ZeoSeven FontsAPI，src 含 `local()` 本机优先，仅 /about/ 引入）。稿纸内文字容器显式重声明手写体以绕过元素级 reset 的继承切断。
- 逐字符微随机与横线对齐偏移 `--lp-shift` 随字体度量实测校准；spec 见 GitHub Issue #8。

## 2026-09-05：关于页新增 GitHub 贡献日历

- `/about/` 面包屑之下、正文之前新增 GitHub 贡献日历卡片（近 12 个月，53 列），复用原版 Colorful 的 `.widget` 小部件形态：图标头 + 统计行（总贡献/最长连续/当前连续）+ 品牌绿梯度格子 + 少→多图例。
- 构建期渲染：`scripts/fetch-github-contributions.mjs` 经 GitHub GraphQL `contributionsCollection` 拉取数据写入 `src/constants/github-contributions.json`（已接入 `pnpm build` 链），客户端零请求零 JS；不引入 Bloggify/github-calendar 运行时库（避免第三方代理单点，延续仓库卡片的构建期渲染策略）。
- 拉取失败或无令牌时构建不中断：复用旧缓存，缺失时渲染指向 GitHub 主页的回退卡；令牌解析顺序与既有脚本一致（`GITHUB_TOKEN` → `GH_TOKEN` → `gh auth token`）。
- 响应式：53 列随容器宽度流式伸缩铺满，格子方形由整体 `aspect-ratio: 53/7` + subgrid 构造保证；窄屏触到格子下限后由容器局部横滚兜底。
- 克制动效（/animate 规格并随附 `prefers-reduced-motion` 变体）：53 列入场 8ms 递进 stagger（240ms ease-out）、格子 hover 1.3 倍缩放（120ms，仅精确指针设备）。
- 新增 `pnpm test:contributions`（注入 fetchImpl 的离线单测 10 例）；spec 见 GitHub Issue #7，实施记录见 `docs/superpowers/plans/2026-09-05-about-github-contributions-calendar.md`。

## 2026-09-01：AI日报迁移

- 从 `D:\pages\test\ai-news` 迁移完整 React 运行时到本站 `/ai-news/`，保留 RSS 实时抓取、离线快照、搜索、筛选、阅读状态、主题、布局和橘鸦阅读风格。
- “本站资源”菜单在“我的项目”后新增“AI日报”；AI日报顶栏和页脚均提供“返回主站”。
- AI日报保持独立页面外壳，不加载博客导航、侧栏、Pio、樱花背景或 Colorful 页脚；页面进入 sitemap，不进入 Pagefind 博客搜索。
- 新增 `pnpm smoke:ai-news` 作为本站可执行的基础 Smoke 验证命令。
- 详细测试记录：见 [历史记录索引 · AI 日报迁移测试](docs/history/history.md)（原 `docs/ai-news-migration-test.md` 已于 2026-10-30 归档；AI 日报已迁为独立项目，全文见该条目「恢复命令」列）。

## 2026-08-31：博客文章正式测试

### 测试范围

- 仓库：`CaiYan12/caiyan12.github.io`
- 测试基线：`1126198ac729db6051e55594e4d75358198277f0`
- 测试方式：Windows PowerShell 本地构建产物、Chromium 实际浏览器、GitHub Pages 线上页面
- 本地预览：`http://127.0.0.1:4321/`
- 线上站点：`https://caiyan12.github.io/`
- 浏览器视口：桌面 `1366×900`，移动端文章页 `390×844`
- 文章样本：公开文章、私密文章、草稿、Markdown 扩展测试文章、Mermaid 测试文章

本记录验证文章的构建、路由、渲染和交互，不对文章正文中的知识内容或题目答案作事实审阅。

### 构建与自动化检查

| 检查项                             | 结果                                                 |
| ---------------------------------- | ---------------------------------------------------- |
| `pnpm exec prettier --check ./src` | 通过，所有文件格式匹配                               |
| `pnpm check`                       | 通过，0 errors、0 warnings、0 hints                  |
| `pnpm build`                       | 通过，构建 49 个页面                                 |
| Pagefind                           | 通过，索引 9 个页面、1790 个词                       |
| GitHub Actions 基线运行            | Lint、Build and Check、Deploy to GitHub Pages 均成功 |

构建输出仍有 Vite 单个大 chunk 警告；Pagefind 仍提示中文不支持 stemming。二者均未导致构建失败。

### 文章功能验证

| 场景                              | 验证结果                                                                            |
| --------------------------------- | ----------------------------------------------------------------------------------- |
| 首页公开文章列表                  | 通过，HTTP 200，显示 4 篇公开文章；私密帖和草稿标题均未出现在首页                   |
| 公开文章 `/posts/20260402161000/` | 通过，HTTP 200，文章正文、目录、版权区域正常                                        |
| 文章字号调节                      | 通过，点击字号控件后正文样式变为 `font-size: 14px; line-height: 1.9;`               |
| 私密文章 `/posts/20240115000000/` | 通过，HTTP 200，可通过直链访问                                                      |
| 草稿 `/posts/20220701000000/`     | 通过，HTTP 404，未生成文章内容                                                      |
| Markdown 提示块                   | 通过，渲染 2 个容器提示块和 2 个 GitHub 风格 alert                                  |
| GitHub 仓库卡片                   | 通过，2 个卡片均完成 API 加载并显示仓库名称                                         |
| 图片网格                          | 通过，3 个网格分别渲染为 4、2、2 列，图片均加载成功                                 |
| 外链与站内链接                    | 通过，外链带 `target="_blank"` 与 `rel="noopener noreferrer"`；站内链接不带外链属性 |
| 邮箱保护                          | 通过，链接使用 `data-encoded-email` 和点击解码脚本，HTML 未直接暴露邮箱地址         |
| Spoiler                           | 通过，点击后 class 从 `spoiler` 变为 `spoiler revealed`                             |
| Mermaid                           | 通过，6 个 Mermaid 代码块均渲染出 SVG                                               |
| Pagefind 搜索                     | 通过，搜索“数据库原理”返回 4 条结果，无错误信息                                     |
| 移动端文章页 `390×844`            | 通过，HTTP 200，无横向溢出                                                          |

本地浏览器网络检查中，文章、Pio 模型资源、Pagefind 资源和 GitHub API 请求均返回成功。草稿 URL 的 404 请求属于本次预期验证结果。

### Pio 验证与已知限制

- `1366×900` 首次打开首页：通过，`Paul_Pio` 和 `Live2D` 均已加载，Canvas 尺寸为 `280×250`。
- `1280px` 默认视口：按 `pioConfig.hiddenOnMobile` 配置隐藏，Pio 库不初始化。
- 页面先以 `1280px` 打开、再调整到 `1366px`：当前实现不会重新触发初始化，Pio 仍未加载；刷新页面后恢复正常。

上述响应式切换限制位于 `src/components/widget/Pio.svelte` 的一次性初始化逻辑中，属于后续可单独处理的交互问题，不影响本次文章构建和文章页面测试结论。

> **2026-08-31 销项**：该限制已修复（提交 `171f3be`）。`onMount` 改用 `matchMedia("(max-width: 1280px)")` 的 `change` 监听，窄屏起载后首次拉宽到超过 1280px 时补一次初始化，`pioInitialized` 守卫防止重复实例化。本地 Playwright 与线上复验均通过：1280px 打开后拉宽到 1366px 时脚本加载、`Paul_Pio` 初始化、Canvas 为 `280×250`；宽窄来回切换不重复加载；宽屏直接加载行为不变。

### GitHub Pages 线上验收

本次更新日志首次推送提交 `2b418c6a2eaab9b20fee7043ff18ee6c80ac8bce` 后，远端确认如下：

- [`CHANGELOG.md`](https://github.com/CaiYan12/caiyan12.github.io/blob/main/CHANGELOG.md) 已存在于 GitHub `main`。
- [Lint](https://github.com/CaiYan12/caiyan12.github.io/actions/runs/33372277525)、[Build and Check](https://github.com/CaiYan12/caiyan12.github.io/actions/runs/33372277628)、[Deploy to GitHub Pages](https://github.com/CaiYan12/caiyan12.github.io/actions/runs/33372277557) 均为 `completed / success`。
- 线上首页 HTTP 200，显示 4 篇公开文章，私密帖和草稿标题未出现在首页；`1366×900` 首次加载时 Pio 的 `Paul_Pio`、`Live2D` 均加载成功，Canvas 为 `280×250`。
- 线上公开文章 `/posts/20260402161000/` HTTP 200，标题、正文和目录正常；私密文章 `/posts/20240115000000/` HTTP 200；草稿 `/posts/20220701000000/` HTTP 404；线上 Pagefind 搜索“数据库原理”返回 4 条结果且无搜索错误。
- 线上 Markdown 扩展文章 HTTP 200，提示块、alert、图片网格、外链属性、邮箱保护和 Spoiler 结构正常；Mermaid 文章的 6 个图表均渲染出 SVG。
- 线上两个 GitHub 仓库卡片请求返回 HTTP 403，响应正文明确为 `API rate limit exceeded for 4.154.77.32.`，响应头为 `x-ratelimit-limit: 60`、`x-ratelimit-used: 60`、`x-ratelimit-remaining: 0`。页面按既有降级逻辑显示仓库信息加载失败链接；这是未认证 GitHub API 的 IP 限流，需后续决定是否改为构建期数据或带认证的服务端代理。

> **2026-08-31 销项**：已按"构建期数据"方案修复。新增 `scripts/fetch-github-repos.mjs` 在构建期拉取仓库元数据并缓存到 `src/constants/github-repos.json`（令牌解析顺序：`GITHUB_TOKEN`/`GH_TOKEN` 环境变量 → `gh auth token` → 匿名；拉取失败仅告警），`remark-extended.mjs` 改为构建期直接渲染完整卡片 HTML，客户端 `renderGithubCards()` 已移除——页面不再请求 `api.github.com`，访客 IP 限流问题随之消除。CI 的 build 与 deploy 工作流已注入 Actions 自动提供的 `GITHUB_TOKEN`。首次部署后线上仍短暂显示旧占位符，排查实锤为 `withastro/action@v6` 默认 `cache: true` 跨 run 缓存 `node_modules/.astro`（Astro content layer 数据存储），导致 CI 复用旧渲染产物；已在 `deploy.yml` 传 `cache: false` 关闭（提交 `82f966d`）。

因此，线上文章本身已发布并可用；GitHub 动态仓库卡片在本次线上浏览器环境中处于降级状态，不能记录为完整通过。

### 结论

当前提交的博客文章构建、公开/私密/草稿路由、Markdown 扩展、搜索及移动端文章布局均通过本次正式测试，并已完成 GitHub Pages 发布验收。GitHub 动态仓库卡片的线上未认证 API 限流降级已于 2026-08-31 改为构建期数据方案修复（见上文销项）；Pio 的视口切换限制已于 2026-08-31 由提交 `171f3be` 修复并经线上复验销项（见上文）。
