/**
 * 通用提示触发器（T7 #122 从 theme-script.ts 迁入）：凡带 `data-site-toast` 的元素
 * 被点击即弹站内提示。用于「不可执行但需要解释」的灰态控件，如 /projects/ 里无公开
 * 仓库的「查看源码」（文案就写在该元素的 `data-site-toast` 属性上，本模块不自带文案）。
 *
 * 事件委托绑在 document 上一次（`toastTriggerBound` 守卫），Swup 切页后依然生效。
 * 一次点击只出一条：取 `closest` 命中的最近触发器、读它自己的属性，不做冒泡累加。
 */
import { showSiteToast } from "../site-toast";

let toastTriggerBound = false;

/** 从命中的触发器上读文案：缺省/空白即静默（基线行为，不弹空提示） */
export function readToastMessage(trigger: HTMLElement) {
	return trigger.dataset.siteToast?.trim() || "";
}

export function initToastTrigger() {
	if (toastTriggerBound) return;
	toastTriggerBound = true;
	document.addEventListener("click", (event) => {
		const target = event.target;
		if (!(target instanceof Element)) return;
		const trigger = target.closest<HTMLElement>("[data-site-toast]");
		if (!trigger) return;
		const message = readToastMessage(trigger);
		if (message) showSiteToast(message);
	});
}
