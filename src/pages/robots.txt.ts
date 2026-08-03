import type { APIRoute } from "astro";

export const GET: APIRoute = ({ site }) => {
	const sitemap = new URL("sitemap-index.xml", site).toString();
	return new Response(
		[
			"User-agent: *",
			"Allow: /",
			"Disallow: /search/",
			"",
			`Sitemap: ${sitemap}`,
			"",
		].join("\n"),
		{ headers: { "Content-Type": "text/plain; charset=utf-8" } },
	);
};
