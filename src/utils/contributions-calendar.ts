// About 页 GitHub 贡献日历的构建期渲染纯函数。
// 输入为 scripts/fetch-github-contributions.mjs 产出的缓存 JSON，
// 输出完整卡片 HTML，由 about.astro 以 set:html 注入（构建期执行，零客户端 JS）。
// 密度档位固定阈值：L0=0 / L1=1–2 / L2=3–5 / L3=6–9 / L4=≥10，
// 不随单次数据动态分位，保证档位颜色跨次构建稳定。
// 动效契约（样式在 markdown-extended.css）：逐列 8ms 递进入场、格子 hover 缩放，
// 两者均带 prefers-reduced-motion 变体，此处只负责内联列延迟。

import { siteConfig } from "../config";

export interface ContributionDay {
	date: string;
	count: number;
}

export interface ContributionsTotals {
	total: number;
	longestStreak: number;
	currentStreak: number;
}

export interface ContributionsData {
	schemaVersion: number;
	generatedAt: string;
	login: string;
	profileUrl: string;
	days: ContributionDay[];
	totals: ContributionsTotals;
}

const CALENDAR_TITLE = "GitHub 贡献日历";
const CELL_MS = 8;

/** 周几标签：作为列网格第一列的直接子项，与 7 行同网格对齐（装饰性，aria 由容器承担） */
const WEEKDAY_LABELS =
	'<span class="gh-calendar-wd" style="grid-row:2">一</span><span class="gh-calendar-wd" style="grid-row:4">三</span><span class="gh-calendar-wd" style="grid-row:6">五</span>';

// 与 src/plugins/remark-extended.mjs 各有一份同实现 escapeHtml（跨 mjs/ts 语言，
// tsconfig allowJs=false 无法共享模块），改动任一份必须同步另一份。
function escapeHtml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function levelClass(count: number): string {
	if (count >= 10) return "l4";
	if (count >= 6) return "l3";
	if (count >= 3) return "l2";
	if (count >= 1) return "l1";
	return "l0";
}

/** "2026-09-05" → "2026年9月5日"（字符串拆分，避开时区偏移） */
function formatDateZh(date: string): string {
	const [y, m, d] = date.split("-").map(Number);
	return `${y}年${m}月${d}日`;
}

function assertValidData(data: ContributionsData): void {
	const invalid = new Error("invalid github-contributions.json");
	if (!data || typeof data !== "object") throw invalid;
	if (data.schemaVersion !== 1) throw invalid;
	if (typeof data.login !== "string" || !data.login) throw invalid;
	if (typeof data.profileUrl !== "string" || !data.profileUrl) throw invalid;
	if (!Array.isArray(data.days) || data.days.length === 0) throw invalid;
	// 周日起新列；GitHub 恒定每周 7 天，破例即视为坏数据走回退卡
	if (data.days.length % 7 !== 0) throw invalid;
	// 逐日日期必须是 YYYY-MM-DD，否则格子 title 会渲染出 "NaN年NaN月NaN日"
	if (
		!data.days.every(
			(day) =>
				day &&
				typeof day.date === "string" &&
				/^\d{4}-\d{2}-\d{2}$/.test(day.date),
		)
	) {
		throw invalid;
	}
	if (
		!data.totals ||
		![
			data.totals.total,
			data.totals.longestStreak,
			data.totals.currentStreak,
		].every((n) => Number.isInteger(n) && n >= 0)
	) {
		throw invalid;
	}
}

/** 缓存 days 平铺序列按每周 7 天切列（周日起） */
function toColumns(days: ContributionDay[]): ContributionDay[][] {
	const columns: ContributionDay[][] = [];
	for (let i = 0; i < days.length; i += 7) {
		columns.push(days.slice(i, i + 7));
	}
	return columns;
}

/** 月份标签：包含某月 1 日的列打标，span 到下一个标签列；首位空占位对应周几列 */
function renderMonthLabels(columns: ContributionDay[][]): string {
	const marks: { col: number; month: number }[] = [];
	columns.forEach((col, ci) => {
		for (const day of col) {
			if (day.date.endsWith("-01")) {
				marks.push({ col: ci, month: Number(day.date.slice(5, 7)) });
				break;
			}
		}
	});
	if (marks.length === 0) return "";
	const parts: string[] = ["<span></span>"];
	const gapBefore = marks[0].col;
	if (gapBefore > 0) {
		parts.push(`<span style="grid-column:span ${gapBefore}"></span>`);
	}
	marks.forEach((mark, i) => {
		const next = marks[i + 1]?.col ?? columns.length;
		const span = Math.max(1, next - mark.col);
		parts.push(
			`<span class="gh-calendar-month" style="grid-column:span ${span}">${mark.month}月</span>`,
		);
	});
	return parts.join("");
}

function renderColumns(columns: ContributionDay[][]): string {
	return columns
		.map((col, ci) => {
			const cells = col
				.map(
					(day) =>
						`<i class="gh-calendar-cell ${levelClass(day.count)}" title="${day.count} 次贡献 · ${formatDateZh(day.date)}"></i>`,
				)
				.join("");
			return `<div class="gh-calendar-col" style="animation-delay:${ci * CELL_MS}ms">${cells}</div>`;
		})
		.join("");
}

function renderLegend(): string {
	const swatches = ["l0", "l1", "l2", "l3", "l4"]
		.map((level) => `<i class="gh-calendar-cell ${level}"></i>`)
		.join("");
	return `<div class="gh-calendar-legend"><span>少</span>${swatches}<span>多</span></div>`;
}

export function renderContributionsCalendar(data: ContributionsData): string {
	assertValidData(data);
	const columns = toColumns(data.days);
	const login = escapeHtml(data.login);
	const ariaLabel = `${login} 过去一年 GitHub 贡献日历，共 ${data.totals.total} 次贡献`;
	return `<section class="widget gh-calendar"><span class="icon"><i class="fa fa-github" aria-hidden="true"></i></span><h3>${CALENDAR_TITLE}</h3><div class="gh-calendar-body"><p class="gh-calendar-stats">过去一年共 <strong>${data.totals.total}</strong> 次贡献，最长连续 <strong>${data.totals.longestStreak}</strong> 天，当前连续 <strong>${data.totals.currentStreak}</strong> 天。</p><div class="gh-calendar-scroll"><div class="gh-calendar-grid" style="--gh-cols:${columns.length}"><div class="gh-calendar-months" aria-hidden="true">${renderMonthLabels(columns)}</div><div class="gh-calendar-cols" role="img" aria-label="${escapeHtml(ariaLabel)}">${WEEKDAY_LABELS}${renderColumns(columns)}</div></div></div>${renderLegend()}</div></section>`;
}

/** 缓存缺失或损坏时的回退卡片 */
export function renderContributionsFallback(
	profileUrl = `https://github.com/${siteConfig.githubUser}`,
): string {
	const url = escapeHtml(profileUrl);
	return `<section class="widget gh-calendar gh-calendar-fallback"><span class="icon"><i class="fa fa-github" aria-hidden="true"></i></span><h3>${CALENDAR_TITLE}</h3><div class="gh-calendar-body"><p class="gh-calendar-fallback-text">日历数据暂时不可用，可前往 <a href="${url}" target="_blank" rel="noopener noreferrer">GitHub 主页</a> 查看贡献记录。</p></div></section>`;
}
