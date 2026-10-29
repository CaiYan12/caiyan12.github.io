/**
 * LQIP 占位淡出（T7 #122 从 theme-script.ts 迁入）：图片加载完成后隐藏渐变占位
 * （无 JS 时图片加载完成后自然覆盖占位，不影响显示）。
 *
 * 随 `astro:after-swap` 重跑（装配表 `swap: 4`，= 迁移前 initSwupHooks 的硬编码第 4 位）。
 * 幂等靠元素级 `dataset.lqipBound`（切页后是新 DOM，守卫自然失效、重新绑定）。
 * 已加载完的图片走 `complete && naturalWidth > 0` 即时短路，否则 load / error
 * 各挂 `{ once: true }`。
 */
export function initLqipFade() {
	document
		.querySelectorAll<HTMLElement>(".lqip-placeholder")
		.forEach((placeholder) => {
			if (placeholder.dataset.lqipBound === "true") return;
			placeholder.dataset.lqipBound = "true";
			const img = placeholder.parentElement?.querySelector("img");
			if (!img) return;
			const done = () => placeholder.classList.add("loaded");
			if (img.complete && img.naturalWidth > 0) {
				done();
			} else {
				img.addEventListener("load", done, { once: true });
				img.addEventListener("error", done, { once: true });
			}
		});
}
