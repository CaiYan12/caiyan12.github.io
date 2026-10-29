/**
 * 移动端全屏菜单运行时模块（T4 #119 自 theme-script.ts 迁出，装配表引用不变）。
 *
 * 菜单节点（`#open-nav` / `#mmenu` / `#mmenu-close` / `#close-nav` /
 * `#mmenu-backdrop`）全部挂在 swup 容器之外，切页不重建，所以只随装配表初始化
 * 一次，靠 `openBtn.dataset.mmenuBound` 守卫防重入（重入会让监听器叠加）。守卫是
 * **元素级**的，不是模块级旗标：换页不换这些节点，旗标与 dataset 在这里等价，
 * 保留 dataset 是为了不改变既有契约。
 *
 * 开合语义是迁移前的实际行为：class `open` 同时落在菜单、关闭条与背景遮罩上，
 * body 锁滚动、`aria-expanded` 与之一致；打开后焦点落到菜单内第一个
 * input/a/button（键盘与读屏用户可直接 Tab）；四条关闭路径（关闭条、右上关闭
 * 按钮、背景遮罩、点菜单内链接）之后都有 Escape —— 仅在菜单处于 open 时响应，
 * 关闭并把焦点还给触发按钮。
 */
export function initMMenu() {
	const openBtn = document.getElementById("open-nav");
	const menu = document.getElementById("mmenu");
	const close = document.getElementById("mmenu-close");
	const closeButton = document.getElementById("close-nav");
	const backdrop = document.getElementById("mmenu-backdrop");
	if (!openBtn || !menu || !close) return;
	// 菜单节点在 Swup 容器外且只初始化一次；dataset 守卫防止重入时监听器叠加
	if (openBtn.dataset.mmenuBound === "true") return;
	openBtn.dataset.mmenuBound = "true";
	const syncExpanded = (expanded: boolean) =>
		openBtn.setAttribute("aria-expanded", String(expanded));
	const openMenu = () => {
		menu.classList.add("open");
		close.classList.add("open");
		backdrop?.classList.add("open");
		document.body.style.overflow = "hidden";
		syncExpanded(true);
		// 焦点移入菜单，键盘/读屏用户打开后可直接在菜单内 Tab
		menu.querySelector<HTMLElement>("input, a, button")?.focus();
	};
	const closeMenu = () => {
		menu.classList.remove("open");
		close.classList.remove("open");
		backdrop?.classList.remove("open");
		document.body.style.overflow = "";
		syncExpanded(false);
	};
	openBtn.addEventListener("click", openMenu);
	close.addEventListener("click", closeMenu);
	closeButton?.addEventListener("click", closeMenu);
	backdrop?.addEventListener("click", closeMenu);
	menu.addEventListener("click", (e) => {
		if ((e.target as HTMLElement).closest("a")) closeMenu();
	});
	// Escape 关闭并把焦点归还触发按钮
	document.addEventListener("keydown", (e) => {
		if (e.key !== "Escape") return;
		if (!menu.classList.contains("open")) return;
		closeMenu();
		openBtn.focus();
	});
}
