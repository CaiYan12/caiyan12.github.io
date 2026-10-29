/**
 * 头部微言轮播运行时模块（T4 #119 自 theme-script.ts 迁出，装配表引用不变）。
 *
 * 机制复刻原版 AutoScroll（limh.me global-pjax.js）——滚完把首条 li 移到末尾实现
 * 无限轮转，hover 暂停、移出恢复；节奏（4s/条 = 停留 3.2s + 滑动 0.8s）对齐迁移前
 * CSS 关键帧版的手感，比原版 300ms 更缓。头部在 Swup 容器之外，随 pagefindReady
 * 初始化一次即可，**不进 after-swap 重跑清单**（装配表里无 swap 号）。
 *
 * 迁移时逐项核过的读数（勿按理想行为想象）：interval 4000ms；位移 `-24px`，与
 * global.css `#header .text li` 的 24px 行高耦合（改行高须同步这里）；`transitionend`
 * 只认 target === list 且 propertyName === "margin-top"，收尾时先清 transition、把
 * marginTop 归零再搬首条 li，因此**不会累积**位移、也不需要克隆条；`mouseenter`
 * 清 interval 并把计时器置 0，`mouseleave` 重新启动（`start()` 有 `timer` 非零短路）；
 * `prefers-reduced-motion: reduce` 下直接不启动。守卫 `list.dataset.tickerReady`
 * 在 reduced-motion 之前置位——即使没启动，后续重入也不会再走一遍绑定。
 */
import { prefersReducedMotion } from "./reduced-motion";

export function initHeaderTicker() {
	const ticker = document.querySelector("#header .text");
	const list = ticker?.querySelector("ul");
	if (!ticker || !list || list.children.length < 2) return;
	if (list.dataset.tickerReady === "true") return;
	list.dataset.tickerReady = "true";
	if (prefersReducedMotion()) return;

	list.addEventListener("transitionend", (event) => {
		if (event.target !== list || event.propertyName !== "margin-top")
			return;
		list.style.transition = "none";
		list.style.marginTop = "0px";
		list.appendChild(list.firstElementChild as HTMLElement);
	});

	let timer = 0;
	const start = () => {
		if (timer) return;
		timer = window.setInterval(() => {
			list.style.transition = "margin-top 0.8s ease";
			list.style.marginTop = "-24px"; // 与 global.css 的 #header .text li 行高一致
		}, 4000);
	};
	ticker.addEventListener("mouseenter", () => {
		window.clearInterval(timer);
		timer = 0;
	});
	ticker.addEventListener("mouseleave", start);
	start();
}
