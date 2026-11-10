/**
 * 文章页正文字号的页面级会话。
 *
 * 从 `src/pages/posts/[...slug].astro` 的内联脚本迁出（F2.3），语义逐条保留：
 *   · localStorage key `postFontSize`、范围 12–24、越界值不应用、默认档不写内联样式；
 *   · `--p` 轨道填充、拖动前清选区、`input` 时写回存储；
 *   · 点按钮或弹层以外收起弹层（`pointerdown`，`event.button !== 0` 忽略）。
 *
 * 与旧实现的差别只有一处：click-away 的 `document` 监听改由本会话持有，
 * `stop()` 时随 `AbortController` 一起解绑——旧实现用 `window.__fontSizeClickAwayBound`
 * 全局旗标压重复注册，那个旗标没有「页面结束」的语义，已删除。
 */
import type { PageSession } from "./page-session";

const FONT_SIZE_KEY = "postFontSize";
const FONT_SIZE_MIN = 12;
const FONT_SIZE_MAX = 24;

/** 把字号写到当前正文容器上；容器不在（非文章页）时静默跳过 */
function applyPostFontSize(px: number): void {
	const content = document.querySelector(
		".post-context",
	) as HTMLElement | null;
	if (content) {
		content.style.fontSize = `${px}px`;
		content.style.lineHeight = "1.9";
	}
}

function createFontSizeSession(): PageSession {
	let teardown: (() => void) | null = null;

	function start(): void {
		if (teardown) return;
		const btn = document.getElementById("font-size-btn");
		const pop = document.getElementById("font-size-pop");
		const range = document.getElementById(
			"font-size-range",
		) as HTMLInputElement | null;
		const output = document.getElementById("font-size-value");
		if (!btn || !pop || !range || !output) return;
		if (btn.dataset.fontSizeInit === "true") return;
		btn.dataset.fontSizeInit = "true";

		const controller = new AbortController();
		const { signal } = controller;

		// 恢复持久化字号：仅在用户调整过（存在存储值）时应用，默认档不写内联样式
		const raw = localStorage.getItem(FONT_SIZE_KEY);
		if (raw !== null) {
			const saved = Number.parseInt(raw, 10);
			if (saved >= FONT_SIZE_MIN && saved <= FONT_SIZE_MAX) {
				applyPostFontSize(saved);
				range.value = String(saved);
				output.textContent = `${saved}px`;
			}
		}

		// Flutter 式轨道填充：--p（0..1）驱动渐变端点对齐拇指圆心
		const updateRangeFill = (): void => {
			const p =
				(Number.parseInt(range.value, 10) - FONT_SIZE_MIN) /
				(FONT_SIZE_MAX - FONT_SIZE_MIN);
			range.style.setProperty("--p", String(p));
		};
		updateRangeFill();

		const setOpen = (open: boolean): void => {
			btn.classList.toggle("active", open);
			pop.classList.toggle("active", open);
		};

		btn.addEventListener(
			"click",
			(event) => {
				// 弹层（滑块）内的点击冒泡到按钮时不折叠
				if ((event.target as HTMLElement).closest(".font-size-pop"))
					return;
				setOpen(!pop.classList.contains("active"));
			},
			{ signal },
		);
		range.addEventListener(
			"pointerdown",
			() => {
				// 拖动开始前清掉页面残留选区：旧选区会随拖动一起被拖着走，
				// 在气泡内外留下 "A"/"xxpx" 的拖影
				getSelection()?.removeAllRanges();
			},
			{ signal },
		);
		range.addEventListener(
			"input",
			() => {
				const px = Number.parseInt(range.value, 10);
				output.textContent = `${px}px`;
				applyPostFontSize(px);
				updateRangeFill();
				localStorage.setItem(FONT_SIZE_KEY, String(px));
			},
			{ signal },
		);

		// 点按钮与弹层之外的区域收起弹层。用 pointerdown 而非 click：从拇指拖出
		// 弹层松手时 click 的 target 会落在弹层外造成误关。
		document.addEventListener(
			"pointerdown",
			(event) => {
				if (event.button !== 0) return;
				if (!btn.isConnected || !pop.classList.contains("active"))
					return;
				const target = event.target as Node;
				if (btn.contains(target) || pop.contains(target)) return;
				btn.classList.remove("active");
				pop.classList.remove("active");
			},
			{ signal },
		);

		teardown = () => {
			controller.abort();
			// 换页被取消时同一个节点还要能重新启动，标记随会话一起收掉
			if (btn.isConnected) delete btn.dataset.fontSizeInit;
		};
	}

	function stop(): void {
		teardown?.();
		teardown = null;
	}

	return { name: "font-size", start, stop };
}

export const fontSizeSession = createFontSizeSession();
