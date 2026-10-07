// series module 纯函数单测：组内序列、封面、元数据与相邻导航（node --test 经 test-hooks 注入解析钩子）。
// 用例自 content-utils.test.ts 拆入（T1，既有用例零丢失），并补 listSeries / getSeriesView /
// getSeriesViewForPost 三个入口的直接用例。Post 以最小形状伪造，仅依赖被测函数实际读取的字段。
import test from "node:test";
import assert from "node:assert/strict";
import {
	buildSeriesNote,
	getSeriesNeighbors,
	getSeriesView,
	getSeriesViewForPost,
	isSeriesMember,
	listSeries,
	resolveSeriesCover,
	resolveSeriesMeta,
	type Post,
} from "./series";

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

test("resolveSeriesCover：显式 cover 优先于成员头图（信任传入的组内序列，不再自行重排）", () => {
	// members 已是组内序列（序号 0 的成员带 image）——显式 cover 也不该被它顶掉
	assert.equal(
		resolveSeriesCover(
			{
				slug: "demo",
				name: "Demo",
				description: "",
				cover: "/images/series/demo.jpg",
			},
			[
				fakePost({
					id: "s0",
					series: "demo",
					seriesOrder: 0,
					image: "/images/posts/a.jpg",
				}),
			],
		),
		"/images/series/demo.jpg",
	);
});

test("getSeriesView：登记 slug 取登记名与量词，成员按 seriesOrder 升序（与发布时间无关）", () => {
	const view = getSeriesView(
		[
			fakePost({
				id: "r2",
				published: d("2026-01-02"),
				series: "webapp-vibe-coding",
				seriesOrder: 2,
			}),
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
		],
		"webapp-vibe-coding",
	);
	assert.equal(view.series.slug, "webapp-vibe-coding");
	assert.equal(view.series.name, "看懂 AI 写的网站"); // 登记名，非 slug
	assert.equal(view.series.unit, "章"); // 登记量词，已补缺省语义
	assert.deepEqual(
		view.members.map((p) => p.id),
		["r0", "r1", "r2"],
	);
});

test("getSeriesView：封面按 seriesOrder 升序取首位带 image 的成员（输入乱序也成立）", () => {
	const view = getSeriesView(
		[
			fakePost({
				id: "s1",
				series: "demo",
				seriesOrder: 1,
				image: "/images/posts/b.jpg",
			}),
			fakePost({
				id: "s0",
				series: "demo",
				seriesOrder: 0,
				image: "/images/posts/a.jpg",
			}),
		],
		"demo",
	);
	assert.deepEqual(
		view.members.map((p) => p.id),
		["s0", "s1"],
	);
	assert.equal(view.cover, "/images/posts/a.jpg");
});

test("getSeriesView：序号 0 无 image 时向后取第一篇带 image 的成员", () => {
	const view = getSeriesView(
		[
			fakePost({ id: "s0", series: "demo", seriesOrder: 0 }),
			fakePost({
				id: "s1",
				series: "demo",
				seriesOrder: 1,
				image: "/images/posts/c.jpg",
			}),
			fakePost({
				id: "s2",
				series: "demo",
				seriesOrder: 2,
				image: "/images/posts/d.jpg",
			}),
		],
		"demo",
	);
	assert.equal(view.cover, "/images/posts/c.jpg");
});

test("getSeriesView：成员全部无 image → 封面 null（不落回 getCover 的随机缩略图，ADR 0007）", () => {
	const view = getSeriesView(
		[
			fakePost({ id: "s0", series: "demo", seriesOrder: 0 }),
			fakePost({ id: "s1", series: "demo", seriesOrder: 1 }),
		],
		"demo",
	);
	assert.equal(view.cover, null);
});

test("getSeriesView：未登记 slug 走防御回退且不串组成员，无成员 → 封面 null", () => {
	const view = getSeriesView(
		[
			fakePost({
				id: "other",
				series: "elsewhere",
				seriesOrder: 0,
				image: "/images/posts/z.jpg",
			}),
		],
		"not-registered",
	);
	assert.equal(view.series.slug, "not-registered");
	assert.equal(view.series.name, "not-registered");
	assert.equal(view.series.unit, "篇");
	assert.equal(view.members.length, 0); // elsewhere 的 image 不参与
	assert.equal(view.cover, null);
});

test("listSeries：按登记表顺序给出全部文集，成员数与量词缺省单源", () => {
	const views = listSeries([
		fakePost({
			id: "w0",
			published: d("2026-01-02"),
			series: "webapp-vibe-coding",
			seriesOrder: 0,
		}),
		fakePost({
			id: "w1",
			published: d("2026-01-01"),
			series: "webapp-vibe-coding",
			seriesOrder: 1,
		}),
		// matt-pocock 零成员：count 0、封面 null（登记表里也没有显式 cover）
	]);
	assert.deepEqual(
		views.map((v) => v.series.slug),
		["webapp-vibe-coding", "matt-pocock"],
	);
	assert.equal(views[0]!.count, 2);
	assert.equal(views[0]!.series.unit, "章");
	assert.equal(views[1]!.count, 0);
	assert.equal(views[1]!.series.unit, "篇"); // 登记表显式量词
	assert.equal(views[1]!.cover, null);
	assert.equal(views[0]!.members.length, views[0]!.count);
});

test("getSeriesViewForPost：成员文章反查到所属文集；草稿/私密/非成员/未登记 → null", () => {
	const member = fakePost({
		id: "r1",
		series: "webapp-vibe-coding",
		seriesOrder: 1,
	});
	const posts = [
		fakePost({ id: "free", published: d("2026-01-03") }),
		member,
		fakePost({
			id: "ghost",
			published: d("2026-01-04"),
			series: "webapp-vibe-coding",
			seriesOrder: 2,
			private: true,
		}),
		fakePost({
			id: "stray",
			published: d("2026-01-05"),
			series: "not-registered",
			seriesOrder: 0,
		}),
	];
	const view = getSeriesViewForPost(posts, "r1");
	assert.equal(view?.series.slug, "webapp-vibe-coding");
	assert.equal(view?.series.name, "看懂 AI 写的网站");
	assert.deepEqual(
		view?.members.map((p) => p.id),
		["r1"], // 私密成员 ghost 不进组内序列
	);
	// 非成员、私密成员、未登记 slug 的成员、未知 id 都拿不到 view
	assert.equal(getSeriesViewForPost(posts, "free"), null);
	assert.equal(getSeriesViewForPost(posts, "ghost"), null);
	assert.equal(getSeriesViewForPost(posts, "stray"), null);
	assert.equal(getSeriesViewForPost(posts, "nope"), null);
});
