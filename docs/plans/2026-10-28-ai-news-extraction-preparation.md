# AI日报拆仓准备与技能配置草案

日期：2026-10-28。

状态：Q1–Q11 与测试边界已确认；仓库、工程技能配置和 [SPEC #1](https://github.com/CaiYan12/ai-news/issues/1) 已建立。`/to-spec`、`/to-tickets` 均已完成，七张实施票与八条原生阻塞边已回读核对。尚未移动应用源码、安装依赖、提交代码或切换部署。

> 归档注记（2026-10-29）：本文为 2026-10-28 计划期记录，状态行保留当时原文。实施结果：七张实施票中，`CaiYan12/ai-news` #2–#7 承载 T1–T5 与 T7，主站 #109 承载 T6（跨仓单列，不重复计入 ai-news 票数），七个 Issue 均已关闭；父规格 `CaiYan12/ai-news` #1 仍为 OPEN，未关闭、未改写。

## 1. 已确认目标与授权范围

- 站长确认希望长期经营 AI日报这个独立项目，授权本轮做拆仓的预备准备。
- 保留访问地址 `https://caiyan12.github.io/ai-news/`，保留既有详情 hash 链接。
- 本轮交付现状调查、迁移边界、技能配置草案、分阶段验收与待定事项。
- 站长随后明确授权创建目标仓库；已创建公开仓库并按已确认约定初始化本地工程配置。应用迁移、提交、推送及部署切换尚未执行，也不以本准备文档视为已获执行授权。
- 独立项目交付与客户端性能优化分别验收。拆仓本身不能证明原 C-1 的瘦身目标完成。

### 1.1 对齐记录（仅讨论，不进入下一阶段）

站长已指定本轮使用 `/grill-with-docs` 对齐细节，并明确“不下一步”。以下为已确认的选择，不表示已授权建立规格、创建票据或实施迁移。

- setup A：新项目需求与规格使用 `CaiYan12/ai-news` 的 GitHub Issues，通过 `gh` CLI 操作。
- Q1 项目定位：专注 AI日报的阅读产品，首版继续服务现有橘鸦订阅源；不把通用多源 RSS 阅读器作为本轮目标。
- Q2 首次交付：完整保留现有功能、五套模板与亮暗行为，仅调整独立运行、测试和部署所必需的部分；改版、新功能与性能优化另行安排。
- Q3 数据兼容：保留已有阅读标记、收藏、稍后阅读和设置；兼容验证失败时不正式切换。可重新获取的文章缓存与用户主动保存的记录分别检查。
- Q4 / setup B：保留五个默认分流标签 `needs-triage`、`needs-info`、`ready-for-agent`、`ready-for-human`、`wontfix`。
- Q5 技术路线：采用 Vite + React + TypeScript，保留现有应用运行时依赖版本，不在迁移中更换框架。
- Q6 页面身份：浏览器标题使用“AI 日报”，保留现有界面、图标和返回主站入口；标题与描述由新项目独立配置。
- Q7 Git 历史：以当前稳定代码建立新初始提交，在迁移说明中记录原主站仓库、基准提交及相关历史链接，不迁入筛选历史。
- Q8 工程落点：采用 `D:\pages\ai-news` 与新项目自己的 `AGENTS.md`，使用单上下文文档布局。
- Q9 会话交接：本迁移会话负责迁移实施、上线验证和结案；全部完成后，站长自行在 Codex 建立全新 `ai-news` 项目，承接后续日常更新。本条确定未来工作归属，不解除当前“不下一步”的限制。
- Q10 仓库公开与许可：新仓库公开，应用代码按既有工程约定采用 MIT；订阅内容与第三方资产保留各自来源和声明，发布前核实具体许可归属，不因拆仓而把整个内容集合归入应用代码许可。
- Q11 发布切换：接受受控切换窗口，不预先承诺全过程零中断；先完成本地和产物验证，切换前准备恢复步骤，线上发现关键功能或数据兼容问题时立即恢复服务。原地址、详情链接、用户记录和主站双向导航仍为必须通过项。

会话与初始化约定：

- 新项目建立时必须执行 `/setup-matt-pocock-skills` 初始化，沿用已确认的需求入口、标签词表、单上下文布局和 `AGENTS.md` 选择；读取新目录实际状态、展示最终配置草案后再落盘，不因主站已初始化就跳过新项目配置，也不重复询问无变化的既定选择。
- 本迁移会话继续使用 `myblog` 工作区，暂时负责 AI日报迁移事项；后续获准实施时，本地新项目操作应显式使用 `D:\pages\ai-news`，主站操作仍使用 `D:\pages\myblog`，避免误用工作目录或 Git remote。
- 站长在迁移实施、上线验证和结案完成后自行在 Codex 建立全新 `ai-news` 项目，之后日常更新转入新项目；本会话不代为创建新 Codex 项目或新会话。
- 交接材料应包含本地源码位置、仓库与基准提交、工程约定、实际部署状态、验收证据及遗留事项。

对齐结束时按要求停止，没有自动进入下一阶段。站长随后明确调用 `/to-spec`，授权规格综合及技能规定的规格发布；又明确要求立即创建账号下的目标仓库。当前据此完成仓库创建及此前约定的新项目工程配置初始化，不延伸为拆票、应用迁移、代码提交或部署授权。

本地规格见 [AI日报独立项目迁移 SPEC](./2026-10-28-ai-news-extraction-spec.md)，远端为 [CaiYan12/ai-news #1](https://github.com/CaiYan12/ai-news/issues/1)，标签为 `ready-for-agent`。此前目标仓库返回 HTTP 404 时规格保留本地；站长授权后已创建仓库并向约定目标发布，没有改投主站。尚未运行应用验收。

站长随后明确调用 `/to-tickets` 并确认粒度和依赖，已完成 [七张实施票及八条原生阻塞边的发布与核对](./2026-10-28-ai-news-extraction-tickets.md)。父规格未修改或关闭；当前无阻塞实施票只有 [T1 / ai-news #2](https://github.com/CaiYan12/ai-news/issues/2)，尚未执行应用实施。

### 1.2 后续仍需核实的技术事实

以下为未执行的调查或验证，不是已通过的验收，也不改变上述已确认的范围：

- 新构建工具的具体版本、引擎要求、锁文件及当前应用依赖兼容性。
- 新旧应用在同一份订阅数据上的视觉、行为、过渡和旧用户状态继承，以及生成资源路径。
- 相同 `/ai-news/` 路径的新旧 Pages 发布关系、缓存影响、实际切换顺序和恢复步骤。
- 原始代码与资产的来源声明及适用许可。已核对的本地迁入来源 `D:\pages\test\ai-news` 存在但没有自身 Git 历史，也未提供明确作者或许可声明；不能由目录关系推断原创或授权。
- 主站可删除依赖的实际范围，特别是 OG 构建仍引用的 React 类型与相关依赖关系。

## 2. 现状核对

以下为本轮读取实际文件和 GitHub 返回值所得，历史数据另行注明。

| 项目                       | 核对结果                                                                                                                             |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 主站仓库                   | `CaiYan12/caiyan12.github.io`，本地 `D:\pages\myblog`                                                                                |
| 当前 HEAD                  | `80fee3da65c2c34975d99d69775d70083d8d5f55`                                                                                           |
| 主站技能设置               | `AGENTS.md` 已有 `Agent skills`；`docs/agents/issue-tracker.md`、`triage-labels.md`、`domain.md` 均已存在，无需重复初始化            |
| 主站需求入口               | GitHub Issues，使用 `gh` CLI；PR 不作为需求入口                                                                                      |
| 已安装工程技能             | `setup-matt-pocock-skills`、`triage`、`grill-with-docs`、`to-spec`、`to-tickets` 均有本地技能目录                                    |
| 默认分流标签               | 主站 GitHub 端本轮复核，五个默认角色标签均存在；新仓库的标签不能据此认定已存在                                                       |
| 领域文档                   | 根 `GLOSSARY.md` 与 `docs/adr/`；未发现根 `CLAUDE.md` 或 `GLOSSARY-MAP.md`                                                           |
| 多包结构                   | `pnpm-workspace.yaml` 仅配置 `onlyBuiltDependencies`；`package.json` 无 `workspaces`，无 `packages/`，不足以构成多包项目             |
| 既有架构决策               | `docs/adr/0001-ai-news-independent-react-page.md` 决定纳入 Astro 构建；拆仓将改变其中统一构建部署的决定，需要后续新 ADR 说明替代关系 |
| 当前入口                   | `src/pages/ai-news/index.astro` 原生挂载 `AiNewsApp client:only="react"`，未使用主站 Layout                                          |
| 主站导航                   | `src/config.ts` 中 `/ai-news/` 为 `noSwup: true`                                                                                     |
| 主站 Pages                 | API 返回 `build_type: workflow`、`cname: null`、`html_url: https://caiyan12.github.io/`                                              |
| 新仓库与目录               | 最初读取未找到目标仓库；站长授权后已创建公开仓库 `CaiYan12/ai-news`，克隆到 `D:\pages\ai-news` 并写入工程约定；尚无代码提交          |
| 本轮开始前已有的未提交改动 | `README.md`、原 TODO inventory、两个 GitHub 数据 JSON；内容均保留，新增准备材料另行记录                                              |

根目录本轮未发现名称以 `LICENSE`、`COPYING` 或 `NOTICE` 开头的文件。发布独立项目时需要核对原始来源和资产声明，不能直接把整个内容集合认定为原创 MIT 作品。

## 3. 推荐路线与范围

已确认使用 `CaiYan12/ai-news` 的 GitHub Issues，本地目录为 `D:\pages\ai-news`；目标仓库、本地检出及工程约定现已建立，应用尚未迁入。

已确认技术路线使用 Vite + React + TypeScript，先保留现有运行时依赖版本、功能、五套模板与亮暗行为。新增构建工具的具体版本与兼容性留到技术规格阶段核实，不在本轮虚构版本或安装结果。

首轮不合并 Svelte/Preact 迁移、模板裁剪、RSS 策略改造或其他产品功能。最小 Astro 壳是已讨论但未选用的路线，不同时维护两套应用。

GitHub Pages 的默认项目站点地址包含仓库名，独立仓库可以有自己的构建和发布流程。正式切换前必须实测新项目与旧用户站点相同路径的发布关系，不能预设覆盖优先级或承诺零中断。

参考：[GitHub Pages 站点类型](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages#types-of-github-pages-sites)、[自定义发布流程](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)、[Vite 的 GitHub Pages 部署](https://vite.dev/guide/static-deploy.html#github-pages)。

## 4. 迁移清单与责任边界

| 当前资产或约束                     | 新项目负责                                                                     | 主站负责                                                                         |
| ---------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `src/ai-news/`                     | 接收应用代码、主题、模板、RSS 解析、状态管理与 HTML 消毒边界                   | 新项目验收后移除旧应用；不在准备阶段删除                                         |
| `src/pages/ai-news/index.astro`    | 接管文档入口、标题、描述、无 JS 说明与图标                                     | 最终停止生成旧日报入口 HTML                                                      |
| `public/ai-news/snapshot/juya.xml` | 保留快照和最终公开 URL                                                         | 切换前保留旧资源，清理与回滚按发布步骤执行                                       |
| Tailwind 与 PostCSS                | 提取日报使用的主题变量映射、字体、圆角、工具类和插件配置；按新扫描范围核验样式 | 不复制主站构建链或无关页面配置到新项目                                           |
| 导航与返回主站                     | 保留顶栏、页脚返回主站的行为                                                   | 保留桌面、移动端 `/ai-news/` 导航与完整文档跳转                                  |
| 应用测试                           | 列表、详情、搜索筛选、记录、设置、缩放、模板、过渡与快照回退                   | 保留跨项目入口和返回路径的集成验收                                               |
| `scripts/lib/smoke-harness.mjs`    | 迁移日报测试时明确其辅助模块归属，避免测试依赖主站本地目录                     | 继续服务主站现有测试                                                             |
| SEO 与发现入口                     | 维护新项目自己的页面元数据                                                     | 审核 sitemap 对日报入口的保留方式；不得顺带改变 `#41` 私有文章检查的页面清单来源 |
| README、术语与 ADR                 | 使用 AI日报、订阅源、主站等现有称呼，建立本项目文档                            | 发布后更新主站说明与 C-1 处置记录，保留历史 ADR 原文                             |

### 必须保留的兼容性

1. 路由仍为首页与 `#/issue/` 加转义 GUID，不转换成新的路径路由。
2. 持久化键名为 `ai-daily:v1`，实际数据字段为 `version: 1`；保留设置、文章缓存、历史记录及 GUID 对应关系。新旧页面在同一 origin 下的读取兼容性仍需实测；拆仓不构成 origin 隔离。
3. 订阅源身份 `juya-daily` 和 URL `https://daily.juya.uk/rss.xml` 保持原样。
4. 现有 `SNAPSHOT_URL` 为 `${import.meta.env.BASE_URL}ai-news/snapshot/juya.xml`。若新项目 base 使用 `/ai-news/`，不能原样沿用造成重复前缀；建议新项目文件置于 `public/snapshot/juya.xml`，最终 URL 仍为 `/ai-news/snapshot/juya.xml`。
5. 应用 JS/CSS 应由新项目自己的 base 路径提供，不依赖主站旧 `/_astro/` 文件。
6. `src/ai-news/main.tsx` 虽已存在，但当前 Astro 页面不通过它启动。它包含 `React.StrictMode`，不能未经初始化与事件监听验证就认定可以原样启用。
7. `scripts/ui-smoke.mjs` 含 `astro-island` 结构断言。采用 Vite 时应改为验证原有用户行为，不能直接删除对应覆盖。
8. 现有日报烟测包含 `localStorage.clear()`，后续验证数据继承时不能直接复用这个清空步骤，应使用隔离测试上下文构造旧数据并验证新应用读取。

### 依赖边界

- 当前日报直接使用 `react`、`react-dom`、`zustand`、`lucide-react`、`dompurify`；相关版本以主站 `package.json` 与 lockfile 为迁移起点。
- 不预先承诺从主站删除全部 React 相关依赖：`src/pages/og/[...slug].png.ts` 仍引用 `import("react").ReactNode`，构建与类型依赖须分开核查。
- 不复制主站的 Giscus、项目目录、贡献日历、文章构建、Pagefind 和定时部署任务。日报离线快照如何更新应单独写清，目前未把它认定为自动刷新链路。

## 5. 分阶段计划与验收

### 阶段 0：完成本轮准备

- [x] 核对主站技能配置、领域称呼、GitHub Pages 状态与未提交改动。
- [x] 整理源码、配置、静态资源、状态、测试与跨项目入口的归属。
- [x] 给出技能配置草案、实施顺序与验收边界。
- [x] 完成本准备文档的格式、UTF-8 与改动边界核查。

验收：本轮仅新增准备文档，既有四个未提交文件内容保持不变。无应用改动，本阶段不运行应用构建或浏览器验收，不把它们记为通过。

### 阶段 1：完成新项目工程约定

- [x] setup A 已确认：新项目需求与规格使用 `CaiYan12/ai-news` 的 GitHub Issues。
- [x] setup B 已确认且落地：新仓库五个默认分流标签已回读确认。
- [x] setup C 已确认且落地：新项目的领域文档消费规则使用单上下文布局；未生成空白术语表或 ADR。
- [x] 新项目自己的 `AGENTS.md` 已创建。
- [x] 按此前展示并确认的草案写入 `AGENTS.md` 与三份 `docs/agents/` 配置，完成格式检查及本地文件/remote 核对；主站 `AGENTS.md` 未修改。

验收：新项目的需求入口、分流词表、领域文档位置与工程约定已实际落盘并核对；配置仍为本地未提交文件，未迁入应用源码。

### 阶段 2：对齐范围并形成规格、票据

- [x] `/grill-with-docs`：Q1–Q11 及会话交接边界已确认；具体技术事实与验收尚未执行，见 §1.2。本轮到此停止。
- [x] `/to-spec`：本地规格与测试边界已确认，已发布为新仓库 #1 并应用 `ready-for-agent` 标签。性能瘦身另列后续目标；尚未拆票或实施。
- [x] `/to-tickets`：新项目六票、主站清理一票已发布，八条原生阻塞边（含两条跨仓边）及逐票正文、标签已回读核对，父规格保持原状。
- [ ] 新仓库尚未创建时保留本地规格草稿；创建后再发布到已确认的需求入口，不能把本地草稿称为已立 GitHub 票。

验收：关键取舍与通过标准明确，ADR 对既有统一 Astro 部署决策的替代关系有记录。本阶段为文档工作，仅检查文档与引用。

### 阶段 3：建立独立本地应用

- [x] 新项目建立时已执行 `/setup-matt-pocock-skills` 并完成阶段 1 的实际配置；应用实施尚未开始。
- [ ] 按已确认方案建立应用与锁文件，保留运行时和产品行为。
- [ ] 完成入口、base、快照、样式与测试适配。
- [ ] 在同一份 RSS 测试数据上执行新旧行为与视觉对照。
- [ ] 完成类型检查、单测及生产构建，核查生成资源路径。

验收：新项目不依赖主站源码目录即可安装、检查与构建；五套模板 × 亮暗 × 列表/详情的 20 种视觉组合，以及通用阅读路径、详情跳转与缩放行为符合基线。

### 阶段 4：建立发布并验证原地址

- [ ] 目标仓库已创建；Pages 配置、构建与产物检查尚未执行。
- [ ] 选择实际切换顺序，处理旧 `/ai-news/` 产物与新项目发布关系，保留可执行的恢复步骤。
- [ ] 验证最终地址、详情直接访问与刷新、静态资源、快照回退、旧数据继承、主站双向导航。
- [ ] 记录本地结果、远端 SHA、CI/Pages 结果与线上实际行为，不以 HTTP 200 代替功能验收。

验收：原地址实际加载新项目；关键行为、旧数据、桌面与移动端真实浏览器检查通过；失败时能够按记录恢复服务。

### 阶段 5：主站清理与结案

- [ ] 移除主站旧应用、旧生成入口与经核实不再使用的依赖，更新对应测试与文档。
- [ ] 完成主站类型检查、构建及受影响入口的浏览器验证。
- [ ] 明确 C-1 处置为独立项目方案替代或后续目标转移，不能记录为已完成客户端瘦身。
- [ ] 新项目独立登记性能基线；有明确瓶颈后再选择代码分割或运行时调整。

验收：两个项目各自维护单一有效实现，主站无失效入口，新项目可独立发布；准备、迁移完成与性能收益三种结论有各自证据。

## 附录：新项目技能配置草案（尚未生效）

本附录保留此前用于审阅的配置草案。需求入口、默认标签、单上下文布局与 `AGENTS.md` 文件名均已确认；目标仓库创建后已按该草案完成新项目配置。主站同名配置未修改，当前实际内容以 `D:\pages\ai-news` 下的文件为准。

### `Agent skills` 区块

已确认置于新项目 `AGENTS.md`；不复制主站关于文章、天气等无关约束。

```markdown
## Agent skills

### Issue tracker

本项目的 issue 与 spec 使用 GitHub Issues，通过 gh CLI 操作。见 docs/agents/issue-tracker.md。

### Triage labels

使用五个默认角色标签，贴标签前核实是否存在。见 docs/agents/triage-labels.md。

### Domain docs

使用单上下文布局：根 GLOSSARY.md 与 docs/adr/。见 docs/agents/domain.md。
```

### `docs/agents/issue-tracker.md` 草案

```markdown
# Issue tracker: GitHub

本项目的 issue 与 spec 放在 CaiYan12/ai-news 的 GitHub Issues，使用 gh CLI 操作。

跨仓操作显式指定 --repo CaiYan12/ai-news；涉及主站的票据单独使用 CaiYan12/caiyan12.github.io，正文互链，不能依赖当前工作目录猜测仓库。

多行正文先以 UTF-8 写入文件，再使用 --body-file；在 PowerShell 中不使用 Bash heredoc。

PRs as a request surface: no.

技能要求 publish to the issue tracker 时创建 issue；要求 fetch the relevant ticket 时读取该 issue 的正文、标签与评论。

使用 /wayfinder 时，先读取当前安装技能的操作契约并核实目标仓库的标签、sub-issues 与 dependencies 能力，再建立关系。不能照搬主站历史编号或数据库 id。
```

### `docs/agents/triage-labels.md` 草案

```markdown
# Triage labels

角色与标签同名：

- needs-triage：等待维护者评估。
- needs-info：等待补充信息。
- ready-for-agent：规格完整，可由 agent 实施。
- ready-for-human：需要人工实施。
- wontfix：决定不处理。

操作前读取目标仓库实际标签；缺失时先按已确认的配置创建。主站已有标签不能证明新项目也有。
```

### `docs/agents/domain.md` 草案

```markdown
# Domain docs

使用单上下文布局：根 GLOSSARY.md 与 docs/adr/。

探索、命名、写规格或 issue 前，读取术语表和相关 ADR；使用已确定的称呼，明确 AI日报、订阅源与主站的边界。

文件不存在时继续工作，不预先生成空白术语表或 ADR；仅在项目术语得到确认或真实取舍作出后记录。

发现新方案与既有 ADR 冲突时，明确指出并记录替代关系；保留历史决策原文。
```
