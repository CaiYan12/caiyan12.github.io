/**
 * 客户端主题脚本：对应原主题 js/global-pjax.js 的静态化版本
 * - 导航当前项高亮
 * - 返回顶部（双击页面任意位置回到顶部）
 * - 移动端全屏菜单
 * - Swup 生命周期 hooks：页面切换后重新初始化 Fancybox / 滚动复位
 */

declare global {
	interface Window {
		__siteData?: {
			totalPosts: number;
			totalViews: number;
			totalComments: number;
			totalDays: number;
		};
		Swup?: unknown;
		Fancybox?: {
			bind: (selector: string, opts?: unknown) => void;
			unbind: (selector?: string) => void;
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
		const { Fancybox } = await import("@fancyapps/ui");
		window.Fancybox = Fancybox;
		Fancybox.bind("[data-fancybox]", {});
		// 正文图片（排除已绑定的）
		const contentImgs = document.querySelectorAll(
			".post-context img:not([data-fancybox])",
		);
		contentImgs.forEach((img) => {
			const src = img.getAttribute("src") || "";
			if (src && !src.includes("data:")) {
				img.setAttribute("data-fancybox", "post-gallery");
			}
		});
		Fancybox.bind("[data-fancybox='post-gallery']", {});
	} catch {
		// 灯箱加载失败不阻塞页面
	}
}

/** 清理 Fancybox 绑定（页面切换前） */
function destroyFancybox() {
	window.Fancybox?.unbind();
}

/** 页面存在 KaTeX 公式时按需加载其样式 */
function loadKatexCss() {
	if (document.querySelector(".katex")) {
		import("katex/dist/katex.css").catch(() => {});
	}
}

/** 导航高亮：根据当前路径标记 current */
function syncNavHighlight() {
	const path = window.location.pathname;
	document.querySelectorAll("#nav a").forEach((a) => {
		const href = a.getAttribute("href") || "/";
		const parent = a.closest("li");
		if (!parent) return;
		// 首页精确匹配；其他路径前缀匹配（含尾斜杠）
		const match =
			path === href ||
			(href !== "/" && path.startsWith(href.replace(/\/$/, "")));
		parent.classList.toggle("current", !!match);
	});
	document.querySelectorAll("#mmenu a").forEach((a) => {
		const href = a.getAttribute("href") || "/";
		const parent = a.closest("li");
		if (!parent) return;
		const match =
			path === href || (href !== "/" && path.startsWith(href.replace(/\/$/, "")));
		parent.classList.toggle("current", !!match);
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
		window.scrollTo({ top: 0, behavior: "smooth" });
	});
	toggle();
}

/** 双击页面任意位置回到顶部（原主题交互） */
function initDblClickScroll() {
	document.addEventListener("dblclick", (e) => {
		if ((e.target as HTMLElement).closest("a, button, input")) return;
		window.scrollTo({ top: 0, behavior: "smooth" });
	});
}

/** 移动端全屏菜单 */
function initMMenu() {
	const openBtn = document.getElementById("open-nav");
	const menu = document.getElementById("mmenu");
	const close = document.getElementById("mmenu-close");
	if (!openBtn || !menu || !close) return;
	openBtn.addEventListener("click", () => {
		menu.classList.add("open");
		close.classList.add("open");
		document.body.style.overflow = "hidden";
	});
	const closeMenu = () => {
		menu.classList.remove("open");
		close.classList.remove("open");
		document.body.style.overflow = "";
	};
	close.addEventListener("click", closeMenu);
	menu.addEventListener("click", (e) => {
		if ((e.target as HTMLElement).closest("a")) closeMenu();
	});
}

/** Swup 生命周期 hooks（页面切换后重初始化） */
function initSwupHooks() {
	if (!window.Swup) return;
	const swup = window.Swup as {
		on: (event: string, handler: () => void) => void;
	};
	swup.on("visit:start", () => {
		destroyFancybox();
	});
	swup.on("content:replace", () => {
		syncNavHighlight();
		initFancybox();
		loadKatexCss();
	});
	swup.on("page:view", () => {
		window.scrollTo({ top: 0 });
		// 触发自定义事件，供其他组件（搜索、幻灯片）监听
		document.dispatchEvent(
			new CustomEvent("colorful:page:loaded", { detail: { url: window.location.pathname } }),
		);
	});
}

/** 读取 body 上的站点统计数据并挂载到 window */
function loadSiteStats() {
	const statsAttr = document.body?.dataset.siteStats;
	if (statsAttr) {
		try {
			window.__siteData = JSON.parse(statsAttr);
		} catch {
			// 解析失败忽略
		}
	}
}

export function pagefindReady() {
	loadSiteStats();
	syncNavHighlight();
	initBackToTop();
	initDblClickScroll();
	initMMenu();
	initFancybox();
	loadKatexCss();
	// Swup 由 @swup/astro 注入，等其 ready 后再注册 hooks
	if (window.Swup) {
		initSwupHooks();
	} else {
		window.addEventListener("swup:ready", () => initSwupHooks());
	}
}
