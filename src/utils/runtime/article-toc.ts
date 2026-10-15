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
 * 落地激活态（scroll-spy）；#102/T5 把 reveal 从「越界拖回边缘」升级为
 * 「居中钳制 + rAF 自绘平滑 + 手动让位」。#100/T4 换页生命周期：本函数由装配表
 * `{ swap: 8 }` 在每次 astro:after-swap 重跑。换页的正确性靠三条机制，缺一会「高亮乱跳」：
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
 * 目录自动滚动的目标 scrollTop（#102/T5 居中钳制）：激活项**中线对齐容器中点**
 * （亮行指向「正在读的那节」而非「正在越线的那行字」，与主流阅读器一致；票面
 * 已知后果：与视口顶判定线 10px 视觉脱开是有意接受）。列表首尾不足半屏时钳制
 * 到 [0, scrollHeight − clientHeight]——第一章不拖出顶部空白、末章不拖出底部
 * 空白；容器不比列表矮（scrollHeight ≤ clientHeight，无可滚空间）时恒 0。
 * 纯函数：坐标全部由参数传入，裸 node 单测可直接驱动。
 */
export function pickTocRevealScrollTop(
	itemTop: number,
	itemHeight: number,
	clientHeight: number,
	scrollHeight: number,
): number {
	const max = Math.max(0, scrollHeight - clientHeight);
	const target = itemTop + itemHeight / 2 - clientHeight / 2;
	return Math.min(max, Math.max(0, target));
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
 * 画 .current；#102/T5 起 reveal 把激活项滚到容器垂直中部（钳制），rAF 自绘
 * 平滑到达，用户滚目录后 3s 内手动让位。-1 时清空全部高亮。
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

	// —— #102/T5：居中钳制 + rAF 自绘平滑 + 手动让位 ——
	// 滚动容器就是 widget 本体（<nav data-article-toc>，overflow-y: auto）。
	const scroller = widget;

	// 手动让位状态：用户滚动目录后 3s 内，激活变化只改高亮不滚容器。
	let manualOverrideUntil = 0;
	// 程序自身设 scrollTop 的排除：记录最近一次程序写入值（NaN = 尚未写过）。
	// 两处消费，均不清零——①容器 scroll 事件读到相同值（±0.5）即本模块所写
	// （每帧至多一个 scroll 事件，写值 ↔ 事件一一配对）；②动画每帧写值前核对
	// 现值，不同说明用户在帧间滚了目录（页底动画未完全落定时外部设 scrollTop
	// 的实测场景：布尔标志方案会把合并事件误判成程序写入，让位窗口根本没生效，
	// T5 冒烟红证据）。用户滚动 = 与记录值不同，取消动画并进入 3s 让位窗口。
	let lastOwnWrite = NaN;

	// 在飞动画状态（同一时刻至多一个动画：新激活取消旧的、从当前进度追新）。
	let revealFrame = 0;
	let revealFrom = 0;
	let revealTo = 0;
	let revealStart = 0;
	// 防抖状态：无动画在飞时，激活变化只更新目标并重排 100ms 定时器。
	let revealDebounce = 0;
	let revealPendingTarget = 0;

	const setScrollTop = (v: number) => {
		// 浏览器会把 scrollTop 对齐到整数（实测写入 941.5 读回 942，差值恰为
		// 0.5——正好落在「程序写入 ↔ 事件」配对容差的边界上被误判成用户滚动，
		// 让位窗口把后续 reveal 整段吞掉，T5 冒烟红证据）。写入侧先取整：
		// 程序写入与读回值严格相等（diff 0），±0.5 容差只留给真用户滚动
		// （整数像素 ≥1）。动画观感不变（亚像素取整不可见）。
		const snapped = Math.round(v);
		lastOwnWrite = snapped;
		scroller.scrollTop = snapped;
	};

	const cancelReveal = () => {
		if (revealFrame) {
			cancelAnimationFrame(revealFrame);
			revealFrame = 0;
		}
		if (revealDebounce) {
			clearTimeout(revealDebounce);
			revealDebounce = 0;
		}
	};

	const stepReveal = () => {
		revealFrame = requestAnimationFrame((now) => {
			revealFrame = 0;
			// 写值前核对现值：与上次程序写入不同，说明用户在帧间滚了目录——
			// 立即让位（取消动画、进入 3s 窗口），不与用户抢容器。
			if (
				Number.isFinite(lastOwnWrite) &&
				Math.abs(scroller.scrollTop - lastOwnWrite) >= 0.5
			) {
				((window as any).__tocOvr ??= []).push({
					kind: "frame",
					top: scroller.scrollTop,
					last: lastOwnWrite,
					t: performance.now(),
				});
				manualOverrideUntil = performance.now() + MANUAL_OVERRIDE_MS;
				return;
			}
			const t = Math.min(1, (now - revealStart) / REVEAL_DURATION);
			setScrollTop(
				revealFrom + (revealTo - revealFrom) * easeOutCubic(t),
			);
			if (t < 1) stepReveal();
		});
	};

	const startReveal = (target: number) => {
		revealFrom = scroller.scrollTop;
		revealTo = target;
		// 目标就在原地：不起动画（200ms 空转只会让判据读到无意义中间帧）。
		if (Math.abs(revealTo - revealFrom) < 1) return;
		// 从当前位置接管：基线同步到现值，否则首帧核对会拿旧写入值误判
		// 「用户动过」而自取消（取消追新路径的起点是上一段动画的中间值）。
		lastOwnWrite = revealFrom;
		revealStart = performance.now();
		stepReveal();
	};

	/** 激活项变化时把目录滚到「激活项居中（钳制）」：目标由纯函数
	 *  pickTocRevealScrollTop 计算；到达是 rAF 自绘平滑（不用 scrollIntoView——
	 *  那会冒泡滚动页面本身，#99 起的约束不回退），新激活取消旧动画从当前
	 *  进度追新，连续变化先防抖。条目坐标换算沿用 getBoundingClientRect 差值
	 *  （纯视口坐标差 + scrollTop，不依赖 offsetParent 链的定位模型）。 */
	const reveal = (index: number) => {
		if (index < 0) return;
		// 手动让位窗口内：只改高亮不滚容器（paint 已在 update 里做过）。
		if (performance.now() < manualOverrideUntil) return;
		const li = lis[index] as HTMLElement;
		if (!li) return;
		const itemTop =
			li.getBoundingClientRect().top -
			scroller.getBoundingClientRect().top +
			scroller.scrollTop;
		const target = pickTocRevealScrollTop(
			itemTop,
			li.offsetHeight,
			scroller.clientHeight,
			scroller.scrollHeight,
		);
		if (prefersReducedMotion()) {
			// 站内既有回退惯例（theme-script.ts）：减少动效偏好下全部瞬时。
			cancelReveal();
			setScrollTop(target);
			return;
		}
		if (revealFrame) {
			// 动画进行中：取消旧动画，从当前进度直接追新目标（不排队不积压）。
			cancelAnimationFrame(revealFrame);
			revealFrame = 0;
			startReveal(target);
			return;
		}
		// 无动画在飞：连续激活变化先防抖，目标稳定 100ms 后才启动。
		revealPendingTarget = target;
		if (revealDebounce) clearTimeout(revealDebounce);
		revealDebounce = window.setTimeout(() => {
			revealDebounce = 0;
			startReveal(revealPendingTarget);
		}, REVEAL_DEBOUNCE);
	};

	// 手动让位（#102）：监听目录容器自身的 scroll——用户滚目录会触发；本模块
	// 程序化设 scrollTop（动画分帧/瞬时设值）也会触发，按 lastOwnWrite 值比对
	// 排除。真用户滚动：取消在飞动画与防抖，进入 3s 让位窗口——期间 update
	// 只画高亮不滚容器，静默 3s 后下一次激活变化恢复自动居中。
	scroller.addEventListener("scroll", () => {
		if (
			Number.isFinite(lastOwnWrite) &&
			Math.abs(scroller.scrollTop - lastOwnWrite) < 0.5
		) {
			// 本模块写入触发的事件：消费但不清零——记录值还要供动画下一帧的
			// 写值前核对用（见 lastOwnWrite 注释）。
			return;
		}
		((window as any).__tocOvr ??= []).push({
			kind: "evt",
			top: scroller.scrollTop,
			last: lastOwnWrite,
			t: performance.now(),
		});
		cancelReveal();
		manualOverrideUntil = performance.now() + MANUAL_OVERRIDE_MS;
	});

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

// —— #102/T5 目录到达动画参数 ——
/** rAF 自绘平滑的总时长（票面裁决：约 200ms ease-out）。 */
const REVEAL_DURATION = 200;
/** 连续激活变化的防抖：目标稳定 100ms 后才启动动画（连续滚动中不逐帧启停）。 */
const REVEAL_DEBOUNCE = 100;
/** 手动让位窗口：用户滚动目录后 3s 内激活变化只改高亮不滚容器。 */
const MANUAL_OVERRIDE_MS = 3000;
/** ease-out cubic：前快后慢，观感对齐站内既有 ease-out 过渡。 */
const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
/** 用户偏好减少动效（照 theme-script.ts 的既有回退惯例：JS 驱动的动效必须同样短路） */
const prefersReducedMotion = () =>
	window.matchMedia("(prefers-reduced-motion: reduce)").matches;
