/**
 * 文集（series）读侧 module：组内序列、封面、元数据的唯一出口。
 *
 * 分工：登记表在 `src/data/series.ts`（只写），构建期校验在 `src/utils/series-integrity.ts`（只查），
 * 本模块只读。总览页、目录页、分页与侧栏目录都从这里取数，不再各自拼接
 * 「过滤 → 排序 → 取成员 → 解析封面」管线；组内序列的定义见 GLOSSARY「组内序列」。
 */
import type { CollectionEntry } from "astro:content";
import { seriesList, type SeriesMeta } from "../data/series";
import { getSortedPosts, type Post } from "./content-utils";

export type { Post };

/** 量词缺省：登记表未写 unit 时的全站唯一缺省值 */
const DEFAULT_UNIT = "篇";

/** 文集读模型：登记元数据（unit 已补缺省）+ 组内序列 + 封面 */
export interface SeriesView {
	/** 登记元数据；unit 已补缺省，调用方不必再写 `?? "篇"` */
	series: { slug: string; name: string; unit: string; description: string };
	/** 组内序列：成员排除草稿与私密帖后按 seriesOrder 升序 */
	members: Post[];
	/** 文集封面：显式 cover → 组内序列首位带 image 的成员头图 → null */
	cover: string | null;
}

function normalizeSeriesMeta(meta: SeriesMeta) {
	return {
		slug: meta.slug,
		name: meta.name,
		unit: meta.unit ?? DEFAULT_UNIT,
		description: meta.description,
	};
}

/**
 * 组内序列与读模型从同一份时间线一次派生：members 排好序后，封面、计数都从它算，
 * 不存在「调用方备了一份、实现又重算一遍」的第二条路径。
 */
function viewOf(meta: SeriesMeta, sorted: Post[]): SeriesView {
	const members = membersOf(sorted, meta.slug);
	return {
		series: normalizeSeriesMeta(meta),
		members,
		cover: resolveSeriesCover(meta, members),
	};
}

/**
 * 解析文集封面：显式 `cover` → 组内序列首位带 `image` 的成员头图 → `null`。
 *
 * `members` 必须是 `getSeriesView` / `listSeries` / 组内序列给出的已排成员——本函数信任输入，
 * 不再自行重排。刻意**不调用 `getCover()`**：它的兜底是由 slug 字符取模选出的无关缩略图
 * （`/images/random/tb{n}.jpg`），把一张与文集毫无关系的随机图当「文集封面」是让无关图冒充
 * 封面，故落到 `null` 由调用侧不渲染。这条偏离是有意的，不要简化回 `getCover()`（ADR 0007）。
 */
export function resolveSeriesCover(
	meta: SeriesMeta,
	members: Post[],
): string | null {
	if (meta.cover) return meta.cover;
	return members.find((post) => post.data.image)?.data.image || null;
}

/**
 * 组内序列推导原语：从「置顶 → 发布时间倒序」的公开时间线里滤出同 `series` 值的成员，
 * 按 `seriesOrder` 升序排列。
 *
 * 输入必须是 `getSortedPosts` 的产物——本原语不再重跑时间线排序（view、总览、相邻导航
 * 共用同一份已排序列，一条调用链路里 `getSortedPosts` 至多跑一遍）。分组按同 `series` 值，
 * 与 seriesList 无关；顺序由 `seriesOrder` 决定，不跟发布时间、不含 pinned。
 * `?? 0` 仅防御缺省，合法构建下不可达：schema 保证 `series` 非空字符串，series-integrity
 * 规则 3 保证「带 series 必带 seriesOrder」，缺失会在 `astro build` 时响亮失败。
 */
function membersOf(sorted: Post[], seriesSlug: string): Post[] {
	return sorted
		.filter((p) => p.data.series === seriesSlug)
		.sort((a, b) => (a.data.seriesOrder ?? 0) - (b.data.seriesOrder ?? 0));
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
	return meta
		? normalizeSeriesMeta(meta)
		: { slug, name: slug, unit: DEFAULT_UNIT, description: "" };
}

/**
 * 文集总览：按登记表顺序（作者意图本身是全序）给出每个文集的读模型与成员数。
 */
export function listSeries(posts: Post[]): (SeriesView & { count: number })[] {
	const sorted = getSortedPosts(posts);
	return seriesList.map((meta) => {
		const view = viewOf(meta, sorted);
		return { ...view, count: view.members.length };
	});
}

/**
 * 按文集 slug 取读模型。
 *
 * 未登记的 slug 走 `resolveSeriesMeta` 同款纯防御回退（正常构建下不可达），因此本函数
 * 总有值、不设 null 分支——这让封面回退语义可以经任意 slug 测试咬住（ADR 0007 要求
 * 「不落回 getCover 随机图」有测试守着）。
 */
export function getSeriesView(posts: Post[], slug: string): SeriesView {
	const meta = seriesList.find((s) => s.slug === slug);
	return viewOf(
		meta ?? { slug, name: slug, description: "", unit: DEFAULT_UNIT },
		getSortedPosts(posts),
	);
}

/**
 * 按文章 id 反查其所属文集的读模型；侧栏文集目录专用。
 *
 * 「谁是成员」的权威出口：文章不在公开时间线（草稿/私密帖被 getSortedPosts 过滤）、
 * 不属于任何文集、或所属 slug 未登记时返回 null——消费方不必再拿相邻导航函数的
 * 返回字段当成员判定谓词用。
 */
export function getSeriesViewForPost(
	posts: Post[],
	postId: string,
): SeriesView | null {
	const sorted = getSortedPosts(posts);
	const seriesSlug = sorted.find((p) => p.id === postId)?.data.series;
	const meta = seriesSlug
		? seriesList.find((s) => s.slug === seriesSlug)
		: undefined;
	if (!meta) return null;
	return viewOf(meta, sorted);
}

/**
 * 获取文集内相邻文章。
 *
 * - 文章属于文集时：取同 `series` 值的成员（组内序列只用 `isPublicPost` 通过的文章，按 `seriesOrder` 升序），
 *   `prev` = 序号更小的一篇、`next` = 序号更大的一篇；组内首篇 `prev === null`、末篇 `next === null`，**不跨出文集**。
 * - 文章不属于任何文集时：把带 `series` 属性的文章从 `getSortedPosts` 结果里剔除，得到非成员序列，
 *   在其上直接取 ±1 相邻——非成员的时间线因此跳过整个文集。
 *
 * 两个分支共用入口处的那一次 `getSortedPosts`（组内经 `membersOf` 原语，非成员内联 ±1），
 * 不再像旧实现那样在 `getSeriesMembers` / `getNeighbors` 内部各再排一遍。
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
		const members = membersOf(sorted, seriesSlug);
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
	// 非成员分支：语义同 content-utils 的 getNeighbors（列表最新在前，prev = 更早 = 序号 +1），
	// 内联以免其内部对剔完的序列再跑一遍时间线排序。
	const nonMembers = sorted.filter((p) => !isSeriesMember(p));
	const idx = nonMembers.findIndex((p) => p.id === slug);
	if (idx === -1) return { prev: null, next: null, series: null };
	return {
		// 时间更早的为上一篇
		prev: idx + 1 < nonMembers.length ? nonMembers[idx + 1] : null,
		next: idx - 1 >= 0 ? nonMembers[idx - 1] : null,
		series: null,
	};
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
