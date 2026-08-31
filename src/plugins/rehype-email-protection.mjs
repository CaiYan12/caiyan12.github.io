/**
 * rehype-email-protection：邮箱保护（移植自 Firefly 的 src/plugins/rehype-email-protection.mjs，MIT）
 * 原始来源：霞葉 https://kasuha.com/posts/fuwari-enhance-ep1/
 *
 * 加密 mailto 链接以保护邮箱地址免受爬虫抓取：
 * 把 href 换成 data-encoded-email 属性（base64 或 rot13），点击时客户端解码并补回 mailto:。
 * 说明：Firefly 版会在存在邮箱链接时向 <head> 注入样式；Astro 渲染的 Markdown
 * 片段没有 head 节点，该注入自然跳过，不影响功能。
 *
 * @param {Object} options - 插件选项
 * @param {string} [options.method='base64'] - 编码方式: 'base64' or 'rot13'
 * @returns {Function} A transformer function for the rehype plugin
 */
import { h } from "hastscript";
import { visit } from "unist-util-visit";

export default function rehypeEmailProtection(options = {}) {
	const { method = "base64" } = options;

	// Base64 编码函数
	const base64Encode = (str) => {
		return btoa(str);
	};

	// ROT13 编码函数
	const rot13Encode = (str) => {
		return str.replace(/[a-zA-Z]/g, (char) => {
			const start = char <= "Z" ? 65 : 97;
			return String.fromCharCode(
				((char.charCodeAt(0) - start + 13) % 26) + start,
			);
		});
	};

	// 根据选择的方法进行编码
	const encode = (str) => {
		return method === "rot13" ? rot13Encode(str) : base64Encode(str);
	};

	// 生成解码 JavaScript 代码
	const generateDecodeScript = () => {
		if (method === "rot13") {
			return `
        function decodeRot13(str) {
          return str.replace(/[a-zA-Z]/g, function(char) {
            const start = char <= 'Z' ? 65 : 97;
            return String.fromCharCode(((char.charCodeAt(0) - start + 13) % 26) + start);
          });
        }
        const decodedEmail = decodeRot13(encodedEmail);
      `;
		}
		return `
      const decodedEmail = atob(encodedEmail);
    `;
	};

	return (tree) => {
		visit(tree, "element", (node, index, parent) => {
			// 只处理 a 元素
			if (node.tagName !== "a") {
				return;
			}

			// 检查是否是 mailto 链接
			const href = node.properties?.href;
			if (!href?.startsWith("mailto:")) {
				return;
			}

			// 提取邮箱地址
			const email = href.replace("mailto:", "");
			const encodedEmail = encode(email);

			// 创建加密的链接元素（移除原始的 href 属性，避免重复定义）
			const otherProperties = { ...node.properties };
			delete otherProperties.href;
			const protectedLink = h(
				"a",
				{
					...otherProperties,
					href: "#",
					"data-encoded-email": encodedEmail,
					onclick: `
          (function() {
            const encodedEmail = this.getAttribute('data-encoded-email');
            ${generateDecodeScript()}
            this.href = 'mailto:' + decodedEmail;
            this.removeAttribute('data-encoded-email');
            this.removeAttribute('onclick');
            this.click();
            return false;
          }).call(this);
        `
						.replace(/\s+/g, " ")
						.trim(),
				},
				node.children,
			);

			// 替换当前的 a 节点
			if (parent && typeof index === "number") {
				parent.children[index] = protectedLink;
			}
		});
	};
}
