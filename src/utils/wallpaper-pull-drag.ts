/**
 * 拉绳壁纸挂件的下拉伸展纯函数（spec #127 / 票 #130 T3）。
 *
 * 只回答三个问题，不碰 DOM、不碰事件、不碰计时器：
 * 1. 这一次位移算不算「开始拖动」（死区）；
 * 2. 垂直位移该换成多少像素的伸展（只吃向下、有上限、超出给橡皮筋）；
 * 3. 松手时这个伸展量够不够换图（阈值）。
 *
 * 运行时只拿结果写 CSS 变量，判定规则本身全在这里，所以能在裸 node 里测。
 */

// ---- 三个手感常量 ----
//
// 数值口径来自票面给的量级（阈值 80px、封顶 130px、超出约 10px 弹性），
// 每一条都写明它为什么是这个数，改之前先读理由。

/**
 * 松手判定阈值（px）：拖动距离达到它才算「拉到位」。
 *
 * 80 的来由与实测（dist + preview，1440×900，真实 Pointer Events，2026-11-02）：
 *   dy=79 → 不换；dy=80 → 换（`>=` 边界精确；见临近档 75/79/80/81 四组）
 *   · 小于死区（4px）的位移不进入拖动，故 80 远大于「误触」量级
 *   · 约等于衣服本体高度的 1.5 倍、组件盒宽的 0.6 倍，单手触屏一划可达
 *   · 与最大伸展 130 之间留 50px 余量，拉过阈值后仍有可见的「还能再拉」段
 * 改这个值时 PULL_MAX 与弹性上界要一起看：阈值不得逼近 PULL_MAX，
 * 否则「刚拉到位就已到顶」，手感会变成撞墙。
 */
export const PULL_THRESHOLD = 80;

/**
 * 伸展封顶：超过这个量之后衣服不再一比一跟手（px）。
 *
 * 130px 是挂件盒宽，也是 `--wpull-drop` 之上还能安全往下的余量：
 * 再往下拉，衣服底边就要压到导航/标题带（挂件默认就在那一带）。
 * 触屏上 130px 约等于一次从容的短划，到顶时有「拉住了」的实感。
 */
export const PULL_MAX = 130;

/**
 * 超过封顶后还能多走的极限（px）—— 橡皮筋的渐近上界。
 *
 * 取 10px 而不是比例：比例（比如 10%）在大幅下拉时会长到几十像素，
 * 衣服照样能被甩出视觉边界。这里用 `e / (e + L)` 收敛到 L，
 * 无论访客再拉多远，超出封顶的位移都不会超过 10px。
 */
export const ELASTIC_LIMIT_PX = 10;

/**
 * 位移是否已经越过死区：用合位移（欧氏长度），方向不限（px）。
 *
 * 4px 能吃掉触屏手指的微颤与鼠标按下瞬间的 1–3px 滑动，
 * 又远小于 80px 阈值，不会让拖动显得迟钝。
 */
export const DRAG_DEAD_ZONE_PX = 4;

export function isDragStarted(dx: number, dy: number): boolean {
	return Math.hypot(dx, dy) >= DRAG_DEAD_ZONE_PX;
}

/**
 * 把一次指针位移换算成伸展像素。
 *
 * - 只吃向下的分量：向上、横向位移一律返回 0（票面：向上与横向不伸展）；
 * - 未达封顶时一比一跟手，不做提前打折（打折会让手感发飘）；
 * - 超出封顶后按 `e / (e + L)` 收敛到 `ELASTIC_LIMIT_PX`，
 *   `atLimit` 供运行时判断是否该进入「到顶」的收尾手感。
 */
export function resolvePull({ dy }: { dx?: number; dy: number }): {
	pull: number;
	atLimit: boolean;
} {
	if (!Number.isFinite(dy) || dy <= 0) return { pull: 0, atLimit: false };
	if (dy <= PULL_MAX) return { pull: dy, atLimit: dy >= PULL_MAX };

	const excess = dy - PULL_MAX;
	// 渐近曲线：excess → ∞ 时额外位移收敛到 ELASTIC_LIMIT_PX，永不越界
	const elastic = (ELASTIC_LIMIT_PX * excess) / (excess + ELASTIC_LIMIT_PX);
	return { pull: PULL_MAX + elastic, atLimit: true };
}

/**
 * 松手时是否达成阈值。
 *
 * 边界口径：**恰好等于阈值算达成**（`>=`）——拉到阈值线本身就代表
 * 「有意图的拉动」，把它判成不够会让边界手感出现一格死区。
 */
export function isPullPastThreshold(pull: number): boolean {
	return pull >= PULL_THRESHOLD;
}
