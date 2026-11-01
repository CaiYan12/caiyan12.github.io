/**
 * 拉绳壁纸挂件运行时（spec #127）。
 *
 * 生命周期：装配表 `{ init: initWallpaperPull }` —— 只在整页跑一次，不进 swap 序。
 * 挂件在 Swup 容器之外、切页不重建（与 initRandomBackground 同一档），
 * `dataset.bound` 守卫防重入时监听器翻倍（照 back-to-top.ts 的先例）。
 *
 * 本文件先只承担**定位**（票 #128）；交互、换图、交叉淡入由后续票追加。
 */

const HOST_SELECTOR = "[data-wallpaper-pull]";
const NAV_SELECTOR = "#head-nav";
const TITLE_SELECTOR = "#header .site-title";
/** 挂件右缘与视口右缘之间至少要留出的空隙，窄屏夹取时用 */
const EDGE_GAP = 8;
/** SVG 里绳画到的 y 坐标（与 WallpaperPull.astro 的 viewBox 保持一致） */
const ROPE_END = 76;

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

export function initWallpaperPull() {
	const host = document.querySelector<HTMLElement>(HOST_SELECTOR);
	if (!host || host.dataset.bound === "true") return;

	applyPlacement(host);

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
