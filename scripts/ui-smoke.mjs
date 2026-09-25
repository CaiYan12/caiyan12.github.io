// 主站 UI 缺陷修复实机烟测（T0 / T1 验收缝隙 A）
// 前置：pnpm exec astro build && pnpm preview --port 4322
// 运行：pnpm smoke:ui（或 UI_SMOKE_BASE_URL=http://localhost:4399 node scripts/ui-smoke.mjs）
// 约定：UI_SMOKE_BASE_URL 传的是站点根（脚本自己拼路径），与 test:fancybox 同形
// 断言一律落在真实渲染后的计算值、几何、键盘结果与可访问性属性上，不断言 CSS 源文本
import sharp from "sharp";
import { makeHarness } from "./lib/smoke-harness.mjs";

// 台子（check / checkClean / console+pageerror 采集 / 汇总）来自 scripts/lib/smoke-harness.mjs，
// 本文件只写判据。UI_SMOKE_BASE_URL 传的是**站点根**（脚本自己拼 /posts/... 路径），与 FANCY_BASE_URL 同形。
const harness = makeHarness({
	envVar: "UI_SMOKE_BASE_URL",
	defaultBase: "http://localhost:4322",
	// 放行清单留在调用点：外部接口（Giscus、字体 CDN）在本机网络下会 4xx / 重置，
	// 以及票 18 自己故意访问的 404 哨兵路径（见下方 KNOWN_DEAD 的来由注释）。
	// isKnownDead 定义在本文件下方，此处的引用要到 attach 之后才被调用。
	isNoise: ({ url }) =>
		(!!url && !url.startsWith(harness.base)) || isKnownDead(url),
});
const base = harness.base;
const { check, checkClean } = harness;
// 全站显示宽度最大的文章标题（89 个半角单位），当前被单行省略裁切
const LONGEST_POST = "/posts/20260831000000/";
const WIDTHS = [1440, 1100, 860, 680, 390];

// 行盒数按行顶边去重：同一行内的多个内联片段只算一行。
// 各页内函数自管内联一份——Playwright 的 evaluate 只接收一个 arg，跨上下文共享函数不可靠。
const PROBE = (sel) => {
	const countLines = (el) => {
		const range = document.createRange();
		range.selectNodeContents(el);
		return new Set(
			Array.from(range.getClientRects()).map((r) => Math.round(r.top)),
		).size;
	};
	const el = document.querySelector(sel);
	if (!el) return null;
	const cs = getComputedStyle(el);
	const box = el.closest(".post-header");
	const boxCs = box ? getComputedStyle(box) : null;
	return {
		text: el.textContent.trim().slice(0, 24),
		scrollWidth: el.scrollWidth,
		clientWidth: el.clientWidth,
		height: Math.round(el.getBoundingClientRect().height),
		lineHeight: cs.lineHeight,
		fontSize: cs.fontSize,
		whiteSpace: cs.whiteSpace,
		textOverflow: cs.textOverflow,
		overflow: cs.overflow,
		lineBoxes: countLines(el),
		borderLeft: boxCs
			? `${boxCs.borderLeftWidth} ${boxCs.borderLeftStyle} ${boxCs.borderLeftColor}`
			: "no-box",
		headerHeight: box ? Math.round(box.getBoundingClientRect().height) : -1,
	};
};

const clipped = (p) => p.scrollWidth > p.clientWidth + 1;

// 已知应放行的一类：票 18 自己故意访问的 404 哨兵路径——`page.goto` 到 404 文档必然
// 产生一条本地 console 错误。#41 的私有文章死链曾挂在这里被长期放行，现已删除：
// 那条 404 不是「环境偶发」，是站点真发出的死链，白名单把它藏住了。
// 按名前缀列名而非放宽整条检查，是为了让新出现的死链仍然报红。
const KNOWN_DEAD = ["/this-page-should-404/"];
const isKnownDead = (url) => KNOWN_DEAD.some((p) => url.startsWith(base + p));

const browser = await harness.browser.launch(harness.launch);

// ---------------- 文章页标题：五档宽度下不再被裁切 ----------------
const ctx = await browser.newContext({
	viewport: { width: 1440, height: 900 },
});
// 只有这一页挂报错采集（改前口径：其余 context 的页不入 errors）
const page = harness.attach(await ctx.newPage());

await page.goto(base + LONGEST_POST, { waitUntil: "load" });
await page.waitForSelector(".post-header h1");

const sizes = [];
for (const width of WIDTHS) {
	await page.setViewportSize({ width, height: 900 });
	await page.waitForTimeout(250);
	const p = await page.evaluate(PROBE, ".post-header h1");
	sizes.push({ width, ...p });
	check(
		`文章页标题在 ${width}px 下未被裁切且换行`,
		!!p && !clipped(p) && p.lineBoxes >= 2,
		p &&
			`滚动宽 ${p.scrollWidth} / 可视宽 ${p.clientWidth}，行盒 ${p.lineBoxes}，高 ${p.height}，字号 ${p.fontSize}，行高 ${p.lineHeight}`,
	);
}

const titleAttr = await page.evaluate((sel) => {
	const el = document.querySelector(sel);
	return {
		attr: el?.getAttribute("title") ?? null,
		text: el?.textContent.trim() ?? null,
	};
}, ".post-header h1");
check(
	"文章页标题元素带 title 属性作桌面兜底",
	titleAttr.attr !== null && titleAttr.attr === titleAttr.text,
	`title=${JSON.stringify(titleAttr.attr)} / 正文=${JSON.stringify(
		titleAttr.text,
	)}`,
);

// 桌面档：黑色标记条本轮不动（≤680px 由既有媒体查询移除，不在此断言）
const desktop = sizes.filter((s) => s.width > 680);
check(
	"桌面档 .post-header 左侧标记条保持原版盒值",
	desktop.every((s) => s.borderLeft === "3px solid rgb(0, 0, 0)"),
	desktop.map((s) => `${s.width}px: ${s.borderLeft}`).join(" | "),
);
console.log(
	`NOTE  标记条随标题拉长（本轮已接受的代价）: ${WIDTHS.map(
		(w) => `${w}px→${sizes.find((s) => s.width === w).headerHeight}px`,
	).join(" ")}`,
);

// ---------------- 列表卡标题：故意分叉，仍保持单行省略 ----------------
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(base + "/", { waitUntil: "load" });
await page.waitForSelector(".post-list .post-header h2");
const cards = await page.evaluate((sel) => {
	const countLines = (el) => {
		const range = document.createRange();
		range.selectNodeContents(el);
		return new Set(
			Array.from(range.getClientRects()).map((r) => Math.round(r.top)),
		).size;
	};
	return Array.from(document.querySelectorAll(sel)).map((el) => {
		const cs = getComputedStyle(el);
		return {
			text: el.textContent.trim().slice(0, 24),
			scrollWidth: el.scrollWidth,
			clientWidth: el.clientWidth,
			height: Math.round(el.getBoundingClientRect().height),
			lineBoxes: countLines(el),
			whiteSpace: cs.whiteSpace,
			textOverflow: cs.textOverflow,
			overflow: cs.overflow,
		};
	});
}, ".post-list .post-header h2");
const truncated = cards.filter((c) => c.scrollWidth > c.clientWidth + 1);
check(
	"首页列表卡标题仍单行省略（ADR-0003 故意分叉）",
	cards.length > 0 &&
		truncated.length > 0 &&
		truncated.every((c) => c.lineBoxes === 1 && c.whiteSpace === "nowrap"),
	`${truncated.length}/${cards.length} 张被裁切：${truncated
		.map((c) => `${c.text}(${c.scrollWidth}/${c.clientWidth})`)
		.join(", ")}`,
);
checkClean("票 01");

// ---------------- 剧透块：黑幕 heimu（票 02，站长改写为无点击、纯 CSS 淡出） ----------------
// 参考萌娘百科 .heimu：字色与底色同为黑即隐身，hover 把底色淡出、字色回继承。
// 这里没有脚本，所以判据要同时钉住三件事：藏得住（含子元素）、展开了不像面板、点它没反应。
await page.setViewportSize({ width: 1280, height: 900 });
await page.goto(base + "/posts/20240501000000/", { waitUntil: "load" });
const spoiler = page.locator(".post-context .spoiler").first();
await spoiler.evaluate((el) => el.scrollIntoView({ block: "center" }));
await page.waitForFunction(
	(sel) => {
		const r = document.querySelector(sel).getBoundingClientRect();
		return r.top > 90 && r.bottom < innerHeight - 30;
	},
	".post-context .spoiler",
	{ timeout: 4000 },
);
const readSpoiler = () =>
	page.evaluate(() => {
		const el = document.querySelector(".post-context .spoiler");
		const cs = getComputedStyle(el);
		const kid = el.querySelector("*");
		const kidCs = kid ? getComputedStyle(kid) : null;
		const host = el.closest("p") || el.parentElement;
		return {
			classes: el.className,
			ariaExpanded: el.getAttribute("aria-expanded"),
			role: el.getAttribute("role"),
			tabIndex: el.tabIndex,
			title: el.getAttribute("title"),
			cursor: cs.cursor,
			outlineStyle: cs.outlineStyle,
			bg: cs.backgroundColor,
			color: cs.color,
			hostColor: getComputedStyle(host).color,
			kid: kid ? kid.tagName : null,
			kidColor: kidCs ? kidCs.color : null,
			kidBg: kidCs ? kidCs.backgroundColor : null,
			kidWeight: kidCs ? kidCs.fontWeight : null,
		};
	});
/** color / background-color 带 0.15s 过渡，读数前等动画落定，避免采到中间帧 */
const settleSpoiler = () =>
	page
		.waitForFunction(
			() =>
				document.querySelector(".post-context .spoiler").getAnimations()
					.length === 0,
			null,
			{ timeout: 3000 },
		)
		.then(() => true)
		.catch(() => false);
const hoverOn = async () => {
	const b = await spoiler.boundingBox();
	await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, {
		steps: 2,
	});
};
const hoverOff = async () => {
	const b = await spoiler.boundingBox();
	await page.mouse.move(20, b.y + b.height / 2, { steps: 2 });
};

const hidden = await readSpoiler();
check(
	"剧透块不再是伪按钮（无 role、不进 Tab 序）",
	hidden.role === null && hidden.tabIndex === -1,
	`role=${hidden.role} tabIndex=${hidden.tabIndex}`,
);
check(
	"剧透块带 title 提示「你知道的太多了」",
	hidden.title === "你知道的太多了",
	`title=${JSON.stringify(hidden.title)}`,
);
check(
	"藏字态：字与底同为黑、无描边，子元素同色且不再叠第二层黑",
	hidden.bg === "rgb(0, 0, 0)" &&
		hidden.color === "rgb(0, 0, 0)" &&
		hidden.kidColor === "rgb(0, 0, 0)" &&
		hidden.kidBg === "rgba(0, 0, 0, 0)" &&
		hidden.outlineStyle === "none",
	JSON.stringify(hidden),
);

await hoverOn();
const revealedSettled = await settleSpoiler();
const hov = await readSpoiler();
check(
	"悬停即淡出展现，且不落任何状态（无类名、无 aria-expanded）",
	revealedSettled &&
		hov.classes === "spoiler" &&
		hov.ariaExpanded === null &&
		hov.bg === "rgba(0, 0, 0, 0)" &&
		hov.color === hov.hostColor,
	JSON.stringify(hov),
);
check(
	"展开后与正文无异：无描边、底透明，子元素同回正文色",
	hov.outlineStyle === "none" &&
		hov.kidColor === hov.hostColor &&
		hov.kidBg === "rgba(0, 0, 0, 0)",
	`子元素=${hov.kid} 字色=${hov.kidColor} 正文色=${hov.hostColor} 底=${hov.kidBg}`,
);
check(
	"鼠标在其上是文本光标而非手型",
	hov.cursor !== "pointer",
	`cursor=${hov.cursor}`,
);

await hoverOff();
const retracted = await settleSpoiler();
const backHidden = await readSpoiler();
check(
	"指针移开即收回黑幕",
	retracted &&
		backHidden.bg === "rgb(0, 0, 0)" &&
		backHidden.color === "rgb(0, 0, 0)",
	JSON.stringify(backHidden),
);

await spoiler.click();
await page.waitForTimeout(300);
const afterClick = await readSpoiler();
check(
	"点击它什么都不发生（黑幕无脚本，也不留类名/aria）",
	afterClick.classes === "spoiler" && afterClick.ariaExpanded === null,
	JSON.stringify(afterClick),
);
// 双层叠加是计算值查不出来的缺陷：父与子的 color / background-color 全程逐帧一致，
// 但子元素若再铺一层半透明黑，「惊喜」就会比「隐藏的」褪得慢 —— 只能采像素。
// 过渡临时拉长到 2s，好在半程稳定取样。
await page.addStyleTag({
	content: ".post-context .spoiler{transition-duration:2s !important}",
});
await hoverOff();
await page.waitForTimeout(2300);
const layer = await page.evaluate(() => {
	const par = document.querySelector(".post-context .spoiler");
	const kid = par.querySelector("strong");
	const box = (e) => {
		const r = e.getBoundingClientRect();
		return { x: r.x, y: r.y, w: r.width, h: r.height };
	};
	const pr = box(par),
		kr = box(kid);
	return {
		clip: {
			x: Math.floor(pr.x),
			y: Math.floor(pr.y) - 2,
			width: Math.ceil(pr.w),
			height: Math.ceil(pr.h) + 4,
		},
		left: { x: pr.x, y: pr.y, w: Math.max(6, kr.x - pr.x - 2), h: pr.h },
		right: { x: kr.x + 2, y: kr.y, w: Math.max(6, kr.w - 4), h: kr.h },
	};
});
const meanOf = async (img, r) => {
	const meta = await sharp(img).metadata();
	const left = Math.max(
		0,
		Math.min(meta.width - 1, Math.round(r.x - layer.clip.x)),
	);
	const top = Math.max(
		0,
		Math.min(meta.height - 1, Math.round(r.y - layer.clip.y)),
	);
	const out = await sharp(img)
		.extract({
			left,
			top,
			width: Math.max(1, Math.min(meta.width - left, Math.round(r.w))),
			height: Math.max(1, Math.min(meta.height - top, Math.round(r.h))),
		})
		.raw()
		.toBuffer({ resolveWithObject: true });
	const ch = out.info.channels,
		n = out.info.width * out.info.height;
	let sum = 0;
	for (let i = 0; i < n; i++) {
		const q = i * ch;
		sum +=
			0.2126 * out.data[q] +
			0.7152 * out.data[q + 1] +
			0.0722 * out.data[q + 2];
	}
	return sum / n;
};
const shotGap = async () => {
	const img = await page.screenshot({ clip: layer.clip });
	return (await meanOf(img, layer.right)) - (await meanOf(img, layer.left));
};
const restGap = await shotGap();
await hoverOn();
await page.waitForTimeout(1000);
const midGap = await shotGap();
await page.waitForTimeout(1600);
const doneGap = await shotGap();
check(
	"两段黑幕同步褪去（无第二层叠加；像素判据）",
	Math.abs(restGap) <= 8 && Math.abs(midGap) <= Math.abs(doneGap) + 5,
	`静止差 ${restGap.toFixed(1)}，半程差 ${midGap.toFixed(1)}，展现后差（加粗本身占墨基线）${doneGap.toFixed(1)}；叠层缺陷修前实测半程 -34.5`,
);
await hoverOff();
checkClean("票 02");

// ---------------- 无 JS 地板线（票 03） ----------------
const FLOOR_PHRASE = "启用 JavaScript";
const flatText = (s) => s.replace(/\s+/g, " ").trim();
const noJs = await browser.newContext({
	javaScriptEnabled: false,
	viewport: { width: 1280, height: 900 },
});
const njPage = await noJs.newPage();

await njPage.goto(base + "/search/", { waitUntil: "load" });
const njSearch = await njPage.evaluate(() => {
	const box = document.querySelector(".post-context");
	return {
		text: box ? box.innerText : "",
		hrefs: box
			? Array.from(box.querySelectorAll("a")).map((a) =>
					a.getAttribute("href"),
				)
			: [],
	};
});
check(
	"无 JS：搜索页给出说明与标签/分类/归档三条入口",
	njSearch.text.includes(FLOOR_PHRASE) &&
		["/tag/", "/category/", "/archive/"].every((h) =>
			njSearch.hrefs.includes(h),
		),
	`文案=${JSON.stringify(flatText(njSearch.text).slice(0, 50))} 链接=${njSearch.hrefs.join(",")}`,
);

await njPage.goto(base + "/ai-news/", { waitUntil: "load" });
const njNews = await njPage.evaluate(
	() => document.querySelector("main")?.innerText ?? "",
);
check(
	"无 JS：日报页给出载入中说明与离线快照提示",
	njNews.includes(FLOOR_PHRASE) && /快照/.test(njNews),
	JSON.stringify(flatText(njNews).slice(0, 50)),
);
await noJs.close();

// 开 JS：两处说明必须被岛屿内容替换且不残留
await page.setViewportSize({ width: 1280, height: 900 });
await page.goto(base + "/search/", { waitUntil: "load" });
await page.waitForSelector(".post-context input", { timeout: 20000 });
const jsSearch = await page.evaluate(() => ({
	text: document.querySelector(".post-context").innerText,
	links: Array.from(document.querySelectorAll(".post-context a")).map((a) =>
		a.getAttribute("href"),
	),
}));
check(
	"开 JS：搜索岛屿已接管，地板线说明与入口不残留",
	!jsSearch.text.includes(FLOOR_PHRASE) &&
		!jsSearch.links.includes("/archive/"),
	JSON.stringify(flatText(jsSearch.text).slice(0, 50)),
);

await page.goto(base + "/ai-news/", { waitUntil: "load" });
// 地板线本身就是服务端渲染的子节点，"有子节点"不等于"已接管"；
// 必须等 React 自己画出的头部出现（与 ai-news-smoke 同款锚点）。
await page.waitForFunction(
	() => !!document.querySelector("main astro-island header"),
	null,
	{ timeout: 20000 },
);
const jsNews = await page.evaluate(
	() => document.querySelector("main")?.innerText ?? "",
);
check(
	"开 JS：日报岛屿已接管，地板线说明不残留",
	!jsNews.includes(FLOOR_PHRASE),
	JSON.stringify(flatText(jsNews).slice(0, 50)),
);
checkClean("票 03");

// ---------------- 当前页态：附加功能组（票 04） ----------------
const GREEN = "rgb(0, 192, 0)";
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(base + "/albums/", { waitUntil: "load" });
const deskExtra = await page.evaluate(() => {
	const group = Array.from(
		document.querySelectorAll("#menu-index > li"),
	).find((li) =>
		li.querySelector(":scope > a")?.textContent.includes("附加功能"),
	);
	const a = group?.querySelector(":scope > a");
	return a ? { color: getComputedStyle(a).color } : null;
});
check(
	"相册页桌面「附加功能」父项呈当前页态（品牌绿）",
	deskExtra?.color === GREEN,
	JSON.stringify(deskExtra),
);

await page.setViewportSize({ width: 390, height: 844 });
await page.goto(base + "/albums/", { waitUntil: "load" });
await page.locator("#open-nav").click();
await page.waitForSelector("#mmenu.open");
const mob = await page.evaluate(() => {
	const a = document.querySelector('#mmenu a[href="/albums/"]');
	if (!a) return null;
	const cs = getComputedStyle(a);
	const groupLi = a.closest("ul.submenu")?.closest("li");
	const groupA = groupLi?.querySelector(":scope > a");
	return {
		text: a.textContent.trim(),
		color: cs.color,
		borderBottom: `${cs.borderBottomWidth} ${cs.borderBottomStyle} ${cs.borderBottomColor}`,
		ariaCurrent: a.getAttribute("aria-current"),
		groupColor: groupA ? getComputedStyle(groupA).color : null,
	};
});
check(
	"390px 移动菜单当前子项：绿字 + 2px 品牌绿下边框压住原浅灰 1px",
	mob?.color === GREEN && mob?.borderBottom === `2px solid ${GREEN}`,
	JSON.stringify(mob),
);
check(
	"390px 移动菜单当前子项带 aria-current=page，且所属组父项同为绿",
	mob?.ariaCurrent === "page" && mob?.groupColor === GREEN,
	JSON.stringify(mob),
);
checkClean("票 04");

// ---------------- 搜索框焦点环与重复提交防护（票 05） ----------------
await page.setViewportSize({ width: 1280, height: 900 });
await page.goto(base + "/search/", { waitUntil: "load" });
await page.waitForSelector(".post-context input");
const ringBefore = await page.evaluate(() => {
	const cs = getComputedStyle(document.querySelector(".search-panel input"));
	return { w: cs.outlineWidth, s: cs.outlineStyle, c: cs.outlineColor };
});
let tabHits = 0;
for (; tabHits < 60; tabHits++) {
	await page.keyboard.press("Tab");
	const focused = await page.evaluate(
		() =>
			document.activeElement ===
			document.querySelector(".search-panel input"),
	);
	if (focused) break;
}
const ringAfter = await page.evaluate(() => {
	const cs = getComputedStyle(document.querySelector(".search-panel input"));
	return { w: cs.outlineWidth, s: cs.outlineStyle, c: cs.outlineColor };
});
check(
	`键盘 Tab 到搜索框有可见焦点环（非颜色单通道，${tabHits} 次可达）`,
	tabHits > 0 &&
		ringAfter.s === "solid" &&
		parseFloat(ringAfter.w) >= 2 &&
		ringAfter.c !== ringBefore.c &&
		ringAfter.c !== "rgba(0, 0, 0, 0)",
	`未聚焦=${JSON.stringify(ringBefore)} → 聚焦=${JSON.stringify(ringAfter)}`,
);

// 延迟 pagefind 响应，把忙碌窗口撑开，才能观测"忙碌期"内的行为
const slow = await browser.newContext({
	viewport: { width: 1280, height: 900 },
});
await slow.route("**/pagefind/**", async (route) => {
	await new Promise((r) => setTimeout(r, 700));
	await route.continue();
});
const sp = await slow.newPage();
await sp.goto(base + "/search/", { waitUntil: "load" });
await sp.waitForSelector(".post-context input");
const busySel = ".search-panel button[type=submit]";
await sp.fill(".search-panel input", "音乐");
await sp.click(busySel);
const becameBusy = await sp
	.waitForFunction(
		(sel) => !!document.querySelector(sel)?.disabled,
		busySel,
		{ timeout: 4000 },
	)
	.then(() => true)
	.catch(() => false);
const busyState = await sp.evaluate((sel) => {
	const el = document.querySelector(sel);
	return {
		disabled: !!el?.disabled,
		ariaDisabled: el?.getAttribute("aria-disabled") ?? null,
		cursor: el ? getComputedStyle(el).cursor : null,
	};
}, busySel);
check(
	"搜索中提交入口不可操作：disabled + aria-disabled + 禁用态光标",
	becameBusy &&
		busyState.disabled &&
		busyState.ariaDisabled === "true" &&
		busyState.cursor === "not-allowed",
	JSON.stringify({ becameBusy, ...busyState }),
);

// 忙碌期换词并按回车：若第二次提交漏进来，结果会被空结果覆盖
await sp.fill(".search-panel input", "zzz这串词不该有结果zzz");
await sp.keyboard.press("Enter");
await sp
	.waitForFunction((sel) => !document.querySelector(sel)?.disabled, busySel, {
		timeout: 20000,
	})
	.catch(() => {});
const afterSettle = await sp.evaluate(() => ({
	results: document.querySelectorAll(".search-panel ul li").length,
	body: document.querySelector(".post-context").innerText,
}));
check(
	"忙碌期的第二次提交被忽略（结果仍属第一次查询）",
	afterSettle.results > 0 && !/zzz这串词不该有结果zzz/.test(afterSettle.body),
	`结果数=${afterSettle.results} 空态文案=${/zzz/.test(afterSettle.body)}`,
);
checkClean("票 05");
await slow.close();

// ---------------- 独立壳导航站页最小修正（票 06） ----------------
// 几何基准取自改动前实测（1280x900）。正文段落不在名单里：它的字体本轮由
// FiraCode 换成主站正文栈，行盒高度本就会变，字体那条另做断言。
await page.setViewportSize({ width: 1280, height: 900 });
await page.goto(base + "/domain/", { waitUntil: "load" });
const BEFORE_BOX = {
	".headPhoto": [224, 104, 128, 128],
	".meBox": [128, 164, 320, 400],
	"#box": [0, 0, 1280, 164],
};
const dom = await page.evaluate((boxes) => {
	const rectOf = (sel) => {
		const el = document.querySelector(sel);
		if (!el) return null;
		const r = el.getBoundingClientRect();
		return [
			Math.round(r.x),
			Math.round(r.y),
			Math.round(r.width),
			Math.round(r.height),
		];
	};
	const cs = (sel, prop) => {
		const el = document.querySelector(sel);
		return el ? getComputedStyle(el)[prop] : null;
	};
	const photo = document.querySelector(".headPhoto");
	return {
		lang: document.documentElement.lang,
		viewport:
			document.querySelector('meta[name="viewport"]')?.content ?? "",
		rects: Object.fromEntries(
			Object.keys(boxes).map((s) => [s, rectOf(s)]),
		),
		photoIsLink: photo?.closest("a")?.getAttribute("href") ?? null,
		bodyFont: cs(".meBox-text p", "fontFamily"),
		termFont: cs(".meBox-title p", "fontFamily"),
		promptColor: cs(".cmdText span[style]", "color"),
	};
}, BEFORE_BOX);
// 焦点环必须靠真实 Tab 走位触发：脚本 focus() 未必匹配 :focus-visible
let photoTabStops = 0;
for (; photoTabStops < 30; photoTabStops++) {
	await page.keyboard.press("Tab");
	const onPhoto = await page.evaluate(
		() => document.activeElement?.className === "headPhoto",
	);
	if (onPhoto) break;
}
const photoOutline =
	photoTabStops < 30
		? await page.evaluate(() => {
				const cs = getComputedStyle(document.activeElement);
				return `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}`;
			})
		: null;
check(
	"导航站语言标为中文且不再禁缩放",
	/^zh/.test(dom.lang) &&
		!/maximum-scale|minimum-scale|user-scalable\s*=\s*no/.test(
			dom.viewport,
		),
	`lang=${dom.lang} viewport=${dom.viewport}`,
);
check(
	"头像块是指向主站首页的链接、Tab 可达且有可见焦点环",
	dom.photoIsLink === "/" &&
		photoTabStops < 30 &&
		/^solid \d+px rgb\(/.test(photoOutline ?? ""),
	`href=${dom.photoIsLink} 第 ${photoTabStops} 次 Tab 抵达 outline=${photoOutline}`,
);
check(
	"正文容器换主站正文字体，终端元素仍用 FiraCode",
	/Noto Sans SC Variable/.test(dom.bodyFont ?? "") &&
		/^FiraCode/.test(dom.termFont ?? ""),
	`正文=${dom.bodyFont} 终端=${dom.termFont}`,
);
check(
	"内联品牌色统一到站点 token #00c000",
	dom.promptColor === "rgb(0, 192, 0)",
	`${dom.promptColor}`,
);
check(
	"改动未波及导航站既有几何（头像/卡片/容器/正文）",
	Object.entries(BEFORE_BOX).every(([s, want]) => {
		const got = dom.rects[s];
		return (
			!!got &&
			got.length === want.length &&
			got.every((v, i) => Math.abs(v - want[i]) <= 1)
		);
	}),
	Object.entries(dom.rects)
		.map(
			([s, r]) =>
				`${s}=${(r || []).join("/")} vs ${(BEFORE_BOX[s] || []).join("/")}`,
		)
		.join(" "),
);

// 票面「弹窗样式未被波及」必须真开一次弹窗：#site-modal 由脚本挂到 body 下，
// 不在 #cmdBox / #footer 之内，正是字体收窄最容易漏掉的那块
const chrome = await page.evaluate(() => {
	const btn = document.querySelector(".meBox-Button a");
	const title = document.querySelector(".meBox-title p");
	return {
		btnFont: btn ? getComputedStyle(btn).fontFamily : null,
		titleAnim: title ? getComputedStyle(title).animationName : null,
	};
});
check(
	"按钮行仍用 FiraCode、打字机动效未断",
	/^FiraCode/.test(chrome.btnFont ?? "") &&
		/typing/.test(chrome.titleAnim ?? ""),
	JSON.stringify(chrome),
);

await page.click(".meBox-Button a[data-site-modal]");
await page.waitForSelector("#site-modal[open]", { timeout: 5000 });
const modal = await page.evaluate(() => {
	const m = document.getElementById("site-modal");
	const msg = document.getElementById("site-modal-message");
	return {
		font: m ? getComputedStyle(m).fontFamily : null,
		msgFont: msg ? getComputedStyle(msg).fontFamily : null,
		shown: !!msg && msg.getBoundingClientRect().height > 0,
	};
});
check(
	"弹窗打开后仍用 FiraCode 且内容可见（字体收窄未波及）",
	/^FiraCode/.test(modal.font ?? "") &&
		/^FiraCode/.test(modal.msgFont ?? "") &&
		modal.shown,
	JSON.stringify(modal),
);
await page.keyboard.press("Escape");

let navOk = false;
try {
	await page.click(".headPhoto");
	await page.waitForURL((u) => new URL(u).pathname === "/", {
		timeout: 8000,
	});
	navOk = true;
} catch {
	// 头像还不是链接时导航不会发生，交给下面的 check 报失败
}
check(
	"点击头像块真的回到主站首页",
	navOk,
	`当前 pathname=${new URL(page.url()).pathname}`,
);

// ---------------- 插入项：nav 右侧社交链接的底线只向上长 ----------------
// 旧实现 hover 改 border-bottom-width 并用 padding 补偿总高：border-width 插值被取整到整像素、
// padding 却连续插值，中途盒高 43→42.1，居中盒子的底边因此上下抖。改法见 global.css 的 ::after。
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(base + "/", { waitUntil: "load" });
await page.waitForSelector("#head-nav .m-nav li a");
const navLink = page.locator("#head-nav .m-nav li a").first();
await page.evaluate(() => {
	window.__navS = [];
	const el = document.querySelector("#head-nav .m-nav li a");
	const tick = () => {
		const acs = getComputedStyle(el, "::after");
		const r = el.getBoundingClientRect();
		const sy =
			acs.transform === "none"
				? 1
				: Number.parseFloat(acs.transform.slice(7, -1).split(",")[3]);
		window.__navS.push({
			bottom: +r.bottom.toFixed(3),
			h: +r.height.toFixed(3),
			lineH: +(parseFloat(acs.height) * sy).toFixed(2),
		});
		if (window.__navOn) requestAnimationFrame(tick);
	};
	window.__navOn = true;
	requestAnimationFrame(tick);
});
const navBox = await navLink.boundingBox();
await page.mouse.move(
	navBox.x + navBox.width / 2,
	navBox.y + navBox.height / 2,
	{ steps: 3 },
);
await page.waitForTimeout(700);
const navSamples = await page.evaluate(() => {
	window.__navOn = false;
	return window.__navS;
});
const navBottoms = new Set(navSamples.map((s) => s.bottom));
const navHeights = new Set(navSamples.map((s) => s.h));
const navLineH = navSamples.map((s) => s.lineH);
check(
	"hover 底线只向上长：锚点盒逐帧不动、线高由 3 长到 6",
	navSamples.length > 5 &&
		navBottoms.size === 1 &&
		navHeights.size === 1 &&
		Math.min(...navLineH) <= 3.05 &&
		Math.max(...navLineH) >= 5.9,
	`帧 ${navSamples.length}，底边唯一值 ${[...navBottoms].join("/")}，盒高唯一值 ${[...navHeights].join("/")}，线高 ${Math.min(...navLineH)}→${Math.max(...navLineH)}`,
);
checkClean("插入项 nav 底线");

checkClean("票 06");

// ---------------- 次要文字单源化（票 08） ----------------
const SECONDARY_SPOTS = [
	".newcomment-refresh",
	"#newcomment .time",
	".guestbook-meta time",
	".goon a",
	".post-meta",
	".post-metaa",
	".post-toc summary span",
	".skill-section > h3 span",
	".archive-year-count",
	".friend-domain",
	".post-last-updated",
	".personal-meta",
	".gh-calendar-stats",
	".gh-calendar-months",
	".gh-calendar-wd",
	".gh-calendar-legend",
	".gh-calendar-fallback-text",
];
await page.setViewportSize({ width: 1440, height: 900 });
const seen = new Map();
for (const path of [
	"/",
	"/archive/",
	"/friends/",
	"/guestbook/",
	"/skills/",
	"/about/",
	"/posts/20260919135000/",
]) {
	await page.goto(base + path, { waitUntil: "load" });
	const hits = await page.evaluate((sels) => {
		const out = [];
		for (const s of sels) {
			const el = document.querySelector(s);
			if (el) out.push({ s, c: getComputedStyle(el).color });
		}
		return out;
	}, SECONDARY_SPOTS);
	for (const h of hits) if (!seen.has(h.s)) seen.set(h.s, h.c);
}
const distinct = [...new Set(seen.values())];
const relLum = ([r, g, b]) => {
	const f = (c) => {
		c /= 255;
		return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	};
	return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const nums = (distinct[0] || "").match(/[\d.]+/g) || [];
const ratio =
	nums.length >= 3 ? 1.05 / (relLum(nums.slice(0, 3).map(Number)) + 0.05) : 0;
check(
	"次要文字落点全部收敛到同一色值",
	seen.size >= 13 && distinct.length === 1,
	`命中 ${seen.size}/${SECONDARY_SPOTS.length} 处，distinct=${distinct.join(" | ")}`,
);
check(
	"该色对白底达 4.5:1 以上",
	distinct.length === 1 && ratio >= 4.5,
	`${distinct[0]} = ${ratio.toFixed(2)}:1`,
);
// 上面那份清单只能覆盖「我想到的落点」——#777 就是这么漏掉的（推上线后核验线上才抓到，
// 本地冒烟一路绿）。反向扫描才是会自己长大的门禁：任何可见元素的计算文字色，
// 都不许等于改版前那几组灰。新增落点无需改本断言即被覆盖。
const LEGACY_GREYS = {
	"rgb(119, 119, 119)": "#777",
	"rgb(136, 136, 136)": "#888",
	"rgb(118, 118, 118)": "#767676",
	"rgb(153, 154, 170)": "#999aaa",
	"rgb(102, 122, 138)": "#667a8a",
};
const strays = [];
for (const path of [
	"/",
	"/archive/",
	"/friends/",
	"/guestbook/",
	"/skills/",
	"/about/",
	"/albums/",
	"/tag/",
	"/search/",
	"/posts/20260919135000/",
]) {
	await page.goto(base + path, { waitUntil: "load" });
	await page.waitForTimeout(400);
	const found = await page.evaluate((map) => {
		const out = [];
		for (const el of document.querySelectorAll("body *")) {
			// 隐藏子树不参与「可见灰值」判定（display 在祖先上，故查 offsetParent）
			if (!el.offsetParent && getComputedStyle(el).position !== "fixed")
				continue;
			// 明月浩空播放器是远端注入、样式也归它自己（#888 出现在 li.myhknow /
			// span.index）。它不在票 08 的收敛范围内——指纹排除表早已排掉 myhk*，
			// 反向扫描此前漏了这一步，只在播放器真加载成功的场合才暴露。
			if (el.closest("[id^='myhk'], [class*='myhk']")) continue;
			const c = getComputedStyle(el).color;
			if (!map[c]) continue;
			const cls =
				typeof el.className === "string" && el.className.trim()
					? "." + el.className.trim().split(/\s+/).join(".")
					: "";
			out.push(
				`${el.tagName.toLowerCase()}${cls}${el.id ? "#" + el.id : ""} = ${map[c]}`,
			);
		}
		return [...new Set(out)].slice(0, 6);
	}, LEGACY_GREYS);
	strays.push(...found.map((f) => `${path} ${f}`));
}
check(
	"反向扫描：全站不再出现改版前那几组灰（#777/#888/#767676/#999aaa/#667a8a）",
	strays.length === 0,
	strays.join(" | ") || "零命中",
);
checkClean("票 08");

// ---------------- 每页恰好一个可见顶级标题、部件标题不跳级（票 09） ----------------
const OUTLINE_PAGES = [
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
await page.setViewportSize({ width: 1440, height: 900 });
const outlines = [];
for (const path of OUTLINE_PAGES) {
	await page.goto(base + path, { waitUntil: "load" });
	const seq = await page.evaluate(() =>
		Array.from(document.querySelectorAll("h1,h2,h3,h4,h5,h6"))
			.filter((e) => e.getClientRects().length > 0)
			.map((e) => e.tagName.toLowerCase())
			.join(">"),
	);
	outlines.push({ path, seq });
}
const h1Counts = outlines.map((o) => ({
	path: o.path,
	n: o.seq.split(">").filter((t) => t === "h1").length,
}));
check(
	"每张主站页面恰好一个可见 h1",
	h1Counts.every((r) => r.n === 1),
	h1Counts.map((r) => `${r.path}=${r.n}`).join(" "),
);
const widgetLevels = await (async () => {
	await page.goto(base + "/archive/", { waitUntil: "load" });
	return page.evaluate(() => ({
		h3: document.querySelectorAll(".widget h3").length,
		h2: document.querySelectorAll(".widget h2").length,
	}));
})();
check(
	"侧栏部件标题已并到 h2（不再有任何部件 h3）",
	widgetLevels.h3 === 0 && widgetLevels.h2 > 0,
	JSON.stringify(widgetLevels),
);
// 跳级残留：部分列表页自身的内容标题从 h3 起（不是侧栏部件，属票 09 命名范围之外）
const skips = outlines
	.map((o) => ({ path: o.path, seq: o.seq }))
	.filter((o) => /h1>h3/.test(o.seq.replace(/h1>h1>/, "h1>")));
console.log(
	`NOTE  内容级跳级残留（未修，待站长定）: ${skips.map((s) => s.path).join(" ") || "无"}`,
);

// 头部几何与计算值逐档基线（票 09 的「视觉逐像素不变」锁；数字取自改动前实测，
// 用 output/head-baseline.mjs 在 4399 上采的，含 681–1100 这条文档锁定的脆弱带）
const HEAD_BASE = [
	[1440, 270, 45, 980, 60, "26px", "400", "31.2px"],
	[1100, 120, 45, 960, 60, "26px", "400", "31.2px"],
	[980, 120, 45, 840, 60, "26px", "400", "31.2px"],
	[860, 120, 45, 720, 60, "26px", "400", "31.2px"],
	[770, 120, 45, 630, 60, "26px", "400", "31.2px"],
	[681, 120, 45, 541, 60, "20px", "400", "24px"],
];
const headRows = [];
for (const [w, x, y, wid, h, fs, fw, lh] of HEAD_BASE) {
	await page.setViewportSize({ width: w, height: 900 });
	await page.goto(base + "/posts/20260919135000/", { waitUntil: "load" });
	const got = await page.evaluate(() => {
		const el =
			document.querySelector("#header .site-title") ||
			document.querySelector("#header h1");
		if (!el) return null;
		const bx = el.getBoundingClientRect();
		const cs = getComputedStyle(el);
		return {
			r: [bx.x, bx.y, bx.width, bx.height].map((n) => Math.round(n)),
			fs: cs.fontSize,
			fw: cs.fontWeight,
			lh: cs.lineHeight,
			text: (el.textContent || "").trim(),
		};
	});
	headRows.push({
		w,
		want: [x, y, wid, h],
		got,
		wantStyle: `${fs}/${fw}/${lh}`,
	});
}
check(
	"头部标题在五档下几何与计算值逐项不变（681–1100 为锁定脆弱带）",
	headRows.every(
		(row) =>
			row.got &&
			row.got.r.every((v, i) => Math.abs(v - row.want[i]) <= 1) &&
			`${row.got.fs}/${row.got.fw}/${row.got.lh}` === row.wantStyle,
	),
	headRows
		.map(
			(row) =>
				`${row.w}px: ${row.got ? row.got.r.join("/") : "缺失"} 期望 ${row.want.join("/")} ${row.got ? row.got.fs + "/" + row.got.fw + "/" + row.got.lh : ""} 期望 ${row.wantStyle}`,
		)
		.join(" | "),
);
checkClean("票 09");

// ---------------- 命中区：药丸窄屏放宽 + 幻灯片点扩热区（票 10） ----------------
// 判据全部落在渲染几何与 elementFromPoint 的命中结果上：
// 「外观不动」= 按钮盒与桌面药丸盒逐项等于改动前实测；「热区扩大」= 命中扫描的真实范围。
const PILL_DESKTOP_BASE = {
	// /tag/ 改动前实测（1440 与 681 两档）：盒高 20、内距 3/7、外距 4/5/0/8、行距 26；
	// 行数按宽度自然不同（1440→4 行、681→5 行），故逐档比对而非共用一个行数
	h: 20,
	padding: "3px 7px 3px 7px",
	margin: "4px 5px 0px 8px",
	pitch: 26,
	rows: { 1440: 4, 681: 5 },
};
const readPills = async (width) => {
	await page.setViewportSize({ width, height: 900 });
	await page.goto(base + "/tag/", { waitUntil: "load" });
	await page.waitForTimeout(400);
	const read = await page.evaluate(() => {
		const cloud = document.querySelector("#content .blogtags");
		const a = cloud.querySelector("a");
		const cs = getComputedStyle(a);
		const rects = [...cloud.querySelectorAll("a")].map((x) =>
			x.getBoundingClientRect(),
		);
		const tops = [...new Set(rects.map((r) => Math.round(r.y)))].sort(
			(x, y) => x - y,
		);
		const tri = getComputedStyle(a, "::before");
		const dot = getComputedStyle(a, "::after");
		const num = (v) => Number.parseFloat(v) || 0;
		return {
			h: +rects[0].height.toFixed(2),
			padding: `${cs.paddingTop} ${cs.paddingRight} ${cs.paddingBottom} ${cs.paddingLeft}`,
			margin: `${cs.marginTop} ${cs.marginRight} ${cs.marginBottom} ${cs.marginLeft}`,
			count: rects.length,
			rows: tops.length,
			pitch: tops.length > 1 ? +(tops[1] - tops[0]).toFixed(2) : null,
			// 左侧三角的边框盒高、以及圆点盒中心相对药丸中心的偏差
			triH: num(tri.borderTopWidth) + num(tri.borderBottomWidth),
			dotOff: Math.abs(
				num(dot.top) + num(dot.height) / 2 - rects[0].height / 2,
			),
		};
	});
	return { ...read, w: width };
};
const pillDesktop = await readPills(1440);
const pillWide = await readPills(681);
const pillNarrow = await readPills(390);
check(
	"桌面药丸盒值与色带几何逐档等于改前（含 681px 断点上沿）",
	[pillDesktop, pillWide].every(
		(p) =>
			p.h === PILL_DESKTOP_BASE.h &&
			p.padding === PILL_DESKTOP_BASE.padding &&
			p.margin === PILL_DESKTOP_BASE.margin &&
			p.pitch === PILL_DESKTOP_BASE.pitch &&
			p.rows === PILL_DESKTOP_BASE.rows[p.w],
	),
	`1440: h=${pillDesktop.h} pad=${pillDesktop.padding} rows=${pillDesktop.rows}/${pillDesktop.count} 距=${pillDesktop.pitch} | 681: h=${pillWide.h} rows=${pillWide.rows} 距=${pillWide.pitch}`,
);
check(
	"窄屏药丸命中高 ≥24（触屏底线）",
	pillNarrow.h >= 24,
	`390px 命中高=${pillNarrow.h}（改前 20）`,
);
check(
	"窄屏放宽后左侧三角仍满高、圆点仍居中（装饰不随内距脱节）",
	Math.abs(pillNarrow.triH - pillNarrow.h) <= 0.5 && pillNarrow.dotOff <= 0.5,
	`三角盒高=${pillNarrow.triH} vs 药丸高=${pillNarrow.h}，圆点偏心=${pillNarrow.dotOff}`,
);

// 幻灯片指示点：视觉盒 10×10 不动，热区靠 elementFromPoint 实测上下 reach
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(base + "/", { waitUntil: "load" });
await page.waitForTimeout(900);
const dots = await page.evaluate(() => {
	const lis = [...document.querySelectorAll(".carousel-indicators li")];
	if (!lis.length) return null;
	const reach = (li) => {
		const btn = li.querySelector("button");
		const r = btn.getBoundingClientRect();
		const cx = r.x + r.width / 2;
		const cy = r.y + r.height / 2;
		// 命中判定含后代：点中心落在内部的原生 button 上，同样属于这一枚指示点
		const hits = (dx, dy) => {
			const el = document.elementFromPoint(cx + dx, cy + dy);
			return !!el && (el === li || li.contains(el));
		};
		const span = (dir) => {
			let n = 0;
			while (n < 40 && hits(0, dir * (n + 1))) n++;
			return n;
		};
		const lat = (dir) => {
			let n = 0;
			while (n < 20 && hits(dir * (n + 1), 0)) n++;
			return n;
		};
		// 误触保证（对称）：本点的邻点中心仍各自归邻点、且邻点中心不被本点吞掉。
		// 相邻两点的间距是 10px 点 + 5px 外边距 = 15px，热区横向只到 ±2.5px，
		// 因此任何一点的中心都不会被别人的热区抢走——这才是「扩热区不制造误触」。
		const ownsCenterOf = (other) => {
			const or = other.querySelector("button").getBoundingClientRect();
			const el = document.elementFromPoint(
				or.x + or.width / 2,
				or.y + or.height / 2,
			);
			return {
				mine: el === li || li.contains(el),
				theirs: el === other || other.contains(el),
			};
		};
		const idx = lis.indexOf(li);
		const prev = lis[idx - 1];
		const next = lis[idx + 1];
		let neighbourCentresSafe = null;
		const safe = [];
		if (prev) safe.push(ownsCenterOf(prev));
		if (next) safe.push(ownsCenterOf(next));
		if (safe.length)
			neighbourCentresSafe = safe.every((s) => !s.mine && s.theirs);
		return {
			visual: [Math.round(r.width), Math.round(r.height)],
			own: hits(0, 0),
			up: span(-1),
			down: span(1),
			left: lat(-1),
			right: lat(1),
			neighbourCentresSafe,
		};
	};
	return { n: lis.length, items: lis.map(reach) };
});
check(
	"幻灯片点外观盒仍是原版 10×10",
	!!dots && dots.items.every((d) => d.visual.join("×") === "10×10" && d.own),
	dots ? dots.items.map((d) => d.visual.join("×")).join(" ") : "无指示点",
);
check(
	"幻灯片点垂直热区 ≥24（原版仅 10）",
	!!dots && dots.items.every((d) => d.up + d.down + 1 >= 24),
	dots
		? dots.items
				.map((d) => `上${d.up}/点10/下${d.down}=${d.up + d.down + 1}`)
				.join(" ")
		: "-",
);
check(
	"热区不吞掉相邻点中心（扩热区不制造误触）",
	!!dots &&
		dots.items.every((d) => d.own && d.neighbourCentresSafe !== false),
	dots
		? dots.items
				.map(
					(d) =>
						`自身=${d.own} 邻点安全=${d.neighbourCentresSafe} 左${d.left}/右${d.right}`,
				)
				.join(" | ")
		: "-",
);
checkClean("票 10");

// ---------------- 贡献日历标签字号（票 11） ----------------
// 三处联动：月标 + 周几两处字号、首列宽变量、以及 .gh-calendar-grid min-width 里
// 那条 --gh-wd 的硬编码副本。同时把 AGENTS.md 锁死的几何做成回归护栏：
// 格子方形性、53/7 整体比例、subgrid 构造、滚动容器内距、入场位移方向。
const readCalendar = async (width) => {
	await page.setViewportSize({ width, height: 900 });
	await page.goto(base + "/about/", { waitUntil: "load" });
	await page.waitForTimeout(1200);
	return page.evaluate(() => {
		const months = document.querySelector(".gh-calendar-months");
		const cols = document.querySelector(".gh-calendar-cols");
		const wd = document.querySelector(".gh-calendar-wd");
		const cell = document.querySelector(".gh-calendar-cell");
		const col = document.querySelector(".gh-calendar-col");
		const scroll = document.querySelector(".gh-calendar-scroll");
		if (!months || !cols || !wd || !cell || !col || !scroll) return null;
		const cs = (e, p) => getComputedStyle(e)[p];
		const mRect = months.getBoundingClientRect();
		const labels = [...months.querySelectorAll("span")].filter((s) =>
			s.textContent.trim(),
		);
		const cRect = cols.getBoundingClientRect();
		const cellR = cell.getBoundingClientRect();
		return {
			monthFS: cs(months, "fontSize"),
			wdFS: cs(wd, "fontSize"),
			firstCol: cs(months, "gridTemplateColumns").split(" ")[0],
			// 周几标签右对齐：scrollWidth>clientWidth 即字形被挤到列外
			wdSpill: Math.max(
				0,
				...[...document.querySelectorAll(".gh-calendar-wd")].map(
					(e) => e.scrollWidth - e.clientWidth,
				),
			),
			// 月标 nowrap 溢出会被 .gh-calendar-months{overflow:hidden} 裁掉
			clipWorst: Math.max(
				0,
				...labels.map(
					(s) => s.getBoundingClientRect().right - mRect.right,
				),
			),
			labels: labels.length,
			cell: [+cellR.width.toFixed(1), +cellR.height.toFixed(1)],
			colsRatio: +(cRect.width / cRect.height).toFixed(3),
			subgrid: cs(col, "gridTemplateRows"),
			scrollPad: `${cs(scroll, "paddingTop")} ${cs(scroll, "paddingRight")} ${cs(scroll, "paddingBottom")} ${cs(scroll, "paddingLeft")}`,
			gridW: Math.round(
				document
					.querySelector(".gh-calendar-grid")
					.getBoundingClientRect().width,
			),
		};
	});
};
const cal1440 = await readCalendar(1440);
const cal681 = await readCalendar(681);
const cal390 = await readCalendar(390);
check(
	"日历标签桌面 11px、窄屏 10px（月标与周几同源）",
	!!cal1440 &&
		!!cal681 &&
		!!cal390 &&
		[cal1440, cal681].every(
			(c) => c.monthFS === "11px" && c.wdFS === "11px",
		) &&
		cal390.monthFS === "10px" &&
		cal390.wdFS === "10px",
	`1440=${cal1440?.monthFS}/${cal1440?.wdFS} 681=${cal681?.monthFS} 390=${cal390?.monthFS}/${cal390?.wdFS}`,
);
check(
	"字号上调后周几列不外溢、月份行不被裁切（三档）",
	[cal1440, cal681, cal390].every(
		(c) => c && c.wdSpill <= 0 && c.clipWorst <= 0.5 && c.labels === 12,
	),
	[cal1440, cal681, cal390]
		.map((c) =>
			c
				? `外溢=${c.wdSpill} 裁切=${c.clipWorst.toFixed(1)} 月标=${c.labels}`
				: "缺失",
		)
		.join(" | "),
);
check(
	"AGENTS.md 锁定项未动：格子方形性、53/7 比例、subgrid、滚动内距",
	[cal1440, cal681, cal390].every(
		(c) =>
			c &&
			Math.abs(c.cell[0] - c.cell[1]) <= 1 &&
			Math.abs(c.colsRatio - 53 / 7) <= 0.25 &&
			/^subgrid/.test(c.subgrid) &&
			c.scrollPad === "0px 3px 4px 0px",
	),
	[cal1440, cal681, cal390]
		.map(
			(c) =>
				c &&
				`格=${c.cell.join("×")} 比例=${c.colsRatio}(53/7=7.571) rows=${c.subgrid} 内距=${c.scrollPad}`,
		)
		.join(" | "),
);
// 入场位移方向：从上方落下（-6px 起）是 AGENTS 锁死项，读运行时动画的关键帧而非源码
// 首版在 `commit` 时刻读计算值：那时样式表尚未生效，animationName 恒为 none（假红）。
// 改为等样式就位后运行时重启该列的动画，再读首帧关键帧。
await page.goto(base + "/about/", { waitUntil: "load" });
await page.waitForTimeout(1200);
const entry = await page.evaluate(() => {
	const col = document.querySelector(".gh-calendar-col");
	if (!col) return null;
	col.style.animation = "none";
	void col.offsetWidth;
	col.style.animation = "";
	const anim = col.getAnimations?.()[0];
	const frames = anim?.effect?.getKeyframes?.();
	const tf = (f) => f?.transform ?? f?.computedOffset ?? null;
	const first = frames?.[0] ? tf(frames[0]) : null;
	return {
		name: getComputedStyle(col).animationName,
		from: first ?? (frames ? JSON.stringify(frames[0]).slice(0, 80) : null),
		y: Number.parseFloat(
			/translateY\(\s*(-?[\d.]+)px/.exec(String(first))?.[1] ?? "NaN",
		),
	};
});
check(
	"列级入场仍从上方落下（首帧 translateY < 0）",
	entry?.name === "gh-calendar-col-in" && Number(entry.y ?? 1) < 0,
	JSON.stringify(entry),
);
// 窄屏本就是「格子触到 --gh-cell-min 下限后局部横滚」的设计（AGENTS 已述），
// 所以不判有没有滚动条，改判网格整体宽度有没有因字号上调而变大——
// 首列宽变量与其硬编码副本没动时，该读数必须钉在基线上。
check(
	"窄屏横滚范围未因字号上调而扩大（网格宽度锁基线）",
	!!cal390 && Math.abs(cal390.gridW - 438) <= 1,
	`390 网格宽=${cal390?.gridW}（基线 438；若同批改 --gh-wd 需一并更新此基线）`,
);
checkClean("票 11");

// ---------------- 缩略图圆角与等宽数字保险（票 14） ----------------
// 三族缩略图各自比较「图片圆角 vs 卡片圆角」：图角大于卡角就会从卡片圆角里露出来。
// 宽度基线取自改动前实测（本地产物与线上产物当时逐项相同），用来证明本票只收圆角、不碰宽度。
const FAMILIES = [
	{
		name: "相册详情 .photo-grid",
		path: "/albums/%E6%97%A5%E5%B8%B8%E9%9A%8F%E6%89%8B%E6%8B%8D/",
		card: ".photo-grid a",
		img: ".photo-grid img",
		cardW: 190,
		imgW: 174,
	},
	{
		name: "相册索引 .album-cover",
		path: "/albums/",
		card: ".album-card .album-cover",
		img: ".album-card .album-cover img",
		cardW: 182,
		imgW: 170,
	},
	{
		name: "图片墙 .imageswall",
		path: "/images/",
		card: ".imageswall .grid a",
		img: ".imageswall .grid img",
		cardW: 182,
		imgW: 180,
	},
];
const fam = [];
for (const f of FAMILIES) {
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.goto(base + f.path, { waitUntil: "load" });
	await page.waitForTimeout(700);
	const got = await page.evaluate(
		([card, img]) => {
			const c = document.querySelector(card);
			const i = document.querySelector(img);
			if (!c || !i) return null;
			const num = (v) => Number.parseFloat(v) || 0;
			return {
				cardR: num(getComputedStyle(c).borderTopLeftRadius),
				imgR: num(getComputedStyle(i).borderTopLeftRadius),
				cardW: Math.round(c.getBoundingClientRect().width),
				imgW: Math.round(i.getBoundingClientRect().width),
			};
		},
		[f.card, f.img],
	);
	fam.push({ name: f.name, want: f, got });
}
check(
	"三族缩略图圆角均不超过其卡片圆角",
	fam.every((f) => f.got && f.got.imgR <= f.got.cardR),
	fam
		.map((f) => `${f.name} 图${f.got?.imgR} vs 卡${f.got?.cardR}`)
		.join(" | "),
);
check(
	"三族宽度逐项等于基线（本票只收圆角，不碰宽度）",
	fam.every(
		(f) =>
			f.got && f.got.cardW === f.want.cardW && f.got.imgW === f.want.imgW,
	),
	fam
		.map(
			(f) =>
				`${f.name} 卡${f.got?.cardW}/图${f.got?.imgW} 期望 ${f.want.cardW}/${f.want.imgW}`,
		)
		.join(" | "),
);
// 等宽数字：当前字体下是空操作，故只要求「声明落地」且「数字串宽度不变」。
const tnum = await (async () => {
	await page.goto(base + "/archive/", { waitUntil: "load" });
	await page.waitForTimeout(500);
	return page.evaluate(() => {
		const el = document.querySelector(".archive-entry-date");
		if (!el) return null;
		const probe = (text) => {
			const c = el.cloneNode(true);
			c.textContent = text;
			el.parentElement.appendChild(c);
			const w = c.getBoundingClientRect().width;
			c.remove();
			return +w.toFixed(2);
		};
		return {
			variant: getComputedStyle(el).fontVariantNumeric,
			w1: probe("1111111"),
			w0: probe("0000000"),
			wm: probe("1472580"),
		};
	});
})();
check(
	"日期类已落 tabular-nums 声明，且三种数字串等宽（保险不改变现状）",
	!!tnum &&
		/tabular-nums/.test(tnum.variant) &&
		tnum.w1 === tnum.w0 &&
		tnum.w1 === tnum.wm,
	JSON.stringify(tnum),
);
checkClean("票 14");

// ---------------- T2：死规则、断点、404 标题与分页元数据 ----------------
// 票 15：根字号基线（删掉从未生效的 13px 后，实测必须仍是浏览器默认 16px）
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(base + "/", { waitUntil: "load" });
const rootFont = await page.evaluate(
	() => getComputedStyle(document.documentElement).fontSize,
);
check("票 15：根字号仍为浏览器默认 16px", rootFont === "16px", rootFont);

// 票 16：头部轮播只剩一条实现——删掉死块后，活的轮播必须仍在滚，
// 且全站不得有任何元素还在引用被删的关键帧（计算值层面证明副本真死）
const ticker = await (async () => {
	await page.goto(base + "/posts/20260919135000/", { waitUntil: "load" });
	await page.waitForTimeout(300);
	const first = await page.evaluate(() => {
		const li = document.querySelector("#header .text li");
		return li ? li.textContent.trim() : null;
	});
	await page.waitForTimeout(4800); // > 一个 4s 节奏
	const after = await page.evaluate(() => {
		const li = document.querySelector("#header .text li");
		const dead = [...document.querySelectorAll("body *")].filter((e) =>
			e.getAnimations().some((a) => /ticker/.test(a.animationName ?? "")),
		).length;
		return { li: li ? li.textContent.trim() : null, dead };
	});
	return { first, after: after.li, deadAnims: after.dead };
})();
check(
	"票 16：头部微言轮播仍在轮转（唯一实现未受删除影响）",
	!!ticker.first && !!ticker.after && ticker.first !== ticker.after,
	`首条 "${ticker.first}" → 5.2s 后 "${ticker.after}"`,
);
check(
	"票 16：全站没有任何元素还在跑被删的 ticker 关键帧（负向扫描，真正的守卫是下面的指纹零差异）",
	ticker.deadAnims === 0,
	`引用数=${ticker.deadAnims}（被删的是零标记匹配的 CSS-only 块，改前改后都采不到动画，此条不会变红）`,
);

// 票 17：移动端视口下弹窗底部控件必须落在可视区内（vh 被地址栏吃掉的场景）。
// 注意判据形态：390×640 下弹窗内容只有约 224px，`max-height` 根本不参与布局——
// 只量「面板是否溢出」的断言把修复改回去也照样绿。所以真正的判别力来自
// max-height 的计算值本身：它必须已经小于旧 `calc(100vh - 32px)` 的阈值。
await page.setViewportSize({ width: 390, height: 640 });
await page.goto(base + "/domain/", { waitUntil: "load" });
await page.waitForTimeout(900);
const modalBox = await (async () => {
	const btn = page.locator(".meBox-Button a[data-site-modal]").first();
	if (!(await btn.count())) return null;
	await btn.click();
	await page.waitForSelector("#site-modal[open]", { timeout: 5000 });
	return page.evaluate(() => {
		const panel = document.querySelector("#site-modal .site-modal__panel");
		if (!panel) return null;
		const r = panel.getBoundingClientRect();
		// 取几何上最低的那个控件，而不是 DOM 末位
		const ctl = [...panel.querySelectorAll("a,button,input")].reduce(
			(best, e) => {
				const b = e.getBoundingClientRect().bottom;
				return !best || b > best.bottom
					? { bottom: b, tag: e.tagName }
					: best;
			},
			null,
		);
		return {
			panelBottom: Math.round(r.bottom),
			innerH: window.innerHeight,
			maxH: Number.parseFloat(getComputedStyle(panel).maxHeight) || null,
			ctlBottom: ctl ? Math.round(ctl.bottom) : null,
			ctlTag: ctl?.tag ?? "无控件",
		};
	});
})();
const oldVhThreshold = modalBox ? modalBox.innerH - 32 : 0;
check(
	"票 17：弹窗 max-height 已改用动态视口单位（低于旧的 calc(100vh-32px) 阈值）",
	!!modalBox &&
		modalBox.maxH !== null &&
		modalBox.maxH <= modalBox.innerH * 0.8 + 1 &&
		modalBox.maxH < oldVhThreshold,
	modalBox
		? `max-height=${modalBox.maxH}px，旧阈值=${oldVhThreshold}px，80%=${Math.round(modalBox.innerH * 0.8)}px`
		: "没找到弹窗",
);
check(
	"票 17：390×640 下弹窗面板与最靠下的控件都在可视区内",
	!!modalBox &&
		modalBox.panelBottom <= modalBox.innerH + 1 &&
		modalBox.ctlBottom !== null &&
		modalBox.ctlBottom <= modalBox.innerH + 1,
	modalBox
		? `面板底边=${modalBox.panelBottom}、${modalBox.ctlTag} 底边=${modalBox.ctlBottom} vs 视口高=${modalBox.innerH}`
		: "-",
);
// 票 17 那条被删的网格声明：判据不是「源码里没这行」，而是宿主确实用不上它——
// `.main-grid` 的计算 display 必须是 block（因此任何 grid-template-columns 都无效），
// 且正文列在窄屏仍占满其容器。
await page.goto(base + "/", { waitUntil: "load" });
await page.waitForTimeout(400);
const gridProof = await page.evaluate(() => {
	const g = document.querySelector(".main-grid");
	const c = document.querySelector("#content");
	if (!g || !c) return null;
	const gr = g.getBoundingClientRect();
	const cr = c.getBoundingClientRect();
	return {
		display: getComputedStyle(g).display,
		fit: Math.abs(cr.width - gr.width) <= 1,
		w: [Math.round(cr.width), Math.round(gr.width)],
	};
});
check(
	"票 17：.main-grid 计算 display 为 block（被删的网格列声明对其无效）且正文列占满容器",
	!!gridProof && gridProof.display === "block" && gridProof.fit === true,
	gridProof
		? `display=${gridProof.display} 宽 ${gridProof.w.join("/")} 占满=${gridProof.fit}`
		: "缺 .main-grid / #content",
);

// 票 18：404 页有真标题；分页标题与描述带页码
const notFound = await (async () => {
	const resp = await page.goto(base + "/this-page-should-404/", {
		waitUntil: "load",
	});
	await page.waitForTimeout(300);
	return page.evaluate((status) => {
		const h1 = [...document.querySelectorAll("h1")].filter((e) => {
			const cs = getComputedStyle(e);
			return cs.display !== "none" && cs.visibility !== "hidden";
		});
		return {
			status,
			h1: h1.map((e) => e.textContent.trim()),
			inMain: h1.some((e) => !!e.closest("#main")),
		};
	}, resp?.status() ?? 0);
})();
check(
	"票 18：404 页恰好一个可见 h1 且在正文容器内",
	notFound.status === 404 &&
		notFound.h1.length === 1 &&
		notFound.inMain === true,
	`status=${notFound.status} h1=${JSON.stringify(notFound.h1)} inMain=${notFound.inMain}`,
);
const readMeta = async (path) => {
	const resp = await page.goto(base + path, { waitUntil: "load" });
	return {
		status: resp?.status() ?? 0,
		...(await page.evaluate(() => ({
			t: document.title,
			d:
				document.querySelector('meta[name="description"]')?.content ??
				"",
		}))),
	};
};
const metaPairs = [];
for (const [p1, p2] of [
	["/", "/page/2/"],
	["/hot/", "/hot/page/2/"],
]) {
	const a = await readMeta(p1);
	const b = await readMeta(p2);
	metaPairs.push({ p1, p2, a, b, live: b.status === 200 });
}
check(
	"票 18：第 2 页确为 200（不是落 404 造成的假性「标题不同」）",
	metaPairs.every((m) => m.a.status === 200 && m.live),
	metaPairs
		.map((m) => `${m.p1}=${m.a.status} ${m.p2}=${m.b.status}`)
		.join(" | "),
);
check(
	"票 18：第 2 页的标题与描述都与第 1 页不同",
	metaPairs.every((m) => m.live && m.a.t !== m.b.t && m.a.d !== m.b.d),
	metaPairs
		.map(
			(m) =>
				`${m.p2} 标题${m.a.t === m.b.t ? "重复" : "已区分"}/描述${m.a.d === m.b.d ? "重复" : "已区分"}：“${m.b.t}”`,
		)
		.join(" | "),
);
checkClean("T2");

// ---------------- 插入项 插-2：搜索框选中线贴回原边框 ----------------
// 站长要求：线要「就在原边框上面」，参照主页右侧搜索框；按钮不要这条线。
// 参考实现的几何实测为：input 环 none + 容器 ::after 以 inset:0 画 2px，
// 即线带落在 [edge-2px, edge]；等价于 outline-offset: -2px。
// 判据落在计算值上：环必须仍实心且 ≥2px（票 05 不回退），且 offset 不得为正值
// （正值就是「浮在框外」，正是本次要消灭的观感）。
const FOCUS_BOXES = [
	["/search/", ".search-panel input"],
	["/this-page-should-404/", '.error-404 .search-box input[type="text"]'],
];
const focusLines = [];
for (const [path, sel] of FOCUS_BOXES) {
	await page.setViewportSize({ width: 1280, height: 900 });
	await page.goto(base + path, { waitUntil: "load" });
	await page.waitForSelector(sel, { timeout: 15000 });
	await page.waitForTimeout(600);
	await page.mouse.move(5, 5); // 排除 hover 通道
	await page.focus(sel);
	focusLines.push({
		path,
		...(await page.evaluate((s) => {
			const cs = getComputedStyle(document.querySelector(s));
			return {
				style: cs.outlineStyle,
				w: parseFloat(cs.outlineWidth) || 0,
				off: parseFloat(cs.outlineOffset),
				focused: document.activeElement === document.querySelector(s),
			};
		}, sel)),
	});
}
check(
	"插-2：搜索框选中线贴在原边框位置（不再浮在框外），且环仍可见",
	focusLines.every(
		(l) =>
			l.focused &&
			l.style === "solid" &&
			l.w >= 2 &&
			Number.isFinite(l.off) &&
			l.off <= 0,
	),
	focusLines
		.map((l) => `${l.path} ${l.w}px ${l.style} offset=${l.off}px`)
		.join(" | "),
);
// 按钮：不要环，但键盘焦点必须仍然可见（底色转深），否则就是删掉焦点指示的可达性回退
const btnStates = [];
for (const [path, sel, btn] of [
	["/search/", ".search-panel input", ".search-panel button"],
	[
		"/this-page-should-404/",
		'.error-404 .search-box input[type="text"]',
		'.error-404 .search-box input[type="submit"]',
	],
]) {
	await page.goto(base + path, { waitUntil: "load" });
	await page.waitForTimeout(600);
	await page.mouse.move(5, 5);
	const idle = await page.evaluate(
		(s) => getComputedStyle(document.querySelector(s)).backgroundColor,
		btn,
	);
	await page.focus(sel);
	await page.keyboard.press("Tab"); // 从输入框 Tab 一步到按钮
	const onBtn = await page.evaluate(
		([s, bs]) => document.activeElement === document.querySelector(bs),
		[sel, btn],
	);
	const st = await page.evaluate((s) => {
		const cs = getComputedStyle(document.querySelector(s));
		return {
			bg: cs.backgroundColor,
			ring: `${cs.outlineStyle} ${cs.outlineWidth}`,
		};
	}, btn);
	btnStates.push({ path, onBtn, idle, ...st });
}
check(
	"插-2：按钮不出选中线，但 Tab 到时底色转深（焦点仍可见）",
	btnStates.every(
		(s) =>
			s.onBtn &&
			/^none/.test(s.ring) &&
			s.bg !== s.idle &&
			s.bg !== "rgba(0, 0, 0, 0)",
	),
	btnStates
		.map(
			(s) =>
				`${s.path} 抵达=${s.onBtn} ${s.idle} → ${s.bg}（环 ${s.ring}）`,
		)
		.join(" | "),
);
checkClean("插-2");

// ---------------- T3 票 21：药丸六色压暗（乙法）----------------
// 判据只落在渲染出来的计算值上：抓六格药丸实际生效的 background-color 与 color，
// 在 Node 侧离线算 WCAG 对比度与 CIE76 ΔE。绝不读 CSS 源文本、token 名或行号。
const parseRgb = (s) => {
	const m = /rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/.exec(s);
	return m ? [+m[1], +m[2], +m[3]] : null;
};
const contrast = (a, b) => {
	const [x, y] = [relLum(a), relLum(b)].sort((p, q) => q - p);
	return (x + 0.05) / (y + 0.05);
};
const toLab = ([r, g, b]) => {
	const [R, G, B] = [r, g, b].map((v) => {
		const s = v / 255;
		return s > 0.04045 ? ((s + 0.055) / 1.055) ** 2.4 : s / 12.92;
	});
	const f = (v) => (v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116);
	const [fx, fy, fz] = [
		f((0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047),
		f(0.2126 * R + 0.7152 * G + 0.0722 * B),
		f((0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883),
	];
	return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
};
const deltaE = (a, b) => {
	const [p, q] = [toLab(a), toLab(b)];
	return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
};
const WHITE = [255, 255, 255];
// 改前实测基线：原六色两两最小 ΔE = 41.29（第 2 与第 5 格）。判据写作「不劣于现状」
// 而不是凭空一个绝对阈值——站长要保的是同一档可辨性。
const BASELINE_MIN_DE = 41.29;

const pillsAt = async (path, sel) => {
	await page.goto(base + path, { waitUntil: "load" });
	return page.evaluate((sel) => {
		return [...document.querySelectorAll(sel)].map((el) => {
			const badge = el.querySelector(".tag-count");
			return {
				bg: getComputedStyle(el).backgroundColor,
				fg: getComputedStyle(el).color,
				badge: badge ? getComputedStyle(badge).color : null,
				href: el.getAttribute("href") ?? "",
			};
		});
	}, sel);
};
// 云集页上 .blogtags 有两个（正文云与侧栏部件同用 TagPillCloud.astro），所以选择器
// 一律带容器前缀：裸写 .blogtags 会把两处并成一处，量到的就不是那一个界面。
const CLOUD = "#content .blogtags a";
const pillFaces = async (path, sel) => (await pillsAt(path, sel)).slice(0, 6);

const cloud = await pillFaces("/tag/", CLOUD);
check("票 21：标签云集取到 6 格药丸参与比对", cloud.length === 6, cloud.length);
const clouds = cloud.map((c) => parseRgb(c.bg));
check(
	"票 21：六格底色互不相同（六色轮换未塌成同色）",
	clouds.every(Boolean) && new Set(clouds.map((c) => c.join())).size === 6,
	clouds.map((c) => (c ? `rgb(${c.join()})` : "?")).join(" "),
);
check(
	"票 21：六格文字均为白字（乙法前提）",
	cloud.every((c) => parseRgb(c.fg)?.join() === WHITE.join()),
	[...new Set(cloud.map((c) => c.fg))].join(" | "),
);
const crs = clouds.map((c) => contrast(c, WHITE));
check(
	"票 21：六格白字对比度均 ≥4.5:1（WCAG 1.4.3 AA 正文）",
	crs.every((v) => v >= 4.5),
	crs.map((v) => Math.round(v * 100) / 100).join(" "),
);
let minDe = Infinity;
let minPair = "";
for (let i = 0; i < 6; i++)
	for (let j = i + 1; j < 6; j++) {
		const v = deltaE(clouds[i], clouds[j]);
		if (v < minDe) {
			minDe = v;
			minPair = `第${i + 1}与第${j + 1}格`;
		}
	}
const round2 = (v) => Math.round(v * 100) / 100;
// 基线是以两位小数记录的实测值（41.29），比较时两侧精度必须一致，
// 否则未取整的 41.2899… 会让「与改前完全相同」这一事实被判成劣化。
check(
	`票 21：两两最小 ΔE 不劣于改前基线 ${BASELINE_MIN_DE}（CIE76）`,
	round2(minDe) >= BASELINE_MIN_DE,
	`最小 ΔE ${round2(minDe)}（${minPair}）`,
);
check(
	"票 21：×N 计数徽标仍为白字（压暗后未被同色吞掉）",
	cloud.every((c) => !c.badge || parseRgb(c.badge)?.join() === WHITE.join()),
	[...new Set(cloud.map((c) => c.badge ?? "无徽标"))].join(" | "),
);
const articleTags = await pillFaces("/posts/20260919135000/", ".post-tags a");
check(
	"票 21：文章页标签与云页共用同一组底色（token 单源未破）",
	articleTags.length > 0 &&
		articleTags.every((a) =>
			clouds.some((c) => c?.join() === parseRgb(a.bg)?.join()),
		),
	articleTags.map((a) => a.bg).join(" | "),
);
// 票 21 的「五处同屏比对」：标签云集页、单标签页、分类云集页、单分类页、侧栏部件。
// 三条刻意设计：① 选择器带容器前缀（云集页上 .blogtags 有两个，见上）；② 单页入口的
// slug 不写死，从该云页自己渲染的第一个药丸链接取，并当场核对它确属那一族——DOM 顺序
// 一旦变化，缺这条校验就会让标签页冒充分类页而照样绿；③ 当前项 a.is-current 按设计是
// 品牌绿，排除在六色比对之外。
// 本判据比的是**颜色集合**而非逐格顺序：它守「底色单源」（另一处硬编码、或某处漏接
// token 会变红），**守不住 nth-child 六色轮换被重排**——那条 AGENTS.md 锁由缝隙 B 的
// 逐元素指纹负责（票 21 的 439 处差异全部是 background-color，逐格归属可见）。
const FIVE = "#content .blogtags a:not(.is-current)";
const tagCloudAt = await pillsAt("/tag/", FIVE);
const catCloudAt = await pillsAt("/category/", FIVE);
const tagOneHref = tagCloudAt[0]?.href ?? "";
const catOneHref = catCloudAt[0]?.href ?? "";
const faces = [
	["标签云集页", tagCloudAt, true],
	[
		"单标签页",
		await pillsAt(tagOneHref, FIVE),
		tagOneHref.startsWith("/tag/"),
	],
	["分类云集页", catCloudAt, true],
	[
		"单分类页",
		await pillsAt(catOneHref, FIVE),
		catOneHref.startsWith("/category/"),
	],
	[
		"侧栏部件",
		await pillsAt("/", "#sidebar .blogtags a:not(.is-current)"),
		true,
	],
];
const six = new Set(cloud.map((c) => parseRgb(c.bg)?.join()));
const problems = [];
for (const [name, at, hrefOk] of faces) {
	if (!hrefOk) problems.push(`${name}的入口不属该族`);
	const keys = at.map((a) => parseRgb(a.bg)?.join() ?? a.bg);
	const uniq = new Set(keys);
	const out = keys.filter((k) => !six.has(k)).length;
	if (out) problems.push(`${name}越界 ${out} 格`);
	// 满 6 格才要求出满六色。全站分类一共 6 个，单分类页排掉当前项只剩 5 格，
	// 硬写 === 6 会在那一处假红——本判据第一版跑出来翻红的正是这里，不是猜测。
	if (at.length >= 6 && uniq.size < 6)
		problems.push(`${name} ${at.length}格只出 ${uniq.size} 色（疑似塌色）`);
}
check(
	"票 21：五处共用该 DOM 的页面都只出这六色（底色单源未破）",
	problems.length === 0,
	faces
		.map(
			([n, at]) =>
				`${n}=${new Set(at.map((a) => a.bg)).size}色/${at.length}格`,
		)
		.join(" | ") + (problems.length ? ` 问题：${problems.join("；")}` : ""),
);
checkClean("T3 票 21");

// ---------------- T3 票 20：绿色瞬时态补非颜色辅助 ----------------
// 缝隙 B 只读静息计算值、不驱动 hover，所以这一票的判据必须全在这里做实机悬停。
// 两条同时成立才算过：① 非颜色通道上可感知（下划线出现 / 线展开）② 悬停不产生布局位移。
const SCALE_X1 = "matrix(1, 0, 0, 1, 0, 0)";
const hoverProbe = async (path, sel, { trigger } = {}) => {
	await page.goto(base + path, { waitUntil: "load" });
	const el = page.locator(sel).first();
	if (!(await el.count())) return { missing: true, sel, path };
	if (trigger) {
		// 下拉子项静息时整条面板 display:none，必须先悬停外层父项把它显形；
		// 注意不能 hover 子项自己的 li（它在隐藏面板内，本身不可见）
		await page.locator(trigger).first().hover();
		// 等面板真的可命中再取值。固定毫秒数在生产上会取到「尚未显形」的瞬间，
		// 于是同一条判据本地稳、线上偶发翻红。
		await el.waitFor({ state: "visible", timeout: 10000 });
		await page.waitForFunction(
			(sel) => {
				const n = document.querySelector(sel);
				return !!n && n.getClientRects().length > 0;
			},
			sel,
			{ timeout: 10000 },
		);
		// 面板自带 dropdown-in 入场动画（transform-origin: top center），
		// 刚显形时几何还在变，会把动画位移误读成 hover 造成的布局位移。
		// 等到自身几何连续两次一致再取 idle。
		await page.waitForFunction(
			(sel) => {
				const n = document.querySelector(sel);
				if (!n) return false;
				const k = "__settle";
				const now = JSON.stringify(n.getBoundingClientRect());
				const prev = n[k];
				n[k] = now;
				return prev === now;
			},
			sel,
			{ timeout: 10000, polling: 120 },
		);
	}
	const geom = async () =>
		el.evaluate((node) => {
			const cs = getComputedStyle(node);
			const r = node.getBoundingClientRect();
			const p = node.parentElement;
			return {
				deco: cs.textDecorationLine,
				color: cs.color,
				w: Math.round(r.width * 100) / 100,
				h: Math.round(r.height * 100) / 100,
				top: Math.round(r.top * 100) / 100,
				left: Math.round(r.left * 100) / 100,
				line: getComputedStyle(node, "::after").transform,
				lineBg: getComputedStyle(node, "::after").backgroundColor,
				pw: p
					? Math.round(p.getBoundingClientRect().width * 100) / 100
					: null,
				psw: p ? p.scrollWidth : null,
			};
		});
	const idle = await geom();
	await el.hover();
	await page.waitForTimeout(320); // 越过 0.2s 过渡，避免取到中途插值
	const hot = await geom();
	return { idle, hot, sel, path };
};

const ULINE = (d) => d === "underline" || d.includes("underline");
const DE = (x, y) => Math.abs(x - y);
const SHIFT = (g) =>
	DE(g.idle.w, g.hot.w) +
	DE(g.idle.h, g.hot.h) +
	DE(g.idle.left, g.hot.left) +
	DE(g.idle.pw ?? 0, g.hot.pw ?? 0) +
	DE(g.idle.psw ?? 0, g.hot.psw ?? 0);

const side = await hoverProbe("/", "#sidebar a:not(.blogtags a)");
check(
	"票 20：侧栏链接悬停时出现下划线（不只靠变色）",
	!side.missing && !ULINE(side.idle.deco) && ULINE(side.hot.deco),
	side.missing ? "选择器未命中" : `${side.idle.deco} → ${side.hot.deco}`,
);
check(
	"票 20：侧栏悬停零布局位移",
	!side.missing && SHIFT(side) === 0,
	side.missing ? "" : `合计位移 ${SHIFT(side)}`,
);

const card = await hoverProbe("/", ".post-list .post-header h2 a");
check(
	"票 20：卡片标题悬停时出现下划线",
	!card.missing && !ULINE(card.idle.deco) && ULINE(card.hot.deco),
	card.missing ? "选择器未命中" : `${card.idle.deco} → ${card.hot.deco}`,
);
check(
	"票 20：卡片标题悬停零布局位移",
	!card.missing && SHIFT(card) === 0,
	card.missing ? "" : `合计位移 ${SHIFT(card)}`,
);
check(
	"票 20：卡片标题悬停时颜色仍变（补的是辅助，不是替换原有颜色线索）",
	!card.missing && card.idle.color !== card.hot.color,
	card.missing ? "" : `${card.idle.color} → ${card.hot.color}`,
);

// 首页上第一项是 .current，它的线本来就常开；必须取非当前项才测得到 hover
const nav = await hoverProbe("/", "#menu-index > li:not(.current) > a");
check(
	"票 20：主菜单项悬停时线展开（由既有 @media (hover:hover) and (pointer:fine) 规则保证，本票不重复声明）",
	!nav.missing && nav.idle.line !== SCALE_X1 && nav.hot.line === SCALE_X1,
	nav.missing ? "" : `静息 ${nav.idle.line} → 悬停 ${nav.hot.line}`,
);
check(
	"票 20：主菜单悬停零布局位移",
	!nav.missing && SHIFT(nav) === 0,
	nav.missing ? "" : `合计位移 ${SHIFT(nav)}`,
);
check(
	"票 20：品牌绿未被改动（悬停线色仍为 #00c000 = rgb(0, 192, 0)）",
	!nav.missing && nav.hot.lineBg === "rgb(0, 192, 0)",
	nav.missing ? "" : nav.hot.lineBg,
);

const drop = await hoverProbe("/", "#menu-index > li > ul > li > a", {
	trigger: "#menu-index > li:has(ul) > a",
});
check(
	"票 20：下拉子项悬停时线展开（同上，既有守卫规则已覆盖，作为回归护栏保留）",
	!drop.missing && drop.idle.line !== SCALE_X1 && drop.hot.line === SCALE_X1,
	drop.missing ? "" : `静息 ${drop.idle.line} → 悬停 ${drop.hot.line}`,
);
check(
	"票 20：下拉子项悬停零布局位移",
	!drop.missing && SHIFT(drop) === 0,
	drop.missing ? "" : `合计位移 ${SHIFT(drop)}`,
);

const inline = await hoverProbe("/posts/20260919135000/", ".post-context a");
check(
	"票 20：正文内联链接悬停仍有下划线（既有 .prose a:hover 未被我改坏）",
	!inline.missing && ULINE(inline.hot.deco),
	inline.missing
		? "选择器未命中"
		: `${inline.idle.deco} → ${inline.hot.deco}`,
);

const pill = await hoverProbe("/", "#sidebar .blogtags a");
check(
	"票 20：侧栏六色药丸不被那条 hover 划线（药丸的颜色就是它的身份，票面未要求加线）",
	!pill.missing && !ULINE(pill.hot.deco),
	pill.missing ? "选择器未命中" : `悬停 ${pill.hot.deco}`,
);

// ---------------- #45：微言轮播「悬停无视觉反馈」是既定设计，判据锁现状 ----------------
// 2026-09-23 裁决：#header .text 那 4 条链接既不补下划线也不换色。
// #header .text a{color:#fff}（id 特异性）压住通用 a:hover{color:品牌绿}，全族又没有任何
// :hover 的 text-decoration 规则，于是静息态与悬停态计算值完全相同。
// 判据断言的是「差值为零」这个级联事实，不锁 CSS 源文本：将来谁放开 hover、或把那条白字
// 规则的特异性降下去，都会在这里翻红。
// 取数前先冻结轮播：轮播每 4s 上滚一条并把首条 li 搬到末尾，真实鼠标悬停会在动画中途
// 失去 :hover；initHeaderTicker() 在 prefers-reduced-motion: reduce 下根本不启动，
// 于是链接静止，量到的就是级联本身。缝隙 B 的排除表显式含 #header .text 整族，
// 这一族只能靠这里守。
await page.emulateMedia({ reducedMotion: "reduce" });
const tickerHover = await hoverProbe("/", "#header .text a");
await page.emulateMedia({ reducedMotion: "no-preference" });
check(
	"#45：微言轮播链接悬停时颜色不变（无 hover 反馈属既定设计，锁现状）",
	!tickerHover.missing && tickerHover.idle.color === tickerHover.hot.color,
	tickerHover.missing
		? "选择器未命中（链接被删或改名了，同样是破坏）"
		: `静息 ${tickerHover.idle.color} → 悬停 ${tickerHover.hot.color}`,
);
check(
	"#45：微言轮播链接悬停时不出下划线（该族零条 :hover 划线规则）",
	!tickerHover.missing && tickerHover.idle.deco === tickerHover.hot.deco,
	tickerHover.missing
		? "选择器未命中"
		: `静息 ${tickerHover.idle.deco} → 悬停 ${tickerHover.hot.deco}`,
);

// hover 暂停滚动是 initHeaderTicker() 的 JS 行为，与上面的「视觉无反馈」互不隶属：
// 前者是设计裁决，后者是可达性下限，两者都得活着。暂停绑在 #header .text 容器上
// （mouseenter 清定时器、mouseleave 重启），悬停容器即可复现。
const tickerPause = await (async () => {
	await page.goto(base + "/", { waitUntil: "load" });
	await page.waitForTimeout(300);
	const read = () =>
		page.evaluate(
			() =>
				document
					.querySelector("#header .text li")
					?.textContent?.trim() ?? null,
		);
	const before = await read();
	await page.locator("#header .text").first().hover();
	await page.waitForTimeout(5200); // 4s 节奏 + 0.8s 过渡，留 400ms 余量
	const during = await read();
	await page.mouse.move(2, 2); // 移出容器，触发 mouseleave 恢复
	await page.waitForTimeout(5200);
	const after = await read();
	return { before, during, after };
})();
check(
	"#45：悬停期间轮播停住（一个节奏以上首条不变）",
	!!tickerPause.before && tickerPause.before === tickerPause.during,
	`悬停前 "${tickerPause.before}" → 5.2s 后 "${tickerPause.during}"`,
);
check(
	"#45：移出悬停后轮播恢复（不是把动画整个删掉）",
	!!tickerPause.during && tickerPause.during !== tickerPause.after,
	`停住 "${tickerPause.during}" → 移出 5.2s 后 "${tickerPause.after}"`,
);

// 键盘可达性下限：Tab 走到那 4 条链接之一，必须拿到全站 :focus-visible 描边。
const tickerFocus = await (async () => {
	await page.goto(base + "/", { waitUntil: "load" });
	let hit = null;
	for (let i = 0; i < 12 && !hit; i++) {
		await page.keyboard.press("Tab");
		hit = await page.evaluate(() => {
			const el = document.activeElement;
			if (!el || !el.closest("#header .text")) return null;
			const cs = getComputedStyle(el);
			return {
				ring: `${cs.outlineStyle} ${cs.outlineWidth}`,
				tag: el.tagName.toLowerCase(),
			};
		});
	}
	return hit;
})();
check(
	"#45：Tab 到微言链接时拿到站点焦点环（无 hover ≠ 无键盘可达）",
	!!tickerFocus && /^solid \d/.test(tickerFocus.ring),
	tickerFocus ? tickerFocus.ring : "12 次 Tab 内未走到 #header .text 的链接",
);

const focus = await (async () => {
	await page.goto(base + "/", { waitUntil: "load" });
	// 盲按固定次数会落在 skip link 或 logo 上，必须按到菜单锚点为止（有界）
	let hit = null;
	for (let i = 0; i < 12 && !hit; i++) {
		await page.keyboard.press("Tab");
		hit = await page.evaluate(() => {
			const el = document.activeElement;
			if (!el || !el.closest("#menu-index")) return null;
			return {
				line: getComputedStyle(el, "::after").transform,
				ring: `${getComputedStyle(el).outlineStyle} ${getComputedStyle(el).outlineWidth}`,
				isCurrent: !!el.closest("li.current"),
				text: (el.textContent ?? "").trim().slice(0, 10),
			};
		});
	}
	return hit ? hit : { notReached: true };
})();
check(
	"票 20：键盘到达菜单项时同时有线与焦点环（非颜色辅助双保险，WCAG 2.4.7 不回退）",
	!focus.notReached &&
		focus.line === SCALE_X1 &&
		/^solid \d/.test(focus.ring),
	JSON.stringify(focus),
);
checkClean("T3 票 20");

// ---------------- T3 票 22：z-index 三处真实关系 ----------------
// 一律读**计算值**。源里 10000000001 与 10000000000 看着差 1，浏览器却把两者都钳到
// int32 上限 2147483647 —— 实为同值，谁盖谁只剩绘制顺序侥幸。读源文本永远发现不了这件事。
const INT32_MAX = 2147483647;
const zn = (v) => (v === null || v === "auto" ? NaN : Number(v));
const zs = await page.evaluate(() => {
	const g = (sel) => {
		const el = document.querySelector(sel);
		return el ? getComputedStyle(el).zIndex : null;
	};
	return {
		skip: g(".skip-link"),
		player: g("#myhkplayer"),
		mask: g(".colorful_loading_frame"),
	};
});
check(
	"票 22：跳过链接与播放器都落在可表示区间内（不再被 int32 钳成同一个数）",
	!Number.isNaN(zn(zs.skip)) &&
		!Number.isNaN(zn(zs.player)) &&
		zs.skip !== zs.player &&
		Number(zs.skip) < INT32_MAX &&
		Number(zs.player) < INT32_MAX,
	`skip=${zs.skip} player=${zs.player}（int32 上限 ${INT32_MAX}）`,
);
check(
	"票 22：跳过链接确实高于常驻播放器，且余量为正",
	zn(zs.skip) > zn(zs.player) && zn(zs.skip) - zn(zs.player) >= 1000,
	`${zs.skip} vs ${zs.player}，余量 ${zn(zs.skip) - zn(zs.player)}`,
);

// 提示是按需创建的，静息不在 DOM 里——先真点一次带 data-copy-message 的入口把 toast 唤出来
await page.goto(base + "/", { waitUntil: "load" });
const copyEntry = page.locator("[data-copy-message]").first();
const hasCopyEntry = (await copyEntry.count()) > 0;
if (hasCopyEntry) await copyEntry.click({ force: true }).catch(() => {});
const toastShown = await page
	.waitForSelector(".site-toast", { timeout: 6000 })
	.catch(() => null);
const toastZ = toastShown
	? await toastShown.evaluate((el) => getComputedStyle(el).zIndex)
	: null;
check(
	"票 22：toast 确被真实唤出（否则下一条无从比较）",
	!!toastZ,
	hasCopyEntry ? `z=${toastZ}` : "页面上找不到 data-copy-message 入口",
);
check(
	"票 22：提示高于加载遮罩（切页期间的反馈不会被吃掉）",
	!!toastZ && zn(toastZ) > zn(zs.mask),
	`toast=${toastZ} mask=${zs.mask}`,
);

// 灯箱是模态 <dialog>，走顶层层：任何 z-index 都盖不住它。判据用命中测试而非比数值——
// 数值上 .fancybox__container 算出来是 auto，比大小会得出完全错误的结论。
await page.goto(base + "/posts/20260909092113/", { waitUntil: "load" });
await page.waitForTimeout(600);
const opened = await page.evaluate(() => {
	const img = document.querySelector(".prose img[data-fancybox]");
	if (!img) return false;
	img.click();
	return true;
});
await page
	.waitForSelector(".fancybox__container", { timeout: 15000 })
	.catch(() => {});
const cover = await page.evaluate(() => {
	const c = document.querySelector(".fancybox__container");
	if (!c) return { missing: true };
	const r = c.getBoundingClientRect();
	// 在灯箱界面内放一个特效字与一个提示，再做命中测试
	const w = document.createElement("span");
	w.className = "click-word";
	w.textContent = "测试";
	w.style.left = Math.round(r.left + r.width / 2) + "px";
	w.style.top = Math.round(r.top + 40) + "px";
	const t = document.createElement("div");
	t.className = "site-toast";
	t.textContent = "提示";
	t.style.left = Math.round(r.left + r.width / 2) + "px";
	t.style.top = Math.round(r.top + r.height - 40) + "px";
	document.body.append(w, t);
	const hit = (x, y) => document.elementFromPoint(x, y);
	const at = (el) => {
		const b = el.getBoundingClientRect();
		return hit(
			Math.round(b.left + b.width / 2),
			Math.round(b.top + b.height / 2),
		);
	};
	const overW = at(w);
	const overT = at(t);
	const z = {
		container: getComputedStyle(c).zIndex,
		click: getComputedStyle(w).zIndex,
		toast: getComputedStyle(t).zIndex,
	};
	w.remove();
	t.remove();
	const inside = (el) => !!el && !!el.closest?.(".fancybox__container");
	return {
		missing: false,
		z,
		wCovered: inside(overW) || overW?.tagName === "DIALOG",
		tCovered: inside(overT) || overT?.tagName === "DIALOG",
		wHit: overW
			? overW.tagName + "." + String(overW.className).slice(0, 20)
			: null,
	};
});
check(
	"票 22：灯箱确实打开",
	opened && !cover.missing,
	cover.missing ? "容器未出现" : "已开",
);
check(
	"票 22：灯箱打开时，特效字与提示都不覆盖其界面（顶层层保证，非数值侥幸）",
	!cover.missing && cover.wCovered && cover.tCovered,
	JSON.stringify(cover.z) + " 特效字命中=" + cover.wHit,
);
await page.keyboard.press("Escape");
await page.waitForTimeout(400);

// Tab 首站：必须等 0.2s 过渡走完再量几何，否则会读到 translateY(-200%) 的起点（本轮踩过）
await page.goto(base + "/", { waitUntil: "load" });
await page.keyboard.press("Tab");
await page.waitForTimeout(400);
const tabFirst = await page.evaluate(() => {
	const el = document.activeElement;
	const r = el.getBoundingClientRect();
	return {
		cls: el.className,
		top: Math.round(r.top),
		h: Math.round(r.height),
		z: getComputedStyle(el).zIndex,
		player: getComputedStyle(document.querySelector("#myhkplayer")).zIndex,
	};
});
check(
	"票 22：键盘 Tab 首站仍是跳过链接，聚焦后真的露出且未被播放器压住",
	tabFirst.cls.includes("skip-link") &&
		zn(tabFirst.z) > zn(tabFirst.player) &&
		tabFirst.top >= 0 &&
		tabFirst.h > 0,
	JSON.stringify(tabFirst),
);
checkClean("T3 票 22");

// ---------------- #41：文章页的分类/标签链接必须落在真的生成出来的路由上 ----------------
// 根因是两端判据不同源：路由由 getTagList/getCategoryList 枚举，而这两个函数先过
// isPublicPost，所以私有文章独占的分类/标签**从不生成页面**；文章页却照 frontmatter 发链接。
// 判据不写死任何 slug：合法路由清单取 /tag/ 与 /category/ 自己渲染出的完整药丸云，
// 被检页面清单取 sitemap（私有文章页也在里面），两端都是读产物，不读源码。
const routeNames = async (path, kind) => {
	await page.goto(base + path, { waitUntil: "load" });
	return page.evaluate(
		([kind]) => {
			const out = new Set();
			// 只认与本页同类的那一种 url：/category/ 上除了头部全量分类云，侧栏部件还会
			// 再渲染一个 **标签** 药丸云（两者都用 .blogtags），混着收会把 32 个标签名也
			// 算进合法分类集合，而「习题/试卷/技术架构」既是标签又是分类——泄漏就会漏判。
			const re = new RegExp(`^\\/${kind}\\/(.+)\\/$`);
			for (const a of document.querySelectorAll(".blogtags a")) {
				const m = re.exec(a.getAttribute("href") ?? "");
				if (m) out.add(decodeURIComponent(m[1]));
			}
			return [...out];
		},
		[kind],
	);
};
const tagRoutes = new Set(await routeNames("/tag/", "tag"));
const catRoutes = new Set(await routeNames("/category/", "category"));
const sitemapIndex = await (await fetch(base + "/sitemap-index.xml")).text();
const postPages = new Set();
// 票 05 的负扫要「每一个公开页」，所以同一个循环里顺手把全量路径也收下来，
// 不再另开一次 sitemap 解析（两处解析会随 sitemap 结构变化各自漂移）。
const allSitemapPaths = [];
for (const f of [...sitemapIndex.matchAll(/<loc>(.*?)<\/loc>/g)]
	.map((m) => m[1])
	// sitemap 里写的是绝对 url（站点主域），本地跑时必须改指到 base，
	// 否则子图会被去线上取，变成「本地页面 + 线上清单」的错配比对。
	.map((u) => base + u.replace(/^https?:\/\/[^/]+/, ""))) {
	const xml = await (await fetch(f)).text();
	for (const u of xml.matchAll(/<loc>(.*?)<\/loc>/g)) {
		const path = u[1].replace(/^https?:\/\/[^/]+/, "");
		allSitemapPaths.push(path);
		if (/^\/posts\/[^/]+\/$/.test(path)) postPages.add(path);
	}
}
check(
	"#41：比对前提成立（路由清单与非首页文章页都真拿到了）",
	tagRoutes.size >= 6 && catRoutes.size >= 2 && postPages.size >= 10,
	`标签路由 ${tagRoutes.size}／分类路由 ${catRoutes.size}／sitemap 文章页 ${postPages.size}`,
);
const deadLinks = [];
for (const p of [...postPages].sort()) {
	await page.goto(base + p, { waitUntil: "domcontentloaded" });
	const out = await page.evaluate(() => {
		const found = [];
		for (const a of document.querySelectorAll(
			".post-metaa a, .post-tags a",
		)) {
			const m = /^\/(tag|category)\/(.+)\/$/.exec(
				a.getAttribute("href") ?? "",
			);
			if (m) found.push([m[1], decodeURIComponent(m[2])]);
		}
		return found;
	});
	for (const [kind, name] of out) {
		const live = kind === "tag" ? tagRoutes.has(name) : catRoutes.has(name);
		if (!live) deadLinks.push(`${p} → /${kind}/${name}/`);
	}
}
check(
	"#41：全站文章页发出的分类/标签链接都指向已生成的路由",
	deadLinks.length === 0,
	`扫 ${postPages.size} 篇，死链 ${deadLinks.length} 条` +
		(deadLinks.length ? `：${deadLinks.slice(0, 8).join("、")}` : ""),
);
// 只查「没有死链」会被一种假绿骗过去：把整行分类/标签删掉也能通过。
// 所以再看一眼 issue #41 里那篇三项全死的样本：三项必须**仍然看得见，只是不再是链接**。
await page.goto(base + "/posts/20240501000000/", {
	waitUntil: "domcontentloaded",
});
const witness = await page.evaluate(() => {
	const row = (sel) => ({
		text: (document.querySelector(sel)?.textContent ?? "")
			.replace(/\s+/g, " ")
			.trim(),
		links: [...document.querySelectorAll(sel + " a")].map((a) =>
			a.textContent.trim(),
		),
	});
	return { meta: row(".post-metaa"), tags: row(".post-tags") };
});
const GONE = ["示例", "Markdown", "扩展"];
const stillLinked = GONE.filter(
	(t) => witness.meta.links.includes(t) || witness.tags.links.includes(t),
);
const stillVisible = GONE.filter(
	(t) => witness.meta.text.includes(t) || witness.tags.text.includes(t),
);
check(
	"#41：无路由的那几项降为纯文字而不是被删掉（样本篇 示例/Markdown/扩展 仍可见）",
	stillLinked.length === 0 && stillVisible.length === GONE.length,
	`仍成链接=[${stillLinked.join(",") || "无"}] 文字里仍在=[${stillVisible.join(",") || "无"}]`,
);

// ---------------- #47：同一页面不得出现重复 id（全站负扫，常驻判据） ----------------
// 判据形态是**负扫**而不是点名单：上一轮 #41 就是被「只查点名过的地方」藏住的。
// 页面清单由 sitemap 枚举每一个公开页，再加 404 页本身（它不在 sitemap 里但真会发出去）。
// 只解析 fetch 到的 HTML 文本（用浏览器自己的 DOMParser，不引第三方解析器）——
// 这条契约的对象是「服务端写出的 HTML 里有没有两个同名 id」，运行时脚本注入的 id
// （看板娘、3D 云）不在其列，把它们算进来会让判据随远端加载时机翻脸。
const dupPages = [...new Set([...allSitemapPaths, "/this-page-should-404/"])];
const dupReport = await page.evaluate(
	async ({ base, paths }) => {
		const offenders = [];
		let scanned = 0;
		for (let i = 0; i < paths.length; i += 8) {
			await Promise.all(
				paths.slice(i, i + 8).map(async (p) => {
					const res = await fetch(base + p);
					// 404 页的响应码就是 404，但它的 HTML 一样要扫
					if (!res.ok && res.status !== 404) return;
					const text = await res.text();
					if (!text.includes("<")) return;
					scanned++;
					const doc = new DOMParser().parseFromString(
						text,
						"text/html",
					);
					const counts = new Map();
					for (const el of doc.querySelectorAll("[id]"))
						counts.set(el.id, (counts.get(el.id) ?? 0) + 1);
					for (const [id, n] of counts)
						if (n > 1) offenders.push(`${p} → #${id}×${n}`);
				}),
			);
		}
		return { offenders, scanned };
	},
	{ base, paths: dupPages },
);
check(
	"#47：sitemap 每个页面的 id 都唯一（重复 id 负扫）",
	dupReport.scanned >= 100 && dupReport.offenders.length === 0,
	`扫 ${dupReport.scanned} 页，重复 ${dupReport.offenders.length} 条` +
		(dupReport.offenders.length
			? `：${dupReport.offenders.slice(0, 6).join("、")}${dupReport.offenders.length > 6 ? ` …等 ${dupReport.offenders.length} 条` : ""}`
			: ""),
);

await browser.close();

harness.finish();
