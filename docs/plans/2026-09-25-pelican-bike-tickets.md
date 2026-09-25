# 鹈鹕骑车（Pelican on a Bike）接入本站资源 — 实施票册

- **日期**：2026-09-25
- **执行方式**：superpowers:subagent-driven-development（控制器只发布命令，实现与测试交给子代理）
- **上游**：https://github.com/riba2534/claude-opus-5-5-demo/tree/main/pelican-bike
- **上游 commit**：`54adc1fb64155f9dd7c1c90ecae7b8185ac540b8`
- **目标 URL**：`/pelican-bike/`（导航名「鹈鹕骑车」）

## 已确认的决策（用户 2026-09-25 裁决）

1. **产物策略**：提交打包好的单文件 HTML 到 `public/pelican-bike/index.html`，同时 vendor 11 个源模块到 `vendor/pelican-bike/` 留档，附手动重建脚本。**不新增 three/esbuild/lil-gui 到本仓库 devDependencies，不接入 `pnpm build` 链。**
2. **返回主站入口**：两处 —— ① HUD 右上工具条 `.tools` 加一个 `🏠` 同款 `icon-btn`；② 开场卡 `.intro-links` 加一个「返回博客首页」。**均复用游戏自带 CSS 元件，不新增样式规则。**
3. **执行方式**：用户先在 Qoder 应用层把模型切到 qwen 3.8 flash，再派发子代理。**在用户明确说「切好了 / 开始」之前，控制器不得动任何文件。**

## Global Constraints（对每个任务都生效，逐条抄给子代理与审查者）

- **GC-1 保留一切视觉表现与玩法**：11 个 `src/*.js` 模块必须与上游 **逐字节相同**（`git diff` 对上游零差异）。不得改任何游戏逻辑、数值、配色、动画、镜头、成就、音效。
- **GC-2 模板改动最小化**：`index.template.html` 只允许三处改动 —— (a) `<body>` 加 pagefind 忽略属性；(b) `.intro-links` 内插入 1 个 `<a>`；(c) `.brand` 面板的 `<div>` 改成 `<a href="/">`，所需 `color:inherit;text-decoration:none` 写在**该元素的 inline `style` 属性**里。**`<style>` 块必须与上游逐字节相同 —— 不得新增、不得修改、不得删除任何 CSS 规则**（这正是 (c) 用 inline style 而不是加 CSS 规则的原因）。不得删改上游既有的 GitHub / X 署名链接。**不得动 `.tools`**（R-1 实测：往里面加第 9 个按钮会在 414px 压出重叠、在 320px 把按钮推出屏幕）。
- **GC-3 零新增 npm 依赖**：本仓库 `package.json` 的 `dependencies`/`devDependencies` 不得出现 `three`、`lil-gui`、`esbuild`、`playwright-core`。构建游戏的依赖只装在 `vendor/pelican-bike/node_modules/`（已 gitignore）。
- **GC-4 不 vendor 上游 `package-lock.json`**：实测它把 `playwright-core` 钉到字节内网 registry `https://bnpm.byted.org/...`，`npm install` 直接 `EALLOWREMOTE` 失败。只 vendor `package.json`，并在其中移除 `playwright-core`（上游仅自测用，构建不需要），移除一事必须写进 `vendor/pelican-bike/README.md`。
- **GC-5 不得进博客搜索索引**：产物 HTML 必须让 `pagefind --site dist` 跳过整页（博客全局搜索只搜正式文章，与 `/books/` 的 `data-pagefind-ignore="all"` 同策）。**必须用构建后的 pagefind 索引实测验证，不接受"加了属性应该就行"。**
- **GC-6 vendored 代码放 `src/` 之外**：`vendor/` 在仓库根，不在 `src/`，因此天然躲开 `lint.yml` 的 `prettier --check ./src`。不得把上游代码放进 `src/`（会被 Prettier 重排，破坏 GC-1 的逐字节保证）。先例：`docs/reference/colorful-original.css` 就是为躲 Prettier 才放 `src/` 外。
- **GC-7 署名与来源**：上游仓库**根目录没有 LICENSE 文件**，只有 `pelican-bike/package.json` 里的 `"license": "ISC"` 一句声明。产物必须保留游戏内既有的 GitHub / X 署名链接（GC-2 已锁），且 `vendor/pelican-bike/README.md` 必须写明：上游 URL、commit sha、上游声明 ISC 但无 LICENSE 文件这一事实、我们的改动清单。**这是法律边界，不是可选项。**
- **GC-8 计时不得用固定毫秒数死等**：所有 Playwright 等待必须挂在游戏自身的状态信号上（`body.ready` / `body.started` / `window.__pelican`），不得 `waitForTimeout(N)`。本仓库 2026-09-20 线上实测踩过这个坑（`test:fancybox` 与 `smoke:nice-books` 各中一次）。
- **GC-9 行尾与编码**：新增文件用 LF；含中文，一律 UTF-8 读写（`chinese-encoding` 规范）。改动 `src/config.ts` 后对该文件跑 `pnpm exec prettier --write`（tabWidth 4 / useTabs true）。

## 上游实测事实（控制器已验证，子代理不必重测）

| 项 | 值 |
|---|---|
| 构建命令 | `node build.mjs`（esbuild bundle `src/main.js` → iife → minify → 内联进模板 `/*APP_JS*/`） |
| 产物 | `dist/index.html`，**798.4 KB / 818,665 字节**（js 774.0 KB） |
| 依赖 | `three@0.186.0`、`lil-gui@0.21.0`、`esbuild@0.28.2`（`playwright-core` 构建不需要） |
| 外部资源 | **零**。全程序化生成，无图片/音频/字体/CDN 请求 |
| 模板结构 | `<body class="bars">` 在 191 行；`/*APP_JS*/` 在 317 行；`<!--OG_IMAGE-->` 在 10 行；共 320 行 |
| 就绪信号 | `main.js:1369` → `document.body.classList.add('ready')`（首帧预热后）；`main.js:1244` → `body.classList.add('started')`（点开始骑行后） |
| 调试接口 | `main.js:1372` → `window.__pelican = { pelican, bike, view(...), S, ... }` |
| 隐藏界面 | `main.js:1043` → `U` 键 toggle `body.hide-ui`，CSS 68 行把 `.hud` 及其所有子元素 `opacity:0 !important; visibility:hidden !important` |
| 开场卡隐藏 | CSS 40 行 `body.started #intro { opacity:0; visibility:hidden; pointer-events:none }`（transition 0.9s） |
| `.intro-links a` | CSS 60 行：`color:var(--muted); font-size:12.5px; inline-flex; gap:6px`；子 `svg` 14×14 `fill:currentColor` |
| `.icon-btn` | CSS 75 行：38×38、`border-radius:11px`、`display:grid; place-items:center`、已带 `color:inherit; text-decoration:none`（**原生支持 `<a>`**）；子 `svg` 18×18 |
| `.tools` | CSS 74 行：`position:absolute; top:max(14px,env(safe-area-inset-top)); right:16px; display:flex; gap:6px; padding:6px` —— **右锚定 flex，加第 9 个按钮会让整条向左多伸 44px（桌面）/ 36px（移动）** |
| 移动端 `.tools` | CSS 171–173 行（`max-width` 断点内）：`gap:4px; padding:5px`，`.icon-btn` 32×32 → 9 项总宽 ≈ **330px** |
| 导航渲染 | `src/config.ts:78-82` 的 `resourceSite`；Navbar.astro（桌面 hover 下拉）与 MMenu.astro（移动全屏菜单）**数据驱动自动渲染**，加一项配置两处都会出现（AGENTS.md 已记「每日好书」同例） |

## 三项风险的实测结论（控制器已在 scratch 里跑完，子代理直接采用，不必重测）

原型与探针脚本都在 `output/`（gitignore 内），**Task 5 应当直接改写它们，不要从零写**：

| 文件 | 内容 |
|---|---|
| `output/upstream-pelican-bike-54adc1f/` | 上游 commit `54adc1f` 的**原始 blob 字节**（LF），14 个文件 |
| `output/pelican-scratch/upstream.html` | 上游原样构建产物，818,345 字节 —— A/B 基线 |
| `output/pelican-scratch/index.html` | 「右上工具条加第 9 个 🏠」方案的产物，818,696 字节（**已否决，见 R-1**） |
| `output/pelican-scratch/variantA.html` | **已采纳方案**的产物，818,613 字节（delta **+268**） |
| `output/pelican-probe.mjs` | 就绪信号 / canvas / `__pelican` / 外部请求 / 报错 / 返回入口 探针 |
| `output/pelican-ab-geometry.mjs` | 上游 vs 第9按钮方案的六档视口几何 A/B |
| `output/pelican-ab-variantA.mjs` | 上游 vs 已采纳方案的几何 + `.brand` 五个部位计算样式 A/B |

**R-1 已裁决 → 见 ledger Ruling 7：否决「右上工具条加第 9 个图标」，改为「左上角 `.brand` 面板整体变成返回链接」。**

实测数字（真实 bundle、HUD 可见、`.tools` 与 `.brand` 的 `getBoundingClientRect()`）：

| 视口 | 上游 `.tools` 与 `.brand` 重叠 | 加第 9 个按钮后 | 采纳方案（brand 变链接） |
|---|---|---|---|
| 320×700 | 重叠 63px，`tools.x=8` | 重叠 99px，**`tools.x=-28` 溢出屏幕左缘，最左按钮点不到** | 与上游**逐值相同** |
| 360×740 | 重叠 23px | 重叠 59px | 与上游**逐值相同** |
| 375×812 | 重叠 8px | 重叠 44px | 与上游**逐值相同** |
| 414×896 | **不重叠（gap 31px）** | **重叠 5px ← 唯一被打破的干净档位** | **不重叠** |
| 768×1024 | 不重叠 | 不重叠（宽 360→404） | 与上游逐值相同 |
| 1440×900 | 不重叠 | 不重叠（宽 360→404） | 与上游逐值相同 |

要点：**上游自己在 ≤375px 就有重叠**，那是它的既有缺陷，按 GC-1 我们不修；但第 9 个按钮会把工具条撑宽 36px（移动）/44px（桌面），在 414px 这个上游本来干净的常见手机档位压出重叠，并在 320px 把最左按钮推出屏幕。采纳方案把 `.tools` **完全不动**（六档全部 `toolsCount 8=8`、box 逐值相同、`toolsOffscreen=false`），因此**零回归是由构造保证的，不是靠阈值放宽**。

采纳方案的视觉代价实测：`.brand` 及其四个后代（`b` / `small` / `.logo` / `> div`）在六档视口共 60 个取样点上，`color` 与 `text-decoration-line` **全部逐值相同**（`tdl` 60/60 为 `none`；`color` 只有 `rgb(244,246,251)` 与 `rgba(236,240,250,0.66)` 两种，两方案一致），`.brand` 的 box 六档全部 `identical=true`。**唯一的计算样式差异是 `cursor: auto → pointer`**，那是链接应有的手势提示，属期望行为。

**R-2 已解决：headless Chromium 拿得到 WebGL，不需要 headed msedge。** 实测 `body.ready` 在 45s 内触发，canvas 1440×900，`window.__pelican` 暴露 `pelican,bike,view,S,settings,setCamMode,jump,trick,honk,ringBell,spawnFish,launchJumper,cine,renderer,fps`，探针渲染器为 `WebKit WebGL`（SwiftShader）。全程 **外部请求 0、pageerror 0、console.error 0**。Task 5 直接用 headless。

**R-3 已解决：`data-pagefind-ignore="all"` 挂在 `<body>` 上有效。** 实测两页 scratch 站点（一页带该属性、一页正常），pagefind v1.5.2 报 `Indexed 1 page`、`fragment/` 下只有 1 个 `.pf_fragment`、`index/` 只有 1 个 chunk —— 带属性的那页被整页排除。**注意验证方法**：不要 grep 索引里的中文（pagefind 把内容存进压缩 fragment，明文 grep 匹配不到，控制器第一次这么试时连正常页面都返回 0，是假阴性）。正确判据是 **pagefind stdout 的 `Indexed N page` 与 `fragment/` 文件数**。Task 4 照此验证。

**R-4（新增，控制器实测发现）行尾陷阱**：上游 blob 是 **LF**，但本机 `core.autocrlf=true` 会把工作区 smudge 成 CRLF。`cp -r`、`git archive`、`git checkout` **三条路径都会拿到 CRLF**，md5 与上游 blob 不符。唯一可靠取法是 `git cat-file blob HEAD:<path> > <file>`（或 raw.githubusercontent.com，它给的是 blob 原字节）。且本仓库**没有 `.gitattributes`**，所以：写 LF 文件 → `git add` → 索引里是 LF（与上游一致），但工作区在 Windows 上会被 smudge 成 CRLF。**因此 Task 1 的「逐字节相同」判据必须比索引里的 blob，不能比工作区文件**（详见 Task 1 验证节）。控制器第一次暂存参照物时正是踩了这个坑，md5 全错，已用 `git cat-file blob` 重取并核对。

---

## Task 1：vendor 上游源码（逐字节）+ 溯源 README

**做什么**

1. 在仓库根建 `vendor/pelican-bike/`，从上游 commit `54adc1f` 拷入：
   - `src/` 全部 11 个 `.js`（`audio.js` `bicycle.js` `effects.js` `fish.js` `main.js` `ocean.js` `pelican.js` `sky.js` `textures.js` `util.js` `world.js`）—— **逐字节，一个字符都不许改**
   - `index.template.html` —— 本任务先放**上游原样**（Task 2 才改它）
   - `build.mjs` —— 上游原样（Task 3 才改输出路径）
   - `package.json` —— 上游原样，但**删掉 `playwright-core` 这一条依赖**（GC-4）
2. **不要**拷 `package-lock.json`（GC-4）、**不要**拷 `dist/`。
3. 新建 `vendor/pelican-bike/README.md`，内容必须包含：
   - 上游仓库 URL + 上游目录路径 + commit sha `54adc1fb64155f9dd7c1c90ecae7b8185ac540b8` + 抓取日期 2026-09-25
   - 一句话说明这是什么（Claude Opus 5.5 one-shot 生成的 Three.js 单文件 3D 游戏「鹈鹕骑单车」，海岸公路骑行、程序化建模、Verlet 布料围巾、Gerstner 海浪、昼夜循环、合成音效）
   - **许可声明事实**：上游根目录无 LICENSE 文件，仅 `pelican-bike/package.json` 声明 `"license": "ISC"`；我们保留该字段与游戏内既有的 GitHub / X 署名链接
   - **我们的改动清单**（本任务先写"暂无，Task 2/3 追加"，后续任务回来补）
   - 重建方法（Task 3 写完后补精确命令）
   - 明确写：本目录**不参与 `pnpm build`**，是留档 + 手动重建用
4. `.gitignore` 追加：
   ```
   # vendored 第三方游戏源码的本地构建依赖（不参与 pnpm build）
   vendor/pelican-bike/node_modules/
   ```
   放在 `# local tool artifacts` 段之前，独立成段。

**验证（必须贴出命令与输出）**

- ⚠️ **取源必须用 `git cat-file blob`，不能用 `cp` / `git archive` / `git checkout`** —— 本机 `core.autocrlf=true`，那三条路径都会把工作区 smudge 成 CRLF（R-4 实测踩过）。正确做法：
  ```bash
  git cat-file blob 54adc1fb64155f9dd7c1c90ecae7b8185ac540b8:pelican-bike/src/main.js > vendor/pelican-bike/src/main.js
  ```
  控制器已把 14 个文件的 LF 原字节暂存在 `output/upstream-pelican-bike-54adc1f/`，**直接从那里 `cp` 即可**（它已经是 blob 原字节），不必再碰上游仓库。
- **逐字节判据要比索引里的 blob，不能比工作区文件**（本仓库 `core.autocrlf=true` 且**没有 `.gitattributes`**，工作区会被 smudge 成 CRLF，直接比会假失败）。正确流程：先 `git add vendor/pelican-bike/`，再逐个比对
  ```bash
  git cat-file blob :vendor/pelican-bike/src/main.js | md5sum
  ```
  与下表基线 md5 全等；并用 `git ls-files --eol vendor/pelican-bike/**` 确认每个文件都是 `i/lf`。
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
  89528bdab1cc0e3acb3f3716149b632d  index.template.html   ← 这是 Task 2 之前的基线；Task 2 之后此文件会变，不再适用
  2de76684fa3c1168e3e29a2d5402846c  build.mjs             ← Task 3 之后会变，不再适用
  2cf9a7e81dea487b3aff160157cdd886  package.json          ← 删掉 playwright-core 之后会变，不再适用
  ```
  **11 个 `src/*.js` 的 md5 在所有任务之后都必须仍然等于上表**（GC-1 的机器可检形式）。
- 建议同时新增 `.gitattributes`，内容 `vendor/pelican-bike/** -text` 与 `public/pelican-bike/** -text`，让这两处的字节在**工作区也**保持 LF，从此 naive 的 md5 比对不会再假失败。本仓库当前没有 `.gitattributes`，这是新建文件；**只写这两行，不要加任何全局规则**（全局 `* text=auto` 会把仓库里既有的 CRLF 文件全部重规范化，制造巨大无关 diff）。若你不确定，**跳过这一步并在报告里说明**，由控制器裁决 —— 它不是必需的，只是消除陷阱。
- `ls vendor/pelican-bike/` 确认无 `package-lock.json`、无 `dist/`、无 `node_modules/`。
- `node -e "const p=require('./vendor/pelican-bike/package.json'); console.log(Object.keys(p.dependencies))"` → 输出应只含 `esbuild`、`lil-gui`、`three`，且 `p.license === 'ISC'`。
- `git check-ignore -v vendor/pelican-bike/node_modules/` → 命中新加的规则。
- `pnpm exec prettier --check ./src` 仍绿（证明 vendored 代码没落进 `src/`，GC-6）。

**不要做**：不要改 `src/config.ts`，不要建 `public/pelican-bike/`，不要装任何 npm 包。

---

## Task 2：模板注入两处返回入口 + pagefind 忽略

**前置**：Task 1 完成，`vendor/pelican-bike/index.template.html` 是上游原样。

**做什么**（只改 `vendor/pelican-bike/index.template.html`，三处，**不加任何 CSS**）

1. **pagefind 忽略**（GC-5）：把第 191 行的 `<body class="bars">` 改成
   ```html
   <body class="bars" data-pagefind-ignore="all">
   ```
2. **开场卡返回链接**：在 `.intro-links` 这个 `<div>` 的**第一个子元素位置**插入（即排在既有「GitHub 开源仓库」之前，不打乱那两个署名链接的相对顺序）：
   ```html
      <a href="/"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 2 12h3v8h6v-6h2v6h6v-8h3z"/></svg>返回博客首页</a>
   ```
   缩进与同组既有 `<a>` 对齐（上游用 6 空格）。`svg` 不带 `fill`/`width` 属性 —— CSS 62 行 `.intro-links svg { width:14px; height:14px; fill:currentColor }` 会接管。
3. **HUD 返回入口 = 把左上角 `.brand` 面板整体变成返回链接**（**不要动 `.tools`**，理由见 R-1 实测表）。上游那一行是单行结构：
   ```html
     <div class="brand panel"><span class="logo">🐦</span><div><b>鹈鹕骑单车</b><small>Pelican on a Bike · 实时 3D</small></div></div>
   ```
   改成：
   ```html
     <a class="brand panel" href="/" style="color:inherit;text-decoration:none" title="返回博客首页" aria-label="返回博客首页"><span class="logo">🐦</span><div><b>鹈鹕骑单车</b><small>Pelican on a Bike · 实时 3D</small></div></a>
   ```
   即：把该行**第一个** `<div class="brand panel">` 换成上面那个 `<a ...>` 开标签，把该行**最后一个** `</div>` 换成 `</a>`；内部的 `<span class="logo">`、内层 `<div>`、`<b>`、`<small>` 与其中文文本**逐字保留**。
   - `.panel` 已带 `pointer-events:auto`，`.brand` 已带 `display:flex`，所以 `<a>` 直接可用，**不需要任何 CSS 改动**。
   - 模板里**没有任何全局 `a` 选择器规则**（控制器已 grep 确认，CSS 里只有 `* { box-sizing:border-box }`），所以浏览器默认的蓝色 + 下划线必须靠上面那个 inline `style` 压掉 —— 实测压掉后 `.brand` 及其四个后代的 `color` / `text-decoration-line` 与上游 60/60 取样点全同，唯一差异是 `cursor: auto → pointer`。
   - `.brand > div{display:none}`（窄屏）、`.brand small{display:none}`、`.brand b`、`.brand .logo` 都是后代/子选择器，外层从 `div` 换成 `a` 后**照样命中**，六档视口实测 `.brand` 的 box 与上游逐值相同。

4. 回填 `vendor/pelican-bike/README.md` 的「我们的改动清单」，逐条写明上面三处 + 各自的选择器锚点（**按 AGENTS.md 的文档约定：以选择器为锚点，行号只作辅助且必须写「约」**）。

**验证（必须贴出命令与输出）**

- **可逆性证明（本任务的核心判据，比数 diff 行数强得多）**：写一个脚本，把我们的三处注入**逆向剥掉**（`<body class="bars" data-pagefind-ignore="all">` 还原成 `<body class="bars">`；删掉 `.intro-links` 里我们插入的那一行；把 `.brand` 的 `<a ...>` 开标签还原成 `<div class="brand panel">`、该行最后一个 `</a>` 还原成 `</div>`），然后断言结果与 `output/upstream-pelican-bike-54adc1f/index.template.html` **逐字节全等**（`===` 为 true）。控制器已在 scratch 里对前两处注入验证过这个手法可行；三处全剥后必须仍然全等。**这条通过即同时证明了 GC-1（没碰游戏逻辑）、GC-2（没碰 CSS、没碰署名链接）与改动最小化，不必再单独数 diff 行数。**
- 脚本断言（用 `match(/…/g).length` 数**出现次数**，不要用 `grep -c`，理由见 ledger Ruling 2）：`href="/"` 恰好 **2** 次；`data-pagefind-ignore="all"` 恰好 **1** 次；`class="brand panel"` 恰好 **1** 次且其所在元素是 `<a>`。
- 脚本断言：`<style>…</style>` 整块与上游**逐字节相同**（GC-2 的机器可检形式；控制器实测本方案下该断言为 true）。
- 脚本断言：上游两个署名链接仍在 —— `github.com/riba2534` 出现 **2** 次（intro + HUD），`x.com/riba2534` 出现 **2** 次。
- 脚本断言：`.tools` 面板**未被触碰** —— 其中不含 `href="/"`，子元素计数仍为 8（📸 🎵 🔗 ⛶ ⚙️ ？ + GitHub + X）。
- 模板必须保持 **LF** 行尾（`file` 输出不含 "CRLF"，见 R-4）。
- `src/*.js` 仍然 11 个文件对上游零差异（重跑 Task 1 的比对，确认这个任务没误伤）。

**不要做**：不要动 CSS，不要动 `src/*.js`，不要构建，不要改导航。

---

## Task 3：构建脚本 + 产出 public 产物 + 证明 delta

**前置**：Task 2 完成。

**做什么**

1. 改 `vendor/pelican-bike/build.mjs`：把输出从 `dist/index.html` 改为 `../../public/pelican-bike/index.html`（用 `mkdirSync(..., {recursive:true})`，路径基于脚本自身位置 `import.meta.dirname`，**不要基于 `process.cwd()`** —— 本仓库 AGENTS.md 记过 `about.astro` 因 `import.meta.url` 打包后指向 dist/chunks 而静默走回退卡的坑，这里同理要用稳的锚点）。其余逻辑（minify、`<\/script` 转义、`<!--OG_IMAGE-->` 替换、`/*APP_JS*/` 替换、体积打印）**逐字保留**。
2. 在 `vendor/pelican-bike/` 下**本地**安装构建依赖（**不碰仓库根 `package.json`**，GC-3）：
   ```bash
   cd vendor/pelican-bike
   npm install --no-package-lock --no-audit --no-fund --registry=https://registry.npmmirror.com three@0.186.0 lil-gui@0.21.0 esbuild@0.28.2
   node build.mjs
   ```
   ⚠️ **必须带 `--no-package-lock`**：上游 lock 指向字节内网 registry，且本仓库 `.gitignore` 已忽略 `package-lock.json`，生成新的会造成困惑。
3. 把这条重建命令写进 `vendor/pelican-bike/README.md`（替换 Task 1 的占位）。
4. 确认 `public/pelican-bike/index.html` 被 git 跟踪（**它是要提交的产物**，不进 .gitignore）。

**验证（必须贴出命令与输出）**

- **体积基线（控制器实测，注意别追错数字）**：用 **LF 模板**构建时，上游原样产物 = **818,345 字节**，我们的产物 = **818,613 字节**，delta = **+268 字节**（= 三处注入）。⚠️ 若你量到 818,665，那是**模板被 smudge 成 CRLF** 后构建的结果（320 行 × 1 个 `\r`）—— 说明你的模板行尾错了，回到 Task 1/2 的 LF 判据修，不要把这个数字当成正确基线。给出 `ls -la` 与脚本打印的 KB 数。
- **Delta 证明（本任务的核心判据）**：另建一份"上游原样模板"构建出的对照产物，与我们的产物做 diff，**差异必须只有注入的那 3 处**（body 属性 + 2 个 `<a>`），其余（含 774 KB 的 JS）逐字节相同。给出对照构建方法与 diff 输出摘要（差异行数、差异内容片段）。
- `grep -c 'href="/"' public/pelican-bike/index.html` → 2。
- `grep -c 'data-pagefind-ignore' public/pelican-bike/index.html` → 1。
- `git status --short` 确认仓库根 `package.json` / `pnpm-lock.yaml` **未被改动**（GC-3）。
- 产物里没有 `playwright`、没有 `bnpm.byted.org` 字样。

**不要做**：不要改导航，不要写 smoke 测试，不要跑 `pnpm build`。

---

## Task 4：导航入口 + Pagefind 排除实测

**前置**：Task 3 完成，`public/pelican-bike/index.html` 已存在。

**做什么**

1. `src/config.ts` 的 `resourceSite`（约 78–82 行）末尾追加一项：
   ```ts
   { name: "鹈鹕骑车", url: "/pelican-bike/", noSwup: true },
   ```
   `noSwup: true` 与「AI日报」「每日好书」同款 —— 独立壳页面不走 Swup 容器切换。
2. 改完对 `src/config.ts` 跑 `pnpm exec prettier --write`（GC-9）。

**验证（必须贴出命令与输出）**

- `pnpm build` 全链跑通（会串起 7 个单测 + slug 校验 + fetch 脚本 + astro build + inject-buddha-banner + pagefind）。**注意 AGENTS.md 的坑：Windows 上 `pnpm build` 失败时尾部可能看不到完整错误（esbuild 崩溃断言），必须看完整输出而非 `tail`。** 贴出结尾的成功摘要。
- `dist/pelican-bike/index.html` 存在。**注意：它不会与 `public/pelican-bike/index.html` 逐字节相同** —— `pnpm build` 链里 `astro build` 之后紧跟 `node scripts/inject-buddha-banner.mjs`，该脚本 `walkHtmlFiles(dist)` 遍历 **dist 下全部 `.html`**，给每个文件 (a) 在文件首行前插入「佛祖保佑」HTML 注释横幅、(b) 在 `<head>` 起始处插入一行内联 `<script>console.info(...)</script>`。正确判据是：**剥掉这两处已知注入后，与 `public/pelican-bike/index.html` 逐字节相同**。给出剥离方法与比对输出。
  - 附带确认（写进报告即可，不需改动）：注释横幅位于 `<!doctype html>` 之前**不会触发 quirks mode**（HTML5 initial 插入模式下 comment token 被插入 Document 且模式保持 initial），全站每个页面早已如此，属既定行为；内联 `console.info` 不产生任何网络请求，对 GC-1「保留一切视觉表现」无影响。
- **GC-5 实测**：在 `dist/pagefind/` 里 grep「鹈鹕」与「Pelican」→ **必须零命中**。若命中，说明 R-3 的 `<body>` 属性位置无效，**停下来上报**并给出你实测到的 pagefind 行为，由控制器裁决改法。
- **导航渲染实测**（Playwright，起 `pnpm preview`）：
  - 桌面视口 1440×900：`#nav` 的「本站资源」下拉里出现「鹈鹕骑车」，`href` 为 `/pelican-bike/`，且带 `noSwup` 对应的属性/行为（对照「每日好书」那一项，断言两者属性形态一致）。
  - 移动视口 375×812：MMenu 全屏菜单的「本站资源」分组里同样出现「鹈鹕骑车」。
  - 点击后落地 `/pelican-bike/`，HTTP 200。
- `pnpm check`（astro check）绿。
- `pnpm exec prettier --check ./src` 绿。
- `pnpm smoke:ui` 仍绿（确认没打破既有判据；**特别注意它的常驻重复 id 负扫** —— 我们的游戏页不在 sitemap 里，不会被扫到，但要确认没别的影响）。

**不要做**：不要改 Navbar.astro / MMenu.astro（AGENTS.md 明确这两处是数据驱动自动渲染，只改 config）。若实测发现某处没自动渲染出来，**停下来上报**，不要直接改组件。

---

## Task 5：Playwright smoke 测试

**前置**：Task 4 完成。

**做什么**

新建 `scripts/pelican-bike-smoke.mjs`，并在 `package.json` 的 `scripts` 里加：
```json
"smoke:pelican": "node scripts/pelican-bike-smoke.mjs"
```
风格对齐 `scripts/fancybox-smoke.mjs` / `scripts/nice-books-smoke.mjs`（先读它们再写）：需先 `pnpm build && pnpm preview`，支持 `PELICAN_BASE_URL` 环境变量覆盖地址（**传站点根**，脚本自己拼 `/pelican-bike/`，与 `FANCY_BASE_URL` / `UI_SMOKE_BASE_URL` 同形态 —— AGENTS.md 记过三种形态混用会造成「选择器等不到」的假失败）。默认 `http://127.0.0.1:4322`。

**判据（全部挂在状态信号上，禁止 `waitForTimeout`，GC-8）**

1. `GET /pelican-bike/` → 200，`content-type` 含 `text/html`。
2. 等 `document.body.classList.contains('ready')` 为真（`main.js:1369` 首帧预热后添加）。设一个上限超时（如 30s），超时即失败并打印 console 与 pageerror。
3. `<canvas>` 存在且 `getBoundingClientRect()` 宽高均 > 0；`window.__pelican` 存在且 `typeof window.__pelican.view === 'function'`（证明游戏真的初始化了，不是白屏）。
4. **两处返回入口**：
   - `.intro-links a[href="/"]` 存在 1 个，文本含「返回博客首页」，`getBoundingClientRect()` 可见（宽高 > 0）。
   - `a.brand[href="/"]` 存在 1 个（**标签必须是 `A` 不是 `DIV`**），`aria-label` 为「返回博客首页」，宽高 > 0，且 computed `text-decoration-line === "none"`、`color === "rgb(244, 246, 251)"`（证明 inline style 压掉了浏览器默认链接样式）。
5. **上游署名链接与 `.tools` 未被破坏**：`.intro-links a[href*="github.com/riba2534"]` 与 `a[href*="x.com/riba2534"]` 各存在；`.tools a[href*="github.com/riba2534"]` 与 `.tools a[href*="x.com/riba2534"]` 各存在；`.tools > *` 计数 **恰好 8**（我们没往里加东西）。
6. **零外部请求**：监听 `request` 事件，收集所有请求 URL，断言**除站点自身 origin 外零请求**（上游实测无任何外部资源）。列出任何越界 URL。
7. **玩法未被破坏**：点 `#startBtn` → 等 `body.classList.contains('started')`；随后断言 `#intro` 的 computed `visibility === 'hidden'`（CSS 40 行，transition 0.9s，所以要等 computed 值真的变，用 `waitForFunction` 而不是死等）；`.hud` 的 computed `opacity` 收敛到 `1`（CSS 67 行）。
8. **窄屏几何「零回归」实测（判据是"与上游相同"，不是"不重叠"）**：在 320×700、360×740、375×812、414×896、768×1024、1440×900 **六档**视口下，量 `.tools` 与 `.brand` 的 `getBoundingClientRect()`，断言：
   - `.tools` 的 box 与 `.brand` 的 box **六档全部与上游产物逐值相同**；
   - `.tools > *` 计数六档全部为 **8**；
   - `.tools` 的 `x >= 0`（不溢出屏幕左缘）。
   ⚠️ **不要断言「`.tools` 与 `.brand` 不重叠」** —— 上游自己在 320/360/375 三档就重叠（实测 63/23/8px），那是它的既有缺陷，按 GC-1 我们不修。写成"不重叠"会让判据在上游既有行为上变红，进而诱使人去改原版样式。**判据必须是 A/B 零回归。** 上游基线产物在 `output/pelican-scratch/upstream.html`；`output/pelican-ab-variantA.mjs` 已经实现了这条 A/B，直接改写它。
   - 附带记录（不作为失败条件）：`.brand` 五个部位（`.brand`、`.brand b`、`.brand small`、`.brand .logo`、`.brand > div`）的 computed `color` 与 `text-decoration-line` 应与上游逐值相同，`cursor` 允许从 `auto` 变为 `pointer`。
9. **两处返回入口都真的能回主站**：在 `body.started` 状态下分别点 `a.brand[href="/"]` 与（另开一页、不点开始的情况下）`.intro-links a[href="/"]`，用 `page.mouse.click(x,y)` 或合成 `el.click()`，**不要用 `locator.click()`** —— AGENTS.md 记过它会自动滚页面造成假差异。断言落地 URL 是站点根且首页主内容存在（如 `#header` 或 `.post-list`）。
10. 全程 `pageerror` 计数为 0；console 里无 `error` 级消息（`warn` 记录但不失败）。**必须容忍一条既定的 `console.info`**：`inject-buddha-banner.mjs` 给 dist 全部 HTML 注入的「佛祖保佑」内联脚本（见 Task 4）。它不是缺陷，不要为此改构建链、不要在断言里把它当 error。
11. **判据 6 的取样范围只限游戏页**：只在 `/pelican-bike/` 这一个 document 的生命周期内收集请求。判据 9 会导航到站点根，那是另一个 document，它加载博客自身的 CSS/字体/播放器属正常，**不得计入"零外部请求"断言**。

**验证**

- `pnpm build && pnpm preview`（后台）→ `pnpm smoke:pelican` 全绿，贴出完整逐条输出与总计。
- **变异验证（mutation proof）**：本仓库的硬规矩 —— 每条"锁现状"型判据都要证明它真的会咬人。至少对判据 4、5、8 各做一次：临时把对应内容改坏（如把 `href="/"` 改成 `href="/x"`、删掉一个署名链接、把 `.tools` 里塞第 10 个按钮），重跑 smoke，确认**变红**，然后改回。贴出每次变红的输出片段与改回后复绿的确认。
- `pnpm exec prettier --write scripts/pelican-bike-smoke.mjs package.json`，随后 `pnpm exec prettier --check ./src` 与根目录格式确认。

**不要做**：不要把 `smoke:pelican` 串进 `pnpm build`（它需要 preview 服务，串进去会让 CI 假红 —— 同 `pnpm audit:ledger` 的处理理由）。

---

## Task 6：文档收口

**前置**：Task 5 全绿。

**做什么**

1. `AGENTS.md` 的「静态替代动态功能的映射」表**末尾追加一行**（**只加一行，不动表格既有内容，不动文件上半部的只读区**）：

   | 原 Emlog 功能 | 现实现 |
   |---|---|
   | 鹈鹕骑车（本站资源） | vendored 第三方 Three.js 单文件游戏（上游 `riba2534/claude-opus-5-5-demo` 的 `pelican-bike/`，commit `54adc1f`，ISC）：源码留档 `vendor/pelican-bike/`（11 个 JS 模块与上游逐字节相同），产物 `public/pelican-bike/index.html`（约 799 KB 单文件，零外部资源）；**不参与 `pnpm build`**，重建走 `vendor/pelican-bike/` 内本地 `npm install --no-package-lock three@0.186.0 lil-gui@0.21.0 esbuild@0.28.2` + `node build.mjs`。相对上游只改模板三处：`<body>` 的 `data-pagefind-ignore="all"`（不进博客搜索，同 `/books/` 策略）+ `.intro-links` 与 `.tools` 各插一个 `href="/"` 返回入口（复用既有 `.icon-btn` / `.intro-links a` 元件，零新增 CSS）。导航入口 `navBarConfig.resourceSite`「鹈鹕骑车」（`noSwup: true`）。**上游 `package-lock.json` 不得 vendor**（钉到字节内网 registry，`npm install` 报 `EALLOWREMOTE`）。回归 `pnpm smoke:pelican`（需先 build + preview，`PELICAN_BASE_URL` 传站点根） |

   ⚠️ 这一格里写的每个数字都必须是你**实测到的**，不是抄本票册的。若实测与本票册不符（例如产物字节数变了），以实测为准并在格子里写实测值。

2. `AGENTS.md` 的「常用命令」代码块里，在 `pnpm smoke:ui` 那一条之后加一行 `pnpm smoke:pelican` 的说明（形态与既有条目一致：说明它需要先 build + preview，`PELICAN_BASE_URL` 传**站点根**）。

3. `README.md`：若存在功能/资源清单段落，把「鹈鹕骑车」加进去（与「每日好书」「AI日报」同处）。**先读 README 确认有没有这样的段落**；没有就不加，不要新造章节。

4. `.gitignore` 复核：Task 1 加的 `vendor/pelican-bike/node_modules/` 在位；确认 `public/pelican-bike/index.html` **没有**被任何规则忽略（`git check-ignore -v` 应无输出）。

**验证**

- `git diff AGENTS.md README.md .gitignore` 贴出，确认只有上述追加，无误删。
- 全文 grep 确认 AGENTS.md 上半部只读区（`## Agent skills` 之前的固定段）未被触碰。
- `pnpm exec prettier --check ./src` 绿（AGENTS.md / README.md 在根目录，不受该检查约束 —— 本仓库已记「root files aren't prettier-gated」，不要为此把 md 塞进 .prettierignore）。

**不要做**：不要提交、不要推送（见下）。

---

## 收口（控制器负责，不派子代理）

1. 跑 `scripts/sdd-workspace` 指定的 ledger，确认 6 个任务都有 `complete` 行。
2. 派**终审**（whole-branch review，MERGE_BASE = 本轮起点 commit）。
3. 终审干净后：
   - **向用户汇报，等用户明确点头再 commit / push。** 本仓库的用户裁决是「实现完先停下来给他预览」，且 push 属于需确认的共享状态操作。
   - 汇报必须包含：预览 URL（`http://127.0.0.1:4322/pelican-bike/`）→ 该做什么 → 每项应该看到什么；以及全部 `Ruling:` 清单。
4. **许可提醒必须出现在汇报里**：上游无 LICENSE 文件，仅 `package.json` 声明 ISC。是否接受这一许可状态由用户判断，控制器不代为决定。

## 未纳入本轮（明确 out of scope）

- 不把 `/pelican-bike/` 加进 sitemap（它是 `public/` 静态文件，不是 Astro 路由；且刻意不进搜索索引，进 sitemap 与此矛盾）。
- 不接入 `pnpm build` 链（GC-3 / 用户裁决）。
- 不动 `U` 键隐藏界面时 HUD 返回按钮一并消失的行为 —— 那是原版玩法（CSS 68 行 `!important`），用户选的是「HUD 图标 + 开场卡链接」而非「常驻独立按钮」，因此**隐藏界面后无返回入口是本轮接受的既定结果**。
- 不 vendor 上游另外两个游戏（`cf-transport-ship`、`qq-speed`）。
