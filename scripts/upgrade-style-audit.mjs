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
import { join } from "node:path";
import { AUDIT_PAGES } from "./lib/smoke-pages.mjs";
import {
	ARTIFACT_STATUS,
	compareCoverage,
	createCapture,
	readArtifact,
} from "./lib/style-audit-artifact.mjs";
import {
	diffElementLines,
	judgePropertyDiff,
} from "./lib/style-diff-visibility.mjs";
import { compareColors } from "./lib/style-color-equivalence.mjs";
import { stripNonRenderingLines } from "./lib/style-nonrendering.mjs";

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
	// transform 族必须四个都采：Tailwind v4 的 `translate-y-*` / `rotate-*` / `scale-*`
	// 落的是三个独立属性，计算后的 `transform` 恒为 `none`。只采 transform 时，
	// `hover:-translate-y-px` 这类位移在指纹里完全不可见（2026-11-04 实测 /books/ 的
	// nb-shuffle：hover 态 translate 从 none 变 `0px -1px`，而 transform 始终是 none）。
	// diff 侧已把四者当同一「有效变换矩阵」判定（TRANSFORM_FAMILY），不会重复计数。
	"transform",
	"translate",
	"rotate",
	"scale",
	"inset",
];
// 状态采样：Tailwind v4 迁移里，:focus-visible 与 :hover 下的样式从未进过指纹，
// books.css 的焦点环回归（层归属变化压过 rounded/outline-none 工具类）是人眼看出来的，
// 本工具全程没报警。这里补上两类状态采样。
//
// 强制状态用 CDP 的 CSS.forcePseudoState，不用 page.hover()/.focus()：
//   ① hover() 会先 scrollIntoViewIfNeeded()，在 overflow 容器里会改动 scrollLeft，
//      制造「测试自己造成的位移」（docs/agents/commands.md 记过这条）；
//   ② .focus() 是否命中 :focus-visible 取决于触发方式（键盘 vs 鼠标），不可靠；
//      CSS.forcePseudoState 直接强制伪类，已实测对 :focus-visible 有效。
// 采样集合有界：只对可交互元素，且每页上限 STATE_MAX。
const STATE_SELECTORS = [
	"a[href]",
	"button",
	"input:not([type=hidden])",
	"select",
	"textarea",
	"[tabindex]",
	'[role="button"]',
	'[role="link"]',
].join(",");
// 只采这些属性：状态变化主要体现在描边、颜色、光标与盒模型
// transform 族四个都必须在：Tailwind v4 把位移/旋转/缩放拆成独立属性，
// 计算后的 `transform` 恒为 `none`（实测：nb-shuffle 的 hover:-translate-y-px 体现在
// `translate: 0px -1px`，transform 不动）。站内所有 :active 规则改的正是这些
// （`.gift-fab-btn:active` 的 scale(0.94)、`.nb-archive-action:active` 的
// translateY(1px) scale(0.98)、`open-nav:active` 的 scale(0.94)），
// Tailwind 的 `active:translate-y-0` / `disabled:translate-y-0` 同理。
const STATE_PROPS = [
	"color",
	"background-color",
	"outline-style",
	"outline-width",
	"outline-color",
	"outline-offset",
	"border-top-width",
	"border-top-style",
	"border-top-color",
	"border-radius",
	"box-shadow",
	"transform",
	"translate",
	"rotate",
	"scale",
	"text-decoration-line",
	"cursor",
	"opacity",
];
// 每页最多强制多少个元素的伪类。整站可交互元素上千，全量强制既慢又无意义；
// 取前 N 个足以覆盖导航、按钮、分页、表单等主要交互面。
const STATE_MAX = 60;
// 伪类 → 交给 CSS.forcePseudoState 的状态列表（顺序即采样顺序，决定状态行在文件里的先后）。
// :focus-visible 必须连 :focus 一起强制：浏览器只在「键盘触发」时匹配前者，单独强制不生效。
//
// 纳不纳入的判断依据（2026-11-04 实测，探针 output/eng-discipline-2/probe-force-states.mjs）：
//   · :active   —— 强制有效（实测色值改变），且站内有真实规则（gift-fab / open-nav /
//                  site-modal__close / nb-archive-action），纳入。
//   · :disabled —— 强制有效（实测在「已启用」按钮上强制后 cursor=not-allowed、opacity=0.5），
//                  且站内有真实消费（src/pages/books/index.astro:22 的 nb-shuffle 按钮带
//                  disabled:translate-y-0 / disabled:cursor-wait / disabled:opacity-60），纳入。
//                  这类 utility 静默失效过（v4 迁移时 disabled: 变体不出 CSS），是具体补这个缺口的原因。
//   · :checked  —— 强制有效，但全站零 `:checked` 规则、零 checkbox/radio 元素（只有 range 输入，
//                  其 thumb 伪元素的规则靠元素自身 computed style 采不到），纳入只产出与默认态
//                  逐字节相同的噪声行，故不纳入。日后加勾选控件再补。
//   · :visited  —— 强制无效（实测颜色未变）。Chrome 的 visited 样式受隐私限制，只在真实历史命中时
//                  生效，强制出来永远等于默认态 —— 那是假阴性，不是覆盖。永久排除。
const STATE_PSEUDOS = {
	hover: ["hover"],
	"focus-visible": ["focus", "focus-visible"],
	active: ["active"],
	disabled: ["disabled"],
};
// 播放器 / 看板娘 / 轮播 / 微言轮播：布局与时序相关，纳入会产生假阳性
// giscus 的 iframe 由远端 postMessage 改 class 与高度，同一份代码两次采集也会不一致
// 轮播真实类名是 .carousel（Slideshow.astro:23），原先写的 .slideshow 全站零命中、从未真的排除过；
// 它会自动换帧（两次采集间隔内当前帧就会不同），不排就会每次比对多出十来条帧差异。
// 指示点几何改由 ui 冒烟断言，不靠这里
//
// 明月浩空播放器必须按 **id** 排，不能只按 class：它的容器是 `#myhk`、`#myhkplayer`、
// `#myhkTips`、`#myhkKsc`、`#myhkLrc`、`#myhkaudio`（直接挂在 body 下），**没有 class**，
// 只有内部 `li` 才带 `myhkLrc0` 这类类名。只用 `[class*='myhk']` 时容器本身留在指纹里，
// 而它们的存在与内容取决于远端服务：2026-11-05 变异采集那次该页出现 `ERR_TIMED_OUT`，
// `div#myhkLrc` 整个没生成（元素数 1318 → 1316），凭空多出一条 REMOVED 假阳性。
const WIDGET_ROOTS =
	"[class*='myhk'], [class*='music'], [class*='pio'], .pio, #pio, .carousel, " +
	"[id^='myhk'], #header .text, .bg-image, [id^='live2'], .hide, .tag3d-stage svg, " +
	".toast, .toast *, iframe.giscus-frame";
const FREEZE =
	"*, *::before, *::after { transition: none !important; animation: none !important; " +
	"caret-color: transparent !important; scroll-behavior: auto !important; }";
// 种子 PRNG：让随机件在每次采集时完全一致。
// 两处随机源都必须盖住，缺一个就不确定：
//   ① Math.random —— initPaperHandwriting 的逐字符随机变换；
//   ② crypto.getRandomValues —— quote-band 的选句（src/utils/runtime/quote-band.ts 的
//      randomIndex；作者用 CSPRNG 是为了消掉安全扫描对 Math.random 的误报）。
// 2026-11-05 实测：只种子化 Math.random 时，/albums/ 连开三次拿到三句不同引言
// （逐字节点 28 / 20 / 51），两次采集的整份指纹因此对不上；把 getRandomValues 也固定后
// 三次完全一致。见 output/eng-discipline-2/probe-quote-band-determinism.mjs。
const SEED = `(() => {
	let s = 0x2f6e2b1;
	Math.random = () => {
		s |= 0; s = (s + 0x6d2b79f5) | 0;
		let t = Math.imul(s ^ (s >>> 15), 1 | s);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
	let c = 0x9e3779b9;
	crypto.getRandomValues = (arr) => {
		for (let i = 0; i < arr.length; i++) {
			c = (Math.imul(c, 1664525) + 1013904223) >>> 0;
			arr[i] = c;
		}
		return arr;
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
	// artifact 的格式、版本与完整性由 scripts/lib/style-audit-artifact.mjs 统一声明。
	// 状态清单只在这里定义一次（STATE_PSEUDOS 的键序即状态行的先后），artifact 不自带一份。
	const states = Object.keys(STATE_PSEUDOS);
	// expectedPages 用审计页清单：少采一页也算不完整，不能靠「两侧都没采」蒙过去。
	const artifact = createCapture({
		dir: out,
		base,
		states,
		expectedPages: PAGES,
	});
	const browser = await chromium.launch();
	const ctx = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 1,
	});
	await ctx.addInitScript(SEED);
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
		// ---- 状态采样：:hover / :focus-visible ----
		// CDP 的 CSS.forcePseudoState 直接强制伪类，不走 page.hover()/.focus()，
		// 原因见 STATE_SELECTORS 上方注释。
		// 失败不再「降级为没有状态行」：那会让产物与完整采集长得一样，diff 无从分辨。
		// 现在的口径是记下 stateError 与目标/定位计数，artifact 标 incomplete，进程非零。
		const stateLines = [];
		let targets = 0;
		let located = 0;
		let stateError = null;
		try {
			const cdp = await page.context().newCDPSession(page);
			await cdp.send("DOM.enable");
			await cdp.send("CSS.enable");
			const { root } = await cdp.send("DOM.getDocument", { depth: -1 });
			// 给可见可交互元素打临时标记，用标记做 CDP 定位。状态采样发生在静态
			// 采集之后，标记不会污染已产出的指纹。
			const targetList = await page.evaluate(
				([selectors, max, widgetRoots]) => {
					const skip = new Set();
					for (const w of document.querySelectorAll(widgetRoots)) {
						skip.add(w);
						for (const d of w.querySelectorAll("*")) skip.add(d);
					}
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
					const out = [];
					for (const el of Array.from(
						document.querySelectorAll(selectors),
					)) {
						if (skip.has(el)) continue;
						const r = el.getBoundingClientRect();
						if (r.width <= 0 || r.height <= 0) continue;
						if (out.length >= max) break;
						const idx = out.length;
						const cls =
							typeof el.className === "string"
								? el.className.trim().replace(/\s+/g, ".")
								: "";
						const rid = el.id ? "#" + el.id : "";
						el.setAttribute("data-fp-state", String(idx));
						out.push({
							marker: `[data-fp-state="${idx}"]`,
							head:
								el.tagName.toLowerCase() +
								rid +
								(cls ? "." + cls : ""),
							path: pathOf(el),
						});
					}
					return out;
				},
				[STATE_SELECTORS, STATE_MAX, WIDGET_ROOTS],
			);
			targets = targetList.length;
			for (const t of targetList) {
				const { nodeId } = await cdp.send("DOM.querySelector", {
					nodeId: root.nodeId,
					selector: t.marker,
				});
				if (!nodeId) continue;
				located++;
				for (const [pseudo, forcedPseudoClasses] of Object.entries(
					STATE_PSEUDOS,
				)) {
					await cdp.send("CSS.forcePseudoState", {
						nodeId: nodeId,
						forcedPseudoClasses: forcedPseudoClasses,
					});
					const vals = await page.evaluate(
						([marker, propList]) => {
							const el = document.querySelector(marker);
							if (!el) return null;
							const cs = getComputedStyle(el);
							return propList
								.map((p) => `${p}=${cs.getPropertyValue(p)}`)
								.join(";");
						},
						[t.marker, STATE_PROPS],
					);
					await cdp.send("CSS.forcePseudoState", {
						nodeId: nodeId,
						forcedPseudoClasses: [],
					});
					if (vals) {
						stateLines.push(
							`:${pseudo} ${t.head} | ${t.path} | ${vals}`,
						);
					}
				}
			}
			await page.evaluate(() => {
				for (const el of document.querySelectorAll("[data-fp-state]"))
					el.removeAttribute("data-fp-state");
			});
			await cdp.detach();
		} catch (error) {
			stateError = String(error?.message ?? error).slice(0, 160);
		}
		lines.push(...stateLines);
		const record = artifact.addPage({
			path,
			lines,
			errors,
			coverage: { targets, located, stateError },
		});
		console.log(
			`captured ${path}  elements=${record.elements}  sha=${record.sha}` +
				(errors.length ? `  consoleErrors=${errors.length}` : ""),
		);
		await page.close();
	}
	await browser.close();
	const result = artifact.finish();
	if (!result.complete) {
		console.error(
			`\nartifact 不完整（${result.problems.length} 条问题）：`,
		);
		for (const message of result.problems) console.error(`  - ${message}`);
		console.error(
			"  → 这份 artifact 不能用于 diff；修好采集后重新 capture。",
		);
		process.exitCode = 1;
	}
	console.log("\nwrote", join(out, "index.json"));
}

function load(out, states) {
	const result = readArtifact(out, {
		expectedStates: states,
		expectedPages: PAGES,
	});
	// 无论完整与否都返回同一个形状（status / problems / index / pages），
	// 避免 caller 从「有没有 status 字段」反推结果。
	if (result.status !== ARTIFACT_STATUS.complete) return result;
	result.index.pages = result.pages;
	const index = result.index;
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
		const kept = p.lines.filter(
			(l) =>
				!/#?myhk|musicbottom|musicheader/i.test(
					l.split(" | ")[0] || "",
				),
		);
		// 不渲染元素（script/style/link/meta/noscript/template）不生成盒子，增删不改变可见结果；
		// 更麻烦的是比对键含「全部兄弟元素序号」——删一个 body 级 `<script>` 会让它之后所有元素
		// 的序号整体前移，产出成百条 REMOVED/ADDED。实测：把四个页面级功能的内联脚本迁进共享
		// chunk，真实差异只有 18 个 `<script>`，diff 却报 12/23 页、2365 条。
		// 剔除后仍由「渲染元素逐条比对」把关：删一个真正占位的元素、改一处计算样式，照样红。
		// 采集端不动，artifact 里仍保留全部行（完整性校验与 elements 计数用的是采集时的值）。
		const { lines, dropped } = stripNonRenderingLines(kept);
		p.lines = lines.map(strip);
		p.nonRenderingDropped = dropped;
		// 用归一化后的内容重算摘要，避免"仅端口不同"被判成整页差异
		p.sha = createHash("sha256")
			.update(p.lines.join("\n"))
			.digest("hex")
			.slice(0, 16);
	}
	return result;
}

function diff() {
	const states = Object.keys(STATE_PSEUDOS);
	const aPath = arg("a", "output/fp-before");
	const bPath = arg("b", "output/fp-after");
	const a = load(aPath, states);
	const b = load(bPath, states);
	// 先验 artifact，再比样式。任一不完整、版本不符、页集合不一致或四态覆盖不对称，
	// 都直接非零退出——「没采到」与「没变化」在输出上必须长得不一样。
	const rejected = [
		["A", aPath, a],
		["B", bPath, b],
	];
	let blocked = false;
	for (const [label, dir, result] of rejected) {
		if (result.status === ARTIFACT_STATUS.complete) continue;
		blocked = true;
		console.error(`\n${label} 侧 artifact ${result.status}：${dir}`);
		for (const message of result.problems) console.error(`  - ${message}`);
	}
	if (blocked) {
		console.error(
			"\n两份 artifact 都必须完整采集才能比样式。请重新 capture 后再 diff。",
		);
		process.exit(1);
	}
	const coverage = compareCoverage(a, b);
	if (!coverage.ok) {
		console.error(
			`\n两份 artifact 的覆盖不对称（${coverage.problems.length} 条）：`,
		);
		const shown = coverage.problems.slice(0, 40);
		for (const message of shown) console.error(`  - ${message}`);
		if (coverage.problems.length > shown.length)
			console.error(
				`  ... 另有 ${coverage.problems.length - shown.length} 条`,
			);
		console.error(
			"\n覆盖不对称说明两次采集看到的输入不同，样式差异无法归因；先重新 capture。",
		);
		process.exit(1);
	}
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
		// 键 = 状态前缀 + 元素位置路径。不能用 `|| l` 兜底：html 元素的位置路径是空串
		// （pathOf 停在 HTML 之前），兜底会把整行当键，于是 html 的样式一变就被
		// 记成「REMOVED + ADDED」两条而不是一条 CHANGED——凭空多出两条差异。
		//
		// 状态前缀是必需的，不是修饰：状态行的格式是 `:hover <标识> | <位置路径> | <属性…>`，
		// 位置路径与静态行完全相同。只用路径做键时同元素的多行会互相覆盖（Map 后写覆盖前写）
		// ——2026-11-04 用真实采集实测：首页 971 行按路径去重只剩 851 条，120 条状态行全部丢失，
		// 同时 60 条静态行被替换成该元素最后一条状态行。所以加状态之前必须先修这里，
		// 否则新增的状态只是把「覆盖」做得更彻底，采了等于没采。
		const key = (l) => {
			const s = l.split(" | ");
			const st = /^(:[a-z-]+)\s/.exec(s[0]);
			return (st ? st[1] : "-") + "|" + (s[1] ?? "");
		};
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
	const droppedA = a.pages.reduce(
		(sum, p) => sum + (p.nonRenderingDropped ?? 0),
		0,
	);
	const droppedB = b.pages.reduce(
		(sum, p) => sum + (p.nonRenderingDropped ?? 0),
		0,
	);
	if (droppedA || droppedB) {
		console.log(
			`\n注：比对时剔除不渲染元素 ${droppedA}/${droppedB} 条（A/B；script/style/link/meta/noscript/template）。` +
				`它们不生成盒子，增删不改变可见结果；采集产物里仍保留这些行。`,
		);
	}
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
