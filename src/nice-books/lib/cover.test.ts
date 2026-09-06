// SVG 书封生成单测：确定性、比例、竖排/横排分支（handoff §12.3）。
import test from "node:test";
import assert from "node:assert/strict";
import { generateCoverSvg } from "./cover";
import { books } from "../data/books";

const 围城 = books.find((b) => b.id === "02")!; // 2 字短标题 → 竖排
const 棋王 = books.find((b) => b.id === "22")!; // 9 字长标题 → 两行横排

test("同一本书永远得到同一张封面（确定性）", () => {
	assert.equal(generateCoverSvg(围城), generateCoverSvg(围城));
});

test("输出为 2:3 书封（viewBox 0 0 300 450）且含 role/aria-label", () => {
	const svg = generateCoverSvg(围城);
	assert.ok(svg.includes('viewBox="0 0 300 450"'));
	assert.ok(svg.includes('role="img"'));
	assert.ok(svg.includes("aria-label="));
	assert.ok(svg.includes(escapeCheck(围城.title)));
});

function escapeCheck(s: string): string {
	return s; // 标题无 XML 特殊字符，直接包含检查
}

test("短标题（≤4 字）走竖排分支：dominant-baseline central + 逐字 <text>", () => {
	const svg = generateCoverSvg(围城);
	assert.ok(svg.includes('dominant-baseline="central"'));
	assert.ok(svg.includes('font-size="62"')); // 2 字 → 62px
	// 逐字竖排：围、城各自一个 <text>
	assert.ok((svg.match(/class="cv-title"/g) ?? []).length === 2);
});

test("长标题（>6 字）拆两行横排", () => {
	const svg = generateCoverSvg(棋王);
	assert.ok(svg.includes('font-size="27"'));
	assert.ok((svg.match(/class="cv-title"/g) ?? []).length === 2);
	assert.ok(!svg.includes('dominant-baseline="central"'));
});

test("不含 <defs>/<id>（多内联实例互不冲突）", () => {
	for (const b of books) {
		const svg = generateCoverSvg(b);
		assert.ok(!svg.includes("<defs>"));
		assert.ok(!/\sid=/.test(svg), `${b.id} 的封面含 id 属性`);
	}
});

test("不同 id 允许不同配色，但同 id 配色恒定（palette 由 id 决定）", () => {
	const bgOf = (svg: string) => svg.match(/<rect x="0" y="0" width="300" height="450" fill="(#[0-9a-f]+)"/)?.[1];
	assert.equal(bgOf(generateCoverSvg(围城)), bgOf(generateCoverSvg(围城)));
});
