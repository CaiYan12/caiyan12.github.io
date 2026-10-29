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
 * newcomment-shuffle、点击词 click-effect、Canvas 粒子 canvas-boom、动态标题
 * visibility-title、LQIP 渐显 lqip-fade、邮箱保护 protected-email、站内提示触发
 * toast-trigger），本文件只保留**装配表**、**生命周期声明**与 3 个 page-load 辅助——全部功能块的家谱与
 * 两条生命周期（初始装载 / swup after-swap 重跑）都由文件尾的 runtimeTable
 * 驱动，新增功能先加表行，勿在别处自行初始化；换页前后的钩子动作另由同处的
 * runtimeHooks 声明。
 */

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
import { loadKatexCss } from "./runtime/katex";
import { renderMermaid } from "./runtime/mermaid";
import { initRandomBackground } from "./runtime/random-background";
import { initMMenu } from "./runtime/mobile-menu";
import { initHeaderTicker } from "./runtime/header-ticker";
import { initPaginationJump } from "./runtime/pagination-jump";
import { initSkillsDonutTooltip } from "./runtime/skills-donut-tooltip";
import { initPaperHandwriting } from "./runtime/paper-handwriting";
import { initNewCommentShuffle } from "./runtime/newcomment-shuffle";
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
	// lqip → katex → mermaid → 稿纸 → 文章目录）。swap 序与装配表序不同——旧实现两处顺序本就
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
