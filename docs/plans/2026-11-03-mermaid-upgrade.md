# Mermaid 第六批独立升级：11.17.2 → 12.2.0

目标：把 `mermaid` 升到精确 12.2.0，**同时保住全站 99 个图表的原有观感**，不改 Markdown 管线、不改图表源码、不改两处视觉契约。

**结论：已完成本地验收（未推送）。** 这批的核心不是版本号，而是「12 改了三个默认值，必须逐个钉回」——尤其 `wrappingWidth` 这一项，`layout: "dagre"` 挡不住，若不处理会让全站图表变形。

---

## 1. 站长决策：接受 Safari 17.4+ 下限

Mermaid 12.0.0（[#8213](https://github.com/mermaid-js/mermaid/pull/8213)）把构建目标改为 **ES2024 / Safari 17.4+**：

> Safari 17.4+ has been chosen as the floor, as unlike Firefox/Chrome, older iOS devices don't get major Safari updates.

站长在「接受下限继续升级 / 保持 11.17.2 / 先量化访客分布」三选一中选择了**接受并继续升级**（2026-11-03）。

**代价（已记录，不当成已解决）**：老 iOS 设备拿不到 Safari 大版本更新，**这部分访客将无法渲染本站任何图表**——99 个图表 / 14 篇文章全部失效。这不是配置能回退的：下限来自编译目标，不是运行参数。

---

## 2. Mermaid 12 的四条破坏性变更

逐条从官方 CHANGELOG 读出，并**逐条实测本站是否命中**：

| 变更                                                | 官方来源                                                 | 本站是否命中                                                                 |
| --------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **ELK 成为默认布局引擎**                            | [#8155](https://github.com/mermaid-js/mermaid/pull/8155) | **命中**（86 个 flowchart 均未声明 layout）→ 已钉 `layout: "dagre"`          |
| **十种图表默认主题改 `redux-color`、look 改 `neo`** | [#8148](https://github.com/mermaid-js/mermaid/pull/8148) | 不命中（本站原本就显式写 `theme: "base"` + `look: "classic"`），但需保持显式 |
| **移除 `defaultRenderer` 配置项**                   | [#8211](https://github.com/mermaid-js/mermaid/pull/8211) | 不命中（本站从未设该项）                                                     |
| **要求 ES2024 / Safari 17.4+ / Node 22.12+**        | [#8213](https://github.com/mermaid-js/mermaid/pull/8213) | **命中**（产品决策，见上节）                                                 |

另有两条非破坏性但影响本站的默认值变化，**官方 CHANGELOG 没有单列**，是靠配置 diff 逐项比对发现的（见第 3 节）。

---

## 3. 关键发现：`wrappingWidth` 200 → 120（CHANGELOG 未记载）

### 3.1 怎么发现的

钉回 `layout: "dagre"` 之后重新渲染 99 个图表，结果是 **`svgChanged: 99/99`，全部变了**——按计划里的警示，这会被误判成「dagre 没生效」。

于是做两件独立的事：

1. **验证 dagre 确实生效**：在 mermaid 12 上分别用 `layout: "dagre"` 与 `layout: "elk"` 渲染同一批图表，**12/12 样本输出显著不同**（例：`#6` viewBox 宽 1346 vs 1296，`#0` 602 vs 636）。证明钉值有效，不是 ELK 在偷偷参与。
2. **逐项 diff 两版默认配置**：用 `mermaid.mermaidAPI.getConfig()` 取全部默认值递归比对，得到 18 项差异。其中与尺寸直接相关的三项：

| 配置项                                       | 11.17.2              | 12.2.0 默认  |
| -------------------------------------------- | -------------------- | ------------ |
| `flowchart.wrappingWidth`                    | **200**              | **120**      |
| `flowchart.minNodeWidth`                     | **不存在**（无约束） | **120**      |
| `state.wrappingWidth` / `state.minNodeWidth` | 同 flowchart         | 同 flowchart |

**`wrappingWidth` 从 200 降到 120 = 文字更早换行、节点被压窄、行数增加。** 这解释了观测到的全站分布：宽度 24 个变宽 / 66 个变窄 / 9 个不变，高度 **75 个变高 / 0 个变矮** / 24 个不变。**「没有一个变矮」是这条的指纹**——换行只会让图变高。

### 3.2 错判风险

这一项**不是布局引擎差异**，`layout: "dagre"` 挡不住。如果只钉 dagre 就交付，全站图表会变形而所有常规判据都绿：渲染成功数、节点数、标签文本、溢出、pageerror 全都不受影响，只有尺寸变了。

### 3.3 修复

在 `src/utils/runtime/mermaid.ts` 的 `initialize` 里显式设回：

```ts
flowchart: { wrappingWidth: 200, minNodeWidth: 0 },
state: { wrappingWidth: 200, minNodeWidth: 0 },
```

**`minNodeWidth` 设 `0` 而不是 120**：11.17.2 里根本没有这个配置，等价于不约束；设 120 会重新引入压窄。

**类型约束踩坑**：`wrappingWidth` 既不在顶层 `MermaidConfig`，也不在 `MindmapDiagramConfig`，只有 `flowchart` / `state` 子配置接受它。写成顶层或塞进 `mindmap` 会让 `pnpm check` 报 `ts(2353)`。最终只保留两个子配置，实测已覆盖全部受影响图表。

---

## 4. 验收结果（全部实测，2026-11-03，Windows 11 / Node 24.18.0 / pnpm 10.26.2）

### 4.1 图表级 A/B：99 个全量

对照器 `output/mermaid-upgrade/render-diagrams2.mjs`，**每个 worker 独立 page**（原因见第 5 节），固定 `handDrawnSeed: 1`。

| 判据                 | 结果        |
| -------------------- | ----------- |
| 渲染总数             | **99 / 99** |
| 渲染错误             | **0**       |
| 对照器确定性（两次） | **true**    |

与 11.17.2 逐图比对尺寸：

| 判据                 | 结果              |
| -------------------- | ----------------- |
| 宽度完全一致         | **99 / 99**       |
| 宽高都完全一致       | **96 / 99**       |
| SVG 哈希逐字节相同   | **89 / 99**       |
| 哈希不同但几何量一致 | 7（共 10 个不同） |

残余 3 个差异全部是浮点取整级、视觉不可见：

| 图  | 类型      | 差异                                |
| --- | --------- | ----------------------------------- |
| #10 | flowchart | 高度 207 → 208（**1px**）           |
| #11 | mindmap   | 高度 403.25 → 404.9236（**1.7px**） |
| #44 | flowchart | 高度 70.99568 → 71（**0.004px**）   |

### 4.2 真实页面（Chromium，`/posts/20261002081331/` 14 个图表）

| 判据                    | 11.17.2    | 12.2.0（恢复后） |
| ----------------------- | ---------- | ---------------- |
| `pre.mermaid` 块数      | 14         | 14               |
| 含 `<svg>`              | 14         | 14               |
| `data-mermaid-rendered` | 14         | 14               |
| 节点标签                | 72         | 72               |
| `foreignObject`         | 131        | 131              |
| **图表区总高**          | **5136px** | **5136px**       |
| 横向溢出                | 0          | 0                |
| 长中文标签被裁          | 0          | 0                |
| `pageerror`             | 0          | 0                |

**14 个图表逐图宽高全部一致（14/14）。** 未恢复前该页总高是 **6009px（+17%）**，恢复后回到 5136px。

### 4.3 门禁

| 命令                                       | 结果                            |
| ------------------------------------------ | ------------------------------- |
| `pnpm check`                               | 0 errors / 0 warnings / 6 hints |
| `pnpm test:lib`                            | 16 / 16 pass（含两处视觉契约）  |
| `pnpm test:utils`                          | 261 / 261 pass                  |
| `pnpm exec prettier --check ./src ./docs`  | 通过                            |
| `pnpm install --frozen-lockfile --offline` | exit 0                          |

### 4.4 依赖

| 判据                    | 结果                                                                                                                                                  |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 直接依赖 diff           | **只有 mermaid 一行**（11.17.2→12.2.0）                                                                                                               |
| `mermaid` specifier     | 精确 `12.2.0`（`pnpm add` 实际写入 `^12.2.0`，已手工改回）                                                                                            |
| 与第五批 `katex` 的耦合 | mermaid 12.2.0 声明 `katex: ^0.18.0`，与已落地的 `0.19.1` 范围冲突；但 `pnpm.overrides` 是全局的，**实测 mermaid 拿到 `katex@0.19.1` 且只有一份副本** |
| katex API 兼容          | mermaid 只调 `katex.renderToString`，该 API 在 0.19.1 存在且可用                                                                                      |

### 4.5 连带传递依赖与 Node 版本边界

mermaid 12.2.0 的依赖栈整体换代，锁文件连带变化（`pnpm why` 已核实每一项的来源）：

| 变化                                   | 来源与性质                                                                                                      |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 新增 `elkjs@0.9.3`                     | mermaid 12 把 ELK **内置**（原来要单独装 `@mermaid-js/layout-elk`）；本站钉 `layout: "dagre"`，该依赖不参与渲染 |
| 新增 `chevrotain@13.2.0`（原 11.1.2）  | 语法解析器换代                                                                                                  |
| `@mermaid-js/parser` 1.2.1 → **2.0.1** | 同上                                                                                                            |
| **移除 `fastdom@1.0.12`**              | `pnpm why fastdom` 输出为空 = mermaid 12 不再依赖它，不是遗漏                                                   |

**Node 版本边界（已核对三处 CI）**：

| 包                                      | `engines.node`  |
| --------------------------------------- | --------------- |
| `mermaid@12.2.0`                        | **`>=22.12.0`** |
| `commander@15.0.0`（第五批 KaTeX 带入） | **`>=22.12.0`** |
| `chevrotain@13.2.0`                     | `>=22.0.0`      |
| `elkjs@0.9.3` / `katex@0.19.1`          | 无声明          |

- 本机 Node **24.18.0** → 满足。
- `build.yml` / `deploy.yml` 用 **Node 24** → 满足。
- **`lint.yml` 用 `node-version: 22`**，`actions/setup-node` 解析为最新 22.x；2026-11-03 查 [nodejs.org/dist](https://nodejs.org/dist/index.json) 最新 22.x 为 **22.23.4** → 满足。

**残留风险（记录，不当成已解决）**：若把 `lint.yml` 的 `node-version: 22` 钉成 `22.11.0` 及以下，或启用 `engine-strict=true`，安装会警告甚至失败。目前 `pnpm config get engine-strict` 返回 `undefined`，pnpm 默认只警告。

---

## 5. 对照器的两次失败与根因（值得记住）

计划假设「mermaid 在浏览器里渲染即可复现」，实际连续踩了两个坑：

### 5.1 `handDrawnSeed` 默认随机

第一版对照器报 `deterministic: false`，不稳定项出现在 classDiagram。逐字符 diff 定位到**圆角矩形贝塞尔控制点**每次都不同（`C-31.2` / `C-18.4` / `C-25.2`）。

根因两层：

1. webfont 按 unicode-range 分片，图表文本进 DOM 才触发子集加载；子集未就绪时按回退字体度量算控制点 → 按站点运行时的 `fonts.load` + `fonts.ready` 门补上；
2. roughjs 的 `handDrawnSeed` 默认 `0` = 每次随机 → 对照器固定成 `1`（**站点本身不设，保持随机手绘外观**）。

### 5.2 同一页面内连续渲染互相干扰

修完上一条后 classDiagram 仍不稳定，且换参数后不稳定项会从 classDiagram 转移到 gantt。

根因：**同一 page 里连续渲染 99 个不同图表，前后图表之间存在状态干扰**。

修复：改用 `render-diagrams2.mjs`，**每个 worker 一个独立 context/page**，按索引分片并行。此后两版各自 99/99 两次渲染完全相同。

**这是这批最贵的教训**：不做隔离就永远拿不到可信基线，后面所有 A/B 都建在沙上。

---

## 6. 未验证边界

- **只验证 Chromium**。Safari 17.4+ 下限是产品裁决，未在 Safari 17.4 以下设备实测（无法实机），也未在 Safari 17.4+ 上验证渲染正确性。
- **未跑远端 CI**，未推送、未部署。
- **未验证 ELK 布局的实际观感**。本站钉回 dagre，ELK 路径从未在真实页面上跑过；若将来要改用 ELK，必须重跑全部 99 个图表对照。
- **mindmap 的 1.7px 差异未归因到底**。已确认不是 `wrappingWidth`（该类型不接受此配置），可能是 12 版内部度量微调。
- **只比对了本站 99 个图表**，未跑 mermaid 官方测试语料；`mindmap.colorBy` 默认从无变 `"branch"` 这类非尺寸差异未逐一肉眼核对。

---

## 7. 一次性工具位置（`output/` 被 gitignore，不入库）

| 路径                                           | 用途                                                   |
| ---------------------------------------------- | ------------------------------------------------------ |
| `output/mermaid-upgrade/extract-diagrams.mjs`  | 抽取 99 个图表源码                                     |
| `output/mermaid-upgrade/render-diagrams2.mjs`  | **最终版对照器**（每 worker 独立 page）                |
| `output/mermaid-upgrade/render-diagrams.mjs`   | 初版（单 page，已证明不可靠，保留作对照）              |
| `output/mermaid-upgrade/diagnose-sameid.mjs`   | 定位 `handDrawnSeed` 随机性                            |
| `output/mermaid-upgrade/diagnose-geometry.mjs` | 证实差异只在贝塞尔控制点                               |
| `output/mermaid-upgrade/config-diff.mjs`       | **两版默认配置逐项 diff（发现 wrappingWidth 的工具）** |
| `output/mermaid-upgrade/restore-attempt.mjs`   | 三种恢复方案的小样本试验                               |
| `output/mermaid-upgrade/restore-full.mjs`      | 全量 99 图恢复验证                                     |
| `output/mermaid-upgrade/restore-hash.mjs`      | SVG 哈希一致性                                         |
| `output/mermaid-upgrade/test-layout.mjs`       | 证明 dagre 与 elk 输出确实不同                         |
| `output/mermaid-upgrade/page-audit.sh`         | 真实页面验收                                           |
| `output/mermaid-upgrade/config-diff.json`      | 18 项默认配置差异                                      |
| `output/mermaid-upgrade/restore-full.json`     | 99 图恢复结果                                          |
| `output/mermaid-upgrade/diagram-diff.json`     | 未恢复时的 99/99 全变记录                              |
| `output/mermaid-upgrade/backup/`               | 改动前的 `package.json` / `pnpm-lock.yaml`             |
