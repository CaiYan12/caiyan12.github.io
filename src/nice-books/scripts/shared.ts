/**
 * Nice Books 客户端共享工具。
 * 约定（应对 swup）：页面初始化 =「模块顶层直接 init + astro:page-load 重跑
 * + main 内 dataset 守卫 + 目标元素缺失早退」；document 级监听只在模块
 * 顶层注册一次，handler 内自行检查元素存在。
 */

export function qs<T extends Element = HTMLElement>(sel: string, root: ParentNode = document): T | null {
	return root.querySelector<T>(sel);
}

export function qsa<T extends Element = Element>(sel: string, root: ParentNode = document): T[] {
	return Array.from(root.querySelectorAll<T>(sel));
}

export function prefersReducedMotion(): boolean {
	return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export { esc } from "../lib/render";

/**
 * 「换一换」绑定（handoff §10）：点击 → loading（↻ 旋转 + disabled +
 * aria-busy）→ ~240ms 后执行替换（reduced-motion 时 60ms）→ 恢复。
 */
export function bindShuffle(btn: HTMLButtonElement | null, fire: () => void): void {
	if (!btn) return;
	btn.addEventListener("click", () => {
		if (btn.disabled) return;
		btn.disabled = true;
		btn.classList.add("is-loading");
		btn.setAttribute("aria-busy", "true");
		const delay = prefersReducedMotion() ? 60 : 240;
		window.setTimeout(() => {
			fire();
			btn.classList.remove("is-loading");
			btn.disabled = false;
			btn.removeAttribute("aria-busy");
		}, delay);
	});
}

/**
 * 封面加载失败兜底（契约 handoff §12.3）：捕获阶段监听 img error，
 * 依据 data-nb-* 属性重新生成确定性 SVG 替换。document 级监听只在
 * 模块顶层注册（本模块被页面脚本导入一次即注册一次）。
 */
let coverFallbackBound = false;
export function bindCoverFallback(): void {
	if (coverFallbackBound) return;
	coverFallbackBound = true;
	document.addEventListener(
		"error",
		(event) => {
			const target = event.target;
			if (!(target instanceof HTMLImageElement) || !target.dataset.nbCover) return;
			const { nbId, nbTitle, nbAuthor, nbPublisher, nbYear } = target.dataset;
			if (!nbId || !nbTitle || !nbAuthor || !nbPublisher || !nbYear) return;
			import("../lib/cover").then(({ coverFromParts }) => {
				target.outerHTML = coverFromParts(nbId, nbTitle, nbAuthor, nbPublisher, Number(nbYear));
			});
		},
		true,
	);
}
