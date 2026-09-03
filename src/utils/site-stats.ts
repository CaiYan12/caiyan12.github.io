/**
 * Giscus 评论统计读取层（对应 Emlog 的 comnum 字段）：
 * 构建期把 Actions 同步的 Giscus 评论数合并进静态渲染。
 *
 * - comments：快照中存在该 slug 键（含显式 0）时采用远端值，否则回退 frontmatter 历史值
 * - 数据来自构建期直接导入的 src/data/site-stats.json（Actions 工作区原子覆盖后的构建产物），
 *   不读取文件系统，不向浏览器暴露任何密钥
 */
import baseline from "../data/site-stats.json" with { type: "json" };
import type { RecentComment } from "../data/comments";

export interface SiteStatsSnapshot {
	schemaVersion: 1;
	generatedAt: string;
	comments: Record<string, number>;
	recentComments?: RecentComment[];
}

export type PostStatInput = {
	id: string;
	data: { comments: number };
};

const snapshot = baseline as SiteStatsSnapshot;

const hasOwn = (record: Record<string, number>, key: string) =>
	Object.prototype.hasOwnProperty.call(record, key);

/** 非负整数归一化：负数与非有限值一律按 0 处理 */
const normalizeCount = (value: unknown): number => {
	if (typeof value !== "number" || !Number.isFinite(value)) return 0;
	return Math.max(0, Math.floor(value));
};

/** 依据给定快照解析有效评论数（快照有 key 即采用，显式 0 也是有效值） */
export function getEffectiveCommentsWith(
	stats: Pick<SiteStatsSnapshot, "comments">,
	post: PostStatInput,
): number {
	return hasOwn(stats.comments, post.id)
		? normalizeCount(stats.comments[post.id])
		: normalizeCount(post.data.comments);
}

/** 有效评论数：快照有 key 即采用（显式 0 也是有效值），无 key 回退 frontmatter */
export function getEffectiveComments(post: PostStatInput): number {
	return getEffectiveCommentsWith(snapshot, post);
}
