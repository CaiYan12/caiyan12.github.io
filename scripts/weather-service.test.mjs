import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const serviceScript = await readFile(
	new URL("../public/weather/weather-service.js", import.meta.url),
	"utf8",
);
const WTTR_URL = "https://wttr.in/39.9,116.4?format=j1&lang=zh";
const BEIJING = { latitude: 39.9042, longitude: 116.4074 };

function createService(options) {
	const window = { setTimeout, clearTimeout };
	vm.runInNewContext(serviceScript, {
		window,
		AbortController,
		Date,
		URL,
		setTimeout,
		clearTimeout,
	});
	return window.WeatherCapsule.createWeatherService(options);
}

function wttrResponse(city = "Beijing") {
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

test("wttr.in is queried once with one-decimal string coordinates", async () => {
	const requests = [];
	const service = createService({
		fetchImpl: async (url, options) => {
			requests.push({ url, options });
			return { ok: true, json: async () => wttrResponse() };
		},
	});

	const weather = await service.fetchCurrentWeather(BEIJING);

	assert.deepEqual(
		requests.map((request) => request.url),
		[WTTR_URL],
	);
	assert.equal(requests[0].options.method, undefined);
	assert.equal(weather.cityName, "Beijing");
	assert.equal(weather.temperatureC, 24);
	assert.equal(weather.description, "晴");
	assert.equal(weather.icon, "☀️");
	assert.equal(weather.source, "wttr.in");
	assert.equal(weather.sourceUrl, "https://wttr.in");
	assert.equal(weather.stale, false);
});

test("wttr.in weather without a city still succeeds with a null city", async () => {
	let requests = 0;
	const service = createService({
		fetchImpl: async () => {
			requests += 1;
			return { ok: true, json: async () => wttrResponse(null) };
		},
	});

	const weather = await service.fetchCurrentWeather({
		latitude: 31.2304,
		longitude: 121.4737,
	});

	assert.equal(requests, 1);
	assert.equal(weather.cityName, null);
	assert.equal(weather.condition, "晴");
});

test("a failed retry returns a same-location cached result marked stale", async () => {
	let fail = false;
	const service = createService({
		fetchImpl: async () => {
			if (fail) return { ok: false, status: 503, json: async () => ({}) };
			return { ok: true, json: async () => wttrResponse() };
		},
	});
	await service.fetchCurrentWeather(BEIJING);
	fail = true;
	await assert.rejects(service.fetchCurrentWeather(BEIJING), /unavailable/u);

	assert.equal(service.getLastSuccessfulWeather(BEIJING).stale, true);
	assert.equal(
		service.getLastSuccessfulWeather({
			latitude: 31.2304,
			longitude: 121.4737,
		}),
		null,
	);
});

test("the eight second deadline covers the wttr.in response body", async () => {
	let elapsedMs = 0;
	let nextId = 0;
	const timers = new Map();
	const delays = [];
	const signals = [];
	const clock = {
		setTimeout(callback, delay) {
			const id = ++nextId;
			delays.push(delay);
			timers.set(id, { callback, delay });
			return id;
		},
		clearTimeout(id) {
			timers.delete(id);
		},
		fireNext() {
			const entry = timers.entries().next().value;
			assert.ok(entry, "an active deadline is scheduled");
			const [id, timer] = entry;
			timers.delete(id);
			elapsedMs += timer.delay;
			timer.callback();
		},
	};
	const service = createService({
		now: () => elapsedMs,
		setTimeout: clock.setTimeout,
		clearTimeout: clock.clearTimeout,
		fetchImpl: async (url, options) => {
			signals.push(options.signal);
			return {
				ok: true,
				json: () =>
					new Promise((_, reject) => {
						options.signal.addEventListener(
							"abort",
							() => reject(new Error(`${url} body aborted`)),
							{ once: true },
						);
					}),
			};
		},
	});
	const request = service.fetchCurrentWeather(BEIJING);
	const rejected = assert.rejects(request, (error) => {
		assert.equal(error.reason, "timeout");
		assert.deepEqual([...error.sources], ["wttr.in"]);
		return true;
	});
	await new Promise((resolve) => setImmediate(resolve));
	clock.fireNext();
	await rejected;

	assert.deepEqual(delays, [8000]);
	assert.equal(signals.length, 1);
	assert.equal(signals[0].aborted, true);
});

test("exposes the same-response detail fields used by the card's parameter row", async () => {
	const service = createService({
		fetchImpl: async () => ({
			ok: true,
			json: async () => ({
				nearest_area: [{ areaName: [{ value: "Nanchang" }] }],
				current_condition: [
					{
						temp_C: "31",
						weatherCode: "122",
						weatherDesc: [{ value: "Overcast" }],
						FeelsLikeC: "35",
						windspeedKmph: "6",
						humidity: "63",
					},
				],
			}),
		}),
	});
	const weather = await service.fetchCurrentWeather({
		latitude: 28.68,
		longitude: 115.89,
	});
	assert.deepEqual(
		{
			feelsLikeC: weather.feelsLikeC,
			windSpeedKmph: weather.windSpeedKmph,
			humidityPercent: weather.humidityPercent,
		},
		{ feelsLikeC: 35, windSpeedKmph: 6, humidityPercent: 63 },
	);
});

test("detail fields degrade to null instead of NaN when the response omits them", async () => {
	const service = createService({
		fetchImpl: async () => ({ ok: true, json: async () => wttrResponse() }),
	});
	const weather = await service.fetchCurrentWeather(BEIJING);
	assert.equal(weather.feelsLikeC, null);
	assert.equal(weather.windSpeedKmph, null);
	assert.equal(weather.humidityPercent, null);
});
