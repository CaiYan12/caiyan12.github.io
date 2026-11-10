// 页面级 runtime 的生命周期烟测：离开页面后，页面级定时器与监听必须真的被摘掉。
//
// 为什么要有这条：现有四套 smoke 都在验「当前页面对不对」，没有一条验「离开时资源有没有收回」。
// 覆盖两类资源：
//   · 定时器：4000ms 的 interval 只有两个来源——头部微言轮播（常驻，全站恒 1 条）与首页轮播
//     （页面级）。所以「首页 2、其它页 1、回首页 2」是唯一自洽读数，任何 >1 都是页面级 interval 越界存活。
//   · 监听：字号「点外收起」挂在 document 的 pointerdown（页面级，随会话销毁）、侧栏 tabs 挂在
//     旧节点上的 click。两者都用 AbortController 的 signal，停止时一次解绑；断言读的是
//     「监听计数」本身，不是「点一下看起来对不对」——后者在旧实现里也看不出来。
//
// 计数由 addInitScript 注入的探针给出：包住 EventTarget 的 add/removeEventListener，
// 并监听 signal 的 abort 来扣减。不依赖任何内部变量名，也不改生产代码。
//
// 用法（先构建并起 preview）：
//   pnpm exec astro build && pnpm exec pagefind --site dist && pnpm preview --port 4322
//   RUNTIME_LIFECYCLE_BASE_URL=http://localhost:4322 pnpm smoke:runtime-lifecycle
// 退出码：0 全绿；1 有判据失败。
import { chromium } from "playwright";
import { makeHarness } from "./lib/smoke-harness.mjs";

const { base, check, createSink, checkClean, finish } = makeHarness({
	envVar: "RUNTIME_LIFECYCLE_BASE_URL",
	defaultBase: "http://localhost:4322",
});

const PROBE = `(() => {
	const probe = { active: new Map(), created: 0, cleared: 0, pageLoaded: 0 };
	const rawSet = window.setInterval.bind(window);
	const rawClear = window.clearInterval.bind(window);
	window.setInterval = function (handler, delay, ...args) {
		const id = rawSet(handler, delay, ...args);
		probe.active.set(id, Number(delay));
		probe.created++;
		return id;
	};
	window.clearInterval = function (id) {
		probe.active.delete(id);
		probe.cleared++;
		return rawClear(id);
	};
	document.addEventListener("colorful:page:loaded", () => {
		probe.pageLoaded++;
	});
	window.__runtimeLifecycleProbe = probe;
	window.__intervalCount = (delay) =>
		[...probe.active.values()].filter((value) => value === delay).length;

	// 监听计数：包住 EventTarget 的增删，并跟踪 signal.abort 的隐式解绑。
	const registry = new WeakMap();
	const rawAdd = EventTarget.prototype.addEventListener;
	const rawRemove = EventTarget.prototype.removeEventListener;
	const bump = (target, type, delta) => {
		let map = registry.get(target);
		if (!map) {
			map = new Map();
			registry.set(target, map);
		}
		map.set(type, Math.max(0, (map.get(type) ?? 0) + delta));
	};
	EventTarget.prototype.addEventListener = function (type, handler, options) {
		rawAdd.call(this, type, handler, options);
		bump(this, type, 1);
		const signal = options && typeof options === "object" ? options.signal : undefined;
		if (signal) {
			signal.addEventListener("abort", () => bump(this, type, -1), { once: true });
		}
	};
	EventTarget.prototype.removeEventListener = function (type, handler, options) {
		rawRemove.call(this, type, handler, options);
		bump(this, type, -1);
	};
	window.__listenerCount = (target, type) => {
		if (!target) return -1;
		const map = registry.get(target);
		return map ? (map.get(type) ?? 0) : 0;
	};
})();`;

const browser = await chromium.launch();
const context = await browser.newContext({
	viewport: { width: 1440, height: 900 },
});
await context.addInitScript(PROBE);
const page = await context.newPage();
const sink = createSink({ name: "main" });
sink.attach(page);

const read = () =>
	page.evaluate(() => ({
		active4000: window.__intervalCount(4000),
		created: window.__runtimeLifecycleProbe.created,
		cleared: window.__runtimeLifecycleProbe.cleared,
		pageLoaded: window.__runtimeLifecycleProbe.pageLoaded,
		path: location.pathname,
	}));

/** 等一帧 colorful:page:loaded：换页完成、页面级 init 都跑过之后再读计数。 */
async function waitForPageLoaded(previous) {
	await page.waitForFunction(
		(expected) => window.__runtimeLifecycleProbe.pageLoaded > expected,
		previous,
		{ timeout: 15000 },
	);
}

const countListeners = (target, type) =>
	page.evaluate(
		([t, ty]) =>
			window.__listenerCount(t === "document" ? document : window[t], ty),
		[target, type],
	);

try {
	await page.goto(`${base}/`, { waitUntil: "load", timeout: 45000 });
	await page.waitForFunction(() => typeof window.swup !== "undefined", null, {
		timeout: 15000,
	});
	await page.waitForSelector('#slider[data-initialized="true"]', {
		timeout: 15000,
	});
	const home = await read();
	check(
		"首页：4000ms interval 恰好 2 条（1 条常驻微言轮播 + 1 条首页轮播）",
		home.active4000 === 2,
		JSON.stringify(home),
	);
	check(
		"首页：轮播已初始化（data-initialized）",
		await page.evaluate(
			() =>
				document.getElementById("slider")?.dataset.initialized ===
				"true",
		),
	);

	// 离开首页到文章页：轮播的 interval 应随首页会话结束被清掉，只剩头部微言那一条。
	await page.evaluate(() => window.swup.navigate("/posts/20260919135000/"));
	await waitForPageLoaded(home.pageLoaded);
	const article = await read();
	check(
		"离开首页：只剩 1 条常驻 interval，轮播那条已清",
		article.active4000 === 1,
		JSON.stringify(article),
	);
	check(
		"离开首页：路径已切换",
		article.path === "/posts/20260919135000/",
		JSON.stringify({ path: article.path }),
	);

	// 记下两个页面级监听基线：字号 click-away 挂在 document，
	// 侧栏 tabs 挂在旧节点上（先把节点引用存到 window，换页后还能读它的监听）。
	await page.evaluate(() => {
		window.__oldTab = document.querySelector("[data-tab]");
	});
	const pointerBefore = await countListeners("document", "pointerdown");
	const tabClickBefore = await countListeners("__oldTab", "click");
	check(
		"文章页：字号 click-away 挂在 document 上（pointerdown ≥ 1）",
		pointerBefore >= 1,
		JSON.stringify({ pointerBefore }),
	);
	check(
		"文章页：侧栏 tab 的 click 监听已挂上",
		tabClickBefore === 1,
		JSON.stringify({ tabClickBefore }),
	);

	// 离开文章页：两条监听都必须真的被摘掉，不是「随着 DOM 一起不可达」。
	await page.evaluate(() => window.swup.navigate("/archive/"));
	await waitForPageLoaded(article.pageLoaded);
	const away = await read();
	const pointerAfter = await countListeners("document", "pointerdown");
	const tabClickAfter = await countListeners("__oldTab", "click");
	check(
		"离开文章页：字号 click-away 监听已解绑（document pointerdown 少 1 条）",
		pointerAfter === pointerBefore - 1,
		JSON.stringify({ pointerBefore, pointerAfter }),
	);
	check(
		"离开文章页：旧侧栏 tab 的 click 监听已解绑",
		tabClickAfter === 0,
		JSON.stringify({ tabClickBefore, tabClickAfter }),
	);
	check(
		"离开文章页：interval 仍是 1 条（文章页没有页面级定时器）",
		away.active4000 === 1,
		JSON.stringify(away),
	);

	// 回到文章页：click-away 仍只有一条，不得累积。
	await page.evaluate(() => window.swup.navigate("/posts/20260919135000/"));
	await waitForPageLoaded(away.pageLoaded);
	const articleAgain = await read();
	const pointerBack = await countListeners("document", "pointerdown");
	check(
		"回到文章页：click-away 只有一条，没有累积",
		pointerBack === pointerBefore,
		JSON.stringify({ pointerBefore, pointerBack }),
	);
	check(
		"回到文章页：interval 仍是 1 条",
		articleAgain.active4000 === 1,
		JSON.stringify(articleAgain),
	);

	// 回到首页：新 DOM 重新初始化，计数应回到 2。
	await page.evaluate(() => window.swup.navigate("/"));
	await waitForPageLoaded(articleAgain.pageLoaded);
	await page.waitForSelector('#slider[data-initialized="true"]', {
		timeout: 15000,
	});
	const back = await read();
	check(
		"回到首页：计数回到 2，没有累积",
		back.active4000 === 2,
		JSON.stringify(back),
	);
	check(
		"回到首页：clearInterval 至少被调用过一次",
		back.cleared > 0,
		JSON.stringify({ cleared: back.cleared, created: back.created }),
	);

	// 异步竞态：3D 云的库加载未完成就离开 /tag/，加载完成后不得留下游离实例。
	// 用路由把脚本请求压住 1.5s，制造「请求在飞、页面已换」的窗口。
	let libRequests = 0;
	await page.route("**/SVG3DTagCloud.global.js", async (route) => {
		libRequests++;
		await new Promise((resolve) => setTimeout(resolve, 1500));
		await route.continue();
	});
	await page.evaluate(() => window.swup.navigate("/tag/"));
	await waitForPageLoaded(back.pageLoaded);
	// 此刻 start() 已把脚本标签插进 head、请求被路由压住；立刻离开
	await page.evaluate(() => window.swup.navigate("/archive/"));
	await waitForPageLoaded(back.pageLoaded + 1);
	await page.waitForTimeout(2200);
	const ghost = await page.evaluate(() => ({
		registry: typeof window.__tagCloud3D,
		svg: document.querySelectorAll(".tag3d-stage svg").length,
	}));
	check(
		"库加载期间离开：不留游离实例（window 注册表为空）",
		ghost.registry === "undefined",
		JSON.stringify(ghost),
	);
	check(
		"库加载期间离开：页面上没有游离 svg",
		ghost.svg === 0,
		JSON.stringify(ghost),
	);
	check(
		"竞态前提：库请求确实被拦住延迟过",
		libRequests === 1,
		JSON.stringify({ libRequests }),
	);

	checkClean("页面级生命周期");
} finally {
	await context.close();
	await browser.close();
}

finish();
