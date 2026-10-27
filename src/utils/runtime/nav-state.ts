/**
 * 导航「当前页态」判定（单源）。
 *
 * 为什么存在：同一份判定此前有两套口径，且**语义不同**——
 *
 *   · 编译期（Navbar.astro:9 / MMenu.astro:5，两处逐字相同的私有 isCurrent）：
 *       pathname === url || (url !== "/" && pathname.startsWith(url.replace(/\/$/, "")))
 *     `startsWith` 只看字符前缀，**不守路径段边界**：href=`/tag/` 会把
 *     `/tagging/` 也判成当前页。
 *
 *   · 运行时（src/utils/theme-script.ts 的 syncNavHighlight，私有 isMatch）：
 *       href 归一成带尾斜杠的 base，只认 `path === base` 或 `path.startsWith(base)`，
 *     即**必须落在路径段边界上**。该文件原注释写得很明确：「/link/ 不应命中 /link-survey/」。
 *
 * 这两套会在同一页面上给出不同答案。导航与移动菜单都在 Swup 容器之外，切页不重建，
 * 所以换页后必须由运行时重算一遍——**副作用是同一次访问里首屏与换页后可能显示不同的高亮**。
 *
 * 2026-10-27 实测（src/config.ts 的 19 个真实导航 href × 32 个站点真实路径 = 608 组合）：
 * 判定不同只有 2 处，且都落在**站点并不存在的路径**上（`/books-extra/` vs `/books/`、
 * `/tagging/` vs `/tag/`）。真实存在的 `/archive/page/2/`、`/tag/技术/`、`/books/01/`
 * 在两套口径下判定完全一致。所以本次统一**不改变任何现网页面的高亮**。
 *
 * 统一到这个（运行时的）口径是因为它更严格：它是原来换页后生效的那一套，
 * 首屏曾与之不符的那些情形，本函数把它们对齐到运行时结果。
 *
 * 本模块是纯函数、零副作用、零依赖，因此可以同时被 Astro 的构建期渲染与浏览器运行时导入。
 */

/**
 * 判断导航项 `href` 是否对应当前路径 `pathname`。
 *
 * @param pathname 当前路径，如 `"/tag/技术/"`（运行时传 `location.pathname`；
 *                 构建期传 Astro 的 `pathname`）
 * @param href     导航项 href，如 `"/tag/"`；也接受不带尾斜杠的形态
 * @returns 是否把该项标为当前页
 */
export function isNavCurrent(pathname: string, href: string): boolean {
	// 首页只认精确的 "/"，否则任何路径都会被空前缀匹配上
	if (href === "/") return pathname === "/";
	// 归一成带尾斜杠的 base：href=`/tag` 与 `/tag/` 都得到 `/tag/`，
	// 于是 `/tag`、`/tag/`、`/tag/xxx` 命中，而 `/tagging` 不命中（路径段边界）
	const base = href.endsWith("/") ? href : `${href}/`;
	return pathname === href || pathname === base || pathname.startsWith(base);
}
