# KaTeX 第五批独立升级：0.16.47 → 0.19.1

目标：仅把 `katex` 升至精确 0.19.1，保留 Markdown 管线、`rehype-katex` 配置、公式保护测试与全部文章内容。

**结论：已完成本地验收（未推送、未提交）。** 与计划的差异有两处：一处是计划漏记的上游破坏性变更，一处是必须新增的 `pnpm.overrides`。两处都会影响结论可信度，先写清楚。

---

## 1. 风险判定：计划的前提是错的

原评估文档（`2026-11-03-phase5-migration-assessment.md`）与实施计划都把 KaTeX 判为**低风险**，理由写的是「0.19.0 唯一的破坏性变更是 `strict` / `symbolNotInFont`，本站 `rehypeKatex` 未传选项即默认 `strict: "warn"`，不触发硬失败」。

**核对上游 CHANGELOG 后，这个前提不成立。** 0.16.47 → 0.19.1 跨了三个带 BREAKING 的版本：

| 版本   | 破坏性变更                                                                                                | 本站是否受影响                      |
| ------ | --------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| 0.17.0 | 内部 API `__defineFunction` 不再把属性包在 `props` 里                                                     | 否（本站不写自定义函数）            |
| 0.18.0 | **内部 CSS 类名统一加 `katex-` 前缀**（[#4229](https://github.com/KaTeX/KaTeX/pull/4229)），20 个类被改名 | **是，全部 307 个公式的 HTML 都变** |
| 0.19.0 | 缺字符度量改为经 `strict` 上报 `symbolNotInFont`                                                          | 否（本站 `strict` 走默认 `warn`）   |

0.18.0 的重命名清单（取自[官方迁移指南](https://github.com/katex/katex/blob/main/docs/migration.md)）：

```
accent→katex-accent      base→katex-base            fix→katex-fix
hdashline→katex-hdashline hline→katex-hline         inner→katex-inner
newline→katex-newline    overlay→katex-overlay      overline→katex-overline
root→katex-root          rule→katex-rule            sizing→katex-sizing
smash→katex-smash        sout→katex-sout            stretchy→katex-stretchy
strut→katex-strut        tag→katex-tag              thinbox→katex-thinbox
underline→katex-underline vbox→katex-vbox
```

本站实际用到的只有 6 个（2026-11-03 从 4 篇公式文章的产物 HTML 里统计）：

| 新类名            | 出现次数 |
| ----------------- | -------- |
| `katex-base`      | 669      |
| `katex-strut`     | 669      |
| `katex-sizing`    | 529      |
| `katex-underline` | 64       |
| `katex-overline`  | 48       |
| `katex-accent`    | 11       |

### 1.1 还查到一条计划完全没有的：CVE-2026-103923

[**CVE-2026-103923**](https://nvd.nist.gov/vuln/detail/CVE-2026-103923)（CWE-807）：KaTeX `>=0.11.0 <0.18.2` 对 options 对象、`trust` 设置等处使用普通属性访问，继承属性会被当成显式传入的值。当 `Object.prototype` 已被污染时，攻击者可用继承来的 `trust` 值开启可信渲染，产出可点击的 XSS 链接或加载外部资源。**修复版本 0.18.2**，公开日期 2026-10-02。

**本站暴露面判定：不可利用，但确实落在受影响区间内。**

- 本站是纯静态站，Markdown 由站长撰写，构建期不接收外部输入；
- `rehypeKatex` 未传 `trust` 选项，也不存在「攻击者控制 options 原型」的入口；
- 真正的前置条件——`Object.prototype` 已被污染——在本站没有产生路径。

所以这条**不构成本次升级的紧急理由**，但它是这批升级唯一的硬性收益，不能略过不写。

---

## 2. 计划执行会失败的原因（已实测证明）

`rehype-katex@7.0.1` **已经是 latest**（2026-11-03 查询，之后没有新版本），但它的 `katex` 依赖范围写的是 `^0.16.0`。对 0.x 来说 `^0.16.0` 等价于 `>=0.16.0 <0.17.0`，**不包含 0.19.1**。

按计划 Task 2 直接 `pnpm add --save-exact katex@0.19.1` 之后，pnpm 的实际解析是：

```
构建期 HTML  ←  rehype-katex → 嵌套 katex@0.16.47  →  输出 .base / .strut（旧类名）
运行期 CSS   ←  根 node_modules/katex → 0.19.1     →  样式选择 .katex-base / .katex-strut
                                                    ⇒ 类名对不上，公式基线漂移
```

真实项目里的符号链接实测：

```
node_modules/.pnpm/rehype-katex@7.0.1/node_modules/katex -> katex@0.16.47
node_modules/.pnpm/mermaid@11.17.2/node_modules/katex    -> katex@0.16.47
node_modules/.pnpm/micromark-extension-math@3.1.0/node_modules/katex -> katex@0.16.47
node_modules/katex                                        -> katex@0.19.1
```

### 2.1 错配的后果（反证实验）

用真实公式（40 个去重样本）分别在真实 Chromium 里渲染「旧 HTML + 旧 CSS」（正确配对）与「旧 HTML + 新 CSS」（错配）：

| 判据         | 结果                                        |
| ------------ | ------------------------------------------- |
| 几何尺寸变化 | **20 / 40 个公式改变**                      |
| 页面总高度   | 2139 px → 2269 px                           |
| 像素差异     | **5.02%**（128880 / 2566800）               |
| 典型样例     | `1168×24.22` → `1168×28.05`（上下留白变大） |

对照组（旧 HTML + 旧 CSS 对比新 HTML + 新 CSS）：**40 个样本 0 差异**。

### 2.2 为什么计划的验收判据抓不到

这是本次最值得记住的一点——**三项判据都会绿，站点已经坏了**：

| 计划中的判据                    | 为什么失效                                                                                 |
| ------------------------------- | ------------------------------------------------------------------------------------------ |
| Task 2 Step 5 公式 A/B          | 脚本里 `import katex from "katex"` 命中**根包**（恒为 0.19.1），压根不测构建实际用的那一份 |
| Task 3 Step 3 KaTeX 资产同源    | 只数「字体族是否都在」，错配下两侧都是 61 个资产、21 个族，照样 0 缺失                     |
| Task 4 Step 3 `.katex` 盒子尺寸 | 只判 `width/height > 0`，错配下盒子非零，只是高度错了（24.22 → 28.05）                     |

补上的判据：**直接数产物 HTML 里的旧类名 `.base` / `.strut` 出现次数必须为 0，新类名 `katex-base` / `katex-strut` 必须非零。** 这条能一眼抓住错配，已写进 `docs/agents/build-and-deploy.md`。

---

## 3. 采用的方案

`package.json` 新增：

```json
"pnpm": {
  "overrides": {
    "katex": "0.19.1"
  }
}
```

效果（实测）：三个消费者全部指向 0.19.1，`0.16.47` 目录虽仍在 store 里但**无任何符号链接指向它**。

```
rehype-katex@7.0.1:                katex@0.19.1
mermaid@11.17.2:                   katex@0.19.1
micromark-extension-math@3.1.0:    katex@0.19.1
```

### 3.1 这是超出「只动一个直接依赖」的改动

本仓库的批次纪律写明「每批只动一个直接依赖，需要联动时必须先记录兼容证据」。`pnpm.overrides` 是本仓库**第一次引入**的机制，且它让 `rehype-katex` 与 `mermaid` 跑在超出各自声明范围的 katex 上。已获站长明确批准后实施。

**代价与边界**：

- `rehype-katex` 只用 `katex.renderToString` 这一个稳定 API（源码第 87、108 行），实测 307 个公式全部正常；
- `mermaid` 对 katex 的依赖在本站是**死代码**——99 个图表里没有一个使用 `$$...$$` 数学语法（实测 `diagrams containing $$ math: 0`），且 mermaid 是动态 `import("katex")`，不参与主包；
- `micromark-extension-math` 的 `html.js` 顶层就 `import katex from 'katex'`，而它的包入口（`index.js`）**会** `export { mathHtml } from './lib/html.js'`，所以这份 katex 在构建期**确实会被加载**（即使 `mathHtml` 没被调用）。经 override 后它同样是 0.19.1，构建与 `pnpm check` 均无报错。**不要把这条写成「本站不经过它」**——那是不成立的。

**将来 `rehype-katex` 若发布支持 katex 0.19+ 的版本，应重新评估是否还需要这条 override。**

### 3.2 连带传递依赖变化：commander 8.3.0 → 15.0.0

锁文件里除 katex 本身，还有一处必然连带：`katex@0.19.1` 声明 `commander: ^15.0.0`（0.16.47 是 `^8.0.0`）。锁文件因此把 `commander@8.3.0` 换成 `commander@15.0.0`。

**这构成一条 Node 版本边界，已核对：**

| 版本               | `engines.node` |
| ------------------ | -------------- |
| `commander@8.3.0`  | `>= 12`        |
| `commander@15.0.0` | `>=22.12.0`    |

- 本机 Node **24.18.0** → 满足。
- `.github/workflows/build.yml` 与 `deploy.yml` 用 **Node 24** → 满足。
- `.github/workflows/lint.yml` 用 **`node-version: 22`**，`actions/setup-node` 解析为最新 22.x；2026-11-03 查 [nodejs.org/dist](https://nodejs.org/dist/index.json) 最新 22.x 为 **22.23.4**，满足 `>=22.12.0`。

**为什么不影响产物**：`commander` 只被 `katex/cli.js`（KaTeX 命令行工具）使用，`katex/dist/katex.js` 与 `katex.mjs` 这两个库入口**完全不引用**它（实测 `grep commander` 在这两个文件里 0 命中）。本站所有脚本走 `import katex from "katex"` 的库入口，**从不调用 katex 的 bin**（`package.json` 没有任何 script 调用它）。

**残留风险（记录，不当成已解决）**：若将来把 lint.yml 的 `node-version: 22` 钉成 `22.11.0` 以下的老小版本，或启用 `engine-strict=true`，安装会警告甚至失败。目前 `pnpm config get engine-strict` 返回 `undefined`，默认只警告。

---

## 4. 验收结果（全部实测，2026-11-03，Windows 11 / Node 24.18.0 / pnpm 10.26.2）

### 4.1 噪声底线（Task 0）

同版本连做两次构建，用 `output/phase5-baseline/compare.mjs` 比对：

| 判据                   | 结果  |
| ---------------------- | ----- |
| `onlyA` / `onlyB`      | 0 / 0 |
| `nonHtmlDiffer`        | 0     |
| `htmlDiffer`           | 146   |
| `htmlDifferStripped`   | 0     |
| `htmlDifferNormalized` | 0     |

与第三、四批记录的基准完全一致（146 来自侧栏「文章推荐」随机）。后续所有 A/B 都以此为噪声线。

### 4.2 公式级 A/B

用站点同款 Markdown 管线（`createMarkdownProcessor` + `remarkCjkFriendly` + `remarkMath` + `visit(["math","inlineMath"])`）抽取全站公式：

- 内容文件 **36** 个，公式 **307** 个（块级 91 / 行内 216）；
- 分布：`20260320000000` 298 个、`20260831000000` 4 个、`20261006110122` 4 个、`20260728000000` 1 个。

逐条用 0.16.47 与 0.19.1 各渲染一次比对哈希：

| 判据                           | 结果          |
| ------------------------------ | ------------- |
| `class-rename-only`            | **307 / 307** |
| `structural-change`            | 0             |
| **新错误（原本能渲染变报错）** | **0**         |
| 修复（原本报错变能渲染）       | 0             |
| 原本就报错的公式               | 0             |

**独立判据交叉验证**：把两侧 HTML 的所有 `class="..."` 属性剥掉后逐字节比对，**307 / 307 完全相同**。这条不依赖我自己的归一化逻辑，避免自证。

### 4.3 构建 A/B

以基线 `dist-1` 对升级后 `dist-after`：

| 判据                   | 结果        |
| ---------------------- | ----------- |
| 文件数                 | 1322 / 1322 |
| `onlyA` / `onlyB`      | 59 / 59     |
| `identical`            | 1107        |
| `differ`（非 HTML）    | **0**       |
| `htmlDiffer`           | 156         |
| `htmlDifferStripped`   | 156         |
| `htmlDifferNormalized` | **4**       |

逐层归因：

1. **59 个改名资产全是哈希重排**，按文件族配对后逐字节比较：**57 个归一化哈希后完全相同**，只有 `katex.css` 与 `katex.js` 有真实内容变化。这 57 个是 mermaid 各图表 chunk，它们 `import` katex chunk 的相对路径哈希变了，导致内容与文件名一起变。
    - `katex.css`：32131 B → 33084 B（类名前缀 + 其他样式修正）
    - `katex.js`：版本本体
2. **156 页 HTML 的差异全部是 asset 哈希引用**（每页 `<link href="/_astro/katex.<hash>.css">` 改了名），归一化哈希后归零。
3. **归一化后仍不同的 4 页，正是 4 篇有公式的文章**，其差异**双向证明**是纯类名重命名：
    - 把 `katex-*` 新类名还原成旧名后，4 页**逐字节相同**；
    - 不做还原时，4 页 **4/4 全部不同**。

### 4.4 KaTeX 资产同源

| 判据                       | 升级前 | 升级后 |
| -------------------------- | ------ | ------ |
| `_astro` 内 KaTeX 相关文件 | 61     | 61     |
| 文件族                     | 21     | 21     |
| **缺失的族**               | —      | **0**  |
| 新增的族                   | —      | 0      |

字体族缺任何一个都会静默回退到系统字体、公式字形错但不报错，所以这条按阻断项处理。

### 4.5 门禁

| 命令                                       | 结果                            |
| ------------------------------------------ | ------------------------------- |
| `pnpm check`                               | 0 errors / 0 warnings / 6 hints |
| `pnpm test:prettier-math`                  | 38 / 38 pass                    |
| `pnpm exec prettier --check ./src ./docs`  | 通过                            |
| `pnpm test:lib`                            | 16 / 16 pass                    |
| `pnpm test:utils`                          | 261 / 261 pass                  |
| `pnpm install --frozen-lockfile --offline` | exit 0（CI 冻结锁不会红）       |

### 4.6 真实浏览器（Chromium，升级后产物，静态服务 `localhost:4330`）

文章页 `/posts/20260320000000/`：

| 判据                           | 1440×900  | 390×900 |
| ------------------------------ | --------- | ------- |
| `.katex` 数量                  | 298       | 298     |
| 零尺寸公式                     | 0         | 0       |
| 原生 MathML                    | 298       | —       |
| `.katex-base` / `.katex-strut` | 652 / 652 | —       |
| **旧类 `.base` / `.strut`**    | **0 / 0** | —       |
| `.katex-error`                 | 0         | 0       |
| 横向溢出                       | 0         | 0       |
| `pageerror`                    | 0         | 0       |
| 本站 `requestfailed`           | 0         | 0       |

加载的样式表是 `/_astro/katex.qjoI73Dg.css`（0.19.1 那份）。「旧类 0 / 新类 652」是 CSS 与 HTML 同源的直接证据。

### 4.7 mermaid 回归

override 把 mermaid 的 katex 也拉到了 0.19.1，因此必须验证图表没受影响。取图表最多的文章 `/posts/20261002081331/`（14 个）：

| 判据                    | 结果 |
| ----------------------- | ---- |
| `pre.mermaid` 块数      | 14   |
| 含 `<svg>`              | 14   |
| `data-mermaid-rendered` | 14   |
| 节点标签                | 72   |
| 横向溢出                | 0    |
| `pageerror`             | 0    |

---

## 5. 未验证边界

- **只验证 Chromium**。未在 Safari / Firefox 实机跑公式页。KaTeX 是纯 DOM + 字体渲染，理论上无引擎差异，但没测就不写成已验证。
- **未跑远端 CI**，未推送、未部署。Linux 侧结论要等推送后看 `Build and Check` / `Deploy` 的 run 日志。
- **只比对了本站自己的 307 个公式**，没有跑 KaTeX 官方的完整测试语料。若有公式写法本站没用过（如 `\htmlData`、`\includegraphics`），其行为变化不在本次证据范围内。
- **未测 `strict: "error"` 场景**。本站不启用，若将来有人给 `rehypeKatex` 传 `strict: "error"`，0.19.0 的 `symbolNotInFont` 会变成硬错误，需要重新评估。
- **错配反证只用了 40 个样本**（去重后），不是全部 307 个。已足以证明量级（20/40 改变、5% 像素），但不是全量统计。

---

## 6. 一次性工具位置（`output/` 被 gitignore，不入库）

| 路径                                           | 用途                                       |
| ---------------------------------------------- | ------------------------------------------ |
| `output/phase5-baseline/compare.mjs`           | 四层产物对照器（复制自第三批）             |
| `output/phase5-baseline/noise-floor.json`      | 噪声底线                                   |
| `output/phase5-baseline/deps-before.txt`       | 升级前直接依赖清单                         |
| `output/phase5-baseline/dist-1` / `dist-2`     | 两次同版本构建                             |
| `output/katex-probe/extract-formulas.mjs`      | 从站点 Markdown 抽取公式                   |
| `output/katex-probe/formulas.json`             | 307 个公式                                 |
| `output/katex-probe/backup/`                   | 改动前的 `package.json` / `pnpm-lock.yaml` |
| `output/katex-probe/ab-compare.json`           | 构建 A/B 结果                              |
| `output/katex-probe/verify-renames.mjs`        | 59 个改名资产的内容比对                    |
| `output/katex-probe/verify-formula-pages2.mjs` | 4 个公式页的类名还原验证                   |
| `output/katex-probe/acceptance.sh`             | 浏览器验收（桌面 + 移动）                  |
| `output/katex-probe/mermaid-check.sh`          | mermaid 回归                               |
| `output/katex-probe/shots/`                    | 截图                                       |
| `D:\pages\_probe-katex\`（项目外）             | 隔离依赖探针、公式 A/B、错配反证           |
