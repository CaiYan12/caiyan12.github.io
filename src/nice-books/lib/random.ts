/**
 * 随机选择纯函数（RNG 可注入，测试 deterministic —— 主提示词 §35）
 * 契约约束（主提示词 §9）：
 *  - 今日好书换一换：新 ≠ 当前（pickOne 排除当前 id）
 *  - 站长推荐换一组：新组排除旧组全部 id、组内无重复（sampleUnique）
 * 不做任何更复杂的推荐（无画像/评分/协同过滤）。
 */

export type Rng = () => number;

export function pickOne<T extends { id: string }>(pool: readonly T[], excludeId?: string | null, rng: Rng = Math.random): T {
	const candidates = excludeId == null ? pool : pool.filter((b) => b.id !== excludeId);
	if (candidates.length === 0) {
		throw new Error("pickOne：排除后候选池为空");
	}
	return candidates[Math.floor(rng() * candidates.length)]!;
}

/**
 * 从池中抽 n 本不重复的；优先排除 excludeIds（如旧推荐组全部 id），
 * 池不足时放宽排除范围（与原型 sampleUniqueBooks 兜底逻辑一致）。
 * Fisher-Yates 洗牌后取前 n：结果唯一、顺序随机、可注入 RNG 复现。
 */
export function sampleUnique<T extends { id: string }>(pool: readonly T[], n: number, excludeIds: readonly string[] = [], rng: Rng = Math.random): T[] {
	const excluded = new Set(excludeIds);
	let candidates = pool.filter((b) => !excluded.has(b.id));
	if (candidates.length < n) {
		candidates = [...pool];
	}
	const arr = [...candidates];
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		const tmp = arr[i]!;
		arr[i] = arr[j]!;
		arr[j] = tmp;
	}
	return arr.slice(0, n);
}
