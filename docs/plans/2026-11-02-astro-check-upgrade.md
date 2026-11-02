# 检查器独立升级：@astrojs/check 0.9.12

目标：按站长确认的第一批方案，仅把直接依赖 `@astrojs/check` 从 0.9.10 升至精确版本 0.9.12，审查必要的传递依赖变化。保持 Astro、Svelte、TypeScript、Pagefind、Prettier 与样式工具版本不变。

## 阶段一：基线

- [x] 保存当前直接依赖、检查器元数据与源码摘要。
- [x] 运行旧版 `pnpm check`；以相同文章/快照执行 Astro 构建、横幅注入和 Pagefind，保存产物摘要。
- [x] 验收：基线输出、诊断和文件清单来自本次实际运行；不以线上版本代替同数据构建。

## 阶段二：升级与检查器验收

- [x] 修改 `package.json` 和锁文件，安装精确版本 0.9.12；审查语言服务、文件监听及其他传递依赖的变化。
- [x] 严格 peer / frozen-lockfile 安装，运行新版 `pnpm check` 并逐项解释诊断差异。
- [x] 对照检查器监听实现：新版使用独立 `astro-check` CLI，旧版使用同配置 `check()` API；临时 `.ts` / `.astro` 文件修改后检错、修正后清零，验证单次检查失败码，结束进程并清理探针。新增文件漏检两版均复现，单列限制；不把它写成全部通过。
- [x] 运行格式检查和既有公式保护测试；构建并比较文件清单、HTML、JS/CSS、OG 与搜索索引。
- [x] 验收：只有目标直接依赖改变；其他变化均能追溯到检查器依赖链；已有文件修改可检错和清错；无未解释构建差异；保留旧版也存在的新增文件监听限制。

## 阶段三：本地实机与文档

- [x] 使用本地 preview 验证桌面/移动公式文章、搜索、Swup 切页和后退；查看截图和页面异常。
- [x] 同步 CHANGELOG、构建约定与本报告，核对 diff 与源码摘要。
- [x] 验收：结果与命令有证据，未混入其他批次；按确认的分批方案独立本地提交，不推送或部署。

## 验证约定

所有原始日志、元数据和摘要写入 `output/check-upgrade/`。构建沿用已验证方法：`NODE_USE_ENV_PROXY=1`，运行 `pnpm exec astro build`、`node scripts/inject-buddha-banner.mjs`、`pnpm exec pagefind --site dist`；不刷新网络快照，以保持两侧输入相同。仅对既有随机推荐侧栏 `data-tab-widget` 另做归一化比较，保留原始 hash。

检查器官方职责与 `--watch` 行为参考 [Astro CLI](https://docs.astro.build/en/reference/cli-reference/#astro-check)，依赖声明以 [0.9.12 发布元数据](https://registry.npmjs.org/@astrojs%2Fcheck/0.9.12) 及实际安装为准。`pnpm check` 的通过不代替运行时验收。

## 执行结果

2026-11-02，Windows / Node 24.18.0 / pnpm 10.26.2，基线 `93b90e7b1cac2ab0518da55612fda6a61dce0883`；初始工作区干净。原始日志和辅助脚本保留在 `output/check-upgrade/`。

### 安装与依赖审查

- 先把 `package.json` 的检查器声明由 `^0.9.10` 改为精确 `0.9.12`，执行 `pnpm install --ignore-scripts --strict-peer-dependencies --store-dir .pnpm-store --registry https://registry.npmjs.org`。再执行 `pnpm install --frozen-lockfile --offline --ignore-scripts --strict-peer-dependencies --store-dir .pnpm-store`，两者均 exit 0。
- `dependencies-before.json` / `dependencies-after.json` 证实直接依赖只有检查器从 0.9.10 变为 0.9.12。Astro 7.4.4、Svelte 5.56.8、TypeScript 5.9.3、Prettier 3.9.8、Pagefind 1.5.2 等保持。
- 检查链实际解析为语言服务 2.17.3（原 2.16.13）、chokidar 5.0.0（原 4.0.3）、yargs 18.2.0（原 18.1.0）；语言服务新增 `@astrojs/astro2tsx` 0.1.3，使用 `@emnapi/core` 1.11.3 与 `@napi-rs/wasm-runtime` 1.2.4。已有共享 WASM 包从 optional 转为必需，是这条新增依赖链所致，不是无关更新。
- `vscode-uri` 3.2.0 是新语言服务的依赖要求，相关 Volar 服务共享解析也随之更新；3.1.0 仍保留给其他消费者。锁文件全部变化逐项审查，未发现其他升级批次混入。实际 Node 要求包含 astro2tsx 的 `^20.19.0 || >=22.12.0`，本地 Node 24.18.0 满足；本轮未运行 Linux CI。

### 诊断与 watch 对照

- `pnpm check` 新旧及探针清理后的最终运行均为 196 文件、0 errors / 0 warnings / 6 hints；提示涉及的文件和诊断码也一致，未修改 TS 配置或严重程度阈值。
- 首次通过外层 `astro check --watch --preserveWatchOutput` 验证启动，但新增 `.ts` 错误未被检出。只读观察真实 chokidar `ready` 和 `add` 事件后，确认事件已收到，而检查清单仍未纳入新文件；因此最初“可能只是启动尚未就绪”的假设不成立。
- 有效对照为 `watch-control.mjs current` 与 `watch-control.mjs old`。新版使用真实独立 `astro-check` CLI；旧版使用其公开 `check({ root, watch: true, preserveWatchOutput: true })` API。旧独立 bin 会先 `slice(2)` 再由 parser `hideBin` 重复剥参，使直接传入的 watch 参数丢失，不能拿那次退出作为 watch 对照。两侧加载各自真实语言服务和 chokidar：新 0.9.12 / 2.17.3 / 5.0.0，旧 0.9.10 / 2.16.13 / 4.0.3。
- 观察 hook 仅透传原始 `watch` 参数和返回值、监听 `ready`；不修改监听设置、不补发文件事件或刷新诊断清单。先创建自有有效 `.ts` / `.astro` 文件再启动：初始 0 错误，修改 TS 后 1 错误，再修改 Astro 后 2 错误，两个文件修正后恢复 0。两版单次负向检查均准确指向这两个文件且 exit 1。辅助文件最终删除，进程关闭，原有源码摘要不变。
- **保留限制**：ready 后新建另一个错误 TS 文件，两版都重新输出 198 文件、0 errors，未检查新文件；删除后也保留旧的文件清单计数。不能称为 watch 全通过。新增文件应重新运行单次检查或重启 watch；此次不修改上游检查器源码。成功的已有文件修改对照覆盖独立 CLI/API，不等同于完整覆盖 Astro 外层 wrapper 的 watch 同步流程。
- 失败证据没有删除：首次新建文件测试超时、辅助预加载使用 Windows 路径而非 file URL 导致启动失败、旧 bin 丢参的运行，均与有效对照区分保存，不冒充测试通过。

### 构建与实机

- `pnpm test:prettier-math` 38/38：36 个内容文件、307 个公式。项目格式检查 `pnpm exec prettier --check ./src ./docs package.json` 通过。
- 同输入两侧执行本文列出的 Astro 构建、横幅注入与 Pagefind，均构建 229 个 Astro 页面、完整产物 230 个 HTML；Pagefind 索引 28 页。完整产物均 1308 项，没有文件增删；全部非 HTML 文件逐字节相同，含 JS/CSS、OG、搜索索引。146 个 HTML 的原始差异全部来自既有随机推荐侧栏，移除该侧栏后全体一致。
- `comparison.json` 保存原始/归一化比较；260 个原有 `src` 文件的 SHA-256 无变化，临时探针没有残留。本轮没有执行 `pnpm build` 的网络快照刷新链，避免改变 A/B 输入。
- 无窗口 Chromium、本地 preview，1280×900 / 390×900 两档都得到 12 个 Astro 搜索结果，点击结果及后退保留关键词；公式文章 298 个公式在切页/后退后逐项一致，无 `.katex-error`。字体 KaTeX_Main、字号 15.73px，整页宽度分别 1280 / 390，无横向溢出；pageerror 与本站请求失败均为零。截图已查看，浏览器和 preview 已关闭。
- 独立只读评审无代码阻塞，依赖链变化与 watch 控制方式均有源码依据。评审指出应明确新 CLI/旧 API 的边界及新增文件旧限制，已按事实写入本文与命令约定。

### 边界

本轮只验收第一批检查器升级。未升级 Pagefind、Svelte、Autoprefixer、TypeScript；未改站点代码、文章、诊断阈值或上游依赖源码。保留 watch 旧限制，不把它称为此次新增缺陷或已修复；不推送、不部署，线上仍为此前发布版本。
