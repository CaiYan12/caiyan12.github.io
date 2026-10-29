// 技能环 tooltip 落点契约（#123/T8 迁出后钉住迁移前 theme-script.ts 的几何：
// gap 14 / viewportPadding 12，越界翻到指针另一侧，最后夹进视口留白）。
// 期望值按迁移前公式手算成字面量，独立于实现。
import test from "node:test";
import assert from "node:assert/strict";
import { resolveTooltipPosition } from "./skills-donut-tooltip";

const viewport = { viewportWidth: 1000, viewportHeight: 800 };
const tooltip = { tooltipWidth: 200, tooltipHeight: 100 };

test("默认落在指针右下，让开 14px", () => {
	assert.deepEqual(
		resolveTooltipPosition({
			...viewport,
			...tooltip,
			clientX: 100,
			clientY: 100,
		}),
		{ left: 114, top: 114 },
	);
});

test("右侧放不下时翻到指针左侧", () => {
	// maxLeft = 1000-200-12 = 788；964 > 788 → 950-200-14 = 736
	assert.deepEqual(
		resolveTooltipPosition({
			...viewport,
			...tooltip,
			clientX: 950,
			clientY: 100,
		}),
		{ left: 736, top: 114 },
	);
});

test("下方放不下时翻到指针上方", () => {
	// maxTop = 800-100-12 = 688；794 > 688 → 780-100-14 = 666
	assert.deepEqual(
		resolveTooltipPosition({
			...viewport,
			...tooltip,
			clientX: 100,
			clientY: 780,
		}),
		{ left: 114, top: 666 },
	);
});

test("tooltip 比视口还大时以留白优先，落点不为负", () => {
	assert.deepEqual(
		resolveTooltipPosition({
			viewportWidth: 200,
			viewportHeight: 150,
			tooltipWidth: 300,
			tooltipHeight: 200,
			clientX: 150,
			clientY: 120,
		}),
		{ left: 12, top: 12 },
	);
});
