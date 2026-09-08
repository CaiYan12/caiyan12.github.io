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
	"nb-site-nav-link inline-flex min-h-11 items-center text-[14px] no-underline transition-colors duration-150 max-[640px]:text-[13px]";
export const NAV_ACTIVE = "text-nb-ink";
export const NAV_IDLE =
	"text-nb-ink-soft hover:text-nb-blue";

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

/* 当前 Swup 页面注册的资源清理器。astro:before-swap 在 main 被替换前触发，
 * 所有 books 页面脚本都通过这里取消请求、计时器与动画。 */
const pageCleanups = new Set<() => void>();
let pageCleanupBound = false;

function ensurePageCleanupListener(): void {
	if (pageCleanupBound) return;
	pageCleanupBound = true;
	document.addEventListener("astro:before-swap", () => {
		const cleanups = Array.from(pageCleanups);
		pageCleanups.clear();
		for (const cleanup of cleanups) cleanup();
	});
}

export function registerPageCleanup(cleanup: () => void): () => void {
	ensurePageCleanupListener();
	pageCleanups.add(cleanup);
	return () => pageCleanups.delete(cleanup);
}

function ensureShuffleLabel(btn: HTMLButtonElement): HTMLElement {
	const current = btn.querySelector<HTMLElement>("[data-nb-shuffle-label]");
	if (current) return current;
	const label = document.createElement("span");
	label.dataset.nbShuffleLabel = "";
	label.textContent =
		Array.from(btn.childNodes)
			.filter((node) => node.nodeType === Node.TEXT_NODE)
			.map((node) => node.textContent ?? "")
			.join("")
			.trim() || "换一换";
	for (const node of Array.from(btn.childNodes)) {
		if (node.nodeType === Node.TEXT_NODE) node.remove();
	}
	btn.append(label);
	return label;
}

function setShuffleBusy(
	buttons: HTMLButtonElement[],
	busy: boolean,
	loadingText: string,
): void {
	for (const btn of buttons) {
		const label = ensureShuffleLabel(btn);
		btn.disabled = busy;
		btn.classList.toggle("is-loading", busy);
		if (busy) {
			btn.setAttribute("aria-busy", "true");
			label.textContent = loadingText;
		} else {
			btn.removeAttribute("aria-busy");
			label.textContent = "换一换";
		}
	}
}

/**
 * 绑定一个独立的换书/换组忙碌组。替换函数立即开始，动画或请求完成后
 * 通过 finally 恢复按钮，避免人为延迟掩盖真实交互时序。
 */
export function bindShuffle(
	btns: Array<HTMLButtonElement | null>,
	fire: () => void | Promise<void>,
	opts?: { loadingText?: string; signal?: AbortSignal },
): void {
	const buttons = btns.filter(
		(btn): btn is HTMLButtonElement => btn !== null,
	);
	if (buttons.length === 0) return;
	const loadingText = opts?.loadingText ?? "换一换";
	for (const btn of buttons) ensureShuffleLabel(btn);
	let busy = false;
	const run = () => {
		if (busy) return;
		busy = true;
		setShuffleBusy(buttons, true, loadingText);
		Promise.resolve()
			.then(() => fire())
			.catch((error) => {
				console.error("[nice-books] 换一换失败：", error);
			})
			.finally(() => {
				busy = false;
				setShuffleBusy(buttons, false, loadingText);
			});
	};
	for (const btn of buttons) {
		btn.addEventListener("click", run, { signal: opts?.signal });
	}
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
				!target.hasAttribute("data-nb-cover")
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
