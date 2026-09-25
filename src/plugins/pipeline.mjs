// 构建期 Markdown 管线的单一来源。
//
// 为什么存在：这两个数组原先直接写在 `astro.config.mjs` 的 `markdown.processor` 里。
// 它们不是配置值，而是**有顺序契约的代码**——`remarkCjkFriendly` 必须紧跟 Astro 内置
// remark-gfm 之后、其余插件之前，`rehypeAutolinkHeadings` 的注入节点带
// `data-pagefind-ignore`。放在配置文件里时，任何人调顺序都要在一份混合了站点设置的
// 长文件里核对；抽出来后，顺序契约与消费点分开，`astro.config.mjs` 只负责把它交给
// `unified()`。
//
// 顺序即产物：本模块的数组元素与顺序必须与迁移前逐元素等价，回归由「同码双跑 → 改码 →
// 第三次逐字节比对」承担（票册 T1 三段式），**不在此处写顺序断言清单**（已确认取最小形状）。
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import remarkMath from "remark-math";
import remarkDirective from "remark-directive";
import remarkCjkFriendly from "remark-cjk-friendly";
import { siteConfig } from "../config.ts";
import { remarkExcerpt } from "./remark-excerpt.js";
import { remarkImageGrid } from "./remark-image-grid.js";
import { remarkReadingTime } from "./remark-reading-time.mjs";
import { remarkExtended } from "./remark-extended.mjs";
import rehypeEmailProtection from "./rehype-email-protection.mjs";
import rehypeExternalLinks from "./rehype-external-links.mjs";
import rehypeTableWrapper from "./rehype-table-wrapper.mjs";

/** @returns {{remarkPlugins: unknown[], rehypePlugins: unknown[]}} */
export function markdownPipeline() {
	return {
		remarkPlugins: [
			remarkCjkFriendly, // 解析层扩展，须紧跟 Astro 内置 remark-gfm 之后、其余插件之前
			remarkMath,
			remarkDirective,
			remarkImageGrid, // [grid]...[/grid] 图片网格（移植自 Firefly）
			remarkExtended,
			remarkReadingTime,
			remarkExcerpt,
		],
		rehypePlugins: [
			rehypeKatex,
			rehypeSlug,
			// 外链新窗口打开 + 邮箱地址防爬虫混淆（移植自 Firefly）
			[rehypeExternalLinks, { siteUrl: siteConfig.siteURL }],
			[rehypeEmailProtection, { method: "base64" }],
			rehypeTableWrapper,
			[
				rehypeAutolinkHeadings,
				{
					behavior: "append",
					properties: {
						className: ["anchor"],
					},
					content: {
						type: "element",
						tagName: "span",
						properties: {
							className: ["anchor-icon"],
							"data-pagefind-ignore": true,
						},
						children: [{ type: "text", value: "#" }],
					},
				},
			],
		],
	};
}
