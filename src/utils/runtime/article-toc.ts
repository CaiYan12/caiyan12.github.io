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
 * 全留在 init 里；import 本模块无副作用。#98/T2 做了采集与填充；#99/T3 在此
 * 落地激活态（scroll-spy）。#100/T4 换页生命周期：本函数由装配表 `{ swap: 8 }`
 * 在每次 astro:after-swap 重跑。换页的正确性靠三条机制，缺一会「高亮乱跳」：
 * 1. swup 换的是整个 <main>，侧栏连同本元件一起换新——新元素天然没有
 *    dataset.articleTocReady 标记（该守卫是元素级防重入，不是跨页缓存），
 *    每次 init 都对全新 DOM 重新采集，旧列表内容不可能残留；
 * 2. window 滚动/resize 监听器只绑一次（模块级 articleTocScrollBound 守卫），
 *    但 rAF 回调经模块级 scheduleFrame 始终指向**最近一次 init 的闭包**——
 *    切页后旧坐标表（lis / measureTops）随旧 DOM 一起被闭包丢弃，不会拿
 *    上一页的坐标算激活态；
 * 3. 激活态随新采集自然重置：本 init 末尾的 update() 以新坐标表从 activeIndex
 *    = -1 起算（新元素无 .current，paint 只在索引变化时落笔）。
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
 * 激活索引纯函数（#99 三条判定规则，缺一不可）：
 * 1. 最后一个「顶部已越过判定线」的标题为当前项——判定线默认 10，与粘性钳位
 *    `#sidebar .widget-stack { top: 10px }` 同值（读者的视觉顶线即 10px）；
 * 2. 首个标题越线前返回 -1——「没有正在阅读的章节」是与高亮类成对存在的
 *    有意状态（词汇表「当前页态」），不是未定义行为；
 * 3. 页底兜底：`scrollY + innerHeight >= scrollHeight - 1` 时强制最后一条，
 *    给「尾部标题距页底很近、按位置永远到不了最后一条」的文章兜底。
 * 所有滚动状态（scrollY/innerHeight/scrollHeight）全部作参数传入，不读全局，
 * 可在裸 node 单测中直接驱动（照 quote-band 纯函数分工）。
 */
export function pickActiveIndex(
	tops: number[],
	scrollY: number,
	innerHeight: number,
	scrollHeight: number,
	threshold = 10,
): number {
	if (tops.length === 0) return -1;
	// 页底兜底优先于按位置判定：位置算不出来时它仍必须点亮最后一条。
	if (scrollY + innerHeight >= scrollHeight - 1) return tops.length - 1;
	let active = -1;
	for (let i = 0; i < tops.length; i++) {
		if (tops[i] - scrollY <= threshold) active = i;
		else break;
	}
	return active;
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
 * 自足幂等（dataset 守卫防重入），import 无副作用。#99/T3 落地激活态：
 * window scroll（rAF 节流）/ resize 时以 pickActiveIndex 算激活索引，变化时
 * 画 .current 并把激活项滚进容器可见范围；-1 时清空全部高亮。
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

	// —— 以下为 #99/T3：激活态跟随阅读位置 ——

	// 坐标表**每次 update 现量**，不在 init 时缓存：正文图片是懒加载，首屏
	// 之后继续撑开页高（实测最长一篇在 init 后各标题整体下移约 175px），
	// 缓存的文档坐标会漂移到「提前点亮下一条」的假激活；resize 也顺带被
	// 覆盖（页高与折行都可能变）。量的是**标题元素**的 top 而非 li 的——
	// 判定线语义是「正在读哪一节」，以正文标题位置为准。
	const lis = [...list.querySelectorAll("li")];
	const measureTops = () =>
		lis.map((li) => {
			const a = li.querySelector("a[href^='#']");
			const heading = a
				? document.getElementById(
						decodeURIComponent(
							(a as HTMLAnchorElement).hash.slice(1),
						),
					)
				: null;
			// 条目由本模块从带 id 的标题生成，heading 理论上必在；找不到时取 0
			//（等价「已越线」的降级，不至于让整条坐标表错位）。
			return heading
				? heading.getBoundingClientRect().top + window.scrollY
				: 0;
		});
	let activeIndex = -1;
	let frame = 0;

	/** 把激活态画到 DOM：-1 = 全部清掉（词汇表「当前页态」：算了就必须有人画） */
	const paint = (index: number) => {
		for (let i = 0; i < lis.length; i++) {
			lis[i].classList.toggle("current", i === index);
			if (i === index) {
				lis[i]
					.querySelector("a")
					?.setAttribute("aria-current", "location");
			} else {
				lis[i].querySelector("a")?.removeAttribute("aria-current");
			}
		}
	};

	/** 激活项变化时让它滚进容器可见范围：直接设 scrollTop（不用 scrollIntoView，
	 *  那会冒泡滚动页面本身——粘性侧栏 + 几何判据站点上属难查抖动源）。
	 *  条目坐标换算进滚动容器坐标系：li 的 offsetParent 是 .widget（section），
	 *  不是内滚 nav，先减掉滚动容器自身的偏移再与 scrollTop 比较。 */
	const reveal = (index: number) => {
		if (index < 0) return;
		const scroller = list.closest<HTMLElement>("[data-article-toc]");
		const li = lis[index] as HTMLElement;
		if (!scroller || !li) return;
		const itemTop =
			li.offsetTop -
			((list as HTMLElement).offsetTop - scroller.offsetTop);
		const itemBottom = itemTop + li.offsetHeight;
		if (itemTop < scroller.scrollTop) {
			scroller.scrollTop = itemTop;
		} else if (itemBottom > scroller.scrollTop + scroller.clientHeight) {
			scroller.scrollTop = itemBottom - scroller.clientHeight;
		}
	};

	const update = () => {
		const index = pickActiveIndex(
			measureTops(),
			window.scrollY,
			window.innerHeight,
			document.documentElement.scrollHeight,
		);
		if (index === activeIndex) return;
		activeIndex = index;
		paint(index);
		reveal(index);
	};

	// 滚动/resize 监听只绑一次（window 事件用模块级布尔守卫，照
	// initReadingProgress 的先例）；rAF 节流句柄由最近一次 init 的 update
	// 闭包接管——本函数整个重跑（切页）时旧坐标表随旧 DOM 一起废弃。
	if (!articleTocScrollBound) {
		articleTocScrollBound = true;
		window.addEventListener("scroll", scheduleArticleTocUpdate, {
			passive: true,
		});
		window.addEventListener("resize", scheduleArticleTocUpdate, {
			passive: true,
		});
	}
	scheduleFrame = () => {
		if (frame) return;
		frame = requestAnimationFrame(() => {
			frame = 0;
			update();
		});
	};
	update();
}

/** 模块级滚动监听守卫：window 事件全站只绑一组，切页后复用（照 initReadingProgress） */
let articleTocScrollBound = false;

/** rAF 节流：由最近一次 init 的 update 闭包接管（换页后指向新坐标表） */
let scheduleFrame: (() => void) | null = null;
function scheduleArticleTocUpdate() {
	scheduleFrame?.();
}
