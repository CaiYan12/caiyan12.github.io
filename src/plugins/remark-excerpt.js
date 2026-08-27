/**
 * remark-excerpt：从文章 Markdown AST 中提取纯文本摘要（取前 N 字），
 * 写入 frontmatter 的 excerpt 字段，供首页列表/搜索描述使用。
 */
import { toString } from "mdast-util-to-string";

const DEFAULT_LENGTH = 120;

function plainText(node) {
	// 跳过代码块、数学式与叶子指令（::github{...} 等无正文语义的语法），不计入摘要
	if (node.type === "code" || node.type === "math") return "";
	if (node.type === "leafDirective") return "";
	return toString(node);
}

export function remarkExcerpt(options = {}) {
	const length = options.length ?? DEFAULT_LENGTH;

	return (tree, file) => {
		const text = plainText(tree).replace(/\s+/g, " ").trim();
		const excerpt =
			text.length > length ? text.slice(0, length) + "…" : text;
		file.data.astro.frontmatter.excerpt = excerpt;
	};
}
