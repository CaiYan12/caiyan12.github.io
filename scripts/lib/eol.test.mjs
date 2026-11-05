import test from "node:test";
import assert from "node:assert/strict";
import { detectEol, hasMixedEol } from "./eol.mjs";

test("纯 CRLF、纯 LF、无换行各自可判", () => {
	assert.equal(detectEol("a\r\nb\r\n"), "crlf");
	assert.equal(detectEol("a\nb\n"), "lf");
	assert.equal(detectEol("single line"), "none");
});

test("同一文本混用两种行尾判为 mixed", () => {
	const mixed = "a\r\nb\nc\r\n";
	assert.equal(detectEol(mixed), "mixed");
	assert.equal(hasMixedEol(mixed), true);
});

test("孤立的 CR 不算一次换行", () => {
	assert.equal(detectEol("a\rb\nc"), "lf");
	assert.equal(hasMixedEol("a\rb\nc"), false);
});

test("空文本与仅一个换行符", () => {
	assert.equal(detectEol(""), "none");
	assert.equal(detectEol("\r\n"), "crlf");
	assert.equal(detectEol("\n"), "lf");
});
