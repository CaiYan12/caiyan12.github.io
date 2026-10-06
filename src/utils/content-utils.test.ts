// content-utils 纯函数单测：排序/评分/聚合是所有列表页的数据地基（node --test 经 test-hooks 注入解析钩子）。
// 用例中的 Post 以最小形状伪造，经 as unknown as Post 断言注入——仅依赖被测函数实际读取的字段。
import test from "node:test";
import assert from "node:assert/strict";
import {
	getSortedPosts,
	getHotPosts,
	getTagList,
	getCategoryList,
	getNeighbors,
	getSeriesNeighbors,
	isSeriesMember,
	resolveSeriesMeta,
	buildSeriesNote,
	getCover,
	getExcerpt,
	type Post,
} from "./content-utils";

const d = (s: string) => new Date(s);

function fakePost(overrides: Record<string, unknown> = {}): Post {
	const { id = "20260101000000", body = "", ...data } = overrides;
	return {
		id,
		slug: id,
		body,
		collection: "posts",
		render: () => {
			throw new Error("not implemented in test");
		},
		data: {
			title: `post-${id}`,
			published: d("2026-01-01"),
			pinned: false,
			draft: false,
			private: false,
			tags: [],
			category: "",
			hotness: 0,
			comments: 0,
			...data,
		},
	} as unknown as Post;
}

test("getSortedPosts：置顶优先，同级按发布时间倒序，过滤草稿与私密帖", () => {
	const posts = [
		fakePost({ id: "20260103000000", published: d("2026-01-03") }),
		fakePost({
			id: "20260101000000",
			published: d("2026-01-01"),
			pinned: true,
		}),
		fakePost({
			id: "20260104000000",
			published: d("2026-01-04"),
			draft: true,
		}),
		fakePost({
			id: "20260105000000",
			published: d("2026-01-05"),
			private: true,
		}),
		fakePost({ id: "20260102000000", published: d("2026-01-02") }),
	];
	const sorted = getSortedPosts(posts);
	assert.deepEqual(
		sorted.map((p) => p.id),
		["20260101000000", "20260103000000", "20260102000000"],
	);
});

test("getHotPosts：hotness×100+有效评论数评分，同分按发布时间倒序", () => {
	const posts = [
		// 4×100+0=400 分
		fakePost({
			id: "20260101000000",
			published: d("2026-01-01"),
			hotness: 4,
		}),
		// 3×100+50=350 分
		fakePost({
			id: "20260102000000",
			published: d("2026-01-02"),
			hotness: 3,
			comments: 50,
		}),
		// 3×100+50=350 分，时间更新 → 排在上一条前
		fakePost({
			id: "20260105000000",
			published: d("2026-01-05"),
			hotness: 3,
			comments: 50,
		}),
		// 0 分但时间最新 → 垫底
		fakePost({
			id: "20260106000000",
			published: d("2026-01-06"),
			hotness: 0,
		}),
		fakePost({
			id: "20260107000000",
			published: d("2026-01-07"),
			draft: true,
		}),
	];
	const hot = getHotPosts(posts, 10);
	assert.deepEqual(
		hot.map((p) => p.id),
		[
			"20260101000000",
			"20260105000000",
			"20260102000000",
			"20260106000000",
		],
	);
	// limit 截断
	assert.equal(getHotPosts(posts, 2).length, 2);
});

test("getTagList/getCategoryList：按文章数倒序，忽略草稿与私密帖，空分类跳过", () => {
	const posts = [
		fakePost({ id: "1", tags: ["astro", "css"], category: "前端" }),
		fakePost({ id: "2", tags: ["astro"], category: "前端" }),
		fakePost({ id: "3", tags: ["css"], category: "工具", draft: true }),
		fakePost({ id: "4", tags: ["私货"], category: "", private: true }),
	];
	assert.deepEqual(getTagList(posts), [
		{ name: "astro", count: 2 },
		{ name: "css", count: 1 },
	]);
	assert.deepEqual(getCategoryList(posts), [{ name: "前端", count: 2 }]);
});

test("getNeighbors：prev 为更早一篇、next 为更新一篇；首末篇与未知 slug 边界", () => {
	const posts = [
		fakePost({ id: "a", published: d("2026-01-01") }),
		fakePost({ id: "b", published: d("2026-01-02") }),
		fakePost({ id: "c", published: d("2026-01-03") }),
	];
	// b 的上一篇是更早的 a，下一篇是更新的 c
	assert.deepEqual(getNeighbors(posts, "b").prev?.id, "a");
	assert.deepEqual(getNeighbors(posts, "b").next?.id, "c");
	// 最新一篇没有"下一篇"
	const c = getNeighbors(posts, "c");
	assert.equal(c.prev?.id, "b");
	assert.equal(c.next, null);
	// 最早一篇没有"上一篇"
	const a = getNeighbors(posts, "a");
	assert.equal(a.prev, null);
	assert.equal(a.next?.id, "b");
	// 单篇与未知 slug
	const single = getNeighbors([posts[0]!], "a");
	assert.equal(single.prev, null);
	assert.equal(single.next, null);
	assert.deepEqual(getNeighbors(posts, "nope"), { prev: null, next: null });
});

test("isSeriesMember：只看 frontmatter 有没有 series 属性，不查登记表", () => {
	assert.equal(isSeriesMember(fakePost({ series: "matt-pocock" })), true);
	assert.equal(isSeriesMember(fakePost({})), false);
});

test("getSeriesNeighbors：组内按 seriesOrder 相邻、边界不渲染、非成员跳过整块", () => {
	// 组内三篇：published 顺序与 seriesOrder 相反，证明组内顺序跟 seriesOrder 而非发布时间
	const posts = [
		fakePost({
			id: "s0",
			published: d("2026-01-03"),
			series: "demo",
			seriesOrder: 0,
		}),
		fakePost({
			id: "s1",
			published: d("2026-01-01"),
			series: "demo",
			seriesOrder: 1,
		}),
		fakePost({
			id: "s2",
			published: d("2026-01-02"),
			series: "demo",
			seriesOrder: 2,
		}),
	];
	// 组内中间篇：prev 为序号更小、next 为序号更大
	const mid = getSeriesNeighbors(posts, "s1");
	assert.equal(mid.prev?.id, "s0");
	assert.equal(mid.next?.id, "s2");
	assert.equal(mid.series?.total, 3);
	// 首篇 prev === null、末篇 next === null（不跨出文集）
	assert.equal(getSeriesNeighbors(posts, "s0").prev, null);
	assert.equal(getSeriesNeighbors(posts, "s0").next?.id, "s1");
	assert.equal(getSeriesNeighbors(posts, "s2").prev?.id, "s1");
	assert.equal(getSeriesNeighbors(posts, "s2").next, null);

	// 单篇文集：两侧皆 null
	const single = getSeriesNeighbors(
		[fakePost({ id: "only", series: "demo", seriesOrder: 0 })],
		"only",
	);
	assert.equal(single.prev, null);
	assert.equal(single.next, null);
	assert.equal(single.series?.total, 1);

	// 非成员跳过整块：成员夹在两篇非成员之间，非成员只与非成员相邻
	const mixed = [
		fakePost({ id: "old", published: d("2026-01-01") }),
		fakePost({
			id: "m0",
			published: d("2026-01-02"),
			series: "demo",
			seriesOrder: 0,
		}),
		fakePost({ id: "new", published: d("2026-01-03") }),
	];
	const old = getSeriesNeighbors(mixed, "old");
	assert.equal(old.prev, null);
	assert.equal(old.next?.id, "new"); // 跳过 m0
	assert.equal(old.series, null);
	const free = getSeriesNeighbors(mixed, "new");
	assert.equal(free.prev?.id, "old"); // 跳过 m0
	assert.equal(free.series, null);

	// 判定只看属性：两篇 series 值相同即互为相邻，即使该 slug 未登记（无 seriesList 记录）
	const unregistered = [
		fakePost({
			id: "u0",
			published: d("2026-01-01"),
			series: "not-registered",
			seriesOrder: 0,
		}),
		fakePost({
			id: "u1",
			published: d("2026-01-02"),
			series: "not-registered",
			seriesOrder: 1,
		}),
	];
	const u = getSeriesNeighbors(unregistered, "u0");
	assert.equal(u.next?.id, "u1");
	assert.equal(u.series?.slug, "not-registered");
	assert.equal(u.series?.name, "not-registered");
	assert.equal(u.series?.unit, "篇");

	// 登记过的 slug：name / unit / index / total 取登记元数据与组内 0 基位置，
	// 必须区别于未登记回退值（name = slug、"篇"），否则与占位实现同形、咬不住
	const registered = [
		fakePost({
			id: "r0",
			published: d("2026-01-03"),
			series: "webapp-vibe-coding",
			seriesOrder: 0,
		}),
		fakePost({
			id: "r1",
			published: d("2026-01-01"),
			series: "webapp-vibe-coding",
			seriesOrder: 1,
		}),
		fakePost({
			id: "r2",
			published: d("2026-01-02"),
			series: "webapp-vibe-coding",
			seriesOrder: 2,
		}),
	];
	const regMid = getSeriesNeighbors(registered, "r1");
	assert.equal(regMid.prev?.id, "r0");
	assert.equal(regMid.next?.id, "r2");
	assert.equal(regMid.series?.slug, "webapp-vibe-coding");
	assert.equal(regMid.series?.name, "看懂 AI 写的网站"); // 登记名，非 slug
	assert.equal(regMid.series?.unit, "章"); // 登记量词，非回退值 "篇"
	assert.equal(regMid.series?.index, 1); // 组内 0 基位置
	assert.equal(regMid.series?.total, 3);
});

test("resolveSeriesMeta：登记过的 slug 取到 name / unit", () => {
	const meta = resolveSeriesMeta("webapp-vibe-coding");
	assert.equal(meta.slug, "webapp-vibe-coding");
	assert.equal(meta.name, "看懂 AI 写的网站");
	// 量词取自登记表（"章"），而非未登记回退值 "篇"
	assert.equal(meta.unit, "章");
	assert.ok(meta.description.length > 0);
});

test("resolveSeriesMeta：未登记的 slug 回退为 name = slug、unit = 篇、description = 空", () => {
	assert.deepEqual(resolveSeriesMeta("not-registered"), {
		slug: "not-registered",
		name: "not-registered",
		unit: "篇",
		description: "",
	});
});

test("buildSeriesNote：0 基进度、量词取登记表；末章换收尾文案与 /series/ 链接", () => {
	const meta = {
		slug: "webapp-vibe-coding",
		name: "看懂 AI 写的网站",
		unit: "章",
		index: 3,
		total: 4,
	};
	// 非末章：顶部有目录链接，末尾与顶部同前缀且无链接
	const mid = buildSeriesNote(meta, false);
	assert.equal(mid.top.prefix, "本文属于《看懂 AI 写的网站》· 第 3 / 4 章");
	assert.deepEqual(mid.top.link, {
		href: "/series/webapp-vibe-coding/",
		label: "目录",
	});
	assert.equal(
		mid.bottom.prefix,
		"本文属于《看懂 AI 写的网站》· 第 3 / 4 章",
	);
	assert.equal(mid.bottom.link, null);

	// 末章：末尾换成收尾文案，链接指向总览页
	const last = buildSeriesNote(meta, true);
	assert.equal(last.bottom.prefix, "《看懂 AI 写的网站》已读完");
	assert.deepEqual(last.bottom.link, {
		href: "/series/",
		label: "看其它文集",
	});

	// 0 基刻意不加 1：第〇章（index 0）渲染为「第 0 / 4 章」，与书自身编号一致
	const ch0 = buildSeriesNote({ ...meta, index: 0 }, false);
	assert.equal(ch0.top.prefix, "本文属于《看懂 AI 写的网站》· 第 0 / 4 章");

	// 量词取登记表：篇
	const matt = buildSeriesNote(
		{
			slug: "matt-pocock",
			name: "Matt Pocock 技能选讲",
			unit: "篇",
			index: 1,
			total: 2,
		},
		true,
	);
	assert.equal(
		matt.top.prefix,
		"本文属于《Matt Pocock 技能选讲》· 第 1 / 2 篇",
	);
	assert.deepEqual(matt.top.link, {
		href: "/series/matt-pocock/",
		label: "目录",
	});
});

test("getCover：frontmatter image 优先；无图时 slug hash 稳定映射到 1..40 缩略图", () => {
	assert.equal(
		getCover(fakePost({ id: "a", image: "/images/x.png" })),
		"/images/x.png",
	);
	const fallback = getCover(fakePost({ id: "20260101000000" }));
	assert.match(fallback, /^\/images\/random\/tb\d+\.jpg$/);
	const idx = Number(fallback.match(/tb(\d+)\.jpg/)![1]);
	assert.ok(idx >= 1 && idx <= 40, `idx=${idx} out of range`);
	// 同 slug 多次调用结果稳定
	assert.equal(fallback, getCover(fakePost({ id: "20260101000000" })));
});

test("getExcerpt：frontmatter excerpt 优先；否则剥离 Markdown 粗读正文并截断", () => {
	assert.equal(getExcerpt(fakePost({ excerpt: "直接给摘要" })), "直接给摘要");
	const stripped = getExcerpt(
		fakePost({
			body: "# 标题\n\n正文**加粗**一段，含[链接](https://e.com)。\n\n```js\ncode()\n```",
		}),
	);
	assert.ok(!stripped.includes("#"));
	assert.ok(!stripped.includes("**"));
	assert.ok(!stripped.includes("https://e.com"));
	assert.ok(stripped.includes("正文加粗一段"));
	// 超长截断带省略号
	const long = getExcerpt(fakePost({ body: "字".repeat(200) }), 120);
	assert.equal(long.length, 121);
	assert.ok(long.endsWith("…"));
});
