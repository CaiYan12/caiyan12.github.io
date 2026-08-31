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

	onMount(() => {
		if (
			pioConfig.hiddenOnMobile &&
			window.matchMedia("(max-width: 1280px)").matches
		) {
			return;
		}

		loadScript("/pio/static/l2d.js", "pio-l2d-script")
			.then(() => loadScript("/pio/static/pio.js", "pio-main-script"))
			.then(initPio)
			.catch((error) => {
				console.error("Pio 资源加载失败：", error);
			});
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
	@media (max-width: 1280px) {
		.pio-hidden-on-mobile {
			display: none;
		}
	}
</style>
