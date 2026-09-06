// books 数据集契约校验（handoff §12 + 主提示词 §12/§43/§44）。
import test from "node:test";
import assert from "node:assert/strict";
import { allTags, books, featuredBooks, getBookById, getSameShelf } from "./books";

test("books：规模满足 V1 契约（≥20 本，主提示词 §43）", () => {
	assert.ok(books.length >= 20, `当前仅 ${books.length} 本`);
});

test("books：id 全部为两位数字字符串且唯一", () => {
	const seen = new Set<string>();
	for (const b of books) {
		assert.match(b.id, /^\d{2}$/);
		assert.ok(!seen.has(b.id), `id ${b.id} 重复`);
		seen.add(b.id);
	}
});

test("books：author 必须为非空 string[]（不得退化为单字符串）", () => {
	for (const b of books) {
		assert.ok(Array.isArray(b.author));
		assert.ok(b.author.length >= 1);
		for (const a of b.author) {
			assert.equal(typeof a, "string");
			assert.ok(a.trim() !== "");
		}
	}
	// 多作者书目确实存在且保持数组形态
	const multi = books.find((b) => b.author.length >= 2);
	assert.ok(multi, "fixture 应覆盖多作者场景");
});

test("books：featured 池 ≥ 12（2×6，保证「新组排除旧组」整组换始终可行）", () => {
	assert.ok(featuredBooks.length >= 12);
	assert.ok(featuredBooks.every((b) => b.featured === true));
	// 非推荐书目也存在（两种形态都要覆盖）
	assert.ok(books.some((b) => b.featured === false));
});

test("books：必填字符串字段非空、firstEdition 合法、coverUrl 为 null 或本地路径", () => {
	for (const b of books) {
		for (const field of ["title", "publisher", "description", "recommendationReason"] as const) {
			assert.ok(b[field].trim() !== "", `${b.id}.${field} 为空`);
		}
		assert.equal(typeof b.firstEdition.year, "number");
		assert.ok(Number.isInteger(b.firstEdition.year));
		assert.ok(b.firstEdition.edition.trim() !== "");
		assert.ok(b.coverUrl === null || (b.coverUrl.startsWith("/") && !b.coverUrl.startsWith("//")));
		assert.ok(b.tags.length >= 1);
	}
});

test("getBookById：命中返回原对象，未命中返回 null", () => {
	const first = books[0]!;
	assert.equal(getBookById(first.id), first);
	assert.equal(getBookById("99"), null);
});

test("getSameShelf：≤4 本、不含自身、全部与目标共享至少 1 个标签", () => {
	for (const b of books) {
		const shelf = getSameShelf(b, 4);
		assert.ok(shelf.length <= 4);
		assert.ok(!shelf.some((s) => s.id === b.id), `${b.id} 的同架图书包含自身`);
		for (const s of shelf) {
			assert.ok(s.tags.some((t) => b.tags.includes(t)));
		}
	}
});

test("allTags：按出现频次降序", () => {
	const tags = allTags();
	const countOf = (tag: string) => books.filter((b) => b.tags.includes(tag)).length;
	for (let i = 1; i < tags.length; i++) {
		assert.ok(countOf(tags[i - 1]!) >= countOf(tags[i]!), `频次未降序：${tags[i - 1]} → ${tags[i]}`);
	}
});
