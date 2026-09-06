// About 页 GitHub 贡献日历构建期数据生成。
// 用 GitHub GraphQL contributionsCollection 拉取最近 12 个月贡献日历，
// 归一化并计算统计后写入 src/constants/github-contributions.json，
// 由 about 页在构建期静态渲染（客户端零请求，规避访客侧限流与第三方代理依赖）。
//
// 令牌解析顺序：GITHUB_TOKEN / GH_TOKEN 环境变量 → `gh auth token`（本机已登录
// gh CLI 时）→ 无令牌。GraphQL 匿名请求不可用，故无令牌视同本次拉取失败。
// 拉取失败只告警不中断构建（对齐 fetch-github-repos 语义，不用 sync-site-stats
// 的 fail-closed）：已存在缓存则原样保留供页面渲染，否则页面渲染回退卡。
// 测试可注入 fetchImpl / env / execImpl / outputPath / login，绝不访问真实网络。

import fs from "node:fs/promises";
import path from "node:path";
import { execSync } from "node:child_process";
import { resolveGitHubToken } from "./lib/github-token.mjs";
import { pathToFileURL } from "node:url";

const REPO_ROOT = path.resolve(import.meta.dirname, "..");
const DEFAULT_OUTPUT = path.join(
	REPO_ROOT,
	"src",
	"constants",
	"github-contributions.json",
);
const GRAPHQL_ENDPOINT = "https://api.github.com/graphql";
const GITHUB_LOGIN = "CaiYan12";
const SCHEMA_VERSION = 1;

const CALENDAR_QUERY = `query($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            date
            contributionCount
          }
        }
      }
    }
  }
}`;

/** weeks[] → 按日期升序的 days[]，校验形状与取值，非法即抛错 */
export function normalizeCalendar(contributionCalendar) {
	const weeks = contributionCalendar?.weeks;
	if (!Array.isArray(weeks) || weeks.length === 0) {
		throw new Error("contributionCalendar.weeks must be a non-empty array");
	}
	const seen = new Set();
	const days = [];
	for (const week of weeks) {
		const contributionDays = week?.contributionDays;
		if (!Array.isArray(contributionDays)) {
			throw new Error("week.contributionDays must be an array");
		}
		for (const day of contributionDays) {
			const date = day?.date;
			const count = day?.contributionCount;
			if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
				throw new Error(`invalid day date: ${JSON.stringify(date)}`);
			}
			if (!Number.isInteger(count) || count < 0) {
				throw new Error(`invalid day contributionCount for ${date}`);
			}
			if (seen.has(date)) {
				throw new Error(`duplicate day date: ${date}`);
			}
			seen.add(date);
			days.push({ date, count });
		}
	}
	days.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
	return days;
}

/**
 * 把 days 补齐为"周日起始的完整周"网格（消费端 contributions-calendar.ts
 * 按 7 天切列、断言总长为 7 的倍数）。GitHub contributionCalendar 只返回到
 * 今天为止（未来日期缺席）：今天为周日时尾周仅 1 天，总长 365 % 7 = 1，
 * 恰好让整周校验周期性失败（每周日~周五部署都会触发）。
 * 首部：contributionCalendar 首周恒为周日起（GitHub 日历 UI 同款），
 * 若上游行为变化导致首日非周日则向前补齐；尾部补到 7 的倍数，补入天
 * count=0（与官方 UI 对未来日期的浅色空格一致），computeStats 不受影响。
 */
export function padToFullWeeks(days) {
	if (days.length === 0) return days;
	const padded = [...days];
	const firstDate = new Date(`${padded[0].date}T00:00:00Z`);
	const firstWeekday = firstDate.getUTCDay(); // 0 = 周日
	// 先按升序收集首部补位（offset 大 = 日期早），再整体插到头部；
	// 逐个 unshift 会把日期顺序颠倒
	if (firstWeekday > 0) {
		const lead = [];
		for (let offset = firstWeekday; offset > 0; offset -= 1) {
			const d = new Date(firstDate);
			d.setUTCDate(d.getUTCDate() - offset);
			lead.push({ date: d.toISOString().slice(0, 10), count: 0 });
		}
		padded.unshift(...lead);
	}
	while (padded.length % 7 !== 0) {
		const lastDate = new Date(
			`${padded[padded.length - 1].date}T00:00:00Z`,
		);
		lastDate.setUTCDate(lastDate.getUTCDate() + 1);
		padded.push({ date: lastDate.toISOString().slice(0, 10), count: 0 });
	}
	return padded;
}

/** 总贡献、最长连续、当前连续（今天为 0 时按 GitHub 惯例回看一天） */
export function computeStats(days) {
	let total = 0;
	let longest = 0;
	let run = 0;
	for (const day of days) {
		if (day.count > 0) {
			run += 1;
			if (run > longest) longest = run;
		} else {
			run = 0;
		}
		total += day.count;
	}
	let current = 0;
	let index = days.length - 1;
	if (index >= 0 && days[index].count === 0) index -= 1;
	while (index >= 0 && days[index].count > 0) {
		current += 1;
		index -= 1;
	}
	return { total, longestStreak: longest, currentStreak: current };
}

/**
 * 拉取并写缓存。返回值只描述状态，不抛出业务错误：
 *   { status: "ok", totals, outputPath }
 *   { status: "no-token" }
 *   { status: "fetch-failed", message }
 *   { status: "invalid-data", message }
 * 写入采用 tmp + rename 原子替换；任何失败路径都不触碰旧缓存。
 */
export async function fetchContributions(options = {}) {
	const {
		fetchImpl = fetch,
		env = process.env,
		execImpl = execSync,
		outputPath = DEFAULT_OUTPUT,
		login = GITHUB_LOGIN,
		now = new Date(),
	} = options;

	const token = resolveGitHubToken({ env, execImpl });
	if (!token) {
		return { status: "no-token" };
	}

	let payload;
	try {
		const res = await fetchImpl(GRAPHQL_ENDPOINT, {
			method: "POST",
			headers: {
				Accept: "application/vnd.github+json",
				"User-Agent": "myblog-build",
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				query: CALENDAR_QUERY,
				variables: { login },
			}),
		});
		if (!res.ok) {
			return { status: "fetch-failed", message: `HTTP ${res.status}` };
		}
		payload = await res.json();
	} catch (error) {
		return { status: "fetch-failed", message: error.message };
	}

	let days;
	try {
		days = normalizeCalendar(
			payload?.data?.user?.contributionsCollection?.contributionCalendar,
		);
	} catch (error) {
		return { status: "invalid-data", message: error.message };
	}

	// 统计必须用补零前的真实数据：computeStats 的"末位零日只回看一天"口径
	// 会被尾部补零天截断（今天为周日时补 6 天 → current 恒为 0）
	const totals = computeStats(days);
	days = padToFullWeeks(days);
	const snapshot = {
		schemaVersion: SCHEMA_VERSION,
		generatedAt: now.toISOString(),
		login,
		profileUrl: `https://github.com/${login}`,
		days,
		totals,
	};

	const tmpPath = `${outputPath}.tmp`;
	try {
		await fs.writeFile(
			tmpPath,
			`${JSON.stringify(snapshot, null, "\t")}\n`,
			"utf-8",
		);
		await fs.rename(tmpPath, outputPath);
	} catch (error) {
		await fs.rm(tmpPath, { force: true });
		throw error;
	}

	return { status: "ok", totals, outputPath };
}

async function main() {
	let hadCache = true;
	try {
		await fs.access(DEFAULT_OUTPUT);
	} catch {
		hadCache = false;
	}

	// 拉取/数据失败已由 fetchContributions 归一为 status 对象；此处兜底
	// tmp+rename 等 IO 异常——保留旧缓存本身是正确行为，不应裸栈崩溃
	let result;
	try {
		result = await fetchContributions();
	} catch (error) {
		console.warn(
			`SKIP github contributions: IO failure: ${error?.message ?? error}. About page will use ${hadCache ? "stale cache" : "fallback card"}.`,
		);
		return;
	}
	if (result.status === "ok") {
		console.log(
			`GitHub contributions synced: total=${result.totals.total} longest=${result.totals.longestStreak} current=${result.totals.currentStreak}. Output: ${result.outputPath}`,
		);
		return;
	}

	const reason =
		result.status === "no-token"
			? "no GitHub token available"
			: result.status === "invalid-data"
				? `unexpected GraphQL payload: ${result.message}`
				: result.message;
	console.warn(
		`SKIP github contributions: ${reason}. About page will use ${hadCache ? "stale cache" : "fallback card"}.`,
	);
}

const isMain = process.argv[1]
	? import.meta.url === pathToFileURL(process.argv[1]).href
	: false;
if (isMain) {
	main();
}
