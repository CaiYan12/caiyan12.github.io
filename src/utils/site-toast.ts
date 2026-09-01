let showTimer: number | undefined;
let hideTimer: number | undefined;

/** 创建并显示站内顶层提示，避免使用浏览器原生 alert 打断阅读 */
export function showSiteToast(message: string) {
	let toast = document.getElementById("site-toast");
	if (!(toast instanceof HTMLDivElement)) {
		toast = document.createElement("div");
		toast.id = "site-toast";
		toast.className = "site-toast";
		toast.setAttribute("role", "status");
		toast.setAttribute("aria-live", "polite");
		toast.setAttribute("aria-atomic", "true");
		document.body.appendChild(toast);
	}

	if (showTimer !== undefined) {
		window.clearTimeout(showTimer);
	}
	if (hideTimer !== undefined) {
		window.clearTimeout(hideTimer);
	}

	toast.textContent = message;
	toast.hidden = false;
	window.requestAnimationFrame(() => toast.classList.add("is-visible"));
	hideTimer = window.setTimeout(() => {
		toast.classList.remove("is-visible");
		showTimer = window.setTimeout(() => {
			toast.hidden = true;
			toast.textContent = "";
		}, 220);
	}, 1600);
}
