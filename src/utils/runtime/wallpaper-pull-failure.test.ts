// 换图失败与边界的单测（票 #132 T5）。
//
// 缝隙：挂件运行时的换图事务——给定「当前背景 + 壁纸池 + 加载结局」，
// 外部可观察的结果只有四件事：
//   1. `.bg-image` 的 src 有没有变（失败时票面要求**保持不变**）；
//   2. 播报区写了哪个结果词（成功 / 没得换 / 加载失败 三档各不相同）；
//   3. 衣服有没有**摇头**（非颜色反馈，落在宿主的 class 上）；
//   4. 忙碌锁有没有解除——唯一可观察证据是「还能不能再开一笔事务」。
//
// 为什么非测不可（票面原文）：失败路径如果漏了解锁，挂件就永久失灵；
// 若把所有候选都重试一遍，弱网下会变成无限重试；超时若不解锁，弱网永久卡住。
//
// 口径：DOM / 事件 / 计时器 / Image 桩统一来自 `wallpaper-scenario.ts`
// （Phase F3 的 scenario adapter，与 interaction 那份共用）；不 sleep 等真实
// 超时——超时由「捕获被登记的那个上限计时器并触发它」定义，不依赖墙上时间。
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { initWallpaperPull } from "./wallpaper-pull";
import {
	WALLPAPER_POOL,
	createWallpaperScenario,
	wallpaperUrl,
	type WallpaperScenario,
	type WallpaperScenarioOptions,
} from "./wallpaper-scenario";

/** 当前场景（每个用例自己建，afterEach 统一释放） */
let active: WallpaperScenario | null = null;

/** 建场景并记住它：重复调用会先释放上一个 */
function useScenario(options?: WallpaperScenarioOptions): WallpaperScenario {
	active?.dispose();
	active = createWallpaperScenario(options);
	return active;
}

afterEach(() => {
	active?.dispose();
	active = null;
});

/** 取第 n 次（默认第一次）预载请求的地址 */
function firstRequestedUrl(scenario: WallpaperScenario, index = 0): string {
	const requested = scenario.requestedUrls;
	const at = index < 0 ? requested.length + index : index;
	const url = requested[at];
	assert.ok(url, `应当存在第 ${at} 次候选请求`);
	return url;
}

// ---- 候选失败 → 换用尚未尝试过的候选 ----

test("某个候选失败时改用尚未尝试过的候选，换成功后播报「换好了」", async () => {
	const scenario = useScenario();
	scenario.setRandom(() => 0.2);
	initWallpaperPull();

	const before = scenario.backgroundSrc;
	scenario.click({ detail: 1, timeStamp: 100 });
	await scenario.flush();
	assert.equal(scenario.attemptCount, 1, "先只试一个候选");

	// 记下第一次被尝试的候选（顺序是随机打乱的，测试不假设是哪一张）
	const first = firstRequestedUrl(scenario);
	assert.notEqual(first, before, "第一个尝试的必须是当前图以外的候选");

	// 第一张加载失败
	await scenario.finishLastPreload(false);
	assert.equal(
		scenario.backgroundSrc,
		before,
		"第一张失败时背景必须原样不动",
	);
	assert.equal(scenario.attemptCount, 2, "应当换用下一个候选");

	// 第二次尝试必须是**另一个**候选（票面：换用尚未尝试过的候选）
	const second = firstRequestedUrl(scenario, -1);
	assert.notEqual(second, first, "不得回头重试已经失败过的那个候选");

	// 第二张可用
	await scenario.finishLastPreload(true);
	assert.equal(
		scenario.backgroundSrc,
		second,
		"失败候选跳过后，落到第二张可用候选的地址",
	);
	assert.equal(scenario.announcement, "换好了");
});

test("每个候选只试一次、不无限重试：全部失败时尝试次数恰好等于候选数", async () => {
	const scenario = useScenario();
	scenario.setRandom(() => 0.2);
	initWallpaperPull();

	scenario.click({ detail: 1, timeStamp: 100 });
	await scenario.failAllPreloads();

	assert.equal(
		scenario.attemptCount,
		WALLPAPER_POOL.length - 1,
		"候选只有两张（当前图被排除），最多只能试两次",
	);
	assert.equal(scenario.announcement, "加载失败");
});

test("全部候选失败：背景保持不变，播报「加载失败」", async () => {
	const scenario = useScenario();
	scenario.setRandom(() => 0.2);
	initWallpaperPull();

	const before = scenario.backgroundSrc;
	scenario.click({ detail: 1, timeStamp: 100 });
	await scenario.failAllPreloads();

	assert.equal(scenario.backgroundSrc, before, "全部失败也不得破坏当前背景");
	assert.equal(scenario.announcement, "加载失败");
});

// ---- 超时 ----

test("超时按失败处理：背景不变、播报「加载失败」，且**解除忙碌**可再试", async () => {
	const scenario = useScenario();
	scenario.setRandom(() => 0.2);
	initWallpaperPull();

	const before = scenario.backgroundSrc;
	scenario.click({ detail: 1, timeStamp: 100 });
	await scenario.flush();

	// 弱网：不给 onload / onerror，只让加载上限到点
	await scenario.fireLoadTimeouts();
	await scenario.fireLoadTimeouts();

	assert.equal(scenario.backgroundSrc, before, "超时不得把背景改成任何地址");
	assert.equal(
		scenario.announcement,
		"加载失败",
		"超时对访客就是「加载失败」",
	);

	// 忙碌锁必须被超时路径解除：能再开一笔事务
	const pendingBefore = scenario.attemptCount;
	scenario.click({ detail: 1, timeStamp: 5000 });
	await scenario.flush();
	assert.equal(
		scenario.attemptCount,
		pendingBefore + 1,
		"超时之后控件必须恢复可用",
	);
});

// ---- 四条路径都解锁 ----

test("成功路径解除忙碌：换好之后还能再换一次", async () => {
	const scenario = useScenario();
	scenario.setRandom(() => 0.2);
	initWallpaperPull();

	scenario.click({ detail: 1, timeStamp: 100 });
	await scenario.flush();
	await scenario.finishLastPreload(true);
	assert.equal(scenario.announcement, "换好了");

	scenario.click({ detail: 1, timeStamp: 900 });
	await scenario.flush();
	assert.equal(
		scenario.attemptCount,
		WALLPAPER_POOL.length - 1,
		"成功之后必须能再开一笔事务",
	);
});

test("无候选路径解除忙碌：没得换之后，池子变大仍能换", async () => {
	const scenario = useScenario({
		pool: [WALLPAPER_POOL[0]!],
		current: wallpaperUrl(WALLPAPER_POOL[0]!),
	});
	initWallpaperPull();

	scenario.click({ detail: 1, timeStamp: 100 });
	await scenario.flush();
	assert.equal(scenario.announcement, "没得换");
	assert.equal(scenario.attemptCount, 0, "没候选不该发起预载");

	// 模拟池子在会话中途变大（配置热更新 / data 属性被改写）
	scenario.setRandom(() => 0);
	scenario.setPool(WALLPAPER_POOL);
	scenario.click({ detail: 1, timeStamp: 900 });
	await scenario.flush();
	assert.equal(scenario.attemptCount, 1, "无候选之后控件必须恢复可用");
});

test("失败路径解除忙碌：加载失败之后还能再试（票面故事 25）", async () => {
	const scenario = useScenario();
	scenario.setRandom(() => 0.2);
	initWallpaperPull();

	scenario.click({ detail: 1, timeStamp: 100 });
	await scenario.failAllPreloads();
	assert.equal(scenario.announcement, "加载失败");

	const pendingBefore = scenario.attemptCount;
	scenario.click({ detail: 1, timeStamp: 900 });
	await scenario.flush();
	assert.equal(
		scenario.attemptCount,
		pendingBefore + 1,
		"失败之后控件必须恢复可用",
	);
	await scenario.finishLastPreload(true);
	assert.equal(scenario.announcement, "换好了");
});

// ---- 非颜色反馈：衣服短摇头 ----

test("加载失败时衣服摇头一次（非颜色反馈）", async () => {
	const scenario = useScenario();
	scenario.setRandom(() => 0.2);
	initWallpaperPull();

	scenario.click({ detail: 1, timeStamp: 100 });
	await scenario.failAllPreloads();

	assert.ok(
		scenario.classesAdded.includes("is-shaking"),
		"失败必须给出非颜色反馈（衣服摇头）",
	);
});

test("「没得换」与「加载失败」共用同一个摇头反馈", async () => {
	const scenario = useScenario({
		pool: [WALLPAPER_POOL[0]!],
		current: wallpaperUrl(WALLPAPER_POOL[0]!),
	});
	initWallpaperPull();

	scenario.click({ detail: 1, timeStamp: 100 });
	await scenario.flush();

	assert.equal(scenario.announcement, "没得换");
	assert.ok(
		scenario.classesAdded.includes("is-shaking"),
		"没得换也要摇头——与加载失败共用同一个非颜色反馈",
	);
});

test("成功换图不摇头：反馈只属于「没换成」的两档", async () => {
	const scenario = useScenario();
	scenario.setRandom(() => 0.2);
	initWallpaperPull();

	scenario.click({ detail: 1, timeStamp: 100 });
	await scenario.flush();
	await scenario.finishLastPreload(true);

	assert.equal(
		scenario.classesAdded.includes("is-shaking"),
		false,
		"成功只靠回弹与背景变化表达，不摇头",
	);
});

test("减少动态时不摇头，但播报照旧（信息通道不砍）", async () => {
	const scenario = useScenario({ reducedMotion: true });
	scenario.setRandom(() => 0.2);
	initWallpaperPull();

	scenario.click({ detail: 1, timeStamp: 100 });
	await scenario.failAllPreloads();

	assert.equal(
		scenario.classesAdded.includes("is-shaking"),
		false,
		"开了减少动态就不许摇",
	);
	assert.equal(scenario.announcement, "加载失败", "减少动态下结果仍要播报");
});

test("减少动态下「没得换」也不摇头，但播报照旧（三类结果都靠播报区）", async () => {
	const scenario = useScenario({
		reducedMotion: true,
		pool: [WALLPAPER_POOL[0]!],
		current: wallpaperUrl(WALLPAPER_POOL[0]!),
	});
	initWallpaperPull();

	scenario.click({ detail: 1, timeStamp: 100 });
	await scenario.flush();

	assert.equal(
		scenario.classesAdded.includes("is-shaking"),
		false,
		"两档「没换成」在减少动态下都跳过摇头（前庭风险）",
	);
	assert.equal(
		scenario.announcement,
		"没得换",
		"视觉反馈被去掉后，播报区是唯一的信息通道，不能少",
	);
});

test("减少动态是每次调用即时查询：会话中途打开偏好，下一次失败立即不摇头", async () => {
	const scenario = useScenario({
		pool: [WALLPAPER_POOL[0]!],
		current: wallpaperUrl(WALLPAPER_POOL[0]!),
	});
	initWallpaperPull();

	// 偏好关闭：正常摇头
	scenario.click({ detail: 1, timeStamp: 100 });
	await scenario.flush();
	assert.equal(scenario.announcement, "没得换");
	assert.ok(scenario.classesAdded.includes("is-shaking"), "偏好关闭时必须摇");

	// 用户中途改了系统设置（没有重新初始化、没有重新加载页面）
	scenario.setReducedMotion(true);
	// 清空已记录的类名，只看这一轮
	scenario.classesAdded.length = 0;

	// 同一句话再播一次也要能被重新播报（播报区不是一次性写入）
	scenario.click({ detail: 1, timeStamp: 900 });
	await scenario.flush();

	assert.equal(
		scenario.classesAdded.includes("is-shaking"),
		false,
		"模块级缓存或一次性闭包会让这里仍然摇头",
	);
	assert.equal(scenario.announcement, "没得换", "降级后播报照常");
});

// ---- 无候选与失败是不同的结果 ----

test("无候选与加载失败是两个不同结果（不同播报词），但反馈共用摇头", async () => {
	// 无候选：池里只有当前这张
	let scenario = useScenario({
		pool: [WALLPAPER_POOL[0]!],
		current: wallpaperUrl(WALLPAPER_POOL[0]!),
	});
	initWallpaperPull();
	scenario.click({ detail: 1, timeStamp: 100 });
	await scenario.flush();
	const noneText = scenario.announcement;
	const noneShook = scenario.classesAdded.includes("is-shaking");

	// 加载失败：有候选但都加载不出来
	scenario = useScenario();
	scenario.setRandom(() => 0.2);
	initWallpaperPull();
	scenario.click({ detail: 1, timeStamp: 100 });
	await scenario.failAllPreloads();
	const failedText = scenario.announcement;
	const failedShook = scenario.classesAdded.includes("is-shaking");

	assert.equal(noneText, "没得换");
	assert.equal(failedText, "加载失败");
	assert.notEqual(noneText, failedText, "两档结果必须能被区分开");
	assert.equal(noneShook, true);
	assert.equal(failedShook, true, "两档共用同一个摇头反馈");
});
