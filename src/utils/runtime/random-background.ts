/**
 * 随机背景运行时模块（T4 #119 自 theme-script.ts 迁出，装配表引用不变）。
 *
 * 背景层 `<img class="bg-image" data-backgrounds="[…]">` 由 Layout.astro 渲染在
 * Swup 容器之外，切页不重建，所以本块**只在整页加载时跑一次**（装配表里无 swap
 * 号），切页保留当前背景。语料是同源静态数组（`src/config.ts` 的
 * `backgroundConfig.images`，当前 4 张），由服务端序列化进 `data-backgrounds`。
 *
 * 「不重复选中当前图」曾经被想当然当成既有契约——**核实结果：不是**。迁移前的
 * 实现只有两行状态：`background.dataset.selected` 元素级守卫 + 全池均匀
 * `Math.floor(Math.random() * images.length)`，既没有「换一张」入口，也没有排除
 * 任何下标；而且 SSR 的 `<img>` 根本没写 `src`，选中发生前不存在「当前图」这个
 * 概念。所以本模块**不新增**去重逻辑：那会是新行为，不是保持。
 *
 * 边界行为也是照抄：语料解析失败或空数组时直接返回，保留纯色页面背景
 * （`console.warn` 供排错）；`dataset.selected` 只在成功写入 `src` 之后才置位。
 */
export function initRandomBackground() {
	const background = document.querySelector<HTMLImageElement>(
		".bg-image[data-backgrounds]",
	);
	if (!background || background.dataset.selected === "true") return;

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
