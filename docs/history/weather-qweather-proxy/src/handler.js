import { DurableObject } from "cloudflare:workers";

const UPSTREAM_CALL_LIMIT = 45_000;
const RATE_WINDOW_MS = 60_000;
const REQUESTS_PER_IP_PER_WINDOW = 12;
const MAX_REQUEST_BYTES = 128;
const UPSTREAM_TIMEOUT_MS = 3_000;
export const QWEATHER_DEADLINE_MS = 6_000;

class DeadlineExceededError extends Error {}

const healthHeaders = {
	"cache-control": "no-store",
	"content-type": "application/json; charset=utf-8",
};

export const MAX_MONTHLY_UPSTREAM_CALLS = UPSTREAM_CALL_LIMIT;

function textResponse(text, status, headers = {}) {
	return new Response(text, {
		headers: { "cache-control": "no-store", ...headers },
		status,
	});
}

function jsonResponse(payload, status, headers = {}) {
	return new Response(JSON.stringify(payload), {
		headers: {
			"cache-control": "no-store",
			"content-type": "application/json; charset=utf-8",
			...headers,
		},
		status,
	});
}

function allowedOrigins(env) {
	return new Set(
		String(env.WEATHER_ALLOWED_ORIGINS ?? "")
			.split(",")
			.map((value) => value.trim())
			.filter(Boolean),
	);
}

function corsHeaders(request) {
	const origin = request.headers.get("origin");
	return {
		"access-control-allow-origin": origin,
		"access-control-allow-methods": "POST, OPTIONS",
		"access-control-allow-headers": "content-type",
		"access-control-max-age": "600",
		vary: "Origin",
	};
}

function validApiHost(value) {
	if (typeof value !== "string" || value.length > 253) return false;
	const labels = value.split(".");
	if (
		labels.length < 2 ||
		labels.some(
			(label) =>
				label.length < 1 ||
				label.length > 63 ||
				!/^[a-z\d](?:[a-z\d-]*[a-z\d])?$/i.test(label),
		)
	)
		return false;
	try {
		const parsed = new URL(`https://${value}`);
		return (
			parsed.hostname === value.toLowerCase() &&
			parsed.port === "" &&
			parsed.pathname === "/" &&
			parsed.search === "" &&
			parsed.hash === ""
		);
	} catch {
		return false;
	}
}

function validatedConfiguration(env) {
	const month = new Date().toISOString().slice(0, 7);
	const initialCallsText = env.QWEATHER_ACCOUNT_CALLS_USED;
	const apiKey = env.QWEATHER_API_KEY;
	const apiHost = env.QWEATHER_API_HOST;
	if (
		env.QWEATHER_ACCOUNT_USAGE_CONFIRMED !== "true" ||
		env.QWEATHER_BILLING_MONTH_ALIGNED !== "true" ||
		env.QWEATHER_BILLING_MONTH !== month ||
		typeof initialCallsText !== "string" ||
		!/^(0|[1-9]\d{0,5})$/.test(initialCallsText) ||
		Number(initialCallsText) > 50_000 ||
		typeof apiKey !== "string" ||
		apiKey.trim() === "" ||
		/[\r\n\s]/.test(apiKey) ||
		!validApiHost(apiHost)
	) {
		return null;
	}
	return {
		apiHost,
		apiKey,
		initialCalls: Number(initialCallsText),
		month,
	};
}

function remainingDeadlineMs(deadline) {
	const remaining = deadline - Date.now();
	if (remaining <= 0) throw new DeadlineExceededError();
	return remaining;
}

function deadlineSignal(deadline, maxMs = Number.POSITIVE_INFINITY) {
	return AbortSignal.timeout(Math.min(maxMs, remainingDeadlineMs(deadline)));
}

function readBeforeDeadline(promise, deadline) {
	const remaining = remainingDeadlineMs(deadline);
	let timer;
	const timeout = new Promise((resolve, reject) => {
		timer = setTimeout(
			() => reject(new DeadlineExceededError()),
			remaining,
		);
	});
	return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function readBoundedJson(request, deadline) {
	const contentLength = request.headers.get("content-length");
	if (contentLength !== null && Number(contentLength) > MAX_REQUEST_BYTES) {
		return { error: 413 };
	}
	if (!request.body) return { error: 400 };

	const reader = request.body.getReader();
	const chunks = [];
	let size = 0;
	try {
		while (true) {
			const { done, value } = await readBeforeDeadline(
				reader.read(),
				deadline,
			);
			if (done) break;
			size += value.byteLength;
			if (size > MAX_REQUEST_BYTES) {
				await reader.cancel();
				return { error: 413 };
			}
			chunks.push(value);
		}
	} catch (error) {
		if (error instanceof DeadlineExceededError) {
			void reader.cancel().catch(() => {});
			throw error;
		}
		return { error: 400 };
	}

	const bytes = new Uint8Array(size);
	let offset = 0;
	for (const chunk of chunks) {
		bytes.set(chunk, offset);
		offset += chunk.byteLength;
	}
	try {
		return {
			value: JSON.parse(
				new TextDecoder("utf-8", { fatal: true }).decode(bytes),
			),
		};
	} catch {
		return { error: 400 };
	}
}

function validCoordinates(value) {
	if (
		value === null ||
		typeof value !== "object" ||
		Array.isArray(value) ||
		Object.keys(value).length !== 2 ||
		!Object.hasOwn(value, "lat") ||
		!Object.hasOwn(value, "lon") ||
		typeof value.lat !== "string" ||
		typeof value.lon !== "string"
	) {
		return null;
	}
	const coordinatePattern = /^-?(?:0|[1-9]\d{0,2})(?:\.\d)?$/;
	if (
		!coordinatePattern.test(value.lat) ||
		!coordinatePattern.test(value.lon)
	)
		return null;
	const lat = Number(value.lat);
	const lon = Number(value.lon);
	if (
		!Number.isFinite(lat) ||
		!Number.isFinite(lon) ||
		lat < -90 ||
		lat > 90 ||
		lon < -180 ||
		lon > 180
	) {
		return null;
	}
	return { lat: value.lat, lon: value.lon };
}

async function durableAction(env, body, deadline) {
	try {
		const namespace = env.WEATHER_QUOTA;
		if (!namespace) return null;
		const stub = namespace.get(namespace.idFromName("weather-global"));
		const response = await stub.fetch(
			"https://weather-quota.internal/action",
			{
				body: JSON.stringify(body),
				method: "POST",
				signal: deadlineSignal(deadline),
			},
		);
		if (!response.ok) return null;
		return await response.json();
	} catch (error) {
		if (error instanceof DeadlineExceededError) throw error;
		return null;
	}
}

async function clientHash(ipAddress) {
	const bytes = new TextEncoder().encode(ipAddress);
	const hash = await crypto.subtle.digest("SHA-256", bytes);
	return [...new Uint8Array(hash)]
		.map((value) => value.toString(16).padStart(2, "0"))
		.join("");
}

function cityNameFrom(data) {
	if (!Array.isArray(data.location)) return null;
	for (const location of data.location) {
		if (location === null || typeof location !== "object") continue;
		const parentArea =
			typeof location.adm2 === "string" ? location.adm2.trim() : "";
		if (parentArea) return parentArea;
		const name =
			typeof location.name === "string" ? location.name.trim() : "";
		if (location.type === "city" && name) return name;
	}
	return null;
}

function normalizedAttributions(data) {
	const source = data?.metadata?.attributions;
	if (!Array.isArray(source) || source.length === 0 || source.length > 8) {
		return null;
	}
	const normalized = [];
	for (const value of source) {
		if (
			typeof value !== "string" ||
			value.trim() === "" ||
			value.length > 512 ||
			/[\u0000-\u001f\u007f]/.test(value)
		) {
			return null;
		}
		const text = value.trim();
		if (/^[a-z][a-z\d+.-]*:/i.test(text)) {
			try {
				const url = new URL(text);
				if (url.protocol !== "https:" || url.username || url.password) {
					return null;
				}
				normalized.push(url.href);
			} catch {
				return null;
			}
		} else {
			normalized.push(text);
		}
	}
	return normalized;
}

function parseWeather(data) {
	const temperature = data?.temperature?.value;
	const unit = data?.temperature?.unit;
	const condition = data?.condition?.text;
	const conditionCode = data?.condition?.code;
	const attributions = normalizedAttributions(data);
	const code = String(conditionCode ?? "");
	if (
		typeof temperature !== "number" ||
		!Number.isFinite(temperature) ||
		unit !== "°C" ||
		typeof condition !== "string" ||
		condition.trim() === "" ||
		!/^\d{3}$/.test(code) ||
		attributions === null
	) {
		return null;
	}
	return {
		condition: condition.trim(),
		conditionCode: code,
		attributions,
		temperatureC: temperature,
	};
}

async function reserveUpstreamCall(env, configuration, deadline) {
	const reservation = await durableAction(
		env,
		{
			action: "reserve",
			initialCalls: configuration.initialCalls,
			month: configuration.month,
		},
		deadline,
	);
	if (reservation === null || reservation.allowed !== true) {
		return reservation?.reason === "limit" ? "limit" : "unavailable";
	}
	return "reserved";
}

async function fetchVendorJson(url, apiKey, fetchImpl, deadline) {
	try {
		const response = await fetchImpl(url, {
			headers: {
				Accept: "application/json",
				"X-QW-Api-Key": apiKey,
			},
			signal: deadlineSignal(deadline, UPSTREAM_TIMEOUT_MS),
		});
		if (!response.ok) return null;
		return await response.json();
	} catch (error) {
		if (error instanceof DeadlineExceededError) throw error;
		return null;
	}
}

async function handleWeatherRequest(request, env, fetchImpl, deadlineMs) {
	const deadline = Date.now() + deadlineMs;
	const origin = request.headers.get("origin");
	if (!origin || !allowedOrigins(env).has(origin)) {
		return jsonResponse({ error: "origin_not_allowed" }, 403);
	}
	const headers = corsHeaders(request);
	if (request.method !== "POST") {
		return jsonResponse({ error: "method_not_allowed" }, 405, {
			...headers,
			allow: "POST, OPTIONS",
		});
	}
	if (
		!/^application\/json(?:\s*;|\s*$)/i.test(
			request.headers.get("content-type") ?? "",
		)
	) {
		return jsonResponse(
			{ error: "unsupported_content_type" },
			415,
			headers,
		);
	}

	const parsedBody = await readBoundedJson(request, deadline);
	if (parsedBody.error) {
		return jsonResponse(
			{
				error:
					parsedBody.error === 413
						? "request_too_large"
						: "invalid_request",
			},
			parsedBody.error,
			headers,
		);
	}
	const coordinates = validCoordinates(parsedBody.value);
	if (!coordinates)
		return jsonResponse({ error: "invalid_request" }, 400, headers);

	const configuration = validatedConfiguration(env);
	if (!configuration)
		return jsonResponse({ error: "provider_unavailable" }, 503, headers);
	const ipAddress = request.headers.get("cf-connecting-ip");
	if (!ipAddress || ipAddress.length > 64) {
		return jsonResponse({ error: "provider_unavailable" }, 503, headers);
	}
	let hashedIp;
	try {
		hashedIp = await clientHash(ipAddress);
	} catch {
		return jsonResponse({ error: "provider_unavailable" }, 503, headers);
	}
	const rateResult = await durableAction(
		env,
		{
			action: "rate",
			clientHash: hashedIp,
			nowMs: Date.now(),
		},
		deadline,
	);
	if (rateResult === null)
		return jsonResponse({ error: "provider_unavailable" }, 503, headers);
	if (rateResult.allowed !== true)
		return jsonResponse({ error: "rate_limited" }, 429, headers);

	const baseUrl = `https://${configuration.apiHost}`;
	const cityUrl = new URL("/geo/v2/city/lookup", baseUrl);
	cityUrl.searchParams.set(
		"location",
		`${coordinates.lon},${coordinates.lat}`,
	);
	cityUrl.searchParams.set("lang", "zh");
	cityUrl.searchParams.set("number", "1");
	let cityName = null;
	for (let attempt = 0; attempt < 3; attempt += 1) {
		const reserved = await reserveUpstreamCall(
			env,
			configuration,
			deadline,
		);
		if (reserved === "limit")
			return jsonResponse({ error: "quota_exhausted" }, 429, headers);
		if (reserved !== "reserved")
			return jsonResponse(
				{ error: "provider_unavailable" },
				503,
				headers,
			);
		const cityData = await fetchVendorJson(
			cityUrl,
			configuration.apiKey,
			fetchImpl,
			deadline,
		);
		if (cityData === null || cityData.code !== "200") {
			return jsonResponse(
				{ error: "upstream_unavailable" },
				502,
				headers,
			);
		}
		cityName = cityNameFrom(cityData);
		if (cityName !== null) break;
	}

	const weatherReserved = await reserveUpstreamCall(
		env,
		configuration,
		deadline,
	);
	if (weatherReserved === "limit")
		return jsonResponse({ error: "quota_exhausted" }, 429, headers);
	if (weatherReserved !== "reserved")
		return jsonResponse({ error: "provider_unavailable" }, 503, headers);
	const weatherUrl = `${baseUrl}/weather/v1/current/${coordinates.lat}/${coordinates.lon}`;
	const weatherData = await fetchVendorJson(
		weatherUrl,
		configuration.apiKey,
		fetchImpl,
		deadline,
	);
	const weather = weatherData === null ? null : parseWeather(weatherData);
	if (!weather)
		return jsonResponse({ error: "upstream_unavailable" }, 502, headers);

	return jsonResponse(
		{
			cityName,
			...weather,
			fetchedAt: new Date().toISOString(),
			source: "qweather",
			sourceUrl: "https://www.qweather.com",
		},
		200,
		headers,
	);
}

export class QuotaDO extends DurableObject {
	constructor(ctx, env) {
		super(ctx, env);
		this.ctx = ctx;
		this.sql = ctx.storage.sql;
		this.sql.exec(`
			CREATE TABLE IF NOT EXISTS weather_monthly_usage (
				billing_month TEXT PRIMARY KEY,
				total_calls INTEGER NOT NULL,
				initial_calls INTEGER NOT NULL
			)
		`);
		this.sql.exec(`
			CREATE TABLE IF NOT EXISTS weather_ip_rate (
				client_hash TEXT PRIMARY KEY,
				window_start INTEGER NOT NULL,
				request_count INTEGER NOT NULL
			)
		`);
		this.sql.exec(
			"CREATE INDEX IF NOT EXISTS weather_ip_rate_window_idx ON weather_ip_rate(window_start)",
		);
	}

	async fetch(request) {
		if (request.method !== "POST")
			return jsonResponse({ allowed: false }, 405);
		let body;
		try {
			body = await request.json();
		} catch {
			return jsonResponse({ allowed: false }, 400);
		}
		if (body?.action === "rate") return this.checkRate(body);
		if (body?.action === "reserve") return this.reserve(body);
		return jsonResponse({ allowed: false }, 400);
	}

	checkRate(body) {
		if (
			typeof body.clientHash !== "string" ||
			!/^[a-f\d]{64}$/.test(body.clientHash) ||
			!Number.isSafeInteger(body.nowMs) ||
			body.nowMs < 0
		) {
			return jsonResponse({ allowed: false }, 400);
		}
		const windowStart =
			Math.floor(body.nowMs / RATE_WINDOW_MS) * RATE_WINDOW_MS;
		this.sql.exec(
			"DELETE FROM weather_ip_rate WHERE window_start < ?",
			windowStart - 2 * RATE_WINDOW_MS,
		);
		const row = this.sql
			.exec(
				`INSERT INTO weather_ip_rate (client_hash, window_start, request_count)
				 VALUES (?, ?, 1)
				 ON CONFLICT(client_hash) DO UPDATE SET
					window_start = CASE
						WHEN weather_ip_rate.window_start < excluded.window_start THEN excluded.window_start
						ELSE weather_ip_rate.window_start
					END,
					request_count = CASE
						WHEN weather_ip_rate.window_start < excluded.window_start THEN 1
						ELSE weather_ip_rate.request_count + 1
					END
				 WHERE weather_ip_rate.window_start < excluded.window_start
					OR weather_ip_rate.request_count < ?
				 RETURNING request_count`,
				body.clientHash,
				windowStart,
				REQUESTS_PER_IP_PER_WINDOW,
			)
			.toArray()[0];
		if (!row) return jsonResponse({ allowed: false, reason: "rate" }, 200);
		return jsonResponse(
			{ allowed: true, count: Number(row.request_count) },
			200,
		);
	}

	reserve(body) {
		if (
			typeof body.month !== "string" ||
			!/^\d{4}-(0[1-9]|1[0-2])$/.test(body.month) ||
			!Number.isSafeInteger(body.initialCalls) ||
			body.initialCalls < 0 ||
			body.initialCalls > 50_000
		) {
			return jsonResponse({ allowed: false, reason: "unavailable" }, 503);
		}
		try {
			const result = this.ctx.storage.transactionSync(() => {
				let row = this.sql
					.exec(
						"SELECT total_calls, initial_calls FROM weather_monthly_usage WHERE billing_month = ?",
						body.month,
					)
					.toArray()[0];
				if (!row) {
					this.sql.exec(
						"INSERT INTO weather_monthly_usage (billing_month, total_calls, initial_calls) VALUES (?, ?, ?)",
						body.month,
						body.initialCalls,
						body.initialCalls,
					);
					row = {
						total_calls: body.initialCalls,
						initial_calls: body.initialCalls,
					};
				} else if (Number(row.initial_calls) !== body.initialCalls) {
					return { allowed: false, reason: "state_mismatch" };
				}
				if (Number(row.total_calls) >= UPSTREAM_CALL_LIMIT) {
					return { allowed: false, reason: "limit" };
				}
				const updated = this.sql
					.exec(
						"UPDATE weather_monthly_usage SET total_calls = total_calls + 1 WHERE billing_month = ? AND total_calls < ? RETURNING total_calls",
						body.month,
						UPSTREAM_CALL_LIMIT,
					)
					.toArray()[0];
				return updated
					? { allowed: true, count: Number(updated.total_calls) }
					: { allowed: false, reason: "limit" };
			});
			return jsonResponse(result, 200);
		} catch {
			return jsonResponse({ allowed: false, reason: "unavailable" }, 503);
		}
	}
}

export async function handleRequest(
	request,
	env,
	fetchImpl = globalThis.fetch,
	deadlineMs = QWEATHER_DEADLINE_MS,
) {
	const { pathname } = new URL(request.url);
	if (pathname === "/healthz") {
		if (request.method !== "GET") {
			return textResponse("Method Not Allowed", 405, { allow: "GET" });
		}
		return new Response('{"status":"ok"}', {
			headers: healthHeaders,
			status: 200,
		});
	}
	if (pathname !== "/v1/weather") return textResponse("Not Found", 404);
	if (request.method === "OPTIONS") {
		const origin = request.headers.get("origin");
		if (!origin || !allowedOrigins(env).has(origin)) {
			return jsonResponse({ error: "origin_not_allowed" }, 403);
		}
		return new Response(null, {
			headers: corsHeaders(request),
			status: 204,
		});
	}
	try {
		return await handleWeatherRequest(request, env, fetchImpl, deadlineMs);
	} catch {
		return jsonResponse(
			{ error: "upstream_unavailable" },
			502,
			corsHeaders(request),
		);
	}
}

export default {
	fetch(request, env) {
		return handleRequest(request, env);
	},
};
