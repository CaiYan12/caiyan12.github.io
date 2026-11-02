/**
 * 换图候选尝试记账与超时判定（spec #127「预载与过渡」/ 票 #132 T5）。
 *
 * 只回答两个问题，不碰 DOM、不碰 Image、不碰计时器：
 * 1. 本次操作该按什么顺序试候选，怎样保证**每个候选最多试一次**；
 * 2. 一次尝试算「可用」还是「失败 / 超时」。
 *
 * 「最多一次」由**候选列表本身**保证：runAttempts 只遍历给定的候选、不做重试，
 * 所以一次操作最多尝试 N 次（N = 候选数）——不会无限重试。
 * 加载器可注入，运行时给真实预载，单测给假函数。
 */

/**
 * 一次尝试的结果。
 *
 * - `ok`：候选已确认可用（加载完成且有固有尺寸），可以提交；
 * - `failed`：加载失败（onerror / 解码与尺寸都用不上），换下一个候选；
 * - `timeout`：超过加载上限，**按失败处理**并解除忙碌（弱网下不永久锁死）。
 *
 * 后两档在运行时都走「换下一个候选」，但分成两个词是为了让超时有独立证据。
 */
export type TryLoadResult = "ok" | "failed" | "timeout";

/**
 * 本次操作的结局。
 *
 * - `changed`：换到了一张（`url` 是它的地址）；
 * - `exhausted`：候选全部试完（失败 / 超时）也没换成功——当前背景必须保持原样。
 *
 * 注意 `exhausted` 与「无候选」是**不同的结果**：无候选由
 * `wallpaper-candidates.ts` 在选图阶段就返回，根本不会走到这里。
 */
export type AttemptReport =
	{ status: "changed"; url: string } | { status: "exhausted" };

/** 判断一次尝试是否「超时」——超时是失败的一种，但要有独立证据 */
export function isTimeoutAttempt(result: TryLoadResult): boolean {
	return result === "timeout";
}

/**
 * 把「首选候选」与「其余候选」拼成这次操作的尝试顺序。
 *
 * 票面要求：某个候选失败时可换用**尚未尝试过**的候选，
 * 且一次操作最多尝试 N 次（N = 候选数）。
 *
 * 首选由上游 `selectNextWallpaper` 均匀随机选出（保证「换到的一定不是当前
 * 这张」），本条只负责把**剩下的候选**接在后面当退路：
 * · 首选排第一，所以正常路径的行为与 T2 完全一致（第一张就成功时，
 *   后面那些候选一次都不会被碰）；
 * · 失败时才依次回退，绝不回头重试已试过的（runAttempts 另有记账兜底）。
 */
export function orderAttempts(
	candidates: readonly string[],
	first: string,
): string[] {
	return [first, ...candidates.filter((url) => url !== first)];
}

/**
 * 按顺序试候选，**每个只试一次**，换到第一张可用的为止。
 *
 * 「最多一次」在这里由记账保证，**不依赖上游去重**：同一个地址即使出现在
 * 候选列表里两次，也只会在第一次被尝试。一次操作最多尝试 N 次
 * （N = 去重后的候选数），不存在重试循环。
 *
 * 候选列表为空时直接返回 `exhausted`：调用方拿到了空清单也不该伪造切换。
 * 加载器抛错按失败收口——一次候选的异常不该让整笔事务卡在忙碌状态。
 */
export async function runAttempts(
	candidates: readonly string[],
	tryLoad: (url: string) => Promise<TryLoadResult>,
): Promise<AttemptReport> {
	/** 已经试过的地址：这是「每个候选最多一次」的唯一执行点 */
	const attempted = new Set<string>();

	for (const url of candidates) {
		if (attempted.has(url)) continue;
		attempted.add(url);

		let result: TryLoadResult;
		try {
			result = await tryLoad(url);
		} catch {
			result = "failed";
		}
		if (result === "ok") return { status: "changed", url };
	}
	return { status: "exhausted" };
}
