import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const weatherScript = await readFile(
	new URL("../public/domain/js/weather.js", import.meta.url),
	"utf8",
);
const weatherServiceScript = await readFile(
	new URL("../public/weather/weather-service.js", import.meta.url),
	"utf8",
);

function loadWeatherService({
	setTimeout: schedule = setTimeout,
	clearTimeout: cancel = clearTimeout,
} = {}) {
	const window = { setTimeout: schedule, clearTimeout: cancel };
	const context = {
		window,
		document: { getElementById: () => null },
		navigator: {},
		AbortController,
		Date,
		URL,
		setTimeout: schedule,
		clearTimeout: cancel,
	};
	vm.runInNewContext(weatherServiceScript, context);
	vm.runInNewContext(weatherScript, context);
	return window.domainWeatherService;
}

function fakeClock() {
	let nextId = 0;
	let lastDelay;
	const timers = new Map();
	return {
		setTimeout(callback, delay) {
			const id = ++nextId;
			lastDelay = delay;
			timers.set(id, callback);
			return id;
		},
		clearTimeout(id) {
			timers.delete(id);
		},
		fireAll() {
			const callbacks = [...timers.values()];
			timers.clear();
			callbacks.forEach((callback) => callback());
		},
		get lastDelay() {
			return lastDelay;
		},
	};
}

async function assertTimedOutAndAborted(promise, clock, signal) {
	let outcome;
	promise.then(
		(value) => (outcome = { status: "resolved", value }),
		(error) => (outcome = { status: "rejected", error }),
	);
	clock.fireAll();
	await new Promise((resolve) => setImmediate(resolve));

	assert.equal(clock.lastDelay, 8000);
	assert.equal(signal?.aborted, true);
	assert.equal(outcome?.status, "rejected");
	assert.match(String(outcome?.error), /abort|timed out|timeout/i);
}

function weatherResponse({
	city = "Beijing",
	code = "113",
	temp = "26",
	description = "Clear",
} = {}) {
	return {
		nearest_area: city ? [{ areaName: [{ value: city }] }] : [],
		current_condition: [
			{
				temp_C: temp,
				weatherCode: code,
				weatherDesc: [{ value: description }],
			},
		],
	};
}

test("requests wttr.in with only one-decimal coordinates and normalizes current weather", async () => {
	const service = loadWeatherService();
	const requests = [];
	const result = await service.fetchCurrentWeather(
		{ latitude: 39.9042, longitude: 116.4074 },
		async (url) => {
			requests.push(url);
			return { ok: true, json: async () => weatherResponse() };
		},
	);

	assert.deepEqual(requests, [
		"https://wttr.in/39.9,116.4?format=j1&lang=zh",
	]);
	assert.equal(result.cityName, "Beijing");
	assert.equal(result.temperatureC, 26);
	assert.equal(result.description, "晴");
	assert.equal(result.source, "wttr.in");
});

test("keeps wttr.in's original condition when no mapped Chinese description exists", async () => {
	const service = loadWeatherService();
	const result = await service.fetchCurrentWeather(
		{ latitude: 31.2304, longitude: 121.4737 },
		async () => ({
			ok: true,
			json: async () =>
				weatherResponse({ code: "118", description: "Showers" }),
		}),
	);

	assert.equal(result.description, "Showers");
	assert.equal(result.cityName, "Beijing");
});

test("returns a missing city as null while retaining valid weather", async () => {
	const service = loadWeatherService();
	const result = await service.fetchCurrentWeather(
		{ latitude: 31.2304, longitude: 121.4737 },
		async () => ({
			ok: true,
			json: async () => weatherResponse({ city: "" }),
		}),
	);

	assert.equal(result.cityName, null);
	assert.equal(result.temperatureC, 26);
});

test("accepts finite decimal Celsius and normalizes it as a number", async () => {
	const service = loadWeatherService();
	const result = await service.fetchCurrentWeather(
		{ latitude: 31.2304, longitude: 121.4737 },
		async () => ({
			ok: true,
			json: async () => weatherResponse({ temp: "-0.5" }),
		}),
	);

	assert.equal(result.temperatureC, -0.5);
	assert.equal(typeof result.temperatureC, "number");
});

test("rejects non-numeric and non-finite Celsius values", async () => {
	const service = loadWeatherService();
	for (const temp of ["unknown", "", "NaN", "Infinity", null, false]) {
		await assert.rejects(
			service.fetchCurrentWeather(
				{ latitude: 31.2304, longitude: 121.4737 },
				async () => ({
					ok: true,
					json: async () => weatherResponse({ temp }),
				}),
			),
			/unavailable/u,
			`rejected temp_C=${String(temp)}`,
		);
	}
});

test("aborts a wttr.in request that remains pending past the deadline", async () => {
	const clock = fakeClock();
	const service = loadWeatherService(clock);
	let signal;
	const request = service.fetchCurrentWeather(
		{ latitude: 39.9042, longitude: 116.4074 },
		(_url, options) => {
			signal = options?.signal;
			return new Promise((_, reject) => {
				signal?.addEventListener(
					"abort",
					() => reject(new Error("request aborted")),
					{ once: true },
				);
			});
		},
	);

	await assertTimedOutAndAborted(request, clock, signal);
});

test("aborts a wttr.in JSON body that remains pending past the deadline", async () => {
	const clock = fakeClock();
	const service = loadWeatherService(clock);
	let signal;
	let bodyStarted = false;
	const request = service.fetchCurrentWeather(
		{ latitude: 39.9042, longitude: 116.4074 },
		async (_url, options) => {
			signal = options?.signal;
			return {
				ok: true,
				json: () => {
					bodyStarted = true;
					return new Promise((_, reject) => {
						signal?.addEventListener(
							"abort",
							() => reject(new Error("body aborted")),
							{ once: true },
						);
					});
				},
			};
		},
	);
	await new Promise((resolve) => setImmediate(resolve));
	assert.equal(bodyStarted, true);

	await assertTimedOutAndAborted(request, clock, signal);
});

test("rejects service and malformed-response failures without an IP lookup", async () => {
	const service = loadWeatherService();
	const requests = [];
	await assert.rejects(
		service.fetchCurrentWeather(
			{ latitude: 39.9042, longitude: 116.4074 },
			async (url) => {
				requests.push(url);
				return { ok: false, status: 503, json: async () => ({}) };
			},
		),
		/unavailable/u,
	);

	assert.deepEqual(requests, [
		"https://wttr.in/39.9,116.4?format=j1&lang=zh",
	]);
	assert.ok(requests.every((url) => !/^https:\/\/wttr\.in\/?\?/u.test(url)));
	await assert.rejects(
		service.fetchCurrentWeather(
			{ latitude: 39.9042, longitude: 116.4074 },
			async () => ({
				ok: true,
				json: async () => ({ current_condition: [] }),
			}),
		),
		/unavailable/u,
	);
});
