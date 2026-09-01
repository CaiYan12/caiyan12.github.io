/** URL hash 路由：`#/issue/<guid>` 为详情页，其他（含空）为主页。
 *  与视图状态双向同步：进详情写 hash，浏览器前进/返回触发 hashchange 回读。 */

export type Route = { view: "home" } | { view: "issue"; guid: string };

const ISSUE_PREFIX = "#/issue/";

/** hash 里的期号需要转义：guid 是完整 URL，含 `/` 与 `:`，直接拼接会破坏分段结构。 */
export function routeToHash(route: Route): string {
	return route.view === "issue"
		? ISSUE_PREFIX + encodeURIComponent(route.guid)
		: "#/";
}

export function hashToRoute(hash: string): Route {
	if (hash.startsWith(ISSUE_PREFIX)) {
		const raw = hash.slice(ISSUE_PREFIX.length);
		if (!raw) return { view: "home" };
		let guid: string;
		try {
			guid = decodeURIComponent(raw);
		} catch {
			return { view: "home" };
		}
		return { view: "issue", guid };
	}
	return { view: "home" };
}

export function currentRoute(): Route {
	return hashToRoute(window.location.hash);
}
