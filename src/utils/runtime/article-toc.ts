/**
 * 侧栏「文章目录」（WidgetArticleToc）运行时模块。
 *
 * 标题树只存在于文章页的渲染产物里，而侧栏由被全部页面共用的布局渲染，拿不到
 * 它（#98 票面）——所以采集必须在运行时做。采集口径与顶部目录（PostToc 的
 * render(post).headings，h2–h4）**同源**：Markdown 管线的 rehypeSlug 只给正文
 * 标题注入 id，模板手写的上一篇/下一篇 h3 没有 id（AGENTS.md 管线事实），
 * 因此 `.post-body :is(h2,h3,h4)[id]` 是与顶部目录对齐的最省事写法，天然排除
 * 采集到导航假标题的坑。
 *
 * 分工照 quote-band.ts 的先例：纯函数顶层导出、不读 window/document，副作用
 * 全留在 init 里；import 本模块无副作用。本票（#98/T2）只做采集与填充；
 * 激活态（scroll-spy）与换页重采集分别留给 T3/T4——但模块结构已按那两票的
 * 接口预留：pickActiveIndex 的签名在 T3 落地时补纯函数实现即可，
 * initArticleToc 不持有任何模块级 DOM 缓存（侧栏在 swup 容器 <main> 内，
 * 切页整块换新，每次 init 都重新 query，见 AGENTS.md theme-script 约定）。
 */

/** 一条目录条目：slug（= 标题元素 id）、标题全文、标题层级（2–4）。 */
export interface ArticleTocEntry {
	slug: string;
	text: string;
	depth: number;
}

/**
 * 从容器采集带 id 的 h2/h3/h4 标题（纯函数：输入传 Element，不读全局）。
 * 顺序 = DOM 顺序，与顶部目录的标题树一致。层级范围与 PostToc 的
 * `depth >= 2 && depth <= 4` 过滤同口径。
 */
export function collectArticleTocEntries(root: Element): ArticleTocEntry[] {
	const headings = root.querySelectorAll("h2[id], h3[id], h4[id]");
	const entries: ArticleTocEntry[] = [];
	for (const el of headings) {
		const slug = el.id;
		if (!slug) continue;
		const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
		if (!text) continue;
		entries.push({
			slug,
			text,
			depth: Number(el.tagName.slice(1)),
		});
	}
	return entries;
}

/**
 * 条目渲染的共享工厂：纯函数，接收 Document 以便单测桩化（不隐式读全局）。
 * 结构照 PostToc.astro 的 `<li style="--toc-depth: N"><a href="#slug">text</a></li>`，
 * 外加侧栏版必须的 `title` 全文（#98：无条件加，不按截断与否判断）。
 */
export function buildArticleTocItem(
	doc: Document,
	entry: ArticleTocEntry,
): HTMLLIElement {
	const li = doc.createElement("li");
	li.style.setProperty("--toc-depth", String(entry.depth));
	const a = doc.createElement("a");
	a.setAttribute("href", `#${entry.slug}`);
	a.setAttribute("title", entry.text);
	a.textContent = entry.text;
	li.appendChild(a);
	return li;
}

/**
 * 侧栏文章目录 init：把采集到的条目填进列表；0 条时整个移除本元件（空盒降级，
 * 粘性职责本就由外层 .widget-stack 容器独家承担，移除后容器自然收缩）。
 * 自足幂等（dataset 守卫防重入），import 无副作用。本票不做激活态与监听器——
 * T3/T4 落地时在此函数上扩展，无需改动调用方。
 */
export function initArticleToc() {
	const widget = document.querySelector<HTMLElement>(
		"#sidebar [data-article-toc]",
	);
	if (!widget || widget.dataset.articleTocReady === "true") return;
	widget.dataset.articleTocReady = "true";

	const body = document.querySelector(".post-body");
	const list = widget.querySelector(".article-toc");
	if (!body || !list) return;

	const entries = collectArticleTocEntries(body);
	if (entries.length === 0) {
		// 零标题降级：与顶部目录的「有标题才渲染」门槛一致（#98 User Story 19），
		// 不留孤立边框；粘性在外层容器上，无须交还处理。
		widget.remove();
		return;
	}

	for (const entry of entries) {
		list.appendChild(buildArticleTocItem(document, entry));
	}
}
