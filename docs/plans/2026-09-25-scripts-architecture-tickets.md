# 执行票册：脚本层架构加深（构建结果逐字节不变）

- 来源：`docs/plans/2026-09-25-scripts-architecture-spec.md`（spec）／ issue #49
- 已发布：本册 9 张票 = issue **#50–#58**，全部挂在 #49 下为 sub-issue，阻塞边为 tracker 原生链接；每张票标题下的 `> Issue: #NN` 即其镜像
- 证据登记册：本册各票的 **证据** 行（决策全文与已确认参数在 spec #49）
- 动工前边界：`HEAD` == `origin/main` == `4416cd1`（本轮**不设 tag**，一票一 commit 单点退回）
- 上位决策：ADR 0001–0004；`AGENTS.md` 的构建链与依赖约束、文档写作约定（Q45-B：锚点用「选择器 + 文件路径」，行号写「约」）
- 评审来源：`improve-codebase-architecture` 报告（系统临时目录，不入库）+ 五轮 grilling 的 12 项已确认参数
- **硬约束**：不改变构建结果。T0 票以「diff 范围 + 一次构建产物一致」验收；T1 票（票 08）以「同码双跑标定零噪声 → 改码 → 第三次逐字节比对」验收

## 本文件怎么用（checkbox 更新规则）

- 每张票的 `- [ ]` 是**验收判据**，不是待办清单：一条判据被真实观测到成立才勾，勾时必须能给出证据（命令输出、比对结果、红→绿两次读数）。
- 每张票开工时在其标题下追加一行 `> 状态：进行中 @日期`，完成时改为 `> 状态：已验收（commit sha）`。
- 任何一张票被退回，只回滚该票的 commit，不牵连同批其他票。
- 判据一律断言外部行为（计算值、几何、退出码、产物字节），**不断言 CSS 源文本、类名字符串或行号**。
- 浏览器类判据一律走 `build && preview`（端口保持 **4399**），不走 dev。
- **每一票都要有红证据**：不接受「它本来就是绿的」。锁现状型判据的红证据由变异验证提供。
- 套件总数**不用 `tail`** 读（`test:projects` 串两次 `node --test`）。
- 开册期本册自检必红是预期（票 02 的脚本守的是收口，不是开工）。

## 已确认参数（不再重议）

1. 不新增哈希清单脚本，产物证明走 AGENTS.md 既有确定性配方的**手工双跑比对**。
2. 台子**给零件不反转控制**：`makeHarness({envVar, defaultBase, launch?, isNoise}) → {check, checkClean, finish, base}`。（票 04 实施期：`ignoreExternal` 布尔改成 `isNoise({url, text, base})` 谓词——两套 smoke 需要**按文案**放行，布尔表达不了；零件形状与「不反转控制」原意不变）
3. `check(name, ok, detail, extra?)` 预留第四参数位不消费；`finish()` 输出与退出码格式**逐字不变**。
4. `launch` 默认 headless、可注入；「滚动条类问题必须 headed + msedge」写进注释。
5. 外部服务错误策略由各调用点自传，台子不预设清单。
6. `NICE_BOOKS_BASE_URL` 三个默认值**不统一**（4321=dev、4322=preview 是有意差异），改成显式声明。
7. `atomicWriteJson(path, value)` 内部统一走 `formatJson`；只提 tmp+rename，friend-icons 的锁/备份/回滚留原地。
8. 候选 3 取最小版：只收正则，不改 `validate-post-slugs` / `new-post` 的可注入性。
9. 候选 6 取最小形状：只返回两个数组，不导出顺序清单。
10. 门禁前置进 `pnpm build` 链头，**接受**「纯函数测试红会挡住 Pages 部署」。
11. 两套 nice-books QA 脚本本批不迁。
12. 一票一 commit、**无预览点**、全部完成后等站长同意推送。

## T0 · 工具层（产物无关）

### 01. 把已有的纯函数测试接进 build 门禁
> Issue: #50

**Blocked by**: 无（可立即开始）

**Delivers**：改坏 `content-utils.ts` 的排序规则时 `pnpm build` 当场翻红；写了没人跑的 fixture 测试从此真的会跑。

> 状态：已验收（`b4d74fc`）@2026-09-25

- [x] `pnpm build` 链头追加 `test:utils`、`test:contributions`、`test:friend-icons`（实测 0.4 / 0.4 / 0.6s）　〔新链头连跑读数：`test:utils` **16/16**、`test:contributions` **11/11**、`test:friend-icons` **32/32**；完整构建日志里六组 `ℹ fail 0`（`output/arch-t01-build.log`）〕
- [x] `scripts/site-stats-fixture.test.mjs` 并入 `test:site-stats` 那条 `node --test`，不新增 script 名　〔`test:site-stats` **15 项 → 19 项**；`git show --stat b4d74fc` = `package.json` 1 file changed, 2 insertions(+), 2 deletions(-)，script 名零新增〕
- [x] 不新增依赖、不改任何测试内容本身　〔diff 只含 `package.json`，`dependencies` / `devDependencies` 未动；本轮唯一一次为了红证据改测试（`content-utils.test.ts`）已按备份 `output/arch-red-backup.ts` 逐字节还原〕
- [x] 红证据：故意改错一条纯函数断言 → `pnpm build` 失败并指出哪一组；还原后 exit 0　〔改坏该文件首条断言 → `pnpm build` 停在链头：`✖ src\utils\content-utils.test.ts` / `ℹ fail 1` / `ELIFECYCLE Command failed with exit code 1`，**未**进入 validate / fetch / `astro build`（`output/arch-red-build.log`）；还原后完整构建 `EXIT=0`（`output/arch-t01-build.log`）〕
- [x] 覆盖两条部署路径的理由写清（`build.yml` PR 构建 + `deploy.yml` 的 withastro/action 默认 `pnpm run build`）　〔写在 commit `b4d74fc` 正文：两条路径同时被挡，「AGENTS.md 那条 `getTagList`/`getCategoryList` 必须保持全序」的跨版本硬约束从此拥有门禁〕
- [x] T0 产物证明：`git diff --name-only` 只含 `package.json`；一次 `pnpm build` 产物与基线一致　〔当时记的清单聚合 `b7da37a5ea6a7363`（1114 文件）。**口径修正留档**：票 02 标定出未归一化的 raw 哈希每次构建都变（侧栏「手气不错」随机块），只有剥掉 `div.widget.tab-widget` 后的 norm 才是精确不变量；本票的产物中立由两端夹出——`4416cd1` 回退态（不含本票）构建 norm=`7baf45a92c742f60`，含本票链头改动的票 02／03 构建 norm 同值，详见票 02 证据段〕

**证据**：commit `b4d74fc`；红/绿两份构建日志 `output/arch-red-build.log`（exit 1，指名到组）与 `output/arch-t01-build.log`（`EXIT=0`）。三组新门禁测试跑完 `git status` 不变（friend-icons 的写盘全在 `os.tmpdir()` 的 `mkdtemp` 夹具内、`fsImpl` 注入），本票不引入仓库副作用。

### 02. 文章 slug 规则单源（只收正则）
> Issue: #51

**Blocked by**: 无（可立即开始）

**Delivers**：改文章 URL 规范只动一处正则，而不是四个模块加一个测试夹具各改一遍。

> 状态：已验收（`ac4b8f9`）@2026-09-25

- [x] 新 `scripts/lib/post-slug.mjs`：`isPostSlug(value)`、`listPostSlugs(dir)`　〔出口三个：`isPostSlug` / `listPostSlugs(dirents)` / `slugFromDiscussionTitle(title)`，外加 `POST_SLUG_PATTERN`、`DISCUSSION_TITLE_PATTERN` 两个常量；`posts/<slug>/` 那条标题正则由**同一条** `SLUG_BODY` 拼出，不再各写一遍。刻意不碰 fs：`validate`／`new-post` 用同步 `readdir`，`sync-site-stats` 用 `node:fs/promises` 且跑在 `deploy.yml` 的 `pnpm install` 之前，只能是 Node 内置，故调用方把 dirents 交进来〕
- [x] 5 处 `/^\d{14}$/` 改消费它（`validate-post-slugs.mjs:5`、`new-post.mjs:8`、`sync-site-stats.mjs:22`、`:23` 的标题反解、`sync-site-stats.test.mjs:22`）　〔五处全部改完，含 `sync-site-stats` 内 5 个 `SLUG_RE` 用点 + 目录枚举 + 标题反解；该文件头注释改为指向单一来源〕
- [x] 判据：`grep -rn 'd{14}' scripts/ src/` 命中 **5 → 1**，改前/改后原文留档　〔改前 5 处逐条列在 commit `ac4b8f9` 正文；改后 `grep -rn 'd{14}' scripts/ src/` **命中 1**，即 `scripts/lib/post-slug.mjs` 里那条 `SLUG_BODY`（中途一度为 2，第二处是 `sync-site-stats.mjs` 注释里复述的旧正则，已改写为「14 位数字」措辞）。留档：`output/arch-t02-pre.sha`（回退态）／`output/arch-t02-a.sha`、`output/arch-t02-b.sha`（改后两次）〕
- [x] 红证据：造一个不合规临时目录 → `validate-post-slugs` 仍红；删除后绿　〔`- 20260101a` + `validate exit=1`；删目录后 `文章 URL slug 校验通过：22 个目录均符合 yyyymmddhhmmss。` + exit=0。`new-post` 侧另直量一次：`node scripts/new-post.mjs bad-slug …` → **exit=1**（先前那次经管道取退出码读到 0，是命令串联的假读数，已用直接退出码复测）〕
- [x] 取最小版：不改 `validate-post-slugs` / `new-post` 的顶层执行与 cwd 绑定　〔两文件仍是自己 `resolve("src","content","posts")` + 直接 `process.exit`，只把正则与枚举判定换成 import；`sync-site-stats.test.mjs` 的 19 项全绿〕
- [x] T0 产物证明：diff 只含 `scripts/`；`pnpm build` 产物逐字节不变　〔`git status` 见改动仅 `scripts/` 五个文件 + 新增 `scripts/lib/post-slug.mjs`。完整构建 `FULL_EXIT=0`、`astro build`+banner+pagefind 侧 `DET_EXIT=0`。**本票顺带标定出本轮的产物不变量口径**：同一份代码连跑两次构建 → 未归一化差 **122 个 HTML**、剥掉侧栏「文章推荐」`div.widget.tab-widget` 随机块后差 **0 个**，故 raw 哈希不可当不变量、norm 才是；改前回退态与改后两次构建的聚合均为 **1114 文件 / norm=`7baf45a92c742f60`**（raw 分别 `5afc9392e1b0ae27`、`71cdd172f4498c41`，即构建随机）〕

**证据**：commit `ac4b8f9`。判据链：`grep` 命中 5→1 → 造不合规目录红（exit 1）→ 还原绿（22 个目录通过）→ 同码双跑标定噪声归零（122 raw / 0 norm）→ 改前/改后 norm 同值 `7baf45a92c742f60`。构建改写的两个 constants 文件按既有规程 `git checkout --` 还原。

### 03. 原子写 JSON 收进 scripts/lib
> Issue: #52

**Blocked by**: 无（可立即开始）

**Delivers**：构建被限流/断网打断时，缓存 JSON 要么是旧的有效文件、要么是新的完整文件，绝不会是半截。

> 状态：已验收（`87eed09`）@2026-09-25

- [x] 新 `scripts/lib/atomic-write.mjs`：`atomicWriteJson(path, value)`，内部走 `formatJson`，tmp+rename，失败清理临时文件　〔两层出口：`atomicWrite(filePath, bytes, fsImpl = fs)`（锁表 + 唯一 `.tmp-`/`.bak-` 名 + Windows rename-overwrite 备份位回滚）与其上的 `atomicWriteJson(filePath, value, fsImpl = fs)`（先 `formatJson` 再交给前者）。调用方只交路径与值，锁与回滚不出现在 interface 上〕
- [x] 4 处改调用（projects:309、contributions:206、sync-site-stats:679、friend-icons:490-548）　〔四处各自收成一行 `await atomicWriteJson(...)`；`fetch-friend-icons.mjs` 净减 **71 行**（那份 `atomicWrite` 搬进 lib），其清单写出改走 JSON 版〕
- [x] `fetch-github-repos.mjs:140` 从直接 writeFile 升级为原子写 —— 本票唯一行为变化点　〔现为 `scripts/fetch-github-repos.mjs:141` 的 `atomicWriteJson(OUTPUT_FILE, sorted)`；这是全仓最后一个「崩溃即留半截 JSON」的写盘点〕
- [x] friend-icons 的锁 + 备份 + 回滚留在其自身实现，不把锁塞进通用 interface　〔**按 spec 参数 7 的「实施期修订」执行**：读码发现那份本就是可注入 `fsImpl`、与友链逻辑不缠绕的通用导出函数，故整体搬进 lib 由四点共用；「不塞进 interface」这一条真正守的东西照旧成立——`atomicWriteJson` 只接路径与值，锁/备份位/回滚全在实现里，四个调用点不必学任何新规则。前提修正全文见 spec #49 参数 7〕
- [x] 「不留 `.tmp`」断言从 4 个测试文件收回为 lib 一处；其余调用点契约断言不删　〔lib 一处总账：`scripts/lib/atomic-write.test.mjs` 5 项，含成功路径、写入中途失败、rename 被拒走备份位、换装第二步被打断、并发串行化，并逐目录扫 `.tmp-`/`.bak-` 孤儿。**偏离留档**：四个调用点原有的 `.tmp` 断言一条未删（friend-icons 7 处、contributions 1、projects 1、sync-site-stats 3）——它们各守「本脚本走的是原子写」这条本地契约，删掉等于把契约降级成只在 lib 被测；`git show --numstat 87eed09` 显示测试文件仅 `fetch-friend-icons.test.mjs` 改动 1 行（import 改指 lib）〕
- [x] 红证据：注入一次写入中途失败 → 旧文件完好、无 `.tmp` 残留；撤掉注入后绿　〔变异 A（短路回滚分支）→ `✖ scripts\lib\atomic-write.test.mjs` / `fail 1`。变异 B（删掉 `finally` 里的 `rm(temporary)`）**第一次 5 项仍全绿**——暴露我自己测试的洞：孤儿断言只写在成功路径上；补进「被打断的写入不得留下 `.tmp` / `.bak` 孤儿」后重放同一刀 → `fail 1`，报错文本正是该断言。还原后 5/5 绿、lib 逐字节还原（备份 md5 对齐）〕
- [x] T0 产物证明：四个 constants 产物字节不变；diff 只含 `scripts/`　〔完整构建 `FULL_EXIT=0` 后 `git status` 里只有两个已知会被网络刷新的 constants（`github-contributions.json`、`github-projects.json`）变动并按规程 `git checkout --` 还原；`github-repos.json`、`friend-icons.json`、`site-stats.json` 零 diff。确定性重建 `dist` **1114 文件 / norm=`7baf45a92c742f60`**，与票 02 改前改后同值；diff 文件集为 `scripts/` 六个 + `package.json`（新增 `test:lib` 一条 script 名并前置进链头）+ spec 那一行参数修订〕

**证据**：commit `87eed09`。`test:lib`（5 项）已进 `pnpm build` 链头；其余四组改后读数 `test:friend-icons` 32、`test:projects` 6+7、`test:contributions` 11、`test:site-stats` 19，全部 exit 0。两把变异刀（短路回滚 / 删孤儿清理）各翻红一次，其中第二把先因我测试的洞漏过、补断言后才咬住——这条已在 commit 正文与 spec 里如实记着。

### 04. 冒烟测试台（tracer：台子 + ai-news 迁移）
> Issue: #53

**Blocked by**: 无（可立即开始）。本票是票 05／06／07 的前置。

**Delivers**：写新冒烟复制一份台子就能开工；把一行判据在两套 smoke 之间复制不再出现参数顺序错位（`geometry-qa` 那份 `check(ok, message)` 与其余三种签名相反，错位后 `ok` 收到非空字符串 → 永远 PASS）。

> 状态：已验收（`bb68258`）@2026-09-25

- [x] `scripts/lib/smoke-harness.mjs`：`makeHarness({envVar, defaultBase, launch?, ignoreExternal?}) → {check, checkClean, finish, base}`，不反转控制　〔实际出口 `{base, launch, browser, check, checkClean, createSink, sink, errors, attach, summary, finish}`。台子只管登记判据、采集报错、汇总退出；`ai-news-smoke.mjs` 仍是自己 `chromium.launch()` → 自己导航 → `finally` 关浏览器的线性脚本，迁移只是把重复实现换成 import，**没有**引入 run(page) 式回调〕
- [x] `check(name, ok, detail = "", extra = undefined)`，第四参数位预留不消费　〔`extra` 只入 `results`、不参与输出与退出码；测试「汇总口径与 check 的第四参数位」断言 `summary().failed[0].extra.kind === "qa"`，即形状能承载 `design-qa` 那类结构化附件，为票 11／后续迁移预留〕
- [x] `base` 解析环境变量并**启动时回显实际值与形态**（站点根 / 完整页面地址）　〔实测输出：`[smoke] AI_NEWS_BASE_URL=http://localhost:4399/ai-news/（形态：完整页面/目录地址）`；测试另一侧断言裸 origin 回显「形态：站点根」。AGENTS.md 记过三次传错形态造出「选择器等不到」的假失败，故回显放在启动第一行〕
- [x] `checkClean(label)` 上移进台子（`errors` 由台子持有），其余 smoke 可选调用　〔游标**按报错汇各存一份**：实现期第一版把游标放在台子级（全部汇共用一个整数），A 汇先前进两格就会把 B 汇那条吞成 PASS——已被新增测试逮住并改掉。三处实测：`多页面各一个报错汇，互不污染` 与 `跨报错汇的游标各自独立` 两项守这条〕
- [x] `finish()` 输出与退出码格式逐字保持现状　〔三行与 `scripts/fancybox-smoke.mjs:459-461`、`scripts/ui-smoke.mjs:2440-2442` 逐字相同（仅 `results.length` 换成 `total`）：`合计 N 项，失败 M 项` + `  - 名称` 清单 + `process.exit(failed.length ? 1 : 0)`。`ai-news-smoke` 是四套里唯一「任何报错也算失败」的那套，它按既有口径保留自己的 `结果：N/M 通过` 尾行与退出条件，台子不强行统一〕
- [x] `launch` 可注入、默认 headless；headed+msedge 的适用条件写进注释　〔`launch = {}` 默认值 → 调用点 `browser.launch(harness.launch)`；头注释写明「涉及滚动条宽度、`position:fixed` 包含块、`scrollbar-gutter` 的判据必须 headed + `channel:"msedge"`，因为 headless Chromium 走 overlay 滚动条会把缺陷整个量成 0〕
- [x] `ignoreExternal` 由调用点自传，台子不预设清单　〔**改名并加宽为 `isNoise({url, text, base})`**：`ignoreExternal` 这个布尔表达不了 ai-news 那套需要的**按文案**放行（`[feed] 实时抓取失败` 是设计要演示的分支、`net::ERR_FAILED` 是 `route.abort()` 自己造出来的），也不表达得了「离线页另开一个汇、策略更宽」。台子内零放行清单，两条策略都写在调用点上、可被读到〕
- [x] `scripts/lib/smoke-harness.test.mjs` 前置进 build：canned console error → FAIL；外部错误 → 不计 FAIL；两条各先红后绿　〔8 项全用假 page（`on`/`emit`），不开浏览器不联网。`test:lib` 的 glob `scripts/lib/*.test.mjs` 已随票 03 进链头，本票无需再改 `package.json`。三把变异刀各自翻红：M1 游标退回全汇共用 → 只有 `跨报错汇的游标各自独立` 红（12 pass / 1 fail）；M2 报完不推进游标 → `checkClean 按段归属` + 跨汇项两条红（11/2）；M3 忽略调用点噪声策略 → `外部域报错…不计失败` + `多页面各一个报错汇` 两条红（11/2）。每把刀都只打中该管的判据，改完按备份 md5 逐字节还原后 13/13 绿〕
- [x] `ai-news-smoke.mjs` 退化为薄 adapter：**同一份 dist、不重建**，PASS 数与失败集合完全一致（9 项）　〔74 行改动（30 增 / 44 删），九条判据文案与断言原样保留。同一 `dist`（票 03 后未重建，preview 4399）上两次读数逐字相同：迁移后 9 行 `PASS` + `--- console errors --- (none)` + `结果：9/9 通过`；`git show HEAD:scripts/ai-news-smoke.mjs` 落的改前脚本同跑，除台子新增的 `[smoke]` 回显行外**输出逐行一致**。注意 AGENTS.md 那条：`AI_NEWS_BASE_URL` 传的是完整页面地址，不是站点根〕
- [x] T0 产物证明：diff 只含 `scripts/`、`package.json`　〔实际 diff = `scripts/lib/smoke-harness.mjs`、`scripts/lib/smoke-harness.test.mjs`、`scripts/ai-news-smoke.mjs` 三个（`package.json` 本票零改动，`test:lib` glob 已覆盖）。冒烟脚本与台子都不在任何构建输入的可达路径上（`astro build` 不读 `scripts/`），产物中立沿用票 02／03 已标定的 norm 基线 `7baf45a92c742f60`，收口票 09 再全量复验一次〕

**证据**：commit `bb68258`。`pnpm test:lib` 13 项（原子写 5 + 台子 8）全绿；三把变异刀的红读数与还原后的绿读数如上。ai-news 迁移前后同 dist 双跑逐行一致（9/9、`(none)`）。本票顺带改掉了我自己在台子里写出的一个真缺陷（游标跨汇共享），它是变异验证直接暴露的，不是事后review。

## T0 · 台子推广

### 05. 迁移 fancybox-smoke 到测试台
> Issue: #54

**Blocked by**: 04

**Delivers**：台子的第二个真实 adapter，验证它对「带外部服务策略」的那类脚本也够用。

> 状态：未开始 @2026-09-25

- [ ] 改用 `makeHarness`，删除本地 `check` 与采集/退出码实现
- [ ] 「外部服务单列不计 FAIL、本地资源仍严格判失败」经 `ignoreExternal` 显式表达，语义不变
- [ ] `FANCY_BASE_URL` 默认值与站点根形态原样保留，改成显式传入
- [ ] 同一份 dist、不重建：迁移前后 27 项 PASS 与失败集合完全一致，两次读数留档
- [ ] 放大两项仍按「等原图解码 + 轮询到高度连续一致」，不回退固定毫秒
- [ ] T0 产物证明：diff 只含 `scripts/`

**证据**：（回填）

### 06. 迁移 nice-books-smoke 到测试台
> Issue: #55

**Blocked by**: 04

**Delivers**：`NICE_BOOKS_BASE_URL` 从三份隐式约定变成一处显式声明。

> 状态：未开始 @2026-09-25

- [ ] 改用 `makeHarness`，删除本地 `function check` 与采集/退出码实现
- [ ] 默认端口**不统一**（4321=dev、4322=preview 有意），但显式传入并注明形态是「完整页面地址」
- [ ] 计时判据保持「capture 监听打 `performance.now()` 戳 + settle 后先页面内取差值」形状
- [ ] 同一份 dist、不重建：72 项 PASS 与失败集合完全一致
- [ ] 两套 QA 脚本本票不迁；`check` 第四参数位足以容纳 design-qa 的形状（写一条断言或注释证明）
- [ ] T0 产物证明：diff 只含 `scripts/`

**证据**：（回填）

### 07. 迁移 ui-smoke 到测试台（缝隙 A 本体）
> Issue: #56

**Blocked by**: 04

**Delivers**：本轮验收的主要门禁本身站上台子。

> 状态：未开始 @2026-09-25

- [ ] 改用 `makeHarness`：本地 `check`、`checkClean`、console/pageerror 采集上移
- [ ] 121 条判据一条不增不删不改；`hoverProbe` / `readPills` / `pillsAt` / `sharp` 像素助手留在判据侧
- [ ] `UI_SMOKE_BASE_URL` 仍是站点根形态，显式传入并回显
- [ ] 同一份 dist、不重建：121 项 PASS 与失败集合完全一致，两次读数留档
- [ ] `#45`（微言轮播静息=悬停，含 reduced-motion 冻结取数）与 `#47`（sitemap 160 页负扫「重复 0 条」）两条常驻判据仍有效
- [ ] 迁移后本地 4399 跑一次全绿（线上复跑归票 09）
- [ ] T0 产物证明：diff 只含 `scripts/`

**证据**：（回填）

## T1 · 会被构建消费的一项

### 08. 把 Markdown 管线提成可 import 的 seam
> Issue: #57

**Blocked by**: 无（可立即开始）。建议排在最后做。

**Delivers**：想断言管线的人可以 import 到那 13 个 transform 的数组，而不必 import 整个 `defineConfig`；`astro.config.mjs` 退化成只消费。

> 状态：未开始 @2026-09-25

- [ ] 新 `src/plugins/pipeline.mjs`：`markdownPipeline() → {remarkPlugins, rehypePlugins}`，与 `astro.config.mjs:110-148` 逐元素等价
- [ ] `astro.config.mjs` 只消费，其余配置一字不动
- [ ] 取最小形状：不导出顺序命名清单、不加顺序断言测试
- [ ] **T1 三段式**：① 同一 HEAD 连跑两次完整构建证明 `dist` 自等；② 改码；③ 第三次与基线比 —— `dist/_astro/**` 逐字节 + 全部 HTML 剥 `div.widget.tab-widget` 随机块后相同
- [ ] 两侧都先删 `node_modules/.astro` 与 `.astro/data-store.json`
- [ ] `deploy.yml` 的 `cache: false` 不回退；`@astrojs/markdown-remark` 精确版本对齐不动
- [ ] 构建改写的两个 constants 文件验证后 `git checkout --` 还原

**证据**：（回填：三次构建的哈希对照表 + 差异清单原文）

## 收尾

### 09. 全链验证与交付
> Issue: #58

**Blocked by**: 01–08 全部

**Delivers**：本地全链绿、产物逐字节不变已被证明、票册状态全部回填并被自己的脚本承认。

> 状态：未开始 @2026-09-25

- [ ] 删 content layer 缓存后完整 `pnpm build` 通过（链头此时含新增三组离线测试与台子自测）
- [ ] `pnpm check` 0 errors、`prettier --check ./src ./scripts` 通过
- [ ] 四套冒烟与全部离线单测绿，总数非 `tail` 读法记录，判据数量与开工前一致（9 / 27 / 72 / 121）
- [ ] 最终一次 `pnpm build` 的 `dist` 与开工前基线逐字节相同（T1 归一化：`_astro` 文件名哈希可变、内容不可变）
- [ ] 缝隙 A 以线上为基准复跑全绿（推送部署后，`Last-Modified` 判生效）
- [ ] 每票状态行回填终态 + sha；`pnpm audit:ledger`（含 R5）对本册报 GREEN
- [ ] 两条「本批不做」的登记仍在文档里：图片墙漏排序（另立缺陷票）、sitemap 私有篇（已裁保持现状）
- [ ] 构建改写的两个 constants 文件已还原，工作树干净、`HEAD` == `origin/main`
- [ ] `.design-flow.json` stage 与 next 更新

**证据**：（回填）

## 本批不做（登记，避免被误当回归）

- **候选 5**：页面清单与第三方子树排除表单源化（会同时动四套脚本的字面路径）。
- **候选 7**：导航「当前页态」`navState` —— 一旦 `theme-script.ts` import 它，客户端 chunk 名必变，与「逐字节相同」有真实张力；`AGENTS.md` 已锁现行形状。
- **两套 nice-books QA 脚本**迁移：非门禁，缺「PASS 数不变」这类硬回归证据。
- **图片墙漏排序**（`src/pages/images.astro:10-12` 的 `filter(isPublicPost).slice(0, 40)` 未过 `getSortedPosts`）：真缺陷，但修它必改 `dist/images/index.html` → 另立缺陷票。
- **sitemap 收录私有文章**：站长 2026-09-23 已裁「保持现状」，不重开。
