/**
 * 壁纸候选纯函数模块（spec #127 / 票 #129 T2）。
 *
 * 职责只有四件：路径规范化、去重、排除当前图、注入式均匀随机选一。
 * 与 DOM、Image、Pointer Events 完全解耦——随机源与基准 URL 都由调用方注入，
 * 所以既能在浏览器里跑，也能在裸 node 里被 `pnpm test:utils` 直接测。
 *
 * 三条硬约束（票面原文）：
 * 1. 比较前规范化 URL —— `/images/bg/a.jpg` 与
 *    `https://caiyan12.github.io/images/bg/a.jpg` 是同一张图，不能判成两张；
 * 2. 重复路径先去重 —— 同一张图写三遍不该拿到三份权重；
 * 3. 只剩当前图（或池里没有合法项）时返回「无候选」，**不伪造切换**。
 *
 * 壁纸池的唯一来源仍是 `src/config.ts` 的 `backgroundConfig.images`
 * （服务端序列化进 `.bg-image[data-backgrounds]`）。本模块不读目录、
 * 不持有第二份数组、不碰 `public/images/random/tb*.jpg`。
 */

/** 注入式随机源；默认 `Math.random` 只在运行时用，单测一律显式注入 */
export type Rng = () => number;

/** 「没有可换的图」的两档原因，供调用方选出不同的播报文案 */
export type NoCandidateReason = "empty-pool" | "no-candidates";

export type WallpaperChoice =
	{ ok: true; url: string } | { ok: false; reason: NoCandidateReason };

export type SelectOptions = {
	/** 壁纸池原始值；允许脏数据，非字符串/空串/非法协议会被丢掉 */
	pool: readonly unknown[] | unknown;
	/** 当前正在展示的背景地址（可为相对写法、可为绝对 URL、可为空） */
	current?: string | null;
	/** 规范化基准，通常是 `document.baseURI`；相对路径按它解析 */
	baseUrl: string | URL;
	/** 随机源，返回 [0,1) */
	rng?: Rng;
};

/**
 * 把一个池内条目规范成绝对 URL；不合法返回 null。
 *
 * 合法性判据只看协议：只有 http/https 算壁纸（`javascript:`、`data:`、
 * `blob:` 之类都不该被塞进 `<img src>`）。空串与纯空白同样丢弃。
 */
export function normalizeWallpaperUrl(
	raw: unknown,
	baseUrl: string | URL,
): string | null {
	if (typeof raw !== "string") return null;
	const trimmed = raw.trim();
	if (!trimmed) return null;
	try {
		const url = new URL(trimmed, baseUrl);
		if (url.protocol !== "http:" && url.protocol !== "https:") return null;
		// URL 会把相对写法解析成绝对形式，这正是「相对与绝对不被判成不同图」的实现点
		return url.href;
	} catch {
		return null;
	}
}

/**
 * 规范化 + 去重后的有效池（**不排除**当前图）。
 * 顺序保持首次出现的次序——单测用它钉「去重只留第一次」。
 */
export function normalizeWallpaperPool(
	pool: readonly unknown[] | unknown,
	baseUrl: string | URL,
): string[] {
	if (!Array.isArray(pool)) return [];
	const seen = new Set<string>();
	const out: string[] = [];
	for (const entry of pool) {
		const url = normalizeWallpaperUrl(entry, baseUrl);
		if (url === null || seen.has(url)) continue;
		seen.add(url);
		out.push(url);
	}
	return out;
}

/**
 * 候选列表 = 有效池 − 当前图。
 *
 * 排除当前图时同样走规范化：池里写相对、当前图写绝对（或反过来）都算同一张。
 * 当前图无法规范化（空/脏值）时视为「没有当前图」，不排除任何候选。
 */
export function collectWallpaperCandidates(
	pool: readonly unknown[] | unknown,
	current: string | null | undefined,
	baseUrl: string | URL,
): string[] {
	const valid = normalizeWallpaperPool(pool, baseUrl);
	const currentUrl =
		current == null ? null : normalizeWallpaperUrl(current, baseUrl);
	if (currentUrl === null) return valid;
	return valid.filter((url) => url !== currentUrl);
}

/**
 * 从池里均匀选一张**一定不同于当前图**的壁纸。
 *
 * - 池里没有任何合法条目 → `empty-pool`（配置坏了，别装作换过）；
 * - 有合法条目但全被当前图占掉 → `no-candidates`（只有这一张，没得换）；
 * - 否则按下标均匀取一，`rng()` 越界/非有限值都会夹回合法区间，
 *   保证结果一定落在候选集合内（端点 0 与贴近 1 都不出界）。
 */
export function selectNextWallpaper({
	pool,
	current,
	baseUrl,
	rng = Math.random,
}: SelectOptions): WallpaperChoice {
	const valid = normalizeWallpaperPool(pool, baseUrl);
	if (valid.length === 0) return { ok: false, reason: "empty-pool" };

	const candidates = collectWallpaperCandidates(valid, current, baseUrl);
	if (candidates.length === 0) return { ok: false, reason: "no-candidates" };

	const random = rng();
	// 非有限值（NaN / Infinity）与区间外值都夹回 [0, 候选数-1]：
	// 随机源是注入进来的，坏值不该让选中落到 undefined。
	const raw = Number.isFinite(random)
		? Math.floor(random * candidates.length)
		: 0;
	const index = Math.min(Math.max(raw, 0), candidates.length - 1);

	return { ok: true, url: candidates[index] };
}
