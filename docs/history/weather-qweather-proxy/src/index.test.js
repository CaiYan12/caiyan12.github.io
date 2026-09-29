import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

import worker, { QuotaDO } from "./index.js";
import {
	handleRequest,
	MAX_MONTHLY_UPSTREAM_CALLS,
	QWEATHER_DEADLINE_MS,
} from "./handler.js";

const healthRequest = () => new Request("https://weather-proxy.test/healthz");

test("GET /healthz returns a deterministic public health response", async () => {
	const first = await worker.fetch(healthRequest());
	const firstBody = await first.text();
	const second = await worker.fetch(healthRequest());

	assert.equal(first.status, 200);
	assert.match(
		first.headers.get("content-type") ?? "",
		/^application\/json\b/i,
	);
	assert.equal(first.headers.get("cache-control"), "no-store");
	assert.equal(firstBody, '{"status":"ok"}');
	assert.equal(await second.text(), firstBody);
});

test("the health route rejects unsupported methods and paths", async () => {
	const methodResponse = await worker.fetch(
		new Request("https://weather-proxy.test/healthz", { method: "POST" }),
	);
	const pathResponse = await worker.fetch(
		new Request("https://weather-proxy.test/anything"),
	);

	assert.equal(methodResponse.status, 405);
	assert.equal(methodResponse.headers.get("allow"), "GET");
	assert.equal(await methodResponse.text(), "Method Not Allowed");
	assert.equal(pathResponse.status, 404);
	assert.equal(await pathResponse.text(), "Not Found");
});

const origin = "https://caiyan12.github.io";
const billingMonth = new Date().toISOString().slice(0, 7);

function makeSqliteState() {
	const db = new DatabaseSync(":memory:");
	const storage = {
		sql: {
			exec(query, ...bindings) {
				if (bindings.length > 0) {
					const rows = db.prepare(query).all(...bindings);
					return {
						toArray: () => rows,
					};
				}
				db.exec(query);
				return { toArray: () => [] };
			},
		},
		transactionSync(callback) {
			db.exec("BEGIN");
			try {
				const result = callback();
				db.exec("COMMIT");
				return result;
			} catch (error) {
				db.exec("ROLLBACK");
				throw error;
			}
		},
	};
	return { db, storage };
}

function makeQuotaBinding({ fail = false } = {}) {
	const sqlite = makeSqliteState();
	const quotaDO = new QuotaDO({ storage: sqlite.storage }, {});
	const calls = { rate: 0, reserve: 0 };
	return {
		calls,
		close: () => sqlite.db.close(),
		idFromName: (name) => name,
		get: () => ({
			async fetch(input, init) {
				if (fail) throw new Error("durable object unavailable");
				const request =
					input instanceof Request ? input : new Request(input, init);
				const body = await request.json();
				if (body.action === "rate") calls.rate += 1;
				if (body.action === "reserve") calls.reserve += 1;
				return quotaDO.fetch(
					new Request("https://quota.internal", {
						body: JSON.stringify(body),
						method: "POST",
					}),
				);
			},
		}),
	};
}

function makeEnv(quota, overrides = {}) {
	return {
		WEATHER_ALLOWED_ORIGINS: `${origin},http://localhost:4321,http://127.0.0.1:4321`,
		QWEATHER_API_HOST: "api.example.qweather.test",
		QWEATHER_API_KEY: "test-secret-key",
		QWEATHER_ACCOUNT_USAGE_CONFIRMED: "true",
		QWEATHER_BILLING_MONTH: billingMonth,
		QWEATHER_ACCOUNT_CALLS_USED: "2",
		QWEATHER_BILLING_MONTH_ALIGNED: "true",
		WEATHER_QUOTA: quota,
		...overrides,
	};
}

function weatherRequest(body = { lat: "39.9", lon: "116.4" }, headers = {}) {
	return new Request("https://weather-proxy.test/v1/weather", {
		body: JSON.stringify(body),
		headers: {
			"content-type": "application/json",
			origin,
			"cf-connecting-ip": "198.51.100.7",
			...headers,
		},
		method: "POST",
	});
}

function jsonResponse(payload, status = 200) {
	return new Response(JSON.stringify(payload), {
		headers: { "content-type": "application/json" },
		status,
	});
}

const cityResult = {
	code: "200",
	location: [{ adm2: "北京", name: "东城", type: "district" }],
};
const currentResult = {
	metadata: {
		attributions: ["https://developer.qweather.com/attribution.html"],
		tag: "public-current-weather-example",
	},
	condition: { code: "101", text: "多云" },
	temperature: { value: 24.5, unit: "°C" },
};

test("POST /v1/weather normalizes city and current weather, reserving both upstream calls", async () => {
	const quota = makeQuotaBinding();
	const upstream = [];
	const response = await handleRequest(
		weatherRequest(),
		makeEnv(quota, { QWEATHER_API_HOST: "api9.example.qweather.test" }),
		async (url, init) => {
			upstream.push({ url: new URL(url), init });
			return upstream.length === 1
				? jsonResponse(cityResult)
				: jsonResponse(currentResult);
		},
	);
	const result = await response.json();

	assert.equal(response.status, 200);
	assert.equal(result.cityName, "北京");
	assert.equal(result.temperatureC, 24.5);
	assert.equal(result.condition, "多云");
	assert.equal(result.conditionCode, "101");
	assert.equal(result.source, "qweather");
	assert.equal(result.sourceUrl, "https://www.qweather.com");
	assert.deepEqual(result.attributions, currentResult.metadata.attributions);
	assert.ok(Number.isFinite(Date.parse(result.fetchedAt)));
	assert.equal(upstream.length, 2);
	assert.equal(upstream[0].url.pathname, "/geo/v2/city/lookup");
	assert.equal(upstream[0].url.searchParams.get("location"), "116.4,39.9");
	assert.equal(upstream[1].url.pathname, "/weather/v1/current/39.9/116.4");
	for (const call of upstream) {
		assert.equal(
			new Headers(call.init.headers).get("X-QW-Api-Key"),
			"test-secret-key",
		);
	}
	assert.equal(quota.calls.reserve, 2);
	assert.equal(JSON.stringify(result).includes("test-secret-key"), false);
	quota.close();
});

test("coordinates reject excess precision, out-of-range values, and extra fields before upstream work", async () => {
	for (const body of [
		{ lat: "39.91", lon: "116.4" },
		{ lat: "91.0", lon: "116.4" },
		{ lat: "39.9", lon: "181.0" },
		{ lat: "39.9", lon: "116.4", url: "https://example.invalid" },
	]) {
		const quota = makeQuotaBinding();
		let upstreamCalls = 0;
		const response = await handleRequest(
			weatherRequest(body),
			makeEnv(quota),
			async () => {
				upstreamCalls += 1;
				return jsonResponse(cityResult);
			},
		);
		assert.equal(response.status, 400);
		assert.equal(upstreamCalls, 0);
		quota.close();
	}
});

test("the proxy rejects disallowed origins and unsupported content types", async () => {
	const quota = makeQuotaBinding();
	const disallowed = await handleRequest(
		weatherRequest(undefined, { origin: "https://attacker.example" }),
		makeEnv(quota),
		async () => jsonResponse(cityResult),
	);
	const wrongType = await handleRequest(
		weatherRequest(undefined, { "content-type": "text/plain" }),
		makeEnv(quota),
		async () => jsonResponse(cityResult),
	);
	assert.equal(disallowed.status, 403);
	assert.equal(wrongType.status, 415);
	assert.equal(quota.calls.rate, 0);
	quota.close();
});

test("city lookup retries only for missing city, at most twice, and reserves every attempt", async () => {
	const quota = makeQuotaBinding();
	const upstream = [];
	const response = await handleRequest(
		weatherRequest(),
		makeEnv(quota),
		async (url) => {
			const path = new URL(url).pathname;
			upstream.push(path);
			if (path === "/geo/v2/city/lookup") {
				return jsonResponse({ code: "200", location: [] });
			}
			return jsonResponse(currentResult);
		},
	);
	const result = await response.json();
	assert.equal(response.status, 200);
	assert.equal(result.cityName, null);
	assert.equal(
		upstream.filter((path) => path === "/geo/v2/city/lookup").length,
		3,
	);
	assert.equal(
		upstream.filter((path) => path.startsWith("/weather/v1/current/"))
			.length,
		1,
	);
	assert.equal(quota.calls.reserve, 4);
	quota.close();
});

test("unknown account usage, stale billing month, missing secrets, and counter failures fail closed", async () => {
	for (const overrides of [
		{ QWEATHER_ACCOUNT_USAGE_CONFIRMED: "false" },
		{ QWEATHER_BILLING_MONTH: "2026-01" },
		{ QWEATHER_API_KEY: "" },
		{ QWEATHER_BILLING_MONTH_ALIGNED: "false" },
	]) {
		const quota = makeQuotaBinding();
		let upstreamCalls = 0;
		const response = await handleRequest(
			weatherRequest(),
			makeEnv(quota, overrides),
			async () => {
				upstreamCalls += 1;
				return jsonResponse(cityResult);
			},
		);
		assert.equal(response.status, 503);
		assert.equal(upstreamCalls, 0);
		assert.equal(
			(await response.text()).includes("test-secret-key"),
			false,
		);
		quota.close();
	}

	const failedQuota = makeQuotaBinding({ fail: true });
	let upstreamCalls = 0;
	const counterFailure = await handleRequest(
		weatherRequest(),
		makeEnv(failedQuota),
		async () => {
			upstreamCalls += 1;
			return jsonResponse(cityResult);
		},
	);
	assert.equal(counterFailure.status, 503);
	assert.equal(upstreamCalls, 0);
	failedQuota.close();
});

test("quota exhaustion and upstream errors use generic, distinguishable responses", async () => {
	const nearLimit = makeQuotaBinding();
	const exhausted = await handleRequest(
		weatherRequest(),
		makeEnv(nearLimit, {
			QWEATHER_ACCOUNT_CALLS_USED: String(MAX_MONTHLY_UPSTREAM_CALLS),
		}),
		async () => jsonResponse(cityResult),
	);
	assert.equal(exhausted.status, 429);
	assert.deepEqual(await exhausted.json(), { error: "quota_exhausted" });
	assert.equal(nearLimit.calls.reserve, 1);
	nearLimit.close();

	const quota = makeQuotaBinding();
	const upstreamError = await handleRequest(
		weatherRequest(),
		makeEnv(quota),
		async () =>
			new Response("private vendor diagnostic test-secret-key", {
				status: 403,
			}),
	);
	assert.equal(upstreamError.status, 502);
	assert.deepEqual(await upstreamError.json(), {
		error: "upstream_unavailable",
	});
	quota.close();
});

test("current weather requires an official numeric Celsius value and no top-level success code", async () => {
	for (const temperature of [
		{ value: null, unit: "°C" },
		{ value: "", unit: "°C" },
		{ value: true, unit: "°C" },
		{ value: 24.5, unit: "°F" },
	]) {
		const quota = makeQuotaBinding();
		let call = 0;
		const response = await handleRequest(
			weatherRequest(),
			makeEnv(quota),
			async (url) => {
				call += 1;
				return call === 1
					? jsonResponse(cityResult)
					: jsonResponse({
							...currentResult,
							temperature,
						});
			},
		);
		assert.equal(response.status, 502);
		assert.deepEqual(await response.json(), {
			error: "upstream_unavailable",
		});
		quota.close();
	}

	const quota = makeQuotaBinding();
	let call = 0;
	const response = await handleRequest(
		weatherRequest(),
		makeEnv(quota),
		async () => {
			call += 1;
			return jsonResponse(call === 1 ? cityResult : currentResult);
		},
	);
	assert.equal(response.status, 200);
	assert.equal((await response.json()).temperatureC, 24.5);
	quota.close();
});

test("the durable counter atomically caps concurrent reservations at 45,000 calls", async () => {
	const sqlite = makeSqliteState();
	const quota = new QuotaDO({ storage: sqlite.storage }, {});
	const baseline = MAX_MONTHLY_UPSTREAM_CALLS - 4;
	const reservations = await Promise.all(
		Array.from({ length: 12 }, () =>
			quota.fetch(
				new Request("https://quota.internal", {
					body: JSON.stringify({
						action: "reserve",
						month: billingMonth,
						initialCalls: baseline,
					}),
					method: "POST",
				}),
			),
		),
	);
	const decisions = await Promise.all(
		reservations.map((response) => response.json()),
	);
	assert.equal(decisions.filter((entry) => entry.allowed).length, 4);
	assert.equal(
		decisions.filter((entry) => entry.reason === "limit").length,
		8,
	);
	sqlite.db.close();
});

test("the durable counter refuses a changed account baseline for the same month", async () => {
	const sqlite = makeSqliteState();
	const quota = new QuotaDO({ storage: sqlite.storage }, {});
	const reserve = (initialCalls) =>
		quota.fetch(
			new Request("https://quota.internal", {
				body: JSON.stringify({
					action: "reserve",
					month: billingMonth,
					initialCalls,
				}),
				method: "POST",
			}),
		);
	assert.equal((await (await reserve(2)).json()).allowed, true);
	const changed = await reserve(3);
	assert.deepEqual(await changed.json(), {
		allowed: false,
		reason: "state_mismatch",
	});
	sqlite.db.close();
});

test("public HTTP rate control caps one client at 12 requests per minute", async () => {
	const quota = makeQuotaBinding();
	const env = makeEnv(quota);
	let upstreamCalls = 0;
	const responses = [];
	for (let index = 0; index < 13; index += 1) {
		responses.push(
			await handleRequest(weatherRequest(), env, async (url) => {
				upstreamCalls += 1;
				return new URL(url).pathname === "/geo/v2/city/lookup"
					? jsonResponse(cityResult)
					: jsonResponse(currentResult);
			}),
		);
	}
	assert.deepEqual(
		responses.slice(0, 12).map((response) => response.status),
		Array(12).fill(200),
	);
	assert.equal(responses[12].status, 429);
	assert.deepEqual(await responses[12].json(), { error: "rate_limited" });
	assert.equal(upstreamCalls, 24);
	quota.close();
});

test("CORS preflight is scoped to an allowlisted origin and does not touch quota", async () => {
	const quota = makeQuotaBinding();
	const response = await handleRequest(
		new Request("https://weather-proxy.test/v1/weather", {
			headers: { origin },
			method: "OPTIONS",
		}),
		makeEnv(quota),
	);
	assert.equal(response.status, 204);
	assert.equal(response.headers.get("access-control-allow-origin"), origin);
	assert.equal(
		response.headers.get("access-control-allow-methods"),
		"POST, OPTIONS",
	);
	assert.equal(quota.calls.rate, 0);
	quota.close();
});

test("the durable limiter prunes expired hashed client entries", async () => {
	const sqlite = makeSqliteState();
	const quota = new QuotaDO({ storage: sqlite.storage }, {});
	const checkRate = (clientHash, nowMs) =>
		quota.fetch(
			new Request("https://quota.internal", {
				body: JSON.stringify({ action: "rate", clientHash, nowMs }),
				method: "POST",
			}),
		);
	assert.equal(
		(await (await checkRate("a".repeat(64), 0)).json()).allowed,
		true,
	);
	assert.equal(
		(await (await checkRate("b".repeat(64), 180_000)).json()).allowed,
		true,
	);
	assert.equal(
		sqlite.db.prepare("SELECT COUNT(*) AS count FROM weather_ip_rate").get()
			.count,
		1,
	);
	sqlite.db.close();
});

test("current-weather attribution is required, safe, and passed through normalized", async () => {
	for (const attributions of [
		undefined,
		[],
		["javascript:alert(1)"],
		["http://developer.qweather.com/attribution.html"],
		["https://user:password@example.com/attribution"],
		["x".repeat(513)],
	]) {
		const quota = makeQuotaBinding();
		let call = 0;
		const response = await handleRequest(
			weatherRequest(),
			makeEnv(quota),
			async () => {
				call += 1;
				const weather = {
					...currentResult,
					metadata: { ...currentResult.metadata },
				};
				if (attributions === undefined)
					delete weather.metadata.attributions;
				else weather.metadata.attributions = attributions;
				return jsonResponse(call === 1 ? cityResult : weather);
			},
		);
		assert.equal(response.status, 502);
		assert.deepEqual(await response.json(), {
			error: "upstream_unavailable",
		});
		quota.close();
	}
});

test("QWeather deadline includes a hanging request body and all city/weather attempts", async () => {
	assert.equal(QWEATHER_DEADLINE_MS, 6_000);
	let bodyCancelled = false;
	const quotaForBody = makeQuotaBinding();
	const hangingBodyRequest = {
		url: "https://weather-proxy.test/v1/weather",
		method: "POST",
		headers: new Headers({
			origin,
			"content-type": "application/json",
			"cf-connecting-ip": "198.51.100.8",
		}),
		body: {
			getReader: () => ({
				read: () => new Promise(() => {}),
				cancel: async () => {
					bodyCancelled = true;
				},
			}),
		},
	};
	const bodyStart = Date.now();
	const bodyDeadline = await Promise.race([
		handleRequest(
			hangingBodyRequest,
			makeEnv(quotaForBody),
			async () => jsonResponse(cityResult),
			180,
		),
		new Promise((resolve) => setTimeout(() => resolve(null), 450)),
	]);
	assert.ok(bodyDeadline instanceof Response);
	assert.equal(bodyDeadline.status, 502);
	assert.equal((await bodyDeadline.json()).error, "upstream_unavailable");
	assert.equal(bodyCancelled, true);
	assert.ok(Date.now() - bodyStart < 450);
	assert.equal(quotaForBody.calls.rate, 0);
	quotaForBody.close();

	const quotaForUpstream = makeQuotaBinding();
	let upstreamCalls = 0;
	const upstreamPaths = [];
	const upstreamStart = Date.now();
	const upstreamResponse = await handleRequest(
		weatherRequest(),
		makeEnv(quotaForUpstream),
		async (url, init) => {
			upstreamCalls += 1;
			upstreamPaths.push(new URL(url).pathname);
			await new Promise((resolve, reject) => {
				const timer = setTimeout(resolve, 60);
				const abort = () => {
					clearTimeout(timer);
					reject(init.signal.reason);
				};
				if (init.signal.aborted) abort();
				else
					init.signal.addEventListener("abort", abort, {
						once: true,
					});
			});
			return new URL(url).pathname === "/geo/v2/city/lookup"
				? jsonResponse({ code: "200", location: [] })
				: jsonResponse(currentResult);
		},
		180,
	);
	assert.equal(upstreamResponse.status, 502);
	assert.equal((await upstreamResponse.json()).error, "upstream_unavailable");
	assert.equal(upstreamCalls, 3);
	assert.deepEqual(upstreamPaths, Array(3).fill("/geo/v2/city/lookup"));
	assert.equal(quotaForUpstream.calls.reserve, 3);
	assert.ok(Date.now() - upstreamStart < 450);
	quotaForUpstream.close();
});
