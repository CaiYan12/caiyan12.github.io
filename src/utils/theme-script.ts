/**
 * 主站运行时装配（对应原主题 js/global-pjax.js 的静态化版本）。
 *
 * 功能块自结构加深 T6/T7 起逐块迁往 `src/utils/runtime/`（已迁：语录条 quote-band、
 * 液态玻璃 liquid-glass、文章目录 article-toc、导航判定 nav-state、减少动效
 * reduced-motion、KaTeX 样式 katex、Mermaid 图表 mermaid、随机背景 random-background、
 * 移动菜单 mobile-menu、头部轮播 header-ticker、分页跳转 pagination-jump、灯箱
 * fancybox、导航高亮 nav-highlight、阅读进度 reading-progress、锚点平滑滚动
 * anchor-smooth-scroll、复制链接 copy-link、返回顶部 back-to-top、双击回顶
 * dblclick-scroll、稿纸 paper-handwriting、技能环 skills-donut-tooltip、评论换一批
 * newcomment-shuffle），本文件保留**尚未迁移的块**与**装配表**——全部功能块的家谱与
 * 两条生命周期（初始装载 / swup after-swap 重跑）都由文件尾的 runtimeTable
 * 驱动，新增功能先加表行，勿在别处自行初始化；换页前后的钩子动作另由同处的
 * runtimeHooks 声明。
 */

import { showSiteToast } from "./site-toast";
import { destroyFancybox, initFancybox } from "./runtime/fancybox";
import { initQuoteBand } from "./runtime/quote-band";
import { initLiquidGlass } from "./runtime/liquid-glass";
import { initArticleToc } from "./runtime/article-toc";
import { syncNavHighlight } from "./runtime/nav-highlight";
import {
	initReadingProgress,
	scheduleReadingProgressUpdate,
} from "./runtime/reading-progress";
import { initAnchorSmoothScroll } from "./runtime/anchor-smooth-scroll";
import { initCopyLink } from "./runtime/copy-link";
import { initBackToTop } from "./runtime/back-to-top";
import { initDblClickScroll } from "./runtime/dblclick-scroll";
import { prefersReducedMotion } from "./runtime/reduced-motion";
import { loadKatexCss } from "./runtime/katex";
import { renderMermaid } from "./runtime/mermaid";
import { initRandomBackground } from "./runtime/random-background";
import { initMMenu } from "./runtime/mobile-menu";
import { initHeaderTicker } from "./runtime/header-ticker";
import { initPaginationJump } from "./runtime/pagination-jump";
import { initSkillsDonutTooltip } from "./runtime/skills-donut-tooltip";
import { initPaperHandwriting } from "./runtime/paper-handwriting";
import { initNewCommentShuffle } from "./runtime/newcomment-shuffle";

declare global {
	interface Window {
		swup?: {
			navigate: (url: string) => void;
		};
	}
}

let protectedEmailBound = false;

let toastTriggerBound = false;

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
