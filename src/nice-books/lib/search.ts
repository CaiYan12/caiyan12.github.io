/**
 * 书库客户端过滤（六字段，主提示词 §18）：
 * title / author / publisher / description / recommendationReason / tags
 * 比原型 matchBook 多简介与荐语两字段（设计冲突裁决：主提示词优先）。
 * 与标签筛选可叠加（AND）；query 大小写不敏感。
 */

import type { Book } from "../types";

function searchableText(book: Book): string {
	return [
		book.title,
		book.author.join(" "),
		book.publisher,
		book.description,
		book.recommendationReason,
		book.tags.join(" "),
	]
		.join(" ")
		.toLowerCase();
}

export function matchBook(book: Book, q: string, tag: string | null): boolean {
	if (tag !== null && !book.tags.includes(tag)) return false;
	const query = q.trim().toLowerCase();
	if (query === "") return true;
	return searchableText(book).includes(query);
}

export function searchBooks(
	books: readonly Book[],
	q: string,
	tag: string | null,
): Book[] {
	return books.filter((b) => matchBook(b, q, tag));
}
