import test from "node:test";
import assert from "node:assert/strict";
import { books } from "../data/books";
import {
	bookCardHTML,
	coverHTML,
	heroCardHTML,
	listRowHTML,
	noteHTML,
	tagPillHTML,
} from "./render";
import {
	COVER_FAMILY_BY_ID,
	coverFamilyForId,
	generateCoverSvg,
} from "./cover";

test("所有书目均有固定封面族，未知 ID 回退文学族", () => {
	assert.equal(Object.keys(COVER_FAMILY_BY_ID).length, books.length);
	for (const book of books)
		assert.equal(coverFamilyForId(book.id), COVER_FAMILY_BY_ID[book.id]);
	assert.equal(coverFamilyForId("unknown"), "literary");
});

test("四个封面族有可辨识且确定的 SVG 构图", () => {
	const svgs = new Set(books.map((book) => generateCoverSvg(book)));
	assert.equal(svgs.size, books.length);
	assert.ok(
		generateCoverSvg(books.find((book) => book.id === "01")!).includes(
			"M54 322",
		),
	);
	assert.ok(
		generateCoverSvg(books.find((book) => book.id === "06")!).includes(
			"M46 276",
		),
	);
	assert.ok(
		generateCoverSvg(books.find((book) => book.id === "03")!).includes(
			"ellipse",
		),
	);
	assert.ok(
		generateCoverSvg(books.find((book) => book.id === "06")!).includes(
			"M46 276h208",
		),
	);
	assert.ok(
		generateCoverSvg(books.find((book) => book.id === "05")!).includes(
			"M54 352",
		),
	);
	assert.doesNotMatch(
		generateCoverSvg(books.find((book) => book.id === "01")!),
		/M83 96h134/,
	);
});

test("书封支持 hero/card/list 三种展示规格与封面书签", () => {
	const book = books[0]!;
	assert.match(
		coverHTML(book, { variant: "hero", marker: true }),
		/nb-book3d-hero/,
	);
	assert.match(coverHTML(book, { variant: "card" }), /nb-cover--card/);
	assert.match(coverHTML(book, { variant: "list" }), /nb-book3d-list/);
	assert.match(coverHTML(book, { thin: true }), /nb-book3d-list/);
	assert.match(coverHTML(book, { marker: true }), /nb-book-marker/);
	assert.doesNotMatch(coverHTML(book, { marker: true }), /nb-book-tape/);
	assert.match(coverHTML(book), /nb-book3d-object/);
	assert.match(coverHTML(book), /nb-front-board/);
	assert.match(coverHTML(book), /nb-front-artwork nb-cover/);
	assert.match(coverHTML(book), /nb-back-board/);
	assert.match(coverHTML(book), /nb-spine-body/);
	assert.doesNotMatch(coverHTML(book), /nb-page-block/);
	assert.match(coverHTML(book), /nb-page-top/);
	assert.match(coverHTML(book), /nb-page-fore-edge/);
	assert.match(coverHTML(book), /nb-page-bottom/);
	assert.match(
		coverHTML({ ...book, coverUrl: "/books/covers/01.jpg" }),
		/object-contain/,
	);
});

test("featured hero/card 有腰封，列表与普通书封均无腰封", () => {
	const featured = books.find((book) => book.featured)!;
	const plain = books.find((book) => !book.featured)!;
	for (const variant of ["hero", "card"] as const) {
		const featuredHTML = coverHTML(featured, { variant });
		assert.match(featuredHTML, /nb-sash/);
		assert.match(featuredHTML, /nb-obi-front/);
		assert.match(featuredHTML, /nb-obi-front-fold/);
		assert.doesNotMatch(featuredHTML, /nb-obi-fore-edge/);
		assert.match(featuredHTML, /nb-obi-back-return/);
		assert.doesNotMatch(featuredHTML, /nb-obi-spine/);
		assert.match(
			featuredHTML,
			new RegExp(featured.recommendationReason.slice(0, 8)),
		);
	}
	assert.doesNotMatch(coverHTML(featured, { variant: "list" }), /nb-sash/);
	for (const variant of ["hero", "card", "list"] as const)
		assert.doesNotMatch(coverHTML(plain, { variant }), /nb-sash/);
	const relatedHTML = bookCardHTML(featured, undefined, { related: true });
	assert.match(relatedHTML, /nb-book-card--shelf-style/);
	assert.match(relatedHTML, /nb-related-book-title/);
	assert.match(relatedHTML, /nb-book-authors/);
	assert.doesNotMatch(relatedHTML, /group-hover:text-nb-blue/);
	assert.match(bookCardHTML(featured), /nb-book-authors/);
	assert.match(heroCardHTML(featured), /nb-hero-book--shelf-style/);
});

test("所有书目均可输出三档封面，辅助字号不低于 13px", () => {
	for (const book of books) {
		for (const variant of ["hero", "card", "list"] as const) {
			const html = coverHTML(book, { variant });
			assert.match(html, new RegExp(`nb-cover--${variant}`));
			assert.doesNotMatch(html, /text-(?:xs|\[11px\]|\[12\.5px\])/);
		}
	}
	assert.doesNotMatch(heroCardHTML(books[0]!), /text-xs|text-\[12\.5px\]/);
});

test("荐语标题可在详情页关闭，首页默认显示", () => {
	const book = books[0]!;
	assert.match(noteHTML(book), /站长荐语/);
	assert.doesNotMatch(noteHTML(book, { showLabel: false }), /站长荐语/);
	assert.match(heroCardHTML(book), /nb-hero-book/);
	assert.match(heroCardHTML(book), /nb-hero-copy/);
	assert.match(listRowHTML(book), /group nb-book-list-row/);
});

test("标签筛选按钮暴露 aria-pressed 选中状态", () => {
	assert.match(
		tagPillHTML("文学", { variant: "button", on: true }),
		/aria-pressed="true"/,
	);
	assert.match(
		tagPillHTML("文学", { variant: "button", on: false }),
		/aria-pressed="false"/,
	);
});
