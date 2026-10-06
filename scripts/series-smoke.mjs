// 文集（series）接线烟测 —— 缝隙 A：把「页面有没有把算出来的导航接上」变成可跑判据。
//
// 前置：pnpm build && pnpm preview --port 4322
// 运行：pnpm smoke:series（或 SERIES_BASE_URL=http://localhost:4321 node scripts/series-smoke.mjs）
//
// 覆盖：组内相邻 href、组内边界不渲染该方向按钮、非成员导航跳过整块、
//       文章页顶部与末尾两行、侧栏章节目录、目录页与总览页 200 + 封面（含 og:image）。
// 台子（check / 报错采集 / 汇总）来自 scripts/lib/smoke-harness.mjs，本文件只写判据。
// SERIES_BASE_URL 传的是**站点根**（脚本自己拼 /posts/... 与 /series/...），
// 与 NICE_BOOKS_BASE_URL / AI_NEWS_BASE_URL 那种「完整页面地址」形态不同。
//
// 判据总数写死在 EXPECTED_CHECKS：同批固定后不得增减（沿用 #49 的不变量做法）。
// 改判据必须同时改这个常量，否则脚本以退出码 2 拒绝运行——防止「顺手加一条」
// 让基线漂走而不被察觉。
// 当前 35 = 原 32 + 3 条粘性判据（站长 2026-10-06 目视后新增粘性需求：
// 侧栏文集目录滚过自然位置后贴顶、被 #content 底部顶住、回滚归位）。
import { makeHarness } from "./lib/smoke-harness.mjs";

const EXPECTED_CHECKS = 35;

// 组成员与序号：与 src/data/series.ts 及六篇文章的 frontmatter 同批核对。
// 增删文集成员/章节必须同步这里，否则相邻 href 判据会整段失真。
const MEMBERS = {
	"webapp-vibe-coding": [
		"20261002071103",
		"20261002081331",
		"20261002093931",
		"20261002204249",
	],
	"matt-pocock": ["20260919135000", "20261006110122"],
};
const ALL_MEMBERS = Object.values(MEMBERS).flat();

// 非成员样本必须是**公开**文章：20260728000000 虽是置顶帖，但 private:true 会被
// getSortedPosts 的 isPublicPost 剔出时间线，拿它验证「非成员页不出现文集 UI」
// 天然为真，咬不住「公开非成员被误加文集 UI」。20260927082016 实测 private:false、
// draft:false、series:none，且紧邻本书四章（第〇–第三章）在时间线上的位置——它改造前的「下一篇（右）」
// 正指向第〇章，故还能顺带咬住「非成员导航跳过整块」。
const NON_MEMBER = "20260927082016";
// 实测该非成员序列里它更早的一篇（它是最新的非成员，故 next 恒为 null）。
const NON_MEMBER_PREV = "20260925150221";

// 两个文集目录页当前都不写 cover，封面走「按 seriesOrder 升序取首位带 image 的成员」回退。
const COVER = {
	"webapp-vibe-coding": "/images/posts/20261002071103/webapp-vibe-coding-ch0-cover.jpg",
	"matt-pocock": "/images/posts/20260919135000/matt-pocock-workflow-cover.jpg",
};
const SERIES_NAME = {
	"webapp-vibe-coding": "看懂 AI 写的网站",
	"matt-pocock": "Matt Pocock 技能选讲",
};

// 外部服务（Giscus 评论接口、字体 CDN）在本机网络下可能 4xx/重置：单列统计，不计 FAIL；
// 本地资源的失败仍然严格判失败。策略写在调用点，台子内不放行任何东西。
const externalIssues = [];
const harness = makeHarness({
	envVar: "SERIES_BASE_URL",
	defaultBase: "http://localhost:4322",
	isNoise: ({ url, base }) => {
		if (!url || url.startsWith(base)) return false;
		externalIssues.push(url.split("/")[2]);
		return true;
	},
});
const base = harness.base;
const { check } = harness;

const browser = await harness.browser.launch(harness.launch);
const ctx = await browser.newContext();
const page = harness.attach(await ctx.newPage());

async function goto(path) {
	const resp = await page.goto(base + path, { waitUntil: "load" });
	return resp?.status() ?? 0;
}

/** 文章页左右悬浮按钮：`.post-navigation` 是 position:fixed 的视口侧边箭头，
 *  组内边界不渲染该方向 = 对应的 <a> 整个不存在。 */
async function navHrefs() {
	return page.evaluate(() => {
		const pick = (rel) =>
			document
				.querySelector(`.post-navigation a[rel="${rel}"]`)
				?.getAttribute("href") ?? null;
		return { prev: pick("prev"), next: pick("next") };
	});
}

/** 文章页顶部与末尾两行：票 05 定的类名 .post-series（同页两处，DOM 顺序区分顶/末）。 */
async function seriesNotes() {
	return page.evaluate(() =>
		[...document.querySelectorAll(".post-series")].map((p) => ({
			text: (p.textContent ?? "").replace(/\s+/g, " ").trim(),
			links: [...p.querySelectorAll("a")].map((a) =>
				a.getAttribute("href"),
			),
		})),
	);
}

async function sidebarSeries() {
	return page.evaluate(() => {
		const toc = document.querySelector("#sidebar .series-toc");
		if (!toc) return null;
		const current = toc.querySelector("li.current a");
		return {
			items: toc.querySelectorAll("li").length,
			links: [...toc.querySelectorAll("a")].map((a) =>
				a.getAttribute("href"),
			),
			currentHref: current?.getAttribute("href") ?? null,
			currentAria: current?.getAttribute("aria-current") ?? null,
		};
	});
}

// —— 1. 组内相邻：成员页左右按钮的 href 指向同文集相邻篇，首/末篇该方向整块消失 ——
for (const [slug, ids] of Object.entries(MEMBERS)) {
	const name = SERIES_NAME[slug];
	for (let i = 0; i < ids.length; i++) {
		const id = ids[i];
		await goto(`/posts/${id}/`);
		const nav = await navHrefs();
		const prevId = i > 0 ? ids[i - 1] : null;
		const nextId = i < ids.length - 1 ? ids[i + 1] : null;
		check(
			`${name} ${i}/${ids.length - 1}（${id}）：${
				prevId ? "prev" : "无 prev"
			} / ${nextId ? "next" : "无 next"} 与组内序一致`,
			nav.prev === (prevId ? `/posts/${prevId}/` : null) &&
				nav.next === (nextId ? `/posts/${nextId}/` : null),
			`prev=${nav.prev} next=${nav.next}`,
		);
	}
}

// —— 2. 非成员：导航跳过整个文集，相邻项不落在任何成员上 ——
await goto(`/posts/${NON_MEMBER}/`);
const nmNav = await navHrefs();
check(
	`非成员 ${NON_MEMBER}：prev = ${NON_MEMBER_PREV}（同属非成员序列）`,
	nmNav.prev === `/posts/${NON_MEMBER_PREV}/`,
	`prev=${nmNav.prev}`,
);
check(`非成员 ${NON_MEMBER}：无 next（它是最新的非成员）`, nmNav.next === null, `next=${nmNav.next}`);
check(
	`非成员 ${NON_MEMBER}：左右按钮都不落在任何文集成员上（跳过整块）`,
	![nmNav.prev, nmNav.next].some((h) =>
		ALL_MEMBERS.some((id) => h?.includes(id)),
	),
	`prev=${nmNav.prev} next=${nmNav.next}`,
);

// —— 3. 顶部与末尾两行：成员在、末章改收尾、非成员整块不渲染 ——
await goto(`/posts/20261002071103/`);
const ch0Notes = await seriesNotes();
check(
	"第〇章：两行都在",
	ch0Notes.length === 2,
	`count=${ch0Notes.length}`,
);
check(
	"第〇章：顶部行 = 第 0 / 4 章 + 目录链接",
	ch0Notes[0]?.text ===
		`本文属于《看懂 AI 写的网站》· 第 0 / 4 章 · 目录` &&
		ch0Notes[0]?.links[0] === `/series/webapp-vibe-coding/`,
	`${ch0Notes[0]?.text} | ${ch0Notes[0]?.links?.join(",")}`,
);
check(
	"第〇章：末尾行 = 第 0 / 4 章（非末章，不收尾）",
	ch0Notes[1]?.text === `本文属于《看懂 AI 写的网站》· 第 0 / 4 章` &&
		ch0Notes[1]?.links.length === 0,
	`${ch0Notes[1]?.text} | ${ch0Notes[1]?.links?.join(",")}`,
);

await goto(`/posts/20261002204249/`);
const ch3Notes = await seriesNotes();
check(
	"第三章：顶部行 = 第 3 / 4 章 + 目录链接",
	ch3Notes[0]?.text ===
		`本文属于《看懂 AI 写的网站》· 第 3 / 4 章 · 目录` &&
		ch3Notes[0]?.links[0] === `/series/webapp-vibe-coding/`,
	`${ch3Notes[0]?.text}`,
);
check(
	"第三章（末章）：末尾行改收尾 → 《…》已读完 · 看其它文集 → /series/",
	ch3Notes[1]?.text === `《看懂 AI 写的网站》已读完 · 看其它文集` &&
		ch3Notes[1]?.links[0] === `/series/`,
	`${ch3Notes[1]?.text} | ${ch3Notes[1]?.links?.join(",")}`,
);

await goto(`/posts/20261006110122/`);
const matt1Notes = await seriesNotes();
check(
	"Matt 末篇：顶部行 = 第 1 / 2 篇（量词取 unit）",
	matt1Notes[0]?.text ===
		`本文属于《Matt Pocock 技能选讲》· 第 1 / 2 篇 · 目录`,
	`${matt1Notes[0]?.text}`,
);
check(
	"Matt 末篇：末尾行改收尾 → 《…》已读完 · 看其它文集",
	matt1Notes[1]?.text === `《Matt Pocock 技能选讲》已读完 · 看其它文集` &&
		matt1Notes[1]?.links[0] === `/series/`,
	`${matt1Notes[1]?.text} | ${matt1Notes[1]?.links?.join(",")}`,
);

await goto(`/posts/${NON_MEMBER}/`);
const nmNotes = await seriesNotes();
check(
	`非成员 ${NON_MEMBER}：顶部与末尾两行都不渲染`,
	nmNotes.length === 0,
	`count=${nmNotes.length}`,
);

// —— 4. 侧栏章节目录：成员页在、当前章高亮、非成员页无 ——
await goto(`/posts/20261002204249/`);
const ch3Sidebar = await sidebarSeries();
check(
	"第三章：侧栏有章节目录，4 条成员链接",
	ch3Sidebar !== null && ch3Sidebar.items === 4,
	`items=${ch3Sidebar?.items ?? "无"}`,
);
check(
	"第三章：当前章带 .current 与 aria-current=\"page\"",
	ch3Sidebar?.currentHref === `/posts/20261002204249/` &&
		ch3Sidebar?.currentAria === "page",
	`current=${ch3Sidebar?.currentHref} aria=${ch3Sidebar?.currentAria}`,
);
check(
	"第三章：侧栏目录的链接按 seriesOrder 升序 = 四章顺序",
	JSON.stringify(ch3Sidebar?.links) ===
		JSON.stringify(MEMBERS["webapp-vibe-coding"].map((id) => `/posts/${id}/`)),
	`${ch3Sidebar?.links?.join(",")}`,
);
await goto(`/posts/${NON_MEMBER}/`);
const nmSidebar = await sidebarSeries();
check(
	`非成员 ${NON_MEMBER}：侧栏无章节目录`,
	nmSidebar === null,
	`result=${JSON.stringify(nmSidebar)}`,
);

// —— 4b. 粘性跟随（站长 2026-10-06 目视后新增，纯 CSS sticky）：三条判据全部
// 真滚动测量。注意 series 现排在侧栏末位，自然位置较深，滚动量按实测自然位置
// 推导而非写死（写死会随 widget 增删失真）。
// 「被 content 底顶住」一条用 360 高的专用视口：默认 720 高下页尾残留（footer 等
// 约 229px）大于 widget 高（约 190px），滚到底时 content 底仍在视口内较深处，
// widget 永远到不了钳位区间——顶起状态物理不可达；360 高下可达且宽度仍 1280，
// 不触发移动端断点。
const stickyCtx = await browser.newContext({
	viewport: { width: 1280, height: 360 },
});
const stickyPage = harness.attach(await stickyCtx.newPage());
const sp = stickyPage;
await sp.goto(base + `/posts/20261002204249/`, { waitUntil: "load" });
const stickyProbe = async () =>
	sp.evaluate(() => {
		const widget = document.querySelector(
			"#sidebar .widget.widget-series",
		);
		const content = document.querySelector("#content");
		if (!widget || !content) return null;
		const wr = widget.getBoundingClientRect();
		const cr = content.getBoundingClientRect();
		// sticky 钳位对齐的是外边距盒（.widget 有 10px margin-bottom），
		// 故一并量出 margin-bottom 供「底边重合」判据换算。
		const mb = parseFloat(getComputedStyle(widget).marginBottom) || 0;
		return {
			widgetTop: +wr.top.toFixed(1),
			widgetMarginBoxBottom: +(wr.bottom + mb).toFixed(1),
			contentBottom: +cr.bottom.toFixed(1),
			scrollY: Math.round(window.scrollY),
		};
	});
// 自然位置（文档坐标）：滚回顶部后量。
await sp.evaluate(() => window.scrollTo(0, 0));
await sp.waitForTimeout(100);
const natural = await stickyProbe();
const naturalDocTop = natural.widgetTop + natural.scrollY;
// 判据 a：滚过自然位置 400px → 钉在视口顶 10px（容差 ±2）。
await sp.evaluate((y) => window.scrollTo(0, y), naturalDocTop + 400);
await sp.waitForTimeout(100);
const pinned = await stickyProbe();
check(
	"粘性：滚过自然位置后 widget 贴视口顶 10px（±2）",
	pinned !== null && Math.abs(pinned.widgetTop - 10) <= 2,
	`scrollY=${pinned?.scrollY} widgetTop=${pinned?.widgetTop}（自然位置 docTop=${naturalDocTop}）`,
);
// 判据 b：滚到页底 → widget 底被 content 底顶住：底边与 content 底重合（±1），
// 且离开贴顶位（top < 10）。懒加载图片会撑开页高，滚到底后等 content 底稳定再量。
await sp.evaluate(() => window.scrollTo(0, Number.MAX_SAFE_INTEGER));
await sp.evaluate(async () => {
	let last = -1;
	for (let i = 0; i < 30; i++) {
		const c = document
			.querySelector("#content")
			.getBoundingClientRect().bottom;
		if (Math.abs(c - last) < 0.5) break;
		last = c;
		await new Promise((r) => setTimeout(r, 100));
	}
});
const pushed = await stickyProbe();
check(
	"粘性：滚到页底，widget 底被 content 底顶住（外边距盒底与 content 底重合 ±1）且离开贴顶位",
	pushed !== null &&
		Math.abs(pushed.widgetMarginBoxBottom - pushed.contentBottom) <=
			1 &&
		pushed.widgetTop < 10,
	`scrollY=${pushed?.scrollY} widgetTop=${pushed?.widgetTop} marginBoxBottom=${pushed?.widgetMarginBoxBottom} contentBottom=${pushed?.contentBottom}`,
);
// 判据 c：滚回顶部 → 回到自然位置（top > 10，未钉住）。
await sp.evaluate(() => window.scrollTo(0, 0));
await sp.waitForTimeout(100);
const back = await stickyProbe();
check(
	"粘性：滚回顶部后 widget 回到自然位置（top > 10，未钉住）",
	back !== null && back.widgetTop > 10,
	`scrollY=${back?.scrollY} widgetTop=${back?.widgetTop}（自然 docTop=${naturalDocTop}）`,
);
await stickyCtx.close();

// —— 5. 目录页与总览页：200 + 封面（含 og:image）——
let status = await goto(`/series/webapp-vibe-coding/`);
const bookCover = await page.evaluate(() => {
	const img = document.querySelector("figure.post-cover img");
	return img
		? { src: img.getAttribute("src"), alt: img.getAttribute("alt") }
		: null;
});
const bookOg = await page.evaluate(() =>
	document
		.querySelector('meta[property="og:image"]')
		?.getAttribute("content"),
);
check("目录页 /series/webapp-vibe-coding/ 返回 200", status === 200, `status=${status}`);
check(
	"目录页封面走回退 = 本书第〇章头图",
	bookCover?.src === COVER["webapp-vibe-coding"],
	`src=${bookCover?.src ?? "无"}`,
);
check("目录页封面 alt/title 取文集名", bookCover?.alt === SERIES_NAME["webapp-vibe-coding"], `alt=${bookCover?.alt}`);
check(
	"目录页 og:image = 同一张封面（非站点头像）",
	typeof bookOg === "string" && bookOg.endsWith(COVER["webapp-vibe-coding"]),
	`og:image=${bookOg}`,
);

status = await goto(`/series/matt-pocock/`);
const mattCover = await page.evaluate(() =>
	document.querySelector("figure.post-cover img")?.getAttribute("src") ?? null,
);
check("目录页 /series/matt-pocock/ 返回 200", status === 200, `status=${status}`);
check(
	"Matt 目录页封面走回退 = workflow-cover",
	mattCover === COVER["matt-pocock"],
	`src=${mattCover ?? "无"}`,
);

status = await goto(`/series/`);
const overview = await page.evaluate(() => ({
	thumbCount: document.querySelectorAll(".post-thumbnail.series-thumb").length,
	thumbSrcs: [...document.querySelectorAll(".post-thumbnail.series-thumb img")].map(
		(i) => i.getAttribute("src"),
	),
	og: document.querySelector('meta[property="og:image"]')?.getAttribute("content"),
}));
check("总览页 /series/ 返回 200", status === 200, `status=${status}`);
check(
	"总览页每张文集卡都有封面（2 张，且用 .series-thumb 修饰符）",
	overview.thumbCount === 2,
	`count=${overview.thumbCount}`,
);
check(
	"总览页封面与目录页同一来源（回退一致）",
	overview.thumbSrcs[0] === COVER["webapp-vibe-coding"] &&
		overview.thumbSrcs[1] === COVER["matt-pocock"],
	`${overview.thumbSrcs.join(" | ")}`,
);
check(
	"总览页 og:image = seriesList 首笔（webapp-vibe-coding）的封面",
	typeof overview.og === "string" &&
		overview.og.endsWith(COVER["webapp-vibe-coding"]),
	`og:image=${overview.og}`,
);

// —— 6. 全程无本地报错 ——
check(
	"全程无本地 console / page 报错",
	harness.errors.length === 0,
	harness.errors.slice(0, 3).join(" | "),
);
if (externalIssues.length)
	console.log(
		`NOTE  外部服务请求问题（不计失败）: ${[...new Set(externalIssues)].join(", ")}`,
	);

const { total } = harness.summary();
if (total !== EXPECTED_CHECKS) {
	console.error(
		`\n[series-smoke] 判据总数 ${total} ≠ 写死基线 ${EXPECTED_CHECKS}：` +
			`判据同批固定后不得增减（#49 不变量）。改判据必须同步 EXPECTED_CHECKS，并说明理由。`,
	);
	process.exit(2);
}

await browser.close();

harness.finish();
