// 动态标题「原标题捕获」判定的单测（T7 #122 迁移时抽出的纯函数核）。
// 期望值来自迁移前 theme-script.ts 的 `initVisibilityTitle` 实际读数：
// 快速 hide→show→hide 时第二次 hide 读到的标题仍是告别语，此时**不得**覆盖
// 已捕获的 originalTitle，否则真实标题被替代语永久覆盖。所以两条替代语都要排除。
import test from "node:test";
import assert from "node:assert/strict";
import {
	GOODBYE_TITLE,
	HIDDEN_TITLE,
	shouldCaptureOriginalTitle,
} from "./visibility-title";

test("标题为真实内容时捕获", () => {
	assert.equal(
		shouldCaptureOriginalTitle("Mock 测试：Markdown 内容增强"),
		true,
	);
	assert.equal(shouldCaptureOriginalTitle(""), true);
});

test("两条替代语都不当作原标题", () => {
	assert.equal(shouldCaptureOriginalTitle(HIDDEN_TITLE), false);
	assert.equal(shouldCaptureOriginalTitle(GOODBYE_TITLE), false);
});

test("替代语文案与基线逐字一致", () => {
	assert.equal(HIDDEN_TITLE, "别走啊...(っ°Д°;)っ");
	assert.equal(GOODBYE_TITLE, "算了，你走吧！");
});
