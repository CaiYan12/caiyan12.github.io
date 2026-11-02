// 换图候选尝试记账的单测（票 #132 T5「失败与边界」）。
//
// 缝隙：`wallpaper-pull-attempts.ts` 的纯函数——给定「本次操作的候选列表」与一个
// 可注入的「试着加载它」函数，外部可观察的结果只有两件事：
//   1. 每个候选被加载了几次（票面硬约束：每个候选本次操作内最多一次）；
//   2. 操作最终落在哪一档（换成了一张 / 全部用尽）。
// 不测 DOM、不测 Image、不测计时器实现——超时只以「这一次尝试被判定为超时」出现。
import test from "node:test";
import assert from "node:assert/strict";
import {
	isTimeoutAttempt,
	runAttempts,
	type TryLoadResult,
} from "./wallpaper-pull-attempts";

const A = "https://example.test/images/bg/a.jpg";
const B = "https://example.test/images/bg/b.jpg";
const C = "https://example.test/images/bg/c.jpg";

/** 按候选地址记下每次尝试，供断言「试了哪些、各试几次」 */
function recorder(results: Record<string, TryLoadResult>): {
	calls: string[];
	tryLoad: (url: string) => Promise<TryLoadResult>;
} {
	const calls: string[] = [];
	return {
		calls,
		async tryLoad(url) {
			calls.push(url);
			// 没登记结果的地址当作「加载失败」，避免测试悄悄依赖默认值
			return results[url] ?? "failed";
		},
	};
}

test("第一个候选可用：直接换成它，后续候选一次都不碰", async () => {
	const { calls, tryLoad } = recorder({ [A]: "ok" });

	const report = await runAttempts([A, B, C], tryLoad);

	assert.deepEqual(report, { status: "changed", url: A });
	assert.deepEqual(calls, [A], "换成之后不得继续试别的候选");
});

test("每个候选本次操作内最多尝试一次：重复地址不会被再试", async () => {
	// 池里同一张图写了两遍（候选模块已去重，但记账本身也不许靠上游保证）
	const { calls, tryLoad } = recorder({ [A]: "failed", [B]: "ok" });

	const report = await runAttempts([A, A, B], tryLoad);

	assert.deepEqual(report, { status: "changed", url: B });
	assert.deepEqual(
		calls,
		[A, B],
		"同一个地址只许试一次；试完失败就换下一个，不得回头重试",
	);
});

test("换用尚未尝试过的候选：前一张失败后继续往后试", async () => {
	const { calls, tryLoad } = recorder({
		[A]: "failed",
		[B]: "failed",
		[C]: "ok",
	});

	const report = await runAttempts([A, B, C], tryLoad);

	assert.deepEqual(report, { status: "changed", url: C });
	assert.deepEqual(calls, [A, B, C], "应按顺序一路试到第一张可用的");
});

test("全部候选失败：返回失败（exhausted），且调用方无从得知任何「换成了」的地址", async () => {
	const { calls, tryLoad } = recorder({
		[A]: "failed",
		[B]: "failed",
		[C]: "failed",
	});

	const report = await runAttempts([A, B, C], tryLoad);

	// 失败结果里**没有 url 字段**：调用方拿不到可提交的地址，
	// 也就不可能把当前背景改成一个不可用的地址（票面：背景保持不变）。
	assert.deepEqual(report, { status: "exhausted" });
	assert.equal("url" in report, false, "失败结果不得携带任何地址");
	assert.deepEqual(calls, [A, B, C], "每个候选恰好试一次，不多不少");
	assert.equal(calls.length, 3, "三次尝试之后必须收手，不得重试");
});

test("空候选列表：立即失败，一次也不试（无候选与失败是不同环节）", async () => {
	const { calls, tryLoad } = recorder({});

	const report = await runAttempts([], tryLoad);

	assert.deepEqual(report, { status: "exhausted" });
	assert.deepEqual(calls, [], "没有候选时不该发起任何加载");
});

test("候选全部超时：与失败同样收口为 exhausted（超时按失败处理）", async () => {
	const { calls, tryLoad } = recorder({ [A]: "timeout", [B]: "timeout" });

	const report = await runAttempts([A, B], tryLoad);

	assert.deepEqual(report, { status: "exhausted" });
	assert.deepEqual(calls, [A, B], "超时之后换下一个候选，而不是原地重试");
});

test("超时与失败分成两档，但都算「没换成」", async () => {
	assert.equal(isTimeoutAttempt("timeout"), true, "timeout 必须可被单独识别");
	assert.equal(isTimeoutAttempt("failed"), false, "加载失败不是超时");
	assert.equal(isTimeoutAttempt("ok"), false, "成功更不是超时");

	// 混合失败与超时：结局与「全失败」一致（对访客都是「加载失败」）
	const { tryLoad } = recorder({
		[A]: "timeout",
		[B]: "failed",
		[C]: "timeout",
	});
	assert.deepEqual(await runAttempts([A, B, C], tryLoad), {
		status: "exhausted",
	});
});

test("加载器抛错按失败收口，不会让整笔事务卡住", async () => {
	const calls: string[] = [];
	const report = await runAttempts([A, B], async (url) => {
		calls.push(url);
		if (url === A) throw new Error("boom");
		return "ok";
	});

	assert.deepEqual(report, { status: "changed", url: B });
	assert.deepEqual(calls, [A, B], "抛错之后仍应换用下一个候选");
});
