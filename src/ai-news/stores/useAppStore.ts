import { create } from "zustand";
import { flushSync } from "react-dom";
import type {
	Article,
	DataSource,
	FeedSource,
	FilterKind,
	HistoryEntry,
	JuyaStyleId,
	Settings,
	ThemeTokens,
} from "../shared/types";
import { DEFAULT_SETTINGS } from "../shared/types";
import { DEFAULT_SOURCE, SNAPSHOT_URL } from "../config/sources";
import { BUILTIN_THEMES } from "../theme/builtinThemes";
import { applyTheme } from "../theme/applyTheme";
import { resolveThemeScheme, type ThemeScheme } from "../shared/theme";
import { fetchFeed, parseFeed } from "../feed/rssParser";
import { loadPersisted, savePersisted } from "../lib/storage";
import { currentRoute, routeToHash, type Route } from "../lib/hash";
import { invalidateSearchIndex } from "../lib/search";
import { useToastStore } from "./useToastStore";

interface AppState {
	ready: boolean;
	settings: Settings;
	source: FeedSource;
	articles: Article[];
	history: Record<string, HistoryEntry>;
	themes: ThemeTokens[];
	systemDark: boolean;
	refreshing: boolean;
	/** 当前列表的数据来源：实时抓取 / 离线快照 */
	dataSource: DataSource | null;
	lastRefreshedAt: string | null;
	lastError: string | null;
	route: Route;
	query: string;
	filter: FilterKind;
	category: string | null;
	settingsOpen: boolean;

	init(): Promise<void>;
	refresh(): Promise<void>;
	/** 重建定时刷新定时器（间隔变更时调用）；0 或负数表示关闭 */
	startAutoRefresh(): void;
	openArticle(article: Article): void;
	back(): void;
	/** 路由切换统一入口：列表↔详情做 View Transitions 交叉淡入淡出（不支持的浏览器直切） */
	transitionRoute(route: Route): void;
	toggleFavorite(guid: string): void;
	toggleReadLater(guid: string): void;
	toggleRead(guid: string): void;
	markAllRead(): void;
	updateSettings(patch: Partial<Settings>): void;
	setThemeMode(mode: Settings["themeMode"]): void;
	setThemeForScheme(scheme: ThemeScheme, id: string): void;
	setJuyaStyle(scheme: ThemeScheme, id: JuyaStyleId): void;
	setQuery(q: string): void;
	setFilter(f: FilterKind): void;
	setCategory(c: string | null): void;
	setSettingsOpen(open: boolean): void;
	/** 外链一律新标签打开 */
	openExternal(url: string): void;
}

function effectiveScheme(settings: Settings, systemDark: boolean): ThemeScheme {
	if (settings.themeMode === "system") return systemDark ? "dark" : "light";
	return settings.themeMode;
}

function themeForScheme(
	themes: ThemeTokens[],
	settings: Settings,
	scheme: ThemeScheme,
): ThemeTokens | null {
	const selectedId =
		scheme === "light" ? settings.lightThemeId : settings.darkThemeId;
	const fallbackId = scheme === "light" ? "windows-light" : "windows-dark";
	return (
		themes.find(
			(theme) =>
				theme.id === selectedId && resolveThemeScheme(theme) === scheme,
		) ??
		themes.find(
			(theme) =>
				theme.id === fallbackId && resolveThemeScheme(theme) === scheme,
		) ??
		null
	);
}

function applyConfiguredTheme(
	themes: ThemeTokens[],
	settings: Settings,
	systemDark: boolean,
): void {
	const theme = themeForScheme(
		themes,
		settings,
		effectiveScheme(settings, systemDark),
	);
	if (theme) applyTheme(theme);
}

/** 按保留天数裁剪：超出窗口的文章从缓存移除，其历史记录一并回收。 */
function prune(
	articles: Article[],
	history: Record<string, HistoryEntry>,
	days: number,
): { articles: Article[]; history: Record<string, HistoryEntry> } {
	if (days <= 0) return { articles, history };
	const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
	const kept = articles.filter((a) => {
		const t = new Date(a.pubDate).getTime();
		return Number.isNaN(t) || t >= cutoff;
	});
	if (kept.length === articles.length) return { articles, history };
	const alive = new Set(kept.map((a) => a.guid));
	const nextHistory: Record<string, HistoryEntry> = {};
	for (const [guid, entry] of Object.entries(history)) {
		if (alive.has(guid)) nextHistory[guid] = entry;
	}
	invalidateSearchIndex(
		articles.filter((a) => !alive.has(a.guid)).map((a) => a.guid),
	);
	return { articles: kept, history: nextHistory };
}

/** 合并抓取结果：按 guid 去重覆盖，保持 pubDate 倒序。返回合并结果与新增条数。 */
function mergeArticles(
	current: Article[],
	incoming: Article[],
): { merged: Article[]; added: number } {
	const byGuid = new Map(current.map((a) => [a.guid, a]));
	let added = 0;
	for (const a of incoming) {
		const prev = byGuid.get(a.guid);
		if (!prev) {
			added += 1;
		} else if (prev.contentHtml !== a.contentHtml) {
			// 内容更新过（上游修订）：搜索索引必须失效，否则仍按旧文本命中
			invalidateSearchIndex([a.guid]);
		}
		byGuid.set(a.guid, a);
	}
	const merged = [...byGuid.values()].sort(
		(x, y) => new Date(y.pubDate).getTime() - new Date(x.pubDate).getTime(),
	);
	return { merged, added };
}

/** 定时刷新句柄（模块级，与 store 实例解耦） */
let refreshTimer: ReturnType<typeof setInterval> | null = null;
/** 是否为「应用内跳转」产生的历史记录：决定返回按钮走 history.back() 还是直接改 hash */
let pushedWithinApp = false;
/** 在途路由切换的目标 hash：openArticle 直发与 hashchange 回读会先后到达同一目标，去重 */
let pendingRoute: string | null = null;

export const useAppStore = create<AppState>((set, get) => ({
	ready: false,
	settings: DEFAULT_SETTINGS,
	source: DEFAULT_SOURCE,
	articles: [],
	history: {},
	themes: BUILTIN_THEMES,
	systemDark: false,
	refreshing: false,
	dataSource: null,
	lastRefreshedAt: null,
	lastError: null,
	route: { view: "home" },
	query: "",
	filter: "all",
	category: null,
	settingsOpen: false,

	async init() {
		const persisted = loadPersisted();
		const settings = persisted?.settings ?? DEFAULT_SETTINGS;
		const media = window.matchMedia("(prefers-color-scheme: dark)");
		const systemDark = media.matches;

		// 规范化初始 hash：无 hash 时补 '#/'（replaceState 不产生历史条目）。
		// 否则从详情页返回会落到「无 hash」的初始条目，URL 与路由状态不一致。
		if (window.location.hash === "") {
			window.history.replaceState(
				null,
				"",
				routeToHash({ view: "home" }),
			);
		}

		applyConfiguredTheme(BUILTIN_THEMES, settings, systemDark);
		set({
			ready: true,
			settings,
			articles: persisted?.articles ?? [],
			history: persisted?.history ?? {},
			systemDark,
			lastRefreshedAt: persisted?.lastRefreshedAt ?? null,
			route: currentRoute(),
		});

		// 系统亮暗变化：仅在跟随系统模式下重新注入主题
		media.addEventListener("change", (e) => {
			set({ systemDark: e.matches });
			const st = get();
			if (st.settings.themeMode === "system") {
				applyConfiguredTheme(st.themes, st.settings, e.matches);
			}
		});

		window.addEventListener("hashchange", () => {
			get().transitionRoute(currentRoute());
		});

		get().startAutoRefresh();

		// 冷启动无缓存 → 立即抓取（首屏等结果）；有缓存 → 先渲染缓存，后台静默刷新
		if (get().articles.length === 0) {
			await get().refresh();
		} else {
			void get().refresh();
		}
	},

	startAutoRefresh() {
		if (refreshTimer) {
			clearInterval(refreshTimer);
			refreshTimer = null;
		}
		const min = get().settings.refreshIntervalMin;
		if (min <= 0) return;
		refreshTimer = setInterval(
			() => {
				void get().refresh();
			},
			min * 60 * 1000,
		);
	},

	async refresh() {
		set({ refreshing: true, lastError: null });
		const source = get().source;
		try {
			const fetched = await fetchFeed(source);
			const { merged, added } = mergeArticles(get().articles, fetched);
			const { articles, history } = prune(
				merged,
				get().history,
				get().settings.historyRetentionDays,
			);
			set({
				articles,
				history,
				dataSource: "live",
				lastRefreshedAt: new Date().toISOString(),
			});
			if (added > 0) useToastStore.getState().show(`已更新 ${added} 条`);
			return;
		} catch (err) {
			// 实时抓取失败：回退内置快照，保证页面不空白
			console.error(
				"[feed] 实时抓取失败：",
				err instanceof Error ? err.message : err,
			);
		}

		try {
			const res = await fetch(SNAPSHOT_URL);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const snapshot = parseFeed(await res.text(), source);
			const { merged } = mergeArticles(get().articles, snapshot);
			set({
				articles: merged,
				dataSource: "snapshot",
				lastRefreshedAt: new Date().toISOString(),
				lastError: "实时抓取失败，当前展示内置离线快照",
			});
			useToastStore.getState().show("实时抓取失败，已回退离线快照");
		} catch (err) {
			set({
				lastError: `抓取失败：${err instanceof Error ? err.message : String(err)}`,
			});
			useToastStore.getState().show("抓取失败，请检查网络后重试");
		} finally {
			set({ refreshing: false });
		}
	},

	openArticle(article) {
		const route: Route = { view: "issue", guid: article.guid };
		window.location.hash = routeToHash(route);
		pushedWithinApp = true;
		// 先标已读再切路由：View Transition 的新状态快照里卡片已带已读标记
		const prev = get().history[article.guid];
		if (!prev?.read) {
			set((st) => ({
				history: {
					...st.history,
					[article.guid]: {
						guid: article.guid,
						read: true,
						favorite: prev?.favorite ?? false,
						readLater: prev?.readLater ?? false,
						readAt: new Date().toISOString(),
					},
				},
			}));
		}
		get().transitionRoute(route);
	},

	back() {
		if (pushedWithinApp) {
			pushedWithinApp = false;
			window.history.back();
			return;
		}
		window.location.hash = routeToHash({ view: "home" });
		get().transitionRoute({ view: "home" });
	},

	transitionRoute(route) {
		const target = routeToHash(route);
		// 同一路由的重复更新直接跳过：openArticle 直发 transition 后 hashchange 会再回读一次
		// （此时 flushSync 尚未执行、get().route 还是旧值，须比对在途目标而非当前 state）
		if (routeToHash(get().route) === target || pendingRoute === target)
			return;
		const reduce = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		).matches;
		if (!reduce && typeof document.startViewTransition === "function") {
			pendingRoute = target;
			const vt = document.startViewTransition(() => {
				flushSync(() => set({ route }));
			});
			// 快速连续导航时新 transition 会打断旧的（浏览器跳过其动画），
			// 被打断的 ready/finished 随之 reject —— 捕获以避免 unhandled rejection
			vt.ready.catch(() => {});
			vt.finished.catch(() => {});
			vt.finished.finally(() => {
				if (pendingRoute === target) pendingRoute = null;
			});
		} else {
			set({ route });
		}
	},

	toggleFavorite(guid) {
		const prev = get().history[guid];
		set((st) => ({
			history: {
				...st.history,
				[guid]: {
					guid,
					read: prev?.read ?? false,
					readAt: prev?.readAt ?? null,
					readLater: prev?.readLater ?? false,
					favorite: !(prev?.favorite ?? false),
				},
			},
		}));
	},

	toggleReadLater(guid) {
		const prev = get().history[guid];
		set((st) => ({
			history: {
				...st.history,
				[guid]: {
					guid,
					read: prev?.read ?? false,
					readAt: prev?.readAt ?? null,
					favorite: prev?.favorite ?? false,
					readLater: !(prev?.readLater ?? false),
				},
			},
		}));
	},

	toggleRead(guid) {
		const prev = get().history[guid];
		const read = !(prev?.read ?? false);
		set((st) => ({
			history: {
				...st.history,
				[guid]: {
					guid,
					read,
					readAt: read ? new Date().toISOString() : null,
					favorite: prev?.favorite ?? false,
					readLater: prev?.readLater ?? false,
				},
			},
		}));
	},

	markAllRead() {
		const now = new Date().toISOString();
		set((st) => {
			const history: Record<string, HistoryEntry> = { ...st.history };
			for (const a of st.articles) {
				const prev = history[a.guid];
				if (prev?.read) continue;
				history[a.guid] = {
					guid: a.guid,
					read: true,
					readAt: now,
					favorite: prev?.favorite ?? false,
					readLater: prev?.readLater ?? false,
				};
			}
			return { history };
		});
		useToastStore.getState().show("已全部标为已读");
	},

	updateSettings(patch) {
		const settings = { ...get().settings, ...patch };
		set({ settings });
		if (patch.themeMode !== undefined) {
			applyConfiguredTheme(get().themes, settings, get().systemDark);
		}
		if (patch.refreshIntervalMin !== undefined) {
			get().startAutoRefresh();
		}
	},

	setThemeMode(mode) {
		get().updateSettings({ themeMode: mode });
	},

	setThemeForScheme(scheme, id) {
		const theme = get().themes.find((item) => item.id === id);
		if (!theme || resolveThemeScheme(theme) !== scheme) return;
		const settings = {
			...get().settings,
			...(scheme === "light"
				? { lightThemeId: id }
				: { darkThemeId: id }),
		};
		set({ settings });
		if (effectiveScheme(settings, get().systemDark) === scheme)
			applyTheme(theme);
	},

	setJuyaStyle(scheme, id) {
		const patch =
			scheme === "light"
				? { juyaLightStyleId: id }
				: { juyaDarkStyleId: id };
		set({ settings: { ...get().settings, ...patch } });
	},

	setQuery(q) {
		set({ query: q });
	},

	setFilter(f) {
		set({ filter: f });
	},

	setCategory(c) {
		set({ category: c });
	},

	setSettingsOpen(open) {
		set({ settingsOpen: open });
	},

	openExternal(url) {
		window.open(url, "_blank", "noopener,noreferrer");
	},
}));

// ---- 持久化：设置 / 文章 / 历史变化即落盘（防抖，避免连续切换抖动写爆配额） ----
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let lastSnapshot = "";

useAppStore.subscribe((state, prev) => {
	if (
		state.settings === prev.settings &&
		state.articles === prev.articles &&
		state.history === prev.history &&
		state.lastRefreshedAt === prev.lastRefreshedAt
	) {
		return;
	}
	const payload = {
		settings: state.settings,
		articles: state.articles,
		history: state.history,
		lastRefreshedAt: state.lastRefreshedAt,
	};
	const json = JSON.stringify(payload);
	if (json === lastSnapshot) return;
	lastSnapshot = json;
	if (saveTimer) clearTimeout(saveTimer);
	saveTimer = setTimeout(() => {
		saveTimer = null;
		savePersisted(payload);
	}, 400);
});
