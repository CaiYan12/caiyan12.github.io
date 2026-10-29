// 双击回顶单测（#118/T3）：锁两件事——点到链接/按钮/输入框不接管、减少动效分支。
// 第四例是**故意**的：规格 #115 的「调用契约」明确要求本块**不新增守卫**，
// 所以两次直接调用 initDblClickScroll 会留下两个 dblclick 监听器。
// 若将来有人「顺手」补一个防重入标志，这条会红——那是规格变更，应当显式裁决
// 而不是静默通过。
import test from "node:test";
import assert from "node:assert/strict";
import { initDblClickScroll } from "./dblclick-scroll";

type Handler = (e: { target: unknown }) => void;

function install(reduced = false) {
	const handlers: Handler[] = [];
	const scrolls: Array<{ top?: number; behavior?: string }> = [];
	(globalThis as Record<string, unknown>).document = {
		addEventListener(type: string, fn: Handler) {
			if (type === "dblclick") handlers.push(fn);
		},
	};
	(globalThis as Record<string, unknown>).window = {
		scrollTo: (opts: { top?: number; behavior?: string }) =>
			scrolls.push(opts),
		matchMedia: () => ({ matches: reduced }),
	};
	return { handlers, scrolls };
}

const plainTarget = { closest: () => null };
const interactiveTarget = { closest: () => ({}) };

test("双击正文回到顶部（smooth）", () => {
	const { handlers, scrolls } = install();
	initDblClickScroll();
	handlers[0]({ target: plainTarget });
	assert.deepEqual(scrolls, [{ top: 0, behavior: "smooth" }]);
});

test("点到链接/按钮/输入框不接管", () => {
	const { handlers, scrolls } = install();
	initDblClickScroll();
	handlers[0]({ target: interactiveTarget });
	assert.deepEqual(scrolls, []);
});

test("减少动效偏好下用 auto", () => {
	const { handlers, scrolls } = install(true);
	initDblClickScroll();
	handlers[0]({ target: plainTarget });
	assert.deepEqual(scrolls, [{ top: 0, behavior: "auto" }]);
});

// 第四例守的是**契约**，不是访客可见行为。规格 #115 里两个词常被混用，这里分开：
// - 「single-shot」＝ 装配表（src/utils/theme-script.ts 的 runtimeTable）里这一行
//   只被调用一次（首屏装载时），不是指模块内部有防重入标志；
// - 「无守卫」＝ 模块**没有**防重入标志：连续调两次 initDblClickScroll，
//   监听器就叠加成两个。
// 访客不会看到「双次回顶」——因为装配表只调一次，第二次叠加只在有人直接重复调用
// 本块时才会发生（Swup 换页走的是 swap 序重跑，而本块没有 swap 号）。
// 这条断言的作用是：将来若有人顺手加一个「已绑定」标志挡住重复装配，这条会红，
// 那属于规格变更（新增了规格没要求的守卫），需要显式裁决，而不是静默通过。
test("契约（规格 #115 不新增守卫）：重复调用 initDblClickScroll 会叠加监听", () => {
	const { handlers } = install();
	initDblClickScroll();
	initDblClickScroll();
	assert.equal(handlers.length, 2);
});
