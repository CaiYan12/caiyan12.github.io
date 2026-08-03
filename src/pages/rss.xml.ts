import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { getCollection } from "astro:content";
import { getSortedPosts } from "../utils/content-utils";
import { siteConfig } from "../config";

export async function GET(context: APIContext) {
	const allPosts = await getCollection("posts");
	const posts = getSortedPosts(allPosts)
		.filter((p) => !p.data.draft)
		.slice(0, 20);

	return rss({
		title: siteConfig.title,
		description: siteConfig.subtitle,
		site: context.site!,
		items: posts.map((post) => ({
			title: post.data.title,
			description: post.data.description || post.data.excerpt,
			link: `/posts/${post.id}/`,
			pubDate: post.data.published,
			// 保留原始 Markdown 渲染 HTML
			content: post.body,
		})),
		customData: `<language>${siteConfig.lang}</language>`,
	});
}
