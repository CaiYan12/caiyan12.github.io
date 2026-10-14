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
// 当前 42 = 原 32 + 3 条粘性判据（站长 2026-10-06 目视后新增粘性需求：
// 侧栏文集目录滚过自然位置后贴顶、被 #content 底部顶住、回滚归位）
// + 1 条标题栏入口判据（站长 2026-10-06 目视后把「查看目录」由元件左下角
// 移入标题栏 actions 槽，原底部入口 series-toc-more 删除，需防回归）
// + 3 条 = 第四章（20261010081019）并入本书（2026-10-10）：组内相邻判据随成员数
// 增 1 条（4 → 5）；末章由第三章改为第四章，原挂在第三章的「末章收尾」判据拆成
// 「第三章改判非末章文案 1 条 + 第四章顶部行 1 条 + 第四章收尾 1 条」，故净 +2。
// + 3 条 = 第五章（20261011101832，L4 Node.js）并入本书（2026-10-11）：组内相邻判据
// 随成员数再增 1 条（5 → 6）；末章由第四章移到第五章，原挂在第四章的「末章收尾」
// 判据拆成「第四章改判非末章文案 1 条 + 第五章顶部行 1 条 + 第五章收尾 1 条」，故净 +2。
// #97（侧栏粘性栈预重构）：**判据数不变，仍是 42**，只把三条粘性判据的量测对象从
// 「小部件自身」（#sidebar .widget.widget-series）换成「承担粘性的共享容器」
// （#sidebar [data-widget-stack]）——粘性已由容器独家承担，量旧元素会恒为「未钉住」。
// 该票是预重构、读者可见行为不变，故不新增判据：把「两个小部件不重叠」加在这里只会
// 是单子项恒真的空转，那条留给引入第二个成员的 T2。
// + 7 条 = T2（#98）侧栏「文章目录」小部件上线（2026-10-14）：第二条成员进入粘性栈，
// #97 预留的「两个小部件不重叠」在此兑现。七条 = ①侧栏条目与顶部目录同源（href
// 序列逐项相等，两处是同一份内容的两种放置）；②零标题文章（20260909092113，实测
// 全站唯一公开零标题样本）不出现空目录盒；③条目带 title 且单行（getClientRects
// 长度 1）；④两个小部件不重叠（.widget-series 外边距盒底 ≤ 文章目录顶，±0.5）；
// ⑤360px 视口容器不溢出（#97 容器弹性高度的承载判据，此前空转缺第二条成员）；
// ⑥两处地标可访问名称不同；⑦条目可聚焦且按 DOM 顺序排列（聚焦第一个 = 顶部目录
// 之后紧邻的侧栏链接）。
// + 7 条 = T3（#99）激活态跟随阅读位置（2026-10-14）：①页顶零点亮（首标题越线
// 前「没有正在阅读的章节」是有意状态）；②越过第 3 个标题后激活第 3 条；③高亮
// 真的被画出来（激活项与相邻项计算样式差异，不锁颜色字符串）；④aria-current 用
// 文档内位置语义 location；⑤激活项保持在容器可见范围内（直接设 scrollTop 的
// reveal 生效）；⑥目录内滚动不冒泡页面本体（scrollIntoView 禁用的回归守卫）；
// ⑦页底兜底点亮最后一条。全部真滚动测量。
import { makeHarness } from "./lib/smoke-harness.mjs";

const EXPECTED_CHECKS = 56;

// 组成员与序号：与 src/data/series.ts 及七篇文章的 frontmatter 同批核对。
// 增删文集成员/章节必须同步这里，否则相邻 href 判据会整段失真。
const MEMBERS = {
	"webapp-vibe-coding": [
		"20261002071103",
		"20261002081331",
		"20261002093931",
		"20261002204249",
		"20261010081019",
		"20261011101832",
	],
	"matt-pocock": ["20260919135000", "20261006110122"],
};
const ALL_MEMBERS = Object.values(MEMBERS).flat();

// 非成员样本必须是**公开**文章：20260728000000 虽是置顶帖，但 private:true 会被
// getSortedPosts 的 isPublicPost 剔出时间线，拿它验证「非成员页不出现文集 UI」
// 天然为真，咬不住「公开非成员被误加文集 UI」。20260927082016 实测 private:false、
// draft:false、series:none，且紧邻本书六章（第〇–第五章）在时间线上的位置——它改造前的「下一篇（右）」
// 正指向第〇章，故还能顺带咬住「非成员导航跳过整块」。
const NON_MEMBER = "20260927082016";
// 实测该非成员序列里它更早的一篇（它是最新的非成员，故 next 恒为 null）。
const NON_MEMBER_PREV = "20260925150221";

// 两个文集目录页当前都不写 cover，封面走「按 seriesOrder 升序取首位带 image 的成员」回退。
const COVER = {
	"webapp-vibe-coding":
		"/images/posts/20261002071103/webapp-vibe-coding-ch0-cover.jpg",
	"matt-pocock":
		"/images/posts/20260919135000/matt-pocock-workflow-cover.jpg",
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
check(
	`非成员 ${NON_MEMBER}：无 next（它是最新的非成员）`,
	nmNav.next === null,
	`next=${nmNav.next}`,
);
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
check("第〇章：两行都在", ch0Notes.length === 2, `count=${ch0Notes.length}`);
check(
	"第〇章：顶部行 = 第 0 / 6 章 + 目录链接",
	ch0Notes[0]?.text === `本文属于《看懂 AI 写的网站》· 第 0 / 6 章 · 目录` &&
		ch0Notes[0]?.links[0] === `/series/webapp-vibe-coding/`,
	`${ch0Notes[0]?.text} | ${ch0Notes[0]?.links?.join(",")}`,
);
check(
	"第〇章：末尾行 = 第 0 / 6 章（非末章，不收尾）",
	ch0Notes[1]?.text === `本文属于《看懂 AI 写的网站》· 第 0 / 6 章` &&
		ch0Notes[1]?.links.length === 0,
	`${ch0Notes[1]?.text} | ${ch0Notes[1]?.links?.join(",")}`,
);

await goto(`/posts/20261002204249/`);
const ch3Notes = await seriesNotes();
check(
	"第三章：顶部行 = 第 3 / 6 章 + 目录链接",
	ch3Notes[0]?.text === `本文属于《看懂 AI 写的网站》· 第 3 / 6 章 · 目录` &&
		ch3Notes[0]?.links[0] === `/series/webapp-vibe-coding/`,
	`${ch3Notes[0]?.text}`,
);
check(
	"第三章（非末章）：末尾行 = 第 3 / 6 章（收尾已移交给第五章）",
	ch3Notes[1]?.text === `本文属于《看懂 AI 写的网站》· 第 3 / 6 章` &&
		ch3Notes[1]?.links.length === 0,
	`${ch3Notes[1]?.text} | ${ch3Notes[1]?.links?.join(",")}`,
);

await goto(`/posts/20261010081019/`);
const ch4Notes = await seriesNotes();
check(
	"第四章：顶部行 = 第 4 / 6 章 + 目录链接",
	ch4Notes[0]?.text === `本文属于《看懂 AI 写的网站》· 第 4 / 6 章 · 目录` &&
		ch4Notes[0]?.links[0] === `/series/webapp-vibe-coding/`,
	`${ch4Notes[0]?.text}`,
);
check(
	"第四章（非末章）：末尾行 = 第 4 / 6 章（收尾已移交给第五章）",
	ch4Notes[1]?.text === `本文属于《看懂 AI 写的网站》· 第 4 / 6 章` &&
		ch4Notes[1]?.links.length === 0,
	`${ch4Notes[1]?.text} | ${ch4Notes[1]?.links?.join(",")}`,
);

await goto(`/posts/20261011101832/`);
const ch5Notes = await seriesNotes();
check(
	"第五章：顶部行 = 第 5 / 6 章 + 目录链接",
	ch5Notes[0]?.text === `本文属于《看懂 AI 写的网站》· 第 5 / 6 章 · 目录` &&
		ch5Notes[0]?.links[0] === `/series/webapp-vibe-coding/`,
	`${ch5Notes[0]?.text}`,
);
check(
	"第五章（末章）：末尾行改收尾 → 《…》已读完 · 看其它文集 → /series/",
	ch5Notes[1]?.text === `《看懂 AI 写的网站》已读完 · 看其它文集` &&
		ch5Notes[1]?.links[0] === `/series/`,
	`${ch5Notes[1]?.text} | ${ch5Notes[1]?.links?.join(",")}`,
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
	"第三章：侧栏有章节目录，6 条成员链接",
	ch3Sidebar !== null && ch3Sidebar.items === 6,
	`items=${ch3Sidebar?.items ?? "无"}`,
);
check(
	'第三章：当前章带 .current 与 aria-current="page"',
	ch3Sidebar?.currentHref === `/posts/20261002204249/` &&
		ch3Sidebar?.currentAria === "page",
	`current=${ch3Sidebar?.currentHref} aria=${ch3Sidebar?.currentAria}`,
);
check(
	"第三章：侧栏目录的链接按 seriesOrder 升序 = 六章顺序",
	JSON.stringify(ch3Sidebar?.links) ===
		JSON.stringify(
			MEMBERS["webapp-vibe-coding"].map((id) => `/posts/${id}/`),
		),
	`${ch3Sidebar?.links?.join(",")}`,
);
// 标题栏 actions 槽的「查看目录」（站长 2026-10-06 目视后由左下角移入）：
// 在 h2 内且指向该文集目录页；旧的底部入口 .series-toc-more 必须已不存在。
const ch3TocLink = await page.evaluate(() => {
	const link = document.querySelector("#sidebar h2 a.series-toc-link");
	return {
		exists: link !== null,
		href: link?.getAttribute("href") ?? null,
		moreGone: document.querySelector("#sidebar .series-toc-more") === null,
	};
});
check(
	"第三章：「查看目录」在标题栏 actions 槽且指向 /series/webapp-vibe-coding/",
	ch3TocLink.exists &&
		ch3TocLink.href === "/series/webapp-vibe-coding/" &&
		ch3TocLink.moreGone,
	`exists=${ch3TocLink.exists} href=${ch3TocLink.href} moreGone=${ch3TocLink.moreGone}`,
);
await goto(`/posts/${NON_MEMBER}/`);
const nmSidebar = await sidebarSeries();
check(
	`非成员 ${NON_MEMBER}：侧栏无章节目录`,
	nmSidebar === null,
	`result=${JSON.stringify(nmSidebar)}`,
);

// —— 4b. 粘性跟随（站长 2026-10-06 目视后新增，纯 CSS sticky）：三条判据全部
// 真滚动测量。**量测对象是粘性容器（[data-widget-stack]），不是小部件自身**——
// #97 起粘性由「包住文集目录的共享容器」独家承担（小部件自粘会让第二个成员
// 互相压住，ADR 0008），故三条判据跟着换锚点；原来的 #sidebar .widget.widget-series
// 不再带 sticky，量它会恒为「未钉住」。
// 注意 series 现排在侧栏末位，自然位置较深，滚动量按实测自然位置
// 推导而非写死（写死会随 widget 增删失真）。
// 「被 content 底顶住」一条用 360 高的专用视口：默认 720 高下页尾残留（footer 等
// 约 229px）大于容器高（约 200px），滚到底时 content 底仍在视口内较深处，
// 容器永远到不了钳位区间——顶起状态物理不可达；360 高下可达且宽度仍 1280，
// 不触发移动端断点。
const stickyCtx = await browser.newContext({
	viewport: { width: 1280, height: 360 },
});
const stickyPage = harness.attach(await stickyCtx.newPage());
const sp = stickyPage;
await sp.goto(base + `/posts/20261002204249/`, { waitUntil: "load" });
const stickyProbe = async () =>
	sp.evaluate(() => {
		const stack = document.querySelector("#sidebar [data-widget-stack]");
		const content = document.querySelector("#content");
		if (!stack || !content) return null;
		const wr = stack.getBoundingClientRect();
		const cr = content.getBoundingClientRect();
		// sticky 钳位对齐的是外边距盒；容器是 <div>，没有 .widget 那 10px
		// margin-bottom（那 10px 在容器内的最后一个 .widget 上），故这里量到的
		// margin-bottom 是 0——仍一并换算，免得将来给容器加外边距时判据失真。
		const mb = parseFloat(getComputedStyle(stack).marginBottom) || 0;
		return {
			stackTop: +wr.top.toFixed(1),
			stackMarginBoxBottom: +(wr.bottom + mb).toFixed(1),
			contentBottom: +cr.bottom.toFixed(1),
			scrollY: Math.round(window.scrollY),
		};
	});
// 自然位置（文档坐标）：滚回顶部后量。
await sp.evaluate(() => window.scrollTo(0, 0));
await sp.waitForTimeout(100);
const natural = await stickyProbe();
const naturalDocTop = natural.stackTop + natural.scrollY;
// 判据 a：滚过自然位置 400px → 钉在视口顶 10px（容差 ±2）。
await sp.evaluate((y) => window.scrollTo(0, y), naturalDocTop + 400);
await sp.waitForTimeout(100);
const pinned = await stickyProbe();
check(
	"粘性：滚过自然位置后容器贴视口顶 10px（±2）",
	pinned !== null && Math.abs(pinned.stackTop - 10) <= 2,
	`scrollY=${pinned?.scrollY} stackTop=${pinned?.stackTop}（自然位置 docTop=${naturalDocTop}）`,
);
// 判据 b：滚到页底 → 容器底被 content 底顶住：底边与 content 底重合（±1），
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
	"粘性：滚到页底，容器底被 content 底顶住（外边距盒底与 content 底重合 ±1）且离开贴顶位",
	pushed !== null &&
		Math.abs(pushed.stackMarginBoxBottom - pushed.contentBottom) <= 1 &&
		pushed.stackTop < 10,
	`scrollY=${pushed?.scrollY} stackTop=${pushed?.stackTop} marginBoxBottom=${pushed?.stackMarginBoxBottom} contentBottom=${pushed?.contentBottom}`,
);
// 判据 c：滚回顶部 → 回到自然位置（top > 10，未钉住）。加「与自然位置 docTop
// 一致（±2）」的双向断言：单侧 `top > 10` 在 sticky 被整个删掉时依然为真
// （元素本来就在自然位置），变异自证咬不住「完全没粘」这一形态（#97 实测）。
await sp.evaluate(() => window.scrollTo(0, 0));
await sp.waitForTimeout(100);
const back = await stickyProbe();
check(
	"粘性：滚回顶部后容器回到自然位置（top > 10，且与自然 docTop 一致 ±2，未钉住）",
	back !== null &&
		back.stackTop > 10 &&
		Math.abs(back.stackTop + back.scrollY - naturalDocTop) <= 2,
	`scrollY=${back?.scrollY} stackTop=${back?.stackTop}（自然 docTop=${naturalDocTop}）`,
);
await stickyCtx.close();

// —— 4c. 侧栏「文章目录」（T2/#98）：运行时采集、同源、降级、几何 ——
// 采集是模块脚本运行时行为：waitUntil:"load" 必然晚于它执行完（AGENTS.md 承重
// 事实 ②），无需为「还没填」加保险睡眠；判据一律读状态，不 waitForTimeout。
await goto(`/posts/20261002204249/`);
const tocProbe = await page.evaluate(() => {
	const widget = document.querySelector(
		'#sidebar [data-article-toc] ol, #sidebar nav[aria-label="侧栏文章目录"] ol',
	);
	const topToc = document.querySelector(".post-toc nav ol");
	const widgetOl = document.querySelector("#sidebar .article-toc");
	if (!widget || !topToc || !widgetOl) {
		return { widget: !!widget, topToc: !!topToc, widgetOl: !!widgetOl };
	}
	const sideLinks = [...widgetOl.querySelectorAll("li a")];
	const topLinks = [...topToc.querySelectorAll("li a")];
	return {
		sideHrefs: sideLinks.map((a) => a.getAttribute("href")),
		topHrefs: topLinks.map((a) => a.getAttribute("href")),
		allTitled: sideLinks.every(
			(a) =>
				a.getAttribute("title") === a.textContent?.replace(/\s+/g, " "),
		),
		singleLine: sideLinks.every((a) => a.getClientRects().length === 1),
		focusableOrder: sideLinks.every(
			(a, i) =>
				a.tabIndex !== -1 && sideLinks.indexOf(sideLinks[i]) === i, // DOM 顺序即数组顺序
		),
		sideLabel: document
			.querySelector("#sidebar nav[aria-label]")
			?.getAttribute("aria-label"),
		topLabel: document
			.querySelector(".post-toc nav")
			?.getAttribute("aria-label"),
	};
});
check(
	"侧栏文章目录与顶部目录同源：条目 href 序列逐项相等",
	tocProbe.sideHrefs?.length > 0 &&
		JSON.stringify(tocProbe.sideHrefs) ===
			JSON.stringify(tocProbe.topHrefs),
	`side=${tocProbe.sideHrefs?.length} top=${tocProbe.topHrefs?.length}`,
);
check(
	"侧栏条目带 title 全文且单行（getClientRects().length === 1）",
	tocProbe.allTitled && tocProbe.singleLine,
	`allTitled=${tocProbe.allTitled} singleLine=${tocProbe.singleLine}`,
);
check(
	"侧栏条目为可聚焦链接且按 DOM 顺序排列",
	tocProbe.focusableOrder === true,
	`focusableOrder=${tocProbe.focusableOrder}`,
);
check(
	"两处导航地标可访问名称不同（侧栏文章目录 vs 文章目录）",
	tocProbe.sideLabel != null &&
		tocProbe.topLabel != null &&
		tocProbe.sideLabel !== tocProbe.topLabel,
	`side="${tocProbe.sideLabel}" top="${tocProbe.topLabel}"`,
);

// 零标题降级：20260909092113 是全站唯一公开零标题样本（另两篇私密/草稿不生成页）。
// 该文不属于任何文集，故侧栏两件都不出现才是对的（User Story 18 + 19 叠加）。
await goto(`/posts/20260909092113/`);
const zeroTitleProbe = await page.evaluate(() => ({
	articleTocGone:
		document.querySelector("#sidebar [data-article-toc]") === null &&
		document.querySelector("#sidebar .article-toc") === null,
	seriesTocAlsoAbsent:
		document.querySelector("#sidebar .series-toc") === null,
}));
check(
	"零标题文章：侧栏不出现文章目录空盒（运行时移除）",
	zeroTitleProbe.articleTocGone === true,
	`articleTocGone=${zeroTitleProbe.articleTocGone}`,
);

// 两个小部件不重叠（#97 裁决留给 T2 兑现的一条）：量 .widget-series 的外边距盒
// 底与文章目录元件盒顶，前者 ≤ 后者（±0.5 容差）。自然位置下量——粘性钉住时
// 二者是同一容器的子项、天然不重叠，量不出真实缺陷。
await goto(`/posts/20261002204249/`);
const overlapProbe = await page.evaluate(() => {
	const series = document.querySelector("#sidebar .widget.widget-series");
	const article = document.querySelector(
		"#sidebar .widget.widget-article-toc",
	);
	if (!series || !article) return null;
	const sr = series.getBoundingClientRect();
	const ar = article.getBoundingClientRect();
	const mb = parseFloat(getComputedStyle(series).marginBottom) || 0;
	return {
		seriesMarginBoxBottom: +(sr.bottom + mb).toFixed(1),
		articleTop: +ar.top.toFixed(1),
		gap: +(ar.top - (sr.bottom + mb)).toFixed(1),
	};
});
check(
	"两个小部件不重叠：文集目录外边距盒底 ≤ 文章目录顶（±0.5）",
	overlapProbe !== null &&
		overlapProbe.seriesMarginBoxBottom <= overlapProbe.articleTop + 0.5,
	`gap=${overlapProbe?.gap} seriesBottom=${overlapProbe?.seriesMarginBoxBottom} articleTop=${overlapProbe?.articleTop}`,
);

// 容器弹性（票面修订为 T2 负责补测）：360px 高视口（宽度仍 1280，见 A8 不触发
// 移动断点）下装下两个小部件——外壳不溢出视口，文章目录的内滚层收缩。
{
	const flexCtx = await browser.newContext({
		viewport: { width: 1280, height: 360 },
	});
	const flexPage = harness.attach(await flexCtx.newPage());
	const fp = flexPage;
	await fp.goto(base + `/posts/20261002204249/`, { waitUntil: "load" });
	// 相位与粘性判据同法：**先滚过自然位置让容器钉住**，再量——自然位置下容器
	// 本来就在文档深处，stackBottom ≤ 视口高恒为假，量不出任何缺陷。
	const naturalFlex = await fp.evaluate(
		() =>
			document
				.querySelector("#sidebar [data-widget-stack]")
				.getBoundingClientRect().top + window.scrollY,
	);
	await fp.evaluate((y) => window.scrollTo(0, y), naturalFlex + 400);
	await fp.waitForFunction(
		() => {
			const st = document
				.querySelector("#sidebar [data-widget-stack]")
				?.getBoundingClientRect();
			return st && Math.abs(st.top - 10) <= 2; // 钉稳（与粘性判据 a 同口径）
		},
		{ timeout: 5000 },
	);
	const flexProbe = await fp.evaluate(() => {
		const stack = document.querySelector("#sidebar [data-widget-stack]");
		const article = document.querySelector(
			"#sidebar .widget.widget-article-toc",
		);
		const scroll = document.querySelector(
			"#sidebar .widget-article-toc .article-toc-scroll",
		);
		if (!stack || !article || !scroll) return null;
		const st = stack.getBoundingClientRect();
		const sr = article.getBoundingClientRect();
		return {
			stackBottom: +st.bottom.toFixed(1),
			viewportH: window.innerHeight,
			articleVisible: sr.top >= 0 && sr.bottom <= window.innerHeight,
			scrollShrinks: scroll.scrollHeight > scroll.clientHeight, // 长列表确实在内滚
		};
	});
	check(
		"360px 视口：钉住后粘性容器不溢出视口，文章目录在小部件内滚动",
		flexProbe !== null &&
			flexProbe.stackBottom <= flexProbe.viewportH &&
			flexProbe.articleVisible &&
			flexProbe.scrollShrinks,
		`stackBottom=${flexProbe?.stackBottom} viewportH=${flexProbe?.viewportH} articleVisible=${flexProbe?.articleVisible} scrollShrinks=${flexProbe?.scrollShrinks}`,
	);
	await flexCtx.close();
}

// —— 4d. 激活态跟随阅读位置（T3/#99）：滚动正文时侧栏目录点亮对应条目 ——
// 全部真滚动测量：等的是「高亮真的被画出来」（计算样式差异）这类真实状态，
// 不 waitForTimeout。判定线 10px 与粘性钳位同值（规格实现决策 18）。
{
	const spyCtx = await browser.newContext({
		viewport: { width: 1280, height: 720 },
	});
	const spyPage = harness.attach(await spyCtx.newPage());
	const sp2 = spyPage;
	await sp2.goto(base + `/posts/20261002204249/`, { waitUntil: "load" });

	const tocSpyProbe = () =>
		sp2.evaluate(() => {
			const lis = [
				...document.querySelectorAll("#sidebar .article-toc li"),
			];
			if (lis.length === 0) return null;
			const scroller = document
				.querySelector("#sidebar [data-article-toc]")
				?.closest?.("[data-article-toc]");
			const scrollEl =
				scroller ??
				document.querySelector("#sidebar [data-article-toc]");
			const current = lis.findIndex((li) =>
				li.classList.contains("current"),
			);
			// 「高亮真的被画出来」断言计算值差异，不锁颜色字符串：
			// 激活项的 fontWeight 或 color 必须与相邻未激活项不同。
			const cur = lis[current];
			const other = lis[current === 0 ? 1 : current - 1];
			const cs = (el) => getComputedStyle(el.querySelector("a"));
			const highlighted =
				current === -1 ||
				cs(cur).fontWeight !== cs(other).fontWeight ||
				cs(cur).color !== cs(other).color;
			// 激活项是否在容器可见范围内（未点亮时此项无意义，恒真放行）
			const itemTop = cur?.offsetTop ?? 0;
			const itemBottom = itemTop + (cur?.offsetHeight ?? 0);
			const itemVisible =
				current === -1 ||
				(itemTop >= scrollEl.scrollTop &&
					itemBottom <= scrollEl.scrollTop + scrollEl.clientHeight);
			return {
				count: lis.length,
				current,
				highlighted,
				itemVisible,
				pageY: window.scrollY,
				scrollerTop: scrollEl.getBoundingClientRect().top,
				currentHref: lis[current]
					?.querySelector("a")
					?.getAttribute("href"),
				currentAria: lis[current]
					?.querySelector("a")
					?.getAttribute("aria-current"),
				// 采集口径与运行时同源：h2/h3/h4 带 id（该文 h2/h3 混排，
				// 只取 h2 会让「滚到第 3 个标题」对错目录索引）。
				headings: [
					...document.querySelectorAll(
						".post-body :is(h2,h3,h4)[id]",
					),
				]
					.slice(0, lis.length)
					.map((h) =>
						Math.round(
							h.getBoundingClientRect().top + window.scrollY,
						),
					),
			};
		});

	// 判据 1：页顶时零点亮（首标题距判定线还远）。
	await sp2.evaluate(() => window.scrollTo(0, 0));
	await sp2.waitForFunction(() => window.scrollY === 0, { timeout: 5000 });
	const top = await tocSpyProbe();
	check(
		"激活态：页顶（首标题越线前）侧栏目录零点亮",
		top !== null && top.current === -1,
		`current=${top?.current} count=${top?.count}`,
	);

	// 判据 2：滚过第 3 个标题（docY + 50）→ 激活第 3 条；高亮真的被画出来
	// （计算样式差异）；aria-current 用「文档内位置」语义 location；
	// 激活项在容器可视内；页面本体不被目录滚动改变。标题坐标表取的是
	// h2/h3/h4 混排（与运行时采集同源），滚到 headings[2] 越线即激活索引 2。
	const target = top.headings[2] + 50;
	await sp2.evaluate((y) => window.scrollTo(0, y), target);
	await sp2.waitForFunction(
		() =>
			document.querySelector("#sidebar .article-toc li.current") !== null,
		{ timeout: 5000 },
	);
	const mid = await tocSpyProbe();
	check(
		"激活态：越过第 3 个标题后激活第 3 条（rAF 后读取）",
		mid !== null && mid.current === 2,
		`current=${mid?.current}（滚至 docY=${target}）`,
	);
	check(
		"激活态：高亮真的被画出来（激活项与相邻项计算样式不同）",
		mid !== null && mid.current !== -1 && mid.highlighted,
		`current=${mid?.current} highlighted=${mid?.highlighted}`,
	);
	check(
		"激活态：aria-current 用文档内位置语义 location（非 page）",
		mid?.currentAria === "location",
		`aria-current=${mid?.currentAria}`,
	);
	check(
		"激活态：激活项保持在目录容器可见范围内",
		mid !== null && mid.itemVisible,
		`itemVisible=${mid?.itemVisible} current=${mid?.current}`,
	);
	check(
		"激活态：目录内滚动不冒泡页面（激活前后页面 Y 未被目录滚动改变）",
		mid !== null && Math.abs(mid.pageY - target) <= 2,
		`pageY=${mid?.pageY} 期望=${target}`,
	);

	// 判据 3：滚到页底 → 最后一条被点亮（页底兜底分支）。
	await sp2.evaluate(() => window.scrollTo(0, Number.MAX_SAFE_INTEGER));
	await sp2.evaluate(async () => {
		// 懒加载会撑开页高：等文档高度稳定再读（与粘性判据 b 同法）。
		let last = -1;
		for (let i = 0; i < 30; i++) {
			const h = document.documentElement.scrollHeight;
			if (Math.abs(h - last) < 0.5) break;
			last = h;
			await new Promise((r) => setTimeout(r, 100));
		}
	});
	await sp2.waitForFunction(
		() => {
			const lis = [
				...document.querySelectorAll("#sidebar .article-toc li"),
			];
			return (
				lis.length > 0 &&
				lis[lis.length - 1].classList.contains("current")
			);
		},
		{ timeout: 5000 },
	);
	const bottom = await tocSpyProbe();
	check(
		"激活态：滚到页底，最后一条被点亮（页底兜底）",
		bottom !== null && bottom.current === bottom.count - 1,
		`current=${bottom?.current} count=${bottom?.count}`,
	);
	await spyCtx.close();
}

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
check(
	"目录页 /series/webapp-vibe-coding/ 返回 200",
	status === 200,
	`status=${status}`,
);
check(
	"目录页封面走回退 = 本书第〇章头图",
	bookCover?.src === COVER["webapp-vibe-coding"],
	`src=${bookCover?.src ?? "无"}`,
);
check(
	"目录页封面 alt/title 取文集名",
	bookCover?.alt === SERIES_NAME["webapp-vibe-coding"],
	`alt=${bookCover?.alt}`,
);
check(
	"目录页 og:image = 同一张封面（非站点头像）",
	typeof bookOg === "string" && bookOg.endsWith(COVER["webapp-vibe-coding"]),
	`og:image=${bookOg}`,
);

status = await goto(`/series/matt-pocock/`);
const mattCover = await page.evaluate(
	() =>
		document.querySelector("figure.post-cover img")?.getAttribute("src") ??
		null,
);
check(
	"目录页 /series/matt-pocock/ 返回 200",
	status === 200,
	`status=${status}`,
);
check(
	"Matt 目录页封面走回退 = workflow-cover",
	mattCover === COVER["matt-pocock"],
	`src=${mattCover ?? "无"}`,
);

status = await goto(`/series/`);
const overview = await page.evaluate(() => ({
	thumbCount: document.querySelectorAll(".post-thumbnail.series-thumb")
		.length,
	thumbSrcs: [
		...document.querySelectorAll(".post-thumbnail.series-thumb img"),
	].map((i) => i.getAttribute("src")),
	og: document
		.querySelector('meta[property="og:image"]')
		?.getAttribute("content"),
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
