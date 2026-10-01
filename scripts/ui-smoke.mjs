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

/** 文章正文里有裸的第三方视频 iframe（YouTube / Bilibili）。整套冒烟用 waitUntil:"load"
 *  导航，而 load 要等这些子帧 —— 它们可达与否取决于本地网络当时的状态，2026-09-30 就有
 *  两次 30s 超时把整套打断，且失败点随网络漂移，看着像新判据的锅。判据不该依赖外部
 *  视频站的可用性，所以在 context 级别掐掉这些请求：abort 后 iframe 立刻以失败收场，
 *  load 不再被挂住。只匹配外部域名，本地资源一条都不动。 */
const EXTERNAL_EMBEDS =
	/(?:youtube.com|youtu.be|player.bilibili.com|v.qq.com)/i;
const stubExternalEmbeds = (context) =>
	context.route(EXTERNAL_EMBEDS, (route) => route.abort("blockedbyclient"));

// ---------------- 文章页标题：五档宽度下不再被裁切 ----------------
const ctx = await browser.newContext({
	viewport: { width: 1440, height: 900 },
});
stubExternalEmbeds(ctx);
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
// 原判据钉的是「今天恰好有一张标题长到被裁」，那是内容属性不是规则属性：
// 2026-09-28 起首页六张卡最长 592px < 771px 容器，判据因此恒红，而 CSS 契约完好。
// 改为主动注入超长标题，验证规则本身仍然生效（溢出被裁、不换行、行高不变、省略号在位）。
const injected = await page.evaluate((sel) => {
	const el = document.querySelector(sel);
	const target = el.querySelector("a") ?? el;
	const original = target.textContent;
	const restingHeight = Math.round(el.getBoundingClientRect().height);
	target.textContent = "超长标题验证省略号是否仍然生效".repeat(12);
	const cs = getComputedStyle(el);
	const during = {
		scrollWidth: el.scrollWidth,
		clientWidth: el.clientWidth,
		height: Math.round(el.getBoundingClientRect().height),
		whiteSpace: cs.whiteSpace,
		overflow: cs.overflow,
		textOverflow: cs.textOverflow,
	};
	target.textContent = original;
	return {
		...during,
		restingHeight,
		restoredHeight: Math.round(el.getBoundingClientRect().height),
	};
}, ".post-list .post-header h2");
check(
	"列表卡标题保持单行省略：注入超长标题后被裁且行高不变（ADR-0003 故意分叉）",
	injected.scrollWidth > injected.clientWidth + 1 &&
		injected.whiteSpace === "nowrap" &&
		injected.overflow === "hidden" &&
		injected.textOverflow === "ellipsis" &&
		injected.height === injected.restingHeight &&
		injected.restoredHeight === injected.restingHeight,
	JSON.stringify(injected),
);
console.log(
	`NOTE  当前首页标题裁切数（内容相关，不作判据）: ${truncated.length}/${cards.length}`,
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
// 静止相位由状态定义，不由墙钟：动画全部跑完 且 底色回到纯黑。
// 原先是 hoverOff 之后死等 2300ms —— 插桩实测这条被拉到 2s 的过渡约 420ms 就落定，
// 2300 只是碰巧留了 300ms 余量；主线程被播放器 / Giscus / swup 挤住时就会采到中间帧。
await hoverOff();
await page.waitForFunction(
	() => {
		const el = document.querySelector(".post-context .spoiler");
		return (
			el.getAnimations().length === 0 &&
			getComputedStyle(el).backgroundColor === "rgb(0, 0, 0)"
		);
	},
	null,
	{ timeout: 8000 },
);
const captureLayer = () =>
	page.evaluate(() => {
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
			left: {
				x: pr.x,
				y: pr.y,
				w: Math.max(6, kr.x - pr.x - 2),
				h: pr.h,
			},
			right: { x: kr.x + 2, y: kr.y, w: Math.max(6, kr.w - 4), h: kr.h },
		};
	});
// 盒是视口坐标，而「量盒」与「截图」是两次异步调用：中间任何 reflow 或滚动锚定
// 都会让同一组像素落到别的 content 上。所以每次采样都重新量盒，并在截图后复核它没动。
const sameLayer = (a, b) =>
	["clip", "left", "right"].every((k) =>
		["x", "y", "w", "h"].every(
			(f) => Math.abs((a[k][f] ?? 0) - (b[k][f] ?? 0)) < 0.5,
		),
	);
const spoilerState = () =>
	page.evaluate(() => {
		const par = document.querySelector(".post-context .spoiler");
		const bg = getComputedStyle(par).backgroundColor;
		const m = bg.match(/rgba\([^()]*?,\s*([\d.]+)\)/);
		const pr = par.getBoundingClientRect();
		return {
			alpha: m ? +m[1] : 1,
			anims: par.getAnimations().length,
			fonts: document.fonts.status,
			scrollY: Math.round(scrollY),
			px: +pr.x.toFixed(1),
			py: +pr.y.toFixed(1),
			pw: +pr.width.toFixed(1),
		};
	});
let layer = await captureLayer();
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
	for (let attempt = 0; attempt < 5; attempt++) {
		layer = await captureLayer();
		const img = await page.screenshot({ clip: layer.clip });
		const after = await captureLayer();
		if (sameLayer(layer, after)) {
			const L = await meanOf(img, layer.left),
				R = await meanOf(img, layer.right);
			return {
				gap: R - L,
				L,
				R,
				state: await spoilerState(),
				stable: true,
			};
		}
	}
	layer = await captureLayer();
	const img = await page.screenshot({ clip: layer.clip });
	const L = await meanOf(img, layer.left),
		R = await meanOf(img, layer.right);
	return { gap: R - L, L, R, state: await spoilerState(), stable: false };
};
const rest = await shotGap();
await hoverOn();
// 半程：底色 alpha 第一次落到 ≤0.3 且动画仍在跑。老写法是 hoverOn 后死等 1000ms，
// 插桩实测那一刻读到的正是 α=0.18 —— 现在直接按 α 取这一相位，不再赌墙钟。
await page
	.waitForFunction(
		() => {
			const el = document.querySelector(".post-context .spoiler");
			const m = getComputedStyle(el).backgroundColor.match(
				/rgba\([^()]*?,\s*([\d.]+)\)/,
			);
			const a = m ? +m[1] : 1;
			return a <= 0.3 && el.getAnimations().length > 0;
		},
		null,
		{ timeout: 8000 },
	)
	.catch(() => {});
const mid = await shotGap();
// 「展现」必须等**整棵子树**落定，不能只等父元素：这条判据要抓的正是「子元素比父慢」，
// 用父的 getAnimations() 当就绪信号的话，慢的子元素还在过渡中就被当成「展现后」，
// 于是缺陷同时污染半程与展现两个读数、差值被抵消（M1′ 变异实测：注入 4s 的子层黑，
// 半程 -16.5 / 展现 -16.3，判据照样绿）。settleSpoiler() 只看父，故这里另用一个子树版。
const heimuRevealed = await page
	.waitForFunction(
		() =>
			document
				.querySelector(".post-context .spoiler")
				.getAnimations({ subtree: true }).length === 0,
		null,
		{ timeout: 12000 },
	)
	.then(() => true)
	.catch(() => false);
const done = await shotGap();
check(
	"两段黑幕同步褪去（无第二层叠加；像素判据）",
	Math.abs(rest.gap) <= 8 &&
		Math.abs(mid.gap) <= Math.abs(done.gap) + 5 &&
		rest.state.alpha === 1 &&
		rest.state.anims === 0 &&
		rest.stable &&
		mid.stable &&
		done.stable &&
		heimuRevealed,
	`静止差 ${rest.gap.toFixed(1)}（底色 α=${rest.state.alpha}、动画 ${rest.state.anims}、盒 ${rest.state.px}·${rest.state.py}、字体 ${rest.state.fonts}）；半程差 ${mid.gap.toFixed(1)}（α=${mid.state.alpha}）；展现后差（加粗本身占墨基线）${done.gap.toFixed(1)}；三次采样期间布局均未移动=${rest.stable && mid.stable && done.stable}；叠层缺陷修前实测半程 -34.5`,
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
stubExternalEmbeds(noJs);
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
stubExternalEmbeds(slow);
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
// 等一个元素**自己的**过渡/动画真的跑完，再取它的终态读数。三条实测约束，缺一条就假绿或挂死：
// ① 挂在 ::after / ::before 上的过渡只有 `getAnimations({subtree:true})` 看得见
//    （元素自身的 getAnimations() 只返回 color）；
// ② 插值起点可比交互动作晚约 250ms，所以「动画数组为空」单独用会把「还没开始」读成「已经结束」
//    —— 必须先逼一次样式重算把过渡创建出来；
// ③ 必须按 `effect.target === node` 过滤，否则会被子树里无关的动画（微言轮播的 li、日历列入场）
//    拖着甚至永不落定。
// 兜底 maxFrames 后放行（返回 false）：真有问题的话调用方会读到中途值而翻红，比挂住好。
// 不用 page.waitForFunction + document.querySelector(sel)：sel 里可能带 Playwright 专有的
// `:visible`（侧栏 hover 探针就是），它在页面里不是合法 CSS，会把整套直接抛死。
const waitOwnMotionDone = (locator, maxFrames = 240) =>
	locator.evaluate(async (node, max) => {
		const raf = () => new Promise((r) => requestAnimationFrame(r));
		const mine = () =>
			node
				.getAnimations({ subtree: true })
				.filter((a) => a.effect?.target === node);
		void getComputedStyle(node, "::after").transform;
		for (let i = 0; i < max; i++) {
			if (mine().length === 0) return true;
			await raf();
		}
		return false;
	}, maxFrames);

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
// 采样窗的终点由「这条过渡真的跑完」决定，而不是采满 700ms。
// 下面三个下限（帧数 >5、min ≤3.05、max ≥5.9）要求窗内同时覆盖首尾两相位，
// 用墙钟定窗的话，主线程被挤住时会把两端一起丢掉。
await waitOwnMotionDone(navLink);
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
// 月标数量取决于滚动 53 周窗口落在哪几天：跨到第 13 个日历月时就是 13 枚
// （2026-09-29 线上实测三档均为 13，外溢与裁切都是 0）。所以这里只锁「至少覆盖
// 12 个月且不多于窗口可能产生的 13 个」，真正要钉的死线是外溢与裁切。
check(
	"字号上调后周几列不外溢、月份行不被裁切（三档）",
	[cal1440, cal681, cal390].every(
		(c) =>
			c &&
			c.wdSpill <= 0 &&
			c.clipWorst <= 0.5 &&
			c.labels >= 12 &&
			c.labels <= 13,
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
	// 等「首条真的换了一条」，而不是死等 4800ms 去覆盖一个 4s 节奏。
	// 轮播是 setInterval + 0.8s 过渡，主线程被播放器 / Giscus / swup 挤住时第一次推进可以晚于
	// 4800ms —— 那时旧写法会读到没变的首条而假红。超时后照常取值，让判据红得诚实。
	await page
		.waitForFunction(
			(prev) => {
				const li = document.querySelector("#header .text li");
				return (li ? li.textContent.trim() : null) !== prev;
			},
			first,
			{ timeout: 12000 },
		)
		.catch(() => {});
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
// 原先这里睡 900ms。删掉：触发者是 `document` 级委托监听（src/utils/site-modal.ts 约 158 行），
// 站点脚本是模块脚本、在 DOMContentLoaded 之前执行完，而 `waitUntil:"load"` 必然晚于它，
// 按钮本身也是 domain/index.astro 的静态标记——点击需要的条件在 load 时已经全部成立。
const modalBox = await (async () => {
	const btn = page.locator(".meBox-Button a[data-site-modal]").first();
	if (!(await btn.count())) return null;
	await btn.click();
	await page.waitForSelector("#site-modal[open]", { timeout: 5000 });
	// 面板入场是 `scale(0.96) → scale(1)` / 220ms，而本判据量的正是盒底。
	// 中途读数只会把盒量小（更不容易溢出），属假绿方向，所以这里必须等它落定再量。
	await waitOwnMotionDone(page.locator("#site-modal .site-modal__panel"));
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
	// 等这条悬停过渡真的跑完再取 hot —— 而不是死等 320ms 去「越过 0.2s 过渡」。
	// 三条实测约束写在 waitOwnMotionDone 处（伪元素过渡、迟到的起点、必须按 target 过滤）。
	// 没有 ::after 过渡的目标（侧栏链接 / 卡标题 / 正文内联链接）首帧即空，行为与不等待一致。
	await waitOwnMotionDone(el);
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

const side = await hoverProbe("/", "#sidebar a:not(.blogtags a):visible");
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
	// 同上：等「移出之后首条真的又推进了」，而不是死等 5200ms。
	// 上面那 5200ms 是**故意**保留的墙钟——它要证明的是「整段窗内没有变化」，
	// 属否证型判据，没有布尔态能表达「一个周期已过」，缩短会把误触发放成假绿。
	await page
		.waitForFunction(
			(prev) => {
				const li = document.querySelector("#header .text li");
				return (li ? li.textContent.trim() : null) !== prev;
			},
			during,
			{ timeout: 12000 },
		)
		.catch(() => {});
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
// 这一处**不是冗余**：`data-fancybox` 是 `initFancybox()` 运行时打在 `.post-context img` 上的
// （src/utils/theme-script.ts 的 setAttribute，构建期产物里没有这个属性），
// 下面那句 querySelector 直接吃这个属性，所以必须等它出现，睡墙钟会在慢机上把
// 「入口还没标记」读成「灯箱打不开」。等真实信号，取不到时照常走 false 分支红得诚实。
await page
	.waitForSelector(".prose img[data-fancybox]", { timeout: 15000 })
	.catch(() => {});
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
// 这里原本睡 400ms 等灯箱关闭动画。删掉：下一句是整页 `goto`，页面状态全部重建，
// 关闭动画走不走完对后面的读数没有任何影响。

// Tab 首站：等的是「这条 transform 过渡真的走完」，不是墙钟。
// .skip-link 是 fixed + top:10px + translateY(-200%)、高 37px ⇒ 未展开时 top = −64，展开后 = +10。
// 上一版把死等从 200ms 加到 400ms 是症状修复：Tab 紧跟 waitUntil:"load" 按下，而这一页还挂着
// myhkw 播放器的 jQuery、Giscus 与 swup 的 loadOnIdle，:focus-visible 的第一帧可以晚于 400ms 才排上，
// 于是量到过 −39（约走到 34%）。现在逐帧等到「无动画在跑 且 top 已非负」，落不下来就带着坏读数翻红。
await page.goto(base + "/", { waitUntil: "load" });
await page.keyboard.press("Tab");
const tabFirst = await page.evaluate(async () => {
	const raf = () => new Promise((r) => requestAnimationFrame(r));
	for (let i = 0; i < 90; i++) {
		const el = document.activeElement;
		if (
			el.getAnimations().length === 0 &&
			el.getBoundingClientRect().top >= 0
		)
			break;
		await raf();
	}
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

// ---------------- 常驻：可点元素必须落在站点自有手型光标上（负扫） ----------------
// 本站只有两枚光标资源（箭头 default.cur + 手型 link.cur），单源在 global.css 的
// `--cursor-link` / `--cursor-default`。全局规则 `a, button, input[type=submit]` 只有
// (0,0,1)，任何类选择器里裸写 `cursor: pointer` 都会以 (0,1,0) 把它静默退回系统手型——
// 2026-09-30 侧栏「刷新」「换一批」等 10 处就是这么丢的，且 CSS 源文本完全看不出。
// 所以判据写成负扫而不是点名单：凡可见的可点元素，计算 cursor 必须含 /style/link.cur。
// 有意放行（它们不是「可点=手型」的对象，且是各自的语义信号）：
//   · 明月浩空播放器子树——远端组件，自带 myhkw.cn 的 link.cur，不归本站管
//   · a.copy-post-link（copy）、[aria-disabled] / .is-disabled（not-allowed）、
//     .photo/正文图（zoom-in）、输入框（text）、看板娘拖拽（move）
// /books/、/ai-news/、/pelican-bike/ 是站长点名排除的导入独立壳，不在页面集内。
const CURSOR_SELECTOR = [
	"a[href]",
	"button:not([disabled])",
	"input[type=submit]",
	"[role=button]",
	"summary",
	".post-metaa .tools li",
	".slideshow .dots span",
	".font-size-pop input[type=range]",
	".pio-show",
	".pio-action span",
].join(",");
const cursorOffenders = [];
let cursorSeen = 0;
for (const path of OUTLINE_PAGES) {
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.goto(base + path, { waitUntil: "load" });
	const got = await page.evaluate(
		({ sel }) => {
			const offenders = [];
			let seen = 0;
			for (const el of document.querySelectorAll(sel)) {
				const cs = getComputedStyle(el);
				if (cs.display === "none" || cs.visibility === "hidden")
					continue;
				if (el.closest("#myhkplayer, [id^=myhk]")) continue;
				if (el.closest(".fancybox__container")) continue;
				if (el.matches(".copy-post-link")) continue;
				if (el.getAttribute("aria-disabled") === "true") continue;
				seen++;
				if (cs.cursor.includes("/style/link.cur")) continue;
				const cls =
					typeof el.className === "string" && el.className.trim()
						? "." + el.className.trim().split(/\s+/).join(".")
						: "";
				offenders.push(
					`${el.tagName.toLowerCase()}${cls}${el.id ? "#" + el.id : ""} ⇒ ${cs.cursor}`,
				);
			}
			return {
				offenders,
				seen,
				arrow: getComputedStyle(document.body).cursor,
			};
		},
		{ sel: CURSOR_SELECTOR },
	);
	cursorSeen += got.seen;
	for (const o of got.offenders) cursorOffenders.push(`${path} → ${o}`);
	if (path === "/") {
		check(
			"页面底衬用站点自有箭头（body 计算值含 /style/default.cur）",
			got.arrow.includes("/style/default.cur"),
			`body cursor=${got.arrow}`,
		);
	}
}
check(
	"每个可见的可点元素都落在站点自有手型光标上（裸 cursor: pointer 负扫）",
	cursorOffenders.length === 0 && cursorSeen >= 40,
	`扫 ${cursorSeen} 个可点元素，越界 ${cursorOffenders.length} 个` +
		(cursorOffenders.length
			? `：${cursorOffenders.slice(0, 8).join("、")}${cursorOffenders.length > 8 ? ` …等 ${cursorOffenders.length} 个` : ""}`
			: ""),
);

// ---------------- 语录条（2026-09-30 新增元件） ----------------
// 判据全部落在计算值 / 几何 / DOM 顺序 / 文本结果上，不锁 CSS 源文本与类名字符串。
const QUOTE_DEFAULT_EN = "The purpose of computing is insight, not numbers.";
const QUOTE_MAX_HEIGHT = 160; // 桌面～平板：站长 2026-09-30 裁决（放回 Hoare/Kernighan 后实测最高 156.7px）
const QUOTE_MAX_HEIGHT_NARROW = 260; // 手机 390：实测最高 251.4px（Hoare 那条排到英文 6 行）
const QUOTE_MAX_EN_CHARS = 220; // 只挡"塞一段段落进来"；真正约束版面的是下面逐条量高度那条
const QUOTE_MAX_ZH_CHARS = 44;
// 站长指定的终端箭头几何：静息距边框 80px，hover 收到 70px（各向外漂 10px），
// 正文换行宽度由它反推，箭头与文字之间至少留 16px 空气。
const QUOTE_GUTTER = 80;
const QUOTE_GUTTER_HOVER = 70;
const QUOTE_CHEVRON_AIR = 16;
// 箭头显示的最低一档视口：981 是本站 980 断点的上邻，正文列在那里最窄（实测 761px），
// 封顶与间隙都在这一档最吃紧，必须量到（WIDTHS 里没有它）。
const QUOTE_CHEVRON_WIDTHS = [1440, 1100, 1000, 981, 980];
// 语录条专用的视口清单。共享的 WIDTHS（1440/1100/860/680/390）曾让一整段缺陷隐身：
// 换句按钮要 30px 的右上角，而限宽 720px 的正文列只有在带宽 ≥788 时才退得开 ——
// 681–788 这段没有任何一档采样落在里面，上一轮就是带着 7–12 条压字发出去的。
const QUOTE_WIDTHS = [1440, 1100, 981, 860, 821, 820, 768, 681, 680, 390];
// 站长的封顶裁决按形态分两档：桌面/平板 160，手机 260。
const quoteCap = (w) => (w < 500 ? QUOTE_MAX_HEIGHT_NARROW : QUOTE_MAX_HEIGHT);
const flat = (s) => (s ?? "").replace(/\s+/g, " ").trim();

const bandPlacement = [];
const bandStyle = [];
const bandFrame = [];
// 描边是站长点名的「与上方白卡区分」手段，读计算值而不是 CSS 源文本：
// 2px / solid / 品牌绿 rgb(0, 192, 0)，四条边都要一致。
const QUOTE_FRAME = "2px solid rgb(0, 192, 0)";
const QUOTE_RADIUS = "5px"; // 本站卡面的既定圆角值（global.css 里到处是这个字面量，无 token）
// 投影的静息态必须显式写成「全透明 + 零偏移」而不是 none，理由与 clip-path 那条一样：
// 两端同型才保证是连续插值。这条字符串同时是「阴影确实淡回去了」的判据值。
const QUOTE_SHADOW_REST = "rgba(0, 0, 0, 0) 0px 0px 0px";
let bandPages = 0;
for (const path of OUTLINE_PAGES) {
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.goto(base + path, { waitUntil: "load" });
	const got = await page.evaluate(() => {
		const bands = [...document.querySelectorAll("[data-quote-band]")];
		if (bands.length !== 1) return { count: bands.length };
		const band = bands[0];
		const wrapper = document.getElementById("wrapper");
		const footer = document.getElementById("footer");
		const en = band.querySelector("[data-quote-en]");
		const btn = band.querySelector("[data-quote-reroll]");
		const cs = getComputedStyle(band);
		return {
			count: 1,
			// 四条边必须算成同一个值（谁只改一条边就该被看见）
			border: (() => {
				const sides = new Set(
					["Top", "Right", "Bottom", "Left"].map(
						(s) =>
							`${cs["border" + s + "Width"]} ${cs["border" + s + "Style"]} ${cs["border" + s + "Color"]}`,
					),
				);
				return sides.size === 1
					? [...sides][0]
					: `四边不一致 ${[...sides].join(" / ")}`;
			})(),
			radius: cs.borderTopLeftRadius,
			afterWrapper: !!(
				wrapper &&
				wrapper.compareDocumentPosition(band) &
					Node.DOCUMENT_POSITION_FOLLOWING
			),
			beforeFooter: !!(
				footer &&
				band.compareDocumentPosition(footer) &
					Node.DOCUMENT_POSITION_FOLLOWING
			),
			insideMain: !!band.closest("main"),
			insideContent: !!band.closest("#content"),
			enFont: en ? getComputedStyle(en).fontFamily : "(缺)",
			cursor: btn ? getComputedStyle(btn).cursor : "(缺)",
		};
	});
	bandPages++;
	if (got.count !== 1) {
		bandPlacement.push(`${path} ⇒ 语录条 ${got.count} 个`);
		continue;
	}
	if (!got.afterWrapper || !got.beforeFooter)
		bandPlacement.push(`${path} ⇒ 不在 #wrapper 与 #footer 之间`);
	if (got.insideMain || got.insideContent)
		bandPlacement.push(`${path} ⇒ 落在 swup 容器内，切页会重建`);
	if (!got.enFont.includes("Libre Baskerville"))
		bandStyle.push(`${path} ⇒ font-family=${got.enFont}`);
	if (!got.cursor.includes("/style/link.cur"))
		bandStyle.push(`${path} ⇒ cursor=${got.cursor}`);
	if (got.border !== QUOTE_FRAME || got.radius !== QUOTE_RADIUS)
		bandFrame.push(`${path} ⇒ ${got.border} 圆角 ${got.radius}`);
}
const bandList = (items) =>
	items.length
		? `：${items.slice(0, 6).join("、")}${items.length > 6 ? ` …等 ${items.length} 处` : ""}`
		: "";
check(
	"语录条：每个主站页恰好一个，挂在 #wrapper 与 #footer 之间且在 swup 容器之外",
	bandPages === OUTLINE_PAGES.length && bandPlacement.length === 0,
	`查 ${bandPages}/${OUTLINE_PAGES.length} 页，越界 ${bandPlacement.length} 处${bandList(bandPlacement)}`,
);
check(
	"语录条：英文行落在 Libre Baskerville 上，「换一句」按钮落在站点自有手型上（读计算值）",
	bandStyle.length === 0,
	`越界 ${bandStyle.length} 处${bandList(bandStyle)}`,
);
check(
	"语录条：四边都是 2px 品牌绿实描边、圆角 5px（描边是站长点名的「与白卡区分」手段）",
	bandFrame.length === 0,
	`查 ${bandPages}/${OUTLINE_PAGES.length} 页，越界 ${bandFrame.length} 处${bandList(bandFrame)}`,
);

// 揭示后的稳态：等状态类被摘掉，而不是等固定毫秒（waitForTimeout 会在慢机上假红）
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(base + "/", { waitUntil: "load" });
await page.evaluate(() =>
	document
		.querySelector("[data-quote-band]")
		.scrollIntoView({ block: "center" }),
);
await page.waitForFunction(
	() => {
		const flat = (s) => (s ?? "").replace(/\s+/g, " ").trim();
		const band = document.querySelector("[data-quote-band]");
		if (!band) return false;
		if (
			band.classList.contains("is-armed") ||
			band.classList.contains("is-revealed")
		)
			return false;
		return (
			flat(document.querySelector("[data-quote-en]").textContent).length >
			0
		);
	},
	null,
	{ timeout: 10000 },
);
const revealed = await page.evaluate((defaultEn) => {
	const flat = (s) => (s ?? "").replace(/\s+/g, " ").trim();
	const band = document.querySelector("[data-quote-band]");
	const en = flat(band.querySelector("[data-quote-en]").textContent);
	const pool = Array.isArray(window.__quoteCorpus)
		? window.__quoteCorpus
		: [];
	const known = new Set([defaultEn, ...pool.map((row) => row[0])]);
	return {
		en,
		inCorpus: known.has(en.replace(/["“”]/g, "")),
		corpusSize: pool.length,
		opacity: getComputedStyle(band).opacity,
	};
}, QUOTE_DEFAULT_EN);
check(
	"语录条：滚动到它之后完成揭示，句子出自语料且已回到可见稳态",
	revealed.opacity === "1" &&
		revealed.en.length > 0 &&
		revealed.inCorpus &&
		revealed.corpusSize >= 40,
	`corpus=${revealed.corpusSize} 出自语料=${revealed.inCorpus} 句面=${revealed.en.slice(0, 46)}… opacity=${revealed.opacity}`,
);

// 整带高度不再在这里量单句：随机到哪句就量哪句会飘，改由下面 bandGeom 那一趟
// 把全语料逐条灌进去取最高值。

// 最坏情况不是"某张背景图最暗的那一格"，而是"背后是纯黑像素"——这个下界与图无关，
// 所以直接按它算，比抽样更硬：白纱 alpha 一旦被人调小，这条就会红。
const bandContrast = await page.evaluate(() => {
	const parse = (s) => {
		const m = s.match(/rgba?\(([^)]+)\)/);
		if (!m) return null;
		const p = m[1].split(",").map((x) => parseFloat(x));
		return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
	};
	const lum = (c) => {
		const s = c / 255;
		return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
	};
	const ratio = (fg, bg) => {
		const l1 = 0.2126 * lum(bg.r) + 0.7152 * lum(bg.g) + 0.0722 * lum(bg.b);
		const l2 = 0.2126 * lum(fg.r) + 0.7152 * lum(fg.g) + 0.0722 * lum(fg.b);
		const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
		return (hi + 0.05) / (lo + 0.05);
	};
	const band = document.querySelector("[data-quote-band]");
	const veil = parse(getComputedStyle(band).backgroundColor);
	// 背后取纯黑：veil.a 的白叠在黑上，得到的就是能守住的下界灰
	const behind = { r: 0, g: 0, b: 0 };
	const over = {
		r: veil.a * veil.r + (1 - veil.a) * behind.r,
		g: veil.a * veil.g + (1 - veil.a) * behind.g,
		b: veil.a * veil.b + (1 - veil.a) * behind.b,
	};
	const small = parse(
		getComputedStyle(band.querySelector("[data-quote-zh]")).color,
	);
	const large = parse(
		getComputedStyle(band.querySelector("[data-quote-en]")).color,
	);
	return {
		veilAlpha: veil.a,
		smallRatio: ratio(small, over),
		largeRatio: ratio(large, over),
	};
});
check(
	"语录条：白纱在「背后纯黑」的最坏情况下仍守住小字 AA 4.5:1（大字 3.0:1）",
	bandContrast.smallRatio >= 4.5 && bandContrast.largeRatio >= 3,
	`veil α=${bandContrast.veilAlpha}，小字 ${bandContrast.smallRatio.toFixed(2)}:1，大字 ${bandContrast.largeRatio.toFixed(2)}:1`,
);

const quoteFontLink = await page.evaluate(() => {
	const link = document.head.querySelector("link[data-quote-font]");
	return {
		href: link?.href ?? "(未注入)",
		zhFamily: getComputedStyle(document.querySelector("[data-quote-zh]"))
			.fontFamily,
	};
});
check(
	"语录条：滚到附近才注入中文行的 CDN 样式表（不在 head 里预挂），且中文行声明了该字族",
	quoteFontLink.href ===
		"https://fontsapi.zeoseven.com/2401/main/result.css" &&
		quoteFontLink.zhFamily.includes("TangXianBinSong"),
	`link=${quoteFontLink.href}  zh font-family=${quoteFontLink.zhFamily}`,
);

const bandGeom = [];
for (const width of QUOTE_WIDTHS) {
	await page.setViewportSize({ width, height: 900 });
	await page.goto(base + "/", { waitUntil: "load" });
	await page.evaluate(() =>
		document
			.querySelector("[data-quote-band]")
			.scrollIntoView({ block: "center" }),
	);
	await page.waitForFunction(
		() => {
			const band = document.querySelector("[data-quote-band]");
			return band && !band.classList.contains("is-armed");
		},
		null,
		{ timeout: 10000 },
	);
	const geom = await page.evaluate(() => {
		const flat = (s) => (s ?? "").replace(/\s+/g, " ").trim();
		const band = document.querySelector("[data-quote-band]");
		const rect = band.getBoundingClientRect();
		const out = {
			overflow: Math.max(
				0,
				rect.right - document.documentElement.clientWidth,
			),
			height: rect.height,
			wraps: band.querySelectorAll(".quote-band__word").length,
		};
		// 逐条把语料灌进去，量「英文首行会不会伸到换句按钮底下」。
		// 必须先记完上面的高度再改 DOM，最后原样还原，否则这条扫描会污染其它读数。
		const en = band.querySelector("[data-quote-en]");
		const zh = band.querySelector("[data-quote-zh]");
		const by = band.querySelector("[data-quote-author]");
		const keep = [en.textContent, zh.textContent, by.textContent];
		const btnEl = band.querySelector("[data-quote-reroll]");
		let collide = 0;
		let sample = "";
		let maxH = 0;
		let tallest = "";
		for (const [e, z, a] of window.__quoteCorpus || []) {
			en.textContent = `“${e}”`;
			zh.textContent = z;
			by.textContent = a;
			// 同一趟扫描顺手量全语料的最高带子：只量"当前随机到的那一句"会随抽样飘，
			// 判据要确定就得把每一条都灌一遍。
			const hh = band.getBoundingClientRect().height;
			if (hh > maxH) {
				maxH = hh;
				tallest = `${flat(e).slice(0, 26)}…（${[...e].length} 字）`;
			}
			const node = en.firstChild;
			if (!node) continue;
			const range = document.createRange();
			range.selectNodeContents(node);
			const first = [...range.getClientRects()].filter(
				(x) => x.width > 0,
			)[0];
			if (!first) continue;
			// 按钮矩形必须每轮重读：换句子会改带子高度，滚动锚定随之把整块挪位，
			// 循环前抓一次会量出假重叠（首轮就这样误报了 17 条）。
			const btn = btnEl.getBoundingClientRect();
			if (
				first.right > btn.left - 2 &&
				first.bottom > btn.top + 1 &&
				first.top < btn.bottom - 1
			) {
				collide++;
				if (!sample)
					sample = `${flat(e).slice(0, 26)}… 行尾 ${Math.round(first.right)} / 行顶 ${Math.round(first.top)} vs 按钮 ${Math.round(btn.left)}·${Math.round(btn.bottom)}`;
			}
		}
		en.textContent = keep[0];
		zh.textContent = keep[1];
		by.textContent = keep[2];
		out.collide = collide;
		out.sample = sample;
		out.maxH = maxH;
		out.tallest = tallest;
		return out;
	});
	bandGeom.push({ width, ...geom });
}
check(
	"语录条：各档视口零横向溢出（词包字双层不许把句子撑出卡片）",
	bandGeom.every((g) => g.overflow <= 1),
	bandGeom.map((g) => `${g.width}→溢出${g.overflow.toFixed(1)}`).join("，"),
);
check(
	"语录条：英文首行绝不伸到「换一句」按钮底下（全语料 × 各档视口逐条量）",
	bandGeom.every((g) => g.collide === 0),
	bandGeom
		.map(
			(g) =>
				`${g.width}→${g.collide} 条${g.collide ? `（${g.sample}）` : ""}`,
		)
		.join("，"),
);
check(
	"语录条：全语料逐条量的整带高度不超封顶（桌面 160 / 手机 260，站长 2026-09-30 裁决）",
	bandGeom.every((g) => g.maxH <= quoteCap(g.width)),
	bandGeom
		.map(
			(g) =>
				`${g.width}→最高 ${g.maxH.toFixed(1)}/${quoteCap(g.width)}px（${g.tallest}）`,
		)
		.join("，"),
);
// 长度闸门只挡"塞一段段落进来"；真正约束版面的是上面那条逐条量高度的判据。
// 擦走是按**盒子**切的，所以盒子必须贴住墨迹：盒宽比墨迹宽出太多，
// 动画行程就全花在切空白上，文字看着是突然出现、突然消失（站长实眼抓到的缺陷）。
// 这条判据要在**桌面视口**量：上一段循环把视口留在了 390px，那里 42 条中有 7 条会换行，
// 而换行时 fit-content 的盒子被可用宽度夹住、本就不贴墨迹（实测 390 下最大差 29.8px，
// 1440 下 0 条换行、42 条差值全部恰好 0.0）。把换行的几何当成缺陷去断言会既吵又假。
await page.setViewportSize({ width: 1440, height: 900 });
// 也要等中文行字体就位：swap 前后同一行的度量不同。CDN 不可达时按回落字体量，不跳过。
await page
	.waitForFunction(
		() => document.fonts.check("13px 'TangXianBinSong'"),
		null,
		{ timeout: 15000 },
	)
	.catch(() => {});
const zhHug = await page.evaluate(() => {
	const z = document.querySelector("[data-quote-zh]");
	const keep = z.textContent;
	let worst = { gap: -1, boxW: 0, tail: "" };
	let measured = 0;
	let wrapped = 0;
	for (const row of window.__quoteCorpus || []) {
		z.textContent = row[1];
		const range = document.createRange();
		range.selectNodeContents(z);
		const rects = [...range.getClientRects()].filter((x) => x.width > 0.5);
		if (!rects.length) continue;
		if (rects.length > 1) {
			wrapped++;
			continue; // 换行的行由上一条注释里的理由排除
		}
		measured++;
		const box = z.getBoundingClientRect();
		const gap = +(
			box.width -
			(Math.max(...rects.map((x) => x.right)) -
				Math.min(...rects.map((x) => x.left)))
		).toFixed(1);
		if (gap > worst.gap)
			worst = {
				gap,
				boxW: +box.width.toFixed(1),
				tail: row[1].slice(-2),
			};
	}
	z.textContent = keep;
	return { ...worst, measured, wrapped };
});
check(
	"语录条：桌面视口下中文行的盒子贴住墨迹（全语料未换行的那些，取最大差）",
	zhHug.measured > 0 && zhHug.gap >= 0 && zhHug.gap <= 4,
	`${zhHug.measured} 条单行里最大差 ${zhHug.gap}px（尾字「${zhHug.tail}」，盒宽 ${zhHug.boxW}，容差 4px）；桌面换行 ${zhHug.wrapped} 条`,
);

// —— 终端箭头（> / <）：静息距边框 80px、正文换行跟着它反推、≤980 收起 ——
// 距离从描边的**内侧**量起（也就是 padding box 的边），这是「距离边框 80px」的读法；
// 从外缘量会多算那 2px 描边（实测 82/62）。箭头与正文列之间的空气是算出来的常数 16px，
// 所以下面同时量「盒子间隙」和「全语料逐条的墨迹间隙」——前者证明换行跟着箭头走，后者证明没人蹭到字。
const chevRows = [];
for (const width of QUOTE_CHEVRON_WIDTHS) {
	await page.setViewportSize({ width, height: 900 });
	await page.goto(base + "/", { waitUntil: "load" });
	await page.evaluate(() =>
		document
			.querySelector("[data-quote-band]")
			.scrollIntoView({ block: "center" }),
	);
	await page.waitForFunction(
		() => {
			const band = document.querySelector("[data-quote-band]");
			return band && !band.classList.contains("is-armed");
		},
		null,
		{ timeout: 10000 },
	);
	const row = await page.evaluate(
		({ gutter, air }) => {
			const band = document.querySelector("[data-quote-band]");
			const L = band.querySelector(".quote-band__chevron--left");
			const R = band.querySelector(".quote-band__chevron--right");
			const quote = band.querySelector(".quote-band__quote");
			const en = band.querySelector("[data-quote-en]");
			const zh = band.querySelector("[data-quote-zh]");
			const by = band.querySelector("[data-quote-by]");
			const br = band.getBoundingClientRect();
			const bw = parseFloat(getComputedStyle(band).borderTopWidth);
			const out = {
				n: (L ? 1 : 0) + (R ? 1 : 0),
				hidden: !L || getComputedStyle(L).display === "none",
				colW: +quote.getBoundingClientRect().width.toFixed(1),
				bandInnerW: +(br.width - 2 * bw).toFixed(1),
			};
			if (out.hidden) return out;
			const lr = L.getBoundingClientRect();
			const rr = R.getBoundingClientRect();
			out.ariaHidden =
				L.getAttribute("aria-hidden") === "true" &&
				R.getAttribute("aria-hidden") === "true";
			out.glyphs = L.textContent.trim() + R.textContent.trim();
			out.distL = +(lr.left - br.left - bw).toFixed(1);
			out.distR = +(br.right - bw - rr.right).toFixed(1);
			// 垂直居中：箭头的中心对带子内缘的中心
			out.centerOff = +(
				(lr.top + lr.bottom) / 2 -
				(br.top + br.bottom) / 2
			).toFixed(1);
			out.boxGap = +(
				quote.getBoundingClientRect().left - lr.right
			).toFixed(1);
			// 逐条灌全语料：随机到哪一句就量哪一句会飘，判据要确定就得每条都过一遍
			const keep = [en.textContent, zh.textContent, by.textContent];
			const inkOf = (el) => {
				const range = document.createRange();
				range.selectNodeContents(el);
				const rects = [...range.getClientRects()].filter(
					(x) => x.width > 0.5 && x.height > 0.5,
				);
				if (!rects.length) return null;
				return {
					left: Math.min(...rects.map((x) => x.left)),
					right: Math.max(...rects.map((x) => x.right)),
					top: Math.min(...rects.map((x) => x.top)),
					bottom: Math.max(...rects.map((x) => x.bottom)),
				};
			};
			const hit = (a, b) =>
				a.left < b.right &&
				b.left < a.right &&
				a.top < b.bottom &&
				b.top < a.bottom;
			let minGap = Infinity;
			let overlaps = 0;
			let maxH = 0;
			let tallest = "";
			for (const [e, z, a] of window.__quoteCorpus || []) {
				en.textContent = `“${e}”`;
				zh.textContent = z;
				by.textContent = `— ${a}`;
				const h = band.getBoundingClientRect().height;
				if (h > maxH) {
					maxH = h;
					tallest = `${(e || "").slice(0, 24)}…（${[...e].length} 字）`;
				}
				// 箭头与按钮的矩形必须每轮重读：换句会改带子高度，滚动锚定随之挪位
				const l2 = L.getBoundingClientRect();
				const r2 = R.getBoundingClientRect();
				for (const line of [inkOf(en), inkOf(zh), inkOf(by)].filter(
					Boolean,
				)) {
					minGap = Math.min(
						minGap,
						line.left - l2.right,
						r2.left - line.right,
					);
					if (hit(line, l2) || hit(line, r2)) overlaps++;
				}
			}
			[en, zh, by].forEach((el, i) => (el.textContent = keep[i]));
			out.minGap = +minGap.toFixed(1);
			out.overlaps = overlaps;
			out.maxH = +maxH.toFixed(1);
			out.tallest = tallest;
			return out;
		},
		{ gutter: QUOTE_GUTTER, air: QUOTE_CHEVRON_AIR },
	);
	chevRows.push({ width, ...row });
}
const chevShown = chevRows.filter((r) => !r.hidden);
check(
	"语录条：左右各一枚 aria-hidden 的 > / <，距边框 80px、垂直居中，正文列跟着退到箭头内侧留 16px",
	chevShown.length === QUOTE_CHEVRON_WIDTHS.length - 1 &&
		chevShown.every(
			(r) =>
				r.n === 2 &&
				r.ariaHidden &&
				r.glyphs === "><" &&
				Math.abs(r.distL - QUOTE_GUTTER) <= 1 &&
				Math.abs(r.distR - QUOTE_GUTTER) <= 1 &&
				Math.abs(r.centerOff) <= 1 &&
				Math.abs(r.boxGap - QUOTE_CHEVRON_AIR) <= 1.5,
		),
	chevRows
		.map(
			(r) =>
				`${r.width}→${r.hidden ? "隐藏" : `左 ${r.distL} 右 ${r.distR} 居中差 ${r.centerOff} 盒隙 ${r.boxGap}`}`,
		)
		.join("，"),
);
check(
	"语录条：全语料逐条量的箭头与三行墨迹零重叠、最坏间隙 ≥15px，且整带高度仍在封顶内",
	chevShown.every(
		(r) =>
			r.overlaps === 0 &&
			r.minGap >= QUOTE_CHEVRON_AIR - 1 &&
			r.maxH <= QUOTE_MAX_HEIGHT,
	),
	chevShown
		.map(
			(r) =>
				`${r.width}→重叠${r.overlaps} 最坏间隙${r.minGap} 最高${r.maxH}（${r.tallest}）`,
		)
		.join("，"),
);
const chevHidden = chevRows.find((r) => r.hidden);
check(
	"语录条：≤980px 收起箭头，正文限宽同时退回 720px（箭头不在位时不该白吃 176px）",
	!!chevHidden &&
		chevHidden.n === 2 &&
		Math.abs(chevHidden.colW - Math.min(720, chevHidden.bandInnerW - 40)) <=
			1,
	chevHidden
		? `${chevHidden.width}→隐藏，正文列 ${chevHidden.colW}px（带内宽 ${chevHidden.bandInnerW}px）`
		: "没有任何一档把箭头收起来",
);

// 悬停：两枚箭头向外漂（现值 80 → 70，即 10px）。等的是 transform 真的到位，不是固定毫秒。
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(base + "/", { waitUntil: "load" });
await page.evaluate(() =>
	document
		.querySelector("[data-quote-band]")
		.scrollIntoView({ block: "center" }),
);
await page.waitForFunction(
	() => {
		const band = document.querySelector("[data-quote-band]");
		return band && !band.classList.contains("is-armed");
	},
	null,
	{ timeout: 10000 },
);
await page.hover("[data-quote-band]");
const chevHover = await page.evaluate(async () => {
	const band = document.querySelector("[data-quote-band]");
	const L = band.querySelector(".quote-band__chevron--left");
	const R = band.querySelector(".quote-band__chevron--right");
	// 等的是「过渡真的结束」而不是某个中间阈值：按 −19.5 放行会读到 −19.6，
	// 把一条本来正确的 20px 漂移判成红（本轮实测踩过）。机器快时 :hover 的过渡
	// 可能已经跑完，所以「有动画在跑」与「已经到位」两种就绪状态都认。
	const raf = () => new Promise((res) => requestAnimationFrame(res));
	for (let i = 0; i < 60; i++) {
		if (
			L.getAnimations().length > 0 ||
			new DOMMatrix(getComputedStyle(L).transform).e <= -19.9
		)
			break;
		await raf();
	}
	for (const a of [...L.getAnimations(), ...R.getAnimations()]) {
		try {
			await a.finished;
		} catch {
			/* canceled */
		}
	}
	const br = band.getBoundingClientRect();
	const bw = parseFloat(getComputedStyle(band).borderTopWidth);
	const dx = (el) =>
		+new DOMMatrix(getComputedStyle(el).transform).e.toFixed(1);
	return {
		hovering: band.matches(":hover"),
		driftL: dx(L),
		driftR: dx(R),
		distL: +(L.getBoundingClientRect().left - br.left - bw).toFixed(1),
		distR: +(br.right - bw - R.getBoundingClientRect().right).toFixed(1),
		// 垂直居中必须在漂移后仍然成立（transform 是单个属性，漏写 -50% 就会跳到顶边）
		centerOff: +(
			(L.getBoundingClientRect().top + L.getBoundingClientRect().bottom) /
				2 -
			(br.top + br.bottom) / 2
		).toFixed(1),
	};
});
check(
	`语录条：悬停时 > 向左、< 向右各漂 ${QUOTE_GUTTER - QUOTE_GUTTER_HOVER}px（${QUOTE_GUTTER} → ${QUOTE_GUTTER_HOVER}），且不丢掉垂直居中`,
	chevHover.hovering &&
		chevHover.driftL === -(QUOTE_GUTTER - QUOTE_GUTTER_HOVER) &&
		chevHover.driftR === QUOTE_GUTTER - QUOTE_GUTTER_HOVER &&
		Math.abs(chevHover.distL - QUOTE_GUTTER_HOVER) <= 1 &&
		Math.abs(chevHover.distR - QUOTE_GUTTER_HOVER) <= 1 &&
		Math.abs(chevHover.centerOff) <= 1,
	`漂移 ${chevHover.driftL}/${chevHover.driftR}px ⇒ 距边 ${chevHover.distL}/${chevHover.distR}px 居中差 ${chevHover.centerOff}（hover 命中=${chevHover.hovering}）`,
);

// 悬停投影：三行文字浮起一层轻阴影、指针离开淡回静息。
// 判据按**结构**读而不是抄字符串：alpha > 0、纵向偏移 1–2px、模糊 ≤2px（12–13px 的小字
// 经不起更大半径）。这样站长以后调浓淡不用改测试，而谁把这条规则删掉会当场翻红。
// 这里同时守一件更容易出事的东西 —— .quote-band__by 的 transition 列表。
// transition 是整体覆盖而不是追加：谁再给 __by 单写一条 transition，换句时的 opacity 淡出
// 会静默变成瞬变，而那条退场判据只看 is-leaving 类与高度，看不见淡出没了。
const shadowOn = await page.evaluate(() => {
	const parse = (s) => {
		const m = s.match(
			/rgba?\(([^)]+)\)\s+(-?[\d.]+)px\s+(-?[\d.]+)px(?:\s+([\d.]+)px)?/,
		);
		if (!m) return { raw: s, alpha: -1, y: -99, blur: 99 };
		const c = m[1].split(",").map((x) => parseFloat(x));
		return {
			alpha: c.length > 3 ? c[3] : 1,
			y: +m[3],
			blur: +(m[4] || 0),
		};
	};
	const get = (s) => {
		const cs = getComputedStyle(document.querySelector(s));
		return { sh: parse(cs.textShadow), props: cs.transitionProperty };
	};
	return {
		en: get(".quote-band__en"),
		zh: get(".quote-band__zh"),
		by: get(".quote-band__by"),
		L: get(".quote-band__chevron--left"),
		R: get(".quote-band__chevron--right"),
	};
});
await page.mouse.move(5, 5);
await page.waitForFunction(
	() =>
		[
			".quote-band__en",
			".quote-band__zh",
			".quote-band__by",
			".quote-band__chevron--left",
			".quote-band__chevron--right",
		].every(
			(sel) =>
				getComputedStyle(document.querySelector(sel)).textShadow ===
				"rgba(0, 0, 0, 0) 0px 0px 0px",
		),
	null,
	{ timeout: 3000 },
);
const shadowOff = await page.evaluate(() => {
	const g = (s) => getComputedStyle(document.querySelector(s)).textShadow;
	return {
		en: g(".quote-band__en"),
		zh: g(".quote-band__zh"),
		by: g(".quote-band__by"),
		L: g(".quote-band__chevron--left"),
		R: g(".quote-band__chevron--right"),
	};
});
const lifted = (x) =>
	x.sh.alpha > 0 && x.sh.y >= 1 && x.sh.y <= 2 && x.sh.blur <= 2;
// 箭头用更远的一档（20px 亮绿单字吃得住），但同样必须是真的有阴影
const liftedGlyph = (x) =>
	x.sh.alpha > 0 && x.sh.y >= 2 && x.sh.y <= 4 && x.sh.blur <= 5;
check(
	"语录条：悬停时三行文字与两枚箭头都浮起投影、离开淡回静息（且 __by / 箭头的既有过渡没被覆盖掉）",
	lifted(shadowOn.en) &&
		lifted(shadowOn.zh) &&
		lifted(shadowOn.by) &&
		liftedGlyph(shadowOn.L) &&
		liftedGlyph(shadowOn.R) &&
		shadowOn.by.props.includes("opacity") &&
		shadowOn.by.props.includes("text-shadow") &&
		shadowOn.L.props.includes("transform") &&
		shadowOn.L.props.includes("text-shadow") &&
		shadowOff.en === QUOTE_SHADOW_REST &&
		shadowOff.zh === QUOTE_SHADOW_REST &&
		shadowOff.by === QUOTE_SHADOW_REST &&
		shadowOff.L === QUOTE_SHADOW_REST &&
		shadowOff.R === QUOTE_SHADOW_REST,
	`悬停 英 α=${shadowOn.en.sh.alpha}/y${shadowOn.en.sh.y}/b${shadowOn.en.sh.blur} 中 α=${shadowOn.zh.sh.alpha} 署名 α=${shadowOn.by.sh.alpha} 箭头 α=${shadowOn.L.sh.alpha}/y${shadowOn.L.sh.y}/b${shadowOn.L.sh.blur}；离开后 箭头=${shadowOff.L}；__by 过渡=${shadowOn.by.props} / 箭头过渡=${shadowOn.L.props}`,
);

const corpusShape = await page.evaluate(
	({ maxEn, maxZh }) => {
		const pool = Array.isArray(window.__quoteCorpus)
			? window.__quoteCorpus
			: [];
		const tooLong = pool.filter(
			(r) => [...r[0]].length > maxEn || [...r[1]].length > maxZh,
		);
		return {
			size: pool.length,
			tooLong: tooLong.map(
				(r) =>
					`${r[2]}（英 ${[...r[0]].length} / 中 ${[...r[1]].length}）`,
			),
		};
	},
	{ maxEn: QUOTE_MAX_EN_CHARS, maxZh: QUOTE_MAX_ZH_CHARS },
);
check(
	"语录条：语料每条都在长度闸门内（英文 ≤220 字符、中文 ≤44 字符），且池子不小于 42 条",
	corpusShape.size >= 42 && corpusShape.tooLong.length === 0,
	`池 ${corpusShape.size} 条，越界 ${corpusShape.tooLong.length} 条${corpusShape.tooLong.length ? `：${corpusShape.tooLong.slice(0, 4).join("、")}` : ""}`,
);

const quoteIdle = () =>
	page.waitForFunction(
		() => {
			const band = document.querySelector("[data-quote-band]");
			return (
				!!band &&
				!band.dataset.quoteBusy &&
				!band.classList.contains("is-leaving") &&
				!band.classList.contains("is-armed")
			);
		},
		null,
		{ timeout: 12000 },
	);

/** 换一句并等它彻底空闲。必须等 quoteBusy 这个真实信号再点下一次：
 *  换句期间按钮是被锁住的（连点不该叠两套动画），
 *  靠固定毫秒去猜动画长度会在慢机上把第二次点击丢进锁里、变成假失败。 */
const quoteReroll = async () => {
	await quoteIdle();
	const before = flat(await page.textContent("[data-quote-en]"));
	await page.evaluate(() =>
		document.querySelector("[data-quote-reroll]").click(),
	);
	await quoteIdle();
	return { before, after: flat(await page.textContent("[data-quote-en]")) };
};

// 退场必须是**可观察到的**一段：点下去之后先进入 is-leaving、文本仍是旧句，
// 文本只在退场跑完后才换 —— 少了这条，把退场删掉或改成瞬间换字都能骗过"换句有效"。
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(base + "/", { waitUntil: "load" });
await page.evaluate(() =>
	document
		.querySelector("[data-quote-band]")
		.scrollIntoView({ block: "center" }),
);
await quoteIdle();
const oldText = flat(await page.textContent("[data-quote-en]"));
const leaveProbe = await page.evaluate((prev) => {
	const flat = (s) => (s ?? "").replace(/\s+/g, " ").trim();
	const band = document.querySelector("[data-quote-band]");
	band.querySelector("[data-quote-reroll]").click();
	return new Promise((resolve) => {
		requestAnimationFrame(() => {
			resolve({
				leaving: band.classList.contains("is-leaving"),
				chars: band.querySelectorAll(".quote-band__char").length,
				stillOld:
					flat(
						document.querySelector("[data-quote-en]").textContent,
					) === prev,
				pinned: /^\d+(\.\d+)?px$/.test(band.style.height),
				busy: band.dataset.quoteBusy === "1",
			});
		});
	});
}, oldText);
await quoteIdle();
const newText = flat(await page.textContent("[data-quote-en]"));
check(
	"语录条：点「换一句」先走退场（is-leaving + 逐字节点 + 钉住旧高、文本未换），退场跑完才换句并回到空闲",
	leaveProbe.leaving &&
		leaveProbe.busy &&
		leaveProbe.chars > 0 &&
		leaveProbe.stillOld &&
		leaveProbe.pinned &&
		newText !== oldText,
	`leaving=${leaveProbe.leaving} busy=${leaveProbe.busy} 退场逐字数=${leaveProbe.chars} 换句前文本未变=${leaveProbe.stillOld} 高度已钉=${leaveProbe.pinned}`,
);

const swap1 = await quoteReroll();
const swap2 = await quoteReroll();
check(
	"语录条：连续换两句都真的换掉（不得连抽同一句）",
	swap1.after !== swap1.before && swap2.after !== swap2.before,
	`两次前后是否互异：${swap1.after !== swap1.before}/${swap2.after !== swap2.before}`,
);

// 隐藏初态只在 .is-armed 之后生效 —— 反过来写，关 JS 的访客就是一条空白带子
const noJsBand = await browser.newContext({
	javaScriptEnabled: false,
	viewport: { width: 1280, height: 900 },
});
stubExternalEmbeds(noJsBand);
const bandNoJs = await noJsBand.newPage();
await bandNoJs.goto(base + "/", { waitUntil: "load" });
const floor = await bandNoJs.evaluate(() => {
	const flat = (s) => (s ?? "").replace(/\s+/g, " ").trim();
	const band = document.querySelector("[data-quote-band]");
	return {
		en: flat(band.querySelector("[data-quote-en]").textContent),
		zh: flat(band.querySelector("[data-quote-zh]").textContent),
		by: flat(band.querySelector("[data-quote-by]").textContent),
		opacity: getComputedStyle(band).opacity,
		armed: band.classList.contains("is-armed"),
	};
});
await noJsBand.close();
check(
	"语录条：关掉 JS 时服务端默认句完整可见，且不处于隐藏初态",
	floor.en === `“${QUOTE_DEFAULT_EN}”` &&
		floor.zh.length > 0 &&
		floor.by.includes("Hamming") &&
		floor.opacity === "1" &&
		!floor.armed,
	`en=${floor.en} zh=${floor.zh} by=${floor.by} opacity=${floor.opacity} armed=${floor.armed}`,
);

// reduced-motion 的裁决是「撤位移、保级联」：在 armed 稳态上量，避开动画进行中的抖动
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(base + "/", { waitUntil: "load" });
const armedNormal = await page.evaluate(() => {
	const band = document.querySelector("[data-quote-band]");
	return {
		transform: getComputedStyle(band).transform,
		armed: band.classList.contains("is-armed"),
	};
});
await page.emulateMedia({ reducedMotion: "reduce" });
await page.goto(base + "/", { waitUntil: "load" });
const armedReduce = await page.evaluate(() => {
	const band = document.querySelector("[data-quote-band]");
	return {
		transform: getComputedStyle(band).transform,
		opacity: getComputedStyle(band).opacity,
		charTransform: band.querySelector(".quote-band__char")
			? getComputedStyle(band.querySelector(".quote-band__char"))
					.transform
			: "(未切分)",
	};
});
await page.emulateMedia({ reducedMotion: "no-preference" });
check(
	"语录条：reduced-motion 下撤位移、保级联（armed 态 transform 归 none，淡入仍在）",
	armedNormal.armed &&
		armedNormal.transform !== "none" &&
		armedReduce.transform === "none" &&
		armedReduce.opacity === "0",
	`常规 ${armedNormal.transform} ⇒ reduced ${armedReduce.transform}（opacity=${armedReduce.opacity}，char=${armedReduce.charTransform}）`,
);

// 同一段 reduced-motion 仿真下再量箭头的 hover：撤位移意味着「悬停后 transform 的 x 分量仍为 0」。
// 不能 hover 完立刻读 —— 覆盖漏掉时过渡刚从 0 起步，读到 0 是假绿。等 getAnimations() 跑完再读。
await page.emulateMedia({ reducedMotion: "reduce" });
await page.evaluate(() =>
	document
		.querySelector("[data-quote-band]")
		.scrollIntoView({ block: "center" }),
);
await page.hover("[data-quote-band]");
const chevReduce = await page.evaluate(async () => {
	const band = document.querySelector("[data-quote-band]");
	const L = band.querySelector(".quote-band__chevron--left");
	const R = band.querySelector(".quote-band__chevron--right");
	await new Promise((r) =>
		requestAnimationFrame(() => requestAnimationFrame(r)),
	);
	const dx = (el) =>
		+new DOMMatrix(getComputedStyle(el).transform).e.toFixed(1);
	// 逐帧采样，而不是「等过渡跑完再读一次」：撤掉 reduced-motion 的覆盖后，
	// getAnimations() 在样式还没重算的那一帧是空数组，于是只在结尾读一次会读到起始值 0 ——
	// 单独撤掉那条覆盖做变异验证，实测把这条放成了假绿。
	// 现在要求整段窗口内每一帧都恰好是 0，窗口 24 帧 ≈ 覆盖 240ms 的过渡。
	const samples = [];
	for (let i = 0; i < 12; i++) {
		samples.push([dx(L), dx(R)]);
		await new Promise((r) =>
			requestAnimationFrame(() => requestAnimationFrame(r)),
		);
	}
	return {
		hovering: band.matches(":hover"),
		worst: Math.max(...samples.flat().map(Math.abs)),
		first: samples[0].join("/"),
		last: samples[samples.length - 1].join("/"),
		// 阴影是绘制变化、不是位移，按本站口径（撤位移、保淡入与颜色）reduced-motion 下**保留**
		shadowAlpha: (() => {
			const a = (sel) => {
				const m = getComputedStyle(
					band.querySelector(sel),
				).textShadow.match(/rgba\([^()]*,\s*([\d.]+)\)/);
				return m ? +m[1] : 0;
			};
			return Math.min(
				a(".quote-band__en"),
				a(".quote-band__chevron--left"),
			);
		})(),
	};
});
await page.emulateMedia({ reducedMotion: "no-preference" });
check(
	"语录条：reduced-motion 下箭头悬停整段不漂移、但文字投影仍在（撤位移不撤绘制）",
	chevReduce.hovering && chevReduce.worst === 0 && chevReduce.shadowAlpha > 0,
	`hover 命中=${chevReduce.hovering} 12 帧采样的最大 |位移| =${chevReduce.worst}px（首帧 ${chevReduce.first}，末帧 ${chevReduce.last}），英文行阴影 α=${chevReduce.shadowAlpha}`,
);

await browser.close();

harness.finish();
