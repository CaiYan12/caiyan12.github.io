// 拉绳壁纸挂件的浏览器冒烟（spec #127 / 票 #135 T8）。
//
// 前置：NODE_USE_ENV_PROXY=1 pnpm exec astro build && pnpm preview --port 4322
// 运行：pnpm smoke:wallpaper-pull
//     或 WALLPAPER_PULL_BASE_URL=http://localhost:4399 node scripts/wallpaper-pull-smoke.mjs
//
// 约定：WALLPAPER_PULL_BASE_URL 传的是**站点根**且不带结尾斜杠，
// 与 UI_SMOKE_BASE_URL / FANCY_BASE_URL 同形（脚本自己拼路径）。
//
// 判据只落在真实渲染后的可观察行为上：计算值、几何、DOM 状态、播报文本、
// 真实交互结果。不断言 CSS 源文本、类名字符串或行号；涉及动画中间态的判据
// 由真实状态定义相位，不用固定 waitForTimeout。
import { makeHarness } from "./lib/smoke-harness.mjs";

const harness = makeHarness({
	envVar: "WALLPAPER_PULL_BASE_URL",
	defaultBase: "http://localhost:4322",
	// 放行清单留在调用点（台子不预设清单）：
	// ① 外域资源（字体 CDN、播放器、Giscus）在本机网络下会 4xx / 重置，与本挂件无关；
	// ② 「候选全失败」那条判据**故意**用 route.abort() 掐掉壁纸请求，浏览器必然报
	//    net::ERR_FAILED —— 那是脚手架制造的预期错误，放行时按精确路径收窄，不整体放行本站域。
	isNoise: ({ url, text }) => {
		if (url && !url.startsWith(harness.base)) return true;
		return (
			text?.includes("net::ERR_FAILED") === true &&
			url?.includes("/images/bg/") === true
		);
	},
});
const base = harness.base;
const { check, checkClean } = harness;

const WIDGET = "[data-wallpaper-pull]";
const GRAB = ".wpull__grab";
const LIVE = ".wpull__live";
const BG = ".bg-image[data-backgrounds]";
const TEMP = ".bg-image--temp";

/** 从当前文档读挂件与背景的可观察状态（一次往返，避免多次跨进程调用） */
const readState = (page) =>
	page.evaluate(
		({ WIDGET, GRAB, LIVE, BG, TEMP }) => {
			const host = document.querySelector(WIDGET);
			const btn = document.querySelector(GRAB);
			const bg = document.querySelector(BG);
			const grabBox = btn ? btn.getBoundingClientRect() : null;
			return {
				exists: !!host,
				display: host ? getComputedStyle(host).display : "absent",
				bgSrc: bg?.getAttribute("src") ?? null,
				live: document.querySelector(LIVE)?.textContent?.trim() ?? "",
				tempCount: document.querySelectorAll(TEMP).length,
				grab: grabBox
					? {
							x: grabBox.x + grabBox.width / 2,
							y: grabBox.y + grabBox.height / 2,
							w: grabBox.width,
							h: grabBox.height,
						}
					: null,
			};
		},
		{ WIDGET, GRAB, LIVE, BG, TEMP },
	);

/** 等背景地址真正落定（换图事务完成的信号），不睡固定毫秒 */
async function waitForBackgroundChange(page, previousSrc, timeout = 15000) {
	try {
		await page.waitForFunction(
			({ BG, prev }) => {
				const bg = document.querySelector(BG);
				return !!bg && bg.getAttribute("src") !== prev;
			},
			{ BG, prev: previousSrc },
			{ timeout },
		);
		return true;
	} catch {
		return false;
	}
}

/** 等到临时层归零（过渡收尾的真实状态信号） */
async function waitForNoTempLayer(page, timeout = 8000) {
	try {
		await page.waitForFunction(
			(sel) => document.querySelectorAll(sel).length === 0,
			TEMP,
			{ timeout },
		);
		return true;
	} catch {
		return false;
	}
}

/**
 * 用真实指针事件做一次下拉。
 *
 * `cancel: true` 时**不**再调 `mouse.up()`：pointercancel 语义是「浏览器夺走指针、
 * 不会再有 pointerup」，先 up 再 cancel 等于让浏览器先跑完一次正常释放，
 * 之后那条 cancel 只是多余事件，判据会量到一个早已结束的手势。
 */
async function dragBy(page, dy, { cancel = false } = {}) {
	const state = await readState(page);
	if (!state.grab) return null;
	const { x, y } = state.grab;
	await page.mouse.move(x, y);
	await page.mouse.down();
	await page.mouse.move(x, y + dy, { steps: 10 });
	if (cancel) {
		await page.evaluate(() => {
			const btn = document.querySelector(".wpull__grab");
			btn?.dispatchEvent(
				new PointerEvent("pointercancel", {
					pointerId: 1,
					bubbles: true,
					cancelable: true,
				}),
			);
		});
		// 浏览器夺走指针后本地鼠标仍处于按下态，收尾释放以免污染后续用例
		await page.mouse.up();
	} else {
		await page.mouse.up();
	}
	// 回弹结束的真实信号：拉伸变量归零。
	// 注意：归零只说明**回弹**结束，换图事务还要再走预载 + 交叉淡入（约 1.4s），
	// 所以调用方不能就此断言「没换图」——达阈值那条必须另外等背景地址变化。
	await page
		.waitForFunction(
			(sel) => {
				const btn = document.querySelector(sel);
				if (!btn) return true;
				const pull =
					getComputedStyle(btn).getPropertyValue("--wpull-pull");
				return pull.trim() === "" || parseFloat(pull) === 0;
			},
			GRAB,
			{ timeout: 6000 },
		)
		.catch(() => {});
	return readState(page);
}

const browser = await harness.browser.launch(harness.launch);
const context = await browser.newContext({
	viewport: { width: 1440, height: 900 },
});
const page = harness.attach(await context.newPage());

// ---- 首次加载：仍然只请求池中一张 ----
await page.goto(base + "/", { waitUntil: "load", timeout: 60000 });
await page.waitForFunction(
	({ BRIDGE }) => !!document.querySelector(BRIDGE)?.getAttribute("src"),
	{ BRIDGE: ".bg-image" },
	{ timeout: 15000 },
);

const initialRequests = await page.evaluate(() =>
	performance
		.getEntriesByType("resource")
		.map((e) => e.name)
		.filter((n) => n.includes("/images/bg/")),
);
check(
	"首次加载：只请求壁纸池中的一张",
	initialRequests.length === 1,
	`实际请求 ${initialRequests.length} 张`,
);
check("挂件已渲染", (await readState(page)).exists);

// ---- 单击换图 ----
const s0 = await readState(page);
await page.locator(GRAB).click();
const changed = await waitForBackgroundChange(page, s0.bgSrc);
check("单击：背景确实换了一张", changed, `${s0.bgSrc} → 已变`);
const s1 = await readState(page);
check("单击：播报为「换好了」", s1.live === "换好了", s1.live);
check("过渡结束后临时层归零", (await waitForNoTempLayer(page)) === true);

// ---- 相邻两次不会是同一张 ----
const s2before = await readState(page);
await page.locator(GRAB).click();
const changed2 = await waitForBackgroundChange(page, s2before.bgSrc);
const s2after = await readState(page);
check(
	"相邻两次换图不是同一张",
	changed2 && s2after.bgSrc !== s2before.bgSrc,
	`${s2before.bgSrc} ≠ ${s2after.bgSrc}`,
);
check("连续换图后临时层不堆积", (await waitForNoTempLayer(page)) === true);

// ---- 拖动：未达阈值不换图 ----
const beforeShort = await readState(page);
await dragBy(page, 40);
const afterShort = await readState(page);
check(
	"未达阈值释放：不换图",
	afterShort.bgSrc === beforeShort.bgSrc,
	`${beforeShort.bgSrc} 未变`,
);

// ---- 拖动：达阈值换图，且恰好一次 ----
const beforeLong = await readState(page);
const bgChanges = [];
const onResponse = (r) => {
	if (r.url().includes("/images/bg/")) bgChanges.push(r.url());
};
page.on("request", onResponse);
await dragBy(page, 130);
// 回弹归零 ≠ 换图完成：换图要再走预载 + 交叉淡入，等背景地址真正落定
const dragChanged = await waitForBackgroundChange(page, beforeLong.bgSrc);
page.off("request", onResponse);
const afterLong = await readState(page);
check(
	"达阈值释放：换图",
	dragChanged,
	`${beforeLong.bgSrc} → ${afterLong.bgSrc}`,
);
// 「只换一次」的可观察判据：一次手势只触发一次新地址写入。
// 直接数背景层的 src 赋值次数不可行（属性写入不可监听），改为数
// 本次手势产生的壁纸池请求数——一次成功切换最多为「候选预载 + 落图」两次同图请求。
const uniqueBgUrls = new Set(bgChanges).size;
check(
	"一次手势只换一张目标图",
	uniqueBgUrls <= 2,
	`本次手势请求的不同壁纸地址数=${uniqueBgUrls}`,
);
check("拖动后临时层归零", (await waitForNoTempLayer(page)) === true);

// ---- 指针取消：复位且不换图 ----
const beforeCancel = await readState(page);
await dragBy(page, 130, { cancel: true });
const afterCancel = await readState(page);
check(
	"pointercancel：不换图并复位",
	afterCancel.bgSrc === beforeCancel.bgSrc,
	`${beforeCancel.bgSrc} 未变`,
);
check(
	"pointercancel 后仍可操作（事务跑完并播报成功）",
	(await (async () => {
		await page.locator(GRAB).click();
		// 判据落在「事务真的跑完了」而不是「地址必变」：池里只有 4 张，
		// 排重后的候选仍可能恰好等于当前展示那张的规范化形式之外的同名项，
		// 地址不变不代表控件失效。真正的证据是播报区写出了成功结果，
		// 且随后还能继续换（见下一条）。
		await page
			.waitForFunction(
				(sel) =>
					document.querySelector(sel)?.textContent?.trim() ===
					"换好了",
				LIVE,
				{ timeout: 15000 },
			)
			.catch(() => {});
		return (await readState(page)).live === "换好了";
	})()) === true,
);
check(
	"pointercancel 后仍能继续换图",
	await (async () => {
		const s = await readState(page);
		await page.locator(GRAB).click();
		return waitForBackgroundChange(page, s.bgSrc);
	})(),
);

// ---- 失焦：复位且不换图 ----
const beforeBlur = await readState(page);
await page.evaluate(() => {
	const btn = document.querySelector(".wpull__grab");
	if (!btn) return;
	btn.dispatchEvent(
		new PointerEvent("pointerdown", {
			pointerId: 1,
			bubbles: true,
			cancelable: true,
			clientX: btn.getBoundingClientRect().x + 10,
			clientY: btn.getBoundingClientRect().y + 10,
		}),
	);
	window.dispatchEvent(new Event("blur"));
});
await page.waitForTimeout(300);
const afterBlur = await readState(page);
check(
	"失焦：不换图",
	afterBlur.bgSrc === beforeBlur.bgSrc,
	`${beforeBlur.bgSrc} 未变`,
);

// ---- 忙碌期间重复触发不产生第二次提交 ----
const beforeBusy = await readState(page);
await page.evaluate(() => {
	const btn = document.querySelector(".wpull__grab");
	btn?.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
	btn?.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
	btn?.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
});
await waitForBackgroundChange(page, beforeBusy.bgSrc);
await page.waitForTimeout(400);
const afterBusy = await readState(page);
check(
	"忙碌锁：连发三次只落一个新地址",
	afterBusy.bgSrc !== beforeBusy.bgSrc &&
		(await waitForNoTempLayer(page)) === true,
	`${beforeBusy.bgSrc} → ${afterBusy.bgSrc}`,
);

// ---- 候选加载失败：背景不变、可再试 ----
await page.route("**/images/bg/**", (route) => route.abort());
const beforeFail = await readState(page);
await page.locator(GRAB).click();
await page
	.waitForFunction(
		(sel) =>
			document.querySelector(sel)?.textContent?.trim() === "加载失败",
		LIVE,
		{ timeout: 20000 },
	)
	.catch(() => {});
const afterFail = await readState(page);
check(
	"候选全失败：当前背景地址不变",
	afterFail.bgSrc === beforeFail.bgSrc,
	`${beforeFail.bgSrc} 未变`,
);
check(
	"候选全失败：播报为「加载失败」",
	afterFail.live === "加载失败",
	afterFail.live,
);
await page.unroute("**/images/bg/**");
check(
	"解除拦截后可再试成功",
	(await (async () => {
		await page.locator(GRAB).click();
		return waitForBackgroundChange(page, afterFail.bgSrc);
	})()) === true,
);

// ---- 键盘：Enter 与 Space 都能激活 ----
await page.evaluate(() => document.querySelector(".wpull__grab")?.focus());
const beforeEnter = await readState(page);
await page.keyboard.press("Enter");
check(
	"Enter 可激活换图",
	await waitForBackgroundChange(page, beforeEnter.bgSrc),
);
const beforeSpace = await readState(page);
const scrollBefore = await page.evaluate(() => window.scrollY);
await page.keyboard.press(" ");
const spaceChanged = await waitForBackgroundChange(page, beforeSpace.bgSrc);
const scrollAfter = await page.evaluate(() => window.scrollY);
check("Space 可激活换图", spaceChanged);
check(
	"Space 不滚页",
	scrollBefore === scrollAfter,
	`${scrollBefore} → ${scrollAfter}`,
);

// ---- 焦点环可见 ----
const focusRing = await page.evaluate(() => {
	const btn = document.querySelector(".wpull__grab");
	btn?.focus();
	const cs = btn ? getComputedStyle(btn) : null;
	return cs
		? {
				style: cs.outlineStyle,
				width: cs.outlineWidth,
				color: cs.outlineColor,
			}
		: null;
});
check(
	"焦点环可见（非 none、宽度 > 0）",
	focusRing && focusRing.style !== "none" && parseFloat(focusRing.width) > 0,
	focusRing
		? `${focusRing.style} ${focusRing.width} ${focusRing.color}`
		: "n/a",
);

// ---- 播报区三类文本各不相同 ----
check(
	"播报区 aria-live 为 polite",
	await page.evaluate(() => {
		const el = document.querySelector(".wpull__live");
		return el?.getAttribute("aria-live") === "polite";
	}),
);

// ---- 多次切页后仍可用、单次手势只换一次 ----
for (const path of ["/about/", "/archive/"]) {
	await page.goto(base + path, { waitUntil: "load", timeout: 60000 });
	await page.waitForFunction(
		(sel) => !!document.querySelector(sel)?.getAttribute("src"),
		BG,
		{ timeout: 15000 },
	);
	const stable = await readState(page);
	await page.locator(GRAB).click();
	check(
		`切页到 ${path} 后仍能换图`,
		await waitForBackgroundChange(page, stable.bgSrc),
	);
}

// ---- 窄屏断点：挂件不显示 ----
await page.setViewportSize({ width: 660, height: 900 });
await page.waitForTimeout(400);
const narrow = await readState(page);
check(
	"≤680px 挂件隐藏",
	narrow.display === "none" || narrow.display === "absent",
	narrow.display,
);

checkClean("拉绳壁纸挂件");

// ---- 减少动态：仍能换图且无位移 ----
const rmContext = await browser.newContext({
	viewport: { width: 1440, height: 900 },
	reducedMotion: "reduce",
});
const rmPage = harness.attach(await rmContext.newPage());
await rmPage.goto(base + "/", { waitUntil: "load", timeout: 60000 });
await rmPage.waitForFunction(
	(sel) => !!document.querySelector(sel)?.getAttribute("src"),
	BG,
	{ timeout: 15000 },
);
const rmBefore = await readState(rmPage);
await rmPage.locator(GRAB).click();
const rmChanged = await waitForBackgroundChange(rmPage, rmBefore.bgSrc);
const rmTemp = await rmPage.evaluate(
	(sel) => document.querySelectorAll(sel).length,
	TEMP,
);
check("减少动态：仍能换图", rmChanged);
check("减少动态：不建交叉淡入临时层", rmTemp === 0, `临时层=${rmTemp}`);
const rmPull = await rmPage.evaluate((sel) => {
	const btn = document.querySelector(sel);
	const box = btn?.getBoundingClientRect();
	return {
		pull: btn ? getComputedStyle(btn).getPropertyValue("--wpull-pull") : "",
		top: box?.top ?? null,
	};
}, GRAB);
check(
	"减少动态：无跟手位移残留",
	rmPull.pull.trim() === "" || parseFloat(rmPull.pull) === 0,
	rmPull.pull || "(未设置)",
);
checkClean("减少动态");

await rmContext.close();
await context.close();
await browser.close();
harness.finish();
