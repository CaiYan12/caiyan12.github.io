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

上游仓库**根目录没有 LICENSE 文件**，仅在 `pelican-bike/package.json` 中声明 `"license": "ISC"`。
我们保留该字段原样，并保留游戏内既有的 GitHub / X 署名链接
（`https://github.com/riba2534/claude-opus-5-5-demo` 与 `https://x.com/riba2534`，
在 `index.template.html` 的 intro 与 HUD 中各出现一次）。
本目录**不额外添加**我们自己的 LICENSE。

## 我们本目录的内容与改动清单

拷贝自上游、**逐字节未改**的文件：

- `src/` 全部 11 个 `.js`（`audio.js` `bicycle.js` `effects.js` `fish.js` `main.js` `ocean.js`
  `pelican.js` `sky.js` `textures.js` `util.js` `world.js`）—— 游戏逻辑、数值、配色、动画、镜头、
  成就、音效一律不改。
- `build.mjs` —— 上游原样。输出路径的改动在后续任务追加（见下）。
- `index.template.html` —— 目前是上游原样。模板的三处注入（pagefind 忽略属性、返回博客的链接、
  `.brand` 面板变成返回链接）在后续任务追加（见下）。

对上游的**唯一**已做改动：

- `package.json`：删除依赖 `"playwright-core": "^1.63.0"` 这一条，其余字段与缩进逐字节保持上游原样。
  原因：上游 `package-lock.json` 把 `playwright-core` 钉到字节跳动内网 registry
  （`https://bnpm.byted.org/...`），`npm install` 会直接以 `EALLOWREMOTE` 失败；该包只用于上游自测，
  构建产物不需要它。**因此本目录也不 vendor `package-lock.json`**，`dist/` 同样不 vendor。

后续任务改动（本任务先记「暂无」，完成后回来补精确内容）：

- `index.template.html`：暂无（Task 2 追加）。
- `build.mjs`：暂无（Task 3 追加输出路径改动）。

## 重建方法

精确命令由 Task 3 写完后补充。当前上游自有的构建方式为在该目录下执行
`node build.mjs`（先 `npm install --no-package-lock` 装 `esbuild`；`--dev` 参数关闭压缩），
产物写到 `./dist/index.html`。本仓库的产物落点与脚本入口以 Task 3 的补充为准。

## 与主站构建的关系

**本目录不参与 `pnpm build`**，不参与 `pnpm check`、`prettier --check ./src`（它在仓库根的
`vendor/`，不在 `src/` 内）。这里的代码是**留档 + 手动重建用**：站点实际访问的是重建后的静态产物，
该产物由后续任务落到 `public/pelican-bike/`（本任务不创建该目录）。

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
