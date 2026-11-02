# Astro 7 升级实施与 A/B 验收

> 本文保留初轮升级验收记录。随后用户授权处理剩余项，图标、本轮文集竞态、相册错误归属/采集和两处宽度变化的最新结论见 [剩余项收口](2026-11-02-astro7-followup.md)；下文当时的 REVIEW 和未知归属不再代表最新收口状态。

日期：2026-11-02。依据：[升级复核报告](2026-11-02-build-system-upgrade-recheck.md)。本轮只升级报告中的六包联动组，不升级 Tailwind、TypeScript、Prettier 或包管理器；不推送、不部署。

## 阶段与验收标准

- [x] 阶段一：保存工作树差异、当前依赖、同数据完整产物与浏览器基线。验收：旧版构建成功，保存路由/正文/资源清单、桌面与移动截图、样式指纹及交互结果。
- [x] 阶段二：安装六包联动组，处理 HTML 空白、Vite 日志压缩配置及 CI Node。验收：严格 peer 安装成功；其他直接安装版本保持；check、单测、构建通过。
- [x] 阶段三：同数据产物 A/B。验收：路由、正文、公式、代码块、OG、索引有明确差异归因；桌面/移动样式与截图检查通过；新增异常被修复或明确记录。
- [x] 阶段四：生产产物与 dev 浏览器回归、最终审查、文档同步。验收：Swup 前进/后退、Svelte 水合/重复进入、灯箱、搜索、壁纸与入口边界实测；天气服务单测通过，但本轮未重跑独立天气定位烟测；保留证据和未覆盖边界。

## 执行约定与记录

- 用户已要求在当前项目执行可信升级；依仓库规则不新建分支，保留现有 AI News 收尾改动。基线是这些清理后的实际源码，不是 HEAD 的旧实现。
- 配置迁移用真实构建与语义对照验证，不为版本字符串另写镜像测试；遇到实际行为回归时先复现再修复。
- 所有一次性脚本、构建副本、原始日志与截图放 `output/astro7-upgrade/`。不清理其他任务的证据目录。
- 比较必须使用同一份内容与快照。资源 hash 变化不直接判失败；先验证语义、计算样式与交互。第三方网络和随机组件差异单独记录，不能用过滤掩盖本站报错。

## 已有实测证据

- 安装：`pnpm install --strict-peer-dependencies --store-dir .pnpm-store --registry https://registry.npmjs.org` 成功；再执行 `pnpm install --frozen-lockfile --strict-peer-dependencies --offline --ignore-scripts --store-dir .pnpm-store` 成功。六包之外的直接安装版本未变，原始依赖记录为 `installed-before.json` / `installed-after.json`。
- 构建：两侧同内容、同快照，运行 `NODE_USE_ENV_PROXY=1 pnpm exec astro build`，再运行 `inject-buddha-banner.mjs` 与 `pagefind --site dist`。Astro 均为 229 页，完整输出均为 230 个 HTML（包含 public 下的独立静态页）。不是完整 `pnpm build` 的联网快照刷新；本轮刻意固定输入，避免把新数据误当编译变化。
- 产物：路由、标题、链接、图片、代码文本、公式文本/数量、表格数量及岛屿组件清单一致。49 页总文本有空白差异，去空白后无差异；保留逐项原始差异 `semantic-diff.json` / `text-diff-details.json`，不把非字节一致写成全量零差异。Pagefind 目录 53 个文件、OG 目录 33 张图片逐字节一致。
- 资源：全产物 JS 101→137 个、4,462,161→4,418,614 字节；CSS 均 15 个、840,715→833,324 字节；最终复核 HTML 14,523,360→14,603,070 字节（构建期随机推荐使 HTML 原始字节数可小幅波动）。含 vendored/public 文件，不能据此声称真实访客传输或性能提升；是本轮同数据构建记录。
- `pnpm check`：0 errors / 0 warnings / 6 hints。项目、好书、站点统计、utils、贡献、友链图标、lib、天气、console fixture 测试通过，原始日志按 `test-*.log` 保存。日志压缩探针先实测失败（旧 esbuild 配置仍打印两条），迁移 Oxc 后通过，并验证日志实参副作用和 warn/error 保留。
- 浏览器：升级前后 UI 烟测均 142/142；新版好书 72/72、Fancybox 27/27、壁纸 47/47、AI News 主站入口在 1280/390 两档通过。文集首次 87/88（目录防抖判据 max=1564/start=1550/fin=1381），旧版对照 88/88，单独确认新版 88/88；保留首次失败，不能称该判据稳定性已经修复。
- 控制台门禁：两侧均完整采集 23/23 页，均为 REVIEW，均仅 `/skills/` 的 32 个 Iconify 外域请求待复核；没有新增门禁失败，不能把 REVIEW 改称 PASS。
- 视觉：先后对 8 页 × 桌面 1440/移动 390 采集截图；初次发现随机语录与樱花时序噪声。进一步固定 `crypto.getRandomValues` 选句、隐藏 canvas 后，16 组同状态首屏截图像素差异为 0。此仅为确定性截图实验；实机烟测没有拦截外部流量。原始与固定截图都保留，不覆盖失败证据。
- 样式指纹：声明的 23 页均完成。原始比较为 23/23 页、5428 元素差异；主要是 Lightning CSS 的 `0% 0%`→`0px 0px`、隐式渐变终点→`100%`、`to right`→`90deg` 等等价写法，不强行判字节相同。剩余包含随机语录影响文档高度、Iconify 成败影响技能图标回退，以及两处行内空白导致链接宽度约 +2.5/+3px。原始日志及归一化逐项结果见 `style-diff.log` / `style-normalized-details.json`，未发现主体布局、字体或交互异常。

## dev 首次失败与修正

首次 dev 内容初始化发生 Vite `fetchModule` RPC 超时，并出现 posts 集合为空；这是实际失败，HTTP 200 不足以验收。第二次带 DEBUG 重启成功同步内容，但约 73 秒才 ready。没有证据证明 logger 源码循环；此前该猜想未作为修复依据。API 启动的 CPU profile（`dev.cpuprofile`）显示主要样本在 Node `FSWatcher.start` → Vite watcher 注册，而不是用户插件执行。

用临时配置只排除 `.pnpm-store` 和 `output` 后启动 13.131 秒、内容同步正常；正式配置采用相同排除，默认 CLI 的 `dev-final.log` 显示 13.359 秒启动、真实文章与相册返回成功，未再出现内容集合为空。Vite 自定义 ignored 追加到默认排除项；源码仍受监听。未增加 RPC 超时，未持久化试验过的 logger external 配置，未改 node_modules。此为本机含较多缓存/证据文件的结果，不外推为所有用户启动性能。

`hmr.log` 验证 `src/content/spec/about.md` 追加标记后自动刷新、恢复后自动消失；`hmr-ui.log` 验证 global.css 的实际计算属性与 Search.svelte 的 DOM 占位文字都随修改/恢复更新。三份源文件最后逐字节等于原内容。`journey.json` 记录生产搜索得到 12 条结果、返回后仍为 12 条；Swup 保持同一文档、历史前进/后退、Pio 水合及唯一性通过，dev 与生产的 KaTeX 字体/字号在切页往返后均保持。

初次 dev 灯箱运行在服务尚未 ready 时连接被拒；服务已启动后又因结束临时服务中断一次运行。这两次脚手架失败保留日志，不当作应用测试通过。最终正式服务 `fancybox-dev-final.log` 为 27/27，但其错误监听只覆盖首个文章页；dev 日志后来捕获到相册页 `Script error.`，不能被该烟测的零错误覆盖。随后 `album-errors.json` 对相同相册分别在旧产物、新产物、dev 中完整挂载 window error/unhandledrejection、pageerror 和 requestfailed：三组观察均未复现脚本错误，仅都有播放器 `err.mp3` 的 `ERR_ABORTED` 请求。**不能据此证明原错误来源于播放器**；原始 opaque 错误来源仍未确定，保留为待复核边界，没有新增放行规则。

## 边界与剩余项

- 未运行完整 `pnpm build` 的联网快照刷新，比较用相同数据执行静态构建与发布后处理；没有把外部数据刷新带来的变化混进升级结论。
- 原始样式指纹有差异，正文空白也不是字节一致；两处行内链接宽度约增加 2.5/3px，未发现布局或命中区损坏，保留为轻微视觉差异，不为此扩大组件改动。
- 文集防抖判据出现一次间歇失败，单独确认通过不等于稳定性缺陷已修复；外部图标 console REVIEW 保持原判。
- dev 相册一条 opaque `Script error.` 未复现、来源未确定；不能宣布所有观察窗口始终零异常。
- CI/Linux、其他浏览器、线上 Pages 和独立 AI News 内部旅程未验证；未新建分支、提交、推送或部署。

## 最终复核

最终配置重跑 `pnpm check`（0 errors / 0 warnings / 6 hints）和 `NODE_USE_ENV_PROXY=1 pnpm exec astro build`（229 页），再执行 banner / Pagefind 后处理、语义比较与 AI News 边界检查，均完成。日志为 `check-final.log` / `build-final.log` / `pagefind-final.log` / `semantic-diff-final-summary.log`。Prettier 检查整个 src/docs 及本轮配置、README、CHANGELOG 通过；`git diff --check` 通过。Markdown/CSS/Svelte 的临时探针改动均已还原，未留进源文件。

一次独立只读审查确认六包/锁文件、HTML 空白与 Oxc 副作用契约；审查发现 dev 和相册错误监听边界后，补了 CPU 定位、真实热更新和相册三组采集。此轮未修文集间歇判据或第三方错误，也没有将 REVIEW 改为 PASS。工作树保留此前 AI News 收尾修改；所有审计文件留在本轮 output 目录。实验内容缓存仅从 `node_modules/.astro` 和 `.astro/data-store.json` 移至 `output/astro7-upgrade/cache-before-upgrade/`，未清理其他证据。
