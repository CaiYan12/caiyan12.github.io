// series-integrity 单测：四条规则各一条违规用例 + 一条全合规用例。
// 造假 post 的风格照 content-utils.test.ts（最小形状 + as unknown as Post）
// （node --test 经 test-hooks 注入解析钩子）。
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { checkSeriesIntegrity, checkSeriesCovers } from "./series-integrity";
import type { Post } from "./content-utils";
import type { SeriesMeta } from "../data/series";

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
			published: new Date("2026-01-01"),
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

/** 测试用登记表：一笔无 cover 的 demo 文集 */
const series: SeriesMeta[] = [
	{ slug: "demo", name: "示例文集", description: "" },
];

/** 仓库 public/ 的真实路径（测试从仓库根跑，用 import.meta.url 定位更稳） */
const publicDir = fileURLToPath(new URL("../../public/", import.meta.url));

test("规则 1：series 值未登记 → 违规指名文章", () => {
	const posts = [fakePost({ id: "p1", series: "ghost", seriesOrder: 0 })];
	assert.deepEqual(checkSeriesIntegrity(posts, series), [
		{
			source: "p1",
			reason: 'series "ghost" 未在 src/data/series.ts 登记',
		},
	]);
});

test("规则 2：同一文集内 seriesOrder 重复 → 违规指名全部涉事文章", () => {
	const posts = [
		fakePost({ id: "a", series: "demo", seriesOrder: 0 }),
		fakePost({ id: "b", series: "demo", seriesOrder: 0 }),
	];
	assert.deepEqual(checkSeriesIntegrity(posts, series), [
		{ source: "a、b", reason: 'series "demo" 内 seriesOrder 0 重复' },
	]);
});

test("规则 3：带 series 缺 seriesOrder → 违规指名文章", () => {
	const posts = [fakePost({ id: "c", series: "demo" })];
	assert.deepEqual(checkSeriesIntegrity(posts, series), [
		{
			source: "c",
			reason: 'series "demo" 缺少 seriesOrder（带 series 的文章必须显式给出组内序号）',
		},
	]);
});

test("规则 4：cover 指向 public/ 下不存在的文件 → 违规指名文集", () => {
	const withCover: SeriesMeta[] = [
		{
			slug: "demo",
			name: "示例文集",
			description: "",
			cover: "/images/series/no-such-cover.jpg",
		},
	];
	assert.deepEqual(checkSeriesCovers(withCover, publicDir), [
		{
			source: "demo",
			reason: 'cover "/images/series/no-such-cover.jpg" 在 public/ 下不存在',
		},
	]);
});

test("全合规：合规成员 + 非成员 + 存在的 cover → 空清单", () => {
	const posts = [
		fakePost({ id: "p0", series: "demo", seriesOrder: 0 }),
		fakePost({ id: "p1", series: "demo", seriesOrder: 1 }),
		fakePost({ id: "free" }), // 非成员：不参与任何规则
	];
	assert.deepEqual(checkSeriesIntegrity(posts, series), []);
	// 无 cover 的登记表不产生规则 4 违规
	assert.deepEqual(checkSeriesCovers(series, publicDir), []);
	// 写了 cover 且文件存在 → 也不违规
	const withRealCover: SeriesMeta[] = [
		{
			slug: "demo",
			name: "示例文集",
			description: "",
			cover: "/images/posts/20261002071103/webapp-vibe-coding-ch0-cover.jpg",
		},
	];
	assert.deepEqual(checkSeriesCovers(withRealCover, publicDir), []);
});
