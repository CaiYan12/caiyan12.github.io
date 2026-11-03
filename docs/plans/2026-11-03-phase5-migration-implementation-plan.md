# 阶段五四项跨版本迁移实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按风险从低到高，把 KaTeX（0.16.47→0.19.1）、Mermaid（11.17.2→12.2.0）、Tailwind（3.4.19→4.3.4）、Satori（0.26.0→0.63.2）四项跨版本迁移逐个落地，每项独立验收、独立本地提交。

**Architecture:** 沿用本仓库已跑通四批的「分批升级」流程：每批先存基线，再严格安装、同输入构建 A/B、真实浏览器验收、同步文档、独立本地提交。四项按风险排序，**每项完成后停下等站长授权**下一项；Tailwind 与 Satori 在动代码前必须先过方案确认门。

**Tech Stack:** Astro 7.4.4、Node 24.18.0、pnpm 10.26.2、Playwright 1.62.1、KaTeX、Mermaid、Tailwind 3/4、Satori + sharp。

**Spec:** `docs/plans/2026-11-03-phase5-migration-assessment.md`（本计划的上游评估，含每项的官方破坏性变更原文与用量实测）

## 执行状态（2026-11-03 更新）

| Task  | 内容                     | 状态                                                                                                                   |
| ----- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| 0     | 噪声底线                 | ✅ 完成（146 / 0 / 0，与历史基准一致）                                                                                 |
| 1     | KaTeX 公式级对照器       | ✅ 完成（307 公式，同输入两次一致）                                                                                    |
| 2     | 升级 KaTeX + 公式 A/B    | ✅ 完成，**按修正后的步骤**（原步骤会 CSS/HTML 错配）                                                                  |
| 3     | 构建 A/B 与资产同源性    | ✅ 完成（非 HTML 差异 0，字体族缺失 0）                                                                                |
| 4     | 检查、实机与公式视觉验收 | ✅ 完成（check 0 errors，桌面/移动 298 公式旧类名 0）                                                                  |
| 5     | KaTeX 批次文档同步       | ✅ 完成并上线（本地提交 `c5b622f`，随 `1073945` 推送）                                                                 |
| 6-10  | Mermaid                  | ✅ 完成并上线（本地提交 `a9f4913`，随 `1073945` 推送；站长裁定接受 Safari 17.4+，另查明 wrappingWidth 200→120 已钉回） |
| 11-15 | Tailwind 4               | ⏸ **已移交独立工作流**（2026-11-03 站长裁定，见 [README 的「进行中」分组](../../README.md#进行中)）                    |
| 16    | Satori 探索              | ⏸ **已移交独立工作流**（2026-11-03 站长裁定，见 [README 的「进行中」分组](../../README.md#进行中)）                    |

**2026-11-03 站长裁定：本计划在 Task 10（Mermaid 收口）后停止执行。** Tailwind（Task 11-15）与 Satori（Task 16）**不再接在本会话/本计划内推进**，理由是复杂度已超出"接在依赖升级后面顺手做"的范围：Tailwind 属接入方式重写并会推翻既有的 `@layer` 文档结论，Satori 跨 33 个 minor 且上游无 CHANGELOG。两项已登记到 [README 的「进行中」分组](../../README.md#进行中)，**适合专门跑一次 `/grill-spec-tickets-implement` 工作流**（拷问需求 → 出 spec → 拆票 → 实施）。

本计划保留 Task 11-16 的原文**仅作后续工作流的调研输入**（尤其 Task 11 的七个待答问题、Task 16 的隔离探针步骤），不再是本会话的执行清单。下表的「已移交」即此状态。

**实测结果与偏差**见 [KaTeX 专项验收](2026-11-03-katex-upgrade.md) 与 [Mermaid 专项验收](2026-11-03-mermaid-upgrade.md)。最重要的一条：Task 2 原步骤会让**构建期 HTML 与运行期 CSS 的 KaTeX 类名错配**，必须新增 `pnpm.overrides`；而 Task 2/3/4 原有的三项判据**全部会绿而站点已坏**。

## Global Constraints

以下约束对**每一个 task** 隐式生效，逐条照抄自评估文档与仓库既有裁决：

- **精确版本**：本仓库对逐个升级的包一律写不带 `^` 的固定版本（`astro: "7.4.4"`、`pagefind: "1.6.0"`、`svelte: "5.57.3"`、`autoprefixer: "10.6.2"`）。注意 `pnpm add --save-exact <pkg>@<ver>` 实测会写成 `^<ver>`，**必须手工改回并重新 `pnpm install` 让锁文件 specifier 同步**；只改 `package.json` 不改锁会让 CI 的 `--frozen-lockfile` 失败。
- **安装命令形态**（已在四批中验证）：
  `pnpm add --save-exact <pkg>@<ver> --ignore-scripts --strict-peer-dependencies --store-dir .pnpm-store --registry https://registry.npmjs.org`
  随后 `pnpm install --frozen-lockfile --offline --ignore-scripts --strict-peer-dependencies --store-dir .pnpm-store`
- **构建前设 `$env:NODE_USE_ENV_PROXY='1'`**（PowerShell）。本机 Node 的 fetch 不读 `HTTP_PROXY`；OG 图端点在构建期从 `fonts.googleapis.com` 拉字体。
- **同输入 A/B 的构建链**（不跑联网快照刷新链，避免取数污染差异）：
  `pnpm exec astro build` → `node scripts/inject-buddha-banner.mjs` → `pnpm exec pagefind --site dist`
  **不要**用完整 `pnpm build`（它串了 `fetch-github-*` / `fetch-friend-icons` / `generate-lqips`）。
- **改 remark/rehype 插件或 Markdown 管线后**，必须先删 `node_modules/.astro/` 与 `.astro/data-store.json`（若存在）再构建，否则 content layer 缓存会复用旧 HTML 且**无任何报错**。
- **单次工具调用阻塞上限 30s**；构建、全量指纹、浏览器套件一律后台任务 + 短轮询。
- **不得 push**。每批结束只做本地提交，推送与部署需站长单独授权（`deploy.yml` 的 `push: branches: [main]` 即生产部署）。
- **文档与代码同批提交**：`CHANGELOG.md` 新条目置于最上、`docs/plans/` 专项报告、受影响的 `docs/agents/*.md`。
- **不写会漂的计数**进 `AGENTS.md`；需要数字现测。
- **证据目录** `output/<批次名>/`，被 `.gitignore` 忽略；不删除他人证据。
- 每批**只动一个直接依赖**；需要联动时必须先记录兼容证据，不静默合批。

## 文件结构与职责

| 路径                                | 角色                                    | 本计划中的变化                      |
| ----------------------------------- | --------------------------------------- | ----------------------------------- |
| `package.json` / `pnpm-lock.yaml`   | 依赖真源                                | 每批只改一行 specifier + 锁文件     |
| `src/plugins/pipeline.mjs`          | Markdown 管线装配（remark/rehype 顺序） | KaTeX task 可能需要传 `strict` 选项 |
| `src/utils/runtime/katex.ts`        | KaTeX CSS 条件加载                      | 一般不改；仅在 CSS 路径变化时改     |
| `src/utils/runtime/mermaid.ts`      | Mermaid 初始化与渲染（含两处视觉契约）  | Mermaid task 加 `layout`            |
| `src/utils/runtime/mermaid.test.ts` | themeCSS 字面量断言                     | 契约不变则不动                      |
| `src/utils/runtime/katex.test.ts`   | CSS 条件加载单测                        | 契约不变则不动                      |
| `tailwind.config.cjs`               | Tailwind v3 配置                        | Tailwind task 迁移到 CSS-first      |
| `postcss.config.mjs`                | PostCSS 插件链                          | Tailwind task 改接入方式            |
| `src/styles/global.css`             | 主站样式（v3 三指令）                   | Tailwind task 改入口                |
| `src/nice-books/styles/books.css`   | Nice Books 样式（v3 三指令）            | Tailwind task 改入口                |
| `src/pages/og/[...slug].png.ts`     | OG 图生成（satori 调用点）              | Satori task 可能改 API 用法         |
| `scripts/`                          | 一次性对照工具（按惯例不入库）          | 各批在 `output/<批次>/` 下自建      |

**注意**：对照脚本按仓库既有惯例放在 `output/<批次名>/`（git-ignored），**不新增 `scripts/` 下的常驻工具**，除非该判据要进 CI。这是四批升级已确立的做法。

---

## 前置：共用基线与噪声底线

每个 task 的第 1 步都复用这套基线流程。**噪声底线只需测一次**（Task 0），后续批次直接引用其结论。

### Task 0: 建立跨平台构建噪声底线

**Files:**

- Create: `output/phase5-baseline/compare.mjs`（一次性对照器）
- Create: `output/phase5-baseline/noise-floor.json`

**Interfaces:**

- Produces: `output/phase5-baseline/noise-floor.json`，字段 `{ onlyA: string[], onlyB: string[], identical: number, nonHtmlDiffer: string[], htmlDiffer: number, htmlDifferStripped: number }`。后续所有 task 用同一形状报告差异。

- [ ] **Step 1: 复用已验证的对照器**

第三、四批已用过同一套四层对照逻辑。直接复制，不要重写：

```bash
cd /d/pages/myblog
mkdir -p output/phase5-baseline
cp output/svelte-upgrade/compare.mjs output/phase5-baseline/compare.mjs
```

该脚本用法：`node output/phase5-baseline/compare.mjs <dirA> <dirB> <outJson>`，输出 `{onlyA, onlyB, identical, nonHtmlDiffer, astroChunksChanged, htmlDiffer, htmlDifferStripped, htmlDifferNormalized}`。

- [ ] **Step 2: 连做两次同版本构建**

```bash
cd /d/pages/myblog
rm -rf output/phase5-baseline/dist-1 output/phase5-baseline/dist-2
$env:NODE_USE_ENV_PROXY='1'
pnpm exec astro build
node scripts/inject-buddha-banner.mjs
pnpm exec pagefind --site dist
cp -r dist output/phase5-baseline/dist-1
pnpm exec astro build
node scripts/inject-buddha-banner.mjs
pnpm exec pagefind --site dist
cp -r dist output/phase5-baseline/dist-2
```

- [ ] **Step 3: 测量噪声底线**

```bash
node output/phase5-baseline/compare.mjs output/phase5-baseline/dist-1 output/phase5-baseline/dist-2 output/phase5-baseline/noise-floor.json
```

Expected（2026-11-03 第三、四批实测基准）：`nonHtmlDiffer` 必须为空数组；`htmlDiffer` 约 146（侧栏「文章推荐」随机）；`htmlDifferStripped` 与 `htmlDifferNormalized` 必须为 0。

**若 `nonHtmlDiffer` 非空**：说明该构建存在非确定性非 HTML 产物，必须在报告里记录具体文件，后续 A/B 不能把这类文件计入差异。

- [ ] **Step 4: 记录基线快照**

```bash
cd /d/pages/myblog
node output/svelte-upgrade/capture-baseline.mjs output/phase5-baseline/baseline.json
```

（该脚本读 `package.json` / 锁文件 / `src/` 摘要 / git 状态，只读。）

- [ ] **Step 5: 保存直接依赖基线（后续每批都要 diff 它）**

```bash
cd /d/pages/myblog
pnpm list --depth 0 > output/phase5-baseline/deps-before.txt 2>&1
wc -l < output/phase5-baseline/deps-before.txt
grep -E "^(katex|mermaid|tailwindcss|satori) " output/phase5-baseline/deps-before.txt
```

Expected：输出四行，值应为 `katex 0.16.47` / `mermaid 11.17.2` / `tailwindcss 3.4.19` / `satori 0.26.0`。**若不符，以实际输出为准并记录**（依赖可能已被其他会话改动）。

- [ ] **Step 6: 提交**

无源码变更，**不提交**。`output/` 已被 gitignore。此 task 的产出（`noise-floor.json` / `baseline.json` / `deps-before.txt`）是后续所有批次的对照依据。

---

## 第一批：KaTeX 0.16.47 → 0.19.1（低风险，先做）

**为什么最低风险**：0.19.0 唯一的破坏性变更是「缺字符度量改为经 `strict` 上报 `symbolNotInFont`，在 `strict: "error"` 下变错误」。本站 `src/plugins/pipeline.mjs:41` 的 `rehypeKatex` **未传任何选项**，即默认 `strict: "warn"`，不触发硬失败。

**用量**：307 个公式 / 11 篇文章 / 36 个内容文件（`pnpm test:prettier-math` 权威计数）。产物含 **59 个 KaTeX 字体 + `katex.*.css` + `katex.*.js`**，三者必须同源。

### Task 1: 建立 KaTeX 公式级 A/B 对照器

> **⚠ 2026-11-03 执行补记：路径前缀与实际不同。** 本 Task（及 Task 2、3）正文里的 `output/katex-upgrade/` 是计划起草时的占位目录名，**实际执行用的是 `output/katex-probe/`**（同一批文件的真名，见[专项报告第 7 节](2026-11-03-katex-upgrade.md)的「一次性工具位置」表）。照本文命令原样跑会在 `output/katex-upgrade/` 下新建一套目录，与已有证据分家。**执行时把 `output/katex-upgrade` 统一替换成 `output/katex-probe` 即可**，命令其余部分不变。

**Files:**

- Create: `output/katex-upgrade/formula-ab.mjs`
- Test: 用 `output/katex-upgrade/formula-ab.json` 自证（同版本两次运行必须 0 差异）

**Interfaces:**

- Produces: `formula-ab.mjs`，读 `src/content/**/*.md`，输出 `{ formulas: number, files: number, results: Array<{file, type, value, hash, error}> }`。同版本两次运行必须产生**完全相同的 hash 序列**。
- Consumes: `scripts/prettier-math.test.mjs` 的公式抽取思路（`createMarkdownProcessor` + `remarkMath` + `visit(tree, ["math","inlineMath"])`）。

- [ ] **Step 1: 写对照器**

Create `output/katex-upgrade/formula-ab.mjs`:

```js
// KaTeX 升级：307 个公式的渲染级 A/B 对照器（一次性工具，不入库）。
// 用本站真实的 Markdown 管线抽取公式，再直接用 katex.renderToString 渲染，
// 输出每条公式的 HTML 哈希。同版本两次运行必须逐条相同。
//
// 用法：node output/katex-upgrade/formula-ab.mjs <outJson>
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { createMarkdownProcessor } from "@astrojs/markdown-remark";
import katex from "katex";
import remarkCjkFriendly from "remark-cjk-friendly";
import remarkMath from "remark-math";
import { visit } from "unist-util-visit";

const OUT = process.argv[2] ?? "output/katex-upgrade/formula-ab.json";
await mkdir("output/katex-upgrade", { recursive: true });

async function markdownFiles(dir) {
	const out = [];
	for (const e of await readdir(dir, { withFileTypes: true })) {
		const p = join(dir, e.name);
		if (e.isDirectory()) out.push(...(await markdownFiles(p)));
		else if (e.name.endsWith(".md")) out.push(p);
	}
	return out.sort();
}

// 用站点同款处理链抽公式：格式化器/渲染器换了都不能当 oracle，这里用 remark-math 原样取
async function formulasOf(file) {
	const source = await readFile(file, "utf8");
	const found = [];
	const renderer = await createMarkdownProcessor({
		syntaxHighlight: false,
		smartypants: false,
		remarkPlugins: [
			remarkCjkFriendly,
			remarkMath,
			() => (tree) => {
				visit(tree, ["math", "inlineMath"], (node) => {
					found.push({ type: node.type, value: node.value });
				});
			},
		],
	});
	await renderer.render(source);
	return found;
}

const files = await markdownFiles("src/content");
const results = [];
let idx = 0;
for (const file of files) {
	for (const f of await formulasOf(file)) {
		idx += 1;
		let html = null;
		let error = null;
		try {
			// strict: "ignore" —— 与 prettier-math.test.mjs 同口径，
			// 目的是比对渲染产物，不是把 warning 变成失败
			html = katex.renderToString(f.value, {
				displayMode: f.type === "math",
				throwOnError: true,
				strict: "ignore",
			});
		} catch (e) {
			error = String(e.message).split("\n")[0];
		}
		results.push({
			index: idx,
			file,
			type: f.type,
			value: f.value.length > 300 ? f.value.slice(0, 300) + "…" : f.value,
			hash: html
				? createHash("sha256").update(html).digest("hex").slice(0, 16)
				: null,
			htmlLength: html?.length ?? null,
			error,
		});
	}
}

const report = {
	generatedAt: new Date().toISOString(),
	katexVersion: JSON.parse(
		await readFile("node_modules/katex/package.json", "utf8"),
	).version,
	fileCount: files.length,
	formulaCount: results.length,
	errorCount: results.filter((r) => r.error).length,
	results,
};
await writeFile(OUT, JSON.stringify(report, null, "\t") + "\n");
console.log(
	`files=${report.fileCount} formulas=${report.formulaCount} errors=${report.errorCount} katex=${report.katexVersion}`,
);
```

- [ ] **Step 2: 跑基线（旧 KaTeX 0.16.47）**

```bash
cd /d/pages/myblog
node output/katex-upgrade/formula-ab.mjs output/katex-upgrade/formulas-before.json
cp output/katex-upgrade/formulas-before.json output/katex-upgrade/formulas-before-rerun.json
node output/katex-upgrade/formula-ab.mjs output/katex-upgrade/formulas-before-rerun.json
```

Expected：`formulas=307`（若不符，先查抽取逻辑，不要继续）。`errors=` 记录旧版已有的错误数。

- [ ] **Step 3: 自证对照器无随机性**

```bash
node -e "
const a=require('./output/katex-upgrade/formulas-before.json');
const b=require('./output/katex-upgrade/formulas-before-rerun.json');
const ha=a.results.map(r=>r.hash+'|'+r.error).join('\n');
const hb=b.results.map(r=>r.hash+'|'+r.error).join('\n');
console.log('same input twice identical:', ha===hb);
console.log('formulaCount:', a.formulaCount, 'errors:', a.errorCount);
if(ha!==hb){process.exit(1)}
"
```

Expected：`same input twice identical: true`。**若为 false，对照器不可信，必须修到 true 才能用于 A/B。**

- [ ] **Step 4: 保存产物基线**

```bash
cd /d/pages/myblog
cp -r dist output/katex-upgrade/dist-before
pkg-config --version >/dev/null 2>&1; node -e "
const fs=require('fs');
const files=fs.readdirSync('dist/_astro').filter(f=>/katex|KaTeX_/i.test(f)).sort();
fs.writeFileSync('output/katex-upgrade/katex-assets-before.txt', files.join('\n')+'\n');
console.log('katex assets:', files.length);
"
```

Expected：`katex assets: 61`（1 CSS + 1 JS + 59 字体）。数字不符时记录实际值，后续比对以实际值为准。

- [ ] **Step 5: 提交**

无源码变更，无需提交。

### Task 2: 升级 KaTeX 并做公式级 A/B

> **⚠ 2026-11-03 执行时修正（本 Task 原步骤会让站点坏掉，已据实改正）**
>
> 原 Step 1-3 只写「装 katex 0.19.1 → 改回精确 specifier → 冻结安装」，并预期「直接依赖 diff 只有 katex 一行」。**这个预期不成立，而且后果严重**：
>
> - `rehype-katex@7.0.1`（latest）把 katex 锚在 `^0.16.0`，对 0.x 等于 `>=0.16.0 <0.17.0`，**不含 0.19.1**。pnpm 会给它一份嵌套的 0.16.47。
> - 于是 **构建期 HTML 由 0.16.47 生成（旧类名 `.base`/`.strut`），运行期 CSS 来自根包 0.19.1（新类名 `.katex-base`/`.katex-strut`）**，样式错配。
> - 实测反证（真实 Chromium，40 个真实公式样本）：**20/40 几何尺寸改变**、页面 2139→2269 px、**5.02% 像素不同**。
> - **原 Task 2/3/4 的三项判据全部会绿而站点已坏**（详见下方 Step 5 的补充判据）。
>
> **必须新增 `package.json` 的 `pnpm.overrides`**，把 `rehype-katex`、`mermaid`、`micromark-extension-math` 三个消费者统一到 0.19.1。已获站长批准。
>
> 另：原文档里 `--store-dir .pnpm-store` 是错的，本机实际 store 在 `D:\.pnpm-store\v10`，照抄会报 `ERR_PNPM_UNEXPECTED_STORE`；不传 `--store-dir` 即可。
>
> 本 Task 已执行完成，实测结论见 [KaTeX 专项验收](2026-11-03-katex-upgrade.md)。

**Files:**

- Modify: `package.json`（`katex` 一行 + 新增 `pnpm.overrides`）
- Modify: `pnpm-lock.yaml`

**Interfaces:**

- Consumes: Task 1 的 `output/katex-upgrade/formulas-before.json` 与 `dist-before/`
- Produces: `output/katex-upgrade/formulas-after.json`、`output/katex-upgrade/formula-diff.json`

- [ ] **Step 1: 精确安装 0.19.1**

```bash
cd /d/pages/myblog
CI=true pnpm add --save-exact katex@0.19.1 --ignore-scripts --strict-peer-dependencies --registry https://registry.npmjs.org
```

- [ ] **Step 2: 把 specifier 改回精确版本，并加上 overrides**

```bash
cd /d/pages/myblog
node -e "
const fs=require('fs');
const p=JSON.parse(fs.readFileSync('package.json','utf8'));
p.dependencies.katex='0.19.1';
// 必需：rehype-katex@7.0.1 只声明 katex ^0.16.0，不加这条会 CSS/HTML 版本错配
p.pnpm={...(p.pnpm||{}),overrides:{...(p.pnpm?.overrides||{}),katex:'0.19.1'}};
fs.writeFileSync('package.json', JSON.stringify(p,null,'\t')+'\n');
console.log('katex specifier =', p.dependencies.katex);
console.log('pnpm.overrides   =', JSON.stringify(p.pnpm.overrides));
"
CI=true pnpm install --no-frozen-lockfile --ignore-scripts --strict-peer-dependencies --registry https://registry.npmjs.org
grep -n -A2 '^      katex:' pnpm-lock.yaml | head -4
grep -n -A2 '^overrides:' pnpm-lock.yaml | head -4
```

Expected：锁文件 `specifier: 0.19.1` / `version: 0.19.1`，且锁文件顶部出现 `overrides:` 段。

- [ ] **Step 3: 严格安装与冻结验证**

```bash
cd /d/pages/myblog
CI=true pnpm install --frozen-lockfile --offline --ignore-scripts --strict-peer-dependencies
echo "FROZEN_EXIT=$?"
pnpm list --depth 0 > output/katex-upgrade/deps-after.txt
diff output/phase5-baseline/deps-before.txt output/katex-upgrade/deps-after.txt || true
echo "=== 三个消费者是否都指向 0.19.1（这是 override 生效的直接证据）==="
for d in rehype-katex@7.0.1 mermaid@11.17.2 micromark-extension-math@3.1.0; do
  echo -n "$d: "; readlink -f node_modules/.pnpm/$d/node_modules/katex 2>/dev/null | sed 's|.*/\.pnpm/||;s|/node_modules.*||'
done
```

Expected：`FROZEN_EXIT=0`；直接依赖 diff **只有 katex 一行**；三个消费者**全部**解析到 `katex@0.19.1`。若任一指向 `0.16.47`，说明 overrides 没生效，**停止**，不要继续构建。

- [ ] **Step 4: 重跑公式对照**

```bash
cd /d/pages/myblog
node output/katex-upgrade/formula-ab.mjs output/katex-upgrade/formulas-after.json
```

Expected：`formulas=307`（**必须与 before 相同**；数量变化说明抽取或解析行为变了，要查清）。

- [ ] **Step 5: 逐条比对公式渲染**

```bash
cd /d/pages/myblog
node -e "
const fs=require('fs');
const a=JSON.parse(fs.readFileSync('output/katex-upgrade/formulas-before.json','utf8'));
const b=JSON.parse(fs.readFileSync('output/katex-upgrade/formulas-after.json','utf8'));
if(a.formulaCount!==b.formulaCount){console.log('COUNT MISMATCH',a.formulaCount,b.formulaCount);process.exit(1)}
const diffs=[];
const newErrors=[];
const fixedErrors=[];
for(let i=0;i<a.results.length;i++){
  const x=a.results[i], y=b.results[i];
  if(x.value!==y.value){console.log('ORDER MISMATCH at',i,x.file);process.exit(1)}
  if(x.hash!==y.hash) diffs.push({index:i,file:x.file,type:x.type,value:x.value,before:x.hash,after:y.hash,hb:x.htmlLength,ha:y.htmlLength});
  if(!x.error&&y.error) newErrors.push({i,file:x.file,value:x.value,err:y.error});
  if(x.error&&!y.error) fixedErrors.push({i,file:x.file,value:x.value,was:x.error});
}
const out={before:a.katexVersion,after:b.katexVersion,total:a.formulaCount,
  htmlChanged:diffs.length,newErrors,fixedErrors,unchanged:a.formulaCount-diffs.length};
fs.writeFileSync('output/katex-upgrade/formula-diff.json',JSON.stringify({...out,diffs},null,'\t')+'\n');
console.log(JSON.stringify({...out,diffs:undefined},null,1));
"
```

Expected 判定规则：

- `newErrors` **必须为空**。任何新错误都阻断本批（KaTeX 升级不允许把原本能渲染的公式弄坏）。
- `fixedErrors` 可以有——0.19 修了若干 bug，原本报错的公式能渲染是正向收益，但要逐条记录。
- `htmlChanged` 允许非零（字形/标记变化），但**每一处都要能解释**。若大量变化，抽样检查是否是 `<span class="katex">` 结构微调这类等价改写。
- **补充判据（原文档没有，实测必需）**：`htmlChanged` 应几乎全部落在「0.18.0 的类名前缀重命名」上。用独立判据交叉验证——**把两侧 HTML 的所有 `class="..."` 属性剥掉后必须逐字节相同**：

```bash
cd /d/pages/myblog
node -e "
const fs=require('fs');
const a=JSON.parse(fs.readFileSync('output/katex-upgrade/formulas-before.json','utf8'));
const b=JSON.parse(fs.readFileSync('output/katex-upgrade/formulas-after.json','utf8'));
const shaHtml=require('crypto');
let same=0,diff=0;
// 注意：formula-ab.mjs 存的是 hash 不是原文；如需做这一步，改造它额外存 normalizedHash
console.log('若 formula-ab.mjs 未存原文/normalizedHash，此步需先扩展该脚本');
"
```

> **改进建议（下次执行时改 `formula-ab.mjs`）**：除 `hash` 外再存一个 `hashNoClass` = 剥掉所有 `class` 属性后 HTML 的哈希。这样 A/B 可同时得到「原始有无变化」与「变化是否仅为类名」，不必事后再从产物 HTML 反推。

- [ ] **Step 6: 提交（仅当 Step 5 判定通过）**

```bash
cd /d/pages/myblog
git add package.json pnpm-lock.yaml
git commit -m "Upgrade KaTeX to 0.19.1 with formula-level A/B evidence"
```

### Task 3: 构建 A/B 与资产同源性

**Files:**

- Create: `output/katex-upgrade/ab-compare.json`

**Interfaces:**

- Consumes: `output/katex-upgrade/dist-before/`
- Produces: 构建级差异报告

- [ ] **Step 1: 清缓存并重建**

```bash
cd /d/pages/myblog
rm -rf node_modules/.astro .astro/data-store.json dist
$env:NODE_USE_ENV_PROXY='1'
pnpm exec astro build
node scripts/inject-buddha-banner.mjs
pnpm exec pagefind --site dist
grep -E "page\(s\) built" output/katex-upgrade/build-after.log
```

把构建输出重定向到 `output/katex-upgrade/build-after.log`（上一条命令落盘）。

- [ ] **Step 2: 全产物比对**

```bash
cd /d/pages/myblog
cp -r dist output/katex-upgrade/dist-after
node output/phase5-baseline/compare.mjs output/katex-upgrade/dist-before output/katex-upgrade/dist-after output/katex-upgrade/ab-compare.json
```

Expected：`nonHtmlDiffer` 允许含 `_astro/katex.*`、`_astro/KaTeX_*`（版本升级必然改这些）；**其余非 HTML 产物必须逐字节相同**。`htmlDifferStripped` 与 `htmlDifferNormalized` 应接近 0（若 HTML 里内联了公式 HTML 则会有差异，属预期）。

- [ ] **Step 3: 验证 KaTeX 资产同源**

```bash
cd /d/pages/myblog
node -e "
const fs=require('fs');
const before=fs.readFileSync('output/katex-upgrade/katex-assets-before.txt','utf8').trim().split('\n').filter(Boolean);
const after=fs.readdirSync('output/katex-upgrade/dist-after/_astro').filter(f=>/katex|KaTeX_/i.test(f)).sort();
console.log('before:',before.length,'after:',after.length);
const beforeNames=before.map(f=>f.replace(/\.[A-Za-z0-9_-]{8}\./,'.').replace(/\.(woff2?|ttf|css|js)$/,''));
const afterNames=after.map(f=>f.replace(/\.[A-Za-z0-9_-]{8}\./,'.').replace(/\.(woff2?|ttf|css|js)$/,''));
const missing=beforeNames.filter(n=>!afterNames.includes(n));
console.log('missing font/asset families:',missing.length, missing.slice(0,10));
"
```

Expected：`missing font/asset families: 0`。**缺任何一个字体族都阻断**——CSS 引用了不存在的字体文件会静默回退，公式字形会错。

- [ ] **Step 3b: 类名同源判据（原文档没有，实测必需）**

字体族齐全**不能**证明 CSS 与 HTML 是同一版本——错配时两侧都是 61 个资产、21 个族。真正的判据是数产物 HTML 里的类名：

```bash
cd /d/pages/myblog
node -e "
const fs=require('fs');const {readdirSync}=require('fs');const {join}=require('path');
function walk(d,out=[]){for(const e of readdirSync(d,{withFileTypes:true})){const p=join(d,e.name);if(e.isDirectory())walk(p,out);else if(e.name.endsWith('.html'))out.push(p)}return out}
let oldBase=0,oldStrut=0,newBase=0,newStrut=0;
for(const f of walk('output/katex-upgrade/dist-after')){
  const h=fs.readFileSync(f,'utf8');
  for(const m of h.matchAll(/class=\"([^\"]+)\"/g))for(const c of m[1].split(/\s+/)){
    if(c==='base')oldBase++; if(c==='strut')oldStrut++;
    if(c==='katex-base')newBase++; if(c==='katex-strut')newStrut++;
  }
}
console.log(JSON.stringify({oldBase,oldStrut,newBase,newStrut}));
if(oldBase||oldStrut){console.log('FAIL: 产物里仍有旧类名 => CSS 与 HTML 版本错配');process.exit(1)}
if(!newBase||!newStrut){console.log('FAIL: 没有新类名 => 升级没有真正生效');process.exit(1)}
console.log('OK: 类名同源');
"
```

Expected：`oldBase: 0`、`oldStrut: 0`，`newBase` / `newStrut` 非零（本次实测各 669）。**这条是唯一能抓住「构建用旧版、CSS 用新版」的判据**，不要省。

- [ ] **Step 4: 提交**

```bash
cd /d/pages/myblog
git add -A
git commit --amend --no-edit
```

（把构建证据并入同一笔升级提交；`output/` 被忽略，不会进提交。）

### Task 4: 检查、实机与公式视觉验收

**Files:**

- Create: `output/katex-upgrade/shots/`

**Interfaces:**

- Consumes: 本批 `dist/`

- [ ] **Step 1: 跑检查门禁**

```bash
cd /d/pages/myblog
pnpm check 2>&1 | tail -6
pnpm test:prettier-math 2>&1 | grep -E "^ℹ (tests|pass|fail)"
pnpm exec prettier --check ./src ./docs 2>&1 | tail -2
pnpm test:lib 2>&1 | grep -E "^ℹ (tests|pass|fail)"
pnpm test:utils 2>&1 | grep -E "^ℹ (tests|pass|fail)"
```

Expected：check `0 errors / 6 hints`；公式保护 `38/38`；格式通过；lib `16/16`；utils `261/261`。

**若 `test:prettier-math` 失败**：说明新 KaTeX 的渲染结果变了（它比较格式化前后公式的 KaTeX 输出）。这**不一定**是坏事，但要先确认是「两边都用新版本、结论仍成立」，还是「新版本让某个公式真的渲染错了」。逐个看失败断言。

- [ ] **Step 2: 起静态服务并测公式页**

```bash
cd /d/pages/myblog
node output/svelte-upgrade/serve-dist.mjs dist 4330 > output/katex-upgrade/serve.log 2>&1 &
sleep 3
curl -s -o /dev/null -w "root %{http_code}\n" http://localhost:4330/
curl -s -o /dev/null -w "formula-page %{http_code}\n" http://localhost:4330/posts/20260320000000/
```

- [ ] **Step 3: 实机核对公式渲染**

```bash
cd /d/pages/myblog
node --input-type=module -e "
import { chromium } from 'playwright';
const b=await chromium.launch({headless:true});
const c=await b.newContext({viewport:{width:1440,height:900}});
const p=await c.newPage();
const errs=[]; p.on('pageerror',e=>errs.push(String(e.message).slice(0,200)));
await p.goto('http://localhost:4330/posts/20260320000000/',{waitUntil:'load'});
const d=await p.evaluate(()=>{
  const ks=[...document.querySelectorAll('.katex')];
  const boxes=ks.slice(0,5).map(k=>{const r=k.getBoundingClientRect();return {w:Math.round(r.width),h:Math.round(r.height)}});
  return {count:ks.length, first5:boxes, mathml:document.querySelectorAll('.katex math').length,
    overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth};
});
console.log(JSON.stringify(d,null,1));
console.log('pageerrors:',errs.length,errs.slice(0,3));
await p.screenshot({path:'output/katex-upgrade/shots/formula-page.png'});
await b.close();
"
```

Expected：`count` 为约 298（该篇公式数）；每个 `first5` 盒子宽高 > 0；`mathml > 0`；`overflow <= 1`；`pageerrors: 0`。

**但「盒子宽高 > 0」不足以证明渲染正确**——CSS/HTML 错配时盒子照样非零，只是高度错了（实测 24.22 → 28.05）。必须同时断言类名：

```js
// 追加进上面的 evaluate 返回值
newClass_katexBase: document.querySelectorAll(".katex-base").length,
newClass_katexStrut: document.querySelectorAll(".katex-strut").length,
oldClass_base: document.querySelectorAll(".base").length,
oldClass_strut: document.querySelectorAll(".strut").length,
katexError: document.querySelectorAll(".katex-error").length,
```

Expected：`oldClass_base === 0 && oldClass_strut === 0`；`newClass_katexBase` 与 `newClass_katexStrut` 均非零（本次实测各 652）；`katexError === 0`。同时确认 `link[rel=stylesheet][href*="katex"]` 只有一份且文件名与产物里那份一致。

- [ ] **Step 4: 查看截图**

用 `read_image` 打开 `output/katex-upgrade/shots/formula-page.png`，确认公式排版（分数、上下标、希腊字母）正常，无方框、无重叠、无截断。

- [ ] **Step 5: 移动端复核**

```bash
cd /d/pages/myblog
node --input-type=module -e "
import { chromium } from 'playwright';
const b=await chromium.launch({headless:true});
const c=await b.newContext({viewport:{width:390,height:900}});
const p=await c.newPage();
await p.goto('http://localhost:4330/posts/20260320000000/',{waitUntil:'load'});
const d=await p.evaluate(()=>({
  katex:document.querySelectorAll('.katex').length,
  overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth
}));
console.log(JSON.stringify(d));
await p.screenshot({path:'output/katex-upgrade/shots/formula-mobile.png'});
await b.close();
"
```

Expected：`katex` 与桌面一致；`overflow <= 1`。若公式在窄屏溢出，检查是否需要 `.katex-display` 的横向滚动容器（这是既有行为，不是新问题；如确认是升级引入才处理）。

- [ ] **Step 6: 关服务并提交**

```bash
cd /d/pages/myblog
for pid in $(netstat -ano | grep ":4330 " | grep LISTENING | awk '{print $5}' | sort -u); do taskkill //PID $pid //F; done
```

无源码变更，无需额外提交。

### Task 5: KaTeX 批次文档同步与收口

**Files:**

- Create: `docs/plans/2026-11-03-katex-upgrade.md`
- Modify: `CHANGELOG.md`（新条目置顶）
- Modify: `docs/agents/build-and-deploy.md`
- Modify: `docs/plans/2026-11-03-dependency-upgrade-roadmap.md`

**Interfaces:**

- Produces: 专项报告，含固定提交 SHA 的「父提交」描述（不写死自身 SHA，amended 会自指失效）

- [ ] **Step 1: 写专项报告**

Create `docs/plans/2026-11-03-katex-upgrade.md`，必须包含这几节的**实测数字**（从前面 task 的 JSON 里取）：

```markdown
# KaTeX 第五批独立升级：0.16.47 → 0.19.1

目标：仅把 `katex` 升至精确 0.19.1，保留 Markdown 管线、`rehype-katex` 配置、公式保护测试与全部文章内容。

## 风险判定依据

0.19.0 唯一的破坏性变更：缺字符度量改为经 `strict` 上报 `symbolNotInFont`，在 `strict: "error"` 下变错误。
本站 `src/plugins/pipeline.mjs` 的 `rehypeKatex` **未传选项** = 默认 `strict: "warn"`，不触发硬失败。

## 执行结果

（从 output/katex-upgrade/formula-diff.json 填入：formulaCount / htmlChanged / newErrors / fixedErrors / unchanged）
（从 ab-compare.json 填入：nonHtmlDiffer 清单及其归因）
（从 katex-assets-before/after 填入：字体族缺失数，应为 0）

## 未验证边界

- 只验证 Chromium。
- ~~未跑远端 CI（直到推送时）~~ 已于 2026-11-03 推送后完成，三个 workflow 全 success。
```

- [ ] **Step 2: 写 CHANGELOG 条目**

在 `CHANGELOG.md` 的 `# 更新日志` 之后插入（新条目在最上）：

```markdown
## 2026-11-03：KaTeX 升至 0.19.1，307 个公式逐条 A/B

- `package.json` / `pnpm-lock.yaml` 将 `katex` 从 `^0.16.25`（安装 0.16.47）升至**精确 0.19.1**，其他直接依赖安装版本不变。
- **破坏性变更判定**：0.19.0 把缺字符度量改为经 `strict` 上报 `symbolNotInFont`，仅在 `strict: "error"` 下变错误；本站 `rehypeKatex` 未传选项（默认 `warn`），不触发硬失败。
- 公式级 A/B：全站 **307 个公式**用新旧版本各渲染一次逐条比对哈希。新错误 **0** 条，修复 **N** 条，HTML 变化 **M** 条（逐条归因见专项报告）。
- 构建 A/B：非 KaTeX 资产逐字节相同；KaTeX 字体族 **0 缺失**（CSS 引用的字体文件必须全部存在，否则静默回退导致字形错误）。
- `pnpm check` 0 errors / 6 hints，公式保护 38/38，格式门禁通过；桌面 1440×900 与移动 390×900 公式页无异常、无横向溢出。
- ~~未跑远端 CI 或部署~~ 已于 2026-11-03 推送后完成，详见 `docs/plans/2026-11-03-katex-upgrade.md`。
```

**把 N/M 替换为实际数字**，不得保留占位符。

- [ ] **Step 3: 更新构建文档**

在 `docs/agents/build-and-deploy.md` 的「构建链与依赖约束」节内追加一条，格式照抄既有条目：

```markdown
- **KaTeX 独立升级（2026-11-03）**：`katex` 精确固定 **0.19.1**（原 `^0.16.25`）。0.19.0 的破坏性变更只影响 `strict: "error"` 用户；本站 `rehypeKatex` 无选项（默认 `warn`）不受影响。升级必须验证 **KaTeX 字体族零缺失**——CSS 引用的 `KaTeX_*` 字体文件若缺任何一个会静默回退到系统字体，公式字形错但不报错。证据见 [KaTeX 专项验收](../plans/2026-11-03-katex-upgrade.md)。
```

- [ ] **Step 4: 更新总计划状态**

在 `docs/plans/2026-11-03-dependency-upgrade-roadmap.md` 的表格追加一行，并在阶段五的表格里把 KaTeX 那行标注为已完成：

```markdown
| [x] 已发布 | 第五批 KaTeX 0.16.47→0.19.1 | [专项报告](2026-11-03-katex-upgrade.md)；本地提交 `c5b622f`，随 `1073945` 推送上线 |
```

- [ ] **Step 5: 格式门禁与提交**

```bash
cd /d/pages/myblog
pnpm exec prettier --write CHANGELOG.md docs/plans/2026-11-03-katex-upgrade.md docs/agents/build-and-deploy.md docs/plans/2026-11-03-dependency-upgrade-roadmap.md
pnpm exec prettier --check ./src ./docs 2>&1 | tail -2
git add CHANGELOG.md docs/plans/2026-11-03-katex-upgrade.md docs/agents/build-and-deploy.md docs/plans/2026-11-03-dependency-upgrade-roadmap.md
git commit --amend --no-edit
git log -2 --oneline
git status --short
```

Expected：格式检查通过；`git status` 干净（`output/` 被忽略）；`git log` 显示本批提交在 `fb6c888` 之后。

- [ ] **Step 6: 停下来等授权**

**不要**开始 Mermaid。向站长报告本批结果，等待指令。

---

## 第二批：Mermaid 11.17.2 → 12.2.0（中风险）

**先决问题（必须由站长回答，不能自行决定）**：Mermaid 12 要求 **Safari 17.4+ / ES2024**。老 iOS 设备拿不到 Safari 大版本更新，**这部分访客将无法渲染任何图表**。这是产品决策。

### Task 6: 确认浏览器下限

**Files:** 无（决策 task）

- [ ] **Step 1: 向站长确认**

用 `ask_user_question` 提三个选项：

1. 接受 Safari 17.4+ 下限，继续升级
2. 不接受，Mermaid 保持 11.17.2（记为不升级，写进总计划冻结理由）
3. 先量化当前访客的 Safari 版本分布再决定

- [ ] **Step 2: 记录决定**

把结论写进 `docs/plans/2026-11-03-phase5-migration-assessment.md` 的 Mermaid 一节，注明日期与裁定。

**若选 2 或 3**：跳过 Task 7-11，直接进 Tailwind 批次。

### Task 7: 建立 Mermaid 图表级 A/B 对照器

**Files:**

- Create: `output/mermaid-upgrade/diagram-ab.mjs`

**Interfaces:**

- Consumes: `src/content/**/*.md` 里 99 个 ` ```mermaid ` 代码块（14 篇：flowchart 86、sequenceDiagram 5、stateDiagram-v2 2、graph/gantt/classDiagram/pie/mindmap 各 1）
- Produces: `{ diagrams: 99, results: Array<{index,file,type,source,svgHash,error}> }`

- [ ] **Step 1: 写对照器**

Create `output/mermaid-upgrade/diagram-ab.mjs`。核心是**在真实浏览器里**渲染每个图表并取 SVG 的规范化哈希——Mermaid 是浏览器端库，Node 里不能可靠渲染：

````js
// Mermaid 升级：99 个图表的渲染级 A/B 对照器（一次性工具，不入库）。
// 必须在真实 Chromium 里渲染：mermaid 依赖 DOM 测量。
//
// 用法：
//   node output/mermaid-upgrade/diagram-ab.mjs extract            # 抽取图表源码到 json
//   node output/mermaid-upgrade/diagram-ab.mjs render <inJson> <outJson> [baseUrl]
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { chromium } from "playwright";

const [, , mode, arg1, arg2, arg3] = process.argv;

async function markdownFiles(dir) {
	const out = [];
	for (const e of await readdir(dir, { withFileTypes: true })) {
		const p = join(dir, e.name);
		if (e.isDirectory()) out.push(...(await markdownFiles(p)));
		else if (e.name.endsWith(".md")) out.push(p);
	}
	return out.sort();
}

if (mode === "extract") {
	const files = await markdownFiles("src/content");
	const diagrams = [];
	for (const file of files) {
		const src = await readFile(file, "utf8");
		const re = /```mermaid\s*\n([\s\S]*?)```/g;
		let m;
		while ((m = re.exec(src))) {
			const body = m[1];
			const first = body.trim().split("\n")[0].trim();
			diagrams.push({
				index: diagrams.length,
				file,
				type: first.split(/[\s{]/)[0],
				source: body,
			});
		}
	}
	await mkdir("output/mermaid-upgrade", { recursive: true });
	await writeFile(
		"output/mermaid-upgrade/diagrams.json",
		JSON.stringify(diagrams, null, "\t") + "\n",
	);
	const byType = {};
	for (const d of diagrams) byType[d.type] = (byType[d.type] ?? 0) + 1;
	console.log(`diagrams=${diagrams.length}`, JSON.stringify(byType));
	process.exit(0);
}

if (mode === "render") {
	const inPath = arg1 ?? "output/mermaid-upgrade/diagrams.json";
	const outPath = arg2 ?? "output/mermaid-upgrade/render.json";
	const base = arg3 ?? "http://localhost:4331";
	const chunkArg = arg4 ?? null; // mermaid.core.<hash>.js 的文件名；null 时自动探测
	const diagrams = JSON.parse(await readFile(inPath, "utf8"));

	const browser = await chromium.launch({ headless: true });
	const ctx = await browser.newContext({
		viewport: { width: 1440, height: 900 },
	});
	const page = await ctx.newPage();
	await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });

	const results = await page.evaluate(
		async ({ list, chunkArg }) => {
			// 自动探测 mermaid chunk：先看 modulepreload，再扫页面 HTML
			let chunk = chunkArg;
			if (!chunk) {
				const preloads = [
					...document.querySelectorAll("link[rel=modulepreload]"),
				]
					.map((l) => l.href)
					.filter((h) =>
						/mermaid\.core\.[A-Za-z0-9_-]+\.js$/.test(h),
					);
				if (preloads.length) chunk = preloads[0].split("/").pop();
			}
			if (!chunk) {
				const html = await (
					await fetch("/", { cache: "no-store" })
				).text();
				const m = html.match(/mermaid\.core\.[A-Za-z0-9_-]+\.js/);
				chunk = m ? m[0] : null;
			}
			if (!chunk) throw new Error("mermaid.core chunk not found on page");

			const mod = await import(`/_astro/${chunk}`);
			const mermaid = mod.default ?? mod;
			// 与 src/utils/runtime/mermaid.ts 的 initialize 保持同口径（主题/look/安全级别/字体）
			mermaid.initialize({
				startOnLoad: false,
				layout: "dagre",
				theme: "base",
				look: "classic",
				fontFamily: getComputedStyle(document.body).fontFamily,
				fontSize: 14,
				securityLevel: "strict",
			});

			const out = [];
			for (const d of list) {
				const id = "probe-" + d.index;
				try {
					const { svg } = await mermaid.render(id, d.source);
					// 归一化：mermaid 给元素随机 id、用 url(#xxx) 引用，必须抹掉才能跨次比对
					const norm = svg
						.replace(/id="[^"]*"/g, 'id="ID"')
						.replace(/url\(#[^)]*\)/g, "url(#REF)")
						.replace(/\s+/g, " ");
					const buf = new TextEncoder().encode(norm);
					const h = await crypto.subtle.digest("SHA-256", buf);
					const hex = [...new Uint8Array(h)]
						.map((b) => b.toString(16).padStart(2, "0"))
						.join("")
						.slice(0, 16);
					out.push({
						index: d.index,
						file: d.file,
						type: d.type,
						source: d.source,
						svgLength: svg.length,
						svgHash: hex,
						error: null,
					});
				} catch (e) {
					out.push({
						index: d.index,
						file: d.file,
						type: d.type,
						source: d.source,
						svgLength: null,
						svgHash: null,
						error: String(e.message).split("\n")[0],
					});
				}
			}
			return out;
		},
		{ list: diagrams, chunkArg },
	);

	await writeFile(outPath, JSON.stringify(results, null, "\t") + "\n");
	console.log(
		`rendered=${results.length} errors=${results.filter((r) => r.error).length}`,
	);
	await browser.close();
	process.exit(0);
}

console.error(
	"usage: diagram-ab.mjs extract | render <inJson> <outJson> [baseUrl]",
);
process.exit(2);
````

- [ ] **Step 2: 确认 Mermaid chunk 可被直接 import（已实测验证）**

2026-11-03 实测结论，**不需要再探索**：本仓库的 preview 产物里有一个 `mermaid.core.<hash>.js` chunk，可以从页面里 `import("/_astro/mermaid.core.<hash>.js")` 直接拿到完整 API。实测：

```
import('/_astro/mermaid.core.U4uHHzdw.js')
→ { ok: true, hasInitialize: true, hasRender: true,
    keys: ["startOnLoad","mermaidAPI","parse","render","init","run",...] }
```

并用它渲染了一个 4 节点 flowchart，得到 14894 字节的有效 SVG、4 个 `nodeLabel`。**上面 `render` 分支的自动探测逻辑就是照此写的**，无需额外调研。

注意 hash 每次构建都会变，所以代码里用正则从 `link[rel=modulepreload]` 或页面 HTML 里探测，不硬编码。

- [ ] **Step 3: 跑旧版基线并自证**

```bash
cd /d/pages/myblog
node output/mermaid-upgrade/diagram-ab.mjs extract
node output/svelte-upgrade/serve-dist.mjs dist 4331 > output/mermaid-upgrade/serve.log 2>&1 &
sleep 3
node output/mermaid-upgrade/diagram-ab.mjs render output/mermaid-upgrade/diagrams.json output/mermaid-upgrade/render-before.json http://localhost:4331
node output/mermaid-upgrade/diagram-ab.mjs render output/mermaid-upgrade/diagrams.json output/mermaid-upgrade/render-before2.json http://localhost:4331
node -e "
const a=require('./output/mermaid-upgrade/render-before.json');
const b=require('./output/mermaid-upgrade/render-before2.json');
const ha=a.map(r=>r.svgHash+'|'+r.error).join('\n');
const hb=b.map(r=>r.svgHash+'|'+r.error).join('\n');
console.log('deterministic:',ha===hb,'count:',a.length,'errors:',a.filter(r=>r.error).length);
if(ha!==hb)process.exit(1);
"
```

Expected：`deterministic: true`；`count: 99`；`errors:` 记录旧版已有错误数。

**若 `deterministic: false`**：说明 SVG 里有未归一化的随机量，补归一化规则（例如 `<style>` 内的 scoped hash）后再测，**直到 true**。

- [ ] **Step 4: 提交**

无源码变更，无需提交。

### Task 8: 升级 Mermaid 并显式固定 dagre 布局

**Files:**

- Modify: `package.json`（`mermaid` 一行）
- Modify: `pnpm-lock.yaml`
- Modify: `src/utils/runtime/mermaid.ts`（`initialize` 加 `layout: "dagre"`）

**Interfaces:**

- Consumes: Task 7 的 `render-before.json`
- Produces: `render-after.json`

- [ ] **Step 1: 精确安装 12.2.0**

```bash
cd /d/pages/myblog
pnpm add --save-exact mermaid@12.2.0 --ignore-scripts --strict-peer-dependencies --store-dir .pnpm-store --registry https://registry.npmjs.org
node -e "
const fs=require('fs');
const p=JSON.parse(fs.readFileSync('package.json','utf8'));
p.dependencies.mermaid='12.2.0';
fs.writeFileSync('package.json', JSON.stringify(p,null,'\t')+'\n');
"
pnpm install --ignore-scripts --strict-peer-dependencies --store-dir .pnpm-store --registry https://registry.npmjs.org
pnpm install --frozen-lockfile --offline --ignore-scripts --strict-peer-dependencies --store-dir .pnpm-store
echo "FROZEN_EXIT=$?"
pnpm list --depth 0 > output/mermaid-upgrade/deps-after.txt
diff output/phase5-baseline/deps-before.txt output/mermaid-upgrade/deps-after.txt || true
```

Expected：`FROZEN_EXIT=0`；直接依赖只有 mermaid 一行变化。**注意**：mermaid 12 依赖里有 `katex`（peer 或 direct），若它把 katex 顶到别的版本，需记录并评估是否与第五批冲突。

> **⚠ 2026-11-03 执行补记：只加 `layout: "dagre"` 不够，站点仍会变形。** 实际执行时钉回 dagre 后 99/99 图表 SVG 全部变化，逐项 diff 两版默认配置才发现另有两条**官方 CHANGELOG 未单列**的默认值变更：`flowchart.wrappingWidth` 从 **200 → 120**，且新增 `minNodeWidth: 120`（`state` 同）。这一项不是布局引擎差异，dagre 挡不住，后果是标签提前换行、节点压窄、行数增加——实测全站宽度 66/99 变窄、高度 75/99 变高、**无一变矮**，真实页图表区 +17%。必须同时加上 `flowchart: { wrappingWidth: 200, minNodeWidth: 0 }` 与 `state: { wrappingWidth: 200, minNodeWidth: 0 }`。`minNodeWidth` 设 `0`（11.17.2 无此配置 = 不约束），设 120 会重新压窄。**类型约束**：`wrappingWidth` 既不在顶层 `MermaidConfig` 也不在 `MindmapDiagramConfig`，写错位置 `pnpm check` 报 `ts(2353)`。加上后实测宽度一致 99/99、宽高都一致 96/99、SVG 哈希逐字节相同 89/99。详见 [Mermaid 专项验收](2026-11-03-mermaid-upgrade.md)。

- [ ] **Step 2: 加 dagre 回退（保住 86 个 flowchart 的现有外观）**

Modify `src/utils/runtime/mermaid.ts`，在 `mermaid.initialize({...})` 里加一行：

```ts
		mermaid.initialize({
			startOnLoad: false,
			// Mermaid 12.0.0 起 ELK 是默认布局引擎（#8155），会改变未声明 layout 的
			// flowchart / state / class / ER 等图表外观。本站 86 个 flowchart 均未声明布局，
			// 显式钉回 dagre 以保持 2026-11-03 之前的渲染结果。
			// 若要改用 ELK，需单独裁决并重跑全部 99 个图表的对照。
			layout: "dagre",
			theme: "base",
			look: "classic",
```

- [ ] **Step 3: 重建并重跑图表对照**

```bash
cd /d/pages/myblog
rm -rf node_modules/.astro .astro/data-store.json dist
$env:NODE_USE_ENV_PROXY='1'
pnpm exec astro build > output/mermaid-upgrade/build-after.log 2>&1
node scripts/inject-buddha-banner.mjs
pnpm exec pagefind --site dist
for pid in $(netstat -ano | grep ":4331 " | grep LISTENING | awk '{print $5}' | sort -u); do taskkill //PID $pid //F; done
node output/svelte-upgrade/serve-dist.mjs dist 4331 > output/mermaid-upgrade/serve-after.log 2>&1 &
sleep 3
node output/mermaid-upgrade/diagram-ab.mjs render output/mermaid-upgrade/diagrams.json output/mermaid-upgrade/render-after.json http://localhost:4331
```

- [ ] **Step 4: 逐图比对**

```bash
cd /d/pages/myblog
node -e "
const fs=require('fs');
const a=JSON.parse(fs.readFileSync('output/mermaid-upgrade/render-before.json','utf8'));
const b=JSON.parse(fs.readFileSync('output/mermaid-upgrade/render-after.json','utf8'));
const diffs=[],newErr=[],fixed=[];
for(let i=0;i<a.length;i++){
  const x=a[i],y=b[i];
  if(x.source!==y.source){console.log('ORDER MISMATCH',i);process.exit(1)}
  if(x.svgHash!==y.svgHash) diffs.push({i,file:x.file,type:x.type,hb:x.svgLength,ha:y.svgLength});
  if(!x.error&&y.error) newErr.push({i,file:x.file,type:x.type,err:y.error});
  if(x.error&&!y.error) fixed.push({i,file:x.file,type:x.type});
}
const out={total:a.length,svgChanged:diffs.length,newErrors:newErr,fixedErrors:fixed,unchanged:a.length-diffs.length};
fs.writeFileSync('output/mermaid-upgrade/diagram-diff.json',JSON.stringify({...out,diffs},null,'\t')+'\n');
console.log(JSON.stringify({...out,newErrors:undefined},null,1));
"
```

判定规则：

- `newErrors` **必须为空**，否则阻断。
- `svgChanged` **预期不为 0**（12 版即使 dagre 布局也可能有标记差异），但**必须能解释**。若数量接近 99（全变），说明 dagre 没生效或 ELK 仍在参与，回头查 Step 2。

- [ ] **Step 5: 提交**

```bash
cd /d/pages/myblog
git add package.json pnpm-lock.yaml src/utils/runtime/mermaid.ts
git commit -m "Upgrade Mermaid to 12.2.0 with diagram-level A/B and pinned dagre layout"
```

### Task 9: Mermaid 视觉契约与实机验收

**Files:**

- Create: `output/mermaid-upgrade/shots/`

- [ ] **Step 1: 确认两处视觉契约未被破坏**

```bash
cd /d/pages/myblog
pnpm test:lib 2>&1 | grep -E "mermaid|themeCSS|^ℹ (tests|pass|fail)"
```

Expected：`mermaid.test.ts` 的三条断言全绿（themeCSS 逐字节、主题色来自入参、换行终态在位）。**若失败**：说明 `themeCSS` 本身被改动了，但 Task 8 只加了 `layout`，不该失败——先 `git diff src/utils/runtime/mermaid.ts` 确认只多了一行。

- [ ] **Step 2: 实机核对字体就绪门与换行终态**

```bash
cd /d/pages/myblog
node --input-type=module -e "
import { chromium } from 'playwright';
const b=await chromium.launch({headless:true});
const c=await b.newContext({viewport:{width:1440,height:900}});
const p=await c.newPage();
const errs=[]; p.on('pageerror',e=>errs.push(String(e.message).slice(0,200)));
// 找一篇含 mermaid 的文章
await p.goto('http://localhost:4331/archive/',{waitUntil:'load'});
const href=await p.evaluate(()=>{
  // archive 页拿不到图表信息，直接扫 sitemap 里的文章；改用固定已知含图文章
  return null;
});
await b.close();
" 2>/dev/null || true
# 先用脚本找出含 mermaid 的文章路径
node -e "
const fs=require('fs');
const files=JSON.parse(fs.readFileSync('output/mermaid-upgrade/diagrams.json','utf8'));
const byFile={};
for(const d of files) byFile[d.file]=(byFile[d.file]||0)+1;
const top=Object.entries(byFile).sort((a,b)=>b[1]-a[1]).slice(0,3);
console.log(top.map(([f,n])=>f+' -> '+n+' 图').join('\n'));
"
```

从输出里挑图表最多的一篇，把它的 `src/content/posts/<slug>/index.md` 里的 `<slug>` 作为 URL。然后跑：

```bash
cd /d/pages/myblog
node --input-type=module -e "
import { chromium } from 'playwright';
const URL='http://localhost:4331/posts/<SLUG>/';
const b=await chromium.launch({headless:true});
const c=await b.newContext({viewport:{width:1440,height:900}});
const p=await c.newPage();
const errs=[]; p.on('pageerror',e=>errs.push(String(e.message).slice(0,200)));
await p.goto(URL,{waitUntil:'load'});
// 等所有 pre.mermaid 渲染完成（站点打 dataset.mermaidRendered）
await p.waitForFunction(()=>{
  const all=[...document.querySelectorAll('pre.mermaid')];
  return all.length>0 && all.every(n=>n.dataset.mermaidRendered==='true');
},null,{timeout:30000});
const d=await p.evaluate(()=>{
  const pres=[...document.querySelectorAll('pre.mermaid')];
  return {
    diagrams:pres.length,
    withSvg:pres.filter(n=>n.querySelector('svg')).length,
    rendered:pres.filter(n=>n.dataset.mermaidRendered==='true').length,
    overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
    // 换行终态：检查是否有 label 被 nowrap 卡住（宽度明显超出容器）
    nowrapLabels:[...document.querySelectorAll('pre.mermaid .label foreignObject div')]
      .filter(e=>getComputedStyle(e).whiteSpace==='nowrap').length
  };
});
console.log(JSON.stringify(d,null,1));
console.log('pageerrors:',errs.length,errs.slice(0,3));
await p.screenshot({path:'output/mermaid-upgrade/shots/diagrams.png',fullPage:false});
await b.close();
"
```

Expected：`diagrams === withSvg === rendered`（全部渲染成功）；`overflow <= 1`；`nowrapLabels` 记录实际值（用于对比旧版，不是硬门槛）；`pageerrors: 0`。

- [ ] **Step 3: 查看截图**

用 `read_image` 打开截图，确认节点底色（浅绿 `#edfaf2`）、边框（海洋绿）、连线、中文标签换行都正常。

- [ ] **Step 4: 检查门禁**

```bash
cd /d/pages/myblog
pnpm check 2>&1 | tail -6
pnpm test:prettier-math 2>&1 | grep -E "^ℹ (tests|pass|fail)"
pnpm exec prettier --check ./src ./docs 2>&1 | tail -2
pnpm test:lib 2>&1 | grep -E "^ℹ (tests|pass|fail)"
pnpm test:utils 2>&1 | grep -E "^ℹ (tests|pass|fail)"
```

Expected：check `0 errors / 6 hints`；其余同前面基准。

- [ ] **Step 5: 关服务**

```bash
for pid in $(netstat -ano | grep ":4331 " | grep LISTENING | awk '{print $5}' | sort -u); do taskkill //PID $pid //F; done
```

### Task 10: Mermaid 批次文档同步与收口

**Files:**

- Create: `docs/plans/2026-11-03-mermaid-upgrade.md`
- Modify: `CHANGELOG.md`、`docs/agents/build-and-deploy.md`、`docs/agents/components.md`、`docs/plans/2026-11-03-dependency-upgrade-roadmap.md`

- [ ] **Step 1: 写专项报告**

Create `docs/plans/2026-11-03-mermaid-upgrade.md`，必须含：

- 站长对 Safari 17.4+ 下限的裁定原文与日期
- 99 个图表 A/B 的实际数字（svgChanged / newErrors=0 / fixedErrors）
- 显式 `layout: "dagre"` 的决定与理由（引用 12.0.0 #8155）
- 两处视觉契约的复验结论
- 未验证边界：只验 Chromium；未在 Safari 17.4 以下设备实测（无法实机）

- [ ] **Step 2: 写 CHANGELOG 条目**

```markdown
## 2026-11-03：Mermaid 升至 12.2.0，99 个图表 A/B 并显式钉回 dagre

- `package.json` / `pnpm-lock.yaml` 将 `mermaid` 从 `^11.17.2` 升至**精确 12.2.0**。本站 99 个图表全部纳入 A/B：新错误 **0** 条，SVG 变化 **N** 条（逐条归因见专项报告）。
- **Mermaid 12.0.0 把 ELK 设为默认布局引擎**（#8155），会改变未声明 `layout` 的 flowchart 等图表外观。本站 86 个 flowchart 都没声明布局，因此在 `src/utils/runtime/mermaid.ts` 的 `initialize` 里**显式加 `layout: "dagre"`** 保持既有渲染结果。这是本次唯一的源码改动。
- 另外两条破坏性变更本站不受影响：`redux-color`/`neo` 默认主题与 look（本站已显式 `theme: "base"` + `look: "classic"`）；ES2024 要求（Node 24 满足）。
- **受影响的访客边界**：Mermaid 12 要求 **Safari 17.4+**，更老的 iOS 设备将无法渲染图表。站长已裁定接受（裁定记录见专项报告）。
- 两处视觉契约（字体就绪门、themeCSS 换行终态）`mermaid.test.ts` 三条断言全绿，实机复核中文标签换行正常。
- `pnpm check` 0 errors / 6 hints，公式 38/38，格式门禁通过，lib 16/16，utils 261/261。远 CI 已于 2026-11-03 推送后跑过，三个 workflow 全 success。
```

- [ ] **Step 3: 更新构建文档与组件文档**

`docs/agents/build-and-deploy.md` 追加依赖条目（照既有格式），必须写明「ELK 是 12 的默认布局，删掉 `layout: "dagre"` 会改变 86 个 flowchart 外观」。

`docs/agents/components.md` 的 Mermaid 相关段落追加：视觉契约新增强制项——**改 `initialize` 的 `layout` 必须重跑 99 图表对照**。

- [ ] **Step 4: 更新总计划表格**

```markdown
| [x] 已发布 | 第六批 Mermaid 11.17.2→12.2.0 | [专项报告](2026-11-03-mermaid-upgrade.md)；本地提交 `a9f4913`，随 `1073945` 推送上线 |
```

- [ ] **Step 5: 格式门禁与提交**

```bash
cd /d/pages/myblog
pnpm exec prettier --write CHANGELOG.md docs/plans/2026-11-03-mermaid-upgrade.md docs/agents/build-and-deploy.md docs/agents/components.md docs/plans/2026-11-03-dependency-upgrade-roadmap.md
pnpm exec prettier --check ./src ./docs 2>&1 | tail -2
git add -A
git commit --amend --no-edit
git log -2 --oneline && git status --short
```

- [ ] **Step 6: 停下来等授权**

**不要**开始 Tailwind。

---

## 第三批：Tailwind 3.4.19 → 4.3.4（高风险，属接入方式重写）

**这不是版本升级。** 必须先出方案并获批，才能动代码。

**为什么**：

- Tailwind 4 不再是 PostCSS 插件（改用 `@tailwindcss/postcss` 或 Vite 插件）
- 配置从 `tailwind.config.cjs` 迁到 CSS-first（`@theme` 块）
- `@tailwind base/components/utilities` 三指令作废，**两套样式**入口都要改
- Preflight 行为变化影响全站既有外观
- **会推翻一条已固化的文档结论**：`docs/agents/build-and-deploy.md` 明确记录「Tailwind v3 的 `@layer` 是构建期指令，产物里根本不存在 `@layer`，冲突按特异性→源顺序判定」。v4 引入真实 CSS 级联层。

### Task 11: Tailwind 4 迁移方案（必须先获批）

**Files:**

- Create: `docs/plans/2026-11-03-tailwind4-migration-design.md`

**Interfaces:**

- Produces: 迁移设计文档，供站长审批。**未获批不得进入 Task 12。**

- [ ] **Step 1: 盘点现有 Tailwind 依赖面**

```bash
cd /d/pages/myblog
cat tailwind.config.cjs
cat postcss.config.mjs
grep -c "@tailwind" src/styles/global.css src/nice-books/styles/books.css
echo "--- 用到 typography 插件的地方 ---"
grep -rn "prose" src/styles/global.css | head -10
echo "--- 用到颜色 token 的 utility 类 ---"
grep -roh "bg-\(primary\|primarydark\|hot\|new\|pagebg\|line\)[a-z0-9/]*" src/ --include="*.astro" --include="*.css" | sort -u | head -20
```

- [ ] **Step 2: 写迁移设计文档**

Create `docs/plans/2026-11-03-tailwind4-migration-design.md`，必须回答：

1. **接入方式**：用 `@tailwindcss/postcss` 还是 `@tailwindcss/vite`？给理由（本项目已用 Vite 8 / Rolldown，且 `postcss.config.mjs` 里还有 `postcssNesting`、`autoprefixer`，需确认 v4 是否还需要 nesting 插件）。
2. **配置迁移**：`tailwind.config.cjs` 里 `theme.extend.colors`（`primary`/`primarydark`/`hot`/`new`/`pagebg`/`line`/`nb.*`）、`fontFamily`（`sans`/`mono`/`nb-body`/`nb-serif`/`nb-kai`/`nb-hand`/`nb-mono`）、`boxShadow.wrapper`、`borderRadius.box` 如何映射到 `@theme`。
3. **两套样式**：`global.css` 与 `books.css` 各自的入口怎么写；Nice Books 的 `--nb-*` 变量是否继续留在 `books.css`。
4. **`@layer` 语义变化**：v3 是构建期指令，v4 是真实级联层。列出**受影响的既有规则**（尤其 `build-and-deploy.md` 记录的 `html{font-size:100%}` 与 `.prose code` 特异性案例）。
5. **Preflight 变化**：列出可能影响 `.prose`、表格、按钮、表单的具体项。
6. **回退方案**：出问题时如何退回 3.4.19（依赖与配置都要能回退）。
7. **验收标准**：23 页计算样式指纹（复用 `scripts/upgrade-style-audit.mjs`）+ 桌面/移动截图 + 关键交互。

- [ ] **Step 3: 提交设计文档并请站长审批**

```bash
cd /d/pages/myblog
pnpm exec prettier --write docs/plans/2026-11-03-tailwind4-migration-design.md
git add docs/plans/2026-11-03-tailwind4-migration-design.md
git commit -m "docs(plans): Tailwind 4 迁移设计方案（待审批）"
```

用 `ask_user_question` 请站长审批方案，附三个选项：批准按方案执行 / 需要修改 / 暂缓。

- [ ] **Step 4: 停止**

未获批准前，不进入 Task 12。

### Task 12-15: Tailwind 4 实施（仅在 Task 11 获批后展开）

**本节为占位结构，不是可执行步骤。** 实施细节必须在 Task 11 的方案获批后，依据获批方案补写，不能预先虚构。

原因：Tailwind 4 的配置写法、插件选择、`@layer` 处理方式都取决于 Step 2 的七个问题如何定案。预先写死步骤会在方案变更后全部作废。

获批后按以下骨架补写 Task 12-15：

- **Task 12**：接入方式切换（依赖 + `postcss.config.mjs` / Vite 配置）+ 两套样式入口改造。验收：`astro build` 成功、产物里有 Tailwind 生成的类。
- **Task 13**：配置迁移（`tailwind.config.cjs` → `@theme`）。验收：颜色/fontFamily/shadow/radius 全部可用，`pnpm check` 通过。
- **Task 14**：`@layer` 语义与 Preflight 差异处理。验收：23 页计算样式指纹 A/B，每处差异归因。
- **Task 15**：文档同步与收口（`styles.md` 的 `@layer` 结论必须改写，这是承重的）。

---

## 第四批：Satori 0.26.0 → 0.63.2（依据最少，先做探索验证）

**为什么最后**：跨 33 个 minor，上游**没有 CHANGELOG**，60 条 release 无一条标注 BREAKING——不是兼容，是**没有书面依据**。依赖栈从 `opentype.js` 换到 `harfbuzzjs`，字体排版可能整体换过。

### Task 16: Satori 探索性验证（决定是否值得排期）

**Files:**

- Create: `output/satori-upgrade/probe/`
- Create: `output/satori-upgrade/probe-report.md`

**Interfaces:**

- Produces: `probe-report.md`，含「能否装上 / 能否渲染 33 张 OG / 差异性质」三项结论

- [ ] **Step 1: 在隔离目录试装，不动主项目**

```bash
cd /d/pages/myblog
mkdir -p output/satori-upgrade/probe
cd output/satori-upgrade/probe
# 造一个最小 package.json
node -e "
const fs=require('fs');
fs.writeFileSync('package.json', JSON.stringify({
  name:'satori-probe', private:true, type:'module',
  dependencies:{ satori:'0.63.2', sharp:'0.35.5' }
}, null, 2)+'\n');
"
pnpm install --ignore-scripts --store-dir ../../../.pnpm-store --registry https://registry.npmjs.org 2>&1 | tail -6
echo "INSTALL_EXIT=$?"
```

Expected：装上即通过第一关。**若装不上**（原生依赖、Node 版本），记录原因，直接跳到 Step 5 出结论。

- [ ] **Step 2: 用主项目真实的 OG 模板跑一次渲染**

先读主项目的模板结构：

```bash
cd /d/pages/myblog
sed -n '1,80p' 'src/pages/og/[...slug].png.ts'
```

把模板构造逻辑抽成一个可在 probe 里跑的最小脚本 `output/satori-upgrade/probe/render-one.mjs`：它 import probe 里的 satori + 主项目的字体（`public/` 或 `src/` 下的字体文件，先 `grep -rn "fontRegular\|fontBold" 'src/pages/og/[...slug].png.ts'` 找到真实路径），渲染 1 张 1200×630 PNG 并落盘。

```bash
cd /d/pages/myblog/output/satori-upgrade/probe
node render-one.mjs 2>&1 | tail -20
echo "RENDER_EXIT=$?"
```

Expected：生成一张非空 PNG。**若报错**：把完整错误写进 probe-report（这本身就是结论——说明迁移成本高）。

- [ ] **Step 3: 若渲染成功，扩大到全部 33 张**

```bash
cd /d/pages/myblog
ls dist/og/*.png | wc -l
```

用 `output/satori-upgrade/probe/render-all.mjs` 对全部 slug 渲染，与 `dist/og/` 里的现有 PNG 做尺寸与粗略像素比对（记录每张的字节数与平均色差）。

- [ ] **Step 4: 判定**

在 `probe-report.md` 里写三选一结论：

- **可行**：33 张全部渲染成功且视觉可接受 → 值得排期，补写完整实施计划
- **需修改**：渲染成功但需改模板代码 → 列出要改什么，评估工作量
- **不可行/不划算**：装不上或报错无法解决 → 建议保留 0.26.0，写进总计划的冻结理由

- [ ] **Step 5: 清理隔离目录**

```bash
cd /d/pages/myblog
rm -rf output/satori-upgrade/probe/node_modules output/satori-upgrade/probe/pnpm-lock.yaml
```

**主项目的 `package.json` / `pnpm-lock.yaml` 全程未动**——这是本 task 的关键约束。

- [ ] **Step 6: 报告结论并停止**

把 probe-report 的核心结论报告给站长，由站长决定是否继续。

---

## 自检

**1. Spec 覆盖**：评估文档的四项 + 每项的官方破坏性变更都已落到对应 task。KaTeX 的 `strict` 判定 → Task 2 Step 5；Mermaid 的 ELK → Task 8 Step 2；Mermaid 的 Safari 下限 → Task 6；Tailwind 的 `@layer` 承重结论 → Task 11 Step 2 第 4 问；Satori 的无依据 → Task 16。

**2. 占位符扫描**：Task 12-15 明确标注「占位结构，不可执行」，并说明了不能预写的原因——这是**有意的**决策门，不是遗漏。其余 task 每步都有可复制执行的命令或完整代码。

**3. 类型/命名一致性**：全程使用 `output/<批次名>/` 目录；对照器统一 `compare.mjs` / `formula-ab.mjs` / `diagram-ab.mjs`；基线文件 `output/phase5-baseline/noise-floor.json` 由 Task 0 产出、后续 task 引用。

**4. 已知的未决项**（执行时会遇到，已提前标注）：

- Task 7 Step 1 的 `render` 分支代码是**故意不完整的**，Step 2 才解决「如何在浏览器里加载 mermaid」。这是真实工程问题，不假装已解决。
- 每批的实际数字（公式数、图表数、SVG 变化数）会变，报告里必须填实测值，不得沿用本文估算。
