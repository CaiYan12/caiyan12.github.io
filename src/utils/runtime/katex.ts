/**
 * KaTeX 样式加载运行时模块（#120/T5 自 theme-script.ts 原样迁入）。
 *
 * 条件加载：只有页面真的渲染出公式（存在 `.katex`）才动态 import katex.css，
 * 没公式的文章页不为样式多付一次请求。加载失败只 console.warn、不阻塞页面——
 * 公式仍是可读的原始文本。与 mermaid 分属两个关注面，故不共用实现。
 */

/** 页面存在 KaTeX 公式时按需加载其样式 */
export function loadKatexCss() {
	if (document.querySelector(".katex")) {
		import("katex/dist/katex.css").catch((error) => {
			// 样式加载失败不阻塞页面；公式仍以原始文本可读
			console.warn("[katex] css load failed:", error);
		});
	}
}
