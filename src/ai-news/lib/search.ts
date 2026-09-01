import type { Article } from "../shared/types";
import { htmlToText } from "./text";

/** 搜索：范围覆盖标题 + 摘要 + 全文正文（含「相关链接」锚文本所在的正文段落）。
 *  索引随文章缓存惰性构建并按 guid 缓存；当前数据量（10 期，约 200 KB）下
 *  前端即时过滤无性能压力。多关键词按空格拆分，AND 匹配。 */

const index = new Map<string, string>();

function haystackOf(article: Article): string {
	const cached = index.get(article.guid);
	if (cached !== undefined) return cached;
	const text =
		`${article.title} ${article.summary} ${htmlToText(article.contentHtml)}`.toLowerCase();
	index.set(article.guid, text);
	return text;
}

/** 缓存随文章更新失效：内容变了但 guid 不变时必须清掉，否则搜到旧文本。 */
export function invalidateSearchIndex(guids?: string[]): void {
	if (!guids) {
		index.clear();
		return;
	}
	for (const g of guids) index.delete(g);
}

export function matchesQuery(article: Article, query: string): boolean {
	const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
	if (terms.length === 0) return true;
	const hay = haystackOf(article);
	return terms.every((t) => hay.includes(t));
}
