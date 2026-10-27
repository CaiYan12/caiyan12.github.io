// 冒烟测试的页面清单（单源）。
//
// 为什么存在：同一份「要查哪些页」此前抄了四份，形态各异，且漂移时不报错——
// 清单少一页只会静默少查，与 #41 那类退化同构（AGENTS.md 记过同类事故）。
//
// 四份的原状（2026-10-27 实测，改动前）：
//   scripts/ui-smoke.mjs:1076        OUTLINE_PAGES  13 页，判「每页恰好一个可见 h1」
//   scripts/upgrade-style-audit.mjs:113  PAGES      24 页，判「同份 dist 连采两遍必须一致」
//   scripts/fancybox-smoke.mjs:24/281    硬编码     2 篇文章 + 1 相册
//   scripts/sidebar-weather-smoke.mjs:17 pages      3 页（带中文页名）
//
// **为什么分组而不是一个数组**（这是本模块存在的核心理由）：
// 两份大清单重叠的 13 页逐字相同，差异全在 audit 多出的 11 页。若只抽一份：
//   · 抽 13 页 → audit 从 24 掉到 13，**少查 11 页**，指纹覆盖面缩小（退化）
//   · 抽 24 页 → ui-smoke 多查 11 页，其中 `/this-page-should-404/` 本就是 404、
//     `/images/` 不带 Layout 壳，h1 判据在这两页上**必然假红**
// 所以清单必须按「页面性质」分组，由各脚本自取所需的那一组。
//
// 分工原则：本模块只持有**路径数据与分组语义**，不含任何判据、不含导航、
// 不替调用点决定要不要查。判据仍留在各 smoke 里（与 smoke-harness.mjs 同一条纪律）。

/**
 * 带 Layout 壳的真页面：走完整 `Layout.astro` → `MainGridLayout.astro`，
 * 有顶栏 / 侧栏 / 页脚，因此「恰好一个可见 h1」这类全局判据对它们成立。
 * 这 13 页是 ui-smoke 与 upgrade-style-audit 的原样交集（逐字一致，无漂移）。
 */
export const SHELL_PAGES = [
	"/",
	"/posts/20260919135000/",
	"/about/",
	"/albums/",
	"/archive/",
	"/guestbook/",
	"/tag/",
	"/friends/",
	"/skills/",
	"/diary/",
	"/search/",
	"/projects/",
	"/timeline/",
];

/**
 * 仅 upgrade-style-audit 需要的扩展页。它做的是像素指纹比对（同一份 dist 连采
 * 两遍必须完全一致），覆盖面要求比「带壳真页面」大：多验一篇最老的文章、一个
 * 相册子页、分类/热门/书籍系列页，以及两条**刻意不带壳**的边界页。
 *
 * 注意 `/images/` 与 `/this-page-should-404/`：它们**没有 Layout 壳**，
 * 「恰好一个可见 h1」类判据在上面不成立，故只能进本组、不能进 SHELL_PAGES。
 * `/ai-news/` 不参与：其内容按日从远端 feed 拉取，跨天采集必然合法地不同，
 * 原注释按页排除而非按子树排除（详见 upgrade-style-audit.mjs 该行注释）。
 */
export const AUDIT_EXTRA_PAGES = [
	"/posts/20260831000000/",
	"/posts/20220514182600/",
	"/albums/" + encodeURIComponent("日常随手拍") + "/",
	"/images/",
	"/category/",
	"/hot/",
	"/books/",
	"/books/archive/",
	"/books/01/",
	"/this-page-should-404/",
];

/**
 * upgrade-style-audit 的完整清单 = 带壳页 + 扩展页。
 * 拼接顺序保持原样：先 13 页带壳页的原有次序，再扩展页——
 * 原清单里 `/posts/20260831000000/`、`/posts/20220514182600/` 排在 `/about/` 之前，
 * 这里不再复刻那个交错次序，因为 audit 的判据是「逐页比对指纹」，与顺序无关。
 */
export const AUDIT_PAGES = [...SHELL_PAGES, ...AUDIT_EXTRA_PAGES];

/**
 * fancybox 灯箱烟测要打开的文章：必须含图、含可缩放内容。
 * 原为 fancybox-smoke.mjs:24 与 :281 两处硬编码，现收敛于此。
 * 两篇实测均存在（2026-10-27 核）。
 */
export const FANCYBOX_POST_PAGES = {
	/** 主用例：单图文章，测关闭不跳位 / 焦点归还 / 定位 / 下载 */
	article: "/posts/20260909092113/",
	/** 表格用例：文章内表格，测灯箱不与之打架 */
	table: "/posts/20260903134906/",
};

/** 灯箱烟测的相册页（原 fancybox-smoke.mjs:25 同处写死） */
export const FANCYBOX_ALBUM_PAGE =
	"/albums/" + encodeURIComponent("轻松一刻") + "/";

/**
 * 侧栏天气胶囊的三类页面（原 sidebar-weather-smoke.mjs:17）。
 * 带中文页名是因为该脚本的报错信息要读得懂「哪一类页面」没出来。
 */
export const WEATHER_PAGES = [
	{ path: "/", name: "首页" },
	{ path: "/posts/20260831000000/", name: "文章页" },
	{ path: "/archive/", name: "其他侧栏页" },
];
