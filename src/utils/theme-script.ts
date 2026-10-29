/**
 * 主站运行时装配（对应原主题 js/global-pjax.js 的静态化版本）。
 *
 * 功能块自结构加深 T6/T7 起逐块迁往 `src/utils/runtime/`（已迁：语录条 quote-band、
 * 液态玻璃 liquid-glass、灯箱 fancybox），本文件保留**尚未迁移的块**与**装配表**——全部功能块的
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

declare global {
	interface Window {
		swup?: {
			navigate: (url: string) => void;
		};
	}
}

let copyLinkBound = false;

let protectedEmailBound = false;

let anchorSmoothScrollBound = false;

let skillsDonutTooltipBound = false;

let newCommentShuffleBound = false;
let paginationJumpBound = false;
let toastTriggerBound = false;
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

/** 通用提示触发器：凡带 data-site-toast 的元素被点击即弹站内提示
 *  （事件委托，Swup 切页后依然生效）。用于「不可执行但需要解释」的灰态控件，
 *  如 /projects/ 里无公开仓库的「查看源码」 */
function initToastTrigger() {
	if (toastTriggerBound) return;
	toastTriggerBound = true;
	document.addEventListener("click", (event) => {
		const target = event.target;
		if (!(target instanceof Element)) return;
		const trigger = target.closest<HTMLElement>("[data-site-toast]");
		if (!trigger) return;
		const message = trigger.dataset.siteToast?.trim();
		if (message) showSiteToast(message);
	});
}

/** 页面存在 KaTeX 公式时按需加载其样式 */
function loadKatexCss() {
	if (document.querySelector(".katex")) {
		import("katex/dist/katex.css").catch((error) => {
			// 样式加载失败不阻塞页面；公式仍以原始文本可读
			console.warn("[katex] css load failed:", error);
		});
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
				/* 换行终态强制（2026-10-02）：addHtmlSpan 对 label 先设 nowrap，再靠
				   「测量宽度 === wrappingWidth」的浮点精确相等来切换 break-spaces——
				   真实浏览器（Edge/Chrome 实测）的 table-cell 测量回不到恰好 200，
				   等式永远失守，长中文标签被 foreignObject 单行裁切（无头 Chromium
				   反而能过，是它掩盖了线上缺陷）。这里直接把 div 拔到换行终态：
				   display:table 收缩适配 + mermaid 自己写的内联 max-width 兜宽度，
				   测量即换行形态，节点盒按真实多行尺寸生成，不再依赖那个等式。 */
				foreignObject div {
					display: table !important;
					white-space: break-spaces !important;
				}
			`,
			securityLevel: "strict",
		});
		// 字体就绪后才允许测量：mermaid 的 label 默认 white-space:nowrap，只有测量宽度
		// 恰好等于 wrappingWidth（200px）才切换成 break-spaces 换行（addHtmlSpan 源码行为）。
		// webfont 是按 unicode-range 分片的可变字体，图表文本进 DOM 才触发对应子集加载；
		// 若在子集就绪前测量，字体换上后文字比按旧度量定好的节点盒宽，foreignObject
		// 把溢出裁掉——线上长中文标签实测被单行截断。fonts.load 按本次 label 文本精确
		// 触发所需子集，fonts.ready 兜底等在途加载；失败不阻塞渲染（走外层 catch 的降级）。
		const sampleText = pending.map((n) => n.textContent ?? "").join("");
		const families = bodyFont
			.split(",")
			.map((f) => f.trim().replace(/^["']+|["']+$/g, ""))
			.filter(Boolean);
		// 3s 竞速上限：字体正常亚秒就绪；病态网络下宁可退回旧的测量行为
		// （可能轻微裁切）也不能让图表长时间不渲染——与下方 catch 的降级哲学一致
		await Promise.race([
			Promise.allSettled([
				document.fonts.load(
					`16px ${families.map((f) => `"${f}"`).join(", ")}`,
					sampleText,
				),
				document.fonts.ready,
			]),
			new Promise((r) => setTimeout(r, 3000)),
		]);
		await mermaid.run({ nodes: pending });
		pending.forEach((n) => (n.dataset.mermaidRendered = "true"));
	} catch (error) {
		// 渲染失败不阻塞页面，原始代码块仍可阅读；warn 供线上排错
		console.warn("[mermaid] render failed:", error);
	}
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
			// 倒序遍历移除越界粒子：正序 forEach 中 splice 会使后续元素左移被跳过
			for (let index = this.circles.length - 1; index >= 0; index -= 1) {
				const circle = this.circles[index];
				if (
					circle.position.x > this.area.width ||
					circle.position.y > this.area.height
				) {
					this.circles.splice(index, 1);
					continue;
				}
				circle.move();
			}
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
		// 倒序遍历移除已停止的爆炸，避免正序 splice 跳过元素
		for (let index = booms.length - 1; index >= 0; index -= 1) {
			const boom = booms[index];
			if (boom.stop) {
				booms.splice(index, 1);
				continue;
			}
			boom.move();
			boom.draw();
		}
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
	const HIDDEN_TITLE = "别走啊...(っ°Д°;)っ";
	const GOODBYE_TITLE = "算了，你走吧！";
	let timer: ReturnType<typeof setTimeout> | undefined;
	let originalTitle = "";
	document.addEventListener("visibilitychange", () => {
		if (document.visibilityState === "hidden") {
			clearTimeout(timer);
			// 快速 hide→show→hide 时当前标题可能还是告别语，此时不能捕获，
			// 否则真实标题被替代语永久覆盖；只在标题为真实内容时更新
			if (
				document.title !== HIDDEN_TITLE &&
				document.title !== GOODBYE_TITLE
			) {
				originalTitle = document.title;
			}
			document.title = HIDDEN_TITLE;
		} else {
			document.title = GOODBYE_TITLE;
			timer = setTimeout(() => {
				document.title = originalTitle;
			}, 2000);
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
 * 邮箱保护链接（rehype-email-protection 配套）：点击时按 data-email-method 解码
 * data-encoded-email 并唤起邮件客户端。事件委托，Swup 切页后依然生效；
 * 取代原内联 onclick（与 CSP script-src 兼容）。
 */
function initProtectedEmail() {
	if (protectedEmailBound) return;
	protectedEmailBound = true;
	document.addEventListener("click", (e) => {
		const target = e.target as HTMLElement | null;
		const link = target?.closest?.("a[data-encoded-email]");
		if (!link) return;
		e.preventDefault();
		const encoded = link.getAttribute("data-encoded-email") || "";
		const method = link.getAttribute("data-email-method") || "base64";
		let email = "";
		if (method === "rot13") {
			email = encoded.replace(/[a-zA-Z]/g, (ch) => {
				const start = ch <= "Z" ? 65 : 97;
				return String.fromCharCode(
					((ch.charCodeAt(0) - start + 13) % 26) + start,
				);
			});
		} else {
			try {
				email = atob(encoded);
			} catch {
				console.warn("[email] invalid encoded payload");
				return;
			}
		}
		window.location.href = `mailto:${email}`;
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

/** 移动端全屏菜单 */
function initMMenu() {
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
	} catch (error) {
		// 背景配置解析失败时保留纯色页面背景；warn 供排错
		console.warn("[background] config parse failed:", error);
	}
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
