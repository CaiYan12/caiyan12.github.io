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
	// 「用户滚动」以**输入事件源**识别（wheel / pointerdown / keydown），不监听
	// scroll 事件做写值配对——scroll 是结果事件，程序化写值与用户滚动都会触发，
	// 靠值比对排除对事件合并/派发时序脆弱（T5 首版实测：4c 段程序化写容器
	// scrollTop 每次都武装让位窗口，泄漏进后续判据间歇性吞掉 reveal，作者两轮
	// 未定位到触发源；输入事件只来自真实用户输入，无此歧义）。
	// 点击条目链接**清除**让位窗（站长 2026-10-15 报告并补充：点击是导航意图
	// 而非「浏览目录」，跳转后激活项应照常居中；首版 pointerdown 一律武装让位，
	// 「先滚目录再点链接」与「直接点链接」两种路径的跳转后居中都被吞掉 3s，
	// 亮行停在原处）。仅清除不武装——滚动条拖拽/空白处拖动仍正常武装。
	let manualOverrideUntil = 0;

	const userScrolling = () => {
		cancelReveal();
		manualOverrideUntil = performance.now() + MANUAL_OVERRIDE_MS;
	};
	scroller.addEventListener("wheel", userScrolling, { passive: true });
	// 滚动条拖拽不产生 wheel：pointerdown 覆盖；命中链接（导航）则清让位窗。
	scroller.addEventListener("pointerdown", (e) => {
		if ((e.target as Element | null)?.closest("a")) {
			manualOverrideUntil = 0;
			return;
		}
		userScrolling();
	});
	// 键盘滚动（焦点在条目链接上时 Space/PageUp/PageDown/方向键滚动容器）。
	scroller.addEventListener(
		"keydown",
		(e) => {
			if (
				e.key === " " ||
				e.key === "PageUp" ||
				e.key === "PageDown" ||
				e.key === "ArrowUp" ||
				e.key === "ArrowDown" ||
				e.key === "Home" ||
				e.key === "End"
			)
				userScrolling();
		},
		{ passive: true },
	);

	// 在飞动画状态（同一时刻至多一个动画：新激活取消旧的、从当前进度追新）。
	let revealFrame = 0;
	let revealFrom = 0;
	let revealTo = 0;
	let revealStart = 0;
	// 防抖状态：无动画在飞时，激活变化只更新目标并重排 100ms 定时器。
	let revealDebounce = 0;
	let revealPendingIndex = -1;
	// 成文不变量（T5 审查发现）：动画在飞（revealFrame ≠ 0）⇒ revealDebounce === 0。
	// 「动画分支」（reveal 内 if (revealFrame)）裸 cancelAnimationFrame 不清防抖也安全：
	// revealDebounce 只在「无动画在飞」分支赋值，startReveal 两个入口（防抖回调先清零、动画分支自身）进入时防抖必为 0。
	// 中途改道由 cancelReveal 统一清两者（wheel/pointerdown/keydown 的 userScrolling、新激活的动画分支），不会单边残留。

	const setScrollTop = (v: number) => {
		scroller.scrollTop = v;
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
		revealStart = performance.now();
		stepReveal();
	};

	/** 激活项变化时把目录滚到「激活项居中（钳制）」：目标由纯函数
	 *  pickTocRevealScrollTop 计算；到达是 rAF 自绘平滑（不用 scrollIntoView——
	 *  那会冒泡滚动页面本身，#99 起的约束不回退），新激活取消旧动画从当前
	 *  进度追新，连续变化先防抖。条目坐标换算沿用 getBoundingClientRect 差值
	 *  （纯视口坐标差 + scrollTop，不依赖 offsetParent 链的定位模型）。 */
	const reveal = (index: number) => {
		if (index < 0) {
			// 「没有正在阅读的章节」：清掉在飞动画与已排队的防抖——否则页顶时
			// 上一目标（如页底兜底的末章）的动画照飞，容器停在无语义的位置
			// （实测：reveal(73) 排队后 reveal(-1) 早退，动画照飞到 max）。
			cancelReveal();
			return;
		}
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
		// 记 **pendingIndex** 而非只记 target：防抖到期回调重读实时状态——
		// 若到期时激活项又变过（rAF 节流把后续 scrollTo 的 update 推迟到
		// 定时器之后，实测采样 max 超起点 20px），说明连续变化仍在进行，
		// 按最新 index 重排防抖而不是朝过期目标起跳（否则动画从朝旧目标的
		// 进度折返，容器在「目标未稳定」时就动了，违反防抖语义）。
		revealPendingIndex = index;
		if (revealDebounce) clearTimeout(revealDebounce);
		revealDebounce = window.setTimeout(() => {
			revealDebounce = 0;
			if (revealPendingIndex === activeIndex) {
				startReveal(
					pickTocRevealScrollTop(
						lis[revealPendingIndex].getBoundingClientRect().top -
							scroller.getBoundingClientRect().top +
							scroller.scrollTop,
						lis[revealPendingIndex].offsetHeight,
						scroller.clientHeight,
						scroller.scrollHeight,
					),
				);
			} else {
				// 到期时目标已又变：重排防抖（读数与 reveal 相同的让位守卫语义，
				// 让位窗内不启动——本回调只在无动画在飞路径挂出，让位窗内
				// reveal 早退不会到这，但重排仍守卫一次）。
				if (performance.now() < manualOverrideUntil) return;
				revealDebounce = window.setTimeout(() => {
					revealDebounce = 0;
					startReveal(
						pickTocRevealScrollTop(
							lis[activeIndex].getBoundingClientRect().top -
								scroller.getBoundingClientRect().top +
								scroller.scrollTop,
							lis[activeIndex].offsetHeight,
							scroller.clientHeight,
							scroller.scrollHeight,
						),
					);
				}, REVEAL_DEBOUNCE);
			}
		}, REVEAL_DEBOUNCE);
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
