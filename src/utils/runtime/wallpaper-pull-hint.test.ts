// 发现性提示的几何与自动提示判定（票 #133；2026-11-02 按新尺寸重标底数）。
//
// 口径：只测两个纯函数的外部行为——给定盒子位置与实测宽度，它给出提示该挂哪一侧、
// 距盒左多远；给定设备能力，它给出「要不要自动提示」。不碰 DOM、不复制实现算式。
//
// 底数来自 2026-11-02 用 Playwright 在 localhost 上量到的真实值（挂件改小以后）：
// · 挂件盒 30 宽（T 恤视觉宽度），T 恤墨迹在盒内占 1.3..28.7；
// · 提示气泡实测 104 宽（"拉一下，换一张" 12px + 3/9 padding + 1px 描边）；
// · 挂件中心线压在导航右缘上，1440 视口 → 中心 1270、盒左 1255。
// 右侧放不下时的判据是「盒左 + 28.7 + 8 + 104 > 视口右 − 8」，即视口 ≲ 1340 就翻左。
import test from "node:test";
import assert from "node:assert/strict";
import {
	computeHintPlacement,
	computePlacement,
	shouldAutoHint,
} from "./wallpaper-pull";

/** 盒宽（.wpull 的 CSS 宽度 = T 恤视觉宽度） */
const W = 30;
/** 实测：T 恤墨迹在盒内的横向占位（盒左起算） */
const SHIRT = { left: 1.3, right: 28.7 };
/** 实测：提示气泡宽度 */
const HINT_W = 104;

// ---- 提示挂哪一侧 ----

test("宽视口：提示挂在 T 恤右缘之外，且整颗留在视口内", () => {
	// 1440 视口、导航右缘 1270 → 盒左 1255
	const boxLeft = 1255;
	const p = computeHintPlacement({
		boxLeft,
		widgetW: W,
		viewportW: 1440,
		hintW: HINT_W,
		shirtLeft: SHIRT.left,
		shirtRight: SHIRT.right,
	});
	assert.ok(p);
	assert.equal(p.side, "right");
	assert.equal(
		boxLeft + SHIRT.right + 8,
		boxLeft + p.left,
		"提示左缘应贴 T 恤右缘 + 8px",
	);
	assert.ok(
		boxLeft + p.left + HINT_W <= 1440 - 8,
		"提示右缘不得超出可用宽度（还要留 8px 边距）",
	);
});

test("1280：右侧放不下（T 恤已贴右缘），提示翻到左侧且不压住衣服", () => {
	// 1280 视口 → 中心 1190、盒左 1175；右侧要 1175+28.7+8+104 > 1272
	const boxLeft = 1175;
	const p = computeHintPlacement({
		boxLeft,
		widgetW: W,
		viewportW: 1280,
		hintW: HINT_W,
		shirtLeft: SHIRT.left,
		shirtRight: SHIRT.right,
	});
	assert.ok(p);
	assert.equal(p.side, "left");
	const hintLeftAbs = boxLeft + p.left;
	const hintRightAbs = hintLeftAbs + HINT_W;
	assert.equal(
		hintRightAbs,
		boxLeft + SHIRT.left - 8,
		"提示右缘应贴 T 恤左缘 - 8px",
	);
	assert.ok(hintLeftAbs >= 8, "左缘不得贴出视口");
});

test("1024 / 900 / 760：三档窄视口一律翻到左侧，且左右都在视口内", () => {
	// 盒左 = 导航右缘（被 8px 边距夹取后）− 半个盒宽
	for (const [viewportW, boxLeft] of [
		[1024, 986],
		[900, 862],
		[760, 722],
	] as const) {
		const p = computeHintPlacement({
			boxLeft,
			widgetW: W,
			viewportW,
			hintW: HINT_W,
			shirtLeft: SHIRT.left,
			shirtRight: SHIRT.right,
		});
		assert.ok(p, `${viewportW} 应能给出提示位置`);
		assert.equal(p.side, "left", `${viewportW} 应翻到左侧`);
		const hintLeftAbs = boxLeft + p.left;
		assert.ok(hintLeftAbs >= 8, `${viewportW} 提示左缘不得贴出视口`);
		assert.ok(
			hintLeftAbs + HINT_W <= viewportW - 8,
			`${viewportW} 提示右缘不得超出可用宽度`,
		);
	}
});

test("两侧都放不下（视口比提示还窄）时贴左缘兜底，宁可压住衣服也不丢字", () => {
	const boxLeft = 10;
	const p = computeHintPlacement({
		boxLeft,
		widgetW: W,
		viewportW: 150,
		hintW: HINT_W,
		shirtLeft: SHIRT.left,
		shirtRight: SHIRT.right,
	});
	assert.ok(p);
	assert.equal(p.side, "clamped");
	assert.equal(boxLeft + p.left, 8, "至少保证左缘在视口内");
});

test("测不到宽度（元素未渲染）时不给出位置，交给 CSS 兜底", () => {
	const base = {
		boxLeft: 1255,
		widgetW: W,
		viewportW: 1440,
		hintW: HINT_W,
		shirtLeft: SHIRT.left,
		shirtRight: SHIRT.right,
	};
	assert.equal(computeHintPlacement({ ...base, hintW: 0 }), null);
	assert.equal(computeHintPlacement({ ...base, widgetW: 0 }), null);
	assert.equal(computeHintPlacement({ ...base, viewportW: 0 }), null);
});

// ---- 挂件横向落点的边界（主口径的用例见 wallpaper-pull.test.ts） ----

test("视口比挂件还窄时两侧均分裁切，而不是把盒子整个推出屏外", () => {
	// 退化情形：可用宽度 100 < 盒宽 130。正式样式下不可达（≤680px 挂件隐藏），
	// 但夹取不能因此产生越界坐标：居中摆放，左右各溢出 half - viewportW/2。
	const WIDE = 130;
	const p = computePlacement({
		nav: { right: 90 },
		widgetW: WIDE,
		viewportW: 100,
	});
	assert.ok(p);
	assert.equal(p.left, 50, "中心线落在视口中线");
	const boxLeft = p.left - WIDE / 2;
	const boxRight = p.left + WIDE / 2;
	assert.ok(boxLeft < 0 && boxRight > 100, "两侧各裁一半，而不是单侧全丢");
	assert.equal(-boxLeft, boxRight - 100, "两侧裁掉的一样多");
});

test("导航右缘量到 0（异常布局）时退到「半宽 + 8」，不产生负的中心线", () => {
	// right=0 是有限值，但会把中心线算到 0 → 盒左缘 -15。夹取必须把它抬到 23。
	const p = computePlacement({
		nav: { right: 0 },
		widgetW: W,
		viewportW: 1440,
	});
	assert.ok(p);
	assert.equal(p.left, W / 2 + 8, "中心线至少退到 半宽 + 8");
	assert.ok(p.left - W / 2 >= 0, "盒左缘不得为负");
});

// ---- 自动提示判定 ----

test("粗指针且没有 hover：首次出现时自动提示", () => {
	assert.equal(
		shouldAutoHint({
			coarsePointer: true,
			hasHover: false,
			alreadyShown: false,
			visible: true,
		}),
		true,
	);
});

test("能 hover 的设备不自动提示（鼠标移上去就能发现）", () => {
	assert.equal(
		shouldAutoHint({
			coarsePointer: true,
			hasHover: true,
			alreadyShown: false,
			visible: true,
		}),
		false,
	);
});

test("细指针（桌面鼠标）不自动提示", () => {
	assert.equal(
		shouldAutoHint({
			coarsePointer: false,
			hasHover: false,
			alreadyShown: false,
			visible: true,
		}),
		false,
	);
});

test("已经弹过就不再弹（不写持久化，但同一次页面加载只提示一次）", () => {
	assert.equal(
		shouldAutoHint({
			coarsePointer: true,
			hasHover: false,
			alreadyShown: true,
			visible: true,
		}),
		false,
	);
});

test("挂件本身不可见（≤680px 那一档）时连计时都不必开", () => {
	assert.equal(
		shouldAutoHint({
			coarsePointer: true,
			hasHover: false,
			alreadyShown: false,
			visible: false,
		}),
		false,
	);
});
