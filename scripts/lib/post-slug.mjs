// 文章 URL 规范的单一来源（AGENTS.md「文章 URL 硬规则」）：目录名即 URL slug，
// 必须是 14 位数字 yyyymmddhhmmss。此前这条规则以 5 份正则散在
// validate-post-slugs.mjs、new-post.mjs、sync-site-stats.mjs（含派生的
// `posts/<slug>/` 标题反解）与 sync-site-stats.test.mjs 里，改一次要同步五处。
//
// 本模块刻意不碰文件系统：调用方把 `readdir(..., {withFileTypes:true})` 的结果交进来。
// 一是让同步（validate / new-post）与异步（sync-site-stats 用 node:fs/promises）两侧
// 共用同一份判定，二是 sync-site-stats.mjs 在 deploy.yml 里跑在 `pnpm install` 之前，
// 这条链路上的脚本只能依赖 Node 内置模块。
const SLUG_BODY = "\\d{14}";

/** 目录名 → slug 的唯一那份正则 */
export const POST_SLUG_PATTERN = new RegExp(`^${SLUG_BODY}$`, "u");

/** Giscus Discussion 标题约定 `posts/<slug>/`，从同一条规则派生，不再各写一遍 */
export const DISCUSSION_TITLE_PATTERN = new RegExp(
	`^posts\\/(${SLUG_BODY})\\/$`,
	"u",
);

/** 是否为合法的文章 slug（非字符串一律 false，免得调用方各自做类型守卫） */
export function isPostSlug(value) {
	return typeof value === "string" && POST_SLUG_PATTERN.test(value);
}

/**
 * 从 readdir 的 dirents 里取排序后的合法 slug 列表。
 * 排序沿用两侧原有行为（字典序），因为「字典序」本身是 sync-site-stats 的契约之一。
 */
export function listPostSlugs(entries) {
	return entries
		.filter((entry) => entry.isDirectory() && isPostSlug(entry.name))
		.map((entry) => entry.name)
		.sort();
}

/** Discussion 标题 → slug；不匹配返回 null */
export function slugFromDiscussionTitle(title) {
	const matched = DISCUSSION_TITLE_PATTERN.exec(title ?? "");
	return matched ? matched[1] : null;
}
