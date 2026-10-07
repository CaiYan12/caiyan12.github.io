// 语录条 runtime module 纯函数单测（T6 迁入后获得的能力；此前这些函数埋在
// theme-script.ts 的 IIFE 作用域里只能靠浏览器冒烟）。typesetQuoteChars 依赖 DOM，
// 这里用最小桩（createElement/createTextNode/textContent/appendChild/append）跑结构不变量。
import test from "node:test";
import assert from "node:assert/strict";
import {
	pickOtherFrom,
	quotePool,
	typesetQuoteChars,
	writeQuoteTempo,
	QUOTE_TEMPO_FIRST,
	QUOTE_TEMPO_LEAVE,
	type QuoteTempo,
} from "./quote-band";

// ---- 最小 DOM 桩：只实现 typesetQuoteChars 用到的面 ----
type FakeNode = {
	className: string;
	textContent: string;
	style: { props: Record<string, string>; setProperty(k: string, v: string) };
	children: FakeNode[];
	appendChild(c: FakeNode): void;
	appendChild_text(c: { text: string }): void;
};

function makeEl(): FakeNode {
	return {
		className: "",
		textContent: "",
		style: {
			props: {},
			setProperty(k, v) {
				this.props[k] = v;
			},
		},
		children: [],
		appendChild(c: FakeNode) {
			this.children.push(c);
		},
		appendChild_text(c: { text: string }) {
			this.children.push(c);
		},
	};
}

// typesetQuoteChars 对词 span 与字 span 都走 appendChild；文本节点走 createTextNode
// 后也进 appendChild —— 桩统一成带标记的对象以便区分。
(globalThis as Record<string, unknown>).document = {
	createElement: () => makeEl(),
	createTextNode: (text: string) => ({ text, isTextNode: true }),
};

test("quotePool：语料未挂/非数组 → 空池；三列且英文非空才算可用行", () => {
	// 未挂语料
	(globalThis as Record<string, unknown>).window = {};
	assert.deepEqual(quotePool(), []);
	// 非数组语料
	(globalThis as Record<string, unknown>).window = { __quoteCorpus: "nope" };
	assert.deepEqual(quotePool(), []);
	// 形状过滤：缺列 / 空英文 / 非数组的行被丢，三列完整行保留
	const corpus = [
		["en1", "中1", "By A"],
		["", "缺英文", "By B"],
		["en3", "只两列"],
		"not-an-array",
		["en4", "中4", "By D"],
	];
	(globalThis as Record<string, unknown>).window = { __quoteCorpus: corpus };
	assert.deepEqual(quotePool(), [
		["en1", "中1", "By A"],
		["en4", "中4", "By D"],
	]);
});

test("pickOtherFrom：剔除当前句；剔完为空回退整池；空池 undefined", () => {
	const pool = [
		["a", "", ""],
		["b", "", ""],
		["c", "", ""],
	];
	// 性质断言：候选里有替代句时，任何一次抽取都不得返回当前句（60 次采样）。
	// 这条咬得住「剔除当前句」被改回「抽到重抽」一类的突变。
	for (let i = 0; i < 60; i++) {
		assert.notEqual(pickOtherFrom(pool, "b")?.[0], "b");
	}
	// 顺序契约：候选列表保持池内顺序（过滤不改排序）；注入确定性序列取第 1 项 → c
	const fixedIndex = (value: number) => () => value;
	assert.equal(pickOtherFrom(pool, "b", fixedIndex(1))?.[0], "c");
	// 上限契约：注入函数收到的 upperBound 必须是候选列表长度（此处 2）
	let seenBound = -1;
	pickOtherFrom(pool, "b", (upperBound) => {
		seenBound = upperBound;
		return 0;
	});
	assert.equal(seenBound, 2);
	// 语料只剩当前句：回退整池（返回当前句自身），不返回 undefined
	assert.equal(pickOtherFrom([["a", "", ""]], "a")?.[0], "a");
	assert.equal(pickOtherFrom([], "a"), undefined);
});

test("typesetQuoteChars：词包字结构不变量——空格成文本节点、字按序编号、返回非空白字数", () => {
	const el = makeEl();
	const count = typesetQuoteChars(
		el as unknown as HTMLElement,
		"hello world",
	);
	assert.equal(count, 10); // 11 个字符里 1 个空格不是「字」
	const words = el.children.filter((c) => c.className === "quote-band__word");
	assert.equal(words.length, 2);
	const chars = words.flatMap((w) => w.children);
	assert.equal(chars.length, 10);
	// --quote-i 逐字递增、无空白占号
	const indexes = chars.map((c) => Number(c.style.props["--quote-i"]));
	assert.deepEqual(indexes, [...Array(10).keys()]);
	// 空格保留为文本节点（断行发生在词与词之间）
	assert.ok(el.children.some((c) => (c as { text?: string }).text === " "));
});

test("typesetQuoteChars：空文本返回 0 且不产节点", () => {
	const el = makeEl();
	assert.equal(typesetQuoteChars(el as unknown as HTMLElement, ""), 0);
	assert.equal(el.children.length, 0);
});

function fakeBand() {
	const el = makeEl();
	return {
		node: el as unknown as HTMLElement,
		props: el.style.props as Record<string, string>,
	};
}

test("writeQuoteTempo：单字符 step=0；长文本 step 被单步上限封顶", () => {
	const oneBand = fakeBand();
	const one = writeQuoteTempo(oneBand.node, "", QUOTE_TEMPO_FIRST, 1);
	// 单字符没有错峰：step 为 0
	assert.equal(oneBand.props["--quote-step"], "0ms");
	// 收尾 = max(charEnd, btn 段结束)——单字符时中文/署名/按钮的级联仍要跑完
	const t = QUOTE_TEMPO_FIRST;
	const oneBtnEnd =
		t.char +
		t.gap +
		Math.round(t.zh * 0.6) +
		Math.round(t.by * 0.5) +
		t.btn;
	assert.equal(one, oneBtnEnd);
	const long = fakeBand();
	const count = 100; // 100 字 → 自然错峰 window/(count-1)=4.85ms < stepMax 22ms
	const end = writeQuoteTempo(long.node, "", QUOTE_TEMPO_FIRST, count);
	assert.equal(
		long.props["--quote-step"],
		`${Math.round(QUOTE_TEMPO_FIRST.window / (count - 1))}ms`,
	);
	// 收尾时刻 = max(charEnd, btnDelay + btn)：入场无 tailAt，btn 段晚于英文扫尾
	const charEnd =
		(count - 1) * (QUOTE_TEMPO_FIRST.window / (count - 1)) +
		QUOTE_TEMPO_FIRST.char;
	const zhDelay = charEnd + QUOTE_TEMPO_FIRST.gap;
	const byDelay = zhDelay + Math.round(QUOTE_TEMPO_FIRST.zh * 0.6);
	const btnDelay = byDelay + Math.round(QUOTE_TEMPO_FIRST.by * 0.5);
	assert.equal(end, Math.round(btnDelay + QUOTE_TEMPO_FIRST.btn));
});

test("writeQuoteTempo：退场前缀改名 + tailAt 让中文/署名/按钮提前跟上", () => {
	const band = fakeBand();
	const end = writeQuoteTempo(band.node, "-leave", QUOTE_TEMPO_LEAVE, 10);
	assert.equal(band.props["--quote-leave-step"], "12ms"); // 封顶 stepMax
	assert.equal(
		band.props["--quote-leave-zh-delay"],
		`${QUOTE_TEMPO_LEAVE.tailAt}ms`,
	);
	assert.equal(
		band.props["--quote-leave-btn-delay"],
		`${QUOTE_TEMPO_LEAVE.tailAt + 140}ms`,
	);
	// 收尾仍取 max(charEnd, btn + btn-ms)
	const charEnd = 9 * 12 + QUOTE_TEMPO_LEAVE.char;
	const btnEnd = QUOTE_TEMPO_LEAVE.tailAt + 140 + QUOTE_TEMPO_LEAVE.btn;
	assert.equal(end, Math.round(Math.max(charEnd, btnEnd)));
});

test("tempo 常量：退场各段时长不晚于入场档（换句走快节奏的既定裁决）", () => {
	const tempos: Record<string, QuoteTempo> = {
		QUOTE_TEMPO_FIRST,
		QUOTE_TEMPO_LEAVE,
	};
	// 退场必须带 tailAt（东西在消失，没必要严格接力）
	assert.equal(QUOTE_TEMPO_LEAVE.tailAt, 200);
	// 两套表共用同一组键：同序同向不是两份手抄结构
	assert.deepEqual(
		Object.keys(QUOTE_TEMPO_FIRST),
		Object.keys(tempos.QUOTE_TEMPO_LEAVE).filter((k) => k !== "tailAt"),
	);
});
