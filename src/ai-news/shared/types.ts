/** 跨模块共用类型。Web 版相比桌面端裁剪掉了标签会话、Mini 窗口、内建浏览器相关的字段。 */

export interface FeedSource {
	id: string;
	name: string;
	url: string;
	enabled: boolean;
	providerId: string;
}

export interface Article {
	guid: string;
	sourceId: string;
	title: string;
	link: string;
	pubDate: string;
	summary: string;
	contentHtml: string;
	coverUrl: string | null;
}

export interface HistoryEntry {
	guid: string;
	read: boolean;
	/** 收藏：长期留存的精华 */
	favorite: boolean;
	/** 稍后阅读：待办队列，与收藏相互独立 */
	readLater: boolean;
	readAt: string | null;
}

export interface LayoutConfig {
	preset: "compact" | "grid" | "magazine";
	gridColumns: 1 | 2 | 3 | 4;
	fields: {
		cover: boolean;
		summary: boolean;
		pubDate: boolean;
		source: boolean;
	};
}

/** 橘鸦定制阅读风格标识。'off' = 关闭（回退通用阅读页）。 */
export type JuyaStyleId =
	"off" | "card" | "y2k" | "pop" | "newsprint90s" | "dreamcore";

/** 列表筛选维度 */
export type FilterKind = "all" | "unread" | "favorite" | "readLater";

/** 抓取结果来源：实时抓取成功 / 回退到内置离线快照 */
export type DataSource = "live" | "snapshot";

export interface Settings {
	/** 外观模式：跟随系统、固定亮色或固定暗色。 */
	themeMode: "system" | "light" | "dark";
	/** 两个分类各自记忆主题，选择器不得跨分类使用。 */
	lightThemeId: string;
	darkThemeId: string;
	layout: LayoutConfig;
	/** 定时刷新间隔（分钟）；0 表示关闭 */
	refreshIntervalMin: number;
	historyRetentionDays: number;
	/** 橘鸦定制阅读风格（亮色侧）。'off' = 关闭，回退通用阅读页。 */
	juyaLightStyleId: JuyaStyleId;
	/** 橘鸦定制阅读风格（暗色侧）。'off' = 关闭，回退通用阅读页。 */
	juyaDarkStyleId: JuyaStyleId;
}

export interface ThemeTokens {
	id: string;
	name: string;
	builtin?: boolean;
	/** 亮/暗分类（用于 CSS color-scheme）。 */
	colorScheme?: "light" | "dark";
	colors: {
		bg: string;
		surface: string;
		card: string;
		border: string;
		text: string;
		textSecondary: string;
		accent: string;
		accentHover: string;
		onAccent: string;
		chip: string;
		chipText: string;
		read: string;
	};
	fonts: {
		heading: string;
		body: string;
	};
	radius: number;
	spacing: number;
}

export const DEFAULT_SETTINGS: Settings = {
	themeMode: "system",
	lightThemeId: "juya-daily",
	darkThemeId: "windows-dark",
	layout: {
		preset: "grid",
		gridColumns: 2,
		fields: { cover: true, summary: true, pubDate: true, source: true },
	},
	refreshIntervalMin: 30,
	historyRetentionDays: 30,
	juyaLightStyleId: "card",
	juyaDarkStyleId: "card",
};
