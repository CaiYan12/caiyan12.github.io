// 改 Markdown 表格前先量列宽：打印每张表每列在 Prettier 之后的槽宽；`--check` 与
// HEAD 对比，指出哪一列会变宽、会连带重排几行。
//
// 为什么要有它：Prettier 按列内最长单元格填充整列，新文字只要宽一个字符，整张表的
// 每一行都会进 diff。AGENTS.md 的「文档写作约定」写了「先量列宽」，但拿眼睛估会错——
// 2026-11-12 实测一次：状态列多写了 5 个字符，`docs/history/history.md` 的索引表
// 重排 20 行，只能把文字压回去重来一遍。
//
// 宽度不靠字符宽度表猜：先把内容交给 Prettier 格式化，再读分隔行每段的长度——那就是
// Prettier 最终写出的槽宽，与 `--write` 的结果一致。中文按几个字符算的问题因此绕开了。
//
// 用法：
//   node scripts/md-table-width.mjs <file>          # 打印 Prettier 之后的列宽
//   node scripts/md-table-width.mjs <file> --check  # 与 HEAD 对比
// 退出码：0 列宽未变宽（或文件是新文件）；1 有列变宽；2 用法/读取/解析错误。输出全 ASCII。

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { compareTables, parseTables } from "./lib/md-table.mjs";

function git(args) {
	try {
		return execFileSync("git", args, {
			encoding: "utf8",
			maxBuffer: 64 * 1024 * 1024,
		});
	} catch {
		return null;
	}
}

async function formatDoc(prettier, text, abs) {
	const config = (await prettier.resolveConfig(abs)) ?? {};
	return prettier.format(text, {
		...config,
		filepath: abs.replaceAll("\\", "/"),
	});
}

const args = process.argv.slice(2);
const check = args.includes("--check");
const target = args.find((a) => !a.startsWith("--"));
if (!target) {
	console.error("usage: node scripts/md-table-width.mjs <file> [--check]");
	process.exit(2);
}

const abs = resolve(target);
let text;
try {
	text = readFileSync(abs, "utf8");
} catch (error) {
	console.error(`cannot read ${target}: ${error.code ?? error.message}`);
	process.exit(2);
}

let prettier;
try {
	prettier = await import("prettier");
} catch (error) {
	console.error(
		`cannot load prettier (${error?.message ?? error}); run pnpm install`,
	);
	process.exit(2);
}

const formatted = await formatDoc(prettier, text, abs);
const tables = parseTables(formatted);
if (tables.length === 0) {
	console.log("no tables");
	process.exit(0);
}

if (!check) {
	console.log(`file: ${target} (after Prettier)`);
	for (const table of tables) {
		console.log(
			`table ${table.index}: ${table.rows} rows, ${table.columns.length} cols (formatted lines ${table.startLine}-${table.endLine})`,
		);
		table.columns.forEach((column, i) => {
			console.log(`  col ${i + 1}: width ${column.width}`);
		});
	}
	process.exit(0);
}

const repo = git(["rev-parse", "--show-toplevel"]);
if (!repo) {
	console.error(
		"not inside a git repository: --check needs HEAD as baseline",
	);
	process.exit(2);
}
const rel = relative(repo.trim(), abs).replaceAll("\\", "/");
if (rel.startsWith("..") || isAbsolute(rel)) {
	console.error(`file is outside the repository: ${target}`);
	process.exit(2);
}
const baseline = git(["show", `HEAD:${rel}`]);
if (baseline === null) {
	console.log(`baseline: none (${rel} is not in HEAD; new file)`);
	process.exit(0);
}

const before = parseTables(await formatDoc(prettier, baseline, abs));
const changes = compareTables(before, tables);
if (changes.length === 0) {
	console.log(`baseline: HEAD:${rel}`);
	console.log("column widths unchanged");
	process.exit(0);
}

console.log(`baseline: HEAD:${rel}`);
let grew = false;
for (const change of changes) {
	if (change.delta > 0) grew = true;
	console.log(
		`table ${change.table} col ${change.column}: ${change.from} -> ${change.to} (${change.delta > 0 ? "+" : ""}${change.delta}); ${change.rows} data rows re-pad`,
	);
}
if (grew) {
	console.error(
		"a column got wider: every row of that table will be re-padded by Prettier",
	);
	console.error(
		"shorten the cell, or accept the reflow and say so in the commit",
	);
	process.exit(1);
}
process.exit(0);
