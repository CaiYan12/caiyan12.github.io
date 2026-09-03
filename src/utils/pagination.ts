/**
 * Build the canonical root URL for page one and the native nested URL for
 * subsequent pages. The string form is used by Pagination's URL template.
 */
export function getPaginationUrl(
	rootUrl: string,
	page: number | string,
): string {
	const root = rootUrl.endsWith("/") ? rootUrl : `${rootUrl}/`;
	if (page === 1 || page === "1") return root;
	return `${root.slice(0, -1)}/page/${page}/`;
}
