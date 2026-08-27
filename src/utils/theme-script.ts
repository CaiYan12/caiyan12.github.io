/**
 * 客户端主题脚本：对应原主题 js/global-pjax.js 的静态化版本
 * - 导航当前项高亮
 * - 返回顶部（双击页面任意位置回到顶部）
 * - 移动端全屏菜单
 * - Swup 生命周期 hooks：页面切换后重新初始化 Fancybox / 滚动复位
 */

import "@fancyapps/ui/dist/fancybox/fancybox.css";

declare global {
	interface Window {
		__siteData?: {
			totalPosts: number;
			totalViews: number;
			totalComments: number;
			totalDays: number;
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

/** 页面存在 KaTeX 公式时按需加载其样式 */
function loadKatexCss() {
	if (document.querySelector(".katex")) {
		import("katex/dist/katex.css").catch(() => {});
	}
}

/** 简单的 HTML 转义（用于填充客户端生成的 DOM） */
function escapeHtml(value: string): string {
	return String(value)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

/** 渲染 mermaid 图表（懒加载，仅在页面存在 pre.mermaid 时执行） */
async function renderMermaid() {
	const nodes = [
		...document.querySelectorAll<HTMLElement>("pre.mermaid"),
	];
	const pending = nodes.filter((n) => n.dataset.mermaidRendered !== "true");
	if (pending.length === 0) return;
	try {
		const { default: mermaid } = await import("mermaid");
		mermaid.initialize({
			startOnLoad: false,
			theme: "default",
			securityLevel: "strict",
		});
		await mermaid.run({ nodes: pending });
		pending.forEach((n) => (n.dataset.mermaidRendered = "true"));
	} catch {
		// mermaid 渲染失败不阻塞页面
	}
}

/** 渲染 GitHub 仓库卡片（::github{repo=...}，内容来自 GitHub API） */
async function renderGithubCards() {
	const cards = [
		...document.querySelectorAll<HTMLElement>(".github-card[data-repo]"),
	];
	await Promise.all(
		cards.map(async (card) => {
			if (card.dataset.rendered === "true") return;
			card.dataset.rendered = "true";
			const repo = card.dataset.repo || "";
			// owner 与仓库名分段编码，避免整体编码把 "/" 变成 %2F
			const repoPath = repo
				.split("/")
				.map(encodeURIComponent)
				.join("/");
			try {
				const res = await fetch(`https://api.github.com/repos/${repoPath}`);
				if (!res.ok) throw new Error(String(res.status));
				const data = await res.json();
				card.innerHTML = `
					<a class="github-card-link" href="${escapeHtml(data.html_url || "")}" target="_blank" rel="noopener noreferrer">
						<span class="github-card-name">${escapeHtml(data.full_name || repo)}</span>
						<span class="github-card-desc">${escapeHtml(data.description || "")}</span>
						<span class="github-card-meta">
							<span>★ ${data.stargazers_count ?? 0}</span>
							<span>⑂ ${data.forks_count ?? 0}</span>
							<span class="github-card-lang">${escapeHtml(data.language || "")}</span>
						</span>
					</a>`;
			} catch {
				card.innerHTML = `<a class="github-card-link github-card-error" href="https://github.com/${repoPath}" target="_blank" rel="noopener noreferrer">GitHub 仓库信息加载失败，点击前往 ${escapeHtml(repo)}</a>`;
			}
		}),
	);
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
			path === href ||
			(href !== "/" && path.startsWith(href.replace(/\/$/, "")));
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
	const closeButton = document.getElementById("close-nav");
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
	closeButton?.addEventListener("click", closeMenu);
	menu.addEventListener("click", (e) => {
		if ((e.target as HTMLElement).closest("a")) closeMenu();
	});
}

/** @swup/astro 生命周期 hooks（页面切换后重初始化） */
function initSwupHooks() {
	document.addEventListener("astro:before-swap", () => {
		destroyFancybox();
	});
	document.addEventListener("astro:after-swap", () => {
		syncNavHighlight();
		initFancybox();
		loadKatexCss();
		renderMermaid();
		renderGithubCards();
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
	initSpoiler();
	initFancybox();
	loadKatexCss();
	renderMermaid();
	renderGithubCards();
	initSwupHooks();
}
