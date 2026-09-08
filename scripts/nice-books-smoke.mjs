// Nice Books 实机烟测（Playwright + 本地 dev 服务器）
// 运行：node scripts/nice-books-smoke.mjs（需 pnpm dev 已在 4321 端口运行）
// 覆盖：首页随机契约、换一换 loading/去重、推荐组整组替换、reduced-motion。
import { chromium } from "playwright";

const baseUrl =
	process.env.NICE_BOOKS_BASE_URL ?? "http://localhost:4321/books/";
const results = [];

function check(name, ok, detail = "") {
	results.push({ name, ok });
	console.log(
		`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` :: ${detail}` : ""}`,
	);
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
		if (response.status() >= 400)
			errors.push(`HTTP ${response.status()}: ${response.url()}`);
	});
	page.on("requestfailed", (request) => {
		const url = request.url();
		if (url.includes("jsdelivr")) externalFailures.push(url);
		else
			errors.push(
				`requestfailed: ${url} ${request.failure()?.errorText ?? ""}`,
			);
	});
}

try {
	const context = await browser.newContext({
		viewport: { width: 1280, height: 900 },
	});
	page = await context.newPage();
	const errors = [];
	collectErrors(page, errors);

	await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
	await page.waitForSelector("#nb-hero .hero-title a", { timeout: 15000 });

	// --- 首页基础 ---
	check(
		"main 带 data-pagefind-ignore=all",
		(await page.locator('main[data-pagefind-ignore="all"]').count()) === 1,
	);
	check(
		"hero 容器 aria-live=polite",
		(await page.getAttribute("#nb-hero", "aria-live")) === "polite",
	);
	// 当前页导航高亮：44px 点击区不画边框，下划线只贴住内部文字层。
	const navActive = await page.evaluate(() => {
		const a = Array.from(
			document.querySelectorAll('nav[aria-label="站内导航"] a'),
		).find((x) => x.getAttribute("aria-current") === "page");
		const label = a?.querySelector(".nb-site-nav-label");
		const s = label ? getComputedStyle(label) : null;
		return s
			? { label: a.textContent.trim(), border: s.borderBottomColor }
			: null;
	});
	check(
		"当前页导航高亮（墨字+红下划线）",
		navActive?.label === "今日好书" &&
			navActive.border === "rgb(168, 67, 60)",
		JSON.stringify(navActive),
	);

	const ssrId = await page.getAttribute("#nb-hero", "data-ssr-book-id");
	const initialId = await heroId();
	check(
		"初始随机 ≠ SSR 兜底书",
		initialId !== ssrId,
		`ssr=${ssrId} initial=${initialId}`,
	);

	// 推荐组初始：6 卡、组内无重复、排除 SSR 组
	const gridIds = async () =>
		page.evaluate(() =>
			Array.from(
				document.querySelectorAll("#nb-featured-grid a[href]"),
			).map((a) => a.getAttribute("href").match(/\/books\/(\d+)\//)[1]),
		);
	const ssrGroup = (
		await page.getAttribute("#nb-featured-grid", "data-ssr-group-ids")
	).split(",");
	let currentGroup = await gridIds();
	check(
		"初始推荐组 6 本且组内无重复",
		currentGroup.length === 6 && new Set(currentGroup).size === 6,
		currentGroup.join(","),
	);
	check(
		"初始推荐组排除 SSR 组",
		currentGroup.every((id) => !ssrGroup.includes(id)),
	);

	// --- 今日好书换一换 ---
	// 注意 handoff §10 时序：按钮 loading 240ms → 卡片淡出 170ms → 换书 → 淡入；
	// 按钮解锁早于内容替换约 170ms（与原型一致），故以「内容实际变化」为等待条件。
	const beforeId = await heroId();
	const swapStartedAt = Date.now();
	await page.click("#nb-today-shuffle");
	const loadingDisabled = await page.getAttribute(
		"#nb-today-shuffle",
		"disabled",
	);
	const ariaBusy = await page.getAttribute("#nb-today-shuffle", "aria-busy");
	const todayIntroBusy = await page.getAttribute(
		"#nb-intro-shuffle",
		"aria-busy",
	);
	const todayLabel = await page.textContent(
		"#nb-today-shuffle [data-nb-shuffle-label]",
	);
	check(
		"点击后两个今日入口同步 loading（disabled + aria-busy + 文案）",
		loadingDisabled !== null &&
			ariaBusy === "true" &&
			todayIntroBusy === "true" &&
			todayLabel === "换书中…",
	);
	await page.waitForFunction(
		(prev) => {
			const m = document
				.querySelector("#nb-hero .hero-title a")
				?.getAttribute("href")
				?.match(/\/books\/(\d+)\//);
			return (
				m &&
				m[1] !== prev &&
				!document
					.querySelector("#nb-today-shuffle")
					.hasAttribute("aria-busy")
			);
		},
		beforeId,
		{ timeout: 5000 },
	);
	const afterId = await heroId();
	const swapElapsed = Date.now() - swapStartedAt;
	check(
		"主书换书为真实双阶段时序（约 420ms）",
		swapElapsed >= 380 && swapElapsed <= 760,
		`${swapElapsed}ms`,
	);
	check(
		"换一换后书已变化且 ≠ 当前",
		afterId !== beforeId,
		`${beforeId} → ${afterId}`,
	);
	check(
		"按钮恢复可用（无 aria-busy/disabled）",
		(await page.getAttribute("#nb-today-shuffle", "aria-busy")) === null,
	);
	const countNote = await page.evaluate(() =>
		(document.querySelector("#nb-hero")?.textContent ?? "").includes(
			"本次已换 1 次",
		),
	);
	check("换书计数显示「本次已换 1 次」", countNote);

	// --- 站长推荐换一组 ---
	const oldGroup = currentGroup;
	// 直接派发事件，捕获同步进入 busy 的瞬时状态；Playwright click 可能
	// 等待按钮因 CSS 入场动画稳定后才返回，错过该观察窗口。
	const featureBusyState = await page.evaluate(() => {
		const button = document.querySelector("#nb-featured-shuffle");
		button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
		return {
			busy: button?.getAttribute("aria-busy"),
			label: button?.querySelector("[data-nb-shuffle-label]")
				?.textContent,
		};
	});
	check(
		"推荐组入口独立进入 loading",
		featureBusyState.busy === "true" &&
			featureBusyState.label === "换一批中…",
	);
	await page.waitForTimeout(80);
	const featureMidBusy = await page.evaluate(() => ({
		busy: document
			.querySelector("#nb-featured-shuffle")
			?.getAttribute("aria-busy"),
		animations: document
			.querySelector("#nb-featured-grid")
			?.getAnimations({ subtree: true }).length,
	}));
	check(
		"推荐组 busy 覆盖真实卡片入场中段",
		featureMidBusy.busy === "true" && (featureMidBusy.animations ?? 0) > 0,
		JSON.stringify(featureMidBusy),
	);
	await page.waitForFunction(
		() =>
			!document
				.querySelector("#nb-featured-shuffle")
				.hasAttribute("aria-busy"),
		{ timeout: 3000 },
	);
	currentGroup = await gridIds();
	check(
		"换一组：6 本、组内无重复、与旧组无交集",
		currentGroup.length === 6 &&
			new Set(currentGroup).size === 6 &&
			currentGroup.every((id) => !oldGroup.includes(id)),
		`旧=${oldGroup.join(",")} 新=${currentGroup.join(",")}`,
	);
	const staggered = await page.evaluate(() => {
		const cards = Array.from(
			document.querySelectorAll("#nb-featured-grid .nb-stagger"),
		);
		return cards
			.slice(0, 2)
			.map((el) => getComputedStyle(el).animationDelay);
	});
	check(
		"级联入场（--d 递增 animation-delay）",
		staggered.length === 2 &&
			staggered[0] === "0s" &&
			staggered[1] === "0.045s",
		`delays=${staggered.join(",")}`,
	);

	// --- 连点防抖（loading 期间点击无效，不叠动画） ---
	await page.click("#nb-today-shuffle");
	await page.click("#nb-today-shuffle", { force: true }).catch(() => {});
	await page.waitForFunction(
		() =>
			!document
				.querySelector("#nb-today-shuffle")
				.hasAttribute("aria-busy"),
		{ timeout: 3000 },
	);
	check(
		"loading 期间连点不产生额外状态错误",
		errors.length === 0,
		errors.join(" | ").slice(0, 200),
	);

	// 第二次换组在 CSS 入场中切页，验证 before-swap 会取消后代动画并移除旧作用域。
	await page.evaluate(() => {
		const grid = document.querySelector("#nb-featured-grid");
		const button = document.querySelector("#nb-featured-shuffle");
		window.__nbOldFeaturedGrid = grid;
		window.__nbOldFeaturedButton = button;
		button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
	});
	await page.waitForTimeout(30);
	await page.click('header a[href="/books/archive/"]');
	await page.waitForURL(/\/books\/archive\//, { timeout: 8000 });
	await page.waitForSelector("#nb-archive-grid li", { timeout: 8000 });
	const interruptedState = await page.evaluate(() => {
		const oldGrid = window.__nbOldFeaturedGrid;
		const oldButton = window.__nbOldFeaturedButton;
		return {
			oldDisconnected: oldGrid ? !oldGrid.isConnected : false,
			oldAnimations:
				oldGrid?.getAnimations({ subtree: true }).length ?? -1,
			oldBusy: oldButton?.getAttribute("aria-busy") ?? null,
		};
	});
	check(
		"切页中断取消推荐组后代动画并移除旧作用域",
		interruptedState.oldDisconnected &&
			interruptedState.oldAnimations === 0 &&
			interruptedState.oldBusy === null,
		JSON.stringify(interruptedState),
	);

	// --- reduced-motion ---
	const rmPage = await context.newPage();
	collectErrors(rmPage, errors);
	await rmPage.emulateMedia({ reducedMotion: "reduce" });
	await rmPage.goto(baseUrl, { waitUntil: "domcontentloaded" });
	await rmPage.waitForSelector("#nb-hero .hero-title a", { timeout: 15000 });
	const rmInitial = await rmPage.evaluate(() => {
		const m = document
			.querySelector("#nb-hero .hero-title a")
			?.getAttribute("href")
			?.match(/\/books\/(\d+)\//);
		return m ? m[1] : null;
	});
	const rmDuration = await rmPage.evaluate(
		() =>
			getComputedStyle(document.querySelector("#nb-hero"))
				.transitionDuration,
	);
	check(
		"reduced-motion 下过渡时长归零",
		parseFloat(rmDuration) <= 0.01,
		`duration=${rmDuration}`,
	);
	await rmPage.click("#nb-today-shuffle");
	await rmPage.waitForFunction(
		(prev) => {
			const m = document
				.querySelector("#nb-hero .hero-title a")
				?.getAttribute("href")
				?.match(/\/books\/(\d+)\//);
			return m && m[1] !== prev;
		},
		rmInitial,
		{ timeout: 5000 },
	);
	const rmId = await rmPage.evaluate(() => {
		const m = document
			.querySelector("#nb-hero .hero-title a")
			?.getAttribute("href")
			?.match(/\/books\/(\d+)\//);
		return m ? m[1] : null;
	});
	check(
		"reduced-motion 下换一换仍生效（内容直接替换）",
		rmId !== null && rmId !== rmInitial,
		`${rmInitial} → ${rmId}`,
	);
	await rmPage.close();

	// --- 书库 /books/archive/ ---
	const archiveUrl = new URL("/books/archive/", baseUrl).href;
	await page.goto(archiveUrl, { waitUntil: "domcontentloaded" });
	await page.waitForSelector("#nb-archive-grid li", { timeout: 15000 });

	const initialLine = await page.textContent("#nb-result-line");
	check(
		"书库 result-line 全量计数",
		initialLine?.startsWith("共 22 本藏书") === true,
		`actual="${initialLine}"`,
	);
	check(
		"书架视图每页 12 本",
		(await page.locator("#nb-archive-grid li").count()) === 12,
	);
	check(
		"SVG 兜底封面渲染",
		(await page
			.locator('#nb-archive-grid svg[viewBox="0 0 300 450"]')
			.count()) > 0,
	);
	const coverFallbackReady = await page.evaluate(() => {
		const fields = {
			nbId: "01",
			nbTitle: "百年孤独",
			nbAuthor: "加西亚·马尔克斯",
			nbPublisher: "南海出版公司",
			nbYear: "1967",
		};
		for (const suffix of ["a", "b"]) {
			const host = document.createElement("span");
			host.dataset.nbCoverFallbackFixture = suffix;
			const image = document.createElement("img");
			image.setAttribute("data-nb-cover", "");
			for (const [key, value] of Object.entries(fields))
				image.dataset[key] = value;
			host.append(image);
			document.body.append(host);
			image.dispatchEvent(new Event("error"));
		}
		return true;
	});
	await page.waitForFunction(
		() =>
			document.querySelectorAll(
				'[data-nb-cover-fallback-fixture] svg[viewBox="0 0 300 450"]',
			).length === 2,
		{ timeout: 3000 },
	);
	const coverFallbackState = await page.evaluate(() => {
		const svgs = Array.from(
			document.querySelectorAll(
				'[data-nb-cover-fallback-fixture] svg[viewBox="0 0 300 450"]',
			),
		).map((svg) => svg.outerHTML);
		return {
			ready: svgs.length === 2,
			sameIdDeterministic: svgs[0] === svgs[1],
			imagesReplaced:
				document.querySelectorAll(
					"[data-nb-cover-fallback-fixture] img[data-nb-cover]",
				).length === 0,
		};
	});
	check(
		"真实 data-nb-cover='' 图片错误替换为确定性 SVG",
		coverFallbackReady &&
			coverFallbackState.ready &&
			coverFallbackState.sameIdDeterministic &&
			coverFallbackState.imagesReplaced,
		JSON.stringify(coverFallbackState),
	);
	await page.evaluate(() => {
		document
			.querySelectorAll("[data-nb-cover-fallback-fixture]")
			.forEach((node) => node.remove());
	});
	// 书库数据失败后必须显示重试，且重试会解除错误初始化守卫并恢复渲染。
	const retryPage = await context.newPage();
	let failOnce = true;
	await retryPage.route("**/books/data.json", async (route) => {
		if (failOnce) {
			failOnce = false;
			await route.fulfill({
				status: 503,
				contentType: "application/json",
				body: JSON.stringify({ error: "smoke" }),
			});
			return;
		}
		await route.continue();
	});
	await retryPage.goto(archiveUrl, { waitUntil: "domcontentloaded" });
	await retryPage.waitForSelector("[data-nb-archive-error]", {
		timeout: 5000,
	});
	check(
		"书库失败显示可操作重试",
		(await retryPage.locator("[data-nb-archive-retry]").count()) === 1,
	);
	await retryPage.click("[data-nb-archive-retry]");
	await retryPage.waitForSelector("#nb-archive-grid li", { timeout: 5000 });
	check(
		"书库重试解除错误守卫并恢复数据",
		(await retryPage.locator("#nb-archive-grid li").count()) === 12,
	);
	await retryPage.close();

	// 六字段搜索：description 词 + recommendationReason 词（比原型多出的两字段，决策 #3）
	const searchAndCount = async (word) => {
		await page.fill("#nb-search-input", word);
		await page.waitForFunction(
			(w) =>
				(
					document.querySelector("#nb-result-line")?.textContent ?? ""
				).includes("符合条件"),
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
	check(
		"搜索命中 recommendationReason 字段",
		byReason.count >= 1,
		byReason.line ?? "",
	);
	check("搜索后 URL 写回 ?q=", page.url().includes("q="), page.url());

	// ?tag= 直达 + 与搜索叠加（马尔克斯两本的公共标签是「文学」）
	await page.goto(`${archiveUrl}?tag=${encodeURIComponent("科幻")}`, {
		waitUntil: "domcontentloaded",
	});
	await page.waitForSelector("#nb-archive-grid li", { timeout: 15000 });
	const tagCount = await page.locator("#nb-archive-grid li").count();
	check("?tag= 直达筛选", tagCount === 1, `科幻=${tagCount} 本`);
	// 选中药丸必须是墨底反白（bg-transparent 与 bg-nb-ink 同存会被 Tailwind 源顺序覆盖 → 视觉空白）
	const selectedPill = await page.evaluate(() => {
		const b = Array.from(
			document.querySelectorAll("#nb-tag-filter button"),
		).find((x) => x.getAttribute("data-tag") === "科幻");
		const s = b ? getComputedStyle(b) : null;
		return s
			? {
					color: s.color,
					bg: s.backgroundColor,
					ariaPressed: b?.getAttribute("aria-pressed"),
				}
			: null;
	});
	check(
		"选中药丸墨底反白",
		selectedPill?.bg === "rgb(45, 40, 32)" &&
			selectedPill?.color === "rgb(245, 240, 228)" &&
			selectedPill?.ariaPressed === "true",
		JSON.stringify(selectedPill),
	);
	await page.goto(`${archiveUrl}?tag=${encodeURIComponent("文学")}`, {
		waitUntil: "domcontentloaded",
	});
	await page.waitForSelector("#nb-archive-grid li", { timeout: 15000 });
	await page.locator('#nb-tag-filter button[data-tag="文学"]').focus();
	await page.keyboard.press("Enter");
	const tagKeyboardState = await page.evaluate(() => {
		const button = document.activeElement;
		return {
			focused: button?.getAttribute("data-tag") === "文学",
			ariaPressed: button?.getAttribute("aria-pressed"),
		};
	});
	await page.fill("#nb-search-input", "马尔克斯");
	await page.waitForFunction(
		() =>
			(
				document.querySelector("#nb-result-line")?.textContent ?? ""
			).includes("符合条件 2 本"),
		null,
		{ timeout: 3000 },
	);
	check(
		"标签与搜索叠加为 AND",
		(await page.locator("#nb-archive-grid li").count()) === 2 &&
			tagKeyboardState.focused &&
			tagKeyboardState.ariaPressed === "true",
		JSON.stringify(tagKeyboardState),
	);

	// 双视图切换
	await page.click("#nb-view-list");
	await page.waitForSelector("#nb-archive-list li", { timeout: 3000 });
	check(
		"列表视图激活且书架隐藏",
		(await page.locator("#nb-archive-list").isVisible()) === true &&
			(await page.locator("#nb-archive-grid").isVisible()) === false,
	);
	check(
		"视图切换 aria-pressed 同步",
		(await page.getAttribute("#nb-view-list", "aria-pressed")) === "true" &&
			(await page.getAttribute("#nb-view-grid", "aria-pressed")) ===
				"false",
	);
	await page.click("#nb-view-grid");
	await page.waitForSelector("#nb-archive-grid li", { timeout: 3000 });

	// 载入更多 / 收起：按钮是异步交互，首次点击必须先进入可感知 loading。
	await page.goto(archiveUrl, { waitUntil: "domcontentloaded" });
	await page.waitForSelector("#nb-archive-grid li", { timeout: 15000 });
	const archiveLoadButton = () =>
		page.locator("#nb-btn-more:visible, #nb-btn-collapse:visible").first();
	const dispatchArchiveLoad = () =>
		page.evaluate(() => {
			const button = document.querySelector(
				"#nb-btn-more:not([hidden]), #nb-btn-collapse:not([hidden])",
			);
			button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
			return button
				? {
						disabled: button.disabled,
						busy: button.getAttribute("aria-busy"),
						label: button.textContent?.trim() ?? "",
					}
				: null;
		});
	const initialLoad = await page.evaluate(() => {
		const button = document.querySelector(
			"#nb-btn-more:not([hidden]), #nb-btn-collapse:not([hidden])",
		);
		button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
		const state = button
			? {
					disabled: button.disabled,
					busy: button.getAttribute("aria-busy"),
					label: button.textContent?.trim() ?? "",
					count: document.querySelectorAll("#nb-archive-grid li")
						.length,
				}
			: null;
		// Dispatch synchronously against the same trigger so the test observes
		// the actionBusy guard instead of accidentally clicking the post-load
		// collapse control after the zero-delay task has rendered.
		button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
		return state;
	});
	check(
		"书库首次载入期间显示 disabled + aria-busy + 载入中",
		initialLoad?.disabled === true &&
			initialLoad.busy === "true" &&
			initialLoad.label.includes("加载中"),
		JSON.stringify(initialLoad),
	);
	// loading 期间的重复点击不得并发追加或跳过中间状态。
	check(
		"书库载入中重复点击不提前追加书目",
		initialLoad?.count === 12,
		JSON.stringify(initialLoad),
	);
	await page.waitForFunction(
		() => document.querySelectorAll("#nb-archive-grid li").length > 12,
		null,
		{ timeout: 5000 },
	);
	await page.waitForFunction(
		() =>
			!document.querySelector(
				"#nb-btn-more[aria-busy], #nb-btn-collapse[aria-busy]",
			),
		null,
		{ timeout: 5000 },
	);
	// 反复点击直到现有 22 本 fixture 全部出现，每次推进由 LOAD_STEP=10 控制。
	for (let attempt = 0; attempt < 4; attempt += 1) {
		if ((await page.locator("#nb-archive-grid li").count()) === 22) break;
		const button = archiveLoadButton();
		if (!(await button.count()) || !(await button.isVisible())) break;
		const state = await dispatchArchiveLoad();
		check(
			`书库第 ${attempt + 2} 次载入有 loading 状态`,
			state?.disabled === true &&
				state.busy === "true" &&
				state.label.includes("加载中"),
			JSON.stringify(state),
		);
		await page.waitForFunction(
			() =>
				!document.querySelector(
					"#nb-btn-more[aria-busy], #nb-btn-collapse[aria-busy]",
				),
			null,
			{ timeout: 5000 },
		);
	}
	await page.waitForFunction(
		() => document.querySelectorAll("#nb-archive-grid li").length === 22,
		null,
		{ timeout: 3000 },
	);
	check(
		"重复载入补足全量 22 本",
		(await page.locator("#nb-archive-grid li").count()) === 22,
	);
	check(
		"到底结语显示",
		((await page.textContent("#nb-the-end")) ?? "").includes(
			"已经到底啦 · 共 22 本",
		),
	);
	const collapse = page.locator("#nb-btn-collapse:visible");
	check(
		"全量后显示收起控件",
		(await collapse.count()) === 1 &&
			(await collapse.textContent())?.includes("收起") === true,
	);
	const collapseState = await page.evaluate(() => {
		const button = document.querySelector("#nb-btn-collapse:not([hidden])");
		button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
		return button
			? {
					disabled: button.disabled,
					busy: button.getAttribute("aria-busy"),
					label: button.textContent?.trim() ?? "",
				}
			: null;
	});
	check(
		"收起期间同样显示 disabled + aria-busy + 加载中",
		collapseState?.disabled === true &&
			collapseState.busy === "true" &&
			collapseState.label.includes("加载中"),
		JSON.stringify(collapseState),
	);
	await page.waitForFunction(
		() =>
			document.querySelectorAll("#nb-archive-grid li").length === 12 &&
			!document.querySelector("#nb-btn-collapse[aria-busy]"),
		null,
		{ timeout: 5000 },
	);
	check(
		"收起后恢复默认 12 本",
		(await page.locator("#nb-archive-grid li").count()) === 12,
	);
	const expandAgain = archiveLoadButton();
	check(
		"收起后重新显示载入更多",
		(await expandAgain.count()) === 1 &&
			(await expandAgain.textContent())?.includes("载入") === true,
	);
	await expandAgain.click();
	await page.waitForFunction(
		() => document.querySelectorAll("#nb-archive-grid li").length > 12,
		null,
		{ timeout: 5000 },
	);
	while ((await page.locator("#nb-archive-grid li").count()) < 22) {
		const more = archiveLoadButton();
		if (!(await more.count()) || !(await more.isVisible())) break;
		await more.click();
		await page.waitForFunction(
			() =>
				!document.querySelector(
					"#nb-btn-more[aria-busy], #nb-btn-collapse[aria-busy]",
				),
			null,
			{ timeout: 5000 },
		);
	}
	check(
		"重新展开再次到达全量 22 本",
		(await page.locator("#nb-archive-grid li").count()) === 22,
	);
	check(
		"重新展开后收起控件再次可用",
		(await page.locator("#nb-btn-collapse:visible").count()) === 1,
	);

	// 15 本筛选结果验证单次最多追加 10 本：初始 12 本，点击后只补齐剩余 3 本。
	await page.fill("#nb-search-input", "小说");
	await page.waitForFunction(
		() =>
			(
				document.querySelector("#nb-result-line")?.textContent ?? ""
			).includes("符合条件 15 本"),
		null,
		{ timeout: 3000 },
	);
	check(
		"筛选结果载入前保留默认 12 本",
		(await page.locator("#nb-archive-grid li").count()) === 12,
	);
	const filteredLoad = await dispatchArchiveLoad();
	check(
		"筛选结果载入期间仍显示 loading",
		filteredLoad?.disabled === true &&
			filteredLoad.busy === "true" &&
			filteredLoad.label.includes("加载中"),
		JSON.stringify(filteredLoad),
	);
	await page.waitForFunction(
		() =>
			document.querySelectorAll("#nb-archive-grid li").length === 15 &&
			!document.querySelector("#nb-btn-more[aria-busy]"),
		null,
		{ timeout: 5000 },
	);
	check(
		"单次载入最多追加 10 本并补齐 15 本筛选结果",
		(await page.locator("#nb-archive-grid li").count()) === 15 &&
			(await page.locator("#nb-btn-collapse:visible").count()) === 1,
	);

	// 空状态与清除
	await page.fill("#nb-search-input", "不存在的书名XYZ");
	await page.waitForSelector("#nb-empty-state:not([hidden])", {
		timeout: 3000,
	});
	check("空状态显示", await page.locator("#nb-empty-state").isVisible());
	await page.click("#nb-btn-clear");
	await page.waitForFunction(
		() => document.querySelectorAll("#nb-archive-grid li").length === 12,
		null,
		{ timeout: 3000 },
	);
	check(
		"清除后恢复全量分页",
		(await page.inputValue("#nb-search-input")) === "",
	);

	// 「/」快捷键聚焦
	await page.keyboard.press("/");
	const focused = await page.evaluate(
		() => document.activeElement?.id === "nb-search-input",
	);
	check("「/」快捷键聚焦搜索框", focused);

	// --- 详情 /books/:id/ ---
	await page.goto(new URL("/books/01/", baseUrl).href, {
		waitUntil: "domcontentloaded",
	});
	await page.waitForSelector("article .detail-title, article h1", {
		timeout: 15000,
	});
	check(
		"详情页 title 格式",
		(await page.title()) === "《百年孤独》 · Nice Books 每日好书",
		await page.title(),
	);
	check(
		"详情页 h1 渲染书名",
		((await page.textContent("article h1")) ?? "").trim() === "百年孤独",
	);
	const bodyText = await page.evaluate(
		() => document.querySelector("main")?.textContent ?? "",
	);
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
	const canonical = await page
		.locator('link[rel="canonical"]')
		.getAttribute("href");
	const ogTitle = await page
		.locator('meta[property="og:title"]')
		.getAttribute("content");
	check(
		"详情页 canonical/og 齐备",
		canonical?.endsWith("/books/01/") === true &&
			ogTitle === "《百年孤独》 · Nice Books 每日好书",
		`canonical=${canonical}`,
	);
	const shelfHrefs = await page.evaluate(() =>
		Array.from(
			document.querySelectorAll(
				'section[aria-labelledby="nb-related-title"] a[href^="/books/"]',
			),
		).map((a) => a.getAttribute("href")),
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
	check(
		"标签可点回书库带参",
		(await page.locator('dl a[href^="/books/archive/?tag="]').count()) > 0,
	);

	check(
		"全程无 console/page 错误",
		errors.length === 0,
		errors.join(" | ").slice(0, 300),
	);

	// 404 验证置于错误断言之后：预期的 404 响应不应计入错误
	const resp404 = await page.goto(new URL("/books/99/", baseUrl).href, {
		waitUntil: "domcontentloaded",
	});
	check(
		"无效 id 落站级 404",
		resp404?.status() === 404,
		`status=${resp404?.status()}`,
	);

	// --- swup 切页链路（主提示词 §39）---
	await page.goto(archiveUrl, { waitUntil: "domcontentloaded" });
	await page.waitForSelector("#nb-archive-grid li", { timeout: 15000 });
	await page.evaluate(() => {
		window.__nbMarker = "alive"; // 整页刷新会丢失此标记
	});
	// loadOnIdle：swup 在页面空闲后才初始化（@swup/astro 默认行为，与主站一致）；
	// 等待就绪再断言，超时即真问题。未就绪窗口内点击链接无害降级为整页加载。
	await page
		.waitForFunction(() => typeof window.swup !== "undefined", null, {
			timeout: 10000,
		})
		.catch(() => {});
	check(
		"swup 全局实例在 books 页面就绪",
		await page.evaluate(() => typeof window.swup !== "undefined"),
	);

	await page.click("#nb-archive-grid li a");
	await page.waitForURL(/\/books\/\d+\//, { timeout: 8000 });
	await page.waitForSelector("article h1", { timeout: 8000 });
	check(
		"书库→详情经 swup（无整页刷新）",
		await page.evaluate(() => window.__nbMarker === "alive"),
	);
	check(
		"详情内容已被 swup 替换",
		(await page.textContent("article h1"))?.length > 0,
	);

	await page.click('a[href="/books/archive/"]');
	await page.waitForURL(/\/books\/archive\//, { timeout: 8000 });
	await page.waitForSelector("#nb-archive-grid li", { timeout: 8000 });
	await page.fill("#nb-search-input", "鲁迅");
	await page.waitForFunction(
		() =>
			(
				document.querySelector("#nb-result-line")?.textContent ?? ""
			).includes("符合条件"),
		null,
		{ timeout: 4000 },
	);
	check(
		"swup 返回书库后搜索仍可用（脚本重跑正常）",
		(await page.locator("#nb-archive-grid li").count()) >= 1,
	);

	await page.goBack();
	await page.waitForURL(/\/books\/\d+\//, { timeout: 8000 });
	await page.waitForSelector("article h1", { timeout: 8000 });
	check(
		"浏览器后退经 swup 恢复详情",
		await page.evaluate(() => window.__nbMarker === "alive"),
	);

	// 重复进入后换一换无重复绑定（计数应严格 +1）
	await page.goto(new URL("/books/", baseUrl).href, {
		waitUntil: "domcontentloaded",
	});
	await page.waitForSelector("#nb-hero .hero-title a", { timeout: 15000 });
	await page.click("#nb-today-shuffle");
	await page.waitForFunction(
		() =>
			(document.querySelector("#nb-hero")?.textContent ?? "").includes(
				"本次已换 1 次",
			),
		null,
		{ timeout: 5000 },
	);
	check("重复进入后换一换计数严格为 1（无重复绑定）", true);

	// --- swup 首次进入书库 + 搜索按钮（2026-09-06 书库空数据事故回归）---
	await page.goto(new URL("/books/", baseUrl).href, {
		waitUntil: "domcontentloaded",
	});
	await page.waitForSelector("#nb-hero .nb-book3d", { timeout: 15000 });
	await page.click('header a[href="/books/archive/"]');
	await page.waitForURL(/archive/, { timeout: 8000 });
	await page.waitForSelector("#nb-archive-grid li", { timeout: 10000 });
	check(
		"swup 首次进入书库即渲染书目（共享 main.ts 入口）",
		(await page.locator("#nb-archive-grid li").count()) === 12,
	);
	// swup 切页后页眉高亮应立刻迁移到「书库」（页眉在容器外，靠 syncHeaderNav 重算）
	await page.waitForTimeout(400);
	const navAfterSwup = await page.evaluate(() => {
		const a = document.querySelector(
			'nav[aria-label="站内导航"] a[aria-current="page"]',
		);
		const label = a?.querySelector(".nb-site-nav-label");
		return a
			? {
					label: a.textContent.trim(),
					border: label
						? getComputedStyle(label).borderBottomColor
						: null,
				}
			: null;
	});
	check(
		"swup 切页后高亮立即迁移（书库墨字+红下划线）",
		navAfterSwup?.label === "书库" &&
			navAfterSwup.border === "rgb(168, 67, 60)",
		JSON.stringify(navAfterSwup),
	);
	await page.fill("#nb-search-input", "鲁迅");
	await page.click("#nb-search-btn");
	await page.waitForFunction(
		() =>
			(
				document.querySelector("#nb-result-line")?.textContent ?? ""
			).includes("符合条件"),
		null,
		{ timeout: 4000 },
	);
	check(
		"搜索按钮立即过滤",
		(await page.locator("#nb-archive-grid li").count()) === 1,
	);
	// 搜索后 goBack 链路（replaceState 不得抹掉 swup history state）
	await page.click("#nb-archive-grid li a");
	await page.waitForURL(/books\/\d+\//, { timeout: 8000 });
	await page.waitForSelector("article h1", { timeout: 8000 });
	await page.goBack();
	await page.waitForSelector("#nb-archive-grid li", { timeout: 10000 });
	check(
		"搜索后 goBack 回书库仍渲染书目",
		(await page.locator("#nb-archive-grid li").count()) === 12,
	);

	console.log(
		`外部 CDN 失败 ${externalFailures.length} 项（jsDelivr 字体，本机网络抖动，不计 FAIL）`,
	);
} finally {
	await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(
	`\n${results.length - failed.length}/${results.length} checks passed`,
);
process.exit(failed.length > 0 ? 1 : 0);
