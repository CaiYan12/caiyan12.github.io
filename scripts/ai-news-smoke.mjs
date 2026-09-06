import { chromium } from "playwright";

const baseUrl =
	process.env.AI_NEWS_BASE_URL ?? "http://127.0.0.1:4321/ai-news/";
const itemSelector = '.juya-feed-item, article[role="button"]';
const results = [];

function check(name, ok, detail = "") {
	results.push({ name, ok });
	console.log(
		`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` :: ${detail}` : ""}`,
	);
}

function collectErrors(page, errors, ignoredConsoleMessages = []) {
	page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
	page.on("console", (message) => {
		if (message.type() !== "error") return;
		const text = message.text();
		if (text.includes("[feed] 实时抓取失败")) return;
		if (ignoredConsoleMessages.includes(text)) return;
		errors.push(text);
	});
}

const browser = await chromium.launch();
const errors = [];
const offlineErrors = [];

try {
	const page = await browser.newPage({
		viewport: { width: 1280, height: 900 },
	});
	collectErrors(page, errors);

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

	const offline = await browser.newPage({
		viewport: { width: 1280, height: 900 },
	});
	collectErrors(offline, offlineErrors, [
		"Failed to load resource: net::ERR_FAILED",
	]);
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

console.log("\n--- console errors ---");
console.log(
	[...errors, ...offlineErrors].length === 0
		? "(none)"
		: [...errors, ...offlineErrors].join("\n"),
);

const failed = results.filter((result) => !result.ok);
console.log(`\n结果：${results.length - failed.length}/${results.length} 通过`);
process.exit(
	failed.length === 0 && errors.length === 0 && offlineErrors.length === 0
		? 0
		: 1,
);
