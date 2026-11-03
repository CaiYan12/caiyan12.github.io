// 线上验证：用平台无关证据确认新部署已生效，并实测关键功能。
//
// 判据选择依据（docs/agents/build-and-deploy.md 已记录的教训）：
//   - JS chunk 内容寻址哈希、Pagefind 索引哈希 **平台相关**，Windows 与 Linux 必然不同，
//     不能用作部署身份证据。
//   - 改用：CSS 资源名（平台无关）、页面可见文本、Svelte 运行时特征串计数、
//     以及本批特有的内容标记（新微言、KaTeX 新类名、Mermaid 钉值效果）。
//
// 用法：pnpm verify:live [baseUrl]
//   默认打生产站；传参可改指 preview 或本地（如 http://localhost:4322）。
//   站点约定：base URL 不带结尾斜杠，脚本内部自己拼 `/`。
// 来源：2026-11-03 从 output/live-verify.mjs 提升入库。原先它落在 gitignore 的
//   output/ 下，下一次会话只能重写；判据本身值钱，脚本不该跟着产物一起蒸发。
import { createRequire } from "node:module";

// 锚在仓库根（本脚本位于 scripts/），不再写死本人的绝对路径。
const req = createRequire(new URL("../package.json", import.meta.url));
const { chromium } = req("playwright");

const BASE = (process.argv[2] ?? "https://caiyan12.github.io").replace(
	/\/$/,
	"",
);
const results = [];

function rec(name, ok, detail) {
	results.push({ name, ok, detail });
	console.log(
		`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  :: " + detail : ""}`,
	);
}

const browser = await chromium.launch({ headless: true });

// ---------- A. 部署身份（平台无关证据） ----------
{
	const ctx = await browser.newContext({
		viewport: { width: 1440, height: 900 },
	});
	const page = await ctx.newPage();
	await page.goto(`${BASE}/`, {
		waitUntil: "domcontentloaded",
		timeout: 60000,
	});

	const id = await page.evaluate(() => {
		const css = [...document.querySelectorAll('link[rel="stylesheet"]')]
			.map((l) => l.getAttribute("href"))
			.filter((h) => h && h.includes("/_astro/"));
		const html = document.documentElement.outerHTML;
		return {
			cssNames: css,
			generator:
				(html.match(/<meta name="generator" content="([^"]+)"/) ||
					[])[1] ?? null,
			// 新微言是否已在首页侧栏
			hasNewDiary: html.includes("网站构建系统迎来全面更新"),
		};
	});
	rec(
		"CSS 资源名可读",
		id.cssNames.length > 0,
		id.cssNames.join(" | ").slice(0, 200),
	);
	rec("generator 存在", !!id.generator, id.generator);
	rec("首页侧栏含新微言", id.hasNewDiary, "2026-11-03 那条");
	await ctx.close();
}

// ---------- B. 新微言渲染 ----------
{
	const ctx = await browser.newContext({
		viewport: { width: 1440, height: 900 },
	});
	const page = await ctx.newPage();
	await page.goto(`${BASE}/diary/`, {
		waitUntil: "domcontentloaded",
		timeout: 60000,
	});
	const d = await page.evaluate(() => {
		const txt = document.body.innerText;
		const idxNew = txt.indexOf("网站构建系统迎来全面更新");
		const idxOld = txt.indexOf("网站的 AI 新闻模块已移植");
		return {
			hasNew: idxNew !== -1,
			hasOld: idxOld !== -1,
			// 新条目必须排在旧条目之前（数组顺序决定展示顺序）
			newBeforeOld: idxNew !== -1 && idxOld !== -1 && idxNew < idxOld,
			hasDate: txt.includes("11月3日"),
			hasTime: txt.includes("15:35"),
			// 补零修正不应改变外观
			hasPaddedRender: txt.includes("10月2日") && txt.includes("08:13"),
		};
	});
	rec("微言页含新条目", d.hasNew);
	rec("新条目排在旧条目之前", d.newBeforeOld);
	rec("日期渲染 11月3日", d.hasDate);
	rec("时间渲染 15:35", d.hasTime);
	rec("补零条目外观未变（10月2日 / 08:13）", d.hasPaddedRender);
	await ctx.close();
}

// ---------- C. KaTeX（第五批）：类名同源 ----------
{
	const ctx = await browser.newContext({
		viewport: { width: 1440, height: 900 },
	});
	const page = await ctx.newPage();
	const errs = [];
	page.on("pageerror", (e) => errs.push(String(e.message).slice(0, 160)));
	await page.goto(`${BASE}/posts/20260320000000/`, {
		waitUntil: "domcontentloaded",
		timeout: 60000,
	});
	await page.evaluate(() => document.fonts.ready);
	await page.waitForTimeout(800);
	const d = await page.evaluate(() => {
		const ks = [...document.querySelectorAll(".katex")];
		const zero = ks.filter((k) => {
			const r = k.getBoundingClientRect();
			return r.width === 0 || r.height === 0;
		}).length;
		return {
			count: ks.length,
			zeroSized: zero,
			mathml: document.querySelectorAll(".katex math").length,
			newClass: document.querySelectorAll(".katex-base").length,
			oldClass: document.querySelectorAll(".base").length,
			oldStrut: document.querySelectorAll(".strut").length,
			errors: document.querySelectorAll(".katex-error").length,
			katexCss: [...document.querySelectorAll('link[rel="stylesheet"]')]
				.map((l) => l.getAttribute("href"))
				.filter((h) => h && h.includes("katex")),
			overflow:
				document.documentElement.scrollWidth -
				document.documentElement.clientWidth,
		};
	});
	rec("KaTeX 公式数 298", d.count === 298, String(d.count));
	rec("零尺寸公式为 0", d.zeroSized === 0, String(d.zeroSized));
	rec("原生 MathML 存在", d.mathml > 0, String(d.mathml));
	rec(
		"新类 .katex-base 非零（CSS 与 HTML 同源）",
		d.newClass > 0,
		String(d.newClass),
	);
	rec("旧类 .base 为 0（无版本错配）", d.oldClass === 0, String(d.oldClass));
	rec("旧类 .strut 为 0", d.oldStrut === 0, String(d.oldStrut));
	rec("无 katex-error", d.errors === 0, String(d.errors));
	rec("公式页零横向溢出", d.overflow <= 1, String(d.overflow));
	rec("公式页零 pageerror", errs.length === 0, errs.slice(0, 2).join("; "));
	console.log("   katex css:", d.katexCss.join(", "));
	await ctx.close();
}

// ---------- D. Mermaid（第六批）：99 图钉值生效 ----------
{
	const ctx = await browser.newContext({
		viewport: { width: 1440, height: 900 },
	});
	const page = await ctx.newPage();
	const errs = [];
	page.on("pageerror", (e) => errs.push(String(e.message).slice(0, 160)));
	await page.goto(`${BASE}/posts/20261002081331/`, {
		waitUntil: "domcontentloaded",
		timeout: 60000,
	});
	let waited = "ok";
	try {
		await page.waitForFunction(
			() => {
				const all = [...document.querySelectorAll("pre.mermaid")];
				return (
					all.length > 0 &&
					all.every((n) => n.dataset.mermaidRendered === "true")
				);
			},
			null,
			{ timeout: 60000 },
		);
	} catch {
		waited = "TIMEOUT";
	}
	const d = await page.evaluate(() => {
		const pres = [...document.querySelectorAll("pre.mermaid")];
		const total = Math.round(
			pres.reduce((s, n) => s + n.getBoundingClientRect().height, 0),
		);
		return {
			blocks: pres.length,
			withSvg: pres.filter((n) => n.querySelector("svg")).length,
			rendered: pres.filter((n) => n.dataset.mermaidRendered === "true")
				.length,
			labels: document.querySelectorAll("pre.mermaid .nodeLabel").length,
			foreignObject: document.querySelectorAll(
				"pre.mermaid foreignObject",
			).length,
			totalHeight: total,
			overflow:
				document.documentElement.scrollWidth -
				document.documentElement.clientWidth,
		};
	});
	rec("Mermaid 块数 14", d.blocks === 14, String(d.blocks));
	rec("14 个都含 svg", d.withSvg === 14, String(d.withSvg));
	rec("14 个都标记已渲染", d.rendered === 14, String(d.rendered));
	rec("节点标签 72", d.labels === 72, String(d.labels));
	rec("foreignObject 131", d.foreignObject === 131, String(d.foreignObject));
	// 恢复后应为 5136；未恢复是 6009。允许少量平台抖动
	rec(
		"图表区总高接近 5136（wrappingWidth 钉值生效）",
		Math.abs(d.totalHeight - 5136) <= 30,
		String(d.totalHeight),
	);
	rec("Mermaid 页零横向溢出", d.overflow <= 1, String(d.overflow));
	rec(
		"Mermaid 页零 pageerror",
		errs.length === 0,
		errs.slice(0, 2).join("; "),
	);
	rec("waitForRendered", waited === "ok", waited);
	await ctx.close();
}

// ---------- E. 移动端 ----------
{
	const ctx = await browser.newContext({
		viewport: { width: 390, height: 900 },
	});
	const page = await ctx.newPage();
	const errs = [];
	page.on("pageerror", (e) => errs.push(String(e.message).slice(0, 160)));
	await page.goto(`${BASE}/posts/20260320000000/`, {
		waitUntil: "domcontentloaded",
		timeout: 60000,
	});
	await page.evaluate(() => document.fonts.ready);
	await page.waitForTimeout(600);
	const d = await page.evaluate(() => ({
		katex: document.querySelectorAll(".katex").length,
		overflow:
			document.documentElement.scrollWidth -
			document.documentElement.clientWidth,
	}));
	rec("移动端公式数 298", d.katex === 298, String(d.katex));
	rec("移动端零横向溢出", d.overflow <= 1, String(d.overflow));
	rec("移动端零 pageerror", errs.length === 0, errs.slice(0, 2).join("; "));
	await ctx.close();
}

await browser.close();

const passed = results.filter((r) => r.ok).length;
console.log(`\n=== 汇总: ${passed}/${results.length} 通过 ===`);
const failed = results.filter((r) => !r.ok);
if (failed.length) {
	console.log("失败项:");
	for (const f of failed) console.log(`  - ${f.name} :: ${f.detail}`);
	process.exitCode = 1;
}
