/**
 * remark-image-grid：图片网格（移植自 Firefly 的 src/plugins/remark-image-grid.js，MIT）
 *
 * 解析 `[grid]` 与 `[/grid]` 包裹的图片块，包装为网格布局容器；
 * 列数按网格内图片数量自动决定（1-4 列，默认 2 列）。
 * 与 Firefly 原版差异：输出 `data-cols` 属性而非 Tailwind 工具类，
 * 网格样式由 markdown-extended.css 的 `.image-grid` 规则实现（本项目以 custom class 为主）。
 *
 * 用法：
 * [grid]
 * ![image1](/url1)
 * ![image2](/url2)
 * [/grid]
 *
 * @returns {import('unified').Plugin}
 */

import { visit } from "unist-util-visit";

export function remarkImageGrid() {
	return (tree) => {
		// 1. Process block-level [grid] and [/grid]
		if (tree.type === "root") {
			const newChildren = [];
			let inGrid = false;
			let gridChildren = [];

			for (let i = 0; i < tree.children.length; i++) {
				const node = tree.children[i];

				// Check if paragraph contains [grid] or [/grid]
				if (node.type === "paragraph" && node.children.length > 0) {
					const first = node.children[0];
					const last = node.children[node.children.length - 1];

					let containsGridStart = false;
					let containsGridEnd = false;

					if (
						first.type === "text" &&
						first.value.trim().startsWith("[grid]")
					) {
						containsGridStart = true;
					}
					if (
						last.type === "text" &&
						last.value.trim().endsWith("[/grid]")
					) {
						containsGridEnd = true;
					}

					// Case 1: [grid] and [/grid] in the SAME paragraph
					if (containsGridStart && containsGridEnd && !inGrid) {
						first.value = first.value.replace(
							/^\s*\[grid\]\s*/,
							"",
						);
						last.value = last.value.replace(
							/\s*\[\/grid\]\s*$/,
							"",
						);

						// count images in the grid
						const imgCount = node.children.filter(
							(n) =>
								n.type === "image" ||
								(n.type === "link" &&
									n.children &&
									n.children.some((c) => c.type === "image")),
						).length;
						const cols = Math.min(imgCount || 2, 4);

						newChildren.push({
							type: "paragraph",
							data: {
								hName: "div",
								hProperties: {
									className: ["image-grid"],
									"data-cols": String(cols),
								},
							},
							children: node.children.filter(
								(n) =>
									n.type !== "text" || n.value.trim() !== "",
							), // Remove empty text nodes left over
						});
						continue;
					}

					// Case 2: Multi-paragraph
					if (!inGrid && containsGridStart) {
						inGrid = true;
						first.value = first.value.replace(
							/^\s*\[grid\]\s*/,
							"",
						);
						if (
							node.children.length === 1 &&
							first.value.trim() === ""
						) {
							// [grid] stood alone, ignore this node
						} else {
							gridChildren.push(node);
						}
						continue;
					}

					if (inGrid && containsGridEnd) {
						inGrid = false;
						last.value = last.value.replace(
							/\s*\[\/grid\]\s*$/,
							"",
						);
						if (
							node.children.length === 1 &&
							last.value.trim() === ""
						) {
							// [/grid] stood alone
						} else {
							gridChildren.push(node);
						}

						// Count images across all children in gridChildren
						let imgCount = 0;
						gridChildren.forEach((child) => {
							visit(child, "image", () => {
								imgCount++;
							});
						});
						const cols = Math.min(imgCount || 2, 4);

						newChildren.push({
							type: "paragraph",
							data: {
								hName: "div",
								hProperties: {
									className: ["image-grid"],
									"data-cols": String(cols),
								},
							},
							children: gridChildren,
						});
						gridChildren = [];
						continue;
					}
				}

				if (inGrid) {
					gridChildren.push(node);
				} else {
					newChildren.push(node);
				}
			}

			// If unclosed, just append them
			if (inGrid) {
				newChildren.push(...gridChildren);
			}

			tree.children = newChildren;
		}
	};
}
