import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
	fetchGitHubProjects,
	syncGitHubProjects,
	validateSnapshot,
} from "./fetch-github-projects.mjs";

const NO_TOKEN_ENV = { GITHUB_TOKEN: "", GH_TOKEN: "" };
const throwingExec = () => {
	throw new Error("gh not available");
};

function repo({
	name,
	owner = "CaiYan12",
	description = `${name} description`,
	homepageUrl = null,
	language = "TypeScript",
	topics = [],
	createdAt = "2026-09-10T00:00:00Z",
	isFork = false,
	isArchived = false,
}) {
	return {
		name,
		nameWithOwner: `${owner}/${name}`,
		description,
		url: `https://github.com/${owner}/${name}`,
		homepageUrl,
		createdAt,
		isFork,
		isArchived,
		primaryLanguage: language ? { name: language } : null,
		repositoryTopics: {
			nodes: topics.map((topic) => ({ topic: { name: topic } })),
		},
	};
}

function page({ nodes, pinned = [], hasNextPage = false, endCursor = null }) {
	return {
		data: {
			user: {
				repositories: {
					nodes,
					pageInfo: { hasNextPage, endCursor },
				},
				pinnedItems: {
					nodes: pinned.map((nameWithOwner) => ({ nameWithOwner })),
				},
			},
		},
	};
}

function response(payload, status = 200) {
	return {
		ok: status >= 200 && status < 300,
		status,
		json: async () => payload,
	};
}

async function tempOutput() {
	const dir = await fs.mkdtemp(
		path.join(os.tmpdir(), "github-projects-test-"),
	);
	return path.join(dir, "github-projects.json");
}

function validSnapshot() {
	return {
		schemaVersion: 1,
		generatedAt: "2026-09-16T00:00:00.000Z",
		login: "CaiYan12",
		pinnedRepositories: ["CaiYan12/opia-rss-reader"],
		repositories: [
			{
				name: "opia-rss-reader",
				nameWithOwner: "CaiYan12/opia-rss-reader",
				description: "RSS reader",
				url: "https://github.com/CaiYan12/opia-rss-reader",
				homepageUrl: null,
				primaryLanguage: "TypeScript",
				topics: ["electron", "rss"],
				createdAt: "2026-08-19T07:48:02Z",
			},
		],
	};
}

test("fetchGitHubProjects 分页拉取，排除 fork/归档，并只保留已收录 pinned", async () => {
	const outputPath = await tempOutput();
	const calls = [];
	const pages = [
		page({
			nodes: [
				repo({ name: "caiyan12.github.io", topics: ["blog"] }),
				repo({ name: "Break-This-Repo", isFork: true }),
			],
			pinned: [
				"CaiYan12/caiyan12.github.io",
				"CaiYan12/opia-rss-reader",
				"unovue/inspira-ui",
			],
			hasNextPage: true,
			endCursor: "cursor-1",
		}),
		page({
			nodes: [
				repo({
					name: "opia-rss-reader",
					topics: ["electron", "rss"],
					createdAt: "2026-08-19T07:48:02Z",
				}),
				repo({ name: "old-project", isArchived: true }),
			],
		}),
	];
	const result = await fetchGitHubProjects({
		fetchImpl: async (_url, options) => {
			calls.push(JSON.parse(options.body).variables);
			return response(pages.shift());
		},
		env: { GITHUB_TOKEN: "token" },
		outputPath,
		now: new Date("2026-09-16T01:02:03Z"),
	});

	assert.equal(result.status, "ok");
	assert.deepEqual(calls, [
		{ login: "CaiYan12", cursor: null },
		{ login: "CaiYan12", cursor: "cursor-1" },
	]);
	const snapshot = JSON.parse(await fs.readFile(outputPath, "utf-8"));
	assert.deepEqual(
		snapshot.repositories.map((item) => item.name),
		["caiyan12.github.io", "opia-rss-reader"],
	);
	assert.deepEqual(snapshot.pinnedRepositories, [
		"CaiYan12/caiyan12.github.io",
		"CaiYan12/opia-rss-reader",
	]);
	assert.equal(snapshot.repositories[0].primaryLanguage, "TypeScript");
	assert.deepEqual(snapshot.repositories[0].topics, ["blog"]);
	assert.equal(snapshot.generatedAt, "2026-09-16T01:02:03.000Z");
	await assert.rejects(fs.access(`${outputPath}.tmp`));
});

test("fetchGitHubProjects 无令牌时不请求、不改旧缓存", async () => {
	const outputPath = await tempOutput();
	await fs.writeFile(outputPath, '{"old":true}', "utf-8");
	let called = false;
	const result = await fetchGitHubProjects({
		fetchImpl: async () => {
			called = true;
			return response({});
		},
		env: NO_TOKEN_ENV,
		execImpl: throwingExec,
		outputPath,
	});
	assert.equal(result.status, "no-token");
	assert.equal(called, false);
	assert.equal(await fs.readFile(outputPath, "utf-8"), '{"old":true}');
});

test("syncGitHubProjects 请求失败时复用有效缓存", async () => {
	const outputPath = await tempOutput();
	const oldSnapshot = `${JSON.stringify(validSnapshot(), null, "\t")}\n`;
	await fs.writeFile(outputPath, oldSnapshot, "utf-8");
	const result = await syncGitHubProjects({
		fetchImpl: async () => response({}, 429),
		env: { GITHUB_TOKEN: "token" },
		outputPath,
	});
	assert.equal(result.status, "stale-cache");
	assert.match(result.message, /HTTP 429/);
	assert.equal(await fs.readFile(outputPath, "utf-8"), oldSnapshot);
});

test("syncGitHubProjects 没有有效缓存时失败，绝不生成空目录", async () => {
	const outputPath = await tempOutput();
	await fs.writeFile(outputPath, '{"broken":true}', "utf-8");
	const result = await syncGitHubProjects({
		fetchImpl: async () => response({ data: { user: null } }),
		env: { GITHUB_TOKEN: "token" },
		outputPath,
	});
	assert.equal(result.status, "fatal");
	assert.match(result.message, /invalid/i);
	assert.equal(await fs.readFile(outputPath, "utf-8"), '{"broken":true}');
});

test("游标不前进视为非法响应并保留旧缓存", async () => {
	const outputPath = await tempOutput();
	const oldSnapshot = `${JSON.stringify(validSnapshot(), null, "\t")}\n`;
	await fs.writeFile(outputPath, oldSnapshot, "utf-8");
	const result = await syncGitHubProjects({
		fetchImpl: async () =>
			response(
				page({
					nodes: [repo({ name: "one" })],
					hasNextPage: true,
					endCursor: null,
				}),
			),
		env: { GITHUB_TOKEN: "token" },
		outputPath,
	});
	assert.equal(result.status, "stale-cache");
	assert.match(result.message, /cursor/i);
	assert.equal(await fs.readFile(outputPath, "utf-8"), oldSnapshot);
});

test("validateSnapshot 拒绝 pinned 指向不存在仓库和重复仓库", () => {
	const empty = validSnapshot();
	empty.repositories = [];
	empty.pinnedRepositories = [];
	assert.throws(() => validateSnapshot(empty), /non-empty/i);

	const missingPinned = validSnapshot();
	missingPinned.pinnedRepositories = ["CaiYan12/missing"];
	assert.throws(() => validateSnapshot(missingPinned), /pinned/i);

	const duplicate = validSnapshot();
	duplicate.repositories.push({ ...duplicate.repositories[0] });
	assert.throws(() => validateSnapshot(duplicate), /duplicate/i);

	const wrongLogin = validSnapshot();
	wrongLogin.login = "OtherUser";
	wrongLogin.repositories[0].nameWithOwner = "OtherUser/opia-rss-reader";
	wrongLogin.pinnedRepositories = ["OtherUser/opia-rss-reader"];
	assert.throws(() => validateSnapshot(wrongLogin), /login/i);
});
