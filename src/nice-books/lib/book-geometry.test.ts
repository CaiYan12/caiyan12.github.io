import test from "node:test";
import assert from "node:assert/strict";
import { BOOK_GEOMETRY, geometryStyle } from "./book-geometry";

test("三档书型共享同一组有效几何参数", () => {
	for (const variant of ["hero", "card", "list"] as const) {
		const geometry = BOOK_GEOMETRY[variant];
		assert.equal(geometry.height / geometry.width, 1.5);
		assert.ok(geometry.depth > geometry.boardThickness * 2);
		assert.ok(geometry.pageInsetX + geometry.boardOverhangX > 0);
		assert.ok(geometry.pageInsetY + geometry.boardOverhangY > 0);
		assert.equal(geometry.rotateX, 0);
		assert.equal(geometry.rotateY, -25);
		assert.ok(geometry.hoverRotateY < geometry.rotateY);
	}
});

test("几何配置完整输出为 CSS Variables", () => {
	const style = geometryStyle("hero");
	for (const variable of [
		"--book-w",
		"--book-h",
		"--book-depth",
		"--board-thickness",
		"--board-overhang-x",
		"--board-overhang-y",
		"--page-inset-x",
		"--page-inset-y",
		"--book-perspective",
		"--book-rotate-x",
		"--book-rotate-y",
		"--book-rotate-z",
		"--book-hover-rotate-y",
		"--obi-y",
		"--obi-height",
	]) {
		assert.match(style, new RegExp(`${variable}:`));
	}
});
