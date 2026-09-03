import siteStats from "./site-stats.json" with { type: "json" };

/** 构建期从 Giscus 同步的留言板顶层留言条目。 */
export interface GuestbookComment {
	author: string;
	avatar?: string;
	content: string;
	date: string; // ISO 8601
}

const snapshot = siteStats as { guestbookComments?: GuestbookComment[] };

/** 本地基线可能尚未同步，缺失时保持安全的空状态。 */
const syncedGuestbookComments: GuestbookComment[] = Array.isArray(
	snapshot.guestbookComments,
)
	? snapshot.guestbookComments
	: [];

/** 开发环境预览数据：生产构建只读取构建期同步快照。 */
const localPreviewComments: GuestbookComment[] = [
	{
		author: "CaiYan12",
		avatar: "/images/avatar.webp",
		content: "Hello, world!",
		date: "2026-09-01T00:00:00+08:00",
	},
	{
		author: "林木",
		avatar: "/images/avatar.webp",
		content: "欢迎来到这里，期待看到更多音乐和代码分享。",
		date: "2026-09-03T08:50:00+08:00",
	},
	{
		author: "Miko",
		avatar: "/images/avatar.webp",
		content: "留言板看起来很方便，留个脚印。",
		date: "2026-09-02T21:15:00+08:00",
	},
	{
		author: "路过的猫",
		avatar: "/images/avatar.webp",
		content: "页面风格很有 Colorful 的味道。",
		date: "2026-09-02T16:40:00+08:00",
	},
	{
		author: "小北",
		avatar: "/images/avatar.webp",
		content: "从留言板路过，祝博客越写越好！",
		date: "2026-09-01T19:05:00+08:00",
	},
];

export const guestbookComments: GuestbookComment[] = import.meta.env.DEV
	? [...syncedGuestbookComments, ...localPreviewComments]
	: syncedGuestbookComments;
