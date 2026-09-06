// 书库过滤单测：六字段范围 + 标签叠加 + 大小写不敏感（主提示词 §18）。
import test from "node:test";
import assert from "node:assert/strict";
import { matchBook, searchBooks } from "./search";
import { books } from "../data/books";

const 小王子 = books.find((b) => b.id === "05")!; // description 含 "B-612"

test("六字段逐一命中：title/author/publisher/description/recommendationReason/tags", () => {
	assert.ok(matchBook(小王子, "小王子", null)); // title
	assert.ok(matchBook(小王子, "周克希", null)); // author 成员
	assert.ok(matchBook(小王子, "华东师范大学出版社", null)); // publisher
	assert.ok(matchBook(小王子, "撒哈拉", null)); // description
	assert.ok(matchBook(小王子, "译本味道最对", null)); // recommendationReason
	assert.ok(matchBook(小王子, "童话", null)); // 经由 description；tag 字段单独测
	assert.ok(matchBook(小王子, "外国文学", null)); // tags
});

test("query 大小写不敏感（西文片段）", () => {
	assert.ok(matchBook(小王子, "b-612", null));
	assert.ok(matchBook(小王子, "B-612", null));
});

test("标签筛选：命中 / 不命中", () => {
	assert.ok(matchBook(小王子, "", "文学"));
	assert.ok(!matchBook(小王子, "", "科幻"));
});

test("搜索与标签叠加为 AND", () => {
	assert.ok(matchBook(小王子, "小王子", "文学"));
	assert.ok(!matchBook(小王子, "小王子", "科幻")); // 命中 query 但 tag 不符
	assert.ok(!matchBook(小王子, "不存在的词", "文学"));
});

test("searchBooks：空 query + 无 tag 返回全量；无结果返回空数组", () => {
	assert.equal(searchBooks(books, "", null).length, books.length);
	assert.equal(searchBooks(books, " Quantum Computing ", null).length, 0); // trim 后无命中
});

test("searchBooks：全量数据集上标签组合结果一致于逐本 matchBook", () => {
	const got = searchBooks(books, "", "小说");
	const want = books.filter((b) => matchBook(b, "", "小说"));
	assert.deepEqual(
		got.map((b) => b.id),
		want.map((b) => b.id),
	);
});
