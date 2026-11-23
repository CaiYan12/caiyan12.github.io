# AGENTS.md

## Skill Rule:

按**当前会话宿主注入的技能清单**选用斜杠技能（宿主清单是唯一真源，本文件不再复述条目）。项目专属用法见 `docs/agents/`；改技能行为改下面「Agent skills」三份配置，不重跑 setup。

---

## Running Environment

Your agent and bash are running on:

### System & Device

- Windows 11 Home Chinese Version x64
- Device
- LENOVO Legion Y7000P IRX9
- Intel Core i7-14700HX
- 15.7 GB (16 GB) RAM
- NVIDIA GeForce RTX 4070 Laptop GPU
- Realtek 8852CE WiFi 6E

### Dev Tools

- Shell: PowerShell 7.6.5
- Legacy PowerShell: 5.1 also available
- Git: 2.48.1
- Node.js: 24.18.0
- npm: available through `npm.ps1`
- Filesystem access: unrestricted in the current environment
- Network access: enabled

# Project Info:

**!IMPORTANT: Above are fixed and read-only finale context, you MUST follow these rules strictly, you CANNOT write, delete or add new words when updating or initializing AGENTS.md. Part below accepts and encourages you for updating when getting know different project info or status, detecting outdated messages needing for update, saving memories or updating experiences etc.**

## Agent skills

工程技能（`grill-with-docs` / `to-spec` / `to-tickets` / `triage` / `wayfinder` 等）从下面三份配置读取本仓库约定，改配置即改技能行为，无需重跑 setup。

### Slash 技能发现（2026-10-30）

技能可用性从**当前会话宿主自身提供的技能清单或配置**查起；文件目录（如 `~/.claude/skills/`、`~/.codex/skills/`、`~/.agents/skills/` 等）只是候选来源，不把有限示例当成完整目录表。同名技能多份并存时，遵守宿主自身的解析规则及用户指定的来源，报告实际采用的路径；来源存在歧义时不静默混用。宿主无法加载但允许读取文件时，可读取明确来源的 `SKILL.md`，并准确披露加载方式。不安装、同步或修改技能。

### Issue tracker

本仓库（`CaiYan12/caiyan12.github.io`）的 issue 与 spec 记在 GitHub Issues，一律用 `gh` CLI 读写；PR 不作为需求入口。见 `docs/agents/issue-tracker.md`。

`/wayfinder` 的地图/子票/阻塞边操作也走 GitHub：子票用原生 sub-issues，阻塞用原生 issue dependencies（该仓库两者均已启用，`blocked_by` 取的是数据库 id 不是 `#number`）。**五个 `wayfinder:*` 标签当前不存在**，建图前须先 `gh label create`，否则 `--label` 会 not found 且什么都不建。实测细节见 `docs/agents/issue-tracker.md` 的「Wayfinding reality」一节。

### Triage labels

五个默认标签串（`needs-triage` / `needs-info` / `ready-for-agent` / `ready-for-human` / `wontfix`）是技能侧的**约定词表**，与角色名一一对应，不另设映射。2026-09-24 实测本仓库 GitHub 端只有 `wontfix` 与 `ready-for-agent` 两个；2026-10-06 补建 `needs-triage`（#fbca04）、`needs-info`（#d4c5f9）、`ready-for-human`（#1d76db），五个角色现全部可用。贴标签前仍先 `gh label list` 核可用值（现值现测，本文件不记标签总数）。见 `docs/agents/triage-labels.md`。

### 文档与命令导航

- 写作、归档、同步维护文档时，先读 [文档维护约定](docs/agents/documentation.md)，按改动类型核对同步目标与格式。
- 提交和发布须有对应授权，推送 main 会触发生产部署。发布前核对、分支清理安排、部署身份与等待方式见 [命令文档](docs/agents/commands.md) 的「发布前与收尾安排」和「查 CI / 部署状态」节。
- 跑构建、烟测、一次性探针、CodeGraph 或样式审计前，按 [命令文档](docs/agents/commands.md) 的对应标题读取前置与已知坑。探针保存在 output/<批次名>/，复用判据保存在 scripts/。
- 命令被守卫拦截时，按 [命令文档](docs/agents/commands.md) 的「CC Safety Net 的实测拦截型态与被拦后的处置」与「宿主的批量删除守卫」节处理。

### Domain docs

单上下文布局：根 `GLOSSARY.md` 术语表 + `docs/adr/`（按序编号；**本文件不记份数**，需要现值就 `ls docs/adr/`）。探索、命名或写 issue 前先取用 `GLOSSARY.md` 的既定称呼；ADR 只记「难以回退、有真实取舍、令人意外」的决策。见 `docs/agents/domain.md`。

## 项目背景

WindowsIt 个人博客（WindowsIt's Music Club），由 Emlog Colorful（明月浩空）主题迁移而来的纯静态 Astro 博客。视觉必须还原 Colorful 原版（海洋绿 `#00c000` 主色、白底圆角卡片、自定义光标），技术栈对齐 `D:\pages\mizuki`。迁移任务的完整背景与取舍见 `D:\pages\emlog-to-astro-migration-prompt.md`。

**AI 日报归属（2026-11-02 收尾）**：AI News 移植已完成，独立仓库为 `CaiYan12/ai-news`；本项目不再包含其页面源码、RSS 快照、React 页面运行时或发布实现。主站按 ADR 0009 仅保留 `/ai-news/` 桌面/移动导航、sitemap 条目与边界验证脚本；这些入口不是未清理的实现。历史 ADR、CHANGELOG、文章及项目展示中的引用保留作追溯。项目记忆索引：`.codex/memories/index.md`。

**Nice Books 归属（2026-11-13 收尾，2026-11-23 旧地址退役）**：业务源码、书目、设计与产品 QA 由独立仓库 `CaiYan12/nice-books` 维护；博客保留 `/nice-books/` 导航与 sitemap、归属检查。`/books/` 过渡兼容跳转已按 ADR 0018 退役，旧地址返回 404。切分决定见 `docs/adr/0017-nice-books-separate-deployment.md`，退役决定见 `docs/adr/0018-retire-books-compatibility.md`；迁移、生产验收及清理边界见 `docs/history/nice-books-migration-2026-11-13/README.md` 和 `docs/history/history.md` 第八批。

**元件设计约束（2026-10-06 站长声明）**：新增任何元件前，先最大化复用站内既有设计资产；确需新元件时，其风格与 taste 必须最大化继承既有元件。落地优先级：**直接引用现成组件 → 复用既有类名的 DOM 语法 → 才新写样式**，且新样式的色值 / 字号 / 线型一律取自 `global.css` 既有 token，不引入新设计语言。复用前先看有没有现成的：`ListingHeader.astro`（列表页头）、`WidgetLayout.astro`（侧栏小部件外框）、`PostCard.astro` + `Pagination.astro`（卡片与分页）、`ResponsiveImage.astro` + `getLqipProps()`（带 LQIP 的图）。图标限定在 vendored 的 **Font Awesome 4** 内（`fa-book-open`、`fa-clone`、`fa-layer-group` 这类 FA5+ 新名在本仓库不存在）。

## 深入文档（按需读，别整篇背）

本仓库的参考材料按分支拆开了。**命中下面哪一条，就去读那一份**；别把整份 AGENTS.md 背下来。

| 触发条件                                                                                             | 读哪份                                                                                              |
| ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 查 Colorful 原版某功能本站怎么实现的 / 动主题行为                                                    | `docs/agents/emlog-mapping.md`                                                                      |
| 改任何样式、token、组件类名                                                                          | `docs/agents/styles.md`                                                                             |
| 改天气胶囊、天气判据、天气取数                                                                       | `docs/agents/weather-capsule.md`                                                                    |
| 动客户端脚本、Swup 生命周期、看板娘、Nice Books、评论/表情/统计                                      | `docs/agents/components.md`                                                                         |
| 改构建链、依赖、部署，或**动 remark/rehype 插件**（不删 content layer 缓存会构建出旧 HTML 且无报错） | `docs/agents/build-and-deploy.md`                                                                   |
| 写文章、把外部 Markdown 导进来、生成头图                                                             | `docs/agents/post-authoring.md`                                                                     |
| 跑烟测 / 单测 / 构建期取数 / 票册自检（每条命令的 env 形态与坑）                                     | `docs/agents/commands.md`（含冒烟台子 `makeHarness` / base URL 结尾斜杠 / `norm` 聚合三条承重契约） |
| 领域术语与 ADR                                                                                       | `GLOSSARY.md`、`docs/adr/`                                                                          |
| 想知道某一轮做过什么，或取回已归档的规格 / 票册原文                                                  | `docs/history/history.md`（已归档文档的索引：结果、落地提交、`git show` 恢复命令）                  |
| issue 规范、标签                                                                                     | `docs/agents/issue-tracker.md`、`docs/agents/triage-labels.md`                                      |

## 文档同步

代码与对应维护文档在同一变更中同步。写入事实须有证据，历史实测保留日期与来源。同步清单、CHANGELOG 和 ADR 写法、归档链接及既有裁决的处理见 [文档维护约定](docs/agents/documentation.md)。

## 工作流与阶段授权（门禁级 · 2026-11-05 站长明确声明）

本仓库每一轮任务按 Matt Pocock Skill Driven Workflow 推进。**完整口径**（各阶段前置与禁止项、分支判定、意外变动处理、与 `/ask-matt` 官方默认的覆盖关系）在用户级 `MEMORY.md` 的「阶段授权纪律」节；本节是每轮注入的执行清单。`/xxx` 均为 Matt Pocock 技能，调用形式以当前会话注入的技能清单为准。

- **授权边界**：每一阶段不跳步、不越级，**无明确指令不做下一步**；指令点名哪个阶段就停在哪个阶段，「按推荐」「确认」「继续」只表示采纳当前阶段结论，不构成进入下一阶段的授权。一个会话回合内**决不允许连续超过两个阶段**；即便一条指令明确授权多阶段，本回合最多执行 2 个，其余停下汇报再等指令。
- **前置**：仓库未用 `/setup-matt-pocock-skills` 初始化时才跑；提示词提到 Matt Pocock 或相关 skills 只表示启用本工作流。
- **阶段序列**：第 1 步信息收集 → 第 2 步 GRILLING（`/grill-with-docs` / `/grill-me`）→ 分支「第 2.1 步 `/implement` + `/code-review`」或「第 3 步 `/to-spec` → 第 4 步 `/to-tickets`」→ 第 5 步 `/implement-spec`（独立分支 + worktree + 子代理；子代理不可用即上报暂停，**不在主会话写任何代码**；完成后双轴 `/code-review`，汇报并待站长点头）→ 第 6 步清理（`/pr` 起草 PR → 合并分支 → 清残留分支与 worktree，被安全政策拦**不绕过**，给路径交站长手删）→ 第 7 步 `/retro`（仅报告，由站长选方向）。
- **GRILLING 分支判定**：frontier 清空后跑一次 `/ask-matt` 评判直接 `/implement` 还是建议 `/to-spec`，**由站长决定方向**；`/ask-matt` 为 `disable-model-invocation: true`，须站长显式发起，代理不得自行触发。
- **子代理**：子代理上下文未必包含用户级 `MEMORY.md`，派发 `/implement-spec` 子代理时由 lead 把本节授权边界随任务一并传入；子代理只做被点名的那一票。
- **`/code-review` 前冻结 diff**：本 harness 的 `subagent` 立即返回，审查期间继续改文件会让报告基于旧状态（2026-11-15 实测：spec 审查报的 17/17 与「导出无消费者」在它返回前已修掉）。启动双轴子代理前完成全部编辑（必要时 `git stash create` 取快照），审查期间不改文件；报告须注明审查基准（HEAD / 快照 SHA）。
- **意外变动**：先评估风险；小且一轮可修的可先处理再回主线，影响较大、较复杂的列入 `README.md` 的 TODO 之后单独推进；以任务主线为重。
- **口径冲突**：`ask-matt/SKILL.md` 建议 steps 1–3 连续推进，其 `PHASE-BOUNDARIES.md` 的 "phase" 指上下文管理决策点，与本节 7 个授权阶段**同名不同义**。本节口径优先，不得引用官方默认合理化跳步。

## 常用命令

命令名与参数以 `package.json` 的 scripts 为准（**唯一真源**）。每条命令的用途、前置条件、env 变量形态与已知坑见 `docs/agents/commands.md` —— 要跑烟测/单测/构建期取数/票册自检时先读那一份。

最常用的四个：`pnpm install` / `pnpm dev` / `pnpm build` / `pnpm check`。

提交时有本地 prettier 门禁（只查暂存内容，`git commit --no-verify` 可单次绕过）：启用方式、worktree 影响与边界见 `.githooks/README.md`。

## 环境区分

- 本地交互与布局验证使用开发或预览服务，命令与前置见 [命令文档](docs/agents/commands.md)。Pio 的 dev 渲染、默认折叠及视口边界见 [组件文档](docs/agents/components.md) 的 Pio 条目。
- 生产站为 `https://caiyan12.github.io/`。上线验收关联目标 SHA、Actions、deployment 和实际产物，步骤见 [命令文档](docs/agents/commands.md) 的「查 CI / 部署状态」节。

## 架构要点

### 配置驱动（改配置 = 改站点）

`src/config.ts` 是所有站点行为的控制中心：

- `siteConfig` — 标题、作者、URL、每页文章数、备案号等
- `navBarConfig` — 平铺导航项（首页/微言碎语/留言板）+ 四组下拉：`archiveSite`（文章归档：全部文章 `/archive/` + 标签分类 `/tag/` + 文章分类 `/category/` + 热门推荐 `/hot/`）、`aboutSite`、`extra`、`resourceSite`；`social`（B站/QQ/微信/RSS 图标）仍在 `Navbar.astro` 的 `.m-nav` 渲染；下拉渲染分列在 `Navbar.astro`（桌面 hover 下拉）与 `MMenu.astro`（移动端全屏菜单），**两处必须同步修改**，父项 current 由子链接 `some()` 判定
- `sidebarConfig` — 侧栏小部件顺序
- `commentConfig` — **Giscus 评论**，已开启并绑定 `CaiYan12/caiyan12.github.io` 的 `Announcements` 分类；文章评论区使用 `pathname`，留言板使用 `specific` + `data-term="guestbook"`；`reactionsEnabled: "1"`、`emitMetadata: "0"`；其余 `repoId`、`categoryId`、语言和主题 URL 在 `src/config.ts` 中维护
- `slideshowConfig` — 首页幻灯片（图片在 `public/images/slide/`）

### 内容组织

- 文章：`src/content/posts/<yyyymmddhhmmss>/index.md`（**目录名即 URL slug**，可放封面图在同目录），schema 在 `src/content.config.ts`（posts + spec 两个 collection）
- frontmatter 字段：title/published/category/tags/description/image/pinned/views/comments/hotness(0-5)/draft 等，其中 comments/hotness 用于首页吐槽与热门展示；views 为迁移兼容字段，当前不渲染围观数
- 文章页的分类/标签链接**只对真的生成出来的路由发**（`src/pages/posts/[...slug].astro`）：合法性判据与 `/tag/[tag]`、`/category/[category]` 的 `getStaticPaths` **同源**，即 `getTagList(publicPosts)`／`getCategoryList(publicPosts)` 的名字集合——这两个函数都先过 `isPublicPost`，所以 `private: true` 文章独占的那一项从不生成页面。无路由的项降为**纯文字 `<span>`**，不是整行删除：私有文章若用的是公开分类（实测 `技术` 就是有路由的），链接照常保留。勿改回无条件发 `<a>`，那会重新制造 404（GitHub issue #41）。冒烟 `pnpm smoke:ui` 的 `#41` 三项判据守着这条，**被检页面清单取自 sitemap** 而不是从站内链接爬——私有文章页不被任何公开页链出，爬是爬不到的。**将来若改 sitemap 收录策略，必须在同一笔 commit 里给那条判据换页面清单来源**，否则它会静默退化成「只查公开页」（spec #42 登记的跨轮硬约束）
- 特殊页面：`src/content/spec/about.md`（关于）
- 数据文件：`src/data/diary.ts`（说说）、`friends.json`（友链单一数据源）+ `friends.ts`（`Friend` 类型与兼容导出）、`comments.ts`（开发环境最新评论 mock）、`guestbook.ts`（开发环境留言板单条换一批 mock）、`site-stats.json`（构建期同步快照）
- 相册：**文件夹驱动**——`public/images/albums/<相册名>/` 下放图即自动生成相册（`src/utils/album-scanner.ts` 构建期扫描，中文目录名没问题，slug 用原始名不要预编码）

### 文章 URL 硬规则（必须遵守）

- `src/content/posts/` 的所有直接子目录（公开、私密、草稿、模板示例均包括）必须严格匹配 `^\d{14}$`，格式为 `yyyymmddhhmmss`。
- 文章路由固定为 `/posts/<yyyymmddhhmmss>/`；禁止使用标题、中文或其他自定义目录名作为 slug。
- `published` 只有日期时，时间部分统一补 `000000`；已有时分秒必须与目录名保持对应，不得用文件系统时间替代。
- 新文章使用 `pnpm new-post -- <yyyymmddhhmmss> [标题]`；`scripts/validate-post-slugs.mjs` 已接入 `pnpm build`，目录不合规时构建必须失败。
- 整理旧文章目录后，必须同步检查 README、CHANGELOG、文章正文示例及其他静态引用中的旧 `/posts/.../` 路径。

## 注意

- 原始 Emlog 主题 `D:\pages\limh.me` 的 `module.php` 含 `/e` 修饰符 eval 漏洞、`function/favicon.php`/`image.php` 是开放代理——不可搬回本项目
- 图片等静态资源都放 `public/` 直接引用，不走 Astro 的 import 管线
