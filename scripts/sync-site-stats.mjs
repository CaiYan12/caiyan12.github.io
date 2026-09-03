// Giscus 评论构建期同步脚本：
// 1) 枚举 src/content/posts 下匹配 ^\d{14}$ 的直接子目录作为文章 slug（字典序排序）；
// 2) 用 GitHub GraphQL 分页拉取 Announcements 分类 Discussions，
//    按 title "posts/<slug>/" 精确匹配文章；guestbook 单独拉取其留言，
//    评论数口径 = 顶层 comments.totalCount + 所有回复 replies.totalCount；
//    同步匹配文章的最新评论作者、纯文本、时间与文章信息，供侧栏静态渲染；
//    guestbook 留言写入独立 guestbookComments 通道，不计入文章吐槽数或 recentComments；
//    没有 Discussion 的文章不写入 key（消费层回退 frontmatter 历史值）；
// 3) 内存组装快照 → 校验 → 原子写输出文件（tmp + rename）；
//    GitHub 来源失败：输出文件字节不变，进程以非零码退出（fail-closed，阻止本次部署）。
//
// 令牌解析顺序：GITHUB_TOKEN → GH_TOKEN → `gh auth token`；全部缺失时报错退出；
// 绝不打印令牌。测试可注入 fetchImpl / outputPath / env；
// 环境变量 SITE_STATS_OUTPUT 可覆盖输出路径（workflow 不设置，用默认路径）。

import fs from "node:fs/promises";
import path from "node:path";
import { execSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const SLUG_RE = /^\d{14}$/;
const DISCUSSION_TITLE_RE = /^posts\/(\d{14})\/$/;
const GUESTBOOK_DISCUSSION_TITLE = "guestbook";
const RECENT_COMMENTS_DISPLAY_LIMIT = 5;
const RECENT_COMMENTS_POOL_LIMIT = 20;
const GUESTBOOK_COMMENTS_LIMIT = 20;
const DELETED_AUTHOR_LABEL = "已删除用户";
const FALLBACK_AVATAR = "/images/avatar.webp";
const REPO_ROOT = path.resolve(import.meta.dirname, "..");
const DEFAULT_OUTPUT = path.join(REPO_ROOT, "src", "data", "site-stats.json");
const GISCUS_CONFIG_FILE = path.join(
	REPO_ROOT,
	"src",
	"data",
	"giscus-sync.json",
);
const POSTS_DIR = path.join(REPO_ROOT, "src", "content", "posts");
const GRAPHQL_ENDPOINT = "https://api.github.com/graphql";

const DISCUSSIONS_QUERY = `query($owner: String!, $name: String!, $categoryId: ID!, $after: String) {
  repository(owner: $owner, name: $name) {
    discussions(first: 100, after: $after, categoryId: $categoryId) {
      nodes { id title }
      pageInfo { hasNextPage endCursor }
    }
  }
}`;

const COMMENTS_QUERY = `query($id: ID!, $after: String) {
  node(id: $id) {
    ... on Discussion {
      comments(first: 100, after: $after) {
        totalCount
		nodes {
			replies { totalCount }
			author { login avatarUrl(size: 40) }
			bodyText
			createdAt
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
}`;

/** 顶层评论数 + 所有回复数（pages 为同一 comments connection 的全部分页） */
export function countDiscussionComments(discussionCommentPages) {
	if (
		!Array.isArray(discussionCommentPages) ||
		discussionCommentPages.length === 0
	) {
		throw new Error("comment pages must be a non-empty array");
	}
	const totalCount = discussionCommentPages[0]?.totalCount;
	if (!Number.isInteger(totalCount) || totalCount < 0) {
		throw new Error("invalid comments.totalCount");
	}
	let replies = 0;
	for (const page of discussionCommentPages) {
		if (!page || typeof page !== "object" || Array.isArray(page)) {
			throw new Error("malformed comment connection page");
		}
		if (!Number.isInteger(page.totalCount) || page.totalCount < 0) {
			throw new Error("invalid comments.totalCount");
		}
		if (page.totalCount !== totalCount) {
			throw new Error("inconsistent comments.totalCount");
		}
		if (!Array.isArray(page.nodes)) {
			throw new Error("malformed comment connection nodes");
		}
		for (const node of page.nodes) {
			if (!node || typeof node !== "object" || Array.isArray(node)) {
				throw new Error("malformed comment node");
			}
			const replyCount = node.replies?.totalCount;
			if (!Number.isInteger(replyCount) || replyCount < 0) {
				throw new Error("invalid replies.totalCount");
			}
			replies += replyCount;
		}
	}
	return totalCount + replies;
}

const SLUG_SET_ERROR = "snapshot keys must be current article slugs";

function parseFrontmatterTitle(value, slug) {
	const raw = value.trim();
	if (!raw) throw new Error(`missing post title for ${slug}`);

	if (raw.startsWith('"')) {
		if (!raw.endsWith('"'))
			throw new Error(`invalid post title for ${slug}`);
		try {
			const parsed = JSON.parse(raw);
			if (typeof parsed === "string" && parsed.trim())
				return parsed.trim();
		} catch {
			// Fall through to the same explicit validation error below.
		}
		throw new Error(`invalid post title for ${slug}`);
	}

	if (raw.startsWith("'")) {
		if (!raw.endsWith("'"))
			throw new Error(`invalid post title for ${slug}`);
		const parsed = raw.slice(1, -1).replace(/''/g, "'").trim();
		if (parsed) return parsed;
		throw new Error(`missing post title for ${slug}`);
	}

	return raw;
}

async function readPostTitles(slugs) {
	const titles = new Map();
	for (const slug of slugs) {
		const file = path.join(POSTS_DIR, slug, "index.md");
		const source = await fs.readFile(file, "utf-8");
		const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(
			source,
		);
		const titleLine = frontmatter?.[1].match(/^title:\s*(.+?)\s*$/m);
		if (!titleLine) throw new Error(`missing post title for ${slug}`);
		titles.set(slug, parseFrontmatterTitle(titleLine[1], slug));
	}
	return titles;
}

function validateRecentComment(comment, index, slugSet) {
	const label = `recentComments[${index}]`;
	if (!comment || typeof comment !== "object" || Array.isArray(comment)) {
		throw new Error(`${label} must be an object`);
	}
	for (const field of ["author", "content", "date", "postTitle"]) {
		if (
			typeof comment[field] !== "string" ||
			comment[field].trim().length === 0
		) {
			throw new Error(`${label}.${field} must be a non-empty string`);
		}
	}
	if (
		Object.prototype.hasOwnProperty.call(comment, "avatar") &&
		(typeof comment.avatar !== "string" ||
			comment.avatar.trim().length === 0)
	) {
		throw new Error(`${label}.avatar must be a non-empty string`);
	}
	if (
		typeof comment.postSlug !== "string" ||
		!SLUG_RE.test(comment.postSlug) ||
		(slugSet && !slugSet.has(comment.postSlug))
	) {
		throw new Error(`${label}.postSlug must be a current article slug`);
	}
	if (!Number.isFinite(Date.parse(comment.date))) {
		throw new Error(`${label}.date must be a valid date`);
	}
}

function validateGuestbookComment(comment, index) {
	const label = `guestbookComments[${index}]`;
	if (!comment || typeof comment !== "object" || Array.isArray(comment)) {
		throw new Error(`${label} must be an object`);
	}
	for (const field of ["author", "content", "date"]) {
		if (
			typeof comment[field] !== "string" ||
			comment[field].trim().length === 0
		) {
			throw new Error(`${label}.${field} must be a non-empty string`);
		}
	}
	if (
		Object.prototype.hasOwnProperty.call(comment, "avatar") &&
		(typeof comment.avatar !== "string" ||
			comment.avatar.trim().length === 0)
	) {
		throw new Error(`${label}.avatar must be a non-empty string`);
	}
	if (!Number.isFinite(Date.parse(comment.date))) {
		throw new Error(`${label}.date must be a valid date`);
	}
}

/** 用 Fisher–Yates 从评论池中无偏随机抽取最多 limit 条评论。 */
export function selectRandomComments(
	comments,
	randomImpl = Math.random,
	limit = RECENT_COMMENTS_DISPLAY_LIMIT,
) {
	if (!Array.isArray(comments)) throw new Error("comments must be an array");
	if (!Number.isInteger(limit) || limit < 0) {
		throw new Error("recent comments limit must be a non-negative integer");
	}
	if (typeof randomImpl !== "function") {
		throw new Error("randomImpl must be a function");
	}

	const shuffled = [...comments];
	for (let i = shuffled.length - 1; i > 0; i -= 1) {
		const randomValue = randomImpl();
		if (
			!Number.isFinite(randomValue) ||
			randomValue < 0 ||
			randomValue >= 1
		) {
			throw new Error("randomImpl must return a value in [0, 1)");
		}
		const j = Math.floor(randomValue * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled.slice(0, limit);
}

function toMap(value) {
	if (value instanceof Map) return value;
	if (value && typeof value === "object") {
		return new Map(Object.entries(value));
	}
	throw new Error("expected a Map or plain object");
}

/** 组装并校验快照：key 必须是当前文章 slug，计数必须为非负整数 */
export function buildSnapshot({
	slugs,
	discussions,
	recentComments = [],
	guestbookComments = [],
	generatedAt,
}) {
	if (!Array.isArray(slugs)) throw new Error("slugs must be an array");
	for (const slug of slugs) {
		if (typeof slug !== "string" || !SLUG_RE.test(slug)) {
			throw new Error(`invalid article slug: ${String(slug)}`);
		}
	}
	const slugSet = new Set(slugs);
	if (typeof generatedAt !== "string" || generatedAt.length === 0) {
		throw new Error("generatedAt must be a non-empty string");
	}
	const comments = {};
	for (const [slug, count] of toMap(discussions)) {
		if (!SLUG_RE.test(slug) || !slugSet.has(slug)) {
			throw new Error(`${SLUG_SET_ERROR}: ${String(slug)}`);
		}
		if (!Number.isInteger(count) || count < 0) {
			throw new Error(`invalid comment count for ${slug}`);
		}
		comments[slug] = count;
	}
	if (!Array.isArray(recentComments)) {
		throw new Error("recentComments must be an array");
	}
	recentComments.forEach((comment, index) =>
		validateRecentComment(comment, index, slugSet),
	);
	if (!Array.isArray(guestbookComments)) {
		throw new Error("guestbookComments must be an array");
	}
	guestbookComments.forEach((comment, index) =>
		validateGuestbookComment(comment, index),
	);
	return {
		schemaVersion: 1,
		generatedAt,
		comments,
		recentComments,
		guestbookComments,
	};
}

/** 写盘前的最终校验（快照结构与每个 key、每个计数） */
function validateSnapshot(snapshot) {
	if (snapshot?.schemaVersion !== 1) {
		throw new Error("snapshot schemaVersion must be 1");
	}
	if (
		typeof snapshot.generatedAt !== "string" ||
		snapshot.generatedAt.length === 0
	) {
		throw new Error("snapshot.generatedAt must be a non-empty string");
	}
	for (const section of ["comments"]) {
		const map = snapshot[section];
		if (!map || typeof map !== "object" || Array.isArray(map)) {
			throw new Error(`snapshot.${section} must be an object`);
		}
		for (const [slug, count] of Object.entries(map)) {
			if (!SLUG_RE.test(slug)) {
				throw new Error(`snapshot.${section} has invalid key: ${slug}`);
			}
			if (!Number.isInteger(count) || count < 0) {
				throw new Error(
					`snapshot.${section} has invalid count for ${slug}`,
				);
			}
		}
	}
	if (!Array.isArray(snapshot.recentComments)) {
		throw new Error("snapshot.recentComments must be an array");
	}
	snapshot.recentComments.forEach((comment, index) =>
		validateRecentComment(comment, index),
	);
	if (!Array.isArray(snapshot.guestbookComments)) {
		throw new Error("snapshot.guestbookComments must be an array");
	}
	snapshot.guestbookComments.forEach((comment, index) =>
		validateGuestbookComment(comment, index),
	);
	return snapshot;
}

function resolveToken(env) {
	const fromEnv = env.GITHUB_TOKEN || env.GH_TOKEN;
	if (fromEnv) return fromEnv;
	try {
		const out = execSync("gh auth token", {
			encoding: "utf-8",
			stdio: ["ignore", "pipe", "ignore"],
		}).trim();
		if (out) return out;
	} catch {
		// gh CLI 不可用时继续走报错分支
	}
	throw new Error(
		"No GitHub token available: set GITHUB_TOKEN (or GH_TOKEN), or authenticate the gh CLI",
	);
}

function splitRepo(repo) {
	const parts = typeof repo === "string" ? repo.split("/") : [];
	if (parts.length !== 2 || !parts[0] || !parts[1]) {
		throw new Error(
			'Invalid giscus-sync.json repo: expected exactly "owner/name"',
		);
	}
	return parts;
}

function validateConnection(connection, label) {
	if (
		!connection ||
		typeof connection !== "object" ||
		Array.isArray(connection)
	) {
		throw new Error(`malformed ${label} connection`);
	}
	if (!Array.isArray(connection.nodes)) {
		throw new Error(
			`malformed ${label} connection: nodes must be an array`,
		);
	}
	const pageInfo = connection.pageInfo;
	if (!pageInfo || typeof pageInfo !== "object" || Array.isArray(pageInfo)) {
		throw new Error(`malformed ${label} connection: missing pageInfo`);
	}
	if (typeof pageInfo.hasNextPage !== "boolean") {
		throw new Error(
			`malformed ${label} connection: hasNextPage must be boolean`,
		);
	}
	if (!Object.prototype.hasOwnProperty.call(pageInfo, "endCursor")) {
		throw new Error(`malformed ${label} connection: missing cursor`);
	}
	if (
		pageInfo.endCursor !== null &&
		(typeof pageInfo.endCursor !== "string" ||
			pageInfo.endCursor.trim().length === 0)
	) {
		throw new Error(`malformed ${label} connection: invalid cursor`);
	}
	if (
		pageInfo.hasNextPage &&
		(typeof pageInfo.endCursor !== "string" ||
			pageInfo.endCursor.trim().length === 0)
	) {
		throw new Error(`malformed ${label} connection: missing cursor`);
	}
	return pageInfo;
}

function nextConnectionCursor(pageInfo, after, label, seenCursors) {
	if (!pageInfo.hasNextPage) return null;
	if (pageInfo.endCursor === after) {
		throw new Error(
			`malformed ${label} connection: cursor did not advance`,
		);
	}
	if (seenCursors.has(pageInfo.endCursor)) {
		throw new Error(`malformed ${label} connection: cursor already seen`);
	}
	seenCursors.add(pageInfo.endCursor);
	return pageInfo.endCursor;
}

function validateDiscussionNode(node) {
	if (!node || typeof node !== "object" || Array.isArray(node)) {
		throw new Error("malformed Discussion node");
	}
	if (typeof node.title !== "string") {
		throw new Error("malformed Discussion node: missing title");
	}
	if (typeof node.id !== "string" || node.id.trim().length === 0) {
		throw new Error("malformed Discussion node: unusable Discussion id");
	}
}

function validateDiscussionCommentNode(node, slug) {
	if (!node || typeof node !== "object" || Array.isArray(node)) {
		throw new Error(`malformed comment node for ${slug}`);
	}
	if (!Object.prototype.hasOwnProperty.call(node, "author")) {
		throw new Error(`malformed comment node for ${slug}: missing author`);
	}
	if (
		node.author !== null &&
		(typeof node.author !== "object" ||
			Array.isArray(node.author) ||
			typeof node.author.login !== "string" ||
			node.author.login.trim().length === 0 ||
			typeof node.author.avatarUrl !== "string" ||
			node.author.avatarUrl.trim().length === 0)
	) {
		throw new Error(`malformed comment node for ${slug}: invalid author`);
	}
	if (typeof node.bodyText !== "string") {
		throw new Error(`malformed comment node for ${slug}: missing bodyText`);
	}
	if (
		typeof node.createdAt !== "string" ||
		!Number.isFinite(Date.parse(node.createdAt))
	) {
		throw new Error(
			`malformed comment node for ${slug}: invalid createdAt`,
		);
	}
}

function toRecentComment(node, slug, postTitle) {
	validateDiscussionCommentNode(node, slug);
	return {
		author: node.author?.login?.trim() ?? DELETED_AUTHOR_LABEL,
		avatar: node.author?.avatarUrl?.trim() ?? FALLBACK_AVATAR,
		content: node.bodyText.trim(),
		date: node.createdAt,
		postSlug: slug,
		postTitle,
	};
}

function toGuestbookComment(node, index) {
	validateDiscussionCommentNode(node, GUESTBOOK_DISCUSSION_TITLE);
	const comment = {
		author: node.author?.login?.trim() ?? DELETED_AUTHOR_LABEL,
		avatar: node.author?.avatarUrl?.trim() ?? FALLBACK_AVATAR,
		content: node.bodyText.trim(),
		date: node.createdAt,
	};
	validateGuestbookComment(comment, index);
	return comment;
}

async function githubGraphQL(fetchImpl, token, query, variables) {
	const res = await fetchImpl(GRAPHQL_ENDPOINT, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
			Accept: "application/vnd.github+json",
			"User-Agent": "myblog-giscus-sync",
		},
		body: JSON.stringify({ query, variables }),
	});
	if (!res.ok) {
		throw new Error(`GitHub GraphQL HTTP ${res.status}`);
	}
	let body;
	try {
		body = await res.json();
	} catch {
		throw new Error("GitHub GraphQL returned malformed JSON");
	}
	if (Array.isArray(body?.errors) && body.errors.length > 0) {
		const messages = body.errors.map((e) => e?.message ?? "unknown error");
		throw new Error(`GitHub GraphQL errors: ${messages.join("; ")}`);
	}
	return body?.data;
}

async function fetchCommentConnectionPages(
	fetchImpl,
	token,
	id,
	connectionLabel,
	missingSuffix = "",
) {
	const pages = [];
	const nodes = [];
	let after = null;
	const seenCursors = new Set();
	while (true) {
		const data = await githubGraphQL(fetchImpl, token, COMMENTS_QUERY, {
			id,
			after,
		});
		const conn = data?.node?.comments;
		if (!conn) {
			throw new Error(
				`GitHub GraphQL: missing ${connectionLabel} connection${missingSuffix}`,
			);
		}
		const pageInfo = validateConnection(conn, connectionLabel);
		nodes.push(...conn.nodes);
		pages.push(conn);
		const next = nextConnectionCursor(
			pageInfo,
			after,
			connectionLabel,
			seenCursors,
		);
		if (next !== null) {
			after = next;
		} else {
			break;
		}
	}
	return { pages, nodes };
}

export async function syncSiteStats({
	fetchImpl = globalThis.fetch,
	outputPath,
	env = process.env,
	randomImpl = Math.random,
} = {}) {
	const output = path.resolve(
		outputPath ?? env.SITE_STATS_OUTPUT ?? DEFAULT_OUTPUT,
	);

	// 前置配置校验（任何网络请求之前 fail-fast）
	const giscus = JSON.parse(await fs.readFile(GISCUS_CONFIG_FILE, "utf-8"));
	const [owner, name] = splitRepo(giscus.repo);
	if (typeof giscus.categoryId !== "string" || !giscus.categoryId) {
		throw new Error("Invalid giscus-sync.json: missing categoryId");
	}
	const token = resolveToken(env);

	// 文章 slug 枚举（14 位目录名，字典序）
	const entries = await fs.readdir(POSTS_DIR, { withFileTypes: true });
	const slugs = entries
		.filter((e) => e.isDirectory() && SLUG_RE.test(e.name))
		.map((e) => e.name)
		.sort();
	const slugSet = new Set(slugs);
	const postTitles = await readPostTitles(slugs);

	// Discussions 游标分页
	const matchedIds = new Map();
	let guestbookId = null;
	let after = null;
	const seenDiscussionCursors = new Set();
	while (true) {
		const data = await githubGraphQL(fetchImpl, token, DISCUSSIONS_QUERY, {
			owner,
			name,
			categoryId: giscus.categoryId,
			after,
		});
		const conn = data?.repository?.discussions;
		if (!conn) {
			throw new Error("GitHub GraphQL: missing repository.discussions");
		}
		const pageInfo = validateConnection(conn, "Discussions");
		for (const node of conn.nodes) {
			validateDiscussionNode(node);
			if (node.title === GUESTBOOK_DISCUSSION_TITLE) {
				if (guestbookId && guestbookId !== node.id) {
					throw new Error("multiple guestbook Discussions found");
				}
				guestbookId = node.id;
			}
			const m = DISCUSSION_TITLE_RE.exec(node.title);
			if (m && slugSet.has(m[1])) matchedIds.set(m[1], node.id);
		}
		const next = nextConnectionCursor(
			pageInfo,
			after,
			"Discussions",
			seenDiscussionCursors,
		);
		if (next !== null) {
			after = next;
		} else {
			break;
		}
	}

	const unmatched = slugs.filter((s) => !matchedIds.has(s));
	if (unmatched.length > 0) {
		console.warn(
			`[sync] unmatched article slugs (kept on frontmatter fallback): ${unmatched.join(", ")}`,
		);
	}

	// 逐 Discussion 统计 顶层评论 + 全部回复
	const comments = new Map();
	const recentComments = [];
	for (const slug of slugs) {
		const id = matchedIds.get(slug);
		if (!id) continue;
		const { pages, nodes } = await fetchCommentConnectionPages(
			fetchImpl,
			token,
			id,
			"comments",
			` for ${slug}`,
		);
		for (const node of nodes) {
			recentComments.push(
				toRecentComment(node, slug, postTitles.get(slug)),
			);
		}
		comments.set(slug, countDiscussionComments(pages));
	}

	let guestbookComments = [];
	if (guestbookId) {
		const { nodes } = await fetchCommentConnectionPages(
			fetchImpl,
			token,
			guestbookId,
			"guestbook comments",
		);
		guestbookComments = nodes
			.map((node, index) => toGuestbookComment(node, index))
			.sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
			.slice(0, GUESTBOOK_COMMENTS_LIMIT);
	} else {
		console.warn(
			"[sync] guestbook Discussion not found; guestbookComments will be empty",
		);
	}

	const snapshot = validateSnapshot(
		buildSnapshot({
			slugs,
			discussions: comments,
			recentComments: selectRandomComments(
				recentComments,
				randomImpl,
				RECENT_COMMENTS_POOL_LIMIT,
			),
			guestbookComments,
			generatedAt: new Date().toISOString(),
		}),
	);

	// 原子写：tmp + rename；rename 失败时清理 tmp
	const tmp = `${output}.tmp`;
	try {
		await fs.writeFile(
			tmp,
			`${JSON.stringify(snapshot, null, "\t")}\n`,
			"utf-8",
		);
		await fs.rename(tmp, output);
	} catch (err) {
		await fs.rm(tmp, { force: true });
		throw err;
	}
	return snapshot;
}

const isMain = process.argv[1]
	? import.meta.url === pathToFileURL(process.argv[1]).href
	: false;
if (isMain) {
	syncSiteStats().then(
		(snapshot) => {
			console.log(
				`[sync] Giscus comments written: ${Object.keys(snapshot.comments).length} comment key(s); recent comments: ${snapshot.recentComments.length}; guestbook comments: ${snapshot.guestbookComments.length}`,
			);
		},
		(err) => {
			console.error(`[sync] failed: ${err.message}`);
			process.exit(1);
		},
	);
}
