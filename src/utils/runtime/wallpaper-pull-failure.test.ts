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
// 口径：最小 DOM 桩（照 wallpaper-pull-interaction.test.ts 的手法），
// 不 sleep 等真实超时——超时由「捕获被登记的那个上限计时器并触发它」定义，
// 不依赖墙上时间。
import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { initWallpaperPull } from "./wallpaper-pull";

const BASE = "https://example.test/";
const BACKGROUNDS = [
	"/images/bg/a.jpg",
	"/images/bg/b.jpg",
	"/images/bg/c.jpg",
];
const abs = (path: string) => new URL(path, BASE).href;

/** 捕获到的「加载上限」计时器（延迟够长的那些）；超时路径由触发它们定义 */
type CapturedTimer = { cb: () => void; delay: number };
let longTimers: CapturedTimer[] = [];

// ---- 最小 DOM 桩 ----

type FakeEventInit = {
	detail?: number;
	timeStamp?: number;
	key?: string;
	repeat?: boolean;
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

function makeEventTarget() {
	const listeners = new Map<string, Array<(event: FakeEvent) => void>>();
	return {
		addEventListener(type: string, listener: (event: FakeEvent) => void) {
			const list = listeners.get(type) ?? [];
			list.push(listener);
			listeners.set(type, list);
		},
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

/** 候选预载用的假图；结局由测试显式驱动（成功 / 失败 / 超时） */
type FakeImage = {
	complete: boolean;
	naturalWidth: number;
	src: string;
	onload: (() => void) | null;
	onerror: (() => void) | null;
	decode: () => Promise<void>;
};
type Harness = {
	host: HTMLElement & { dataset: Record<string, string | undefined> };
	button: ReturnType<typeof makeEventTarget>;
	live: { textContent: string };
	background: {
		src: string;
		currentSrc: string;
		dataset: Record<string, string | undefined>;
	};
	/** 已发起的候选预载（按创建顺序） */
	pending: FakeImage[];
	/** 每次预载请求的地址（按请求顺序），用于断言「试了哪些候选」 */
	requested: string[];
	/** 宿主收到的 class 名（摇头反馈的唯一可观察证据） */
	classes: { added: string[]; removed: string[] };
};

let harness: Harness | null = null;
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
	const buttonWithCapture = Object.assign(button, {
		setPointerCapture: () => {},
		releasePointerCapture: () => {},
	});
	const live = { textContent: "" };
	const hostTarget = makeEventTarget();
	const classes = { added: [] as string[], removed: [] as string[] };
	const host = Object.assign(hostTarget, {
		dataset: {} as Record<string, string | undefined>,
		offsetWidth: 30,
		classList: {
			add(name: string) {
				classes.added.push(name);
			},
			remove(name: string) {
				classes.removed.push(name);
			},
			contains(name: string) {
				return (
					classes.added.includes(name) &&
					!classes.removed.includes(name)
				);
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
			// 提示气泡与衣服 SVG：本文件不测几何，桩里刻意缺席
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
		requested: [],
		classes,
	};
}

function installGlobals() {
	const g = globalThis as unknown as Record<string, unknown>;
	const realSetTimeout = globalThis.setTimeout;
	const realClearTimeout = globalThis.clearTimeout;

	longTimers = [];

	const documentTarget = makeEventTarget();
	const winTarget = makeEventTarget();
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
		addEventListener: winTarget.addEventListener,
		matchMedia: () => ({ matches: reducedMotion }),
	};

	// 加载上限的计时器要能被测试捕获并手动触发：延迟够长的登记下来，
	// 其余（rAF 合帧的 0ms、回弹的 320ms）照常走真实计时器。
	g.setTimeout = ((cb: () => void, delay?: number) => {
		if ((delay ?? 0) >= 5000) {
			longTimers.push({ cb, delay: delay ?? 0 });
			return 0 as unknown as ReturnType<typeof setTimeout>;
		}
		return realSetTimeout(cb, delay);
	}) as unknown as typeof setTimeout;
	// 假计时器句柄没有真实 id，清不掉也无妨：触发时 preload 的 settled 守卫会吞掉
	g.clearTimeout = ((handle: unknown) => {
		if (handle === 0) return;
		realClearTimeout(handle as ReturnType<typeof setTimeout>);
	}) as unknown as typeof clearTimeout;

	g.requestAnimationFrame = (cb: () => void) => realSetTimeout(cb, 0);
	g.cancelAnimationFrame = (handle: ReturnType<typeof setTimeout>) =>
		realClearTimeout(handle);
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
			set: (value: string) => {
				// 记下这次请求的地址，供「试了哪些候选」的断言使用
				currentHarness().requested.push(value);
				created.push(image);
			},
		});
		return image;
	};
}

/** 取第 n 次（默认第一次）预载请求的地址 */
function firstRequestedUrl(index = 0): string {
	const requested = currentHarness().requested;
	const at = index < 0 ? requested.length + index : index;
	const url = requested[at];
	assert.ok(url, `应当存在第 ${at} 次候选请求`);
	return url;
}

/** 等所有 promise 链跑完（不 sleep 固定毫秒） */
async function flush() {
	for (let i = 0; i < 12; i++) await Promise.resolve();
	await new Promise((resolve) => globalThis.setTimeout(resolve, 0));
	for (let i = 0; i < 12; i++) await Promise.resolve();
}

/** 结束最近一次候选预载：`ok=false` 即加载失败 */
async function finishPreload(ok: boolean) {
	const image = currentHarness().pending.at(-1);
	assert.ok(image, "应当有一次候选预载");
	image.complete = true;
	image.naturalWidth = ok ? 1200 : 0;
	if (ok) image.onload?.();
	else image.onerror?.();
	await flush();
}

/** 触发所有已登记的「加载上限」计时器——模拟弱网下迟迟等不到结果 */
async function fireLoadTimeouts() {
	const timers = longTimers.filter((t) => t.delay >= 5000);
	longTimers = longTimers.filter((t) => t.delay < 5000);
	assert.ok(timers.length > 0, "应存在一个明确的加载上限计时器");
	for (const timer of timers) timer.cb();
	await flush();
}

/** 逐个结束所有进行中的预载（全部失败），直到事务结算完毕 */
async function failAllPreloads(limit = 8) {
	for (let i = 0; i < limit; i++) {
		await flush();
		const image = currentHarness().pending.at(-1);
		if (!image || image.complete) break;
		await finishPreload(false);
	}
	await flush();
}

const realRandom = Math.random;

beforeEach(() => {
	harness = null;
	reducedMotion = false;
	Math.random = realRandom;
	installGlobals();
});

// ---- 候选失败 → 换用尚未尝试过的候选 ----

test("某个候选失败时改用尚未尝试过的候选，换成功后播报「换好了」", async () => {
	harness = buildHarness();
	Math.random = () => 0.2;
	initWallpaperPull();

	const before = currentHarness().background.src;
	currentHarness().button.dispatch("click", { detail: 1, timeStamp: 100 });
	await flush();
	assert.equal(currentHarness().pending.length, 1, "先只试一个候选");

	// 记下第一次被尝试的候选（顺序是随机打乱的，测试不假设是哪一张）
	const first = firstRequestedUrl();
	assert.notEqual(first, before, "第一个尝试的必须是当前图以外的候选");

	// 第一张加载失败
	await finishPreload(false);
	assert.equal(
		currentHarness().background.src,
		before,
		"第一张失败时背景必须原样不动",
	);
	assert.equal(currentHarness().pending.length, 2, "应当换用下一个候选");

	// 第二次尝试必须是**另一个**候选（票面：换用尚未尝试过的候选）
	const second = firstRequestedUrl(-1);
	assert.notEqual(second, first, "不得回头重试已经失败过的那个候选");

	// 第二张可用
	await finishPreload(true);
	assert.equal(
		currentHarness().background.src,
		second,
		"失败候选跳过后，落到第二张可用候选的地址",
	);
	assert.equal(currentHarness().live.textContent, "换好了");
});

test("每个候选只试一次、不无限重试：全部失败时尝试次数恰好等于候选数", async () => {
	harness = buildHarness();
	Math.random = () => 0.2;
	initWallpaperPull();

	currentHarness().button.dispatch("click", { detail: 1, timeStamp: 100 });
	await failAllPreloads();

	assert.equal(
		currentHarness().pending.length,
		BACKGROUNDS.length - 1,
		"候选只有两张（当前图被排除），最多只能试两次",
	);
	assert.equal(currentHarness().live.textContent, "加载失败");
});

test("全部候选失败：背景保持不变，播报「加载失败」", async () => {
	harness = buildHarness();
	Math.random = () => 0.2;
	initWallpaperPull();

	const before = currentHarness().background.src;
	currentHarness().button.dispatch("click", { detail: 1, timeStamp: 100 });
	await failAllPreloads();

	assert.equal(
		currentHarness().background.src,
		before,
		"全部失败也不得破坏当前背景",
	);
	assert.equal(currentHarness().live.textContent, "加载失败");
});

// ---- 超时 ----

test("超时按失败处理：背景不变、播报「加载失败」，且**解除忙碌**可再试", async () => {
	harness = buildHarness();
	Math.random = () => 0.2;
	initWallpaperPull();

	const before = currentHarness().background.src;
	currentHarness().button.dispatch("click", { detail: 1, timeStamp: 100 });
	await flush();

	// 弱网：不给 onload / onerror，只让加载上限到点
	await fireLoadTimeouts();
	await fireLoadTimeouts();

	assert.equal(
		currentHarness().background.src,
		before,
		"超时不得把背景改成任何地址",
	);
	assert.equal(
		currentHarness().live.textContent,
		"加载失败",
		"超时对访客就是「加载失败」",
	);

	// 忙碌锁必须被超时路径解除：能再开一笔事务
	const pendingBefore = currentHarness().pending.length;
	currentHarness().button.dispatch("click", { detail: 1, timeStamp: 5000 });
	await flush();
	assert.equal(
		currentHarness().pending.length,
		pendingBefore + 1,
		"超时之后控件必须恢复可用",
	);
});

// ---- 四条路径都解锁 ----

test("成功路径解除忙碌：换好之后还能再换一次", async () => {
	harness = buildHarness();
	Math.random = () => 0.2;
	initWallpaperPull();

	currentHarness().button.dispatch("click", { detail: 1, timeStamp: 100 });
	await flush();
	await finishPreload(true);
	assert.equal(currentHarness().live.textContent, "换好了");

	currentHarness().button.dispatch("click", { detail: 1, timeStamp: 900 });
	await flush();
	assert.equal(
		currentHarness().pending.length,
		BACKGROUNDS.length - 1,
		"成功之后必须能再开一笔事务",
	);
});

test("无候选路径解除忙碌：没得换之后，池子变大仍能换", async () => {
	harness = buildHarness({
		pool: [BACKGROUNDS[0]!],
		current: abs(BACKGROUNDS[0]!),
	});
	initWallpaperPull();

	currentHarness().button.dispatch("click", { detail: 1, timeStamp: 100 });
	await flush();
	assert.equal(currentHarness().live.textContent, "没得换");
	assert.equal(currentHarness().pending.length, 0, "没候选不该发起预载");

	// 模拟池子在会话中途变大（配置热更新 / data 属性被改写）
	Math.random = () => 0;
	currentHarness().background.dataset.backgrounds =
		JSON.stringify(BACKGROUNDS);
	currentHarness().button.dispatch("click", { detail: 1, timeStamp: 900 });
	await flush();
	assert.equal(
		currentHarness().pending.length,
		1,
		"无候选之后控件必须恢复可用",
	);
});

test("失败路径解除忙碌：加载失败之后还能再试（票面故事 25）", async () => {
	harness = buildHarness();
	Math.random = () => 0.2;
	initWallpaperPull();

	currentHarness().button.dispatch("click", { detail: 1, timeStamp: 100 });
	await failAllPreloads();
	assert.equal(currentHarness().live.textContent, "加载失败");

	const pendingBefore = currentHarness().pending.length;
	currentHarness().button.dispatch("click", { detail: 1, timeStamp: 900 });
	await flush();
	assert.equal(
		currentHarness().pending.length,
		pendingBefore + 1,
		"失败之后控件必须恢复可用",
	);
	await finishPreload(true);
	assert.equal(currentHarness().live.textContent, "换好了");
});

// ---- 非颜色反馈：衣服短摇头 ----

test("加载失败时衣服摇头一次（非颜色反馈）", async () => {
	harness = buildHarness();
	Math.random = () => 0.2;
	initWallpaperPull();

	currentHarness().button.dispatch("click", { detail: 1, timeStamp: 100 });
	await failAllPreloads();

	assert.ok(
		currentHarness().classes.added.includes("is-shaking"),
		"失败必须给出非颜色反馈（衣服摇头）",
	);
});

test("「没得换」与「加载失败」共用同一个摇头反馈", async () => {
	harness = buildHarness({
		pool: [BACKGROUNDS[0]!],
		current: abs(BACKGROUNDS[0]!),
	});
	initWallpaperPull();

	currentHarness().button.dispatch("click", { detail: 1, timeStamp: 100 });
	await flush();

	assert.equal(currentHarness().live.textContent, "没得换");
	assert.ok(
		currentHarness().classes.added.includes("is-shaking"),
		"没得换也要摇头——与加载失败共用同一个非颜色反馈",
	);
});

test("成功换图不摇头：反馈只属于「没换成」的两档", async () => {
	harness = buildHarness();
	Math.random = () => 0.2;
	initWallpaperPull();

	currentHarness().button.dispatch("click", { detail: 1, timeStamp: 100 });
	await flush();
	await finishPreload(true);

	assert.equal(
		currentHarness().classes.added.includes("is-shaking"),
		false,
		"成功只靠回弹与背景变化表达，不摇头",
	);
});

test("减少动态时不摇头，但播报照旧（信息通道不砍）", async () => {
	reducedMotion = true;
	harness = buildHarness();
	Math.random = () => 0.2;
	initWallpaperPull();

	currentHarness().button.dispatch("click", { detail: 1, timeStamp: 100 });
	await failAllPreloads();

	assert.equal(
		currentHarness().classes.added.includes("is-shaking"),
		false,
		"开了减少动态就不许摇",
	);
	assert.equal(
		currentHarness().live.textContent,
		"加载失败",
		"减少动态下结果仍要播报",
	);
});

test("减少动态下「没得换」也不摇头，但播报照旧（三类结果都靠播报区）", async () => {
	reducedMotion = true;
	harness = buildHarness({
		pool: [BACKGROUNDS[0]!],
		current: abs(BACKGROUNDS[0]!),
	});
	initWallpaperPull();

	currentHarness().button.dispatch("click", { detail: 1, timeStamp: 100 });
	await flush();

	assert.equal(
		currentHarness().classes.added.includes("is-shaking"),
		false,
		"两档「没换成」在减少动态下都跳过摇头（前庭风险）",
	);
	assert.equal(
		currentHarness().live.textContent,
		"没得换",
		"视觉反馈被去掉后，播报区是唯一的信息通道，不能少",
	);
});

test("减少动态是每次调用即时查询：会话中途打开偏好，下一次失败立即不摇头", async () => {
	harness = buildHarness({
		pool: [BACKGROUNDS[0]!],
		current: abs(BACKGROUNDS[0]!),
	});
	initWallpaperPull();

	// 偏好关闭：正常摇头
	currentHarness().button.dispatch("click", { detail: 1, timeStamp: 100 });
	await flush();
	assert.equal(currentHarness().live.textContent, "没得换");
	assert.ok(
		currentHarness().classes.added.includes("is-shaking"),
		"偏好关闭时必须摇",
	);

	// 用户中途改了系统设置（没有重新初始化、没有重新加载页面）
	reducedMotion = true;
	// 清空已记录的类名，只看这一轮
	currentHarness().classes.added.length = 0;

	// 同一句话再播一次也要能被重新播报（播报区不是一次性写入）
	currentHarness().button.dispatch("click", { detail: 1, timeStamp: 900 });
	await flush();

	assert.equal(
		currentHarness().classes.added.includes("is-shaking"),
		false,
		"模块级缓存或一次性闭包会让这里仍然摇头",
	);
	assert.equal(currentHarness().live.textContent, "没得换", "降级后播报照常");
});

// ---- 无候选与失败是不同的结果 ----

test("无候选与加载失败是两个不同结果（不同播报词），但反馈共用摇头", async () => {
	// 无候选：池里只有当前这张
	harness = buildHarness({
		pool: [BACKGROUNDS[0]!],
		current: abs(BACKGROUNDS[0]!),
	});
	initWallpaperPull();
	currentHarness().button.dispatch("click", { detail: 1, timeStamp: 100 });
	await flush();
	const noneText = currentHarness().live.textContent;
	const noneShook = currentHarness().classes.added.includes("is-shaking");

	// 加载失败：有候选但都加载不出来
	harness = null;
	installGlobals();
	harness = buildHarness();
	Math.random = () => 0.2;
	initWallpaperPull();
	currentHarness().button.dispatch("click", { detail: 1, timeStamp: 100 });
	await failAllPreloads();
	const failedText = currentHarness().live.textContent;
	const failedShook = currentHarness().classes.added.includes("is-shaking");

	assert.equal(noneText, "没得换");
	assert.equal(failedText, "加载失败");
	assert.notEqual(noneText, failedText, "两档结果必须能被区分开");
	assert.equal(noneShook, true);
	assert.equal(failedShook, true, "两档共用同一个摇头反馈");
});
