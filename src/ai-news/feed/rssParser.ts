import type { Article, FeedSource } from "../shared/types";
import { htmlToText } from "../lib/text";

/** 浏览器端 RSS 2.0 / Atom 解析（DOMParser，无第三方依赖）。
 *  字段映射对齐桌面端 RssProvider：guid/link/title/pubDate/content:encoded/contentSnippet。
 *  命名空间元素（`content:encoded`）在 XML 文档里 tagName 带前缀、localName 不带，
 *  故两者都参与匹配。 */

/** 从全文 HTML 提取封面：首个 img，文件名含 cover_ 优先 */
export function extractCover(html: string): string | null {
	if (!html) return null;
	const imgRe = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
	let first: string | null = null;
	let m: RegExpExecArray | null;
	while ((m = imgRe.exec(html)) !== null) {
		const src = m[1];
		if (!first) first = src;
		if (/cover_/i.test(src)) return src;
	}
	return first;
}

/** 取 item 下第一个名字匹配的直接子元素文本（匹配 tagName 或 localName） */
function childText(item: Element, names: string[]): string {
	for (const child of Array.from(item.children)) {
		const tag = child.tagName;
		const local = child.localName ?? "";
		if (names.some((n) => tag === n || local === n)) {
			return (child.textContent ?? "").trim();
		}
	}
	return "";
}

function toIsoDate(raw: string): string {
	if (!raw) return new Date().toISOString();
	const d = new Date(raw);
	return Number.isNaN(d.getTime())
		? new Date().toISOString()
		: d.toISOString();
}

/** 解析 RSS/Atom XML 为文章列表；解析失败抛错（调用方负责回退到离线快照）。 */
export function parseFeed(xml: string, source: FeedSource): Article[] {
	const doc = new DOMParser().parseFromString(xml, "application/xml");
	const parserError = doc.getElementsByTagName("parsererror");
	if (parserError.length > 0) {
		throw new Error("RSS XML 解析失败");
	}

	const items = Array.from(doc.getElementsByTagName("item"));
	const nodes: Element[] =
		items.length > 0
			? items
			: Array.from(doc.getElementsByTagName("entry"));

	return nodes.map((node, i) => {
		const contentHtml =
			childText(node, ["content:encoded", "encoded", "content"]) ||
			childText(node, ["description", "summary"]);
		const link =
			childText(node, ["link"]) ||
			node.getElementsByTagName("link")[0]?.getAttribute("href") ||
			"";
		const title = childText(node, ["title"]) || "(无标题)";
		const pubDate = childText(node, [
			"pubDate",
			"published",
			"updated",
			"dc:date",
			"date",
		]);
		const guid =
			childText(node, ["guid", "id"]) ||
			link ||
			`${source.id}:${i}:${title}`;

		const summaryRaw = childText(node, ["description", "summary"]);
		const summary = summaryRaw
			? htmlToText(summaryRaw, 200)
			: htmlToText(contentHtml, 200);

		return {
			guid,
			sourceId: source.id,
			title,
			link,
			pubDate: toIsoDate(pubDate),
			summary,
			contentHtml,
			coverUrl: extractCover(contentHtml),
		};
	});
}

/** 抓取并解析订阅源。超时由 AbortController 控制，避免网络挂起卡死首屏。 */
export async function fetchFeed(
	source: FeedSource,
	timeoutMs = 15000,
): Promise<Article[]> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	try {
		const res = await fetch(source.url, {
			signal: controller.signal,
			headers: {
				Accept: "application/rss+xml, application/xml, text/xml, */*",
			},
		});
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		return parseFeed(await res.text(), source);
	} finally {
		clearTimeout(timer);
	}
}
