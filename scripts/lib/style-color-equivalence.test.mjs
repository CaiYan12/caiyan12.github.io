// scripts/lib/style-color-equivalence.mjs 的契约测试。
//
// 这套判定决定「颜色字面量变了但像素没变」的条目算不算回归。
// 阈值取 1 太严（实测 Tailwind v3 的 #374151 与 v4 的 oklch(37.3% .034 259.733)
// 换算后 ΔE ≈ 1.32，会被误判成可见差异）；取 2 又太松（ΔE 2 已经有一点可见差别）。
// 折中取 2，并把它写成一条可核对的边界测试。
import test from "node:test";
import assert from "node:assert/strict";
import {
	compareColors,
	EQUIVALENT_DELTA_E,
	parseColor,
} from "./style-color-equivalence.mjs";

test("十六进制与 rgb 解析到同一个颜色", () => {
	assert.deepEqual(parseColor("#374151"), { r: 55, g: 65, b: 81, a: 1 });
	assert.deepEqual(parseColor("#374151ff"), { r: 55, g: 65, b: 81, a: 1 });
	assert.deepEqual(parseColor("rgb(55, 65, 81)"), {
		r: 55,
		g: 65,
		b: 81,
		a: 1,
	});
	assert.deepEqual(parseColor("rgb(55 65 81)"), {
		r: 55,
		g: 65,
		b: 81,
		a: 1,
	});
	assert.deepEqual(parseColor("transparent"), { r: 0, g: 0, b: 0, a: 0 });
});

test("oklch 百分比与小数两种写法都认", () => {
	const a = parseColor("oklch(37.3% .034 259.733)");
	const b = parseColor("oklch(0.373 0.034 259.733)");
	assert.deepEqual(a, b, "37.3% 与 0.373 是同一个亮度");
	assert.deepEqual(a, { r: 54, g: 65, b: 83, a: 1 });
});

test("同一个颜色字面量判为等价", () => {
	const c = compareColors("#374151", "#374151");
	assert.equal(c.equivalent, true);
	assert.equal(c.deltaE, 0);
});

test("Tailwind v3 的 #374151 与 v4 的 oklch 等价（实测只差 1 色阶）", () => {
	const c = compareColors("#374151", "oklch(37.3% .034 259.733)");
	assert.equal(c.equivalent, true, `ΔE=${c.deltaE}`);
	assert.ok(c.deltaE < 2, `ΔE 应远低于 JND，实际 ${c.deltaE}`);
});

test("明显不同的颜色判为不等价", () => {
	assert.equal(
		compareColors("rgb(0, 0, 0)", "rgb(255, 255, 255)").equivalent,
		false,
	);
	assert.equal(
		compareColors("rgb(229, 231, 235)", "rgb(0, 192, 0)").equivalent,
		false,
	);
});

test("透明度不同不判等价（半透明与不透明不是同一个颜色）", () => {
	const c = compareColors("rgba(0, 0, 0, 0.5)", "rgba(0, 0, 0, 1)");
	assert.equal(c.equivalent, false);
});

test("解析不了的记法不做等价判定（deltaE 为 null）", () => {
	const c = compareColors("color-mix(in oklab, red, blue)", "red");
	assert.equal(c.deltaE, null);
	assert.equal(c.equivalent, false);
});

test("阈值常量在文档所述的量级上", () => {
	assert.ok(
		EQUIVALENT_DELTA_E >= 1 && EQUIVALENT_DELTA_E <= 2,
		`阈值 ${EQUIVALENT_DELTA_E} 应落在 1..2 之间`,
	);
});
