// scripts/lib/style-audit-artifact.mjs 的契约测试。
//
// 为什么要有单测：这份 artifact 是 capture 与 diff 之间唯一的凭据。它说谎有两种
// 后果——把「没采到」说成「没变化」（门禁静默失效），或把完好的采集说成不完整
// （迫使人重采）。两种都不靠跑 23 页采集才能发现，构造几个字节就能钉住。
//
// 测试只写自己的 fixture 目录（os.tmpdir 下，跑完即删），不碰 output/ 里的证据。
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { gzipSync, gunzipSync } from "node:zlib";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
	ARTIFACT_FORMAT,
	ARTIFACT_STATUS,
	compareCoverage,
	createCapture,
	readArtifact,
} from "./style-audit-artifact.mjs";

const STATES = ["hover", "focus-visible", "active", "disabled"];

/** 每个测试独立的 fixture 目录，结束即删。 */
function withDir(fn) {
	const dir = mkdtempSync(join(tmpdir(), "style-artifact-"));
	try {
		return fn(dir);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
}

/** 静态行：`<标识> | <位置路径> | <属性…>`。 */
function staticLines(count, tag = "div.a") {
	return Array.from(
		{ length: count },
		(_, i) => `${tag} | body:2>div:${i + 1} | color=rgb(0, 0, 0)`,
	);
}

/** 状态行：`:hover <标识> | <位置路径> | <属性…>`。 */
function stateLines(state, count, head = "a.x") {
	return Array.from(
		{ length: count },
		(_, i) =>
			`:${state} ${head} | body:2>a:${i + 1} | outline-color=rgb(0, 170, 0)`,
	);
}

function pageLines({ count = 2, staticCount = 3 } = {}) {
	return [
		...staticLines(staticCount),
		...STATES.flatMap((state) => stateLines(state, count)),
	];
}

/**
 * 用生产 writer 造 artifact，避免测试里手抄 schema。
 * page 的 targets/located 默认与被写进去的状态行数一致。
 */
function build(
	dir,
	{
		pages = [{ path: "/" }],
		states = STATES,
		expectedPages = pages.map((p) => p.path),
	} = {},
) {
	const capture = createCapture({
		dir,
		base: "http://localhost:4322",
		states,
		expectedPages,
	});
	for (const page of pages) {
		const lines = page.lines ?? pageLines(page);
		const count = page.lines
			? lines.filter((line) => line.startsWith(":")).length /
				states.length
			: (page.count ?? 2);
		capture.addPage({
			path: page.path,
			lines,
			errors: page.errors ?? [],
			coverage: {
				targets: page.targets ?? count,
				located: page.located ?? count,
				stateError: page.stateError ?? null,
			},
		});
	}
	return capture.finish();
}

const readIndex = (dir) =>
	JSON.parse(readFileSync(join(dir, "index.json"), "utf8"));
const writeIndex = (dir, index) =>
	writeFileSync(
		join(dir, "index.json"),
		JSON.stringify(index, null, 2),
		"utf8",
	);

function rewriteBody(dir, slug, transform) {
	const file = join(dir, `${slug}.txt.gz`);
	const body = gunzipSync(readFileSync(file)).toString("utf8");
	writeFileSync(file, gzipSync(Buffer.from(transform(body), "utf8")));
}

const read = (dir, options = {}) =>
	readArtifact(dir, {
		expectedStates: STATES,
		expectedPages: options.expectedPages ?? ["/"],
	});

test("合法 artifact 往返：静态行与四态行逐字保持", () => {
	withDir((dir) => {
		const lines = pageLines({ count: 2, staticCount: 3 });
		const written = build(dir, { pages: [{ path: "/", lines }] });
		assert.equal(written.complete, true);
		assert.deepEqual(written.problems, []);

		const result = read(dir);
		assert.equal(result.status, ARTIFACT_STATUS.complete);
		assert.equal(result.index.formatVersion, ARTIFACT_FORMAT);
		assert.equal(result.pages.length, 1);
		assert.deepEqual(result.pages[0].lines, lines);
		assert.equal(result.pages[0].elements, lines.length);
		assert.deepEqual(result.pages[0].coverage.states, {
			hover: 2,
			"focus-visible": 2,
			active: 2,
			disabled: 2,
		});
	});
});

test("manifest 少一个状态计数键时拒绝", () => {
	withDir((dir) => {
		build(dir);
		const index = readIndex(dir);
		delete index.pages[0].coverage.states.hover;
		writeIndex(dir, index);

		const result = read(dir);
		assert.equal(result.status, ARTIFACT_STATUS.incomplete);
		assert.match(result.problems.join("\n"), /hover/u);
	});
});

test("索引声明的状态集合少一个时拒绝", () => {
	withDir((dir) => {
		build(dir);
		const index = readIndex(dir);
		index.states = STATES.filter((state) => state !== "hover");
		writeIndex(dir, index);

		const result = read(dir);
		assert.equal(result.status, ARTIFACT_STATUS.incomplete);
		assert.match(result.problems.join("\n"), /hover/u);
	});
});

test("manifest 声称完整但正文缺 hover 行时拒绝", () => {
	withDir((dir) => {
		build(dir);
		rewriteBody(dir, "root", (body) =>
			body
				.split("\n")
				.filter((line) => !line.startsWith(":hover "))
				.join("\n"),
		);

		const result = read(dir);
		assert.equal(result.status, ARTIFACT_STATUS.incomplete);
		assert.match(result.problems.join("\n"), /hover/u);
	});
});

test("正文缺行与 manifest 行数不符时拒绝", () => {
	withDir((dir) => {
		build(dir);
		rewriteBody(dir, "root", (body) =>
			body.split("\n").slice(0, -1).join("\n"),
		);

		const result = read(dir);
		assert.equal(result.status, ARTIFACT_STATUS.incomplete);
		assert.match(result.problems.join("\n"), /行/u);
	});
});

test("版本缺失按旧格式拒绝，不静默兼容", () => {
	withDir((dir) => {
		writeFileSync(
			join(dir, "index.json"),
			JSON.stringify(
				{ base: "http://localhost:4322", pages: [] },
				null,
				2,
			),
			"utf8",
		);

		const result = read(dir);
		assert.equal(result.status, ARTIFACT_STATUS.legacy);
		assert.match(result.problems.join("\n"), /重新采集/u);
	});
});

test("版本不匹配时拒绝并说明期望版本", () => {
	withDir((dir) => {
		build(dir);
		const index = readIndex(dir);
		index.formatVersion = "style-audit-artifact@999";
		writeIndex(dir, index);

		const result = read(dir);
		assert.equal(result.status, ARTIFACT_STATUS.legacy);
		const text = result.problems.join("\n");
		assert.match(text, /style-audit-artifact@999/u);
		assert.match(text, new RegExp(ARTIFACT_FORMAT, "u"));
	});
});

test("capture 采样失败时 finish 标 incomplete 并保留诊断", () => {
	withDir((dir) => {
		const written = build(dir, {
			pages: [{ path: "/", stateError: "CDP 初始化失败" }],
		});
		assert.equal(written.complete, false);
		assert.match(written.problems.join("\n"), /CDP 初始化失败/u);

		const onDisk = readIndex(dir);
		assert.equal(onDisk.complete, false);
		assert.equal(onDisk.problems.length, 1);

		const result = read(dir);
		assert.equal(result.status, ARTIFACT_STATUS.incomplete);
	});
});

test("A/B 页集合不一致时拒绝", () => {
	withDir((dir) => {
		const aDir = join(dir, "a");
		const bDir = join(dir, "b");
		build(aDir, { pages: [{ path: "/" }] });
		build(bDir, { pages: [{ path: "/" }, { path: "/about/" }] });

		const a = readArtifact(aDir, {
			expectedStates: STATES,
			expectedPages: ["/"],
		});
		const b = readArtifact(bDir, {
			expectedStates: STATES,
			expectedPages: ["/", "/about/"],
		});
		assert.equal(a.status, ARTIFACT_STATUS.complete);
		assert.equal(b.status, ARTIFACT_STATUS.complete);

		const verdict = compareCoverage(a, b);
		assert.equal(verdict.ok, false);
		assert.match(verdict.problems.join("\n"), /about/u);
	});
});

test("A/B 四态计数不对称时拒绝并指明页与状态", () => {
	withDir((dir) => {
		const aDir = join(dir, "a");
		const bDir = join(dir, "b");
		build(aDir, { pages: [{ path: "/", count: 2 }] });
		build(bDir, { pages: [{ path: "/", count: 3 }] });

		const a = readArtifact(aDir, {
			expectedStates: STATES,
			expectedPages: ["/"],
		});
		const b = readArtifact(bDir, {
			expectedStates: STATES,
			expectedPages: ["/"],
		});
		const verdict = compareCoverage(a, b);
		assert.equal(verdict.ok, false);
		const text = verdict.problems.join("\n");
		assert.match(text, /^\//mu);
		assert.match(text, /hover/u);
		assert.match(text, /目标元素/u);
	});
});

test("合法 A/B 完全一致时覆盖比较通过", () => {
	withDir((dir) => {
		const aDir = join(dir, "a");
		const bDir = join(dir, "b");
		build(aDir, { pages: [{ path: "/" }] });
		build(bDir, { pages: [{ path: "/" }] });

		const a = readArtifact(aDir, {
			expectedStates: STATES,
			expectedPages: ["/"],
		});
		const b = readArtifact(bDir, {
			expectedStates: STATES,
			expectedPages: ["/"],
		});
		assert.deepEqual(compareCoverage(a, b).problems, []);
	});
});
