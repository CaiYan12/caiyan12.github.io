/**
 * 主站运行时装配（对应原主题 js/global-pjax.js 的静态化版本）。
 *
 * 功能块自结构加深 T6/T7 起逐块迁往 `src/utils/runtime/`（已迁：语录条 quote-band、
 * 液态玻璃 liquid-glass、文章目录 article-toc、导航判定 nav-state、减少动效
 * reduced-motion、KaTeX 样式 katex、Mermaid 图表 mermaid、随机背景 random-background、
 * 移动菜单 mobile-menu、头部轮播 header-ticker、分页跳转 pagination-jump、灯箱
 * fancybox、点击词 click-effect、Canvas 粒子 canvas-boom、动态标题 visibility-title、
 * LQIP 渐显 lqip-fade、邮箱保护 protected-email、站内提示触发 toast-trigger），
 * 本文件保留**尚未迁移的块**与**装配表**——全部功能块的
 * 家谱与两条生命周期（初始装载 / swup after-swap 重跑）都由文件尾的 runtimeTable
 * 驱动，新增功能先加表行，勿在别处自行初始化；换页前后的钩子动作另由同处的
 * runtimeHooks 声明。
 */

import { showSiteToast } from "./site-toast";
import { shuffleArray } from "./shuffle";
import { destroyFancybox, initFancybox } from "./runtime/fancybox";
import { initQuoteBand } from "./runtime/quote-band";
import { initLiquidGlass } from "./runtime/liquid-glass";
import { initArticleToc } from "./runtime/article-toc";
import { isNavCurrent } from "./runtime/nav-state";
import { prefersReducedMotion } from "./runtime/reduced-motion";
import { loadKatexCss } from "./runtime/katex";
import { renderMermaid } from "./runtime/mermaid";
import { initRandomBackground } from "./runtime/random-background";
import { initMMenu } from "./runtime/mobile-menu";
import { initHeaderTicker } from "./runtime/header-ticker";
import { initPaginationJump } from "./runtime/pagination-jump";
import { initClickEffect } from "./runtime/click-effect";
import { initCanvasBoomEffect } from "./runtime/canvas-boom";
import { initVisibilityTitle } from "./runtime/visibility-title";
import { initLqipFade } from "./runtime/lqip-fade";
import { initProtectedEmail } from "./runtime/protected-email";
import { initToastTrigger } from "./runtime/toast-trigger";

declare global {
	interface Window {
		swup?: {
			navigate: (url: string) => void;
		};
	}
}

let copyLinkBound = false;

let anchorSmoothScrollBound = false;

let skillsDonutTooltipBound = false;

let newCommentShuffleBound = false;
const NEW_COMMENT_DISPLAY_LIMIT = 5;
const NEW_COMMENT_LOADING_MIN_MS = 220;

function setNewCommentShuffleLoading(
	button: HTMLButtonElement,
	loading: boolean,
) {
	const icon = button.querySelector<HTMLElement>("[data-newcomment-icon]");
	const label = button.querySelector<HTMLElement>("[data-newcomment-label]");
	const subject = button.dataset.shuffleSubject ?? "最新评论";

	button.disabled = loading;
	button.classList.toggle("is-loading", loading);
	button.setAttribute("aria-busy", loading ? "true" : "false");
	button.setAttribute(
		"aria-label",
		loading ? `正在加载${subject}` : `换一批${subject}`,
	);
	button.setAttribute(
		"title",
		loading ? `正在加载${subject}` : `换一批${subject}`,
	);

	if (icon) {
		icon.classList.toggle("fa-random", !loading);
		icon.classList.toggle("fa-circle-o-notch", loading);
		icon.classList.toggle("fa-spin", loading);
	}
	if (label) label.textContent = loading ? "加载中…" : "换一批";
}

/** 侧栏评论换一批（事件委托，Swup 切页后依然生效） */
function initNewCommentShuffle() {
	if (newCommentShuffleBound) return;
	newCommentShuffleBound = true;

	document.addEventListener("click", (event) => {
		const target = event.target;
		if (!(target instanceof Element)) return;
		const button = target.closest<HTMLButtonElement>(
			"[data-newcomment-refresh]",
		);
		if (!button) return;
		if (button.disabled || button.dataset.newcommentLoading === "true") {
			return;
		}

		const listId = button.getAttribute("aria-controls");
		const list = listId ? document.getElementById(listId) : null;
		if (!(list instanceof HTMLUListElement)) return;

		const items = [
			...list.querySelectorAll<HTMLElement>("[data-newcomment-item]"),
		];
		const requestedLimit = Number(button.dataset.newcommentLimit);
		const displayLimit =
			Number.isInteger(requestedLimit) && requestedLimit > 0
				? requestedLimit
				: NEW_COMMENT_DISPLAY_LIMIT;
		const limit = Math.min(displayLimit, items.length);
		if (items.length <= limit) return;

		const loadingStartedAt = performance.now();
		button.dataset.newcommentLoading = "true";
		setNewCommentShuffleLoading(button, true);

		// 让浏览器先绘制加载状态；即使本地切换很快，动画也有最小展示时间。
		window.setTimeout(() => {
			if (button.dataset.newcommentLoading !== "true") return;

			try {
				const currentItems = new Set(
					items.filter((item) => !item.hidden),
				);
				let selectedItems: HTMLElement[] = [];
				const isSameSelection = (candidate: HTMLElement[]) =>
					candidate.length === currentItems.size &&
					candidate.every((item) => currentItems.has(item));

				for (let attempt = 0; attempt < 8; attempt += 1) {
					selectedItems = shuffleArray([...items]).slice(0, limit);
					if (!isSameSelection(selectedItems)) break;
				}

				if (isSameSelection(selectedItems)) {
					const replacement = items.find(
						(item) => !currentItems.has(item),
					);
					if (replacement) {
						selectedItems = [
							...items
								.filter((item) => currentItems.has(item))
								.slice(1),
							replacement,
						];
					}
				}

				const selected = new Set(selectedItems);
				const visibleItems = items.filter((item) => selected.has(item));
				const lastVisible = visibleItems[visibleItems.length - 1];
				items.forEach((item) => {
					const isVisible = selected.has(item);
					item.hidden = !isVisible;
					if (item === lastVisible) {
						item.setAttribute("data-comment-last", "true");
					} else {
						item.removeAttribute("data-comment-last");
					}
				});
			} finally {
				const remainingLoadingMs = Math.max(
					0,
					NEW_COMMENT_LOADING_MIN_MS -
						(performance.now() - loadingStartedAt),
				);
				window.setTimeout(() => {
					if (button.dataset.newcommentLoading !== "true") return;
					delete button.dataset.newcommentLoading;
					setNewCommentShuffleLoading(button, false);
				}, remainingLoadingMs);
			}
		}, 0);
	});
}

/** 技能概览环形图悬浮详情（事件委托，Swup 切页后依然生效） */
function initSkillsDonutTooltip() {
	if (skillsDonutTooltipBound) return;
	skillsDonutTooltipBound = true;

	const showFrames = new WeakMap<HTMLElement, number>();
	const getSegment = (target: EventTarget | null) => {
		if (!(target instanceof Element)) return null;
		return target.closest<SVGPathElement>(".skills-donut-segment-base");
	};
	const getTooltip = (segment: Element) =>
		segment
			.closest<HTMLElement>("[data-skills-overview]")
			?.querySelector<HTMLElement>("[data-skills-donut-tooltip]") ?? null;
	const isSameDonut = (segment: Element, target: EventTarget | null) => {
		const relatedSegment = getSegment(target);
		return (
			relatedSegment?.closest("[data-skills-overview]") ===
			segment.closest("[data-skills-overview]")
		);
	};
	const resetTooltipPosition = (tooltip: HTMLElement) => {
		tooltip.style.removeProperty("left");
		tooltip.style.removeProperty("top");
		tooltip.style.removeProperty("right");
		tooltip.style.removeProperty("bottom");
	};
	const positionTooltip = (
		tooltip: HTMLElement,
		clientX: number,
		clientY: number,
	) => {
		const gap = 14;
		const viewportPadding = 12;
		const rect = tooltip.getBoundingClientRect();
		const maxLeft = Math.max(
			viewportPadding,
			window.innerWidth - rect.width - viewportPadding,
		);
		const maxTop = Math.max(
			viewportPadding,
			window.innerHeight - rect.height - viewportPadding,
		);
		let left = clientX + gap;
		let top = clientY + gap;
		if (left > maxLeft) left = clientX - rect.width - gap;
		if (top > maxTop) top = clientY - rect.height - gap;
		left = Math.min(maxLeft, Math.max(viewportPadding, left));
		top = Math.min(maxTop, Math.max(viewportPadding, top));
		tooltip.style.left = `${left}px`;
		tooltip.style.top = `${top}px`;
		tooltip.style.right = "auto";
		tooltip.style.bottom = "auto";
	};
	const hideTooltip = (tooltip: HTMLElement | null) => {
		if (!tooltip) return;
		const frame = showFrames.get(tooltip);
		if (frame !== undefined) cancelAnimationFrame(frame);
		showFrames.delete(tooltip);
		tooltip.classList.remove("is-visible");
		tooltip.hidden = true;
		tooltip.setAttribute("aria-hidden", "true");
		resetTooltipPosition(tooltip);
	};
	const showTooltip = (
		segment: SVGPathElement,
		clientX?: number,
		clientY?: number,
	) => {
		const tooltip = getTooltip(segment);
		if (!tooltip) return;
		const label = tooltip.querySelector<HTMLElement>(
			"[data-skills-tooltip-label]",
		);
		const value = tooltip.querySelector<HTMLElement>(
			"[data-skills-tooltip-value]",
		);
		const percentage = tooltip.querySelector<HTMLElement>(
			"[data-skills-tooltip-percentage]",
		);
		const color = segment.dataset.skillColor || "#00c000";
		if (label) label.textContent = segment.dataset.skillLabel || "技能等级";
		if (value) value.textContent = segment.dataset.skillValue || "0";
		if (percentage)
			percentage.textContent = segment.dataset.skillPercentage || "0";
		tooltip.style.setProperty("--skills-tooltip-color", color);
		tooltip.hidden = false;
		tooltip.setAttribute("aria-hidden", "false");
		if (typeof clientX === "number" && typeof clientY === "number") {
			positionTooltip(tooltip, clientX, clientY);
		} else {
			resetTooltipPosition(tooltip);
		}
		tooltip.classList.remove("is-visible");
		const frame = requestAnimationFrame(() => {
			if (!tooltip.hidden) tooltip.classList.add("is-visible");
			showFrames.delete(tooltip);
		});
		showFrames.set(tooltip, frame);
	};

	document.addEventListener("pointerover", (event) => {
		if (event.pointerType !== "mouse") return;
		const segment = getSegment(event.target);
		if (segment) showTooltip(segment, event.clientX, event.clientY);
	});
	document.addEventListener("pointermove", (event) => {
		if (event.pointerType !== "mouse") return;
		const segment = getSegment(event.target);
		const tooltip = segment && getTooltip(segment);
		if (segment && tooltip && !tooltip.hidden)
			positionTooltip(tooltip, event.clientX, event.clientY);
	});
	document.addEventListener("pointerout", (event) => {
		const segment = getSegment(event.target);
		if (!segment || isSameDonut(segment, event.relatedTarget)) return;
		hideTooltip(getTooltip(segment));
	});
	document.addEventListener("focusin", (event) => {
		const segment = getSegment(event.target);
		if (segment) showTooltip(segment);
	});
	document.addEventListener("focusout", (event) => {
		const segment = getSegment(event.target);
		if (!segment || isSameDonut(segment, event.relatedTarget)) return;
		hideTooltip(getTooltip(segment));
	});
	document.addEventListener("keydown", (event) => {
		if (event.key !== "Escape") return;
		document
			.querySelectorAll<HTMLElement>("[data-skills-donut-tooltip]")
			.forEach(hideTooltip);
	});
}

/** 写入剪贴板；受限环境下回退到隐藏 textarea */
async function copyText(text: string) {
	try {
		if (navigator.clipboard?.writeText) {
			await navigator.clipboard.writeText(text);
			return;
		}
	} catch {
		// 权限受限时继续尝试兼容性回退方案
	}

	const textarea = document.createElement("textarea");
	textarea.value = text;
	textarea.setAttribute("readonly", "");
	textarea.style.position = "fixed";
	textarea.style.opacity = "0";
	textarea.style.pointerEvents = "none";
	document.body.appendChild(textarea);
	textarea.select();
	const copied = document.execCommand("copy");
	textarea.remove();
	if (!copied) throw new Error("copy failed");
}

/** 本文链接复制（事件委托，Swup 切页后依然生效） */
function initCopyLink() {
	if (copyLinkBound) return;
	copyLinkBound = true;
	document.addEventListener("click", async (event) => {
		const target = event.target;
		if (!(target instanceof Element)) return;
		const link = target.closest<HTMLAnchorElement>("[data-copy-link]");
		if (!link) return;

		event.preventDefault();
		const text = link.dataset.copyLink || link.href;
		try {
			await copyText(text);
			showSiteToast(link.dataset.copyMessage || "已复制");
		} catch {
			showSiteToast("复制失败，请手动复制");
		}
	});
}

/** 导航高亮：根据当前路径标记 current */
function syncNavHighlight() {
	const path = window.location.pathname;
	// 判定口径已单源化到 ./runtime/nav-state（A-4）：前缀匹配必须落在路径段边界上，
	// /link/ 不应命中 /link-survey/。编译期的 Navbar / MMenu 现在用同一个函数。
	const isMatch = (href: string) => isNavCurrent(path, href);
	// 逐锚点 toggle（导航与移动菜单都在 Swup 容器外，切页后需在此重算），
	// class 与 aria-current 同步维护，读屏用户也能感知当前页
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
	// 下拉父项 current：任一子链接匹配即高亮（Swup 切页不替换导航，需在此重算）
	document.querySelectorAll("#nav li.dropdown, #mmenu li").forEach((li) => {
		if (!li.querySelector(':scope > a[href="javascript:void(0)"]')) return;
		const match = [...li.querySelectorAll(":scope > ul a")].some((a) =>
			isMatch(a.getAttribute("href") || "/"),
		);
		li.classList.toggle("current", match);
	});
	document.querySelectorAll("#mmenu a").forEach((a) => {
		const href = a.getAttribute("href") || "/";
		if (href === "javascript:void(0)") return;
		const parent = a.closest("li");
		if (!parent) return;
		parent.classList.toggle("current", isMatch(href));
	});
}

/** 返回顶部 */
let readingProgressFrame = 0;
let readingProgressBound = false;

function updateReadingProgress() {
	readingProgressFrame = 0;
	// 全站可同时存在多根进度条（文章页顶部的固定条 + 侧栏文章目录标题栏下缘
	// 的条，2026-10-15 站长要求「与主站顶部阅读进度条同理、共存」），同一文档
	// 滚动进度驱动全部实例。
	const progressBars = document.querySelectorAll<HTMLElement>(
		"[data-reading-progress]",
	);
	if (progressBars.length === 0) return;

	const root = document.documentElement;
	const maxScroll = root.scrollHeight - root.clientHeight;
	const progress =
		maxScroll > 0
			? Math.min(1, Math.max(0, window.scrollY / maxScroll))
			: 0;
	for (const progressBar of progressBars) {
		progressBar.style.transform = `scaleX(${progress})`;
		progressBar.setAttribute(
			"aria-valuenow",
			String(Math.round(progress * 100)),
		);
	}
}

function scheduleReadingProgressUpdate() {
	if (readingProgressFrame) return;
	readingProgressFrame = requestAnimationFrame(updateReadingProgress);
}

/** 文章阅读进度条：全站只绑定一组监听，Swup 换页后复用新节点 */
function initReadingProgress() {
	if (!readingProgressBound) {
		readingProgressBound = true;
		window.addEventListener("scroll", scheduleReadingProgressUpdate, {
			passive: true,
		});
		window.addEventListener("resize", scheduleReadingProgressUpdate, {
			passive: true,
		});
	}
	scheduleReadingProgressUpdate();
}

function initBackToTop() {
	const backtop = document.getElementById("backtop");
	// backtop 在 Swup 容器外且只初始化一次；dataset 守卫防止未来重入时监听器翻倍
	if (!backtop || backtop.dataset.bound === "true") return;
	backtop.dataset.bound = "true";
	const toggle = () => {
		const visible = window.scrollY > 200;
		// 同值短路：scroll 高频触发，避免无谓的样式写入
		if (visible === (backtop.style.display === "block")) return;
		backtop.style.display = visible ? "block" : "none";
	};
	window.addEventListener("scroll", toggle, { passive: true });
	backtop.addEventListener("click", () => {
		window.scrollTo({
			top: 0,
			behavior: prefersReducedMotion() ? "auto" : "smooth",
		});
	});
	toggle();
}

/** 双击页面任意位置回到顶部（原主题交互） */
function initDblClickScroll() {
	document.addEventListener("dblclick", (e) => {
		if ((e.target as HTMLElement).closest("a, button, input")) return;
		window.scrollTo({
			top: 0,
			behavior: prefersReducedMotion() ? "auto" : "smooth",
		});
	});
}

/**
 * 同页锚点点击平滑滚动（站长 2026-10-15 需求：文章顶部目录与侧栏目录点击跳转
 * 均为浏览器默认瞬移，补一段短促的滚动过渡）。
 *
 * 机制复用双击回顶（initDblClickScroll）的 `window.scrollTo({ behavior: "smooth" })`，
 * 不自绘动画。事件委托绑一次（document 级，Swup 换页不重跑、新渲染的目录链接
 * 天然生效），只接管「同页纯 hash 链接」：
 * - 跨页链接不碰（那是 swup 的领地，swup 侧 smoothScrolling 已为 false）；
 * - `href="#"`（占位链接）不碰；
 * - 目标 id 在当前文档不存在时不碰（照旧让浏览器走「无操作」的默认路径，
 *   不替它伪造 hash）；
 * - 修饰键/非左键（新标签页、下载意图等浏览器手势）不碰。
 * 接管后 hash 更新用 pushState 而非置 location.hash——后者会在平滑滚动进行中
 * 触发原生锚点跳转打断动画。浏览器原生 hash 高亮不动，滚到后由目录激活态
 * （pickActiveIndex）自然点亮对应条目。
 *
 * 监听必须挂**捕获阶段**（capture: true），且接管时必须 **stopPropagation**：
 * swup 对同页 hash 链接的处理**不检查 defaultPrevented**——它的链接点击委托在
 * document 气泡阶段注册且先于本模块装配，无论我们是否 preventDefault 都会执行：
 * 更新地址栏 hash 后走 `scroll:anchor` → `window.scrollTo(0, 目标)` 瞬时直达
 * （本站 swup 集成 `smoothScrolling: false` ⇒ ScrollPlugin.animateScroll 全关，
 * swup 4.9.2 dist 实证）。只 preventDefault 的话我们启动的 smooth 动画会被
 * swup 的同步瞬移当帧覆盖，用户看不到任何动画（生产产物实测：点击后首帧
 * scrollY 已在目标位）。所以必须在捕获阶段拿到事件后 stopPropagation，
 * 让 swup 的委托根本收不到这类点击——swup 对它做的事恰好就是我们要替换的
 * 瞬移跳转，拦截即替换，无副作用。跨页链接照旧放行给 swup。
 */
function initAnchorSmoothScroll() {
	if (anchorSmoothScrollBound) return;
	anchorSmoothScrollBound = true;
	document.addEventListener(
		"click",
		(e) => {
			if (e.defaultPrevented || e.button !== 0) return;
			if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
			const target = e.target as Element | null;
			const link = target?.closest?.("a");
			if (!link) return;
			const url = new URL(link.href, location.href);
			if (
				url.pathname !== location.pathname ||
				url.search !== location.search
			)
				return;
			if (!url.hash || url.hash === "#") return;
			const el = document.getElementById(
				decodeURIComponent(url.hash.slice(1)),
			);
			if (!el) return;
			e.preventDefault();
			// swup 的气泡阶段委托不再收到本事件（见头注释）：它对同页 hash 的
			// 处理正是要被替换的瞬移滚动。
			e.stopPropagation();
			// 状态必须推 **null** 而非 history.state：复制会把 swup 的条目状态
			// （state.url = 无 hash 的页面地址）带进锚点条目，后退 popstate 时
			// swup 的 skipPopStateHandling 看到无 "#" 的 state.url 就把它当普通
			// 页面导航抢走处理，后退回到上一个锚点失效（生产产物实测）。null
			// 与浏览器原生锚点条目同形，popstate 交还原生 hash 滚动。
			history.pushState(null, "", url.hash);
			window.scrollTo({
				top: el.getBoundingClientRect().top + window.scrollY,
				behavior: prefersReducedMotion() ? "auto" : "smooth",
			});
		},
		true,
	);
}

/**
 * /about/ 稿纸手写感：信纸正文逐字符静态微随机。
 * transform-only（rotate ±1.5° / translate ±1px）、无动画、无布局位移；
 * 连续西文/数字片段保持整段不切分，避免单词内换行；
 * dataset 守卫防重复处理，Swup 切页后新 DOM 重新施加。
 */
function initPaperHandwriting() {
	const paperBody = document.querySelector<HTMLElement>(".letter-paper-body");
	const panel = paperBody?.closest<HTMLElement>(".letter-paper");
	if (!paperBody || !panel || paperBody.dataset.handwriting === "true")
		return;
	paperBody.dataset.handwriting = "true";
	syncPaperRulePhase(panel, paperBody);
	if (!panel.dataset.rulePhaseBound) {
		panel.dataset.rulePhaseBound = "true";
		// 字体 swap、换行、缩放都会挪动正文首行，网格相位必须跟随
		new ResizeObserver(() => syncPaperRulePhase(panel, paperBody)).observe(
			panel,
		);
	}
	const walker = document.createTreeWalker(paperBody, NodeFilter.SHOW_TEXT);
	const textNodes: Text[] = [];
	for (let node = walker.nextNode(); node; node = walker.nextNode()) {
		const text = node as Text;
		if (text.data.trim()) textNodes.push(text);
	}
	for (const textNode of textNodes) {
		const fragment = document.createDocumentFragment();
		// 西文/数字整段成组（防单词内换行），CJK 与全角标点逐字成 span
		const segments =
			textNode.data.match(/[\x20-\x7e]+|[^\x00-\x7f]/g) ?? [];
		for (const segment of segments) {
			if (/^[\x20-\x7e]+$/.test(segment)) {
				fragment.appendChild(document.createTextNode(segment));
				continue;
			}
			const span = document.createElement("span");
			span.className = "paper-hand-char";
			const rotate = (Math.random() * 3 - 1.5).toFixed(2);
			const dx = (Math.random() * 2 - 1).toFixed(2);
			const dy = (Math.random() * 2 - 1).toFixed(2);
			span.style.transform = `translate(${dx}px, ${dy}px) rotate(${rotate}deg)`;
			span.textContent = segment;
			fragment.appendChild(span);
		}
		textNode.replaceWith(fragment);
	}
}

/** 整张稿纸的横线网格画在面板层，其相位需按正文首行基线反推：面板网格线落在
 *  padding box 顶 + shift - 1 + k*cycle 处，令其等于正文首行基线 y 即得下式。
 *  头部高度因此不必确定化（巨型标题是流式 clamp 字号，便签换行数随宽度变化） */
function syncPaperRulePhase(panel: HTMLElement, body: HTMLElement) {
	const style = getComputedStyle(panel);
	const cycle = parseFloat(style.getPropertyValue("--lp-cycle"));
	const baseline = parseFloat(style.getPropertyValue("--lp-baseline"));
	if (!cycle || !baseline) return;
	const originTop =
		panel.getBoundingClientRect().top +
		(parseFloat(style.borderTopWidth) || 0);
	const offset = body.getBoundingClientRect().top - originTop + baseline;
	panel.style.setProperty(
		"--lp-shift",
		`${((offset % cycle) + cycle) % cycle}px`,
	);
}

/** astro:page-load 滚动复位：新页面回到顶部 */
function resetScrollToTop() {
	window.scrollTo({ top: 0 });
}

/** astro:page-load 事件派发：供其他组件（搜索、幻灯片）监听 */
function dispatchPageLoaded() {
	document.dispatchEvent(
		new CustomEvent("colorful:page:loaded", {
			detail: { url: window.location.pathname },
		}),
	);
}

/** @swup/astro 生命周期 hooks（页面切换后重初始化）；before-swap / page-load 清单由 runtimeHooks 声明，after-swap 重跑清单由装配表驱动 */
function initSwupHooks() {
	// swap 序 → 重跑清单：与既有硬编码顺序逐项一致（nav → 阅读进度 → fancybox →
	// lqip → katex → mermaid → 稿纸）。swap 序与装配表序不同——旧实现两处顺序本就
	// 不一致（fancybox 在表序 19、重跑序 3），勿「顺手统一」。
	const swapRerun = runtimeTable
		.filter((entry) => entry.swap !== undefined)
		.sort((a, b) => a.swap! - b.swap!)
		.map((entry) => entry.init);
	document.addEventListener("astro:before-swap", () => {
		for (const hook of runtimeHooks.beforeSwap) hook();
	});
	document.addEventListener("astro:after-swap", () => {
		for (const init of swapRerun) init();
	});
	document.addEventListener("astro:page-load", () => {
		for (const hook of runtimeHooks.pageLoad) hook();
	});
}

/**
 * 运行时装配表：主站全部运行时功能块的唯一家谱。
 *
 * - 初始装载：`pagefindReady()` 按表序逐行执行（行序 = 既有调用序，勿重排）；
 * - swup 切页：`astro:after-swap` 只重跑带 `swap` 序号的行，顺序由 swap 号显式声明
 *   （= 既有 initSwupHooks 硬编码顺序）。swap 序与表序不同是**历史事实**，不是笔误。
 * 新功能块：加一行 `{ init: xxx }` 即进初始装载；需要随切页重跑的再补 swap 号。
 * T6/T7 起功能块迁往 `src/utils/runtime/`，本表改为引用迁移后的模块函数。
 */
type RuntimeEntry = { init: () => void; swap?: number };

const runtimeTable: RuntimeEntry[] = [
	{ init: initRandomBackground },
	{ init: syncNavHighlight, swap: 1 },
	{ init: initReadingProgress, swap: 2 },
	{ init: initBackToTop },
	{ init: initDblClickScroll },
	{ init: initMMenu },
	{ init: initHeaderTicker },
	{ init: initLiquidGlass },
	{ init: initLqipFade, swap: 4 },
	{ init: initClickEffect },
	{ init: initCanvasBoomEffect },
	{ init: initVisibilityTitle },
	{ init: initCopyLink },
	{ init: initToastTrigger },
	{ init: initProtectedEmail },
	{ init: initAnchorSmoothScroll },
	{ init: initNewCommentShuffle },
	{ init: initPaginationJump },
	{ init: initSkillsDonutTooltip },
	{ init: initFancybox, swap: 3 },
	{ init: loadKatexCss, swap: 5 },
	{ init: renderMermaid, swap: 6 },
	{ init: initPaperHandwriting, swap: 7 },
	{ init: initQuoteBand },
	{ init: initArticleToc, swap: 8 },
	{ init: initSwupHooks },
];

/**
 * 换页生命周期声明：紧邻上方 runtimeTable 并列存放，专列 initSwupHooks 里此前硬编码的
 * before-swap 清理与 page-load 动作。数组序即执行序，`initSwupHooks` 只按声明消费，
 * 钩子体内不再直接写这些动作；新增项请同时核对「声明 → 钩子 → 浏览器复验」。
 * 这不是第四种初始化轨道：三条轨仍是初始装载（runtimeTable 表序）、换页重跑
 * （runtimeTable 的 swap 序）、换页前后钩子（本声明）。
 */
const runtimeHooks: {
	beforeSwap: Array<() => void>;
	pageLoad: Array<() => void>;
} = {
	// 灯箱清理：实现已迁至 runtime/fancybox.ts，此处只引用其导出
	beforeSwap: [destroyFancybox],
	// 1. 滚动位置复位 → 2. 阅读进度重算 → 3. 派发页面就绪事件
	pageLoad: [
		resetScrollToTop,
		scheduleReadingProgressUpdate,
		dispatchPageLoaded,
	],
};

export function pagefindReady() {
	for (const { init } of runtimeTable) init();
}
