// 主站 UI 缺陷修复实机烟测（T0 / T1 验收缝隙 A）
// 前置：pnpm exec astro build && pnpm preview --port 4322
// 运行：pnpm smoke:ui（或 UI_SMOKE_BASE_URL=http://localhost:4399 node scripts/ui-smoke.mjs）
// 约定：UI_SMOKE_BASE_URL 传的是站点根（脚本自己拼路径），与 test:fancybox 同形
// 断言一律落在真实渲染后的计算值、几何、键盘结果与可访问性属性上，不断言 CSS 源文本
import { chromium } from "playwright";
import sharp from "sharp";

const base = process.env.UI_SMOKE_BASE_URL ?? "http://localhost:4322";
// 全站显示宽度最大的文章标题（89 个半角单位），当前被单行省略裁切
const LONGEST_POST = "/posts/20260831000000/";
const WIDTHS = [1440, 1100, 860, 680, 390];

const results = [];
const check = (name, ok, detail = "") => {
	results.push({ name, ok });
	console.log(
		`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` :: ${detail}` : ""}`,
	);
};
/** 按票归属报错：全程只报一次会把票 01 的报错算到票 06 头上 */
let errorsSeen = 0;
const checkClean = (label) => {
	const fresh = errors.slice(errorsSeen);
	errorsSeen = errors.length;
	check(
		`${label}：无本地 console / page 报错`,
		fresh.length === 0,
		fresh.slice(0, 2).join(" | "),
	);
};

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

// 既有死链白名单：private:true 的文章页仍渲染分类面包屑，而 getCategoryList 走
// isPublicPost 过滤、根本不生成该分类页（票 02 的 Tab 走位查出的既存缺陷，
// 不在 T0 范围，见票册 T0 汇总）。列名而非放宽检查，是为了新出现的死链仍能报红。
const KNOWN_DEAD = ["/category/%E7%A4%BA%E4%BE%8B/"];
const isKnownDead = (url) => KNOWN_DEAD.some((p) => url.startsWith(base + p));

const browser = await chromium.launch();

// ---------------- 文章页标题：五档宽度下不再被裁切 ----------------
const ctx = await browser.newContext({
	viewport: { width: 1440, height: 900 },
});
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message.slice(0, 140)));
page.on("console", (m) => {
	if (m.type() !== "error") return;
	const url = m.location()?.url || "";
	// 外部接口（Giscus、字体 CDN）在本机网络下会 4xx / 重置，单列不计 FAIL
	if (url && !url.startsWith(base)) return;
	if (isKnownDead(url)) return;
	errors.push(`${m.text().slice(0, 90)} @ ${url.slice(base.length) || "?"}`);
});

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

await browser.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n合计 ${results.length} 项，失败 ${failed.length} 项`);
if (failed.length) failed.forEach((f) => console.log("  -", f.name));
process.exit(failed.length ? 1 : 0);
