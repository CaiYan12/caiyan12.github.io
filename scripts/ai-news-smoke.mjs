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

	await page.getByRole("button", { name: "返回", exact: true }).click();
	await page.waitForTimeout(500);
	check("详情页返回列表", new URL(page.url()).hash === "#/");
	check(
		"页脚提供返回主站",
		(await page.locator('footer a[href="/"][data-no-swup]').count()) === 1,
	);

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
