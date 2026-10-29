/**
 * 动态标题（T7 #122 从 theme-script.ts 迁入）：切走时换告别语；切回先显示
 * "算了，你走吧！"，2 秒后恢复原标题。
 *
 * **无守卫、single-shot**：装配表只在初始装载时调用一次，`visibilitychange` 委托
 * 绑一次、Swup 切页不重跑（表行没有 swap 号）。这是基线语义，不要补 dataset 守卫。
 * `timer` 与 `originalTitle` 是 init 闭包内的状态，与迁移前一致。
 */
export const HIDDEN_TITLE = "别走啊...(っ°Д°;)っ";
export const GOODBYE_TITLE = "算了，你走吧！";
/** 切回后告别语的驻留时长（ms） */
export const GOODBYE_RESTORE_MS = 2000;

/**
 * 捕获判定纯函数核：快速 hide→show→hide 时当前标题可能还是告别语，此时不能捕获，
 * 否则真实标题被替代语永久覆盖；只在标题为真实内容时更新 originalTitle。
 */
export function shouldCaptureOriginalTitle(title: string) {
	return title !== HIDDEN_TITLE && title !== GOODBYE_TITLE;
}

export function initVisibilityTitle() {
	let timer: ReturnType<typeof setTimeout> | undefined;
	let originalTitle = "";
	document.addEventListener("visibilitychange", () => {
		if (document.visibilityState === "hidden") {
			clearTimeout(timer);
			if (shouldCaptureOriginalTitle(document.title)) {
				originalTitle = document.title;
			}
			document.title = HIDDEN_TITLE;
		} else {
			document.title = GOODBYE_TITLE;
			timer = setTimeout(() => {
				document.title = originalTitle;
			}, GOODBYE_RESTORE_MS);
		}
	});
}
