// 断言构建产物的 KaTeX 内部类名版本与运行期 CSS 一致。
//
// 为什么需要这条判据（2026-11-03 实测教训）：KaTeX 0.18.0 给 20 个内部 CSS 类加了
// `katex-` 前缀（KaTeX/KaTeX#4229）。当 `rehype-katex` 的 katex 依赖（嵌套副本）
// 与根包版本不一致时，构建期 HTML 由旧版生成、输出旧类名（`base` / `strut`），
// 而运行期 CSS 来自根包、选择新类名（`katex-base` / `katex-strut`），样式对不上。
// 这种错配**三项常规判据全部抓不到**：公式渲染成功数、字体族齐全、`.katex` 盒子
// 宽高 > 0 在错配下都正常，只有几何尺寸与像素比对能看出来（实测 40 个公式样本
// 有 20 个尺寸改变、页面 2139→2269px、5.02% 像素不同）。
//
// 原有防线只是文档里一句话（「验收必须加一条判据」），靠人记得。本脚本把它变成
// 可执行判据，接在 `pnpm build` 里，本地与 CI 同一条链。
//
// 用法：node scripts/verify-katex-classes.mjs [distDir]
// 退出码：0 通过；1 失败（错配、或根本没有任何公式——见下）。
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const distDirectory = resolve(process.argv[2] ?? "dist");

const OLD_CLASSES = ["base", "strut"]; // 0.18.0 之前的无前缀类名
const NEW_CLASSES = ["katex-base", "katex-strut"]; // 0.18.0 起的带前缀类名

// 逐元素的 class 属性精确匹配（含多类名的属性里按空格切分）。
// 不用 `\bbase\b` 这类词边界——`katex-base`、`skills-donut-segment-base`、
// `text-base` 都会命中，制造假阳性（2026-11-03 实测：全站 230 个 HTML 里
// `class="base"` 与 `class="strut"` 精确计数均为 0，而模糊匹配会给出非零）。
function collectHtmlFiles(directory) {
	const found = [];
	const walk = (current) => {
		for (const entry of readdirSync(current, { withFileTypes: true })) {
			const full = join(current, entry.name);
			if (entry.isDirectory()) walk(full);
			else if (entry.name.endsWith(".html")) found.push(full);
		}
	};
	walk(directory);
	return found;
}

if (!statSync(distDirectory, { throwIfNoEntry: false })) {
	console.error(
		`KaTeX 类名校验无法执行：找不到构建产物目录 ${distDirectory}。先跑 astro build。`,
	);
	process.exit(1);
}

const htmlFiles = collectHtmlFiles(distDirectory);
if (htmlFiles.length === 0) {
	console.error(
		`KaTeX 类名校验无法执行：${distDirectory} 里没有 HTML 文件。`,
	);
	process.exit(1);
}

const counts = Object.fromEntries(
	[...OLD_CLASSES, ...NEW_CLASSES].map((name) => [name, 0]),
);

for (const file of htmlFiles) {
	const html = readFileSync(file, "utf8");
	for (const attribute of html.matchAll(/class="([^"]*)"/g)) {
		for (const token of attribute[1].split(/\s+/)) {
			if (token in counts) counts[token] += 1;
		}
	}
}

const oldTotal = OLD_CLASSES.reduce((sum, name) => sum + counts[name], 0);
const newTotal = NEW_CLASSES.reduce((sum, name) => sum + counts[name], 0);

const failures = [];

// 判据一（负向）：旧类名必须为 0。非零即证明构建用的 katex 是旧版本，
// 与运行期 CSS 错配。
if (oldTotal > 0) {
	failures.push(
		`发现 ${oldTotal} 处旧版 KaTeX 类名（${OLD_CLASSES.map((n) => `${n}=${counts[n]}`).join(", ")}）。` +
			"这说明构建期 HTML 由旧版 katex 生成，与运行期 CSS 选择的新类名不一致——" +
			"查 `pnpm.overrides` 里的 katex 是否仍覆盖 rehype-katex 的嵌套依赖。",
	);
}

// 判据二（正向）：新类名必须非零。两侧都为 0 时判据一会被空转通过，
// 那正是「Markdown 管线坏了、一个公式都没渲染」的形态，必须单独抓住。
if (newTotal === 0) {
	failures.push(
		"产物里没有任何 KaTeX 类名。本站有真实公式（0.19.1 批次实测 298 条），" +
			"全零意味着 Markdown 公式管线没有产出，或 dist 不是本次构建产物。",
	);
}

if (failures.length > 0) {
	console.error("KaTeX 类名校验失败：");
	failures.forEach((line) => console.error(`- ${line}`));
	process.exit(1);
}

console.log(
	`KaTeX 类名校验通过：扫描 ${htmlFiles.length} 个 HTML，` +
		`旧类名 0 处，新类名 ${newTotal} 处（${NEW_CLASSES.map((n) => `${n}=${counts[n]}`).join(", ")}）。`,
);
