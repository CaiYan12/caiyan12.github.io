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
// 口径：最小 DOM 桩（照 random-background.test.ts 的手法），Math.random 打桩，
// 不 wait 固定毫秒、不读内部变量；等待的是「候选预载已结束」这个真实信号。
import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { initWallpaperPull, noteDragRelease } from "./wallpaper-pull";
import { PULL_THRESHOLD } from "../wallpaper-pull-drag";

const BASE = "https://example.test/";
const BACKGROUNDS = [
	"/images/bg/a.jpg",
	"/images/bg/b.jpg",
	"/images/bg/c.jpg",
];
const abs = (path: string) => new URL(path, BASE).href;

// ---- 最小 DOM 桩 ----

type FakeEventInit = {
	detail?: number;
	timeStamp?: number;
	key?: string;
	repeat?: boolean;
	// T3 的指针字段
	pointerId?: number;
	clientX?: number;
	clientY?: number;
	button?: number;
	pointerType?: string;
};

type FakeEvent = {
	type: string;
	detail: number;
	timeStamp: number;
	key?: string;
	repeat: boolean;
	pointerId: number;
	clientX: number;
	clientY: number;
	button: number;
	pointerType: string;
	defaultPrevented: boolean;
	preventDefault: () => void;
};

/** 只支持测试真正用到的那两件事：addEventListener / 手动派发 */
function makeEventTarget() {
	const listeners = new Map<string, Array<(event: FakeEvent) => void>>();
	return {
		addEventListener(type: string, listener: (event: FakeEvent) => void) {
			const list = listeners.get(type) ?? [];
			list.push(listener);
			listeners.set(type, list);
		},
		/** 派发一次事件；返回事件本身，便于读 defaultPrevented */
		dispatch(type: string, init: FakeEventInit = {}): FakeEvent {
			const event: FakeEvent = {
				type,
				detail: init.detail ?? 0,
				timeStamp: init.timeStamp ?? 0,
				key: init.key,
				repeat: init.repeat ?? false,
				pointerId: init.pointerId ?? 1,
				clientX: init.clientX ?? 0,
				clientY: init.clientY ?? 0,
				button: init.button ?? 0,
				pointerType: init.pointerType ?? "mouse",
				defaultPrevented: false,
				preventDefault: () => {
					event.defaultPrevented = true;
				},
			};
			for (const listener of listeners.get(type) ?? []) listener(event);
			return event;
		},
	};
}

/** 候选预载用的假图；`finish(true/false)` 模拟加载成功/失败 */
type FakeImage = {
	complete: boolean;
	naturalWidth: number;
	src: string;
	onload: (() => void) | null;
	onerror: (() => void) | null;
	decode: () => Promise<void>;
};

// ---- 页面桩 ----

type Harness = {
	host: HTMLElement & { dataset: Record<string, string | undefined> };
	button: ReturnType<typeof makeEventTarget>;
	live: { textContent: string };
	background: {
		src: string;
		currentSrc: string;
		dataset: Record<string, string | undefined>;
	};
	/** 已创建、尚未结束的候选预载（按创建顺序） */
	pending: FakeImage[];
};

let harness: Harness | null = null;
/** document / window 上的监听目标：Escape 与失焦要能被测试派发到 */
let docEvents: ReturnType<typeof makeEventTarget> | null = null;
let winEvents: ReturnType<typeof makeEventTarget> | null = null;
/**
 * 当前「减少动态」偏好（票 #134）。运行时每次调用 `prefersReducedMotion()` 都会
 * 重新读它，所以**用例中途改这个变量就等于用户在系统里改了设置**——这正是
 * 「即时查询 vs 模块级缓存」那条契约的可观察判据。
 */
let reducedMotion = false;

function currentHarness(): Harness {
	assert.ok(harness, "harness 必须先建好");
	return harness;
}

function buildHarness(
	options: { pool?: string[]; current?: string } = {},
): Harness {
	const pool = options.pool ?? BACKGROUNDS;
	const currentSrc =
		options.current ?? (pool.length > 0 ? abs(pool[0]!) : "");

	const button = makeEventTarget();
	// 指针捕获是 T3 的必需调用；桩只需可调用，不模拟捕获语义
	const buttonWithCapture = Object.assign(button, {
		setPointerCapture: () => {},
		releasePointerCapture: () => {},
	});
	const live = { textContent: "" };
	const hostTarget = makeEventTarget();
	const host = Object.assign(hostTarget, {
		dataset: {} as Record<string, string | undefined>,
		offsetWidth: 30,
		// T3 的跟手位移靠 .is-settling 类切换过渡，桩要能收 classList
		classList: {
			added: [] as string[],
			removed: [] as string[],
			add(this: { added: string[] }, name: string) {
				this.added.push(name);
			},
			remove(this: { removed: string[] }, name: string) {
				this.removed.push(name);
			},
		},
		style: {
			props: {} as Record<string, string>,
			setProperty(name: string, value: string) {
				this.props[name] = value;
			},
			// 运行时在「导航不可用」时会撤掉 --wpull-left，桩要能接住
			removeProperty(name: string) {
				delete this.props[name];
			},
		},
		// 兜底路径要用盒子实际渲染位置反读提示位置，桩给一个等宽居中的矩形
		getBoundingClientRect() {
			return { x: 0, y: 0, width: 30, height: 50, right: 30, bottom: 50 };
		},
		querySelector(selector: string) {
			if (selector === ".wpull__grab")
				return buttonWithCapture as unknown;
			if (selector === ".wpull__live") return live as unknown;
			// 提示气泡与衣服 SVG：本文件不测几何（提示另有 hint 单测），
			// 桩里刻意缺席，让 applyHintPlacement 走「量不到 → 交 CSS 兜底」那条路
			if (selector === ".wpull__hint" || selector === ".wpull__art")
				return null;
			throw new Error(`unexpected selector: ${selector}`);
		},
	});

	const background = {
		dataset: { backgrounds: JSON.stringify(pool) },
		src: currentSrc,
		currentSrc,
	};

	return {
		host: host as unknown as Harness["host"],
		button,
		live,
		background,
		pending: [],
	};
}

/** 在全局上挂出运行时需要的那些东西（每个用例重装，避免跨用例串味） */
function installGlobals() {
	const g = globalThis as unknown as Record<string, unknown>;
	const documentTarget = makeEventTarget();
	// Escape 与失焦的取消入口挂在 document / window 上，测试要能派发到它们
	docEvents = documentTarget;
	winEvents = makeEventTarget();
	g.document = {
		baseURI: BASE,
		documentElement: { clientWidth: 1440 },
		addEventListener: documentTarget.addEventListener,
		querySelector(selector: string) {
			switch (selector) {
				case "[data-wallpaper-pull]":
					return harness?.host ?? null;
				case ".bg-image[data-backgrounds]":
					return harness?.background ?? null;
				// 横向锚点桩成「不存在」：几何另有单测，这里走兜底比例即可
				case "#head-nav":
					return null;
				default:
					throw new Error(`unexpected selector: ${selector}`);
			}
		},
	};
	g.window = {
		addEventListener: winEvents.addEventListener,
		// prefersReducedMotion() 读的是 window.matchMedia；
		// 返回的是**每次新建**的查询对象，与真实 matchMedia 的同形语义一致
		matchMedia: () => ({ matches: reducedMotion }),
	};
	g.requestAnimationFrame = (cb: () => void) => setTimeout(cb, 0);
	g.cancelAnimationFrame = (handle: ReturnType<typeof setTimeout>) =>
		clearTimeout(handle);
	g.getComputedStyle = () => ({ width: "30px" });
	g.Image = function FakeImageConstructor() {
		const created = currentHarness().pending;
		const image: FakeImage = {
			complete: false,
			naturalWidth: 0,
			src: "",
			onload: null,
			onerror: null,
			// 刻意让 decode 被拒：判据必须退化为「加载完成 + 固有尺寸」
			decode: () => Promise.reject(new Error("decode rejected for test")),
		};
		Object.defineProperty(image, "src", {
			get: () => "",
			set: () => {
				created.push(image);
			},
		});
		return image;
	};
}

/** 等所有 promise 链跑完（不 sleep 固定毫秒，只让微任务与一个宏任务清空） */
async function flush() {
	for (let i = 0; i < 8; i++) await Promise.resolve();
	await new Promise((resolve) => setTimeout(resolve, 0));
	for (let i = 0; i < 8; i++) await Promise.resolve();
}

/** 结束最近一次候选预载；`ok=false` 即触发失败路径 */
async function finishLastPreload(ok: boolean) {
	const image = currentHarness().pending.at(-1);
	assert.ok(image, "应当有一次候选预载");
	image.complete = true;
	image.naturalWidth = ok ? 1200 : 0;
	if (ok) image.onload?.();
	else image.onerror?.();
	await flush();
}

const realRandom = Math.random;

beforeEach(() => {
	harness = null;
	reducedMotion = false;
	Math.random = realRandom;
	installGlobals();
});

// ---- 正路径：单击换到另一张 ----

test("单击换图：背景换成池里另一张，并播报「换好了」", async () => {
	harness = buildHarness();
	Math.random = () => 0.2; // 当前图被排除后候选只剩两张，0.2 落在第一张 b
	initWallpaperPull();

	const before = currentHarness().background.src;
	currentHarness().button.dispatch("click", { detail: 1, timeStamp: 100 });
	await flush();

	// 先确认可用、再提交：候选还没结束，src 必须原地不动
	assert.equal(
		currentHarness().background.src,
		before,
		"候选未确认前不得改动当前背景",
	);

	await finishLastPreload(true);

	assert.equal(
		currentHarness().background.src,
		abs(BACKGROUNDS[1]!),
		"确认可用后才提交候选地址",
	);
	assert.equal(currentHarness().live.textContent, "换好了");
});

test("换到的图一定不是当前这张（当前看第 3 张，随机值指向它也不许选它）", async () => {
	harness = buildHarness({ current: abs(BACKGROUNDS[2]!) });
	Math.random = () => 0.9; // 最大档；若没排除当前图就正好落到当前这张
	initWallpaperPull();

	currentHarness().button.dispatch("click", { detail: 1, timeStamp: 100 });
	await flush();
	await finishLastPreload(true);

	assert.notEqual(
		currentHarness().background.src,
		abs(BACKGROUNDS[2]!),
		"不得换到当前正在看的那张",
	);
	assert.ok(
		BACKGROUNDS.map(abs).includes(currentHarness().background.src),
		"换到的必须来自既有壁纸池",
	);
});

// ---- 无候选 ----

test("只有当前这一张时播报「没得换」，背景不变、也不预载任何图", async () => {
	harness = buildHarness({
		pool: [BACKGROUNDS[1]!],
		current: abs(BACKGROUNDS[1]!),
	});
	initWallpaperPull();

	currentHarness().button.dispatch("click", { detail: 1, timeStamp: 100 });
	await flush();

	assert.equal(currentHarness().background.src, abs(BACKGROUNDS[1]!));
	assert.equal(currentHarness().live.textContent, "没得换");
	assert.equal(
		currentHarness().pending.length,
		0,
		"没候选时不该去预载任何图",
	);
});

test("壁纸池为空时也播报「没得换」，不写任何地址", async () => {
	harness = buildHarness({ pool: [], current: "" });
	initWallpaperPull();

	currentHarness().button.dispatch("click", { detail: 1, timeStamp: 100 });
	await flush();

	assert.equal(currentHarness().background.src, "", "空池不该被写进任何地址");
	assert.equal(currentHarness().live.textContent, "没得换");
	assert.equal(currentHarness().pending.length, 0);
});

// ---- 加载失败 ----

test("候选加载失败：背景保持原样、播报「加载失败」，之后还能再试", async () => {
	harness = buildHarness();
	Math.random = () => 0.2;
	initWallpaperPull();

	const before = currentHarness().background.src;
	currentHarness().button.dispatch("click", { detail: 1, timeStamp: 100 });
	await flush();
	// 票 #132：单个候选失败不再立即收口，而是换用尚未尝试过的候选；
	// 「加载失败」要等**全部候选都用尽**才播报。池里共 3 张、排除当前图后
	// 只剩 2 个候选，所以要把两次都失败掉，事务才结算。
	await finishLastPreload(false);
	await flush();
	assert.equal(
		currentHarness().pending.length,
		2,
		"第一个候选失败后应换用下一个候选",
	);
	await finishLastPreload(false);

	assert.equal(
		currentHarness().background.src,
		before,
		"失败不得破坏当前背景",
	);
	assert.equal(currentHarness().live.textContent, "加载失败");

	// 失败路径也必须在 finally 里解锁：再触发仍能发起新事务
	currentHarness().button.dispatch("click", { detail: 1, timeStamp: 500 });
	await flush();
	assert.equal(
		currentHarness().pending.length,
		3,
		"失败之后控件必须恢复可用（忙碌锁要覆盖失败路径）",
	);
	await finishLastPreload(true);
	assert.equal(currentHarness().background.src, abs(BACKGROUNDS[1]!));
	assert.equal(currentHarness().live.textContent, "换好了");
});

// ---- 忙碌锁 ----

test("忙碌锁：一次事务完成前重复触发不产生第二次提交", async () => {
	harness = buildHarness();
	Math.random = () => 0.2;
	initWallpaperPull();

	currentHarness().button.dispatch("click", { detail: 1, timeStamp: 100 });
	await flush();
	// 候选仍在加载（未 resolve），此刻连开三枪（含键盘 Space）
	currentHarness().button.dispatch("click", { detail: 1, timeStamp: 200 });
	currentHarness().button.dispatch("click", { detail: 1, timeStamp: 300 });
	currentHarness().button.dispatch("keydown", { key: " ", timeStamp: 400 });
	await flush();

	assert.equal(currentHarness().pending.length, 1, "忙碌期间只允许一次事务");
	await finishLastPreload(true);
	assert.equal(currentHarness().live.textContent, "换好了");
});

// ---- 键盘 ----

test("Space 激活：preventDefault（不顺带滚页）且换图一次", async () => {
	harness = buildHarness();
	Math.random = () => 0.2;
	initWallpaperPull();

	const space = currentHarness().button.dispatch("keydown", {
		key: " ",
		timeStamp: 100,
	});
	assert.equal(
		space.defaultPrevented,
		true,
		"Space 必须 preventDefault，否则会滚页",
	);
	await flush();
	await finishLastPreload(true);

	assert.equal(currentHarness().background.src, abs(BACKGROUNDS[1]!));
});

test("Space 长按的自动重复不叠加请求（仍 preventDefault）", async () => {
	harness = buildHarness();
	Math.random = () => 0.2;
	initWallpaperPull();

	currentHarness().button.dispatch("keydown", { key: " ", timeStamp: 100 });
	await flush();
	const autoRepeat = currentHarness().button.dispatch("keydown", {
		key: " ",
		timeStamp: 200,
		repeat: true,
	});
	assert.equal(autoRepeat.defaultPrevented, true);
	await flush();

	assert.equal(currentHarness().pending.length, 1);
	await finishLastPreload(true);
});

test("键盘合成 click（detail === 0）放行：紧跟拖动释放也不被误伤", async () => {
	harness = buildHarness();
	Math.random = () => 0.2;
	initWallpaperPull();

	// 模拟 T3：刚有一次拖动释放在时刻 100
	noteDragRelease(currentHarness().host, 100);

	// Enter 产生的合成 click：detail === 0、只差 2ms —— 必须照样换图
	currentHarness().button.dispatch("click", { detail: 0, timeStamp: 102 });
	await flush();
	await finishLastPreload(true);

	assert.equal(
		currentHarness().background.src,
		abs(BACKGROUNDS[1]!),
		"键盘点击不得被拖动后的 click 抑制逻辑误伤",
	);
	assert.equal(currentHarness().live.textContent, "换好了");
});

test("拖动释放后浏览器补发的 click（detail >= 1）被抑制，一次手势只换一次", async () => {
	harness = buildHarness();
	Math.random = () => 0.2;
	initWallpaperPull();

	noteDragRelease(currentHarness().host, 100);
	currentHarness().button.dispatch("click", { detail: 1, timeStamp: 104 });
	await flush();

	assert.equal(
		currentHarness().pending.length,
		0,
		"拖动已经换过图，补发的 click 不得再开一笔事务",
	);
	assert.equal(currentHarness().background.src, abs(BACKGROUNDS[0]!));

	// 抑制窗口过了之后的真实单击必须照常工作（不许留下陈旧的抑制标志）
	currentHarness().button.dispatch("click", { detail: 1, timeStamp: 800 });
	await flush();
	assert.equal(currentHarness().pending.length, 1, "窗口外的单击必须放行");
	await finishLastPreload(true);
	assert.equal(currentHarness().background.src, abs(BACKGROUNDS[1]!));
});

// ---- T7（票 #134）：减少动态降级 ----
//
// 降级不是「砍功能」：手势照常识别、阈值照常判定、播报照常写；被去掉的只有
// **位移与渐变**（跟手位移、弹性回弹、交叉淡入、摇头）。这一组用例把这条边界钉死，
// 其中「即时查询」那条守着 reduced-motion.ts 的核心语义——判定不许被缓存。

/** 宿主的可观察副作用：下发的 CSS 变量与挂上的类名（都是外部可见的真实现象） */
function hostEffects() {
	const host = currentHarness().host as unknown as {
		style: { props: Record<string, string> };
		classList: { added: string[]; removed: string[] };
	};
	return { style: host.style.props, classes: host.classList };
}

test("减少动态：拖拽全程 --wpull-pull 恒为 0px，绳子也不跟着伸长", async () => {
	reducedMotion = true;
	harness = buildHarness();
	initWallpaperPull();

	drag(1, 120);
	await settleFrame();

	assert.equal(
		hostEffects().style["--wpull-pull"],
		"0px",
		"跟手位移本身就是位移，减少动态下一律为 0",
	);
	assert.equal(
		hostEffects().style["--wpull-rope-scale"],
		"1",
		"衣服不动，绳子也不该被拉长（两者同一来源）",
	);
});

test("减少动态：松手不做弹性回弹（不挂回弹过渡类），直接归位", async () => {
	reducedMotion = true;
	harness = buildHarness();
	initWallpaperPull();

	drag(1, 120);
	await settleFrame();
	release(1);
	await settleFrame();

	assert.equal(
		hostEffects().classes.added.includes("is-settling"),
		false,
		"没有位移就没有「弹回去」，不该进入回弹过渡",
	);
	assert.equal(hostEffects().style["--wpull-pull"], "0px");
});

test("减少动态：拖动达阈值松手**仍然换图**（阈值判定与选择逻辑不降级）", async () => {
	reducedMotion = true;
	harness = buildHarness();
	Math.random = () => 0.2;
	initWallpaperPull();

	drag(1, 120);
	await settleFrame();
	release(1);
	await flush();
	await finishLastPreload(true);

	assert.equal(
		currentHarness().background.src,
		abs(BACKGROUNDS[1]!),
		"视觉降级不得顺手把功能也降级掉",
	);
	assert.equal(currentHarness().live.textContent, "换好了");
});

test("减少动态：单击仍走完整换图流程并播报「换好了」", async () => {
	reducedMotion = true;
	harness = buildHarness();
	Math.random = () => 0.2;
	initWallpaperPull();

	currentHarness().button.dispatch("click", { detail: 1, timeStamp: 100 });
	await flush();
	// 与常规路径同一份契约：先确认候选可用，再提交
	assert.equal(currentHarness().background.src, abs(BACKGROUNDS[0]!));
	await finishLastPreload(true);

	assert.equal(currentHarness().background.src, abs(BACKGROUNDS[1]!));
	assert.equal(currentHarness().live.textContent, "换好了");
});

test("减少动态：Space 与 Enter 都仍能换图（键盘路径不砍）", async () => {
	reducedMotion = true;
	harness = buildHarness();
	Math.random = () => 0.2;
	initWallpaperPull();

	// Space：keydown 自行触发（并 preventDefault 掉滚页）
	const space = currentHarness().button.dispatch("keydown", {
		key: " ",
		timeStamp: 100,
	});
	assert.equal(space.defaultPrevented, true);
	await flush();
	await finishLastPreload(true);
	assert.equal(currentHarness().background.src, abs(BACKGROUNDS[1]!));

	// Enter：浏览器补发的合成 click（detail === 0）照常放行
	currentHarness().host.dataset.dragReleaseAt = undefined;
	currentHarness().button.dispatch("click", { detail: 0, timeStamp: 900 });
	await flush();
	assert.equal(
		currentHarness().pending.length,
		2,
		"Enter 产生的合成 click 必须仍然发起事务",
	);
	await finishLastPreload(true);
	assert.equal(currentHarness().live.textContent, "换好了");
});

test("减少动态是每次调用即时查询：会话中途打开偏好，下一次手势立即不跟手", async () => {
	harness = buildHarness();
	initWallpaperPull();

	// 偏好关闭时：正常跟手
	drag(1, 60);
	await settleFrame();
	assert.equal(hostEffects().style["--wpull-pull"], "60px");
	release(1);
	await settleFrame();

	// 用户中途改了系统设置（不重新初始化、不重新加载页面）
	reducedMotion = true;

	drag(2, 60);
	await settleFrame();
	assert.equal(
		hostEffects().style["--wpull-pull"],
		"0px",
		"判定必须即时查询；模块级缓存或一次性闭包会让这里仍然写出 60px",
	);
});

// ---- 幂等与不预取整池 ----

test("重复初始化不重复绑定（dataset 守卫），一次单击只开一笔事务", async () => {
	harness = buildHarness();
	Math.random = () => 0.2;
	initWallpaperPull();
	initWallpaperPull();
	initWallpaperPull();

	currentHarness().button.dispatch("click", { detail: 1, timeStamp: 100 });
	await flush();

	assert.equal(
		currentHarness().pending.length,
		1,
		"重入三次也只该有一次事务",
	);
	await finishLastPreload(true);
	assert.equal(currentHarness().live.textContent, "换好了");
});

test("首次加载不预取整个壁纸池：没触发就一次预载都没有", async () => {
	harness = buildHarness();
	initWallpaperPull();
	await flush();

	assert.equal(
		currentHarness().pending.length,
		0,
		"挂件初始化不得预载壁纸池（首屏只保留既有那一张）",
	);
});
// ---- T3（票 #130）：下拉拖拽与回弹 ----

/** 一次完整的按下 → 移动 → 抬起；`dy` 是相对起点的垂直位移 */
function drag(pointerId: number, dy: number, dx = 0) {
	const button = currentHarness().button;
	button.dispatch("pointerdown", { pointerId, clientX: 100, clientY: 100 });
	button.dispatch("pointermove", {
		pointerId,
		clientX: 100 + dx,
		clientY: 100 + dy,
	});
}

/** 松手 */
function release(pointerId: number, timeStamp = 1000) {
	currentHarness().button.dispatch("pointerup", { pointerId, timeStamp });
}

/** 等合帧的 rAF 把变量写下去 */
async function settleFrame() {
	await new Promise((resolve) => setTimeout(resolve, 0));
}

test("拉到阈值以上松手：换图一次，走的是同一个 requestChange 入口", async () => {
	harness = buildHarness();
	Math.random = () => 0.2;
	initWallpaperPull();

	drag(1, 120);
	await flush();
	release(1);
	await flush();
	await finishLastPreload(true);

	assert.equal(
		currentHarness().background.src,
		abs(BACKGROUNDS[1]!),
		"达到阈值松手应当换图",
	);
	assert.equal(currentHarness().live.textContent, "换好了");
});

test("未达阈值松手：只回弹，不换图、不预载", async () => {
	harness = buildHarness();
	initWallpaperPull();

	const before = currentHarness().background.src;
	drag(1, 40);
	await flush();
	release(1);
	await flush();

	assert.equal(currentHarness().background.src, before, "未达阈值不得换图");
	assert.equal(currentHarness().pending.length, 0, "未达阈值不该开候选预载");
});

test("恰好等于阈值松手算达成（边界口径 >=）", async () => {
	harness = buildHarness();
	Math.random = () => 0.2;
	initWallpaperPull();

	drag(1, PULL_THRESHOLD);
	await flush();
	release(1);
	await flush();
	await finishLastPreload(true);

	assert.equal(currentHarness().background.src, abs(BACKGROUNDS[1]!));
});

test("死区内松手不算拖动：不伸展、不抑制随后的真实单击", async () => {
	harness = buildHarness();
	Math.random = () => 0.2;
	initWallpaperPull();

	// 手抖 2px 后松手：既不该换图，也不该把随后的单击当成「拖动补发」
	drag(1, 2);
	await flush();
	release(1, 100);

	assert.equal(
		currentHarness().host.dataset.dragReleaseAt,
		undefined,
		"死区内不该写拖动释放时刻",
	);
	assert.equal(currentHarness().pending.length, 0);

	// 紧随其后的单击必须照常换图（timeStamp 落在抑制窗口内也不该被吞）
	currentHarness().button.dispatch("click", { detail: 1, timeStamp: 104 });
	await flush();
	assert.equal(
		currentHarness().pending.length,
		1,
		"死区不是拖动，随后的单击必须放行",
	);
	await finishLastPreload(true);
});

test("pointercancel 一律不换图，但会安全复位", async () => {
	harness = buildHarness();
	initWallpaperPull();

	drag(1, 200);
	await flush();
	currentHarness().button.dispatch("pointercancel", {
		pointerId: 1,
		timeStamp: 1000,
	});
	await flush();

	assert.equal(currentHarness().pending.length, 0, "pointercancel 不得换图");
	assert.equal(
		currentHarness().host.dataset.dragging,
		undefined,
		"必须回到静止态",
	);
});

test("指针捕获丢失一律不换图", async () => {
	harness = buildHarness();
	initWallpaperPull();

	drag(1, 200);
	await flush();
	currentHarness().button.dispatch("lostpointercapture", {
		pointerId: 1,
		timeStamp: 1000,
	});
	await flush();

	assert.equal(currentHarness().pending.length, 0, "捕获丢失不得换图");
	assert.equal(currentHarness().host.dataset.dragging, undefined);
});

test("Escape 中途取消：拉到阈值也不换图", async () => {
	harness = buildHarness();
	initWallpaperPull();

	drag(1, 200);
	await flush();
	docEvents!.dispatch("keydown", { key: "Escape", timeStamp: 1000 });
	await settleFrame();

	assert.equal(currentHarness().pending.length, 0, "Escape 不得换图");
	assert.equal(
		currentHarness().host.dataset.dragging,
		undefined,
		"Escape 后必须复位",
	);
});

test("页面失焦中途取消：拉到阈值也不换图", async () => {
	harness = buildHarness();
	initWallpaperPull();

	drag(1, 200);
	await flush();
	winEvents!.dispatch("blur", { timeStamp: 1000 });
	await settleFrame();

	assert.equal(currentHarness().pending.length, 0, "失焦不得换图");
	assert.equal(currentHarness().host.dataset.dragging, undefined);
});

test("收尾后回弹到 0：--wpull-pull 被写回 0px 并进入收尾过渡", async () => {
	harness = buildHarness();
	initWallpaperPull();

	drag(1, 60);
	await settleFrame();
	const style = (
		currentHarness().host as unknown as {
			style: { props: Record<string, string> };
		}
	).style;
	assert.equal(style.props["--wpull-pull"], "60px", "拖动中应当跟手写伸展量");

	release(1);
	await settleFrame();
	assert.equal(style.props["--wpull-pull"], "0px", "松手后必须回弹到 0");
});

test("一次拖动只换一次图：松手后补发的 click 被抑制", async () => {
	harness = buildHarness();
	Math.random = () => 0.2;
	initWallpaperPull();

	drag(1, 120);
	await flush();
	release(1, 1000);
	// 浏览器在同一任务链上补发 click
	currentHarness().button.dispatch("click", { detail: 1, timeStamp: 1004 });
	await flush();

	assert.equal(
		currentHarness().pending.length,
		1,
		"拖动已经换过图，补发的 click 不得再开一笔事务",
	);
	await finishLastPreload(true);
	assert.equal(currentHarness().live.textContent, "换好了");
});

test("向上拖动（dy 为负）不伸展、也不换图", async () => {
	harness = buildHarness();
	initWallpaperPull();

	drag(1, -120);
	await settleFrame();
	const style = (
		currentHarness().host as unknown as {
			style: { props: Record<string, string> };
		}
	).style;
	assert.equal(style.props["--wpull-pull"], "0px", "向上不该有伸展");

	release(1);
	await flush();
	assert.equal(currentHarness().pending.length, 0, "向上拖不该换图");
});

test("失焦取消后，随后的单击不被抑制逻辑误伤（时间戳必须同源）", async () => {
	harness = buildHarness();
	Math.random = () => 0.2;
	initWallpaperPull();

	// 拖动中失焦：安全复位、不换图
	drag(1, 200);
	await flush();
	winEvents!.dispatch("blur", { timeStamp: 1000 });
	await settleFrame();
	assert.equal(currentHarness().pending.length, 0, "失焦不得换图");

	// 失焦后的第一次真实单击必须照常工作。
	// 若 blur 用 Date.now() 记时刻，它与 click 的 timeStamp 不同源，
	// 差值会是极大的负数、永远落在抑制窗口内，这次单击就会被永久吞掉。
	currentHarness().button.dispatch("click", { detail: 1, timeStamp: 5000 });
	await flush();
	assert.equal(
		currentHarness().pending.length,
		1,
		"失焦取消不该给后续单击留下抑制标志",
	);
	await finishLastPreload(true);
	assert.equal(currentHarness().background.src, abs(BACKGROUNDS[1]!));
});
