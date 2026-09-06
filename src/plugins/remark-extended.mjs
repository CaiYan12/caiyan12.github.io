/**
 * remark-extended：为 Markdown 提供博客扩展语法（由 Mizuki 模板测试帖引入）。
 * - `:::note/tip/important/warning/caution` 容器指令 → admonition 提示块
 * - `> [!NOTE]` 等 GitHub 风格 alerts → markdown-alert 提示块
 * - `:spoiler[内容]` 文本指令 → 可点击显示/隐藏的 spoiler
 * - `::github{repo="user/repo"}` 叶子指令 → GitHub 仓库卡片（构建期渲染，
 *   元数据来自 scripts/fetch-github-repos.mjs 缓存的 src/constants/github-repos.json）
 * - ```mermaid 代码块 → 交由客户端 mermaid.js 渲染为图表
 *
 * 说明：本插件在 remark 阶段把上述语法直接转换成 `html` 节点，
 * 依赖 Astro 默认的 allowDangerousHtml 透传原生 HTML。
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { visit } from "unist-util-visit";
import { toString } from "mdast-util-to-string";

const REPO_DATA_FILE = path.join(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
	"constants",
	"github-repos.json",
);

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

// 注意：与 src/utils/contributions-calendar.ts 各有一份同实现 escapeHtml——
// 本文件是 node 直跑的 .mjs，对方是 TS（tsconfig allowJs=false 无法反向引用），
// 改动任一份必须同步另一份。
function escapeHtml(str) {
	return String(str)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

/** 读取构建期仓库元数据缓存（每次转换时惰性读取，dev 下运行拉取脚本后无需重启） */
function loadRepoData() {
	try {
		return JSON.parse(readFileSync(REPO_DATA_FILE, "utf-8"));
	} catch {
		return {};
	}
}

function renderGithubAvatar(repoRaw) {
	const owner = repoRaw.split("/")[0]?.trim();
	if (!owner) return "";
	const src = `https://github.com/${encodeURIComponent(owner)}.png?size=128`;
	return `<img class="github-card-avatar" src="${escapeHtml(src)}" width="48" height="48" alt="" aria-hidden="true" loading="lazy" decoding="async">`;
}

/** 渲染 GitHub 仓库卡片 HTML；缓存缺失时渲染回退链接 */
function renderGithubCard(repoRaw, repoData) {
	const repo = escapeHtml(repoRaw);
	// owner 与仓库名分段编码，避免整体编码把 "/" 变成 %2F
	const repoPath = repoRaw.split("/").map(encodeURIComponent).join("/");
	const avatar = renderGithubAvatar(repoRaw);
	const data = repoData[repoRaw];
	if (!data) {
		return `<div class="github-card"><a class="github-card-link github-card-error" href="https://github.com/${repoPath}" target="_blank" rel="noopener noreferrer">${avatar}<span class="github-card-body">GitHub 仓库信息加载失败，点击前往 ${repo}</span></a></div>`;
	}
	return `<div class="github-card"><a class="github-card-link" href="${escapeHtml(data.html_url || `https://github.com/${repoPath}`)}" target="_blank" rel="noopener noreferrer">${avatar}<span class="github-card-body"><span class="github-card-name">${escapeHtml(data.full_name || repoRaw)}</span><span class="github-card-desc">${escapeHtml(data.description || "")}</span><span class="github-card-meta"><span>★ ${Number(data.stargazers_count) || 0}</span><span>⑂ ${Number(data.forks_count) || 0}</span><span class="github-card-lang">${escapeHtml(data.language || "")}</span></span></span></a></div>`;
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
		const repoData = loadRepoData();

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

		// 1.5 容器指令（letter-paper：/about/ 手写信纸稿纸面板，样式见 markdown-extended.css）。
		// 注意：micromark 容器指令的一个 ::: 会关闭整层嵌套栈，故内部横线区
		// （.letter-paper-body）改由 Markdown 中裸 <div> 包裹，勿改回嵌套容器。
		// 稿纸尾行签名由本分支固定输出（写在闭合标签前），不放进 Markdown。
		visit(tree, "containerDirective", (node, index, parent) => {
			if (!parent || index === undefined) return;
			if (String(node.name || "").toLowerCase() !== "letter-paper")
				return;
			parent.children.splice(
				index,
				1,
				{ type: "html", value: '<div class="letter-paper">' },
				...node.children,
				{
					type: "html",
					value: '<div class="paper-footer"><span>— written by WindowsIt</span><span>⌁ ✦ ⌁</span></div></div>',
				},
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
			const repoRaw = String(
				(node.attributes && node.attributes.repo) || "",
			).trim();
			parent.children.splice(index, 1, {
				type: "html",
				value: renderGithubCard(repoRaw, repoData),
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

		// 6. 原生 HTML 表格也放进滚动容器（Markdown 表格由 rehype 插件处理）
		visit(tree, "html", (node) => {
			const value = String(node.value || "");
			if (
				!/<table\b/i.test(value) ||
				!/<\/table\s*>/i.test(value) ||
				/\btable-scroll\b/i.test(value)
			)
				return;
			node.value = `<div class="table-scroll">\n${value}\n</div>`;
		});
	};
}
