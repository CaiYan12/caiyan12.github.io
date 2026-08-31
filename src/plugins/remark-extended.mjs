/**
 * remark-extended：为 Markdown 提供博客扩展语法（由 Mizuki 模板测试帖引入）。
 * - `:::note/tip/important/warning/caution` 容器指令 → admonition 提示块
 * - `> [!NOTE]` 等 GitHub 风格 alerts → markdown-alert 提示块
 * - `:spoiler[内容]` 文本指令 → 可点击显示/隐藏的 spoiler
 * - `::github{repo="user/repo"}` 叶子指令 → GitHub 仓库卡片（内容由客户端拉取）
 * - ```mermaid 代码块 → 交由客户端 mermaid.js 渲染为图表
 *
 * 说明：本插件在 remark 阶段把上述语法直接转换成 `html` 节点，
 * 依赖 Astro 默认的 allowDangerousHtml 透传原生 HTML。
 */
import { visit } from "unist-util-visit";
import { toString } from "mdast-util-to-string";

const ADMONITION_TYPES = new Set([
	"note",
	"tip",
	"important",
	"warning",
	"caution",
]);
const ALERT_MAP = {
	note: "备注",
	tip: "提示",
	important: "重要",
	warning: "警告",
	caution: "危险",
};

function escapeHtml(str) {
	return String(str)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

/** 提取容器指令中的标题节点（:::note[自定义标题]），返回标题 HTML；无则返回空串 */
function extractLabel(directive) {
	const idx = directive.children.findIndex(
		(c) => c.type === "directiveLabel",
	);
	if (idx === -1) return "";
	const [label] = directive.children.splice(idx, 1);
	return `<p class="admonition-title">${escapeHtml(toString(label).trim())}</p>`;
}

export function remarkExtended() {
	return (tree) => {
		// 1. 容器指令（admonition）
		visit(tree, "containerDirective", (node, index, parent) => {
			const name = String(node.name || "").toLowerCase();
			if (!parent || index === undefined || !ADMONITION_TYPES.has(name))
				return;
			const htmlOpen = {
				type: "html",
				value: `<div class="admonition admonition-${name}">${extractLabel(node)}`,
			};
			const htmlClose = { type: "html", value: "</div>" };
			parent.children.splice(
				index,
				1,
				htmlOpen,
				...node.children,
				htmlClose,
			);
		});

		// 2. 叶子指令（GitHub 卡片）
		visit(tree, "leafDirective", (node, index, parent) => {
			if (
				!parent ||
				index === undefined ||
				String(node.name || "") !== "github"
			)
				return;
			const repo = escapeHtml(
				(node.attributes && node.attributes.repo) || "",
			);
			parent.children.splice(index, 1, {
				type: "html",
				value: `<div class="github-card" data-repo="${repo}"><div class="github-card-loading">正在加载仓库信息…</div></div>`,
			});
		});

		// 3. 文本指令（spoiler）
		visit(tree, "textDirective", (node, index, parent) => {
			if (
				!parent ||
				index === undefined ||
				String(node.name || "") !== "spoiler"
			)
				return;
			const htmlOpen = {
				type: "html",
				value: '<span class="spoiler" tabindex="0" role="button">',
			};
			const htmlClose = { type: "html", value: "</span>" };
			parent.children.splice(
				index,
				1,
				htmlOpen,
				...node.children,
				htmlClose,
			);
		});

		// 4. mermaid 代码块 → 交由客户端渲染
		visit(tree, "code", (node, index, parent) => {
			if (
				!parent ||
				index === undefined ||
				String(node.lang || "").toLowerCase() !== "mermaid"
			)
				return;
			parent.children.splice(index, 1, {
				type: "html",
				value: `<pre class="mermaid" data-pagefind-ignore>${escapeHtml(node.value)}</pre>`,
			});
		});

		// 5. GitHub 风格 alerts（> [!NOTE] 等）
		visit(tree, "blockquote", (node, index, parent) => {
			if (!parent || index === undefined) return;
			const firstPara = node.children.find((c) => c.type === "paragraph");
			if (!firstPara) return;
			const firstText = firstPara.children.find((c) => c.type === "text");
			if (!firstText) return;
			const m = /^\[!(note|tip|important|warning|caution)\]\s*/i.exec(
				firstText.value,
			);
			if (!m) return;
			const type = m[1].toLowerCase();
			const rest = firstText.value.slice(m[0].length);
			if (rest) {
				firstText.value = rest;
			} else {
				firstPara.children.shift();
				if (firstPara.children.length === 0) {
					node.children.splice(node.children.indexOf(firstPara), 1);
				}
			}
			const htmlOpen = {
				type: "html",
				value: `<div class="markdown-alert markdown-alert-${type}"><p class="markdown-alert-title">${ALERT_MAP[type]}</p>`,
			};
			const htmlClose = { type: "html", value: "</div>" };
			parent.children.splice(
				index,
				1,
				htmlOpen,
				...node.children,
				htmlClose,
			);
		});
	};
}
