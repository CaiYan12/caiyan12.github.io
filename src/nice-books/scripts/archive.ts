/**
 * /books/archive/ 书库交互（handoff §3.2/§10）：
 * 六字段即时搜索（160ms debounce）× 标签筛选叠加 × 书架/列表双视图
 * × 每页 12 载入更多 × URL query（?q=/?tag=）读写。
 * 由 scripts/main.ts 统一调度：initArchive 自查元素早退，astro:page-load 重跑；
 * 「/」快捷键为 document 级监听（模块顶层注册一次，handler 内自查元素）。
 */

import { searchBooks } from "../lib/search";
import type { Book } from "../types";
import { bookCardHTML, listRowHTML, tagPillHTML } from "../lib/render";
import { prefersReducedMotion, qs } from "./shared";

const PAGE_SIZE = 12;

interface ArchiveState {
	q: string;
	tag: string | null;
	view: "grid" | "list";
	shown: number;
}

export async function initArchive(): Promise<void> {
	const main = qs("#nb-books-main");
	if (!main || main.dataset.nbInit) return;
	// 先确认本页元素存在再打标记：main 与首页同 ID，
	// swup 切页后本函数在其他 books 页面触发时不得误打标记（否则封锁对方 init）
	const searchInput = qs<HTMLInputElement>("#nb-search-input");
	const grid = qs<HTMLElement>("#nb-archive-grid");
	const list = qs<HTMLElement>("#nb-archive-list");
	const resultsWrap = qs<HTMLElement>("#nb-results");
	if (!searchInput || !grid || !list || !resultsWrap) return;
	main.dataset.nbInit = "1"; // fetch 期间阻止 astro:page-load 并发重入

	// 数据源为独立静态端点：swup 替换 main 会丢失 DOM 内嵌 JSON（实测），fetch 全路径健壮
	let all: Book[];
	try {
		const res = await fetch("/books/data.json");
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		all = (await res.json()) as Book[];
		if (!Array.isArray(all) || all.length === 0) throw new Error("空数据");
	} catch (error) {
		console.warn("[nice-books] 书库数据加载失败：", error);
		return;
	}

	const state: ArchiveState = {
		q: "",
		tag: null,
		view: "grid",
		shown: PAGE_SIZE,
	};

	/* ---------- URL query ---------- */

	function syncUrl(): void {
		const params = new URLSearchParams();
		if (state.tag) params.set("tag", state.tag);
		if (state.q) params.set("q", state.q);
		const qsStr = params.toString();
		// 保留 history.state：swup 依赖自己写入的 state 处理 popstate，置 null 会断裂后退链
		history.replaceState(
			history.state,
			"",
			qsStr ? `?${qsStr}` : location.pathname,
		);
	}

	/* ---------- 渲染 ---------- */

	function renderTagFilter(): void {
		const wrap = qs<HTMLElement>("#nb-tag-filter");
		if (!wrap) return;
		const tagCounts = new Map<string, number>();
		for (const b of all)
			for (const t of b.tags)
				tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
		const tags = Array.from(tagCounts.entries())
			.sort((a, z) => z[1] - a[1])
			.map(([t]) => t);
		wrap.innerHTML =
			tagPillHTML("全部", {
				variant: "button",
				on: state.tag === null,
			}).replace('data-tag="全部"', 'data-tag=""') +
			tags
				.map((t) =>
					tagPillHTML(t, { variant: "button", on: state.tag === t }),
				)
				.join("");
	}

	function render(): void {
		const filtered = searchBooks(all, state.q, state.tag);
		const visible = filtered.slice(0, state.shown);

		let line = `共 ${all.length} 本藏书`;
		if (filtered.length < all.length)
			line += ` · 符合条件 ${filtered.length} 本`;
		if (filtered.length > state.shown)
			line += `（显示前 ${state.shown} 本）`;
		const resultLine = qs<HTMLElement>("#nb-result-line");
		if (resultLine) resultLine.textContent = line;

		const isEmpty = filtered.length === 0;
		const empty = qs<HTMLElement>("#nb-empty-state");
		if (empty) empty.hidden = !isEmpty;
		grid!.hidden = isEmpty || state.view !== "grid";
		list!.hidden = isEmpty || state.view !== "list";

		if (!isEmpty) {
			const html = visible
				.map((b) =>
					state.view === "grid" ? bookCardHTML(b) : listRowHTML(b),
				)
				.join("");
			if (state.view === "grid") {
				grid!.innerHTML = html;
				list!.innerHTML = "";
			} else {
				list!.innerHTML = html;
				grid!.innerHTML = "";
			}
		}

		const moreWrap = qs<HTMLButtonElement>("#nb-btn-more");
		const theEnd = qs<HTMLElement>("#nb-the-end");
		if (moreWrap && theEnd) {
			if (filtered.length > state.shown) {
				moreWrap.hidden = false;
				moreWrap.textContent = `载入更多（还有 ${filtered.length - state.shown} 本）`;
				theEnd.hidden = true;
			} else {
				moreWrap.hidden = true;
				theEnd.hidden = filtered.length === 0;
				theEnd.textContent = `已经到底啦 · 共 ${filtered.length} 本 \u2726`;
			}
		}

		renderTagFilter();
	}

	function reflowAnim(): void {
		if (prefersReducedMotion()) return;
		resultsWrap!.classList.remove("nb-fade-swap");
		void resultsWrap!.offsetWidth; // 重触发动画
		resultsWrap!.classList.add("nb-fade-swap");
	}

	function resetPaging(): void {
		state.shown = PAGE_SIZE;
	}

	function applyChange(): void {
		resetPaging();
		render();
		reflowAnim();
		syncUrl();
	}

	/* ---------- 事件 ---------- */

	let debounceTimer: number | null = null;
	const flushSearch = () => {
		window.clearTimeout(debounceTimer ?? undefined);
		state.q = searchInput.value.trim();
		applyChange();
	};
	searchInput.addEventListener("input", () => {
		window.clearTimeout(debounceTimer ?? undefined);
		debounceTimer = window.setTimeout(() => {
			state.q = searchInput.value.trim();
			applyChange();
		}, 160);
	});
	// 显式搜索按钮 / 回车：立即过滤（跳过 debounce 等待）
	qs("#nb-search-btn")?.addEventListener("click", () => {
		flushSearch();
		searchInput.blur();
	});
	searchInput.addEventListener("keydown", (e) => {
		if (e.key === "Enter") flushSearch();
	});

	qs<HTMLElement>("#nb-tag-filter")?.addEventListener("click", (e) => {
		const btn = (e.target as HTMLElement).closest("button[data-tag]");
		if (!btn) return;
		const tag = btn.getAttribute("data-tag") || null;
		state.tag = tag && tag !== "" ? tag : null;
		applyChange();
	});

	const VT_BASE =
		"cursor-pointer border-0 px-3.5 py-[9px] text-[13px] transition-colors duration-150";
	const vtClass = (on: boolean) =>
		on
			? `${VT_BASE} bg-nb-ink text-nb-paper`
			: `${VT_BASE} bg-nb-surface text-nb-ink-soft hover:text-nb-ink`;

	function setView(view: "grid" | "list"): void {
		state.view = view;
		for (const v of ["grid", "list"] as const) {
			const btn = qs<HTMLButtonElement>(`#nb-view-${v}`);
			// Tailwind utilities 写在标记里，状态切换用 className 全量替换（is-* 覆盖不了 utilities 层）
			if (btn) btn.className = vtClass(state.view === v);
			btn?.setAttribute("aria-pressed", String(state.view === v));
		}
		applyChange();
	}
	qs("#nb-view-grid")?.addEventListener("click", () => setView("grid"));
	qs("#nb-view-list")?.addEventListener("click", () => setView("list"));

	qs("#nb-btn-more")?.addEventListener("click", () => {
		state.shown += PAGE_SIZE;
		render();
	});

	qs("#nb-btn-clear")?.addEventListener("click", () => {
		state.q = "";
		state.tag = null;
		searchInput.value = "";
		applyChange();
		searchInput.focus();
	});

	// 初始化：支持 ?tag= / ?q= 直达（handoff §0.3）
	const params = new URLSearchParams(window.location.search);
	const urlTag = params.get("tag");
	const urlQ = params.get("q");
	if (urlTag) state.tag = urlTag;
	if (urlQ) {
		state.q = urlQ;
		searchInput.value = urlQ;
	}
	render();
}

/* 「/」快捷键：document 级监听只在模块顶层注册一次（swup 协议） */
document.addEventListener("keydown", (e) => {
	if (e.key !== "/") return;
	const input = document.querySelector<HTMLInputElement>("#nb-search-input");
	if (!input) return; // 非 archive 页
	const target = e.target as HTMLElement;
	if (
		target instanceof HTMLInputElement ||
		target instanceof HTMLTextAreaElement ||
		target.isContentEditable
	)
		return;
	e.preventDefault();
	input.focus();
});
