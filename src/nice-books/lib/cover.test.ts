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
	assert.ok(svg.includes('font-size="60"')); // 文学族短标题大字
	// 逐字竖排：围、城各自一个 <text>
	assert.ok((svg.match(/class="cv-title"/g) ?? []).length === 2);
});

test("四字文学标题上收，为腰封预留下部安全区", () => {
	const svg = generateCoverSvg(books.find((book) => book.id === "01")!);
	assert.match(svg, /y="205"[^>]*class="cv-title"/);
	assert.doesNotMatch(svg, /y="259"[^>]*class="cv-title"/);
});

test("22 本书标题均停在 hero/card 腰封安全线之上", () => {
	for (const book of books) {
		const titleBoxes = [
			...generateCoverSvg(book).matchAll(
				/<text[^>]*class="cv-title"[^>]*>/g,
			),
		].map((match) => {
			const tag = match[0];
			const y = Number(tag.match(/y="([0-9.]+)"/)?.[1]);
			const size = Number(tag.match(/font-size="([0-9.]+)"/)?.[1]);
			return y + size / 2;
		});
		assert.ok(
			Math.max(...titleBoxes) < 247.5,
			`${book.id} ${book.title} title extends into hero sash safe line`,
		);
	}
});

test("长标题（>6 字）拆两行横排", () => {
	const svg = generateCoverSvg(棋王);
	assert.ok((svg.match(/class="cv-title"/g) ?? []).length === 2);
	assert.ok(svg.includes('x="48"')); // 散文族左上疏排横题
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
	const bgOf = (svg: string) =>
		svg.match(
			/<rect x="0" y="0" width="300" height="450" fill="(#[0-9a-f]+)"/,
		)?.[1];
	assert.equal(bgOf(generateCoverSvg(围城)), bgOf(generateCoverSvg(围城)));
	assert.notEqual(
		bgOf(generateCoverSvg(books[0]!)),
		bgOf(generateCoverSvg(books[1]!)),
	);
});

test("四个族保留独立构图，特殊标题与未知 ID 均安全回退", () => {
	const byId = (id: string) => books.find((book) => book.id === id)!;
	const literary = generateCoverSvg(byId("01"));
	const history = generateCoverSvg(byId("06"));
	const science = generateCoverSvg(byId("03"));
	const essay = generateCoverSvg(byId("05"));
	assert.match(literary, /M54 322/); // literary 曲线
	assert.match(literary, /x="150" y="[0-9]+" class="cv-title"/); // 中央排版
	assert.match(history, /M46 276/); // history 档案线
	assert.match(history, /x="46" y="88" class="cv-title"/); // 左上排版
	assert.match(science, /<ellipse/); // science 轨道
	assert.match(science, /x="150" y="104" class="cv-title"/); // 上部横排
	assert.match(essay, /M54 352/); // essay 地景
	assert.match(essay, /x="48" y="88" class="cv-title"/); // 左上疏排
	assert.match(history, /class="cv-meta cv-author"[^>]+opacity="1"/);
	assert.match(history, /class="cv-meta cv-imprint"[^>]+opacity="1"/);
	const special = { ...books[0]!, id: "99", title: '<测试 & "封面">' };
	const unknown = generateCoverSvg(special);
	assert.match(unknown, /M54 322/);
	assert.match(unknown, /&lt;测试 &amp; &quot;封面&quot;&gt;/);
});

test("每个封面族的第二套配色也由 ID 稳定选择", () => {
	const bgOf = (svg: string) =>
		svg.match(
			/<rect x="0" y="0" width="300" height="450" fill="(#[0-9a-f]+)"/,
		)?.[1];
	for (const [first, second] of [
		["01", "02"],
		["06", "14"],
		["03", "17"],
		["05", "08"],
	] as const) {
		assert.notEqual(
			bgOf(generateCoverSvg(books.find((book) => book.id === first)!)),
			bgOf(generateCoverSvg(books.find((book) => book.id === second)!)),
		);
	}
});
