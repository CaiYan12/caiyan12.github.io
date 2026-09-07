import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("./books.css", import.meta.url), "utf8");

test("减少动态效果时摘抄卡清除默认旋转", () => {
	const reducedBlock =
		css.match(
			/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*$/,
		)?.[0] ?? "";
	assert.match(
		reducedBlock,
		/\.nb-excerpt-card\s*\{[\s\S]*?transform:\s*none;/,
	);
});

test("Hero 书封署名避让腰封且荐语保留两行", () => {
	assert.match(
		css,
		/\.nb-cover--hero\s+\.cv-author\s*\{[\s\S]*?transform:\s*translateY\(20px\);/,
	);
	assert.match(
		css,
		/\.nb-cover--hero\s+\.cv-imprint\s*\{[\s\S]*?transform:\s*translateY\(8px\);/,
	);
	assert.match(css, /\.nb-sash-copy\s*\{[\s\S]*?-webkit-line-clamp:\s*2;/);
	assert.match(css, /\.nb-sash\s*\{[\s\S]*?padding-bottom:\s*6px;/);
	assert.match(
		css,
		/\.nb-sash-copy\s*\{[\s\S]*?height:\s*37px;[\s\S]*?padding:\s*0 12px;[\s\S]*?line-height:\s*18px;/,
	);
	assert.match(css, /\.nb-book3d-card\s+\.nb-sash\s*\{[\s\S]*?top:\s*58%;/);
	assert.match(
		css,
		/@media \(min-width: 640px\) \{[\s\S]*?\.nb-book3d-card\s+\.nb-sash\s*\{[\s\S]*?top:\s*68%;/,
	);
	assert.match(css, /\.nb-book3d-hero\s+\.nb-sash\s*\{[\s\S]*?top:\s*55%;/);
});

test("精确指针下书架封面轻抬，减少动效时归位", () => {
	const finePointerBlock =
		css.match(
			/@media \(hover: hover\) and \(pointer: fine\) \{[\s\S]*?\n  \}/,
		)?.[0] ?? "";
	assert.match(
		finePointerBlock,
		/\.nb-book-card:hover\s+\.nb-book3d\s*\{[\s\S]*?transform:\s*translateY\(-4px\) rotate\(-1deg\);/,
	);
	assert.match(
		finePointerBlock,
		/\.nb-book-card:hover::after\s*\{[\s\S]*?transform:\s*translateY\(2px\) scale\(0\.98\);/,
	);
	const reducedBlock =
		css.match(
			/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*$/,
		)?.[0] ?? "";
	assert.match(
		reducedBlock,
		/\.nb-book-card::after,[\s\S]*?\.nb-book-card \.nb-book3d\s*\{[\s\S]*?transform:\s*none;/,
	);
});
