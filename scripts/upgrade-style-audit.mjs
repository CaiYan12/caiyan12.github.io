// 样式指纹 v2：升级前后的逐元素计算样式比对（一次性迁移审计用）
//   node scripts/upgrade-style-audit.mjs capture --base http://localhost:4399 --out output/fp-before
//   node scripts/upgrade-style-audit.mjs diff --a output/fp-before --b output/fp-after
// 稳定性措施：种子化 Math.random（稿纸逐字符抖动）、DOM 静默等待（异步件）、
// 剪掉 head 与播放器/看板娘子树（布局随时程浮动）。
//
// diff 的输出按「可见性」分三类，因为原始差异条目数不等于访客看得见的变化：
//   · 可见（影响渲染）—— 访客真的能看出来的变化，这一类必须逐条看清楚；
//   · 等价色 —— 字面量变了但换算后像素在肉眼不可辨范围内（如 v3 的 #374151 与
//     v4 的 oklch(37.3% .034 259.733) 只差 1 个色阶）；
//   · 不可见 —— 计算样式变了但渲染结果不变（典型：边框宽度为零时的边框颜色变化）。
// 分三类**叠加**在原有明细之上，明细一条不少 —— 分类是为了让人不必自己判断，
// 不是为了把明细替换掉。
import { chromium } from "playwright";
import { createHash } from "node:crypto";
import { gzipSync, gunzipSync } from "node:zlib";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { AUDIT_PAGES } from "./lib/smoke-pages.mjs";
import {
	diffElementLines,
	judgePropertyDiff,
} from "./lib/style-diff-visibility.mjs";
import { compareColors } from "./lib/style-color-equivalence.mjs";

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
	// Tailwind v4 把 translate / rotate / scale 拆成了三个独立属性，
	// 而 rotate-[10deg]、-translate-y-[7px] 用的正是它们。只采 transform 会读成 "none"，
	// 看起来像「变换没了」，实际渲染一模一样（2026-11-04 实测：v3 的
	// matrix(0.984808,...) 与 v4 的 rotate:10deg 渲染矩形逐位相同）。
	// 不采这三个属性就合成不出「有效变换矩阵」，只能把真相同误报成可见回归。
	"translate",
	"rotate",
	"scale",
	// 视觉隐藏：v3 的 sr-only 用 clip，v4 用 clip-path: inset(50%)。
	// 不采这两个就看不出「两版都隐藏、只是隐藏手法不同」。
	"clip",
	"clip-path",
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

// 页面清单统一取自 scripts/lib/smoke-pages.mjs 的 AUDIT_PAGES（23 页）。
// 它 = SHELL_PAGES（13 页带壳真页面）+ AUDIT_EXTRA_PAGES（10 页扩展），
// 后者含 /images/ 与 /this-page-should-404/ 两条无壳边界页——它们只属于本脚本，
// 「恰好一个可见 h1」类判据在上面不成立，故不在 SHELL_PAGES 里。
// /ai-news/ 已迁为独立项目，不在本仓库的样式审计范围内。
const PAGES = AUDIT_PAGES;

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
	// 主机地址必须把「回环地址的各写法」都认掉：同一台机器上 v3 与 v4 用不同端口起服务时，
	// 产物里每条带绝对地址的声明（本站手型光标、背景图）都会变成一条假差异。
	// 只认 localhost:\d+ 时，127.0.0.1:\d+ 形式的采集结果会整片变成假阳性
	// （2026-11-04 实测：一次得到 17028 条元素级差异，其中上万条只是端口号不同）。
	// 主机名与端口**一并**抹掉而不是只抹端口：判据是「同一份产物换端口采集仍逐项一致」，
	// 而两侧分别用 localhost 与 127.0.0.1 时，只抹端口仍会因主机名不同而判成差异。
	// 覆盖范围只限回环地址与本站线上域名——第三方 host（myhkw.cn 等）必须原样保留，
	// 它们的变化不属于「同一份产物的采集差异」。
	const strip = (l) =>
		l
			.replace(
				/https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0)(?::\d+)?\//g,
				"/",
			)
			.replace(/https?:\/\/caiyan12\.github\.io\//g, "/")
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
	// 可见性分类的累计计数。属性级差异是「最小可比单位」：一个元素可能在
	// 颜色、边框颜色、间距上同时有差异，逐元素计数会掩盖「哪一类属性在变」。
	const classes = {
		visible: 0,
		equivalent: 0,
		invisible: 0,
	};
	// 按属性名归类，便于回答「不可见差异都是哪些属性带来的」
	const byProp = new Map();
	const bumpProp = (prop, kind) => {
		if (!byProp.has(prop))
			byProp.set(prop, { visible: 0, equivalent: 0, invisible: 0 });
		byProp.get(prop)[kind]++;
	};
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
		// 键就是元素的位置路径。不能用 `|| l` 兜底：html 元素的位置路径是空串
		// （pathOf 停在 HTML 之前），兜底会把整行当键，于是 html 的样式一变就被
		// 记成「REMOVED + ADDED」两条而不是一条 CHANGED——凭空多出两条差异。
		const key = (l) => l.split(" | ")[1];
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
		// 逐条判可见性。REMOVED / ADDED 是元素级增删：元素要么在要么不在，
		// 渲染上一定看得见（页面上多/少了一个节点），一律算可见差异。
		const perPage = { visible: 0, equivalent: 0, invisible: 0 };
		// 三段清单在判定时直接收集：判定结束后再调一次 diffElementLines 拿到的是
		// 另一批对象，kind/reason 都没挂上去（会全部是 undefined）。
		const visibleItems = [];
		const equivalentItems = [];
		const invisibleItems = [];
		for (const d of diffs) {
			if (d[0] === "CHANGED") {
				const propDiffs = diffElementLines(d[1], d[2]);
				// transform 族整体判一次：同一处语义变化会同时落在
				// transform / translate / rotate / scale 上（v3 写 transform，
				// v4 写独立属性），逐属性判会重复计数。
				const family = propDiffs.filter((pd) =>
					TRANSFORM_FAMILY.has(pd.prop),
				);
				let familyVerdict = null;
				if (family.length) {
					const verdict = judgePropertyDiff(
						"transform",
						family[0].from,
						family[0].to,
						family[0].propsA,
						family[0].propsB,
					);
					familyVerdict = verdict;
				}
				let familyCounted = false;
				for (const pd of propDiffs) {
					let verdict;
					if (TRANSFORM_FAMILY.has(pd.prop)) {
						verdict = familyVerdict;
					} else {
						verdict = judgePropertyDiff(
							pd.prop,
							pd.from,
							pd.to,
							pd.propsA,
							pd.propsB,
						);
					}
					let kind = verdict.visible ? "visible" : "invisible";
					// 等价色：字面量变了但换算后不可辨。它确实参与了渲染，
					// 只是结果落在肉眼阈值内——单列一类，不与「不渲染」混同。
					if (kind === "visible" && isColorProp(pd.prop)) {
						const cmp = compareColors(pd.from, pd.to);
						if (cmp.equivalent) kind = "equivalent";
					}
					// transform 族只计一次：同一处变化落在多个属性上时，
					// 重复计数会让「可见差异条目数」虚高。
					if (TRANSFORM_FAMILY.has(pd.prop)) {
						if (familyCounted) {
							pd.kind = kind;
							pd.reason = verdict.reason;
							continue;
						}
						familyCounted = true;
					}
					classes[kind]++;
					perPage[kind]++;
					bumpProp(pd.prop, kind);
					pd.kind = kind;
					pd.reason = verdict.reason;
					if (kind === "invisible") invisibleItems.push(pd);
					else if (kind === "equivalent") equivalentItems.push(pd);
					else visibleItems.push(pd);
				}
			} else {
				classes.visible++;
				perPage.visible++;
				bumpProp(`(元素增删 ${d[0]})`, "visible");
			}
		}
		console.log(
			`\nDIFF  ${pa.path}  ${pa.elements} -> ${pb.elements} elements, ${diffs.length} changed` +
				`  [可见 ${perPage.visible} / 等价色 ${perPage.equivalent} / 不可见 ${perPage.invisible}]`,
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
		// 可见性归类明细：把「不可见」的条目逐条列出来并给出理由，
		// 读者不必自己判断每一条是否影响渲染。
		// 「可见」的条目在上面已经逐条打过明细，这里只补一句计数与理由，
		// 避免把原有明细冲淡。
		if (visibleItems.length) {
			console.log(`   --- 可见（影响渲染）${visibleItems.length} 条 ---`);
			const shown = visibleItems.slice(0, verbose ? 40 : 8);
			for (const pd of shown)
				console.log(
					`      ${pd.prop}: ${pd.from} -> ${pd.to}   [${pd.reason}]`,
				);
			if (visibleItems.length > shown.length)
				console.log(
					`      ... ${visibleItems.length - shown.length} more`,
				);
		}
		if (invisibleItems.length) {
			console.log(
				`   --- 不可见（不渲染）${invisibleItems.length} 条 ---`,
			);
			const shown = invisibleItems.slice(0, verbose ? 40 : 6);
			for (const pd of shown)
				console.log(
					`      ${pd.prop}: ${pd.from} -> ${pd.to}   [${pd.reason}]`,
				);
			if (invisibleItems.length > shown.length)
				console.log(
					`      ... ${invisibleItems.length - shown.length} more`,
				);
		}
		if (equivalentItems.length) {
			console.log(
				`   --- 等价色（像素不可辨）${equivalentItems.length} 条 ---`,
			);
			const shown = equivalentItems.slice(0, verbose ? 40 : 4);
			for (const pd of shown)
				console.log(
					`      ${pd.prop}: ${pd.from} -> ${pd.to}   [换算后色差在肉眼阈值内]`,
				);
			if (equivalentItems.length > shown.length)
				console.log(
					`      ... ${equivalentItems.length - shown.length} more`,
				);
		}
	}
	// 可见性分类的汇总。放在末尾是因为前面已经逐页打过明细，
	// 这里给的是全量口径——读者最关心「访客看得见的变化到底有多少」。
	console.log(
		`\n=== 可见性分类 ===\n` +
			`  影响渲染（可见）: ${classes.visible}\n` +
			`  等价色（像素不可辨）: ${classes.equivalent}\n` +
			`  不渲染（不可见）: ${classes.invisible}\n`,
	);
	console.log("=== 不可见差异按属性名归类 ===");
	const invisibleProps = [...byProp.entries()]
		.filter(([, c]) => c.invisible > 0)
		.sort((x, y) => y[1].invisible - x[1].invisible);
	if (!invisibleProps.length) console.log("  （无）");
	for (const [prop, c] of invisibleProps)
		console.log(
			`  ${prop}: ${c.invisible}` +
				(c.visible
					? `  (另有 ${c.visible} 条同类属性差异是可见的)`
					: "") +
				(c.equivalent ? `  (另有 ${c.equivalent} 条是等价色)` : ""),
		);
	console.log("=== 可见差异按属性名归类 ===");
	const visibleProps = [...byProp.entries()]
		.filter(([, c]) => c.visible > 0)
		.sort((x, y) => y[1].visible - x[1].visible);
	if (!visibleProps.length) console.log("  （无）");
	for (const [prop, c] of visibleProps)
		console.log(
			`  ${prop}: ${c.visible}` +
				(c.invisible
					? `  (另有 ${c.invisible} 条同类属性差异不渲染)`
					: "") +
				(c.equivalent ? `  (另有 ${c.equivalent} 条是等价色)` : ""),
		);
	console.log(
		`\n=== pages differing: ${pagesDiff}/${a.pages.length}, element diffs: ${totalDiff} ===`,
	);
	process.exit(totalDiff === 0 && pagesDiff === 0 ? 0 : 1);
}

/** 哪些属性是「颜色」——只有它们的两种表示才可能换算成同一像素。 */
function isColorProp(prop) {
	return /(^|-)color$/.test(prop) || prop === "color";
}

// transform 族：CSS Transforms Level 2 把它们拆成四个属性，
// 但对渲染而言它们是同一个「有效变换矩阵」。
const TRANSFORM_FAMILY = new Set(["transform", "translate", "rotate", "scale"]);

if (process.argv[2] === "capture") await capture();
else if (process.argv[2] === "diff") diff();
else
	console.log(
		"usage: node scripts/upgrade-style-audit.mjs capture|diff " +
			"[--base url] [--out dir] [--a dir] [--b dir] [--verbose]\n" +
			"  capture  逐页采集计算样式指纹到 --out 目录（--base 是站点根，不带结尾斜杠）\n" +
			"  diff     比对两份采集结果，输出按可见性分类：可见 / 等价色 / 不可见",
	);
