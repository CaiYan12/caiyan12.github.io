// 「减少动效」单一判定点的契约单测（票 #134 T7 补，判定点本体来自 #117/T2）。
//
// 缝隙：`prefersReducedMotion()` 这一个函数。外部可观察的东西只有三件——
// 返回值、**每次调用是否重新查询**、以及模块加载阶段是否碰了 `window`。
//
// 为什么非测不可：
// · 语义是「每次调用即时查询」：用户可以在会话中途改系统设置，把 `.matches`
//   缓存成模块级常量或一次性闭包会让挂件在改了设置后继续按旧偏好动；
// · 该模块被 node 单测直接 import，模块顶层一旦接触浏览器全局就会在导入时抛错。
//
// 口径：不 mock 模块内部，只替换 `window` 这个宿主对象；用动态 import 才能观察
// 「加载阶段有没有查询」——静态 import 会被提升到测试体之前执行。
import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";

type Query = { matches: boolean };

/** 装一个可变的 window；`calls` 记录真实的 matchMedia 查询次数 */
function installWindow(matches: boolean) {
	const state = { matches, calls: 0 };
	const g = globalThis as unknown as Record<string, unknown>;
	g.window = {
		matchMedia(query: string): Query {
			state.calls += 1;
			// 只认这一条查询：判定点写错媒体特性会在这里被抓住
			assert.equal(
				query,
				"(prefers-reduced-motion: reduce)",
				"查询的媒体特性必须是 reduce 那一条",
			);
			return { matches: state.matches };
		},
	};
	return state;
}

beforeEach(() => {
	const g = globalThis as unknown as Record<string, unknown>;
	delete g.window;
});

test("模块加载阶段不查询、不接触 window（node 环境可安全 import）", async () => {
	const state = installWindow(false);

	const { prefersReducedMotion } = await import("./reduced-motion");

	assert.equal(
		state.calls,
		0,
		"模块顶层不得求值媒体查询——那等于把偏好缓存成加载时的常量",
	);
	assert.equal(typeof prefersReducedMotion, "function");
	prefersReducedMotion();
	assert.equal(state.calls, 1, "真正的查询发生在调用时");
});

test("每次调用即时查询：会话中途改偏好，下一次调用立即跟着变", async () => {
	const state = installWindow(false);
	const { prefersReducedMotion } = await import("./reduced-motion");

	assert.equal(prefersReducedMotion(), false);

	// 用户改了系统设置（不重新加载、不重新 import）
	state.matches = true;
	assert.equal(
		prefersReducedMotion(),
		true,
		"缓存成模块常量会让这里仍然返回 false",
	);

	state.matches = false;
	assert.equal(prefersReducedMotion(), false, "关掉偏好也要立刻生效");
	assert.equal(state.calls, 3, "三次调用对应三次真实查询");
});

test("window 也在调用时现取：导入后替换宿主对象仍然生效", async () => {
	installWindow(false);
	const { prefersReducedMotion } = await import("./reduced-motion");

	const replaced = installWindow(true);
	assert.equal(
		prefersReducedMotion(),
		true,
		"模块顶层若捕获了 window 引用，这里会读到被替换掉的旧宿主",
	);
	assert.equal(replaced.calls, 1);
});

test("返回值就是当前匹配结果的布尔值（不反转、不取反）", async () => {
	installWindow(true);
	const { prefersReducedMotion } = await import("./reduced-motion");

	assert.equal(prefersReducedMotion(), true);
	assert.equal(typeof prefersReducedMotion(), "boolean");
});
