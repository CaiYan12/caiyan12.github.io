/**
 * 「这张图什么时候能画」的共享判定（Phase F5）。
 *
 * 抽出来的原因：壁纸有两条独立的事务——预载（在独立图像对象上确认候选可用）
 * 与提交（把新地址落到原图层上、等它画出来）。两条事务各自散落着同一套
 * **结算知识**：什么时候问 decode、什么时候算可画、什么时候只结算一次、
 * 结算之后要把什么清掉。这套知识因此在两个文件里各写了一遍，晚到的事件
 * 与清理规则也跟着写了两遍——改一处忘另一处，就会出现「迟到的 load 把已经
 * 定案的结局翻掉」这类只在弱网下偶发的回归。
 *
 * 本 module 只收两笔事务**真正相同**的那部分：
 *
 *   1. **第一个信号定案**：load 与 error 谁先到谁说了算，后到的信号不许翻案；
 *   2. **可画判定**：一律「加载完成且具有固有尺寸」
 *      （`complete && naturalWidth > 0`）；
 *   3. **清理**：结算即摘监听、清计时器，不留悬挂的处理器；
 *   4. **一个加载上限**：到点按超时收口，绝不无限挂着。
 *
 * 事务差异**留在调用方**，不进这个 module：decode 提问的位置、超时的含义
 * （预载把超时独立成档以便留证据、提交把超时按「不可画」处理）、失败要不要
 * 回滚、谁设置 `src`。
 *
 * 判定口径为什么不是「decode 成功」：`decode()` 被拒**不算失败**——并发请求与
 * 大尺寸图片会拒掉合法图片（spec 原文）。因此 decode 的兑现与被拒走**同一条**
 * 判定，问它只是为了等解码落定，不是为了用它的结果。
 */

/**
 * 判定结果三档。
 *
 * - `ok`：加载完成且具有固有尺寸，可以画。
 * - `failed`：加载失败，或加载完成但没有固有尺寸（解码与尺寸都用不上）。
 * - `timeout`：超过加载上限仍无结论——**独立成档**，好让调用方留下证据
 *   （预载要靠它区分「换下一个候选」与「网络彻底不通」）。
 */
export type Paintability = "ok" | "failed" | "timeout";

/**
 * 等这张图可画；可画了返回 `ok`，用不上返回 `failed`，到点仍无结论返回 `timeout`。
 *
 * 监听用 `addEventListener` 而不是 `onload` 属性：提交事务操作的是**长期共享**
 * 的原图层（`.bg-image`），属性赋值等于占用它的处理器槽位，将来别处想挂
 * `onload` 就会被顶掉；`removeEventListener` 也只摘掉自己挂的那一个。
 *
 * @param image 要等的图像。调用方负责在**调用之后**设置 `src`（预载侧要等
 *   监听挂好再写 `src`，否则可能错过同步完成的事件）。
 * @param options.timeoutMs 加载上限（毫秒）。到点按 `timeout` 收口。
 */
export function whenPaintable(
	image: HTMLImageElement,
	options: { timeoutMs: number },
): Promise<Paintability> {
	return new Promise<Paintability>((resolve) => {
		/** 第一个信号定案：load / error 谁先到谁说了算 */
		let claimed: "load" | "error" | null = null;
		let settled = false;
		let timer: ReturnType<typeof setTimeout> | null = null;

		/**
		 * 结算。**只此一次**：第一次定案之后，任何信号都不再改写结局。
		 *
		 * 结算即清理：计时器清掉、自己的监听摘掉——留着监听的话，迟到的
		 * load / error 还会打到已经定案的结局上（哪怕被 `settled` 吞掉，
		 * 那也是一条永远悬挂的处理器）。
		 */
		function settle(result: Paintability): void {
			if (settled) return;
			settled = true;
			if (timer !== null) {
				clearTimeout(timer);
				timer = null;
			}
			image.removeEventListener("load", onLoad);
			image.removeEventListener("error", onError);
			resolve(result);
		}

		/**
		 * load：定案在「load 这条分支」上，然后问一次 decode。
		 *
		 * 可画与否在**这一刻**取定（快照），不推迟到 decode 落定之后：
		 * 判定要看得见的是「这张图此刻能不能画」，而不是「等解码落定后
		 * 那张图还剩下什么」——后者会被后来的信号改写。
		 *
		 * 问 decode 是为了**等解码落定**（加载完成不等于解码完成，弱网下
		 * 画出来会有半截），不是为了用它的结果：兑现与被拒都按同一份
		 * 快照结算。
		 */
		function onLoad(): void {
			if (claimed !== null) return;
			claimed = "load";
			const paintable = image.complete && image.naturalWidth > 0;
			const decoded =
				typeof image.decode === "function"
					? image.decode()
					: Promise.resolve();
			const settleBySnapshot = () => settle(paintable ? "ok" : "failed");
			Promise.resolve(decoded).then(settleBySnapshot, settleBySnapshot);
		}

		/**
		 * error：加载失败，没有可画的可能。
		 *
		 * 若 load 已经先到（正在等 decode 落定），这条**不翻案**——第一个
		 * 信号说了算。
		 */
		function onError(): void {
			if (claimed !== null) return;
			claimed = "error";
			settle("failed");
		}

		// 早退：已经可画就别再等信号。
		// 对预载是空操作（每次都是全新的图像对象，`src` 未写前不可能 complete）；
		// 对提交是必需（decode 被拒时 load 可能早已到过，不会再有第二个 load）。
		if (image.complete && image.naturalWidth > 0) {
			settled = true;
			resolve("ok");
			return;
		}

		image.addEventListener("load", onLoad);
		image.addEventListener("error", onError);
		// 明确的加载上限：到点按超时收口，绝不无限挂着
		timer = setTimeout(() => settle("timeout"), options.timeoutMs);
	});
}
