// 阅读进度驱动单测（#118/T3）：锁三条契约——
// 1) 进度值只算一次，写全部 [data-reading-progress] 目标（顶部条与侧栏条同源同值）；
// 2) 比例钳制在 [0,1]，文档不比视口高（maxScroll ≤ 0）时按 0 处理；
// 3) 监听全站只绑一组（scroll + resize），重入不翻倍；同一帧内多次请求只排一帧。
// 桩只实现 document.documentElement 尺寸、querySelectorAll 与 window.scrollY；
// requestAnimationFrame 收进队列由测试手动 flush，节流才可观察。
import test from "node:test";
import assert from "node:assert/strict";
import {
	initReadingProgress,
	scheduleReadingProgressUpdate,
} from "./reading-progress";

type Bar = {
	style: { transform: string };
	attrs: Map<string, string>;
	setAttribute(name: string, value: string): void;
};

function makeBar(): Bar {
	const attrs = new Map<string, string>();
	return {
		style: { transform: "" },
		attrs,
		setAttribute: (name, value) => void attrs.set(name, value),
	};
}

const frames: FrameRequestCallback[] = [];
(globalThis as Record<string, unknown>).requestAnimationFrame = (
	cb: FrameRequestCallback,
) => {
	frames.push(cb);
	return frames.length;
};

function flush() {
	for (const cb of frames.splice(0)) cb(0);
}

type Options = {
	scrollY: number;
	scrollHeight: number;
	clientHeight: number;
	bars: Bar[];
	listened?: string[];
};

function install({
	scrollY,
	scrollHeight,
	clientHeight,
	bars,
	listened,
}: Options) {
	(globalThis as Record<string, unknown>).document = {
		documentElement: { scrollHeight, clientHeight },
		querySelectorAll: () => bars,
	};
	(globalThis as Record<string, unknown>).window = {
		scrollY,
		addEventListener: (type: string) => listened?.push(type),
	};
}

test("两个目标同源同值：250/1000 → scaleX(0.25)，aria-valuenow=25", () => {
	const top = makeBar();
	const side = makeBar();
	install({
		scrollY: 250,
		scrollHeight: 2000,
		clientHeight: 1000,
		bars: [top, side],
	});
	scheduleReadingProgressUpdate();
	flush();

	assert.equal(top.style.transform, "scaleX(0.25)");
	assert.equal(side.style.transform, "scaleX(0.25)");
	assert.equal(top.attrs.get("aria-valuenow"), "25");
	assert.equal(side.attrs.get("aria-valuenow"), "25");
});

test("比例钳制：超出底部取 1，负滚动取 0", () => {
	const bar = makeBar();
	install({
		scrollY: 5000,
		scrollHeight: 2000,
		clientHeight: 1000,
		bars: [bar],
	});
	scheduleReadingProgressUpdate();
	flush();
	assert.equal(bar.style.transform, "scaleX(1)");
	assert.equal(bar.attrs.get("aria-valuenow"), "100");

	install({
		scrollY: -50,
		scrollHeight: 2000,
		clientHeight: 1000,
		bars: [bar],
	});
	scheduleReadingProgressUpdate();
	flush();
	assert.equal(bar.style.transform, "scaleX(0)");
	assert.equal(bar.attrs.get("aria-valuenow"), "0");
});

test("文档不比视口高（maxScroll ≤ 0）按 0 处理，不做除零", () => {
	const bar = makeBar();
	install({
		scrollY: 0,
		scrollHeight: 700,
		clientHeight: 900,
		bars: [bar],
	});
	scheduleReadingProgressUpdate();
	flush();
	assert.equal(bar.style.transform, "scaleX(0)");
	assert.equal(bar.attrs.get("aria-valuenow"), "0");
});

test("当页没有进度条时直接返回（空 NodeList 不抛错）", () => {
	install({
		scrollY: 250,
		scrollHeight: 2000,
		clientHeight: 1000,
		bars: [],
	});
	scheduleReadingProgressUpdate();
	flush();
	assert.equal(frames.length, 0);
});

test("同一帧内连续请求只排一帧", () => {
	install({
		scrollY: 100,
		scrollHeight: 2000,
		clientHeight: 1000,
		bars: [makeBar()],
	});
	scheduleReadingProgressUpdate();
	scheduleReadingProgressUpdate();
	assert.equal(frames.length, 1);
	flush();
});

test("重入 init 不重复绑监听；换页后新节点仍由同一驱动写入", () => {
	const listened: string[] = [];
	const bars = [makeBar()];
	install({
		scrollY: 500,
		scrollHeight: 2000,
		clientHeight: 1000,
		bars,
		listened,
	});
	initReadingProgress();
	initReadingProgress();
	flush();

	assert.deepEqual(listened, ["scroll", "resize"]);
	assert.equal(bars[0].style.transform, "scaleX(0.5)");

	// 模拟换页：同一驱动指向新节点（新对象），再排一帧即被写入
	const nextBar = makeBar();
	(globalThis as Record<string, unknown>).document = {
		documentElement: { scrollHeight: 2000, clientHeight: 1000 },
		querySelectorAll: () => [nextBar],
	};
	(globalThis as Record<string, unknown>).window = {
		scrollY: 1000,
		addEventListener: () => {},
	};
	initReadingProgress();
	flush();
	assert.equal(nextBar.style.transform, "scaleX(1)");
});
