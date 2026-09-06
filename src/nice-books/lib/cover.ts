/**
 * 确定性 SVG 书封生成器（V1 兜底外壳，handoff §12.3）
 * 移植自原型 covers.js：2:3（viewBox 0 0 300 450）、8 组复古配色按 id 确定性索引、
 * 短标题（≤4 字）竖排大字、长标题自动拆行。同一本书永远得到同一张封面。
 * 不使用 <defs>/<id>，多个内联实例互不冲突。
 * 生产适配：aria-label 去掉「原型」字样；字号/坐标与原型逐值一致以保证视觉对照。
 */

import type { Book } from "../types";

const COVER_PALETTES = [
	{ bg: "#2f4a6b", fg: "#f2ead6", accent: "#d9a441" }, // 靛蓝·鎏金
	{ bg: "#8f3f36", fg: "#f5edda", accent: "#e3c48f" }, // 砖红·米金
	{ bg: "#3f5a45", fg: "#f1ecdc", accent: "#c9a86a" }, // 墨绿·浅棕
	{ bg: "#8a5a33", fg: "#f6efe0", accent: "#e0c9a0" }, // 赭棕
	{ bg: "#474038", fg: "#efe7d3", accent: "#c99b5f" }, // 深褐
	{ bg: "#31555f", fg: "#eceadb", accent: "#cfd8a4" }, // 黛青
	{ bg: "#5b4a68", fg: "#f0e9da", accent: "#cbb3c9" }, // 黯紫调暗·灰紫（实色，非蓝紫渐变）
	{ bg: "#a06a3c", fg: "#3a2c1e", accent: "#f0e2c4" }, // 芥末·深字反白
] as const;

function escapeXml(s: string): string {
	return String(s ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

/** 长标题拆两行；避免第二行以「·」开头 */
function coverTitleLines(title: string): string[] {
	const chars = Array.from(title);
	if (chars.length <= 6) return [title];
	const mid = Math.ceil(chars.length / 2);
	let a = title.slice(0, mid);
	let b = title.slice(mid);
	while (b.charAt(0) === "·") {
		a += "·";
		b = b.slice(1);
	}
	return [a, b];
}

export function generateCoverSvg(book: Book): string {
	const n = Math.abs(Number.parseInt(book.id, 10) || 0);
	const p = COVER_PALETTES[n % COVER_PALETTES.length]!;
	const title = book.title;
	const parts: string[] = [];

	parts.push(`<rect x="0" y="0" width="300" height="450" fill="${p.bg}"/>`);
	// 双线内框
	parts.push(
		`<rect x="10.5" y="10.5" width="279" height="429" fill="none" stroke="${p.fg}" stroke-width="1.2" opacity="0.85"/>`,
	);
	parts.push(
		`<rect x="19" y="19" width="262" height="412" fill="none" stroke="${p.fg}" stroke-width="0.5" opacity="0.45"/>`,
	);

	// 顶部装饰：✦ + 左右短线
	parts.push(
		`<line x1="100" y1="58" x2="134" y2="58" stroke="${p.accent}" stroke-width="1" opacity="0.9"/>`,
	);
	parts.push(
		`<text x="150" y="63" class="cv-orn" font-size="13" fill="${p.accent}" text-anchor="middle">\u2726</text>`,
	);
	parts.push(
		`<line x1="166" y1="58" x2="200" y2="58" stroke="${p.accent}" stroke-width="1" opacity="0.9"/>`,
	);

	const titleChars = Array.from(title);
	let titleMarkup = "";
	if (titleChars.length <= 4) {
		// 竖排大字
		const step = titleChars.length >= 4 ? 60 : 72;
		const fontSize = titleChars.length >= 4 ? 52 : 62;
		const firstY = 200 - ((titleChars.length - 1) * step) / 2;
		titleMarkup = titleChars
			.map(
				(ch, i) =>
					`<text x="150" y="${firstY + i * step}" class="cv-title" font-size="${fontSize}" font-weight="700" fill="${p.fg}" text-anchor="middle" dominant-baseline="central">${escapeXml(ch)}</text>`,
			)
			.join("");
	} else {
		const lines = coverTitleLines(title);
		let fs: number;
		let ys: number[];
		if (lines.length === 1) {
			fs = title.length <= 6 ? 34 : 30;
			ys = [212];
		} else {
			fs = 27;
			ys = [190, 232];
		}
		titleMarkup = lines
			.map(
				(ln, i) =>
					`<text x="150" y="${ys[i]}" class="cv-title" font-size="${fs}" font-weight="700" fill="${p.fg}" text-anchor="middle">${escapeXml(ln)}</text>`,
			)
			.join("");
		// 标题下短线
		const ruleY = ys[ys.length - 1]! + 30;
		parts.push(
			`<line x1="127" y1="${ruleY}" x2="173" y2="${ruleY}" stroke="${p.accent}" stroke-width="2"/>`,
		);
		parts.push(titleMarkup);
	}
	if (titleChars.length <= 4) parts.push(titleMarkup);

	// 作者行
	const authorLine = book.author.join(" · ");
	const authorSize = authorLine.length > 18 ? 11.5 : 13.5;
	parts.push(
		`<text x="150" y="372" class="cv-meta" font-size="${authorSize}" fill="${p.fg}" opacity="0.82" text-anchor="middle">${escapeXml(authorLine)}</text>`,
	);
	// 作者行上方细线（竖排标题时作为视觉锚）
	if (titleChars.length <= 4) {
		parts.push(
			`<line x1="127" y1="344" x2="173" y2="344" stroke="${p.accent}" stroke-width="2"/>`,
		);
	}

	// 底部：出版社 · 年份
	let bottom = `${book.publisher} · ${book.firstEdition.year}`;
	if (bottom.length > 20) bottom = book.publisher;
	parts.push(
		`<text x="150" y="414" class="cv-meta" font-size="10" letter-spacing="2" fill="${p.fg}" opacity="0.6" text-anchor="middle">${escapeXml(bottom)}</text>`,
	);

	return `<svg viewBox="0 0 300 450" role="img" aria-label="《${escapeXml(title)}》封面">${parts.join("")}</svg>`;
}

/** 从封面 <img> 的 data-* 兜底属性重建 SVG（onerror 替换用；authorLine 为「 · 」连接串） */
export function coverFromParts(
	id: string,
	title: string,
	authorLine: string,
	publisher: string,
	year: number,
): string {
	return generateCoverSvg({
		id,
		title,
		author: authorLine.split(" · "),
		publisher,
		firstEdition: { year, edition: "第一版" },
		coverUrl: null,
		description: "",
		recommendationReason: "",
		tags: [],
		featured: false,
	});
}
