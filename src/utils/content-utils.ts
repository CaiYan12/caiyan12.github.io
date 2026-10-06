import type { CollectionEntry } from "astro:content";
import dayjs from "dayjs";
import { getEffectiveComments } from "./site-stats";
import { seriesList, type SeriesMeta } from "../data/series";

export type Post = CollectionEntry<"posts">;

/** 是否为公开文章：排除草稿与私密帖 */
export function isPublicPost(post: Post): boolean {
	return !post.data.draft && !post.data.private;
}

/** 按置顶 + 发布时间倒序排序（对应 Emlog 首页排序） */
export function getSortedPosts(posts: Post[]): Post[] {
	return [...posts].filter(isPublicPost).sort((a, b) => {
		if (a.data.pinned !== b.data.pinned) {
			return a.data.pinned ? -1 : 1;
		}
		return (
			dayjs(b.data.published).valueOf() -
			dayjs(a.data.published).valueOf()
		);
	});
}

/** 获取全部标签（按文章数倒序） */
/* 并列名次必须显式兜底：只按 count 排序时，并列项顺序取决于 getCollection() 的
   返回顺序，而 Astro 5 与 6 的集合遍历顺序不同，会让侧栏标签云静默重排。
   这里用「最早引入该标签的文章时间 + 名称」构成全序，与遍历顺序无关 */
export function getTagList(posts: Post[]): { name: string; count: number }[] {
	const map = new Map<string, number>();
	const firstSeen = new Map<string, number>();
	for (const post of posts) {
		if (!isPublicPost(post)) continue;
		const at = dayjs(post.data.published).valueOf();
		for (const tag of post.data.tags) {
			map.set(tag, (map.get(tag) ?? 0) + 1);
			const prev = firstSeen.get(tag);
			if (prev === undefined || at < prev) firstSeen.set(tag, at);
		}
	}
	return [...map.entries()]
		.map(([name, count]) => ({ name, count }))
		.sort(
			(a, b) =>
				b.count - a.count ||
				firstSeen.get(a.name)! - firstSeen.get(b.name)! ||
				(a.name < b.name ? -1 : a.name > b.name ? 1 : 0),
		);
}

/** 获取全部分类 */
export function getCategoryList(
	posts: Post[],
): { name: string; count: number }[] {
	const map = new Map<string, number>();
	const firstSeen = new Map<string, number>();
	for (const post of posts) {
		if (!isPublicPost(post)) continue;
		const cat = post.data.category;
		if (!cat) continue;
		const at = dayjs(post.data.published).valueOf();
		map.set(cat, (map.get(cat) ?? 0) + 1);
		const prev = firstSeen.get(cat);
		if (prev === undefined || at < prev) firstSeen.set(cat, at);
	}
	// 同 getTagList：并列分类需要全序，否则顺序随 getCollection() 遍历顺序漂移
	return [...map.entries()]
		.map(([name, count]) => ({ name, count }))
		.sort(
			(a, b) =>
				b.count - a.count ||
				firstSeen.get(a.name)! - firstSeen.get(b.name)! ||
				(a.name < b.name ? -1 : a.name > b.name ? 1 : 0),
		);
}

/** 按年月归档（对应 Emlog record 缓存）。输入直接复用 getSortedPosts 的过滤与排序 */
export function getArchiveList(posts: Post[]) {
	const map = new Map<string, Post[]>();
	for (const post of getSortedPosts(posts)) {
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
				b.data.hotness * 100 +
				getEffectiveComments(b) -
				(a.data.hotness * 100 + getEffectiveComments(a));
			return (
				score || b.data.published.valueOf() - a.data.published.valueOf()
			);
		})
		.slice(0, limit);
}

/** 获取最新文章（getSortedPosts 已过滤草稿/私密帖） */
export function getNewPosts(posts: Post[], limit = 8): Post[] {
	return getSortedPosts(posts).slice(0, limit);
}

/** 获取相邻文章（对应 Emlog neighborLog） */
export function getNeighbors(
	posts: Post[],
	slug: string,
): { prev: Post | null; next: Post | null } {
	const sorted = getSortedPosts(posts);
	const idx = sorted.findIndex((p) => p.id === slug);
	if (idx === -1) return { prev: null, next: null };
	return {
		// 时间更早的为上一篇
		prev: idx + 1 < sorted.length ? sorted[idx + 1] : null,
		next: idx - 1 >= 0 ? sorted[idx - 1] : null,
	};
}

/**
 * 是否为文集成员：只看 frontmatter 有没有 `series` 属性（schema 已保证非空字符串），不查任何登记表。
 * 归属只有文章 frontmatter 一处记录；写了未登记的 slug 是内容错误（由构建期校验报错），
 * 不是「按非成员降级」的判定。
 */
export function isSeriesMember(post: Post): boolean {
	return post.data.series !== undefined;
}

/**
 * 解析文集元数据（名、量词、简介）。
 *
 * 从 `src/data/series.ts` 的登记表取值；查不到时回退为 `{ slug, name: slug, unit: "篇", description: "" }`。
 * 这条回退是纯防御：正常构建下不可达（`series` 值未登记是内容错误，由构建期校验响亮失败），
 * 它的存在只是为了让「有属性即属于某文集」在后半段也成立——不会因查不到文集名而整块不渲染。
 */
export function resolveSeriesMeta(slug: string): {
	slug: string;
	name: string;
	unit: string;
	description: string;
} {
	const meta = seriesList.find((s) => s.slug === slug);
	if (!meta) return { slug, name: slug, unit: "篇", description: "" };
	return {
		slug: meta.slug,
		name: meta.name,
		unit: meta.unit ?? "篇",
		description: meta.description,
	};
}

/**
 * 取某文集的全部（公开）成员，按 `seriesOrder` 升序。
 *
 * 分组按同 `series` 值，与 seriesList 无关；顺序由 `seriesOrder` 决定，不跟发布时间、不含 pinned。
 * `?? 0` 仅防御缺省，合法构建下不可达：schema 保证 `series` 非空字符串，series-integrity
 * 规则 3 保证「带 series 必带 seriesOrder」，缺失会在 `astro build` 时响亮失败。
 */
export function getSeriesMembers(posts: Post[], slug: string): Post[] {
	return getSortedPosts(posts)
		.filter((p) => p.data.series === slug)
		.sort((a, b) => (a.data.seriesOrder ?? 0) - (b.data.seriesOrder ?? 0));
}

/**
 * 解析文集封面：显式 `cover` → 按 `seriesOrder` 升序取首位带 `image` 的成员头图 → `null`。
 *
 * 刻意**不直接调用 `getCover()`**：它的兜底是 `/images/random/tb{n}.jpg`——由 slug 字符合计
 * 取模选出的无关缩略图（`public/images/random/` 下 40 张）。作为列表卡片缩略图无妨，但把一张
 * 与文集毫无关系的随机图当成「文集封面」是让无关图冒充封面，故这里落到 `null`，由调用侧不渲染。
 * 这条偏离是有意的，不要简化回 `getCover()`。
 *
 * `posts` 应为该文集的成员（调用侧已按 `seriesOrder` 升序排好或另行排序，这里再按 `seriesOrder`
 * 升序排一次以自足）；返回 `null` 表示无封面可用。
 */
export function resolveSeriesCover(
	series: SeriesMeta,
	posts: Post[],
): string | null {
	if (series.cover) return series.cover;
	const first = getSeriesMembers(posts, series.slug).find(
		(post) => post.data.image,
	);
	return first?.data.image || null;
}

/**
 * 获取文集内相邻文章。
 *
 * - 文章属于文集时：取同 `series` 值的成员（组内序列只用 `isPublicPost` 通过的文章，按 `seriesOrder` 升序），
 *   `prev` = 序号更小的一篇、`next` = 序号更大的一篇；组内首篇 `prev === null`、末篇 `next === null`，**不跨出文集**。
 * - 文章不属于任何文集时：把带 `series` 属性的文章从 `getSortedPosts` 结果里剔除，得到非成员序列，
 *   复用既有 `getNeighbors()` 取相邻项——非成员的时间线因此跳过整个文集。
 *
 * 返回的 `series`：非成员为 `null`；成员为 `{ slug, name, unit, index, total }`，`index` 为该文在组内升序序列中的 0 基位置，
 * `name` / `unit` 取自 `resolveSeriesMeta(slug)`（即登记元数据，未登记时回退为 slug / "篇"）。
 */
export function getSeriesNeighbors(
	posts: Post[],
	slug: string,
): {
	prev: Post | null;
	next: Post | null;
	series: {
		slug: string;
		name: string;
		unit: string;
		index: number;
		total: number;
	} | null;
} {
	const sorted = getSortedPosts(posts);
	const target = sorted.find((p) => p.id === slug);
	if (target && isSeriesMember(target)) {
		const seriesSlug = target.data.series!;
		const members = getSeriesMembers(sorted, seriesSlug);
		const idx = members.findIndex((p) => p.id === slug);
		const meta = resolveSeriesMeta(seriesSlug);
		return {
			// 序号更小的为上一篇
			prev: idx - 1 >= 0 ? members[idx - 1] : null,
			next: idx + 1 < members.length ? members[idx + 1] : null,
			series: {
				slug: seriesSlug,
				name: meta.name,
				unit: meta.unit,
				index: idx,
				total: members.length,
			},
		};
	}
	const nonMembers = sorted.filter((p) => !isSeriesMember(p));
	const { prev, next } = getNeighbors(nonMembers, slug);
	return { prev, next, series: null };
}

/** 归属两行里的链接（href + 可见文案） */
export interface SeriesNoteLink {
	href: string;
	label: string;
}

/** 文章页归属两行的纯内容模型：文案与链接分离，标记由调用侧渲染 */
export interface SeriesNote {
	/** 顶部一行：「本文属于《X》· 第 N / M <unit>」+ 「目录」链接 */
	top: { prefix: string; link: SeriesNoteLink };
	/** 末尾一行：非末章同顶部前缀且无链接；末章换成收尾文案 + 「看其它文集」链接 */
	bottom: { prefix: string; link: SeriesNoteLink | null };
}

/**
 * 由文集元数据拼出文章页顶部 / 末尾两行的文案与链接。
 *
 * `series.index` 是 0 基，**这里不加 1**：本站《看懂 AI 写的网站》自身从第〇章起
 * （`seriesOrder: 0`），于是第〇章渲染为「第 0 / 4 章」——这与书自身编号一致，是有意结果。
 * 分母 `series.total` 取已发布成员数，量词 `series.unit` 取登记表。
 * `isLast` 为真（组内没有下一章）时末尾行换成收尾文案，链接指向文集总览页 `/series/`。
 */
export function buildSeriesNote(
	series: {
		slug: string;
		name: string;
		unit: string;
		index: number;
		total: number;
	},
	isLast: boolean,
): SeriesNote {
	const belonging = `本文属于《${series.name}》· 第 ${series.index} / ${series.total} ${series.unit}`;
	return {
		top: {
			prefix: belonging,
			link: { href: `/series/${series.slug}/`, label: "目录" },
		},
		bottom: isLast
			? {
					prefix: `《${series.name}》已读完`,
					link: { href: "/series/", label: "看其它文集" },
				}
			: { prefix: belonging, link: null },
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
		([...post.id].reduce((acc, c) => acc + c.charCodeAt(0), 0) % 40) + 1;
	return `/images/random/tb${idx}.jpg`;
}
