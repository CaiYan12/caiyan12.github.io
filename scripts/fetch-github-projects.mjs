// /projects/ 构建期 GitHub 数据同步。
// GraphQL 同时读取本人公开仓库与 profile pinned 顺序，输出版本化静态快照；
// 页面只在 Astro 构建期消费该文件，浏览器不会请求 GitHub API。
//
// 失败语义：刷新失败且旧快照有效时保留缓存并继续构建；没有有效快照时
// fail closed，禁止把公开项目静默替换为空列表。

import fs from "node:fs/promises";
import path from "node:path";
import { execSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { resolveGitHubToken } from "./lib/github-token.mjs";

const REPO_ROOT = path.resolve(import.meta.dirname, "..");
const DEFAULT_OUTPUT = path.join(
	REPO_ROOT,
	"src",
	"constants",
	"github-projects.json",
);
const GRAPHQL_ENDPOINT = "https://api.github.com/graphql";
const GITHUB_LOGIN = "CaiYan12";
const SCHEMA_VERSION = 1;

const PROJECTS_QUERY = `query($login: String!, $cursor: String) {
  user(login: $login) {
    repositories(
      first: 100
      after: $cursor
      ownerAffiliations: OWNER
      privacy: PUBLIC
      orderBy: { field: CREATED_AT, direction: DESC }
    ) {
      nodes {
        name
        nameWithOwner
        description
        url
        homepageUrl
        createdAt
        isFork
        isArchived
        primaryLanguage { name }
        repositoryTopics(first: 20) {
          nodes { topic { name } }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
    pinnedItems(first: 6, types: REPOSITORY) {
      nodes {
        ... on Repository { nameWithOwner }
      }
    }
  }
}`;

function invalid(message) {
	throw new Error(`invalid GitHub projects data: ${message}`);
}

function isIsoDateTime(value) {
	return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function normalizeRepository(node, login) {
	if (!node || typeof node !== "object")
		invalid("repository must be an object");
	if (typeof node.name !== "string" || !node.name) invalid("repository.name");
	if (typeof node.nameWithOwner !== "string" || !node.nameWithOwner) {
		invalid("repository.nameWithOwner");
	}
	const owner = node.nameWithOwner.split("/", 1)[0];
	if (owner.toLowerCase() !== login.toLowerCase()) {
		invalid(`unexpected repository owner: ${node.nameWithOwner}`);
	}
	if (typeof node.url !== "string" || !node.url) invalid("repository.url");
	if (!isIsoDateTime(node.createdAt)) invalid("repository.createdAt");
	if (typeof node.isFork !== "boolean") invalid("repository.isFork");
	if (typeof node.isArchived !== "boolean") invalid("repository.isArchived");
	if (node.description !== null && typeof node.description !== "string") {
		invalid("repository.description");
	}
	if (node.homepageUrl !== null && typeof node.homepageUrl !== "string") {
		invalid("repository.homepageUrl");
	}

	const primaryLanguage = node.primaryLanguage?.name ?? null;
	if (primaryLanguage !== null && typeof primaryLanguage !== "string") {
		invalid("repository.primaryLanguage.name");
	}
	const topicNodes = node.repositoryTopics?.nodes;
	if (!Array.isArray(topicNodes))
		invalid("repository.repositoryTopics.nodes");
	const topics = topicNodes.map((item) => item?.topic?.name);
	if (topics.some((topic) => typeof topic !== "string" || !topic)) {
		invalid("repository topic name");
	}

	return {
		name: node.name,
		nameWithOwner: node.nameWithOwner,
		description: node.description,
		url: node.url,
		homepageUrl: node.homepageUrl || null,
		primaryLanguage,
		topics: [...new Set(topics)],
		createdAt: node.createdAt,
		isFork: node.isFork,
		isArchived: node.isArchived,
	};
}

function normalizePage(payload, login) {
	if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
		invalid("GraphQL returned errors");
	}
	const user = payload?.data?.user;
	if (!user || typeof user !== "object") invalid("user");
	const connection = user.repositories;
	if (!connection || !Array.isArray(connection.nodes)) {
		invalid("user.repositories.nodes");
	}
	const pageInfo = connection.pageInfo;
	if (!pageInfo || typeof pageInfo.hasNextPage !== "boolean") {
		invalid("user.repositories.pageInfo");
	}
	if (pageInfo.endCursor !== null && typeof pageInfo.endCursor !== "string") {
		invalid("user.repositories.pageInfo.endCursor");
	}
	const pinnedNodes = user.pinnedItems?.nodes;
	if (!Array.isArray(pinnedNodes)) invalid("user.pinnedItems.nodes");
	const pinned = pinnedNodes.map((node) => node?.nameWithOwner);
	if (pinned.some((name) => typeof name !== "string" || !name)) {
		invalid("pinned repository nameWithOwner");
	}
	return {
		repositories: connection.nodes.map((node) =>
			normalizeRepository(node, login),
		),
		pinned,
		pageInfo,
	};
}

export function validateSnapshot(snapshot, expectedLogin = GITHUB_LOGIN) {
	if (!snapshot || typeof snapshot !== "object") invalid("snapshot");
	if (snapshot.schemaVersion !== SCHEMA_VERSION) invalid("schemaVersion");
	if (!isIsoDateTime(snapshot.generatedAt)) invalid("generatedAt");
	if (typeof snapshot.login !== "string" || !snapshot.login) invalid("login");
	if (snapshot.login.toLowerCase() !== expectedLogin.toLowerCase()) {
		invalid(`login does not match ${expectedLogin}`);
	}
	if (
		!Array.isArray(snapshot.repositories) ||
		snapshot.repositories.length === 0
	) {
		invalid("repositories must be a non-empty array");
	}
	if (!Array.isArray(snapshot.pinnedRepositories)) {
		invalid("pinnedRepositories");
	}

	const names = new Set();
	for (const repository of snapshot.repositories) {
		const normalized = normalizeRepository(
			{
				...repository,
				isFork: false,
				isArchived: false,
				primaryLanguage: repository?.primaryLanguage
					? { name: repository.primaryLanguage }
					: null,
				repositoryTopics: {
					nodes: Array.isArray(repository?.topics)
						? repository.topics.map((topic) => ({
								topic: { name: topic },
							}))
						: null,
				},
			},
			snapshot.login,
		);
		if (names.has(normalized.nameWithOwner)) {
			invalid(`duplicate repository: ${normalized.nameWithOwner}`);
		}
		names.add(normalized.nameWithOwner);
	}

	const pinnedSeen = new Set();
	for (const name of snapshot.pinnedRepositories) {
		if (typeof name !== "string" || !name) invalid("pinned repository");
		if (pinnedSeen.has(name))
			invalid(`duplicate pinned repository: ${name}`);
		if (!names.has(name)) invalid(`pinned repository not found: ${name}`);
		pinnedSeen.add(name);
	}
	return snapshot;
}

async function readValidSnapshot(outputPath, expectedLogin) {
	try {
		const snapshot = JSON.parse(await fs.readFile(outputPath, "utf-8"));
		validateSnapshot(snapshot, expectedLogin);
		return snapshot;
	} catch {
		return null;
	}
}

export async function fetchGitHubProjects(options = {}) {
	const {
		fetchImpl = fetch,
		env = process.env,
		execImpl = execSync,
		outputPath = DEFAULT_OUTPUT,
		login = GITHUB_LOGIN,
		now = new Date(),
	} = options;
	const token = resolveGitHubToken({ env, execImpl });
	if (!token) return { status: "no-token" };

	const repositories = [];
	const seenCursors = new Set();
	let pinned = [];
	let cursor = null;
	let firstPage = true;

	try {
		do {
			const response = await fetchImpl(GRAPHQL_ENDPOINT, {
				method: "POST",
				headers: {
					Accept: "application/vnd.github+json",
					"User-Agent": "myblog-build",
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					query: PROJECTS_QUERY,
					variables: { login, cursor },
				}),
			});
			if (!response.ok) {
				return {
					status: "fetch-failed",
					message: `HTTP ${response.status}`,
				};
			}
			const page = normalizePage(await response.json(), login);
			repositories.push(...page.repositories);
			if (firstPage) pinned = page.pinned;
			firstPage = false;

			if (!page.pageInfo.hasNextPage) break;
			const nextCursor = page.pageInfo.endCursor;
			if (
				!nextCursor ||
				nextCursor === cursor ||
				seenCursors.has(nextCursor)
			) {
				invalid("repository cursor did not advance");
			}
			seenCursors.add(nextCursor);
			cursor = nextCursor;
		} while (true);
	} catch (error) {
		return {
			status: error?.message?.startsWith("invalid GitHub projects data:")
				? "invalid-data"
				: "fetch-failed",
			message: error?.message ?? String(error),
		};
	}

	const included = [];
	const includedNames = new Set();
	for (const repository of repositories) {
		if (repository.isFork || repository.isArchived) continue;
		if (includedNames.has(repository.nameWithOwner)) {
			return {
				status: "invalid-data",
				message: `duplicate repository: ${repository.nameWithOwner}`,
			};
		}
		includedNames.add(repository.nameWithOwner);
		const {
			isFork: _isFork,
			isArchived: _isArchived,
			...record
		} = repository;
		included.push(record);
	}

	const snapshot = {
		schemaVersion: SCHEMA_VERSION,
		generatedAt: now.toISOString(),
		login,
		pinnedRepositories: pinned.filter((name) => includedNames.has(name)),
		repositories: included,
	};
	try {
		validateSnapshot(snapshot, login);
	} catch (error) {
		return { status: "invalid-data", message: error.message };
	}

	const temporaryPath = `${outputPath}.tmp`;
	try {
		await fs.writeFile(
			temporaryPath,
			`${JSON.stringify(snapshot, null, "\t")}\n`,
			"utf-8",
		);
		await fs.rename(temporaryPath, outputPath);
	} catch (error) {
		await fs.rm(temporaryPath, { force: true });
		throw error;
	}
	return {
		status: "ok",
		count: included.length,
		pinnedCount: snapshot.pinnedRepositories.length,
		outputPath,
	};
}

export async function syncGitHubProjects(options = {}) {
	const outputPath = options.outputPath ?? DEFAULT_OUTPUT;
	const expectedLogin = options.login ?? GITHUB_LOGIN;
	const oldSnapshot = await readValidSnapshot(outputPath, expectedLogin);
	let result;
	try {
		result = await fetchGitHubProjects({ ...options, outputPath });
	} catch (error) {
		result = {
			status: "io-failed",
			message: error?.message ?? String(error),
		};
	}
	if (result.status === "ok") return result;

	const message =
		result.status === "no-token"
			? "no GitHub token available"
			: (result.message ?? result.status);
	return oldSnapshot
		? { status: "stale-cache", message, outputPath }
		: { status: "fatal", message, outputPath };
}

async function main() {
	const result = await syncGitHubProjects();
	if (result.status === "ok") {
		console.log(
			`GitHub projects synced: repositories=${result.count} pinned=${result.pinnedCount}. Output: ${result.outputPath}`,
		);
		return;
	}
	if (result.status === "stale-cache") {
		console.warn(
			`SKIP github projects: ${result.message}. Projects page will use the existing valid cache.`,
		);
		return;
	}
	console.error(
		`GitHub projects sync failed: ${result.message}. No valid cache is available.`,
	);
	process.exitCode = 1;
}

const isMain = process.argv[1]
	? import.meta.url === pathToFileURL(process.argv[1]).href
	: false;
if (isMain) await main();
