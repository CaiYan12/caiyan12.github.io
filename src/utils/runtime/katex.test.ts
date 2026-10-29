// KaTeX 样式条件加载的单测（#120/T5 迁入后获得的能力；此前这段埋在 theme-script.ts，
// 「没有公式的页面不该多付一次样式请求」只能靠浏览器逐页看网络面板，改坏了没人拦得住）。
//
// 观察点选在**模块规格被请求**这一层：`katex/dist/katex.css` 这条动态 import 是否
// 被发起。用 module 解析钩子计数，而不是数「发了几次网络请求」——请求次数在真实
// 浏览器里还受缓存与 dev server 影响，钩子计数才对应「代码决定去加载」这一契约。
// 钩子只对本文生效（node --test 每个测试文件独立进程），不污染别处。
import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { loadKatexCss } from "./katex";

type LoadMode = "ok" | "fail";

const probe = {
	mode: "ok" as LoadMode,
	/** 被请求的样式规格串，按发生顺序记录 */
	requested: [] as string[],
};

registerHooks({
	resolve(specifier, context, nextResolve) {
		if (specifier === "katex/dist/katex.css") {
			probe.requested.push(specifier);
			const url =
				probe.mode === "fail"
					? "data:text/javascript,throw new Error('css load failed')"
					: "data:text/javascript,export default 'katex-css';";
			return { url, shortCircuit: true, format: "module" };
		}
		return nextResolve(specifier, context);
	},
});

/** 装一页 DOM：hasKatex 决定页面上有没有公式 */
function install(hasKatex: boolean) {
	(globalThis as Record<string, unknown>).document = {
		querySelector: (selector: string) =>
			selector === ".katex" && hasKatex ? { nodeName: "SPAN" } : null,
	};
}

/** 动态 import 的落地是异步的，等一拍再断言 */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

/** 临时接管 console.warn，返回记录器与还原函数 */
function captureWarn() {
	const calls: unknown[][] = [];
	const original = console.warn;
	console.warn = (...args: unknown[]) => {
		calls.push(args);
	};
	return { calls, restore: () => (console.warn = original) };
}

test("页面存在 .katex 才请求 katex 样式；没有公式的页面不发起加载", async () => {
	probe.requested = [];

	install(false);
	loadKatexCss();
	await settle();
	assert.deepEqual(probe.requested, [], "无公式页面不应请求 katex 样式");

	install(true);
	loadKatexCss();
	await settle();
	assert.deepEqual(probe.requested, ["katex/dist/katex.css"]);
});

test("样式加载失败只 console.warn，不抛错也不阻塞页面", async () => {
	probe.mode = "fail";
	probe.requested = [];
	install(true);

	const { calls, restore } = captureWarn();
	try {
		// 失败是异步落地的；loadKatexCss 本身同步返回且不抛
		assert.equal(loadKatexCss(), undefined);
		await settle();
	} finally {
		restore();
	}

	assert.equal(probe.requested.length, 1, "失败也要真的发起过加载");
	assert.equal(calls.length, 1, "失败只 warn 一次");
	assert.equal(calls[0][0], "[katex] css load failed:");
	assert.ok(calls[0][1] instanceof Error, "第二个参数是原始错误对象");
	assert.match((calls[0][1] as Error).message, /css load failed/);

	probe.mode = "ok";
});

test("没有「已加载」守卫：重复调用会重新判断页面是否还有公式", async () => {
	probe.requested = [];

	// 第一次：页面没有公式，什么都不做
	install(false);
	loadKatexCss();
	await settle();
	assert.deepEqual(probe.requested, []);

	// 第二次：页面已经有公式（如换页后 Swup 渲染出公式），这次必须真的去加载
	install(true);
	loadKatexCss();
	await settle();
	assert.deepEqual(probe.requested, ["katex/dist/katex.css"]);

	// 第三次：公式仍在，仍会再判断并再请求一次（不是「加载过就跳过」）
	install(true);
	loadKatexCss();
	await settle();
	assert.deepEqual(probe.requested, [
		"katex/dist/katex.css",
		"katex/dist/katex.css",
	]);
});
