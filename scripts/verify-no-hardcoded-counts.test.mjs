import test from "node:test";
import assert from "node:assert/strict";
import {
	isTarget,
	findHardcodedCounts,
	scanScripts,
} from "./verify-no-hardcoded-counts.mjs";

test("扫描范围只含 verify-*.mjs，排除测试文件", () => {
	assert.equal(isTarget("verify-og-images.mjs"), true);
	assert.equal(isTarget("verify-og-images.test.mjs"), false);
	assert.equal(isTarget("series-smoke.mjs"), false);
});

test("写死的整数与浮点期望值都命中", () => {
	const hits = findHardcodedCounts(
		[
			"const EXPECTED_COUNT = 33;",
			"  let EXPECTED_BODY_HEIGHT = 113.2;",
		].join("\n"),
	);
	assert.equal(hits.length, 2);
	assert.equal(hits[0].name, "EXPECTED_COUNT");
	assert.equal(hits[1].line, 2);
});

test("派生写法与注释里的反例不命中", () => {
	const text = [
		"// const EXPECTED_COUNT = 33; // bad example",
		"/* const EXPECTED_CHECKS = 88; */",
		"const expectedCount = countPublishedPosts();",
	].join("\n");
	assert.deepEqual(findHardcodedCounts(text), []);
});

test("扫描真实 scripts 目录时零命中", () => {
	const result = scanScripts();
	assert.deepEqual(result.hits, []);
	assert.ok(result.files >= 4);
});
