// 挂件定位的纯几何单测（票 #128）。
//
// 口径：只测 computePlacement 的外部行为——给定导航右缘、盒宽与视口宽度，
// 它给出中心线 x。不断言 DOM、不断言 CSS 变量名、不复制实现里的算式。
//
// 横向锚点是站长两次确认的硬口径：**中心线压在主导航右缘**（GLOSSARY.md
// 「拉绳壁纸挂件」）。所以它跟着导航宽度走（1100 居中 / calc(100% - 40px)
// 两档都得跟），不是视口百分比定位；导航缺失时才退回兜底比例。
import test from "node:test";
import assert from "node:assert/strict";
import { computePlacement } from "./wallpaper-pull";

const W = 30; // 挂件盒宽 = T 恤视觉宽度
/** 构造只读测试用的矩形（DOMRectLike 只要 right） */
const rect = (right: number) => ({ right });

test("视口宽度无效时不摆位（交给 CSS 兜底值）", () => {
	for (const viewportW of [0, -1, Number.NaN]) {
		assert.equal(
			computePlacement({ nav: rect(1000), widgetW: W, viewportW }),
			null,
		);
	}
});

test("宽视口：中心线正好落在导航右缘，不做额外位移", () => {
	// 1440 视口扣 10px 滚动条 = 1430 可用；导航 1100 居中 → 右缘 1265
	const p = computePlacement({
		nav: rect(1265),
		widgetW: W,
		viewportW: 1430,
	});
	assert.deepEqual(p, { left: 1265 });
});

test("跟着导航右缘走，不是固定视口百分比", () => {
	// 同一个视口、两个不同的导航宽度：落点必须跟着右缘变。
	// （1024 那档导航是 calc(100% - 40px)，右缘已贴视口边，会被夹取；
	//   夹取本身另有用例，这里只验「锚点跟着导航」这件事。）
	const viewportW = 1440;
	const narrow = computePlacement({ nav: rect(1100), widgetW: W, viewportW });
	const wide = computePlacement({ nav: rect(1300), widgetW: W, viewportW });
	assert.ok(narrow && wide);
	assert.equal(narrow.left, 1100);
	assert.equal(wide.left, 1300);
	assert.notEqual(narrow.left, wide.left, "导航变宽，落点必须跟着变");
});

test("会右溢时整体左移，右缘距视口右至少留出空隙", () => {
	// 导航右缘已经贴到视口右缘（1000）：中心线若照抄，盒右缘 1015 会出屏
	const p = computePlacement({
		nav: rect(1000),
		widgetW: W,
		viewportW: 1000,
	});
	assert.ok(p);
	assert.equal(
		p.left,
		1000 - W / 2 - 8,
		"中心线应退到可用宽度减半宽再留 8px",
	);
	assert.ok(p.left + W / 2 <= 1000, "右缘不得超出视口");
	// 恰好放得下时不该再左移
	const fits = computePlacement({
		nav: rect(900),
		widgetW: W,
		viewportW: 1000,
	});
	assert.ok(fits);
	assert.equal(fits.left, 900, "放得下时保持与导航右缘对齐");
});

test("导航缺失时返回 null：落点交给 CSS 的 min() 兜底，不另立一套口径", () => {
	// 独立壳 / 导航 display:none：运行时最后会「撤掉 --wpull-left」，
	// 由 global.css 里那条由 --nav-w / --nav-side 算出的 min() 决定位置。
	// 这里若再给一个视口百分比近似，两套口径就会在首帧与落定之间打架。
	assert.equal(
		computePlacement({ nav: null, widgetW: W, viewportW: 1440 }),
		null,
	);
});

test("导航里量到 NaN（异常布局）时同样返回 null，不产生 NaN 坐标", () => {
	assert.equal(
		computePlacement({
			nav: rect(Number.NaN),
			widgetW: W,
			viewportW: 1440,
		}),
		null,
	);
});

test("视口比挂件还窄时两侧均分裁切，而不是把盒子整个推出屏外", () => {
	// 退化情形：可用宽度 20 < 盒宽 30。正式样式下不可达（≤680px 挂件隐藏），
	// 但夹取不能因此产生越界坐标：居中摆放，左右各溢出 half - viewportW/2。
	const viewportW = 20;
	const p = computePlacement({ nav: rect(20), widgetW: W, viewportW });
	assert.ok(p);
	assert.equal(p.left, viewportW / 2, "中心线落在视口中线");
	const boxLeft = p.left - W / 2;
	const boxRight = p.left + W / 2;
	assert.ok(
		boxLeft < 0 && boxRight > viewportW,
		"两侧各裁一半，而不是单侧全丢",
	);
	assert.equal(-boxLeft, boxRight - viewportW, "两侧裁掉的一样多");
});

test("返回值只有 left：垂直方向不是运行时算出来的量", () => {
	const p = computePlacement({
		nav: rect(1265),
		widgetW: W,
		viewportW: 1430,
	});
	assert.ok(p);
	assert.deepEqual(Object.keys(p), ["left"]);
});
