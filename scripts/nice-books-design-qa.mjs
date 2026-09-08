// Nice Books 设计升级独立验收（Playwright）
// 运行：node scripts/nice-books-design-qa.mjs
// 预览：NICE_BOOKS_BASE_URL=http://127.0.0.1:4322/books/ node scripts/nice-books-design-qa.mjs
//
// 这份脚本只观察真实浏览器中的 DOM、样式、请求、几何与时序，不导入 Nice Books
// 实现模块，也不复用已有 smoke 的断言。截图和 JSON 会写入 output/nice-books-design/，
// Markdown 汇总写入 .superpowers/sdd/nice-books-design-upgrade/qa-report.md。

import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const baseUrl =
	process.env.NICE_BOOKS_BASE_URL ?? "http://127.0.0.1:4322/books/";
const buildLabel =
	process.env.NB_BUILD_LABEL ??
	process.env.NICE_BOOKS_QA_BUILD_LABEL ??
	"preview (build id not supplied)";
const origin = new URL(baseUrl).origin;
const urls = {
	home: `${origin}/books/`,
	archive: `${origin}/books/archive/`,
	detail: `${origin}/books/01/`,
	root: `${origin}/`,
};
const artifactDir = path.resolve("output/nice-books-design");
const reportDir = path.resolve(".superpowers/sdd/nice-books-design-upgrade");
const reportJson = path.join(artifactDir, "qa-report.json");
const reportMarkdown = path.join(reportDir, "qa-report.md");
const supplementaryEvidence = [
	path.join(artifactDir, "home-zoom-200.png"),
	path.join(artifactDir, "archive-zoom-200.png"),
	path.join(artifactDir, "detail-zoom-200.png"),
	path.join(reportDir, "zoom-resource-report.json"),
].filter((file) => fs.existsSync(file));
fs.mkdirSync(artifactDir, { recursive: true });
fs.mkdirSync(reportDir, { recursive: true });

const results = [];
const screenshots = [];
const timings = [];
const externalFailures = [];
const runtimeErrors = [];

function check(name, ok, detail = "", extra = {}) {
	const result = { name, ok: Boolean(ok), detail, ...extra };
	results.push(result);
	console.log(
		`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` :: ${detail}` : ""}`,
	);
	return Boolean(ok);
}

async function safe(name, fn) {
	try {
		return await fn();
	} catch (error) {
		check(
			name,
			false,
			error instanceof Error ? error.message : String(error),
		);
		return undefined;
	}
}

function attachObservers(page, errors, opts = {}) {
	page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
	page.on("console", (message) => {
		if (message.type() !== "error") return;
		if (message.text().includes("Failed to load resource")) return;
		errors.push(`console: ${message.text()}`);
	});
	page.on("response", (response) => {
		if (response.status() < 400) return;
		const url = response.url();
		if (url.includes("jsdelivr") || url.includes("fontsapi.zeoseven.com")) {
			externalFailures.push(`${response.status()} ${url}`);
			return;
		}
		if (opts.ignoreExpected?.some((re) => re.test(url))) return;
		if (!url.endsWith("/favicon.ico"))
			errors.push(`HTTP ${response.status()}: ${url}`);
	});
	page.on("requestfailed", (request) => {
		const url = request.url();
		if (url.includes("jsdelivr") || url.includes("fontsapi.zeoseven.com")) {
			externalFailures.push(`failed ${url}`);
			return;
		}
		if (opts.ignoreExpected?.some((re) => re.test(url))) return;
		if (!url.endsWith("/favicon.ico")) {
			errors.push(
				`requestfailed: ${url} ${request.failure()?.errorText ?? ""}`,
			);
		}
	});
}

async function stable(page, selector = 'main[data-pagefind-ignore="all"]') {
	await page.waitForSelector(selector, { timeout: 15000 });
	// waitForTimeout keeps the helper usable in the no-JS SSR context too;
	// requestAnimationFrame never runs there and Playwright reports a collected promise.
	await page.waitForTimeout(32);
}

async function open(page, url, selector = 'main[data-pagefind-ignore="all"]') {
	await page.goto(url, { waitUntil: "domcontentloaded" });
	await stable(page, selector);
}

async function waitArchiveReady(page, allowError = false) {
	await page.waitForFunction(
		(acceptError) => {
			const line = document.querySelector("#nb-result-line");
			const dataDone = performance
				.getEntriesByType("resource")
				.some((entry) => {
					try {
						return (
							new URL(entry.name).pathname ===
								"/books/data.json" && entry.responseEnd > 0
						);
					} catch {
						return false;
					}
				});
			const ready =
				Boolean(line?.textContent?.trim()) &&
				dataDone &&
				document.querySelectorAll(
					"#nb-archive-grid > li, #nb-archive-list > li",
				).length > 0 &&
				document.querySelectorAll('[aria-busy="true"]').length === 0;
			const error = document.querySelector(
				"[data-nb-archive-error]:not([hidden])",
			);
			return ready || (acceptError && Boolean(error));
		},
		allowError,
		{ timeout: 10000 },
	);
}

async function getArchiveTotal(page) {
	const line = await page.textContent("#nb-result-line");
	const match = line?.match(/^共\s+(\d+)\s+本藏书/);
	if (!match) throw new Error(`无法从书库结果行读取总数：${line ?? ""}`);
	return Number(match[1]);
}

async function loadArchiveAll(page, selector) {
	const total = await getArchiveTotal(page);
	const limit = Math.ceil(Math.max(0, total - 12) / 10) + 2;
	for (let attempt = 0; attempt < limit; attempt += 1) {
		if ((await page.locator(`${selector} > li`).count()) >= total) break;
		const more = page.locator("#nb-btn-more");
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
	const count = await page.locator(`${selector} > li`).count();
	if (count !== total)
		throw new Error(`${selector} 仅载入 ${count}/${total} 本书`);
	return total;
}

async function visibleCount(page, selector) {
	return page.locator(selector).evaluateAll(
		(els) =>
			els.filter((el) => {
				const s = getComputedStyle(el);
				return (
					s.display !== "none" &&
					s.visibility !== "hidden" &&
					el.getClientRects().length > 0
				);
			}).length,
	);
}

async function firstVisible(page, selectors) {
	for (const selector of selectors) {
		const locator = page.locator(selector).first();
		if (
			(await locator.count()) &&
			(await locator.isVisible().catch(() => false))
		)
			return locator;
	}
	return null;
}

async function heroId(page) {
	return page.evaluate(() => {
		const link = document.querySelector('#nb-hero a[href*="/books/"]');
		return (
			link?.getAttribute("href")?.match(/\/books\/(\d+)\//)?.[1] ?? null
		);
	});
}

async function waitForBookChange(page, previous, timeout = 1800) {
	await page.waitForFunction(
		(prev) => {
			const id = document
				.querySelector('#nb-hero a[href*="/books/"]')
				?.getAttribute("href")
				?.match(/\/books\/(\d+)\//)?.[1];
			return Boolean(id && id !== prev);
		},
		previous,
		{ timeout },
	);
}

async function waitBusyDone(page, selectors, timeout = 2500) {
	await page.waitForFunction(
		(list) =>
			list.every((selector) => {
				const el = document.querySelector(selector);
				return (
					!el ||
					(!el.hasAttribute("aria-busy") &&
						!(el instanceof HTMLButtonElement && el.disabled))
				);
			}),
		selectors,
		{ timeout },
	);
}

function contrast(fg, bg) {
	const parse = (value) => {
		const m = value.match(
			/rgba?\(\s*([\d.]+)[, ]+\s*([\d.]+)[, ]+\s*([\d.]+)(?:[,/]\s*([\d.]+))?\s*\)/i,
		);
		if (!m) return null;
		return {
			r: +m[1],
			g: +m[2],
			b: +m[3],
			a: m[4] === undefined ? 1 : +m[4],
		};
	};
	const a = parse(fg);
	const b = parse(bg);
	if (!a || !b) return null;
	const mix = (channel, alpha) => channel * alpha + 255 * (1 - alpha);
	const rgb = (c) =>
		[mix(c.r, c.a), mix(c.g, c.a), mix(c.b, c.a)].map((v) => v / 255);
	const lum = (c) =>
		rgb(c)
			.map((v) =>
				v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4,
			)
			.reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
	const l1 = lum(a);
	const l2 = lum(b);
	return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

async function textMetrics(page, selector) {
	return page.evaluate((sel) => {
		const out = [];
		for (const el of document.querySelectorAll(sel)) {
			const s = getComputedStyle(el);
			if (
				s.display === "none" ||
				el.getClientRects().length === 0 ||
				!(el.textContent ?? "").trim()
			)
				continue;
			let node = el;
			let bg = "rgba(0, 0, 0, 0)";
			while (node && node instanceof Element) {
				const current = getComputedStyle(node).backgroundColor;
				if (
					current !== "rgba(0, 0, 0, 0)" &&
					current !== "transparent"
				) {
					bg = current;
					break;
				}
				node = node.parentElement;
			}
			out.push({
				text: (el.textContent ?? "").trim().slice(0, 60),
				font: s.fontFamily,
				size: parseFloat(s.fontSize),
				fg: s.color,
				bg,
			});
		}
		return out;
	}, selector);
}

async function gridColumns(page, selector) {
	return page.locator(`${selector} > li`).evaluateAll((items) => {
		const lefts = items
			.filter((el) => el.getClientRects().length)
			.map((el) => Math.round(el.getBoundingClientRect().left));
		return new Set(lefts).size;
	});
}

async function overflow(page) {
	return page.evaluate(() => ({
		width: document.documentElement.clientWidth,
		document: document.documentElement.scrollWidth,
		body: document.body.scrollWidth,
	}));
}

async function sharedShellContract(page) {
	return page.evaluate(() => {
		const count = (selector) => document.querySelectorAll(selector).length;
		return {
			hero: {
				article: count("#nb-hero article"),
				shell: count("#nb-hero .nb-book3d-hero"),
				cover: count("#nb-hero .nb-book3d-hero .nb-cover"),
				back: count("#nb-hero .nb-book3d-hero .nb-book3d-back"),
				pages: count("#nb-hero .nb-book3d-hero .nb-book3d-pages"),
			},
			cards: {
				items: count("#nb-featured-grid > li"),
				shells: count("#nb-featured-grid > li .nb-book3d-card"),
				covers: count(
					"#nb-featured-grid > li .nb-book3d-card .nb-cover",
				),
				back: count(
					"#nb-featured-grid > li .nb-book3d-card .nb-book3d-back",
				),
				pages: count(
					"#nb-featured-grid > li .nb-book3d-card .nb-book3d-pages",
				),
			},
		};
	});
}

async function screenshot(page, name) {
	const file = path.join(artifactDir, `${name}.png`);
	await page.evaluate(() => window.scrollTo(0, 0));
	await page.waitForTimeout(32);
	await page.screenshot({ path: file, fullPage: true });
	screenshots.push(file);
}

async function coverKey(page, selector = "article") {
	return page
		.locator(`${selector} .nb-cover, ${selector} [data-nb-cover]`)
		.first()
		.evaluate((root) => {
			const svg =
				root.querySelector("svg") ??
				(root.tagName.toLowerCase() === "svg" ? root : null);
			if (svg) {
				// The rendered SVG does not expose a family text marker in the preview contract;
				// its first full-size rect is the stable family signature shared by SSR/client/fallback.
				const background =
					svg
						.querySelector('rect[x="0"][y="0"]')
						?.getAttribute("fill") ??
					svg.querySelector("rect")?.getAttribute("fill") ??
					"";
				return `svg:${background}:${svg.outerHTML}`;
			}
			const img =
				root.querySelector("img") ??
				(root.tagName.toLowerCase() === "img" ? root : null);
			return img
				? `img:${img.getAttribute("src") ?? ""}`
				: root.outerHTML;
		});
}

async function findRetry(page) {
	const retry = page.locator("[data-nb-archive-retry]");
	return (await retry.count()) && (await retry.isVisible().catch(() => false))
		? retry
		: null;
}

async function sampleHeroSwap(page, previous) {
	return page.evaluate(
		(prev) =>
			new Promise((resolve, reject) => {
				const button = document.querySelector("#nb-today-shuffle");
				if (!(button instanceof HTMLElement)) {
					reject(new Error("缺少今日好书换一换入口"));
					return;
				}
				const samples = [];
				const start = performance.now();
				let busySeen = false;
				button.click();
				const frame = () => {
					const el = document.querySelector("#nb-hero .nb-hero-book");
					const r = el?.getBoundingClientRect();
					const style = el ? getComputedStyle(el) : null;
					const sample = {
						t: performance.now(),
						opacity: style?.opacity ?? null,
						transform: style?.transform ?? null,
						y: r?.top ?? null,
					};
					samples.push(sample);
					const id = document
						.querySelector('#nb-hero a[href*="/books/"]')
						?.getAttribute("href")
						?.match(/\/books\/(\d+)\//)?.[1];
					const elapsed = sample.t - start;
					const opacity = Number.parseFloat(sample.opacity ?? "0");
					const controlsReady = [
						"#nb-today-shuffle",
						"#nb-intro-shuffle",
					].every((selector) => {
						const control = document.querySelector(selector);
						return (
							control &&
							control.getAttribute("aria-busy") !== "true" &&
							!(
								control instanceof HTMLButtonElement &&
								control.disabled
							)
						);
					});
					const controlsBusy = [
						"#nb-today-shuffle",
						"#nb-intro-shuffle",
					].some((selector) => {
						const control = document.querySelector(selector);
						return (
							control?.getAttribute("aria-busy") === "true" ||
							(control instanceof HTMLButtonElement &&
								control.disabled)
						);
					});
					busySeen ||= controlsBusy;
					if (
						id &&
						id !== prev &&
						elapsed > 80 &&
						samples.length >= 20 &&
						opacity >= 0.99 &&
						busySeen &&
						controlsReady
					) {
						const gaps = samples
							.slice(1)
							.map((item, i) => item.t - samples[i].t);
						resolve({
							samples,
							duration: elapsed,
							maxGap: Math.max(...gaps),
							sampleCount: samples.length,
							busySeen,
							controlsReady,
						});
						return;
					}
					if (elapsed >= 1800) {
						const gaps = samples
							.slice(1)
							.map((item, i) => item.t - samples[i].t);
						resolve({
							samples,
							duration: elapsed,
							maxGap: Math.max(...gaps),
							sampleCount: samples.length,
							busySeen,
							controlsReady,
							timedOut: true,
						});
						return;
					}
					requestAnimationFrame(frame);
				};
				requestAnimationFrame(frame);
			}),
		previous,
	);
}

async function captureHeroSwapFrames(page) {
	const previous = await heroId(page);
	await page.click("#nb-today-shuffle");
	const clip = await page.evaluate(() => {
		const rect = document
			.querySelector("#nb-hero")
			?.getBoundingClientRect();
		return rect
			? {
					x: Math.max(0, rect.left),
					y: Math.max(0, rect.top),
					width: rect.width,
					height: rect.height,
				}
			: null;
	});
	if (!clip) throw new Error("缺少 hero 截图区域");
	const offsets = [0, 100, 200, 300, 400, 500];
	const started = Date.now();
	for (let i = 0; i < offsets.length; i++) {
		const wait = offsets[i] - (Date.now() - started);
		if (wait > 0) await page.waitForTimeout(wait);
		const framePath = path.join(
			artifactDir,
			`hero-swap-frame-${String(i * 6).padStart(2, "0")}.png`,
		);
		await page.screenshot({ path: framePath, clip });
		screenshots.push(framePath);
	}
	await waitForBookChange(page, previous, 1800).catch(() => {});
}

async function run() {
	const browser = await chromium.launch();
	let context;
	try {
		context = await browser.newContext({
			viewport: { width: 1280, height: 900 },
		});
		const errors = [];
		const page = await context.newPage();
		attachObservers(page, errors);

		// A. 首页语义、SSR/client 结构、资源隔离与两入口忙碌状态。
		await safe("首页可访问并完成 DOM 稳定", () => open(page, urls.home));
		await safe("首页 main 排除 Pagefind", async () =>
			check(
				"首页 main[data-pagefind-ignore=all]",
				(await page
					.locator('main[data-pagefind-ignore="all"]')
					.count()) === 1,
			),
		);
		await safe("SSR 与 client 动态片段结构一致", async () => {
			// Wait past the client-side random replacement/intro handoff before taking
			// the client signature; capturing between SSR and client innerHTML swaps
			// would compare two transient states.
			await page.waitForSelector("#nb-hero article .nb-hero-book", {
				timeout: 5000,
			});
			await page.waitForTimeout(220);
			const clientShape = await sharedShellContract(page);
			const noJs = await browser.newContext({
				viewport: { width: 1280, height: 900 },
				javaScriptEnabled: false,
			});
			const ssrPage = await noJs.newPage();
			await open(ssrPage, urls.home);
			const ssrShape = await sharedShellContract(ssrPage);
			await noJs.close();
			const hero =
				JSON.stringify(clientShape.hero) ===
				JSON.stringify(ssrShape.hero);
			const cards =
				JSON.stringify(clientShape.cards) ===
				JSON.stringify(ssrShape.cards);
			return check(
				"SSR/client hero 与推荐卡使用同一结构",
				hero && cards,
				`hero=${hero} card=${cards}`,
			);
		});
		await safe("首页没有主站运行时依赖", async () => {
			const resources = await page.evaluate(() =>
				performance.getEntriesByType("resource").map((e) => e.name),
			);
			const bad = resources.filter((url) =>
				/(?:^|\/)pio(?:[./]|\/)|giscus|theme-script|pagefind|global\.css/i.test(
					url,
				),
			);
			return check(
				"首页资源隔离（Pio/Giscus/Pagefind）",
				bad.length === 0,
				bad.join(" | "),
			);
		});
		await safe("主站首页没有 Nice Books/GSAP 运行时资源", async () => {
			const rootPage = await context.newPage();
			await open(rootPage, urls.root, "body");
			const resources = await rootPage.evaluate(() =>
				performance.getEntriesByType("resource").map((e) => e.name),
			);
			const jsResources = resources.filter((url) =>
				/\.js(?:$|\?)/i.test(url),
			);
			const sourceHits = await rootPage.evaluate(async (urls) => {
				const hits = [];
				for (const url of urls) {
					try {
						const text = await fetch(url).then((res) => res.text());
						if (/\b(?:gsap|ScrollTrigger)\b/i.test(text))
							hits.push(url);
					} catch {
						/* resource content is supplementary evidence */
					}
				}
				return hits;
			}, jsResources);
			const bad = resources.filter((url) =>
				/\/books\//i.test(new URL(url).pathname),
			);
			await rootPage.close();
			return check(
				"主站资源不加载 Nice Books/GSAP",
				bad.length === 0 && sourceHits.length === 0,
				JSON.stringify({ bad, sourceHits }),
			);
		});
		await safe("featured 腰封可见且普通书封不误显示腰封文案", async () => {
			const ssrContext = await browser.newContext({
				viewport: { width: 1280, height: 900 },
				javaScriptEnabled: false,
			});
			const ssrPage = await ssrContext.newPage();
			await open(ssrPage, urls.home);
			const ribbon = ssrPage.locator("#nb-hero .nb-sash");
			const face = ssrPage.locator("#nb-hero .nb-sash-face");
			const copy = ssrPage.locator("#nb-hero .nb-sash-copy");
			const cardSashes = page.locator("#nb-featured-grid .nb-sash");
			const counts = {
				sash: await ribbon.count(),
				face: await face.count(),
				copy: await copy.count(),
				cardSashes: await cardSashes.count(),
			};
			const ok =
				counts.sash === 1 &&
				counts.face === 1 &&
				counts.copy === 1 &&
				counts.cardSashes === 6;
			await ssrContext.close();
			return check(
				"featured 显示 .nb-sash 正面与折返文案",
				ok,
				JSON.stringify(counts),
			);
		});
		await safe("书封外壳按 hero/card 变体渲染", async () => {
			const hero = await page.locator(".nb-book3d-hero").count();
			const cards = await page
				.locator("#nb-featured-grid .nb-book3d-card")
				.count();
			return check(
				"首页包含 .nb-book3d-hero 与 .nb-book3d-card",
				hero === 1 && cards === 6,
				`hero=${hero} card=${cards}`,
			);
		});
		await safe("首页双入口共享忙碌状态并在完成后恢复", async () => {
			const controls = ["#nb-today-shuffle", "#nb-intro-shuffle"];
			const before = await heroId(page);
			const main = page.locator("#nb-today-shuffle");
			if (!(await main.count()))
				throw new Error("缺少今日好书换一换入口");
			await main.click();
			const during = await page.evaluate(
				(selectors) =>
					selectors.map((selector) => {
						const el = document.querySelector(selector);
						return el
							? {
									disabled:
										el instanceof HTMLButtonElement &&
										el.disabled,
									busy: el.getAttribute("aria-busy"),
								}
							: null;
					}),
				controls,
			);
			const sharedBusy =
				during[0]?.busy === "true" &&
				(during[1] == null ||
					during[1].busy === "true" ||
					during[1].disabled === true);
			await waitForBookChange(page, before);
			await waitBusyDone(page, controls);
			const done = await page.evaluate(
				(selectors) =>
					selectors.every((selector) => {
						const el = document.querySelector(selector);
						return (
							!el ||
							(el.getAttribute("aria-busy") !== "true" &&
								!(
									el instanceof HTMLButtonElement &&
									el.disabled
								))
						);
					}),
				controls,
			);
			const beforeIntro = await heroId(page);
			await page.click("#nb-intro-shuffle");
			const introBusy = await page.evaluate(() => {
				const a = document.querySelector("#nb-intro-shuffle");
				const b = document.querySelector("#nb-today-shuffle");
				return (
					Boolean(
						a?.getAttribute("aria-busy") === "true" ||
						(a instanceof HTMLButtonElement && a.disabled),
					) &&
					Boolean(
						b?.getAttribute("aria-busy") === "true" ||
						(b instanceof HTMLButtonElement && b.disabled),
					)
				);
			});
			await waitForBookChange(page, beforeIntro);
			await waitBusyDone(page, controls);
			return check(
				"今日好书双入口忙碌/完成同步",
				sharedBusy && done && introBusy,
				JSON.stringify({ during, done, introBusy }),
			);
		});
		await safe("首页主书换书连续帧与耗时在交付范围", async () => {
			const before = await heroId(page);
			const sample = await sampleHeroSwap(page, before);
			timings.push({ action: "hero-swap", ...sample });
			await captureHeroSwapFrames(page);
			return check(
				"主书换书帧采样连续且耗时可控",
				sample.sampleCount >= 20 &&
					sample.maxGap < 150 &&
					sample.duration > 80 &&
					sample.duration <= 900,
				JSON.stringify(sample),
			);
		});
		await safe("桌面 hover 反馈有门控且位移/倾斜受限", async () => {
			const target = await firstVisible(page, [
				"#nb-hero .nb-hero-book",
				"#nb-featured-grid > li",
			]);
			if (!target) throw new Error("缺少可 hover 的书本元素");
			await target.evaluate((el) =>
				el.scrollIntoView({ block: "center", inline: "nearest" }),
			);
			await page.waitForTimeout(32);
			const before = await target.evaluate((el) => ({
				transform: getComputedStyle(el).transform,
				top: el.getBoundingClientRect().top,
			}));
			await target.hover();
			await page.waitForTimeout(220);
			const after = await target.evaluate((el) => ({
				transform: getComputedStyle(el).transform,
				top: el.getBoundingClientRect().top,
			}));
			const shift = Math.abs(after.top - before.top);
			const changed =
				before.transform !== after.transform || shift > 0.25;
			const mediaGate = await page.evaluate(
				() => matchMedia("(hover: hover) and (pointer: fine)").matches,
			);
			return check(
				"fine pointer hover 有反馈且位移不超过 4px",
				mediaGate && changed && shift <= 5,
				JSON.stringify({ mediaGate, changed, shift, before, after }),
			);
		});

		// B. 三页在规定断点检查无横向溢出与实际网格列数。
		for (const width of [320, 390, 540, 541, 760, 960, 1280]) {
			await page.setViewportSize({ width, height: 900 });
			for (const [kind, url, selector] of [
				["home", urls.home, "#nb-featured-grid"],
				["archive", urls.archive, "#nb-archive-grid"],
				[
					"detail",
					urls.detail,
					'section[aria-labelledby="nb-related-title"] ul',
				],
			]) {
				await safe(`${kind} ${width}px DOM`, async () => {
					await open(page, url);
					if (kind === "archive") await waitArchiveReady(page);
					const box = await overflow(page);
					check(
						`${kind} ${width}px 无横向溢出`,
						box.document <= box.width + 1 &&
							box.body <= box.width + 1,
						JSON.stringify(box),
					);
					if (
						kind !== "detail" ||
						(await page.locator(selector).count())
					) {
						const expected =
							kind === "detail"
								? width < 360
									? 1
									: width < 760
										? 2
										: width < 1080
											? 3
											: 4
								: width < 360
									? 1
									: width < 760
										? 2
										: 3;
						const actual = await gridColumns(page, selector);
						check(
							`${kind} ${width}px 网格列数`,
							actual === expected,
							`expected=${expected} actual=${actual}`,
						);
					}
					if (kind === "detail" && width <= 540) {
						const order = await page.evaluate(() => {
							const article = document.querySelector("article");
							const title = article?.querySelector(
								"h1, [data-book-title], .detail-title",
							);
							const cover =
								article
									?.querySelector(
										".nb-cover, [data-nb-cover]",
									)
									?.closest(".nb-book3d, .nb-cover") ??
								article?.querySelector(
									".nb-cover, [data-nb-cover]",
								);
							if (!article || !title || !cover) return null;
							const nodes = Array.from(
								article.querySelectorAll(
									"h1, [data-book-title], .detail-title, .nb-book3d, .nb-cover, [data-nb-cover]",
								),
							);
							return {
								title: nodes.indexOf(title),
								cover: nodes.indexOf(cover),
							};
						});
						check(
							`详情 ${width}px 标题先于封面`,
							Boolean(
								order &&
								order.title >= 0 &&
								order.cover >= 0 &&
								order.title < order.cover,
							),
							JSON.stringify(order),
						);
					}
				});
			}
		}
		await page.setViewportSize({ width: 1280, height: 900 });
		await safe("书库列表使用 list 书封变体", async () => {
			await open(page, urls.archive);
			await waitArchiveReady(page);
			await loadArchiveAll(page, "#nb-archive-grid");
			await screenshot(page, "archive-grid-all-1280");
			await page.click("#nb-view-list");
			await page.waitForFunction(
				() =>
					document.querySelectorAll("#nb-archive-list > li").length >
						0 &&
					document.querySelectorAll(
						"#nb-archive-list .nb-book3d-list",
					).length > 0,
				null,
				{ timeout: 3000 },
			);
			await loadArchiveAll(page, "#nb-archive-list");
			await screenshot(page, "archive-list-all-1280");
			const count = await page
				.locator("#nb-archive-list .nb-book3d-list")
				.count();
			return check(
				"书库列表存在 .nb-book3d-list",
				count > 0,
				`count=${count}`,
			);
		});
		for (const [kind, url] of [
			["home", urls.home],
			["archive", urls.archive],
			["detail", urls.detail],
		]) {
			await safe(`${kind} 1280 screenshot`, async () => {
				await open(page, url);
				if (kind === "archive") await waitArchiveReady(page);
				await screenshot(page, `${kind}-1280`);
			});
			await safe(`${kind} 390 screenshot`, async () => {
				await page.setViewportSize({ width: 390, height: 844 });
				await open(page, url);
				if (kind === "archive") await waitArchiveReady(page);
				await screenshot(page, `${kind}-390`);
				await page.setViewportSize({ width: 1280, height: 900 });
			});
		}

		// C. 字体、元文字对比度、reduced-motion 与确定性四族书封。
		await page.setViewportSize({ width: 390, height: 844 });
		await open(page, urls.detail);
		await safe("元文字字体与对比度达到可读下限", async () => {
			const metrics = await textMetrics(
				page,
				'article dt, article dd, [data-nb-meta], .nb-meta, [class*="text-nb-muted"]',
			);
			const rows = metrics.map((m) => ({
				...m,
				ratio: contrast(m.fg, m.bg),
			}));
			const ok =
				rows.length > 0 &&
				rows.every(
					(m) => m.size >= 13 && (m.ratio == null || m.ratio >= 4.5),
				);
			return check(
				"详情元文字 >=13px 且对比度 >=4.5:1",
				ok,
				JSON.stringify(rows),
			);
		});
		await safe("正文与标题字体槽位可观察", async () => {
			const font = await page.evaluate(() => ({
				body: getComputedStyle(document.body).fontFamily,
				title: getComputedStyle(
					document.querySelector("article h1") ?? document.body,
				).fontFamily,
				status: document.fonts.status,
				bodyLoaded: document.fonts.check(
					'16px "Noto Sans SC Variable"',
				),
				titleLoaded: document.fonts.check('30px "FZShuSong-Z01S"'),
			}));
			return check(
				"Nice Books 正文/标题使用独立字体槽位且字体可检查",
				/Noto Sans|sans-serif/i.test(font.body) &&
					/serif|ShuSong|宋/i.test(font.title) &&
					font.status === "loaded" &&
					font.bodyLoaded === true,
				JSON.stringify(font),
			);
		});
		await safe("reduced-motion 取消位移与 stagger delay", async () => {
			const rm = await context.newPage();
			await rm.emulateMedia({ reducedMotion: "reduce" });
			await open(rm, urls.home);
			const info = await rm.evaluate(() => ({
				duration: getComputedStyle(
					document.querySelector("#nb-hero") ?? document.body,
				).transitionDuration,
				delays: Array.from(
					document.querySelectorAll(".nb-stagger"),
				).map((el) => getComputedStyle(el).animationDelay),
				media: matchMedia("(prefers-reduced-motion: reduce)").matches,
			}));
			await rm.close();
			return check(
				"减少动效下过渡短、级联延迟归零",
				info.media &&
					parseFloat(info.duration) <= 0.02 &&
					info.delays.every((delay) => parseFloat(delay) <= 0.001),
				JSON.stringify(info),
			);
		});
		await safe("200% 页面缩放下三页仍无溢出", async () => {
			// 这是 Chromium CDP 页面缩放（page scale），不是 CSS zoom，也不是系统浏览器
			// 的 Ctrl+Plus 原生缩放；报告明确记录这种验证边界，避免把两者混为一谈。
			const cdp = await context.newCDPSession(page);
			await open(page, urls.detail);
			await cdp.send("Emulation.setPageScaleFactor", {
				pageScaleFactor: 2,
			});
			await page.waitForFunction(
				() => (window.visualViewport?.scale ?? 1) >= 1.99,
				null,
				{ timeout: 2000 },
			);
			const info = await page.evaluate(() => ({
				scale: window.visualViewport?.scale ?? 1,
				box: {
					width: document.documentElement.clientWidth,
					document: document.documentElement.scrollWidth,
					body: document.body.scrollWidth,
				},
			}));
			await cdp.send("Emulation.setPageScaleFactor", {
				pageScaleFactor: 1,
			});
			return check(
				"CDP 页面缩放 200%（非浏览器原生缩放）无横向溢出",
				info.scale >= 1.99 &&
					info.box.document <= info.box.width + 1 &&
					info.box.body <= info.box.width + 1,
				JSON.stringify(info),
			);
		});
		await safe("全量书封映射稳定且至少四族", async () => {
			const bookIds = await page.evaluate(async () => {
				const response = await fetch("/books/data.json");
				if (!response.ok) throw new Error(`HTTP ${response.status}`);
				const data = await response.json();
				if (!Array.isArray(data)) throw new Error("书库数据不是数组");
				return data.map((book) => book.id);
			});
			const keys = new Map();
			for (const id of bookIds) {
				await open(page, `${origin}/books/${id}/`);
				const first = await coverKey(page);
				await page.reload({ waitUntil: "domcontentloaded" });
				await stable(page);
				const second = await coverKey(page);
				keys.set(id, first);
				if (first !== second)
					throw new Error(`${id} 刷新后封面签名改变`);
			}
			const families = new Set(
				Array.from(keys.values()).map((key) => key.split(":")[1]),
			);
			return check(
				"书封 ID 映射确定且覆盖四族",
				families.size >= 4,
				`books=${keys.size} families=${[...families].join(",")}`,
			);
		});

		// D. 失败路径：图片 SVG 回退、详情字体 CDN 失败、书库请求失败重试。
		await safe("图片失败后生成 SVG 书封回退", async () => {
			const fallbackPage = await context.newPage();
			await fallbackPage.route("**/qa-broken-cover.png", (route) =>
				route.abort(),
			);
			await open(fallbackPage, urls.detail);
			const injected = {
				nbId: "01",
				nbTitle: "百年孤独",
				nbAuthor: "加西亚·马尔克斯",
				nbPublisher: "南海出版公司",
				nbYear: "2011",
			};
			const added = await fallbackPage.evaluate(() => {
				const cover = document.querySelector(".nb-cover");
				if (!cover) return null;
				const beforeSvg = cover.querySelectorAll(
					'svg[viewBox="0 0 300 450"]',
				).length;
				const img = document.createElement("img");
				img.dataset.nbCover = "";
				Object.assign(img.dataset, {
					nbId: "01",
					nbTitle: "百年孤独",
					nbAuthor: "加西亚·马尔克斯",
					nbPublisher: "南海出版公司",
					nbYear: "2011",
				});
				img.dataset.qaCoverFallback = "1";
				img.src = "/qa-broken-cover.png";
				cover.append(img);
				return { beforeSvg };
			});
			if (!added) throw new Error("找不到封面容器");
			const replaced = await fallbackPage
				.waitForFunction(
					(beforeSvg) => {
						const cover = document.querySelector(".nb-cover");
						return (
							!document.querySelector(
								"img[data-qa-cover-fallback]",
							) &&
							(cover?.querySelectorAll(
								'svg[viewBox="0 0 300 450"]',
							).length ?? 0) > beforeSvg
						);
					},
					added.beforeSvg,
					{ timeout: 3000 },
				)
				.then(() => true)
				.catch(() => false);
			const state = await fallbackPage.evaluate(() => {
				const img = document.querySelector(
					"img[data-qa-cover-fallback]",
				);
				const cover = document.querySelector(".nb-cover");
				const svgCount =
					cover?.querySelectorAll('svg[viewBox="0 0 300 450"]')
						.length ?? 0;
				return {
					remainingImage: Boolean(img),
					remainingAttributes: img
						? Object.fromEntries(
								[
									"nbCover",
									"nbId",
									"nbTitle",
									"nbAuthor",
									"nbPublisher",
									"nbYear",
								].map((key) => [key, img.dataset[key] ?? null]),
							)
						: null,
					svgCount,
				};
			});
			await fallbackPage.close();
			return check(
				"图片失败回退为可读 SVG",
				replaced,
				JSON.stringify({
					injected,
					beforeSvg: added.beforeSvg,
					...state,
					addedSvg: state.svgCount > added.beforeSvg,
				}),
			);
		});
		await safe("字体 CDN 失败后页面仍可读", async () => {
			const fontPage = await context.newPage();
			await fontPage.route("https://fontsapi.zeoseven.com/**", (route) =>
				route.abort(),
			);
			await fontPage.route("https://cdn.jsdelivr.net/**", (route) =>
				route.abort(),
			);
			await open(fontPage, urls.detail);
			const readable = await fontPage.evaluate(() => {
				const title = document.querySelector("article h1");
				const body = document.querySelector("article");
				return Boolean(
					title &&
					body &&
					(title.textContent ?? "").trim() &&
					title.getBoundingClientRect().height > 0 &&
					body.getBoundingClientRect().height > 0,
				);
			});
			await fontPage.close();
			return check("字体 CDN 失败仍显示详情内容", readable);
		});
		await safe("书库请求失败显示重试并恢复", async () => {
			const retryPage = await context.newPage();
			await retryPage.route("**/books/data.json", (route) =>
				route.abort(),
			);
			await open(retryPage, urls.archive);
			await waitArchiveReady(retryPage, true);
			const retry = await findRetry(retryPage);
			if (!retry) throw new Error("请求失败后没有可见重试入口");
			await retryPage.unroute("**/books/data.json");
			await retry.click();
			await waitArchiveReady(retryPage);
			const count = await retryPage
				.locator("#nb-archive-grid > li")
				.count();
			const retryGone = !(await findRetry(retryPage));
			await retryPage.close();
			return check(
				"书库重试后恢复数据且解除错误状态",
				count > 0 && retryGone,
				`count=${count}`,
			);
		});

		// E. Swup 切页中断与回收：只看用户可见页面状态，不依赖实现私有变量。
		await safe("Swup 切页取消离场动画并恢复新页", async () => {
			await page.setViewportSize({ width: 1280, height: 900 });
			await open(page, urls.home);
			const before = await heroId(page);
			await page.click("#nb-today-shuffle");
			await page.click('a[href="/books/archive/"]');
			await page.waitForURL(/\/books\/archive\//, { timeout: 8000 });
			await stable(page);
			await waitArchiveReady(page);
			const archiveReady = await page
				.locator("#nb-archive-grid > li")
				.count();
			const settled = await page.evaluate(() => ({
				animating:
					document.documentElement.classList.contains("is-animating"),
				busy: document.querySelectorAll('[aria-busy="true"]').length,
				leaving: document.querySelectorAll(".is-leaving, .is-entering")
					.length,
			}));
			await page.click('a[href="/books/"]');
			await page.waitForURL(/\/books\/$/, { timeout: 8000 });
			await page.waitForSelector("#nb-hero article .hero-title a", {
				timeout: 8000,
			});
			await stable(page);
			const hero = await heroId(page);
			return check(
				"Swup 中断后新页稳定且计时/动画已清理",
				archiveReady > 0 &&
					!settled.animating &&
					settled.busy === 0 &&
					settled.leaving === 0 &&
					Boolean(hero),
				JSON.stringify({
					archiveReady,
					settled,
					hero,
					startedFrom: before,
				}),
			);
		});

		check(
			"页面运行期间无未预期 console/page/request 错误",
			errors.length === 0,
			errors.join(" | ").slice(0, 500),
		);
		runtimeErrors.push(...errors);
	} finally {
		await context?.close().catch(() => {});
		await browser.close().catch(() => {});
	}
}

function writeReports() {
	const failed = results.filter((item) => !item.ok);
	const report = {
		generatedAt: new Date().toISOString(),
		baseUrl,
		buildLabel,
		passed: results.filter((item) => item.ok).length,
		failed: failed.length,
		results,
		screenshots,
		timings,
		externalFailures: [...new Set(externalFailures)],
		runtimeErrors,
		supplementaryEvidence,
	};
	fs.writeFileSync(
		reportJson,
		`${JSON.stringify(report, null, 2)}\n`,
		"utf8",
	);
	const lines = [
		"# Nice Books 设计升级 QA 报告",
		"",
		`- 时间：${report.generatedAt}`,
		`- 地址：${baseUrl}`,
		`- 构建标记：${buildLabel}`,
		`- 结果：${report.passed} PASS / ${report.failed} FAIL`,
		"- 浏览器等待策略：`domcontentloaded` + 两帧 DOM 稳定；未使用 `networkidle`。",
		"",
		"## 检查结果",
		"",
		"| 状态 | 检查 | 详情 |",
		"| --- | --- | --- |",
		...results.map(
			(item) =>
				`| ${item.ok ? "PASS" : "FAIL"} | ${item.name.replaceAll("|", "\\|")} | ${(item.detail ?? "").replaceAll("|", "\\|").replaceAll("\n", " ").slice(0, 500)} |`,
		),
		"",
		"## 动作采样",
		"",
		...(timings.length
			? timings.map((item) => `- \`${JSON.stringify(item)}\``)
			: ["- 无动作采样记录。"]),
		"",
		"## 截图",
		"",
		...(screenshots.length
			? screenshots.map((file) => `- [${path.basename(file)}](${file})`)
			: ["- 无截图。"]),
		"",
		"## 外部真实浏览器缩放证据",
		"",
		"- `home-zoom-200.png`、`archive-zoom-200.png`、`detail-zoom-200.png` 来自独立 Chrome 浏览器缩放采样；详见 `zoom-resource-report.json`。",
		"- 本脚本另有 CDP `Emulation.setPageScaleFactor(2)` 检查，报告中明确标为页面缩放（非浏览器原生缩放），两类证据不混用。",
		...supplementaryEvidence.map(
			(file) => `- [${path.basename(file)}](${file})`,
		),
		"",
		"## 外部资源失败",
		"",
		...(externalFailures.length
			? [...new Set(externalFailures)].map((item) => `- ${item}`)
			: ["- 未观察到外部 CDN 失败。"]),
		"",
		"失败项会使脚本以非零状态退出；外部 CDN 失败单独记录，不改变本地功能断言结果。",
		"",
	];
	fs.writeFileSync(reportMarkdown, lines.join("\n"), "utf8");
	return report;
}

let report;
try {
	await run();
} catch (error) {
	check(
		"QA runner 未发生未处理异常",
		false,
		error instanceof Error ? (error.stack ?? error.message) : String(error),
	);
} finally {
	report = writeReports();
}

process.exitCode = report.failed > 0 ? 1 : 0;
