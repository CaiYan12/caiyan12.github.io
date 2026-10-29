/**
 * 分页跳转运行时模块（T4 #119 自 theme-script.ts 迁出，装配表引用不变）。
 *
 * 表单由 `Pagination.astro` 服务端渲染在 swup 容器内，每次切页都会换新——所以这里
 * 用 document 级 submit 委托 + 模块级 `paginationJumpBound` 旗标：监听只绑一次，
 * 新渲染的翻页器天然生效，切页不会叠加监听。
 *
 * 校验口径是迁移前源码的实际行为，不是理想行为（改动前先读 `resolveJumpTarget`）：
 * 值先 trim，再要求 `/^\d+$/`（因此 "007" 合法、按 7 处理，"3.5" / "-1" 不合法）、
 * page 与 input 的 min/max 三者都必须是整数且 min ≤ page ≤ max；min/max 本身不是
 * 整数（含缺失被 Number("") 读成 0）时整条判无效。无效时写 aria-invalid 与文案
 * 并把焦点送回输入框，不导航；有效时第 1 页走 firstPageUrl、其余把 {n} 替换成页码。
 */
let paginationJumpBound = false;

export type JumpResolution =
	{ ok: true; url: string } | { ok: false; message: string };

export interface JumpInput {
	/** 输入框原始值（未 trim） */
	value: string;
	/** 输入框 min / max 属性原文；缺失时是空串 */
	min: string;
	max: string;
	/** 表单 data-url-template，缺省为空串 */
	urlTemplate: string;
	/** 表单 data-first-page-url，缺省为 "/" */
	firstPageUrl: string;
}

/**
 * 分页跳转的纯函数核：只做「值 + 边界 → 目标地址 / 错误文案」，不碰 DOM。
 * 供 init 调用，也供单测把迁移前的校验口径逐条钉住。
 */
export function resolveJumpTarget(input: JumpInput): JumpResolution {
	const value = input.value.trim();
	const min = Number(input.min);
	const max = Number(input.max);
	const page = Number(value);
	const valid =
		/^\d+$/.test(value) &&
		Number.isInteger(page) &&
		Number.isInteger(min) &&
		Number.isInteger(max) &&
		page >= min &&
		page <= max;

	if (!valid) {
		return {
			ok: false,
			message: `请输入 ${min} 到 ${max} 之间的整数页码。`,
		};
	}
	if (page === 1) return { ok: true, url: input.firstPageUrl };
	return { ok: true, url: input.urlTemplate.replace("{n}", String(page)) };
}

declare global {
	interface Window {
		swup?: {
			navigate: (url: string) => void;
		};
	}
}

/** 分页跳转 init（事件委托，Swup 切页后依然生效） */
export function initPaginationJump() {
	if (paginationJumpBound) return;
	paginationJumpBound = true;

	document.addEventListener("submit", (event) => {
		const target = event.target;
		if (!(target instanceof HTMLFormElement)) return;
		const form = target.closest<HTMLFormElement>("[data-pagination-jump]");
		if (!form) return;

		event.preventDefault();
		const input = form.querySelector<HTMLInputElement>(
			"[data-pagination-input]",
		);
		if (!input) return;

		const result = resolveJumpTarget({
			value: input.value,
			min: input.min,
			max: input.max,
			urlTemplate: form.dataset.urlTemplate ?? "",
			firstPageUrl: form.dataset.firstPageUrl ?? "/",
		});
		const error = form.querySelector<HTMLElement>(
			"[data-pagination-error]",
		);

		if (!result.ok) {
			input.setAttribute("aria-invalid", "true");
			if (error) {
				error.textContent = result.message;
				error.hidden = false;
			}
			input.focus();
			return;
		}

		input.setAttribute("aria-invalid", "false");
		if (error) {
			error.textContent = "";
			error.hidden = true;
		}

		if (window.swup?.navigate) {
			window.swup.navigate(result.url);
		} else {
			window.location.href = result.url;
		}
	});
}
