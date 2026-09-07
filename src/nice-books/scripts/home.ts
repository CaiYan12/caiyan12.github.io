/**
 * /books/ 首页交互（契约：访问级随机；新 ≠ 当前；推荐组整组替换去重）。
 * 主书使用按需加载的 GSAP 双阶段时间线；其余反馈由 CSS/WAAPI 负责。
 */

import { books, featuredBooks } from "../data/books";
import { pickOne, sampleUnique } from "../lib/random";
import { bookCardHTML, heroCardHTML } from "../lib/render";
import { bindShuffle, registerPageCleanup, qs } from "./shared";

const FEATURED_COUNT = 6;
const HERO_ROTATION = -1.4;
type Gsap = (typeof import("gsap"))["gsap"];

function heroParts(root: HTMLElement): {
	book: HTMLElement | null;
	copy: HTMLElement | null;
	title: HTMLElement | null;
	note: HTMLElement | null;
} {
	const copy =
		qs<HTMLElement>(".nb-hero-copy", root) ??
		qs<HTMLElement>("article > div", root);
	return {
		book:
			qs<HTMLElement>(".nb-hero-book", root) ??
			qs<HTMLElement>("article > a", root) ??
			qs<HTMLElement>(".nb-book3d", root),
		copy,
		title: qs<HTMLElement>(".hero-title", root),
		note:
			qs<HTMLElement>(".nb-note", root) ??
			(copy ? qs<HTMLElement>("aside", copy) : null),
	};
}

function loadGsap(): Promise<Gsap> {
	return import("gsap").then((module) => module.gsap ?? module.default);
}

export function initHome(): void {
	const main = qs<HTMLElement>("#nb-books-main");
	if (!main || main.dataset.nbInit) return;
	const heroCandidate = qs<HTMLElement>("#nb-hero", main);
	const gridCandidate = qs<HTMLElement>("#nb-featured-grid", main);
	if (!heroCandidate || !gridCandidate) return;
	const heroWrap = heroCandidate;
	const grid = gridCandidate;
	main.dataset.nbInit = "1";

	const abort = new AbortController();
	let disposed = false;
	let heroRun = 0;
	let heroContext: ReturnType<Gsap["context"]> | null = null;
	let heroTimeline: ReturnType<Gsap["timeline"]> | null = null;
	let resolveHeroSwap: (() => void) | null = null;
	let gsapPromise: Promise<Gsap> | null = null;
	let groupRun = 0;
	let groupAnimations: Animation[] = [];

	const ssrBookId = heroWrap.dataset.ssrBookId ?? null;
	const ssrGroupIds = (grid.dataset.ssrGroupIds ?? "")
		.split(",")
		.filter(Boolean);
	let currentId: string | null = ssrBookId;
	let swapCount = 0;
	let group: string[] = ssrGroupIds;

	function renderHero(bookId: string): void {
		const book = books.find((b) => b.id === bookId);
		if (!book || disposed) return;
		heroWrap.innerHTML = heroCardHTML(book, swapCount);
		currentId = book.id;
	}

	function stopHeroMotion(): void {
		heroRun += 1;
		heroTimeline?.kill();
		heroTimeline = null;
		heroContext?.revert();
		heroContext = null;
		resolveHeroSwap?.();
		resolveHeroSwap = null;
	}

	function finishContext(context: ReturnType<Gsap["context"]>): void {
		if (heroContext === context) {
			heroContext = null;
			heroTimeline = null;
		}
		context.revert();
	}

	function playHeroIntro(gsap: Gsap): void {
		if (disposed) return;
		const token = heroRun;
		const parts = heroParts(heroWrap);
		const targets = [parts.book, parts.copy].filter(
			(el): el is HTMLElement => el !== null,
		);
		if (
			targets.length === 0 ||
			window.matchMedia("(prefers-reduced-motion: reduce)").matches
		)
			return;
		const context = gsap.context(() => {
			if (parts.book) gsap.set(parts.book, { transition: "none" });
			heroTimeline = gsap.timeline({
				onComplete: () => {
					if (token === heroRun && !disposed) finishContext(context);
				},
			});
			heroTimeline.fromTo(
				parts.book,
				{ autoAlpha: 0, y: 16, rotation: -2 },
				{
					autoAlpha: 1,
					y: 0,
					rotation: HERO_ROTATION,
					duration: 0.32,
					ease: "power3.out",
				},
			);
			if (parts.copy) {
				heroTimeline.fromTo(
					parts.copy,
					{ autoAlpha: 0, y: 10 },
					{ autoAlpha: 1, y: 0, duration: 0.26, ease: "power3.out" },
					"-=0.2",
				);
			}
			if (parts.note) {
				heroTimeline.fromTo(
					parts.note,
					{ autoAlpha: 0, y: 8 },
					{ autoAlpha: 1, y: 0, duration: 0.18, ease: "power3.out" },
					"-=0.12",
				);
			}
		}, heroWrap);
		heroContext = context;
	}

	function swapHero(bookId: string, gsap: Gsap): Promise<void> {
		const oldParts = heroParts(heroWrap);
		stopHeroMotion();
		const token = ++heroRun;
		return new Promise((resolve) => {
			resolveHeroSwap = resolve;
			const oldContext = gsap.context(() => {
				if (oldParts.book)
					gsap.set(oldParts.book, { transition: "none" });
				heroTimeline = gsap.timeline({
					onComplete: () => {
						oldContext.revert();
						if (disposed || token !== heroRun) {
							resolveHeroSwap = null;
							resolve();
							return;
						}
						renderHero(bookId);
						const nextParts = heroParts(heroWrap);
						const nextContext = gsap.context(() => {
							if (nextParts.book)
								gsap.set(nextParts.book, {
									transition: "none",
								});
							heroTimeline = gsap.timeline({
								onComplete: () => {
									finishContext(nextContext);
									resolveHeroSwap = null;
									resolve();
								},
							});
							heroTimeline.fromTo(
								nextParts.book,
								{ autoAlpha: 0, y: -16, rotation: 2 },
								{
									autoAlpha: 1,
									y: 0,
									rotation: HERO_ROTATION,
									duration: 0.24,
									ease: "power3.out",
								},
							);
							if (nextParts.copy) {
								heroTimeline.fromTo(
									nextParts.copy,
									{ autoAlpha: 0, x: -10 },
									{
										autoAlpha: 1,
										x: 0,
										duration: 0.22,
										ease: "power3.out",
									},
									0.02,
								);
							}
							if (nextParts.note) {
								heroTimeline.fromTo(
									nextParts.note,
									{ autoAlpha: 0, y: 8 },
									{
										autoAlpha: 1,
										y: 0,
										duration: 0.18,
										ease: "power3.out",
									},
									0.06,
								);
							}
						}, heroWrap);
						heroContext = nextContext;
					},
				});
				if (oldParts.book)
					heroTimeline.to(oldParts.book, {
						autoAlpha: 0,
						y: -12,
						rotation: -2,
						duration: 0.18,
						ease: "power2.out",
					});
				if (oldParts.copy)
					heroTimeline.to(
						oldParts.copy,
						{
							autoAlpha: 0,
							x: 8,
							duration: 0.18,
							ease: "power2.out",
						},
						"<",
					);
			}, heroWrap);
			heroContext = oldContext;
		});
	}

	function getGsap(): Promise<Gsap> {
		gsapPromise ??= loadGsap();
		return gsapPromise;
	}

	let swapping = false;
	async function shuffleHero(): Promise<void> {
		if (swapping || disposed) return;
		swapping = true;
		const next = pickOne(books, currentId);
		swapCount += 1;
		try {
			if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
				renderHero(next.id);
				return;
			}
			const gsap = await getGsap();
			if (!disposed) await swapHero(next.id, gsap);
		} catch (error) {
			console.warn("[nice-books] 主书动效不可用，直接替换：", error);
			if (!disposed) renderHero(next.id);
		} finally {
			swapping = false;
		}
	}

	function renderGroup(groupIds: string[], withStagger: boolean): void {
		grid.innerHTML = groupIds
			.map((id, i) => {
				const book = books.find((b) => b.id === id);
				if (!book) return "";
				return bookCardHTML(book, withStagger ? i * 45 : undefined);
			})
			.join("");
		group = groupIds;
	}

	async function shuffleGroup(): Promise<void> {
		const token = ++groupRun;
		for (const animation of grid.getAnimations({ subtree: true }))
			animation.cancel();
		groupAnimations = [];
		const next = sampleUnique(featuredBooks, FEATURED_COUNT, group);
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			renderGroup(
				next.map((b) => b.id),
				false,
			);
			return;
		}
		const oldCards = Array.from(grid.children).filter(
			(child): child is HTMLElement => child instanceof HTMLElement,
		);
		groupAnimations = oldCards.map((card) =>
			card.animate(
				[
					{ opacity: 1, transform: "translateY(0)" },
					{ opacity: 0, transform: "translateY(-4px)" },
				],
				{
					duration: 120,
					easing: "cubic-bezier(0.23, 1, 0.32, 1)",
					fill: "forwards",
				},
			),
		);
		await Promise.allSettled(
			groupAnimations.map((animation) => animation.finished),
		);
		if (disposed || token !== groupRun) return;
		renderGroup(
			next.map((b) => b.id),
			true,
		);
		groupAnimations = grid.getAnimations({ subtree: true });
		await Promise.allSettled(
			groupAnimations.map((animation) => animation.finished),
		);
		groupAnimations = [];
	}

	const first = pickOne(books, ssrBookId);
	renderHero(first.id);
	renderGroup(
		sampleUnique(featuredBooks, FEATURED_COUNT, ssrGroupIds).map(
			(b) => b.id,
		),
		true,
	);

	// 预热 chunk，首次点击无需附加人为等待；首入编排总时长约 430ms。
	void getGsap()
		.then((gsap) => playHeroIntro(gsap))
		.catch(() => undefined);
	const todayButtons = [
		qs<HTMLButtonElement>("#nb-today-shuffle", main),
		qs<HTMLButtonElement>("#nb-intro-shuffle", main),
	];
	bindShuffle(todayButtons, shuffleHero, {
		loadingText: "换书中…",
		signal: abort.signal,
	});
	bindShuffle(
		[qs<HTMLButtonElement>("#nb-featured-shuffle", main)],
		shuffleGroup,
		{ loadingText: "换一批中…", signal: abort.signal },
	);

	registerPageCleanup(() => {
		disposed = true;
		abort.abort();
		groupRun += 1;
		for (const animation of grid.getAnimations({ subtree: true }))
			animation.cancel();
		for (const animation of groupAnimations) animation.cancel();
		groupAnimations = [];
		stopHeroMotion();
		delete main.dataset.nbInit;
	});
}
