/**
 * 同页锚点点击平滑滚动（站长 2026-10-15 需求；#118/T3 自 theme-script.ts 迁出的独立宿主）。
 *
 * 生命周期：装配表 `{ init: initAnchorSmoothScroll }`——只在首屏跑一次，不进 swap 序；
 * `anchorSmoothScrollBound` 旗标防重入。document 级捕获阶段委托绑一次，Swup 换页不重跑，
 * 新渲染的目录链接天然生效。无清理。
 *
 * 文章顶部目录与侧栏目录点击跳转原本是浏览器默认瞬移，这里补一段短促过渡：机制复用
 * 双击回顶的 `window.scrollTo({ behavior: "smooth" })`，不自绘动画。只接管「同页纯 hash 链接」：
 * - 跨页链接不碰（那是 swup 的领地，swup 侧 smoothScrolling 已为 false）；
 * - `href="#"`（占位链接）不碰；
 * - 目标 id 在当前文档不存在时不碰（照旧让浏览器走「无操作」的默认路径，不替它伪造 hash）；
 * - 修饰键/非左键（新标签页、下载意图等浏览器手势）不碰。
 * 接管后 hash 更新用 pushState 而非置 location.hash——后者会在平滑滚动进行中触发原生
 * 锚点跳转打断动画。浏览器原生 hash 高亮不动，滚到后由目录激活态（pickActiveIndex）自然点亮。
 *
 * 监听必须挂**捕获阶段**（capture: true），且接管时必须 **stopPropagation**：swup 对同页
 * hash 链接的处理**不检查 defaultPrevented**——它的链接点击委托在 document 气泡阶段注册
 * 且先于本模块装配，无论我们是否 preventDefault 都会执行：更新地址栏 hash 后走
 * `scroll:anchor` → `window.scrollTo(0, 目标)` 瞬时直达（本站 swup 集成
 * `smoothScrolling: false` ⇒ ScrollPlugin.animateScroll 全关，swup 4.9.2 dist 实证）。
 * 只 preventDefault 的话我们启动的 smooth 动画会被 swup 的同步瞬移当帧覆盖，用户看不到
 * 任何动画（生产产物实测：点击后首帧 scrollY 已在目标位）。所以必须在捕获阶段拿到事件后
 * stopPropagation，让 swup 的委托根本收不到这类点击——swup 对它做的事恰好就是我们要替换的
 * 瞬移跳转，拦截即替换，无副作用。跨页链接照旧放行给 swup。
 */
import { prefersReducedMotion } from "./reduced-motion";

let anchorSmoothScrollBound = false;

export function initAnchorSmoothScroll() {
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
