// Giscus 评论构建期同步脚本：
// 1) 枚举 src/content/posts 下匹配 ^\d{14}$ 的直接子目录作为文章 slug（字典序排序）；
// 2) 用 GitHub GraphQL 分页拉取 Announcements 分类 Discussions，
//    按 title "posts/<slug>/" 精确匹配文章（guestbook、欢迎帖等不匹配即被忽略）；
//    评论数口径 = 顶层 comments.totalCount + 所有回复 replies.totalCount；
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
        nodes { replies { totalCount } }
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

function toMap(value) {
	if (value instanceof Map) return value;
	if (value && typeof value === "object") {
		return new Map(Object.entries(value));
	}
	throw new Error("expected a Map or plain object");
}

/** 组装并校验快照：key 必须是当前文章 slug，计数必须为非负整数 */
export function buildSnapshot({ slugs, discussions, generatedAt }) {
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
	return { schemaVersion: 1, generatedAt, comments };
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

export async function syncSiteStats({
	fetchImpl = globalThis.fetch,
	outputPath,
	env = process.env,
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

	// Discussions 游标分页
	const matchedIds = new Map();
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
	for (const slug of slugs) {
		const id = matchedIds.get(slug);
		if (!id) continue;
		const pages = [];
		after = null;
		const seenCommentCursors = new Set();
		while (true) {
			const data = await githubGraphQL(fetchImpl, token, COMMENTS_QUERY, {
				id,
				after,
			});
			const conn = data?.node?.comments;
			if (!conn) {
				throw new Error(
					`GitHub GraphQL: missing comments connection for ${slug}`,
				);
			}
			const pageInfo = validateConnection(conn, "comments");
			pages.push(conn);
			const next = nextConnectionCursor(
				pageInfo,
				after,
				"comments",
				seenCommentCursors,
			);
			if (next !== null) {
				after = next;
			} else {
				break;
			}
		}
		comments.set(slug, countDiscussionComments(pages));
	}

	const snapshot = validateSnapshot(
		buildSnapshot({
			slugs,
			discussions: comments,
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
				`[sync] Giscus comments written: ${Object.keys(snapshot.comments).length} comment key(s)`,
			);
		},
		(err) => {
			console.error(`[sync] failed: ${err.message}`);
			process.exit(1);
		},
	);
}
