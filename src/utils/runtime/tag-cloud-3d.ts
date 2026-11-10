/**
 * 3D 标签/分类云（`.tag3d-stage`，`/tag/` 与 `/category/` 共用）的页面级会话。
 *
 * 从 `src/components/layout/TagCloud3D.astro` 的内联脚本迁出（F2.4），保留：
 *   · 运行时注入 `public/vendor/svg3dtagcloud/SVG3DTagCloud.global.js`（带
 *     `data-swup-ignore-script`，避免 swup 克隆重执行）；
 *   · 唯一实例放 `window.__tagCloud3D`（跨模块副本也不会漏销毁）；
 *   · `prefers-reduced-motion` 不建实例，药丸云由页面其余部分承担；
 *   · `/tag/` ↔ `/category/` 互切时先销毁上一页实例。
 *
 * 与旧实现的差别：销毁时机从「下一次 init」改成「离开页面时」——旧代码只在
 * 「新页没有 stage」或「新容器首次 init」时销毁，若离开后不再进入任何云集页，
 * 旧实例的 rAF 循环会一直活着。另外库加载是异步的，本会话在 stop 时置 disposed，
 * 续体再检查 `disposed || !container.isConnected`，两道都挡住「加载完成后凭空建实例」。
 */
import type { PageSession } from "./page-session";

interface Tag3DChild {
	label: string;
	url: string;
	tooltip?: string;
}

interface Tag3DInstance {
	build(): void;
	destroy(): void;
}

type Tag3DCtor = new (
	el: HTMLElement,
	settings: Record<string, unknown>,
) => Tag3DInstance;

declare global {
	interface Window {
		__tagCloud3D?: Tag3DInstance;
		SVG3DTagCloud?: Tag3DCtor;
	}
}

let libPromise: Promise<Tag3DCtor> | null = null;

/** 运行时 <script> 注入加载：Vite 禁止以 ESM import 引用 public/ 内的 JS（dev 下 500） */
function loadTag3DLib(): Promise<Tag3DCtor> {
	libPromise ??= new Promise<Tag3DCtor>((resolve, reject) => {
		const el = document.createElement("script");
		el.src = "/vendor/svg3dtagcloud/SVG3DTagCloud.global.js";
		el.setAttribute("data-swup-ignore-script", "");
		el.onload = () => {
			const ctor = window.SVG3DTagCloud;
			if (ctor) resolve(ctor);
			else reject(new Error("SVG3DTagCloud 未注册到 window"));
		};
		el.onerror = () => {
			libPromise = null;
			reject(new Error("加载 SVG3DTagCloud.global.js 失败"));
		};
		document.head.appendChild(el);
	});
	return libPromise;
}

function createTagCloud3DSession(): PageSession {
	let teardown: (() => void) | null = null;

	function start(): void {
		if (teardown) return;
		const container = document.querySelector<HTMLElement>(".tag3d-stage");
		// 非云集页：本会话无事可做（上一页的实例已在 stop 时销毁）
		if (!container) return;
		if (container.dataset.tag3dInit) return;
		container.dataset.tag3dInit = "1";

		let disposed = false;
		teardown = () => {
			disposed = true;
			window.__tagCloud3D?.destroy();
			window.__tagCloud3D = undefined;
			if (container.isConnected) delete container.dataset.tag3dInit;
		};

		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
			return;
		const raw = container.dataset.tags;
		if (!raw) return;
		let children: Tag3DChild[] = [];
		try {
			children = JSON.parse(raw) as Tag3DChild[];
		} catch {
			return;
		}
		if (children.length === 0) return;

		void loadTag3DLib()
			.then((Ctor) => {
				// 库加载期间页面可能已被 swup 换走：此时容器已成游离节点，不得再建实例
				if (disposed || !container.isConnected) return;
				const instance = new Ctor(container, {
					children,
					width: "100%",
					height: "58",
					radius: "78%",
					radiusMin: 75,
					isDrawSvgBg: false,
					opacityOver: 1,
					opacityOut: 0.25,
					fov: 800,
					speed: 0.4,
					fontFamily:
						'"Noto Sans SC Variable", "Source Han Sans SC", "PingFang SC", "WenQuanYi Micro Hei", sans-serif',
					fontSize: "16",
					fontToUpperCase: false,
					tooltipFontSize: "12",
					tooltipFontColor: "#666",
					tooltipTextAnchor: "middle",
					tooltipDiffX: 0,
					tooltipDiffY: 12,
				});
				instance.build();
				window.__tagCloud3D = instance;
			})
			.catch((error) => {
				console.warn("3D 标签/分类云加载失败，仅保留药丸云", error);
				if (container.isConnected) delete container.dataset.tag3dInit;
			});
	}

	function stop(): void {
		teardown?.();
		teardown = null;
	}

	return { name: "tag-cloud-3d", start, stop };
}

export const tagCloud3DSession = createTagCloud3DSession();
