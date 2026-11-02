# Prettier 3.9.8 升级与公式保护

目标：按站长确认的方案，把 Prettier 从 3.9.6 升至精确版本 3.9.8；保留 Markdown 单美元公式写法、现有插件和格式化覆盖范围。不升级到 3.9.9 / 3.9.10，不改文章来迁就格式化器。

## 阶段一：基线与回归证据

- [x] 保存当前直接依赖、源文件摘要和旧版构建证据；对照 3.9.6 与 3.9.8 的格式化输出，实际加载 Astro / Svelte 插件。
- [x] 增加最小公式与内容语料回归测试，比较 remark-math 提取的公式内容和 KaTeX 渲染结果；以已校验的 3.9.10 发布包验证测试确实失败。
- [x] 验收：源文件不被实验写回，坏版本失败来自公式变化，非模块加载或测试脚手架错误；旧版 Astro 构建成功。

## 阶段二：最小依赖升级

- [x] 仅修改 `package.json` 的 Prettier 精确版本与 `pnpm-lock.yaml`，保持其他已安装直接依赖不变。
- [x] 将公式测试接入 `lint.yml`，不扩大格式化忽略范围；运行公式测试、项目格式门禁及新脚本检查。
- [x] 运行严格 peer / frozen-lockfile 安装、`pnpm check`、构建和 JSON 生成相关测试。
- [x] 验收：真实安装 3.9.8、公式测试通过、Astro/Svelte 插件实际检查、构建成功；新旧产物的路由、正文公式、CSS/JS 对比无未解释变化。

## 阶段三：实机与文档收口

- [x] 无窗口浏览器检查公式文章、切页返回和移动端布局；不以构建成功代替运行时验证。
- [x] 更新 CHANGELOG、构建约定与命令说明，纠正“公式回归只能整篇复现”的过期推论，保留历史实测数字。
- [x] 最终检查 diff、版本、测试与文章摘要；记录执行结果和未验证边界。

验收不要求推送或部署；本轮授权为本地升级与验证。

## 原因与方案依据

上游 [PR #20140](https://github.com/prettier/prettier/pull/20140) 在 Markdown 解析器内部关闭 `singleDollarTextMath`；[issue #20199](https://github.com/prettier/prettier/issues/20199) 记录其对真实单美元公式的影响。本地 3.9.6 AST 有 inlineMath，3.9.10 会把相关星号解析为 emphasis。

讨论阶段已对 34 篇文章内存比较，3.9.8 与 3.9.6 格式化输出一致；3.9.10 改坏一篇文章的 13 行。单行 `$Q_2^*>Q_1^*$` 即可复现，修正此前无法提取最小样例时作出的整篇上下文判断。

`proseWrap` 和 `embeddedLanguageFormatting` 无效；MDX 解析器虽然能解析当前文章，整篇实验仍会改变公式；段落忽略的小样例有效但自动插入存在遗漏。不修改本站 Markdown 渲染管线，不引入私有 Prettier 补丁。

## 执行结果

2026-11-02，Windows / Node 24.18.0 / pnpm 10.26.2；起点为 `a42a170c5b1f60fcee870c67aa50a3505d4ef780`，起始工作区干净。命令与原始输出保存在 `output/prettier-upgrade/`，不删除旧失败证据。

### 依赖与只读对照

- `audit-before.mjs` 按 git 跟踪清单和 `.prettierignore` 检查 `src` / `docs` / `scripts`，实际对比 342 个支持格式化的文件；两版本输出无差异、无解析失败。其中 Astro 78 个、Svelte 2 个，插件实际加载；另保存源文件 SHA-256，最终核对 `src` 原有文件全部未变。新测试和本文不在旧版 git 跟踪清单，另由最终格式检查覆盖。
- 仅安装 Prettier 3.9.8，已有 Astro / Svelte 插件版本未变。`pnpm add -D -E prettier@3.9.8 --store-dir .pnpm-store --ignore-scripts --strict-peer-dependencies --registry https://registry.npmjs.org` 首次仍写出 caret，随后显式修正 package 与 lock 的 specifier 为精确 `3.9.8`。
- `pnpm install --frozen-lockfile --offline --ignore-scripts --strict-peer-dependencies --store-dir .pnpm-store` 在精确 specifier 下 exit 0；依赖清单前后对照只有 Prettier 3.9.6→3.9.8，锁文件其余变化为相应 peer 重新绑定。

### 公式与格式检查

- `pnpm test:prettier-math`：36 个内容 Markdown（34 篇文章与两个 spec 文件）、307 个公式；连同最小样例及父测试为 38/38。先严格比较公式类型与原文，再比较 KaTeX 输出；既有无效公式如存在则要求异常信息相同，不能因格式化新增错误。最小样例另外要求全部正常渲染。
- 坏版验证用输出目录的临时 Node resolve hook 指向已校验的 3.9.10 包，不修改项目安装。修正后的 `math-bad-resolved.log` 为 35 pass / 3 fail：最小样例、真实文章及其父测试失败，原因均为公式改变。最初 `math-bad.log` 的 hook 未区分 CommonJS / ESM，含模块加载错误，不作为整体红绿证据；修正为 require→index.cjs、import→index.mjs 后得到上述有效结果。
- `pnpm exec prettier --check ./src ./docs scripts/prettier-math.test.mjs package.json` 通过，既有 Astro/Svelte 文件与文章无需重新格式化。`lint.yml` 只新增公式测试步骤，沿用原有 YAML 缩进；`.prettierignore` / `.prettierrc.cjs` 均未改。

### 构建与相关测试

- 两侧同样设置 `NODE_USE_ENV_PROXY=1`，执行 `pnpm exec astro build`、`node scripts/inject-buddha-banner.mjs`、`pnpm exec pagefind --site dist`；均成功生成 229 个 Astro 页面，完整产物 230 个 HTML，Pagefind 索引 28 页。本轮不运行完整 `pnpm build` 的联网快照刷新链，以保持两侧文章与数据相同。
- `dist-before.json` / `dist-after.json` 的文件清单均为 1308 项，没有增删；全部非 HTML 文件逐字节相同（包含 CSS、JS、OG、Pagefind）。146 个 HTML 的原始 hash 不同，仅移除既有 `data-tab-widget` 随机推荐侧栏后即全部一致，不归一化正文、公式或其他组件。
- `pnpm check`：196 文件，0 errors / 0 warnings / 6 hints。`test:lib` 16/16，`test:site-stats` 19/19，`test:projects` 两段分别 6/6 与 7/7，`test:contributions` 11/11，`test:friend-icons` 32/32；测试均为当前实际执行日志，不以旧测量代替。

### 浏览器与评审

- 通过已安装 Astro 包的实际 `bin.astro` 启动本地 preview，Chromium 无窗口分别创建独立 context，验证 1280×900 / 390×900。公式文章 `/posts/20260320000000/` 的 298 个公式注释在 Swup 前往归档再后退后逐项一致；无 `.katex-error`，字体为 KaTeX_Main、字号 15.73px；整页宽度分别等于 1280 / 390，没有横向溢出。两档 pageerror 与本站 requestfailed 均为零，截图已查看。preview 与浏览器在 finally 中关闭。
- 首次辅助脚本沿用已失效的 `astro/astro.js` 路径，preview 未启动；读取真实包 bin 后修正，`browser-actual-bin.log` / `browser.json` 才是有效浏览器验收记录，首次失败未冒充产品缺陷。
- 独立只读评审发现文档替换串中的 dollar-backtick 被 JavaScript 展开成前缀，造成文档重复插入；从固定干净基线重做本轮预期修改，改用返回字面量的函数替换，核对主标题唯一、公式原文与最终 diff，并记录于项目 `.learnings`。代码、锁文件与 CI 接入评审无剩余阻塞。

### 验证边界

没有修改文章、CSS、客户端脚本或 Markdown 渲染插件；没有进行网络数据刷新、远端 CI、提交、推送或部署。3.9.8 通过本轮项目验收，不代表 3.9.9 / 3.9.10 的单美元公式问题已修复；未来升级必须继续通过公式门禁。
