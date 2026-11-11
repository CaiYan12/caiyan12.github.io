// scenario adapter 自身的单测（Phase F3）。
//
// 这一份测的不是挂件行为，而是**桩的可信度**：桩要是会静默空跑、会在场景没建好
// 时给出假读数，两个挂件测试文件的绿就都不可信了。所以这里钉死三件事：
// 1. 未知的选择器 / 事件类型一律抛错，不许静默空转；
// 2. 场景未建立（或已释放）时读取一律失败，不许返回空值冒充「行为正确」；
// 3. 加载上限计时器只结算一次。
//
// 另有一条护栏：adapter 不得长出 `expectSuccess()` 这类复制 implementation 判断的
// 高阶断言——期望必须留在各自的测试里。
import test from "node:test";
import assert from "node:assert/strict";
import { initWallpaperPull } from "./wallpaper-pull";
import {
	createWallpaperScenario,
	currentWallpaperScenario,
} from "./wallpaper-scenario";

test("宿主与 document 上的未知选择器都抛错", () => {
	const scenario = createWallpaperScenario();
	assert.throws(
		() => scenario.host.querySelector(".不存在的选择器"),
		/unexpected selector/,
	);
	assert.throws(
		() =>
			(
				globalThis as unknown as {
					document: { querySelector(s: string): unknown };
				}
			).document.querySelector(".不存在的选择器"),
		/unexpected selector/,
	);
	scenario.dispose();
});

test("派发到没有监听器的事件类型抛错：场景未初始化就不许假装派发过", () => {
	const scenario = createWallpaperScenario();
	// 还没 initWallpaperPull：按钮上没有任何监听器
	assert.throws(() => scenario.click({ detail: 1 }), /没有 "click" 的监听器/);
	assert.throws(() => scenario.pressEscape(), /没有 "keydown" 的监听器/);
	assert.throws(() => scenario.blurWindow(), /没有 "blur" 的监听器/);
	scenario.dispose();
});

test("场景未建立时读取当前场景抛错；释放后读观测与派发也抛错", () => {
	assert.throws(() => currentWallpaperScenario(), /场景尚未建立/);

	const scenario = createWallpaperScenario();
	assert.doesNotThrow(() => currentWallpaperScenario());

	scenario.dispose();
	assert.throws(() => currentWallpaperScenario(), /场景尚未建立/);
	assert.throws(() => scenario.backgroundSrc, /场景已释放/);
	assert.throws(() => scenario.click({ detail: 1 }), /场景已释放/);
});

test("加载上限计时器只结算一次：打过就从登记里移除", async () => {
	const scenario = createWallpaperScenario();
	let fired = 0;
	// 直接走桩装的 setTimeout：delay ≥ 5000 会被登记而不调度
	globalThis.setTimeout(() => {
		fired += 1;
	}, 12000);

	await scenario.fireLoadTimeouts();
	assert.equal(fired, 1, "登记的计时器应当被打一次");

	await assert.rejects(
		() => scenario.fireLoadTimeouts(),
		/没有已登记的加载上限计时器/,
	);
	assert.equal(fired, 1, "同一个计时器不得被结算两次");
	scenario.dispose();
});

test("没有候选预载时结束预载抛错：未消费的预载不许静默通过", async () => {
	const scenario = createWallpaperScenario();
	await assert.rejects(
		() => scenario.finishLastPreload(true),
		/没有可结束的候选预载/,
	);
	scenario.dispose();
});

test("候选预载的请求地址与次数被记录（忙碌锁的唯一外部证据）", async () => {
	const scenario = createWallpaperScenario();
	initWallpaperPull();

	scenario.click({ detail: 1, timeStamp: 100 });
	await scenario.flush();

	assert.equal(scenario.attemptCount, 1);
	assert.equal(scenario.requestedUrls.length, 1);
	assert.notEqual(
		scenario.requestedUrls[0],
		scenario.backgroundSrc,
		"请求的候选不得是当前正在看的那张",
	);
	scenario.dispose();
});

test("adapter 不提供 expectSuccess 之类的高阶断言：期望必须留在各自测试里", () => {
	const scenario = createWallpaperScenario();
	const offending = Object.keys(scenario).filter((key) =>
		/^(expect|assert|should)/i.test(key),
	);
	assert.deepEqual(offending, [], "adapter 只提供操作与观测");
	scenario.dispose();
});

test("没有候选预载时派发事件抛错；下标越界也抛错", async () => {
	const scenario = createWallpaperScenario();
	assert.throws(
		() => scenario.firePreloadEvent("load"),
		/没有第 -1 次候选预载/,
	);

	initWallpaperPull();
	scenario.click({ detail: 1, timeStamp: 100 });
	await scenario.flush();

	assert.equal(scenario.preloadImageCount(), 1);
	assert.throws(
		() => scenario.firePreloadEvent("load", undefined, 5),
		/没有第 5 次候选预载/,
	);
	scenario.dispose();
});

test("decode 结局可配置，默认仍是「被拒」；处理器数量可观测", async () => {
	const scenario = createWallpaperScenario();
	initWallpaperPull();
	scenario.click({ detail: 1, timeStamp: 100 });
	await scenario.flush();

	// 预载进行中：处理器挂着
	assert.equal(scenario.preloadHandlersAttached(0), true);

	// 默认 decode 被拒：图片「无固有尺寸」时判失败
	scenario.firePreloadEvent("load", 0);
	await scenario.flush();
	assert.equal(
		scenario.preloadHandlersAttached(0),
		false,
		"结算后这一次预载的处理器应被摘掉（总数不会归零：失败后会立刻起下一次预载）",
	);
	assert.equal(
		scenario.preloadHandlersAttached(-1),
		true,
		"新起的那一次预载仍应挂着处理器",
	);
	scenario.dispose();

	const resolved = createWallpaperScenario({ decodeOutcome: "resolve" });
	initWallpaperPull();
	resolved.click({ detail: 1, timeStamp: 100 });
	await resolved.flush();
	resolved.firePreloadEvent("load", 1200);
	await resolved.flush();
	// decode 兑现 + 有固有尺寸 → 换图成功（背景不再是初始那张）
	assert.notEqual(
		resolved.backgroundSrc,
		"https://example.test/images/bg/a.jpg",
		"decode 兑现且有固有尺寸时应当换图成功",
	);
	resolved.dispose();
});
