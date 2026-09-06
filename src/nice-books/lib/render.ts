/**
 * Nice Books 标记构造器（SSR 与客户端单源）
 * ------------------------------------------------------------
 * 换一换/书库过滤在客户端以 innerHTML 重渲染，无法调用 Astro 组件；
 * 为保证 SSR 与客户端标记逐类一致，所有「会被客户端重渲染」的片段
 * 统一在此以字符串构造（全部插值经 esc() 转义）。Tailwind 扫描
 * content 含 .ts，此处类名会被正常生成。
 */

import { generateCoverSvg } from "./cover";
import { bookHref, formatAuthors, formatMetaLine, tagHref } from "./format";
import type { Book } from "../types";

export function esc(s: string): string {
	return String(s ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

/** 书封外壳：立体书本三层（背板书壳 + 书页纸张 + 前封面）；thin 用于列表 48px 行 */
export function coverHTML(book: Book, opts?: { tape?: boolean; thin?: boolean }): string {
	const shellCls = ["nb-cover", opts?.tape ? "nb-tape" : ""].filter(Boolean).join(" ");
	const inner =
		book.coverUrl
			? `<img src="${esc(book.coverUrl)}" alt="《${esc(book.title)}》封面" width="300" height="450" loading="lazy" decoding="async" class="h-full w-full object-cover"` +
				` data-nb-cover data-nb-id="${esc(book.id)}" data-nb-title="${esc(book.title)}"` +
				` data-nb-author="${esc(book.author.join(" · "))}" data-nb-publisher="${esc(book.publisher)}" data-nb-year="${book.firstEdition.year}">`
			: generateCoverSvg(book);
	return (
		`<div class="nb-book3d${opts?.thin ? " nb-book3d-thin" : ""}">` +
		`<i class="nb-book3d-back" aria-hidden="true"></i>` +
		`<i class="nb-book3d-pages" aria-hidden="true"></i>` +
		`<div class="${shellCls}">${inner}</div>` +
		`</div>`
	);
}

export type TagPillVariant = "link" | "button" | "static";

/** 标签药丸（handoff §4 TagFilter：选中墨色反白，非蓝底高亮） */
export function tagPillHTML(
	tag: string,
	opts?: { variant?: TagPillVariant; small?: boolean; on?: boolean },
): string {
	const variant = opts?.variant ?? "static";
	const size = opts?.small ? "px-[7px] py-px text-[11px]" : "px-[9px] py-[2px] text-xs";
	// 同组 utility（bg/text/border 色）互斥拼接：Tailwind 冲突类的胜负由产物 CSS
	// 源顺序决定而非标记书写顺序，bg-transparent 与 bg-nb-ink 同存会随机覆盖
	const state = opts?.on
		? "border-nb-ink bg-nb-ink text-nb-paper"
		: "border-nb-border-strong bg-transparent text-nb-ink-soft hover:border-nb-ink hover:text-nb-ink";
	const base = `inline-flex items-center whitespace-nowrap rounded-[2px] border no-underline transition-colors duration-150 ${size} ${state}`;
	if (variant === "link") {
		return `<a class="${base}" href="${esc(tagHref(tag))}"># ${esc(tag)}</a>`;
	}
	if (variant === "button") {
		return `<button type="button" class="${base} cursor-pointer" data-tag="${esc(tag)}"># ${esc(tag)}</button>`;
	}
	return `<span class="${base}"># ${esc(tag)}</span>`;
}

/** 站长荐语便签（黄底 + 楷体 + 红圈「荐」章；UX 规则：与简介一眼区分） */
export function noteHTML(book: Book, opts?: { stamp?: boolean; extraClass?: string }): string {
	const stamp = opts?.stamp
		? `<span class="absolute -top-3.5 right-[18px] h-[42px] w-[42px] rotate-[10deg] rounded-full border-[2.5px] border-[rgba(168,67,60,0.65)] bg-[rgba(248,239,207,0.92)] text-center font-nb-kai text-[20px] leading-[38px] text-[rgba(168,67,60,0.85)]" aria-hidden="true">荐</span>`
		: "";
	return (
		`<aside class="relative border border-nb-note-border bg-nb-note px-[22px] pb-4 pt-[18px] shadow-[2px_3px_0_rgba(74,63,46,0.06)] ${opts?.extraClass ?? ""}">` +
		stamp +
		`<span class="mb-1.5 block text-[11px] tracking-[3px] text-[#a08a4f]">站长荐语</span>` +
		`<p class="font-nb-kai text-[15.5px] leading-[2] text-[#4a3f2c]">${esc(book.recommendationReason)}</p>` +
		`</aside>`
	);
}

const CARD_BASE =
	"border border-nb-border bg-nb-surface transition-[border-color,box-shadow,transform] duration-[180ms] hover:-translate-y-0.5 hover:border-nb-border-strong hover:shadow-[3px_4px_0_rgba(74,63,46,0.08)]";

/** 书架网格卡片（真 <a> 整卡可点；delayMs 传入时附带级联入场） */
export function bookCardHTML(book: Book, delayMs?: number): string {
	const stagger = delayMs != null ? ` nb-stagger" style="--d:${delayMs}ms` : "";
	return (
		`<li class="${CARD_BASE}${stagger}">` +
		`<a class="group block p-[13px] pb-4 no-underline" href="${esc(bookHref(book))}">` +
		coverHTML(book) +
		`<h3 class="mt-3 font-nb-serif text-[16.5px] font-bold leading-[1.5] text-nb-ink group-hover:text-nb-blue max-[540px]:text-[15px]">${esc(book.title)}</h3>` +
		`<p class="mt-[3px] text-[12.5px] text-nb-muted">${esc(formatAuthors(book))}</p>` +
		`<p class="mt-2.5 flex flex-wrap gap-1.5">${book.tags
			.slice(0, 3)
			.map((t) => tagPillHTML(t, { small: true }))
			.join("")}</p>` +
		`</a></li>`
	);
}

/** 今日好书 Hero 卡（首页视觉核心；swapCount > 0 时显示换书计数） */
export function heroCardHTML(book: Book, swapCount = 0): string {
	const countNote =
		swapCount > 0 ? ` <span class="opacity-80">· 本次已换 ${swapCount} 次</span>` : "";
	return (
		`<article class="grid grid-cols-[236px_1fr] gap-9 border border-nb-border-strong bg-nb-surface p-8 shadow-[var(--nb-shadow-lift)] max-[960px]:grid-cols-[200px_1fr] max-[960px]:gap-7 max-[960px]:p-[26px] max-[820px]:grid-cols-1">` +
		`<a class="block w-full max-w-[236px] rotate-[-1.4deg] self-start justify-self-center no-underline transition-transform duration-200 hover:-translate-y-[3px] hover:rotate-0 max-[820px]:max-w-[210px]" href="${esc(bookHref(book))}" aria-label="查看《${esc(book.title)}》详情">` +
		coverHTML(book, { tape: true }) +
		`</a>` +
		`<div>` +
		`<p class="mb-2.5 text-xs tracking-[1px] text-nb-muted"><span class="font-nb-mono text-[0.86em] tracking-[0.5px] text-nb-seal">No.${esc(book.id)}</span> · 藏书编号${countNote}</p>` +
		`<h3 class="hero-title font-nb-serif text-[32px] leading-[1.35] tracking-[1px] max-[540px]:text-[25px]"><a class="text-nb-ink no-underline hover:text-nb-blue" href="${esc(bookHref(book))}">${esc(book.title)}</a></h3>` +
		`<p class="mt-2 text-[14.5px] text-nb-ink-soft">${esc(formatAuthors(book))}</p>` +
		`<p class="mt-1 text-[12.5px] text-nb-muted">${esc(formatMetaLine(book))}</p>` +
		`<p class="mt-4 max-w-[40em] text-[15px] leading-[2] text-nb-ink-soft">${esc(book.description)}</p>` +
		noteHTML(book, { stamp: true }) +
		`<p class="mt-4 text-[13.5px]"><a class="text-nb-blue underline decoration-[rgba(58,110,165,0.45)] underline-offset-[3px] hover:text-nb-seal" href="${esc(bookHref(book))}">翻到详情页 <span aria-hidden="true">→</span></a></p>` +
		`</div></article>`
	);
}

/** 书库列表视图行（次方案；≤640px 隐藏标签列） */
export function listRowHTML(book: Book): string {
	return (
		`<li><a class="grid grid-cols-[48px_1fr_auto] items-center gap-[18px] border-b border-dashed border-nb-border px-2 py-3 no-underline transition-colors duration-150 hover:bg-[rgba(252,249,240,0.9)] max-[640px]:grid-cols-[42px_1fr] max-[640px]:gap-3.5" href="${esc(bookHref(book))}">` +
		`<span class="w-12 self-center max-[640px]:w-[42px]">${coverHTML(book, { thin: true })}</span>` +
		`<span class="block min-w-0">` +
		`<span class="block font-nb-serif text-[15.5px] font-bold text-nb-ink group-hover:text-nb-blue">${esc(book.title)}</span>` +
		`<span class="mt-0.5 block text-[12.5px] text-nb-muted">${esc(formatAuthors(book))} · ${esc(book.publisher)} · ${book.firstEdition.year}</span>` +
		`</span>` +
		`<span class="flex flex-wrap justify-end gap-1.5 max-[640px]:hidden">${book.tags
			.slice(0, 3)
			.map((t) => tagPillHTML(t, { small: true }))
			.join("")}</span>` +
		`</a></li>`
	);
}
