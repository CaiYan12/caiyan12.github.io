/**
 * 返回顶部按钮（#118/T3 自 theme-script.ts 迁出的独立宿主）。
 *
 * 生命周期：装配表 `{ init: initBackToTop }`——只在首屏跑一次，不进 swap 序；
 * `#backtop` 在 swup 容器之外、切页不重建，`dataset.bound` 守卫防未来重入时监听器翻倍。
 * 无清理：scroll 监听常驻。
 *
 * 可见阈值 **scrollY > 200**（严格大于，等于 200 时不可见），迁移前后逐字一致。
 */
import { prefersReducedMotion } from "./reduced-motion";

export function initBackToTop() {
	const backtop = document.getElementById("backtop");
	if (!backtop || backtop.dataset.bound === "true") return;
	backtop.dataset.bound = "true";
	const toggle = () => {
		const visible = window.scrollY > 200;
		// 同值短路：scroll 高频触发，避免无谓的样式写入
		if (visible === (backtop.style.display === "block")) return;
		backtop.style.display = visible ? "block" : "none";
	};
	window.addEventListener("scroll", toggle, { passive: true });
	backtop.addEventListener("click", () => {
		window.scrollTo({
			top: 0,
			behavior: prefersReducedMotion() ? "auto" : "smooth",
		});
	});
	toggle();
}
