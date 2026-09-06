// Nice Books 实机烟测（Playwright + 本地 dev 服务器）
// 运行：node scripts/nice-books-smoke.mjs（需 pnpm dev 已在 4321 端口运行）
// 覆盖：首页随机契约、换一换 loading/去重、推荐组整组替换、reduced-motion。
import { chromium } from "playwright";

const baseUrl = process.env.NICE_BOOKS_BASE_URL ?? "http://localhost:4321/books/";
const results = [];

function check(name, ok, detail = "") {
	results.push({ name, ok });
	console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` :: ${detail}` : ""}`);
}

function heroId() {
	return page.evaluate(() => {
		const el = document.querySelector("#nb-hero .hero-title a");
		const m = el?.getAttribute("href")?.match(/\/books\/(\d+)\//);
		return m ? m[1] : null;
	});
}

let page;
const browser = await chromium.launch();

// 外部 CDN（jsDelivr 字体）在本机网络下可能被重置：单列统计，不计 FAIL；
// 本地资源（localhost）的加载失败仍然严格判失败。
const externalFailures = [];

function collectErrors(page, errors) {
	page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
	page.on("console", (message) => {
		if (message.type() !== "error") return;
		if (message.text().includes("Failed to load resource")) return; // 由 requestfailed 按 URL 分类
		errors.push(message.text());
	});
	page.on("response", (response) => {
		if (response.status() >= 400) errors.push(`HTTP ${response.status()}: ${response.url()}`);
	});
	page.on("requestfailed", (request) => {
		const url = request.url();
		if (url.includes("jsdelivr")) externalFailures.push(url);
		else errors.push(`requestfailed: ${url} ${request.failure()?.errorText ?? ""}`);
	});
}

try {
	const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
	page = await context.newPage();
	const errors = [];
	collectErrors(page, errors);

	await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
	await page.waitForSelector("#nb-hero .hero-title a", { timeout: 15000 });

	// --- 首页基础 ---
	check("main 带 data-pagefind-ignore=all", (await page.locator('main[data-pagefind-ignore="all"]').count()) === 1);
	check("hero 容器 aria-live=polite", (await page.getAttribute("#nb-hero", "aria-live")) === "polite");

	const ssrId = await page.getAttribute("#nb-hero", "data-ssr-book-id");
	const initialId = await heroId();
	check("初始随机 ≠ SSR 兜底书", initialId !== ssrId, `ssr=${ssrId} initial=${initialId}`);

	// 推荐组初始：6 卡、组内无重复、排除 SSR 组
	const gridIds = async () =>
		page.evaluate(() =>
			Array.from(document.querySelectorAll("#nb-featured-grid a[href]")).map((a) =>
				a.getAttribute("href").match(/\/books\/(\d+)\//)[1],
			),
		);
	const ssrGroup = (await page.getAttribute("#nb-featured-grid", "data-ssr-group-ids")).split(",");
	let currentGroup = await gridIds();
	check("初始推荐组 6 本且组内无重复", currentGroup.length === 6 && new Set(currentGroup).size === 6, currentGroup.join(","));
	check("初始推荐组排除 SSR 组", currentGroup.every((id) => !ssrGroup.includes(id)));

	// --- 今日好书换一换 ---
	// 注意 handoff §10 时序：按钮 loading 240ms → 卡片淡出 170ms → 换书 → 淡入；
	// 按钮解锁早于内容替换约 170ms（与原型一致），故以「内容实际变化」为等待条件。
	const beforeId = await heroId();
	await page.click("#nb-today-shuffle");
	const loadingDisabled = await page.getAttribute("#nb-today-shuffle", "disabled");
	const ariaBusy = await page.getAttribute("#nb-today-shuffle", "aria-busy");
	check("点击后按钮进入 loading（disabled + aria-busy）", loadingDisabled !== null && ariaBusy === "true");
	await page.waitForFunction(
		(prev) => {
			const m = document.querySelector("#nb-hero .hero-title a")?.getAttribute("href")?.match(/\/books\/(\d+)\//);
			return m && m[1] !== prev && !document.querySelector("#nb-today-shuffle").hasAttribute("aria-busy");
		},
		beforeId,
		{ timeout: 5000 },
	);
	const afterId = await heroId();
	check("换一换后书已变化且 ≠ 当前", afterId !== beforeId, `${beforeId} → ${afterId}`);
	check("按钮恢复可用（无 aria-busy/disabled）", (await page.getAttribute("#nb-today-shuffle", "aria-busy")) === null);
	const countNote = await page.evaluate(() =>
		(document.querySelector("#nb-hero")?.textContent ?? "").includes("本次已换 1 次"),
	);
	check("换书计数显示「本次已换 1 次」", countNote);

	// --- 站长推荐换一组 ---
	const oldGroup = currentGroup;
	await page.click("#nb-featured-shuffle");
	await page.waitForFunction(
		() => !document.querySelector("#nb-featured-shuffle").hasAttribute("aria-busy"),
		{ timeout: 3000 },
	);
	currentGroup = await gridIds();
	check(
		"换一组：6 本、组内无重复、与旧组无交集",
		currentGroup.length === 6 && new Set(currentGroup).size === 6 && currentGroup.every((id) => !oldGroup.includes(id)),
		`旧=${oldGroup.join(",")} 新=${currentGroup.join(",")}`,
	);
	const staggered = await page.evaluate(() => {
		const cards = Array.from(document.querySelectorAll("#nb-featured-grid .nb-stagger"));
		return cards.slice(0, 2).map((el) => getComputedStyle(el).animationDelay);
	});
	check("级联入场（--d 递增 animation-delay）", staggered.length === 2 && staggered[0] === "0s" && staggered[1] === "0.045s", `delays=${staggered.join(",")}`);

	// --- 连点防抖（loading 期间点击无效，不叠动画） ---
	await page.click("#nb-today-shuffle");
	await page.click("#nb-today-shuffle", { force: true }).catch(() => {});
	await page.waitForFunction(
		() => !document.querySelector("#nb-today-shuffle").hasAttribute("aria-busy"),
		{ timeout: 3000 },
	);
	check("loading 期间连点不产生额外状态错误", errors.length === 0, errors.join(" | ").slice(0, 200));

	// --- reduced-motion ---
	const rmPage = await context.newPage();
	collectErrors(rmPage, errors);
	await rmPage.emulateMedia({ reducedMotion: "reduce" });
	await rmPage.goto(baseUrl, { waitUntil: "domcontentloaded" });
	await rmPage.waitForSelector("#nb-hero .hero-title a", { timeout: 15000 });
	const rmInitial = await rmPage.evaluate(() => {
		const m = document.querySelector("#nb-hero .hero-title a")?.getAttribute("href")?.match(/\/books\/(\d+)\//);
		return m ? m[1] : null;
	});
	const rmDuration = await rmPage.evaluate(() => getComputedStyle(document.querySelector("#nb-hero")).transitionDuration);
	check("reduced-motion 下过渡时长归零", parseFloat(rmDuration) <= 0.01, `duration=${rmDuration}`);
	await rmPage.click("#nb-today-shuffle");
	await rmPage.waitForFunction(
		(prev) => {
			const m = document.querySelector("#nb-hero .hero-title a")?.getAttribute("href")?.match(/\/books\/(\d+)\//);
			return m && m[1] !== prev;
		},
		rmInitial,
		{ timeout: 5000 },
	);
	const rmId = await rmPage.evaluate(() => {
		const m = document.querySelector("#nb-hero .hero-title a")?.getAttribute("href")?.match(/\/books\/(\d+)\//);
		return m ? m[1] : null;
	});
	check("reduced-motion 下换一换仍生效（内容直接替换）", rmId !== null && rmId !== rmInitial, `${rmInitial} → ${rmId}`);
	await rmPage.close();

	// --- 书库 /books/archive/ ---
	const archiveUrl = new URL("/books/archive/", baseUrl).href;
	await page.goto(archiveUrl, { waitUntil: "domcontentloaded" });
	await page.waitForSelector("#nb-archive-grid li", { timeout: 15000 });

	const initialLine = await page.textContent("#nb-result-line");
	check("书库 result-line 全量计数", initialLine?.startsWith("共 22 本藏书") === true, `actual="${initialLine}"`);
	check("书架视图每页 12 本", (await page.locator("#nb-archive-grid li").count()) === 12);
	check("SVG 兜底封面渲染", (await page.locator('#nb-archive-grid svg[viewBox="0 0 300 450"]').count()) > 0);

	// 六字段搜索：description 词 + recommendationReason 词（比原型多出的两字段，决策 #3）
	const searchAndCount = async (word) => {
		await page.fill("#nb-search-input", word);
		await page.waitForFunction(
			(w) => (document.querySelector("#nb-result-line")?.textContent ?? "").includes("符合条件"),
			word,
			{ timeout: 3000 },
		);
		return {
			line: await page.textContent("#nb-result-line"),
			count: await page.locator("#nb-archive-grid li:visible").count(),
		};
	};
	const byDesc = await searchAndCount("魔幻");
	check("搜索命中 description 字段", byDesc.count >= 1, byDesc.line ?? "");
	const byReason = await searchAndCount("毒舌");
	check("搜索命中 recommendationReason 字段", byReason.count >= 1, byReason.line ?? "");
	check("搜索后 URL 写回 ?q=", page.url().includes("q="), page.url());

	// ?tag= 直达 + 与搜索叠加（马尔克斯两本的公共标签是「文学」）
	await page.goto(`${archiveUrl}?tag=${encodeURIComponent("科幻")}`, { waitUntil: "domcontentloaded" });
	await page.waitForSelector("#nb-archive-grid li", { timeout: 15000 });
	const tagCount = await page.locator("#nb-archive-grid li").count();
	check("?tag= 直达筛选", tagCount === 1, `科幻=${tagCount} 本`);
	await page.goto(`${archiveUrl}?tag=${encodeURIComponent("文学")}`, { waitUntil: "domcontentloaded" });
	await page.waitForSelector("#nb-archive-grid li", { timeout: 15000 });
	await page.fill("#nb-search-input", "马尔克斯");
	await page.waitForFunction(
		() => (document.querySelector("#nb-result-line")?.textContent ?? "").includes("符合条件 2 本"),
		null,
		{ timeout: 3000 },
	);
	check("标签与搜索叠加为 AND", (await page.locator("#nb-archive-grid li").count()) === 2);

	// 双视图切换
	await page.click("#nb-view-list");
	await page.waitForSelector("#nb-archive-list li", { timeout: 3000 });
	check("列表视图激活且书架隐藏", (await page.locator("#nb-archive-list").isVisible()) === true && (await page.locator("#nb-archive-grid").isVisible()) === false);
	check(
		"视图切换 aria-pressed 同步",
		(await page.getAttribute("#nb-view-list", "aria-pressed")) === "true" &&
			(await page.getAttribute("#nb-view-grid", "aria-pressed")) === "false",
	);
	await page.click("#nb-view-grid");
	await page.waitForSelector("#nb-archive-grid li", { timeout: 3000 });

	// 载入更多 / 到底结语
	await page.goto(archiveUrl, { waitUntil: "domcontentloaded" });
	await page.waitForSelector("#nb-archive-grid li", { timeout: 15000 });
	await page.click("#nb-btn-more");
	await page.waitForFunction(() => document.querySelectorAll("#nb-archive-grid li").length === 22, null, { timeout: 3000 });
	check("载入更多补足全量 22 本", (await page.locator("#nb-btn-more").isHidden()) === true);
	check("到底结语显示", ((await page.textContent("#nb-the-end")) ?? "").includes("已经到底啦 · 共 22 本"));

	// 空状态与清除
	await page.fill("#nb-search-input", "不存在的书名XYZ");
	await page.waitForSelector("#nb-empty-state:not([hidden])", { timeout: 3000 });
	check("空状态显示", await page.locator("#nb-empty-state").isVisible());
	await page.click("#nb-btn-clear");
	await page.waitForFunction(() => document.querySelectorAll("#nb-archive-grid li").length === 12, null, { timeout: 3000 });
	check("清除后恢复全量分页", (await page.inputValue("#nb-search-input")) === "");

	// 「/」快捷键聚焦
	await page.keyboard.press("/");
	const focused = await page.evaluate(() => document.activeElement?.id === "nb-search-input");
	check("「/」快捷键聚焦搜索框", focused);

	// --- 详情 /books/:id/ ---
	await page.goto(new URL("/books/01/", baseUrl).href, { waitUntil: "domcontentloaded" });
	await page.waitForSelector("article .detail-title, article h1", { timeout: 15000 });
	check("详情页 title 格式", (await page.title()) === "《百年孤独》 · Nice Books 每日好书", await page.title());
	check("详情页 h1 渲染书名", (await page.textContent("article h1")) === "百年孤独");
	const bodyText = await page.evaluate(() => document.querySelector("main")?.textContent ?? "");
	check(
		"详情页全字段渲染（作者/出版社/版次/简介/荐语）",
		bodyText.includes("加西亚·马尔克斯") &&
			bodyText.includes("范晔 译") &&
			bodyText.includes("南海出版公司") &&
			bodyText.includes("第一版 · 2011 年") &&
			bodyText.includes("布恩迪亚家族") &&
			bodyText.includes("站长荐语") &&
			bodyText.includes("大学宿舍"),
	);
	const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
	const ogTitle = await page.locator('meta[property="og:title"]').getAttribute("content");
	check("详情页 canonical/og 齐备", canonical?.endsWith("/books/01/") === true && ogTitle === "《百年孤独》 · Nice Books 每日好书", `canonical=${canonical}`);
	const shelfHrefs = await page.evaluate(() =>
		Array.from(document.querySelectorAll('section[aria-labelledby="nb-related-title"] a[href^="/books/"]')).map((a) =>
			a.getAttribute("href"),
		),
	);
	const shelfIds = shelfHrefs
		.map((h) => h?.match(/\/books\/(\d+)\//)?.[1])
		.filter((id) => id && /^\d{2}$/.test(id));
	// 共享标签语义由单测 getSameShelf 契约锁定，此处只断言结构
	check(
		"同架图书 ≤4 且不含自身",
		shelfIds.length > 0 && shelfIds.length <= 4 && !shelfIds.includes("01"),
		`ids=${shelfIds.join(",")}`,
	);
	check("标签可点回书库带参", (await page.locator('dl a[href^="/books/archive/?tag="]').count()) > 0);

	check("全程无 console/page 错误", errors.length === 0, errors.join(" | ").slice(0, 300));

	// 404 验证置于错误断言之后：预期的 404 响应不应计入错误
	const resp404 = await page.goto(new URL("/books/99/", baseUrl).href, { waitUntil: "domcontentloaded" });
	check("无效 id 落站级 404", resp404?.status() === 404, `status=${resp404?.status()}`);

	// --- swup 切页链路（主提示词 §39）---
	await page.goto(archiveUrl, { waitUntil: "domcontentloaded" });
	await page.waitForSelector("#nb-archive-grid li", { timeout: 15000 });
	await page.evaluate(() => {
		window.__nbMarker = "alive"; // 整页刷新会丢失此标记
	});
	// loadOnIdle：swup 在页面空闲后才初始化（@swup/astro 默认行为，与主站一致）；
	// 等待就绪再断言，超时即真问题。未就绪窗口内点击链接无害降级为整页加载。
	await page.waitForFunction(() => typeof window.swup !== "undefined", null, { timeout: 10000 }).catch(() => {});
	check("swup 全局实例在 books 页面就绪", await page.evaluate(() => typeof window.swup !== "undefined"));

	await page.click("#nb-archive-grid li a");
	await page.waitForURL(/\/books\/\d+\//, { timeout: 8000 });
	await page.waitForSelector("article h1", { timeout: 8000 });
	check("书库→详情经 swup（无整页刷新）", await page.evaluate(() => window.__nbMarker === "alive"));
	check("详情内容已被 swup 替换", (await page.textContent("article h1"))?.length > 0);

	await page.click('a[href="/books/archive/"]');
	await page.waitForURL(/\/books\/archive\//, { timeout: 8000 });
	await page.waitForSelector("#nb-archive-grid li", { timeout: 8000 });
	await page.fill("#nb-search-input", "鲁迅");
	await page.waitForFunction(
		() => (document.querySelector("#nb-result-line")?.textContent ?? "").includes("符合条件"),
		null,
		{ timeout: 4000 },
	);
	check("swup 返回书库后搜索仍可用（脚本重跑正常）", (await page.locator("#nb-archive-grid li").count()) >= 1);

	await page.goBack();
	await page.waitForURL(/\/books\/\d+\//, { timeout: 8000 });
	await page.waitForSelector("article h1", { timeout: 8000 });
	check("浏览器后退经 swup 恢复详情", await page.evaluate(() => window.__nbMarker === "alive"));

	// 重复进入后换一换无重复绑定（计数应严格 +1）
	await page.goto(new URL("/books/", baseUrl).href, { waitUntil: "domcontentloaded" });
	await page.waitForSelector("#nb-hero .hero-title a", { timeout: 15000 });
	await page.click("#nb-today-shuffle");
	await page.waitForFunction(
		() => (document.querySelector("#nb-hero")?.textContent ?? "").includes("本次已换 1 次"),
		null,
		{ timeout: 5000 },
	);
	check("重复进入后换一换计数严格为 1（无重复绑定）", true);

	console.log(`外部 CDN 失败 ${externalFailures.length} 项（jsDelivr 字体，本机网络抖动，不计 FAIL）`);
} finally {
	await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length > 0 ? 1 : 0);
