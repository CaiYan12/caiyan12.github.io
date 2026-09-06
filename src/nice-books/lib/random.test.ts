// 随机逻辑单测：注入 mulberry32 种子 RNG 保证 deterministic（主提示词 §35）。
import test from "node:test";
import assert from "node:assert/strict";
import { pickOne, sampleUnique } from "./random";
import { books, featuredBooks } from "../data/books";

function mulberry32(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

test("pickOne：同种子结果确定（可复现）", () => {
	const a = pickOne(books, null, mulberry32(42));
	const b = pickOne(books, null, mulberry32(42));
	assert.equal(a.id, b.id);
});

test("pickOne：排除当前 id 后永不返回当前书（契约：新 ≠ 当前）", () => {
	const current = books[0]!;
	const rng = mulberry32(7);
	for (let i = 0; i < 200; i++) {
		const next = pickOne(books, current.id, rng);
		assert.notEqual(next.id, current.id);
	}
});

test("pickOne：排除后池为空时抛错（而不是返回当前书）", () => {
	const single = [{ id: "01", title: "x" }];
	assert.throws(() => pickOne(single, "01", mulberry32(1)));
});

test("sampleUnique：抽 n 本，组内 id 无重复", () => {
	const rng = mulberry32(100);
	for (let i = 0; i < 50; i++) {
		const group = sampleUnique(featuredBooks, 6, [], rng);
		assert.equal(group.length, 6);
		assert.equal(new Set(group.map((b) => b.id)).size, 6);
	}
});

test("sampleUnique：新组排除旧组全部 id（契约：站长推荐整组替换）", () => {
	const currentGroup = featuredBooks.slice(0, 6).map((b) => b.id);
	const rng = mulberry32(11);
	for (let i = 0; i < 50; i++) {
		const next = sampleUnique(featuredBooks, 6, currentGroup, rng);
		assert.equal(next.length, 6);
		for (const b of next) {
			assert.ok(!currentGroup.includes(b.id), `新组包含旧组 id ${b.id}`);
		}
	}
});

test("sampleUnique：同种子结果确定", () => {
	const a = sampleUnique(books, 6, [], mulberry32(2026));
	const b = sampleUnique(books, 6, [], mulberry32(2026));
	assert.deepEqual(
		a.map((x) => x.id),
		b.map((x) => x.id),
	);
});

test("sampleUnique：池不足时放宽排除并返回池规模上限（原型兜底语义）", () => {
	const tinyPool = [
		{ id: "01" },
		{ id: "02" },
		{ id: "03" },
	];
	const got = sampleUnique(tinyPool, 6, ["01", "02", "03"], mulberry32(1));
	assert.equal(got.length, 3); // 放宽排除后取 min(pool, n)
});
