/**
 * /books/archive/ 书库交互（handoff §3.2/§10）：
 * 六字段即时搜索（160ms debounce）× 标签筛选叠加 × 书架/列表双视图
 * × 每页 12 载入更多 × URL query（?q=/?tag=）读写。
 * swup 协议：顶层 init + astro:page-load 重跑 + main dataset 守卫；
 * document 级「/」快捷键只在模块顶层注册一次。
 */

import { searchBooks } from "../lib/search";
import type { Book } from "../types";
import { bookCardHTML, listRowHTML, tagPillHTML } from "../lib/render";
import { bindCoverFallback, prefersReducedMotion, qs } from "./shared";

const PAGE_SIZE = 12;

interface ArchiveState {
	q: string;
	tag: string | null;
	view: "grid" | "list";
	shown: number;
}

function initArchive(): void {
	const main = qs("#nb-books-main");
	if (!main || main.dataset.nbInit) return;
	const dataEl = qs<HTMLScriptElement>("#nb-books-data");
	if (!dataEl) return;
	main.dataset.nbInit = "1";
	bindCoverFallback();

	let all: Book[];
	try {
		all = JSON.parse(dataEl.textContent ?? "[]") as Book[];
	} catch {
		return;
	}

	const searchInput = qs<HTMLInputElement>("#nb-search-input");
	const grid = qs<HTMLElement>("#nb-archive-grid");
	const list = qs<HTMLElement>("#nb-archive-list");
	const resultsWrap = qs<HTMLElement>("#nb-results");
	if (!searchInput || !grid || !list || !resultsWrap) return;

	const state: ArchiveState = { q: "", tag: null, view: "grid", shown: PAGE_SIZE };

	/* ---------- URL query ---------- */

	function syncUrl(): void {
		const params = new URLSearchParams();
		if (state.tag) params.set("tag", state.tag);
		if (state.q) params.set("q", state.q);
		const qsStr = params.toString();
		history.replaceState(null, "", qsStr ? `?${qsStr}` : location.pathname);
	}

	/* ---------- 渲染 ---------- */

	function renderTagFilter(): void {
		const wrap = qs<HTMLElement>("#nb-tag-filter");
		if (!wrap) return;
		const tagCounts = new Map<string, number>();
		for (const b of all) for (const t of b.tags) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
		const tags = Array.from(tagCounts.entries()).sort((a, z) => z[1] - a[1]).map(([t]) => t);
		wrap.innerHTML =
			tagPillHTML("全部", { variant: "button", on: state.tag === null }).replace('data-tag="全部"', 'data-tag=""') +
			tags.map((t) => tagPillHTML(t, { variant: "button", on: state.tag === t })).join("");
	}

	function render(): void {
		const filtered = searchBooks(all, state.q, state.tag);
		const visible = filtered.slice(0, state.shown);

		let line = `共 ${all.length} 本藏书`;
		if (filtered.length < all.length) line += ` · 符合条件 ${filtered.length} 本`;
		if (filtered.length > state.shown) line += `（显示前 ${state.shown} 本）`;
		const resultLine = qs<HTMLElement>("#nb-result-line");
		if (resultLine) resultLine.textContent = line;

		const isEmpty = filtered.length === 0;
		const empty = qs<HTMLElement>("#nb-empty-state");
		if (empty) empty.hidden = !isEmpty;
		grid!.hidden = isEmpty || state.view !== "grid";
		list!.hidden = isEmpty || state.view !== "list";

		if (!isEmpty) {
			const html = visible.map((b) => (state.view === "grid" ? bookCardHTML(b) : listRowHTML(b))).join("");
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
	searchInput.addEventListener("input", () => {
		window.clearTimeout(debounceTimer ?? undefined);
		debounceTimer = window.setTimeout(() => {
			state.q = searchInput.value.trim();
			applyChange();
		}, 160);
	});

	qs<HTMLElement>("#nb-tag-filter")?.addEventListener("click", (e) => {
		const btn = (e.target as HTMLElement).closest("button[data-tag]");
		if (!btn) return;
		const tag = btn.getAttribute("data-tag") || null;
		state.tag = tag && tag !== "" ? tag : null;
		applyChange();
	});

	const VT_BASE = "cursor-pointer border-0 px-3.5 py-[9px] text-[13px] transition-colors duration-150";
	const vtClass = (on: boolean) =>
		on ? `${VT_BASE} bg-nb-ink text-nb-paper` : `${VT_BASE} bg-nb-surface text-nb-ink-soft hover:text-nb-ink`;

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
	if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target.isContentEditable) return;
	e.preventDefault();
	input.focus();
});

initArchive();
document.addEventListener("astro:page-load", initArchive);
