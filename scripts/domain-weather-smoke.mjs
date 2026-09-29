// /domain/ weather path browser acceptance. Run after build + preview.
// wttr.in 是唯一来源（和风已搁置），超时上限收回单源的 8 秒。
// DOMAIN_WEATHER_BASE_URL is the complete page URL, for example http://localhost:4322/domain/.
import { makeHarness } from "./lib/smoke-harness.mjs";

const wttrUrl = "https://wttr.in/**";
const baseUrl =
	process.env.DOMAIN_WEATHER_BASE_URL ?? "http://localhost:4322/domain/";
const harness = makeHarness({
	envVar: "DOMAIN_WEATHER_BASE_URL",
	defaultBase: baseUrl,
	isNoise: ({ text, url }) =>
		text === "Failed to load resource: net::ERR_FAILED" &&
		(url.includes("wttr.in/") ||
			url.includes("/weather/weather-service.js") ||
			url.includes("/domain/js/weather.js")),
});
const { check } = harness;
const browser = await harness.browser.launch(harness.launch);
const contexts = [];

function wttrFixture(city = "Beijing") {
	return {
		nearest_area: city ? [{ areaName: [{ value: city }] }] : [],
		current_condition: [
			{
				temp_C: "24",
				weatherCode: "113",
				weatherDesc: [{ value: "Clear" }],
			},
		],
	};
}

async function openPage({
	first = "success",
	later = "success",
	javascript = true,
	coords = { latitude: 39.9042, longitude: 116.4074 },
} = {}) {
	const context = await browser.newContext({
		viewport: { width: 390, height: 844 },
		javaScriptEnabled: javascript,
	});
	contexts.push(context);
	const page = await context.newPage();
	harness.attach(page);
	if (javascript) {
		await page.addInitScript(
			({ firstAction, laterAction, position }) => {
				window.__weatherGeolocationCalls = [];
				if (firstAction === "unsupported") {
					Object.defineProperty(navigator, "geolocation", {
						configurable: true,
						value: undefined,
					});
					return;
				}
				Object.defineProperty(navigator, "geolocation", {
					configurable: true,
					value: {
						getCurrentPosition(success, error, options) {
							window.__weatherGeolocationCalls.push(options);
							const action =
								window.__weatherGeolocationCalls.length === 1
									? firstAction
									: laterAction;
							queueMicrotask(() => {
								if (action === "success") {
									success({ coords: position });
								} else if (action === "denied") {
									error({ code: 1 });
								} else if (action === "unavailable") {
									error({ code: 2 });
								} else if (action === "timeout") {
									error({ code: 3 });
								}
							});
						},
					},
				});
			},
			{ firstAction: first, laterAction: later, position: coords },
		);
	}
	return page;
}

async function routeWttr(page, respond) {
	const calls = [];
	await page.route(wttrUrl, async (route) => {
		calls.push(route.request().url());
		await respond(route, calls[calls.length - 1], calls.length);
	});
	return calls;
}

async function fulfillJson(route, payload) {
	await route.fulfill({
		status: 200,
		contentType: "application/json",
		headers: { "access-control-allow-origin": "*" },
		body: JSON.stringify(payload),
	});
}

try {
	const success = await openPage();
	const wttrCalls = await routeWttr(success, (route) =>
		fulfillJson(route, wttrFixture()),
	);
	await success.goto(baseUrl, { waitUntil: "load" });
	const weather = success.locator("#weather-info");
	await weather.getByText("北京").waitFor({ timeout: 10000 });
	check(
		"授权定位后显示附近城市、真实摄氏温度与天气说明",
		/附近：北京 24°C .*晴/u.test(await weather.innerText()),
	);
	check(
		"来源链接标明 wttr.in 且指向 wttr.in",
		/^https:\/\/wttr\.in\/?$/u.test(
			await weather
				.getByRole("link", { name: "wttr.in" })
				.getAttribute("href"),
		),
	);
	const linkMetrics = await success.evaluate(() => {
		const weatherInfo = document.querySelector("#weather-info");
		const sourceLink = weatherInfo.querySelector(
			'a[href="https://wttr.in"], a[href="https://wttr.in/"]',
		);
		const terminal = weatherInfo.closest(".cmdText");
		const range = document.createRange();
		range.selectNodeContents(weatherInfo);
		const rects = [...range.getClientRects()];
		return {
			linksMatchTerminal:
				getComputedStyle(sourceLink).color ===
					getComputedStyle(weatherInfo).color &&
				getComputedStyle(sourceLink).fontFamily ===
					getComputedStyle(weatherInfo).fontFamily &&
				sourceLink.rel.includes("noopener"),
			lineFitsTerminal:
				rects.length > 0 &&
				Math.max(...rects.map((rect) => rect.right)) <=
					terminal.getBoundingClientRect().right + 1,
			lastLineRight: Math.max(...rects.map((rect) => rect.right)),
			terminalRight: terminal.getBoundingClientRect().right,
		};
	});
	check(
		"来源链接沿用终端字体颜色且安全开新标签",
		linkMetrics.linksMatchTerminal,
	);
	check(
		"天气行在终端容器范围内换行不溢出",
		linkMetrics.lineFitsTerminal,
		JSON.stringify(linkMetrics),
	);
	check(
		"wttr.in 只发送一位小数的粗化坐标且仅请求一次",
		wttrCalls.length === 1 &&
			new URL(wttrCalls[0]).pathname === "/39.9,116.4",
		JSON.stringify(wttrCalls),
	);
	check(
		"定位使用普通精度、零缓存与 8 秒上限",
		JSON.stringify(
			await success.evaluate(() => window.__weatherGeolocationCalls[0]),
		) ===
			JSON.stringify({
				enableHighAccuracy: false,
				timeout: 8000,
				maximumAge: 0,
			}),
	);
	check(
		"成功态没有新增刷新按钮",
		(await weather.getByRole("button").count()) === 0,
	);

	// wttr 不给城市名时：境内由本地目录补出中文市名，境外才落到「未知城市」
	const rescued = await openPage();
	const rescuedWttr = await routeWttr(rescued, (route) =>
		fulfillJson(route, wttrFixture("")),
	);
	await rescued.goto(baseUrl, { waitUntil: "load" });
	const rescuedWeather = rescued.locator("#weather-info");
	await rescuedWeather.getByText("北京").waitFor({ timeout: 10000 });
	check(
		"wttr 缺城市名时境内由目录补出中文市名，天气照常显示",
		/附近：北京 24°C .*晴/u.test(await rescuedWeather.innerText()) &&
			rescuedWttr.length === 1,
	);

	const unknownCity = await openPage({
		coords: { latitude: 51.5074, longitude: -0.1278 },
	});
	const unknownWttr = await routeWttr(unknownCity, (route) =>
		fulfillJson(route, wttrFixture("")),
	);
	await unknownCity.goto(baseUrl, { waitUntil: "load" });
	const unknownWeather = unknownCity.locator("#weather-info");
	await unknownWeather.getByText("未知城市").waitFor({ timeout: 10000 });
	check(
		"境外且 wttr 缺城市名时仍显示真实天气并标为未知城市",
		/未知城市 24°C .*晴/u.test(await unknownWeather.innerText()) &&
			unknownWttr.length === 1,
	);

	const retry = await openPage();
	const retryWttr = await routeWttr(retry, (route, _url, count) =>
		count === 1 ? route.abort() : fulfillJson(route, wttrFixture()),
	);
	await retry.goto(baseUrl, { waitUntil: "load" });
	const retryButton = retry.getByRole("button", {
		name: "重试获取附近天气",
	});
	await retryButton.waitFor({ timeout: 10000 });
	const retryFailureText = await retry.locator("#weather-info").innerText();
	check(
		"wttr.in 失败显示不泄露来源细节的失败态",
		/天气服务暂不可用/u.test(retryFailureText),
	);
	check("失败文案不再出现「和风」字样", !/和风/u.test(retryFailureText));
	check(
		"wttr.in 失败后没有 IP 定位回退，且只请求一次",
		retryWttr.length === 1 &&
			new URL(retryWttr[0]).pathname === "/39.9,116.4",
	);
	await retryButton.focus();
	await retry.keyboard.press("Enter");
	await retry.locator("#weather-info").getByText("北京").waitFor({
		timeout: 10000,
	});
	check(
		"键盘 Enter 重试后使用 wttr.in 并显示来源",
		retryWttr.length === 2 &&
			(await retry
				.locator("#weather-info")
				.getByRole("link", { name: "wttr.in" })
				.count()) === 1,
	);

	const denied = await openPage({ first: "denied", later: "denied" });
	const deniedWttr = await routeWttr(denied, (route) => route.abort());
	await denied.goto(baseUrl, { waitUntil: "load" });
	const deniedButton = denied.getByRole("button", {
		name: "重试获取附近天气",
	});
	await deniedButton.waitFor({ timeout: 10000 });
	check(
		"拒绝定位显示明确原因与键盘可用重试",
		/定位权限已拒绝/u.test(
			await denied.locator("#weather-info").innerText(),
		),
	);
	check(
		"重试按钮沿用终端字体",
		await denied.evaluate(() => {
			const parent = document.querySelector("#weather-info");
			const button = parent.querySelector("button");
			return (
				getComputedStyle(parent).fontFamily ===
				getComputedStyle(button).fontFamily
			);
		}),
	);
	check("拒绝定位不会调用天气来源", deniedWttr.length === 0);
	await deniedButton.focus();
	await denied.keyboard.press("Enter");
	await denied.waitForFunction(
		() => window.__weatherGeolocationCalls.length === 2,
	);
	const secondDeniedButton = denied.getByRole("button", {
		name: "重试获取附近天气",
	});
	await secondDeniedButton.waitFor();
	await secondDeniedButton.focus();
	await denied.keyboard.press("Space");
	await denied.waitForFunction(
		() => window.__weatherGeolocationCalls.length === 3,
	);
	check("Enter 与 Space 都能激活重试", true);

	const timeout = await openPage({ first: "timeout", later: "timeout" });
	const timeoutWttr = await routeWttr(timeout, (route) => route.abort());
	await timeout.goto(baseUrl, { waitUntil: "load" });
	await timeout
		.getByRole("button", { name: "重试获取附近天气" })
		.waitFor({ timeout: 10000 });
	check(
		"定位超时显示独立原因与重试且不请求天气",
		/定位超时/u.test(await timeout.locator("#weather-info").innerText()) &&
			timeoutWttr.length === 0,
	);

	const unavailable = await openPage({ first: "unavailable" });
	const unavailableWttr = await routeWttr(unavailable, (route) =>
		route.abort(),
	);
	await unavailable.goto(baseUrl, { waitUntil: "load" });
	await unavailable
		.getByRole("button", { name: "重试获取附近天气" })
		.waitFor({ timeout: 10000 });
	check(
		"位置不可用显示独立原因与重试",
		/当前位置暂不可用/u.test(
			await unavailable.locator("#weather-info").innerText(),
		) && unavailableWttr.length === 0,
	);

	const unsupported = await openPage({ first: "unsupported" });
	const unsupportedWttr = await routeWttr(unsupported, (route) =>
		route.abort(),
	);
	await unsupported.goto(baseUrl, { waitUntil: "load" });
	await unsupported.locator("#weather-info").waitFor({ state: "visible" });
	check(
		"不支持定位时显示说明、不显示无效重试且不请求天气",
		/浏览器不支持定位/u.test(
			await unsupported.locator("#weather-info").innerText(),
		) &&
			(await unsupported
				.locator("#weather-info")
				.getByRole("button")
				.count()) === 0 &&
			unsupportedWttr.length === 0,
	);

	const stalled = await openPage();
	const stalledUrls = await routeWttr(stalled, async (route) => {
		await new Promise((resolve) => setTimeout(resolve, 14000));
		try {
			await fulfillJson(route, wttrFixture());
		} catch {
			// The client should abort this deliberately late response at its deadline.
		}
	});
	await stalled.goto(baseUrl, { waitUntil: "load" });
	await stalled.waitForFunction(() =>
		document
			.querySelector("#weather-info")
			?.textContent.includes("正在读取天气"),
	);
	const stalledAt = Date.now();
	let stalledRetryVisible = false;
	try {
		await stalled
			.getByRole("button", { name: "重试获取附近天气" })
			.waitFor({ timeout: 12000 });
		stalledRetryVisible = true;
	} catch {
		// A late fixture response without a client deadline must not count as an app retry.
	}
	const stalledWait = Date.now() - stalledAt;
	check(
		"wttr.in 挂起在 8 秒上限内进入可重试失败态且不早于 7 秒",
		stalledRetryVisible &&
			stalledWait > 7000 &&
			stalledWait < 9500 &&
			/天气请求超过 8 秒上限/u.test(
				await stalled.locator("#weather-info").innerText(),
			),
		`${stalledWait} ms`,
	);
	check(
		"挂起请求只使用同一粗化坐标且仅请求一次",
		stalledUrls.length === 1 &&
			new URL(stalledUrls[0]).pathname === "/39.9,116.4",
	);

	const serviceBlockedContext = await browser.newContext({
		viewport: { width: 390, height: 844 },
	});
	contexts.push(serviceBlockedContext);
	const serviceBlocked = await serviceBlockedContext.newPage();
	const serviceBlockedSink = harness.createSink({
		name: "weather-service-script-blocked",
		sinkNoise: ({ text, url }) =>
			text === "Failed to load resource: net::ERR_FAILED" &&
			url.includes("/weather/weather-service.js"),
	});
	serviceBlockedSink.attach(serviceBlocked);
	await serviceBlocked.route("**/weather/weather-service.js", (route) =>
		route.abort(),
	);
	await serviceBlocked.goto(baseUrl, { waitUntil: "load" });
	check(
		"共享服务脚本失败而页面脚本仍运行时保留静态说明",
		(await serviceBlocked.locator("#weather-info").innerText()) ===
			"启用 JavaScript 后可查看附近天气" &&
			(await serviceBlocked.evaluate(() =>
				performance
					.getEntriesByType("resource")
					.some((entry) =>
						entry.name.includes("/domain/js/weather.js"),
					),
			)),
	);
	check(
		"共享服务脚本失败不留下永久加载文案",
		!(await serviceBlocked.locator("#weather-info").innerText()).includes(
			"加载中",
		),
	);

	const blockedContext = await browser.newContext({
		viewport: { width: 390, height: 844 },
	});
	contexts.push(blockedContext);
	const blocked = await blockedContext.newPage();
	const blockedSink = harness.createSink({
		name: "weather-page-script-blocked",
		sinkNoise: ({ text, url }) =>
			text === "Failed to load resource: net::ERR_FAILED" &&
			url.includes("/domain/js/weather.js"),
	});
	blockedSink.attach(blocked);
	await blocked.route("**/domain/js/weather.js", (route) => route.abort());
	await blocked.goto(baseUrl, { waitUntil: "load" });
	check(
		"页面天气脚本加载失败仍保留静态说明且无永久加载文案",
		(await blocked.locator("#weather-info").innerText()) ===
			"启用 JavaScript 后可查看附近天气" &&
			!(await blocked.locator("#weather-info").innerText()).includes(
				"加载中",
			),
	);

	const noJs = await openPage({ javascript: false });
	await noJs.goto(baseUrl, { waitUntil: "load" });
	check(
		"禁用 JavaScript 时保留静态说明且无永久加载文案",
		(await noJs.locator("#weather-info").innerText()) ===
			"启用 JavaScript 后可查看附近天气" &&
			!(await noJs.locator("#weather-info").innerText()).includes(
				"加载中",
			),
	);

	harness.checkClean("/domain/ 天气烟测");
	serviceBlockedSink.checkClean("共享天气服务脚本加载失败分支");
	blockedSink.checkClean("天气页面脚本加载失败分支");
} finally {
	await Promise.all(contexts.map((context) => context.close()));
	await browser.close();
}

const { total, failed } = harness.summary();
console.log(`\n结果：${total - failed.length}/${total} 通过`);
process.exit(failed.length === 0 ? 0 : 1);
