/**
 * Mermaid 图表渲染运行时模块（#120/T5 自 theme-script.ts 原样迁入）。
 *
 * 懒加载：页面只有存在 `pre.mermaid` 时才动态 import mermaid；渲染完成才给节点打
 * `dataset.mermaidRendered` 续跑守卫，失败走 catch 只 warn（原始代码块仍可读），
 * 下次切页重跑时能重新尝试。
 *
 * 这份文件里两处细节是**视觉契约**，不是可随手整理的样式代码：
 * 1. 字体就绪门（fonts.load + fonts.ready 与 3s 竞速）：webfont 按 unicode-range 分片，
 *    图表文本进 DOM 才触发子集加载，测量必须等字面就绪，否则节点盒按旧度量生成、
 *    foreignObject 裁掉长中文标签；
 * 2. themeCSS 末尾的换行终态（display:table + white-space:break-spaces）：mermaid
 *    的 addHtmlSpan 靠「测量宽度 === wrappingWidth」的浮点精确相等切换行，真实浏览器
 *    回不到恰好 200px，靠这个规则兜住。
 * 因此 themeCSS 的字符串内容（含缩进）与迁移前逐字一致，由 mermaid.test.ts 按字面量
 * 比对；改它就是视觉变更，需单独裁决。
 */

/** 节点底色（浅绿）：themeCSS 与 themeVariables 共用同一来源 */
const NODE_BACKGROUND = "#edfaf2";

/** themeCSS 插值用到的主题变量（值取自 documentElement 的 CSS 自定义属性） */
export interface MermaidThemeColors {
	primary: string;
	primaryDark: string;
	textGray: string;
}

/**
 * 生成注入 mermaid 的 themeCSS。
 *
 * 缩进刻意保留迁移前的 3/4/5 个 tab：这是交给 mermaid 的 CSS 文本，不是本文件的
 * 缩进风格，请勿按外层层级重排（会改变字符串内容）。
 */
export function buildMermaidThemeCss(colors: MermaidThemeColors): string {
	const { primary, primaryDark, textGray } = colors;
	return `
				.node rect, .node circle, .node ellipse, .node polygon, .node path {
					fill: ${NODE_BACKGROUND} !important;
					stroke: ${primary} !important;
				}
				.node .label text, .nodeLabel, .label text {
					fill: ${textGray} !important;
					color: ${textGray} !important;
				}
				.edgeLabel, .edgeLabel rect {
					fill: #fff !important;
					background-color: #fff !important;
				}
				.mindmap-node.section-root rect,
				.mindmap-node.section-root path,
				.mindmap-node.section-root circle,
				.mindmap-node.section-root polygon {
					fill: ${primary} !important;
					stroke: ${primaryDark} !important;
				}
				.mindmap-node.section-root text,
				.mindmap-node.section-root span {
					fill: #fff !important;
					color: #fff !important;
				}
				.mindmap-node:not(.section-root) rect,
				.mindmap-node:not(.section-root) path,
				.mindmap-node:not(.section-root) circle,
				.mindmap-node:not(.section-root) polygon {
					fill: ${NODE_BACKGROUND} !important;
					stroke: ${primary} !important;
				}
				.mindmap-node:not(.section-root) text,
				.mindmap-node:not(.section-root) span {
					fill: ${textGray} !important;
					color: ${textGray} !important;
				}
				[class*="section-edge-"] {
					stroke: ${primaryDark} !important;
				}
				[class*="edge-depth-"] {
					stroke-width: 2px !important;
				}
				/* 换行终态强制（2026-10-02）：addHtmlSpan 对 label 先设 nowrap，再靠
				   「测量宽度 === wrappingWidth」的浮点精确相等来切换 break-spaces——
				   真实浏览器（Edge/Chrome 实测）的 table-cell 测量回不到恰好 200，
				   等式永远失守，长中文标签被 foreignObject 单行裁切（无头 Chromium
				   反而能过，是它掩盖了线上缺陷）。这里直接把 div 拔到换行终态：
				   display:table 收缩适配 + mermaid 自己写的内联 max-width 兜宽度，
				   测量即换行形态，节点盒按真实多行尺寸生成，不再依赖那个等式。 */
				foreignObject div {
					display: table !important;
					white-space: break-spaces !important;
				}
			`;
}

/** 渲染 mermaid 图表（懒加载，仅在页面存在 pre.mermaid 时执行） */
export async function renderMermaid() {
	const nodes = [...document.querySelectorAll<HTMLElement>("pre.mermaid")];
	const pending = nodes.filter((n) => n.dataset.mermaidRendered !== "true");
	if (pending.length === 0) return;
	try {
		const { default: mermaid } = await import("mermaid");
		const rootStyles = getComputedStyle(document.documentElement);
		const cssVar = (name: string, fallback: string) =>
			rootStyles.getPropertyValue(name).trim() || fallback;
		const primary = cssVar("--primary", "#00c000");
		const primaryDark = cssVar("--primary-dark", "#0a0");
		const border = cssVar("--border", "#eaeaea");
		const pageBackground = cssVar("--page-bg", "#f4f5f7");
		const text = cssVar("--text", "#000");
		const textGray = cssVar("--text-gray", "#505050");
		const bodyFont = getComputedStyle(document.body).fontFamily;
		const nodeBackground = NODE_BACKGROUND;

		mermaid.initialize({
			startOnLoad: false,
			theme: "base",
			look: "classic",
			fontFamily: bodyFont,
			fontSize: 14,
			themeVariables: {
				background: pageBackground,
				mainBkg: "#fff",
				primaryColor: nodeBackground,
				primaryTextColor: textGray,
				primaryBorderColor: primary,
				secondaryColor: "#fff",
				tertiaryColor: pageBackground,
				lineColor: primaryDark,
				textColor: text,
				nodeBkg: nodeBackground,
				nodeBorder: primary,
				nodeTextColor: textGray,
				clusterBkg: "#fff",
				clusterBorder: border,
			},
			themeCSS: buildMermaidThemeCss({ primary, primaryDark, textGray }),
			securityLevel: "strict",
		});
		// 字体就绪后才允许测量：mermaid 的 label 默认 white-space:nowrap，只有测量宽度
		// 恰好等于 wrappingWidth（200px）才切换成 break-spaces 换行（addHtmlSpan 源码行为）。
		// webfont 是按 unicode-range 分片的可变字体，图表文本进 DOM 才触发对应子集加载；
		// 若在子集就绪前测量，字体换上后文字比按旧度量定好的节点盒宽，foreignObject
		// 把溢出裁掉——线上长中文标签实测被单行截断。fonts.load 按本次 label 文本精确
		// 触发所需子集，fonts.ready 兜底等在途加载；失败不阻塞渲染（走外层 catch 的降级）。
		const sampleText = pending.map((n) => n.textContent ?? "").join("");
		const families = bodyFont
			.split(",")
			.map((f) => f.trim().replace(/^["']+|["']+$/g, ""))
			.filter(Boolean);
		// 3s 竞速上限：字体正常亚秒就绪；病态网络下宁可退回旧的测量行为
		// （可能轻微裁切）也不能让图表长时间不渲染——与下方 catch 的降级哲学一致
		await Promise.race([
			Promise.allSettled([
				document.fonts.load(
					`16px ${families.map((f) => `"${f}"`).join(", ")}`,
					sampleText,
				),
				document.fonts.ready,
			]),
			new Promise((r) => setTimeout(r, 3000)),
		]);
		await mermaid.run({ nodes: pending });
		pending.forEach((n) => (n.dataset.mermaidRendered = "true"));
	} catch (error) {
		// 渲染失败不阻塞页面，原始代码块仍可阅读；warn 供线上排错
		console.warn("[mermaid] render failed:", error);
	}
}
