import domainHtml from "../../domain.html?raw";

export const prerender = true;

export function GET() {
	return new Response(domainHtml, {
		headers: {
			"Content-Type": "text/html; charset=utf-8",
		},
	});
}
