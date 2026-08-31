import type { CollectionEntry } from "astro:content";
import dayjs from "dayjs";

export type Post = CollectionEntry<"posts">;

/** 是否为公开文章：排除草稿与私密帖 */
export function isPublicPost(post: Post): boolean {
	return !post.data.draft && !post.data.private;
}

/** 按置顶 + 发布时间倒序排序（对应 Emlog 首页排序） */
export function getSortedPosts(posts: Post[]): Post[] {
	return [...posts]
		.filter(isPublicPost)
		.sort((a, b) => {
		if (a.data.pinned !== b.data.pinned) {
			return a.data.pinned ? -1 : 1;
		}
		return dayjs(b.data.published).valueOf() - dayjs(a.data.published).valueOf();
	});
}

/** 获取全部标签（按文章数倒序） */
export function getTagList(posts: Post[]): { name: string; count: number }[] {
	const map = new Map<string, number>();
	for (const post of posts) {
		if (!isPublicPost(post)) continue;
		for (const tag of post.data.tags) {
			map.set(tag, (map.get(tag) ?? 0) + 1);
		}
	}
	return [...map.entries()]
		.map(([name, count]) => ({ name, count }))
		.sort((a, b) => b.count - a.count);
}

/** 获取全部分类 */
export function getCategoryList(
	posts: Post[],
): { name: string; count: number }[] {
	const map = new Map<string, number>();
	for (const post of posts) {
		if (!isPublicPost(post)) continue;
		const cat = post.data.category;
		if (!cat) continue;
		map.set(cat, (map.get(cat) ?? 0) + 1);
	}
	return [...map.entries()]
		.map(([name, count]) => ({ name, count }))
		.sort((a, b) => b.count - a.count);
}

/** 按年月归档（对应 Emlog record 缓存） */
export function getArchiveList(posts: Post[]) {
	const map = new Map<string, Post[]>();
	for (const post of getSortedPosts(posts)) {
		if (post.data.draft) continue;
		const key = dayjs(post.data.published).format("YYYY年M月");
		if (!map.has(key)) map.set(key, []);
		map.get(key)!.push(post);
	}
	return [...map.entries()];
}

/** 获取热门文章（按 hotness 星级 + 评论数，同分按发布时间倒序） */
export function getHotPosts(posts: Post[], limit = 6): Post[] {
	return [...posts]
		.filter(isPublicPost)
		.sort((a, b) => {
			const score =
				(b.data.hotness * 100 + b.data.comments) -
				(a.data.hotness * 100 + a.data.comments);
			return score || b.data.published.valueOf() - a.data.published.valueOf();
		})
		.slice(0, limit);
}

/** 获取最新文章 */
export function getNewPosts(posts: Post[], limit = 8): Post[] {
	return getSortedPosts(posts)
		.filter((p) => !p.data.draft)
		.slice(0, limit);
}

/** 获取相邻文章（对应 Emlog neighborLog） */
export function getNeighbors(
	posts: Post[],
	slug: string,
): { prev: Post | null; next: Post | null } {
	const sorted = getSortedPosts(posts).filter((p) => !p.data.draft);
	const idx = sorted.findIndex((p) => p.id === slug);
	if (idx === -1) return { prev: null, next: null };
	return {
		// 时间更早的为上一篇
		prev: idx + 1 < sorted.length ? sorted[idx + 1] : null,
		next: idx - 1 >= 0 ? sorted[idx - 1] : null,
	};
}

/** 判断是否为近期更新（15 天内，对应 log_list 的 new-label） */
export function isNewPost(post: Post): boolean {
	return (
		!post.data.pinned &&
		dayjs().diff(dayjs(post.data.published), "day") <= 15
	);
}

/** 从正文提取纯文本摘要（兜底，正常由 remark-excerpt 注入） */
export function getExcerpt(post: Post, length = 120): string {
	if (post.data.excerpt) return post.data.excerpt;
	const text = (post.body ?? "")
		.replace(/```[\s\S]*?```/g, " ")
		.replace(/`([^`]+)`/g, "$1")
		.replace(/:::[a-z]+.*$|^:::$|^::[a-z]+\{[^}]*\}$/gim, " ")
		.replace(/!?\[([^\]]*)\]\(([^)\s]+)\)/g, "$1")
		.replace(/:([a-z-]+)\[([^\]]*)\]/g, "$2")
		.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
		.replace(/<[^>]+>/g, "")
		.replace(/^\s{0,3}(?:#{1,6}|>|[-+*]|\d+[.)])\s+/gm, "")
		.replace(/[*_~]+/g, "")
		.replace(/\s+/g, " ")
		.trim();
	return text.length > length ? text.slice(0, length) + "…" : text;
}

/** 获取文章封面图（优先 frontmatter image，兜底随机缩略图，对应 getThumbnail） */
export function getCover(post: Post): string {
	if (post.data.image) return post.data.image;
	// 用 slug 的 hash 稳定地选一张随机缩略图（避免每次构建随机）
	const idx =
		[...post.id].reduce((acc, c) => acc + c.charCodeAt(0), 0) % 40 + 1;
	return `/images/random/tb${idx}.jpg`;
}
