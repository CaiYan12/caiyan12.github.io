// scripts/lib/style-diff-visibility.mjs 的契约测试。
//
// 为什么要有单测：这套判定规则决定「一条差异算不算回归」。规则错了有两种后果——
// 把真回归放过去（门禁废掉），或把不渲染的差异当成回归（让人去改本来正确的样式）。
// 两种都只有靠单测钉住，23 页采集跑完再肉眼看输出是发现不了的。
import test from "node:test";
import assert from "node:assert/strict";
import {
	boxShadowRendersSame,
	composeTransform,
	diffElementLines,
	isVisuallyHidden,
	judgePropertyDiff,
	parseStyleSegment,
} from "./style-diff-visibility.mjs";

const props = (obj) => new Map(Object.entries(obj));

test("样式串按 prop=value 解析，伪元素前缀不污染属性表", () => {
	const m = parseStyleSegment("color=rgb(1, 2, 3);font-size=13px");
	assert.equal(m.get("color"), "rgb(1, 2, 3)");
	assert.equal(m.get("font-size"), "13px");
	const p = parseStyleSegment('::before;content="";color=red');
	assert.equal(p.get("content"), '""');
	assert.equal(p.has("::before"), false);
});

test("边框宽度为零时边框颜色变化不渲染", () => {
	const v = judgePropertyDiff(
		"border-top-color",
		"rgb(229, 231, 235)",
		"rgb(0, 0, 0)",
		props({ "border-top-width": "0px", "border-top-style": "solid" }),
		props({ "border-top-width": "0px", "border-top-style": "solid" }),
	);
	assert.equal(v.visible, false);
	assert.match(v.reason, /不参与渲染/u);
});

test("边框宽度非零时边框颜色变化是可见的", () => {
	const v = judgePropertyDiff(
		"border-top-color",
		"rgb(229, 231, 235)",
		"rgb(0, 192, 0)",
		props({ "border-top-width": "1px", "border-top-style": "solid" }),
		props({ "border-top-width": "1px", "border-top-style": "solid" }),
	);
	assert.equal(v.visible, true);
});

test("border-style:none 即便宽度非零也不渲染（浏览器把宽度读成 0px）", () => {
	const v = judgePropertyDiff(
		"border-top-color",
		"rgb(1, 2, 3)",
		"rgb(4, 5, 6)",
		props({ "border-top-width": "1px", "border-top-style": "none" }),
		props({ "border-top-width": "1px", "border-top-style": "none" }),
	);
	assert.equal(v.visible, false);
});

test("transform 属性不同但有效矩阵相同 → 不渲染（v3 transform 与 v4 独立属性）", () => {
	// v3: transform: matrix(...rotate 10deg...)；v4: transform:none + rotate:10deg
	const v = judgePropertyDiff(
		"transform",
		"matrix(0.984808, 0.173648, -0.173648, 0.984808, 0, 0)",
		"none",
		props({
			transform: "matrix(0.984808, 0.173648, -0.173648, 0.984808, 0, 0)",
			translate: "none",
			rotate: "none",
			scale: "none",
		}),
		props({
			transform: "none",
			translate: "none",
			rotate: "10deg",
			scale: "none",
		}),
	);
	assert.equal(v.visible, false, "合成后矩阵相同就不该报可见差异");
});

test("有效矩阵真的不同则算可见", () => {
	const v = judgePropertyDiff(
		"transform",
		"none",
		"none",
		props({
			transform: "none",
			translate: "none",
			rotate: "none",
			scale: "none",
		}),
		props({
			transform: "none",
			translate: "none",
			rotate: "30deg",
			scale: "none",
		}),
	);
	assert.equal(v.visible, true);
});

test("合成顺序是 translate·rotate·scale·transform（与浏览器实测逐位一致）", () => {
	const m = composeTransform(
		props({
			transform: "none",
			translate: "5px",
			rotate: "10deg",
			scale: "none",
		}),
	);
	assert.ok(m, "应能合成");
	const expect = [0.984808, 0.173648, -0.173648, 0.984808, 5, 0];
	for (let i = 0; i < 6; i++)
		assert.ok(
			Math.abs(m[i] - expect[i]) < 1e-5,
			`第 ${i} 项应为 ${expect[i]}，实际 ${m[i]}`,
		);
});

test("视觉隐藏：clip-path inset(50%) 与 clip rect(0,0,0,0) 都算隐藏", () => {
	assert.equal(isVisuallyHidden(props({ "clip-path": "inset(50%)" })), true);
	assert.equal(
		isVisuallyHidden(props({ clip: "rect(0px, 0px, 0px, 0px)" })),
		true,
	);
	assert.equal(isVisuallyHidden(props({ "clip-path": "none" })), false);
});

test("被视觉隐藏的元素上的几何变化不渲染", () => {
	const v = judgePropertyDiff(
		"margin-top",
		"-1px",
		"0px",
		props({ "clip-path": "inset(50%)" }),
		props({ "clip-path": "inset(50%)" }),
	);
	assert.equal(v.visible, false);
});

test("圆角被尺寸钳制后相同 → 不渲染（9999px 与 3.35544e+07px 都是整圆）", () => {
	const v = judgePropertyDiff(
		"border-radius",
		"9999px",
		"3.35544e+07px",
		props({ width: "42px", height: "42px" }),
		props({ width: "42px", height: "42px" }),
	);
	assert.equal(v.visible, false);
});

test("box-shadow 只有全透明层数量不同 → 不渲染", () => {
	const a =
		"rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(74, 63, 46, 0.06) 2px 3px 0px 0px";
	const b =
		"rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(74, 63, 46, 0.06) 2px 3px 0px 0px";
	assert.equal(boxShadowRendersSame(a, b), true);
	assert.equal(
		boxShadowRendersSame(a, "rgba(1, 2, 3, 0.5) 1px 1px 0 0"),
		false,
	);
});

test("只比较两侧都有的属性：采集清单变更不应凭空造出差异", () => {
	const oldLine = "p | body:1 | color=red;font-size=13px";
	const newLine =
		"p | body:1 | color=red;font-size=13px;clip-path=inset(50%)";
	const diffs = diffElementLines(oldLine, newLine);
	assert.equal(diffs.length, 0, "一侧缺的属性不算差异");
});

test("两侧都有的属性变了才算差异，且带上门控理由", () => {
	const a =
		"p | body:1 | color=red;border-top-width=0px;border-top-style=solid";
	const b =
		"p | body:1 | color=blue;border-top-width=0px;border-top-style=solid";
	const diffs = diffElementLines(a, b);
	assert.equal(diffs.length, 1);
	assert.equal(diffs[0].prop, "color");
});

test("translate / rotate / scale 也按有效矩阵判定，不落默认分支", () => {
	// v3: transform:matrix(1,0,0,1,0,-7)；v4: translate:0px -7px
	// 合成后是同一个矩阵，必须判为不渲染——否则 Tailwind v4 的独立属性
	// 会被误报成「变换消失了」。
	const a = props({
		transform: "matrix(1, 0, 0, 1, 0, -7)",
		translate: "none",
		rotate: "none",
		scale: "none",
	});
	const b = props({
		transform: "none",
		translate: "0px -7px",
		rotate: "none",
		scale: "none",
	});
	for (const prop of ["transform", "translate"]) {
		const v = judgePropertyDiff(prop, "none", "none", a, b);
		assert.equal(v.visible, false, `${prop} 不该判成可见`);
	}
});

test("rotate 属性单独变化时按合成矩阵判定", () => {
	// v3: transform 里有旋转；v4: rotate 独立属性
	const a = props({
		transform: "matrix(0.984808, 0.173648, -0.173648, 0.984808, 0, 0)",
		translate: "none",
		rotate: "none",
		scale: "none",
	});
	const b = props({
		transform: "none",
		translate: "none",
		rotate: "10deg",
		scale: "none",
	});
	const v = judgePropertyDiff("rotate", "none", "10deg", a, b);
	assert.equal(v.visible, false);
});
