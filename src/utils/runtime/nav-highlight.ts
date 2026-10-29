/**
 * 导航高亮（#118/T3 自 theme-script.ts 迁出的独立宿主）。
 *
 * 生命周期：装配表 `{ init: syncNavHighlight, swap: 1 }`——首屏跑一次，之后每个
 * `astro:after-swap` 按 swap 序重跑；导航与移动菜单都在 swup 容器之外、切页不重建，
 * 所以换页后必须在这里重算一遍。**无守卫**（重复执行是幂等的：逐项 toggle 成当前状态），
 * 无清理。
 *
 * 本模块只剩 DOM 同步这一层薄壳：判定口径（前缀匹配必须落在路径段边界上）已单源化到
 * `./nav-state` 的 `isNavCurrent`，与编译期 Navbar / MMenu 用的是同一个函数。
 */
import { isNavCurrent } from "./nav-state";

export function syncNavHighlight() {
	const path = window.location.pathname;
	// /link/ 不应命中 /link-survey/，语义见 nav-state.ts 头注释
	const isMatch = (href: string) => isNavCurrent(path, href);
	// 逐锚点 toggle，class 与 aria-current 同步维护，读屏用户也能感知当前页
	document.querySelectorAll("#nav a, #mmenu a").forEach((a) => {
		const href = a.getAttribute("href") || "/";
		// 下拉父项按钮（void href）不匹配任何路径，交由下方子链接统一计算
		if (href === "javascript:void(0)") return;
		const parent = a.closest("li");
		if (!parent) return;
		const match = isMatch(href);
		parent.classList.toggle("current", match);
		if (match) a.setAttribute("aria-current", "page");
		else a.removeAttribute("aria-current");
	});
	// 下拉父项 current：任一子链接匹配即高亮
	document.querySelectorAll("#nav li.dropdown, #mmenu li").forEach((li) => {
		if (!li.querySelector(':scope > a[href="javascript:void(0)"]')) return;
		const match = [...li.querySelectorAll(":scope > ul a")].some((a) =>
			isMatch(a.getAttribute("href") || "/"),
		);
		li.classList.toggle("current", match);
	});
	// 第三遍只走 #mmenu，与第一遍对 mmenu 的结果相同（toggle 幂等）。这是迁移前就有的
	// 重复计算，按「等价迁移不顺手改行为」原样保留，未合并。
	document.querySelectorAll("#mmenu a").forEach((a) => {
		const href = a.getAttribute("href") || "/";
		if (href === "javascript:void(0)") return;
		const parent = a.closest("li");
		if (!parent) return;
		parent.classList.toggle("current", isMatch(href));
	});
}
