/**
 * 拉绳壁纸挂件的 scenario adapter（Phase F3）。
 *
 * 目的：把 `wallpaper-pull-interaction.test.ts` 与 `wallpaper-pull-failure.test.ts`
 * 里两套重复的 DOM / 事件 / 计时器 / Image 桩收成一份，让「成功 / 失败 / 拖拽 /
 * 键盘」共享同一套搭建与观测。
 *
 * 边界（计划 F3.0）：
 * · adapter 只提供**操作**（派发事件、驱动预载结局）与**观测**（读 src、播报、
 *   class、CSS 变量、忙碌锁、尝试次数）。**不提供** `expectSuccess()` 这类会复制
 *   implementation 判断的高阶断言——期望留在各自测试里。
 * · 未知选择器、未知事件类型、未消费的预载一律抛错，不允许静默空跑。
 * · 生产代码与 DOM 结构一字不动：本文件只做桩。
 *
 * 与生产代码同目录但**不参与客户端打包**：只有 `*.test.ts` 会 import 它，
 * 客户端入口图里没有它。
 *
 * 桩语义里有四处是**承重的**，合并时不得「顺手补全」：
 * 1. `document` 故意**没有** `createElement` —— 交叉淡入的临时层因此建不起来，
 *    走 `skipped` → 直接切换的退化路径。补上它会让提交阶段去等 `waitForImage`，
 *    而背景桩没有 `complete` / `naturalWidth` / `addEventListener`，事务会挂死。
 * 2. `getComputedStyle` 故意**不返回** `getPropertyValue` —— 同上，让临时层必然
 *    建不起来。
 * 3. `Image.decode` **默认恒 reject** —— 逼 `preloadCandidate` 退化为「加载完成 +
 *    固有尺寸」判据；改成 resolve 就绕开了这条退化分支。**F5.1 起 decode 的结局改为
 *    可选**（`WallpaperScenarioOptions.decodeOutcome`），默认仍是 reject——
 *    「decode 兑现即算可画」那条路要单独开一个场景覆盖，但默认口径不许变。
 * 4. `host.querySelector` 对未知选择器**抛错**（不是返回 null）—— 提示气泡与衣服
 *    SVG 刻意缺席，让 `applyHintPlacement` 走「量不到 → CSS 兜底」。
 */

import { noteDragRelease } from "./wallpaper-pull";

/** 站点根：壁纸池里的相对路径按它解析成绝对地址 */
export const WALLPAPER_BASE_URL = "https://example.test/";

/** 默认壁纸池：两套测试共用一份，免得各抄各的又各改各的 */
export const WALLPAPER_POOL = [
	"/images/bg/a.jpg",
	"/images/bg/b.jpg",
	"/images/bg/c.jpg",
] as const;

/** 把池里的相对路径解析成绝对地址 */
export const wallpaperUrl = (path: string): string =>
	new URL(path, WALLPAPER_BASE_URL).href;

/**
 * flush 的微任务轮数。
 *
 * 原来的两套桩分别是 8 轮与 12 轮；实测两个方向都跑通（见
 * `output/architecture-2026-11-10/F3/flush-equiv/flush-equiv.log`），
 * 轮数只影响「等多久」，不影响任何结局，所以统一取较大的 12 轮。
 */
const FLUSH_ROUNDS = 12;

/**
 * 加载上限计时器的登记阈值（毫秒）：`setTimeout` 的 delay ≥ 它时**登记而不调度**。
 *
 * 生产代码的加载上限是 `LOAD_TIMEOUT_MS = 12000`，回弹是 320ms、rAF 合帧是 0ms。
 * 把长计时器登记下来、由测试显式触发，超时路径就不依赖墙上时间。
 */
const LOAD_TIMEOUT_THRESHOLD_MS = 5000;

// ---- 事件桩 ----

export type WallpaperEventInit = {
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

export type WallpaperEvent = {
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

type Listener = (event: WallpaperEvent) => void;

/**
 * 一个可派发的事件目标。
 *
 * 只支持测试真正用到的那两件事：addEventListener / 手动派发。
 * 派发到**没有监听器**的事件类型会抛错——静默空跑会让「派发了但没人接」看起来
 * 像「行为正确」，是假绿的来源。
 */
function makeEventTarget(label: string) {
	const listeners = new Map<string, Listener[]>();
	return {
		addEventListener(type: string, listener: Listener) {
			const list = listeners.get(type) ?? [];
			list.push(listener);
			listeners.set(type, list);
		},
		/** 派发一次事件；返回事件本身，便于读 defaultPrevented */
		dispatch(type: string, init: WallpaperEventInit = {}): WallpaperEvent {
			const list = listeners.get(type);
			if (!list || list.length === 0) {
				throw new Error(
					`[wallpaper-scenario] ${label} 上没有 "${type}" 的监听器：派发它不会有任何效果`,
				);
			}
			const event: WallpaperEvent = {
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
			for (const listener of list) listener(event);
			return event;
		},
		hasListener(type: string): boolean {
			return (listeners.get(type)?.length ?? 0) > 0;
		},
	};
}

// ---- 场景 ----

/** 候选预载用的假图；结局由测试显式驱动（成功 / 失败 / 超时） */
export type FakeWallpaperImage = {
	complete: boolean;
	naturalWidth: number;
	src: string;
	onload: (() => void) | null;
	onerror: (() => void) | null;
	decode: () => Promise<void>;
};

export type WallpaperScenarioOptions = {
	/** 壁纸池（相对路径） */
	pool?: readonly string[];
	/** 当前正在看的那张（绝对地址或相对路径都行） */
	current?: string;
	/** 「减少动态」偏好：运行时每次调用都即时查询它 */
	reducedMotion?: boolean;
	/** 站点根 */
	baseUrl?: string;
	/**
	 * 候选预载时 `decode()` 的结局：
	 * - `reject`（默认）：decode 被拒，判据退化为「加载完成 + 固有尺寸」；
	 * - `resolve`：decode 成功，走「decode 兑现即算可画」那条路。
	 *
	 * 真实浏览器里 decode 被拒是常态（并发与大尺寸图片会拒掉合法图片），
	 * 所以默认必须是 reject；resolve 那条路要有用例覆盖，就得显式开。
	 */
	decodeOutcome?: "resolve" | "reject";
};

export type WallpaperScenario = {
	/** 挂件宿主（classList / style / dataset 都在它身上） */
	readonly host: HTMLElement;
	// ---------- 观测 ----------
	/** 当前背景的 src（提交后才变） */
	readonly backgroundSrc: string;
	/** 播报区写的词（换好了 / 没得换 / 加载失败） */
	readonly announcement: string;
	/** 已发起的候选预载次数——忙碌锁的唯一外部证据 */
	readonly attemptCount: number;
	/** 每次候选预载请求的地址（按请求顺序） */
	readonly requestedUrls: readonly string[];
	/** 宿主收到的 class 名（摇头 / 回弹 / 自动提示的唯一外部证据） */
	readonly classesAdded: string[];
	readonly classesRemoved: string[];
	/** 宿主下发的 CSS 变量 */
	readonly styleProps: Readonly<Record<string, string>>;
	/** 宿主 dataset（busy / dragging / dragReleaseAt / bound …） */
	readonly dataset: Readonly<Record<string, string | undefined>>;
	hasClass(name: string): boolean;
	styleProp(name: string): string | undefined;

	// ---------- 操作 ----------
	click(init?: WallpaperEventInit): WallpaperEvent;
	keyDown(init: WallpaperEventInit): WallpaperEvent;
	/** 一次完整的按下 → 移动；`dy` 是相对起点的垂直位移 */
	drag(pointerId: number, dy: number, dx?: number): void;
	release(pointerId: number, timeStamp?: number): void;
	cancelPointer(pointerId: number, timeStamp?: number): void;
	losePointerCapture(pointerId: number, timeStamp?: number): void;
	/** Escape 取消入口（挂在 document 上） */
	pressEscape(timeStamp?: number): void;
	/** 页面失焦取消入口（挂在 window 上） */
	blurWindow(timeStamp?: number): void;
	/** 记一次「拖动释放」时刻（生产函数，供随后的 click 抑制使用） */
	noteDragRelease(timeStamp: number): void;
	/** 清掉拖动释放时刻 */
	clearDragRelease(): void;
	setReducedMotion(value: boolean): void;
	/** 会话中途改池（配置热更新 / data 属性被改写） */
	setPool(pool: readonly string[]): void;
	setRandom(fn: () => number): void;

	// ---------- 结局驱动 ----------
	/** 结束最近一次候选预载：`ok=false` 即加载失败 */
	finishLastPreload(ok: boolean): Promise<void>;
	/** 逐个结束所有进行中的预载（全部失败），直到事务结算完毕 */
	failAllPreloads(limit?: number): Promise<void>;
	/** 触发已登记的「加载上限」计时器——模拟弱网下迟迟等不到结果 */
	fireLoadTimeouts(): Promise<void>;
	/**
	 * 在某一次预载上**同步**派发一个事件，不自动 flush。
	 *
	 * 用来测「两个信号先后到」与「迟到的事件」：生产实现在 load 之后才问 decode，
	 * decode 的 settle 落在微任务里；因此同步连发两个信号时，先同步结算的那个定案。
	 * `load` 会把图片置成「已完成且有固有尺寸」，`error` 会置成「已完成但无尺寸」。
	 *
	 * @param kind "load"（加载完成）/ "error"（加载失败）
	 * @param naturalWidth 加载完成时的固有尺寸；不传则 load 用 1200、error 用 0
	 * @param index 目标是第几次发起的预载（按创建顺序；默认 -1 = 最近一次）。
	 *   测「迟到事件」时要指向**已经结算过**的那一次，用 `preloadImageCount()` 算下标。
	 */
	firePreloadEvent(
		kind: "load" | "error",
		naturalWidth?: number,
		index?: number,
	): void;
	/** 观测：已发起的预载图片数（按创建顺序） */
	preloadImageCount(): number;
	/**
	 * 观测：第 `index` 次预载（按创建顺序，默认最近一次）是否还挂着 load/error 处理器。
	 *
	 * 按次看而不是统计总数：一次候选被判失败后会立刻起下一次预载，总数不会归零，
	 * 只有「这一次的处理器有没有被摘掉」才说明清理真的发生了。
	 */
	preloadHandlersAttached(index?: number): boolean;

	// ---------- 时序 ----------
	/** 等所有 promise 链跑完（不 sleep 固定毫秒） */
	flush(): Promise<void>;
	/** 等合帧的 rAF 把变量写下去 */
	settleFrame(): Promise<void>;

	/** 释放场景：还原全局桩，之后再读观测会抛错 */
	dispose(): void;
};

// ---- 模块级状态（每次建场景时重置） ----

type CapturedTimer = { cb: () => void; delay: number };

/** 已登记的长计时器：登记而不调度，由测试显式触发 */
let capturedTimers: CapturedTimer[] = [];
/** 当前「减少动态」偏好：运行时每次调用 `prefersReducedMotion()` 都重新读它 */
let reducedMotion = false;
/** 当前 `decode()` 的结局（见 WallpaperScenarioOptions.decodeOutcome） */
let decodeOutcome: "resolve" | "reject" = "reject";
/** 当前场景（供 currentWallpaperScenario 查询） */
let activeScenario: WallpaperScenario | null = null;

/**
 * 真定时器：模块加载时取一次。
 *
 * 原 failure 桩在同文件里第二次 `installGlobals()` 时会把**已被替换的**
 * `globalThis.setTimeout` 当成 real 再包一层；这里固定取真身，不再二次包裹。
 */
const realSetTimeout = globalThis.setTimeout;
const realClearTimeout = globalThis.clearTimeout;
const realRandom = Math.random;

/** 建场景前存下的全局原值，dispose 时还原 */
const originalGlobals = {
	document: (globalThis as Record<string, unknown>).document,
	window: (globalThis as Record<string, unknown>).window,
	Image: (globalThis as Record<string, unknown>).Image,
	setTimeout: (globalThis as Record<string, unknown>).setTimeout,
	clearTimeout: (globalThis as Record<string, unknown>).clearTimeout,
	requestAnimationFrame: (globalThis as Record<string, unknown>)
		.requestAnimationFrame,
	cancelAnimationFrame: (globalThis as Record<string, unknown>)
		.cancelAnimationFrame,
	getComputedStyle: (globalThis as Record<string, unknown>).getComputedStyle,
};

/**
 * 当前场景：没有场景时抛错。
 *
 * 「场景未建立就读取」必须失败——静默返回空值会让用例误以为行为正确。
 */
export function currentWallpaperScenario(): WallpaperScenario {
	if (!activeScenario) {
		throw new Error(
			"[wallpaper-scenario] 场景尚未建立：先调用 createWallpaperScenario()",
		);
	}
	return activeScenario;
}

/**
 * 建一个挂件场景：装好全局桩、铺好 DOM、给出操作与观测。
 *
 * 每次调用都重装全局（等价于原测试里的 `installGlobals()`），并复位
 * `Math.random` 与长计时器登记。
 */
export function createWallpaperScenario(
	options: WallpaperScenarioOptions = {},
): WallpaperScenario {
	const baseUrl = options.baseUrl ?? WALLPAPER_BASE_URL;
	const pool = options.pool ?? WALLPAPER_POOL;
	const currentSrc =
		options.current ?? (pool.length > 0 ? wallpaperUrl(pool[0]!) : "");

	reducedMotion = options.reducedMotion ?? false;
	decodeOutcome = options.decodeOutcome ?? "reject";
	capturedTimers = [];
	Math.random = realRandom;

	// ---- 页面桩 ----

	const buttonTarget = makeEventTarget("按钮");
	const buttonWithCapture = Object.assign(buttonTarget, {
		setPointerCapture: () => {},
		releasePointerCapture: () => {},
	});
	const live = { textContent: "" };

	const classesAdded: string[] = [];
	const classesRemoved: string[] = [];
	const classSet = new Set<string>();
	const styleProps: Record<string, string> = {};
	const dataset: Record<string, string | undefined> = {};

	const hostTarget = makeEventTarget("宿主");
	const host = Object.assign(hostTarget, {
		dataset,
		offsetWidth: 30,
		// T3 的跟手位移靠 .is-settling 类切换过渡，桩要能收 classList
		classList: {
			add(name: string) {
				classSet.add(name);
				classesAdded.push(name);
			},
			remove(name: string) {
				classSet.delete(name);
				classesRemoved.push(name);
			},
			contains(name: string) {
				return classSet.has(name);
			},
		},
		style: {
			props: styleProps,
			setProperty(name: string, value: string) {
				styleProps[name] = value;
			},
			// 运行时在「导航不可用」时会撤掉 --wpull-left，桩要能接住
			removeProperty(name: string) {
				delete styleProps[name];
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
			// 提示气泡与衣服 SVG：本套桩不测几何（提示另有 hint 单测），
			// 桩里刻意缺席，让 applyHintPlacement 走「量不到 → 交 CSS 兜底」那条路
			if (selector === ".wpull__hint" || selector === ".wpull__art")
				return null;
			throw new Error(`unexpected selector: ${selector}`);
		},
	});

	const background = {
		dataset: { backgrounds: JSON.stringify(pool) } as Record<
			string,
			string | undefined
		>,
		src: currentSrc,
		currentSrc,
	};

	const pending: FakeWallpaperImage[] = [];
	const requestedUrls: string[] = [];

	const documentTarget = makeEventTarget("document");
	const windowTarget = makeEventTarget("window");

	// ---- 全局桩 ----

	const g = globalThis as Record<string, unknown>;
	g.document = {
		baseURI: baseUrl,
		documentElement: { clientWidth: 1440 },
		addEventListener: documentTarget.addEventListener,
		querySelector(selector: string) {
			switch (selector) {
				case "[data-wallpaper-pull]":
					return host as unknown;
				case ".bg-image[data-backgrounds]":
					return background as unknown;
				// 横向锚点桩成「不存在」：几何另有单测，这里走兜底比例即可
				case "#head-nav":
					return null;
				default:
					throw new Error(`unexpected selector: ${selector}`);
			}
		},
		// 故意没有 createElement：交叉淡入层因此建不起来，走「直接切换」退化路径
	};
	g.window = {
		addEventListener: windowTarget.addEventListener,
		// prefersReducedMotion() 读的是 window.matchMedia；
		// 返回的是**每次新建**的查询对象，与真实 matchMedia 的同形语义一致
		matchMedia: () => ({ matches: reducedMotion }),
	};

	// 加载上限的计时器要能被测试捕获并手动触发：延迟够长的登记下来，
	// 其余（rAF 合帧的 0ms、回弹的 320ms）照常走真实计时器。
	g.setTimeout = ((cb: () => void, delay?: number) => {
		if ((delay ?? 0) >= LOAD_TIMEOUT_THRESHOLD_MS) {
			capturedTimers.push({ cb, delay: delay ?? 0 });
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
		const image: FakeWallpaperImage = {
			complete: false,
			naturalWidth: 0,
			src: "",
			onload: null,
			onerror: null,
			// decode 的结局由场景选项决定：默认被拒（真实浏览器的常态），
			// 判据必须退化为「加载完成 + 固有尺寸」
			decode: () =>
				decodeOutcome === "resolve"
					? Promise.resolve()
					: Promise.reject(new Error("decode rejected for test")),
		};
		Object.defineProperty(image, "src", {
			get: () => "",
			set: (value: string) => {
				// 记下这次请求的地址，供「试了哪些候选」的断言使用
				requestedUrls.push(value);
				pending.push(image);
			},
		});
		return image;
	};

	// ---- 时序 ----

	async function flush(): Promise<void> {
		for (let i = 0; i < FLUSH_ROUNDS; i++) await Promise.resolve();
		await new Promise((resolve) => realSetTimeout(resolve, 0));
		for (let i = 0; i < FLUSH_ROUNDS; i++) await Promise.resolve();
	}

	async function settleFrame(): Promise<void> {
		await new Promise((resolve) => realSetTimeout(resolve, 0));
	}

	/** 场景是否已被释放：释放后一切观测与派发都要失败 */
	let disposed = false;

	function assertAlive(): void {
		if (disposed) {
			throw new Error(
				"[wallpaper-scenario] 场景已释放：不能再读观测或派发",
			);
		}
	}

	const scenario: WallpaperScenario = {
		host: host as unknown as HTMLElement,
		get backgroundSrc() {
			assertAlive();
			return background.src;
		},
		get announcement() {
			assertAlive();
			return live.textContent;
		},
		get attemptCount() {
			assertAlive();
			return pending.length;
		},
		get requestedUrls() {
			assertAlive();
			return requestedUrls;
		},
		get classesAdded() {
			assertAlive();
			return classesAdded;
		},
		get classesRemoved() {
			assertAlive();
			return classesRemoved;
		},
		get styleProps() {
			assertAlive();
			return styleProps;
		},
		get dataset() {
			assertAlive();
			return dataset;
		},
		hasClass(name: string) {
			assertAlive();
			return classSet.has(name);
		},
		styleProp(name: string) {
			assertAlive();
			return styleProps[name];
		},

		click(init: WallpaperEventInit = {}) {
			assertAlive();
			return buttonTarget.dispatch("click", init);
		},
		keyDown(init: WallpaperEventInit) {
			assertAlive();
			return buttonTarget.dispatch("keydown", init);
		},
		drag(pointerId: number, dy: number, dx = 0) {
			assertAlive();
			buttonTarget.dispatch("pointerdown", {
				pointerId,
				clientX: 100,
				clientY: 100,
			});
			buttonTarget.dispatch("pointermove", {
				pointerId,
				clientX: 100 + dx,
				clientY: 100 + dy,
			});
		},
		release(pointerId: number, timeStamp = 1000) {
			assertAlive();
			buttonTarget.dispatch("pointerup", { pointerId, timeStamp });
		},
		cancelPointer(pointerId: number, timeStamp = 1000) {
			assertAlive();
			buttonTarget.dispatch("pointercancel", { pointerId, timeStamp });
		},
		losePointerCapture(pointerId: number, timeStamp = 1000) {
			assertAlive();
			buttonTarget.dispatch("lostpointercapture", {
				pointerId,
				timeStamp,
			});
		},
		pressEscape(timeStamp = 1000) {
			assertAlive();
			documentTarget.dispatch("keydown", { key: "Escape", timeStamp });
		},
		blurWindow(timeStamp = 1000) {
			assertAlive();
			windowTarget.dispatch("blur", { timeStamp });
		},
		noteDragRelease(timeStamp: number) {
			assertAlive();
			noteDragRelease(host as unknown as HTMLElement, timeStamp);
		},
		clearDragRelease() {
			assertAlive();
			delete dataset.dragReleaseAt;
		},
		setReducedMotion(value: boolean) {
			assertAlive();
			reducedMotion = value;
		},
		setPool(next: readonly string[]) {
			assertAlive();
			background.dataset.backgrounds = JSON.stringify(next);
		},
		setRandom(fn: () => number) {
			assertAlive();
			Math.random = fn;
		},

		async finishLastPreload(ok: boolean) {
			assertAlive();
			const image = pending.at(-1);
			if (!image) {
				throw new Error("[wallpaper-scenario] 没有可结束的候选预载");
			}
			image.complete = true;
			image.naturalWidth = ok ? 1200 : 0;
			if (ok) image.onload?.();
			else image.onerror?.();
			await flush();
		},
		firePreloadEvent(
			kind: "load" | "error",
			naturalWidth?: number,
			index = -1,
		) {
			assertAlive();
			const at = index < 0 ? pending.length + index : index;
			const image = pending[at];
			if (!image) {
				throw new Error(
					`[wallpaper-scenario] 没有第 ${at} 次候选预载（共 ${pending.length} 次）`,
				);
			}
			image.complete = true;
			image.naturalWidth = naturalWidth ?? (kind === "load" ? 1200 : 0);
			if (kind === "load") image.onload?.();
			else image.onerror?.();
		},
		preloadImageCount() {
			assertAlive();
			return pending.length;
		},
		preloadHandlersAttached(index = -1) {
			assertAlive();
			const at = index < 0 ? pending.length + index : index;
			const image = pending[at];
			if (!image) {
				throw new Error(
					`[wallpaper-scenario] 没有第 ${at} 次候选预载（共 ${pending.length} 次）`,
				);
			}
			return image.onload !== null || image.onerror !== null;
		},
		async failAllPreloads(limit = 8) {
			assertAlive();
			for (let i = 0; i < limit; i++) {
				await flush();
				const image = pending.at(-1);
				if (!image || image.complete) break;
				image.complete = true;
				image.naturalWidth = 0;
				image.onerror?.();
				await flush();
			}
			await flush();
		},
		async fireLoadTimeouts() {
			assertAlive();
			const timers = capturedTimers.filter(
				(t) => t.delay >= LOAD_TIMEOUT_THRESHOLD_MS,
			);
			capturedTimers = capturedTimers.filter(
				(t) => t.delay < LOAD_TIMEOUT_THRESHOLD_MS,
			);
			if (timers.length === 0) {
				throw new Error(
					"[wallpaper-scenario] 没有已登记的加载上限计时器",
				);
			}
			for (const timer of timers) timer.cb();
			await flush();
		},

		flush,
		settleFrame,

		dispose() {
			disposed = true;
			if (activeScenario === scenario) activeScenario = null;
			g.document = originalGlobals.document;
			g.window = originalGlobals.window;
			g.Image = originalGlobals.Image;
			g.setTimeout = originalGlobals.setTimeout;
			g.clearTimeout = originalGlobals.clearTimeout;
			g.requestAnimationFrame = originalGlobals.requestAnimationFrame;
			g.cancelAnimationFrame = originalGlobals.cancelAnimationFrame;
			g.getComputedStyle = originalGlobals.getComputedStyle;
			Math.random = realRandom;
		},
	};

	activeScenario = scenario;
	return scenario;
}
