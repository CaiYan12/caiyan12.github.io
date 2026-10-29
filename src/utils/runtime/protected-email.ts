/**
 * 邮箱保护链接（rehype-email-protection 配套，T7 #122 从 theme-script.ts 迁入）：
 * 点击时按 `data-email-method` 解码 `data-encoded-email` 并唤起邮件客户端。
 * 事件委托，Swup 切页后依然生效；取代原内联 onclick（与 CSP script-src 兼容）。
 *
 * 现存唯一实例：`src/content/posts/20260831120000/index.md`（「Mock 测试：Markdown
 * 内容增强」，private mock 文章，仅直链可达）里的 `mailto:mock-test@example.com`。
 * 编码侧是 `src/plugins/rehype-email-protection.mjs`，两边的 rot13 表必须同构。
 */
let protectedEmailBound = false;

export type DecodedEmail = { ok: true; email: string } | { ok: false };

/**
 * 解码纯函数核：`method === "rot13"` 走自逆字母表旋转，其余（含缺省）一律 atob。
 * 基线语义：base64 载荷非法时**放弃**（返回失败、不抛、不产出 mailto），
 * 调用方据此只打一条 console.warn 后返回。
 */
export function decodeProtectedEmail(
	encoded: string,
	method = "base64",
): DecodedEmail {
	if (method === "rot13") {
		return {
			ok: true,
			email: encoded.replace(/[a-zA-Z]/g, (ch) => {
				const start = ch <= "Z" ? 65 : 97;
				return String.fromCharCode(
					((ch.charCodeAt(0) - start + 13) % 26) + start,
				);
			}),
		};
	}
	try {
		return { ok: true, email: atob(encoded) };
	} catch {
		return { ok: false };
	}
}

export function initProtectedEmail() {
	if (protectedEmailBound) return;
	protectedEmailBound = true;
	document.addEventListener("click", (e) => {
		const target = e.target as HTMLElement | null;
		const link = target?.closest?.("a[data-encoded-email]");
		if (!link) return;
		e.preventDefault();
		const encoded = link.getAttribute("data-encoded-email") || "";
		const method = link.getAttribute("data-email-method") || "base64";
		const decoded = decodeProtectedEmail(encoded, method);
		if (!decoded.ok) {
			console.warn("[email] invalid encoded payload");
			return;
		}
		window.location.href = `mailto:${decoded.email}`;
	});
}
