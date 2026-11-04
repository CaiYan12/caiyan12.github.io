# Tailwind 3.4.19 → 4.3.4 迁移设计

2026-11-04。工作目录 `D:\pages\myblog-wt-tailwind4`（分支 `chore/tailwind4-migration`，从 `7686e8a` 起）。
主检出 `D:\pages\myblog` 全程只读，作为 v3 基准。

## 一句话结论

这不是版本升级，是接入方式重写。**可行**，核心机制已查清并验证：保留 JS 配置走 `@config`、站点规则移出所有 `@layer`、补三条显式声明。229 页构建通过，`.prose` 计算值差异从 118 项降到 13 项（且全部视觉等价）。

## 七个必答问题的答案

### ① 接入方式：Vite 插件（`@tailwindcss/vite`）

官方推荐，且实测在 Astro 7.4.4 实际使用的 Vite 8.3.5（rolldown-vite 1.2.16）上**构建 / dev server / HMR / 源码扫描全部正常**。

- `astro.config.mjs` 的 `vite.plugins` 首位加 `tailwindcss()`。
- `postcss.config.mjs` 移除 `tailwindcss` 插件（v4 已不由 PostCSS 接管）。
- **踩坑**：第一次构建失败于 `Package subpath './nesting/index.js' is not defined by "exports"` —— v4 的 `tailwindcss` 包不再导出内附的 nesting 插件。解法是显式依赖 `postcss-nesting@13.0.2`。

### ② 配置迁移：保留 `tailwind.config.cjs` + `@config`（路线 A）

- `@config "../../tailwind.config.cjs"`（`books.css` 深度不同，是 `"../../../tailwind.config.cjs"`）。
- **实测**：`.text-nb-muted` / `.font-nb-serif` / `.text-nb-seal` / `.bg-primary` / `.rounded-box` 全部正常生成。
- **代价**：`theme.extend` 的值**不生成 `--color-*` 变量**（utility 直接内联值）。本站全站零处引用 `var(--color-*)`，无损。
- **不迁 `@theme` 的理由**：实测纯 CSS-first 会丢失**全部**自定义色板 utility（本站 `nb.*` 色板现测 165 处 utility 引用、覆盖 24 个不同的 `nb-*` 工具类）。详见 [ADR 0011](../adr/0011-tailwind4-layer-strategy.md)。

### ③ 两套样式入口

`src/styles/global.css`（7986 行）与 `src/nice-books/styles/books.css`（844 行）各自独立改：

```css
@import "tailwindcss";
@config "<相对路径>/tailwind.config.cjs";
@source "<相对路径>/src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue,mjs}";
```

**`@source` 必须含 `.ts`/`.js`/`.mjs`** —— Nice Books 的 `src/nice-books/lib/render.ts` 与 `scripts/archive.ts` 在 TS 模板字符串里拼 Tailwind utility。实测漏掉 `.ts` 会**静默**丢失 5 个 utility（产物小 4.3KB，零报错）。

### ④ `@layer` 语义变化：影响面与解法

**v3 的事实**（实测）：`dist` 内 css 文件 `@layer` 计数 = 0。层内层外规则按「特异性 → 源顺序」一视同仁。

**v4 的事实**：真实级联层 `theme < base < components < utilities`，且 unlayered 规则排在所有 layered 之后。

**实际影响**（实测）：

- typography 插件在 `utilities` 层，压过站点 `components` 层的 28 条 `.prose` 规则 —— 标题 24px→36px、链接变蓝失去下划线、margin 全归零。
- 站点层外的 `body,div,...,h1{margin:0}` 压过层内的 `.prose h1{margin:1.2em 0 .6em}`。
- v3 把源码里的 `.nav` 误当 important 前缀解析（产物 `.head-nav .\!nav>li{...!important}`），v4 不再误判 → 导航项 padding 18px→0px。

**解法**：把站点 `@layer base` / `@layer components` 的包裹去掉，规则以 unlayered 身份参与级联。

**为什么只改层序声明不够**：站点的 `body,div,...,h1{margin:0}` 是层外规则，unlayered 依然优先于任何层。

**为什么提高特异性无效**：实测四种方案全部 14px —— 层序压过特异性。

### ⑤ Preflight 变化：命中面

| 变化                    | v3             | v4                        | 本站命中                                                                                                                                    |
| ----------------------- | -------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `[hidden]`              | `display:none` | `display:none !important` | books.css 已有 `[hidden]{display:none!important}` 补偿（**保留**：Nice Books 计划移植为独立项目，此规则是它脱离主站 Tailwind 预检后的护栏） |
| `border-*` 默认色       | `#e5e7eb`      | `currentColor`            | 全站 3 处 bare border 全是 `border-0`（宽度 0，颜色不渲染）                                                                                 |
| `input`/`textarea` 背景 | `#fff`         | transparent               | **命中**：搜索框自身无背景声明 → 显式补 `background-color: #fff`                                                                            |
| `dialog` margin         | auto           | 0                         | 站点零处 `<dialog>`，不命中                                                                                                                 |
| `button` cursor         | pointer        | default                   | 不命中（站点 token 规则更强，两端都是 `url("/style/link.cur"), pointer`）                                                                   |
| `.prose code` font-size | 13px           | 14px                      | 站点 `.prose code` 已显式写 13px，且已移出层 → 修复                                                                                         |

### ⑥ 回退方案

迁移全部改动（依赖 + 配置 + 两个 CSS 入口 + 三条显式补偿）放在**一个本地提交**里，回退 = `git revert` 一个 commit。依赖与配置本身也可回退：保留 `tailwind.config.cjs` 即可（v4 的 `@config` 仍吃它）。

### ⑦ 验收标准

- 计算样式指纹 A/B：`scripts/upgrade-style-audit.mjs`（同输入两版产物对采，页数取自 `scripts/lib/smoke-pages.mjs` 的 `AUDIT_PAGES` = 13 页 `SHELL_PAGES` + 10 页 `AUDIT_EXTRA_PAGES`）。
- 桌面/移动截图对比。
- 关键交互：搜索、书库视图切换、灯箱、天气胶囊。
- **死 class 盘点**：v3 会 purge 未使用的自定义类（实测 `.slideshow` 系列），v4 不 purge —— 必须逐条核实补回的规则无元素使用。

## 实测数据

### 构建

|        | v3 基准                                 | v4 迁移后                                              |
| ------ | --------------------------------------- | ------------------------------------------------------ |
| 构建   | 229 页 / 33.56s                         | 229 页 / 43.35s（首次）→ 17.08s（含 input 补偿后重跑） |
| 主 CSS | `MainGridLayout.CKaYaVTj.css` 185,413 B | `MainGridLayout.Bjbzg1D_.css` 195,004 B                |

### 关键元素的计算值对比

| 项                         | v3           | v4                                                              |
| -------------------------- | ------------ | --------------------------------------------------------------- |
| 导航 `.nav>li` padding     | 0px          | **0px**（真实 DOM 下本就由 `#menu-index > li{padding:0}` 决定） |
| 导航项宽度                 | 67.4px       | 67.4px                                                          |
| `.prose h1` font-size      | 24px         | 24px                                                            |
| `.prose a` color           | rgb(0,170,0) | rgb(0,170,0)                                                    |
| `.prose a` text-decoration | underline    | underline                                                       |
| `.prose li` padding-left   | 4.875px      | 4.875px                                                         |
| `.prose` 计算值差异总数    | —            | **13 项（全部是颜色表示差异，已换算验证等价）**                 |

### 全量规则集合 diff

- v3 1994 条规则 / v4 2011 条
- 只在 v4：**59 条**（47 条死 class + 12 条有使用但逐条确认良性）
- 只在 v3：**42 条**（31 条死 class + 11 条有使用但均为良性）
- 声明体不同：192 条

### 验收结果（2026-11-04）

| 项                                    | 结果                                                                                                                                               |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `astro build`                         | 229 页 / 17.08s，零错误零警告                                                                                                                      |
| `pnpm build`（完整链）                | 通过，230 文件索引 / 28 页 / 47,583 词                                                                                                             |
| `pnpm check`                          | 0 errors / 0 warnings / 6 hints                                                                                                                    |
| 计算样式指纹 A/B                      | 17028 项元素级差异，**差异属性只有 `border-*-color` 两类**；所有 `border-width > 0` 的边逐条完全一致                                               |
| 真实 DOM 关键交互与盒模型             | **7/7 项完全相同**                                                                                                                                 |
| 桌面/移动截图（排除运行时随机背景层） | 多数页面差异 0.2%–0.5%，与构建间噪声同量级；超出噪声的 5 项绝对差异 0.35–1.4pp，差异像素经 DOM 复核全为 `border-*-color`（border-width=0，不渲染） |

**三个踩坑（详见 [ADR 0011](../adr/0011-tailwind4-layer-strategy.md) 与 [CHANGELOG](../../CHANGELOG.md) 的 2026-11-04 条；本轮的验收报告是一次性证据、不入库）**：① 预览服务器会把所有路径返回首页（`serve -s` 的 SPA fallback、`astro preview`、Python `http.server` 三种都踩），指纹采集会得到「每一页都是 851 个元素」的假象；② 截图对比必须先定噪声底线，且要区分**运行时随机**（背景壁纸）与**构建期随机**（侧栏「手气不错」）两类噪声源；③ 判断某条规则是否生效必须用**真实 DOM 结构**量——手写 fixture 曾测出「导航 padding v3=18px / v4=0px」的假回归。

## 四条显式补偿（v4 必需）

| 位置                            | 声明                            | 原因                                                                                                                                                                                                                                                                  |
| ------------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.prose a`                      | `text-decoration: underline`    | v3 靠插件的 `:where(a)` 规则胜出；v4 层序反转后层外的 `a{text-decoration:none}` 排到最后                                                                                                                                                                              |
| `.prose li`                     | `padding-inline-start: 0.375em` | **补记（2026-11-04 实施时纠正）**：v3 缩进来自 typography 插件的 `.prose :where(ul > li){padding-inline-start:.375em}`（em 相对值，正文 13px 下实测计算值 **4.875px**），不是 UA 默认值；本表原先写的「5.25px / UA 默认值」取错了基准，实测后改为复刻同一个 em 相对值 |
| `input, textarea`               | `background-color: #fff`        | v3 Preflight 给表单控件设白底；v4 改 transparent，搜索框会露出灰色                                                                                                                                                                                                    |
| `books/index.astro` 的一处 span | `leading-[20px]`                | v4 的 `text-sm` 把 line-height 从绝对值改成比值（见下）                                                                                                                                                                                                               |

### 第四条：`text-sm` 的 line-height 由绝对值变比值（1px 位移）

**现象**：`/books/` 页文档高度 v3 = 2223px、v4 = 2222px（固定差 1px，非噪声）。逐元素二分定位到 `p.mt-3.5.font-nb-kai.text-sm.text-nb-muted` 高度 21px vs 20px。

**机制**（CDP 权威级联确认）：

|     | `.text-sm` 的 line-height                                                                                                      | 子元素继承后                                                    |
| --- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| v3  | `line-height: 1.25rem`（**绝对值 20px**）                                                                                      | 子元素拿到 20px，与自身字号无关                                 |
| v4  | `line-height: var(--tw-leading, var(--text-sm--line-height))`，`--text-sm--line-height: calc(1.25 / 0.875)`（**比值 1.4286**） | 子元素拿到**比值**，按自身字号重算 → 11.9px × 1.4286 ≈ **17px** |

混排行的行盒因此少 1px，其后所有内容上移 1px。

**修复**：给 `src/pages/books/index.astro` 里那处 span 加 `leading-[20px]`（绝对长度）。**不能用 `leading-[inherit]`** —— `inherit` 继承的是**比值**，实测无效（span 仍为 17px）。

**影响面**：全站 `text-sm`/`text-xs`/`text-base`/`text-lg` 共 17 处使用，但**只有当子元素用 em 相对字号且父级 line-height 是比值时才会显现**。全站 `text-[<em 值>]` 仅 2 处（都在 books/index.astro），其中 1 处父级是 `leading-[2.2]`（无单位数，两版行为一致，无需处理），另一处父级是 `text-sm`（受影响，已修）。

**推广教训**：Tailwind v4 把字号 utility 的 line-height 从绝对长度改成比值，**继承到使用 em/相对字号的子元素时会改变行盒高度**。凡是父级用了 `text-*`（带比值 line-height）且子元素用了 `text-[<em 值>]` 的组合，都要逐个复核。

## 未解决 / 需持续守住

1. **站点规则恒胜**：unlayered 压过一切 layered（含 Tailwind utility），与 v3 语义相反。当前已核全站无「站点类名与 utility 撞名」，但这是需要守住的边界。
2. **v3 purge 的反向风险**：迁移会把 v3 purge 掉的死 class 全部补回。本次已核 101 条（78 死 + 23 良性），但新增死 class 时需重核。
3. **Tailwind v4 的浏览器下限**：Safari 16.4+ / Chrome 111+ / Firefox 128+（硬编码，不读 browserslist）。本站已在用 `color-mix()`（14 处，无 fallback 写法），老浏览器里整条声明失效。
4. **v3 的 `html{font-size:13px}` 等历史结论**：`docs/agents/styles.md` 记的若干条级联相关结论需按 v4 语义重述。
