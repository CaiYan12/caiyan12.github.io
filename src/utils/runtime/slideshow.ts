/**
 * 首页轮播（`#slider`）的页面级会话。
 *
 * 从 `src/components/control/Slideshow.astro` 的内联脚本原样迁出（F2.2），行为约束：
 *   · 选择器、类名、`data-interval` 默认 4000ms、退场 550ms 时延、指示点语义全不变；
 *   · `hover` 暂停 / 移出恢复、`prefers-reduced-motion` 不自动轮播、手动切换仍可用；
 *   · 仍是「元素少于 2 个就什么都不做」，且照样落 `data-initialized`（外部据此判断就绪）。
 *
 * 与旧实现的唯一差别：生命周期由 page-session 驱动，离开页面前 `stop()` 会把
 * interval、550ms 收尾 timeout 与全部元素监听一起收掉；旧实现只清 interval，
 * 且换页时无人调用。
 */
import type { PageSession } from "./page-session";

const DEFAULT_INTERVAL_MS = 4000;
const LEAVE_CLEANUP_MS = 550;

type SlideDirection = 1 | -1;

function createSlideshowSession(): PageSession {
	/** 当前页的清理函数；null 表示这一页没有活着的轮播 */
	let teardown: (() => void) | null = null;

	function start(): void {
		if (teardown) return;
		const el = document.getElementById("slider") as HTMLElement | null;
		if (!el || el.dataset.initialized === "true") return;
		el.dataset.initialized = "true";
		const items = [
			...el.querySelectorAll<HTMLElement>(".carousel-inner > .item"),
		];
		const indicators = [
			...el.querySelectorAll<HTMLElement>(".carousel-indicators > li"),
		];
		// 少于两张就没有可轮播的内容：与旧实现一致，先落 initialized 再退出
		if (items.length < 2) return;

		const controller = new AbortController();
		const { signal } = controller;
		let current = Math.max(
			0,
			items.findIndex((item) => item.classList.contains("active")),
		);
		let timer: number | undefined;
		let leaveTimer: number | undefined;

		// dir: 1 = 前进（旧页左出、新页右入），-1 = 后退（旧页右出、新页左入）
		const show = (index: number, dir: SlideDirection): void => {
			const nextIndex = (index + items.length) % items.length;
			if (nextIndex === current) return;
			const oldItem = items[current];
			const newItem = items[nextIndex];

			// 清理上一次过渡的残留类，防止快速连点时叠加
			window.clearTimeout(leaveTimer);
			items.forEach((item) =>
				item.classList.remove(
					"leaving",
					"leaving-left",
					"leaving-right",
					"enter-right",
					"enter-left",
				),
			);

			oldItem.classList.remove("active");
			oldItem.classList.add(
				"leaving",
				dir === 1 ? "leaving-left" : "leaving-right",
			);
			newItem.classList.add(
				"active",
				dir === 1 ? "enter-right" : "enter-left",
			);
			current = nextIndex;
			indicators.forEach((indicator, indicatorIndex) =>
				indicator.classList.toggle(
					"active",
					indicatorIndex === current,
				),
			);
			// 动画（500ms）结束后摘除退场类，旧页回到 display:none
			leaveTimer = window.setTimeout(() => {
				oldItem.classList.remove(
					"leaving",
					"leaving-left",
					"leaving-right",
				);
			}, LEAVE_CLEANUP_MS);
		};

		const disarm = (): void => window.clearInterval(timer);
		const arm = (): void => {
			// 自动轮播属持续动效，用户偏好减少动效时不启动（手动切换仍可用，CSS 侧已降级为无过渡）
			if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
				return;
			disarm();
			timer = window.setInterval(
				() => show(current + 1, 1),
				Number(el.dataset.interval) || DEFAULT_INTERVAL_MS,
			);
		};

		el.querySelectorAll<HTMLElement>("[data-slide]").forEach((control) => {
			control.addEventListener(
				"click",
				() => {
					const dir: SlideDirection =
						control.dataset.slide === "next" ? 1 : -1;
					show(current + dir, dir);
					arm();
				},
				{ signal },
			);
		});
		indicators.forEach((indicator) => {
			indicator.addEventListener(
				"click",
				() => {
					const target = Number(indicator.dataset.slideTo);
					show(target, target > current ? 1 : -1);
					arm();
				},
				{ signal },
			);
		});
		el.addEventListener("mouseenter", disarm, { signal });
		el.addEventListener("mouseleave", arm, { signal });

		teardown = () => {
			disarm();
			window.clearTimeout(leaveTimer);
			controller.abort();
			// 把「这一页已经初始化过」的标记一起收掉：换页被取消时同一个节点还要能重新启动
			if (el.isConnected) delete el.dataset.initialized;
		};
		arm();
	}

	function stop(): void {
		teardown?.();
		teardown = null;
	}

	return { name: "slideshow", start, stop };
}

export const slideshowSession = createSlideshowSession();
