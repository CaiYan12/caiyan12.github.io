# vendor/pelican-bike —— 上游源码留档

本目录是第三方 Three.js 小游戏 **pelican-bike（「鹈鹕骑单车」）** 的上游源码留档，用于在本博客
`/pelican-bike/` 路由下手动构建静态产物。

## 上游来源

| 项 | 值 |
|---|---|
| 上游仓库 | https://github.com/riba2534/claude-opus-5-5-demo |
| 上游目录 | `pelican-bike/`（分支 `main`） |
| commit sha | `54adc1fb64155f9dd7c1c90ecae7b8185ac540b8` |
| 抓取日期 | 2026-09-25 |

## 这是什么

Claude Opus 5.5 一次性生成（one-shot）的 Three.js 单文件 3D 游戏「鹈鹕骑单车」：海岸公路骑行、
程序化建模、Verlet 布料围巾、Gerstner 海浪、昼夜循环、合成音效。

## 许可声明（事实陈述）

上游仓库**根目录与本子目录都没有 LICENSE 文件**（GitHub API 返回的 `license` 字段亦为 `null`），
仅在 `pelican-bike/package.json` 中声明 `"license": "ISC"`。
我们保留该字段原样，并保留游戏内既有的 GitHub / X 署名链接
（`https://github.com/riba2534/claude-opus-5-5-demo` 与 `https://x.com/riba2534`，
在 `index.template.html` 的 intro 与 HUD 中各出现一次）。

本目录的 `LICENSE` 是**我们按对方声明的 ISC 补写的标准文本**，版权行署名
`Copyright (c) 2026 riba2534`（年份取自上游 commit `54adc1fb` 的日期 2026-09-23）。
它**不是**上游随附的文件，也**不构成**我们对这份代码的权利主张；
补写的唯一目的是让读者就地读出所依赖的条款，而不必去别处推断。
先例是同仓库里 `public/vendor/svg3dtagcloud/LICENSE` 之于那套 vendored 库。
本仓库根目录仍然没有 LICENSE 文件。

## 我们本目录的内容与改动清单

拷贝自上游、**逐字节未改**的文件：

- `src/` 全部 11 个 `.js`（`audio.js` `bicycle.js` `effects.js` `fish.js` `main.js` `ocean.js`
  `pelican.js` `sky.js` `textures.js` `util.js` `world.js`）—— 游戏逻辑、数值、配色、动画、镜头、
  成就、音效一律不改。
- `index.template.html` —— 拷贝自上游后，已注入本仓库唯一会对模板做的三处改动
  （pagefind 忽略属性、`.intro-links` 返回博客链接、`.brand` 面板变成返回链接），
  逐条见下方「后续任务改动」清单；`<style>…</style>` 整块与上游**逐字节相同**（零 CSS 改动）。

对上游的**唯一**已做改动：

- `package.json`：删除依赖 `"playwright-core": "^1.63.0"` 这一条，其余字段与缩进逐字节保持上游原样。
  原因：上游 `package-lock.json` 把 `playwright-core` 钉到字节跳动内网 registry
  （`https://bnpm.byted.org/...`），`npm install` 会直接以 `EALLOWREMOTE` 失败；该包只用于上游自测，
  构建产物不需要它。**因此本目录也不 vendor `package-lock.json`**，`dist/` 同样不 vendor
  （顺带一提：根 `.gitignore` 的全局 `package-lock.json` 那条规则本来也不允许它进仓库）。
  **两份 md5 都写在这里**，因为上游那份在本仓库没有留档（见下方「重建方法」里关于
  `output/upstream-pelican-bike-54adc1f/` 的说明，那是本机 gitignore 的临时拷贝，干净检出上不存在）：

  - 上游原样：378 字节，md5 `2cf9a7e81dea487b3aff160157cdd886`。
    2026-09-25 由 `curl https://raw.githubusercontent.com/riba2534/claude-opus-5-5-demo/54adc1fb64155f9dd7c1c90ecae7b8185ac540b8/pelican-bike/package.json`
    实取核验（删除的那一行 `"playwright-core": "^1.63.0",` 含换行恰 34 字节，与下面的差值吻合）。
  - 本目录改后：344 字节，md5 `34ea621ab6b23324b8a8ffd1329756c3`。
    就地复核：`git cat-file blob :vendor/pelican-bike/package.json | md5sum`（该文件此后再无任务改动）。

后续任务改动（完成后回来补精确内容）：

- `vendor/pelican-bike/index.template.html` —— 本仓库对该模板**仅做以下三处改动**，
  除此之外与上游逐字节相同（Task 2 已完成，逆向剥离三处注入后与上游全等即为其证明）。
  上游基线**不依赖本机文件**，两个可就地取得的等价物（2026-09-25 实测二者 md5 全等）：
  `git cat-file blob 5efd0a3:vendor/pelican-bike/index.template.html`（Task 1 的逐字节 vendored 拷贝），
  或上表 commit 的 raw URL —— 均为 25,816 字节 / **320 行** / md5 `89528bdab1cc0e3acb3f3716149b632d`：
  1. **pagefind 忽略**：选择器锚点 `<body class="bars">`（行号约 191）加属性，
     改为 `<body class="bars" data-pagefind-ignore="all">`，使游戏页不进入站点搜索索引。
  2. **开场卡返回链接**：选择器锚点 `.intro-links`（模板内 `<div class="intro-links">`，
     行号约 229），在其**第一个子元素位置**（既有「GitHub 开源仓库」署名链接之前，
     不改变两个署名链接的相对顺序）插入一行
     `<a href="/"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 2 12h3v8h6v-6h2v6h6v-8h3z"/></svg>返回博客首页</a>`
     （6 空格缩进与同组 `<a>` 对齐；`svg` 不带 `fill`/`width`，由 `<style>` 内既有规则
     `.intro-links svg { width:14px; height:14px; fill:currentColor }` 接管）。
  3. **HUD 返回入口 = `.brand` 面板整体变成返回链接**：选择器锚点 `.hud > .brand.panel`
     （单行结构，行号约 238）。把该行**第一个** `<div class="brand panel">` 换成
     `<a class="brand panel" href="/" style="color:inherit;text-decoration:none" title="返回博客首页" aria-label="鹈鹕骑单车 · 返回博客首页" tabindex="-1">`，
     把该行**最后一个** `</div>` 换成 `</a>`；内部 `<span class="logo">`、内层 `<div>`、`<b>`、`<small>`
     及中文文本逐字保留。**未加任何 CSS**：模板没有全局 `a` 选择器（`<style>` 里只有
     `* { box-sizing: border-box }`），浏览器默认链接色/下划线靠该 inline `style` 在元素上压掉，
     因此 `<style>…</style>` 整块仍与上游逐字节相同。`.brand > div{display:none}` 等后代选择器
     在外层由 `div` 换为 `a` 后照常命中，六档视口实测盒子与上游逐值相同，唯一差异是
     `cursor: auto → pointer`。**`.tools` 面板刻意不动**（实测量过：加第 9 个 `icon-btn` 会让
     右锚定的工具条变宽 36/44px，320px 视口下最左按钮被推出屏外 `tools.x = -28`、414px 出现
     上游没有的重叠，故返回入口落在 `.brand` 上）。
     - **`aria-label` 为什么写「鹈鹕骑单车 · 返回博客首页」而不是只写用途**：`aria-label` 会
       **整体覆盖**从元素内容算出的可访问名称，只写「返回博客首页」等于把可见标签（面板上的
       游戏标题）从名称里抹掉，违反 WCAG 2.5.3「Label in Name」（A 级）——语音控制用户照屏幕上
       读到的名字称呼它，就匹配不到任何控件。故按「可见标签在前、用途在后」拼，`title` 保持
       「返回博客首页」不动（它是唯一提示这块面板可点的悬停反馈）。
       `.intro-links` 里我们插入的那个 `<a>` **不加** `aria-label`：它的名称本来就来自内容
       「返回博客首页」，天然满足 2.5.3。
     - **`tabindex="-1"` 为什么必须在**：上游 `vendor/pelican-bike/src/main.js`（行号约 995）
       有一条 `if (e.target instanceof HTMLInputElement || e.target instanceof HTMLAnchorElement) return;`
       ——焦点在 `<a>` 上时键位处理直接整段返回。`.brand` 是 HUD 里 DOM 顺序最靠前的可聚焦元素，
       把它变成 `<a>` 就等于让「锚点」成为第一个 Tab 焦点。评审在构建产物上实机复现了后果：
       焦点落在 `.brand` 时 W/S/A/D、空格、`U` 全部失灵、Enter 直接跳走；本仓库另在留档模板上以
       Playwright 复现了同一 Tab 环事实（临时去掉该属性后 `.brand` 即成 post-start 第 1 个 Tab
       停靠点，保留则首个停靠点回到 `<button>`——上游原本的第一个 Tab 停靠点是按钮，按钮不是
       锚点，键位照常），所以这个坑是我们注入时新造出来的。`vendor/pelican-bike/src/*.js`
       逐字节冻结、又不允许新增客户端 JS，故取最小解：把 `.brand` 链接移出 Tab 环（鼠标/触控照旧可点）。
       **已知取舍**：键盘用户改用开场卡 `.intro-links` 的返回链接（仍在 Tab 环内，实测是开场卡里
       第一个可 Tab 到的**链接**，排在「开始骑行」「静音进入」两个按钮之后）或浏览器后退键回博客；
       游戏内键盘操作永不降级。
       **同一隐患在上游本就有两处，本项目有意不修**：`.tools.panel` 里的两个署名锚点
       （`<a href="https://github.com/riba2534/...">`、`<a href="https://x.com/riba2534">`）
       一旦被 Tab 到同样会冻住键位（实测这两个锚点确实在 Tab 环内，排在 `.cams` 五个按钮与
       `.tools` 六个 `icon-btn` 之后）——那是上游原样行为，动它等于改 `.tools`（该面板是逐字节的
       禁改区），记录在此以免将来被当成本仓库的回归。
     - 三处注入完成后的模板实测值（当前权威值，Task 3/6 参照；逆向剥离三处注入后与上游逐字节全等，
       即为本清单完整性的证明）：26,117 字节 / **321 行**（上游 320 行，三处里只有第 2 处新增整行）/
       相对上游净 **+301 字节** / md5 `238b31dd5f05edab308e29f0937f4c36`。
       就地复核：`git cat-file blob :vendor/pelican-bike/index.template.html | md5sum`。
- `vendor/pelican-bike/build.mjs` —— **仅改产物落点**（Task 3 完成）。改动可由
  `git diff 5efd0a3..HEAD -- vendor/pelican-bike/build.mjs` 直接复核（`5efd0a3` 是本仓库第一个
  提交，其 build.mjs 与上游逐字节相同）。上游基线**不必依赖本机文件**：
  `git cat-file blob 5efd0a3:vendor/pelican-bike/build.mjs`（839 字节 / 21 行 /
  md5 `2de76684fa3c1168e3e29a2d5402846c`）。
  具体改动：删掉 `mkdirSync('dist', { recursive: true })` + `writeFileSync('dist/index.html', html)`
  两行，换成锚定 `import.meta.dirname`（脚本自身位置）的 `outDir` 一行 + 同样的
  `mkdirSync`/`writeFileSync` 两行；并新增 `import { join } from 'node:path'` 与 **6 行**说明注释
  （Task 6 把原先的 2 行扩写成 6 行，见下条「只锚输出、不锚输入」）。
  其余逻辑——minify 开关、`<\/script` 转义、`<!--OG_IMAGE-->` 替换、`/*APP_JS*/` 替换
  （replacer 函数）、体积打印——逐字保留上游写法；**末行 `console.log` 里的字样仍是
  `dist/index.html`**（判据要求体积打印逐字保留，勿顺手改文案）。
  - **只锚输出、不锚输入（Task 6 更正的表述）**：`import.meta.dirname` 锚的是**写到哪**，
    **两个输入** `entryPoints: ['src/main.js']` 与 `readFileSync('index.template.html')` 依旧
    相对 `process.cwd()`。所以 `node build.mjs` **必须在 `vendor/pelican-bike/` 目录内运行**。
    从别处调用不是静默走错，而是**大声失败**：2026-09-25 在仓库根实测
    `node vendor/pelican-bike/build.mjs` → esbuild `Could not resolve "src/main.js"`、
    **exit 1**、`public/pelican-bike/index.html` 的 md5 与 mtime 均未变化（失败发生在写入之前）。
    `import.meta.dirname` 本身另要求 **Node ≥ 20.11**（本机实测 v24.18.0），更早的 Node 会在
    加载脚本时就 `TypeError`，与 cwd 无关。
  - ⚠️ **`package.json` 是本目录的承重文件，不只是元数据**：它的 `"type": "commonjs"` 决定
    esbuild 以 CJS 语义打包 `src/*.js`。删掉它，`node build.mjs` **不会报错**，而是静默产出
    一个更小、形状不同的 bundle（完整实测数值见下方「重建方法」的 ⚠️ 条）。
    **验证手法有坑**：这些 esbuild 互操作壳（`__esm`、`__commonJS`/`__require`）的名字只在
    **未压缩**构建里可 grep，压缩产物里会被 mangle 掉——**别拿 `grep __commonJS` 打在
    `public/pelican-bike/index.html` 上当判据**（实测两侧都是 0，会得出「没有区别」的假结论）。
    要看壳层差异请用 `node build.mjs --dev`，或直接把 md5 当判据。

## 重建方法

构建依赖**只装进本目录的 `node_modules/`**（已被根 `.gitignore` 的
`vendor/pelican-bike/node_modules/` 那条忽略），仓库根 `package.json` /
`pnpm-lock.yaml` 零改动（GC-3）。实测可用的命令（Task 3，2026-09-25；Task 6 复跑一致）：

```bash
cd vendor/pelican-bike          # 必须先 cd 进来，见下方「cwd」条
npm install --no-package-lock --no-audit --no-fund --registry=https://registry.npmmirror.com three@0.186.0 lil-gui@0.21.0 esbuild@0.28.2
node build.mjs
```

- **`--no-package-lock` 必须带**（GC-4）：上游 lock 把 `playwright-core` 钉在字节内网 registry
  （`bnpm.byted.org`），不可复用；本目录也不得生成新 lock。
- 实测安装结果：`added 4 packages`（esbuild / @esbuild/win32-x64 / three / lil-gui，版本即上面三条；
  Task 6 于 `vendor/pelican-bike/node_modules/` 复核到位：three 0.186.0、lil-gui 0.21.0、
  esbuild 0.28.2，且这三个包在仓库根 `node_modules/` 中**均不存在**，隔离成立）。
  **`@esbuild/win32-x64` 那一条是 Windows x64 专属**——esbuild 按平台装对应的二进制包，
  在 linux-x64 / darwin-arm64 上装到的是同名系列的其他包，包数与包名都会不同，属正常而非故障。
  npm 可能打印 `esbuild@0.28.2 (postinstall: node install.js)` 被 allowScripts 策略拦截的 warning，
  **可忽略**：esbuild 的 JS API 直接调用平台包里的二进制，构建不需要该 postinstall
  （已实测构建成功且产物确定性一致：同目录连跑两次 bundle md5 相同）。
- ⚠️ **`package.json` 必须与本目录同时在位，它是承重文件**（2026-09-25 Task 6 在本目录实测，
  不是转抄）：它的 `"type": "commonjs"` 决定 esbuild 以 CJS 语义打包 `src/*.js`。把本目录的
  `package.json` 临时改名后跑 `node build.mjs`，**命令以 exit 0 成功、照常打印体积行、照常写产物**，
  但产物变成 **815,878 字节 / md5 `85a612da6c27e37a707b1bb0fde01d77`**，比基线 **少 2,768 字节**，
  且标识符重排完全不同。未压缩对照（`node build.mjs --dev`）看得最清楚：基线产物含
  **27 处 `__esm`** 与 `var __commonJS = (cb, mod) => function __require() {…}` 壳，缺 `package.json`
  的那份这三类 helper **一个都不出现**（体积 1,879,610 → 1,747,930 字节）。
  **不要用 `grep __commonJS` 打在压缩产物上当判据**——压缩会 mangle 这些名字，两侧都是 0，
  量不出区别（`__toCommonJS` 本站从未出现过）。判据请认 md5。对照构建漏掉这个文件会得出假差异。
- **cwd 影响能不能跑，不影响写到哪**：产物落点锚定 `import.meta.dirname`（脚本自身位置，
  该 API 需 **Node ≥ 20.11**，本机实测 v24.18.0），所以**写入目标**与调用位置无关；
  但 `entryPoints: ['src/main.js']` 与 `readFileSync('index.template.html')` 这两个**输入**
  仍相对 `process.cwd()`，因此**必须在 `vendor/pelican-bike/` 内运行**。
  从仓库根跑 `node vendor/pelican-bike/build.mjs` 的实测结果是**大声失败**而非静默走错：
  esbuild 报 `Could not resolve "src/main.js"`、exit 1，产物 md5 与 mtime 均未变化。
  日志行标签仍印 `dist/index.html`，见上节。`--dev` 参数关闭压缩（上游既有开关，本站构建不用）。
- 本次构建产物基线：**818,646 字节**（脚本打印 `798.3 KB (js 774.0 KB)`——那是 UTF-16 字符数，
  与 UTF-8 字节数本就不等，勿以打印值当字节数），md5 `c043aa0ed9b2086419995a07c8ad15a0`，纯 LF。
  Task 6 为验证「改注释不影响产物」在本目录连跑 `node build.mjs` 多次，每次都是上述字节数与 md5，
  并与改前留档副本 `cmp` 逐字节全等（`build.mjs` 的注释文本不进产物）。
  与"上游原样模板 + 同一份 LF `src/` + 同一 `package.json` + 同一 esbuild"的对照构建（818,345 字节）
  逐行 diff，差异**只有三处注入**：`+27 B`（body 属性）`+134 B`（intro 链接行，含换行）
  `+140 B`（`.brand` div→a），合计 `+301 B`；774 KB 的 bundle 两侧 md5 全等
  （`b0a01ee9f93853afc6bcdf550d59abbf`）。
- **`output/upstream-pelican-bike-54adc1f/` 是本机的临时对照目录，不是仓库内容**：根 `.gitignore`
  的 `output/` 那条把它整棵忽略，**干净检出上它不存在**（Task 6 实测：本机该目录也已不在）。
  因此本 README 不把它当任何判据的来源——需要上游原样文件时走上表 commit 的 raw URL，
  或 `git cat-file blob 5efd0a3:vendor/pelican-bike/<path>`（Task 1 的逐字节 vendored 拷贝）。

## 与主站构建的关系

**本目录不参与 `pnpm build`**，不参与 `pnpm check`、`prettier --check ./src`（它在仓库根的
`vendor/`，不在 `src/` 内）。这里的代码是**留档 + 手动重建用**：站点实际访问的是重建后的静态产物，
该产物已由 Task 3 落到 `public/pelican-bike/index.html`（**跟踪提交**，非 gitignore），
按上一节的命令重建后需自行提交该文件。

`vendor/pelican-bike/node_modules/`（若为手动重建而临时安装）已在根 `.gitignore` 中忽略。

## 行尾与逐字节判据

上游 blob 是 LF；本机 `core.autocrlf=true` 会把工作区 smudge 成 CRLF，因此

- 取源只能用 `git cat-file blob <sha>:<path>`（或原始文件下载），不得用 `git archive` /
  `git checkout`；
- 逐字节比对要比**索引里的 blob**，不比工作区文件：
  `git cat-file blob :vendor/pelican-bike/src/main.js | md5sum`；
- 根 `.gitattributes` 已对 `vendor/pelican-bike/**` 与 `public/pelican-bike/**` 设 `-text`，
  让这两处工作区也保持 LF。

`src/*.js` 的 md5 基线（任何时候改动都视为破坏逐字节约束）：

```
5e4ae40fdeff565d8d183b5d3ae39a78  src/audio.js
37fd765d0658f72bd1bf06bbed9ba3db  src/bicycle.js
7511de59875d5bc7e12769024fadd05d  src/effects.js
1bfea3a940ccf90b0e02c48749c9d621  src/fish.js
b1205467affd00da6a0e4913658537d9  src/main.js
11fbc7f02da80660227a9da3f4945a39  src/ocean.js
88c64ba1c2ba1a680111060f65c79cb0  src/pelican.js
d8a7fc71c7bc487a8d97f3295d1ff437  src/sky.js
1b662a6b3d784d75251d9bb4ebd3fcca  src/textures.js
8ba53b0369bda6a08d661ee692ba5163  src/util.js
a70ac20883bf04324a7f6bc51ce4702d  src/world.js
```
