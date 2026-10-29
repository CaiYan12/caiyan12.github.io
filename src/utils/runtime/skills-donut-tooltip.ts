/**
 * /skills/ 技能概览环形图的悬浮详情（单页专有，自 T8/#123 起从 theme-script 迁出）。
 *
 * 事件全部委托在 document 上：Swup 切页后 SVG 会重建，而监听器只在首次 init 时
 * 装一遍（模块内守卫 `bound`），新 DOM 自动被覆盖。六个监听对应两条路径：
 * - 指针：pointerover 显示、pointermove 跟随、pointerout 隐藏（仅 mouse 指针；
 *   触屏靠 tap 交给原生 focus 路径）；
 * - 键盘/读屏：段是 `tabindex="0"` 的 `<path>`，带 aria-label；focusin 显示、
 *   focusout 隐藏、Escape 关闭全部 tooltip。
 * 显示走一帧 rAF 再加 `is-visible`（隐藏时先取消未落地的帧），状态存 WeakMap，
 * 切页后旧 tooltip 随 DOM 消失、对应条目自动可回收。
 */

/** tooltip 与指针的让位、以及贴视口边时的统一留白（迁移前 theme-script 内的字面量） */
const TOOLTIP_GAP = 14;
const VIEWPORT_PADDING = 12;

export type TooltipPositionInput = {
	viewportWidth: number;
	viewportHeight: number;
	tooltipWidth: number;
	tooltipHeight: number;
	clientX: number;
	clientY: number;
};

/**
 * 悬浮详情落点：默认右下让开一个 GAP；任一边越界就翻到指针的另一侧，
 * 最后统一夹进视口留白内（tooltip 比视口还大时留白优先，靠 clamp 顺序保证不为负）。
 * 纯函数，便于单测；写样式由调用方负责。
 */
export function resolveTooltipPosition(input: TooltipPositionInput): {
	left: number;
	top: number;
} {
	const { viewportWidth, viewportHeight, tooltipWidth, tooltipHeight } =
		input;
	const { clientX, clientY } = input;
	const maxLeft = Math.max(
		VIEWPORT_PADDING,
		viewportWidth - tooltipWidth - VIEWPORT_PADDING,
	);
	const maxTop = Math.max(
		VIEWPORT_PADDING,
		viewportHeight - tooltipHeight - VIEWPORT_PADDING,
	);
	let left = clientX + TOOLTIP_GAP;
	let top = clientY + TOOLTIP_GAP;
	if (left > maxLeft) left = clientX - tooltipWidth - TOOLTIP_GAP;
	if (top > maxTop) top = clientY - tooltipHeight - TOOLTIP_GAP;
	left = Math.min(maxLeft, Math.max(VIEWPORT_PADDING, left));
	top = Math.min(maxTop, Math.max(VIEWPORT_PADDING, top));
	return { left, top };
}

/** 监听器只在首次 init 时装一遍：委托在 document 上，切页不会重复绑 */
let skillsDonutTooltipBound = false;

/** 一次性安装 document 级委托监听；无参、幂等，import 无副作用 */
export function initSkillsDonutTooltip() {
	if (skillsDonutTooltipBound) return;
	skillsDonutTooltipBound = true;

	const showFrames = new WeakMap<HTMLElement, number>();
	const getSegment = (target: EventTarget | null) => {
		if (!(target instanceof Element)) return null;
		return target.closest<SVGPathElement>(".skills-donut-segment-base");
	};
	const getTooltip = (segment: Element) =>
		segment
			.closest<HTMLElement>("[data-skills-overview]")
			?.querySelector<HTMLElement>("[data-skills-donut-tooltip]") ?? null;
	const isSameDonut = (segment: Element, target: EventTarget | null) => {
		const relatedSegment = getSegment(target);
		return (
			relatedSegment?.closest("[data-skills-overview]") ===
			segment.closest("[data-skills-overview]")
		);
	};
	const resetTooltipPosition = (tooltip: HTMLElement) => {
		tooltip.style.removeProperty("left");
		tooltip.style.removeProperty("top");
		tooltip.style.removeProperty("right");
		tooltip.style.removeProperty("bottom");
	};
	const positionTooltip = (
		tooltip: HTMLElement,
		clientX: number,
		clientY: number,
	) => {
		const rect = tooltip.getBoundingClientRect();
		const { left, top } = resolveTooltipPosition({
			viewportWidth: window.innerWidth,
			viewportHeight: window.innerHeight,
			tooltipWidth: rect.width,
			tooltipHeight: rect.height,
			clientX,
			clientY,
		});
		tooltip.style.left = `${left}px`;
		tooltip.style.top = `${top}px`;
		tooltip.style.right = "auto";
		tooltip.style.bottom = "auto";
	};
	const hideTooltip = (tooltip: HTMLElement | null) => {
		if (!tooltip) return;
		const frame = showFrames.get(tooltip);
		if (frame !== undefined) cancelAnimationFrame(frame);
		showFrames.delete(tooltip);
		tooltip.classList.remove("is-visible");
		tooltip.hidden = true;
		tooltip.setAttribute("aria-hidden", "true");
		resetTooltipPosition(tooltip);
	};
	const showTooltip = (
		segment: SVGPathElement,
		clientX?: number,
		clientY?: number,
	) => {
		const tooltip = getTooltip(segment);
		if (!tooltip) return;
		const label = tooltip.querySelector<HTMLElement>(
			"[data-skills-tooltip-label]",
		);
		const value = tooltip.querySelector<HTMLElement>(
			"[data-skills-tooltip-value]",
		);
		const percentage = tooltip.querySelector<HTMLElement>(
			"[data-skills-tooltip-percentage]",
		);
		const color = segment.dataset.skillColor || "#00c000";
		if (label) label.textContent = segment.dataset.skillLabel || "技能等级";
		if (value) value.textContent = segment.dataset.skillValue || "0";
		if (percentage)
			percentage.textContent = segment.dataset.skillPercentage || "0";
		tooltip.style.setProperty("--skills-tooltip-color", color);
		tooltip.hidden = false;
		tooltip.setAttribute("aria-hidden", "false");
		if (typeof clientX === "number" && typeof clientY === "number") {
			positionTooltip(tooltip, clientX, clientY);
		} else {
			resetTooltipPosition(tooltip);
		}
		tooltip.classList.remove("is-visible");
		const frame = requestAnimationFrame(() => {
			if (!tooltip.hidden) tooltip.classList.add("is-visible");
			showFrames.delete(tooltip);
		});
		showFrames.set(tooltip, frame);
	};

	document.addEventListener("pointerover", (event) => {
		if (event.pointerType !== "mouse") return;
		const segment = getSegment(event.target);
		if (segment) showTooltip(segment, event.clientX, event.clientY);
	});
	document.addEventListener("pointermove", (event) => {
		if (event.pointerType !== "mouse") return;
		const segment = getSegment(event.target);
		const tooltip = segment && getTooltip(segment);
		if (segment && tooltip && !tooltip.hidden)
			positionTooltip(tooltip, event.clientX, event.clientY);
	});
	document.addEventListener("pointerout", (event) => {
		const segment = getSegment(event.target);
		if (!segment || isSameDonut(segment, event.relatedTarget)) return;
		hideTooltip(getTooltip(segment));
	});
	document.addEventListener("focusin", (event) => {
		const segment = getSegment(event.target);
		if (segment) showTooltip(segment);
	});
	document.addEventListener("focusout", (event) => {
		const segment = getSegment(event.target);
		if (!segment || isSameDonut(segment, event.relatedTarget)) return;
		hideTooltip(getTooltip(segment));
	});
	document.addEventListener("keydown", (event) => {
		if (event.key !== "Escape") return;
		document
			.querySelectorAll<HTMLElement>("[data-skills-donut-tooltip]")
			.forEach(hideTooltip);
	});
}
