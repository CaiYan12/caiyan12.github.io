/**
 * 页面级 runtime 的会话所有者。
 *
 * 为什么要有它：页面级功能的初始化散在各自的内联脚本里，各自监听
 * `colorful:page:loaded`，但没有一处对「离开这一页」负责——首页轮播的 4s interval
 * 在 `#slider` 已脱离 DOM 之后仍在跑，回到首页再起一条，逐次累积（F2.1 实测 2→2→3）。
 *
 * 边界：本 module 只管**时机**与**登记**，不承载任何功能的 implementation，
 * 也不碰 DOM。常驻模块（头部微言、拉绳壁纸、导航、液态玻璃、随机背景）仍走
 * `runtimeTable` / `runtimeHooks` 的既有轨道，不进这里——它们的 DOM 不随页面替换。
 *
 * 三个相位与既有轨道的关系（不新增第四轨）：
 *   · 初始装载：`runtimeTable` 里一行 `{ init: owner.start, swap: 9 }`，走原表；
 *   · 换页重跑：同一个 `swap` 号，走 `astro:after-swap` 的重跑清单；
 *   · 换页前停止：`runtimeHooks.beforeSwap` 里追加 `owner.stop`。
 * 顺序上 `beforeSwap` 的既有项（Fancybox 清理）仍在前面，表内 28 行的既有次序不动。
 */
export type PageSession = {
	/** 功能名，只用于诊断输出，不参与调度 */
	name: string;
	/** 页面就绪时启动当前页。同一页重复调用由 owner 负责避免。 */
	start: () => void;
	/** 离开页面前停止：清定时器、解绑监听、销毁实例。 */
	stop: () => void;
};

export type PageSessionOwner = {
	start: () => void;
	stop: () => void;
};

/**
 * 用一张显式清单建出一个 owner。清单即「哪些功能是页面级」的唯一家谱，
 * 与 `runtimeTable` 的常驻清单并列——不要在功能模块里自行注册，否则家谱会分叉。
 */
export function createPageSessionOwner(
	sessions: PageSession[],
): PageSessionOwner {
	return {
		start() {
			for (const session of sessions) session.start();
		},
		stop() {
			for (const session of sessions) session.stop();
		},
	};
}
