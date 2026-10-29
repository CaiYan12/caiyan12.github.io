// 双击回顶单测（#118/T3）：锁两件事——点到链接/按钮/输入框不接管、减少动效分支。
// 第四例是**故意**的：本块按规格（#115「调用契约」）保持 single-shot、不加守卫，
// 所以两次装配会留下两个监听器。若将来有人「顺手」补守卫，这条会红——那是规格变更，
// 应当显式裁决而不是静默通过。
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

test("无守卫 single-shot：重复装配会叠加监听（规格要求，非缺陷）", () => {
	const { handlers } = install();
	initDblClickScroll();
	initDblClickScroll();
	assert.equal(handlers.length, 2);
});
