// 冒烟测试台自身的契约测试：全部用假 page（可注入 canned console / pageerror 事件），
// 不开浏览器、不访问网络。台子此前没有任何测试，四份方言各自靠人工信任。
import test from "node:test";
import assert from "node:assert/strict";
import { makeHarness } from "./smoke-harness.mjs";

/** 假 page：能 on() 记账，也能 emit() 灌事件 */
function fakePage() {
	const handlers = new Map();
	return {
		on(event, fn) {
			handlers.set(event, fn);
		},
		emit(event, arg) {
			handlers.get(event)?.(arg);
		},
	};
}

/** 台子的输出走 console.log，这里临时收集起来看格式 */
function captureLogs(fn) {
	const lines = [];
	const original = console.log;
	console.log = (...args) => lines.push(args.join(" "));
	try {
		fn();
	} finally {
		console.log = original;
	}
	return lines;
}

test("同源 console error 必须入列并让 checkClean 翻红", () => {
	const h = makeHarness({
		envVar: "HARNESS_TEST_BASE",
		defaultBase: "http://localhost:4399",
		isNoise: ({ url }) => !!url && !url.startsWith("http://localhost:4399"),
	});
	const page = fakePage();
	h.attach(page);
	page.emit("console", {
		type: () => "error",
		text: () => "boom",
		location: () => ({ url: "http://localhost:4399/_astro/x.js" }),
	});
	const lines = captureLogs(() => h.checkClean("票 01"));
	assert.match(lines.at(-1), /^FAIL  票 01：无本地 console \/ page 报错/u);
	assert.equal(h.summary().failed.length, 1);
});

test("外部域报错按调用点策略不计失败（台子不预设清单）", () => {
	const h = makeHarness({
		envVar: "HARNESS_TEST_BASE",
		defaultBase: "http://localhost:4399",
		isNoise: ({ url }) => !!url && !url.startsWith("http://localhost:4399"),
	});
	const page = fakePage();
	h.attach(page);
	page.emit("console", {
		type: () => "error",
		text: () => "Failed to load resource: 404",
		location: () => ({ url: "https://giscus.app/api" }),
	});
	const lines = captureLogs(() => h.checkClean("票 02"));
	assert.match(lines.at(-1), /^PASS  票 02/u);
	assert.deepEqual(h.errors, []);
});

test("pageerror 与按文案的噪声策略都生效（ai-news 那类离线快照场景）", () => {
	const h = makeHarness({
		envVar: "HARNESS_TEST_BASE",
		defaultBase: "http://127.0.0.1:4321/ai-news/",
		isNoise: ({ text }) => text.includes("[feed] 实时抓取失败"),
	});
	const page = fakePage();
	h.attach(page);
	page.emit("pageerror", { message: "[feed] 实时抓取失败" });
	assert.deepEqual(h.errors, [], "被策略放行的噪声不得入列");
	page.emit("pageerror", { message: "TypeError: cannot read x" });
	assert.equal(h.errors.length, 1);
	assert.match(h.errors[0], /cannot read x/u);
});

test("checkClean 按段归属：前一段的报错不算到后一段头上", () => {
	const h = makeHarness({
		envVar: "HARNESS_TEST_BASE",
		defaultBase: "http://localhost:4399",
	});
	const page = fakePage();
	h.attach(page);
	page.emit("pageerror", { message: "第一段炸的" });
	const first = captureLogs(() => h.checkClean("票 01"));
	const second = captureLogs(() => h.checkClean("票 02"));
	assert.match(first.at(-1), /^FAIL/u);
	assert.match(
		second.at(-1),
		/^PASS  票 02/u,
		"游标必须前进，否则第二段被冤枉",
	);
});

test("多页面各一个报错汇，互不污染", () => {
	const h = makeHarness({
		envVar: "HARNESS_TEST_BASE",
		defaultBase: "http://localhost:4399",
	});
	const offline = h.createSink({
		name: "offline",
		sinkNoise: ({ text }) => text.includes("ERR_FAILED"),
	});
	const page = fakePage();
	offline.attach(page);
	page.emit("console", {
		type: () => "error",
		text: () => "Failed to load resource: net::ERR_FAILED",
		location: () => ({ url: "https://daily.juya.uk/feed.xml" }),
	});
	assert.deepEqual(offline.errors, []);
	assert.deepEqual(h.errors, [], "主汇不应看到子汇的事件");
});

test("跨报错汇的游标各自独立：子汇的报错不得被主汇游标吞掉", () => {
	const h = makeHarness({
		envVar: "HARNESS_TEST_BASE",
		defaultBase: "http://localhost:4399",
	});
	const offline = h.createSink({ name: "offline" });
	const mainPage = fakePage();
	const offlinePage = fakePage();
	h.attach(mainPage);
	offline.attach(offlinePage);
	offlinePage.emit("pageerror", { message: "离线页炸的" });
	mainPage.emit("pageerror", { message: "主页第一条" });
	mainPage.emit("pageerror", { message: "主页第二条" });

	const first = captureLogs(() => h.checkClean("票 01"));
	const second = captureLogs(() => h.checkClean("票 02", offline));
	assert.match(first.at(-1), /^FAIL/u);
	assert.match(
		second.at(-1),
		/^FAIL  票 02：无本地 console \/ page 报错/u,
		"游标若为全部汇共用，主汇先前进两格就会把子汇那条吞成 PASS",
	);
	assert.match(second.at(-1), /离线页炸的/u);

	const third = captureLogs(() => h.checkClean("票 03"));
	assert.match(third.at(-1), /^PASS  票 03/u, "主汇已报过的两条不得二次计入");
});

test("汇总口径与 check 的第四参数位", () => {
	const h = makeHarness({
		envVar: "HARNESS_TEST_BASE",
		defaultBase: "http://localhost:4399",
	});
	const lines = captureLogs(() => {
		h.check("甲", true, "读数 42");
		h.check("乙", false, "", { kind: "qa" });
	});
	assert.equal(lines[0], "PASS  甲 :: 读数 42");
	assert.equal(lines[1], "FAIL  乙");
	const s = h.summary();
	assert.equal(s.total, 2);
	assert.deepEqual(
		s.failed.map((f) => f.name),
		["乙"],
	);
	assert.equal(
		s.failed[0].extra.kind,
		"qa",
		"第四参数位必须保留给 design-qa 那类形状",
	);
});

test("base 形态在启动时回显（三种形态传错曾造出假失败）", () => {
	const root = captureLogs(() =>
		makeHarness({
			envVar: "HARNESS_TEST_BASE",
			defaultBase: "http://localhost:4399",
		}),
	);
	const page = captureLogs(() =>
		makeHarness({
			envVar: "HARNESS_TEST_BASE",
			defaultBase: "http://localhost:4399/books/",
		}),
	);
	assert.match(root[0], /形态：站点根/u);
	assert.match(page[0], /形态：完整页面\/目录地址/u);
});
