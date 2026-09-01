/** HTML → 纯文本。用于搜索索引与摘要抽取；不解析结构，只去掉标签与脚本样式。 */
export function htmlToText(html: string, maxLen?: number): string {
	const text = html
		.replace(/<style[\s\S]*?<\/style>/gi, " ")
		.replace(/<script[\s\S]*?<\/script>/gi, " ")
		.replace(/<[^>]+>/g, " ")
		.replace(/&nbsp;/gi, " ")
		.replace(/\s+/g, " ")
		.trim();
	return maxLen !== undefined && text.length > maxLen
		? text.slice(0, maxLen) + "…"
		: text;
}
