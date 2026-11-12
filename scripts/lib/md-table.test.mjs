import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
	compareTables,
	isSeparatorRow,
	parseTables,
	splitRow,
} from "./md-table.mjs";

// 真实形状取自 `docs/history/history.md` 的「按轮次索引」：分隔行的段长就是列槽宽。
const TABLE = [
	"| 轮次 | 文档 | 状态 |",
	"| ---- | ---- | ---- |",
	"| a    | `x`  | 完成 |",
	"| b    | `y`  | 完成 |",
].join("\n");

describe("splitRow", () => {
	it("去掉首尾空段，保留单元格原文", () => {
		assert.deepEqual(splitRow("| a | b |"), [" a ", " b "]);
	});
	it("转义的竖线不切分", () => {
		assert.deepEqual(splitRow("| a \\| b | c |"), [" a \\| b ", " c "]);
	});
});

describe("isSeparatorRow", () => {
	it("接受对齐写法", () => {
		assert.equal(isSeparatorRow("| :--- | ---: | :---: |"), true);
	});
	it("拒绝内容行", () => {
		assert.equal(isSeparatorRow("| a | b |"), false);
	});
});

describe("parseTables", () => {
	it("从分隔行取列宽，行数不含表头与分隔行", () => {
		const [table] = parseTables(TABLE);
		assert.equal(table.rows, 2);
		assert.deepEqual(
			table.columns.map((c) => c.width),
			[6, 6, 6],
		);
		assert.equal(table.startLine, 1);
		assert.equal(table.endLine, 4);
	});

	it("没有分隔行的竖线块不算表格", () => {
		assert.deepEqual(
			parseTables(["| just | text |", "| more | text |"].join("\n")),
			[],
		);
	});

	it("多张表按出现顺序编号，CRLF 不影响", () => {
		const two = [
			"| a | b |",
			"| - | - |",
			"",
			"| c | d |",
			"| - | - |",
		].join("\r\n");
		const tables = parseTables(two);
		assert.deepEqual(
			tables.map((t) => t.index),
			[1, 2],
		);
	});

	it("围栏代码块里的竖线不误判", () => {
		const text = ["```", "| a | b |", "| - | - |", "```"].join("\n");
		assert.equal(parseTables(text).length, 0);
	});

	it("围栏结束后恢复识别", () => {
		const text = ["```", "| a | b |", "```", "| c | d |", "| - | - |"].join(
			"\n",
		);
		assert.equal(parseTables(text).length, 1);
	});
});

describe("compareTables", () => {
	it("报告变宽的列与受影响行数", () => {
		// 列宽读的是分隔行，所以「变宽」必须体现在分隔行上——真实流程里这由 Prettier
		// 重新填充产生，`--check` 比较的正是格式化后的两侧。
		const before = parseTables(TABLE);
		const after = parseTables(
			TABLE.replace(
				"| ---- | ---- | ---- |",
				"| ---- | ---- | ---------------- |",
			),
		);
		const changes = compareTables(before, after);
		assert.equal(changes.length, 1);
		assert.deepEqual(changes[0], {
			table: 1,
			column: 3,
			from: 6,
			to: 18,
			delta: 12,
			rows: 2,
		});
	});

	it("宽度不变时返回空", () => {
		assert.deepEqual(
			compareTables(parseTables(TABLE), parseTables(TABLE)),
			[],
		);
	});
});
