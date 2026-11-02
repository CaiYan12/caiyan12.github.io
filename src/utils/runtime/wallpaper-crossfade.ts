/**
 * 壁纸交叉淡入与临时层（票 #131 / spec #127「预载与过渡」）。
 *
 * 结构是承重的：**旧图原地不动，只新建一层单向淡入**。绝不先淡出旧图再淡入
 * 新图——顺序式过渡中途会露出页面底色（jQuery Backstretch 的 `fadeinout`
 * 分支被报 Flash 的正是这个）。因此本模块的提交顺序是：
 *
 *   1. 候选图**已经**由调用点（`preloadCandidate`）在独立图像对象上确认可用，
 *      本模块不再重复那种判定，只碰「已确认可用」的地址；
 *   2. 临时层插在原图层**之后**，层叠值取原图层的计算值（本站 -9999）——
 *      靠 DOM 位次压住旧图。绝不能高过纹理遮罩的 -998，否则淡入期间遮罩会被
 *      顶掉一帧，正是要避免的跳变；
 *   3. 淡入到不透明之后才改原图层的 `src`，并等它可画，**最后**才移除临时层：
 *      移除时底下已经是新图，所以看不到任何空档。
 *
 * 生命周期：同一时刻只允许一个临时层（新的一笔先等上一笔撤干净再建）；
 * 过渡结束、异常、被中断三条路径都由同一个收尾口移除临时层，绝不堆积。
 */

import { prefersReducedMotion } from "./reduced-motion";

/** 临时层类名（样式在 global.css「拉绳壁纸挂件」一节） */
export const TEMP_LAYER_CLASS = "bg-image--temp";

/**
 * 淡入时长（毫秒）——必须与 global.css 里 `.bg-image--temp` 的
 * `transition: opacity 320ms` 一致；改一处就要改另一处（与 SETTLE_MS 同一口径）。
 */
const FADE_MS = 320;

/**
 * `transitionend` 的兜底：后台标签页会把过渡挂起、页面隐藏时事件也不会到，
 * 没有它临时层会一直挂着。留足余量，正常路径永远轮不到它。
 */
const FADE_FALLBACK_MS = FADE_MS + 400;

/**
 * 提交后等原图层可画的上限。超时也照样收尾——宁可极短空档，
 * 也绝不让临时层堆积。
 */
const COMMIT_TIMEOUT_MS = 1500;

/**
 * 要照抄的计算值：裁切（`object-fit` / `object-position`）与透明度语义。
 *
 * 定位与尺寸**不**从计算值抄：计算值会被解析成当时的像素，淡入中途缩放窗口就
 * 对不上了。它们照抄 `.bg-image` 的声明语义（fixed + inset 0 + 100%）。
 */
const COPIED_PROPERTIES = [
	"object-fit",
	"object-position",
	"opacity",
	"z-index",
] as const;

/**
 * - `committed`：已交叉淡入到新图。
 * - `cancelled`：被后一笔挤掉（背景保持原样，或已落到上一笔的新图）。
 * - `failed`：提交阶段失败，原图已回滚（背景保持原样）。
 * - `skipped`：临时层建不起来（结构异常 / 受限环境），调用方应退化直接切换。
 */
export type CrossfadeResult = "committed" | "cancelled" | "failed" | "skipped";

/**
 * 正在过渡的那一笔；null 表示此刻没有临时层。
 */
let active: { abort: () => void } | null = null;

/**
 * 并发闸门：后到的一笔要等**所有**先到的笔收干净才建层。
 *
 * 只靠 `active` 挡不住同步连发——后两笔会在同一微任务批里同时越过检查，
 * 于是一起建层、两层并存。闸门把「建层」这一步串成队列，互斥才是真的。
 */
let gate: Promise<void> = Promise.resolve();

/** 请求代号：排队期间被更新的请求取代时，旧的那一笔不再碰 DOM */
let generation = 0;

/**
 * 把 `target` 的壁纸交叉淡入到 `url`（`url` 必须已确认可用）。
 *
 * 被后来的请求取代时返回 `cancelled` 且**不建任何临时层**——排队等着的那笔
 * 本来就没上过屏，没必要再演一遍淡入。
 */
export async function crossfadeBackground(
	target: HTMLImageElement,
	url: string,
): Promise<CrossfadeResult> {
	const mine = ++generation;
	active?.abort();

	const waitFor = gate;
	let openGate: () => void = () => {};
	gate = new Promise<void>((resolve) => {
		openGate = resolve;
	});
	await waitFor;

	// 排队期间已被更新的请求取代：不建层、不改背景，直接把闸门交给下一位
	if (mine !== generation) {
		openGate();
		return "cancelled";
	}

	// 减少动态：不播交叉淡入，直接切换（spec 故事 40）。没有临时层，也就没有清理负担。
	if (prefersReducedMotion()) {
		target.src = url;
		openGate();
		return "committed";
	}

	return new Promise<CrossfadeResult>((resolve) => {
		/** 已进入提交阶段：此时原图层的地址可能已换掉、但未必画得出来 */
		let committing = false;
		/** 结局词（只能定一次） */
		let outcome: CrossfadeResult | null = null;
		let fadeTimer: ReturnType<typeof setTimeout> | null = null;
		let layer: HTMLImageElement | null = null;
		let onTransitionEnd: ((event: TransitionEvent) => void) | null = null;
		let disposed = false;

		/** 撤掉临时层并放开下一笔；**所有路径的唯一出口** */
		const dispose = () => {
			if (disposed) return;
			disposed = true;
			if (fadeTimer !== null) {
				clearTimeout(fadeTimer);
				fadeTimer = null;
			}
			if (layer) {
				if (onTransitionEnd) {
					layer.removeEventListener("transitionend", onTransitionEnd);
					onTransitionEnd = null;
				}
				layer.remove();
				layer = null;
			}
			if (active?.abort === abort) active = null;
			openGate();
		};

		/**
		 * 定结局。
		 *
		 * 提交阶段**不能**立刻撤层：原图层的地址已经换掉但还不一定画得出来，
		 * 这时撤掉临时层就会露一帧底色。撤层交给提交的落点。
		 */
		function finish(result: CrossfadeResult) {
			if (outcome === null) {
				outcome = result;
				resolve(result);
			}
			if (!committing) dispose();
		}

		/** 中断入口：被新的一笔挤掉时走这里，不产生新的视觉提交 */
		function abort() {
			// 已进入提交阶段就不能再回滚：原图层此刻正指着新图，回滚等于把画面
			// 拉回旧图（一次可见的跳变）。让它走完，新的一笔从落定的画面起步。
			if (committing) return;
			finish("cancelled");
		}

		/** 淡入结束（或兜底计时器到点）：提交到原图层，就绪之后再撤临时层 */
		function commit() {
			if (committing || outcome !== null) return;
			committing = true;
			void commitOriginal(target, url).then((ok) => {
				finish(ok ? "committed" : "failed");
				// 走到这里原图已可画（或已回滚到旧图），撤层不会露出空档
				dispose();
			});
		}

		// ---- 建设：新层插在原图层之后，复刻它的定位、尺寸、裁切与透明度 ----
		let created: HTMLImageElement;
		let targetOpacity: string;
		try {
			created = document.createElement("img");
			layer = created;
			created.className = `bg-image ${TEMP_LAYER_CLASS}`;
			created.setAttribute("alt", "");
			created.setAttribute("aria-hidden", "true");
			targetOpacity = replicate(target, created);
			// 先落在全透明，插入之后再抬到目标值，才有「单向淡入」可言
			created.style.setProperty("opacity", "0");
			created.src = url;
			target.insertAdjacentElement("afterend", created);
			// 强制一次布局：没有这个空帧，opacity 从 0 到 1 的过渡不会触发
			void created.offsetWidth;
		} catch (error) {
			console.warn("[wallpaper-crossfade] layer setup failed:", error);
			finish("skipped");
			return;
		}

		onTransitionEnd = (event) => {
			// 层上只过渡 opacity；这里只是防将来有人给它加别的过渡
			if (event.propertyName && event.propertyName !== "opacity") return;
			commit();
		};
		created.addEventListener("transitionend", onTransitionEnd);
		// 兜底：过渡被挂起 / 事件没到，也必须收尾
		fadeTimer = setTimeout(commit, FADE_FALLBACK_MS);
		created.style.setProperty("opacity", targetOpacity);

		active = { abort };
	});
}

/**
 * 复刻原图层的定位、尺寸、裁切与透明度语义，返回它当前的**目标透明度**。
 *
 * 层叠值必须取计算值：只有拿到 -9999，临时层才不会盖过 -998 的纹理遮罩。
 */
function replicate(source: HTMLImageElement, layer: HTMLElement): string {
	const computed = getComputedStyle(source);
	// 与 .bg-image 的声明一致：fixed + 铺满视口，不抄解析后的像素
	layer.style.setProperty("position", "fixed");
	layer.style.setProperty("top", "0");
	layer.style.setProperty("right", "0");
	layer.style.setProperty("bottom", "0");
	layer.style.setProperty("left", "0");
	layer.style.setProperty("width", "100%");
	layer.style.setProperty("height", "100%");
	for (const name of COPIED_PROPERTIES) {
		const value = computed.getPropertyValue(name);
		if (value) layer.style.setProperty(name, value);
	}
	return computed.getPropertyValue("opacity") || "1";
}

/**
 * 把新地址落到原图层上并等它可画；不可画就回滚到旧地址。
 *
 * 候选已经预载过一次，缓存命中时 `decode()` 立即 resolve；被拒时退化为
 * 「等 load 事件」——与调用点的 `preloadCandidate` 同一口径
 * （并发与大尺寸会拒掉合法图片）。
 */
async function commitOriginal(
	target: HTMLImageElement,
	url: string,
): Promise<boolean> {
	const previous = target.src;
	target.src = url;
	if (typeof target.decode === "function") {
		try {
			await target.decode();
			return true;
		} catch {
			// 解码被拒不算失败：退化到 load 判据
		}
	}
	const ready = await waitForImage(target);
	if (!ready) target.src = previous;
	return ready;
}

/** 等图片可画；load / error / 超时三路都收尾，不无限阻塞 */
function waitForImage(image: HTMLImageElement): Promise<boolean> {
	if (image.complete && image.naturalWidth > 0) return Promise.resolve(true);
	return new Promise<boolean>((resolve) => {
		let done = false;
		const finish = () => {
			if (done) return;
			done = true;
			clearTimeout(timer);
			image.removeEventListener("load", finish);
			image.removeEventListener("error", finish);
			resolve(image.complete && image.naturalWidth > 0);
		};
		const timer = setTimeout(finish, COMMIT_TIMEOUT_MS);
		image.addEventListener("load", finish);
		image.addEventListener("error", finish);
	});
}
