/**
 * /books/archive/ 书库交互：六字段即时搜索 × 标签筛选 × 双视图 × 载入更多。
 * 查询和动画均限定当前 main；Swup 替换前由共享清理器取消请求与动画。
 */

import { searchBooks } from "../lib/search";
import type { Book } from "../types";
import { bookCardHTML, listRowHTML, tagPillHTML } from "../lib/render";
import { prefersReducedMotion, qs, registerPageCleanup } from "./shared";

const PAGE_SIZE = 12;
const LOAD_STEP = 10;

interface ArchiveState {
	q: string;
	tag: string | null;
	view: "grid" | "list";
	shown: number;
}

function showArchiveError(
	main: HTMLElement,
	resultsWrap: HTMLElement,
	retry: () => void,
): void {
	let error = qs<HTMLElement>("[data-nb-archive-error]", main);
	if (!error) {
		error = document.createElement("div");
		error.dataset.nbArchiveError = "";
		error.className =
			"nb-archive-error border border-nb-border-strong bg-nb-surface p-6 text-center";
		error.innerHTML =
			'<p class="font-nb-serif text-[17px]">书库暂时打不开。</p>' +
			'<p class="mt-1.5 text-[13.5px] text-nb-muted">请检查网络后重试。</p>' +
			'<button type="button" data-nb-archive-retry class="mt-4 inline-flex cursor-pointer items-center rounded-[3px] border border-nb-ink bg-nb-ink px-4 py-2 text-[13.5px] text-nb-paper">重试</button>';
		resultsWrap.prepend(error);
	}
	error.hidden = false;
	const retryButton = qs<HTMLButtonElement>("[data-nb-archive-retry]", error);
	if (retryButton) {
		retryButton.onclick = () => {
			error!.hidden = true;
			retry();
		};
	}
}

export function initArchive(): void {
	const main = qs<HTMLElement>("#nb-books-main");
	if (!main || main.dataset.nbInit) return;
	const searchInput = qs<HTMLInputElement>("#nb-search-input", main);
	const gridCandidate = qs<HTMLElement>("#nb-archive-grid", main);
	const listCandidate = qs<HTMLElement>("#nb-archive-list", main);
	const resultsCandidate = qs<HTMLElement>("#nb-results", main);
	if (!searchInput || !gridCandidate || !listCandidate || !resultsCandidate)
		return;
	const grid = gridCandidate;
	const list = listCandidate;
	const resultsWrap = resultsCandidate;
	main.dataset.nbInit = "1";

	const abort = new AbortController();
	let disposed = false;
	let debounceTimer: number | null = null;
	let actionTimer: number | null = null;
	let resultAnimation: Animation | null = null;
	let restoreArchiveButtons: (() => void) | null = null;
	const unregister = registerPageCleanup(() => {
		disposed = true;
		abort.abort();
		if (debounceTimer !== null) window.clearTimeout(debounceTimer);
		if (actionTimer !== null) window.clearTimeout(actionTimer);
		resultAnimation?.cancel();
		resultAnimation = null;
		restoreArchiveButtons?.();
		restoreArchiveButtons = null;
		delete main.dataset.nbInit;
	});

	const fail = (error: unknown): void => {
		if (disposed || abort.signal.aborted) return;
		console.warn("[nice-books] 书库数据加载失败：", error);
		unregister();
		delete main.dataset.nbInit;
		showArchiveError(main, resultsWrap, () => initArchive());
	};

	void fetch("/books/data.json", { signal: abort.signal })
		.then(async (res) => {
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = (await res.json()) as Book[];
			if (!Array.isArray(data) || data.length === 0)
				throw new Error("空数据");
			return data;
		})
		.then((all) => {
			if (disposed || abort.signal.aborted) return;
			const state: ArchiveState = {
				q: "",
				tag: null,
				view: "grid",
				shown: PAGE_SIZE,
			};
			const tagFilter = qs<HTMLElement>("#nb-tag-filter", main);
			const resultLine = qs<HTMLElement>("#nb-result-line", main);
			const empty = qs<HTMLElement>("#nb-empty-state", main);
			const moreButton = qs<HTMLButtonElement>("#nb-btn-more", main);
			const collapseButton = qs<HTMLButtonElement>(
				"#nb-btn-collapse",
				main,
			);
			const theEnd = qs<HTMLElement>("#nb-the-end", main);
			let actionBusy = false;
			let moreIdleLabel = "载入更多";
			const collapseIdleLabel = "收起书库";

			function syncArchiveButtons(busy: boolean): void {
				const controls = [moreButton, collapseButton];
				for (const button of controls) {
					if (!button) continue;
					const label = qs<HTMLElement>(
						"[data-nb-archive-label]",
						button,
					);
					button.disabled = busy;
					button.classList.toggle("is-loading", busy);
					if (busy) {
						button.setAttribute("aria-busy", "true");
						if (label) label.textContent = "加载中…";
					} else {
						button.removeAttribute("aria-busy");
						if (label)
							label.textContent =
								button === moreButton
									? moreIdleLabel
									: collapseIdleLabel;
					}
				}
			}

			restoreArchiveButtons = () => {
				actionBusy = false;
				syncArchiveButtons(false);
			};

			function syncUrl(): void {
				const params = new URLSearchParams();
				if (state.tag) params.set("tag", state.tag);
				if (state.q) params.set("q", state.q);
				const query = params.toString();
				history.replaceState(
					history.state,
					"",
					query ? `?${query}` : location.pathname,
				);
			}

			function renderTagFilter(): void {
				if (!tagFilter) return;
				const tagCounts = new Map<string, number>();
				for (const book of all)
					for (const tag of book.tags)
						tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
				const tags = Array.from(tagCounts.entries())
					.sort((a, z) => z[1] - a[1])
					.map(([tag]) => tag);
				tagFilter.innerHTML =
					tagPillHTML("全部", {
						variant: "button",
						on: state.tag === null,
					}).replace('data-tag="全部"', 'data-tag=""') +
					tags
						.map((tag) =>
							tagPillHTML(tag, {
								variant: "button",
								on: state.tag === tag,
							}),
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
				if (resultLine) resultLine.textContent = line;
				const isEmpty = filtered.length === 0;
				if (empty) empty.hidden = !isEmpty;
				grid.hidden = isEmpty || state.view !== "grid";
				list.hidden = isEmpty || state.view !== "list";
				if (!isEmpty) {
					const html = visible
						.map((book) =>
							state.view === "grid"
								? bookCardHTML(book)
								: listRowHTML(book),
						)
						.join("");
					if (state.view === "grid") {
						grid.innerHTML = html;
						list.innerHTML = "";
					} else {
						list.innerHTML = html;
						grid.innerHTML = "";
					}
				}
				const hasMore = filtered.length > state.shown;
				const canCollapse =
					filtered.length > PAGE_SIZE && !hasMore && !isEmpty;
				moreIdleLabel = hasMore
					? `载入更多（还有 ${filtered.length - state.shown} 本）`
					: "载入更多";
				if (moreButton && collapseButton && theEnd) {
					if (hasMore) {
						moreButton.hidden = false;
						collapseButton.hidden = true;
						theEnd.hidden = true;
					} else {
						moreButton.hidden = true;
						collapseButton.hidden = !canCollapse;
						theEnd.hidden = filtered.length === 0;
						theEnd.textContent = `已经到底啦 · 共 ${filtered.length} 本 \u2726`;
					}
				}
				renderTagFilter();
				if (!actionBusy) syncArchiveButtons(false);
			}

			function runArchiveAction(
				task: () => void,
				trigger: HTMLButtonElement,
				focusAfter: () => HTMLButtonElement | null,
			): void {
				if (actionBusy || disposed || abort.signal.aborted) return;
				const restoreFocus = document.activeElement === trigger;
				const previousShown = state.shown;
				actionBusy = true;
				syncArchiveButtons(true);
				actionTimer = window.setTimeout(() => {
					actionTimer = null;
					if (disposed || abort.signal.aborted) {
						actionBusy = false;
						syncArchiveButtons(false);
						return;
					}
					try {
						task();
						animateResults();
					} catch (error) {
						state.shown = previousShown;
						try {
							render();
						} catch {
							/* 保留当前 DOM，避免错误恢复再次中断交互。 */
						}
						if (resultLine)
							resultLine.textContent = "载入失败，请重试。";
						console.warn("[nice-books] 书库操作失败：", error);
					}
					actionBusy = false;
					syncArchiveButtons(false);
					if (restoreFocus) {
						const next = focusAfter();
						if (next && !next.hidden) next.focus();
					}
				}, 0);
			}

			function animateResults(): void {
				resultAnimation?.cancel();
				if (prefersReducedMotion()) {
					resultAnimation = resultsWrap.animate(
						[{ opacity: 0.85 }, { opacity: 1 }],
						{ duration: 80, easing: "ease-out" },
					);
					return;
				}
				resultAnimation = resultsWrap.animate(
					[
						{ opacity: 0.78, transform: "translateY(4px)" },
						{ opacity: 1, transform: "translateY(0)" },
					],
					{
						duration: 180,
						easing: "cubic-bezier(0.23, 1, 0.32, 1)",
					},
				);
			}

			function applyChange(animate = false): void {
				state.shown = PAGE_SIZE;
				render();
				if (animate) animateResults();
				syncUrl();
			}

			const flushSearch = (): void => {
				if (debounceTimer !== null) window.clearTimeout(debounceTimer);
				debounceTimer = null;
				state.q = searchInput.value.trim();
				applyChange(false);
			};
			searchInput.addEventListener(
				"input",
				() => {
					if (debounceTimer !== null)
						window.clearTimeout(debounceTimer);
					debounceTimer = window.setTimeout(() => {
						state.q = searchInput.value.trim();
						applyChange(false);
					}, 160);
				},
				{ signal: abort.signal },
			);
			qs("#nb-search-btn", main)?.addEventListener(
				"click",
				() => {
					flushSearch();
					searchInput.blur();
				},
				{ signal: abort.signal },
			);
			searchInput.addEventListener(
				"keydown",
				(event) => {
					if (event.key === "Enter") flushSearch();
				},
				{ signal: abort.signal },
			);
			tagFilter?.addEventListener(
				"click",
				(event) => {
					const button = (
						event.target as HTMLElement
					).closest<HTMLButtonElement>("button[data-tag]");
					if (!button) return;
					const restoreFocus = document.activeElement === button;
					const tag = button.getAttribute("data-tag") || null;
					state.tag = tag && tag !== "" ? tag : null;
					applyChange(true);
					if (restoreFocus) {
						const nextButton = Array.from(
							tagFilter.querySelectorAll<HTMLButtonElement>(
								"button[data-tag]",
							),
						).find(
							(candidate) =>
								candidate.getAttribute("data-tag") ===
								(tag ?? ""),
						);
						nextButton?.focus();
					}
				},
				{ signal: abort.signal },
			);

			const viewBase =
				"cursor-pointer border-0 px-3.5 py-[9px] text-[13px] transition-colors duration-150";
			const viewClass = (on: boolean) =>
				on
					? `${viewBase} bg-nb-ink text-nb-paper`
					: `${viewBase} bg-nb-surface text-nb-ink-soft hover:text-nb-ink`;
			function setView(view: "grid" | "list"): void {
				state.view = view;
				for (const name of ["grid", "list"] as const) {
					const button = qs<HTMLButtonElement>(
						`#nb-view-${name}`,
						main!,
					);
					if (button)
						button.className = viewClass(state.view === name);
					button?.setAttribute(
						"aria-pressed",
						String(state.view === name),
					);
				}
				applyChange(true);
			}
			qs("#nb-view-grid", main)?.addEventListener(
				"click",
				() => setView("grid"),
				{ signal: abort.signal },
			);
			qs("#nb-view-list", main)?.addEventListener(
				"click",
				() => setView("list"),
				{ signal: abort.signal },
			);
			moreButton?.addEventListener(
				"click",
				() => {
					runArchiveAction(
						() => {
							const filtered = searchBooks(
								all,
								state.q,
								state.tag,
							);
							state.shown = Math.min(
								filtered.length,
								state.shown + LOAD_STEP,
							);
							render();
						},
						moreButton!,
						() =>
							collapseButton?.hidden
								? moreButton
								: collapseButton,
					);
				},
				{ signal: abort.signal },
			);
			collapseButton?.addEventListener(
				"click",
				() => {
					runArchiveAction(
						() => {
							state.shown = PAGE_SIZE;
							render();
						},
						collapseButton!,
						() => moreButton,
					);
				},
				{ signal: abort.signal },
			);
			qs("#nb-btn-clear", main)?.addEventListener(
				"click",
				() => {
					state.q = "";
					state.tag = null;
					searchInput.value = "";
					applyChange(false);
					searchInput.focus();
				},
				{ signal: abort.signal },
			);

			const params = new URLSearchParams(window.location.search);
			const urlTag = params.get("tag");
			const urlQ = params.get("q");
			if (urlTag) state.tag = urlTag;
			if (urlQ) {
				state.q = urlQ;
				searchInput.value = urlQ;
			}
			render();
		})
		.catch(fail);
}

/* 「/」快捷键是 document 级监听，但查询目标只接受当前书库输入框。 */
document.addEventListener("keydown", (event) => {
	if (event.key !== "/") return;
	const main = qs<HTMLElement>("#nb-books-main");
	const input = main ? qs<HTMLInputElement>("#nb-search-input", main) : null;
	if (!input) return;
	const target = event.target as HTMLElement;
	if (
		target instanceof HTMLInputElement ||
		target instanceof HTMLTextAreaElement ||
		target.isContentEditable
	)
		return;
	event.preventDefault();
	input.focus();
});
