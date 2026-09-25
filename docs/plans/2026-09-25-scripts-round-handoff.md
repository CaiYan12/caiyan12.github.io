# 交接：脚本层架构加深轮 → 下一轮

- 本轮：spec `docs/plans/2026-09-25-scripts-architecture-spec.md`（issue **#49**，已关闭）／票册 `docs/plans/2026-09-25-scripts-architecture-tickets.md`（镜像 **#50–#58**，已全部关闭）
- 收口时刻：`HEAD` == `origin/main` == `28e5ff5`，工作树干净，开放 issue **0**
- 台账自检：`node scripts/ledger-audit.mjs docs/plans/2026-09-25-scripts-architecture-tickets.md`（联网，含 R5）→ **`9 段 / 0 条不合规 → GREEN`**
- 上位决策：ADR 0001–0004；`AGENTS.md` 的构建链与依赖约束、文档写作约定（Q45-B：锚点用「选择器 + 文件路径」，行号只作辅助且写「约」）
- 本文件性质：**交接文档**，不是待办清单。每条待办都写清「现状 / 为什么本轮没做 / 判据该怎么写 / 风险」，接手者不需要重新推导本轮的实测事实

---

## 一、本轮交付了什么（一句话 + 硬指标）

把 `scripts/` 里重复了四到六份的「台子」与规则收成单一来源，并把构建期 Markdown 管线提成可 import 的模块；**产物逐字节不变**是每票的验收对象之一。

| 项 | 终值 |
|---|---|
| 产物不变量 | **1114 文件 / norm=`7baf45a92c742f60`**，与开工前基线 `output/arch-pre-round.sha.norm` **逐行相同** |
| 四套冒烟判据数 | **9 / 27 / 72 / 121**，全程一项未增减 |
| 链头七组离线单测 | `test:projects` 6+7、`test:nice-books` 51、`test:site-stats` 19、`test:utils` 16、`test:contributions` 11、`test:friend-icons` 32、`test:lib` 14，各 `fail 0` |
| 静态门禁 | `astro check` `0 errors / 0 warnings / 2 hints`；`prettier --check ./src ./scripts` 绿 |
| 线上 | 三条工作流在 `28e5ff5` 全 success；站点根 `Last-Modified: Fri, 25 Sep 2026 02:30:13 GMT` + `Age: 0`；缝隙 A 以线上为基准 **121 项、失败 0 项**；ai-news 线上 **9/9** |
| commit 清单 | `aeaff05` spec+票册 → `b4d74fc` 票01 → `ac4b8f9` 票02 → `87eed09` 票03 → `bb68258` 票04 → `e792124` 票05 → `d15c04f` 票06 → `ec70aec` 票07 → `013786c` 票08 → `458fd17` 台子判形修正 → 台账/收口若干（全表见票册各段状态行与 #49 的交付汇总评论） |

**新增的可复用模块**：`scripts/lib/post-slug.mjs`、`scripts/lib/atomic-write.mjs`（+ `atomic-write.test.mjs`）、`scripts/lib/smoke-harness.mjs`（+ `smoke-harness.test.mjs`）、`src/plugins/pipeline.mjs`。

---

## 二、留给下一轮的五件

### 1. 图片墙漏排序 —— **这是真缺陷，不是重构余债**

- **现状**：`src/pages/images.astro`（约第 10–12 行）用 `filter(isPublicPost).slice(0, 40)` 取图，**没有过 `getSortedPosts`**，因此图片墙的条目顺序取决于 content layer 的遍历顺序，而非「置顶 + 时间」的站点既定全序。
- **为什么本轮没做**：修它必然改变 `dist/images/index.html` 的内容，与本轮硬约束「构建结果逐字节不变」直接冲突（票册「本批不做」已登记）。
- **下一轮该怎么开工**：按 house 流程另立**缺陷票**（不是架构票），红证据取**线上改前产物**的顺序读数，绿证据取改后；判据写成「图片墙顺序 == `getSortedPosts(publicPosts).slice(0, 40)`」这种与实现同源的比较，不要写死一串标题。
- **风险**：顺序一变，`nth-child` 类配色/相位若与位置耦合需复查（本轮之前有过 `.post-list:nth-child(N)::after` 被插入兄弟节点整体换色的先例）。

### 2. 候选 5 —— 页面清单与第三方子树排除表单源化

- **现状**：四套冒烟各自字面写死自己的路径清单，缝隙 B（`scripts/upgrade-style-audit.mjs`）另写一份 24 页清单与排除表。三处清单已经开始漂。
- **为什么本轮没做**：单源化会同时改动四套脚本里的字面路径，而票册对每套冒烟的判据是「**判据数量与失败集合逐行不变**」——任何一次清单迁移都要重新取前后两次读数，工作量与风险都在本轮「9 票 / 一天」的边界之外。
- **建议做法**：独立一票，只动清单来源；把「清单本身」做成可断言对象（数量 + 逐条存在性），并在同一票内先跑一次「用新清单 + 旧代码」证明读数不变。
- **风险**：缝隙 B 的排除表是**实测假阳性清单**（giscus iframe 及其祖先、播放器、轮播、`/ai-news/`、带端口的绝对 url）。合并清单时**一条排除都不能丢**，否则同码两遍也会翻脸。

### 3. 候选 7 —— 导航「当前页态」`navState`

- **现状**：`src/utils/theme-script.ts` 的 `syncNavHighlight()` 与 `Navbar.astro` / `MMenu.astro` 的 `some()` 计算是重复逻辑，但**AGENTS.md 已锁现行形状**（下拉父项与移动菜单两处必须同步修改、`javascript:void(0)` 锚点要跳过、前缀匹配的连带效果属预期）。
- **为什么本轮没做**：一旦 `theme-script.ts` 去 import 一个共享模块，客户端 chunk 名与图结构必然变化，与「逐字节相同」有**真实**冲突（票册原文）。
- **下一轮若要重开**：必须先用一次 `pnpm exec astro build` 的双跑确认冲突范围（`dist/_astro/**` 哪些条目会变），并把它作为「产物会变，需站长单独批准」的票来立项，不能当作纯重构默默做掉。

### 4. 两套 nice-books QA 脚本的迁移（`nice-books-design-qa.mjs` / `nice-books-geometry-qa.mjs`）

- **现状**：`check` 有六种方言的其余两种还在这两个文件里。`geometry-qa` 的签名是 `check(ok, message)`，与其余**参数顺序相反**——把一行判据从 smoke 复制过去会静默错位（`ok` 收到非空字符串于是永远 PASS）。这正是本轮台子要解决的病根，但 QA 脚本**不是门禁**，缺「PASS 数不变」这类硬回归证据，故按站长裁决本批不迁。
- **接口边界已知**：`design-qa.mjs` 的形状是 `check(name, ok, detail = "", extra = {})`，且它把 `extra` **展开进结果行**并**返回布尔**。台子的第四参数位目前只做到「原样挂在结果行上」——**槽位装得下载荷，装不下那两点**（该缺口已写在 `scripts/lib/smoke-harness.mjs` 的 `check` 注释旁）。真要迁，先加宽这两点并配一条测试，别只靠槽位。
- **顺带**：这两个脚本默认端口与 smoke 不同（`design-qa` 默认 4322 preview、`qa:nice-books-geometry` 默认 4321 dev），迁移时按台子的 `defaultBase` 显式声明即可，**不要统一端口**。

### 5. `AGENTS.md` 该补三条本轮实测出的规程

本轮只改了 spec/票册，没动 `AGENTS.md`。下面三条已是「用过、证过」的事实，值得进指令文件，免得下个会话重新踩：

1. **产物不变量的正确口径**：`raw` 逐文件哈希每次构建都变（侧栏「文章推荐」`div.widget.tab-widget` 含构建期随机，实测 122 个 HTML），只有剥掉该块后的 **`norm`** 聚合是精确判据；改构建输入前先做「同码双跑证零噪声」，两侧都先删 `node_modules/.astro` 与 `.astro/data-store.json`。
2. **冒烟台子的契约**：`makeHarness({envVar, defaultBase, launch, isNoise})` **只给零件、不反转控制**；放行策略一律是调用点传的谓词，**台子内部零白名单**；报错汇的 `checkClean` 游标**按汇各存一份**。
3. **`*_BASE_URL` 形态表补一条禁令**：`FANCY_BASE_URL` / `UI_SMOKE_BASE_URL` 要的是**不带结尾斜杠**的站点根——带斜杠时脚本内 `base + "/posts/x/"` 会拼出 `//posts/x/`，浏览器按**协议相对 URL** 解析（host 变成 `posts`），于是一片 `Failed to construct 'URL': Invalid URL` 与 `replaceState` 拒绝的假红。本轮就是这样把一次线上复跑读成 20 项红的。

---

## 三、恢复工作时的操作卡（照抄即可）

```bash
# 浏览器类判据一律走 build + preview，端口固定 4399，不走 dev
pnpm build                       # 会刷新两个 constants，验证后按规程还原
pnpm preview --port 4399

UI_SMOKE_BASE_URL=http://localhost:4399   node scripts/ui-smoke.mjs         # 站点根，无结尾斜杠
FANCY_BASE_URL=http://localhost:4399      node scripts/fancybox-smoke.mjs   # 站点根，无结尾斜杠
NICE_BOOKS_BASE_URL=http://localhost:4399/books/ node scripts/nice-books-smoke.mjs  # 完整页面地址
AI_NEWS_BASE_URL=http://localhost:4399/ai-news/   node scripts/ai-news-smoke.mjs     # 完整页面地址

pnpm test:lib && pnpm check && pnpm exec prettier --check ./src ./scripts
node scripts/ledger-audit.mjs docs/plans/<票册>.md --offline   # 去掉 --offline 才含 R5

# 只比产物、不脏 constants 的确定性重建
rm -rf node_modules/.astro .astro/data-store.json
pnpm exec astro build && node scripts/inject-buddha-banner.mjs && node_modules/.bin/pagefind --site dist
node output/dist-hash.mjs dist output/<名字>.sha    # 读末行 norm，与 7baf45a92c742f60 比
```

纪律（本轮每一票都照着做）：**每一票都要有红证据**，不接受「它本来就是绿的」；锁现状型判据的红证据由**变异验证**提供，且变异必须只打中该管的判据。套件总数**不用 `tail`** 读。

---

## 四、并发会话纪律（本轮最贵的一课）

本轮另有一个 agent 会话在同一时间窗内报告：「已落地 console 零报错门禁（它的票 10、issue #79/#81）、四套冒烟各加一条 `checkClean("全页零 console 报错")`、判据数变为 9+1 / 27+1 / 76 / 125、`AGENTS.md` 与本票册已写入对应段落、已推 `origin/main`」。

**我在五个不同时点核验，本副本与 origin 均无任何对应痕迹**：

- `git status --short` 全程只出现我自己的改动；`git worktree list` 只有 `D:/pages/myblog` 一个副本；`find /d/pages -maxdepth 3 -name 'console-error*'` 无结果
- `git show HEAD:scripts/ui-smoke.mjs` 的 `checkClean(` 始终 **17 处**、`全页零` / `KNOWN_THIRD_PARTY` 命中 **0**；`HEAD:package.json` 无相关 script
- 它引用的四个 sha（`ec73a13` / `808e73f` / `a997567` / `346e61c`）在 `git cat-file -t` 下全部 **"Not a valid object name"**；`git ls-remote origin refs/heads/main` 一直是 `4416cd1`（直到我自己推送）
- `gh issue view 79` / `80` → "Could not resolve to an issue"（本仓库当时最大 issue 为 #58）

**站长裁定：「既然不存在，那就不做。」** 因此本轮四套冒烟未为它增删任何一条判据。

可复用的三条规则：

1. **别的会话给的标识符（sha / issue 号 / 路径 / 行号）一律回自己这侧重取再写进任何耐久记录**。我把 `ec73a13` 抄进票册当票 07 的验收 sha，是 `audit:ledger` 的 **R4**（已验收须引用 HEAD 链上的 sha）自己报红才抓出来，真值 `ec70aec`。
2. **提醒里的「文件内容」片段是关于文件的声明，不是文件本身**——落任何决定前 grep 一次。
3. **先证自检与脚手架的输入是新的，再信它报的红**。本轮两次假红都在这一类：`audit:ledger` 的 R5 读的是本地过期 issue 快照（`output/ledger-issues.json`，刷新 recipe 在脚本头注释：`curl -H "Authorization: Bearer $(gh auth token)" .../issues?state=all -o output/ledger-issues.json`）；`*_BASE_URL` 传成带斜杠的站点根造出 20 项假红。两次都是先怀疑产物、结果红在脚手架侧。

---

## 五、一件未落地的设计（保留，勿当已存在）

「**console 零报错门禁**」的想法本身有价值，本轮按裁决**没有实现**。若要重开，先立项再动代码，并留意当时的真实观察：

- 该会话报过两次真实世界现象：**线上 `/books/archive/` 的 giscus 评论框间歇 502**（本地复现不出、稍后自愈），以及生产页面外部域报错的抖动。本轮我自己的读数是 `NOTE 外部服务请求问题（不计失败）: giscus.app`（票 05 证据）与 `外部 CDN 失败 0 项`（票 06），**没有**遇到 giscus 把冒烟跑红的情况——即：这两条外部抖动观察我无法在本副本复核，标注为 **UNKNOWN（未在本副本复现）**。
- 真要设计，应沿用本轮已定的台子边界：**放行清单必须写在调用点、可被读到**，不能进台子；第三方子树/域的排除要有名字与理由（`AGENTS.md` 里「白名单是缺陷的藏身处」那条教训来自 #41 的死链被 `KNOWN_DEAD` 藏了几轮）。

---

## 六、留档位置

- **票册与 spec**：`docs/plans/2026-09-25-scripts-architecture-{spec,tickets}.md`（每票状态行 = 终态 + sha；每段「证据」行是读数原文）
- **issue 侧**：#49 的交付汇总评论（本轮读数的单一副本）；#50–#58 各贴验收读数后关闭
- **构建与冒烟日志**（gitignored 的 `output/`，本轮全部原始读数）：`t09-build.log`（断网那次）、`t09-build2.log`（`FULL_EXIT=0`）、`t09-det.log`、`t09-final.sha{,.norm}`、`t09-s{1,2,3,4}-*.log`、`t09-prod-ui.log`（20 项假红现场）、`t09-prod-ui2.log`（121/121）、`t09-prod-ainews.log`、`nb-{before,after}.log/.names`、`ui-{before,after,after2}.log/.names`、`arch-*.sha{,.norm}`（票 02/03/08 与开工前基线）、`inj-local.log` / `inj-external.log`（票 05 注入取证）
- **一次性工具**（按站长裁决**不进仓库**）：`output/dist-hash.mjs`（raw/norm 双聚合）、`output/compare-pipeline.mjs`（逐元素等价机械比对）、`output/patch-harness-mut.mjs` / `patch-pipeline-mut.mjs` / `patch-fancybox-inject.mjs`（变异与注入刀）
- **记忆**：`project-myblog-scripts-architecture-round.md`（本轮状态与不变量）、`project-myblog-doc-vs-reality.md`（含「并发会话报来的不存在阻塞与不存在的 sha」两条）、`project-myblog-verification-environment.md`（验证陷阱）、`project-myblog-windows-file-editing.md`（含 `/dev/null` 当输出路径会留下 `nul` 垃圾文件一条）

---

## 七、下一轮开工前的两个待确认项

1. `output/` 下本轮留了约 60 个日志与哈希文件（都是判据原文）。要不要清理或挑几个入库（例如 `dist-hash.mjs`），需站长点头——票册裁决是「不新增仓库脚本、手工双跑比对」，故它们目前只在本地。
2. 待办 5（`AGENTS.md` 补三条规程）属于指令文件变更，按仓库规则需站长明确批准后我再动。
