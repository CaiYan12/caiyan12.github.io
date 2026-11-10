/**
 * 侧栏「最新 / 手气不错」tabs 的页面级会话。
 *
 * 从 `src/components/widget/WidgetNewLog.astro` 的内联脚本迁出（F2.3），语义保留：
 *   · 每个 `[data-tab-widget]` 独立初始化，`data-initialized` 语义不变；
 *   · click、Enter、Space 三种触发；`hover` 类与 `aria-selected` 成对切换；
 *   · `data-panel` 面板用 `tab-panel-hidden` 控制显隐。
 *
 * 与旧实现的差别：监听器统一带 `AbortController` 的 signal，`stop()` 一次解绑，
 * 不再依赖「元素被移除所以监听自然消失」——脱离 DOM 的监听不会自己消失，
 * 只是不可达；会话结束后它们必须真的被摘掉。
 */
import type { PageSession } from "./page-session";

function createSidebarTabsSession(): PageSession {
	let teardown: (() => void) | null = null;

	function start(): void {
		if (teardown) return;
		const widgets = [
			...document.querySelectorAll<HTMLElement>("[data-tab-widget]"),
		];
		if (widgets.length === 0) return;

		const controller = new AbortController();
		const { signal } = controller;
		const touched: HTMLElement[] = [];

		for (const widget of widgets) {
			if (widget.dataset.initialized === "true") continue;
			widget.dataset.initialized = "true";
			touched.push(widget);
			const tabs = [
				...widget.querySelectorAll<HTMLElement>("[data-tab]"),
			];
			const panels = [
				...widget.querySelectorAll<HTMLElement>("[data-panel]"),
			];
			const activate = (index: number): void => {
				tabs.forEach((tab, tabIndex) => {
					tab.classList.toggle("hover", tabIndex === index);
					tab.setAttribute(
						"aria-selected",
						String(tabIndex === index),
					);
				});
				panels.forEach((panel, panelIndex) =>
					panel.classList.toggle(
						"tab-panel-hidden",
						panelIndex !== index,
					),
				);
			};
			tabs.forEach((tab) => {
				const open = (): void => activate(Number(tab.dataset.tab));
				tab.addEventListener("click", open, { signal });
				tab.addEventListener(
					"keydown",
					(event) => {
						if (event.key === "Enter" || event.key === " ") open();
					},
					{ signal },
				);
			});
		}

		if (touched.length === 0) return;

		teardown = () => {
			controller.abort();
			for (const widget of touched)
				if (widget.isConnected) delete widget.dataset.initialized;
		};
	}

	function stop(): void {
		teardown?.();
		teardown = null;
	}

	return { name: "sidebar-tabs", start, stop };
}

export const sidebarTabsSession = createSidebarTabsSession();
