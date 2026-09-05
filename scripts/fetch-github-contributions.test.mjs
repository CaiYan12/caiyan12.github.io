// GitHub 贡献日历同步脚本测试：全部通过注入 fetchImpl 模拟，绝不访问 GitHub，
// 输出写到临时文件，绝不改动跟踪中的 src/constants/github-contributions.json。
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
	fetchContributions,
	normalizeCalendar,
	computeStats,
} from "./fetch-github-contributions.mjs";

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

/** 21 个连续日期按 7 天一周打包成 GraphQL contributionsCalendar 响应 */
function calendarPayload(counts) {
	const days = counts.map((contributionCount, i) => ({
		date: `2025-09-${String(i + 1).padStart(2, "0")}`,
		contributionCount,
	}));
	const weeks = [];
	for (let i = 0; i < days.length; i += 7) {
		weeks.push({ contributionDays: days.slice(i, i + 7) });
	}
	return gqlOk({
		data: {
			user: {
				contributionsCollection: {
					contributionCalendar: {
						totalContributions: counts.reduce((a, b) => a + b, 0),
						weeks,
					},
				},
			},
		},
	});
}

// 总贡献 12+25+17=54；最长连续 7（跨周边界 1,2,3,4,5,6,7）；当前连续 2（5,6）
const TYPICAL_COUNTS = [1, 2, 3, 0, 1, 2, 3, 4, 5, 6, 7, 0, 1, 2, 3, 2, 1, 0, 0, 5, 6];
// 末尾补 0：当前连续应跨过末位零日回看（6,5 → 2）
const TRAILING_ZERO_COUNTS = [
	1, 2, 3, 0, 1, 2, 3, 4, 5, 6, 7, 0, 1, 2, 3, 2, 1, 0, 5, 6, 0,
];

function stubFetch(payload, calls = []) {
	return async (url, options) => {
		calls.push({ url, options });
		return payload;
	};
}

async function tmpFile() {
	return path.join(
		await fs.mkdtemp(path.join(os.tmpdir(), "contributions-test-")),
		"github-contributions.json",
	);
}

const NO_TOKEN_ENV = { GITHUB_TOKEN: "", GH_TOKEN: "" };
const throwingExec = () => {
	throw new Error("gh not available");
};

test("normalizeCalendar 校验非法形状并按日期排序", () => {
	assert.throws(() => normalizeCalendar(null), /non-empty array/);
	assert.throws(() => normalizeCalendar({ weeks: [{}] }), /must be an array/);
	assert.throws(
		() =>
			normalizeCalendar({
				weeks: [{ contributionDays: [{ date: "bad", contributionCount: 1 }] }],
			}),
		/invalid day date/,
	);
	assert.throws(
		() =>
			normalizeCalendar({
				weeks: [
					{ contributionDays: [{ date: "2025-09-01", contributionCount: -1 }] },
				],
			}),
		/invalid day contributionCount/,
	);
	const days = normalizeCalendar({
		weeks: [
			{
				contributionDays: [
					{ date: "2025-09-03", contributionCount: 1 },
					{ date: "2025-09-01", contributionCount: 2 },
					{ date: "2025-09-02", contributionCount: 0 },
				],
			},
		],
	});
	assert.deepEqual(days.map((d) => d.date), [
		"2025-09-01",
		"2025-09-02",
		"2025-09-03",
	]);
});

test("computeStats 统计总贡献与连续口径", () => {
	const days = TYPICAL_COUNTS.map((count, i) => ({
		date: `2025-09-${String(i + 1).padStart(2, "0")}`,
		count,
	}));
	assert.deepEqual(computeStats(days), {
		total: 54,
		longestStreak: 7,
		currentStreak: 2,
	});
});

test("fetchContributions 正常路径：写缓存并返回统计", async () => {
	const output = await tmpFile();
	const result = await fetchContributions({
		fetchImpl: stubFetch(calendarPayload(TYPICAL_COUNTS)),
		env: { GITHUB_TOKEN: "t1" },
		outputPath: output,
	});
	assert.equal(result.status, "ok");
	const snapshot = JSON.parse(await fs.readFile(output, "utf-8"));
	assert.equal(snapshot.schemaVersion, 1);
	assert.equal(typeof snapshot.generatedAt, "string");
	assert.equal(snapshot.login, "CaiYan12");
	assert.equal(snapshot.profileUrl, "https://github.com/CaiYan12");
	assert.equal(snapshot.days.length, 21);
	assert.equal(snapshot.days[0].date, "2025-09-01");
	assert.equal(snapshot.days[20].count, 6);
	assert.deepEqual(snapshot.totals, {
		total: 54,
		longestStreak: 7,
		currentStreak: 2,
	});
});

test("fetchContributions 使用环境令牌发送 Authorization", async () => {
	const calls = [];
	await fetchContributions({
		fetchImpl: stubFetch(calendarPayload(TYPICAL_COUNTS), calls),
		env: { GITHUB_TOKEN: "secret-token" },
		outputPath: await tmpFile(),
	});
	assert.equal(calls.length, 1);
	assert.equal(calls[0].url, "https://api.github.com/graphql");
	assert.equal(
		calls[0].options.headers.Authorization,
		"Bearer secret-token",
	);
});

test("fetchContributions 无令牌时不发请求、不动缓存", async () => {
	const output = await tmpFile();
	await fs.writeFile(output, '{"old":true}', "utf-8");
	let called = false;
	const result = await fetchContributions({
		fetchImpl: async () => {
			called = true;
			return calendarPayload(TYPICAL_COUNTS);
		},
		env: NO_TOKEN_ENV,
		execImpl: throwingExec,
		outputPath: output,
	});
	assert.equal(result.status, "no-token");
	assert.equal(called, false);
	assert.equal(await fs.readFile(output, "utf-8"), '{"old":true}');
});

test("fetchContributions HTTP 失败时保留旧缓存且不留 tmp", async () => {
	const output = await tmpFile();
	await fs.writeFile(output, '{"old":true}', "utf-8");
	const result = await fetchContributions({
		fetchImpl: async () => httpError(502),
		env: { GITHUB_TOKEN: "t1" },
		outputPath: output,
	});
	assert.equal(result.status, "fetch-failed");
	assert.match(result.message, /502/);
	assert.equal(await fs.readFile(output, "utf-8"), '{"old":true}');
	await assert.rejects(fs.access(`${output}.tmp`));
});

test("fetchContributions 非法响应时保留旧缓存", async () => {
	const output = await tmpFile();
	await fs.writeFile(output, '{"old":true}', "utf-8");
	const result = await fetchContributions({
		fetchImpl: stubFetch(gqlOk({ data: { user: null } })),
		env: { GITHUB_TOKEN: "t1" },
		outputPath: output,
	});
	assert.equal(result.status, "invalid-data");
	assert.equal(await fs.readFile(output, "utf-8"), '{"old":true}');
});

test("fetchContributions 网络异常时保留旧缓存", async () => {
	const output = await tmpFile();
	await fs.writeFile(output, '{"old":true}', "utf-8");
	const result = await fetchContributions({
		fetchImpl: async () => {
			throw new Error("ENOTFOUND");
		},
		env: { GITHUB_TOKEN: "t1" },
		outputPath: output,
	});
	assert.equal(result.status, "fetch-failed");
	assert.match(result.message, /ENOTFOUND/);
	assert.equal(await fs.readFile(output, "utf-8"), '{"old":true}');
});

test("fetchContributions 零贡献也是有效快照", async () => {
	const output = await tmpFile();
	const result = await fetchContributions({
		fetchImpl: stubFetch(calendarPayload(new Array(21).fill(0))),
		env: { GITHUB_TOKEN: "t1" },
		outputPath: output,
	});
	assert.equal(result.status, "ok");
	const snapshot = JSON.parse(await fs.readFile(output, "utf-8"));
	assert.deepEqual(snapshot.totals, {
		total: 0,
		longestStreak: 0,
		currentStreak: 0,
	});
});

test("末位零日时当前连续回看一天", async () => {
	const output = await tmpFile();
	await fetchContributions({
		fetchImpl: stubFetch(calendarPayload(TRAILING_ZERO_COUNTS)),
		env: { GITHUB_TOKEN: "t1" },
		outputPath: output,
	});
	const snapshot = JSON.parse(await fs.readFile(output, "utf-8"));
	assert.equal(snapshot.totals.currentStreak, 2);
});
