// GitHub 仓库卡片构建期数据生成。
// 扫描 src/content 下 Markdown 中的 ::github{repo="owner/name"} 指令，
// 从 GitHub API 拉取仓库元数据写入 src/constants/github-repos.json，
// 由 remark-extended.mjs 在构建期渲染完整卡片 HTML（客户端零请求，
// 规避访客 IP 匿名 API 60 次/小时的限流问题）。
//
// 令牌解析顺序：GITHUB_TOKEN / GH_TOKEN 环境变量 → `gh auth token`（本机已登录
// gh CLI 时）→ 匿名。拉取失败只告警不中断构建，缺失仓库渲染为回退链接。
// 增量执行：默认只拉取缓存中缺失的仓库；--refresh 全量刷新；
// 内容中已不再引用的仓库条目会被清理。

import fs from "fs/promises";
import path from "path";
import { execSync } from "child_process";

const CONTENT_DIR = "src/content";
const OUTPUT_FILE = "src/constants/github-repos.json";
// ::github{repo="owner/name"}（兼容单双引号）
const DIRECTIVE_RE = /::github\{repo=(?:"([^"]+)"|'([^']+)')\}/g;

function resolveToken() {
	if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
	if (process.env.GH_TOKEN) return process.env.GH_TOKEN;
	try {
		return (
			execSync("gh auth token", {
				encoding: "utf-8",
				stdio: ["ignore", "pipe", "ignore"],
			}).trim() || null
		);
	} catch {
		return null;
	}
}

async function fetchRepo(repo, token) {
	const headers = {
		Accept: "application/vnd.github+json",
		"User-Agent": "myblog-build",
	};
	if (token) headers.Authorization = `Bearer ${token}`;
	// owner 与仓库名分段编码，避免整体编码把 "/" 变成 %2F
	const repoPath = repo.split("/").map(encodeURIComponent).join("/");
	const res = await fetch(`https://api.github.com/repos/${repoPath}`, {
		headers,
	});
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	const data = await res.json();
	return {
		html_url: data.html_url || `https://github.com/${repo}`,
		full_name: data.full_name || repo,
		description: data.description || "",
		stargazers_count: data.stargazers_count ?? 0,
		forks_count: data.forks_count ?? 0,
		language: data.language || "",
	};
}

async function collectMarkdownFiles(dir, out) {
	let entries;
	try {
		entries = await fs.readdir(dir, { withFileTypes: true });
	} catch {
		return;
	}
	for (const entry of entries) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			await collectMarkdownFiles(full, out);
		} else if (entry.name.toLowerCase().endsWith(".md")) {
			out.push(full.replace(/\\/g, "/"));
		}
	}
}

async function collectRepos(files) {
	const repos = new Set();
	for (const file of files) {
		const content = await fs.readFile(file, "utf-8");
		// 剥离代码块与行内代码，避免把文档示例语法当成真实指令
		const prose = content
			.replace(/```[\s\S]*?```/g, "")
			.replace(/~~~[\s\S]*?~~~/g, "")
			.replace(/`[^`\n]*`/g, "");
		for (const m of prose.matchAll(DIRECTIVE_RE)) {
			const repo = (m[1] || m[2] || "").trim();
			if (repo.includes("/")) repos.add(repo);
		}
	}
	return repos;
}

async function main() {
	const refresh = process.argv.includes("--refresh");

	// 读取已有缓存
	let cache = {};
	try {
		cache = JSON.parse(await fs.readFile(OUTPUT_FILE, "utf-8"));
		console.log(
			`Loaded ${Object.keys(cache).length} existing entries from ${OUTPUT_FILE}`,
		);
	} catch {
		console.log(`No existing ${OUTPUT_FILE} found, will create new.`);
	}

	const files = [];
	await collectMarkdownFiles(CONTENT_DIR, files);
	const repos = await collectRepos(files);
	console.log(
		`Found ${repos.size} unique repo(s) referenced in ${files.length} markdown file(s).`,
	);

	// 清理内容中已不再引用的条目
	const stale = Object.keys(cache).filter((repo) => !repos.has(repo));
	for (const repo of stale) delete cache[repo];
	if (stale.length > 0) console.log(`Removed ${stale.length} stale entries.`);

	// 默认只拉取缺失仓库；--refresh 全量刷新
	const targets = refresh ? [...repos] : [...repos].filter((r) => !cache[r]);
	if (targets.length === 0) {
		console.log("All repos cached, nothing to fetch.");
	} else {
		const token = resolveToken();
		console.log(
			`Fetching ${targets.length} repo(s) with ${token ? "authenticated" : "unauthenticated"} request...`,
		);
		for (const repo of targets) {
			try {
				cache[repo] = await fetchRepo(repo, token);
				console.log(`  OK  ${repo}`);
			} catch (error) {
				console.warn(`  SKIP ${repo}: ${error.message}`);
			}
		}
	}

	// 键排序保证输出稳定
	const sorted = Object.fromEntries(
		Object.keys(cache)
			.sort()
			.map((repo) => [repo, cache[repo]]),
	);
	await fs.writeFile(
		OUTPUT_FILE,
		JSON.stringify(sorted, null, "\t") + "\n",
		"utf-8",
	);
	console.log(
		`Done! Total: ${Object.keys(sorted).length}. Output: ${OUTPUT_FILE}`,
	);
}

main();
