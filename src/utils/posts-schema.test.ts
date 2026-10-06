// postsSchema 单测：文集两字段（series / seriesOrder）的取值边界。
// 直接引用 src/utils/posts-schema.ts 抽出来的 postsSchema——这是把 schema 从 content.config.ts 抽出来的唯一目的：
// content.config.ts 依赖 astro:content 虚拟模块，裸 node 不可导入，而 astro/zod 可以。
import test from "node:test";
import assert from "node:assert/strict";
import { postsSchema } from "./posts-schema";

// 只给 schema 的必填字段，其余走默认值（hotness / tags / category 等都有 default，可省）
const base = { title: "标题", published: new Date("2026-01-01") };

test("postsSchema.series：接受非空 slug、拒绝空串、接受缺省", () => {
	assert.ok(
		postsSchema.safeParse({ ...base, series: "matt-pocock" }).success,
	);
	// .min(1) 是刻意的：空串在内容层就是 schema 错误，比构建期校验更早
	assert.ok(!postsSchema.safeParse({ ...base, series: "" }).success);
	assert.ok(postsSchema.safeParse(base).success);
});

test("postsSchema.seriesOrder：接受 0、拒绝 -1 与 1.5、接受缺省", () => {
	assert.ok(postsSchema.safeParse({ ...base, seriesOrder: 0 }).success);
	assert.ok(!postsSchema.safeParse({ ...base, seriesOrder: -1 }).success);
	assert.ok(!postsSchema.safeParse({ ...base, seriesOrder: 1.5 }).success);
	assert.ok(postsSchema.safeParse(base).success);
});
