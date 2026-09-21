// 样式指纹 v2：升级前后的逐元素计算样式比对（一次性迁移审计用）
//   node output/style-fp.mjs capture --base http://localhost:4399 --out output/fp-before
//   node output/style-fp.mjs diff --a output/fp-before --b output/fp-after
// 稳定性措施：种子化 Math.random（稿纸逐字符抖动）、DOM 静默等待（异步件）、
// 剪掉 head 与播放器/看板娘子树（布局随时程浮动）。
import { chromium } from "playwright";
import { createHash } from "node:crypto";
import { gzipSync, gunzipSync } from "node:zlib";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const PROPS = [
	"font-family",
	"font-size",
	"font-weight",
	"line-height",
	"letter-spacing",
	"color",
	"background-color",
	"background-image",
	"background-position",
	"background-size",
	"background-repeat",
	"background-origin",
	"background-clip",
	"border-top-width",
	"border-right-width",
	"border-bottom-width",
	"border-left-width",
	"border-top-style",
	"border-bottom-style",
	"border-top-color",
	"border-left-color",
	"border-radius",
	"box-shadow",
	"text-shadow",
	"padding-top",
	"padding-right",
	"padding-bottom",
	"padding-left",
	"margin-top",
	"margin-right",
	"margin-bottom",
	"margin-left",
	"display",
	"position",
	"float",
	"z-index",
	"vertical-align",
	"width",
	"height",
	"min-width",
	"max-width",
	"min-height",
	"text-align",
	"white-space",
	"word-break",
	"overflow-wrap",
	"text-decoration-line",
	"list-style-type",
	"flex-direction",
	"gap",
	"grid-template-columns",
	"object-fit",
	"opacity",
	"transform",
	"filter",
	"overflow-x",
	"overflow-y",
	"cursor",
];
const PSEUDO_PROPS = [
	"content",
	"display",
	"position",
	"width",
	"height",
	"font-family",
	"font-size",
	"color",
	"background-color",
	"background-image",
	"border-top-width",
	"border-top-style",
	"border-top-color",
	"border-radius",
	"transform",
	"inset",
];
// 播放器 / 看板娘 / 轮播 / 微言轮播：布局与时序相关，纳入会产生假阳性
// giscus 的 iframe 由远端 postMessage 改 class 与高度，同一份代码两次采集也会不一致
// 轮播真实类名是 .carousel（Slideshow.astro:23），原先写的 .slideshow 全站零命中、从未真的排除过；
// 它会自动换帧（两次采集间隔内当前帧就会不同），不排就会每次比对多出十来条帧差异。
// 指示点几何改由 ui 冒烟断言，不靠这里
const WIDGET_ROOTS =
	"[class*='myhk'], [class*='music'], [class*='pio'], .pio, #pio, .carousel, " +
	"#header .text, .bg-image, [id^='live2'], .hide, .tag3d-stage svg, .toast, .toast *, " +
	"iframe.giscus-frame";
const FREEZE =
	"*, *::before, *::after { transition: none !important; animation: none !important; " +
	"caret-color: transparent !important; scroll-behavior: auto !important; }";
// 种子 PRNG：让 initPaperHandwriting 的逐字符随机变换在每次采集时完全一致
const SEED = `(() => {
	let s = 0x2f6e2b1;
	Math.random = () => {
		s |= 0; s = (s + 0x6d2b79f5) | 0;
		let t = Math.imul(s ^ (s >>> 15), 1 | s);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
})();`;

const PAGES = [
	"/",
	"/posts/20260919135000/",
	"/posts/20260831000000/",
	"/posts/20220514182600/",
	"/about/",
	"/guestbook/",
	"/albums/",
	"/albums/%E6%97%A5%E5%B8%B8%E9%9A%8F%E6%89%8B%E6%8B%8D/",
	"/images/",
	"/archive/",
	"/tag/",
	"/category/",
	"/hot/",
	"/friends/",
	"/skills/",
	"/timeline/",
	"/projects/",
	"/diary/",
	"/search/",
	"/books/",
	"/books/archive/",
	"/books/01/",
	"/ai-news/",
	"/this-page-should-404/",
];

function arg(name, fallback) {
	const i = process.argv.indexOf(`--${name}`);
	return i > -1 ? process.argv[i + 1] : fallback;
}

async function capture() {
	const base = arg("base", "http://localhost:4399");
	const out = arg("out", "output/fp");
	mkdirSync(out, { recursive: true });
	const browser = await chromium.launch();
	const ctx = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 1,
	});
	await ctx.addInitScript(SEED);
	const index = { base, generated: new Date().toISOString(), pages: [] };
	for (const path of PAGES) {
		const page = await ctx.newPage();
		const errors = [];
		page.on(
			"console",
			(m) => m.type() === "error" && errors.push(m.text().slice(0, 160)),
		);
		page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
		try {
			await page.goto(base + path, {
				waitUntil: "networkidle",
				timeout: 45000,
			});
		} catch {
			try {
				await page.goto(base + path, {
					waitUntil: "domcontentloaded",
					timeout: 20000,
				});
			} catch {}
		}
		await page.evaluate(async () => {
			try {
				await document.fonts.ready;
			} catch {}
		});
		// 等 DOM 静默 600ms（上限 12s），消掉 mermaid / 异步注入带来的抖动
		await page.evaluate(async () => {
			const quiet = 600;
			const deadline = Date.now() + 12000;
			let last = performance.now();
			const mo = new MutationObserver(() => {
				last = performance.now();
			});
			mo.observe(document.documentElement, {
				childList: true,
				subtree: true,
				attributes: true,
				characterData: true,
			});
			while (Date.now() < deadline) {
				await new Promise((r) => setTimeout(r, 120));
				if (performance.now() - last > quiet) break;
			}
			mo.disconnect();
		});
		await page.addStyleTag({ content: FREEZE });
		await page.waitForTimeout(200);
		const lines = await page.evaluate(
			([props, pseudoProps, widgetRoots]) => {
				const pathOf = (el) => {
					const parts = [];
					let n = el;
					while (n && n.nodeType === 1 && n.tagName !== "HTML") {
						let i = 1;
						for (
							let s = n.previousElementSibling;
							s;
							s = s.previousElementSibling
						)
							i++;
						parts.unshift(`${n.tagName.toLowerCase()}:${i}`);
						n = n.parentElement;
					}
					return parts.join(">");
				};
				const pick = (cs, list) =>
					list.map((p) => `${p}=${cs.getPropertyValue(p)}`).join(";");
				// 数值粗化到 0.5px，吸收字体度量的末位噪声
				const round = (v) => {
					const n = Number.parseFloat(v);
					return Number.isFinite(n)
						? `${Math.round(n * 2) / 2}px`
						: v;
				};
				const noisy = new Set([
					"width",
					"height",
					"min-width",
					"max-width",
					"min-height",
					"padding-top",
					"padding-right",
					"padding-bottom",
					"padding-left",
					"margin-top",
					"margin-right",
					"margin-bottom",
					"margin-left",
					"gap",
				]);
				const pickR = (cs, list) =>
					list
						.map((p) => {
							const v = cs.getPropertyValue(p);
							return `${p}=${noisy.has(p) ? round(v) : v}`;
						})
						.join(";");
				// mermaid 等库给元素与 url(#) 引用随机命名，归一化后才可比
				const norm = (s) => s.replace(/\(#[^)]+\)/g, "(#ref)");
				const skip = new Set();
				for (const w of document.querySelectorAll(widgetRoots)) {
					skip.add(w);
					for (const d of w.querySelectorAll("*")) skip.add(d);
				}
				for (const h of document.querySelectorAll("head, head *"))
					skip.add(h);
				const out = [];
				for (const el of Array.from(document.querySelectorAll("*"))) {
					if (skip.has(el)) continue;
					const cls =
						typeof el.className === "string"
							? el.className.trim().replace(/\s+/g, ".")
							: "";
					const rid =
						el.id && !/^mermaid/i.test(el.id) ? "#" + el.id : "";
					const head =
						el.tagName.toLowerCase() + rid + (cls ? "." + cls : "");
					const seg = [
						head,
						pathOf(el),
						norm(pickR(getComputedStyle(el), props)),
					];
					for (const pe of ["::before", "::after"]) {
						const ps = getComputedStyle(el, pe);
						if (ps.getPropertyValue("content") === "none") continue;
						seg.push(norm(pe + ";" + pickR(ps, pseudoProps)));
					}
					out.push(seg.join(" | "));
				}
				return out;
			},
			[PROPS, PSEUDO_PROPS, WIDGET_ROOTS],
		);
		const body = lines.join("\n");
		const sha = createHash("sha256")
			.update(body)
			.digest("hex")
			.slice(0, 16);
		const slug =
			path.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "") || "root";
		writeFileSync(
			join(out, `${slug}.txt.gz`),
			gzipSync(Buffer.from(body, "utf8")),
		);
		index.pages.push({
			path,
			slug,
			elements: lines.length,
			sha,
			errors: errors.slice(0, 4),
		});
		console.log(
			`captured ${path}  elements=${lines.length}  sha=${sha}` +
				(errors.length ? `  consoleErrors=${errors.length}` : ""),
		);
		await page.close();
	}
	await browser.close();
	writeFileSync(join(out, "index.json"), JSON.stringify(index, null, 2));
	console.log("\nwrote", join(out, "index.json"));
}

function load(out) {
	const index = JSON.parse(readFileSync(join(out, "index.json"), "utf8"));
	// 指纹里的 url() 带绝对地址（含端口与域名），换宿主预览会造成全量假阳性；比对时归一化掉。
	// swup 在切换瞬间给 html/body 挂的类名同理（采集时机不同就会出现"local-only/body.transition-swup-*"）。
	// 明月浩空播放器是远端第三方件，其提示/歌词底色与歌单高度随远端响应变化，不属本站样式，剔除。
	const strip = (l) =>
		l
			.replace(/https?:\/\/(localhost:\d+|caiyan12\.github\.io)\//g, "/")
			.replace(/\bhtml\.swup-enabled\b/g, "html")
			.replace(/body\.transition-swup-[a-z-]+/g, "body")
			.replace(/\s?(is-changing|to-page-load|removing|leaving)/g, "");
	for (const p of index.pages) {
		p.lines = gunzipSync(readFileSync(join(out, `${p.slug}.txt.gz`)))
			.toString("utf8")
			.split("\n")
			.filter(
				(l) =>
					!/#?myhk|musicbottom|musicheader/i.test(
						l.split(" | ")[0] || "",
					),
			)
			.map(strip);
		// 用归一化后的内容重算摘要，避免"仅端口不同"被判成整页差异
		p.sha = createHash("sha256")
			.update(p.lines.join("\n"))
			.digest("hex")
			.slice(0, 16);
	}
	return index;
}

function diff() {
	const a = load(arg("a", "output/fp-before"));
	const b = load(arg("b", "output/fp-after"));
	const mapB = new Map(b.pages.map((p) => [p.path, p]));
	let totalDiff = 0;
	let pagesDiff = 0;
	const orderOnly = [];
	const verbose = process.argv.includes("--verbose");
	for (const pa of a.pages) {
		const pb = mapB.get(pa.path);
		if (!pb) {
			console.log(`MISSING PAGE in B: ${pa.path}`);
			totalDiff++;
			continue;
		}
		if (pa.sha === pb.sha) {
			console.log(`same  ${pa.path}  (${pa.elements} elements)`);
			continue;
		}
		// 顺序无关比对：去掉"位置"这一段，只比 (元素标识 + 样式) 这个多重集合。
		// 并列名次的标签/分类重排会换位置但不会换样式，此处即可判定为无样式差异。
		// 再放宽一档：忽略 background-color —— #blogtags 的六色轮换按 nth-child 上色，
		// 药丸换个位置就换个颜色，属位置派生而非样式规则变化。
		const bag = (ls, dropBg) =>
			ls
				.map((l) => {
					const s = l.split(" | ");
					s.splice(1, 1);
					let k = s.join(" | ");
					if (dropBg) k = k.replace(/background-color=[^;]+;?/g, "");
					return k;
				})
				.sort()
				.join("\n");
		if (bag(pa.lines) === bag(pb.lines)) {
			orderOnly.push(pa.path);
			console.log(
				`reorder-only  ${pa.path}  (${pa.elements} elements; every style identical, only positions swapped)`,
			);
			continue;
		}
		if (bag(pa.lines, true) === bag(pb.lines, true)) {
			orderOnly.push(pa.path + " (color-by-position)");
			console.log(
				`reorder-only  ${pa.path}  (${pa.elements} elements; differs only in nth-child pill colour)`,
			);
			continue;
		}
		pagesDiff++;
		const key = (l) => l.split(" | ")[1] || l;
		const setA = new Map(),
			setB = new Map();
		for (const l of pa.lines) setA.set(key(l), l);
		for (const l of pb.lines) setB.set(key(l), l);
		const diffs = [];
		for (const [k, v] of setA) {
			const w = setB.get(k);
			if (w === undefined) diffs.push(["REMOVED", v]);
			else if (w !== v) diffs.push(["CHANGED", v, w]);
		}
		for (const [k, v] of setB) if (!setA.has(k)) diffs.push(["ADDED", v]);
		totalDiff += diffs.length;
		console.log(
			`\nDIFF  ${pa.path}  ${pa.elements} -> ${pb.elements} elements, ${diffs.length} changed`,
		);
		for (const d of diffs.slice(0, verbose ? 40 : 8)) {
			if (d[0] === "CHANGED") {
				const x = d[1].split(" | "),
					y = d[2].split(" | ");
				const changed = [];
				for (let i = 2; i < Math.max(x.length, y.length); i++) {
					if (x[i] !== y[i]) {
						const xs = (x[i] || "").split(";"),
							ys = (y[i] || "").split(";");
						for (
							let j = 0;
							j < Math.max(xs.length, ys.length);
							j++
						) {
							if (xs[j] !== ys[j])
								changed.push(
									`      ${xs[j]}\n   -> ${ys[j] ?? "(absent)"}`,
								);
						}
					}
				}
				console.log(
					`   ${x[1] || "?"}\n` +
						(changed.join("\n") || "      (segment change)").slice(
							0,
							700,
						),
				);
			} else {
				console.log(`   ${d[0]} ${d[1].slice(0, 160)}`);
			}
		}
		if (diffs.length > (verbose ? 40 : 8))
			console.log(`   ... ${diffs.length - 8} more`);
	}
	console.log(
		`\n=== pages differing: ${pagesDiff}/${a.pages.length}, element diffs: ${totalDiff} ===`,
	);
	process.exit(totalDiff === 0 && pagesDiff === 0 ? 0 : 1);
}

if (process.argv[2] === "capture") await capture();
else if (process.argv[2] === "diff") diff();
else
	console.log(
		"usage: style-fp.mjs capture|diff [--base url] [--out dir] [--a dir] [--b dir]",
	);
