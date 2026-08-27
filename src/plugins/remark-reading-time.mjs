/**
 * remark-reading-time：计算文章阅读时间（按中文阅读速度 ~300 字/分钟），
 * 写入 frontmatter 的 readingTime 字段。
 */
import { toString } from "mdast-util-to-string";

const WORDS_PER_MINUTE = 300;

export function remarkReadingTime() {
	return (tree, file) => {
		const text = toString(tree);
		const cjkCount = (text.match(/[一-鿿぀-ヿ]/g) || []).length;
		const otherWords = text
			.replace(/[一-鿿぀-ヿ]/g, "")
			.split(/\s+/)
			.filter((w) => w.length > 0).length;

		const minutes = Math.ceil(
			cjkCount / WORDS_PER_MINUTE +
				otherWords / (WORDS_PER_MINUTE * 2),
		);
		file.data.astro.frontmatter.readingTime = Math.max(1, minutes);
	};
}
