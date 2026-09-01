import type { Article } from "../shared/types";
import { parseJuyaIssue } from "../juya/parseJuyaIssue";

/** 分类整理：分类 = 橘鸦正文的 h2 栏目名（要闻 / 开发生态 / 模型发布 / 产品应用 …）。
 *  分类来自 `parseJuyaIssue` 已有的语义解析结果，零用户操作；
 *  解析失败（非橘鸦源或结构失配）统一归入「未分类」。

 *  一期日报通常落在多个分类里，因此这是多值分类，筛选器按「包含」匹配。 */

export const UNCATEGORIZED = "未分类";

/** 解析结果按 guid 缓存：contentHtml 是不可变的大字符串，避免每次渲染重复解析。 */
const cache = new Map<string, string[]>();

export function categoriesOf(article: Article): string[] {
	const cached = cache.get(article.guid);
	if (cached) return cached;
	const issue = parseJuyaIssue(article.contentHtml);
	const list =
		issue && issue.sections.length > 0
			? [...new Set(issue.sections.map((s) => s.heading))]
			: [UNCATEGORIZED];
	cache.set(article.guid, list);
	return list;
}

/** 全部分类（按出现频次降序，保证顺序稳定不跳动） */
export function collectCategories(articles: Article[]): string[] {
	const counts = new Map<string, number>();
	for (const a of articles) {
		for (const c of categoriesOf(a)) {
			counts.set(c, (counts.get(c) ?? 0) + 1);
		}
	}
	return [...counts.entries()]
		.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-CN"))
		.map(([name]) => name);
}

export function articleInCategory(
	article: Article,
	category: string | null,
): boolean {
	if (!category) return true;
	return categoriesOf(article).includes(category);
}
