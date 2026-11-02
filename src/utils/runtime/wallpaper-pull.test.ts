// 挂件定位的纯几何单测（票 #128）。
//
// 口径：只测 computePlacement 的外部行为——给定矩形与盒宽，它给出中心线 x 与绳长。
// 不断言 DOM、不断言 CSS 变量名、不复制实现里的算式。
//
// 两条真实约束（来自全局布局，不是拍的）：
// · 1440 视口、站点固定 10px 滚动条下，#head-nav 1100 宽居中 → 右缘 1265；
// · 1100 视口下导航变 calc(100% - 40px)，右缘逼近视口右缘，中心线对齐会把
//   T 恤推出屏外 —— 此时必须主动左移，这正是票面「被裁时主动计算位移」。
import test from "node:test";
import assert from "node:assert/strict";
import { computePlacement } from "./wallpaper-pull";

const W = 130; // 组件盒宽

/** 构造只读测试用的矩形（DOMRectLike 只要 top/right） */
const rect = (right: number, top = 45) => ({ right, top });

test("导航缺失时不摆位（交给 CSS 兜底值）", () => {
	assert.equal(
		computePlacement({
			nav: null,
			title: null,
			widgetW: W,
			viewportW: 1440,
		}),
		null,
	);
});

test("宽视口：中心线正好落在导航右缘，不做额外位移", () => {
	// 1440 视口扣 10px 滚动条 = 1430 可用；导航 1100 居中 → 右缘 1265
	const p = computePlacement({
		nav: rect(1265),
		title: rect(1265, 45),
		widgetW: W,
		viewportW: 1430,
	});
	// drop 要让**衣服底边**落到标题顶边：SVG 顶端钉在 y=0、衣服固有底边在 158，
	// 所以 title.top=45 时名义位移为负 → 夹到 0（挂件贴顶，衣服底边落在 158）
	assert.deepEqual(p, { left: 1265, drop: 0 });
});

test("装着会右溢时整体左移，右缘距视口右至少留出空隙", () => {
	// 1100 视口扣 10px = 1090 可用；导航 calc(100%-40px) → 右缘 1070
	// 中心线若对齐 1070，右缘 = 1070 + 65 = 1135 > 1090，必须左移
	const p = computePlacement({
		nav: rect(1070),
		title: rect(1070, 45),
		widgetW: W,
		viewportW: 1090,
	});
	assert.ok(p);
	assert.equal(
		p.left,
		1090 - W / 2 - 8,
		"中心线应退到可用宽度减半宽再留 8px",
	);
	// 位移结果必须让整件挂件在视口内
	assert.ok(p.left + W / 2 <= 1090, "右缘不得超出视口");
});

test("夹取只在会溢出时生效：差一点点溢出也要收", () => {
	const justOver = computePlacement({
		nav: rect(1000),
		title: null,
		widgetW: W,
		viewportW: 1000, // 中心线对齐 1000 → 右缘 1065，明显溢出
	});
	assert.ok(justOver);
	assert.equal(justOver.left, 1000 - W / 2 - 8);

	// 恰好放得下（中心线 + 半宽 + 8 == 可用宽度）时不应再左移
	const fits = computePlacement({
		nav: rect(867),
		title: null,
		widgetW: W,
		viewportW: 1000, // 867 + 65 + 8 = 940 <= 1000
	});
	assert.ok(fits);
	assert.equal(fits.left, 867, "放得下时保持与导航右缘对齐");
});

test("绳长让**衣服底边**对齐标题顶边（不是衣服顶端对齐）", () => {
	// 契约原文（票 #128 / spec 故事 3）：衣服底边与桌面头部标题顶边齐平。
	// 衣服在 SVG 内固有占 y∈[74,158]，SVG 顶端钉在视口 y=0，
	// 所以要让底边落到 title.top，名义位移必须是 title.top − 158。
	const SHIRT_BOTTOM = 158;

	// 标题顶边在衣服固有位置之下：需要真实下移
	assert.equal(
		computePlacement({
			nav: rect(1265),
			title: rect(1265, 400),
			widgetW: W,
			viewportW: 1430,
		})?.drop,
		400 - SHIRT_BOTTOM,
	);

	// 标题顶边在衣服固有位置之上：夹到 0，挂件贴顶、不向上拉出视口
	assert.equal(
		computePlacement({
			nav: rect(1265),
			title: rect(1265, 45),
			widgetW: W,
			viewportW: 1430,
		})?.drop,
		0,
	);

	// 标题缺失（独立壳等）：同样贴顶
	assert.equal(
		computePlacement({
			nav: rect(1265),
			title: null,
			widgetW: W,
			viewportW: 1430,
		})?.drop,
		0,
	);
});

test("衣服底边落点 = drop + 衣服固有底边，等价于标题顶边（可直接算回去）", () => {
	const SHIRT_BOTTOM = 158;
	for (const titleTop of [45, 300, 500]) {
		const drop =
			computePlacement({
				nav: rect(1265),
				title: rect(1265, titleTop),
				widgetW: W,
				viewportW: 1430,
			})?.drop ?? Number.NaN;
		const bottom = drop + SHIRT_BOTTOM;
		// 只有当不吃夹取、不贴顶时，底边才严格等于标题顶边
		if (titleTop >= SHIRT_BOTTOM) {
			assert.equal(
				bottom,
				titleTop,
				`titleTop=${titleTop} 时衣服底边应与标题顶边齐平`,
			);
		}
	}
});

test("标题顶边为负（滚过头部）时不产生负绳长", () => {
	const p = computePlacement({
		nav: rect(1265),
		title: rect(1265, -30),
		widgetW: W,
		viewportW: 1430,
	});
	assert.equal(p?.drop, 0, "负值要夹到 0，否则会把衣服拽到视口外");
});
