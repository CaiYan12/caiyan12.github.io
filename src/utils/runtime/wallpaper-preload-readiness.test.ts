// 候选预载事务的「可画判定」行为矩阵（Phase F5.1）。
//
// 缝隙：`preloadCandidate`（`src/utils/runtime/wallpaper-pull.ts`）这条预载事务的
// **结算知识**散在四个地方：decode 什么时候问、什么时候算可画、什么时候只结算一次、
// 结算后要把什么清掉。这些知识决定了三件外部可见的事：
//   1. 结局词：换好了 / 加载失败（超时也按失败处理）；
//   2. 背景有没有换；
//   3. 迟到的事件会不会把已经定案的结局翻掉。
//
// 为什么非测不可：F5 要把这条事务与提交事务的共同部分抽成一个内部 module；
// 抽之前得先把「当前行为」逐行钉住，否则抽完无从判断等价性。矩阵的行号与
// `output/architecture-2026-11-10/F5.1/behavior-matrix.md` 一一对应。
//
// 口径：DOM / 事件 / 计时器 / Image 桩统一来自 `wallpaper-scenario.ts`；
// 不 sleep 等真实超时——超时由「捕获被登记的那个上限计时器并触发它」定义。
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { initWallpaperPull } from "./wallpaper-pull";
import {
	createWallpaperScenario,
	type WallpaperScenario,
	type WallpaperScenarioOptions,
} from "./wallpaper-scenario";

/** 当前场景（每个用例自己建，afterEach 统一释放） */
let active: WallpaperScenario | null = null;

function useScenario(options?: WallpaperScenarioOptions): WallpaperScenario {
	active?.dispose();
	active = createWallpaperScenario(options);
	return active;
}

afterEach(() => {
	active?.dispose();
	active = null;
});

/** 起一笔换图事务：单击挂件，返回换图前的背景地址 */
async function startChange(scenario: WallpaperScenario): Promise<string> {
	scenario.setRandom(() => 0.2);
	initWallpaperPull();
	const before = scenario.backgroundSrc;
	scenario.click({ detail: 1, timeStamp: 100 });
	await scenario.flush();
	return before;
}

// ---- 矩阵 #1：decode 兑现时的判据 ----

test("矩阵 #1：decode 兑现即算可画，换图成功", async () => {
	const scenario = useScenario({ decodeOutcome: "resolve" });
	const before = await startChange(scenario);
	assert.equal(scenario.attemptCount, 1, "先只试一个候选");

	await scenario.finishLastPreload(true);

	assert.notEqual(
		scenario.backgroundSrc,
		before,
		"decode 兑现后应当换到新图",
	);
	assert.equal(scenario.announcement, "换好了");
});

test("矩阵 #1：decode 兑现也不等于可画——没有固有尺寸照样判失败", async () => {
	const scenario = useScenario({ decodeOutcome: "resolve" });
	const before = await startChange(scenario);

	// load 事件到了，但图片没有固有尺寸
	scenario.firePreloadEvent("load", 0);
	await scenario.flush();

	assert.equal(
		scenario.backgroundSrc,
		before,
		"decode 兑现也不能绕开「加载完成 + 固有尺寸」这条判据",
	);
	assert.equal(scenario.attemptCount, 2, "判失败后应当换用下一个候选");
});

// ---- 矩阵 #6 / #7：迟到的事件不得翻案 ----

test("矩阵 #6：超时结算之后才到的 load 不得把结局翻成成功", async () => {
	const scenario = useScenario();
	const before = await startChange(scenario);

	await scenario.fireLoadTimeouts();
	assert.equal(scenario.attemptCount, 2, "超时后应当换用下一个候选");

	// 迟到的是**刚超时结算的那一次**（倒数第二张），不是新起的那次
	const timedOut = scenario.preloadImageCount() - 2;
	scenario.firePreloadEvent("load", undefined, timedOut);
	await scenario.flush();

	assert.equal(
		scenario.backgroundSrc,
		before,
		"迟到的 load 不得把已定案的超时翻成成功",
	);
});

test("矩阵 #7：成功结算之后才到的 error 不得把结局翻成失败", async () => {
	const scenario = useScenario();
	const before = await startChange(scenario);

	await scenario.finishLastPreload(true);
	const after = scenario.backgroundSrc;
	assert.notEqual(after, before, "预应当已经换图成功");

	scenario.firePreloadEvent("error");
	await scenario.flush();

	assert.equal(
		scenario.backgroundSrc,
		after,
		"迟到的 error 不得把成功翻成失败",
	);
	assert.equal(scenario.announcement, "换好了");
});

// ---- 矩阵 #8：只结算一次 ----

test("矩阵 #8：两个信号先后到，结果只由第一次结算决定", async () => {
	const scenario = useScenario();
	const before = await startChange(scenario);

	// 同步连发：先 error（同步结算），再 load（此时处理器已被摘掉）
	scenario.firePreloadEvent("error");
	scenario.firePreloadEvent("load");
	await scenario.flush();

	assert.equal(
		scenario.backgroundSrc,
		before,
		"后到的信号不得把第一次结算的结果翻掉",
	);
	assert.equal(scenario.attemptCount, 2, "判失败后只应当换用下一个候选");
});

// ---- 矩阵 #9：监听与计时器清理 ----

test("矩阵 #9：结算之后 load/error 处理器被摘掉", async () => {
	const scenario = useScenario();
	await startChange(scenario);

	assert.equal(
		scenario.preloadHandlersAttached(0),
		true,
		"预载进行中应当挂着 load/error 处理器",
	);

	await scenario.finishLastPreload(true);

	assert.equal(
		scenario.preloadHandlersAttached(0),
		false,
		"结算之后不得再留着处理器，否则迟到的事件还会打到已定案的结局上",
	);
});
