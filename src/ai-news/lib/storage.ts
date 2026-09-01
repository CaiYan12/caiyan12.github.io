import {
	DEFAULT_SETTINGS,
	type Article,
	type HistoryEntry,
	type Settings,
} from "../shared/types";

/** localStorage 持久化：版本化键名，读取时容错（坏数据回落默认值而非崩溃）。
 *  写入超配额时降级：丢弃文章缓存，只保留设置与历史。 */

const STORAGE_KEY = "ai-daily:v1";

export interface PersistedState {
	version: 1;
	settings: Settings;
	articles: Article[];
	history: Record<string, HistoryEntry>;
	lastRefreshedAt: string | null;
}

export function loadPersisted(): PersistedState | null {
	let raw: string | null = null;
	try {
		raw = localStorage.getItem(STORAGE_KEY);
	} catch {
		// 隐私模式 / 禁用存储：退化为纯内存运行
		return null;
	}
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw) as Partial<PersistedState>;
		if (!parsed || typeof parsed !== "object") return null;
		return {
			version: 1,
			// 逐字段收敛，避免旧版本缺字段导致下游 undefined
			settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
			articles: Array.isArray(parsed.articles) ? parsed.articles : [],
			history:
				parsed.history && typeof parsed.history === "object"
					? parsed.history
					: {},
			lastRefreshedAt:
				typeof parsed.lastRefreshedAt === "string"
					? parsed.lastRefreshedAt
					: null,
		};
	} catch {
		return null;
	}
}

export function savePersisted(state: Omit<PersistedState, "version">): void {
	const payload: PersistedState = { version: 1, ...state };
	if (write(STORAGE_KEY, payload)) return;
	// 配额溢出：文章缓存最占空间且可重新抓取，优先丢弃它
	write(STORAGE_KEY, { ...payload, articles: [] });
}

function write(key: string, payload: PersistedState): boolean {
	try {
		localStorage.setItem(key, JSON.stringify(payload));
		return true;
	} catch {
		return false;
	}
}
