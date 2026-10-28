import assert from "node:assert/strict";
import { chromium } from "playwright";

// MAIN_SITE_URL 是站点根；本地模式只核对入口，LIVE 模式要求同源实际部署。
const root = new URL(process.env.MAIN_SITE_URL || "http://localhost:4321/");
assert.equal(root.pathname, "/", "MAIN_SITE_URL must be a site root");
const live = process.env.AI_NEWS_INTEGRATION_LIVE === "1";
const browser = await chromium.launch();
try {
	for (const width of [1280, 390]) {
		const context = await browser.newContext({
			viewport: { width, height: width === 390 ? 844 : 900 },
		});
		const page = await context.newPage();
		const errors = [];
		page.on("pageerror", (error) => errors.push(error.message));
		await page.goto(root.href, { waitUntil: "domcontentloaded" });
		const selector =
			width === 390
				? '#mmenu a[href="/ai-news/"]'
				: '#head-nav a[href="/ai-news/"]';
		const link = page.locator(selector);
		assert.equal(await link.count(), 1, `${width}: main navigation link`);
		assert.notEqual(
			await link.getAttribute("data-no-swup"),
			null,
			`${width}: full document navigation`,
		);
		if (live) {
			const enter = async () => {
				if (width === 390) await page.locator("#open-nav").click();
				else
					await page
						.locator("#head-nav li")
						.filter({ has: page.locator('a[href="/ai-news/"]') })
						.first()
						.hover();
				await link.click();
				await page.waitForURL(
					(url) =>
						url.origin === root.origin &&
						url.pathname === "/ai-news/",
				);
				await page
					.locator('.juya-feed-item, article[role="button"]')
					.first()
					.waitFor({ timeout: 45000 });
				assert.equal(await page.title(), "AI 日报");
			};
			await enter();
			await page.locator('header a[aria-label="返回主站"]').click();
			await page.waitForURL(root.href);
			await enter();
			await page.locator('footer a[href="/"]').click();
			await page.waitForURL(root.href);
		}
		assert.deepEqual(errors, [], `${width}: page errors`);
		console.log(
			`PASS ${width}: ${live ? "main → app → header/footer → main" : "main navigation DOM (local only)"}`,
		);
		await context.close();
	}
} finally {
	await browser.close();
}
