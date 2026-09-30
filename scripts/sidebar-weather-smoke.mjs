// Main-site desktop weather widget acceptance. Run after build + preview.
// SIDEBAR_WEATHER_BASE_URL is the site root, for example http://localhost:4322.
import { readFile } from "node:fs/promises";
import { makeHarness } from "./lib/smoke-harness.mjs";

const harness = makeHarness({
	envVar: "SIDEBAR_WEATHER_BASE_URL",
	defaultBase: "http://localhost:4322",
	isNoise: ({ url, base }) => !!url && !url.startsWith(base),
});
const { base, check, checkClean } = harness;
const browser = await harness.browser.launch(harness.launch);
const contexts = [];
const coordinates = { latitude: 39.9, longitude: 116.4 };
// 生产端把坐标粗化到一位小数后拼成 wttr.in 的 j1 地址；页面级与服务级判据共用这一条常量。
const WTTR_WEATHER_URL = "https://wttr.in/39.9,116.4?format=j1&lang=zh";
const pages = [
	{ path: "/", name: "首页" },
	{ path: "/posts/20260831000000/", name: "文章页" },
	{ path: "/archive/", name: "其他侧栏页" },
];

function wttrFixture({
	city = "Beijing",
	temp_C = "24",
	weatherCode = "113",
	lang_zh = null,
	withDetails = false,
} = {}) {
	return {
		nearest_area: city ? [{ areaName: [{ value: city }] }] : [],
		current_condition: [
			{
				temp_C: String(temp_C),
				weatherCode: String(weatherCode),
				weatherDesc: [{ value: "Clear" }],
				...(lang_zh ? { lang_zh: [{ value: lang_zh }] } : {}),
				...(withDetails
					? { FeelsLikeC: "35", windspeedKmph: "11", humidity: "75" }
					: {}),
			},
		],
	};
}

async function newPage({
	width = 1440,
	geolocationActions = ["success"],
} = {}) {
	const context = await browser.newContext({
		viewport: { width, height: 900 },
	});
	contexts.push(context);
	const page = harness.attach(await context.newPage());
	await page.addInitScript(
		({ actions, coords }) => {
			window.__weatherGeolocationCalls = [];
			Object.defineProperty(navigator, "geolocation", {
				configurable: true,
				value: {
					getCurrentPosition(success, error, options) {
						window.__weatherGeolocationCalls.push(options);
						const action =
							actions[
								Math.min(
									window.__weatherGeolocationCalls.length - 1,
									actions.length - 1,
								)
							];
						queueMicrotask(() => {
							if (action === "success") {
								success({ coords });
								return;
							}
							const code =
								action === "denied"
									? 1
									: action === "unavailable"
										? 2
										: 3;
							error({ code });
						});
					},
				},
			});
		},
		{ actions: geolocationActions, coords: coordinates },
	);
	return page;
}

async function fulfillJson(route, payload, status = 200) {
	await route.fulfill({
		status,
		contentType: "application/json",
		body: JSON.stringify(payload),
	});
}

async function waitForState(page, state) {
	await page.waitForFunction(
		(expected) =>
			document
				.querySelector("#sidebar [data-weather-widget]")
				?.getAttribute("data-weather-state") === expected,
		state,
		{ timeout: 5000 },
	);
}

async function routeWttr(page, handler) {
	const requests = [];
	await page.route("https://wttr.in/**", async (route) => {
		requests.push({
			url: route.request().url(),
			method: route.request().method(),
		});
		await handler(route, requests.length);
	});
	return requests;
}

// 图标是 public/weather/icons/ 下的六个真资产：离线校验它们确实存在、
// 各自含多种颜色且不再靠 currentColor 继承（单色化会在这里翻红）。
{
	const iconKinds = [
		"clear",
		"cloud",
		"overcast",
		"rain",
		"snow",
		"storm",
		"fog",
	];
	const rows = [];
	for (const kind of iconKinds) {
		const file = new URL(
			"../public/weather/icons/" + kind + ".svg",
			import.meta.url,
		);
		let text = null;
		try {
			text = await readFile(file, "utf8");
		} catch {
			rows.push({ kind, error: "文件缺失" });
			continue;
		}
		const colors = [
			...new Set(
				[...text.matchAll(/(?:fill|stroke)="(#[0-9a-f]{3,8})"/gi)].map(
					(m) => m[1].toLowerCase(),
				),
			),
		];
		rows.push({
			kind,
			root: /^<svg[^>]*viewBox="0 0 64 64"/.test(text),
			colors: colors.length,
			mono: /currentColor/.test(text),
		});
	}
	check(
		"七个本地天气图标文件齐备、各自多色且不靠 currentColor",
		rows.length === iconKinds.length &&
			rows.every(
				(row) => row.root && row.colors >= 2 && row.mono === false,
			),
		JSON.stringify(rows),
	);
}

try {
	// Layout and the successful wttr.in state on one home, one article, and one other sidebar page.
	for (const route of pages) {
		const page = await newPage();
		const weatherRequests = await routeWttr(page, (r) =>
			fulfillJson(r, wttrFixture()),
		);
		await page.goto(base + route.path, { waitUntil: "load" });
		const widget = page.locator("#sidebar [data-weather-widget]");
		const exists =
			(await widget.count()) === 1 &&
			(await widget.isVisible()) &&
			(await page.locator("[data-weather-widget]").count()) === 1;
		check(`${route.name}桌面侧栏有且仅有一个天气胶囊`, exists);
		if (!exists) continue;

		check(
			`${route.name}天气胶囊位于吐槽水军之前的侧栏首位`,
			await widget.evaluate((el) => {
				const card = el.closest(".widget");
				const followingTitle =
					card?.nextElementSibling?.querySelector("h2");
				return (
					card?.parentElement?.id === "sidebar" &&
					card === card.parentElement.firstElementChild &&
					followingTitle?.textContent.trim() === "吐槽水军"
				);
			}),
		);
		await waitForState(page, "success");
		check(
			`${route.name}显示附近城市、温度、天气描述与获取时间`,
			(await widget.locator("[data-weather-city]").innerText()) ===
				"北京" &&
				(await widget
					.locator("[data-weather-temperature]")
					.innerText()) === "24°C" &&
				(await widget
					.locator("[data-weather-description]")
					.innerText()) === "晴" &&
				/^\d{2}:\d{2}$/.test(
					await widget
						.locator("[data-weather-fetched-at]")
						.innerText(),
				) &&
				/^数据：\s*wttr\.in\s+\d{2}:\d{2}$/u.test(
					await widget
						.locator(".weather-widget__source-line")
						.innerText(),
				) &&
				(await widget
					.locator(".weather-widget__time")
					.evaluate((el) => getComputedStyle(el).marginLeft)) ===
					"5px",
		);
		check(
			`${route.name}来源链接只指向 wttr.in`,
			(await widget
				.locator('[data-weather-source][href="https://wttr.in/"]')
				.count()) === 1 &&
				(await widget.locator("[data-weather-source]").innerText()) ===
					"wttr.in",
		);
		check(
			`${route.name}天气只向 wttr.in 发一次 GET 且地址带一位小数坐标`,
			weatherRequests.length === 1 &&
				weatherRequests[0].method === "GET" &&
				weatherRequests[0].url === WTTR_WEATHER_URL,
			JSON.stringify(weatherRequests),
		);
		check(
			`${route.name}初次访问只读取一次普通精度位置`,
			(await page.evaluate(
				() => window.__weatherGeolocationCalls.length,
			)) === 1 &&
				(await page.evaluate(() => {
					const options = window.__weatherGeolocationCalls[0];
					return (
						options.enableHighAccuracy === false &&
						options.maximumAge === 0 &&
						options.timeout === 8000
					);
				})),
		);
		if (route.path === "/") {
			const geometry = await widget.evaluate((el) => {
				const card = el.closest(".widget");
				const rect = card.getBoundingClientRect();
				const style = getComputedStyle(card);
				const icon = el.querySelector("[data-weather-icon]");
				return {
					visible: rect.width > 0 && style.display !== "none",
					border: style.borderTopStyle,
					borderWidth: style.borderTopWidth,
					radius: style.borderTopLeftRadius,
					background: style.backgroundColor,

					iconSrc: icon
						? new URL(icon.getAttribute("src"), location.href)
								.pathname
						: null,
					temperatureSize: Number.parseFloat(
						getComputedStyle(
							el.querySelector("[data-weather-temperature]"),
						).fontSize,
					),
				};
			});
			check(
				"天气卡延续白底直角边框，本地图标文件已挂载且温度醒目可见",
				geometry.visible &&
					geometry.border === "solid" &&
					geometry.borderWidth === "1px" &&
					geometry.radius === "0px" &&
					geometry.background === "rgb(255, 255, 255)" &&
					/^\/weather\/icons\/(clear|cloud|overcast|rain|snow|storm|fog)\.svg$/u.test(
						geometry.iconSrc ?? "",
					) &&
					geometry.temperatureSize >= 24,
				JSON.stringify(geometry),
			);
			const svgAccessibility = await widget
				.locator("[data-weather-icon]")
				.getAttribute("aria-hidden");
			check("天气图标不重复进入读屏播报", svgAccessibility === "true");
		}
		checkClean(`${route.name}天气成功态`);
	}

	// Exactly 769px remains in the desktop sidebar layout.
	{
		const page = await newPage({ width: 769 });
		await routeWttr(page, (r) => fulfillJson(r, wttrFixture()));
		await page.goto(base + "/", { waitUntil: "load" });
		const count = await page
			.locator("#sidebar [data-weather-widget]")
			.count();
		check(
			"769px 天气胶囊仍可见于桌面侧栏",
			count === 1 &&
				(await page.locator("[data-weather-widget]").count()) === 1 &&
				(await page
					.locator("#sidebar [data-weather-widget]")
					.isVisible()),
		);
	}

	// wttr.in is the only source: a failed first read must land in a retryable
	// failure state after exactly one request, and the retry must show wttr.in.
	{
		do {
			const page = await newPage();
			const requests = await routeWttr(page, async (route, count) => {
				if (count === 1) {
					await fulfillJson(route, { error: "unavailable" }, 503);
					return;
				}
				await fulfillJson(route, wttrFixture());
			});
			await page.goto(base + "/", { waitUntil: "load" });
			if (
				(await page
					.locator("#sidebar [data-weather-widget]")
					.count()) !== 1
			) {
				check("wttr.in 失败后进入可重试失败态", false);
				continue;
			}
			await waitForState(page, "weather-error");
			const widget = page.locator("#sidebar [data-weather-widget]");
			check(
				"wttr.in 唯一来源失败只请求一次并给出可重试说明",
				requests.length === 1 &&
					(
						await widget
							.locator("[data-weather-status]")
							.innerText()
					).includes("天气暂不可用，请重试") &&
					(await widget
						.locator("[data-weather-retry]")
						.isVisible()) &&
					!(await widget.locator("[data-weather-stale]").isVisible()),
			);
			await widget.locator("[data-weather-retry]").click();
			await waitForState(page, "success");
			check(
				"wttr.in 失败重试后显示自己的来源链接且不再次定位",
				(await widget
					.locator('[data-weather-source][href="https://wttr.in/"]')
					.count()) === 1 &&
					(await widget
						.locator("[data-weather-source]")
						.innerText()) === "wttr.in" &&
					requests.length === 2 &&
					(await page.evaluate(
						() => window.__weatherGeolocationCalls.length,
					)) === 1,
			);
			checkClean("wttr.in 失败与重试");
		} while (false);
	}

	// A success refresh reuses the coarse point; a failed refresh marks the old result, and retry stays at weather stage.
	{
		do {
			const page = await newPage();
			const requests = await routeWttr(page, async (route, count) => {
				if (count === 2) {
					await fulfillJson(route, { error: "unavailable" }, 503);
					return;
				}
				await fulfillJson(
					route,
					wttrFixture({ temp_C: count === 1 ? "24" : "25" }),
				);
			});
			await page.goto(base + "/", { waitUntil: "load" });
			if (
				(await page
					.locator("#sidebar [data-weather-widget]")
					.count()) !== 1
			) {
				check("天气刷新复用粗化位置并能标记及恢复旧数据", false);
				continue;
			}
			await waitForState(page, "success");
			await page.locator("#sidebar [data-weather-refresh]").click();
			await waitForState(page, "weather-error");
			const widget = page.locator("#sidebar [data-weather-widget]");
			check(
				"成功刷新失败后保留并标明旧数据",
				(await widget.locator("[data-weather-stale]").innerText()) ===
					"旧数据" &&
					(
						await widget
							.locator("[data-weather-status]")
							.innerText()
					).includes("更新失败") &&
					(await widget
						.locator("[data-weather-temperature]")
						.innerText()) === "24°C",
			);
			check(
				"成功刷新只重取天气，不再次申请定位",
				(await page.evaluate(
					() => window.__weatherGeolocationCalls.length,
				)) === 1 &&
					requests.length === 2 &&
					requests.every(
						(request) => request.url === WTTR_WEATHER_URL,
					),
			);
			await widget.locator("[data-weather-retry]").click();
			await waitForState(page, "success");
			check(
				"天气失败后的重试仍沿用粗化位置并恢复新鲜状态",
				(await page.evaluate(
					() => window.__weatherGeolocationCalls.length,
				)) === 1 &&
					requests.length === 3 &&
					!(await widget
						.locator("[data-weather-stale]")
						.isVisible()) &&
					(await widget
						.locator("[data-weather-temperature]")
						.innerText()) === "25°C",
				JSON.stringify({
					locations: await page.evaluate(
						() => window.__weatherGeolocationCalls.length,
					),
					weatherCalls: requests.length,
					staleVisible: await widget
						.locator("[data-weather-stale]")
						.isVisible(),
					temperature: await widget
						.locator("[data-weather-temperature]")
						.innerText(),
				}),
			);
			checkClean("刷新、旧数据和天气阶段重试");
		} while (false);
	}

	// Location failure retry must re-run geolocation, then fetch weather once.
	{
		do {
			const page = await newPage({
				geolocationActions: ["denied", "success"],
			});
			const requests = await routeWttr(page, (r) =>
				fulfillJson(r, wttrFixture()),
			);
			await page.goto(base + "/", { waitUntil: "load" });
			if (
				(await page
					.locator("#sidebar [data-weather-widget]")
					.count()) !== 1
			) {
				check("定位拒绝说明与定位阶段重试", false);
				continue;
			}
			await waitForState(page, "location-error");
			const widget = page.locator("#sidebar [data-weather-widget]");
			check(
				"拒绝定位显示原因说明与可重试动作",
				(
					await widget.locator("[data-weather-status]").innerText()
				).includes("权限被拒绝") &&
					(await widget
						.locator("[data-weather-retry]")
						.isVisible()) &&
					requests.length === 0,
			);
			await widget.locator("[data-weather-retry]").click();
			await waitForState(page, "success");
			check(
				"定位阶段重试重新读取一次位置并只发起一轮天气请求",
				(await page.evaluate(
					() => window.__weatherGeolocationCalls.length,
				)) === 2 && requests.length === 1,
			);
			checkClean("定位失败与定位阶段重试");
		} while (false);
	}

	// Hover enhancement is gated to a fine pointer; the icon moves, while card text remains fixed.
	{
		do {
			const page = await newPage();
			await routeWttr(page, (r) => fulfillJson(r, wttrFixture()));
			await page.goto(base + "/", { waitUntil: "load" });
			if (
				(await page
					.locator("#sidebar [data-weather-widget]")
					.count()) !== 1
			) {
				check("天气图标动效、减少动态效果与键盘焦点", false);
				continue;
			}
			await waitForState(page, "success");
			const motion = await page.evaluate(() => {
				const widget = document.querySelector(
					"#sidebar [data-weather-widget]",
				);
				const icon = widget?.querySelector("[data-weather-icon]");
				const text = widget?.querySelector(
					"[data-weather-description]",
				);
				return {
					animation: icon
						? getComputedStyle(icon).animationName
						: "none",
					iconTransform: icon
						? getComputedStyle(icon).transform
						: "none",
					textTransform: text
						? getComputedStyle(text).transform
						: "none",
					finePointer: matchMedia(
						"(hover: hover) and (pointer: fine)",
					).matches,
				};
			});
			check(
				"天气图标有默认轻运动，文字不随图标移动",
				motion.animation !== "none" &&
					motion.textTransform === "none" &&
					motion.finePointer,
				JSON.stringify(motion),
			);
			await page.locator("#sidebar > .widget:first-child").hover();
			await page.waitForFunction(() => {
				const icon = document.querySelector(
					"#sidebar [data-weather-icon]",
				);
				if (!icon) return false;
				const transform = new DOMMatrixReadOnly(
					getComputedStyle(icon).transform,
				);
				return transform.a > 1.04 && transform.d > 1.04;
			});
			const hoverTransform = await page
				.locator("#sidebar [data-weather-icon]")
				.evaluate((el) => getComputedStyle(el).transform);
			const textTransform = await page
				.locator("#sidebar [data-weather-description]")
				.evaluate((el) => getComputedStyle(el).transform);
			check(
				"精细指针悬停增强图标且天气文字保持不动",
				hoverTransform !== "none" && textTransform === "none",
				JSON.stringify({ hoverTransform, textTransform }),
			);
			await page.emulateMedia({ reducedMotion: "reduce" });
			const reduced = await page
				.locator("#sidebar [data-weather-icon]")
				.evaluate((el) => getComputedStyle(el).animationDuration);
			check(
				"减少动态效果时图标运动幅度或频率减轻",
				Number.parseFloat(reduced) >= 5,
				`animation-duration=${reduced}`,
			);
			const refresh = page.locator("#sidebar [data-weather-refresh]");
			let keyboardFocused = false;
			// 上限按「首页每页 10 条」量出来的：刷新按钮是第 95 次 Tab 的落点
			// （2026-09-30 实测；每页 6 条时是第 76 次，旧的 90 只剩 14 次余量，
			// 加到 10 条后先撞上的是上限而不是按钮，判据会以「焦点不可见」假红）。
			for (let i = 0; i < 160; i++) {
				await page.keyboard.press("Tab");
				if (
					(await page.evaluate(() =>
						document.activeElement?.matches(
							"#sidebar [data-weather-refresh]",
						),
					)) === true
				) {
					keyboardFocused = true;
					break;
				}
			}
			const focus = await refresh.evaluate((el) => ({
				visible: el.matches(":focus-visible"),
				outlineStyle: getComputedStyle(el).outlineStyle,
				outlineWidth: getComputedStyle(el).outlineWidth,
			}));
			check(
				"刷新按钮可经键盘到达且有清楚的可见焦点",
				keyboardFocused &&
					focus.visible &&
					focus.outlineStyle !== "none" &&
					focus.outlineWidth !== "0px",
				JSON.stringify(focus),
			);
			checkClean("图标动效与键盘交互");
		} while (false);
	}

	// 图标归类判据：wttr 的 2xx 段同时含雷暴(200)、雪(227/230)、雾(248/260) 与
	// 冻毛毛雨(263–284)，任何按码段判定都会把其中三类归错，故逐码锁住可见图层。
	// 最后一例不走码表（码 999 表外），用 lang_zh 造一个同时含「雨」与「雾」的描述，
	// 钉住 AGENTS.md 记的优先级「雾/霾 在 雨 之前」——终端侧那份已由
	// scripts/weather-service.test.mjs 的同名用例锁住，两边缺任何一边都能悄悄漂回去。
	{
		const kindCases = [
			{ code: "200", kind: "storm" },
			{ code: "227", kind: "snow" },
			{ code: "248", kind: "fog" },
			{ code: "263", kind: "rain" },
			{ code: "149", kind: "fog" },
			{ code: "350", kind: "snow" },
			{ code: "179", kind: "snow" },
			{ code: "317", kind: "snow" },
			{ code: "113", kind: "clear" },
			{ code: "122", kind: "overcast" },
			{ code: "119", kind: "cloud" },
			{ code: "999", lang_zh: "雨雾", kind: "fog" },
		];
		const seen = [];
		for (const kindCase of kindCases) {
			const page = await newPage();
			await routeWttr(page, (r) =>
				fulfillJson(
					r,
					wttrFixture({
						weatherCode: kindCase.code,
						lang_zh: kindCase.lang_zh,
					}),
				),
			);
			await page.goto(base + "/", { waitUntil: "load" });
			const settled = await page
				.waitForFunction(
					() =>
						document.querySelector("#sidebar [data-weather-widget]")
							?.dataset.weatherState === "success",
					undefined,
					{ timeout: 30000 },
				)
				.then(() => true)
				.catch(() => false);
			seen.push(
				settled
					? await page.evaluate((code) => {
							const widget = document.querySelector(
								"#sidebar [data-weather-widget]",
							);
							return {
								code,
								kind: widget.querySelector(
									"[data-weather-icon]",
								)?.dataset.weatherKind,
								src: widget
									.querySelector("[data-weather-icon]")
									?.getAttribute("src"),
								condition: widget.querySelector(
									"[data-weather-description]",
								)?.textContent,
							};
						}, kindCase.code)
					: { code: kindCase.code, kind: "never-success" },
			);
			await page.close();
		}
		check(
			"天气图标按中文天气文字归类，2xx 段不得整段判为雷暴",
			seen.length === kindCases.length &&
				seen.every(
					(row, i) =>
						row.kind === kindCases[i].kind &&
						row.src ===
							"/weather/icons/" + kindCases[i].kind + ".svg",
				),
			JSON.stringify(seen),
		);
		checkClean("天气图标归类判据");
	}

	// The single source and its deadline are exercised through the service injection
	// seam, with fake timers so a hanging wttr.in response costs no wall clock.
	{
		do {
			const page = await newPage();
			await routeWttr(page, (r) => fulfillJson(r, wttrFixture()));
			await page.goto(base + "/", { waitUntil: "load" });
			if (
				!(await page.evaluate(() =>
					Boolean(window.WeatherCapsule?.createWeatherService),
				))
			) {
				check("天气服务的单源与期限判据", false);
				continue;
			}
			const result = await page.evaluate(async () => {
				let elapsedMs = 0;
				let settled = false;
				let fireDeadline = null;
				const scheduled = [];
				const urls = [];
				const signals = [];
				const service = window.WeatherCapsule.createWeatherService({
					now: () => elapsedMs,
					setTimeout: (callback, ms) => {
						scheduled.push(ms);
						fireDeadline = () => {
							elapsedMs += ms;
							callback();
						};
						return scheduled.length;
					},
					clearTimeout: () => {},
					fetchImpl: (url, options) => {
						urls.push(String(url));
						signals.push(options.signal);
						return Promise.resolve({
							ok: true,
							json: () =>
								new Promise((_, reject) => {
									options.signal.addEventListener(
										"abort",
										() =>
											reject(
												new Error(
													"wttr.in 响应体已中止",
												),
											),
									);
								}),
						});
					},
				});
				const pending = service
					.fetchCurrentWeather({
						latitude: 39.9042,
						longitude: 116.4074,
					})
					.then(
						() => {
							settled = true;
							return { outcome: "resolved" };
						},
						(error) => {
							settled = true;
							return {
								outcome: "rejected",
								reason: error?.reason,
								sources: error?.sources,
							};
						},
					);
				await new Promise((resolve) => setTimeout(resolve, 50));
				const pendingBeforeDeadline = !settled;
				if (fireDeadline) fireDeadline();
				const attempt = await pending;
				return {
					urls,
					scheduled,
					pendingBeforeDeadline,
					aborted:
						signals.length === 1 && signals[0]?.aborted === true,
					attempt,
				};
			});
			check(
				"服务经注入接缝只请求 wttr.in 一条地址且坐标粗化到一位小数",
				result.urls.length === 1 &&
					result.urls[0] === WTTR_WEATHER_URL &&
					result.urls.every((url) =>
						url.startsWith("https://wttr.in/"),
					),
				result.urls.join(", "),
			);
			check(
				"wttr.in 响应挂起时在八秒期限判超时并中止请求",
				result.scheduled.length === 1 &&
					result.scheduled[0] === 8000 &&
					result.pendingBeforeDeadline &&
					result.attempt.outcome === "rejected" &&
					result.attempt.reason === "timeout" &&
					result.attempt.sources.join(",") === "wttr.in" &&
					result.aborted,
				JSON.stringify(result),
			);
		} while (false);
	}

	// Browser without scripts retains useful static copy.
	{
		do {
			const context = await browser.newContext({
				viewport: { width: 1440, height: 900 },
				javaScriptEnabled: false,
			});
			contexts.push(context);
			const page = harness.attach(await context.newPage());
			await page.goto(base + "/", { waitUntil: "load" });
			if (
				(await page
					.locator("#sidebar [data-weather-widget]")
					.count()) !== 1
			) {
				check("禁用 JavaScript 时保留静态天气说明", false);
				continue;
			}
			check(
				"禁用 JavaScript 时保留静态天气说明而非永久加载文案",
				(await page
					.locator("#sidebar [data-weather-info]")
					.innerText()) === "启用 JavaScript 后可查看附近天气" &&
					!(
						await page
							.locator("#sidebar [data-weather-widget]")
							.innerText()
					).includes("加载中"),
			);
		} while (false);
	}

	// If either shared weather script is blocked, the static copy stays visible and geolocation is not requested.
	for (const blockedScript of ["weather-service.js", "sidebar-widget.js"]) {
		const context = await browser.newContext({
			viewport: { width: 1440, height: 900 },
		});
		contexts.push(context);
		const blockedSink = harness.createSink({
			name: `blocked-${blockedScript}`,
			sinkNoise: ({ url, text }) =>
				text === "Failed to load resource: net::ERR_FAILED" &&
				url.includes(`/weather/${blockedScript}`),
		});
		const page = blockedSink.attach(await context.newPage());
		await page.addInitScript(() => {
			window.__weatherGeolocationCalls = [];
			Object.defineProperty(navigator, "geolocation", {
				configurable: true,
				value: {
					getCurrentPosition(...args) {
						window.__weatherGeolocationCalls.push(args);
					},
				},
			});
		});
		await page.route(`**/weather/${blockedScript}`, (route) =>
			route.abort(),
		);
		await page.goto(base + "/", { waitUntil: "load" });
		check(
			`${blockedScript} 被阻止时保留静态说明且不请求位置`,
			(await page.locator("#sidebar [data-weather-info]").innerText()) ===
				"启用 JavaScript 后可查看附近天气" &&
				(await page.evaluate(
					() => window.__weatherGeolocationCalls.length,
				)) === 0 &&
				!(
					await page
						.locator("#sidebar [data-weather-widget]")
						.innerText()
				).includes("加载中"),
		);
		blockedSink.checkClean(`${blockedScript} 被阻止`);
	}
	// 天气是侧栏的子元件：侧栏不渲染的窄屏必须一张卡都不存在，
	// 也不许产生定位授权或天气请求（站主 2026-09-29 裁定撤除手机挂载）。
	for (const width of [390, 768]) {
		const page = await newPage({ width });
		const requests = await routeWttr(page, (route) =>
			fulfillJson(route, wttrFixture()),
		);
		await page.goto(base + "/", { waitUntil: "load" });
		// window.WeatherSidebarWidget 只在 widget 脚本跑完 init 后才出现，
		// 用它当确定性信号，不用固定毫秒等待。
		await page.waitForFunction(
			() => Boolean(window.WeatherSidebarWidget),
			undefined,
			{ timeout: 15000 },
		);
		const absent = await page.evaluate(() => ({
			widgets: document.querySelectorAll("[data-weather-widget]").length,
			visible: [
				...document.querySelectorAll("[data-weather-widget]"),
			].filter((el) => el.offsetParent !== null).length,
			inContent: document.querySelectorAll(
				"#content [data-weather-widget]",
			).length,
			geo: window.__weatherGeolocationCalls?.length ?? 0,
		}));
		check(
			`${width}px 竖屏没有任何可见天气卡，且不定位不请求`,
			absent.visible === 0 &&
				absent.inContent === 0 &&
				absent.geo === 0 &&
				requests.length === 0,
			JSON.stringify({ ...absent, requests: requests.length }),
		);
	}

	// 桌面侧栏：Swup 切页与整页刷新的会话语义（原手机烟测独有，撤挂载后搬到这里）
	{
		const page = await newPage();
		const requests = await routeWttr(page, (route) =>
			fulfillJson(route, wttrFixture()),
		);
		await page.goto(base + "/", { waitUntil: "load" });
		await waitForState(page, "success");
		await page.waitForFunction(() => Boolean(window.swup), undefined, {
			timeout: 20000,
		});
		const link = page
			.locator('#content .post-list a[href^="/posts/"]:visible')
			.first();
		const articlePath = await link.getAttribute("href");
		await link.click();
		await page.waitForFunction(
			(path) => location.pathname === path,
			articlePath,
			{ timeout: 15000 },
		);
		await waitForState(page, "success");
		check(
			"Swup 切到文章页不重复定位、不重复请求天气",
			(await page.evaluate(
				() => window.__weatherGeolocationCalls.length,
			)) === 1 &&
				requests.length === 1 &&
				(await page
					.locator("#sidebar [data-weather-widget]")
					.count()) === 1,
			JSON.stringify(requests),
		);
		await page.goBack();
		await page.waitForFunction(() => location.pathname === "/", undefined, {
			timeout: 15000,
		});
		await waitForState(page, "success");
		check(
			"Swup 返回首页仍复用同一会话，不新增定位或请求",
			(await page.evaluate(
				() => window.__weatherGeolocationCalls.length,
			)) === 1 && requests.length === 1,
		);
		await page.reload({ waitUntil: "load" });
		await waitForState(page, "success");
		check(
			"整页刷新重新定位并以同一粗化坐标重新请求一轮天气",
			// 页面内计数是 addInitScript 注入的，整页刷新会归零重计；
			// 跨刷新累计的只有 Node 侧的 requests，所以这里是「新文档定位 1 次 + 累计 2 轮请求」。
			(await page.evaluate(
				() => window.__weatherGeolocationCalls.length,
			)) === 1 &&
				requests.length === 2 &&
				requests[1].url === WTTR_WEATHER_URL,
			JSON.stringify(requests),
		);
		check(
			"天气卡只存在于侧栏，#content 内无天气节点（文章卡色带不受影响）",
			(await page.evaluate(
				() =>
					document.querySelectorAll("#content [data-weather-widget]")
						.length,
			)) === 0 &&
				(await page
					.locator("#sidebar [data-weather-widget]")
					.count()) === 1,
		);
	}

	// 通栏参数行：体感 / 风 / 湿度，全部来自同一份 j1 响应，不额外请求上游。
	{
		const page = await newPage();
		await routeWttr(page, (route) =>
			fulfillJson(route, wttrFixture({ withDetails: true })),
		);
		await page.goto(base + "/", { waitUntil: "load" });
		await waitForState(page, "success");
		const row = page.locator("#sidebar [data-weather-details]");
		const cells = (
			await row.locator(".weather-widget__detail").allInnerTexts()
		).map((t) => t.replace(/\s+/gu, " ").trim());
		const shape = await row.evaluate((el) => {
			const box = el.getBoundingClientRect();
			const kids = [...el.children];
			const last = kids.at(-1).getBoundingClientRect();
			return {
				hidden: el.hidden,
				children: el.children.length,
				rules: kids
					.map((c) => getComputedStyle(c).borderLeftWidth)
					.filter((w) => w !== "0px").length,
				// 铺满判据用几何：最后一格右缘到行右缘的剩余距离。
				// 绝不能用 scrollWidth>clientWidth —— 不溢出的块级元素两者恒等，
				// 那样量不出右侧死区（上一版就栽在这里）。
				deadRight: +(box.right - last.right).toFixed(1),
				rowWidth: +box.width.toFixed(1),
				overflow:
					document.documentElement.scrollWidth - window.innerWidth,
			};
		});
		check(
			"参数行三格文案正确且只有两条分隔线",
			!shape.hidden &&
				shape.children === 3 &&
				shape.rules === 2 &&
				cells.join("|") === "体感 35°|风速 11 km/h|湿度 75%",
			JSON.stringify({ cells, ...shape }),
		);
		check(
			"参数行三格铺满整行，右侧死区不超过 1px",
			shape.deadRight <= 1 && shape.overflow <= 0,
			JSON.stringify(shape),
		);
		// 注入远超单格宽度的值，验证截断真的咬住：值元素自身溢出、
		// 计算值为 ellipsis，且行的宽高一格都不许变。
		const truncation = await row.evaluate(async (el) => {
			const box = el.getBoundingClientRect();
			const before = {
				w: +box.width.toFixed(1),
				h: +box.height.toFixed(1),
			};
			const target = el.children[1].querySelector(
				".weather-widget__detail-value",
			);
			const restore = target.textContent;
			const cs = getComputedStyle(target);
			target.textContent = "999999 km/h 999999 km/h 999999 km/h";
			await new Promise((r) => requestAnimationFrame(() => r()));
			const after = el.getBoundingClientRect();
			const result = {
				valueOverflows: target.scrollWidth > target.clientWidth + 1,
				textOverflow: cs.textOverflow,
				wrap: cs.whiteSpace,
				hidden: cs.overflowX,
				after: {
					w: +after.width.toFixed(1),
					h: +after.height.toFixed(1),
				},
				rowOverflowX: el.scrollWidth > el.clientWidth + 1,
				docOverflow:
					document.documentElement.scrollWidth - window.innerWidth,
			};
			target.textContent = restore;
			return { before, ...result };
		});
		check(
			"注入超长值后截断生效：值元素自身溢出且按省略号裁切",
			truncation.valueOverflows &&
				truncation.textOverflow === "ellipsis" &&
				truncation.wrap === "nowrap" &&
				truncation.hidden === "hidden",
			JSON.stringify(truncation),
		);
		check(
			"超长值不改变行的宽高、也不撑破行或文档",
			truncation.after.w === truncation.before.w &&
				truncation.after.h === truncation.before.h &&
				!truncation.rowOverflowX &&
				truncation.docOverflow <= 0,
			JSON.stringify(truncation),
		);
		// 图标是站内固定资产：每格恰好一枚、路径逐字来自站主给的参考图、
		// 颜色必须走 currentColor（硬写 fill 会让它不随 hover 变色，也说明改动者动了几何）。
		const iconFacts = await row.evaluate((el) =>
			[...el.children].map((cell) => {
				const svg = cell.querySelector("svg");
				return {
					count: cell.querySelectorAll("svg").length,
					paths: svg ? svg.querySelectorAll("path").length : 0,
					firstD: svg
						? svg
								.querySelector("path")
								.getAttribute("d")
								.slice(0, 22)
						: "",
					hardFill: svg
						? [...svg.querySelectorAll("path")].some((q) =>
								q.hasAttribute("fill"),
							)
						: true,
					svgFill: svg ? getComputedStyle(svg).fill : "",
					hiddenFromAT: svg
						? svg.getAttribute("aria-hidden") === "true"
						: false,
					order: cell.firstElementChild === svg,
				};
			}),
		);
		check(
			"三格各带一枚图标、排在标签前、路径无硬写 fill 且继承 currentColor",
			iconFacts.length === 3 &&
				iconFacts.every(
					(f) =>
						f.count === 1 &&
						f.paths >= 1 &&
						!f.hardFill &&
						f.order &&
						f.hiddenFromAT &&
						/rgb\(102, 102, 102\)/u.test(f.svgFill),
				) &&
				iconFacts[0].firstD === "M442.65472 514.78528c-" &&
				iconFacts[1].firstD === "M352 0h64v1024h-64z" &&
				iconFacts[2].firstD === "M512 874.666667c-34.13",
			JSON.stringify(iconFacts),
		);
		check(
			"常见读数下没有任何一格被截断（图标+标签+数值必须装得下）",
			(await row.evaluate((el) =>
				[...el.querySelectorAll(".weather-widget__detail-value")].every(
					(v) => v.scrollWidth <= v.clientWidth + 1,
				),
			)) === true,
		);
		check(
			"参数行仍是单行（三格顶边一致且行高不超过约一行）",
			(await row.evaluate((el) => {
				const tops = [...el.children].map((c) =>
					Math.round(c.getBoundingClientRect().top),
				);
				return (
					new Set(tops).size === 1 &&
					el.getBoundingClientRect().height <= 20
				);
			})) === true,
		);
	}
	{
		const page = await newPage();
		await routeWttr(page, (route) => fulfillJson(route, wttrFixture()));
		await page.goto(base + "/", { waitUntil: "load" });
		await waitForState(page, "success");
		const row = page.locator("#sidebar [data-weather-details]");
		check(
			"上游未给体感/风力/湿度时整行隐藏，不留空带",
			(await row.evaluate(
				(el) => el.hidden && el.children.length === 0,
			)) === true,
		);
	}
} finally {
	await Promise.all(contexts.map((context) => context.close()));
	await browser.close();
}

const { total, failed } = harness.summary();
console.log(`\n结果：${total - failed.length}/${total} 通过`);
process.exit(failed.length === 0 ? 0 : 1);
