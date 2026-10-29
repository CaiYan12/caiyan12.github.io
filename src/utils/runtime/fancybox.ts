/**
 * 灯箱（Fancybox）运行时模块：懒加载库、给文内图打灯箱标记、补工具栏按钮、
 * 把「下载」改成新标签页打开、关闭时归还焦点并执行待处理的定位滚动。
 *
 * 两块生命周期都由 theme-script.ts 的装配表声明：初始化走 `{ init: initFancybox, swap: 3 }`，
 * 换页前的清理走 `runtimeHooks.beforeSwap` 对 `destroyFancybox` 的引用——本模块不自听
 * `astro:*` 事件，也不在 import 时碰 DOM（唯一的顶层副作用是下方的样式表导入）。
 */

import "@fancyapps/ui/dist/fancybox/fancybox.css";
import { prefersReducedMotion } from "./reduced-motion";

declare global {
	interface Window {
		Fancybox?: {
			bind: (selector: string, opts?: unknown) => void;
			unbind: (selector: string) => void;
			close: () => void;
			destroy: () => void;
			getSlide: () =>
				| {
						src?: string;
						downloadSrc?: string;
						triggerEl?: HTMLElement;
				  }
				| undefined;
		};
	}
}

/** 灯箱右上角「下载」按钮：改为在新标签页打开图片原文件 */
let fancyboxDownloadBound = false;

function openImageOnDownloadClick(event: MouseEvent) {
	const target = event.target as HTMLElement | null;
	if (!target?.closest?.("[data-carousel-download]")) return;
	const src = window.Fancybox?.getSlide?.()?.src;
	if (!src) return;
	// 捕获阶段拦截：Carousel 自带的实现是 a[download].click()，会直接落盘保存
	event.preventDefault();
	event.stopPropagation();
	window.open(src, "_blank", "noopener");
}

const FANCY_RIGHT_BASE = [
	"download",
	"toggleFull",
	"fullscreen",
	"thumbs",
	"close",
];

/** 灯箱打开期间 body 被 overflow:hidden 锁住，滚动只能排在关闭之后 */
let pendingLocateEl: HTMLElement | null = null;

function locateToArticle() {
	pendingLocateEl = window.Fancybox?.getSlide?.()?.triggerEl ?? null;
	window.Fancybox?.close();
}

const LOCATE_ITEM = {
	// <svg> 保持裸标签：工具栏渲染时会补上 viewBox/width/height
	tpl: '<button data-fancybox-locate class="f-button" title="{{LOCATE_TO_ARTICLE}}" aria-label="{{LOCATE_TO_ARTICLE}}"><svg><circle cx="12" cy="12" r="7" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg></button>',
	click: () => locateToArticle(),
};

type FancyboxInstance = {
	getSlide: () => { triggerEl?: HTMLElement } | undefined;
	getOptions: () => { triggerEl?: HTMLElement };
};

/** 关闭时归还焦点并执行待处理的定位滚动（库默认还会把页面滚到图片位置，已用 placeFocusBack 关掉） */
function onFancyboxDestroy(instance: FancyboxInstance) {
	const trigger =
		instance.getSlide()?.triggerEl ?? instance.getOptions()?.triggerEl;
	if (trigger?.isConnected && !trigger.closest("[inert]")) {
		try {
			trigger.focus({ preventScroll: true });
		} catch {
			/* 不可聚焦的元素（正文 <img>）在此为空操作，无需降级 */
		}
	}
	const target = pendingLocateEl;
	if (!target) return;
	pendingLocateEl = null;
	if (!target.isConnected) return;
	requestAnimationFrame(() =>
		target.scrollIntoView({
			behavior: prefersReducedMotion() ? "instant" : "smooth",
			block: "center",
		}),
	);
}

/** 初始化当前页面的图片灯箱（懒加载 Fancybox） */
export async function initFancybox() {
	const imgs = document.querySelectorAll(
		".post-context img, .photo-grid img, .page .post-context img",
	);
	if (imgs.length === 0) return;
	try {
		const [{ Fancybox }, { zh_CN }] = await Promise.all([
			import("@fancyapps/ui/dist/fancybox/"),
			import("@fancyapps/ui/dist/fancybox/l10n/zh_CN.js"),
		]);
		// 异步 import 期间可能已发生 Swup 切页（初始调用与 after-swap 重入竞态），
		// 先解绑旧委托再绑定，保证最终只存在一份监听
		Fancybox.unbind("[data-fancybox]");
		window.Fancybox = Fancybox;
		// 正文图片（排除已绑定的）
		const contentImgs = document.querySelectorAll(
			".post-context img:not([data-fancybox])",
		);
		contentImgs.forEach((img) => {
			// 二维码、GitHub 仓库卡片头像、表格内的行内头像都是元件/装饰图标，不算文内图
			if (img.closest(".qrimg, .github-card, table")) return;
			const src = img.getAttribute("src") || "";
			if (src && !src.includes("data:")) {
				img.setAttribute("data-fancybox", "post-gallery");
				const caption = img.getAttribute("alt");
				if (caption) img.setAttribute("data-caption", caption);
			}
		});
		if (!fancyboxDownloadBound) {
			fancyboxDownloadBound = true;
			document.addEventListener("click", openImageOnDownloadClick, true);
		}
		Fancybox.bind(
			"[data-fancybox]",
			// 库在运行时以实例调用函数型选项（Z()），但 .d.ts 只声明了 Carousel 的对象形态
			{
				l10n: { ...zh_CN, LOCATE_TO_ARTICLE: "定位到文章位置" },
				placeFocusBack: false,
				on: { destroy: onFancyboxDestroy },
				Carousel: (instance: FancyboxInstance) => ({
					Toolbar: {
						items: { locate: LOCATE_ITEM },
						display: {
							left: ["counter"],
							right:
								instance
									.getOptions()
									.triggerEl?.getAttribute(
										"data-fancybox",
									) === "post-gallery"
									? [
											"download",
											"locate",
											...FANCY_RIGHT_BASE.slice(1),
										]
									: FANCY_RIGHT_BASE,
						},
					},
				}),
			} as unknown as Parameters<(typeof Fancybox)["bind"]>[1],
		);
	} catch (error) {
		// 灯箱加载失败不阻塞页面；生产保留 warn 供线上排错（esbuild pure 清理不涉及 warn）
		console.warn("[fancybox] load failed:", error);
	}
}

/** 清理 Fancybox 绑定（页面切换前，由 runtimeHooks.beforeSwap 引用） */
export function destroyFancybox() {
	pendingLocateEl = null;
	window.Fancybox?.unbind("[data-fancybox]");
	window.Fancybox?.close();
}
