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

/**
 * 分页路由的 title/description 生成器：第 1 页原样返回，第 ≥2 页追加页码，
 * 否则第 2 页与第 1 页共用同一条标题与描述，读者与搜索引擎都无法区分。
 * 注意 `paginate()` 会为每个列表都产出第 1 页，因此各调用点仍会拿到一份与根页
 * 同题的第 1 页产物（首页由 `getPaginationUrl` 指向根 URL，其余分页路由的第 1 页
 * 只是 canonical 指回根页）。
 */
export function getPageMeta(
	base: { title: string; description: string },
	current: number,
): { title: string; description: string } {
	if (current <= 1) return base;
	return {
		title: `${base.title} · 第 ${current} 页`,
		description: `${base.description}（第 ${current} 页）`,
	};
}
