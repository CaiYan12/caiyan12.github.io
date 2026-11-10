// 挂件换图事务的单测（票 #129）。
//
// 缝隙：运行时模块的事件入口——给定「当前背景 + 壁纸池 + 一个激活事件」，
// 外部可观察的结果是：`.bg-image` 的 src 有没有换、换成哪张、播报区写了什么词、
// 以及**共开了几次候选预载**（忙碌锁的唯一可观察证据）。
//
// 为什么非测不可（票面原文）：拖动释放与随后的 click 必须区分开，而键盘产生的
// 合成 click（`event.detail === 0`）必须放行——use-gesture #530 与 pullcord
// 两家独立实现都在这里栽过，一次手势换两次图。
//
// 口径：DOM / 事件 / 计时器 / Image 桩统一来自 `wallpaper-scenario.ts`
// （Phase F3 的 scenario adapter，与 failure 那份共用）；Math.random 打桩，
// 不 wait 固定毫秒、不读内部变量；等待的是「候选预载已结束」这个真实信号。
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { initWallpaperPull } from "./wallpaper-pull";
import { PULL_THRESHOLD } from "../wallpaper-pull-drag";
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

// ---- 正路径：单击换到另一张 ----

test("单击换图：背景换成池里另一张，并播报「换好了」", async () => {
	const scenario = useScenario();
	scenario.setRandom(() => 0.2); // 当前图被排除后候选只剩两张，0.2 落在第一张 b
	initWallpaperPull();

	const before = scenario.backgroundSrc;
	scenario.click({ detail: 1, timeStamp: 100 });
	await scenario.flush();

	// 先确认可用、再提交：候选还没结束，src 必须原地不动
	assert.equal(
		scenario.backgroundSrc,
		before,
		"候选未确认前不得改动当前背景",
	);

	await scenario.finishLastPreload(true);

	assert.equal(
		scenario.backgroundSrc,
		wallpaperUrl(WALLPAPER_POOL[1]!),
		"确认可用后才提交候选地址",
	);
	assert.equal(scenario.announcement, "换好了");
});

test("换到的图一定不是当前这张（当前看第 3 张，随机值指向它也不许选它）", async () => {
	const scenario = useScenario({
		current: wallpaperUrl(WALLPAPER_POOL[2]!),
	});
	scenario.setRandom(() => 0.9); // 最大档；若没排除当前图就正好落到当前这张
	initWallpaperPull();

	scenario.click({ detail: 1, timeStamp: 100 });
	await scenario.flush();
	await scenario.finishLastPreload(true);

	assert.notEqual(
		scenario.backgroundSrc,
		wallpaperUrl(WALLPAPER_POOL[2]!),
		"不得换到当前正在看的那张",
	);
	assert.ok(
		WALLPAPER_POOL.map(wallpaperUrl).includes(scenario.backgroundSrc),
		"换到的必须来自既有壁纸池",
	);
});

// ---- 无候选 ----

test("只有当前这一张时播报「没得换」，背景不变、也不预载任何图", async () => {
	const scenario = useScenario({
		pool: [WALLPAPER_POOL[1]!],
		current: wallpaperUrl(WALLPAPER_POOL[1]!),
	});
	initWallpaperPull();

	scenario.click({ detail: 1, timeStamp: 100 });
	await scenario.flush();

	assert.equal(scenario.backgroundSrc, wallpaperUrl(WALLPAPER_POOL[1]!));
	assert.equal(scenario.announcement, "没得换");
	assert.equal(scenario.attemptCount, 0, "没候选时不该去预载任何图");
});

test("壁纸池为空时也播报「没得换」，不写任何地址", async () => {
	const scenario = useScenario({ pool: [], current: "" });
	initWallpaperPull();

	scenario.click({ detail: 1, timeStamp: 100 });
	await scenario.flush();

	assert.equal(scenario.backgroundSrc, "", "空池不该被写进任何地址");
	assert.equal(scenario.announcement, "没得换");
	assert.equal(scenario.attemptCount, 0);
});

// ---- 加载失败 ----

test("候选加载失败：背景保持原样、播报「加载失败」，之后还能再试", async () => {
	const scenario = useScenario();
	scenario.setRandom(() => 0.2);
	initWallpaperPull();

	const before = scenario.backgroundSrc;
	scenario.click({ detail: 1, timeStamp: 100 });
	await scenario.flush();
	// 票 #132：单个候选失败不再立即收口，而是换用尚未尝试过的候选；
	// 「加载失败」要等**全部候选都用尽**才播报。池里共 3 张、排除当前图后
	// 只剩 2 个候选，所以要把两次都失败掉，事务才结算。
	await scenario.finishLastPreload(false);
	await scenario.flush();
	assert.equal(scenario.attemptCount, 2, "第一个候选失败后应换用下一个候选");
	await scenario.finishLastPreload(false);

	assert.equal(scenario.backgroundSrc, before, "失败不得破坏当前背景");
	assert.equal(scenario.announcement, "加载失败");

	// 失败路径也必须在 finally 里解锁：再触发仍能发起新事务
	scenario.click({ detail: 1, timeStamp: 500 });
	await scenario.flush();
	assert.equal(
		scenario.attemptCount,
		3,
		"失败之后控件必须恢复可用（忙碌锁要覆盖失败路径）",
	);
	await scenario.finishLastPreload(true);
	assert.equal(scenario.backgroundSrc, wallpaperUrl(WALLPAPER_POOL[1]!));
	assert.equal(scenario.announcement, "换好了");
});

// ---- 忙碌锁 ----

test("忙碌锁：一次事务完成前重复触发不产生第二次提交", async () => {
	const scenario = useScenario();
	scenario.setRandom(() => 0.2);
	initWallpaperPull();

	scenario.click({ detail: 1, timeStamp: 100 });
	await scenario.flush();
	// 候选仍在加载（未 resolve），此刻连开三枪（含键盘 Space）
	scenario.click({ detail: 1, timeStamp: 200 });
	scenario.click({ detail: 1, timeStamp: 300 });
	scenario.keyDown({ key: " ", timeStamp: 400 });
	await scenario.flush();

	assert.equal(scenario.attemptCount, 1, "忙碌期间只允许一次事务");
	await scenario.finishLastPreload(true);
	assert.equal(scenario.announcement, "换好了");
});

// ---- 键盘 ----

test("Space 激活：preventDefault（不顺带滚页）且换图一次", async () => {
	const scenario = useScenario();
	scenario.setRandom(() => 0.2);
	initWallpaperPull();

	const space = scenario.keyDown({
		key: " ",
		timeStamp: 100,
	});
	assert.equal(
		space.defaultPrevented,
		true,
		"Space 必须 preventDefault，否则会滚页",
	);
	await scenario.flush();
	await scenario.finishLastPreload(true);

	assert.equal(scenario.backgroundSrc, wallpaperUrl(WALLPAPER_POOL[1]!));
});

test("Space 长按的自动重复不叠加请求（仍 preventDefault）", async () => {
	const scenario = useScenario();
	scenario.setRandom(() => 0.2);
	initWallpaperPull();

	scenario.keyDown({ key: " ", timeStamp: 100 });
	await scenario.flush();
	const autoRepeat = scenario.keyDown({
		key: " ",
		timeStamp: 200,
		repeat: true,
	});
	assert.equal(autoRepeat.defaultPrevented, true);
	await scenario.flush();

	assert.equal(scenario.attemptCount, 1);
	await scenario.finishLastPreload(true);
});

test("键盘合成 click（detail === 0）放行：紧跟拖动释放也不被误伤", async () => {
	const scenario = useScenario();
	scenario.setRandom(() => 0.2);
	initWallpaperPull();

	// 模拟 T3：刚有一次拖动释放在时刻 100
	scenario.noteDragRelease(100);

	// Enter 产生的合成 click：detail === 0、只差 2ms —— 必须照样换图
	scenario.click({ detail: 0, timeStamp: 102 });
	await scenario.flush();
	await scenario.finishLastPreload(true);

	assert.equal(
		scenario.backgroundSrc,
		wallpaperUrl(WALLPAPER_POOL[1]!),
		"键盘点击不得被拖动后的 click 抑制逻辑误伤",
	);
	assert.equal(scenario.announcement, "换好了");
});

test("拖动释放后浏览器补发的 click（detail >= 1）被抑制，一次手势只换一次", async () => {
	const scenario = useScenario();
	scenario.setRandom(() => 0.2);
	initWallpaperPull();

	scenario.noteDragRelease(100);
	scenario.click({ detail: 1, timeStamp: 104 });
	await scenario.flush();

	assert.equal(
		scenario.attemptCount,
		0,
		"拖动已经换过图，补发的 click 不得再开一笔事务",
	);
	assert.equal(scenario.backgroundSrc, wallpaperUrl(WALLPAPER_POOL[0]!));

	// 抑制窗口过了之后的真实单击必须照常工作（不许留下陈旧的抑制标志）
	scenario.click({ detail: 1, timeStamp: 800 });
	await scenario.flush();
	assert.equal(scenario.attemptCount, 1, "窗口外的单击必须放行");
	await scenario.finishLastPreload(true);
	assert.equal(scenario.backgroundSrc, wallpaperUrl(WALLPAPER_POOL[1]!));
});

// ---- T7（票 #134）：减少动态降级 ----
//
// 降级不是「砍功能」：手势照常识别、阈值照常判定、播报照常写；被去掉的只有
// **位移与渐变**（跟手位移、弹性回弹、交叉淡入、摇头）。这一组用例把这条边界钉死，
// 其中「即时查询」那条守着 reduced-motion.ts 的核心语义——判定不许被缓存。

test("减少动态：拖拽全程 --wpull-pull 恒为 0px，绳子也不跟着伸长", async () => {
	const scenario = useScenario({ reducedMotion: true });
	initWallpaperPull();

	scenario.drag(1, 120);
	await scenario.settleFrame();

	assert.equal(
		scenario.styleProps["--wpull-pull"],
		"0px",
		"跟手位移本身就是位移，减少动态下一律为 0",
	);
	assert.equal(
		scenario.styleProps["--wpull-rope-scale"],
		"1",
		"衣服不动，绳子也不该被拉长（两者同一来源）",
	);
});

test("减少动态：松手不做弹性回弹（不挂回弹过渡类），直接归位", async () => {
	const scenario = useScenario({ reducedMotion: true });
	initWallpaperPull();

	scenario.drag(1, 120);
	await scenario.settleFrame();
	scenario.release(1);
	await scenario.settleFrame();

	assert.equal(
		scenario.classesAdded.includes("is-settling"),
		false,
		"没有位移就没有「弹回去」，不该进入回弹过渡",
	);
	assert.equal(scenario.styleProps["--wpull-pull"], "0px");
});

test("减少动态：拖动达阈值松手**仍然换图**（阈值判定与选择逻辑不降级）", async () => {
	const scenario = useScenario({ reducedMotion: true });
	scenario.setRandom(() => 0.2);
	initWallpaperPull();

	scenario.drag(1, 120);
	await scenario.settleFrame();
	scenario.release(1);
	await scenario.flush();
	await scenario.finishLastPreload(true);

	assert.equal(
		scenario.backgroundSrc,
		wallpaperUrl(WALLPAPER_POOL[1]!),
		"视觉降级不得顺手把功能也降级掉",
	);
	assert.equal(scenario.announcement, "换好了");
});

test("减少动态：单击仍走完整换图流程并播报「换好了」", async () => {
	const scenario = useScenario({ reducedMotion: true });
	scenario.setRandom(() => 0.2);
	initWallpaperPull();

	scenario.click({ detail: 1, timeStamp: 100 });
	await scenario.flush();
	// 与常规路径同一份契约：先确认候选可用，再提交
	assert.equal(scenario.backgroundSrc, wallpaperUrl(WALLPAPER_POOL[0]!));
	await scenario.finishLastPreload(true);

	assert.equal(scenario.backgroundSrc, wallpaperUrl(WALLPAPER_POOL[1]!));
	assert.equal(scenario.announcement, "换好了");
});

test("减少动态：Space 与 Enter 都仍能换图（键盘路径不砍）", async () => {
	const scenario = useScenario({ reducedMotion: true });
	scenario.setRandom(() => 0.2);
	initWallpaperPull();

	// Space：keydown 自行触发（并 preventDefault 掉滚页）
	const space = scenario.keyDown({
		key: " ",
		timeStamp: 100,
	});
	assert.equal(space.defaultPrevented, true);
	await scenario.flush();
	await scenario.finishLastPreload(true);
	assert.equal(scenario.backgroundSrc, wallpaperUrl(WALLPAPER_POOL[1]!));

	// Enter：浏览器补发的合成 click（detail === 0）照常放行
	scenario.clearDragRelease();
	scenario.click({ detail: 0, timeStamp: 900 });
	await scenario.flush();
	assert.equal(
		scenario.attemptCount,
		2,
		"Enter 产生的合成 click 必须仍然发起事务",
	);
	await scenario.finishLastPreload(true);
	assert.equal(scenario.announcement, "换好了");
});

test("减少动态是每次调用即时查询：会话中途打开偏好，下一次手势立即不跟手", async () => {
	const scenario = useScenario();
	initWallpaperPull();

	// 偏好关闭时：正常跟手
	scenario.drag(1, 60);
	await scenario.settleFrame();
	assert.equal(scenario.styleProps["--wpull-pull"], "60px");
	scenario.release(1);
	await scenario.settleFrame();

	// 用户中途改了系统设置（不重新初始化、不重新加载页面）
	scenario.setReducedMotion(true);

	scenario.drag(2, 60);
	await scenario.settleFrame();
	assert.equal(
		scenario.styleProps["--wpull-pull"],
		"0px",
		"判定必须即时查询；模块级缓存或一次性闭包会让这里仍然写出 60px",
	);
});

// ---- 幂等与不预取整池 ----

test("重复初始化不重复绑定（dataset 守卫），一次单击只开一笔事务", async () => {
	const scenario = useScenario();
	scenario.setRandom(() => 0.2);
	initWallpaperPull();
	initWallpaperPull();
	initWallpaperPull();

	scenario.click({ detail: 1, timeStamp: 100 });
	await scenario.flush();

	assert.equal(scenario.attemptCount, 1, "重入三次也只该有一次事务");
	await scenario.finishLastPreload(true);
	assert.equal(scenario.announcement, "换好了");
});

test("首次加载不预取整个壁纸池：没触发就一次预载都没有", async () => {
	const scenario = useScenario();
	initWallpaperPull();
	await scenario.flush();

	assert.equal(
		scenario.attemptCount,
		0,
		"挂件初始化不得预载壁纸池（首屏只保留既有那一张）",
	);
});
// ---- T3（票 #130）：下拉拖拽与回弹 ----

test("拉到阈值以上松手：换图一次，走的是同一个 requestChange 入口", async () => {
	const scenario = useScenario();
	scenario.setRandom(() => 0.2);
	initWallpaperPull();

	scenario.drag(1, 120);
	await scenario.flush();
	scenario.release(1);
	await scenario.flush();
	await scenario.finishLastPreload(true);

	assert.equal(
		scenario.backgroundSrc,
		wallpaperUrl(WALLPAPER_POOL[1]!),
		"达到阈值松手应当换图",
	);
	assert.equal(scenario.announcement, "换好了");
});

test("未达阈值松手：只回弹，不换图、不预载", async () => {
	const scenario = useScenario();
	initWallpaperPull();

	const before = scenario.backgroundSrc;
	scenario.drag(1, 40);
	await scenario.flush();
	scenario.release(1);
	await scenario.flush();

	assert.equal(scenario.backgroundSrc, before, "未达阈值不得换图");
	assert.equal(scenario.attemptCount, 0, "未达阈值不该开候选预载");
});

test("恰好等于阈值松手算达成（边界口径 >=）", async () => {
	const scenario = useScenario();
	scenario.setRandom(() => 0.2);
	initWallpaperPull();

	scenario.drag(1, PULL_THRESHOLD);
	await scenario.flush();
	scenario.release(1);
	await scenario.flush();
	await scenario.finishLastPreload(true);

	assert.equal(scenario.backgroundSrc, wallpaperUrl(WALLPAPER_POOL[1]!));
});

test("死区内松手不算拖动：不伸展、不抑制随后的真实单击", async () => {
	const scenario = useScenario();
	scenario.setRandom(() => 0.2);
	initWallpaperPull();

	// 手抖 2px 后松手：既不该换图，也不该把随后的单击当成「拖动补发」
	scenario.drag(1, 2);
	await scenario.flush();
	scenario.release(1, 100);

	assert.equal(
		scenario.dataset.dragReleaseAt,
		undefined,
		"死区内不该写拖动释放时刻",
	);
	assert.equal(scenario.attemptCount, 0);

	// 紧随其后的单击必须照常换图（timeStamp 落在抑制窗口内也不该被吞）
	scenario.click({ detail: 1, timeStamp: 104 });
	await scenario.flush();
	assert.equal(scenario.attemptCount, 1, "死区不是拖动，随后的单击必须放行");
	await scenario.finishLastPreload(true);
});

test("pointercancel 一律不换图，但会安全复位", async () => {
	const scenario = useScenario();
	initWallpaperPull();

	scenario.drag(1, 200);
	await scenario.flush();
	scenario.cancelPointer(1, 1000);
	await scenario.flush();

	assert.equal(scenario.attemptCount, 0, "pointercancel 不得换图");
	assert.equal(scenario.dataset.dragging, undefined, "必须回到静止态");
});

test("指针捕获丢失一律不换图", async () => {
	const scenario = useScenario();
	initWallpaperPull();

	scenario.drag(1, 200);
	await scenario.flush();
	scenario.losePointerCapture(1, 1000);
	await scenario.flush();

	assert.equal(scenario.attemptCount, 0, "捕获丢失不得换图");
	assert.equal(scenario.dataset.dragging, undefined);
});

test("Escape 中途取消：拉到阈值也不换图", async () => {
	const scenario = useScenario();
	initWallpaperPull();

	scenario.drag(1, 200);
	await scenario.flush();
	scenario.pressEscape(1000);
	await scenario.settleFrame();

	assert.equal(scenario.attemptCount, 0, "Escape 不得换图");
	assert.equal(scenario.dataset.dragging, undefined, "Escape 后必须复位");
});

test("页面失焦中途取消：拉到阈值也不换图", async () => {
	const scenario = useScenario();
	initWallpaperPull();

	scenario.drag(1, 200);
	await scenario.flush();
	scenario.blurWindow(1000);
	await scenario.settleFrame();

	assert.equal(scenario.attemptCount, 0, "失焦不得换图");
	assert.equal(scenario.dataset.dragging, undefined);
});

test("收尾后回弹到 0：--wpull-pull 被写回 0px 并进入收尾过渡", async () => {
	const scenario = useScenario();
	initWallpaperPull();

	scenario.drag(1, 60);
	await scenario.settleFrame();
	assert.equal(
		scenario.styleProps["--wpull-pull"],
		"60px",
		"拖动中应当跟手写伸展量",
	);

	scenario.release(1);
	await scenario.settleFrame();
	assert.equal(
		scenario.styleProps["--wpull-pull"],
		"0px",
		"松手后必须回弹到 0",
	);
});

test("一次拖动只换一次图：松手后补发的 click 被抑制", async () => {
	const scenario = useScenario();
	scenario.setRandom(() => 0.2);
	initWallpaperPull();

	scenario.drag(1, 120);
	await scenario.flush();
	scenario.release(1, 1000);
	// 浏览器在同一任务链上补发 click
	scenario.click({ detail: 1, timeStamp: 1004 });
	await scenario.flush();

	assert.equal(
		scenario.attemptCount,
		1,
		"拖动已经换过图，补发的 click 不得再开一笔事务",
	);
	await scenario.finishLastPreload(true);
	assert.equal(scenario.announcement, "换好了");
});

test("向上拖动（dy 为负）不伸展、也不换图", async () => {
	const scenario = useScenario();
	initWallpaperPull();

	scenario.drag(1, -120);
	await scenario.settleFrame();
	assert.equal(scenario.styleProps["--wpull-pull"], "0px", "向上不该有伸展");

	scenario.release(1);
	await scenario.flush();
	assert.equal(scenario.attemptCount, 0, "向上拖不该换图");
});

test("失焦取消后，随后的单击不被抑制逻辑误伤（时间戳必须同源）", async () => {
	const scenario = useScenario();
	scenario.setRandom(() => 0.2);
	initWallpaperPull();

	// 拖动中失焦：安全复位、不换图
	scenario.drag(1, 200);
	await scenario.flush();
	scenario.blurWindow(1000);
	await scenario.settleFrame();
	assert.equal(scenario.attemptCount, 0, "失焦不得换图");

	// 失焦后的第一次真实单击必须照常工作。
	// 若 blur 用 Date.now() 记时刻，它与 click 的 timeStamp 不同源，
	// 差值会是极大的负数、永远落在抑制窗口内，这次单击就会被永久吞掉。
	scenario.click({ detail: 1, timeStamp: 5000 });
	await scenario.flush();
	assert.equal(
		scenario.attemptCount,
		1,
		"失焦取消不该给后续单击留下抑制标志",
	);
	await scenario.finishLastPreload(true);
	assert.equal(scenario.backgroundSrc, wallpaperUrl(WALLPAPER_POOL[1]!));
});
