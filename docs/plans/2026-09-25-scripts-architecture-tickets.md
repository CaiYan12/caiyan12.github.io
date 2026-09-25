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
2. 台子**给零件不反转控制**：`makeHarness({envVar, defaultBase, launch?, ignoreExternal?}) → {check, checkClean, finish, base}`。
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

> 状态：未开始 @2026-09-25

- [ ] `pnpm build` 链头追加 `test:utils`、`test:contributions`、`test:friend-icons`（实测 0.4 / 0.4 / 0.6s）
- [ ] `scripts/site-stats-fixture.test.mjs` 并入 `test:site-stats` 那条 `node --test`，不新增 script 名
- [ ] 不新增依赖、不改任何测试内容本身
- [ ] 红证据：故意改错一条纯函数断言 → `pnpm build` 失败并指出哪一组；还原后 exit 0
- [ ] 覆盖两条部署路径的理由写清（`build.yml` PR 构建 + `deploy.yml` 的 withastro/action 默认 `pnpm run build`）
- [ ] T0 产物证明：`git diff --name-only` 只含 `package.json`；一次 `pnpm build` 产物与基线一致

**证据**：（回填）

### 02. 文章 slug 规则单源（只收正则）
> Issue: #51

**Blocked by**: 无（可立即开始）

**Delivers**：改文章 URL 规范只动一处正则，而不是四个模块加一个测试夹具各改一遍。

> 状态：未开始 @2026-09-25

- [ ] 新 `scripts/lib/post-slug.mjs`：`isPostSlug(value)`、`listPostSlugs(dir)`
- [ ] 5 处 `/^\d{14}$/` 改消费它（`validate-post-slugs.mjs:5`、`new-post.mjs:8`、`sync-site-stats.mjs:22`、`:23` 的标题反解、`sync-site-stats.test.mjs:22`）
- [ ] 判据：`grep -rn 'd{14}' scripts/ src/` 命中 **5 → 1**，改前/改后原文留档
- [ ] 红证据：造一个不合规临时目录 → `validate-post-slugs` 仍红；删除后绿
- [ ] 取最小版：不改 `validate-post-slugs` / `new-post` 的顶层执行与 cwd 绑定
- [ ] T0 产物证明：diff 只含 `scripts/`；`pnpm build` 产物逐字节不变

**证据**：（回填）

### 03. 原子写 JSON 收进 scripts/lib
> Issue: #52

**Blocked by**: 无（可立即开始）

**Delivers**：构建被限流/断网打断时，缓存 JSON 要么是旧的有效文件、要么是新的完整文件，绝不会是半截。

> 状态：未开始 @2026-09-25

- [ ] 新 `scripts/lib/atomic-write.mjs`：`atomicWriteJson(path, value)`，内部走 `formatJson`，tmp+rename，失败清理临时文件
- [ ] 4 处改调用（projects:309、contributions:206、sync-site-stats:679、friend-icons:490-548）
- [ ] `fetch-github-repos.mjs:140` 从直接 writeFile 升级为原子写 —— 本票唯一行为变化点
- [ ] friend-icons 的锁 + 备份 + 回滚留在其自身实现，不把锁塞进通用 interface
- [ ] 「不留 `.tmp`」断言从 4 个测试文件收回为 lib 一处；其余调用点契约断言不删
- [ ] 红证据：注入一次写入中途失败 → 旧文件完好、无 `.tmp` 残留；撤掉注入后绿
- [ ] T0 产物证明：四个 constants 产物字节不变；diff 只含 `scripts/`

**证据**：（回填）

### 04. 冒烟测试台（tracer：台子 + ai-news 迁移）
> Issue: #53

**Blocked by**: 无（可立即开始）。本票是票 05／06／07 的前置。

**Delivers**：写新冒烟复制一份台子就能开工；把一行判据在两套 smoke 之间复制不再出现参数顺序错位（`geometry-qa` 那份 `check(ok, message)` 与其余三种签名相反，错位后 `ok` 收到非空字符串 → 永远 PASS）。

> 状态：未开始 @2026-09-25

- [ ] `scripts/lib/smoke-harness.mjs`：`makeHarness({envVar, defaultBase, launch?, ignoreExternal?}) → {check, checkClean, finish, base}`，不反转控制
- [ ] `check(name, ok, detail = "", extra = undefined)`，第四参数位预留不消费
- [ ] `base` 解析环境变量并**启动时回显实际值与形态**（站点根 / 完整页面地址）
- [ ] `checkClean(label)` 上移进台子（`errors` 由台子持有），其余 smoke 可选调用
- [ ] `finish()` 输出与退出码格式逐字保持现状
- [ ] `launch` 可注入、默认 headless；headed+msedge 的适用条件写进注释
- [ ] `ignoreExternal` 由调用点自传，台子不预设清单
- [ ] `scripts/lib/smoke-harness.test.mjs` 前置进 build：canned console error → FAIL；外部错误 → 不计 FAIL；两条各先红后绿
- [ ] `ai-news-smoke.mjs` 退化为薄 adapter：**同一份 dist、不重建**，PASS 数与失败集合不变（9 项）
- [ ] T0 产物证明：diff 只含 `scripts/`、`package.json`

**证据**：（回填）

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
