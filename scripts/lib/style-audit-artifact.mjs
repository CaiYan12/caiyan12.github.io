// 样式指纹 artifact 的唯一格式契约：capture 写、diff 读，两边共用这一套判定。
//
// 为什么要有这个 module：此前 artifact 的格式只是「gzip 文本行 + index.json 里一个
// 总行数」。于是 capture 里 CDP 抛错被空 catch 吞掉后，产出的 artifact 与完整采集
// 长得一模一样——diff 无从判断「四种状态到底采到没有」，两侧同时失败就会报 0 差异。
// 这份 module 把「格式版本 / 每页静态行 / 四态采样计数 / 完整性」收进一个 interface，
// 并且**不信 manifest 自报**：每次读取都从正文重算一遍再比对。
//
// 三种结果用中文写死，调用方不必从布尔量猜状态：
//   · 完整   —— 版本对、页集合对、每页正文与 manifest 逐项一致；
//   · 不完整 —— 版本对，但采集失败、缺状态、四态计数不对称或 manifest 与正文不符；
//   · 旧格式 —— 没有格式版本或版本不符（含索引缺失/损坏），一律要求重新采集。
// 后两种都必须让 caller 停下，不得当作「没有差异」。
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync, gunzipSync } from "node:zlib";

/** 唯一的格式版本号。改正文或 manifest 语义时必须同步改它，旧采集随之作废。 */
export const ARTIFACT_FORMAT = "style-audit-artifact@1";

/** 三种结果。caller 用 ARTIFACT_STATUS.complete 比对，不写字面量。 */
export const ARTIFACT_STATUS = {
	complete: "完整",
	incomplete: "不完整",
	legacy: "旧格式",
};

/** 状态行的前缀：`:hover <标识> | <位置路径> | <属性…>`。 */
const STATE_LINE = /^:([a-z][a-z-]*)\s/;

const sha16 = (text) =>
	createHash("sha256").update(text, "utf8").digest("hex").slice(0, 16);

/** 页路径 → 文件名。只影响落盘文件名，不改正文格式。 */
export function artifactSlug(path) {
	return path.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "") || "root";
}

/** 从正文行数出每种状态各有多少行。只认行首的 `:状态 ` 前缀。 */
function countStateLines(lines) {
	const counts = {};
	for (const line of lines) {
		const matched = STATE_LINE.exec(line);
		if (!matched) continue;
		counts[matched[1]] = (counts[matched[1]] ?? 0) + 1;
	}
	return counts;
}

/** 按声明的状态顺序补齐 0，保证没有可交互元素的页面也写出四个键。 */
function normalizeCounts(raw, states) {
	return Object.fromEntries(states.map((state) => [state, raw[state] ?? 0]));
}

function collect(problems, message) {
	if (!problems.includes(message)) problems.push(message);
}

/**
 * 一页的完整性判定。capture 写完之后与 readArtifact 读完之后都走这里，
 * 保证「写的时候认为完整」与「读的时候认为完整」是同一套规则。
 */
function pageProblems(page, states) {
	const problems = [];
	const path = page.path;
	const coverage = page.coverage ?? {};
	// 采样失败：capture 里 CDP 初始化或强制伪类抛错时落在这里。
	if (coverage.stateError)
		collect(problems, `${path}：状态采样失败 —— ${coverage.stateError}`);
	const stored = coverage.states ?? {};
	for (const state of states)
		if (!(state in stored))
			collect(problems, `${path}：manifest 缺少 ${state} 的采样计数`);
	for (const state of Object.keys(stored))
		if (!states.includes(state))
			collect(problems, `${path}：manifest 出现未声明的状态 ${state}`);
	const known = states.filter((state) => state in stored);
	const values = known.map((state) => stored[state]);
	const detailed = known
		.map((state) => `${state}=${stored[state]}`)
		.join("、");
	// 同一轮采集里，每个目标元素在四种状态下各写一行，计数必然相等。
	// 不相等说明某一种状态的行被吞掉或写丢了。
	if (values.length > 1 && new Set(values).size > 1)
		collect(problems, `${path}：四态计数不一致（${detailed}）`);
	const located = coverage.located ?? 0;
	if (
		known.length === states.length &&
		new Set(values).size === 1 &&
		values[0] !== located
	)
		collect(
			problems,
			`${path}：定位到 ${located} 个目标，但每种状态各写了 ${values[0]} 行`,
		);
	const targets = coverage.targets ?? 0;
	if (targets !== located)
		collect(
			problems,
			`${path}：目标元素 ${targets} 个，实际只定位 ${located} 个`,
		);
	return problems;
}

/**
 * 采集期写入器。用法：create → addPage（逐页落盘）→ finish（写 index.json）。
 * addPage 的 coverage.targets / located / stateError 由 capture 的 Playwright 循环给出，
 * 四态计数则一律由正文重算，不接受调用方传入——manifest 不能自证。
 */
export function createCapture({ dir, base, states, expectedPages, now }) {
	if (!Array.isArray(states) || states.length === 0)
		throw new Error("createCapture 需要非空的状态清单");
	if (!Array.isArray(expectedPages))
		throw new Error("createCapture 需要本次审计页清单");
	mkdirSync(dir, { recursive: true });
	const pages = [];
	const index = {
		formatVersion: ARTIFACT_FORMAT,
		base,
		generated: now ?? new Date().toISOString(),
		states: [...states],
		complete: false,
		problems: [],
		pages,
	};

	return {
		addPage({ path, lines, errors = [], coverage = {} }) {
			const body = lines.join("\n");
			const counts = normalizeCounts(countStateLines(lines), states);
			const stateLineCount = Object.values(counts).reduce(
				(sum, n) => sum + n,
				0,
			);
			const record = {
				path,
				slug: artifactSlug(path),
				elements: lines.length,
				staticLines: lines.length - stateLineCount,
				sha: sha16(body),
				errors: errors.slice(0, 4),
				coverage: {
					targets: coverage.targets ?? 0,
					located: coverage.located ?? 0,
					states: counts,
					stateError: coverage.stateError ?? null,
				},
			};
			writeFileSync(
				join(dir, `${record.slug}.txt.gz`),
				gzipSync(Buffer.from(body, "utf8")),
			);
			pages.push(record);
			return record;
		},

		finish() {
			const problems = [];
			const seen = new Set(pages.map((page) => page.path));
			for (const path of expectedPages)
				if (!seen.has(path))
					collect(problems, `${path}：本次采集没有写出这一页`);
			for (const path of seen)
				if (!expectedPages.includes(path))
					collect(problems, `${path}：不在本次审计页清单里`);
			for (const page of pages)
				for (const message of pageProblems(page, states))
					collect(problems, message);
			index.complete = problems.length === 0;
			index.problems = problems;
			writeFileSync(
				join(dir, "index.json"),
				JSON.stringify(index, null, 2),
			);
			return {
				complete: index.complete,
				problems: [...problems],
				index,
			};
		},
	};
}

/**
 * 读取并校验。返回 { status, problems, index, pages }。
 * pages 里每项在 manifest 记录之上带 `body` 与 `lines`（正文原始行，未做归一化）。
 * expectedStates / expectedPages 都是必填：不给期望就无法判断「少了没」。
 */
export function readArtifact(dir, { expectedStates, expectedPages } = {}) {
	if (!Array.isArray(expectedStates) || expectedStates.length === 0)
		throw new Error("readArtifact 需要非空的状态清单");
	if (!Array.isArray(expectedPages))
		throw new Error("readArtifact 需要本次审计页清单");

	const indexPath = join(dir, "index.json");
	let index;
	try {
		index = JSON.parse(readFileSync(indexPath, "utf8"));
	} catch (error) {
		return {
			status: ARTIFACT_STATUS.legacy,
			problems: [
				`读不到 ${indexPath}（${error.code ?? error.message}）：按旧格式处理，请重新采集`,
			],
			index: null,
			pages: [],
		};
	}
	if (index?.formatVersion !== ARTIFACT_FORMAT) {
		const found = index?.formatVersion
			? `artifact 的格式版本是 ${index.formatVersion}`
			: "artifact 索引里没有格式版本";
		return {
			status: ARTIFACT_STATUS.legacy,
			problems: [
				`${found}，当前工具只认 ${ARTIFACT_FORMAT}：不猜测、不静默兼容，请重新采集`,
			],
			index,
			pages: [],
		};
	}

	const problems = [];
	const declaredStates = Array.isArray(index.states) ? index.states : [];
	for (const state of expectedStates)
		if (!declaredStates.includes(state))
			collect(problems, `索引声明的状态集合缺少 ${state}`);
	for (const state of declaredStates)
		if (!expectedStates.includes(state))
			collect(problems, `索引声明了未知状态 ${state}`);

	const stored = Array.isArray(index.pages) ? index.pages : [];
	if (!Array.isArray(index.pages))
		collect(problems, "索引里没有 pages 数组：无法确认采集了哪些页");

	const pages = [];
	for (const record of stored) {
		const path = record.path;
		if (typeof path !== "string") {
			collect(problems, "索引里有一页缺少 path：无法定位它的正文");
			continue;
		}
		if (record.slug !== artifactSlug(path)) {
			collect(
				problems,
				`${path}：slug（${record.slug}）与路径不符，正文可能张冠李戴`,
			);
			// 名字对不上就不去读：这个 slug 可能指向别人的正文，也可能带路径分隔符。
			continue;
		}
		let body = null;
		try {
			body = gunzipSync(
				readFileSync(join(dir, `${record.slug}.txt.gz`)),
			).toString("utf8");
		} catch (error) {
			collect(
				problems,
				`${path}：读不到正文 ${record.slug}.txt.gz（${error.code ?? error.message}）`,
			);
			continue;
		}
		const lines = body === "" ? [] : body.split("\n");
		if (record.elements !== lines.length)
			collect(
				problems,
				`${path}：manifest 记录 ${record.elements} 行，正文实际 ${lines.length} 行`,
			);
		if (record.sha !== sha16(body))
			collect(problems, `${path}：正文摘要与 manifest 不符，正文被改过`);
		const rawCounts = countStateLines(lines);
		const counts = normalizeCounts(rawCounts, expectedStates);
		const stateLineCount = Object.values(counts).reduce(
			(sum, n) => sum + n,
			0,
		);
		if (record.staticLines !== lines.length - stateLineCount)
			collect(
				problems,
				`${path}：manifest 记录 ${record.staticLines} 行静态样式，正文重算为 ${lines.length - stateLineCount} 行`,
			);
		const recordedStates = record.coverage?.states ?? {};
		for (const state of expectedStates) {
			if (!(state in recordedStates)) {
				collect(problems, `${path}：manifest 缺少 ${state} 的采样计数`);
				continue;
			}
			if (recordedStates[state] !== counts[state])
				collect(
					problems,
					`${path}：manifest 记录 ${state} 采样 ${recordedStates[state]} 行，正文重算为 ${counts[state]} 行`,
				);
		}
		for (const message of pageProblems(record, expectedStates))
			collect(problems, message);
		pages.push({ ...record, body, lines });
	}

	const seen = new Set(pages.map((page) => page.path));
	for (const path of expectedPages)
		if (!seen.has(path))
			collect(problems, `${path}：artifact 里没有这一页`);
	for (const path of seen)
		if (!expectedPages.includes(path))
			collect(problems, `${path}：不在本次审计页清单里`);

	return {
		status: problems.length
			? ARTIFACT_STATUS.incomplete
			: ARTIFACT_STATUS.complete,
		problems,
		index,
		pages,
	};
}

/**
 * 只比覆盖，不比样式。两份 artifact 都必须是「完整」才走到这里。
 * 页集合、每页目标元素数、每页每种状态的采样行数任一不一致就返回问题清单。
 */
export function compareCoverage(a, b) {
	const problems = [];
	const mapB = new Map(b.pages.map((page) => [page.path, page]));
	for (const pageA of a.pages) {
		const pageB = mapB.get(pageA.path);
		if (!pageB) {
			collect(problems, `${pageA.path}：页集合不一致，B 没有这一页`);
			continue;
		}
		const targetsA = pageA.coverage?.targets ?? 0;
		const targetsB = pageB.coverage?.targets ?? 0;
		if (targetsA !== targetsB)
			collect(
				problems,
				`${pageA.path}：目标元素数不一致（A ${targetsA} / B ${targetsB}）`,
			);
		const states = new Set([
			...Object.keys(pageA.coverage?.states ?? {}),
			...Object.keys(pageB.coverage?.states ?? {}),
		]);
		for (const state of states) {
			const countA = pageA.coverage?.states?.[state];
			const countB = pageB.coverage?.states?.[state];
			if (countA !== countB)
				collect(
					problems,
					`${pageA.path}：${state} 的采样行数不一致（A ${countA ?? "缺失"} / B ${countB ?? "缺失"}）`,
				);
		}
	}
	for (const pageB of b.pages)
		if (!a.pages.some((page) => page.path === pageB.path))
			collect(problems, `${pageB.path}：页集合不一致，A 没有这一页`);
	return { ok: problems.length === 0, problems };
}
