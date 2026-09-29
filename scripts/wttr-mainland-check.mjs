// wttr.in 大陆直连实测：为 PLAN 票 07 / issue #67 产出可复核证据。
//
// 为什么需要你在大陆网络上跑：本仓库的构建机与日常开发机走的是境外出口，
// 从那里量到的耗时只能证明「wttr.in 可达」，不能证明大陆访客的表现。
//
// 用法（PowerShell 7，仓库根目录）：
//   $env:NET="电信 4G"; $env:WINDOW="21:05"; pnpm qa:weather-mainland
//   pnpm qa:weather-mainland -- --site          # 量真实访客路径（首页侧栏卡片）
//   pnpm qa:weather-mainland -- --rounds 20     # 改采样次数（默认 10）
//   pnpm qa:weather-mainland -- --with-egress   # 顺带记录出口 IP 的归属地（第三方接口）
//
// 输出是一段可直接粘贴进 #67 的读数表；粘贴前请把 NET / WINDOW 两栏据实填好，
// 缺这两栏的读数不能当作大陆链路证据。
//
// 两处刻意的设计，改之前先读完：
// 1. 每次采样都新开一个浏览器上下文 —— HTTP 缓存按上下文隔离，复用同一上下文连测
//    会让第 2 次起命中缓存（本机自测量到过 1ms 的假耗时）。新开上下文量的是「首次访客」。
// 2. --site 模式注入北京粗坐标而不走真实定位 —— 本工具只测网络链路。浏览器定位在大陆
//    能否成功是另一个未测问题，这里被注入绕开了，不要从本工具的读数推断它。
import { chromium } from "playwright";

const args = process.argv.slice(2);
const arg = (name, fallback) => {
	const i = args.indexOf(`--${name}`);
	return i >= 0 ? args[i + 1] : fallback;
};
const flag = (name) => args.includes(`--${name}`);

const ROUNDS = Number(arg("rounds", "10"));
const SITE_MODE = flag("site");
const EGRESS = flag("with-egress");
const TIMEOUT_MS = 8000; // 与 public/weather/weather-service.js 的单源上限一致
const POINT = { lat: 39.9, lon: 116.4 }; // 公开北京粗坐标，不含任何真实位置
const BASE = "https://caiyan12.github.io";

const netLabel = process.env.NET ?? "未填写";
const windowLabel = process.env.WINDOW ?? "未填写";

const browser = await chromium.launch();
const rows = [];

async function timed(label, fn) {
	const started = Date.now();
	try {
		const detail = await fn();
		rows.push({
			sample: label,
			ok: true,
			ms: Date.now() - started,
			...detail,
		});
	} catch (error) {
		rows.push({
			sample: label,
			ok: false,
			ms: Date.now() - started,
			error: String(error?.message ?? error).slice(0, 120),
		});
	}
}

// 每次采样一个干净上下文：缓存冷、无残留状态。
async function withColdContext(run) {
	const context = await browser.newContext({ locale: "zh-CN" });
	try {
		return await run(context);
	} finally {
		await context.close();
	}
}

if (SITE_MODE) {
	for (let i = 1; i <= ROUNDS; i += 1) {
		await timed(`站点第 ${i} 次`, () =>
			withColdContext(async (context) => {
				await context.grantPermissions(["geolocation"], {
					origin: new URL(BASE).origin,
				});
				await context.setGeolocation({
					latitude: POINT.lat,
					longitude: POINT.lon,
				});
				const page = await context.newPage();
				const started = Date.now();
				await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
				const state = await page
					.waitForFunction(
						() => {
							const el = document.querySelector(
								"#sidebar [data-weather-widget]",
							);
							const s = el?.dataset.weatherState;
							return s === "success" ||
								s === "weather-error" ||
								s === "location-error"
								? s
								: null;
						},
						undefined,
						{ timeout: TIMEOUT_MS + 4000 },
					)
					.then((h) => h.jsonValue())
					.catch(() => "timeout");
				return {
					state,
					widgetMs: Date.now() - started,
					city: await page
						.$eval("[data-weather-city]", (el) =>
							el.textContent.trim(),
						)
						.catch(() => null),
					lines: await page
						.$eval("[data-weather-description]", (el) =>
							el.textContent.trim(),
						)
						.catch(() => null),
				};
			}),
		);
	}
} else {
	for (let i = 1; i <= ROUNDS; i += 1) {
		await timed(`API 第 ${i} 次`, () =>
			withColdContext(async (context) => {
				const page = await context.newPage();
				const result = await page.evaluate(
					async ({ point, limit }) => {
						const url = `https://wttr.in/${point.lat},${point.lon}?format=j1&lang=zh`;
						const controller = new AbortController();
						const timer = setTimeout(
							() => controller.abort(),
							limit,
						);
						const started = performance.now();
						try {
							const response = await fetch(url, {
								signal: controller.signal,
								cache: "no-store",
							});
							const data = await response
								.json()
								.catch(() => null);
							const timing =
								performance
									.getEntriesByType("resource")
									.filter((e) => e.name === url)
									.pop() ?? null;
							return {
								status: response.status,
								fetchMs: Math.round(
									performance.now() - started,
								),
								// 跨域且无 Timing-Allow-Origin 时浏览器会把尺寸报为 0，
								// 所以只能当参考字段，不能拿来判缓存命中。
								transferSize: timing?.transferSize ?? null,
								code:
									data?.current_condition?.[0]?.weatherCode ??
									null,
								city:
									data?.nearest_area?.[0]?.areaName?.[0]
										?.value ?? null,
							};
						} finally {
							clearTimeout(timer);
						}
					},
					{ point: POINT, limit: TIMEOUT_MS },
				);
				if (!result.status || result.status >= 400) {
					throw new Error(`HTTP ${result.status}`);
				}
				return result;
			}),
		);
	}
}

if (EGRESS) {
	const context = await browser.newContext();
	const page = await context.newPage();
	const outcome = await page
		.evaluate(async () => {
			const r = await fetch("https://ipinfo.io/json", {
				signal: AbortSignal.timeout(6000),
			});
			const j = await r.json();
			return { ip: j.ip, country: j.country, city: j.city, org: j.org };
		})
		.catch((error) => ({ error: String(error).slice(0, 80) }));
	await context.close();
	rows.push({ sample: "出口 IP", ok: !outcome.error, ...outcome });
}

await browser.close();

const samples = rows.filter((r) => r.sample !== "出口 IP");
const oks = samples.filter((r) => r.ok);
const times = oks
	.map((r) => r.fetchMs ?? r.widgetMs ?? r.ms)
	.sort((a, b) => a - b);
const pct = (p) =>
	times.length
		? times[Math.min(times.length - 1, Math.floor(times.length * p))]
		: null;

console.log("```text");
console.log(`wttr.in 大陆直连实测 · ${new Date().toISOString()}`);
console.log(`网络/运营商 NET = ${netLabel}`);
console.log(`时段 WINDOW = ${windowLabel}`);
console.log(
	`模式 = ${
		SITE_MODE
			? "站点访客路径（首页侧栏卡片，注入北京粗坐标）"
			: "API 直连（公开北京粗坐标）"
	}`,
);
console.log(
	`样本 = ${samples.length} 次 · 成功 ${oks.length} · 失败 ${samples.length - oks.length}`,
);
console.log(
	`耗时 = 最小 ${times[0] ?? "-"} / 中位 ${pct(0.5) ?? "-"} / P90 ${pct(0.9) ?? "-"} / 最大 ${times[times.length - 1] ?? "-"} ms`,
);
console.log(
	`超过 ${TIMEOUT_MS}ms 上限的样本数 = ${times.filter((t) => t > TIMEOUT_MS).length}`,
);
console.log("逐条：");
for (const r of rows) console.log(`  ${JSON.stringify(r)}`);
console.log("```");

console.log(
	netLabel === "未填写" || windowLabel === "未填写"
		? "⚠️ NET / WINDOW 未填 —— 缺这两栏的读数不能登记为大陆链路证据（PLAN 票 07 判据）"
		: "读数已带网络与时段，可登记进 #67",
);
