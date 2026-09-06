// getPaginationUrl 单测：第 1 页 canonical 无 /page/1/，第 2+ 页嵌套 URL（Pagination 组件的 URL 契约）。
import test from "node:test";
import assert from "node:assert/strict";
import { getPaginationUrl } from "./pagination";

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
