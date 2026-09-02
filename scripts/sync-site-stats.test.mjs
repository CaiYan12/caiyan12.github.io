// Giscus 评论同步脚本测试：全部通过注入 fetchImpl 模拟，绝不访问 GitHub，
// 输出写到临时文件，绝不改动跟踪中的 src/data/site-stats.json。
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
	syncSiteStats,
	countDiscussionComments,
	buildSnapshot,
} from "./sync-site-stats.mjs";

// 与 syncSiteStats 相同的枚举规则（脚本相对仓库根解析）
const slugs = (
	await fs.readdir(
		path.resolve(import.meta.dirname, "..", "src", "content", "posts"),
		{ withFileTypes: true },
	)
)
	.filter((e) => e.isDirectory() && /^\d{14}$/.test(e.name))
	.map((e) => e.name)
	.sort();
const slugA = slugs[0];
const slugB = slugs[1];

function gqlOk(data) {
	return {
		ok: true,
		status: 200,
		headers: new Headers(),
		json: async () => data,
	};
}

function httpError(status) {
	return {
		ok: false,
		status,
		headers: new Headers(),
		json: async () => ({}),
	};
}

function discussionsPage(nodes, hasNextPage, endCursor) {
	return gqlOk({
		data: {
			repository: {
				discussions: {
					nodes,
					pageInfo: { hasNextPage, endCursor },
				},
			},
		},
	});
}

function commentsPage(
	totalCount,
	nodes,
	hasNextPage = false,
	endCursor = null,
) {
	return gqlOk({
		data: {
			node: {
				comments: {
					totalCount,
					nodes,
					pageInfo: { hasNextPage, endCursor },
				},
			},
		},
	});
}

function tmpFile() {
	return path.join(
		os.tmpdir(),
		`site-stats-test-${Date.now()}-${Math.random().toString(36).slice(2)}.json`,
	);
}

test("countDiscussionComments 跨页汇总顶层与回复", () => {
	assert.equal(
		countDiscussionComments([
			{
				totalCount: 3,
				nodes: [
					{ replies: { totalCount: 2 } },
					{ replies: { totalCount: 0 } },
				],
				pageInfo: { hasNextPage: true, endCursor: "COMMENTS-1" },
			},
			{
				totalCount: 3,
				nodes: [{ replies: { totalCount: 5 } }],
				pageInfo: { hasNextPage: false, endCursor: null },
			},
		]),
		10,
	);
	assert.equal(
		countDiscussionComments([
			{
				totalCount: 0,
				nodes: [],
				pageInfo: { hasNextPage: false, endCursor: null },
			},
		]),
		0,
	);
	assert.throws(() => countDiscussionComments([]));
	assert.throws(() => countDiscussionComments([{ totalCount: -1 }]));
	assert.throws(
		() => countDiscussionComments([{ totalCount: 1, nodes: null }]),
		/malformed comment connection nodes/,
	);
	assert.throws(
		() => countDiscussionComments([{ totalCount: 1, nodes: [{}] }]),
		/malformed comment node|replies\.totalCount/,
	);
	assert.throws(
		() =>
			countDiscussionComments([
				{ totalCount: 1, nodes: [{ replies: {} }] },
			]),
		/replies\.totalCount/,
	);
});

test("buildSnapshot 校验 key 与计数", () => {
	const snapshot = buildSnapshot({
		slugs: ["20260320000000"],
		discussions: new Map([["20260320000000", 0]]),
		generatedAt: "2026-09-02T00:00:00.000Z",
	});
	assert.deepEqual(snapshot, {
		schemaVersion: 1,
		generatedAt: "2026-09-02T00:00:00.000Z",
		comments: { 20260320000000: 0 },
	});
	assert.throws(() =>
		buildSnapshot({
			slugs: ["20260320000000"],
			discussions: new Map([["guestbook", 1]]),
			generatedAt: "x",
		}),
	);
	assert.throws(() =>
		buildSnapshot({
			slugs: ["20260320000000"],
			discussions: new Map([["20260320000000", -1]]),
			generatedAt: "x",
		}),
	);
});

test("Discussions 游标分页 + 顶层/回复汇总 + 显式 0 + 未匹配标题被忽略", async () => {
	const calls = [];
	const responses = [
		discussionsPage(
			[
				{ id: "D1", title: `posts/${slugA}/` },
				{ id: "D2", title: "guestbook" },
			],
			true,
			"CUR1",
		),
		discussionsPage([{ id: "D3", title: `posts/${slugB}/` }], false, null),
		commentsPage(1, [
			{ replies: { totalCount: 2 } },
			{ replies: { totalCount: 0 } },
		]),
		commentsPage(0, []),
	];
	const fetchImpl = async (url, opts) => {
		calls.push({ url, body: JSON.parse(opts.body) });
		return responses.shift();
	};
	const output = tmpFile();
	const snapshot = await syncSiteStats({
		fetchImpl,
		outputPath: output,
		env: { GITHUB_TOKEN: "test-token" },
	});
	assert.equal(responses.length, 0);
	assert.equal(calls.length, 4);
	assert.equal(calls[1].body.variables.after, "CUR1");
	assert.equal(snapshot.comments[slugA], 3); // 1 顶层 + 2 回复
	assert.equal(snapshot.comments[slugB], 0); // 显式 0 保留
	assert.ok(!("guestbook" in snapshot.comments));
	for (const slug of slugs.slice(2)) {
		assert.ok(!(slug in snapshot.comments), `unexpected key ${slug}`);
	}
	assert.equal(snapshot.schemaVersion, 1);
	const written = JSON.parse(await fs.readFile(output, "utf-8"));
	assert.equal(written.comments[slugA], 3);
	await fs.rm(output, { force: true });
});

test("有效的 Discussions 与 comments 分页超过 50 页仍完成", async () => {
	const totalPages = 51;
	let discussionPage = 0;
	let commentsPageIndex = 0;
	const calls = [];
	const fetchImpl = async (url, opts) => {
		const body = JSON.parse(opts.body);
		calls.push(body.variables.after ?? body.variables.id);
		if (body.variables.id) {
			const index = commentsPageIndex++;
			return commentsPage(
				totalPages,
				[{ replies: { totalCount: 0 } }],
				index < totalPages - 1,
				index < totalPages - 1 ? `COMMENTS-${index + 1}` : null,
			);
		}
		const index = discussionPage++;
		return discussionsPage(
			index === 0 ? [{ id: "D1", title: `posts/${slugA}/` }] : [],
			index < totalPages - 1,
			index < totalPages - 1 ? `DISC-${index + 1}` : null,
		);
	};
	const output = tmpFile();
	try {
		const snapshot = await syncSiteStats({
			fetchImpl,
			outputPath: output,
			env: { GITHUB_TOKEN: "t" },
		});
		assert.equal(discussionPage, totalPages);
		assert.equal(commentsPageIndex, totalPages);
		assert.equal(calls.length, totalPages * 2);
		assert.equal(snapshot.comments[slugA], totalPages);
	} finally {
		await fs.rm(output, { force: true });
	}
});

test("Discussions 交替游标循环 fail closed 且不替换既有快照", async () => {
	const output = tmpFile();
	const original = Buffer.from("discussion cycle sentinel", "utf8");
	await fs.writeFile(output, original);
	let calls = 0;
	try {
		await assert.rejects(
			syncSiteStats({
				fetchImpl: async (_url, opts) => {
					calls += 1;
					if (calls > 3) throw new Error("fixture safety stop");
					const after = JSON.parse(opts.body).variables.after;
					const endCursor =
						after === null ? "A" : after === "A" ? "B" : "A";
					return discussionsPage([], true, endCursor);
				},
				outputPath: output,
				env: { GITHUB_TOKEN: "t" },
			}),
			/malformed Discussions connection: cursor already seen/,
		);
		assert.equal(calls, 3);
		assert.deepEqual(await fs.readFile(output), original);
		await assert.rejects(
			fs.access(`${output}.tmp`),
			(error) => error.code === "ENOENT",
		);
	} finally {
		await fs.rm(output, { force: true });
	}
});

test("comments 交替游标循环 fail closed 且不替换既有快照", async () => {
	const output = tmpFile();
	const original = Buffer.from("comments cycle sentinel", "utf8");
	await fs.writeFile(output, original);
	let commentCalls = 0;
	try {
		await assert.rejects(
			syncSiteStats({
				fetchImpl: async (url, opts) => {
					const body = JSON.parse(opts.body);
					if (url.includes("api.github.com") && body.variables.id) {
						commentCalls += 1;
						if (commentCalls > 3)
							throw new Error("fixture safety stop");
						const after = body.variables.after;
						const endCursor =
							after === null ? "A" : after === "A" ? "B" : "A";
						return commentsPage(
							3,
							[{ replies: { totalCount: 0 } }],
							true,
							endCursor,
						);
					}
					return discussionsPage(
						[{ id: "D1", title: `posts/${slugA}/` }],
						false,
						null,
					);
				},
				outputPath: output,
				env: { GITHUB_TOKEN: "t" },
			}),
			/malformed comments connection: cursor already seen/,
		);
		assert.equal(commentCalls, 3);
		assert.deepEqual(await fs.readFile(output), original);
		await assert.rejects(
			fs.access(`${output}.tmp`),
			(error) => error.code === "ENOENT",
		);
	} finally {
		await fs.rm(output, { force: true });
	}
});

test("malformed Discussions 分页连接 fail closed", async () => {
	const malformedConnections = [
		[
			"missing nodes",
			{ pageInfo: { hasNextPage: false, endCursor: null } },
		],
		["missing pageInfo", { nodes: [] }],
		["missing hasNextPage", { nodes: [], pageInfo: { endCursor: null } }],
		[
			"missing next cursor",
			{ nodes: [], pageInfo: { hasNextPage: true, endCursor: null } },
		],
	];

	for (const [label, connection] of malformedConnections) {
		const output = tmpFile();
		const original = Buffer.from("保留的旧快照\r\n", "utf8");
		await fs.writeFile(output, original);
		try {
			await assert.rejects(
				syncSiteStats({
					fetchImpl: async () =>
						gqlOk({
							data: {
								repository: { discussions: connection },
							},
						}),
					outputPath: output,
					env: { GITHUB_TOKEN: "t" },
				}),
				/malformed Discussions connection|hasNextPage|cursor/,
			);
			assert.deepEqual(await fs.readFile(output), original, label);
		} finally {
			await fs.rm(output, { force: true });
		}
	}
});

test("malformed Discussion 节点与匹配文章的 unusable id fail closed", async () => {
	const malformedNodes = [
		["missing id", { title: `posts/${slugA}/` }],
		["missing title", { id: "D1" }],
		["null node", null],
		["empty matched id", { id: "", title: `posts/${slugA}/` }],
	];

	for (const [label, node] of malformedNodes) {
		const output = tmpFile();
		const original = Buffer.from("稳定的旧内容", "utf8");
		await fs.writeFile(output, original);
		try {
			await assert.rejects(
				syncSiteStats({
					fetchImpl: async () =>
						gqlOk({
							data: {
								repository: {
									discussions: {
										nodes: [node],
										pageInfo: {
											hasNextPage: false,
											endCursor: null,
										},
									},
								},
							},
						}),
					outputPath: output,
					env: { GITHUB_TOKEN: "t" },
				}),
				/malformed Discussion node|usable Discussion id/,
			);
			assert.deepEqual(await fs.readFile(output), original, label);
		} finally {
			await fs.rm(output, { force: true });
		}
	}
});

test("malformed comments 分页连接均不替换既有快照", async () => {
	const malformedConnections = [
		[
			"missing nodes",
			{
				totalCount: 1,
				pageInfo: { hasNextPage: false, endCursor: null },
			},
		],
		[
			"mistyped nodes",
			{
				totalCount: 1,
				nodes: {},
				pageInfo: { hasNextPage: false, endCursor: null },
			},
		],
		["missing pageInfo", { totalCount: 1, nodes: [] }],
		[
			"mistyped pageInfo",
			{ totalCount: 1, nodes: [], pageInfo: "invalid" },
		],
		[
			"missing hasNextPage",
			{ totalCount: 1, nodes: [], pageInfo: { endCursor: null } },
		],
		[
			"mistyped hasNextPage",
			{
				totalCount: 1,
				nodes: [],
				pageInfo: { hasNextPage: "false", endCursor: null },
			},
		],
		[
			"missing required cursor",
			{
				totalCount: 1,
				nodes: [],
				pageInfo: { hasNextPage: true, endCursor: null },
			},
		],
		[
			"mistyped required cursor",
			{
				totalCount: 1,
				nodes: [],
				pageInfo: { hasNextPage: true, endCursor: 42 },
			},
		],
	];

	for (const [label, connection] of malformedConnections) {
		const output = tmpFile();
		const original = Buffer.from("稳定的旧内容\r\n", "utf8");
		await fs.writeFile(output, original);
		const responses = [
			discussionsPage(
				[{ id: "D1", title: `posts/${slugA}/` }],
				false,
				null,
			),
			gqlOk({ data: { node: { comments: connection } } }),
		];
		try {
			await assert.rejects(
				syncSiteStats({
					fetchImpl: async () => responses.shift(),
					outputPath: output,
					env: { GITHUB_TOKEN: "t" },
				}),
				/malformed comments connection|pageInfo|hasNextPage|cursor/,
			);
			assert.deepEqual(await fs.readFile(output), original, label);
		} finally {
			await fs.rm(output, { force: true });
		}
	}
});

test("comments 非递进游标 fail closed 且不替换既有快照", async () => {
	const output = tmpFile();
	const original = Buffer.from("cursor guard sentinel", "utf8");
	await fs.writeFile(output, original);
	const responses = [
		discussionsPage([{ id: "D1", title: `posts/${slugA}/` }], false, null),
		commentsPage(2, [{ replies: { totalCount: 0 } }], true, "COMMENTS-1"),
		gqlOk({
			data: {
				node: {
					comments: {
						totalCount: 2,
						nodes: [{ replies: { totalCount: 0 } }],
						pageInfo: {
							hasNextPage: true,
							endCursor: "COMMENTS-1",
						},
					},
				},
			},
		}),
	];
	try {
		await assert.rejects(
			syncSiteStats({
				fetchImpl: async () => responses.shift(),
				outputPath: output,
				env: { GITHUB_TOKEN: "t" },
			}),
			/malformed comments connection|cursor did not advance/,
		);
		assert.deepEqual(await fs.readFile(output), original);
	} finally {
		await fs.rm(output, { force: true });
	}
});

test("GraphQL errors 中止：输出字节不变且无 tmp 残留", async () => {
	const output = tmpFile();
	await fs.writeFile(output, "SENTINEL", "utf-8");
	const fetchImpl = async () => ({
		ok: true,
		status: 200,
		headers: new Headers(),
		json: async () => ({ errors: [{ message: "bad category" }] }),
	});
	await assert.rejects(
		syncSiteStats({
			fetchImpl,
			outputPath: output,
			env: { GITHUB_TOKEN: "t" },
		}),
		/GitHub GraphQL errors/,
	);
	assert.equal(await fs.readFile(output, "utf-8"), "SENTINEL");
	const leftovers = (await fs.readdir(path.dirname(output))).filter(
		(f) => f.startsWith(path.basename(output)) && f.endsWith(".tmp"),
	);
	assert.equal(leftovers.length, 0);
	await fs.rm(output, { force: true });
});

test("GitHub 非 2xx 中止且不写输出", async () => {
	const output = tmpFile();
	await fs.writeFile(output, "SENTINEL", "utf-8");
	const fetchImpl = async () => httpError(500);
	await assert.rejects(
		syncSiteStats({
			fetchImpl,
			outputPath: output,
			env: { GITHUB_TOKEN: "t" },
		}),
		/HTTP 500/,
	);
	assert.equal(await fs.readFile(output, "utf-8"), "SENTINEL");
	await fs.rm(output, { force: true });
});
