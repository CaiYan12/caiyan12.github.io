// Mobile/Swup weather acceptance. Run after `pnpm build` and `pnpm preview --port 4322`.
// MOBILE_WEATHER_BASE_URL is the site root, for example http://localhost:4322.
// 天气单源：脚本只桩 https://wttr.in/**（成功 / abort / 永不落地的 hang 三种模式），
// 已删除的本地和风代理（127.0.0.1:8787）只作为「不该再出现」的负扫对象挂着。
import { makeHarness } from "./lib/smoke-harness.mjs";

const harness = makeHarness({
	envVar: "MOBILE_WEATHER_BASE_URL",
	defaultBase: "http://localhost:4322",
	isNoise: ({ url, base, text }) =>
		(!!url && !url.startsWith(base)) ||
		(text === "Failed to load resource: net::ERR_FAILED" &&
			url.includes("/weather/sidebar-widget.js")),
});
const { base, check } = harness;
const browser = await harness.browser.launch(harness.launch);
const contexts = [];
const WTTR_PATTERN = "https://wttr.in/**";
const WTTR_SOURCE_SELECTOR = '[data-weather-source][href="https://wttr.in/"]';
// 单源之后，本地和风代理与 qweather 域名都不该再出现在网络层。
const REMOVED_SOURCE_RE = /127\.0\.0\.1:8787|qweather/iu;

function wttrRequestUrl(lat = "39.9", lon = "116.4") {
	return `https://wttr.in/${lat},${lon}?format=j1&lang=zh`;
}

// 浏览器可能对路径里的逗号做百分号编码，比对前统一还原成服务拼出的那条地址。
function normalizedWttrUrl(url) {
	const parsed = new URL(url);
	return `${parsed.origin}${decodeURIComponent(parsed.pathname)}${parsed.search}`;
}

// wttr.in 的 ?format=j1 载荷（北京、晴、24°C），对应服务的规范化结果
// {cityName:"Beijing", temperatureC:24, condition:"晴", icon:"☀️", source:"wttr.in"}。
function wttrFixture() {
	return {
		nearest_area: [{ areaName: [{ value: "Beijing" }] }],
		current_condition: [
			{
				temp_C: "24",
				weatherCode: "113",
				weatherDesc: [{ value: "Clear" }],
				lang_zh: [{ value: "晴" }],
			},
		],
	};
}

function siteUrl(path) {
	return new URL(path, `${base.replace(/\/+$/u, "")}/`).href;
}

async function createPage({ width, touch = false, javascript = true } = {}) {
	const context = await browser.newContext({
		viewport: { width, height: 900 },
		isMobile: touch,
		hasTouch: touch,
		javaScriptEnabled: javascript,
	});
	contexts.push(context);
	return { context, page: harness.attach(await context.newPage()) };
}

async function setupLocation(page) {
	await page.addInitScript(() => {
		const geolocationKey = "__mobileWeatherGeolocationCount";
		Object.defineProperty(navigator, "geolocation", {
			configurable: true,
			value: {
				getCurrentPosition(success, _error, options) {
					const count =
						Number(sessionStorage.getItem(geolocationKey) ?? "0") +
						1;
					sessionStorage.setItem(geolocationKey, String(count));
					window.__weatherGeolocationOptions ??= [];
					window.__weatherGeolocationOptions.push(options);
					queueMicrotask(() =>
						success({
							coords: { latitude: 39.9042, longitude: 116.4074 },
						}),
					);
				},
			},
		});
	});
}

async function routeWeather(page) {
	const calls = [];
	const strayCalls = [];
	let failure = null;

	page.on("request", (request) => {
		if (REMOVED_SOURCE_RE.test(request.url()))
			strayCalls.push(request.url());
	});

	await page.route(WTTR_PATTERN, async (route) => {
		const request = route.request();
		calls.push({
			url: request.url(),
			method: request.method(),
			at: Date.now(),
		});
		// "hang" 让请求永不落地，交给服务自己的 8 秒截止；"abort" 让它立刻失败。
		if (failure === "hang") return;
		if (failure === "abort") {
			await route.abort();
			return;
		}
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify(wttrFixture()),
		});
	});

	return {
		calls,
		strayCalls,
		setFailure(mode) {
			if (mode !== null && mode !== "abort" && mode !== "hang") {
				throw new Error(`unsupported failure mode: ${mode}`);
			}
			failure = mode;
		},
	};
}

async function setupWeather(page) {
	const requests = await routeWeather(page);
	await setupLocation(page);
	return requests;
}

async function visibleWidgetMetrics(page) {
	return page.locator("[data-weather-widget]").evaluateAll((cards) => {
		const visible = cards.filter((card) => {
			const rect = card.closest(".widget")?.getBoundingClientRect();
			return Boolean(rect && rect.width > 0 && rect.height > 0);
		});
		return {
			domCount: cards.length,
			visibleCount: visible.length,
			visible: visible.map((card) => {
				const widget = card.closest(".widget");
				const rect = widget.getBoundingClientRect();
				return {
					x: rect.x,
					width: rect.width,
					right: rect.right,
					parent:
						widget.parentElement?.id ||
						widget.parentElement?.className,
					state: card.dataset.weatherState,
				};
			}),
			textOverflow: visible.flatMap((card) =>
				[...card.querySelectorAll(".weather-widget__source-line")]
					.filter((node) => node.scrollWidth > node.clientWidth + 1)
					.map((node) => ({
						text: node.textContent,
						clientWidth: node.clientWidth,
						scrollWidth: node.scrollWidth,
					})),
			),
			viewportWidth: document.documentElement.clientWidth,
			documentWidth: document.documentElement.scrollWidth,
		};
	});
}

async function weatherControlMounts(page) {
	return page.evaluate(() => {
		const visibleCards = [
			...document.querySelectorAll("[data-weather-widget]"),
		].filter((card) => {
			const rect = card.closest(".widget")?.getBoundingClientRect();
			return Boolean(rect && rect.width > 0 && rect.height > 0);
		});
		const visibleMount = visibleCards[0]?.closest(".mobile-weather-slot")
			? "mobile"
			: visibleCards[0]?.closest("#sidebar")
				? "sidebar"
				: null;
		const focusableMounts = [
			...document.querySelectorAll(
				"[data-weather-refresh], [data-weather-retry]",
			),
		]
			.filter(
				(control) =>
					control.tabIndex >= 0 &&
					!control.disabled &&
					control.getClientRects().length > 0,
			)
			.map((control) => {
				const widget = control.closest(".widget");
				return widget?.closest(".mobile-weather-slot")
					? "mobile"
					: widget?.closest("#sidebar")
						? "sidebar"
						: null;
			});
		return { visibleMount, focusableMounts };
	});
}

try {
	const mobile = await createPage({ width: 390, touch: true });
	const mobileRequests = await setupWeather(mobile.page);
	await mobile.page.goto(siteUrl("/"), { waitUntil: "load" });
	await mobile.page
		.waitForFunction(
			() => {
				const cards = [
					...document.querySelectorAll("[data-weather-widget]"),
				];
				return (
					cards.length === 2 &&
					cards.every(
						(card) => card.dataset.weatherState === "success",
					)
				);
			},
			undefined,
			{ timeout: 5000 },
		)
		.catch(() => {});

	for (const width of [390, 768]) {
		let page = mobile.page;
		let context = mobile.context;
		if (width === 768) {
			({ context, page } = await createPage({ width }));
			await setupWeather(page);
		}
		if (width === 768) {
			await page.goto(siteUrl("/"), { waitUntil: "load" });
			await page.waitForFunction(
				() =>
					[...document.querySelectorAll("[data-weather-widget]")]
						.length === 2 &&
					[
						...document.querySelectorAll("[data-weather-widget]"),
					].every((card) => card.dataset.weatherState === "success"),
				undefined,
				{ timeout: 10000 },
			);
		}
		const metrics = await visibleWidgetMetrics(page);
		check(
			`${width}px 显示一个位于主内容前的天气胶囊`,
			metrics.domCount === 2 &&
				metrics.visibleCount === 1 &&
				metrics.visible[0]?.parent !== "sidebar",
			JSON.stringify(metrics),
		);
		check(
			`${width}px 天气卡不引起横向溢出或内容裁切`,
			metrics.documentWidth <= metrics.viewportWidth &&
				metrics.textOverflow.length === 0 &&
				metrics.visible[0]?.x >= 0 &&
				metrics.visible[0]?.right <= metrics.viewportWidth + 1,
			JSON.stringify(metrics),
		);
		const focusMounts = await weatherControlMounts(page);
		check(
			`${width}px 天气控制项的 Tab 停靠只来自可见挂载点`,
			focusMounts.focusableMounts.length === 1 &&
				focusMounts.focusableMounts[0] === focusMounts.visibleMount &&
				focusMounts.visibleMount === "mobile",
			JSON.stringify(focusMounts),
		);
		if (width !== 390) {
			await context.close();
			contexts.splice(contexts.indexOf(context), 1);
		}
	}

	const desktop = await createPage({ width: 769 });
	await setupWeather(desktop.page);
	await desktop.page.goto(siteUrl("/"), { waitUntil: "load" });
	await desktop.page.waitForFunction(
		() =>
			[...document.querySelectorAll("[data-weather-widget]")].length ===
				2 &&
			[...document.querySelectorAll("[data-weather-widget]")].every(
				(card) => card.dataset.weatherState === "success",
			),
		undefined,
		{ timeout: 10000 },
	);
	let metrics = await visibleWidgetMetrics(desktop.page);
	const overflowWithWeather = metrics.documentWidth;
	const overflowWithoutWeather = await desktop.page.evaluate(() => {
		const slot = document.querySelector(".mobile-weather-slot");
		const sidebarCard = document.querySelector(
			"#sidebar > .widget:has([data-weather-widget])",
		);
		slot?.style.setProperty("display", "none", "important");
		sidebarCard?.style.setProperty("display", "none", "important");
		const width = document.documentElement.scrollWidth;
		slot?.style.removeProperty("display");
		slot?.style.removeProperty("important");
		sidebarCard?.style.removeProperty("display");
		sidebarCard?.style.removeProperty("important");
		return width;
	});
	check(
		"769px 只在侧栏显示一个天气胶囊",
		metrics.domCount === 2 &&
			metrics.visibleCount === 1 &&
			metrics.visible[0]?.parent === "sidebar" &&
			metrics.textOverflow.length === 0,
		JSON.stringify(metrics),
	);
	const desktopFocusMounts = await weatherControlMounts(desktop.page);
	check(
		"769px 天气控制项的 Tab 停靠只来自可见挂载点",
		desktopFocusMounts.focusableMounts.length === 1 &&
			desktopFocusMounts.focusableMounts[0] ===
				desktopFocusMounts.visibleMount &&
			desktopFocusMounts.visibleMount === "sidebar",
		JSON.stringify(desktopFocusMounts),
	);
	check(
		"769px 横向宽度不由天气挂载点增加",
		overflowWithWeather === overflowWithoutWeather,
		JSON.stringify({ overflowWithWeather, overflowWithoutWeather }),
	);
	await desktop.context.close();
	contexts.splice(contexts.indexOf(desktop.context), 1);

	const wide = await createPage({ width: 1440 });
	await setupWeather(wide.page);
	await wide.page.goto(siteUrl("/"), { waitUntil: "load" });
	await wide.page.waitForFunction(
		() =>
			[...document.querySelectorAll("[data-weather-widget]")].length ===
				2 &&
			[...document.querySelectorAll("[data-weather-widget]")].every(
				(card) => card.dataset.weatherState === "success",
			),
		undefined,
		{ timeout: 10000 },
	);
	metrics = await visibleWidgetMetrics(wide.page);
	check(
		"1440px 只在侧栏显示一个天气胶囊",
		metrics.domCount === 2 &&
			metrics.visibleCount === 1 &&
			metrics.visible[0]?.parent === "sidebar" &&
			metrics.textOverflow.length === 0,
		JSON.stringify(metrics),
	);
	await wide.context.close();
	contexts.splice(contexts.indexOf(wide.context), 1);

	const mountState = await mobile.page
		.locator("[data-weather-widget]")
		.evaluateAll((cards) =>
			cards.map((card) => ({
				state: card.dataset.weatherState,
				city: card.querySelector("[data-weather-city]")?.textContent,
				temperature: card.querySelector("[data-weather-temperature]")
					?.textContent,
				description: card.querySelector("[data-weather-description]")
					?.textContent,
				iconKind: card.querySelector("[data-weather-icon]")?.dataset
					.weatherKind,
				source: card.querySelector("[data-weather-source]")
					?.textContent,
				sourceLinks: card.querySelectorAll(
					".weather-widget__source-line a",
				).length,
				attributionNodes: card.querySelectorAll(
					"[data-weather-attribution], .weather-widget__attributions",
				).length,
				staleHidden: card.querySelector("[data-weather-stale]")?.hidden,
				role: card
					.querySelector("[data-weather-status]")
					?.getAttribute("role"),
				live: card
					.querySelector("[data-weather-status]")
					?.getAttribute("aria-live"),
				iconHidden: card
					.querySelector("[data-weather-icon]")
					?.getAttribute("aria-hidden"),
			})),
		);
	const sourceAnchors = await mobile.page
		.locator(WTTR_SOURCE_SELECTOR)
		.count();
	check(
		"两个挂载点同步状态、地点、wttr.in 来源和可访问状态",
		mountState.length === 2 &&
			sourceAnchors === 2 &&
			mountState.every(
				(item) =>
					item.state === "success" &&
					item.city === "附近：Beijing" &&
					item.temperature === "24°C" &&
					item.description === "晴" &&
					item.iconKind === "clear" &&
					item.source === "wttr.in" &&
					item.sourceLinks === 1 &&
					item.attributionNodes === 0 &&
					item.staleHidden === true &&
					item.role === "status" &&
					item.live === "polite" &&
					item.iconHidden === "true",
			),
		JSON.stringify({ sourceAnchors, mountState }),
	);
	const sessionWeather = await mobile.page.evaluate(
		() => window.WeatherSidebarWidget?.state?.weather ?? null,
	);
	check(
		"会话共享的规范化结果就是 wttr.in 单源的值（Beijing 24°C 晴 ☀️，且无 attributions 字段）",
		sessionWeather?.cityName === "Beijing" &&
			sessionWeather?.temperatureC === 24 &&
			sessionWeather?.condition === "晴" &&
			sessionWeather?.description === "晴" &&
			sessionWeather?.conditionCode === "113" &&
			sessionWeather?.icon === "☀️" &&
			sessionWeather?.source === "wttr.in" &&
			sessionWeather?.sourceUrl === "https://wttr.in" &&
			sessionWeather?.stale === false &&
			sessionWeather?.attributions === undefined,
		JSON.stringify(sessionWeather),
	);
	const firstCall = mobileRequests.calls[0];
	const firstUrl = firstCall ? new URL(firstCall.url) : null;
	const firstLocationCount = await mobile.page.evaluate(() =>
		sessionStorage.getItem("__mobileWeatherGeolocationCount"),
	);
	check(
		"首屏只定位一次、只发一条 wttr.in GET 请求，坐标粗化到一位小数",
		firstLocationCount === "1" &&
			mobileRequests.calls.length === 1 &&
			Boolean(firstUrl) &&
			firstUrl.origin === "https://wttr.in" &&
			decodeURIComponent(firstUrl.pathname) === "/39.9,116.4" &&
			firstUrl.searchParams.get("format") === "j1" &&
			firstUrl.searchParams.get("lang") === "zh" &&
			firstCall.method === "GET" &&
			mobileRequests.strayCalls.length === 0,
		JSON.stringify({
			locationCount: firstLocationCount,
			calls: mobileRequests.calls,
			stray: mobileRequests.strayCalls,
		}),
	);

	const homeBand = await mobile.page
		.locator("#content .post-list")
		.first()
		.evaluate((card) => ({
			childIndex: [...card.parentElement.children].indexOf(card) + 1,
			color: getComputedStyle(card, "::after").backgroundColor,
		}))
		.catch(() => null);
	check(
		"天气卡位于 #content 外，首页首篇文章卡色带维持原位",
		Boolean(homeBand) &&
			!(await mobile.page
				.locator("#content [data-weather-widget]")
				.count()) &&
			homeBand.childIndex === 3 &&
			homeBand.color === "rgb(255, 215, 0)",
		JSON.stringify(homeBand),
	);

	const articleLink = mobile.page
		.locator('#content .post-list a[href^="/posts/"]:visible')
		.first();
	const articlePath = await articleLink.getAttribute("href");
	await articleLink.click();
	await mobile.page.waitForFunction(
		(path) => location.pathname === path,
		articlePath,
		{ timeout: 10000 },
	);
	await mobile.page.waitForFunction(
		() =>
			[...document.querySelectorAll("[data-weather-widget]")].length ===
				2 &&
			[...document.querySelectorAll("[data-weather-widget]")].every(
				(card) => card.dataset.weatherState === "success",
			),
	);
	check(
		"Swup 首页→文章保留两个响应式挂载点与天气成功态",
		(await visibleWidgetMetrics(mobile.page)).visibleCount === 1 &&
			(await mobile.page.evaluate(() =>
				sessionStorage.getItem("__mobileWeatherGeolocationCount"),
			)) === "1" &&
			mobileRequests.calls.length === 1,
	);
	await mobile.page.goBack();
	await mobile.page.waitForFunction(
		() => location.pathname === "/",
		undefined,
		{ timeout: 10000 },
	);
	check(
		"Swup 返回首页不重复定位或请求天气",
		(await visibleWidgetMetrics(mobile.page)).visibleCount === 1 &&
			(await mobile.page.evaluate(() =>
				sessionStorage.getItem("__mobileWeatherGeolocationCount"),
			)) === "1" &&
			mobileRequests.calls.length === 1,
	);

	const refresh = mobile.page.locator(
		".mobile-weather-slot [data-weather-refresh]",
	);
	let refreshFocusedByKeyboard = false;
	for (let i = 0; i < 120; i++) {
		await mobile.page.keyboard.press("Tab");
		if (
			await mobile.page.evaluate(() =>
				document.activeElement?.matches(
					".mobile-weather-slot [data-weather-refresh]",
				),
			)
		) {
			refreshFocusedByKeyboard = true;
			break;
		}
	}
	const refreshFocus = await refresh.evaluate((button) => ({
		visible: button.matches(":focus-visible"),
		outlineStyle: getComputedStyle(button).outlineStyle,
		outlineWidth: getComputedStyle(button).outlineWidth,
	}));
	check(
		"手机刷新按钮可在主内容前通过键盘聚焦",
		refreshFocusedByKeyboard &&
			refreshFocus.visible &&
			refreshFocus.outlineStyle !== "none" &&
			refreshFocus.outlineWidth !== "0px",
		JSON.stringify(refreshFocus),
	);
	mobileRequests.setFailure("abort");
	await mobile.page.keyboard.press("Enter");
	await mobile.page.waitForFunction(
		() =>
			[...document.querySelectorAll("[data-weather-widget]")].length ===
				2 &&
			[...document.querySelectorAll("[data-weather-widget]")].every(
				(card) => card.dataset.weatherState === "weather-error",
			),
	);
	const staleState = await mobile.page
		.locator("[data-weather-widget]")
		.evaluateAll(
			(cards, sourceSelector) =>
				cards.map((card) => ({
					status: card.querySelector("[data-weather-status]")
						?.textContent,
					stale: !card.querySelector("[data-weather-stale]")?.hidden,
					source: card.querySelector("[data-weather-source]")
						?.textContent,
					sourceAnchor: card.querySelectorAll(sourceSelector).length,
					attributionNodes: card.querySelectorAll(
						"[data-weather-attribution], .weather-widget__attributions",
					).length,
					refreshHidden: card
						.closest(".widget")
						?.querySelector("[data-weather-refresh]")?.hidden,
					refreshDisabled: card
						.closest(".widget")
						?.querySelector("[data-weather-refresh]")?.disabled,
					retryHidden: card.querySelector("[data-weather-retry]")
						?.hidden,
				})),
			WTTR_SOURCE_SELECTOR,
		);
	check(
		"刷新失败后两个挂载点一致保留旧数据标记与 wttr.in 来源",
		staleState.length === 2 &&
			staleState.every(
				(item) =>
					item.stale &&
					item.status === "天气更新失败" &&
					item.source === "wttr.in" &&
					item.sourceAnchor === 1 &&
					item.attributionNodes === 0 &&
					item.refreshHidden === true &&
					item.refreshDisabled === false &&
					item.retryHidden === false,
			) &&
			JSON.stringify(staleState[0]) === JSON.stringify(staleState[1]) &&
			mobileRequests.calls.length === 2 &&
			mobileRequests.calls[1].url === mobileRequests.calls[0].url &&
			mobileRequests.strayCalls.length === 0 &&
			(await mobile.page.evaluate(() =>
				sessionStorage.getItem("__mobileWeatherGeolocationCount"),
			)) === "1",
		JSON.stringify(staleState),
	);

	await mobile.page.emulateMedia({ reducedMotion: "reduce" });
	const reducedDuration = await mobile.page
		.locator(".mobile-weather-slot [data-weather-icon]")
		.evaluate((icon) => getComputedStyle(icon).animationDuration);
	check(
		"手机减少动态效果设置下天气图标运动减轻",
		Number.parseFloat(reducedDuration) >= 5,
		reducedDuration,
	);
	const mobileCard = mobile.page.locator(".mobile-weather-slot .widget");
	await mobileCard.hover();
	const touchHover = await mobileCard.evaluate((card) => ({
		transform: getComputedStyle(card.querySelector("[data-weather-icon]"))
			.transform,
		hoverMedia: matchMedia("(hover: hover)").matches,
		pointerMedia: matchMedia("(pointer: fine)").matches,
	}));
	check(
		"触屏设备的 hover 不触发精细指针图标增强",
		!touchHover.hoverMedia &&
			!touchHover.pointerMedia &&
			touchHover.transform === "none",
		JSON.stringify(touchHover),
	);

	mobileRequests.setFailure(null);
	await mobile.page.reload({ waitUntil: "load" });
	await mobile.page.waitForFunction(
		() =>
			[...document.querySelectorAll("[data-weather-widget]")].length ===
				2 &&
			[...document.querySelectorAll("[data-weather-widget]")].every(
				(card) => card.dataset.weatherState === "success",
			),
	);
	check(
		"整页刷新重新定位并以同一粗化坐标开始新的 wttr.in 请求",
		(await mobile.page.evaluate(() =>
			sessionStorage.getItem("__mobileWeatherGeolocationCount"),
		)) === "2" &&
			mobileRequests.calls.length === 3 &&
			normalizedWttrUrl(mobileRequests.calls[2].url) === wttrRequestUrl(),
		JSON.stringify(mobileRequests.calls),
	);

	const timeout = await createPage({ width: 390 });
	const timeoutRequests = await setupWeather(timeout.page);
	timeoutRequests.setFailure("hang");
	await timeout.page.goto(siteUrl("/"), { waitUntil: "load" });
	await timeout.page.waitForFunction(
		() =>
			[...document.querySelectorAll("[data-weather-widget]")].length ===
				2 &&
			[...document.querySelectorAll("[data-weather-widget]")].every(
				(card) => card.dataset.weatherState === "weather-loading",
			),
		undefined,
		{ timeout: 10000 },
	);
	const inFlight = {
		calls: timeoutRequests.calls.length,
		status: await timeout.page
			.locator(".mobile-weather-slot [data-weather-status]")
			.innerText(),
	};
	const hungHandle = await timeout.page.waitForFunction(
		() => {
			const cards = [
				...document.querySelectorAll("[data-weather-widget]"),
			];
			if (
				cards.length !== 2 ||
				!cards.every(
					(card) => card.dataset.weatherState === "weather-error",
				)
			) {
				return null;
			}
			return {
				status: cards[0].querySelector("[data-weather-status]")
					?.textContent,
				retryHidden: cards[0].querySelector("[data-weather-retry]")
					?.hidden,
				retryLabel: cards[0].querySelector("[data-weather-retry]")
					?.textContent,
				readingHidden: cards[0].querySelector("[data-weather-reading]")
					?.hidden,
				geolocationCount: sessionStorage.getItem(
					"__mobileWeatherGeolocationCount",
				),
			};
		},
		undefined,
		{ timeout: 20000 },
	);
	const hungState = await hungHandle.jsonValue();
	// 服务的 8 秒截止自请求发出起算；挂起桩永不落地，量到的是真实的等待时长。
	const hungMs = Date.now() - timeoutRequests.calls[0].at;
	check(
		"wttr.in 挂起时按单源 8 秒截止判失败（不再是双源的 12 秒）并留出重试",
		inFlight.calls === 1 &&
			inFlight.status === "正在更新天气" &&
			hungMs >= 7500 &&
			hungMs < 11000 &&
			timeoutRequests.calls.length === 1 &&
			hungState.status === "天气请求超时，请重试" &&
			hungState.retryHidden === false &&
			hungState.retryLabel === "重试获取附近天气" &&
			hungState.readingHidden === true &&
			hungState.geolocationCount === "1" &&
			timeoutRequests.strayCalls.length === 0,
		JSON.stringify({ hungMs, inFlight, hungState }),
	);
	timeoutRequests.setFailure(null);
	await timeout.page
		.locator(".mobile-weather-slot [data-weather-retry]")
		.click();
	await timeout.page.waitForFunction(
		() =>
			[...document.querySelectorAll("[data-weather-widget]")].length ===
				2 &&
			[...document.querySelectorAll("[data-weather-widget]")].every(
				(card) => card.dataset.weatherState === "success",
			),
		undefined,
		{ timeout: 10000 },
	);
	const afterRetry = await timeout.page
		.locator(".mobile-weather-slot [data-weather-widget]")
		.evaluate((card) => ({
			state: card.dataset.weatherState,
			city: card.querySelector("[data-weather-city]")?.textContent,
			temperature: card.querySelector("[data-weather-temperature]")
				?.textContent,
			staleHidden: card.querySelector("[data-weather-stale]")?.hidden,
			sourceAnchors: card.querySelectorAll(
				'[data-weather-source][href="https://wttr.in/"]',
			).length,
		}));
	check(
		"超时后点重试只在同一条 wttr.in 地址上重来且不重新定位",
		timeoutRequests.calls.length === 2 &&
			timeoutRequests.calls.every(
				(call) => normalizedWttrUrl(call.url) === wttrRequestUrl(),
			) &&
			(await timeout.page.evaluate(() =>
				sessionStorage.getItem("__mobileWeatherGeolocationCount"),
			)) === "1" &&
			timeoutRequests.strayCalls.length === 0 &&
			afterRetry.state === "success" &&
			afterRetry.city === "附近：Beijing" &&
			afterRetry.temperature === "24°C" &&
			afterRetry.staleHidden === true &&
			afterRetry.sourceAnchors === 1,
		JSON.stringify({ calls: timeoutRequests.calls, afterRetry }),
	);
	await timeout.context.close();
	contexts.splice(contexts.indexOf(timeout.context), 1);

	const noJs = await createPage({ width: 390, javascript: false });
	await noJs.page.goto(siteUrl("/"), { waitUntil: "load" });
	const noJsMetrics = await visibleWidgetMetrics(noJs.page);
	check(
		"禁用 JavaScript 时手机显示静态说明而非加载中",
		noJsMetrics.domCount === 2 &&
			noJsMetrics.visibleCount === 1 &&
			(await noJs.page
				.locator("[data-weather-widget]:visible [data-weather-info]")
				.innerText()) === "启用 JavaScript 后可查看附近天气",
		JSON.stringify(noJsMetrics),
	);
	await noJs.context.close();
	contexts.splice(contexts.indexOf(noJs.context), 1);

	const blocked = await createPage({ width: 390 });
	await blocked.page.addInitScript(() => {
		window.__blockedWeatherGeolocationCalls = 0;
		Object.defineProperty(navigator, "geolocation", {
			configurable: true,
			value: {
				getCurrentPosition() {
					window.__blockedWeatherGeolocationCalls += 1;
				},
			},
		});
	});
	await blocked.page.route("**/weather/sidebar-widget.js", (route) =>
		route.abort(),
	);
	await blocked.page.goto(siteUrl("/"), { waitUntil: "load" });
	check(
		"天气控制脚本被阻止时手机保留静态说明且不定位",
		(await visibleWidgetMetrics(blocked.page)).visibleCount === 1 &&
			(await blocked.page
				.locator("[data-weather-widget]:visible [data-weather-info]")
				.innerText()) === "启用 JavaScript 后可查看附近天气" &&
			(await blocked.page.evaluate(
				() => window.__blockedWeatherGeolocationCalls,
			)) === 0,
	);
	await blocked.context.close();
	contexts.splice(contexts.indexOf(blocked.context), 1);
	harness.checkClean("手机天气与 Swup 路径");
} finally {
	await Promise.all(contexts.map((context) => context.close()));
	await browser.close();
}

const { total, failed } = harness.summary();
console.log(`\n结果：${total - failed.length}/${total} 通过`);
process.exit(failed.length === 0 ? 0 : 1);
