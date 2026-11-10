// 样式指纹的「不渲染元素」判定。
//
// 背景（2026-11-10 实测）：升级审计的指纹把 body 里每个元素都记一行，`diff` 对**元素增删**
// 一律记「可见差异」，而且比对键里含「全部兄弟元素序号」。这两条叠加，使得删掉一个不生成
// 盒子的 `<script>` 会同时产生两类假差异：① 脚本元素自己少一行；② 它之后所有兄弟元素的
// 序号整体前移，于是成百条 REMOVED/ADDED。
//
// 把四个页面级功能的内联脚本迁进共享 chunk 时，真实差异只有 18 个 `<script>`，工具却报出
// 12/23 页、2365 条。这不属于「可见变化」，比对时必须剔除。
//
// 剔除范围只限**永不生成盒子**的标签：脚本、样式表引用、内联样式、元信息、noscript 的内容、
// template 的内容。`img` / `input` / `br` 这类会生成盒子（或被布局计数）的元素**不在其列**——
// 删掉它们确实会改变渲染，必须继续报红。

/** 这些标签在渲染树里不产生盒子，增删不改变可见结果。 */
export const NON_RENDERING_TAGS = [
	"script",
	"style",
	"link",
	"meta",
	"noscript",
	"template",
];

const NON_RENDERING = new Set(NON_RENDERING_TAGS);

/**
 * 从指纹行里取元素标签名。
 * 行格式：`<标签><#id><.class> | <位置路径> | <属性…>`；
 * 状态行的前缀是 `:<伪类> `（如 `:hover a.x | …`）。
 */
export function tagOfLine(line) {
	if (typeof line !== "string" || !line) return "";
	const head = line.split(" | ")[0];
	const match = /^(?::[a-z-]+\s+)?([a-zA-Z][a-zA-Z0-9-]*)/.exec(head);
	return match ? match[1].toLowerCase() : "";
}

/** 该标签是否不生成盒子（大小写不敏感；未知/空值一律当渲染元素，宁严不宽）。 */
export function isNonRenderingTag(tag) {
	if (typeof tag !== "string") return false;
	return NON_RENDERING.has(tag.trim().toLowerCase());
}

/** 该指纹行是否属于不渲染元素。 */
export function isNonRenderingLine(line) {
	return isNonRenderingTag(tagOfLine(line));
}

/**
 * 剔除不渲染元素行，保持其余行的原始顺序。
 * @param {string[]} lines
 * @returns {{ lines: string[], dropped: number }}
 */
export function stripNonRenderingLines(lines) {
	if (!Array.isArray(lines)) return { lines: [], dropped: 0 };
	const kept = [];
	let dropped = 0;
	for (const line of lines) {
		if (isNonRenderingLine(line)) dropped++;
		else kept.push(line);
	}
	return { lines: kept, dropped };
}
