// AI日报入口/详情/返回/离线快照的实机烟测（需先 build + preview）。
// 台子（check / 报错采集 / 汇总）来自 scripts/lib/smoke-harness.mjs，本文件只写判据。
// AI_NEWS_BASE_URL 传的是**完整页面地址**（形如 http://host/ai-news/），不是站点根。
import { chromium } from "playwright";
import { makeHarness } from "./lib/smoke-harness.mjs";

const itemSelector = '.juya-feed-item, article[role="button"]';

// 噪声策略留在调用点：实时 RSS 抓取失败是这条链路**设计上要演示**的分支，不是缺陷。
const harness = makeHarness({
	envVar: "AI_NEWS_BASE_URL",
	defaultBase: "http://127.0.0.1:4321/ai-news/",
	isNoise: ({ text }) => text.includes("[feed] 实时抓取失败"),
});
const baseUrl = harness.base;
const { check } = harness;

const browser = await chromium.launch();
const offlineSink = harness.createSink({
	name: "offline",
	// 离线页额外允许那条被 route.abort() 制造出来的资源加载失败（原文精确匹配，与原实现同）
	sinkNoise: ({ text }) =>
		text.includes("[feed] 实时抓取失败") ||
		text === "Failed to load resource: net::ERR_FAILED",
});

try {
	const page = harness.attach(
		await browser.newPage({ viewport: { width: 1280, height: 900 } }),
	);

	const siteRootUrl = new URL("/", baseUrl).href;
	await page.goto(siteRootUrl, { waitUntil: "domcontentloaded" });
	const mainSiteLinks = page.locator('a[href="/ai-news/"][data-no-swup]');
	const mainSiteLinkCount = await mainSiteLinks.count();
	check(
		"本站资源提供 AI日报 入口",
		mainSiteLinkCount === 2,
		`${mainSiteLinkCount} 个（桌面/移动）`,
	);

	await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
	await page.evaluate(() => localStorage.clear());
	await page.reload({ waitUntil: "domcontentloaded" });
	await page.waitForSelector(itemSelector, { timeout: 20000 });

	const cards = await page.locator(itemSelector).count();
	check("AI日报首屏渲染期号列表", cards > 0, `${cards} 条`);
	check(
		"页面标题正确",
		(await page.title()) === "AI 日报 - WindowsIt's Music Club",
	);
	check(
		"顶栏提供返回主站",
		(await page.locator('header a[href="/"][data-no-swup]').count()) === 1,
	);

	await page.locator(itemSelector).first().click();
	await page.waitForTimeout(500);
	const issueHash = new URL(page.url()).hash;
	check(
		"详情页 hash 路由生效",
		issueHash.startsWith("#/issue/"),
		issueHash.slice(0, 70),
	);

	// ---- 内容缩放胶囊：只缩放正文，阅读工具条等外壳保持固定尺寸 ----
	const zoomGroup = page.getByRole("group", { name: "内容缩放" });
	const zoomLabel = (await zoomGroup.textContent())?.trim() ?? "";
	check(
		"详情页出现缩放控件且默认 100%",
		zoomLabel.includes("100%"),
		zoomLabel || "未找到缩放控件",
	);

	await page.getByRole("button", { name: "放大", exact: true }).click();
	const detailZoomApplied = await page
		.waitForFunction(() => {
			const el = document.querySelector("[data-zoom-content]");
			return el != null && getComputedStyle(el).zoom === "1.05";
		})
		.then(() => true)
		.catch(() => false);
	const detailZoom = await page.evaluate(() => {
		const content = document.querySelector("[data-zoom-content]");
		const nav = document.querySelector(".view-nav");
		return {
			content: content ? getComputedStyle(content).zoom : null,
			nav: nav ? getComputedStyle(nav).zoom : null,
		};
	});
	check(
		"放大只作用于正文（阅读工具条不缩放）",
		detailZoomApplied &&
			Math.abs(Number(detailZoom.content) - 1.05) < 1e-6 &&
			detailZoom.nav === "1",
		`content=${detailZoom.content} nav=${detailZoom.nav}`,
	);

	const zoomPersisted = await page
		.waitForFunction(() => {
			const raw = localStorage.getItem("ai-daily:v1");
			if (!raw) return false;
			try {
				return JSON.parse(raw).settings?.uiZoom === 1.05;
			} catch {
				return false;
			}
		})
		.then(() => true)
		.catch(() => false);
	check(
		"缩放比例写入本地设置",
		zoomPersisted,
		zoomPersisted
			? "settings.uiZoom = 1.05"
			: "未等到 settings.uiZoom = 1.05",
	);

	await page
		.getByRole("button", { name: "重置为 100%", exact: true })
		.click();
	await page
		.waitForFunction(() => {
			const el = document.querySelector("[data-zoom-content]");
			return el != null && getComputedStyle(el).zoom === "1";
		})
		.catch(() => {});
	const resetLabel = (await zoomGroup.textContent())?.trim() ?? "";
	check("重置回 100%", resetLabel.includes("100%"), resetLabel);

	await page.getByRole("button", { name: "返回", exact: true }).click();
	await page.waitForTimeout(500);
	check("详情页返回列表", new URL(page.url()).hash === "#/");
	check(
		"页脚提供返回主站",
		(await page.locator('footer a[href="/"][data-no-swup]').count()) === 1,
	);

	// ---- 首页：同一胶囊作用于列表内容，顶栏仍是固定尺寸 ----
	await page.getByRole("button", { name: "放大", exact: true }).click();
	const homeZoomApplied = await page
		.waitForFunction(() => {
			const el = document.querySelector("[data-zoom-content]");
			return el != null && getComputedStyle(el).zoom === "1.05";
		})
		.then(() => true)
		.catch(() => false);
	const homeZoom = await page.evaluate(() => {
		const content = document.querySelector("[data-zoom-content]");
		const header = document.querySelector("header");
		return {
			content: content ? getComputedStyle(content).zoom : null,
			header: header ? getComputedStyle(header).zoom : null,
		};
	});
	check(
		"首页列表同样只缩放内容区",
		homeZoomApplied &&
			Math.abs(Number(homeZoom.content) - 1.05) < 1e-6 &&
			homeZoom.header === "1",
		`content=${homeZoom.content} header=${homeZoom.header}`,
	);
	await page
		.getByRole("button", { name: "重置为 100%", exact: true })
		.click();
	await page
		.waitForFunction(() => {
			const el = document.querySelector("[data-zoom-content]");
			return el != null && getComputedStyle(el).zoom === "1";
		})
		.catch(() => {});

	const offline = offlineSink.attach(
		await browser.newPage({ viewport: { width: 1280, height: 900 } }),
	);
	await offline.route("https://daily.juya.uk/**", (route) => route.abort());
	await offline.goto(baseUrl, { waitUntil: "domcontentloaded" });
	await offline.waitForSelector(itemSelector, { timeout: 20000 });
	check(
		"实时 RSS 失败时回退离线快照",
		(await offline.locator(itemSelector).count()) > 0,
	);
	check(
		"离线快照状态可见",
		/离线快照/.test(await offline.locator("header").first().innerText()),
	);
	await offline.close();
} finally {
	await browser.close();
}

const allErrors = [...harness.errors, ...offlineSink.errors];
console.log("\n--- console errors ---");
console.log(allErrors.length === 0 ? "(none)" : allErrors.join("\n"));

const { total, failed } = harness.summary();
console.log(`\n结果：${total - failed.length}/${total} 通过`);
process.exit(failed.length === 0 && allErrors.length === 0 ? 0 : 1);
