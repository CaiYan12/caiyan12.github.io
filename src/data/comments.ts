/**
 * 最新评论数据（对应 Emlog emlog_comment 表的最新条目）
 * 静态化后评论由 Giscus 承载，此数据用于侧栏"最新评论"小部件展示历史评论
 */
export interface RecentComment {
	author: string;
	content: string;
	date: string; // YYYY-MM-DD HH:mm
	postSlug: string;
	postTitle: string;
}

export const recentComments: RecentComment[] = [];
