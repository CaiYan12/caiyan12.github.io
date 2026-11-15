/**
 * 随机背景运行时模块（T4 #119 自 theme-script.ts 迁出，装配表引用不变）。
 *
 * 背景层 `<img class="bg-image" data-backgrounds="[…]">` 由 Layout.astro 渲染在
 * Swup 容器之外，切页不重建，所以本块**只在整页加载时跑一次**（装配表里无 swap
 * 号），切页保留当前背景。语料是同源静态数组（`src/config.ts` 的
 * `backgroundConfig.images`），由服务端序列化进 `data-backgrounds`。
 *
 * 「不重复选中当前图」曾经被想当然当成既有契约——**核实结果：不是**。迁移前的
 * 实现只有两行状态：`background.dataset.selected` 元素级守卫 + 全池均匀
 * `Math.floor(Math.random() * images.length)`，既没有「换一张」入口，也没有排除
 * 任何下标；而且 SSR 的 `<img>` 根本没写 `src`，选中发生前不存在「当前图」这个
 * 概念。所以本模块**不新增**去重逻辑：那会是新行为，不是保持。
 *
 * 边界行为也是照抄：语料解析失败或空数组时直接返回，保留纯色页面背景
 * （`console.warn` 供排错）；`dataset.selected` 只在成功写入 `src` 之后才置位。
 *
 * **窄屏不下载（README TODO「≤680px 时壁纸仍会被下载」，2026-11-15）**：背景层在
 * ≤680px 被 `global.css` 的 `display:none !important` 隐藏，但 `<img>` 的下载与
 * 可见性无关——只要写了 `src` 就会取整张图。所以选图前先问计算样式
 * （`isBackgroundLayerVisible`）：不可见时不写 src、不置 `dataset.selected`，
 * 只在 resize 时等它变可见再补选（`dataset.visibilityBound` 防重复挂监听）。
 * 判据刻意不用 `matchMedia("(max-width: 680px)")`：断点只存在 CSS 一处。
 */
/**
 * 背景层此刻是否真的会被渲染。
 *
 * 判据是**计算出来的 display**，不是 matchMedia 的 680 字面量：断点只存在
 * `global.css` 的 `@media (max-width: 680px)` 一处，将来改断点或改选择器都不会
 * 与 JS 脱钩。**若把隐藏方式改成 `visibility: hidden`，这里会失效并退回
 * 「照旧下载」**——改隐藏方式时必须同步改本函数。
 *
 * 取不到计算样式（非浏览器环境、样式尚未就绪）时按可见处理：宁可多下载一张，
 * 也不要让宽屏访客没有壁纸。
 */
function isBackgroundLayerVisible(image: Element): boolean {
	try {
		return getComputedStyle(image).display !== "none";
	} catch {
		return true;
	}
}

/** 把池里随机一张落到原图层上；语料坏掉时保留纯色背景并 warn 供排错。 */
function selectBackground(background: HTMLImageElement) {
	try {
		const images = JSON.parse(background.dataset.backgrounds || "[]");
		if (!Array.isArray(images) || images.length === 0) return;
		const index = Math.floor(Math.random() * images.length);
		background.src = images[index];
		background.dataset.selected = "true";
	} catch (error) {
		// 背景配置解析失败时保留纯色页面背景；warn 供排错
		console.warn("[background] config parse failed:", error);
	}
}

/**
 * 隐藏时加载的补选入口：只在「整页加载时背景层不可见」这条路径上挂一次。
 * 处理器回到同一个 initRandomBackground() 入口——可见时它会选图，仍隐藏时
 * 会被 dataset.visibilityBound 挡住、不再挂监听。
 */
function watchForVisible(background: HTMLImageElement) {
	if (background.dataset.visibilityBound === "true") return;
	background.dataset.visibilityBound = "true";
	window.addEventListener("resize", () => initRandomBackground());
}

export function initRandomBackground() {
	const background = document.querySelector<HTMLImageElement>(
		".bg-image[data-backgrounds]",
	);
	if (!background || background.dataset.selected === "true") return;

	// 窄屏（≤680px）背景层被 CSS 隐藏：写 src 等于白下载一张看不见的图。
	// 不选，改为等它真的可见再补选（跨断点 resize）。
	if (!isBackgroundLayerVisible(background)) {
		watchForVisible(background);
		return;
	}

	selectBackground(background);
}
