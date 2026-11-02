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

import { selectNextWallpaper } from "../wallpaper-candidates";

const HOST_SELECTOR = "[data-wallpaper-pull]";
/** 挂件里唯一可聚焦、可点击的按钮（T1 输出） */
const BUTTON_SELECTOR = ".wpull__grab";
/** 礼貌级别的结果播报区（T1 输出，role=status + aria-live=polite） */
const LIVE_SELECTOR = ".wpull__live";
/** 既有背景层：继续复用它，不另建 body 背景图 */
const BACKGROUND_SELECTOR = ".bg-image[data-backgrounds]";
const NAV_SELECTOR = "#head-nav";
const TITLE_SELECTOR = "#header .site-title";
/** 挂件右缘与视口右缘之间至少要留出的空隙，窄屏夹取时用 */
const EDGE_GAP = 8;
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
	const half = widgetW / 2;
	const maxCenter = viewportW - half - EDGE_GAP;
	const navRight = nav.right;
	const left = Math.min(navRight, maxCenter);

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
	if (!placement) return;
	host.style.setProperty("--wpull-left", `${placement.left}px`);
	host.style.setProperty("--wpull-drop", `${placement.drop}px`);
	// 绳在 SVG 里画到 ROPE_END，衣服整体下移 drop，绳必须同步伸长才接得上：
	// scaleY = (ROPE_END + drop) / ROPE_END，以绳顶为原点缩放。
	host.style.setProperty(
		"--wpull-rope-scale",
		String((ROPE_END + placement.drop) / ROPE_END),
	);
}

/**
 * 在独立图像对象上确认候选可用，**不碰当前背景**。
 *
 * 判据不是「decode 成功」而是「能用」：decode 被拒绝时退化为
 * 「加载完成且具有固有尺寸」——并发与大尺寸图片会拒掉合法图片（spec 原文）。
 * 每个候选只尝试一次；超时按失败处理。
 */
function preloadCandidate(url: string): Promise<boolean> {
	return new Promise<boolean>((resolve) => {
		const image = new Image();
		let settled = false;
		let timer: ReturnType<typeof setTimeout> | null = null;

		const finish = (ok: boolean) => {
			if (settled) return;
			settled = true;
			if (timer !== null) clearTimeout(timer);
			image.onload = null;
			image.onerror = null;
			resolve(ok);
		};

		image.onload = () => {
			// 加载完成后再问一次 decode；被拒不算失败，交给固有尺寸判据
			const decoded =
				typeof image.decode === "function"
					? image.decode()
					: Promise.resolve();
			Promise.resolve(decoded).then(
				() => finish(image.complete && image.naturalWidth > 0),
				() => finish(image.complete && image.naturalWidth > 0),
			);
		};
		image.onerror = () => finish(false);

		timer = setTimeout(() => finish(false), LOAD_TIMEOUT_MS);
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

	applyPlacement(host);

	const button = host.querySelector<HTMLButtonElement>(BUTTON_SELECTOR);
	const live = host.querySelector<HTMLElement>(LIVE_SELECTOR);

	/** 一次换图事务未完成前拒绝重复触发（成功/无候选/失败都由 finally 解锁） */
	let busy = false;

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
				return;
			}

			const choice = selectNextWallpaper({
				pool: readBackgroundPool(background),
				current: background.currentSrc || background.src || null,
				baseUrl: document.baseURI,
			});
			if (!choice.ok) {
				// 池是空的 / 只有当前这一张：两种原因都对访客说「没得换」
				announce(ANNOUNCEMENT.none);
				return;
			}

			const usable = await preloadCandidate(choice.url);
			if (!usable) {
				// 加载失败：当前背景原样保留，控件解锁后可以再试
				announce(ANNOUNCEMENT.failed);
				return;
			}

			// 交叉淡入留给 T4；本票只提交已确认可用的地址
			background.src = choice.url;
			announce(ANNOUNCEMENT.changed);
		} finally {
			busy = false;
			delete host.dataset.busy;
		}
	}

	if (button) {
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

	// 视口变化时重算（标题盒高、导航宽度都随断点变化）。
	// passive：纯读取，不与滚动竞争。
	const reflow = () => applyPlacement(host);
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

	host.dataset.bound = "true";
}
