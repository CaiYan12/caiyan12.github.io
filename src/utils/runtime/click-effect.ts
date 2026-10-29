/**
 * 点击特效 1：社会主义核心价值观词组顺序循环（参考 zcjun.com，已去除其末尾的站点名），
 * 彩虹色上浮渐隐。T7 #122 从 theme-script.ts 迁入，行为逐项保持：
 *
 * - **无守卫、single-shot**：装配表只在初始装载时调用一次，document 级委托绑一次，
 *   Swup 切页不重跑（表行没有 swap 号）。这是基线语义，不要为「幂等」补 dataset 守卫。
 * - `clickEffectIndex` 是模块级游标，只增不减，对词表长度取模回绕。
 * - 色相按 30° 步进，12 个词恰好覆盖一圈彩虹色。
 * - 元素落在 `clientX / clientY - 20`，`animationend` 自删（不设超时兜底）。
 */
export const CLICK_EFFECT_WORDS = [
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
];

let clickEffectIndex = 0;

/** 第 index 次点击（0 基）落在词的哪一格；纯函数，供测试钉住轮换顺序 */
export function clickWordAt(index: number) {
	const slot = index % CLICK_EFFECT_WORDS.length;
	return { slot, word: CLICK_EFFECT_WORDS[slot] };
}

/** 第 index 次点击的色相；slot * 30 与词序同源，不是另一份步进表 */
export function clickEffectColor(index: number) {
	const slot = index % CLICK_EFFECT_WORDS.length;
	return `hsl(${slot * 30}, 100%, 45%)`;
}

export function initClickEffect() {
	document.addEventListener("click", (e) => {
		const { word } = clickWordAt(clickEffectIndex);
		const color = clickEffectColor(clickEffectIndex);
		clickEffectIndex++;
		const span = document.createElement("span");
		span.className = "click-word";
		span.textContent = word;
		span.style.color = color;
		span.style.left = `${e.clientX}px`;
		span.style.top = `${e.clientY - 20}px`;
		span.addEventListener("animationend", () => span.remove());
		document.body.appendChild(span);
	});
}
