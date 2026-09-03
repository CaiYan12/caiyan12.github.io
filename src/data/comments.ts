import siteStats from "./site-stats.json" with { type: "json" };

/** 构建期从 Giscus 同步的侧栏最新评论条目。 */
export interface RecentComment {
	author: string;
	avatar?: string;
	content: string;
	date: string; // ISO 8601
	postSlug: string;
	postTitle: string;
}

const snapshot = siteStats as { recentComments?: RecentComment[] };

/** 本地基线可能尚未同步，缺失时保持安全的空状态。 */
const syncedComments: RecentComment[] = Array.isArray(snapshot.recentComments)
	? snapshot.recentComments
	: [];

/**
 * 临时本地预览数据：仅 pnpm dev 使用，生产构建仍只读取 Giscus 快照。
 * 删除此数组即可恢复只展示真实评论的本地开发状态。
 */
const localPreviewComments: RecentComment[] = [
	{
		author: "林木",
		avatar: "/images/avatar.webp",
		content: "这个侧栏气泡效果很有 Colorful 的味道！",
		date: "2026-09-03T08:50:00+08:00",
		postSlug: "20260831000000",
		postTitle:
			"Windows 上的本地项目控制面：Windy Project Manager 的 Tauri 架构、离线扫描与可携带数据设计",
	},
	{
		author: "Miko",
		avatar: "/images/avatar.webp",
		content: "文章里的离线扫描思路很实用，收藏了。",
		date: "2026-09-02T21:15:00+08:00",
		postSlug: "20260402161000",
		postTitle: "《数据库原理》作业5：关系理论1",
	},
	{
		author: "路过的猫",
		avatar: "/images/avatar.webp",
		content: "关系模式规范化的解释清楚易懂。",
		date: "2026-09-02T16:40:00+08:00",
		postSlug: "20260320000000",
		postTitle: "“费用贬值”下企业在不同生产阶段的生产决策",
	},
	{
		author: "小北",
		avatar: "/images/avatar.webp",
		content: "这份复习资料正好用得上，谢谢分享！",
		date: "2026-09-01T19:05:00+08:00",
		postSlug: "20260318161300",
		postTitle: "《Linux操作系统》课程练习题2：基本概念",
	},
	{
		author: "echo",
		avatar: "/images/avatar.webp",
		content: "测试一条较长的评论内容，确认侧栏会按原主题样式截断显示。",
		date: "2026-09-01T10:20:00+08:00",
		postSlug: "20260318161900",
		postTitle: "《Linux操作系统》课程练习题3：基本操作",
	},
	{
		author: "阿青",
		avatar: "/images/avatar.webp",
		content: "从侧栏直接切换评论批次，很方便。",
		date: "2026-08-31T18:30:00+08:00",
		postSlug: "20260831000000",
		postTitle:
			"Windows 上的本地项目控制面：Windy Project Manager 的 Tauri 架构、离线扫描与可携带数据设计",
	},
];

export const recentComments: RecentComment[] = import.meta.env.DEV
	? [...syncedComments, ...localPreviewComments]
	: syncedComments;
