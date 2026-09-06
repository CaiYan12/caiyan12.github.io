/**
 * /books/ 首页交互（契约：访问级随机；新 ≠ 当前；推荐组整组替换去重）
 * 由 scripts/main.ts 统一调度：initHome 自查元素早退，astro:page-load 重跑。
 */

import { books, featuredBooks } from "../data/books";
import { pickOne, sampleUnique } from "../lib/random";
import { bookCardHTML, heroCardHTML } from "../lib/render";
import { bindShuffle, qs } from "./shared";

const FEATURED_COUNT = 6; // 原型参考值，featured 池 13 本时整组排除始终可行

export function initHome(): void {
	const main = qs("#nb-books-main");
	if (!main || main.dataset.nbInit) return;
	const heroWrap = qs<HTMLElement>("#nb-hero");
	const grid = qs<HTMLElement>("#nb-featured-grid");
	// 先确认本页元素存在再打标记：main 与 archive 页同 ID，
	// swup 切页后本函数在其他 books 页面触发时不得误打标记（否则封锁对方 init）
	if (!heroWrap || !grid) return;
	main.dataset.nbInit = "1";

	const ssrBookId = heroWrap.dataset.ssrBookId ?? null;
	const ssrGroupIds = (grid.dataset.ssrGroupIds ?? "").split(",").filter(Boolean);
	let currentId: string | null = ssrBookId;
	let swapCount = 0;
	let group: string[] = ssrGroupIds;

	function renderHero(bookId: string): void {
		const book = books.find((b) => b.id === bookId);
		if (!book) return;
		heroWrap!.innerHTML = heroCardHTML(book, swapCount);
		currentId = book.id;
	}

	function shuffleHero(): void {
		const next = pickOne(books, currentId); // 契约：新 ≠ 当前
		swapCount += 1;
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			renderHero(next.id);
			return;
		}
		heroWrap!.classList.add("is-leaving");
		window.setTimeout(() => {
			renderHero(next.id);
			heroWrap!.classList.remove("is-leaving");
			heroWrap!.classList.add("is-entering");
			window.setTimeout(() => heroWrap!.classList.remove("is-entering"), 260);
		}, 170);
	}

	function renderGroup(groupIds: string[], withStagger: boolean): void {
		grid!.innerHTML = groupIds
			.map((id, i) => {
				const book = books.find((b) => b.id === id);
				if (!book) return "";
				return bookCardHTML(book, withStagger ? i * 45 : undefined);
			})
			.join("");
		group = groupIds;
	}

	function shuffleGroup(): void {
		// 新组排除旧组全部 id；组内不重复（池 ≥ 12 保证始终可行）
		const next = sampleUnique(featuredBooks, FEATURED_COUNT, group);
		renderGroup(
			next.map((b) => b.id),
			true,
		);
	}

	// 初始随机替换：排除 SSR 兜底书与 SSR 推荐组（Grilling 决策 #8）
	const first = pickOne(books, ssrBookId);
	renderHero(first.id);
	renderGroup(
		sampleUnique(featuredBooks, FEATURED_COUNT, ssrGroupIds).map((b) => b.id),
		true,
	);

	bindShuffle(qs<HTMLButtonElement>("#nb-today-shuffle"), shuffleHero);
	bindShuffle(qs<HTMLButtonElement>("#nb-featured-shuffle"), shuffleGroup);
}
