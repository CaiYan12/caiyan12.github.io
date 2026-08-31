<script>
	import { onMount } from "svelte";
	import { pioConfig } from "../../config";

	const pioOptions = {
		mode: pioConfig.mode,
		hidden: pioConfig.hiddenOnMobile,
		content: pioConfig.dialog,
		model: pioConfig.models,
	};

	let pioContainer;
	let pioCanvas;
	let pioInitialized = false;

	function initPio() {
		if (typeof window.Paul_Pio === "undefined") {
			setTimeout(initPio, 100);
			return;
		}

		if (!pioContainer || !pioCanvas || pioInitialized) return;

		new window.Paul_Pio(pioOptions);
		pioInitialized = true;
	}

	function loadScript(src, id) {
		return new Promise((resolve, reject) => {
			const existing = document.getElementById(id);
			if (existing) {
				if (existing.dataset.loaded === "true") resolve();
				else existing.addEventListener("load", resolve, { once: true });
				return;
			}

			const script = document.createElement("script");
			script.id = id;
			script.src = src;
			script.addEventListener("load", () => {
				script.dataset.loaded = "true";
				resolve();
			}, { once: true });
			script.addEventListener("error", reject, { once: true });
			document.head.appendChild(script);
		});
	}

	function startPio() {
		loadScript("/pio/static/l2d.js", "pio-l2d-script")
			.then(() => loadScript("/pio/static/pio.js", "pio-main-script"))
			.then(initPio)
			.catch((error) => {
				console.error("Pio 资源加载失败：", error);
			});
	}

	onMount(() => {
		if (!pioConfig.hiddenOnMobile) {
			startPio();
			return;
		}

		const desktopQuery = window.matchMedia("(max-width: 1280px)");

		// 窄屏起载后拉宽到桌面宽度时补一次初始化（pioInitialized 防重复）
		const handleViewportChange = (event) => {
			if (!event.matches && !pioInitialized) {
				startPio();
			}
		};

		if (!desktopQuery.matches) {
			startPio();
		}
		desktopQuery.addEventListener("change", handleViewportChange);

		return () => desktopQuery.removeEventListener("change", handleViewportChange);
	});
</script>

<div
	class={`pio-container ${pioConfig.position}`}
	class:pio-hidden-on-mobile={pioConfig.hiddenOnMobile}
	bind:this={pioContainer}
>
	<div class="pio-action"></div>
	<canvas
		id="pio"
		bind:this={pioCanvas}
		width={pioConfig.width}
		height={pioConfig.height}
	></canvas>
</div>

<style>
	/* pio.js 关闭态依赖容器 .hidden 类：只藏画布/按钮/对话框，同时显示左下角 .pio-show 再现按钮。
	   全局 Tailwind 生成的 .hidden 工具类（display:none）会把整个容器藏掉导致无法再现，此处提权对抗 */
	.pio-container.hidden {
		display: block;
	}

	@media (max-width: 1280px) {
		.pio-container.pio-hidden-on-mobile {
			display: none;
		}
	}
</style>
