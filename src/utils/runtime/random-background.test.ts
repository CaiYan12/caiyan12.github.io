// 随机背景的单测（#119 迁出后获得的能力；此前这段埋在 theme-script.ts 里，
// 「语料坏了别把页面搞崩」「别老挑同一张」只能靠浏览器肉眼比对）。
//
// **本文件钉的是核实结论，不是「保持不变」**（票 #119 原文要求以核实结果为准）：
// 迁移前的实现只有两行状态——`dataset.selected` 元素级守卫 + 全池均匀取一，
// 既没有「换一张」入口，也不排除任何下标；SSR 的 `<img>` 根本没写 `src`，
// 所以「选中发生前存在当前图」这个概念压根不成立。因此本模块**不新增**去重逻辑：
// 下面「不排除当前图」一条钉的正是这个核实结果（命中当前图的候选照样会被选中），
// 而不是「保持原样」这种含糊说法。
//
// 断言口径：
// - 「全池」→ 每个候选都得有被选中的机会（探针扫过全池，不能漏掉最后一张）；
// - 「均匀」→ 分布上各候选命中率相当（分布性质，不是抄一遍取整公式）；
// - 「安全返回」→ 语料非数组/为空/解析失败时：不写 src、不置守卫、不抛错；
// - 「守卫置位时机」→ 成功写入 src 之后才把 dataset.selected 置 true。
import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { initRandomBackground } from "./random-background";

const POOL = [
	"/bg/one.jpg",
	"/bg/two.jpg",
	"/bg/three.jpg",
	"/bg/four.jpg",
] as const;

// ---- 最小 DOM 桩 ----

type FakeImage = {
	dataset: Record<string, string | undefined>;
	/** 被写过的 src 序列 */
	srcWrites: string[];
	/** 每次写 src 的瞬间，dataset.selected 的值（用来观察置位时序） */
	selectedAtWriteTime: (string | undefined)[];
};

function makeImage(backgrounds: string | undefined): FakeImage {
	const image: FakeImage = {
		dataset: { backgrounds },
		srcWrites: [],
		selectedAtWriteTime: [],
	};
	let src = "";
	Object.defineProperty(image, "src", {
		get: () => src,
		set: (value: string) => {
			src = value;
			image.srcWrites.push(value);
			image.selectedAtWriteTime.push(image.dataset.selected);
		},
	});
	return image;
}

/** 当前挂载的背景图（null = 页面上没有这张图） */
let mounted: FakeImage | null = null;

(globalThis as Record<string, unknown>).document = {
	querySelector(selector: string) {
		// 选择器写错就该立刻炸，而不是静默返回 null 让用例变成空跑
		if (selector !== ".bg-image[data-backgrounds]") {
			throw new Error(`unexpected selector: ${selector}`);
		}
		return mounted;
	},
};

// ---- 随机数控制 ----

const realRandom = Math.random;

/** 把 Math.random 换成固定值；restore 还原 */
function setRandom(value: number) {
	Math.random = () => value;
}

function restoreRandom() {
	Math.random = realRandom;
}

/** 固定种子的确定性伪随机序列（自实现 LCG，避免依赖 Math.random 自身） */
function seededSequence(seed: number, count: number): number[] {
	let state = seed >>> 0;
	const out: number[] = [];
	for (let i = 0; i < count; i++) {
		// 数值稳定的 32 位 LCG（glibc 参数），结果落在 [0,1)
		// Math.imul 不可省：state * 1103515245 超出 2^53 会丢精度，序列就不确定了
		state = (Math.imul(state, 1103515245) + 12345) >>> 0;
		out.push(state / 4294967296);
	}
	return out;
}

beforeEach(() => {
	mounted = null;
	restoreRandom();
});

// ---- 语料坏掉时的安全返回 ----

test("语料不是数组：安全返回，不写 src、不置守卫、不抛错", () => {
	for (const broken of ['"just-a-string"', '{"a":1}', "42", "null", "true"]) {
		const image = makeImage(broken);
		mounted = image;

		assert.doesNotThrow(() => initRandomBackground());
		assert.deepEqual(image.srcWrites, [], `${broken} 不应写 src`);
		assert.equal(image.dataset.selected, undefined, `${broken} 不应置守卫`);
	}
});

test("语料是空数组：安全返回，不写 src、不置守卫", () => {
	const image = makeImage("[]");
	mounted = image;

	assert.doesNotThrow(() => initRandomBackground());
	assert.deepEqual(image.srcWrites, []);
	assert.equal(image.dataset.selected, undefined);
});

test("语料缺失或空串：安全返回，不写 src、不置守卫", () => {
	for (const broken of [undefined, ""]) {
		const image = makeImage(broken);
		mounted = image;

		assert.doesNotThrow(() => initRandomBackground());
		assert.deepEqual(image.srcWrites, []);
		assert.equal(image.dataset.selected, undefined);
	}
});

test("语料解析失败：保留纯色背景、不置守卫，并 warn 供排错", () => {
	const image = makeImage("{不是合法 JSON}");
	mounted = image;

	const warnings: unknown[][] = [];
	const originalWarn = console.warn;
	console.warn = (...args: unknown[]) => {
		warnings.push(args);
	};
	try {
		assert.doesNotThrow(() => initRandomBackground());
	} finally {
		console.warn = originalWarn;
	}

	assert.deepEqual(image.srcWrites, []);
	assert.equal(image.dataset.selected, undefined, "解析失败不应置守卫");
	assert.equal(warnings.length, 1);
	assert.equal(warnings[0][0], "[background] config parse failed:");
});

test("页面上没有背景图时静默返回", () => {
	mounted = null;

	assert.doesNotThrow(() => initRandomBackground());
});

// ---- 选择范围：全池 ----

test("选择范围是全池：扫过 [0,1) 全程，每张候选都轮到（不漏最后一张）", () => {
	const picked: string[] = [];
	// 每张候选正中间取一个探针：均匀切分下应恰好落在 N 个不同候选上
	for (let i = 0; i < POOL.length; i++) {
		const image = makeImage(JSON.stringify(POOL));
		mounted = image;
		setRandom((i + 0.5) / POOL.length);

		initRandomBackground();

		assert.equal(image.srcWrites.length, 1, "每次应恰好选中一张");
		picked.push(image.srcWrites[0]);
	}
	restoreRandom();

	// 全池都被覆盖到，且没有选到池外的图
	assert.deepEqual([...new Set(picked)].sort(), [...POOL].sort());
});

test("随机值贴近 0 与贴近 1 时仍落在池内（端点不出界）", () => {
	for (const value of [0, Number.MIN_VALUE, 0.9999999999]) {
		const image = makeImage(JSON.stringify(POOL));
		mounted = image;
		setRandom(value);

		initRandomBackground();

		assert.equal(image.srcWrites.length, 1);
		assert.ok(
			(POOL as readonly string[]).includes(image.srcWrites[0]),
			`随机值 ${value} 选出了池外的图`,
		);
	}
	restoreRandom();
});

// ---- 选择分布：均匀 ----

test("选择分布是均匀的：各候选命中率相当（分布性质，不抄取整公式）", () => {
	const samples = 800;
	const sequence = seededSequence(20261029, samples);
	const counts = new Map<string, number>();

	for (const value of sequence) {
		const image = makeImage(JSON.stringify(POOL));
		mounted = image;
		setRandom(value);

		initRandomBackground();

		const picked = image.srcWrites[0];
		counts.set(picked, (counts.get(picked) ?? 0) + 1);
	}
	restoreRandom();

	assert.equal(counts.size, POOL.length, "每张候选都应被选中过");
	const expected = samples / POOL.length;
	for (const url of POOL) {
		const hit = counts.get(url) ?? 0;
		// ±20% 容差：足以咬住「某一档被削窄/加宽」的实现漂移，又不会被采样噪声误伤
		assert.ok(
			Math.abs(hit - expected) <= expected * 0.2,
			`${url} 命中 ${hit} 次，与均匀期望 ${expected} 相差过大`,
		);
	}
});

// ---- 核实结论：不排除当前图（票 #119） ----

test("核实结论（#119）：不存在「不重复选中当前图」的排除逻辑——命中当前图的候选照样被选中", () => {
	// 场景化前提：元素上已有 src（SSR 不写 src，但这是把「排除当前图」逻辑探出来
	// 唯一的办法），且守卫尚未置位 → 若实现里有去重，它必须在这一步生效。
	const image = makeImage(JSON.stringify(POOL));
	image.srcWrites.push(POOL[1]);
	image.selectedAtWriteTime.push(undefined);
	mounted = image;

	// 随机值恰好指向「当前图」那一张
	setRandom((1 + 0.5) / POOL.length);
	initRandomBackground();
	restoreRandom();

	// 选中的就是当前图本身 —— 没有被排除
	assert.equal(image.srcWrites.at(-1), POOL[1]);
});

test("核实结论（#119）：当前图在场时候选集仍是全池（去重逻辑不存在）", () => {
	// 与上一条互为补充：上一条探「当前图那一格能不能被选中」，这一条探
	// 「当前图在场时，候选集有没有缩水」——若实现里去掉了当前图那一格，
	// 候选集就只剩 N-1 张，探针数会与池大小对不上。
	const picked = new Set<string>();
	for (let i = 0; i < POOL.length; i++) {
		const image = makeImage(JSON.stringify(POOL));
		// 元素上已经有 src（模拟「当前图」在场），且守卫尚未置位
		image.srcWrites.push(POOL[0]);
		image.selectedAtWriteTime.push(undefined);
		mounted = image;
		setRandom((i + 0.5) / POOL.length);

		initRandomBackground();

		picked.add(image.srcWrites.at(-1) as string);
	}
	restoreRandom();

	assert.deepEqual([...picked].sort(), [...POOL].sort());
});

// ---- dataset.selected 守卫的置位时机 ----

test("守卫置位时机：先写 src，写完才把 dataset.selected 置为 true", () => {
	const image = makeImage(JSON.stringify(POOL));
	mounted = image;
	setRandom(0);

	initRandomBackground();
	restoreRandom();

	assert.deepEqual(image.srcWrites, [POOL[0]]);
	assert.equal(image.dataset.selected, "true");
	// 写 src 的那一刻守卫还没置位
	assert.deepEqual(image.selectedAtWriteTime, [undefined]);
});

test("守卫置位时机：成功一次后不再改写（已选中则整块跳过）", () => {
	const image = makeImage(JSON.stringify(POOL));
	mounted = image;
	setRandom(0);

	initRandomBackground();
	const afterFirst = image.srcWrites.length;

	// 换一张随机值再跑一次：守卫已置位，整块应当直接返回
	setRandom(0.99);
	initRandomBackground();
	restoreRandom();

	assert.equal(image.srcWrites.length, afterFirst, "守卫置位后不应再写 src");
	assert.equal(image.srcWrites.at(-1), POOL[0]);
});

test("守卫置位时机：dataset.selected 已是 true 时整块跳过", () => {
	const image = makeImage(JSON.stringify(POOL));
	image.dataset.selected = "true";
	mounted = image;
	setRandom(0.5);

	initRandomBackground();
	restoreRandom();

	assert.deepEqual(image.srcWrites, []);
});
