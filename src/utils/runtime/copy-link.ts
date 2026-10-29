/**
 * 本文链接复制（#118/T3 自 theme-script.ts 迁出的独立宿主）。
 *
 * 生命周期：装配表 `{ init: initCopyLink }`——只在首屏跑一次，不进 swap 序；
 * `copyLinkBound` 旗标防重入。无清理：document 级事件委托常驻，Swup 换页后
 * 新渲染的 `[data-copy-link]` 天然生效。
 *
 * `copyText` 只服务本块，不外销：剪贴板写入优先 Clipboard API，受限环境回退到
 * 隐藏 textarea + execCommand。
 */
import { showSiteToast } from "../site-toast";

let copyLinkBound = false;

/** 写入剪贴板；受限环境下回退到隐藏 textarea */
async function copyText(text: string) {
	try {
		if (navigator.clipboard?.writeText) {
			await navigator.clipboard.writeText(text);
			return;
		}
	} catch {
		// 权限受限时继续尝试兼容性回退方案
	}

	const textarea = document.createElement("textarea");
	textarea.value = text;
	textarea.setAttribute("readonly", "");
	textarea.style.position = "fixed";
	textarea.style.opacity = "0";
	textarea.style.pointerEvents = "none";
	document.body.appendChild(textarea);
	textarea.select();
	const copied = document.execCommand("copy");
	textarea.remove();
	if (!copied) throw new Error("copy failed");
}

export function initCopyLink() {
	if (copyLinkBound) return;
	copyLinkBound = true;
	document.addEventListener("click", async (event) => {
		const target = event.target;
		if (!(target instanceof Element)) return;
		const link = target.closest<HTMLAnchorElement>("[data-copy-link]");
		if (!link) return;

		event.preventDefault();
		const text = link.dataset.copyLink || link.href;
		try {
			await copyText(text);
			showSiteToast(link.dataset.copyMessage || "已复制");
		} catch {
			showSiteToast("复制失败，请手动复制");
		}
	});
}
