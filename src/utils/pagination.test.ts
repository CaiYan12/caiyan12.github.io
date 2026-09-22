// 分页标题/描述契约：getPaginationUrl（第 1 页 canonical 无 /page/1/）+ getPageMeta（第 ≥2 页带页码）。
import test from "node:test";
import assert from "node:assert/strict";
import { getPageMeta, getPaginationUrl } from "./pagination";

test("getPaginationUrl：根 URL 规范化补尾斜杠", () => {
	assert.equal(getPaginationUrl("/tag/", 1), "/tag/");
	assert.equal(getPaginationUrl("/tag", 1), "/tag/");
});

test("getPaginationUrl：第 1 页（数字与字符串）返回根 URL，不带 /page/1/", () => {
	assert.equal(getPaginationUrl("/tag/", 1), "/tag/");
	assert.equal(getPaginationUrl("/tag/", "1"), "/tag/");
});

test("getPaginationUrl：第 2+ 页返回 /page/N/ 嵌套形式", () => {
	assert.equal(getPaginationUrl("/tag/", 2), "/tag/page/2/");
	assert.equal(getPaginationUrl("/tag/", "10"), "/tag/page/10/");
	assert.equal(getPaginationUrl("/tag", 3), "/tag/page/3/");
});

test("getPageMeta：第 1 页原样返回 base（标题与描述都不加页码）", () => {
	const base = { title: "热门推荐", description: "全站热门文章推荐" };
	assert.deepEqual(getPageMeta(base, 1), base);
});

test("getPageMeta：第 ≥2 页的标题与描述都带页码，两者互不重复", () => {
	const meta = getPageMeta(
		{ title: "热门推荐", description: "全站热门文章推荐" },
		2,
	);
	assert.equal(meta.title, "热门推荐 · 第 2 页");
	assert.equal(meta.description, "全站热门文章推荐（第 2 页）");
	// 描述不能被写成与标题同形（历史缺陷：全站共用一条 subtitle，页与页无法区分）
	assert.notEqual(meta.description, meta.title);
});
