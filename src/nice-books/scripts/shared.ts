/**
 * Nice Books 客户端共享工具。
 * 约定（应对 swup）：页面初始化 =「模块顶层直接 init + astro:page-load 重跑
 * + main 内 dataset 守卫 + 目标元素缺失早退」；document 级监听只在模块
 * 顶层注册一次，handler 内自行检查元素存在。
 */

export function qs<T extends Element = HTMLElement>(
	sel: string,
	root: ParentNode = document,
): T | null {
	return root.querySelector<T>(sel);
}

export function qsa<T extends Element = Element>(
	sel: string,
	root: ParentNode = document,
): T[] {
	return Array.from(root.querySelectorAll<T>(sel));
}

/* ---------- 页眉导航高亮（swup 切页后由 main.ts 的 init 周期调用）----------
 * 页眉在 swup 容器外不随切页替换，高亮必须客户端重算。
 * 色类互斥拼接（Tailwind 冲突教训 ×3）。类常量由 SiteHeader.astro 共用。 */
export const NAV_BASE =
	"border-b-2 py-1 text-[14px] no-underline transition-colors duration-150 max-[640px]:text-[13px]";
export const NAV_ACTIVE = "border-nb-seal text-nb-ink";
export const NAV_IDLE =
	"border-transparent text-nb-ink-soft hover:text-nb-blue";

export function syncHeaderNav(): void {
	const path = window.location.pathname;
	// 详情页归入「书库」高亮分支；books 之外（不应发生）不高亮
	const current = /^\/books\/(archive(\/|$)|\d+\/?$)/.test(path)
		? "archive"
		: path.startsWith("/books/")
			? "home"
			: null;
	qs('nav[aria-label="站内导航"]')
		?.querySelectorAll<HTMLAnchorElement>("a[data-nb-nav]")
		.forEach((a) => {
			const key = a.dataset.nbNav;
			if (key === "external") return;
			const isActive = key !== null && key === current;
			a.className = `${NAV_BASE} ${isActive ? NAV_ACTIVE : NAV_IDLE}`;
			if (isActive) a.setAttribute("aria-current", "page");
			else a.removeAttribute("aria-current");
		});
}

export function prefersReducedMotion(): boolean {
	return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export { esc } from "../lib/render";

/**
 * 「换一换」绑定（handoff §10）：点击 → loading（↻ 旋转 + disabled +
 * aria-busy）→ ~240ms 后执行替换（reduced-motion 时 60ms）→ 恢复。
 */
export function bindShuffle(
	btn: HTMLButtonElement | null,
	fire: () => void,
): void {
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
			if (
				!(target instanceof HTMLImageElement) ||
				!target.dataset.nbCover
			)
				return;
			const { nbId, nbTitle, nbAuthor, nbPublisher, nbYear } =
				target.dataset;
			if (!nbId || !nbTitle || !nbAuthor || !nbPublisher || !nbYear)
				return;
			import("../lib/cover").then(({ coverFromParts }) => {
				target.outerHTML = coverFromParts(
					nbId,
					nbTitle,
					nbAuthor,
					nbPublisher,
					Number(nbYear),
				);
			});
		},
		true,
	);
}
