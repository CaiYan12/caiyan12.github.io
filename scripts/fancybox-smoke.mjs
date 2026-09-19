// 灯箱（Fancybox）实机烟测
// 前置：pnpm build && pnpm preview --port 4322
// 运行：pnpm test:fancybox（或 FANCY_BASE_URL=http://localhost:4321 node scripts/fancybox-smoke.mjs）
// 覆盖：关闭不跳位、焦点归还、定位到文章位置（含 reduced-motion）、下载新标签页、中文文案
import { chromium } from "playwright";

const base = process.env.FANCY_BASE_URL ?? "http://localhost:4322";
const articlePath = "/posts/20260909092113/";
const albumPath = "/albums/" + encodeURIComponent("轻松一刻") + "/";

const results = [];
// 外部服务（Giscus 评论接口、字体 CDN）在本机网络下可能 4xx/重置：单列统计，不计 FAIL；
// 本地资源的失败仍然严格判失败。
const externalIssues = [];
const check = (name, ok, detail = "") => {
	results.push({ name, ok });
	console.log(
		`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` :: ${detail}` : ""}`,
	);
};

/** 灯箱打开期间的工具栏快照：右上角按钮顺序与文案 */
const toolbarState = () => {
	const c = document.querySelector(".fancybox__container");
	if (!c) return null;
	const right = c.querySelector(
		".f-carousel__toolbar__column.is-right, .f-toolbar__column.is-right",
	);
	return {
		buttons: [...(right?.querySelectorAll("button") || [])].map((b) => ({
			title:
				b.getAttribute("title") || b.getAttribute("aria-label") || "",
			locate: b.matches("[data-fancybox-locate]"),
			download: b.matches("[data-carousel-download]"),
		})),
		titles: [...c.querySelectorAll("[title]")].map((e) =>
			e.getAttribute("title"),
		),
	};
};

/** 等待关闭动画结束（容器被移出 DOM） */
async function waitClosed(page) {
	await page
		.waitForFunction(
			() => !document.querySelector(".fancybox__container"),
			null,
			{
				timeout: 10000,
			},
		)
		.catch(() => {});
	await page.waitForTimeout(600);
}

async function openLightbox(page, selector, index = 0) {
	const trigger = page.locator(selector).nth(index);
	await trigger.click();
	await page.waitForSelector(".fancybox__container.is-ready", {
		timeout: 15000,
	});
	await page.waitForTimeout(1200);
	return trigger;
}

const browser = await chromium.launch();

// ---------------- 文章页：post-gallery ----------------
const ctx = await browser.newContext({
	viewport: { width: 1280, height: 800 },
});
const page = await ctx.newPage();
const errors = [];
const failedRequests = [];
page.on("pageerror", (e) => errors.push(e.message.slice(0, 140)));
page.on("console", (m) => {
	if (m.type() !== "error") return;
	const url = m.location()?.url || "";
	// Giscus 等外部接口的 4xx 会以 console error 出现，与灯箱无关
	if (url && !url.startsWith(base)) externalIssues.push(url.split("/")[2]);
	else errors.push(m.text().slice(0, 140));
});
page.on("requestfailed", (r) => {
	if (r.url().startsWith(base))
		failedRequests.push(r.url().slice(base.length));
});

await page.goto(base + articlePath, { waitUntil: "load" });
const imgSel = '.post-context img[data-fancybox="post-gallery"]';
const imgCount = await page.locator(imgSel).count();
check("文章页存在正文图片灯箱触发点", imgCount >= 3, `${imgCount} 张`);
const iconSel = ".github-card img, table img, .qrimg img";
const taggedIcons = await page.evaluate(
	(sel) =>
		[...document.querySelectorAll(sel)].filter((i) =>
			i.hasAttribute("data-fancybox"),
		).length,
	iconSel,
);
check(
	"卡片/表格/二维码内的图标不计入文内图",
	taggedIcons === 0,
	`被标记 ${taggedIcons} 个`,
);
const cursors = await page.evaluate(() => {
	const c = (sel) => {
		const el = document.querySelector(sel);
		return el ? getComputedStyle(el).cursor : "MISSING";
	};
	return {
		link: c(".github-card-link"),
		avatar: c(".github-card-avatar"),
		name: c(".github-card-name"),
		bodyImg: c('.post-context img[data-fancybox="post-gallery"]'),
	};
});
check(
	"仓库卡片可点击区域统一为手型指针",
	cursors.link === "pointer" &&
		cursors.avatar === "pointer" &&
		cursors.name === "pointer",
	JSON.stringify(cursors),
);
check("正文触发图仍为放大指针", cursors.bodyImg === "zoom-in", cursors.bodyImg);

const trigger = await openLightbox(page, imgSel, 0);
let bar = await page.evaluate(toolbarState);
check(
	"文章模式工具栏含定位按钮",
	bar?.buttons.some((b) => b.locate) === true,
	bar?.buttons.map((b) => b.title).join(" / "),
);
check(
	"定位按钮紧跟下载按钮",
	bar?.buttons.findIndex((b) => b.locate) ===
		bar?.buttons.findIndex((b) => b.download) + 1,
	bar?.buttons
		.map((b) => (b.locate ? "locate" : b.download ? "download" : b.title))
		.join(","),
);
check(
	"定位按钮文案为「定位到文章位置」",
	bar?.buttons.find((b) => b.locate)?.title === "定位到文章位置",
	bar?.buttons.find((b) => b.locate)?.title,
);
check(
	"灯箱全部 title 为中文且无未翻译占位符",
	bar.titles.length > 0 &&
		bar.titles.every((t) => /[一-鿿]/.test(t) && !/\{\{/.test(t)),
	bar.titles.join(" / "),
);

// 翻到第 3 张（其正文位置远在视口之下），再关闭 —— 页面必须原地不动
await page.keyboard.press("ArrowRight");
await page.waitForTimeout(700);
await page.keyboard.press("ArrowRight");
await page.waitForTimeout(900);
const scrollBeforeClose = await page.evaluate(() => window.scrollY);
const articleOffscreen = await page.evaluate((s) => {
	const idx = parseInt(
		document
			.querySelector(".fancybox__slide.is-selected")
			?.getAttribute("index") || "0",
		10,
	);
	const el = document.querySelectorAll(s)[idx];
	if (!el) return { ok: false, reason: "slide index 越界" };
	const r = el.getBoundingClientRect();
	return {
		ok: r.top < 0 || r.top > innerHeight,
		idx,
		top: Math.round(r.top),
	};
}, imgSel);
check(
	"文章测试有效性：当前图确已滚出视口",
	articleOffscreen.ok === true,
	JSON.stringify(articleOffscreen),
);
await page.keyboard.press("Escape");
await waitClosed(page);
const scrollAfterClose = await page.evaluate(() => window.scrollY);
check(
	"翻页后关闭灯箱不跳位",
	Math.abs(scrollAfterClose - scrollBeforeClose) < 2,
	`关闭前 ${scrollBeforeClose} → 关闭后 ${scrollAfterClose}`,
);

// 定位按钮：关闭后应把当前这张图带到视口内
const thirdTopBefore = await page.evaluate(
	(s) =>
		Math.round(document.querySelectorAll(s)[2].getBoundingClientRect().top),
	imgSel,
);
await openLightbox(page, imgSel, 2);
await page.locator(".fancybox__container [data-fancybox-locate]").click();
await waitClosed(page);
await page
	.waitForFunction(
		(s) => {
			const el = document.querySelectorAll(s)[2];
			if (!el) return false;
			const r = el.getBoundingClientRect();
			return r.top < innerHeight * 0.75 && r.bottom > innerHeight * 0.25;
		},
		imgSel,
		{ timeout: 5000 },
	)
	.catch(() => {});
const thirdTopAfter = await page.evaluate(
	(s) =>
		Math.round(document.querySelectorAll(s)[2].getBoundingClientRect().top),
	imgSel,
);
check(
	"点定位后关闭灯箱并滚到该图",
	thirdTopAfter !== thirdTopBefore &&
		thirdTopAfter > 0 &&
		thirdTopAfter < 800,
	`top ${thirdTopBefore} → ${thirdTopAfter}`,
);
check(
	"定位后正文图获得焦点归还目标仍在文档中",
	await page.evaluate(
		(s) => !!document.querySelectorAll(s)[2]?.isConnected,
		imgSel,
	),
);

// 下载按钮：新标签页打开图片文件
const ctx2 = await browser.newContext({
	viewport: { width: 1280, height: 800 },
});
const page2 = await ctx2.newPage();
await page2.goto(base + articlePath, { waitUntil: "load" });
const src = await page2.evaluate(
	(s) => document.querySelectorAll(s)[0].src,
	imgSel,
);
await openLightbox(page2, imgSel, 0);
const popupPromise = ctx2
	.waitForEvent("page", { timeout: 8000 })
	.catch(() => null);
await page2.locator(".fancybox__container [data-carousel-download]").click();
const popup = await popupPromise;
check(
	"下载按钮在新标签页打开图片",
	!!popup,
	popup ? decodeURIComponent(popup.url()) : "无新标签页",
);
if (popup) {
	check(
		"新标签页 URL 即图片文件",
		decodeURIComponent(popup.url()).includes(
			decodeURIComponent(src).split("/").pop(),
		),
		decodeURIComponent(popup.url()),
	);
	await popup.close();
}

// reduced-motion：定位仍生效（瞬时）
const ctx3 = await browser.newContext({
	viewport: { width: 1280, height: 800 },
	reducedMotion: "reduce",
});
const page3 = await ctx3.newPage();
await page3.goto(base + articlePath, { waitUntil: "load" });
await openLightbox(page3, imgSel, 2);
await page3.locator(".fancybox__container [data-fancybox-locate]").click();
await waitClosed(page3);
const reducedTop = await page3.evaluate(
	(s) =>
		Math.round(document.querySelectorAll(s)[2].getBoundingClientRect().top),
	imgSel,
);
check(
	"reduced-motion 下定位仍完成",
	reducedTop > 0 && reducedTop < 800,
	`top=${reducedTop}`,
);

// ---------------- 含对比表格的文章：表格内头像不得进灯箱 ----------------
const tablePost = await ctx.newPage();
await tablePost.goto(base + "/posts/20260903134906/", { waitUntil: "load" });
await tablePost.waitForTimeout(800);
const tableStats = await tablePost.evaluate((sel) => {
	const icons = [...document.querySelectorAll(sel)];
	return {
		icons: icons.length,
		tagged: icons.filter((i) => i.hasAttribute("data-fancybox")).length,
	};
}, iconSel);
check(
	"含对比表格的文章：表格内头像零计入（且该页确有表格图标）",
	tableStats.icons > 0 && tableStats.tagged === 0,
	JSON.stringify(tableStats),
);
const tableCursor = await tablePost.evaluate(
	() => getComputedStyle(document.querySelector("table img")).cursor,
);
check(
	"表格行内头像不再显示放大指针",
	!tableCursor.includes("zoom-in"),
	tableCursor,
);

// ---------------- 灯箱顶部净空与放大不受影响 ----------------
const padPost = await ctx.newPage();
await padPost.goto(base + "/albums/" + encodeURIComponent("背景收藏") + "/", {
	waitUntil: "load",
});
await padPost.locator('a[data-fancybox="album"]').nth(2).click();
await padPost.waitForSelector(".fancybox__container.is-ready", {
	timeout: 15000,
});
await padPost.waitForTimeout(1500);
const padSnap = () =>
	padPost.evaluate(() => {
		const tb = document.querySelector(
			".fancybox__container .f-carousel__toolbar",
		);
		const imgs = document.querySelectorAll(
			".fancybox__slide.is-selected .f-panzoom__content",
		);
		const img = imgs[imgs.length - 1];
		return {
			toolbarBottom: Math.round(tb.getBoundingClientRect().bottom),
			top: Math.round(img.getBoundingClientRect().top),
			h: Math.round(img.getBoundingClientRect().height),
			natural: img.naturalHeight,
		};
	});
const fitted = await padSnap();
check(
	"适配态图片顶出不被工具栏遮挡",
	fitted.top >= fitted.toolbarBottom - 1,
	`img.top=${fitted.top} 工具栏底=${fitted.toolbarBottom}`,
);
await padPost
	.locator('.fancybox__container [data-panzoom-action="toggleFull"]')
	.click();
await padPost.waitForTimeout(1500);
const zoomed = await padSnap();
check(
	"点击放大仍然生效（放大后高度大于适配态）",
	zoomed.h > fitted.h * 2,
	`适配 ${fitted.h}px → 放大 ${zoomed.h}px`,
);
check(
	"放大态按原图自然尺寸呈现（未被顶部留白压缩）",
	Math.abs(zoomed.h - zoomed.natural) < 2,
	`放大高度 ${zoomed.h} / 原图 ${zoomed.natural}`,
);
await padPost.keyboard.press("Escape");
await padPost.waitForTimeout(800);
await padPost.close();

// ---------------- 相册页：album ----------------
const page4 = await ctx.newPage();
await page4.goto(base + albumPath, { waitUntil: "load" });
const albumSel = 'a[data-fancybox="album"]';
await openLightbox(page4, albumSel, 1);
const albumBar = await page4.evaluate(toolbarState);
check(
	"相册缩略图仍为放大指针",
	(await page4.evaluate(
		() =>
			getComputedStyle(document.querySelector(".photo-grid img")).cursor,
	)) === "zoom-in",
);
check(
	"相册模式不出现定位按钮",
	albumBar?.buttons.some((b) => b.locate) === false,
	albumBar?.buttons.map((b) => b.title).join(" / "),
);
const albumScrollBefore = await page4.evaluate(() => window.scrollY);
// 连翻到靠后的缩略图，确保当前这张在文档里远在视口之外（否则"不跳位"是空断言）
for (let i = 0; i < 14; i++) {
	await page4.keyboard.press("ArrowRight");
	await page4.waitForTimeout(160);
}
await page4.waitForTimeout(500);
const offscreen = await page4.evaluate((sel) => {
	const idx = parseInt(
		document
			.querySelector(".fancybox__slide.is-selected")
			?.getAttribute("index") || "0",
		10,
	);
	const el = document.querySelectorAll(sel)[idx];
	if (!el) return { ok: false, reason: "找不到对应缩略图" };
	const r = el.getBoundingClientRect();
	return { ok: r.top < 0 || r.top > innerHeight, top: Math.round(r.top) };
}, albumSel);
check(
	"相册测试有效性：当前图确已滚出视口",
	offscreen.ok === true,
	JSON.stringify(offscreen),
);
const albumScrollMark = await page4.evaluate(() => window.scrollY);
await page4.keyboard.press("Escape");
await waitClosed(page4);
const albumScrollAfter = await page4.evaluate(() => window.scrollY);
check(
	"相册关闭灯箱同样不跳位",
	Math.abs(albumScrollAfter - albumScrollMark) < 2 &&
		Math.abs(albumScrollAfter - albumScrollBefore) < 2,
	`${albumScrollBefore} / ${albumScrollMark} → ${albumScrollAfter}`,
);
check(
	"相册关闭后焦点归还到缩略图链接",
	await page4.evaluate(() => {
		const a = document.activeElement;
		return !!a && a.matches('a[data-fancybox="album"]');
	}),
	await page4.evaluate(() => document.activeElement?.tagName ?? "null"),
);

check(
	"全程无本地资源请求失败",
	failedRequests.length === 0,
	failedRequests.join(" | "),
);
check(
	"全程无 console/page 报错",
	errors.length === 0,
	errors.slice(0, 3).join(" | "),
);
if (externalIssues.length)
	console.log(
		`NOTE  外部服务请求问题（不计失败）: ${[...new Set(externalIssues)].join(", ")}`,
	);

await browser.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n合计 ${results.length} 项，失败 ${failed.length} 项`);
if (failed.length) failed.forEach((f) => console.log("  -", f.name));
process.exit(failed.length ? 1 : 0);
