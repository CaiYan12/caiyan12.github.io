/** Nice Books 确定性程序书封：四个独立构图族，不修改 Book 领域模型。 */
import type { Book } from "../types";
import { coverFamilyForId, type CoverFamily } from "./display";

export { COVER_FAMILY_BY_ID, coverFamilyForId } from "./display";
export type { CoverFamily } from "./display";

type Palette = { bg: string; fg: string; accent: string; line: string };
const PALETTES: Record<CoverFamily, readonly Palette[]> = {
	literary: [
		{ bg: "#7a302e", fg: "#f6ead3", accent: "#e2b76f", line: "#a94b3d" },
		{ bg: "#3f4d45", fg: "#f2ead6", accent: "#d6b56f", line: "#657e70" },
	],
	history: [
		{ bg: "#566044", fg: "#f5edda", accent: "#d5b46b", line: "#86906b" },
		{ bg: "#8a5a33", fg: "#f7eedc", accent: "#e0c08a", line: "#b98354" },
	],
	science: [
		{ bg: "#1e3e57", fg: "#e7f0e7", accent: "#8dc1ba", line: "#477c8e" },
		{ bg: "#263a49", fg: "#eaf0df", accent: "#d1bf72", line: "#526877" },
	],
	essay: [
		{ bg: "#d8c9aa", fg: "#302c25", accent: "#9f493d", line: "#ad9b77" },
		{ bg: "#c8d0c0", fg: "#26332d", accent: "#8b4b3f", line: "#829481" },
	],
};

function escapeXml(s: string): string {
	return String(s ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

function paletteFor(book: Book): Palette {
	const idNumber = Math.abs(Number.parseInt(book.id, 10) || 0);
	const paletteIndex = (idNumber % 10) + Math.floor(idNumber / 10);
	const family = coverFamilyForId(book.id);
	return PALETTES[family][paletteIndex % PALETTES[family].length]!;
}

/** 让伪 3D 后封与书脊继承程序封面的主色。 */
export function coverShellColor(book: Book): string {
	return paletteFor(book).bg;
}

function coverTitleLines(title: string): string[] {
	const chars = Array.from(title);
	if (chars.length <= 6) return [title];
	const mid = Math.ceil(chars.length / 2);
	let first = chars.slice(0, mid).join("");
	let second = chars.slice(mid).join("");
	while (second.startsWith("·")) {
		first += "·";
		second = second.slice(1);
	}
	return [first, second];
}

function frame(family: CoverFamily, p: Palette): string {
	switch (family) {
		case "history":
			return [
				`<rect x="16" y="18" width="268" height="414" fill="none" stroke="${p.fg}" stroke-width="1.1" opacity=".78"/>`,
				`<path d="M16 54h28M256 54h28M16 396h28M256 396h28" stroke="${p.accent}" stroke-width="2"/>`,
			].join("");
		case "science":
			return [
				`<rect x="22" y="22" width="256" height="406" fill="none" stroke="${p.fg}" stroke-width=".9" opacity=".58"/>`,
				`<path d="M22 64h256M22 386h256" stroke="${p.line}" stroke-width="1" opacity=".65"/>`,
			].join("");
		case "essay":
			return [
				`<path d="M34 34v382M34 416h232" stroke="${p.accent}" stroke-width="1.5" opacity=".8"/>`,
				`<path d="M46 34h220" stroke="${p.line}" stroke-width=".8" opacity=".75"/>`,
			].join("");
		case "literary":
		default:
			return [
				`<rect x="10.5" y="10.5" width="279" height="429" fill="none" stroke="${p.fg}" stroke-width="1.2" opacity=".82"/>`,
				`<rect x="19" y="19" width="262" height="412" fill="none" stroke="${p.fg}" stroke-width=".5" opacity=".4"/>`,
			].join("");
	}
}

function motif(family: CoverFamily, p: Palette): string {
	switch (family) {
		case "history":
			return [
				`<path d="M46 276h208M46 292h164M46 308h226M46 324h180" stroke="${p.line}" stroke-width="1" opacity=".72"/>`,
				`<path d="M58 258V338M86 258V338M114 258V338M142 258V338M170 258V338M198 258V338M226 258V338" stroke="${p.fg}" stroke-width=".55" opacity=".28"/>`,
				`<circle cx="248" cy="276" r="4" fill="${p.accent}"/><circle cx="232" cy="324" r="3" fill="${p.accent}"/>`,
			].join("");
		case "science":
			return [
				`<circle cx="150" cy="218" r="50" fill="none" stroke="${p.accent}" stroke-width="1" opacity=".72"/>`,
				`<ellipse cx="150" cy="218" rx="93" ry="25" fill="none" stroke="${p.fg}" stroke-width=".8" opacity=".48" transform="rotate(-20 150 218)"/>`,
				`<ellipse cx="150" cy="218" rx="60" ry="92" fill="none" stroke="${p.line}" stroke-width=".7" opacity=".55" transform="rotate(26 150 218)"/>`,
				`<circle cx="222" cy="192" r="3.5" fill="${p.accent}"/><circle cx="89" cy="247" r="2.5" fill="${p.accent}"/>`,
			].join("");
		case "essay":
			return [
				`<path d="M54 352c22-43 47-72 77-83 37-14 65-37 105-104" fill="none" stroke="${p.accent}" stroke-width="2" opacity=".72"/>`,
				`<path d="M55 354c30 0 53-13 76-34M148 270c25 2 48-10 69-29" fill="none" stroke="${p.fg}" stroke-width="1" opacity=".43"/>`,
				`<circle cx="131" cy="269" r="5" fill="${p.accent}" opacity=".85"/>`,
			].join("");
		case "literary":
		default:
			return [
				`<path d="M54 322c29-33 55-48 92-48s64-17 100-53" fill="none" stroke="${p.accent}" stroke-width="1.5" opacity=".7"/>`,
				`<path d="M54 338c41-28 72-26 104-28 28-2 55-15 88-43" fill="none" stroke="${p.fg}" stroke-width=".7" opacity=".35"/>`,
			].join("");
	}
}

function titleMarkup(family: CoverFamily, title: string, p: Palette): string {
	const chars = Array.from(title);
	if (family === "literary") {
		if (chars.length <= 4) {
			/* 短标题整体上收，保留原字距，给下部腰封与作者元信息留下安全区。 */
			const step = chars.length >= 4 ? 54 : 68;
			const size = chars.length >= 4 ? 50 : 60;
			const firstY = 124 - ((chars.length - 1) * step) / 2;
			return chars
				.map(
					(ch, i) =>
						`<text x="150" y="${firstY + i * step}" class="cv-title" font-size="${size}" font-weight="700" fill="${p.fg}" text-anchor="middle" dominant-baseline="central">${escapeXml(ch)}</text>`,
				)
				.join("");
		}
		const lines = coverTitleLines(title);
		const size = lines.length === 1 ? (chars.length <= 6 ? 34 : 30) : 27;
		const ys = lines.length === 1 ? [190] : [166, 208];
		return lines
			.map(
				(line, i) =>
					`<text x="150" y="${ys[i]}" class="cv-title" font-size="${size}" font-weight="700" fill="${p.fg}" text-anchor="middle">${escapeXml(line)}</text>`,
			)
			.join("");
	}

	if (family === "history") {
		const lines = coverTitleLines(title);
		return lines
			.map(
				(line, i) =>
					`<text x="46" y="${88 + i * 38}" class="cv-title" font-size="${lines.length > 1 ? 29 : 34}" font-weight="700" fill="${p.fg}" text-anchor="start">${escapeXml(line)}</text>`,
			)
			.join("");
	}

	if (family === "science") {
		const lines = coverTitleLines(title);
		return lines
			.map(
				(line, i) =>
					`<text x="150" y="${104 + i * 34}" class="cv-title" font-size="${lines.length > 1 ? 27 : 32}" font-weight="700" fill="${p.fg}" text-anchor="middle">${escapeXml(line)}</text>`,
			)
			.join("");
	}

	const lines = coverTitleLines(title);
	return lines
		.map(
			(line, i) =>
				`<text x="48" y="${88 + i * 36}" class="cv-title" font-size="${lines.length > 1 ? 28 : 34}" font-weight="700" fill="${p.fg}" text-anchor="start" letter-spacing="${lines.length === 1 ? 3 : 1}">${escapeXml(line)}</text>`,
		)
		.join("");
}

export function generateCoverSvg(book: Book): string {
	const family = coverFamilyForId(book.id);
	const p = paletteFor(book);
	const title = book.title;
	const authorLine = book.author.join(" · ");
	const bottom = `${book.publisher} · ${book.firstEdition.year}`;
	const parts = [
		`<rect x="0" y="0" width="300" height="450" fill="${p.bg}"/>`,
		frame(family, p),
		motif(family, p),
		titleMarkup(family, title, p),
		`<line x1="112" y1="350" x2="188" y2="350" stroke="${p.accent}" stroke-width="2" opacity=".85"/>`,
		`<text x="150" y="378" class="cv-meta cv-author" font-size="13.5" fill="${p.fg}" opacity="1" text-anchor="middle">${escapeXml(authorLine)}</text>`,
		`<text x="150" y="414" class="cv-meta cv-imprint" font-size="13" letter-spacing=".5" fill="${p.fg}" opacity="1" text-anchor="middle">${escapeXml(bottom.length > 20 ? book.publisher : bottom)}</text>`,
	].join("");
	return `<svg viewBox="0 0 300 450" role="img" aria-label="《${escapeXml(title)}》封面">${parts}</svg>`;
}

/** 从封面 <img> 的 data-* 兜底属性重建 SVG。 */
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
