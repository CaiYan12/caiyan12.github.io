# Spec：脚本层架构加深（构建结果逐字节不变）

- 来源：`improve-codebase-architecture` 评审（报告 `architecture-review-20260925-074855.html`，系统临时目录，不入库）+ 五轮 grilling 的已确认参数
- 镜像 issue：**待建**（parent），子票 8 张
- 上位文档：`AGENTS.md`（构建链与依赖约束、文档写作约定 Q45-B）、`CONTEXT.md` 词汇表、`docs/adr/0001–0004`
- 动工前边界：`HEAD` == `origin/main` == `4416cd1`（本轮不设 tag，一票一 commit 单点退回）
- **硬约束（站长原话）**：「同时保证不改变构建结果」——本 spec 的每一票都必须以产物字节为验收对象之一，不接受「应该没变」

## Problem Statement

这个仓库的**验收文化**建立在两条缝隙上（缝隙 A 冒烟、缝隙 B 计算值指纹），但支撑它们的台子本身是手写重复的：

- `check()` 有 **6 份实现、3 种签名**。其中 `scripts/nice-books-geometry-qa.mjs:14` 是 `check(ok, message)`，与四套 smoke 的 `check(name, ok, detail)` **参数顺序相反**；`design-qa.mjs:45` 又多一个参数。跨文件复制一行判据会静默错位——`ok` 收到一个非空字符串，于是**永远 PASS**。
- `chromium.launch()` 7 处、console/pageerror 采集 6 份、「外部服务不计 FAIL」的判定 4 种写法、`waitFor*` 130 处；同一个 `NICE_BOOKS_BASE_URL` 有 **3 个不同默认值**（4321/localhost、4321/127.0.0.1、4322/127.0.0.1）。漂移已经发生，不是假设。
- 写盘侧：`tmp+rename` 被实现 **4 遍**（`fetch-github-projects.mjs:309`、`fetch-github-contributions.mjs:206`、`sync-site-stats.mjs:679`、`fetch-friend-icons.mjs:490-548`），而 `fetch-github-repos.mjs:140` **直接 writeFile**——崩溃即留下半截 JSON。"不留 `.tmp` 残留"这条不变式靠 4 个测试文件各自复述。
- 文章 URL 规范是最硬的规则（目录名即 slug、构建期校验），但 `/^\d{14}$/` 以 **5 份**正则存在（`validate-post-slugs.mjs:5`、`new-post.mjs:8`、`sync-site-stats.mjs:22`、`:23` 的派生标题反解、`sync-site-stats.test.mjs:22`）。
- `content-utils.ts` 的「标签/分类必须保持全序」是 AGENTS.md 明写的跨版本硬约束，守它的 `test:utils`（16 项，实测 0.4s）**从不在 `pnpm build` 也不在 CI 里跑**；另有 `scripts/site-stats-fixture.test.mjs`（51 行、纯内存、无网络）被任何 script 或 workflow 引用——写了、没人跑。
- 13 个 Markdown transform（7 remark + 6 rehype）内联在 `astro.config.mjs:110-148`，顺序只写在 `:113` 一处注释里；`deploy.yml:37-38` 只能靠 `cache: false` 这种钝器绕开「插件改了但产物是旧的」。

## Solution

把重复的东西收成**有窄 interface 的 module**，并且每一票都用「产物字节」而不是「看起来对」来验收：

| 档 | 含义 | 判据 |
|---|---|---|
| **T0 产物无关** | 改动不进气泡、不写 dist | `git diff --name-only` 只允许 `scripts/`、`package.json`、`docs/`；再跑一次 `pnpm build` 证明产物与基线一致 |
| **T1 逐字节相同** | 改动可能被构建消费（`src/plugins/`、`astro.config.mjs`） | 三段式：① 同一 HEAD 连跑两次完整构建，证明 `dist` 自等（先排除随机与缓存干扰）；② 改码；③ 第三次与基线比——`dist/_astro/**` 逐字节 + 全部 HTML 剥掉侧栏「文章推荐」随机块后相同。两侧都先删 `node_modules/.astro` 与 `.astro/data-store.json` |

已核实 T0 的前提成立：`astro.config.mjs` 不 import 任何 `scripts/` 文件；`src/` 里唯一含 `scripts` 的引用是 `src/nice-books/scripts/shared`（另一个目录）。

## 已确认的设计参数（五轮 grilling，不再重议）

1. **证明口径**：不新增哈希清单脚本，按 AGENTS.md 既有确定性配方**手工双跑比对**。
2. **台子形状**：给零件、**不反转控制**。`makeHarness({envVar, defaultBase, launch?, ignoreExternal?}) → {check, checkClean, finish, base}`；各 smoke 仍自己 launch、导航、关浏览器，保留顶层 `await` 的线性结构。
3. **`check` 签名**：`check(name, ok, detail, extra?)`——第四参数位预留（为将来 `design-qa` 迁移），本批不消费。`finish()` 的输出格式**逐字保持现状**（`合计 N 项，失败 M 项` + 失败清单 + 退出码），因为票册与 AGENTS.md 的读数都引用这个形状。
4. **launch 默认**：仍是 headless `chromium.launch()`，参数可注入；「滚动条宽度类问题必须 `headless:false` + `channel:"msedge"`」写进台子注释。
5. **外部错误策略**：台子只供机制，`ignoreExternal` 由各调用点自传——不把「什么算外部」单源化（白名单是缺陷的藏身处，本批不扩）。
6. **`NICE_BOOKS_BASE_URL` 三个默认值不统一**：AGENTS.md 已写明 4321 是 dev、4322 是 preview，差异**有意**；台子只要求每个调用点显式声明自己的默认值，把隐式约定变成一处可读声明。
7. **`atomicWriteJson(path, value)` 内部统一走 `formatJson`**：与 AGENTS.md「新增写 JSON 产物的脚本请走同一个写入器」同构。**（2026-09-25 实施期修订）** 原写「只提 `tmp+rename`，friend-icons 的锁/备份/回滚留在它自己实现里，因为只有它的负缓存需要回滚」——读码发现这个前提不成立：`fetch-friend-icons.mjs:488-551` 那份是**已经通用**的导出函数 `atomicWrite(filePath, bytes, fsImpl)`，fs 可注入、与友链逻辑不缠绕。于是改为把这份强实现整体搬进 `scripts/lib/atomic-write.mjs`，四个朴素调用点共用它。**interface 仍然是窄的**（`atomicWriteJson` 只接路径与值，锁与回滚在实现里），原先担心的「让调用方学一套用不到的规则」并不因此复活。
8. **候选 3 取最小版**：只收正则，**不**改 `validate-post-slugs`/`new-post` 的可注入性（那是另一笔收益，另案）。
9. **候选 6 保留但取最小形状**：`markdownPipeline() → {remarkPlugins, rehypePlugins}`，不导出顺序清单。
10. **门禁位置**：前置进 `pnpm build` 链头（与现有三组同构）。**后果已确认接受**：纯函数测试红会直接挡住 Pages 部署（`deploy.yml` 的 withastro/action 默认跑 `pnpm run build`）。
11. **两套 nice-books QA 脚本本批不迁**，只靠第四参数位预留形状。
12. **流程**：spec + 8 票镜像 issue（parent = spec issue，`gh` 原生 `--parent`/`--blocked-by`）、一票一 commit、**无预览点**、全部完成后等站长同意推送。

## User Stories

1. 作为写新冒烟的会话，我复制一份现成台子就能开工，以便不必重新决定 console 错误算不算失败。
2. 作为跑 `pnpm smoke:ui` 的站长，我看到的输出格式与计数口径与本轮之前**完全一致**，以便票册里引用的读数仍然可比。
3. 作为评审者，我希望能把「一行判据」在两套 smoke 之间复制而不担心参数错位，以便 `check(ok, message)` 这种方言不再存在。
4. 作为改 `content-utils.ts` 排序逻辑的人，我希望 `test:utils` 在 `pnpm build` 里跑，以便我破坏「全序」这条硬约束时构建当场翻红。
5. 作为直接 push 到 main 的站长，我希望门禁同样挡住部署，以便「测试红」不会悄悄上线。
6. 作为跑构建的人，我希望多出来的门禁只花约 1.4 秒，以便它不会被当成「本地跳过构建」的理由。
7. 作为 `scripts/site-stats-fixture.test.mjs` 的作者（历史会话），我希望它的测试真的被运行，以便它不是幻觉保险。
8. 作为改文章 URL 规范的人，我希望只改一处正则，以便不必记得同步五个地方。
9. 作为被 GitHub API 限流打断构建的人，我希望缓存 JSON 不会留下半截文件，以便下一次构建读到的是旧的有效缓存而不是坏 JSON。
10. 作为读 `fetch-*.mjs` 的人，我希望「原子写」这件事只有一种写法，以便我不必逐文件确认它是否原子。
11. 作为迁移冒烟脚本的会话，我希望每迁一套都有一个明确的回归判据（同一份 dist 上 PASS 数与失败集合不变），以便退回时能定位到具体是哪一套。
12. 作为改 Markdown 管线的人，我希望能 `import` 到 transform 数组而不被拖去 import swup/react/svelte 配置，以便将来能对 fixture 断言。
13. 作为要求「不改构建结果」的站长，我希望每一票都给出可跑的字节级证据（T0 的 diff 范围 + 一次构建，或 T1 的三段式双跑），以便这句话不是口头承诺。
14. 作为下一轮评审者，我希望「图片墙漏排序」与「sitemap 收录私有篇」这两件被登记为**已知但本批不做**，以便它们不会被误当成本批的回归。
15. 作为读 AGENTS.md 的会话，我希望新增的 `scripts/lib/` 模块在常用命令与约定里有一席之地，以便下次不要又造一份。

## Implementation Decisions

### 票 01 · 测试接进 build 门禁（T0）

- `pnpm build` 链头在现有 `test:projects && test:nice-books && test:site-stats` 之后追加 `test:utils`、`test:contributions`、`test:friend-icons`（实测 0.4s / 0.4s / 0.6s）。
- 孤儿 `scripts/site-stats-fixture.test.mjs` 并入 `test:site-stats` 那条 `node --test`（同属 site-stats 读取层，纯内存 fixture，不新增 script 名）。
- 台子自己的测试（票 04 引入）同样前置进 build。
- 不新增依赖；不改任何测试内容本身。

### 票 02 · 文章 slug 规则单源（T0，最小版）

- 新 `scripts/lib/post-slug.mjs`：`isPostSlug(value)` 与 `listPostSlugs(dir)`（返回排序后的目录名数组）。
- 5 处消费它：`validate-post-slugs.mjs`、`new-post.mjs`、`sync-site-stats.mjs`（含 `posts/<slug>/` 标题反解那条派生正则）、`sync-site-stats.test.mjs` 的夹具过滤。
- **不改** `validate-post-slugs` / `new-post` 的顶层执行形态与 cwd 绑定（那是候选 3 的最大版，本批按已确认参数取最小）。

### 票 03 · 原子写 JSON（T0）

- 新 `scripts/lib/atomic-write.mjs`：`atomicWriteJson(path, value)` —— 内部走 `scripts/lib/write-json.mjs` 的 `formatJson`，写临时文件后 `rename`，失败路径清理临时文件。
- 4 处改调用；`fetch-github-repos.mjs` 从直接 `writeFile` 升级为原子写（**唯一的行为变化点**：崩溃不再留半截 JSON；产物内容不变）。
- `fetch-friend-icons.mjs` 的锁 + 备份 + 回滚**留在原实现**，只把其中的 tmp+rename 部分复用 lib。
- 「不留 `.tmp` 残留」的断言从 4 个测试文件收回为 lib 的一处测试（其余测试保留各自的调用点契约断言，不删）。

### 票 04 · 冒烟测试台 + ai-news 迁移（T0，tracer bullet）

- 新 `scripts/lib/smoke-harness.mjs`：`makeHarness({envVar, defaultBase, launch?, ignoreExternal?})` → `{check, checkClean, finish, base}`。
  - `check(name, ok, detail = "", extra = undefined)`；`extra` 预留不消费。
  - `base` = `process.env[envVar] ?? defaultBase`，启动时**回显实际 base 与形态**（缓解 AGENTS.md 记的「三种形态传错就是假失败」）。
  - `checkClean(label)`：按票归属报「本段无新增 console/pageerror」，`errors` 数组由台子持有（`ui-smoke` 现有能力上移，其余 smoke 可选调用）。
  - `finish()`：输出与退出码格式**逐字不变**。
  - `launch` 可注入，默认 headless `chromium.launch()`。
  - `ignoreExternal` 由调用点传入，台子不预设清单。
- 新 `scripts/lib/smoke-harness.test.mjs`（进 build 门禁）：灌一条 canned console error → 必须记 FAIL；灌一条外部错误 → 必须不计 FAIL。两条各先红后绿（变异式自证）。
- `ai-news-smoke.mjs`（114 行，最小）退化为薄 adapter。判据：**同一份 dist、不重建**，迁移前后 PASS 数与失败集合完全一致（9 项）。

### 票 05 / 06 / 07 · 其余三套 smoke 迁移（各 blocked by 票 04）

- 顺序 `fancybox(461) → nice-books(1042) → ui-smoke(2442)`；每票一个 commit，判据同上（27 / 72 / 121 项，同一份 dist 不重建）。
- `ui-smoke` 的 `sharp` 像素比对助手与 121 条判据**留在判据侧**，不进台子（台子只 own 台子的事）。
- 各 smoke 的 `*_BASE_URL` 默认值原样保留（含形态差异），只是改成显式传给 `makeHarness`。

### 票 08 · `markdownPipeline()`（T1，唯一带产物风险）

- 新 `src/plugins/pipeline.mjs`：`markdownPipeline()` 返回 `{remarkPlugins, rehypePlugins}`，数组元素与顺序与 `astro.config.mjs:110-148` **逐元素等价**；`astro.config.mjs` 改成只消费。
- 不新增顺序断言清单（已确认取最小形状）；顺序仍由 AGENTS.md 那条 `resolveConfig` / expressive-code 结论与双跑比对共同守。
- 验收三段式（见 Solution 的 T1）：同码连跑两次自等 → 改码 → 第三次比对。

## Testing Decisions

- **每一票都要有红证据**，不接受「它本来就是绿的」：票 01 故意改错一条纯函数断言让 `pnpm build` 失败；票 02 用一个不合规临时目录证明校验器仍会红；票 03 让写入中途抛错，证明旧文件完好且无 `.tmp` 残留；票 04 的台子测试用两条 canned 事件各先红后绿；票 05–07 的「PASS 数与失败集合不变」在同一份 dist 上前后各跑一次；票 08 用同码双跑先证明比对本身有判别力。
- **不变量**：四套 smoke 的判据数量与输出格式在整个批次里**一项都不增减**（9 / 27 / 72 / 121）。任何计数变化即视为该票失败。
- **产物证明优先于口头断言**：T0 票的 `git diff --name-only` 范围 + 一次构建；T1 票的三段式双跑。
- 既有门禁不回退：`pnpm check` 0 error、`prettier --check ./src ./scripts` 全绿、`pnpm audit:ledger` 对新票册在收口时报 GREEN。
- 读总数**不用 `tail`**（`test:projects` 串两次 `node --test`，上一轮因此把 138 记成 132）。
- 先例可参照：`scripts/ledger-audit.mjs` 的「把票册契约变成可跑判据 + 变异证明」形态。

## Out of Scope

- **候选 5**（页面清单与第三方子树排除表单源化）：与台子相邻，但会同时动四套脚本的字面路径，本批不做。
- **候选 7**（导航「当前页态」`navState`）：一旦 `theme-script.ts` import 它，客户端 chunk 名必变，与「逐字节相同」有真实张力；且 `AGENTS.md` 已锁「两处必须同步修改」的现行形状。
- **两套 nice-books QA 脚本**迁移：不是门禁，缺「PASS 数不变」这类硬回归证据，只预留 `extra` 参数位。
- **图片墙漏排序**（`src/pages/images.astro:10-12` 的 `filter(isPublicPost).slice(0, 40)` 没有 `getSortedPosts`）：真缺陷，但修它必改 `dist/images/index.html` → **另立缺陷票**，不混进重构。
- **sitemap 收录私有文章**：站长 2026-09-23 已裁「保持现状」，不重开；相关硬约束已在 `AGENTS.md`。
- 不改 `validate-post-slugs` / `new-post` 的顶层执行与 cwd 绑定；不改任何判据内容；不动 vendored 文件；不引入依赖；不碰 ADR 0001–0004 已裁决项；`deploy.yml` 的 `cache: false` 不回退。

## Further Notes

**票序与阻塞边**：01、02、03、04、08 互不阻塞可并行；05←04、06←04、07←04；收口票 blocked by 全部。建议执行序 `01 → 02 → 03 → 04 → 05 → 06 → 07 → 08`（台子链先走完，最后做唯一带产物风险的 08）。

**环境**：预览端口保持 **4399**（自定义光标是带端口的绝对 url，换端口造数千条假差异）；构建会改写 `src/constants/github-contributions.json` 与 `github-projects.json`，验证后 `git checkout --` 还原；`fonts.googleapis.com` 抖动会让 `astro build` 在 `/og/*.png` 失败且 `dist/` 已被清空，须整链重跑；工作树可能有并行会话，任何依赖树状态的结论前重跑 `git status` / `git log --oneline -5`；**禁止裸 `git stash`**。

**本轮新增的像素教训**（写给下一位）：任何**像素级**比对都要先遮 `img.bg-image` / `.bg-image-pattern` —— 背景照片每次构建随机换，而侧栏卡片是 `rgba(255,255,255,0.84)`，会透出全域 ≤6/通道 的假色差；计算值指纹免疫，像素图不免。

**若本 spec 与 `AGENTS.md` 冲突**：以 `AGENTS.md` 与实测读数为准，并回改本文件。
