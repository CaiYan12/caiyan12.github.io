// 下拉拖拽几何的单测（票 #130 T3）。
//
// 缝隙：`wallpaper-pull-drag.ts` 的纯函数——给定「这一帧指针位移」与「当前伸展量」，
// 外部可观察的结果只有数字：是否进入拖动、伸展多少像素、松手是否够阈值。
// 不测 DOM、不测事件监听、不测 CSS 变量名。
import test from "node:test";
import assert from "node:assert/strict";
import {
	isDragStarted,
	isPullPastThreshold,
	PULL_THRESHOLD,
	resolvePull,
} from "./wallpaper-pull-drag";

// ---- 死区 ----

test("死区内不进入拖动：轻微手抖不算拖动", () => {
	assert.equal(isDragStarted(1, 1), false, "1px 抖动不该算拖动");
	assert.equal(isDragStarted(2, 2), false, "斜向 2.8px 抖动不该算拖动");
});

test("越过死区才进入拖动", () => {
	assert.equal(isDragStarted(4, 0), true);
	assert.equal(isDragStarted(0, 4), true);
});

// ---- 伸展裁剪：只吃向下 ----

test("向上与横向位移不伸展", () => {
	assert.equal(resolvePull({ dx: 0, dy: -60 }).pull, 0, "向上不该伸展");
	assert.equal(resolvePull({ dx: 80, dy: 0 }).pull, 0, "纯横向不该伸展");
	assert.equal(resolvePull({ dx: 60, dy: -40 }).pull, 0, "斜向上不该伸展");
});

test("向下位移按原样换算成伸展，且随距离单调不减", () => {
	const values = [10, 30, 60, 90].map(
		(dy) => resolvePull({ dx: 0, dy }).pull,
	);
	assert.deepEqual(values, [10, 30, 60, 90]);
	for (let i = 1; i < values.length; i++) {
		assert.ok(
			values[i]! >= values[i - 1]!,
			`伸展必须单调不减：${values[i - 1]} → ${values[i]}`,
		);
	}
});

// ---- 伸展裁剪：上限与橡皮筋 ----

test("未超上限时伸展等于位移（不提前打折）", () => {
	const { pull, atLimit } = resolvePull({ dx: 0, dy: 100 });
	assert.equal(pull, 100);
	assert.equal(atLimit, false, "没到上限不算触顶");
});

test("超出上限的部分只给极小弹性，DOM 位移不会无限增长", () => {
	const atLimit = resolvePull({ dx: 0, dy: 130 });
	const over = resolvePull({ dx: 0, dy: 500 });
	const further = resolvePull({ dx: 0, dy: 5000 });

	assert.equal(atLimit.pull, 130, "恰好到上限时仍等于位移");
	assert.equal(atLimit.atLimit, true, "到上限即触顶");

	// 橡皮筋：超出部分按固定比例换算，而不是原样跟手
	const overshoot = over.pull - 130;
	assert.ok(
		overshoot > 0,
		"超出上限仍然要有一点点位移，给出「拉到头了」的反馈",
	);
	assert.ok(overshoot < 20, `超出部分的位移必须极小，实测 ${overshoot}px`);
	assert.ok(further.pull > over.pull, "极端下拉仍应略有增长，不是硬钳死");
});

test("伸长的弹性上界是收敛的：再拉 10 倍也只多几像素", () => {
	const over = resolvePull({ dx: 0, dy: 500 }).pull;
	const further = resolvePull({ dx: 0, dy: 5000 }).pull;
	const growth = further - over;
	assert.ok(
		growth > 0 && growth < 10,
		`10 倍位移只该多几像素，实测 ${growth}px`,
	);
});

// ---- 阈值 ----

test("阈值边界：恰好等于阈值算达成", () => {
	assert.equal(isPullPastThreshold(PULL_THRESHOLD - 1), false, "差 1px 不算");
	assert.equal(
		isPullPastThreshold(PULL_THRESHOLD),
		true,
		"恰好等于阈值算达成",
	);
	assert.equal(isPullPastThreshold(PULL_THRESHOLD + 1), true);
	assert.equal(isPullPastThreshold(0), false);
});
