// 点击词轮换顺序与色相步进的单测（T7 #122 迁移时抽出的纯函数核）。
// 期望值来自迁移前 theme-script.ts 的 `initClickEffect` 实际读数，不是理想行为：
// 12 个词按固定表序逐个出，`clickEffectIndex` 只增不减、对 12 取模回绕，
// 色相 = slot * 30（12 个词恰好铺满一圈彩虹）。
import test from "node:test";
import assert from "node:assert/strict";
import {
	CLICK_EFFECT_WORDS,
	clickEffectColor,
	clickWordAt,
} from "./click-effect";

test("词表就是社会主义核心价值观 12 个词，顺序与基线一致", () => {
	assert.deepEqual(CLICK_EFFECT_WORDS, [
		"富强",
		"民主",
		"文明",
		"和谐",
		"自由",
		"平等",
		"公正",
		"法治",
		"爱国",
		"敬业",
		"诚信",
		"友善",
	]);
});

test("首点击第一个词、第 12 击最后一个词", () => {
	assert.equal(clickWordAt(0).word, "富强");
	assert.equal(clickWordAt(11).word, "友善");
});

test("第 13 击回绕到第一个词（index 只增不减）", () => {
	assert.equal(clickWordAt(12).word, "富强");
	assert.equal(clickWordAt(24).word, "富强");
	assert.equal(clickWordAt(23).word, "友善");
	assert.equal(clickWordAt(25).word, "民主");
});

test("色相按 30° 步进，slot 0 起、末位 330°", () => {
	assert.equal(clickEffectColor(0), "hsl(0, 100%, 45%)");
	assert.equal(clickEffectColor(1), "hsl(30, 100%, 45%)");
	assert.equal(clickEffectColor(11), "hsl(330, 100%, 45%)");
});
