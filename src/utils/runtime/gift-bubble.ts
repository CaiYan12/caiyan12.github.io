/**
 * 首页礼物气泡按钮：Yasic/QQBubbleView（三阶贝塞尔上升轨迹）的网页移植。
 *
 * 2026-11-01 定稿行为：
 * - 只在 `/`（GiftBubbleButton.astro 仅挂在 index.astro）出现；
 * - 点击一次只生成 1 枚气泡，没有自动连发；
 * - 起点固定为按钮中心正上方 8px，不是鼠标点击点；上浮 160px，
 *   与站点文字特效 click-word-rise 的 translateY(-160px) 同高；
 * - **不拦截事件**：站点既有「彩虹文字 + Canvas 爆炸」照常触发，且层级在本元件之上；
 * - 没有冷却：与站点文字特效一致，每次点击都立即生成一枚气泡；
 * - prefers-reduced-motion 下不生成气泡；
 * - 切页后舞台被 Swup 换掉，rAF 在 `isConnected === false` 时自行退出，不留空转。
 *
 * 轨迹公式与参数直接对齐 BubbleView.java 的 BesselEvaluator：
 * p0 起点 / p1、p2 两个控制点 / p3 终点；ValueAnimator 默认
 * AccelerateDecelerateInterpolator（cos((t+1)π)/2 + 0.5）。
 */

import { prefersReducedMotion } from "./reduced-motion";

const RISE_DURATION = 4000;
const ITEM_SIZE = 24;
/** 24px 图标 + 8px 与按钮顶边的间隙；舞台高 192 = 32 + 160px 行程 */
const BOTTOM_PADDING = 32;
const ORIGINS_OFFSET = 48;
const MIN_SCALE = 0.6;
const MAX_SCALE = 1.2;

/** 图标池：FA4 与站点药丸色板；颜色变量定义在 .gift-fab（global.css） */
const ICONS = [
	{ fa: "fa-heart", color: "var(--gift-red)" },
	{ fa: "fa-heart", color: "var(--gift-green)" },
	{ fa: "fa-star", color: "var(--hot)" },
	{ fa: "fa-gift", color: "var(--gift-amber)" },
	{ fa: "fa-music", color: "var(--gift-blue)" },
	{ fa: "fa-certificate", color: "var(--gift-purple)" },
];

type ButtonRect = { left: number; width: number };
type StageRect = { left: number; height: number };

/** 气泡左上角坐标：x 取按钮中心、y 取舞台底边上方 32px（图标底边再高 8px） */
export function giftOrigin(
	button: ButtonRect,
	stage: StageRect,
	itemSize = ITEM_SIZE,
	bottomPadding = BOTTOM_PADDING,
) {
	return {
		x: button.left + button.width / 2 - stage.left - itemSize / 2,
		y: stage.height - bottomPadding,
	};
}

/** ValueAnimator 默认 AccelerateDecelerateInterpolator */
function ease(t: number) {
	return Math.cos((t + 1) * Math.PI) / 2 + 0.5;
}

function spawnBubble(button: HTMLElement, stage: HTMLElement) {
	const buttonRect = button.getBoundingClientRect();
	const stageRect = stage.getBoundingClientRect();
	if (!stageRect.width || !stageRect.height) return;

	const origin = giftOrigin(buttonRect, stageRect);
	let spreadWidth = stageRect.width;
	let controlHeight = origin.y;

	// 与 BubbleView.java 相同的三分支种子：只改控制点范围，不动起点
	const seed = Math.floor(Math.random() * 3);
	if (seed === 0) spreadWidth -= ORIGINS_OFFSET;
	else if (seed === 1) spreadWidth += ORIGINS_OFFSET;
	else controlHeight -= ORIGINS_OFFSET;
	if (spreadWidth < 40) spreadWidth = 40;
	if (controlHeight < 20) controlHeight = 20;

	const p1 = [
		spreadWidth * 0.1 + Math.random() * spreadWidth * 0.8,
		controlHeight - Math.random() * controlHeight * 0.5,
	];
	const p2 = [
		Math.random() * spreadWidth,
		Math.random() * (controlHeight - p1[1]),
	];
	const p3 = [Math.random() * spreadWidth, 0];

	const icon = ICONS[Math.floor(Math.random() * ICONS.length)];
	const bubble = document.createElement("span");
	bubble.className = "gift-bubble";
	bubble.setAttribute("aria-hidden", "true");
	bubble.style.width = `${ITEM_SIZE}px`;
	bubble.style.height = `${ITEM_SIZE}px`;
	bubble.style.fontSize = `${ITEM_SIZE}px`;
	bubble.style.color = icon.color;
	bubble.innerHTML = `<i class="fa ${icon.fa}"></i>`;
	bubble.style.transform = `translate3d(${origin.x}px, ${origin.y}px, 0) scale(${MIN_SCALE})`;
	stage.appendChild(bubble);

	const start = performance.now();
	const frame = (now: number) => {
		if (!stage.isConnected) {
			bubble.remove();
			return;
		}
		const t = Math.min(1, (now - start) / RISE_DURATION);
		const f = ease(t);
		const u = 1 - f;
		const x =
			u * u * u * origin.x +
			3 * u * u * f * p1[0] +
			3 * u * f * f * p2[0] +
			f * f * f * p3[0];
		const y =
			u * u * u * origin.y +
			3 * u * u * f * p1[1] +
			3 * u * f * f * p2[1] +
			f * f * f * p3[1];
		const scale = MIN_SCALE + (MAX_SCALE - MIN_SCALE) * f;
		bubble.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${scale.toFixed(2)})`;
		bubble.style.opacity = String(1 - f);
		if (t < 1) requestAnimationFrame(frame);
		else bubble.remove();
	};
	requestAnimationFrame(frame);
}

export function initGiftBubble() {
	document.addEventListener("click", (event) => {
		const target = event.target;
		if (!(target instanceof Element)) return;
		const button = target.closest<HTMLElement>(".gift-fab-btn");
		if (!button) return;
		const stage = button
			.closest(".gift-fab")
			?.querySelector<HTMLElement>(".gift-fab-stage");
		if (!stage) return;
		if (prefersReducedMotion()) return;
		spawnBubble(button, stage);
	});
}
