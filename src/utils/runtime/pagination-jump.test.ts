// 分页跳转的输入校验与目标地址单测（T4 #119 迁移时抽出的纯函数核）。
// 期望值来自迁移前 theme-script.ts 的 `initPaginationJump` 实际读数，不是理想行为：
// 逐条钉住 `/^\d+$/`、整数 min/max、1 走 firstPageUrl、其余走 {n} 模板、模板缺省成空串。
import test from "node:test";
import assert from "node:assert/strict";
import { resolveJumpTarget } from "./pagination-jump";

const form = {
	urlTemplate: "/page/{n}/",
	firstPageUrl: "/",
	min: "1",
	max: "5",
};

test("合法页码走 {n} 模板", () => {
	assert.deepEqual(resolveJumpTarget({ ...form, value: "3" }), {
		ok: true,
		url: "/page/3/",
	});
});

test("第 1 页走 firstPageUrl 而不是模板", () => {
	assert.deepEqual(resolveJumpTarget({ ...form, value: "1" }), {
		ok: true,
		url: "/",
	});
});

test("首尾页边界都算合法", () => {
	const last = resolveJumpTarget({ ...form, value: "5" });
	assert.deepEqual(last, { ok: true, url: "/page/5/" });
});

test("越界页码无效，并给出与迁移前一致的提示文案", () => {
	for (const value of ["0", "6"]) {
		const result = resolveJumpTarget({ ...form, value });
		assert.equal(result.ok, false);
		if (result.ok) return;
		assert.equal(result.message, "请输入 1 到 5 之间的整数页码。");
	}
});

test("非纯数字（含小数、负号、空串）一律无效", () => {
	for (const value of ["", "3.5", "-1", "3页", "1e2"]) {
		const result = resolveJumpTarget({ ...form, value });
		assert.equal(result.ok, false, `"${value}" 应判无效`);
	}
});

test("首尾空格按迁移前的 trim 口径忽略", () => {
	assert.deepEqual(resolveJumpTarget({ ...form, value: " 4 " }), {
		ok: true,
		url: "/page/4/",
	});
});

test("前导零按数值解析（007 → 第 7 页）", () => {
	assert.deepEqual(resolveJumpTarget({ ...form, max: "10", value: "007" }), {
		ok: true,
		url: "/page/7/",
	});
});

test("min/max 不是整数时整条判无效", () => {
	const result = resolveJumpTarget({ ...form, min: "1.5", value: "3" });
	assert.equal(result.ok, false);
});

test("urlTemplate 缺失时按迁移前口径得到空串目标", () => {
	assert.deepEqual(
		resolveJumpTarget({ ...form, urlTemplate: "", value: "2" }),
		{ ok: true, url: "" },
	);
});
