// Task 1 fixture 测试：以注入快照验证 site-stats 读取层合同。
// 只注入内存 fixture，不改动任何源文件或生成文件，不发起任何网络请求。
import test from "node:test";
import assert from "node:assert/strict";
import {
	getEffectiveCommentsWith,
	getEffectiveViewsWith,
} from "../src/utils/site-stats.ts";

const snapshot = {
	schemaVersion: 1,
	generatedAt: "2026-09-02T00:00:00.000Z",
	comments: { "20260320000000": 1 },
	viewsDelta: { "20260320000000": 12 },
};

test("远端显式 0 覆盖 frontmatter 值 8", () => {
	assert.equal(
		getEffectiveCommentsWith(
			{ comments: { "20260320000000": 0 } },
			{ id: "20260320000000", data: { comments: 8, views: 0 } },
		),
		0,
	);
});

test("远端缺失 key 回退 frontmatter 值", () => {
	assert.equal(
		getEffectiveCommentsWith(
			{ comments: {} },
			{ id: "20240101000000", data: { comments: 8, views: 0 } },
		),
		8,
	);
});

test("fixture 中远端评论数 1 被采用", () => {
	assert.equal(
		getEffectiveCommentsWith(snapshot, {
			id: "20260320000000",
			data: { comments: 0, views: 0 },
		}),
		1,
	);
});

test("views 为 frontmatter 基线 + 增量", () => {
	assert.equal(
		getEffectiveViewsWith(snapshot, {
			id: "20260320000000",
			data: { comments: 0, views: 100 },
		}),
		112,
	);
});

test("views 增量缺失时仅保留基线", () => {
	assert.equal(
		getEffectiveViewsWith(snapshot, {
			id: "20990101000000",
			data: { comments: 0, views: 7 },
		}),
		7,
	);
});

test("负数与非有限值归一化为 0", () => {
	assert.equal(
		getEffectiveViewsWith(
			{ viewsDelta: { "20260320000000": -5 } },
			{ id: "20260320000000", data: { comments: 0, views: 10 } },
		),
		10,
	);
	assert.equal(
		getEffectiveCommentsWith(
			{ comments: { "20260320000000": Number.NaN } },
			{ id: "20260320000000", data: { comments: 8, views: 0 } },
		),
		0,
	);
});
