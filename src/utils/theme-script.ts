/**
 * 客户端主题脚本：对应原主题 js/global-pjax.js 的静态化版本
 * - 导航当前项高亮
 * - 返回顶部（双击页面任意位置回到顶部）
 * - 移动端全屏菜单
 * - Swup 生命周期 hooks：页面切换后重新初始化 Fancybox / 滚动复位
 */

import "@fancyapps/ui/dist/fancybox/fancybox.css";
import { showSiteToast } from "./site-toast";

declare global {
	interface Window {
		swup?: {
			navigate: (url: string) => void;
		};
		Fancybox?: {
			bind: (selector: string, opts?: unknown) => void;
			unbind: (selector: string) => void;
			close: () => void;
			destroy: () => void;
		};
	}
}

/** 初始化当前页面的图片灯箱（懒加载 Fancybox） */
async function initFancybox() {
	const imgs = document.querySelectorAll(
		".post-context img, .photo-grid img, .page .post-context img",
	);
	if (imgs.length === 0) return;
	try {
		const { Fancybox } = await import("@fancyapps/ui/dist/fancybox/");
		window.Fancybox = Fancybox;
		// 正文图片（排除已绑定的）
		const contentImgs = document.querySelectorAll(
			".post-context img:not([data-fancybox])",
		);
		contentImgs.forEach((img) => {
			if (img.closest(".qrimg")) return;
			const src = img.getAttribute("src") || "";
			if (src && !src.includes("data:")) {
				img.setAttribute("data-fancybox", "post-gallery");
				const caption = img.getAttribute("alt");
				if (caption) img.setAttribute("data-caption", caption);
			}
		});
		Fancybox.bind("[data-fancybox]", {});
	} catch {
		// 灯箱加载失败不阻塞页面
	}
}

/** 清理 Fancybox 绑定（页面切换前） */
function destroyFancybox() {
	window.Fancybox?.unbind("[data-fancybox]");
	window.Fancybox?.close();
}

let copyLinkBound = false;

let skillsDonutTooltipBound = false;

let newCommentShuffleBound = false;
let paginationJumpBound = false;
const NEW_COMMENT_DISPLAY_LIMIT = 5;
const NEW_COMMENT_LOADING_MIN_MS = 220;

function shuffleArray<T>(items: T[]) {
	for (let index = items.length - 1; index > 0; index -= 1) {
		const randomIndex = Math.floor(Math.random() * (index + 1));
		[items[index], items[randomIndex]] = [items[randomIndex], items[index]];
	}
	return items;
}

/** 用户偏好减少动效（与 CSS 侧 prefers-reduced-motion 降级约定对齐，JS 驱动的动效必须同样短路） */
const prefersReducedMotion = () =>
	window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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

/** 分页跳转（事件委托，Swup 切页后依然生效） */
function initPaginationJump() {
	if (paginationJumpBound) return;
	paginationJumpBound = true;

	document.addEventListener("submit", (event) => {
		const target = event.target;
		if (!(target instanceof HTMLFormElement)) return;
		const form = target.closest<HTMLFormElement>("[data-pagination-jump]");
		if (!form) return;

		event.preventDefault();
		const input = form.querySelector<HTMLInputElement>(
			"[data-pagination-input]",
		);
		if (!input) return;

		const value = input.value.trim();
		const min = Number(input.min);
		const max = Number(input.max);
		const page = Number(value);
		const valid =
			/^\d+$/.test(value) &&
			Number.isInteger(page) &&
			Number.isInteger(min) &&
			Number.isInteger(max) &&
			page >= min &&
			page <= max;
		const error = form.querySelector<HTMLElement>(
			"[data-pagination-error]",
		);

		if (!valid) {
			input.setAttribute("aria-invalid", "true");
			if (error) {
				error.textContent = `请输入 ${min} 到 ${max} 之间的整数页码。`;
				error.hidden = false;
			}
			input.focus();
			return;
		}

		input.setAttribute("aria-invalid", "false");
		if (error) {
			error.textContent = "";
			error.hidden = true;
		}

		const template = form.dataset.urlTemplate ?? "";
		const firstPageUrl = form.dataset.firstPageUrl ?? "/";
		const url =
			page === 1 ? firstPageUrl : template.replace("{n}", String(page));
		if (window.swup?.navigate) {
			window.swup.navigate(url);
		} else {
			window.location.href = url;
		}
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

/** 页面存在 KaTeX 公式时按需加载其样式 */
function loadKatexCss() {
	if (document.querySelector(".katex")) {
		import("katex/dist/katex.css").catch(() => {});
	}
}

/** 渲染 mermaid 图表（懒加载，仅在页面存在 pre.mermaid 时执行） */
async function renderMermaid() {
	const nodes = [...document.querySelectorAll<HTMLElement>("pre.mermaid")];
	const pending = nodes.filter((n) => n.dataset.mermaidRendered !== "true");
	if (pending.length === 0) return;
	try {
		const { default: mermaid } = await import("mermaid");
		const rootStyles = getComputedStyle(document.documentElement);
		const cssVar = (name: string, fallback: string) =>
			rootStyles.getPropertyValue(name).trim() || fallback;
		const primary = cssVar("--primary", "#00c000");
		const primaryDark = cssVar("--primary-dark", "#0a0");
		const border = cssVar("--border", "#eaeaea");
		const pageBackground = cssVar("--page-bg", "#f4f5f7");
		const text = cssVar("--text", "#000");
		const textGray = cssVar("--text-gray", "#505050");
		const bodyFont = getComputedStyle(document.body).fontFamily;
		const nodeBackground = "#edfaf2";

		mermaid.initialize({
			startOnLoad: false,
			theme: "base",
			look: "classic",
			fontFamily: bodyFont,
			fontSize: 14,
			themeVariables: {
				background: pageBackground,
				mainBkg: "#fff",
				primaryColor: nodeBackground,
				primaryTextColor: textGray,
				primaryBorderColor: primary,
				secondaryColor: "#fff",
				tertiaryColor: pageBackground,
				lineColor: primaryDark,
				textColor: text,
				nodeBkg: nodeBackground,
				nodeBorder: primary,
				nodeTextColor: textGray,
				clusterBkg: "#fff",
				clusterBorder: border,
			},
			themeCSS: `
				.node rect, .node circle, .node ellipse, .node polygon, .node path {
					fill: ${nodeBackground} !important;
					stroke: ${primary} !important;
				}
				.node .label text, .nodeLabel, .label text {
					fill: ${textGray} !important;
					color: ${textGray} !important;
				}
				.edgeLabel, .edgeLabel rect {
					fill: #fff !important;
					background-color: #fff !important;
				}
				.mindmap-node.section-root rect,
				.mindmap-node.section-root path,
				.mindmap-node.section-root circle,
				.mindmap-node.section-root polygon {
					fill: ${primary} !important;
					stroke: ${primaryDark} !important;
				}
				.mindmap-node.section-root text,
				.mindmap-node.section-root span {
					fill: #fff !important;
					color: #fff !important;
				}
				.mindmap-node:not(.section-root) rect,
				.mindmap-node:not(.section-root) path,
				.mindmap-node:not(.section-root) circle,
				.mindmap-node:not(.section-root) polygon {
					fill: ${nodeBackground} !important;
					stroke: ${primary} !important;
				}
				.mindmap-node:not(.section-root) text,
				.mindmap-node:not(.section-root) span {
					fill: ${textGray} !important;
					color: ${textGray} !important;
				}
				[class*="section-edge-"] {
					stroke: ${primaryDark} !important;
				}
				[class*="edge-depth-"] {
					stroke-width: 2px !important;
				}
			`,
			securityLevel: "strict",
		});
		await mermaid.run({ nodes: pending });
		pending.forEach((n) => (n.dataset.mermaidRendered = "true"));
	} catch {
		// mermaid 渲染失败不阻塞页面
	}
}

/** spoiler 点击显示/隐藏（事件委托，Swup 切页后依然生效） */
function initSpoiler() {
	document.addEventListener("click", (e) => {
		const target = e.target as HTMLElement | null;
		const spoiler = target?.closest?.(".spoiler");
		if (spoiler) {
			spoiler.classList.toggle("revealed");
		}
	});
}

/** 点击特效：社会主义核心价值观词组顺序循环（参考 zcjun.com，已去除其末尾的站点名），彩虹色上浮渐隐 */
const CLICK_EFFECT_WORDS = [
	"富强",
	"民主",
	"文明",
	"和谐",
	"自由",
	"平等",
	"公正",
	"法治",
	"爱国",
	"敬业",
	"诚信",
	"友善",
];
let clickEffectIndex = 0;

function initClickEffect() {
	document.addEventListener("click", (e) => {
		const slot = clickEffectIndex % CLICK_EFFECT_WORDS.length;
		clickEffectIndex++;
		const span = document.createElement("span");
		span.className = "click-word";
		span.textContent = CLICK_EFFECT_WORDS[slot];
		// 色相按 30° 步进循环，12 个词恰好覆盖一圈彩虹色
		span.style.color = `hsl(${slot * 30}, 100%, 45%)`;
		span.style.left = `${e.clientX}px`;
		span.style.top = `${e.clientY - 20}px`;
		span.addEventListener("animationend", () => span.remove());
		document.body.appendChild(span);
	});
}

/** 点击特效 2：Canvas 粒子爆炸（移植自 https://eco.krt.moe/posts/effect-click/ 的 cursor-effects.js） */
function initCanvasBoomEffect() {
	if (prefersReducedMotion()) return;
	if (document.getElementById("click-boom-canvas")) return;

	class BoomCircle {
		position: { x: number; y: number };
		renderCount = 0;
		constructor(
			origin: { x: number; y: number },
			private speed: number,
			private color: string,
			private angle: number,
			private context: CanvasRenderingContext2D,
		) {
			this.position = { ...origin };
		}
		draw() {
			this.context.fillStyle = this.color;
			this.context.beginPath();
			this.context.arc(
				this.position.x,
				this.position.y,
				2,
				0,
				Math.PI * 2,
			);
			this.context.fill();
		}
		move() {
			// 速度取原版一半（用户要求慢 0.5 倍），重力项同步减半保持轨迹形状
			this.position.x += (Math.sin(this.angle) * this.speed) / 2;
			this.position.y +=
				(Math.cos(this.angle) * this.speed) / 2 +
				this.renderCount * 0.15;
			this.renderCount++;
		}
	}

	class Boom {
		circles: BoomCircle[] = [];
		stop = false;
		constructor(
			private origin: { x: number; y: number },
			private context: CanvasRenderingContext2D,
			private circleCount = 10,
			private area = {
				width: window.innerWidth,
				height: window.innerHeight,
			},
		) {}
		private randomArray(range: string[]) {
			return range[Math.floor(range.length * Math.random())];
		}
		private randomColor() {
			const range = ["8", "9", "A", "B", "C", "D", "E", "F"];
			return (
				"#" +
				Array.from({ length: 6 }, () => this.randomArray(range)).join(
					"",
				)
			);
		}
		private randomRange(start: number, end: number) {
			return (end - start) * Math.random() + start;
		}
		init() {
			for (let i = 0; i < this.circleCount; i++) {
				this.circles.push(
					new BoomCircle(
						this.origin,
						this.randomRange(1, 6),
						this.randomColor(),
						this.randomRange(Math.PI - 1, Math.PI + 1),
						this.context,
					),
				);
			}
		}
		move() {
			this.circles.forEach((circle, index) => {
				if (
					circle.position.x > this.area.width ||
					circle.position.y > this.area.height
				) {
					this.circles.splice(index, 1);
				}
				circle.move();
			});
			if (this.circles.length === 0) {
				this.stop = true;
			}
		}
		draw() {
			this.circles.forEach((circle) => circle.draw());
		}
	}

	const canvas = document.createElement("canvas");
	canvas.id = "click-boom-canvas";
	const ctx = canvas.getContext("2d");
	if (!ctx) return;
	const style = canvas.style;
	style.position = "fixed";
	style.top = "0";
	style.left = "0";
	style.zIndex = "2147483647";
	style.pointerEvents = "none";
	style.width = `${window.innerWidth}px`;
	style.height = `${window.innerHeight}px`;
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	document.body.appendChild(canvas);

	const booms: Boom[] = [];
	let running = false;
	const run = () => {
		running = true;
		if (booms.length === 0) {
			running = false;
			return;
		}
		requestAnimationFrame(run);
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		booms.forEach((boom, index) => {
			if (boom.stop) {
				booms.splice(index, 1);
				return;
			}
			boom.move();
			boom.draw();
		});
	};
	window.addEventListener("mousedown", (e) => {
		const boom = new Boom({ x: e.clientX, y: e.clientY }, ctx);
		boom.init();
		booms.push(boom);
		if (!running) run();
	});
	window.addEventListener("pagehide", () => {
		booms.length = 0;
	});
}

/** LQIP 占位淡出：图片加载完成后隐藏渐变占位（无 JS 时图片加载完成后自然覆盖占位，不影响显示） */
function initLqipFade() {
	document
		.querySelectorAll<HTMLElement>(".lqip-placeholder")
		.forEach((placeholder) => {
			if (placeholder.dataset.lqipBound === "true") return;
			placeholder.dataset.lqipBound = "true";
			const img = placeholder.parentElement?.querySelector("img");
			if (!img) return;
			const done = () => placeholder.classList.add("loaded");
			if (img.complete && img.naturalWidth > 0) {
				done();
			} else {
				img.addEventListener("load", done, { once: true });
				img.addEventListener("error", done, { once: true });
			}
		});
}

/** 动态标题：切走时换告别语；切回先显示"算了，你走吧！"，2 秒后恢复原标题 */
function initVisibilityTitle() {
	let timer: ReturnType<typeof setTimeout> | undefined;
	let originalTitle = "";
	document.addEventListener("visibilitychange", () => {
		if (document.visibilityState === "hidden") {
			clearTimeout(timer);
			originalTitle = document.title;
			document.title = "别走啊...(っ°Д°;)っ";
		} else {
			document.title = "算了，你走吧！";
			timer = setTimeout(() => {
				document.title = originalTitle;
			}, 2000);
		}
	});
}

/** 导航高亮：根据当前路径标记 current */
function syncNavHighlight() {
	const path = window.location.pathname;
	const isMatch = (href: string) =>
		path === href ||
		(href !== "/" && path.startsWith(href.replace(/\/$/, "")));
	document.querySelectorAll("#nav a").forEach((a) => {
		const href = a.getAttribute("href") || "/";
		// 下拉父项按钮（void href）不匹配任何路径，交由下方子链接统一计算
		if (href === "javascript:void(0)") return;
		const parent = a.closest("li");
		if (!parent) return;
		parent.classList.toggle("current", isMatch(href));
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
function initBackToTop() {
	const backtop = document.getElementById("backtop");
	if (!backtop) return;
	const toggle = () => {
		const y = window.scrollY;
		backtop.style.display = y > 200 ? "block" : "none";
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

/** 移动端全屏菜单 */
function initMMenu() {
	const openBtn = document.getElementById("open-nav");
	const menu = document.getElementById("mmenu");
	const close = document.getElementById("mmenu-close");
	const closeButton = document.getElementById("close-nav");
	const backdrop = document.getElementById("mmenu-backdrop");
	if (!openBtn || !menu || !close) return;
	openBtn.addEventListener("click", () => {
		menu.classList.add("open");
		close.classList.add("open");
		backdrop?.classList.add("open");
		document.body.style.overflow = "hidden";
	});
	const closeMenu = () => {
		menu.classList.remove("open");
		close.classList.remove("open");
		backdrop?.classList.remove("open");
		document.body.style.overflow = "";
	};
	close.addEventListener("click", closeMenu);
	closeButton?.addEventListener("click", closeMenu);
	backdrop?.addEventListener("click", closeMenu);
	menu.addEventListener("click", (e) => {
		if ((e.target as HTMLElement).closest("a")) closeMenu();
	});
}

/**
 * /about/ 稿纸手写感：信纸正文逐字符静态微随机。
 * transform-only（rotate ±1.5° / translate ±1px）、无动画、无布局位移；
 * 连续西文/数字片段保持整段不切分，避免单词内换行；
 * dataset 守卫防重复处理，Swup 切页后新 DOM 重新施加。
 */
function initPaperHandwriting() {
	const paperBody = document.querySelector<HTMLElement>(".letter-paper-body");
	if (!paperBody || paperBody.dataset.handwriting === "true") return;
	paperBody.dataset.handwriting = "true";
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

/** 头部微言轮播：机制复刻原版 AutoScroll（limh.me global-pjax.js）——滚完把首条 li
 * 移到末尾实现无限轮转，hover 暂停、移出恢复；节奏（4s/条 = 停留 3.2s + 滑动 0.8s）
 * 对齐迁移前 CSS 关键帧版的手感，比原版 300ms 更缓。头部在 Swup 容器之外，
 * 随 pagefindReady 初始化一次即可 */
function initHeaderTicker() {
	const ticker = document.querySelector("#header .text");
	const list = ticker?.querySelector("ul");
	if (!ticker || !list || list.children.length < 2) return;
	if (list.dataset.tickerReady === "true") return;
	list.dataset.tickerReady = "true";
	if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

	list.addEventListener("transitionend", (event) => {
		if (event.target !== list || event.propertyName !== "margin-top")
			return;
		list.style.transition = "none";
		list.style.marginTop = "0px";
		list.appendChild(list.firstElementChild as HTMLElement);
	});

	let timer = 0;
	const start = () => {
		if (timer) return;
		timer = window.setInterval(() => {
			list.style.transition = "margin-top 0.8s ease";
			list.style.marginTop = "-24px"; // 与 global.css 的 #header .text li 行高一致
		}, 4000);
	};
	ticker.addEventListener("mouseenter", () => {
		window.clearInterval(timer);
		timer = 0;
	});
	ticker.addEventListener("mouseleave", start);
	start();
}

/** @swup/astro 生命周期 hooks（页面切换后重初始化） */
function initSwupHooks() {
	document.addEventListener("astro:before-swap", () => {
		destroyFancybox();
	});
	document.addEventListener("astro:after-swap", () => {
		syncNavHighlight();
		initFancybox();
		initLqipFade();
		loadKatexCss();
		renderMermaid();
		initPaperHandwriting();
	});
	document.addEventListener("astro:page-load", () => {
		window.scrollTo({ top: 0 });
		// 触发自定义事件，供其他组件（搜索、幻灯片）监听
		document.dispatchEvent(
			new CustomEvent("colorful:page:loaded", {
				detail: { url: window.location.pathname },
			}),
		);
	});
}

/** 每次完整打开页面随机选择背景；Swup 切页时保留当前背景 */
function initRandomBackground() {
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
	} catch {
		// 背景配置解析失败时保留纯色页面背景
	}
}

export function pagefindReady() {
	initRandomBackground();
	syncNavHighlight();
	initBackToTop();
	initDblClickScroll();
	initMMenu();
	initHeaderTicker();
	initSpoiler();
	initLqipFade();
	initClickEffect();
	initCanvasBoomEffect();
	initVisibilityTitle();
	initCopyLink();
	initNewCommentShuffle();
	initPaginationJump();
	initSkillsDonutTooltip();
	initFancybox();
	loadKatexCss();
	renderMermaid();
	initPaperHandwriting();
	initSwupHooks();
}
