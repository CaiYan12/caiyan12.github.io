// 返回顶部单测（#118/T3）：锁可见阈值与减少动效分支。
// 阈值是 **scrollY > 200**（严格大于）：200 本身不可见，201 才可见——这条差一错误
// 是迁移最容易被顺手改坏的地方，所以正例反例都写。display 用计数型 setter 观察，
// 顺便验证「同值短路」（同状态重复触达不写样式）。
import test from "node:test";
import assert from "node:assert/strict";
import { initBackToTop } from "./back-to-top";

type Button = {
	dataset: Record<string, string>;
	style: Record<string, unknown>;
	clicks: Array<() => void>;
	writes: () => number;
	display: () => string;
	addEventListener(type: string, fn: () => void): void;
};

function makeButton(): Button {
	let display = "";
	let writes = 0;
	const style: Record<string, unknown> = {};
	Object.defineProperty(style, "display", {
		get: () => display,
		set: (value: string) => {
			display = value;
			writes++;
		},
	});
	const button: Button = {
		dataset: {},
		style,
		clicks: [],
		writes: () => writes,
		display: () => display,
		addEventListener(type, fn) {
			if (type === "click") button.clicks.push(fn);
		},
	};
	return button;
}

type Win = {
	scrollY: number;
	scrolls: Array<{ top?: number; behavior?: string }>;
	scrollListeners: Array<() => void>;
	addEventListener(type: string, fn: () => void): void;
	scrollTo(opts: { top?: number; behavior?: string }): void;
	matchMedia(): { matches: boolean };
};

function install(button: Button, reduced = false): Win {
	const win: Win = {
		scrollY: 0,
		scrolls: [],
		scrollListeners: [],
		addEventListener(type, fn) {
			if (type === "scroll") win.scrollListeners.push(fn);
		},
		scrollTo(opts) {
			win.scrolls.push(opts);
		},
		matchMedia: () => ({ matches: reduced }),
	};
	(globalThis as Record<string, unknown>).document = {
		getElementById: (id: string) => (id === "backtop" ? button : null),
	};
	(globalThis as Record<string, unknown>).window = win;
	return win;
}

const scroll = (win: Win, y: number) => {
	win.scrollY = y;
	for (const fn of win.scrollListeners) fn();
};

test("阈值严格大于 200：201 显示、200 隐藏；首屏 0 不写样式（同值短路）", () => {
	const button = makeButton();
	const win = install(button);
	initBackToTop();

	assert.equal(button.dataset.bound, "true");
	// 初始 toggle：不可见且 display 本来就是空（≠ "block"）→ 同值短路，不写
	assert.equal(button.writes(), 0);
	assert.equal(button.display(), "");

	scroll(win, 201);
	assert.equal(button.display(), "block");

	scroll(win, 200);
	assert.equal(button.display(), "none");

	// 已是 none 再触发：同值短路，写入计数不增
	const before = button.writes();
	scroll(win, 200);
	assert.equal(button.writes(), before);
});

test("点击回到顶部：常规用 smooth，减少动效分支用 auto", () => {
	const smoothButton = makeButton();
	const win = install(smoothButton);
	initBackToTop();
	smoothButton.clicks[0]();
	assert.deepEqual(win.scrolls, [{ top: 0, behavior: "smooth" }]);

	const reducedButton = makeButton();
	const reducedWin = install(reducedButton, true);
	initBackToTop();
	reducedButton.clicks[0]();
	assert.deepEqual(reducedWin.scrolls, [{ top: 0, behavior: "auto" }]);
});

test("dataset 守卫：同一按钮重复 init 不重复绑 scroll / click", () => {
	const button = makeButton();
	const win = install(button);
	initBackToTop();
	const scrollBound = win.scrollListeners.length;
	const clickBound = button.clicks.length;

	initBackToTop();
	assert.equal(win.scrollListeners.length, scrollBound);
	assert.equal(button.clicks.length, clickBound);
});

test("页面上没有 #backtop 时静默返回", () => {
	(globalThis as Record<string, unknown>).document = {
		getElementById: () => null,
	};
	(globalThis as Record<string, unknown>).window = {
		scrollY: 500,
		addEventListener: () => {},
		scrollTo: () => {},
		matchMedia: () => ({ matches: false }),
	};
	assert.doesNotThrow(() => initBackToTop());
});
