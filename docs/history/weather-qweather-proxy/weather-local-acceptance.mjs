// Live local QWeather browser acceptance. Requires a built preview and the
// guarded DPAPI-backed proxy started on 127.0.0.1:8787.
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { makeHarness } from "./lib/smoke-harness.mjs";

const repoRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
);
const proxyUrl = "http://127.0.0.1:8787/v1/weather";
const baseUrl = process.env.WEATHER_LOCAL_BASE_URL ?? "http://localhost:4322";
const harness = makeHarness({
	envVar: "WEATHER_LOCAL_BASE_URL",
	defaultBase: baseUrl,
	isNoise: ({ url, text, base }) =>
		text === "Failed to load resource: net::ERR_FAILED" &&
		!!url &&
		!url.startsWith(base) &&
		!url.startsWith("http://127.0.0.1:8787/"),
});
const { check } = harness;

async function listFiles(directory) {
	const entries = await readdir(directory, { withFileTypes: true });
	const nested = await Promise.all(
		entries.map((entry) => {
			const absolute = path.join(directory, entry.name);
			return entry.isDirectory() ? listFiles(absolute) : [absolute];
		}),
	);
	return nested.flat();
}

async function checkBuiltAssets() {
	const distRoot = path.join(repoRoot, "dist");
	const files = await listFiles(distRoot);
	const publicTextAssets = files.filter((file) =>
		/\.(?:html|js|mjs|json)$/iu.test(file),
	);
	const forbiddenBrowserMarkers =
		/QWEATHER_API_KEY|QWEATHER_API_HOST|X-QW-Api-Key/iu;
	let exposedMarkers = 0;
	for (const file of publicTextAssets) {
		const content = await readFile(file, "utf8");
		if (forbiddenBrowserMarkers.test(content)) exposedMarkers += 1;
	}
	check(
		"构建产物未包含和风服务端凭据绑定或密钥请求头",
		publicTextAssets.length > 0 && exposedMarkers === 0,
		`scanned=${publicTextAssets.length}, markerFiles=${exposedMarkers}`,
	);
}

async function checkProxyHealth() {
	try {
		const response = await fetch("http://127.0.0.1:8787/healthz", {
			signal: AbortSignal.timeout(2000),
		});
		const body = await response.text();
		const healthy =
			response.status === 200 &&
			body === '{"status":"ok"}' &&
			response.headers.get("cache-control") === "no-store";
		check(
			"本机受限天气代理健康接口可用",
			healthy,
			`status=${response.status}`,
		);
		return healthy;
	} catch (error) {
		check(
			"本机受限天气代理健康接口可用",
			false,
			error?.name === "TimeoutError"
				? "health timeout"
				: "health unavailable",
		);
		return false;
	}
}

function hasOnlyCoarseCoordinates(request) {
	try {
		const body = JSON.parse(request.postData() ?? "null");
		const keys = Object.keys(body ?? {}).sort();
		return (
			JSON.stringify(keys) === JSON.stringify(["lat", "lon"]) &&
			typeof body.lat === "string" &&
			typeof body.lon === "string" &&
			/^-?\d{1,2}\.\d$/u.test(body.lat) &&
			/^-?\d{1,3}\.\d$/u.test(body.lon) &&
			body.lat === "39.9" &&
			body.lon === "116.4"
		);
	} catch {
		return false;
	}
}

function hasNoBrowserCredential(request) {
	const headerNames = Object.keys(request.headers()).map((name) =>
		name.toLowerCase(),
	);
	const url = new URL(request.url());
	return (
		!headerNames.some((name) =>
			/^(?:x-qw-api-key|authorization|proxy-authorization)$/iu.test(name),
		) &&
		![...url.searchParams.keys()].some((name) =>
			/^(?:api[_-]?key|token|authorization)$/iu.test(name),
		) &&
		!/"(?:apiKey|api_key|authorization|token)"\s*:/iu.test(
			request.postData() ?? "",
		)
	);
}

function safeFieldNames(request) {
	try {
		return Object.keys(JSON.parse(request.postData() ?? "null") ?? {})
			.sort()
			.join(",");
	} catch {
		return "invalid";
	}
}

async function runPageCase(browser, { name, pagePath, width, surface }) {
	const context = await browser.newContext({
		viewport: { width, height: 900 },
	});
	const page = harness.attach(await context.newPage());
	const requests = [];
	const proxyStatuses = [];
	page.on("request", (request) => {
		requests.push(request);
	});
	page.on("response", (response) => {
		const request = response.request();
		if (request.url() === proxyUrl && request.method() === "POST") {
			proxyStatuses.push(response.status());
		}
	});
	await page.addInitScript(() => {
		window.__weatherLocationCalls = 0;
		Object.defineProperty(navigator, "geolocation", {
			configurable: true,
			value: {
				getCurrentPosition(success) {
					window.__weatherLocationCalls += 1;
					queueMicrotask(() =>
						success({
							coords: { latitude: 39.9, longitude: 116.4 },
						}),
					);
				},
			},
		});
	});

	try {
		await page.goto(new URL(pagePath, baseUrl).href, {
			waitUntil: "domcontentloaded",
			timeout: 20000,
		});

		const content =
			surface === "domain"
				? page.locator("#weather-info")
				: page.locator(
						`${surface === "mobile" ? ".mobile-weather-slot" : "#sidebar"} [data-weather-widget]`,
					);
		const source = content.getByRole("link", { name: "和风天气" });
		await source.waitFor({ state: "visible", timeout: 20000 });
		const sourceHref = await source.getAttribute("href");
		const reading = (await content.innerText()).trim();
		const sourceOk =
			sourceHref === "https://www.qweather.com/" &&
			/附近：\S+/u.test(reading) &&
			/\d+(?:\.\d+)?°C/u.test(reading);
		check(`${name} 实际显示 QWeather 天气来源与附近城市`, sourceOk);

		const attributionData = await content.evaluate((element) => {
			if (element.matches("#weather-info")) {
				const links = [...element.querySelectorAll("a")].filter(
					(anchor) =>
						anchor.href !== "https://www.qweather.com/" &&
						anchor.href.startsWith("https://"),
				);
				return {
					count: links.length,
					safe: links.every(
						(anchor) =>
							anchor.rel.includes("noopener") &&
							anchor.textContent.trim().length > 0,
					),
				};
			}
			const items = [
				...element.querySelectorAll("[data-weather-attribution]"),
			];
			return {
				count: items.length,
				safe: items.every((item) => {
					const anchor = item.querySelector("a");
					return (
						item.textContent.trim().length > 0 &&
						(!anchor ||
							(anchor.href.startsWith("https://") &&
								anchor.rel.includes("noopener")))
					);
				}),
			};
		});
		check(
			`${name} 实际展示非空且安全的和风署名`,
			attributionData.count > 0 && attributionData.safe,
			`attributions=${attributionData.count}`,
		);

		const proxyRequests = requests.filter(
			(request) =>
				request.url() === proxyUrl && request.method() === "POST",
		);
		const directQWeatherRequests = requests.filter((request) => {
			const hostname = new URL(request.url()).hostname.toLowerCase();
			return hostname.includes("qweather");
		});
		const wttrRequests = requests.filter((request) =>
			new URL(request.url()).hostname.toLowerCase().endsWith("wttr.in"),
		);
		check(
			`${name} 浏览器仅通过本地代理取天气并未直连供应商`,
			proxyRequests.length === 1 &&
				proxyStatuses.length === 1 &&
				proxyStatuses[0] === 200 &&
				directQWeatherRequests.length === 0 &&
				wttrRequests.length === 0,
			`proxyPOST=${proxyRequests.length}, status=${proxyStatuses.join(",") || "none"}, directProvider=${directQWeatherRequests.length}, wttr=${wttrRequests.length}`,
		);
		const request = proxyRequests[0];
		check(
			`${name} 浏览器请求只含北京粗化坐标字段且无凭据`,
			Boolean(request) &&
				hasOnlyCoarseCoordinates(request) &&
				hasNoBrowserCredential(request),
			`fieldNames=${request ? safeFieldNames(request) : "none"}`,
		);
		check(
			`${name} 使用假定位且只读取一次`,
			(await page.evaluate(() => window.__weatherLocationCalls)) === 1,
		);
		harness.checkClean(`${name} Live 本地浏览器走查`);
	} catch (error) {
		check(
			`${name} 浏览器验收完成`,
			false,
			error?.name === "TimeoutError"
				? "page or weather response timed out"
				: (error?.name ?? "browser error"),
		);
	} finally {
		await context.close();
	}
}

await checkBuiltAssets();
if (await checkProxyHealth()) {
	const browser = await harness.browser.launch(harness.launch);
	try {
		await runPageCase(browser, {
			name: "/domain/",
			pagePath: "/domain/",
			width: 1000,
			surface: "domain",
		});
		await runPageCase(browser, {
			name: "桌面侧栏天气卡",
			pagePath: "/",
			width: 1440,
			surface: "desktop",
		});
		await runPageCase(browser, {
			name: "手机天气卡",
			pagePath: "/",
			width: 390,
			surface: "mobile",
		});
	} finally {
		await browser.close();
	}
}

harness.finish();
