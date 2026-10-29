// 稿纸运行时模块的行为契约（#123/T8 迁出后钉住**迁移前**的逐字切分与相位公式）。
// 期望值来自迁移前 theme-script.ts（39ac578）里的正则字面量与相位式，按手算样例写成
// 固定字面量：切分规则一变，正文就会在单词内换行；相位式一变，横线就不再压在基线上。
import test from "node:test";
import assert from "node:assert/strict";
import { splitPaperSegments, computePaperShift } from "./paper-handwriting";

test("西文/数字（含空格与半角标点）整段成组，不参与逐字切分", () => {
	assert.deepEqual(splitPaperSegments("Hello 2026, ok!"), [
		{ text: "Hello 2026, ok!", isChar: false },
	]);
});

test("CJK 与全角标点逐字成组", () => {
	assert.deepEqual(splitPaperSegments("稿纸，好"), [
		{ text: "稿", isChar: true },
		{ text: "纸", isChar: true },
		{ text: "，", isChar: true },
		{ text: "好", isChar: true },
	]);
});

test("混排：西文段与单字交替，空格留在西文段尾部", () => {
	assert.deepEqual(splitPaperSegments("HTML 稿纸 test"), [
		{ text: "HTML ", isChar: false },
		{ text: "稿", isChar: true },
		{ text: "纸", isChar: true },
		{ text: " test", isChar: false },
	]);
});

test("空串不产生片段", () => {
	assert.deepEqual(splitPaperSegments(""), []);
});

test("相位：桌面参数 cycle 32 / baseline 24 时取正文盒顶 + 基线对周期的余数", () => {
	// (100 - 0 + 24) % 32 = 124 % 32 = 28
	assert.equal(
		computePaperShift({
			cycle: 32,
			baseline: 24,
			bodyTop: 100,
			panelTop: 0,
			borderTop: 0,
		}),
		28,
	);
});

test("相位：负偏移按 JS 取模再归一化到 [0, cycle)", () => {
	// (10 - 100 + 24) = -66；-66 % 32 = -2；(-2 + 32) % 32 = 30
	assert.equal(
		computePaperShift({
			cycle: 32,
			baseline: 24,
			bodyTop: 10,
			panelTop: 100,
			borderTop: 0,
		}),
		30,
	);
});

test("相位：面板 border 计入 padding box 顶（窄屏 28/17 + 1px 边框）", () => {
	// (0 - (0 + 1) + 17) = 16
	assert.equal(
		computePaperShift({
			cycle: 28,
			baseline: 17,
			bodyTop: 0,
			panelTop: 0,
			borderTop: 1,
		}),
		16,
	);
});

test("读不到周期或基线时返回 null，让 CSS 的 --lp-baseline 回落值生效", () => {
	const base = {
		cycle: 32,
		baseline: 24,
		bodyTop: 100,
		panelTop: 0,
		borderTop: 0,
	};
	assert.equal(computePaperShift({ ...base, cycle: Number.NaN }), null);
	assert.equal(computePaperShift({ ...base, baseline: Number.NaN }), null);
});
