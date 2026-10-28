// A-8：声明页面集合的非预期错误门禁。策略只在本调用点，既有台子不放行任何新例外。
// 手工运行；直接导航的有限观察窗口，不承诺所有交互、懒加载或 sitemap 全量。
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { makeHarness } from "./lib/smoke-harness.mjs";
import { AUDIT_PAGES } from "./lib/smoke-pages.mjs";

const DEFAULT_TIMING = {
	navigationTimeout: 30000,
	observeMs: 10000,
	settleTimeout: 20000,
	quietMs: 500,
};
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function origin(url) {
	try {
		return new URL(url).origin;
	} catch {
		return null;
	}
}

function giscusLookup(event) {
	return (
		event.kind === "response" &&
		event.method === "GET" &&
		event.status === 404 &&
		origin(event.url) === "https://giscus.app" &&
		new URL(event.url).pathname === "/api/discussions"
	);
}

function missingDiscussion(event) {
	try {
		return (
			giscusLookup(event) &&
			JSON.parse(event.body).error === "Discussion not found"
		);
	} catch {
		return false;
	}
}

function localPlayerCandidate(event, row, base) {
	return (
		event.kind === "requestfailed" &&
		["localhost", "127.0.0.1", "[::1]"].includes(new URL(base).hostname) &&
		event.url === "https://myhkw.cn/player/err.mp3" &&
		event.resourceType === "media" &&
		event.text === "net::ERR_ABORTED" &&
		event.isSubframe === false &&
		event.frameUrl === row.url
	);
}

function localPlayerPromptAbort(event, row, base) {
	const state = row.playerState;
	return (
		localPlayerCandidate(event, row, base) &&
		state?.authorizationNotice === true &&
		state.source === "https://myhkw.cn/api/tts" &&
		state.readyState >= 2 &&
		state.error === null
	);
}

function youtubeAdDisconnect(event) {
	if (
		event.kind !== "requestfailed" ||
		event.url !== "https://static.doubleclick.net/instream/ad_status.js" ||
		event.resourceType !== "script" ||
		event.text !== "net::ERR_CONNECTION_CLOSED" ||
		event.isSubframe !== true
	)
		return false;
	try {
		const frame = new URL(event.frameUrl);
		return (
			frame.origin === "https://www.youtube.com" &&
			frame.pathname.startsWith("/embed/")
		);
	} catch {
		return false;
	}
}

function classify(row, base) {
	for (const event of row.events) {
		event.classification = {
			bucket: "failure",
			reason: "Unexpected error",
		};
		if (
			event.kind === "response" &&
			row.path === "/this-page-should-404/" &&
			event.url === row.url &&
			event.status === 404 &&
			["document", "fetch"].includes(event.resourceType)
		) {
			event.classification = {
				bucket: "expected",
				reason: "Exact sentinel HTTP 404",
			};
		} else if (missingDiscussion(event)) {
			event.classification = {
				bucket: "expected",
				reason: "Giscus confirmed Discussion not found",
			};
		} else if (localPlayerPromptAbort(event, row, base)) {
			event.classification = {
				bucket: "expected",
				reason: "Approved local MyHK authorization prompt media cancellation",
			};
		} else if (youtubeAdDisconnect(event)) {
			event.classification = {
				bucket: "expected",
				reason: "Approved YouTube embed ad_status.js connection closure",
			};
		} else if (
			event.kind === "response" &&
			event.status === 404 &&
			event.resourceType === "image" &&
			origin(event.url) === "https://api.iconify.design" &&
			/^\/[^/:]+:[^/]+\.svg$/.test(new URL(event.url).pathname)
		) {
			event.classification = {
				bucket: "failure",
				reason: "Confirmed malformed Iconify SVG path: prefix:name used instead of prefix/name",
			};
		} else if (
			["response", "requestfailed"].includes(event.kind) &&
			origin(event.url) &&
			origin(event.url) !== origin(base)
		) {
			event.classification = {
				bucket: "review",
				reason: "Unconfirmed third-party network failure; requires review",
			};
		}
	}
	for (const event of row.events.filter(
		(event) => event.kind === "console",
	)) {
		// Chromium network-log messages have no JS arguments. Active console.error(text)
		// carries arguments even when its text exactly imitates a browser resource error.
		if (event.argumentCount !== 0) continue;
		const status = event.text.match(
			/^Failed to load resource: the server responded with a status of (\d{3}) \([^)]*\)$/,
		);
		const failed = /^Failed to load resource: net::\S+$/.test(event.text);
		const cause = row.events.find(
			(other) =>
				other.url === event.url &&
				((status &&
					other.kind === "response" &&
					other.status === Number(status[1])) ||
					(failed && other.kind === "requestfailed")),
		);
		if (cause)
			event.classification = {
				...cause.classification,
				reason: `Resource console: ${cause.classification.reason}`,
			};
	}
	row.failures = row.events.filter(
		(event) => event.classification.bucket === "failure",
	);
	row.expected = row.events.filter(
		(event) => event.classification.bucket === "expected",
	);
	row.review = row.events.filter(
		(event) => event.classification.bucket === "review",
	);
	row.verdict =
		!row.complete || row.failures.length
			? "FAIL"
			: row.review.length
				? "REVIEW"
				: "PASS";
}

async function inspect(page, { base, path, timing }) {
	const target = new URL(path, base).href;
	const row = {
		path,
		url: target,
		complete: false,
		events: [],
		failures: [],
	};
	const started = Date.now();
	const pending = new Set();
	let lastLocal = Date.now();
	let observing = true;
	const record = (event) => {
		if (observing) {
			event.elapsedMs = Date.now() - started;
			row.events.push(event);
		}
	};
	page.on("console", (message) => {
		if (message.type() === "error") {
			record({
				kind: "console",
				text: message.text(),
				url: message.location().url ?? "",
				argumentCount: message.args().length,
			});
		}
	});
	page.on("pageerror", (error) => {
		record({
			kind: "pageerror",
			text: error.message,
			url: "",
			stack: error.stack,
		});
	});
	page.on("response", (response) => {
		if (response.status() >= 400) {
			const event = {
				kind: "response",
				url: response.url(),
				status: response.status(),
				method: response.request().method(),
				resourceType: response.request().resourceType(),
				text: `HTTP ${response.status()}`,
			};
			record(event);
			if (giscusLookup(event)) {
				response
					.text()
					.then((body) => {
						if (observing) event.body = body;
					})
					.catch((error) => {
						if (observing) event.bodyError = error.message;
					});
			}
		}
	});
	page.on("requestfailed", (request) => {
		let frameUrl = "";
		let isSubframe = null;
		try {
			const frame = request.frame();
			frameUrl = frame.url();
			isSubframe = frame !== page.mainFrame();
		} catch {}
		record({
			kind: "requestfailed",
			url: request.url(),
			text: request.failure()?.errorText ?? "Request failed",
			resourceType: request.resourceType(),
			frameUrl,
			isSubframe,
		});
	});
	page.on("request", (request) => {
		if (origin(request.url()) === origin(base)) {
			pending.add(request);
			lastLocal = Date.now();
		}
	});
	const finished = (request) => {
		if (pending.delete(request)) lastLocal = Date.now();
	};
	page.on("requestfinished", finished);
	page.on("requestfailed", finished);
	try {
		const response = await page.goto(target, {
			waitUntil: "domcontentloaded",
			timeout: timing.navigationTimeout,
		});
		row.status = response?.status() ?? null;
		const expectedStatus = path === "/this-page-should-404/" ? 404 : 200;
		if (row.status !== expectedStatus || response?.url() !== target) {
			record({
				kind: "navigation",
				url: response?.url() ?? target,
				text: `Expected ${expectedStatus} at ${target}; received ${row.status}`,
			});
		}
		const start = Date.now();
		while (Date.now() - start < timing.settleTimeout) {
			if (
				Date.now() - start >= timing.observeMs &&
				pending.size === 0 &&
				Date.now() - lastLocal >= timing.quietMs
			) {
				row.complete = true;
				break;
			}
			await pause(50);
		}
		if (!row.complete) {
			record({
				kind: "incomplete",
				url: target,
				text: `Observation timed out; pending local requests: ${pending.size}`,
			});
		}
	} catch (error) {
		record({ kind: "navigation", url: target, text: error.message });
	} finally {
		observing = false;
	}
	if (row.events.some((event) => localPlayerCandidate(event, row, base))) {
		let stateTimer;
		row.playerStateTimeoutMs = Math.min(2000, timing.settleTimeout);
		try {
			row.playerState = await Promise.race([
				page.evaluate(() => {
					const audio = document.querySelector("#myhkaudio");
					if (!audio) return null;
					let source = "";
					try {
						const url = new URL(audio.currentSrc);
						source = url.origin + url.pathname;
					} catch {}
					let authorizationNotice = false;
					const walker = document.createTreeWalker(
						document.body,
						NodeFilter.SHOW_TEXT,
					);
					let node;
					while ((node = walker.nextNode())) {
						if (
							!node.textContent.includes(
								"网站音乐播放器请前往myhkw.cn免费注册授权后使用！",
							)
						)
							continue;
						const element = node.parentElement;
						if (
							!element?.checkVisibility({
								opacityProperty: true,
								visibilityProperty: true,
								contentVisibilityAuto: true,
							})
						)
							continue;
						const range = document.createRange();
						range.selectNodeContents(node);
						if (
							[...range.getClientRects()].some(
								(rect) => rect.width > 0 && rect.height > 0,
							)
						) {
							authorizationNotice = true;
							break;
						}
					}
					return {
						authorizationNotice,
						source,
						readyState: audio.readyState,
						error: audio.error?.code ?? null,
					};
				}),
				new Promise((_, reject) => {
					stateTimer = setTimeout(
						() =>
							reject(
								new Error("Player state snapshot timed out"),
							),
						row.playerStateTimeoutMs,
					);
				}),
			]);
		} catch (error) {
			row.playerStateError = error.message;
		} finally {
			clearTimeout(stateTimer);
		}
	}
	classify(row, base);
	return row;
}

export async function runConsoleSmoke({
	base = process.env.CONSOLE_BASE_URL ?? "http://localhost:4322",
	paths = AUDIT_PAGES,
	reportPath,
	timing: overrides = {},
	configureContext = async () => {},
} = {}) {
	const parsed = new URL(base);
	if (parsed.origin !== base || !/^https?:$/.test(parsed.protocol)) {
		throw new Error(
			"CONSOLE_BASE_URL must be an HTTP(S) site root without a trailing slash",
		);
	}
	const timing = { ...DEFAULT_TIMING, ...overrides };
	if (!paths.length) throw new Error("Page list must not be empty");
	if (
		Object.values(timing).some(
			(value) => !Number.isFinite(value) || value <= 0,
		) ||
		timing.observeMs >= timing.settleTimeout ||
		timing.quietMs >= timing.settleTimeout
	) {
		throw new Error(
			"Invalid timing: positive finite windows must fit within settleTimeout",
		);
	}
	const harness = makeHarness({
		envVar: "CONSOLE_BASE_URL",
		defaultBase: base,
	});
	const report = {
		base,
		generated: new Date().toISOString(),
		timing,
		total: paths.length,
		completed: 0,
		pages: [],
		ok: false,
		verdict: "RUNNING",
		exitCode: null,
	};
	const save = async () => {
		if (reportPath) {
			await mkdir(dirname(reportPath), { recursive: true });
			await writeFile(
				reportPath,
				JSON.stringify(report, null, 2) + "\n",
				"utf8",
			);
		}
	};
	// Replace an older green report before launch; intermediate reports remain ok:false.
	await save();
	let browser;
	try {
		browser = await harness.browser.launch({ headless: true });
		for (const path of paths) {
			const context = await browser.newContext({
				viewport: { width: 1440, height: 900 },
			});
			try {
				// Browser-boundary injection for offline fixtures; the CLI installs no routes or stubs.
				await configureContext(context);
				const page = await context.newPage();
				const row = await inspect(page, { base, path, timing });
				report.pages.push(row);
				if (row.complete) report.completed++;
				if (row.verdict === "REVIEW") {
					console.log(
						`REVIEW ${path}：采集完成，有未裁定的第三方网络错误`,
					);
				} else {
					harness.check(
						`${path}：完整采集且无非预期错误`,
						row.verdict === "PASS",
						row.failures
							.map((event) => `${event.text} @ ${event.url}`)
							.join(" | "),
					);
				}
				console.log(
					`NOTE ${path}: expected=${row.expected.length}, pending-review=${row.review.length}`,
				);
				await save();
			} finally {
				await context.close();
			}
		}
	} catch (error) {
		report.fatal = error.message;
	} finally {
		await browser?.close().catch((error) => {
			report.fatal = error.message;
		});
	}
	report.verdict =
		report.fatal ||
		report.completed !== report.total ||
		report.pages.some((row) => row.verdict === "FAIL")
			? "FAIL"
			: report.pages.some((row) => row.verdict === "REVIEW")
				? "REVIEW"
				: "PASS";
	report.ok = report.verdict === "PASS";
	report.exitCode = { PASS: 0, FAIL: 1, REVIEW: 2 }[report.verdict];
	await save();
	return report;
}

if (
	process.argv[1] &&
	pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
	try {
		const report = await runConsoleSmoke({
			reportPath:
				process.env.CONSOLE_REPORT_PATH ?? "output/console-smoke.json",
		});
		console.log(
			`完整采集 ${report.completed}/${report.total} 页，${report.verdict}`,
		);
		process.exitCode = report.exitCode;
		if (report.fatal) console.error(report.fatal);
	} catch (error) {
		console.error(error.message);
		process.exitCode = 1;
	}
}
