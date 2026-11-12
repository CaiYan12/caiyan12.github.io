// Markdown 表格列宽的只读解析。
//
// 用途：改表格单元格之前先知道「这一列现在多宽」。列宽由同一列最长的单元格决定，
// Prettier 会把整列按它重新填充——新文字只要比现值宽，整张表的每一行都会进 diff。
// 2026-11-12 实测：`docs/history/history.md` 的「按轮次索引」只因状态列多了 5 个字符，
// Prettier 重排了 20 行。
//
// 宽度怎么量：不猜字符的显示宽度，直接读**分隔行**（`| --- |`）每段横线加空格的原始长度。
// 已格式化的表里，分隔行的段长就是 Prettier 给该列定的槽宽，测出来与 Prettier 一致。

/** 按未转义的 `|` 切分一行表格，返回单元格原文（含两侧空格）。 */
export function splitRow(line) {
	const cells = [];
	let current = "";
	for (let i = 0; i < line.length; i++) {
		const ch = line[i];
		if (ch === "\\" && line[i + 1] === "|") {
			current += "\\|";
			i++;
			continue;
		}
		if (ch === "|") {
			cells.push(current);
			current = "";
			continue;
		}
		current += ch;
	}
	cells.push(current);
	// 首尾各有一段（`|` 之外的空白），不是单元格
	if (cells.length > 0 && cells[0].trim() === "") cells.shift();
	if (cells.length > 0 && cells[cells.length - 1].trim() === "") cells.pop();
	return cells;
}

/** 分隔行：每个单元格都是 `:?-+:?`。 */
export function isSeparatorRow(line) {
	if (!line.trimStart().startsWith("|")) return false;
	const cells = splitRow(line);
	if (cells.length === 0) return false;
	return cells.every((cell) => /^\s*:?-+:?\s*$/.test(cell));
}

/**
 * 解析文本里的所有表格。
 * 返回 [{ index, startLine, endLine, rows, columns: [{ width }] }]，行号从 1 起。
 * 没有分隔行的 `|` 连续行不算表格（Markdown 里它就不是表格）；围栏代码块里的内容整段跳过。
 */
export function parseTables(text) {
	const lines = text.split(/\r?\n/);
	const tables = [];
	let i = 0;
	let inFence = false;
	while (i < lines.length) {
		const line = lines[i];
		const trimmed = line.trimStart();
		if (trimmed.startsWith("```") || trimmed.startsWith("~~~")) {
			inFence = !inFence;
			i++;
			continue;
		}
		if (inFence || !trimmed.startsWith("|")) {
			i++;
			continue;
		}
		const start = i;
		while (i < lines.length && lines[i].trimStart().startsWith("|")) i++;
		const block = lines.slice(start, i);
		const separatorAt = block.findIndex(isSeparatorRow);
		if (separatorAt === -1) continue;
		const columns = splitRow(block[separatorAt]).map((cell) => ({
			width: cell.length,
		}));
		tables.push({
			index: tables.length + 1,
			startLine: start + 1,
			endLine: i,
			rows: block.length - 2,
			columns,
		});
	}
	return tables;
}

/**
 * 比较两份表格的列宽。按表序号配对（表格增删会让后续序号错位，调用方需自行判断）。
 * 返回 [{ table, column, from, to, delta, rows }]，只列宽度变化的列。
 */
export function compareTables(before, after) {
	const changes = [];
	const count = Math.min(before.length, after.length);
	for (let t = 0; t < count; t++) {
		const a = before[t];
		const b = after[t];
		const cols = Math.min(a.columns.length, b.columns.length);
		for (let c = 0; c < cols; c++) {
			const from = a.columns[c].width;
			const to = b.columns[c].width;
			if (from === to) continue;
			changes.push({
				table: b.index,
				column: c + 1,
				from,
				to,
				delta: to - from,
				rows: b.rows,
			});
		}
	}
	return changes;
}
