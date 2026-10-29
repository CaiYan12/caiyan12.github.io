/**
 * 双击页面任意位置回到顶部（原主题交互，#118/T3 自 theme-script.ts 迁出的独立宿主）。
 *
 * 生命周期：装配表 `{ init: initDblClickScroll }`——只在首屏跑一次，不进 swap 序。
 * **无守卫**：本块按规格（#115「调用契约」）保持 single-shot 语义，迁移不新增守卫；
 * 若将来被重复装配，监听器会叠加——这是已知且被显式保留的行为，不是遗漏。
 * 无清理：document 级监听常驻，Swup 换页后新内容天然生效。
 *
 * 点到链接/按钮/输入框时不接管（那些目标有自己的双击语义）。
 */
import { prefersReducedMotion } from "./reduced-motion";

export function initDblClickScroll() {
	document.addEventListener("dblclick", (e) => {
		if ((e.target as HTMLElement).closest("a, button, input")) return;
		window.scrollTo({
			top: 0,
			behavior: prefersReducedMotion() ? "auto" : "smooth",
		});
	});
}
