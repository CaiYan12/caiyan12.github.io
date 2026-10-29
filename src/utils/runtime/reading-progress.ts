/**
 * 文章阅读进度条（#118/T3 自 theme-script.ts 迁出的独立宿主）。
 *
 * 生命周期：装配表 `{ init: initReadingProgress, swap: 2 }`——首屏跑，切页后重跑；
 * 监听器由 `readingProgressBound` 旗标守住，**全站只绑一组 scroll/resize**，换页只
 * 重新排一次帧；换页钩子 `pageLoad` 的第 2 项也是本模块的 `scheduleReadingProgressUpdate`
 * （滚动复位之后重算）。无清理：监听器常驻，rAF 句柄单次消费。
 *
 * 三个函数必须同文件：一个驱动（scroll/resize → rAF 节流 → `updateReadingProgress`）
 * 写**全部**渲染目标，进度值只算一次。拆开就会出现两套进度口径。
 * 全站可同时存在多根进度条（文章页顶部的固定条 + 侧栏目录标题栏下缘的条，
 * 2026-10-15 站长要求「与主站顶部阅读进度条同理、共存」），同一文档滚动进度驱动全部实例。
 */

let readingProgressFrame = 0;
let readingProgressBound = false;

function updateReadingProgress() {
	readingProgressFrame = 0;
	const progressBars = document.querySelectorAll<HTMLElement>(
		"[data-reading-progress]",
	);
	if (progressBars.length === 0) return;

	const root = document.documentElement;
	const maxScroll = root.scrollHeight - root.clientHeight;
	const progress =
		maxScroll > 0
			? Math.min(1, Math.max(0, window.scrollY / maxScroll))
			: 0;
	// 同一 progress 值写所有实例：两个目标同源同值是本块的核心不变量
	for (const progressBar of progressBars) {
		progressBar.style.transform = `scaleX(${progress})`;
		progressBar.setAttribute(
			"aria-valuenow",
			String(Math.round(progress * 100)),
		);
	}
}

/** 同一帧内多次 scroll 只排一次；rAF 已在途时直接返回 */
export function scheduleReadingProgressUpdate() {
	if (readingProgressFrame) return;
	readingProgressFrame = requestAnimationFrame(updateReadingProgress);
}

/** 文章阅读进度条：全站只绑定一组监听，Swup 换页后复用新节点 */
export function initReadingProgress() {
	if (!readingProgressBound) {
		readingProgressBound = true;
		window.addEventListener("scroll", scheduleReadingProgressUpdate, {
			passive: true,
		});
		window.addEventListener("resize", scheduleReadingProgressUpdate, {
			passive: true,
		});
	}
	scheduleReadingProgressUpdate();
}
