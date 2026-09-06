/** 展示格式化与 URL 构造（纯函数，trailingSlash: "always" 约定 URL 以 / 结尾） */

import type { Book } from "../types";

/** 多作者按序以「 · 」相连（UX 规则：不得只显示第一个） */
export function formatAuthors(book: Book): string {
	return book.author.join(" · ");
}

/** 「出版社 · 版次 · 年份」元信息行 */
export function formatMetaLine(book: Book): string {
	return `${book.publisher} · ${book.firstEdition.edition} · ${book.firstEdition.year} 年`;
}

/** 详情页 URL：/books/:id/ */
export function bookHref(book: Pick<Book, "id">): string {
	return `/books/${book.id}/`;
}

/** 书库标签筛选 URL：/books/archive/?tag=<encoded> */
export function tagHref(tag: string): string {
	return `/books/archive/?tag=${encodeURIComponent(tag)}`;
}
