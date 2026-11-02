/**
 * 拉绳壁纸挂件运行时（spec #127）。
 *
 * 生命周期：装配表 `{ init: initWallpaperPull }` —— 只在整页跑一次，不进 swap 序。
 * 挂件在 Swup 容器之外、切页不重建（与 initRandomBackground 同一档），
 * `dataset.bound` 守卫防重入时监听器翻倍（照 back-to-top.ts 的先例）。
 *
 * 票 #128 只做定位；票 #129 追加**单击与键盘换图**（本文件现在的 `requestChange`）。
 * 下拉拖拽（阈值判定、回弹、指针捕获收尾）留给 T3，但**必须走同一个
 * `requestChange()` 入口**，不要复制第二套选图逻辑。T3 的接入点有两处，
 * 都在本文件里标了 `T3：` 注释——`requestChange` 与 `lastDragReleaseAt`。
 *
 * 壁纸池唯一来源是 `src/config.ts` 的 `backgroundConfig.images`，由 Layout.astro
 * 序列化进 `.bg-image[data-backgrounds]`；本模块只读这个既有通道，
 * 不读目录、不新增第二份数组、不碰 `public/images/random/tb*.jpg`。
 *
 * 选图逻辑全部在 `../wallpaper-candidates.ts`（纯函数、随机源可注入），
 * 本文件只负责「取当前图 → 取候选 → 预载确认 → 提交 → 播报 → 解锁」。
 */

import {
	collectWallpaperCandidates,
	selectNextWallpaper,
} from "../wallpaper-candidates";
import {
	orderAttempts,
	runAttempts,
	type TryLoadResult,
} from "../wallpaper-pull-attempts";
import {
	isDragStarted,
	isPullPastThreshold,
	resolvePull,
} from "../wallpaper-pull-drag";
import { prefersReducedMotion } from "./reduced-motion";
import { crossfadeBackground } from "./wallpaper-crossfade";

const HOST_SELECTOR = "[data-wallpaper-pull]";
/** 挂件里唯一可聚焦、可点击的按钮（T1 输出） */
const BUTTON_SELECTOR = ".wpull__grab";
/** 礼貌级别的结果播报区（T1 输出，role=status + aria-live=polite） */
const LIVE_SELECTOR = ".wpull__live";
/**
 * 发现性提示气泡（T1 输出，aria-hidden 装饰）。
 *
 * 宽度随字体与语言变化，只能实测；挂哪一侧见 computeHintPlacement。
 */
const HINT_SELECTOR = ".wpull__hint";
/** 既有背景层：继续复用它，不另建 body 背景图 */
const BACKGROUND_SELECTOR = ".bg-image[data-backgrounds]";
const NAV_SELECTOR = "#head-nav";
const TITLE_SELECTOR = "#header .site-title";
/** 挂件右缘与视口右缘之间至少要留出的空隙，窄屏夹取时用 */
const EDGE_GAP = 8;
/** 提示气泡与 T 恤之间的视觉间距（与 global.css 的 --wpull-hint-gap 一致） */
const HINT_GAP = 8;
/**
 * 粗指针设备上自动提示停留的时长（毫秒）——票面「约三秒」。
 *
 * 只标记一次「已经提示过」，不写 localStorage：刷新页面后重新算首次，
 * 但同一次加载内绝不重复弹（票面硬约束）。
 */
const AUTO_HINT_MS = 3000;
/** SVG 里绳画到的 y 坐标（与 WallpaperPull.astro 的 viewBox 保持一致） */
const ROPE_END = 76;
/**
 * 候选图加载上限：超过按失败处理并解除忙碌，避免弱网下永久锁死
 * （spec「需要设置明确的加载上限」）。
 */
const LOAD_TIMEOUT_MS = 12000;
/**
 * 拖动释放后补发的 click 抑制窗口（毫秒）。
 *
 * 用**时间窗**而不是布尔标志：布尔标志在「拖完但浏览器没补 click」时会留成
 * 陈旧值，把下一次真实点击吞掉——这正是 use-gesture #530 / pullcord 栽过的坑。
 * 浏览器补发的 click 与 pointerup 在同一任务里，差值只有几毫秒。
 */
const CLICK_AFTER_DRAG_MS = 250;

/**
 * 回弹时长（毫秒）——必须与 global.css 里 `.is-settling` 那段 transform
 * 过渡的时长一致；改一处就要改另一处。
 *
 * 320ms 配 `--ease-out`（减速曲线、无过冲）是「弹回原位」而不是「弹簧」：
 * 弹簧会来回抖动，正是票面点名要避免的。手感上比单击反馈略长一点，
 * 让「松手 → 回去」有可感知的收束感，但不至于让人等。
 */
const SETTLE_MS = 320;

/**
 * 摇头反馈时长（毫秒）——必须与 global.css 里 `.wpull.is-shaking` 的
 * `animation: ... SHAKE_MS` 一致；改一处就要改另一处（与 SETTLE_MS 同一口径）。
 *
 * 220ms 是「短摇头」：足够被看见一次左右摆，又短到不会被当成故障抖动。
 * 只摇**一次**（animation-iteration-count: 1），不循环。
 */
const SHAKE_MS = 220;

/** 三类结果播报文本：必须各不相同（票面硬约束） */
const ANNOUNCEMENT = {
	changed: "换好了",
	none: "没得换",
	failed: "加载失败",
} as const;

/**
 * 记录一次「拖动释放」的时刻，供随后的 click 抑制使用。
 *
 * T3 的收尾函数（pointerup / pointercancel / 捕获丢失 / Escape / 失焦共用）
 * 在**真正拖动过**的那一条路径上调用它，然后浏览器的补发 click 会被抑制。
 * 不用布尔标志：布尔标志在「拖完但浏览器没补 click」时会留成陈旧值，
 * 把下一次真实点击吞掉（use-gesture #530 / pullcord 栽过的正是这个）。
 */
export function noteDragRelease(host: HTMLElement, timeStamp: number) {
	host.dataset.dragReleaseAt = String(timeStamp);
}

/**
 * 把挂件摆到「中心线对齐主导航右缘、衣服底边对齐标题顶边」的位置。
 *
 * 纯几何计算，不读 DOM：便于在单测里注入矩形覆盖边界。
 *
 * @param nav     主导航的矩形（缺失时退回 null）
 * @param title   桌面头部标题的矩形（缺失时退回 null）
 * @param widgetW 挂件盒宽（px）
 * @param viewportW 可用宽度（已扣除滚动条）
 * @param viewportH 视口高（当前用于兜底，保留参数以便后续票按需使用）
 * @returns left（盒子中心线的 x 坐标）与 drop（绳长，即衣服顶端的 y 偏移）
 */
export function computePlacement({
	nav,
	title,
	widgetW,
	viewportW,
}: {
	nav: DOMRectLike | null;
	title: DOMRectLike | null;
	widgetW: number;
	viewportW: number;
}): { left: number; drop: number } | null {
	if (!nav) return null;

	// 水平：中心线对齐导航右缘；若这样会右溢，则整体左移到不出屏为止。
	// 「被裁时主动计算位移」——其余宽度保持对齐关系不变。
	//
	// 两侧都要夹：只夹右边的话，视口窄到接近盒宽时中心线会算出负坐标
	// （viewportW - half - EDGE_GAP < half），盒子左缘被推到视口外，
	// 反而把衣服的左半边裁掉——那与「T 恤完整可见」的目标正好相反。
	// 下界 half + EDGE_GAP 让盒左缘至少停在 EDGE_GAP 处。
	//
	// 视口连盒子本身都放不下时（正式样式下不会发生：≤680px 挂件就隐藏了），
	// 居中摆放，两侧均分裁切——比单侧全部丢光更接近「完整可见」。
	const half = widgetW / 2;
	const minCenter = half + EDGE_GAP;
	const maxCenter = viewportW - half - EDGE_GAP;
	const left =
		maxCenter < minCenter
			? viewportW / 2
			: Math.min(Math.max(nav.right, minCenter), maxCenter);

	// 垂直：绳长让衣服底边落到标题顶边。取标题顶边作为 drop，
	// 缺失标题（独立壳/窄屏不显示标题块）时退回 0，挂件自然贴顶。
	const drop = title ? Math.max(0, title.top) : 0;

	return { left, drop };
}

/** 只取本模块需要的矩形字段，让单测能传普通对象而不必造真实 DOMRect */
export type DOMRectLike = {
	top: number;
	right: number;
};

/**
 * 决定发现性提示挂在挂件哪一侧、距盒子左缘多远（票 #133）。
 *
 * 为什么不能直接 `left: calc(100% + 8px)`（原来的写法）：
 * 挂件盒固定 130 宽，T 恤只占盒内 33..97，盒子右侧还有 33px 空白。
 * 以盒子右缘为锚时提示左缘落在盒内 138 处 —— 1440 视口下右缘 1449 溢出 9px，
 * 1100 及以下整颗跑到视口外（实测左缘正好等于 clientWidth），提示等于不存在。
 *
 * 口径：优先贴 **T 恤右缘** +8；右侧放不下就翻到 T 恤左侧；两侧都放不下时
 * 贴视口左缘兜底（宁可压住衣服，也不让字被裁掉）。返回的 left 是**相对盒子
 * 左缘**的偏移，直接写进 CSS 变量。
 *
 * @param shirtLeft / shirtRight T 恤在盒内的横向占位（实测，不写死视觉常量）
 * @returns null 表示宽度还没量到（元素未渲染 / 字体未就绪），交给 CSS 兜底
 */
export function computeHintPlacement({
	boxLeft,
	widgetW,
	viewportW,
	hintW,
	shirtLeft,
	shirtRight,
}: {
	boxLeft: number;
	widgetW: number;
	viewportW: number;
	hintW: number;
	shirtLeft: number;
	shirtRight: number;
}): { side: "right" | "left" | "clamped"; left: number } | null {
	if (widgetW <= 0 || viewportW <= 0 || hintW <= 0) return null;

	const fitsOn = (left: number) =>
		boxLeft + left >= EDGE_GAP &&
		boxLeft + left + hintW <= viewportW - EDGE_GAP;

	// 右侧：贴 T 恤右缘
	const right = shirtRight + HINT_GAP;
	if (fitsOn(right)) return { side: "right", left: right };

	// 左侧：右缘贴 T 恤左缘
	const left = shirtLeft - HINT_GAP - hintW;
	if (fitsOn(left)) return { side: "left", left };

	// 两侧都放不下：贴视口左缘（换算回盒内坐标）
	return { side: "clamped", left: EDGE_GAP - boxLeft };
}

/**
 * 要不要在首次出现时自动把提示亮一下（票 #133）。
 *
 * 触摸设备没有 hover，不自动提示就永远发现不了这个交互；反过来，能 hover 的
 * 设备自动弹一次是多余的打扰。判定收敛成一个纯函数，便于覆盖各档组合。
 *
 * `alreadyShown` 由调用方在**同一次页面加载内**维护：票面要求不写 localStorage、
 * 不重复弹出，所以状态只活在内存里，刷新页面才会重置。
 */
export function shouldAutoHint({
	coarsePointer,
	hasHover,
	alreadyShown,
	visible,
}: {
	coarsePointer: boolean;
	hasHover: boolean;
	alreadyShown: boolean;
	visible: boolean;
}): boolean {
	return coarsePointer && !hasHover && !alreadyShown && visible;
}

function readRect(el: Element | null): DOMRectLike | null {
	if (!el) return null;
	const r = el.getBoundingClientRect();
	return { top: r.top, right: r.right };
}

/** 按当前视口重算并下发 CSS 变量 */
function applyPlacement(host: HTMLElement) {
	const widgetW =
		host.offsetWidth || parseFloat(getComputedStyle(host).width) || 130;
	const viewportW = document.documentElement.clientWidth;
	const placement = computePlacement({
		nav: readRect(document.querySelector(NAV_SELECTOR)),
		title: readRect(document.querySelector(TITLE_SELECTOR)),
		widgetW,
		viewportW,
	});
	if (!placement) return null;
	host.style.setProperty("--wpull-left", `${placement.left}px`);
	host.style.setProperty("--wpull-drop", `${placement.drop}px`);
	// 绳在 SVG 里画到 ROPE_END，衣服整体下移 drop，绳必须同步伸长才接得上：
	// scaleY = (ROPE_END + drop) / ROPE_END，以绳顶为原点缩放。
	host.style.setProperty(
		"--wpull-rope-scale",
		String((ROPE_END + placement.drop) / ROPE_END),
	);
	applyHintPlacement(host, placement.left, widgetW, viewportW);
	// 返回值供拖动把「伸展量」当成额外的 drop 叠进绳长（见 writePull）
	return placement;
}

/**
 * 把提示气泡摆到 T 恤旁边（票 #133）。
 *
 * 宽度只能实测：它取决于字体与文案，写死会随字体加载或语言变化而错位。
 * 量不到（display:none / 尚未渲染）时清掉变量，让 global.css 的兜底值接管。
 *
 * @param boxCenter computePlacement 给出的**中心线** x（CSS 靠 translate:-50% 对中）
 */
function applyHintPlacement(
	host: HTMLElement,
	boxCenter: number,
	widgetW: number,
	viewportW: number,
) {
	const hint = host.querySelector<HTMLElement>(HINT_SELECTOR);
	const art = host.querySelector<SVGElement>(".wpull__art");
	if (!hint || !art) return;
	const hintW = hint.offsetWidth;
	const shirt = art.querySelector<SVGGraphicsElement>(".wpull__shirt");
	if (!shirt) return;
	// 屏幕坐标差换算回「盒内坐标」：两者都相对视口左上角，相减即盒内偏移
	const artBox = art.getBoundingClientRect();
	const shirtBox = shirt.getBoundingClientRect();
	const placement = computeHintPlacement({
		// computePlacement 返回的是**中心线**（CSS 靠 translate:-50% 把盒子左右对中），
		// 这里要的是盒子左缘 —— 差一个半宽，漏掉会把提示整体算偏 65px。
		boxLeft: boxCenter - widgetW / 2,
		widgetW,
		viewportW,
		hintW,
		shirtLeft: shirtBox.left - artBox.left,
		shirtRight: shirtBox.right - artBox.left,
	});
	if (!placement) {
		host.style.removeProperty("--wpull-hint-left");
		delete host.dataset.hintSide;
		return;
	}
	host.style.setProperty("--wpull-hint-left", `${placement.left}px`);
	host.dataset.hintSide = placement.side;
}

/**
 * 在独立图像对象上确认候选可用，**不碰当前背景**。
 *
 * 判据不是「decode 成功」而是「能用」：decode 被拒绝时退化为
 * 「加载完成且具有固有尺寸」——并发与大尺寸图片会拒掉合法图片（spec 原文）。
 *
 * 每个候选只尝试一次；超过 `LOAD_TIMEOUT_MS` 返回 `timeout`（**按失败处理**，
 * 让调用方换下一个候选并解除忙碌，弱网下不永久锁死）。
 */
function preloadCandidate(url: string): Promise<TryLoadResult> {
	return new Promise<TryLoadResult>((resolve) => {
		const image = new Image();
		let settled = false;
		let timer: ReturnType<typeof setTimeout> | null = null;

		const finish = (result: TryLoadResult) => {
			if (settled) return;
			settled = true;
			if (timer !== null) clearTimeout(timer);
			image.onload = null;
			image.onerror = null;
			resolve(result);
		};

		image.onload = () => {
			// 加载完成后再问一次 decode；被拒不算失败，交给固有尺寸判据
			const decoded =
				typeof image.decode === "function"
					? image.decode()
					: Promise.resolve();
			const settle = () =>
				finish(
					image.complete && image.naturalWidth > 0 ? "ok" : "failed",
				);
			Promise.resolve(decoded).then(settle, settle);
		};
		image.onerror = () => finish("failed");

		// 明确的加载上限：到点按超时收口，绝不无限挂着忙碌锁
		timer = setTimeout(() => finish("timeout"), LOAD_TIMEOUT_MS);
		image.src = url;
	});
}

/** 从既有背景层上读壁纸池（配置的唯一序列化通道） */
function readBackgroundPool(background: HTMLImageElement | null): unknown[] {
	const raw = background?.dataset.backgrounds;
	if (!raw) return [];
	try {
		const parsed: unknown = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed : [];
	} catch (error) {
		// 语料坏了不要抛到交互路径上：候选模块会按「空池」返回无候选
		console.warn("[wallpaper-pull] config parse failed:", error);
		return [];
	}
}

export function initWallpaperPull() {
	const found = document.querySelector<HTMLElement>(HOST_SELECTOR);
	if (!found || found.dataset.bound === "true") return;
	// 收窄后固定成常量别名：下面的闭包（requestChange 等）里 TS 不再认为它可能为 null
	const host: HTMLElement = found;

	/** 静止位姿下衣服要下移多少（T1 的 --wpull-drop）；拖动时叠在它上面 */
	let dropPx = Math.max(0, applyPlacement(host)?.drop ?? 0);

	const button = host.querySelector<HTMLButtonElement>(BUTTON_SELECTOR);
	const live = host.querySelector<HTMLElement>(LIVE_SELECTOR);

	/** 一次换图事务未完成前拒绝重复触发（成功/无候选/失败都由 finally 解锁） */
	let busy = false;

	/** 摇头动画的清理计时器：连续失败时要能重新起一次，不叠加 */
	let shakeTimer: ReturnType<typeof setTimeout> | null = null;

	/**
	 * 「没换成」的非颜色反馈：衣服短摇头一次（T5）。
	 *
	 * 「没得换」与「加载失败」共用这一个反馈——票面要求两档结果在视觉上一致，
	 * 区别交给播报区。**非颜色**是硬约束：只变色会让色觉障碍访客拿不到信息。
	 *
	 * 减少动态时整体跳过（前庭风险），信息通道仍由播报区承担。
	 * 动画本体在 global.css 的 `.wpull.is-shaking`，时长与 SHAKE_MS 一致。
	 */
	function shake() {
		if (prefersReducedMotion()) return;
		// 摘掉再加重排：连续两次失败时，同一个类名不会重启动画
		host.classList.remove("is-shaking");
		void host.offsetWidth;
		host.classList.add("is-shaking");
		if (shakeTimer !== null) clearTimeout(shakeTimer);
		shakeTimer = setTimeout(() => {
			shakeTimer = null;
			host.classList.remove("is-shaking");
		}, SHAKE_MS);
	}

	/** 读 T3 写下的拖动释放时刻（见 noteDragRelease 的注释） */
	const readDragReleaseAt = () => {
		const raw = host.dataset.dragReleaseAt;
		const value = raw === undefined ? Number.NaN : Number.parseFloat(raw);
		return Number.isFinite(value) ? value : -Infinity;
	};

	/** 把结果词写进礼貌级别播报区；同一句话再播一次也要能被重新播报 */
	function announce(text: string) {
		if (!live) return;
		if (live.textContent === text) {
			live.textContent = "";
			requestAnimationFrame(() => {
				live.textContent = text;
			});
			return;
		}
		live.textContent = text;
	}

	/**
	 * 换图事务（单击、Enter / Space、以及 T3 的拖拽达阈值共用这一个入口）。
	 *
	 * 顺序是承重的：**先确认候选可用，再提交背景** —— 不得先把 src 改成
	 * 尚未加载完成的地址，否则会先露出空白。
	 *
	 * 失败与边界（T5）：
	 * · 首选由 selectNextWallpaper 均匀选出，失败后依次换用尚未尝试过的候选，
	 *   **每个最多试一次**（记账在 runAttempts 里）；
	 * · 全部失败 / 超时 → 背景保持不变、播报「加载失败」、摇头；
	 * · 无候选 → 播报「没得换」、同样是摇头（两档共用非颜色反馈）；
	 * · 四条路径都从 finally 解除忙碌锁，不遗留锁定。
	 */
	async function requestChange() {
		if (busy) return;
		busy = true;
		host.dataset.busy = "true";
		try {
			const background =
				document.querySelector<HTMLImageElement>(BACKGROUND_SELECTOR);
			if (!background) {
				// 背景层缺失（独立壳或结构变更）：没有可换的东西，不伪造切换
				announce(ANNOUNCEMENT.none);
				shake();
				return;
			}

			const current = background.currentSrc || background.src || null;
			const pool = readBackgroundPool(background);
			// 首选仍走既有的均匀随机选图（保证「换到的一定不是当前这张」）
			const choice = selectNextWallpaper({
				pool,
				current,
				baseUrl: document.baseURI,
			});
			if (!choice.ok) {
				// 池是空的 / 只有当前这一张：两种原因都对访客说「没得换」
				announce(ANNOUNCEMENT.none);
				shake();
				return;
			}

			// 首选失败时依次换用尚未尝试过的候选；每个候选最多试一次
			const report = await runAttempts(
				orderAttempts(
					collectWallpaperCandidates(pool, current, document.baseURI),
					choice.url,
				),
				preloadCandidate,
			);
			if (report.status === "exhausted") {
				// 全部候选都加载不出来（含超时）：当前背景原样保留
				announce(ANNOUNCEMENT.failed);
				shake();
				return;
			}

			// 交叉淡入（T4）：旧图原地不动、只新建一层单向淡入；临时层建不起来
			// （受限环境）时退化为直接切换，保证功能仍在。
			const result = await crossfadeBackground(background, report.url);
			if (result === "skipped") background.src = report.url;
			if (result === "failed") {
				// 提交阶段失败：原背景已回滚，按「加载失败」告诉访客
				announce(ANNOUNCEMENT.failed);
				shake();
				return;
			}
			if (result === "cancelled") return;
			announce(ANNOUNCEMENT.changed);
		} finally {
			busy = false;
			delete host.dataset.busy;
		}
	}

	// ---------- T3：下拉拖拽与回弹 ----------
	//
	// 状态机只有三档：空闲 / 拖动中 / 收尾中（回弹过渡里）。
	// 指针事件全部挂在**衣服按钮**上（绳子在 SVG 里，从不挂监听、从不捕获指针）；
	// pointerup / pointercancel / 捕获丢失 / Escape / 失焦五路共用 releasePointer()。

	/** 当前按下的指针 id；null 表示没有进行中的手势（也排除多指混入） */
	let activePointerId: number | null = null;
	/** 是否已越过死区、真的进入拖动状态（死区内松手 = 单击，不是拖动） */
	let dragging = false;
	/** 起始坐标：只读一次，之后每个 pointermove 只写 transform 变量 */
	let startX = 0;
	let startY = 0;
	/** 本帧最新一次算出来的伸展量；rAF 合帧后才写进 CSS */
	let latestPull = 0;
	/** 已写进 CSS 的伸展量，供回弹时判断要不要处理 */
	let appliedPull = 0;
	let frame = 0;
	let settleTimer: ReturnType<typeof setTimeout> | null = null;

	/**
	 * 把伸展量写进两个 CSS 变量：衣服位移 + 绳子同步伸长。
	 *
	 * 减少动态时**一律写 0**：跟手位移本身就是位移，正是 vestibular 风险源。
	 * 手势仍照常被识别、阈值照常判定——只是衣服不跟着走。
	 * （完整降级——含单击脚本动画、交叉淡入——留给 T7。）
	 */
	function writePull(pull: number) {
		const effective = prefersReducedMotion() ? 0 : pull;
		appliedPull = effective;
		host.style.setProperty("--wpull-pull", `${effective}px`);
		// 绳子必须和衣服一起变长，否则中间断开：以「静止 drop + 本次伸展」重算 scaleY
		host.style.setProperty(
			"--wpull-rope-scale",
			String((ROPE_END + dropPx + effective) / ROPE_END),
		);
	}

	/** 合帧写变量：每个 pointermove 只更新 latestPull，一帧最多一次样式写入 */
	function scheduleWrite() {
		if (frame) return;
		frame = requestAnimationFrame(() => {
			frame = 0;
			writePull(latestPull);
		});
	}

	function cancelFrame() {
		if (!frame) return;
		cancelAnimationFrame(frame);
		frame = 0;
	}

	/** 清掉收尾计时器（回弹被新一次按下打断时用） */
	function cancelSettle() {
		if (settleTimer === null) return;
		clearTimeout(settleTimer);
		settleTimer = null;
	}

	/**
	 * 收尾：复位挂件、释放指针。**五路（pointerup / pointercancel /
	 * lostpointercapture / Escape / 失焦）共用这一个函数**。
	 *
	 * @param opts.change  本次收尾要不要判定阈值并换图。
	 *                     pointercancel / 捕获丢失 / Escape / 失焦 一律 false——
	 *                     被打断的手势不该产生结果。
	 * @param opts.timeStamp 用于 noteDragRelease 的时间戳（抑制补发的 click）
	 */
	function releasePointer(opts: {
		change: boolean;
		timeStamp: number;
		pointerId?: number;
	}) {
		cancelFrame();

		// 只处理我们真正在跟的那根指针；别的指针（第二根手指）抬起不该收掉手势
		if (
			opts.pointerId !== undefined &&
			opts.pointerId !== activePointerId
		) {
			return;
		}
		const wasDragging = dragging;
		const pull = latestPull;
		activePointerId = null;
		dragging = false;
		delete host.dataset.dragging;

		const shouldChange =
			opts.change && wasDragging && isPullPastThreshold(pull);

		// 先按当前值落地，再进回弹：否则被合帧吞掉的那几像素会跳变
		writePull(pull);

		// 真正拖动过才记时刻：单击（死区内没进入拖动）不该抑制随后的 click
		if (wasDragging) noteDragRelease(host, opts.timeStamp);

		if (shouldChange) {
			// T3 只管「拉到阈值后换图」；交叉淡入与失败反馈分别留给 T4 / T5
			void requestChange();
		}

		settle();
	}

	/** 回弹到静止位姿。reduced-motion 下直接归位、不留过渡（T7 会补全降级）。 */
	function settle() {
		cancelSettle();
		if (prefersReducedMotion()) {
			// 最小降级：不做跟手位移的余韵，直接回原位（T7 补全完整降级）
			host.classList.remove("is-settling");
			latestPull = 0;
			writePull(0);
			return;
		}
		host.classList.add("is-settling");
		latestPull = 0;
		writePull(0);
		settleTimer = setTimeout(() => {
			settleTimer = null;
			host.classList.remove("is-settling");
		}, SETTLE_MS);
	}

	if (button) {
		button.addEventListener("pointerdown", (event) => {
			// 只跟上主指针按下；已有手势进行中时忽略（多指不叠加）
			if (activePointerId !== null) return;
			if (event.button !== 0 && event.pointerType === "mouse") return;

			cancelSettle();
			// 回弹被打断：先摘掉过渡类，否则新的跟手位移会被过渡拖慢
			host.classList.remove("is-settling");

			activePointerId = event.pointerId;
			dragging = false;
			// 起始坐标只读这一次；之后每个 move 只做减法 + 写变量
			startX = event.clientX;
			startY = event.clientY;
			latestPull = 0;

			// 捕获指针：指针滑出衣服范围后仍然收到 move/up（票面硬约束）。
			// 捕获失败（元素已脱离文档等）不阻止后续逻辑。
			try {
				button.setPointerCapture(event.pointerId);
			} catch {
				// 某些环境（合成事件、旧内核）不支持捕获，继续走普通监听
			}
		});

		button.addEventListener("pointermove", (event) => {
			if (event.pointerId !== activePointerId) return;

			const dx = event.clientX - startX;
			const dy = event.clientY - startY;

			if (!dragging) {
				// 死区内：不写任何变量，视觉上完全静止，避免手抖被当成拖动
				if (!isDragStarted(dx, dy)) return;
				dragging = true;
				host.dataset.dragging = "true";
			}

			// 只吃向下的有效位移（向上 / 横向由 resolvePull 返回 0）
			latestPull = resolvePull({ dx, dy }).pull;
			scheduleWrite();
		});

		button.addEventListener("pointerup", (event) => {
			releasePointer({
				change: true,
				timeStamp: event.timeStamp,
				pointerId: event.pointerId,
			});
		});

		button.addEventListener("pointercancel", (event) => {
			// 系统手势 / 滚动抢走指针：安全复位，不换图
			releasePointer({
				change: false,
				timeStamp: event.timeStamp,
				pointerId: event.pointerId,
			});
		});

		button.addEventListener("lostpointercapture", (event) => {
			// 捕获被浏览器收回（元素移除、指针被其它元素拿走）：同样安全复位
			if (
				activePointerId === null ||
				event.pointerId !== activePointerId
			) {
				return;
			}
			releasePointer({ change: false, timeStamp: event.timeStamp });
		});

		button.addEventListener("click", (event) => {
			// 指针单击（detail >= 1）若紧跟在拖动释放之后，是浏览器补发的那一次——
			// 抑制它，避免一次手势换两次图。键盘产生的合成点击 detail === 0，
			// **必须放行**，不能被拖动抑制逻辑误伤。
			if (
				event.detail !== 0 &&
				event.timeStamp - readDragReleaseAt() < CLICK_AFTER_DRAG_MS
			) {
				return;
			}
			void requestChange();
		});

		button.addEventListener("keydown", (event) => {
			// Space 的原生激活发生在 keyup，且按钮上 Space 的默认动作可能顺带滚页：
			// 必须 preventDefault（票面硬约束），随后自己走同一入口，其它键（Enter）
			// 交给原生 click 处理，不在这里重复触发。
			if (event.key !== " " && event.key !== "Spacebar") return;
			event.preventDefault();
			// 按住不放的自动重复不叠加请求（忙碌锁之外的第二道闸）
			if (event.repeat) return;
			void requestChange();
		});
	}

	/** Escape 与失焦共用的取消入口：中途放弃，不换图 */
	function abortGesture(timeStamp: number) {
		if (activePointerId === null) return;
		releasePointer({ change: false, timeStamp });
	}

	// Escape：任何时候按都能放弃这次拉动（票面硬约束）。
	// 挂 document 而不是按钮上，因为拖动中焦点可能在别处。
	document.addEventListener("keydown", (event) => {
		if (event.key !== "Escape" && event.key !== "Esc") return;
		abortGesture(event.timeStamp);
	});

	// 页面失焦（切标签页 / 切窗口）：安全复位。passive：纯复位，不阻默认行为。
	//
	// 时间戳必须用 `performance.now()`：它与 `event.timeStamp` 同属一个
	// time origin，相减才有意义。改用 `Date.now()` 会得到约 -1.7e12 的差值，
	// 于是「差值 < 抑制窗口」永远成立 —— 一次失焦就把此后所有单击永久吞掉。
	window.addEventListener("blur", () => abortGesture(performance.now()), {
		passive: true,
	});

	// 视口变化时重算（标题盒高、导航宽度都随断点变化）。
	// passive：纯读取，不与滚动竞争。
	const reflow = () => {
		// 静止 drop 变了，绳长的基准也要跟着变（拖动中用 latestPull 叠加）。
		const placement = applyPlacement(host);
		if (placement) dropPx = Math.max(0, placement.drop);
		writePull(appliedPull);
	};
	let pending = 0;
	window.addEventListener(
		"resize",
		() => {
			// 合并同一帧内的多次 resize，避免每像素一次布局读取
			if (pending) return;
			pending = requestAnimationFrame(() => {
				pending = 0;
				reflow();
			});
		},
		{ passive: true },
	);

	// ---------- T6：发现性提示 ----------
	//
	// 两条通道共用同一个 `.wpull__hint` 与 `.is-hinting` 类：
	// · hover / 键盘聚焦：纯 CSS（global.css 里的 `:hover` / `:focus-visible` 兄弟选择器）；
	// · 粗指针设备首次出现：由这里挂类，AUTO_HINT_MS 后摘掉。
	//
	// 「只提示一次」的状态**只活在这次页面加载的内存里**：票面明确不写
	// localStorage，所以刷新页面视为首次，同一次加载内绝不重复弹。
	let hintShown = false;
	let hintTimer: ReturnType<typeof setTimeout> | null = null;
	const hintQuery = window.matchMedia?.("(hover: hover) and (pointer: fine)");
	const coarseQuery = window.matchMedia?.("(pointer: coarse)");

	/**
	 * 首次出现时给触摸设备自动亮一下提示（鼠标设备靠 hover 自己发现）。
	 *
	 * 视口窄到挂件整体隐藏时（≤680px）不触发，也不消耗「已提示」名额——
	 * 否则在窄屏加载过一次，宽屏上就再也看不到了。
	 */
	function maybeAutoHint() {
		const visible = getComputedStyle(host).display !== "none";
		const wanted = shouldAutoHint({
			coarsePointer: coarseQuery?.matches ?? false,
			hasHover: hintQuery?.matches ?? true,
			alreadyShown: hintShown,
			visible,
		});
		if (!wanted || hintShown) return;
		hintShown = true;
		host.classList.add("is-hinting");
		hintTimer = setTimeout(() => {
			hintTimer = null;
			host.classList.remove("is-hinting");
		}, AUTO_HINT_MS);
	}

	// 用户一旦主动 hover / 聚焦，自动提示就该让位（否则三秒内会与 CSS 打架）
	const dismissAutoHint = () => {
		if (hintTimer === null) return;
		clearTimeout(hintTimer);
		hintTimer = null;
		host.classList.remove("is-hinting");
	};
	button?.addEventListener("pointerenter", dismissAutoHint, {
		passive: true,
	});
	button?.addEventListener("focus", dismissAutoHint, { passive: true });

	// 字体就绪后再量：提示气泡宽度取决于字体，早量会拿到回退字体的宽度
	if (document.fonts?.ready) {
		void document.fonts.ready.then(() => {
			reflow();
			maybeAutoHint();
		});
	} else {
		maybeAutoHint();
	}

	host.dataset.bound = "true";
}
