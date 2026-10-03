/**
 * 把章末「本章小结」小节包成可整段定性的盒子。
 *
 * 匹配 h2 纯文本以「本章小结」结尾的节，将它与后续内容包进原生 fieldset/legend：
 *
 *   fieldset.chapter-summary
 *     ├─ legend.chapter-summary-title（保留 slug id，ARIA heading level 2）
 *     └─ div.chapter-summary-body（原小结正文）
 *
 * 浏览器原生绘制 legend 对应的边框开口，让横线和圆角保持连续，避免多段边框拼接。
 *
 * 不改写任何文本内容；正文里不是小结的东西一个字节都不动。
 * 必须注册在 rehype-autolink-headings 之前——本插件的文本匹配只看 text 子节点，
 * 转成 legend 后保留原 slug id 与二级标题的 ARIA 语义。
 */
import { SKIP, visit } from "unist-util-visit";

const SUMMARY_SUFFIX = "本章小结";

function headingText(node) {
	return (node.children ?? [])
		.filter((child) => child.type === "text")
		.map((child) => child.value)
		.join("")
		.trim();
}

function element(tagName, classNames, children) {
	return {
		type: "element",
		tagName,
		properties: { className: classNames },
		children,
	};
}

export default function rehypeChapterSummary() {
	return (tree) => {
		visit(tree, "element", (node, index, parent) => {
			if (node.tagName !== "h2" || !parent || typeof index !== "number") {
				return;
			}
			if (!headingText(node).endsWith(SUMMARY_SUFFIX)) return;

			const siblings = parent.children;
			let end = index + 1;
			while (end < siblings.length) {
				const next = siblings[end];
				if (next.type === "element" && /^h[1-6]$/.test(next.tagName))
					break;
				end += 1;
			}

			const title = {
				...node,
				tagName: "legend",
				properties: {
					...(node.properties ?? {}),
					className: ["chapter-summary-title"],
					role: "heading",
					ariaLevel: 2,
				},
			};
			const wrap = element(
				"fieldset",
				["chapter-summary"],
				[
					title,
					element(
						"div",
						["chapter-summary-body"],
						siblings.slice(index + 1, end),
					),
				],
			);
			parent.children.splice(index, end - index, wrap);
			// 新壳不在原遍历位置上，SKIP 防止下降进 h2 重复匹配
			return SKIP;
		});
	};
}
