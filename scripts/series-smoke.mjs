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
// + 6 条 = T4（#100）换页生命周期（2026-10-14）：目录随 swup 换页换新、高亮重置。
// 六条全部经**站内链接**点击触发 swup（page.goto 不经过 swup，测不出换页）：
// ①长文（20261002204249，全站标题最多）切到短文（20260925150221）条目换成新文章
// 的（条数与 href 均变）；②换页后无上一篇残留的 .current / aria-current；③切到
// 零标题文章（20260909092113）后目录元件被移除；④再切回有标题文章目录重建；
// ⑤来回切 3 次条目数恒定（无重复堆积，监听器只绑一次的回归守卫）；⑥换页后目录
// 仍然工作（滚到页底激活项点亮，重采集不是一次性失效）。相位全由真实状态定义。
// 净 +3 = P1（#97 验收第 4 条，2026-10-14 集成分支 code-review 修复）：容器弹性
// 判据由单档 360 展开为 900/720/500/360 四档循环，每档一条复合判据（钉住后容器
// 不溢出 + 内滚到底后最后一条仍在视口内），判据数 62 → 65。
// + 8 条 = T5（#102）激活项居中 + 到达动画（2026-10-14）：原「激活项保持在容器
// 可见范围内」一条语义升级为「激活项位于容器垂直中部（±2px）」（reveal 由越界
// 拖回边缘改为居中钳制，判据数不变），另新增八条：①颜色过渡（激活项 color 计算值
// 多帧过渡，字重 700 无中间值）；②自动滚动多帧过渡（中间帧 scrollTop 介于起止
// 之间，约 200ms rAF 自绘）；③快速连续滑动旧动画被取消、目标直接追新（中途不落
// 旧目标，不排队不积压）；④连续激活变化防抖生效（目标稳定前容器不动）；⑤列表
// 首尾钳制（首章钳 0、末章钳最大滚动位，不拖出空白）；⑥手动让位（用户滚动目录后
// 3s 内激活变化只改高亮不滚容器）；⑦静默 3s 后恢复自动居中；⑧prefers-reduced-
// motion 下瞬时直达（无中间帧）；⑨先滚动目录（wheel 武装让位窗）后点击条目链接
// ——导航点击清除让位窗，跳转后激活项照常居中（2026-10-15 站长报告「先滚动后
// 点击也要回正」）。判据数 65 → 74。
import { makeHarness } from "./lib/smoke-harness.mjs";

const EXPECTED_CHECKS = 74;

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
		focusableOrder:
			sideLinks.every((a) => a.tabIndex !== -1) &&
			JSON.stringify(sideLinks.map((a) => a.getAttribute("href"))) ===
				JSON.stringify(topLinks.map((a) => a.getAttribute("href"))), // 与顶部目录逐项相等且同序（集合咬合，非恒真自比）
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
		document.querySelector("#sidebar [data-article-toc]") === null,
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
	const article = document.querySelector("#sidebar [data-article-toc]");
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

// 容器弹性（#97 验收修订，P1 修复兑现）：四档视口高（900/720/500/360）各建
// context，宽度仍 1280 不触发移动断点。每档两条：①先滚过自然位置让容器钉住
// （自然位置下容器本就在文档深处，底 ≤ 视口高恒为假，量不出缺陷），钉稳后
// 粘性容器底 ≤ 视口高；②把内滚层滚到底后最后一条 li 的 rect 底仍在视口内
// （内滚收缩 + 末端条目可达，不止「容器装得下」）。相位由状态定义，无墙钟。
{
	const VIEWPORTS = [900, 720, 500, 360];
	for (const vh of VIEWPORTS) {
		const flexCtx = await browser.newContext({
			viewport: { width: 1280, height: vh },
		});
		const flexPage = harness.attach(await flexCtx.newPage());
		const fp = flexPage;
		await fp.goto(base + `/posts/20261002204249/`, { waitUntil: "load" });
		const naturalFlex = await fp.evaluate(
			() =>
				document
					.querySelector("#sidebar [data-widget-stack]")
					.getBoundingClientRect().top + window.scrollY,
		);
		await fp.evaluate((y) => window.scrollTo(0, y), naturalFlex + 400);
		await fp.waitForFunction(
			(v) => {
				const st = document
					.querySelector("#sidebar [data-widget-stack]")
					?.getBoundingClientRect();
				return st && Math.abs(st.top - 10) <= 2; // 钉稳（与粘性判据 a 同口径）
			},
			vh,
			{ timeout: 5000 },
		);
		const flexProbe = await fp.evaluate(() => {
			const stack = document.querySelector(
				"#sidebar [data-widget-stack]",
			);
			const scroll = document.querySelector(
				"#sidebar .article-toc-scroll",
			);
			if (!stack || !scroll) return null;
			const st = stack.getBoundingClientRect();
			// 内滚层滚到底：最后一条 li 的 rect 底 ≤ 视口高（在容器内可达末端）
			scroll.scrollTop = scroll.scrollHeight;
			const lis = [
				...document.querySelectorAll("#sidebar .article-toc li"),
			];
			const lastLi = lis[lis.length - 1]?.getBoundingClientRect();
			return {
				stackBottom: +st.bottom.toFixed(1),
				viewportH: window.innerHeight,
				scrollShrinks: scroll.scrollHeight > scroll.clientHeight, // 长列表确实在内滚
				lastLiBottom: lastLi ? +lastLi.bottom.toFixed(1) : null,
				scrollAtEnd:
					scroll.scrollTop + scroll.clientHeight >=
					scroll.scrollHeight - 2,
			};
		});
		check(
			`${vh}px 视口：钉住后粘性容器不溢出视口（底 ≤ 视口高）且内滚到底后最后一条仍在视口内`,
			flexProbe !== null &&
				flexProbe.stackBottom <= flexProbe.viewportH &&
				flexProbe.scrollShrinks &&
				flexProbe.scrollAtEnd &&
				flexProbe.lastLiBottom !== null &&
				flexProbe.lastLiBottom <= flexProbe.viewportH,
			`stackBottom=${flexProbe?.stackBottom} viewportH=${flexProbe?.viewportH} lastLiBottom=${flexProbe?.lastLiBottom} scrollShrinks=${flexProbe?.scrollShrinks}`,
		);
		await flexCtx.close();
	}
}

// —— 4d 前置工具（4d 主段与 reduced-motion 段共用）：整篇懒加载预载 + 布局钉稳。
// 该文 74 条目录、页高 4.4 万 px，冷上下文直跳深位置时「测量 → 断言」之间可能
// 有图片加载移位（实测 +60px 把第 3 个标题的判定漂到第 2 条，激活态读到滞留值、
// 居中等待等到错误条目超时）。逐屏扫过触发全部懒加载，等文档高度稳定再回顶，
// 此后整段布局不再变化。回顶后零点亮状态不受影响（页底兜底只在页底生效）。
const sweepAndSettle = async (pg) => {
	await pg.evaluate(async () => {
		const step = Math.max(600, window.innerHeight - 200);
		for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
			window.scrollTo(0, y);
			await new Promise((r) => requestAnimationFrame(r));
		}
		window.scrollTo(0, Number.MAX_SAFE_INTEGER);
	});
	await pg.evaluate(async () => {
		let last = -1;
		for (let i = 0; i < 40; i++) {
			const h = document.documentElement.scrollHeight;
			if (Math.abs(h - last) < 0.5) break;
			last = h;
			await new Promise((r) => setTimeout(r, 100));
		}
	});
	await pg.evaluate(() => window.scrollTo(0, 0));
	await pg.waitForFunction(() => window.scrollY === 0, undefined, {
		timeout: 5000,
	});
};

// —— 4d 页内 helper（收敛三处内联居中偏移 + 两处内联落定循环；T5 审查 F3）——
// 装进 window 的做法照本文件自装采样器先例（installTocScrollSampler 等）。
// 居中偏移：li 中线 − 容器中线（视口坐标）。验证侧（waitTocCenteredOn /
// reduced-motion 段）直接断言 |off| ≤ 2；liOfIndex 的居中目标 scrollTop =
// 同一偏移 + scrollTop 换回内容坐标再钳制——容器 .article-toc-scroll 无边框、
// 条目 a 自截断无横向滚动条（rect 高 == clientHeight），与原 clientHeight 写法
// 逐像素相等；与运行时 pickTocRevealScrollTop 同口径。
const installTocCenterOffset = (pg) =>
	pg.evaluate(() => {
		window.__tocCenterOffset = (li, sc) =>
			(li.getBoundingClientRect().top +
				li.getBoundingClientRect().bottom) /
				2 -
			(sc.getBoundingClientRect().top +
				sc.getBoundingClientRect().bottom) /
				2;
	});
// 落定等待：连续 8 帧不动（±0.5）且确有位移（max−min > 10，防抖静默期不算
// 落定）；600 帧兜底防挂死。判据语义与原两处内联循环逐字一致。
const installTocSettleWait = (pg) =>
	pg.evaluate(() => {
		window.__tocWaitScrollSettled = (sc) =>
			new Promise((resolve) => {
				let frames = 0;
				let stable = 0;
				let last = NaN;
				let min = Infinity;
				let max = -Infinity;
				const tick = () => {
					const v = sc.scrollTop;
					if (Math.abs(v - last) < 0.5) stable++;
					else stable = 0;
					last = v;
					min = Math.min(min, v);
					max = Math.max(max, v);
					if ((stable >= 8 && max - min > 10) || frames++ > 600)
						return resolve();
					requestAnimationFrame(tick);
				};
				requestAnimationFrame(tick);
			});
	});

// —— 4d. 激活态跟随阅读位置（T3/#99）+ 居中/动画/让位（T5/#102）——
// 全部真滚动测量：等的是「高亮真的被画出来」（计算样式差异）「亮行居中到位」
// 「滚动落定在边界」这类真实状态，不 waitForTimeout（唯一例外：让位恢复前的
// 3.3s——3s 静默窗口本身是规格语义，页面侧没有可等的状态信号）。
// 判定线 10px 与粘性钳位同值（规格实现决策 18）。
{
	const spyCtx = await browser.newContext({
		viewport: { width: 1280, height: 720 },
	});
	const spyPage = harness.attach(await spyCtx.newPage());
	const sp2 = spyPage;
	await sp2.goto(base + `/posts/20261002204249/`, { waitUntil: "load" });
	await sweepAndSettle(sp2);
	await installTocCenterOffset(sp2);
	await installTocSettleWait(sp2);

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
			// 激活项是否居中（#102/T5）：li 中线 − 容器中线，±2px 内算居中（票面
			// 验收口径）；首尾钳制时该值自然偏离 0，由钳制判据单独量化 scrollTop
			// 边界。换算沿用视口 rect 差——li 的 offsetParent 是 sticky 容器
			// .widget-stack（#97 重构后），offsetTop 与 scroller.scrollTop 不可比，
			// 数错单位必然假红（#99 实测教训），与运行时 reveal() 的换算同口径。
			const scrollRect = scrollEl.getBoundingClientRect();
			const itemRect = cur?.getBoundingClientRect();
			const centerOffset =
				current === -1 || !itemRect
					? null
					: (itemRect.top + itemRect.bottom) / 2 -
						(scrollRect.top + scrollRect.bottom) / 2;
			return {
				count: lis.length,
				current,
				highlighted,
				centerOffset,
				scrollTop: scrollEl.scrollTop,
				maxScroll: scrollEl.scrollHeight - scrollEl.clientHeight,
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

	const waitCurrentAt = (idx, timeout = 2500) =>
		sp2.waitForFunction(
			(i) =>
				document
					.querySelectorAll("#sidebar .article-toc li")
					[i]?.classList.contains("current") ?? false,
			idx,
			{ timeout },
		);
	// 等亮行居中到位（未钳制条目的落定信号：类已画 + 偏移 ≤2px）。
	const waitTocCenteredOn = (idx, timeout = 2500) =>
		sp2.waitForFunction(
			(i) => {
				const lis = [
					...document.querySelectorAll("#sidebar .article-toc li"),
				];
				const sc = document.querySelector(
					"#sidebar [data-article-toc]",
				);
				const li = lis[i];
				if (!li || !sc || !li.classList.contains("current"))
					return false;
				return Math.abs(window.__tocCenterOffset(li, sc)) <= 2;
			},
			idx,
			{ timeout },
		);
	// 等容器的滚动边界落定（钳制判据用）：bound = "top"（≤0.5）| "bottom"（距最大位 ≤2）。
	const waitTocClamped = (bound, timeout = 2500) =>
		sp2.waitForFunction(
			(b) => {
				const sc = document.querySelector(
					"#sidebar [data-article-toc]",
				);
				if (!sc) return false;
				return b === "top"
					? sc.scrollTop <= 0.5
					: Math.abs(
							sc.scrollTop - (sc.scrollHeight - sc.clientHeight),
						) <= 2;
			},
			bound,
			{ timeout },
		);
	// 自愈式落定等待：先普通等待；超时后跨过 3s 让位窗口（误触发的让位若没有
	// 后续激活变化可重触发，容器会停驻到任何有限超时——实测一次），再做一次
	// 「滚过去 +150 再滚回来」的激活往返强制 reveal 重新出发，最后再等一次。
	// 返回首败注记（T5 审查 F4）：首败时抓「哪条判据 + 当时 current/scrollTop」
	// 读数，自愈成功由调用方把「首败…自愈…」附进 PASS detail，自愈后仍败附进
	// FAIL 文案——不让真实间歇缺陷被静默洗绿；干净首过返回 ""，detail 原样。
	const waitSettledHealed = async (waitFn, label) => {
		let firstFail = "";
		try {
			await waitFn(2500);
			return "";
		} catch {
			// 进入自愈路径：先抓首败当时的读数。探针自身失败不得吞掉自愈
			// 路径（超时不再崩脚本的性质保留）。
			let p = {};
			try {
				p = (await tocSpyProbe()) ?? {};
			} catch {
				p = {};
			}
			firstFail =
				`首败 ${label}（current=${p.current ?? "?"} scrollTop=${p.scrollTop ?? "?"} ` +
				`centerOffset=${p.centerOffset?.toFixed(1) ?? "?"}）`;
		}
		await sp2.waitForTimeout(3300);
		await sp2.evaluate(async () => {
			window.scrollBy(0, 600);
			await new Promise((r) =>
				requestAnimationFrame(() => requestAnimationFrame(r)),
			);
			window.scrollBy(0, -600);
		});
		try {
			await waitFn(2500);
			return `${firstFail}，自愈（跨让位窗口+激活往返）成功`;
		} catch {
			return `${firstFail}；自愈后仍超时`;
		}
	};
	// detail 拼接：有首败注记才追加，干净路径 detail 一字不变。
	const joinDetail = (detail, note) => (note ? `${detail}；${note}` : detail);
	// 逐帧采样器：rAF 记录容器 scrollTop，供动画判据读中间帧。
	const installTocScrollSampler = () =>
		sp2.evaluate(() => {
			const sc = document.querySelector("#sidebar [data-article-toc]");
			window.__tocSamples = [];
			let raf = 0;
			const tick = () => {
				window.__tocSamples.push(sc.scrollTop);
				raf = requestAnimationFrame(tick);
			};
			raf = requestAnimationFrame(tick);
			window.__tocStopSampler = () => cancelAnimationFrame(raf);
		});
	// 逐帧采样器（颜色）：记录当前激活项 a 的计算色与字重，供 CSS 过渡判据用。
	const installTocColorSampler = () =>
		sp2.evaluate(() => {
			window.__tocSamples = [];
			window.__tocWeights = [];
			let raf = 0;
			const tick = () => {
				const a = document.querySelector(
					"#sidebar .article-toc li.current a",
				);
				window.__tocSamples.push(a ? getComputedStyle(a).color : "");
				window.__tocWeights.push(
					a ? getComputedStyle(a).fontWeight : "",
				);
				raf = requestAnimationFrame(tick);
			};
			raf = requestAnimationFrame(tick);
			window.__tocStopSampler = () => cancelAnimationFrame(raf);
		});
	const readTocSamples = () => sp2.evaluate(() => window.__tocSamples);
	const readTocWeights = () => sp2.evaluate(() => window.__tocWeights ?? []);
	const stopTocSampler = () =>
		sp2.evaluate(() => window.__tocStopSampler?.());

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
		undefined,
		{ timeout: 5000 },
	);
	// 顶钳制采样前等容器落定在 0 位：第 3 条的居中目标为负 → 钳 0。预载扫尾
	// 会把容器留在某个动画残位上，落定等待之前读 scrollTop 必然假红（实测）。
	const healTop = await waitSettledHealed(
		(t) => waitTocClamped("top", t),
		"顶钳位落定",
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
	// 顶钳制采样：第 3 条的居中目标为负 → 钳 0（首章不拖出顶部空白）。
	// 底钳制在页底兜底探针处采样，两处合成一条复合判据（见页底段后）。
	const topClampOk = mid !== null && mid.scrollTop === 0;
	check(
		"激活态：目录内滚动不冒泡页面（激活前后页面 Y 未被目录滚动改变）",
		mid !== null && Math.abs(mid.pageY - target) <= 2,
		`pageY=${mid?.pageY} 期望=${target}`,
	);

	// —— T5（#102）：居中 / 颜色过渡 / 多帧动画 / 取消追新 / 防抖 / 手动让位 ——
	// 相位全部由状态定义：等亮行居中到位、等 scrollTop 边界、逐帧采样要求不变量。
	// 唯一墙钟是让位恢复前的 3.3s——3s 静默窗口本身是规格语义，页面侧没有可等的
	// 状态信号。

	// 第 i 个标题对应的滚动落点：取它与下一条标题的**中点**（钳到 +15～+300），
	// 而非「标题 +50」——相邻标题不足 60px 时 +50 会越到下一条，激活索引漂移
	// （实测恢复判据因此等到错误条目超时）。
	const yOfHeading = (i) =>
		sp2.evaluate((idx) => {
			const heads = [
				...document.querySelectorAll(".post-body :is(h2,h3,h4)[id]"),
			];
			const base =
				heads[idx].getBoundingClientRect().top + window.scrollY;
			const next = heads[idx + 1];
			if (!next) return base + 50;
			const gap =
				next.getBoundingClientRect().top + window.scrollY - base;
			return base + Math.min(Math.max(gap / 2, 15), 300);
		}, i);
	// 落点 y 的期望激活索引：与运行时 pickActiveIndex 同一条规则（判定线 10）
	// 现量复算，不假设「第 i 个标题的落点必激活第 i 条」。
	const activeAtY = (y) =>
		sp2.evaluate((yy) => {
			const heads = [
				...document.querySelectorAll(".post-body :is(h2,h3,h4)[id]"),
			];
			let active = -1;
			for (let i = 0; i < heads.length; i++) {
				if (
					heads[i].getBoundingClientRect().top +
						window.scrollY -
						yy <=
					10
				)
					active = i;
				else break;
			}
			return active;
		}, y);
	// 某激活索引的 li 的居中目标 scrollTop（与运行时同式钳制到 [0, max]）——
	// 取消追新判据的「旧目标」必须用钳制后的真值，否则断言阈值失真。
	// raw = 居中偏移（页内 helper）+ scrollTop 换回内容坐标（容器无边框，
	// 与原 clientHeight 写法逐像素相等，见 installTocCenterOffset 注）。
	const liOfIndex = (i) =>
		sp2.evaluate((idx) => {
			const lis = [
				...document.querySelectorAll("#sidebar .article-toc li"),
			];
			const li = lis[idx];
			const sc = document.querySelector("#sidebar [data-article-toc]");
			if (!li || !sc) return null;
			const raw = window.__tocCenterOffset(li, sc) + sc.scrollTop;
			return {
				index: idx,
				target: Math.min(
					Math.max(raw, 0),
					Math.max(0, sc.scrollHeight - sc.clientHeight),
				),
			};
		}, i);
	const scrollToY = (y) => sp2.evaluate((v) => window.scrollTo(0, v), y);
	// 居中（原「保持在可见范围内」语义升级）：滚到中段第 30 个标题，等亮行居中
	// 到位再读。第 3 条居中目标为负（顶钳制），居中判据必须在「钳制够不着」的
	// 中段条目上量才有区分力。
	const y30 = await yOfHeading(30);
	const exp30 = await activeAtY(y30);
	await scrollToY(y30);
	const heal30 = await waitSettledHealed(
		(t) => waitTocCenteredOn(exp30, t),
		"第30条居中",
	);
	const centered = await tocSpyProbe();
	check(
		"激活态：激活项位于容器垂直中部（中线对齐中点 ±2px，#102 居中钳制）",
		centered !== null &&
			centered.current === exp30 &&
			centered.centerOffset !== null &&
			Math.abs(centered.centerOffset) <= 2,
		joinDetail(
			`current=${centered?.current} centerOffset=${centered?.centerOffset?.toFixed(1)}`,
			heal30,
		),
	);

	// 颜色过渡：激活项切换后计算色多帧过渡（≥3 个互异值）；字重 700 无中间值。
	await installTocColorSampler();
	const y40 = await yOfHeading(40);
	const exp40 = await activeAtY(y40);
	await scrollToY(y40);
	const heal40 = await waitSettledHealed(
		(t) => waitTocCenteredOn(exp40, t),
		"第40条居中",
	);
	// 等颜色过渡**自身**落定（计算色连续 6 帧不变且已采 ≥12 帧）再停采样：
	// 停止窗口与滚动快慢解耦——若挂到滚动落定上，瞬时到达（变异/reduced-motion）
	// 会在过渡起帧前就停采样，读不出过渡帧（红证据实测 colors=2 假象）。
	await sp2.waitForFunction(
		() => {
			const s = window.__tocSamples ?? [];
			if (s.length < 12) return false;
			const tail = s.slice(-6);
			return tail.every((c) => c === tail[0]);
		},
		undefined,
		{ timeout: 5000 },
	);
	await stopTocSampler();
	const colorSamples = await readTocSamples();
	const weightSamples = await readTocWeights();
	check(
		"激活态：激活项颜色有 CSS 过渡（计算色多帧过渡）且字重仍瞬时（无中间值）",
		new Set(colorSamples).size >= 3 && new Set(weightSamples).size === 1,
		joinDetail(
			`colors=${new Set(colorSamples).size} weights=${[...new Set(weightSamples)].join("/")}`,
			heal40,
		),
	);

	// 快速连续滑动：先滚向第 55 条，等动画真的动起来（scrollTop 离开起点）后
	// 立刻改滚第 35 条（反向）——旧动画必须被取消、从当前进度追新目标；若实现
	// 是「先滚完旧目标再滚新目标」（排队积压），采样会落到第 55 条的居中位。
	const y55 = await yOfHeading(55);
	const exp55 = await activeAtY(y55);
	const g55 = await liOfIndex(exp55);
	const y35 = await yOfHeading(35);
	const exp35 = await activeAtY(y35);
	const chaseStart = (await tocSpyProbe()).scrollTop;
	const chaseSamples = await sp2.evaluate(
		async ([yA, yB]) => {
			const sc = document.querySelector("#sidebar [data-article-toc]");
			const samples = [];
			let raf = 0;
			const tick = () => {
				samples.push(sc.scrollTop);
				raf = requestAnimationFrame(tick);
			};
			raf = requestAnimationFrame(tick);
			window.scrollTo(0, yA);
			// 等动画真的动起来（状态相位，非墙钟；120 帧兜底防挂死）。
			let frames = 0;
			await new Promise((resolve) => {
				const t = () => {
					if (sc.scrollTop > samples[0] + 2 || frames++ > 120)
						return resolve();
					requestAnimationFrame(t);
				};
				requestAnimationFrame(t);
			});
			window.scrollTo(0, yB);
			// 等落定：连续 8 帧不动且确有位移（防抖静默期不算落定）——页内 helper。
			await window.__tocWaitScrollSettled(sc);
			cancelAnimationFrame(raf);
			return samples;
		},
		[y55, y35],
	);
	const chaseMax = Math.max(...chaseSamples);
	const chaseProbe = await tocSpyProbe();
	check(
		"激活态：快速连续滑动旧动画被取消、目标直接追新（中途不落旧目标，不积压）",
		chaseMax > chaseStart + 2 &&
			chaseMax < g55.target - 4 &&
			chaseProbe !== null &&
			chaseProbe.current === exp35 &&
			chaseProbe.centerOffset !== null &&
			Math.abs(chaseProbe.centerOffset) <= 2,
		`max=${chaseMax.toFixed(1)} 旧目标=${g55.target.toFixed(1)} current=${chaseProbe?.current}`,
	);

	// 自动滚动多帧过渡：从第 35 条居中位滚到第 50 条，采样中间帧必须介于起止间。
	const beforeGlide = await tocSpyProbe();
	const y50 = await yOfHeading(50);
	const exp50 = await activeAtY(y50);
	await installTocScrollSampler();
	await scrollToY(y50);
	const heal50 = await waitSettledHealed(
		(t) => waitTocCenteredOn(exp50, t),
		"第50条居中",
	);
	await stopTocSampler();
	const glideSamples = await readTocSamples();
	const glideFin = glideSamples[glideSamples.length - 1];
	const glideMiddles = [
		...new Set(
			glideSamples.filter(
				(s) => s > beforeGlide.scrollTop + 1 && s < glideFin - 1,
			),
		),
	];
	check(
		"激活态：目录自动滚动多帧过渡（中间帧 scrollTop 介于起止之间，约 200ms）",
		glideFin > beforeGlide.scrollTop + 50 && glideMiddles.length >= 2,
		joinDetail(
			`start=${beforeGlide.scrollTop} fin=${glideFin} 中间帧=${glideMiddles.length}`,
			heal50,
		),
	);

	// 防抖：从第 50 条居中位出发，连续两次激活变化（先深第 55 条、间隔 <100ms
	// 后回第 45 条）——目标稳定前容器必须一动不动。两段方向相反是判据的牙齿：
	// 漏掉防抖的实现会立刻朝第 55 条的居中位走（起点之上），采样会在起点之上
	// 读到值；防抖生效则随后只向第 45 条的居中位（起点之下）走。
	// **前提自证**：两次激活变化落在 100ms 防抖窗内是被测前提——rAF 双帧间隔
	// 遇机器抖动可能被拉过 100ms，运行时届时对第一个目标起跳是**合法行为**
	// （防抖窗已过，2026-10-15 实测假红 max=start+16）。改显式时钟间隔：两次
	// scrollTo 相隔 <100ms 才继续；超窗则等容器稳定后重做（至多 5 轮），采样
	// 窗口只覆盖「目标尚未稳定」的时段。
	const debounceStart = (await tocSpyProbe()).scrollTop;
	const debounceSamples = await sp2.evaluate(
		async ([yA, yB]) => {
			const sc = document.querySelector("#sidebar [data-article-toc]");
			const samples = [];
			let raf = 0;
			const tick = () => {
				samples.push(sc.scrollTop);
				raf = requestAnimationFrame(tick);
			};
			raf = requestAnimationFrame(tick);
			// 同步连发两跳（间隔≈0ms，物理上不可能越过 100ms 防抖窗）——
			// 前提「两次激活变化落在窗内」由构造保证，不赌 rAF 节流节奏。
			// （前版用 rAF 双帧分隔 + 时钟重试，实测机器抖动下前提仍会被
			// 违反——运行时对第一个目标起跳是合法行为，判据假红。）
			window.scrollTo(0, yA);
			window.scrollTo(0, yB);
			// 等落定：连续 8 帧不动且确有位移（防抖静默期不算落定）——页内 helper。
			await window.__tocWaitScrollSettled(sc);
			cancelAnimationFrame(raf);
			return samples;
		},
		[y55, await yOfHeading(45)],
	);
	const debounceProbe = await tocSpyProbe();
	check(
		"激活态：连续激活变化防抖生效（目标稳定前容器不动，动画不逐帧启停）",
		Math.max(...debounceSamples) <= debounceStart + 2 &&
			debounceProbe !== null &&
			debounceProbe.scrollTop < debounceStart - 10 &&
			debounceProbe.centerOffset !== null &&
			Math.abs(debounceProbe.centerOffset) <= 2,
		`max=${Math.max(...debounceSamples).toFixed(1)} start=${debounceStart} fin=${debounceProbe?.scrollTop}`,
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
		undefined,
		{ timeout: 5000 },
	);
	// 末钳制采样：等滚动落定在最大位（末章居中目标超出最大滚动位 → 钳制）。
	const healBottom = await waitSettledHealed(
		(t) => waitTocClamped("bottom", t),
		"末钳位落定",
	);
	const bottom = await tocSpyProbe();
	check(
		"激活态：滚到页底，最后一条被点亮（页底兜底）",
		bottom !== null && bottom.current === bottom.count - 1,
		`current=${bottom?.current} count=${bottom?.count}`,
	);
	const bottomClampOk =
		bottom !== null && Math.abs(bottom.scrollTop - bottom.maxScroll) <= 2;
	check(
		"激活态：列表首尾钳制——首章钳 0 不拖出顶部空白、末章钳最大滚动位不拖出底部空白",
		topClampOk && bottomClampOk,
		joinDetail(
			joinDetail(
				`top=${topClampOk} bottom=${bottomClampOk} scrollTop=${bottom?.scrollTop} max=${bottom?.maxScroll}`,
				healTop,
			),
			healBottom,
		),
	);

	// 手动让位：模拟真实用户滚目录——派发 wheel 事件（运行时以输入事件源识别
	// 用户，见 #102 裁决与 article-toc.ts 的 userScrolling）再落滚动位，3s 内
	// 滚动正文——激活变化只改高亮不滚容器。
	const overrideScrollTop = await sp2.evaluate(() => {
		const sc = document.querySelector("#sidebar [data-article-toc]");
		sc.dispatchEvent(
			new WheelEvent("wheel", { deltaY: 120, bubbles: true }),
		);
		sc.scrollTop = Math.max(0, sc.scrollTop - 80);
		return sc.scrollTop;
	});
	const y20 = await yOfHeading(20);
	const exp20 = await activeAtY(y20);
	await scrollToY(y20);
	const heal20 = await waitSettledHealed(
		(t) => waitCurrentAt(exp20, t),
		"让位期current",
	);
	const duringOverride = await tocSpyProbe();
	check(
		"激活态：手动让位——用户滚动目录后 3s 内激活变化只改高亮不滚容器",
		duringOverride !== null &&
			duringOverride.current === exp20 &&
			Math.abs(duringOverride.scrollTop - overrideScrollTop) <= 2,
		joinDetail(
			`current=${duringOverride?.current} scrollTop=${duringOverride?.scrollTop} 用户滚到=${overrideScrollTop}`,
			heal20,
		),
	);

	// 静默 3s 后恢复自动居中。3.3s 是本段唯一墙钟等待：3s 让位窗口本身是规格
	// 语义，页面侧没有任何可等的状态信号。
	await sp2.waitForTimeout(3300);
	const y45 = await yOfHeading(45);
	const exp45 = await activeAtY(y45);
	await scrollToY(y45);
	const heal45 = await waitSettledHealed(
		(t) => waitTocCenteredOn(exp45, t),
		"恢复居中",
	);
	const resumed = await tocSpyProbe();
	check(
		"激活态：手动让位静默 3s 后恢复自动居中",
		resumed !== null &&
			resumed.current === exp45 &&
			resumed.centerOffset !== null &&
			Math.abs(resumed.centerOffset) <= 2,
		joinDetail(
			`current=${resumed?.current} centerOffset=${resumed?.centerOffset?.toFixed(1)}`,
			heal45,
		),
	);

	// 先滚动目录（wheel 武装让位窗）→ 点击远端条目链接：导航点击**清除**让位窗
	// （2026-10-15 站长报告「先滚动后点击也要回正」），跳转后激活项照常居中。
	const clickIdx = 30;
	const clickSlug = await sp2.evaluate((i) => {
		const sc = document.querySelector("#sidebar [data-article-toc]");
		sc.dispatchEvent(
			new WheelEvent("wheel", { deltaY: 120, bubbles: true }),
		);
		const lis = [...sc.querySelectorAll("li")];
		return lis[i].querySelector("a").getAttribute("href").slice(1);
	}, clickIdx);
	await sp2.click(`#sidebar .article-toc a[href="#${clickSlug}"]`);
	const healClick = await waitSettledHealed(
		(t) => waitTocCenteredOn(clickIdx, t),
		"点击回正",
	);
	const clicked = await tocSpyProbe();
	check(
		"激活态：先滚动目录后点击条目——导航点击清让位窗，跳转后激活项照常居中",
		clicked !== null &&
			clicked.current === clickIdx &&
			clicked.centerOffset !== null &&
			Math.abs(clicked.centerOffset) <= 2,
		joinDetail(
			`current=${clicked?.current} centerOffset=${clicked?.centerOffset?.toFixed(1)}（点击第 ${clickIdx} 条）`,
			healClick,
		),
	);

	await spyCtx.close();
}

// —— 4d+. prefers-reduced-motion（T5/#102）：目录自动滚动瞬时直达 ——
{
	const rmCtx = await browser.newContext({
		viewport: { width: 1280, height: 720 },
		reducedMotion: "reduce",
	});
	const rmPage = harness.attach(await rmCtx.newPage());
	await rmPage.goto(base + `/posts/20261002204249/`, { waitUntil: "load" });
	// 同 4d：先钉稳布局再测，图片加载移位会把「瞬时直达」读成中间帧假象。
	await sweepAndSettle(rmPage);
	await installTocCenterOffset(rmPage);
	const rm = await rmPage.evaluate(async (idx) => {
		const heads = [
			...document.querySelectorAll(".post-body :is(h2,h3,h4)[id]"),
		];
		const y = heads[idx].getBoundingClientRect().top + window.scrollY + 50;
		const sc = document.querySelector("#sidebar [data-article-toc]");
		const samples = [sc.scrollTop];
		window.scrollTo(0, y);
		for (let f = 0; f < 24; f++) {
			await new Promise((r) => requestAnimationFrame(r));
			samples.push(sc.scrollTop);
		}
		const cur = document.querySelector("#sidebar .article-toc li.current");
		const off = cur ? window.__tocCenterOffset(cur, sc) : null;
		return { samples, hasCurrent: !!cur, off };
	}, 30);
	const rmStart = rm.samples[0];
	const rmFin = rm.samples[rm.samples.length - 1];
	const rmMiddles = rm.samples.filter(
		(s) => s > rmStart + 1 && s < rmFin - 1,
	);
	check(
		"激活态：prefers-reduced-motion 下目录自动滚动瞬时直达（无中间帧）且居中",
		rm.hasCurrent &&
			rm.off !== null &&
			Math.abs(rm.off) <= 2 &&
			Math.abs(rmFin - rmStart) > 50 &&
			rmMiddles.length === 0,
		`start=${rmStart} fin=${rmFin} 中间帧=${rmMiddles.length} off=${rm.off?.toFixed(1)}`,
	);
	await rmCtx.close();
}

// —— 4e. 换页生命周期（T4/#100）：站内链接切页后侧栏目录换新、高亮重置 ——
// 全部经**站内链接**点击触发 swup（不是 page.goto，那不经过 swup，测不出换页）。
// 相位由真实状态定义：等 .post-body 出现（新 <main> 已换入）、等目录 li 数稳定
// （采集已完成），无 waitForTimeout。59 = 当前成员（61 条目录，文集成员）。
{
	const swapCtx = await browser.newContext({
		viewport: { width: 1280, height: 720 },
	});
	const swapPage = harness.attach(await swapCtx.newPage());
	const sp3 = swapPage;

	const waitForTocSettled = (min = 1) =>
		sp3.waitForFunction(
			(n) => {
				const ol = document.querySelector("#sidebar .article-toc");
				return ol && ol.querySelectorAll("li").length >= n;
			},
			min,
			{ timeout: 10000 },
		);
	const waitForTocGone = () =>
		sp3.waitForFunction(
			() => document.querySelector("#sidebar .article-toc") === null,
			undefined,
			{ timeout: 10000 },
		);
	const tocState = () =>
		sp3.evaluate(() => {
			const lis = [
				...document.querySelectorAll("#sidebar .article-toc li"),
			];
			return {
				count: lis.length,
				hrefs: lis.map((li) =>
					li.querySelector("a")?.getAttribute("href"),
				),
				currentCount: lis.filter((li) =>
					li.classList.contains("current"),
				).length,
				currentAriaCount: lis.filter(
					(li) =>
						li.querySelector("a")?.getAttribute("aria-current") !==
						null,
				).length,
				widgetGone:
					document.querySelector("#sidebar [data-article-toc]") ===
					null,
			};
		});
	const clickInSiteLink = async (selector) => {
		await sp3.evaluate((sel) => {
			const el = document.querySelector(sel);
			if (!el) throw new Error(`站内链接不存在: ${sel}`);
			el.click();
		}, selector);
	};

	// ① 长文（20261002204249，全站标题最多）→ 20260925150221（条目远少）：站内
	// 链接（正文卡片）切页，条目换成新文章的。swup 有 preload + fade 动画，
	// 等 li 数变成与上一篇不同且非空再读（真实终态，不数墙钟）。
	await sp3.goto(base + `/posts/20261002204249/`, { waitUntil: "load" });
	await waitForTocSettled(30);
	const long = await tocState();
	await clickInSiteLink(`a[href="/posts/20260925150221/"]`);
	await sp3.waitForFunction(
		(c) => {
			const ol = document.querySelector("#sidebar .article-toc");
			const n = ol ? ol.querySelectorAll("li").length : 0;
			return n > 0 && n !== c;
		},
		long.count,
		{ timeout: 10000 },
	);
	await waitForTocSettled(1);
	const short = await tocState();
	check(
		"换页后目录换新：条目数与 href 序列都换成新文章的（20261002204249 → 20260925150221）",
		long.count > 0 &&
			short.count > 0 &&
			short.count < long.count &&
			short.hrefs.every((h) => !long.hrefs.includes(h)),
		`before=${long.count} after=${short.count}`,
	);

	// ② 换页后高亮重置：无残留 .current / aria-current（新页顶未越线 → 零点亮，
	// 与 T3 判据 1 同语义；若旧激活项残留这里会读到 1）。
	check(
		"换页后高亮重置：无上一篇残留的 .current / aria-current",
		short.currentCount === 0 && short.currentAriaCount === 0,
		`currentCount=${short.currentCount} currentAriaCount=${short.currentAriaCount}`,
	);

	// ③ 有标题 → 零标题文章（20260909092113）：元件被移除。
	await clickInSiteLink(`a[href="/posts/20260909092113/"]`);
	await waitForTocGone();
	const zero = await tocState();
	check(
		"换页到零标题文章：目录元件被移除（不残留上一篇条目）",
		zero.widgetGone && zero.count === 0,
		`widgetGone=${zero.widgetGone} count=${zero.count}`,
	);

	// ④ 零标题 → 有标题（20260925150221）：目录重建。
	await clickInSiteLink(`a[href="/posts/20260925150221/"]`);
	await waitForTocSettled(1);
	const rebuilt = await tocState();
	check(
		"从零标题切回有标题文章：目录正确重建（条目数与 href 与此前一致）",
		rebuilt.count === short.count &&
			JSON.stringify(rebuilt.hrefs) === JSON.stringify(short.hrefs),
		`count=${rebuilt.count}（此前 ${short.count}）`,
	);

	// ⑤ 来回切 3 次：无重复堆积（监听器翻倍/重复实例的回归守卫）。两篇条目数
	// 不同（10 vs 6），各页与自身首测比对，不假设两篇相等。
	let awayCount = -1;
	let stacked = true;
	let stackNote = "";
	for (let i = 0; i < 3; i++) {
		await clickInSiteLink(`a[href="/posts/20260919135000/"]`);
		await waitForTocSettled(1);
		const r1 = await tocState();
		if (awayCount === -1) awayCount = r1.count;
		else if (r1.count !== awayCount) {
			stacked = false;
			stackNote = `第 ${i + 1} 次切走条目数=${r1.count}（首测 ${awayCount}）`;
			break;
		}
		await clickInSiteLink(`a[href="/posts/20260925150221/"]`);
		await waitForTocSettled(1);
		const r2 = await tocState();
		if (r2.count !== short.count) {
			stacked = false;
			stackNote = `第 ${i + 1} 次切回条目数=${r2.count}（首测 ${short.count}）`;
			break;
		}
	}
	check(
		"反复来回切换多次：目录不重复堆积（3 次往返条目数恒定）",
		stacked,
		stackNote || `away=${awayCount} back=${short.count}`,
	);

	// ⑥ 切页后目录仍然工作：滚到中部 → 激活项点亮（重采集不是一次性失效）。
	await sp3.evaluate(() => window.scrollTo(0, Number.MAX_SAFE_INTEGER));
	await sp3.waitForFunction(
		() =>
			document.querySelector("#sidebar .article-toc li.current") !== null,
		undefined,
		{ timeout: 10000 },
	);
	const afterSwapSpy = await tocState();
	check(
		"换页后目录仍然工作：滚到页底激活项点亮（重采集后 scroll-spy 生效）",
		afterSwapSpy.currentCount === 1,
		`currentCount=${afterSwapSpy.currentCount} count=${afterSwapSpy.count}`,
	);

	await swapCtx.close();
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
