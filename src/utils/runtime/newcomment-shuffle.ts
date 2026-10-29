/**
 * 侧栏「换一批」（最新评论 / 吐槽水军两处共用）运行时模块。
 *
 * 纯本地取数：条目在构建期已渲染进 DOM，这里只切换 `hidden` 与 `data-comment-last`，
 * 不发任何客户端请求，也不依赖评论数据源。按钮由服务端按「条目数 > 展示阈值」决定
 * 是否渲染（WidgetNewComm.astro / WidgetBlogger.astro），故 init 只做事件委托、
 * 不自己造按钮。
 *
 * 两处 setTimeout 的分工（迁移时逐字保留）：第一发 0ms 让浏览器先绘出加载态；
 * 第二发补足最小展示时长 220ms —— 本地切换在几毫秒内完成，不补的话
 * 「点了一下什么都没发生」比转圈更让人怀疑按钮坏了。
 */
import { shuffleArray } from "../shuffle";

let newCommentShuffleBound = false;
const NEW_COMMENT_DISPLAY_LIMIT = 5;
const NEW_COMMENT_LOADING_MIN_MS = 220;

export function setNewCommentShuffleLoading(
	button: HTMLButtonElement,
	loading: boolean,
) {
	const icon = button.querySelector<HTMLElement>("[data-newcomment-icon]");
	const label = button.querySelector<HTMLElement>("[data-newcomment-label]");
	const subject = button.dataset.shuffleSubject ?? "最新评论";

	button.disabled = loading;
	button.classList.toggle("is-loading", loading);
	button.setAttribute("aria-busy", loading ? "true" : "false");
	button.setAttribute(
		"aria-label",
		loading ? `正在加载${subject}` : `换一批${subject}`,
	);
	button.setAttribute(
		"title",
		loading ? `正在加载${subject}` : `换一批${subject}`,
	);

	if (icon) {
		icon.classList.toggle("fa-random", !loading);
		icon.classList.toggle("fa-circle-o-notch", loading);
		icon.classList.toggle("fa-spin", loading);
	}
	if (label) label.textContent = loading ? "加载中…" : "换一批";
}

/** 侧栏评论换一批（事件委托，Swup 切页后依然生效） */
export function initNewCommentShuffle() {
	if (newCommentShuffleBound) return;
	newCommentShuffleBound = true;

	document.addEventListener("click", (event) => {
		const target = event.target;
		if (!(target instanceof Element)) return;
		const button = target.closest<HTMLButtonElement>(
			"[data-newcomment-refresh]",
		);
		if (!button) return;
		if (button.disabled || button.dataset.newcommentLoading === "true") {
			return;
		}

		const listId = button.getAttribute("aria-controls");
		const list = listId ? document.getElementById(listId) : null;
		if (!(list instanceof HTMLUListElement)) return;

		const items = [
			...list.querySelectorAll<HTMLElement>("[data-newcomment-item]"),
		];
		const requestedLimit = Number(button.dataset.newcommentLimit);
		const displayLimit =
			Number.isInteger(requestedLimit) && requestedLimit > 0
				? requestedLimit
				: NEW_COMMENT_DISPLAY_LIMIT;
		const limit = Math.min(displayLimit, items.length);
		if (items.length <= limit) return;

		const loadingStartedAt = performance.now();
		button.dataset.newcommentLoading = "true";
		setNewCommentShuffleLoading(button, true);

		// 让浏览器先绘制加载状态；即使本地切换很快，动画也有最小展示时间。
		window.setTimeout(() => {
			if (button.dataset.newcommentLoading !== "true") return;

			try {
				const currentItems = new Set(
					items.filter((item) => !item.hidden),
				);
				let selectedItems: HTMLElement[] = [];
				const isSameSelection = (candidate: HTMLElement[]) =>
					candidate.length === currentItems.size &&
					candidate.every((item) => currentItems.has(item));

				for (let attempt = 0; attempt < 8; attempt += 1) {
					selectedItems = shuffleArray([...items]).slice(0, limit);
					if (!isSameSelection(selectedItems)) break;
				}

				if (isSameSelection(selectedItems)) {
					const replacement = items.find(
						(item) => !currentItems.has(item),
					);
					if (replacement) {
						selectedItems = [
							...items
								.filter((item) => currentItems.has(item))
								.slice(1),
							replacement,
						];
					}
				}

				const selected = new Set(selectedItems);
				const visibleItems = items.filter((item) => selected.has(item));
				const lastVisible = visibleItems[visibleItems.length - 1];
				items.forEach((item) => {
					const isVisible = selected.has(item);
					item.hidden = !isVisible;
					if (item === lastVisible) {
						item.setAttribute("data-comment-last", "true");
					} else {
						item.removeAttribute("data-comment-last");
					}
				});
			} finally {
				const remainingLoadingMs = Math.max(
					0,
					NEW_COMMENT_LOADING_MIN_MS -
						(performance.now() - loadingStartedAt),
				);
				window.setTimeout(() => {
					if (button.dataset.newcommentLoading !== "true") return;
					delete button.dataset.newcommentLoading;
					setNewCommentShuffleLoading(button, false);
				}, remainingLoadingMs);
			}
		}, 0);
	});
}
