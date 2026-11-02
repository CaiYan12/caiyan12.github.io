// 壁纸候选纯函数的单测（票 #129 / spec #127）。
//
// 口径：只断言**外部可观察行为**——池、当前图、注入的 baseUrl / rng 进去，
// 出来的要么是一张「一定不是当前这张」的候选，要么是一个「无候选」结果。
// 不断言内部数据结构，不抄一遍取整公式；「均匀」按**分布性质**验证
// （沿用 random-background.test.ts 的口径：探针扫过全池 + 确定性序列的命中率）。
//
// 这三条是票面硬约束，测试按它们命名：
// · 比较前规范化 URL——相对与绝对路径不被判成不同图；
// · 重复路径先去重——重复项不获得额外权重；
// · 只有当前一张 / 全被排除——返回无候选，不伪造切换。
import test from "node:test";
import assert from "node:assert/strict";
import {
	collectWallpaperCandidates,
	selectNextWallpaper,
} from "./wallpaper-candidates";

/** 站点部署域；相对路径按它解析成绝对 URL */
const BASE = "https://caiyan12.github.io/";

const POOL = [
	"/images/bg/a.jpg",
	"/images/bg/b.jpg",
	"/images/bg/c.jpg",
] as const;

/** 固定种子的确定性伪随机序列（自实现 LCG，口径同 random-background.test.ts） */
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

// ---- 规范化：相对与绝对是同一张图 ----

test("相对路径与绝对路径被规范化成同一个 URL", () => {
	// 无前导斜杠的相对写法、有前导斜杠的站点绝对路径、完整 URL——三种写法同一张图
	const forms = [
		"images/bg/a.jpg",
		"/images/bg/a.jpg",
		"https://caiyan12.github.io/images/bg/a.jpg",
	];
	const candidates = collectWallpaperCandidates(forms, null, BASE);
	assert.deepEqual(
		candidates,
		["https://caiyan12.github.io/images/bg/a.jpg"],
		"三种写法应归并成一条候选",
	);
});

test("排除当前图时按规范化后的 URL 比较（相对与绝对混写也算同一张）", () => {
	// 池里是站点绝对路径，当前图是完整 URL——字符串不同但同一张图，必须排除
	assert.deepEqual(
		collectWallpaperCandidates(
			POOL,
			"https://caiyan12.github.io/images/bg/b.jpg",
			BASE,
		),
		[
			"https://caiyan12.github.io/images/bg/a.jpg",
			"https://caiyan12.github.io/images/bg/c.jpg",
		],
	);
	// 反过来：池里写完整 URL、当前图写相对路径，同样要排除
	assert.deepEqual(
		collectWallpaperCandidates(
			["https://caiyan12.github.io/images/bg/b.jpg"],
			"/images/bg/b.jpg",
			BASE,
		),
		[],
	);
});

// ---- 去重 ----

test("重复路径先去重：只留第一次出现的那条，顺序不变", () => {
	assert.deepEqual(
		collectWallpaperCandidates(
			[
				"/images/bg/a.jpg",
				"images/bg/a.jpg",
				"/images/bg/b.jpg",
				POOL[2],
				"/images/bg/b.jpg",
			],
			null,
			BASE,
		),
		[
			"https://caiyan12.github.io/images/bg/a.jpg",
			"https://caiyan12.github.io/images/bg/b.jpg",
			"https://caiyan12.github.io/images/bg/c.jpg",
		],
	);
});

// ---- 无候选：不伪造切换 ----

test("空数组：返回无候选", () => {
	assert.deepEqual(selectNextWallpaper({ pool: [], baseUrl: BASE }), {
		ok: false,
		reason: "empty-pool",
	});
});

test("全非法输入：返回无候选", () => {
	const broken = [
		null,
		undefined,
		42,
		{},
		[],
		"",
		"   ",
		"javascript:void(0)",
	];
	assert.deepEqual(selectNextWallpaper({ pool: broken, baseUrl: BASE }), {
		ok: false,
		reason: "empty-pool",
	});
	// 池本身不是数组（语料损坏）也不能抛错
	assert.deepEqual(
		selectNextWallpaper({
			pool: "not-an-array" as unknown as readonly unknown[],
			baseUrl: BASE,
		}),
		{ ok: false, reason: "empty-pool" },
	);
});

test("只有当前一张图时返回无候选（不换到同一张）", () => {
	assert.deepEqual(
		selectNextWallpaper({
			pool: ["/images/bg/a.jpg"],
			current: "/images/bg/a.jpg",
			baseUrl: BASE,
		}),
		{ ok: false, reason: "no-candidates" },
	);
});

test("候选全被排除（全是当前图的写法变体）时返回无候选", () => {
	assert.deepEqual(
		selectNextWallpaper({
			pool: [
				"/images/bg/a.jpg",
				"images/bg/a.jpg",
				"https://caiyan12.github.io/images/bg/a.jpg",
			],
			current: "https://caiyan12.github.io/images/bg/a.jpg",
			baseUrl: BASE,
		}),
		{ ok: false, reason: "no-candidates" },
	);
});

test("单图池且当前为空时照常选中那一张", () => {
	const choice = selectNextWallpaper({
		pool: ["/images/bg/a.jpg"],
		current: null,
		baseUrl: BASE,
		rng: () => 0,
	});
	assert.deepEqual(choice, {
		ok: true,
		url: "https://caiyan12.github.io/images/bg/a.jpg",
	});
});

// ---- 选择落在全池内（端点与中间值） ----

test("探针扫过全池：每个候选都有被选中的机会（不漏最后一张，不出界）", () => {
	const picked: string[] = [];
	for (let i = 0; i < POOL.length; i++) {
		// 每张候选正中间取一个探针：均匀切分下应恰好落在 N 个不同候选上
		const choice = selectNextWallpaper({
			pool: POOL,
			current: null,
			baseUrl: BASE,
			rng: () => (i + 0.5) / POOL.length,
		});
		assert.ok(choice.ok, `探针 ${i} 应选中一张`);
		picked.push(choice.url);
	}
	assert.equal(new Set(picked).size, POOL.length, "全池都应被覆盖到");
	assert.deepEqual(
		[...new Set(picked)].sort(),
		POOL.map((p) => new URL(p, BASE).href).sort(),
		"选中的必须都在池内",
	);
});

test("随机值取端点 0 与贴近 1 时仍落在池内（不出界）", () => {
	// 0 → 第一张；0.9999999999 → 最后一张。端点跨越两侧都不许越界
	const first = selectNextWallpaper({
		pool: POOL,
		current: null,
		baseUrl: BASE,
		rng: () => 0,
	});
	assert.ok(first.ok);
	assert.equal(first.url, "https://caiyan12.github.io/images/bg/a.jpg");

	const last = selectNextWallpaper({
		pool: POOL,
		current: null,
		baseUrl: BASE,
		rng: () => 0.9999999999,
	});
	assert.ok(last.ok);
	assert.equal(last.url, "https://caiyan12.github.io/images/bg/c.jpg");

	// 中间值落在中间那张
	const middle = selectNextWallpaper({
		pool: POOL,
		current: null,
		baseUrl: BASE,
		rng: () => 0.5,
	});
	assert.ok(middle.ok);
	assert.equal(middle.url, "https://caiyan12.github.io/images/bg/b.jpg");
});

// ---- 均匀：分布性质 ----

test("选择是均匀的：各候选命中率相当（分布性质，不抄取整公式）", () => {
	const samples = 900;
	const sequence = seededSequence(20261101, samples);
	const counts = new Map<string, number>();

	for (const value of sequence) {
		const choice = selectNextWallpaper({
			pool: POOL,
			current: null,
			baseUrl: BASE,
			rng: () => value,
		});
		assert.ok(choice.ok, "900 次采样里每次都应选中一张");
		counts.set(choice.url, (counts.get(choice.url) ?? 0) + 1);
	}

	assert.equal(counts.size, POOL.length, "每张候选都应被选中过");
	const expected = samples / POOL.length;
	for (const path of POOL) {
		const url = new URL(path, BASE).href;
		const hit = counts.get(url) ?? 0;
		// ±20% 容差：足以咬住「某一档被削窄/加宽」的实现漂移，又不会被采样噪声误伤
		assert.ok(
			Math.abs(hit - expected) <= expected * 0.2,
			`${url} 命中 ${hit} 次，与均匀期望 ${expected} 相差过大`,
		);
	}
});

test("重复路径先去重后不因重复获得额外权重", () => {
	// a 出现 3 次、b 与 c 各 1 次；去重后三张各占 1/3
	const duplicated = [
		"/images/bg/a.jpg",
		"/images/bg/a.jpg",
		"/images/bg/a.jpg",
		"/images/bg/b.jpg",
		"/images/bg/c.jpg",
	];

	// 探针扫过 [0,1) 切成的三等分，必须正好命中三张不同的图
	const probePicks = [0, 1, 2].map((i) => {
		const choice = selectNextWallpaper({
			pool: duplicated,
			current: null,
			baseUrl: BASE,
			rng: () => (i + 0.5) / 3,
		});
		assert.ok(choice.ok);
		return choice.url;
	});
	assert.equal(new Set(probePicks).size, 3, "去重后应只剩三条候选");

	// 分布上三张相当——若重复项带权，a 会明显偏高
	const samples = 900;
	const counts = new Map<string, number>();
	for (const value of seededSequence(20261102, samples)) {
		const choice = selectNextWallpaper({
			pool: duplicated,
			current: null,
			baseUrl: BASE,
			rng: () => value,
		});
		assert.ok(choice.ok);
		counts.set(choice.url, (counts.get(choice.url) ?? 0) + 1);
	}
	const expected = samples / 3;
	for (const path of POOL) {
		const url = new URL(path, BASE).href;
		const hit = counts.get(url) ?? 0;
		assert.ok(
			Math.abs(hit - expected) <= expected * 0.2,
			`${url} 命中 ${hit} 次，与均匀期望 ${expected} 相差过大（重复项带了额外权重？）`,
		);
	}
});
