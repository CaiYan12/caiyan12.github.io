// 发现性提示的几何与自动提示判定（票 #133）。
//
// 口径：只测两个纯函数的外部行为——给定盒子位置与实测宽度，它给出提示该挂哪一侧、
// 距盒左多远；给定设备能力，它给出「要不要自动提示」。不碰 DOM、不复制实现算式。
//
// 底数全部来自 Playwright 在 http://localhost:4322 量到的真实矩形
// （1440 / 1280 / 1100 / 900 / 760 五档，见票 #133 报告）：
// · 挂件盒固定 130 宽，T 恤在盒内只占 33..97，盒子右侧还有 33px 空白；
// · 提示气泡实测 106 宽，挂在**盒子**右缘 +8（即盒内 138 处）时，
//   1100 及以下整颗跑到视口外（左缘正好等于 clientWidth），1440 也溢出 9px。
// 所以提示要挂到 **T 恤右缘**：1440 下 1302+8=1310，加 106 = 1416 < 1432 刚好放得下；
// 再窄就没有右侧空间可言（T 恤被夹到距右缘 41px 处），只能翻到左侧。
import test from "node:test";
import assert from "node:assert/strict";
import {
	computeHintPlacement,
	computePlacement,
	shouldAutoHint,
} from "./wallpaper-pull";

/** 盒宽（.wpull 的 CSS 固定宽度） */
const W = 130;
/** 实测：T 恤在盒内的横向占位（盒左起算），两侧各留 33px */
const SHIRT = { left: 33, right: 97 };
/** 实测：提示气泡宽度（"拉一下，换一张" 12px + 4/10 padding + 1px 描边） */
const HINT_W = 106;

// ---- 提示挂哪一侧 ----

test("宽视口：提示挂在 T 恤右缘之外，且整颗留在视口内", () => {
	// 1440 视口、导航 1100 居中 → 盒左 1205；T 恤右缘 1302。
	// 若仍挂在盒子右缘（1205+138=1343），右缘 1449 会溢出 9px。
	const p = computeHintPlacement({
		boxLeft: 1205,
		widgetW: W,
		viewportW: 1440,
		hintW: HINT_W,
		shirtLeft: SHIRT.left,
		shirtRight: SHIRT.right,
	});
	assert.ok(p);
	assert.equal(p.side, "right");
	assert.equal(1302 + 8, 1205 + p.left, "提示左缘应贴 T 恤右缘 + 8px");
	assert.ok(
		1205 + p.left + HINT_W <= 1440 - 8,
		"提示右缘不得超出可用宽度（还要留 8px 边距）",
	);
});

test("1280：T 恤已贴着右缘，右侧放不下，提示翻到左侧且不压住衣服", () => {
	// 1280 视口 → 盒左 1125、T 恤 1158..1222；右侧要 1222+8+106=1336 > 1272
	const p = computeHintPlacement({
		boxLeft: 1125,
		widgetW: W,
		viewportW: 1280,
		hintW: HINT_W,
		shirtLeft: SHIRT.left,
		shirtRight: SHIRT.right,
	});
	assert.ok(p);
	assert.equal(p.side, "left");
	const hintLeftAbs = 1125 + p.left;
	const hintRightAbs = hintLeftAbs + HINT_W;
	assert.equal(hintRightAbs, 1158 - 8, "提示右缘应贴 T 恤左缘 - 8px");
	assert.ok(hintLeftAbs >= 8, "左缘不得贴出视口");
});

test("1100 / 900 / 760：三档窄视口一律翻到左侧，且左右都在视口内", () => {
	for (const [viewportW, boxLeft] of [
		[1100, 962],
		[900, 762],
		[760, 622],
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
	const p = computeHintPlacement({
		boxLeft: 10,
		widgetW: W,
		viewportW: 150,
		hintW: HINT_W,
		shirtLeft: SHIRT.left,
		shirtRight: SHIRT.right,
	});
	assert.ok(p);
	assert.equal(p.side, "clamped");
	assert.equal(10 + p.left, 8, "至少保证左缘在视口内");
});

test("测不到宽度（元素未渲染）时不给出位置，交给 CSS 兜底", () => {
	const base = {
		boxLeft: 1205,
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

// ---- 窄屏夹取的边界补充（票面「复核并加强现有夹取」） ----

test("视口比挂件还窄时两侧均分裁切，而不是把盒子整个推出屏外", () => {
	// 退化情形：可用宽度 100 < 盒宽 130。正式样式下不可达（≤680px 挂件隐藏），
	// 但夹取不能因此产生越界坐标：居中摆放，左右各溢出 half - viewportW/2。
	const p = computePlacement({
		nav: { right: 90, top: 45 },
		title: null,
		widgetW: W,
		viewportW: 100,
	});
	assert.ok(p);
	assert.equal(p.left, 50, "中心线落在视口中线");
	const boxLeft = p.left - W / 2;
	const boxRight = p.left + W / 2;
	assert.ok(boxLeft < 0 && boxRight > 100, "两侧各裁一半，而不是单侧全丢");
	assert.equal(-boxLeft, boxRight - 100, "两侧裁掉的一样多");
});

test("导航右缘贴到 0（异常布局）时也按最小中心线兜底，不产生负坐标", () => {
	const p = computePlacement({
		nav: { right: 0, top: 45 },
		title: null,
		widgetW: W,
		viewportW: 1440,
	});
	assert.ok(p);
	assert.equal(p.left, W / 2 + 8, "中心线至少退到 半宽 + 8");
	assert.ok(p.left - W / 2 >= 0, "盒左缘不得为负");
});
