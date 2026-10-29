// Mermaid runtime module 的视觉契约单测（#120/T5 迁入后获得的能力；此前 themeCSS 埋
// 在 theme-script.ts 的 renderMermaid 里，只能靠浏览器逐页比对，改坏了没人拦得住）。
//
// 期望值不是实现里那份模板的副本，而是**迁移前**（2026-10-29 基线快照
// git show HEAD:src/utils/theme-script.ts）themeCSS 字面量按真实主题变量展开的结果；
// 迁移时已用脚本确认 before 快照展开后与 buildMermaidThemeCss 输出逐字节相同（1740 字符）。
// 因此这条断言钉住的是「迁移前后视觉契约不变」，改动即视觉变更，需单独裁决。
import test from "node:test";
import assert from "node:assert/strict";
import { buildMermaidThemeCss } from "./mermaid";

const COLORS = {
	primary: "#00c000",
	primaryDark: "#0a0",
	textGray: "#505050",
};

// 迁移前 themeCSS 展开后的完整文本（缩进同源，含结尾换行 + 3 个 tab）
const EXPECTED_THEME_CSS = `
				.node rect, .node circle, .node ellipse, .node polygon, .node path {
					fill: #edfaf2 !important;
					stroke: #00c000 !important;
				}
				.node .label text, .nodeLabel, .label text {
					fill: #505050 !important;
					color: #505050 !important;
				}
				.edgeLabel, .edgeLabel rect {
					fill: #fff !important;
					background-color: #fff !important;
				}
				.mindmap-node.section-root rect,
				.mindmap-node.section-root path,
				.mindmap-node.section-root circle,
				.mindmap-node.section-root polygon {
					fill: #00c000 !important;
					stroke: #0a0 !important;
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
					fill: #edfaf2 !important;
					stroke: #00c000 !important;
				}
				.mindmap-node:not(.section-root) text,
				.mindmap-node:not(.section-root) span {
					fill: #505050 !important;
					color: #505050 !important;
				}
				[class*="section-edge-"] {
					stroke: #0a0 !important;
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

test("buildMermaidThemeCss：与迁移前 themeCSS 逐字节一致（含换行终态注释与缩进）", () => {
	assert.equal(buildMermaidThemeCss(COLORS), EXPECTED_THEME_CSS);
});

test("buildMermaidThemeCss：主题色全部来自入参，不留插值占位", () => {
	const css = buildMermaidThemeCss({
		primary: "#111111",
		primaryDark: "#222222",
		textGray: "#333333",
	});
	// 三类选择器各自的颜色接线（节点描边 / 节点文字 / 连线）随入参变化
	assert.ok(css.includes("stroke: #111111 !important;"));
	assert.ok(css.includes("fill: #333333 !important;"));
	assert.ok(css.includes("stroke: #222222 !important;"));
	assert.ok(!css.includes("${"));
	assert.ok(!css.includes(COLORS.primary));
});

test("buildMermaidThemeCss：标签换行终态规则在位（display:table + break-spaces，且不残留 nowrap）", () => {
	const css = buildMermaidThemeCss(COLORS);
	assert.match(
		css,
		/foreignObject div \{\s*display: table !important;\s*white-space: break-spaces !important;\s*\}/,
	);
	assert.ok(!/white-space:\s*nowrap/.test(css));
});
