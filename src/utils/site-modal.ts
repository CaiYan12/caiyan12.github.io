const closeAnimationDuration = 220;

interface SiteModalElements {
	dialog: HTMLDialogElement;
	title: HTMLHeadingElement;
	message: HTMLParagraphElement;
	confirm: HTMLButtonElement;
}

let modalElements: SiteModalElements | undefined;
let closeTimer: number | undefined;
let activeTrigger: HTMLElement | null = null;
let triggerBound = false;

function createModal(): SiteModalElements {
	const dialog = document.createElement("dialog");
	dialog.id = "site-modal";
	dialog.className = "site-modal";
	dialog.setAttribute("aria-labelledby", "site-modal-title");
	dialog.setAttribute("aria-describedby", "site-modal-message");
	dialog.innerHTML = `
		<div class="site-modal__panel">
			<header class="site-modal__header">
				<h2 id="site-modal-title" class="site-modal__title"></h2>
				<button type="button" class="site-modal__close" data-site-modal-close aria-label="关闭弹窗">×</button>
			</header>
			<div class="site-modal__body">
				<p id="site-modal-message" class="site-modal__message"></p>
			</div>
			<footer class="site-modal__footer">
				<button type="button" class="site-modal__confirm" data-site-modal-confirm>确认</button>
			</footer>
		</div>
	`;
	document.body.appendChild(dialog);

	return {
		dialog,
		title: dialog.querySelector<HTMLHeadingElement>("#site-modal-title")!,
		message: dialog.querySelector<HTMLParagraphElement>(
			"#site-modal-message",
		)!,
		confirm: dialog.querySelector<HTMLButtonElement>(
			"[data-site-modal-confirm]",
		)!,
	};
}

function getModalElements() {
	if (modalElements) return modalElements;

	const existing = document.getElementById("site-modal");
	modalElements =
		existing instanceof HTMLDialogElement
			? {
					dialog: existing,
					title: existing.querySelector<HTMLHeadingElement>(
						"#site-modal-title",
					)!,
					message: existing.querySelector<HTMLParagraphElement>(
						"#site-modal-message",
					)!,
					confirm: existing.querySelector<HTMLButtonElement>(
						"[data-site-modal-confirm]",
					)!,
				}
			: createModal();

	const { dialog } = modalElements;
	if (dialog.dataset.bound !== "true") {
		dialog.dataset.bound = "true";
		dialog.addEventListener("click", (event) => {
			const target = event.target;
			if (!(target instanceof Element)) return;
			if (
				target === dialog ||
				target.closest("[data-site-modal-close]") ||
				target.closest("[data-site-modal-confirm]")
			) {
				closeSiteModal();
			}
		});
		dialog.addEventListener("cancel", (event) => {
			event.preventDefault();
			closeSiteModal();
		});
		dialog.addEventListener("close", () => {
			window.clearTimeout(closeTimer);
			closeTimer = undefined;
			dialog.classList.remove("is-visible");
			document.body.classList.remove("site-modal-open");
			activeTrigger?.focus();
			activeTrigger = null;
		});
	}

	return modalElements;
}

function prefersReducedMotion() {
	return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function showSiteModal({
	title,
	message,
	confirmLabel = "确认",
}: {
	title: string;
	message: string;
	confirmLabel?: string;
}) {
	const elements = getModalElements();
	window.clearTimeout(closeTimer);
	closeTimer = undefined;

	elements.title.textContent = title;
	elements.message.textContent = message;
	elements.confirm.textContent = confirmLabel;
	document.body.classList.add("site-modal-open");

	if (!elements.dialog.open) {
		elements.dialog.showModal();
		elements.dialog.classList.remove("is-visible");
		window.requestAnimationFrame(() => {
			if (elements.dialog.open)
				elements.dialog.classList.add("is-visible");
		});
	} else {
		elements.dialog.classList.add("is-visible");
	}

	window.setTimeout(() => {
		if (elements.dialog.open) elements.confirm.focus();
	}, 0);
}

export function closeSiteModal() {
	const elements = getModalElements();
	if (!elements.dialog.open) return;

	if (prefersReducedMotion()) {
		elements.dialog.close();
		return;
	}

	elements.dialog.classList.remove("is-visible");
	closeTimer = window.setTimeout(() => {
		if (elements.dialog.open) elements.dialog.close();
	}, closeAnimationDuration);
}

/** 绑定使用 data-site-modal 的站内弹窗入口 */
export function initSiteModal() {
	getModalElements();
	if (triggerBound) return;
	triggerBound = true;
	document.addEventListener("click", (event) => {
		const target = event.target;
		if (!(target instanceof Element)) return;
		const trigger = target.closest<HTMLElement>("[data-site-modal]");
		if (!trigger) return;

		event.preventDefault();
		activeTrigger = trigger;
		showSiteModal({
			title: trigger.dataset.siteModalTitle || "提示",
			message: trigger.dataset.siteModalMessage || "",
			confirmLabel: trigger.dataset.siteModalConfirm || "确认",
		});
	});
}
