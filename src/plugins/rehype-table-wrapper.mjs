/**
 * 为文章中的原生表格添加可横向滚动的容器。
 * 普通表格仍由表格自身按正文宽度排版，内容较宽时只滚动表格区域。
 */
import { SKIP, visit } from "unist-util-visit";

const TABLE_SCROLL_CLASS = "table-scroll";

export default function rehypeTableWrapper() {
	return (tree) => {
		visit(tree, "element", (node, index, parent) => {
			if (
				node.tagName !== "table" ||
				!parent ||
				typeof index !== "number"
			)
				return;

			const parentClasses = parent.properties?.className;
			const alreadyWrapped = Array.isArray(parentClasses)
				? parentClasses.includes(TABLE_SCROLL_CLASS)
				: parentClasses === TABLE_SCROLL_CLASS;
			if (alreadyWrapped) return;

			parent.children[index] = {
				type: "element",
				tagName: "div",
				properties: { className: [TABLE_SCROLL_CLASS] },
				children: [node],
			};
			return SKIP;
		});
	};
}
