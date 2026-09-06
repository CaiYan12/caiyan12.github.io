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
