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
 * 等「一次换图事务彻底落定」：临时层撤净 + 忙碌锁解除 + 回弹过渡退出。
 *
 * 三个条件都是运行时自己写出来的真实状态（不是猜的时长）：回弹类 `is-settling`
 * 由运行时在 SETTLE_MS 后自己摘掉，所以「等到它消失」等价于「等到回弹结束」。
 * 换掉固定毫秒等待正是本票的硬纪律。
 */
async function waitIdle(page, timeout = 20000) {
	try {
		await page.waitForFunction(
			(sel) => {
				const host = document.querySelector("[data-wallpaper-pull]");
				return (
					document.querySelectorAll(sel).length === 0 &&
					!host?.dataset.busy &&
					!host?.classList.contains("is-settling")
				);
			},
			TEMP,
			{ timeout },
		);
		return true;
	} catch {
		return false;
	}
}

/**
 * 装配：等运行时真的把监听器绑上（`data-bound="true"` 是 init 结尾写下的真实状态）
 * 再动手。监听器还没挂时操作会落在空窗里，判据随之假红/假绿。
 */
async function boot(page) {
	await page.waitForFunction(
		() => !!document.querySelector("[data-wallpaper-pull]")?.dataset.bound,
		undefined,
		{ timeout: 30000 },
	);
	await waitIdle(page);
}

/**
 * 装探针：把「这次交互产生了什么」变成可轮询的真实状态。
 *
 * - `srcs`：原图层 src 属性**真实变化**的序列（判「恰好换一次」「不是两次」）——
 *   直接数赋值次数不可行，改为观察属性变化，这是「一次手势只换一次」的执行点；
 * - `maxTemp`：交叉淡入临时层的 rAF 采样峰值（判「过渡结束后归零」时先证明
 *   「过渡里真的有过一层」，否则「没有临时层」在没建层的退化实现上也会恒绿）；
 * - `maxPull` / `draggingSeen`：跟手伸展峰值与「确实越过死区」（定义拖动相位）；
 * - `busySeen`：忙碌锁是否真的置起过（判「忙碌期间重复触发」时不是空转）。
 *
 * rAF 自绘而不是定时采样：临时层与忙碌锁只在事务那几百毫秒里存在。
 */
async function instrument(page) {
	await page.evaluate(() => {
		const bg = document.querySelector(".bg-image[data-backgrounds]");
		const host = document.querySelector("[data-wallpaper-pull]");
		const probe = {
			srcs: [],
			maxTemp: 0,
			maxPull: 0,
			busySeen: false,
			draggingSeen: false,
		};
		window.__wpullProbe = probe;
		if (bg) {
			new MutationObserver(() => {
				probe.srcs.push(bg.getAttribute("src") ?? "");
			}).observe(bg, { attributes: true, attributeFilter: ["src"] });
		}
		const tick = () => {
			const temp = document.querySelectorAll(".bg-image--temp").length;
			if (temp > probe.maxTemp) probe.maxTemp = temp;
			const pull =
				parseFloat(
					host?.style.getPropertyValue("--wpull-pull") ?? "",
				) || 0;
			if (pull > probe.maxPull) probe.maxPull = pull;
			if (host?.dataset.busy === "true") probe.busySeen = true;
			if (host?.dataset.dragging === "true") probe.draggingSeen = true;
			requestAnimationFrame(tick);
		};
		requestAnimationFrame(tick);
	});
}

/** 清空探针，为下一相位从 0 起算 */
const resetProbe = (page) =>
	page.evaluate(() => {
		const probe = window.__wpullProbe;
		probe.srcs = [];
		probe.maxTemp = 0;
		probe.maxPull = 0;
		probe.busySeen = false;
		probe.draggingSeen = false;
	});

/** 读探针（短轮询一次，不睡固定毫秒） */
const readProbe = (page) =>
	page.evaluate(() => ({
		changed: window.__wpullProbe.srcs.length,
		srcs: window.__wpullProbe.srcs.slice(),
		maxTemp: window.__wpullProbe.maxTemp,
		maxPull: window.__wpullProbe.maxPull,
		busySeen: window.__wpullProbe.busySeen,
		draggingSeen: window.__wpullProbe.draggingSeen,
		settling: !!document
			.querySelector("[data-wallpaper-pull]")
			?.classList.contains("is-settling"),
		busy:
			document.querySelector("[data-wallpaper-pull]")?.dataset.busy ??
			null,
	}));

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
	// 回弹结束的真实信号：拉伸变量归零 + 回弹类自分摘掉（不是猜的时长）。
	// 注意：归零只说明**回弹**结束，换图事务还要再走预载 + 交叉淡入，
	// 所以调用方不能就此断言「没换图」——达阈值那条必须另外等背景地址变化。
	await waitIdle(page, 8000);
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

// 池长度一并核对：池里只剩一张时「只请求一张」会退化成恒真，那不是本判据的意思。
const pool = await page.evaluate(() => {
	const bg = document.querySelector(".bg-image[data-backgrounds]");
	const images = JSON.parse(bg.dataset.backgrounds || "[]");
	return {
		length: images.length,
		paths: images.map((entry) => new URL(entry, location.href).pathname),
		current: bg.getAttribute("src"),
		resourcePaths: performance
			.getEntriesByType("resource")
			.map((entry) => new URL(entry.name).pathname)
			.filter((path) => path.includes("/images/bg/")),
	};
});
check(
	"首次加载：只请求壁纸池中的一张",
	pool.length === 4 &&
		pool.resourcePaths.length === 1 &&
		pool.paths.includes(pool.resourcePaths[0]),
	`池 ${pool.length} 张，请求 ${pool.resourcePaths.length} 个：${pool.resourcePaths.join(
		", ",
	)}`,
);
check("挂件已渲染", (await readState(page)).exists);

// 探针要在任何交互之前装：随后的判据靠它数「src 真实变化几次」「临时层峰值」。
await instrument(page);
// 记下原始壁纸池：下面「没得换」会临时把它收窄成一张，用完要还原。
// 存**数组**而不是 dataset 字符串——把字符串再 JSON.stringify 一遍会得到
// 一个「带引号的字符串」，还原后 parse 出来不是数组，池子直接变空（踩过）。
await page.evaluate(() => {
	const bg = document.querySelector(".bg-image[data-backgrounds]");
	window.__wpullPool = JSON.parse(bg.dataset.backgrounds || "[]");
});

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
await resetProbe(page);
const beforeShort = await readState(page);
await dragBy(page, 40);
const shortProbe = await readProbe(page);
check(
	"未达阈值：拖动确实已越过死区（相位由真实状态定义）",
	shortProbe.draggingSeen &&
		shortProbe.maxPull >= 30 &&
		shortProbe.maxPull < 80,
	`dy=40 → 跟手伸展峰值 ${Math.round(shortProbe.maxPull)}px，dragging=${
		shortProbe.draggingSeen
	}`,
);
check(
	"未达阈值释放：不换图",
	(await readState(page)).bgSrc === beforeShort.bgSrc &&
		shortProbe.changed === 0,
	`${beforeShort.bgSrc} 未变，src 变化 ${shortProbe.changed} 次`,
);

// ---- 拖动：达阈值换图，且恰好一次 ----
await resetProbe(page);
const beforeLong = await readState(page);
const bgChanges = [];
const onResponse = (r) => {
	if (r.url().includes("/images/bg/")) bgChanges.push(r.url());
};
page.on("request", onResponse);
const longDuring = await readState(page);
// 静止位姿的按钮顶边：拖动位移要拿它当基准（只在拖动前量一次）。
const longHeldRect = await page.locator(GRAB).boundingBox();
await page.mouse.move(longDuring.grab.x, longDuring.grab.y);
await page.mouse.down();
await page.mouse.move(longDuring.grab.x, longDuring.grab.y + 130, {
	steps: 10,
});
const longHeld = await readProbe(page);
const heldRect = await page.locator(GRAB).boundingBox();
check(
	"达到阈值前跟手伸展已越过阈值（相位由真实状态定义）",
	longHeld.draggingSeen && longHeld.maxPull >= 80,
	`dy=130 → 跟手伸展峰值 ${Math.round(longHeld.maxPull)}px（阈值 80px）`,
);
check(
	"跟手位移在几何上真实发生（衣服整体下移）",
	heldRect !== null && heldRect.y - longHeldRect.y >= 80,
	`静止按钮顶 y=${Math.round(longHeldRect.y)} → 拖到 y=${Math.round(
		heldRect?.y ?? Number.NaN,
	)}，位移 ${Math.round((heldRect?.y ?? 0) - longHeldRect.y)}px`,
);
await page.mouse.up();
// 回弹归零 ≠ 换图完成：换图要再走预载 + 交叉淡入，等背景地址真正落定
const dragChanged = await waitForBackgroundChange(page, beforeLong.bgSrc);
await waitIdle(page);
page.off("request", onResponse);
const afterLong = await readState(page);
const longAfter = await readProbe(page);
check(
	"达阈值释放：换图",
	dragChanged,
	`${beforeLong.bgSrc} → ${afterLong.bgSrc}`,
);
// 「恰好换一次，不是两次」的执行点：直接观察原图层 src 属性的**真实变化次数**。
// 一次手势只允许一次落图；两次就意味着「拖动达阈值」与「拖动后浏览器补发的 click」
// 各走了一遍 requestChange（CLICK_AFTER_DRAG_MS 抑制窗失效正是这个症状）。
check(
	"达到阈值释放恰好换一次（且只换一次，不是两次）",
	longAfter.changed === 1 && afterLong.bgSrc !== beforeLong.bgSrc,
	`src 属性变化 ${longAfter.changed} 次（要求恰好 1 次）；同一手势的壁纸请求不同地址数=${
		new Set(bgChanges).size
	}`,
);
check(
	"过渡结束后临时层数量归零",
	afterLong.tempCount === 0 && longAfter.maxTemp >= 1,
	`过渡峰值 ${longAfter.maxTemp} 层，落定后 ${afterLong.tempCount} 层`,
);
check("交叉淡入结束后临时层不堆积", (await waitForNoTempLayer(page)) === true);

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
await resetProbe(page);
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
// 复位完成的真实信号：手势状态复位 + 忙碌锁解除（不睡固定毫秒）
await waitIdle(page);
const afterBlur = await readState(page);
check(
	"失焦：不换图",
	afterBlur.bgSrc === beforeBlur.bgSrc,
	`${beforeBlur.bgSrc} 未变`,
);

// ---- 忙碌期间重复触发不产生第二次提交 ----
await resetProbe(page);
const beforeBusy = await readState(page);
await page.evaluate(() => {
	const btn = document.querySelector(".wpull__grab");
	btn?.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
	btn?.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
	btn?.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
});
await waitForBackgroundChange(page, beforeBusy.bgSrc);
await waitIdle(page);
const afterBusy = await readState(page);
const busyProbe = await readProbe(page);
check(
	"忙碌期间重复触发不产生第二次提交",
	busyProbe.changed === 1 &&
		busyProbe.busySeen &&
		afterBusy.bgSrc !== beforeBusy.bgSrc &&
		afterBusy.tempCount === 0,
	`同任务连发 3 次 → src 属性变化 ${busyProbe.changed} 次，忙碌锁出现过=${
		busyProbe.busySeen
	}，临时层 ${afterBusy.tempCount}`,
);

// ---- 没得换：播报「没得换」且背景不变 ----
// 用一个真实的边界制造「没得换」：把既有 data-backgrounds 通道（配置的序列化通道）
// 收窄成只剩当前这一张——不碰实现，只是让池里真的没有候选。缺了这一档，
// 「三类结果各有不同文本」就只能比对两档，票面第 10 条也就只覆盖一半。
await resetProbe(page);
const beforeNone = await readState(page);
await page.evaluate(() => {
	const bg = document.querySelector(".bg-image[data-backgrounds]");
	bg.dataset.backgrounds = JSON.stringify([bg.getAttribute("src")]);
});
await page.locator(GRAB).click();
await waitIdle(page);
const afterNone = await readState(page);
const noneProbe = await readProbe(page);
check(
	"没得换：播报「没得换」且当前背景不变",
	afterNone.live === "没得换" &&
		afterNone.bgSrc === beforeNone.bgSrc &&
		noneProbe.changed === 0 &&
		afterNone.tempCount === 0,
	`播报「${afterNone.live}」，src 变化 ${noneProbe.changed} 次`,
);
// 把池还原，后续判据仍要在正常池上进行
await page.evaluate(() => {
	const bg = document.querySelector(".bg-image[data-backgrounds]");
	bg.dataset.backgrounds = JSON.stringify(window.__wpullPool);
});
const noneText = afterNone.live;

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

// ---- 播报区：三类结果各有不同文本（换好了 / 没得换 / 加载失败） ----
// 三档真实文本放在一起比对，而不是锁死具体措辞；缺少任何一档就不成立。
check(
	"播报区在三类结果上各有不同文本（换好了 / 没得换 / 加载失败）",
	new Set([s1.live, noneText, afterFail.live]).size === 3 &&
		[s1.live, noneText, afterFail.live].every((text) => text.length > 0),
	`换好了「${s1.live}」 / 没得换「${noneText}」 / 加载失败「${afterFail.live}」`,
);
check(
	"播报区 aria-live 为 polite",
	await page.evaluate(() => {
		const el = document.querySelector(".wpull__live");
		return el?.getAttribute("aria-live") === "polite";
	}),
);

// ---- 多次切页后仍可用、单次手势只换一次 ----
// 票面要的是「多次切页后单次手势仍只换一次图」。用 page.goto 是**整页重新加载**，
// 挂件随新文档重建——那验证的是「新页面能用」，不是「切页后旧实例仍只换一次」。
// 所以这里改用真实的 Swup 站内切页（window.swup.navigate 与点击站内链接同一条路径），
// 挂件与背景层都在 Swup 容器之外、切页不重建，回归会表现为「一个手势换两次图」
// 或「挂件实例变多 / 监听器翻倍」。
await page.waitForFunction(
	() => typeof window.swup !== "undefined",
	undefined,
	{
		timeout: 15000,
	},
);
const beforeSwup = await readState(page);
for (const path of ["/about/", "/archive/", "/diary/"]) {
	await page.evaluate(async (target) => {
		await window.swup.navigate(target);
	}, path);
	await page.waitForFunction(
		(expected) => location.pathname === expected,
		path,
		{
			timeout: 15000,
		},
	);
}
const afterSwup = await readState(page);
const instances = await page.evaluate(
	() => document.querySelectorAll("[data-wallpaper-pull]").length,
);
check(
	"多次切页后仍只有一个挂件实例（挂件不随切页重建）",
	instances === 1,
	`切 3 页后挂件 ${instances} 个`,
);
check(
	"切页不重置背景（背景层在 Swup 容器之外）",
	afterSwup.bgSrc === beforeSwup.bgSrc,
	`切页前 ${beforeSwup.bgSrc}，切页后 ${afterSwup.bgSrc}`,
);
// 切页后探针要重装：src 观察器绑的是旧文档里的那个 img 节点（切页后被换掉）。
await instrument(page);
await resetProbe(page);
const beforeSwupGesture = await readState(page);
await page.locator(GRAB).click();
const swupChanged = await waitForBackgroundChange(
	page,
	beforeSwupGesture.bgSrc,
);
await waitIdle(page);
const swupProbe = await readProbe(page);
check(
	"多次切页后单次手势仍只换一次图",
	swupChanged && swupProbe.changed === 1,
	`src 属性变化 ${swupProbe.changed} 次；${beforeSwupGesture.bgSrc} → ${
		(await readState(page)).bgSrc
	}`,
);

// ---- 窄屏断点：挂件不显示（并设宽屏对照，防「恒隐藏」空转） ----
await page.setViewportSize({ width: 680, height: 900 });
// 断点生效的真实信号：计算值 display 真的变成 none（不睡固定毫秒）
await page.waitForFunction(
	() =>
		getComputedStyle(document.querySelector("[data-wallpaper-pull]"))
			.display === "none",
	undefined,
	{ timeout: 10000 },
);
const narrow = await readState(page);
const narrowRect = await page.evaluate(
	() =>
		document.querySelector("[data-wallpaper-pull]").getBoundingClientRect()
			.width,
);
check(
	"窄屏 680px 挂件隐藏",
	narrow.display === "none" && narrowRect === 0,
	`display=${narrow.display}，盒宽 ${narrowRect}px`,
);
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForFunction(
	() =>
		getComputedStyle(document.querySelector("[data-wallpaper-pull]"))
			.display === "none",
	undefined,
	{ timeout: 10000 },
);
check("窄屏 390px 挂件隐藏", (await readState(page)).display === "none");
// 宽屏对照：证明这条断点规则不是「恒隐藏」——回到 1024 必须重新可见且不出屏。
await page.setViewportSize({ width: 1024, height: 900 });
await page.waitForFunction(
	() =>
		getComputedStyle(document.querySelector("[data-wallpaper-pull]"))
			.display !== "none",
	undefined,
	{ timeout: 10000 },
);
const wide = await page.evaluate(() => {
	const host = document.querySelector("[data-wallpaper-pull]");
	const rect = host.getBoundingClientRect();
	return {
		display: getComputedStyle(host).display,
		left: Math.round(rect.left),
		right: Math.round(rect.right),
		viewport: document.documentElement.clientWidth,
	};
});
check(
	"宽屏对照：1024px 下挂件确实可见且不出屏（防恒隐藏空转）",
	wide.display !== "none" && wide.left >= 0 && wide.right <= wide.viewport,
	`display=${wide.display}，左 ${wide.left} / 右 ${wide.right} / 视口 ${wide.viewport}`,
);

checkClean("拉绳壁纸挂件");

// ---- 减少动态：仍能换图且无位移 ----
const rmContext = await browser.newContext({
	viewport: { width: 1440, height: 900 },
	reducedMotion: "reduce",
});
const rmPage = harness.attach(await rmContext.newPage());
await rmPage.goto(base + "/", { waitUntil: "load", timeout: 60000 });
await boot(rmPage);
await instrument(rmPage);
// 本条前提：减少动态偏好真的被浏览器报告（否则下面的判据在普通 context 上就空转）
check(
	"减少动态偏好确实生效（否则本条判据会空转）",
	await rmPage.evaluate(
		() => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
	),
);

// ---- 减少动态：仍能换图 ----
await resetProbe(rmPage);
const rmBefore = await readState(rmPage);
await rmPage.locator(GRAB).click();
const rmChanged = await waitForBackgroundChange(rmPage, rmBefore.bgSrc);
await waitIdle(rmPage);
const rmAfter = await readState(rmPage);
const rmProbe = await readProbe(rmPage);
check("减少动态：仍能换图", rmChanged);
check(
	"减少动态：不建交叉淡入临时层",
	rmAfter.tempCount === 0 && rmProbe.maxTemp === 0,
	`过渡峰值 ${rmProbe.maxTemp} 层，当前 ${rmAfter.tempCount} 层`,
);

// ---- 减少动态：拖动无位移（跟手伸展恒为 0，衣服不移动） ----
// 原判据只读了点击后残留的 --wpull-pull：那条在**任何**实现上都是 0（点击根本不设
// 这个变量），等于恒真。真正要验的是「减少动态下拖动时衣服不动」——必须真的拖。
await resetProbe(rmPage);
const rmRest = await rmPage.locator(GRAB).boundingBox();
await rmPage.mouse.move(
	rmRest.x + rmRest.width / 2,
	rmRest.y + rmRest.height / 2,
);
await rmPage.mouse.down();
await rmPage.mouse.move(
	rmRest.x + rmRest.width / 2,
	rmRest.y + rmRest.height / 2 + 130,
	{ steps: 10 },
);
// 相位由真实状态定义：手势已被识别（dragging 置起）才谈得上「有没有位移」
await rmPage.waitForFunction(
	() => window.__wpullProbe.draggingSeen,
	undefined,
	{
		timeout: 10000,
	},
);
const rmHeld = await readProbe(rmPage);
const rmHeldRect = await rmPage.locator(GRAB).boundingBox();
check(
	"减少动态下拖动无位移（跟手伸展恒为 0，衣服不移动）",
	rmHeld.maxPull === 0 &&
		Math.abs(rmHeldRect.y - rmRest.y) < 0.5 &&
		rmHeld.draggingSeen,
	`手势已识别=${rmHeld.draggingSeen}，伸展峰值 ${rmHeld.maxPull}px，静止 y=${Math.round(
		rmRest.y,
	)} → 拖到 y=${Math.round(rmHeldRect.y)}`,
);
await rmPage.mouse.up();
// 拖过阈值仍要换图（减少动态只降级动效，不降级功能）
const rmDragChanged = await waitForBackgroundChange(rmPage, rmAfter.bgSrc);
await waitIdle(rmPage);
check(
	"减少动态下拖过阈值仍换图（降级只针对动效，不减功能）",
	rmDragChanged,
	`${rmAfter.bgSrc} → ${(await readState(rmPage)).bgSrc}`,
);
checkClean("减少动态");

await rmContext.close();
await context.close();
await browser.close();
harness.finish();
