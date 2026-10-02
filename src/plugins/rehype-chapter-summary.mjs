/**
 * 把章末「本章小结」小节包成可整段定性的盒子。
 *
 * 匹配规则：h2 的纯文本以「本章小结」结尾（如「0.6 本章小结」「3.12 本章小结」，
 * 《看懂 AI 写的网站》系列书稿的固定写法）→ 将该 h2 与其后直到下一个标题（h1–h6）
 * 或父级末尾的所有兄弟节点，包进四层结构：
 *
 *   div.chapter-summary（壳：只做定位上下文，无边框、不裁切、不遮罩——
 *     ├─ div.chapter-summary-corner.--left    标题左侧的顶角弧件（弧+引线，画到缺口内自由收尾）
 *     ├─ div.chapter-summary-corner.--right   右侧顶角弧件
 *     ├─ h2（原节点，含 rehype-slug 已注入的 id；标题行，文字骑在边框线上）
 *     └─ div.chapter-summary-frame            框身：左右下三边 + 底部圆角 + clip-path 裁掉顶角直段残留
 *          └─ div.chapter-summary-body        小结正文
 *
 * 为什么拆成这样（v4，前两版被站长打回的教训）：标题文字与两枚顶角弧件必须是壳的
 * 直接子节点——一旦进了带 clip-path/mask 的元素，悬在盒外的文字上半会被一并裁掉
 * （v3 的真实事故）。框身若自带顶部圆角（border-radius 上角 > 0），Chrome 对无顶边
 * 盒子的侧边框弧只画到约 45° 就斜切，与任何补画弧都会留下交接痕（v2 的事故），
 * 故框身上角为 0、顶角弧全部由角件单一绘制，与框身只在直段上重叠拼接。
 *
 * 不改写任何文本内容；正文里不是小结的东西一个字节都不动。
 * 必须注册在 rehype-autolink-headings 之前——本插件的文本匹配只看 text 子节点，
 * 先跑可以少考虑锚点图标子元素，也让标题行内部保持干净（锚点由 CSS 隐藏）。
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

			const frame = element(
				"div",
				["chapter-summary-frame"],
				[
					element(
						"div",
						["chapter-summary-body"],
						siblings.slice(index + 1, end),
					),
				],
			);
			const wrap = element(
				"div",
				["chapter-summary"],
				[
					element(
						"div",
						[
							"chapter-summary-corner",
							"chapter-summary-corner--left",
						],
						[],
					),
					element(
						"div",
						[
							"chapter-summary-corner",
							"chapter-summary-corner--right",
						],
						[],
					),
					node,
					frame,
				],
			);
			parent.children.splice(index, end - index, wrap);
			// 新壳不在原遍历位置上，SKIP 防止下降进 h2 重复匹配
			return SKIP;
		});
	};
}
