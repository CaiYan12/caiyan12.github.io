/**
 * Fisher–Yates 洗牌（客户端共享实现）：
 * 返回新数组，不修改入参。用于"换一批"评论池、侧栏"手气不错"等
 * 构建期/客户端随机抽取场景。服务端 sync-site-stats 另有带 PRNG 注入的
 * 独立实现（需逐次校验随机值域，职责不同，不共享）。
 */
export function shuffleArray<T>(items: T[]): T[] {
	const shuffled = [...items];
	for (let index = shuffled.length - 1; index > 0; index -= 1) {
		const randomIndex = Math.floor(Math.random() * (index + 1));
		[shuffled[index], shuffled[randomIndex]] = [
			shuffled[randomIndex],
			shuffled[index],
		];
	}
	return shuffled;
}
