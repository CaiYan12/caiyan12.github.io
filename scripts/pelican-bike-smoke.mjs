// 鹈鹕骑单车（/pelican-bike/）实机烟测
//
// 前置：pnpm build && pnpm preview --port 4322
// 运行：pnpm smoke:pelican
//      （或 PELICAN_BASE_URL=http://localhost:4321 node scripts/pelican-bike-smoke.mjs）
// 覆盖：就绪信号、两处返回入口、上游署名与 .tools 未被破坏、零外部请求、
//      窄屏几何零回归、Tab 环、真实落地主站、游戏文档零报错。
//
// 台子（check / base 形态回显 / 汇总退出）来自 scripts/lib/smoke-harness.mjs。
// 报错计数是本文件自建的（见 openGame 注释），只多不少：判据 10 要把 pageerror 与
// console.error 分成两条独立判据，台子那个合并汇把两者压进同一个数组就分不开了。
//
// ⚠️ PELICAN_BASE_URL 传的是**站点根**（脚本自己拼 /pelican-bike/），与 FANCY_BASE_URL /
//    UI_SMOKE_BASE_URL 同形；而 NICE_BOOKS_BASE_URL / AI_NEWS_BASE_URL 传的是**完整页面地址**。
//    两种形态混用是这个仓库记过三次的坑，传错的表现是「选择器等不到」的假失败 —— 所以写在这里。
//    默认 4322 对应 `pnpm preview --port 4322`；Astro preview 在 Windows 只绑 `[::1]`，
//    故默认值写 localhost 而不是 127.0.0.1，与 test:fancybox / smoke:ui 同口径。
//
// ⏱ 全脚本没有一个 waitForTimeout（GC-8）。游戏侧有三个可等的真实状态信号：
//      body.ready       —— vendor/pelican-bike/src/main.js 约 1369 行，首帧预热完成后添加
//      body.started     —— 同文件约 1244 行，点「开始骑行」后添加
//      window.__pelican —— 同文件约 1372 行，调试接口；view 是函数即代表世界真的建好了
//    #intro 退场是 0.9s 的 opacity + visibility 过渡，开场之后的判据一律等 computed 值
//    真的落定（visibility === "hidden"），不等毫秒数 —— 上一轮有人在过渡窗口内取值，量错过一次假结果。
//
// 📐 几何判据为什么**不**写「.tools 与 .brand 不重叠」：上游自己在 320/360/375 三档就重叠
//    （本轮 authoring 按 brand.right − tools.x 量得 63/23/8px；脚本按同一口径在 NOTE 行原样打出），
//    那是原版既有缺陷，按 GC-1 不修。
//    写成「不重叠」会在上游既有行为上变红，把下一位维护者推向改原版样式表 —— 本项目对上游 CSS
//    的要求是逐字节不动。零回归的正确判据是锚点与计数：.brand 左缘 16px、.tools 右缘距视口 16px、
//    两块面板上沿 14px、.tools > * 恒为 8、.tools 左缘不越出屏幕。全是真实浏览器读到的几何值，
//    不锁 CSS 源文本、不锁类名字符串、不锁行号。
//    面板**宽高**刻意不入判据：.brand 的宽由「鹈鹕骑单车」几个字的字体回退决定，跨机器不可复现，
//    拿它当基线就是给自己造假红（与上游产物的逐值 A/B 比对本轮 authoring 时做过，见 task-5-report）。
import { makeHarness } from "./lib/smoke-harness.mjs";

// 不放行任何 console 噪声：游戏页是单文件、零外部资源，任何 error 级消息都是回归。
// inject-buddha-banner.mjs 给 dist 全部 HTML 注入的「佛祖保佑」横幅走 console.info
// （Task 4 既定），本文件只取 error 级，天然不受它影响，不必为它改构建链。
const harness = makeHarness({
	envVar: "PELICAN_BASE_URL",
	defaultBase: "http://localhost:4322",
});
const base = harness.base;
const { check } = harness;
const gameUrl = base + "/pelican-bike/";

/** 六档视口：前三档上游本就与 .brand 重叠，后三档是平板 / 桌面 / 基准 */
const VIEWPORTS = [
	[320, 700],
	[360, 740],
	[375, 812],
	[414, 896],
	[768, 1024],
	[1440, 900],
];

/** 判据 8 的「附带记录」：品牌位五个部位的 computed 值，只打印、不作为失败条件 */
const BRAND_PARTS = [
	".brand",
	".brand b",
	".brand small",
	".brand .logo",
	".brand > div",
];

/**
 * 上游工具栏的八个成员（六个按钮的 data-act + 两个署名锚点）。
 * 判据 5 用它抓「把某个按钮换成返回入口」——那样计数仍是 8，光数数量会放过。
 */
const UPSTREAM_TOOLS = [
	"button:shot",
	"button:music",
	"button:share",
	"button:full",
	"button:gui",
	"button:help",
	"a:github.com/riba2534/claude-opus-5-5-demo",
	"a:x.com/riba2534",
];

/** 内联样式压出来的链接外观：--text = #f4f6fb；去掉 style 就落回浏览器默认的蓝链接 + 下划线 */
const BRAND_COLOR = "rgb(244, 246, 251)";

const READY_TIMEOUT = 30000; // 本地实测 body.ready 约 7s（SwiftShader 软渲染），留四倍余量
const SETTLE_TIMEOUT = 15000;

const browser = await harness.browser.launch(harness.launch);

const round = (v) => Math.round(v * 100) / 100;

/** 越界请求 = 不是本站 origin 开头的全部请求（data: / blob: 也按越界报出来，由人判断） */
function offsite(sig) {
	return [...new Set(sig.requests)].filter((u) => !u.startsWith(base));
}

/** 等一个状态信号；超时返回 false，由调用点记成 FAIL，不让一条判据把整个脚本带走 */
function settles(page, fn, ms = SETTLE_TIMEOUT, arg = null) {
	return page
		.waitForFunction(fn, arg, { timeout: ms })
		.then(() => true)
		.catch(() => false);
}

/**
 * 打开游戏页并等 body.ready，同时按页挂好四只耳朵。
 * 请求与报错只在**这一个 document** 的生命周期里收集（判据 11）：判据 9 的落地测试
 * 另开页面导航到博客首页，那边加载博客自己的 CSS / 字体 / 播放器属正常，不得计入。
 */
async function openGame(context, { label }) {
	const page = await context.newPage();
	const sig = {
		pageErrors: [],
		consoleErrors: [],
		consoleWarnings: [],
		consoleAll: [],
		requests: [],
		failed: [],
	};
	page.on("pageerror", (e) =>
		sig.pageErrors.push(String(e.message ?? e).slice(0, 160)),
	);
	page.on("console", (m) => {
		const text = m.text();
		sig.consoleAll.push(`${m.type()}: ${text.slice(0, 70)}`);
		if (m.type() === "error") sig.consoleErrors.push(text.slice(0, 160));
		else if (m.type() === "warning")
			sig.consoleWarnings.push(text.slice(0, 70));
	});
	page.on("request", (r) => sig.requests.push(r.url()));
	page.on("requestfailed", (r) =>
		sig.failed.push(`${r.url()} ${r.failure()?.errorText ?? ""}`),
	);
	await page.goto(gameUrl, { waitUntil: "load" });
	const ready = await settles(
		page,
		() => document.body.classList.contains("ready"),
		READY_TIMEOUT,
	);
	check(
		`判据 2：${label}页 body.ready 在 ${READY_TIMEOUT / 1000}s 内出现`,
		ready,
	);
	if (!ready) {
		// 后面每一条判据都挂在「游戏热起来了」上面：把现场打光，直接收摊
		console.log(`      pageerror: ${sig.pageErrors.join(" | ") || "无"}`);
		console.log(
			`      console.error: ${sig.consoleErrors.join(" | ") || "无"}`,
		);
		console.log(
			`      console 全量（前 8 条）: ${sig.consoleAll.slice(0, 8).join(" ⟶ ") || "空"}`,
		);
		console.log(`      越界请求: ${offsite(sig).join(" | ") || "无"}`);
		await browser.close();
		harness.finish();
	}
	return { page, sig };
}

/** 点「开始骑行」，等三个状态信号各自落定；返回没落定的名字数组，空数组即全部如约 */
async function startAndSettle(page) {
	const missed = [];
	await page.locator("#startBtn").click();
	if (
		!(await settles(page, () =>
			document.body.classList.contains("started"),
		))
	)
		missed.push("body.started");
	// #intro 的 0.9s opacity + visibility 过渡：必须等 computed 落定，见文件头 ⏱ 段
	if (
		!(await settles(
			page,
			() =>
				getComputedStyle(document.querySelector("#intro"))
					.visibility === "hidden",
		))
	)
		missed.push("#intro 未收敛到 hidden");
	if (
		!(await settles(
			page,
			() =>
				getComputedStyle(document.querySelector(".hud")).opacity ===
				"1",
		))
	)
		missed.push(".hud opacity 未到 1");
	return missed;
}

/** 连按 Tab 并记录每一步落点；`limit` 是有界盲按，落点序列本身就是判据材料 */
async function tabRing(page, limit) {
	const seen = [];
	for (let i = 0; i < limit; i++) {
		await page.keyboard.press("Tab");
		seen.push(
			await page.evaluate(
				(parts) => {
					const el = document.activeElement;
					if (
						!el ||
						el === document.body ||
						el === document.documentElement
					)
						return { fell: "body", id: "" };
					return {
						// closest 而非 matches：落点是按钮/链接本身，要按它**属于哪一块**归类
						fell: parts.find((s) => el.closest(s)) || "other",
						id:
							el.getAttribute("data-act") ||
							el.getAttribute("data-cam") ||
							el.getAttribute("id") ||
							(el.textContent || "").trim().slice(0, 10) ||
							el.tagName.toLowerCase(),
					};
				},
				[
					".intro-links a[href='/']",
					".brand",
					".cams",
					".tools",
					"#intro",
					".hud",
				],
			),
		);
	}
	return seen;
}

/** 落点序列压成一行：`1:#intro(startBtn) → 2:#intro(startMute) → …`，红了要一眼看出焦点去了哪 */
const describeRing = (ring) =>
	ring.map((r, i) => `${i + 1}:${r.fell}(${r.id})`).join(" → ");

// ------------------------------------------------------------------
// 主游戏页：判据 1–8、10，以及判据 9 的键盘半边
// ------------------------------------------------------------------
const ctx = await browser.newContext({
	viewport: { width: 1440, height: 900 },
});
const { page, sig } = await openGame(ctx, { label: "主" });

// --- 判据 1：HTTP 层 ---
// 走 context.request：它不经页面网络栈，不污染判据 6 对游戏文档的请求取样。
const resp = await ctx.request.get(gameUrl);
const ctype = resp.headers()["content-type"] || "";
check(
	"判据 1：GET /pelican-bike/ 返回 200 且 content-type 含 text/html",
	resp.status() === 200 && ctype.includes("text/html"),
	`${resp.status()} / ${ctype || "无 content-type"}`,
);

// --- 判据 3：世界真的建好了，不是一张白屏 ---
const world = await page.evaluate(() => {
	const c = document.querySelector("canvas");
	const r = c ? c.getBoundingClientRect() : null;
	return {
		hasCanvas: !!c,
		w: r ? r.width : 0,
		h: r ? r.height : 0,
		hasPelican: !!window.__pelican,
		viewType: typeof window.__pelican?.view,
		keys: window.__pelican ? Object.keys(window.__pelican).join(",") : "",
	};
});
check(
	"判据 3：<canvas> 存在且宽高均 > 0",
	world.hasCanvas && world.w > 0 && world.h > 0,
	`${round(world.w)}×${round(world.h)}`,
);
check(
	"判据 3：window.__pelican 已暴露且 view 为函数（3D 世界已建，非白屏）",
	world.hasPelican && world.viewType === "function",
	`view=${world.viewType}｜${world.keys}`,
);

// --- 判据 4：两处返回入口 ---
const entries = await page.evaluate(() => {
	const one = (sel) => document.querySelectorAll(sel).length;
	const back = document.querySelector('.intro-links a[href="/"]');
	const brand = document.querySelector('a.brand[href="/"]');
	const cs = brand ? getComputedStyle(brand) : null;
	const box = (el) => {
		if (!el) return null;
		const r = el.getBoundingClientRect();
		return { w: r.width, h: r.height };
	};
	return {
		introCount: one('.intro-links a[href="/"]'),
		brandCount: one('a.brand[href="/"]'),
		introText: back ? back.textContent.trim() : null,
		introBox: box(back),
		brandTag: brand ? brand.tagName : null,
		brandAria: brand ? brand.getAttribute("aria-label") : null,
		brandBox: box(brand),
		brandColor: cs ? cs.color : null,
		brandTdl: cs ? cs.textDecorationLine : null,
		brandCursor: cs ? cs.cursor : null,
		pagefindIgnore: document.body.getAttribute("data-pagefind-ignore"),
	};
});
check(
	"判据 4：开场卡返回入口唯一、文案含「返回博客首页」且有可见尺寸",
	entries.introCount === 1 &&
		(entries.introText || "").includes("返回博客首页") &&
		!!entries.introBox &&
		entries.introBox.w > 0 &&
		entries.introBox.h > 0,
	`数量 ${entries.introCount}｜"${entries.introText}"｜${
		entries.introBox
			? `${round(entries.introBox.w)}×${round(entries.introBox.h)}`
			: "无盒"
	}`,
);
check(
	"判据 4：HUD 品牌位返回入口唯一、标签是 <A> 不是 <DIV>、aria-label 含「返回博客首页」",
	entries.brandCount === 1 &&
		entries.brandTag === "A" &&
		(entries.brandAria || "").includes("返回博客首页") &&
		!!entries.brandBox &&
		entries.brandBox.w > 0 &&
		entries.brandBox.h > 0,
	`数量 ${entries.brandCount}｜标签 ${entries.brandTag}｜aria-label "${entries.brandAria}"`,
);
check(
	"判据 4：品牌位内联样式仍压住浏览器默认链接外观（color / 无下划线 / pointer）",
	entries.brandColor === BRAND_COLOR &&
		entries.brandTdl === "none" &&
		entries.brandCursor === "pointer",
	`color=${entries.brandColor} text-decoration-line=${entries.brandTdl} cursor=${entries.brandCursor}`,
);
check(
	'判据 4：游戏页 <body> 带 data-pagefind-ignore="all"（不进博客搜索，同 /books/ 策略）',
	entries.pagefindIgnore === "all",
	String(entries.pagefindIgnore),
);

// --- 判据 5：上游署名与 .tools 未被破坏 ---
const attribution = await page.evaluate((upstream) => {
	const kids = [...document.querySelectorAll(".tools > *")].map((el) =>
		el.tagName === "BUTTON"
			? `button:${el.getAttribute("data-act")}`
			: `a:${(el.getAttribute("href") || "").replace(/^https?:\/\//, "")}`,
	);
	return {
		introGithub: document.querySelectorAll(
			'.intro-links a[href*="github.com/riba2534"]',
		).length,
		introX: document.querySelectorAll(
			'.intro-links a[href*="x.com/riba2534"]',
		).length,
		toolsGithub: document.querySelectorAll(
			'.tools a[href*="github.com/riba2534"]',
		).length,
		toolsX: document.querySelectorAll('.tools a[href*="x.com/riba2534"]')
			.length,
		toolsCount: kids.length,
		kids,
		sameAsUpstream: JSON.stringify(kids) === JSON.stringify(upstream),
	};
}, UPSTREAM_TOOLS);
check(
	"判据 5：上游署名链接四处俱在（开场卡 GitHub+X、工具栏 GitHub+X）",
	attribution.introGithub === 1 &&
		attribution.introX === 1 &&
		attribution.toolsGithub === 1 &&
		attribution.toolsX === 1,
	`开场 GitHub=${attribution.introGithub} X=${attribution.introX}｜工具栏 GitHub=${attribution.toolsGithub} X=${attribution.toolsX}`,
);
check(
	"判据 5：.tools 的成员与上游同一份八个（计数 8，且没把哪个按钮换成别的东西）",
	attribution.toolsCount === 8 && attribution.sameAsUpstream,
	attribution.kids.join(" / "),
);

// --- 判据 9（键盘半边 · 开场卡）：Tab 必须能走到返回入口 ---
// 开场卡是 Tab 环最前的一组（#startBtn / #startMute / 三个锚点），8 步内必到。
const introRing = await tabRing(page, 8);
check(
	"判据 9：开场卡返回入口键盘可达（无 hover ≠ 无键盘可达）",
	introRing.some((r) => r.fell === ".intro-links a[href='/']"),
	describeRing(introRing),
);

// --- 判据 7：玩法未被破坏 ---
const missed = await startAndSettle(page);
check(
	"判据 7：点开始骑行 → body.started 出现、#intro 收敛到 visibility:hidden、.hud 收敛到 opacity:1",
	missed.length === 0,
	missed.length ? `未落定：${missed.join("、")}` : "三个状态信号均按序落定",
);
const hud = await page.evaluate(() => {
	const cs = (s) => {
		const el = document.querySelector(s);
		return el ? getComputedStyle(el) : null;
	};
	const intro = cs("#intro");
	const h = cs(".hud");
	const brand = document.querySelector(".brand");
	const b = brand.getBoundingClientRect();
	// 命中测试：开局后品牌位必须真的在它自己那一片区域上收点击（判据 9 的鼠标半边靠它）
	const hit = document.elementFromPoint(
		b.left + b.width / 2,
		b.top + b.height / 2,
	);
	return {
		introVisibility: intro ? intro.visibility : "缺失",
		hudOpacity: h ? h.opacity : "缺失",
		hit: hit ? `${hit.tagName}.${hit.className}` : "null",
		hitIsBrand: !!hit?.closest?.(".brand"),
	};
});
check(
	"判据 7：HUD 已可见、#intro 不再收事件，且命中测试落在品牌位自己身上",
	hud.introVisibility === "hidden" &&
		hud.hudOpacity === "1" &&
		hud.hitIsBrand,
	`#intro=${hud.introVisibility}｜.hud=${hud.hudOpacity}｜盒中心命中=${hud.hit}`,
);

// --- 判据 9（键盘半边 · 品牌位）：Tab 环里不许出现它 ---
const brandRing = await tabRing(page, 12);
const brandFocused = brandRing.some((r) => r.fell === ".brand");
// 测试有效性：12 步里必须真的落到过可聚焦元素上，否则「没落到品牌位」是空断言
const ringLive = brandRing.some((r) => r.fell !== "body");
check(
	'判据 9：开局后 12 次 Tab 从未落到 a.brand 上（tabindex="-1" 未被摘，键盘玩法不多出一格）',
	!brandFocused && ringLive,
	brandFocused
		? `第 ${brandRing.findIndex((r) => r.fell === ".brand") + 1} 次 Tab 就落到了品牌位`
		: describeRing(brandRing),
);

// --- 判据 8：六档视口几何零回归 ---
const rows = [];
for (const [w, h] of VIEWPORTS) {
	await page.setViewportSize({ width: w, height: h });
	// 等视口真的应用了再量布局，不等毫秒数
	await settles(page, (size) => innerWidth === size.w, 5000, { w, h });
	rows.push(
		await page.evaluate((parts) => {
			const box = (el) => {
				const r = el.getBoundingClientRect();
				return {
					x: r.x,
					y: r.y,
					w: r.width,
					h: r.height,
					right: r.right,
					bottom: r.bottom,
				};
			};
			const cs = (el) => {
				const c = getComputedStyle(el);
				return {
					color: c.color,
					tdl: c.textDecorationLine,
					cursor: c.cursor,
					display: c.display,
				};
			};
			const tools = document.querySelector(".tools");
			const brand = document.querySelector(".brand");
			const t = tools ? box(tools) : null;
			const b = brand ? box(brand) : null;
			// 重叠宽度只记录不判定：上游自己在窄屏就有，本项目按 GC-1 不修。
			// 取式与本轮 authoring 时的 A/B 一致（brand.right − tools.x），这样打出来的
			// 三个数能与记录里的 63/23/8px 直接对上；两盒垂直不相交时记 0。
			let overlap = null;
			if (t && b) {
				const oy = Math.min(b.bottom, t.bottom) - Math.max(b.y, t.y);
				overlap = oy > 0 ? Math.max(0, b.right - t.x) : 0;
			}
			const partsOut = {};
			for (const s of parts) {
				const el = document.querySelector(s);
				partsOut[s] = el ? cs(el) : null;
			}
			return {
				vp: `${innerWidth}×${innerHeight}`,
				iw: innerWidth,
				toolsCount: document.querySelectorAll(".tools > *").length,
				tools: t,
				brand: b,
				brandStyle: brand ? cs(brand) : null,
				parts: partsOut,
				overlap,
			};
		}, BRAND_PARTS),
	);
}
for (const r of rows) {
	console.log(
		`      ${r.vp.padStart(9)} .tools>*=${r.toolsCount} tools=${JSON.stringify(
			r.tools,
		)} brand=${JSON.stringify(r.brand)} 重叠=${round(r.overlap ?? 0)}px`,
	);
}
console.log(
	`NOTE  重叠宽度（上游既有缺陷，按 GC-1 不修，仅记录对照）: ${rows
		.map((r, i) => `${VIEWPORTS[i][0]}:${round(r.overlap ?? 0)}`)
		.join("  ")}`,
);
console.log(
	`NOTE  .brand 五部位 computed 值（附带记录，不作失败条件）@1440: ${JSON.stringify(
		rows[rows.length - 1].parts,
	)}`,
);
const badCount = rows
	.filter((r) => r.toolsCount !== 8)
	.map((r, i) => `${VIEWPORTS[i][0]}px→${r.toolsCount}`);
const badOffscreen = rows
	.filter((r) => !r.tools || r.tools.x < 0)
	.map((r) => `${r.vp} x=${r.tools ? round(r.tools.x) : "无盒"}`);
const badAnchor = rows
	.map((r, i) => ({
		vp: `${VIEWPORTS[i][0]}×${VIEWPORTS[i][1]}`,
		brandX: r.brand ? round(r.brand.x) : null,
		brandY: r.brand ? round(r.brand.y) : null,
		toolsY: r.tools ? round(r.tools.y) : null,
		toolsGap: r.tools ? round(r.iw - r.tools.right) : null,
		ok:
			!!r.brand &&
			!!r.tools &&
			Math.abs(r.brand.x - 16) < 0.5 &&
			Math.abs(r.brand.y - 14) < 0.5 &&
			Math.abs(r.tools.y - 14) < 0.5 &&
			Math.abs(r.iw - r.tools.right - 16) < 0.5,
	}))
	.filter((r) => !r.ok);
const badStyle = rows
	.map((r, i) => ({
		vp: `${VIEWPORTS[i][0]}px`,
		style: r.brandStyle,
		ok:
			!!r.brandStyle &&
			r.brandStyle.color === BRAND_COLOR &&
			r.brandStyle.tdl === "none" &&
			r.brandStyle.cursor === "pointer",
	}))
	.filter((r) => !r.ok)
	.map((r) => `${r.vp} ${JSON.stringify(r.style)}`);

check(
	"判据 8：六档视口 .tools > * 计数恒为 8（没人往工具栏里加第九个按钮）",
	badCount.length === 0,
	badCount.length ? badCount.join(", ") : "320/360/375/414/768/1440 全为 8",
);
check(
	"判据 8：六档视口 .tools 左缘不越出屏幕（x >= 0；320px 那一档的溢出由这条抓）",
	badOffscreen.length === 0,
	badOffscreen.length
		? badOffscreen.join(", ")
		: `最窄一档 .tools.x=${round(rows[0].tools?.x ?? NaN)}`,
);
check(
	"判据 8：六档视口锚点未动 —— .brand 左缘 16 / 上缘 14，.tools 上缘 14 / 右缘距视口 16",
	badAnchor.length === 0,
	badAnchor.length
		? JSON.stringify(badAnchor)
		: "16 / 14 / 14 / 距右 16 六档全部命中（±0.5px）",
);
check(
	"判据 8：品牌位链接外观六档不变（内联 style 没被条件性规则覆盖掉）",
	badStyle.length === 0,
	badStyle.length ? badStyle.join(" | ") : `${BRAND_COLOR} / none / pointer`,
);

// --- 判据 6、10：只覆盖游戏页这一个 document ---
const gameRequests = [...new Set(sig.requests)];
check(
	"判据 6：游戏页文档零外部请求（除站点自身 origin 外一个都没有）",
	offsite(sig).length === 0 && sig.failed.length === 0,
	`本页请求 ${gameRequests.length} 条（${gameRequests
		.map((u) => u.slice(base.length) || "/")
		.join(", ")}）｜越界 ${offsite(sig).length}｜失败 ${sig.failed.length}${
		sig.failed.length ? `：${sig.failed.join(" | ")}` : ""
	}`,
);
check(
	"判据 10：游戏文档全程 pageerror 计数为 0",
	sig.pageErrors.length === 0,
	sig.pageErrors.slice(0, 3).join(" | ") || "0 条",
);
check(
	"判据 10：游戏文档 console 无 error 级消息（warn 记录但不失败）",
	sig.consoleErrors.length === 0,
	sig.consoleErrors.slice(0, 3).join(" | ") ||
		`0 条 error｜${sig.consoleWarnings.length} 条 WebGL warning 不计失败｜佛祖保佑横幅走 console.info`,
);
await page.close();

// ------------------------------------------------------------------
// 判据 9（落地半边）：两处返回入口各开一页、真的能回主站
// 这两页刻意不挂判据 6 / 10 的取样：落地页是博客首页，它加载自己的 CSS / 字体 /
// 播放器属正常（判据 11 的口径），主站自身的报错由 pnpm smoke:ui 负责。
// ------------------------------------------------------------------
async function landsWhereItShould(label, openAndClick) {
	const navCtx = await browser.newContext({
		viewport: { width: 1440, height: 900 },
	});
	let detail = "未落地";
	let ok = false;
	try {
		const p = await openAndClick(navCtx);
		await p.waitForURL((u) => new URL(u).pathname === "/", {
			timeout: 20000,
		});
		const url = new URL(p.url());
		const hasHome = await settles(
			p,
			() => !!document.querySelector("#header, .post-list"),
			20000,
		);
		ok = url.pathname === "/" && hasHome;
		detail = `${url.origin}${url.pathname}｜首页标记 ${hasHome ? "在" : "缺失"}`;
	} catch (e) {
		detail = `异常：${String(e.message ?? e)
			.split("\n")[0]
			.slice(0, 140)}`;
	}
	check(`判据 9：${label}`, ok, detail);
	await navCtx.close();
}

// HUD 品牌位：已开局状态、真实鼠标点击（.panel 的 pointer-events: auto 得真的管用）
await landsWhereItShould(
	"开局后真实鼠标点 HUD 品牌位，真的落到博客首页",
	async (navCtx) => {
		const { page: p } = await openGame(navCtx, { label: "HUD 落地" });
		await startAndSettle(p);
		const b = await p.locator(".brand").boundingBox();
		if (!b) throw new Error("品牌位量不到盒");
		// 不用 locator.click()：它会先把目标滚进视口，AGENTS.md 记过那是假差异的来源
		await p.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
		return p;
	},
);

// 开场卡：不开局直接点（合成点击 —— 链接在 900px 高的开场卡里可能落在折叠线以下，
// 而这一条要验的是「入口存在且能用」，不是它是否恰好可见）
await landsWhereItShould(
	"未开局点开场卡返回入口，真的落到博客首页",
	async (navCtx) => {
		const { page: p } = await openGame(navCtx, { label: "开场卡落地" });
		await p.waitForSelector('.intro-links a[href="/"]', { timeout: 15000 });
		await p.evaluate(() =>
			document.querySelector('.intro-links a[href="/"]').click(),
		);
		return p;
	},
);

await browser.close();
harness.finish();
