(() => {
	if (window.WeatherCapsule) return;

	const TOTAL_TIMEOUT_MS = 8000;
	const WTTR_URL = "https://wttr.in";
	const weatherNames = {
		113: "晴",
		116: "局部多云",
		119: "多云",
		122: "阴",
		143: "雾",
		176: "附近有阵雨",
		200: "雷暴",
		248: "雾",
		260: "冻雾",
		263: "小雨",
		266: "小雨",
		293: "小雨",
		296: "小雨",
		299: "中雨",
		302: "中雨",
		305: "大雨",
		308: "大雨",
		323: "小雪",
		326: "小雪",
		329: "中雪",
		332: "中雪",
		335: "大雪",
		338: "大雪",
		353: "阵雨",
		356: "阵雨",
		359: "暴雨",
		386: "雷阵雨",
		389: "雷阵雨",
		392: "雷雪",
		395: "雷雪",
	};
	const weatherIcons = {
		113: "☀️",
		116: "🌤️",
		119: "☁️",
		122: "☁️",
		143: "🌫️",
		176: "🌦️",
		200: "⛈️",
		248: "🌫️",
		260: "🌫️",
		263: "🌦️",
		266: "🌧️",
		293: "🌦️",
		296: "🌧️",
		299: "🌧️",
		302: "🌧️",
		305: "🌧️",
		308: "🌧️",
		323: "🌨️",
		326: "🌨️",
		329: "🌨️",
		332: "🌨️",
		335: "❄️",
		338: "❄️",
		353: "🌦️",
		356: "🌧️",
		359: "🌧️",
		386: "⛈️",
		389: "⛈️",
		392: "🌨️",
		395: "❄️",
	};

	function serviceError(reason, sources) {
		const error = new Error(reason);
		error.reason = reason;
		error.sources = [...sources];
		return error;
	}

	function roundedCoordinates(coords) {
		const { latitude, longitude } = coords ?? {};
		if (
			typeof latitude !== "number" ||
			!Number.isFinite(latitude) ||
			latitude < -90 ||
			latitude > 90 ||
			typeof longitude !== "number" ||
			!Number.isFinite(longitude) ||
			longitude < -180 ||
			longitude > 180
		) {
			throw serviceError("invalid_location", []);
		}

		return {
			lat: (Math.round(latitude * 10) / 10).toFixed(1),
			lon: (Math.round(longitude * 10) / 10).toFixed(1),
		};
	}

	function conditionIcon(condition, code) {
		if (weatherIcons[Number(code)]) {
			return weatherIcons[Number(code)];
		}
		if (/雷/u.test(condition)) return "⛈️";
		if (/雪|冰雹/u.test(condition)) return "🌨️";
		if (/雨/u.test(condition)) return "🌧️";
		if (/雾|霾/u.test(condition)) return "🌫️";
		if (/晴/u.test(condition)) return "☀️";
		if (/云|阴/u.test(condition)) return "☁️";
		return "🌡️";
	}

	function firstValue(value) {
		return Array.isArray(value) ? value[0] : null;
	}

	function normalizeWttr(payload, fetchedAt) {
		const data = payload?.data || payload;
		const condition = firstValue(data?.current_condition);
		const area = firstValue(data?.nearest_area);
		if (!condition) return null;

		const cityName = firstValue(area?.areaName)?.value?.trim() || null;
		const rawTemperature = condition.temp_C;
		if (
			(typeof rawTemperature !== "number" &&
				typeof rawTemperature !== "string") ||
			(typeof rawTemperature === "string" && rawTemperature.trim() === "")
		) {
			return null;
		}
		const temperatureC = Number(rawTemperature);
		if (!Number.isFinite(temperatureC)) return null;

		const code = Number(condition.weatherCode);
		const description =
			weatherNames[code] ||
			firstValue(condition.lang_zh)?.value?.trim() ||
			firstValue(condition.weatherDesc)?.value?.trim();
		if (!description) return null;

		return {
			cityName,
			temperatureC,
			condition: description,
			description,
			conditionCode: String(condition.weatherCode ?? ""),
			icon: conditionIcon(description, code),
			fetchedAt,
			source: "wttr.in",
			sourceUrl: WTTR_URL,
			stale: false,
		};
	}

	function createWeatherService({
		fetchImpl = (...args) => window.fetch(...args),
		now = () => Date.now(),
		setTimeout: schedule = (...args) => window.setTimeout(...args),
		clearTimeout: cancel = (id) => window.clearTimeout(id),
	} = {}) {
		let lastSuccess = null;

		async function readJson(url, deadline) {
			const remaining = deadline - now();
			if (remaining <= 0) {
				throw serviceError("timeout", []);
			}

			const controller = new AbortController();
			let timeoutId;
			const request = (async () => {
				const response = await fetchImpl(url, {
					signal: controller.signal,
				});
				if (!response?.ok)
					throw new Error("weather provider unavailable");
				return response.json();
			})();
			const timeout = new Promise((_, reject) => {
				timeoutId = schedule(() => {
					controller.abort();
					reject(serviceError("timeout", []));
				}, remaining);
			});
			try {
				return await Promise.race([request, timeout]);
			} finally {
				cancel(timeoutId);
			}
		}

		function remember(weather, coordinates) {
			const coordinateKey = `${coordinates.lat},${coordinates.lon}`;
			lastSuccess = { coordinateKey, weather };
			return weather;
		}

		async function fetchCurrentWeather(coords) {
			const coordinates = roundedCoordinates(coords);
			const coordinateKey = `${coordinates.lat},${coordinates.lon}`;
			const deadline = now() + TOTAL_TIMEOUT_MS;
			const attemptedSources = ["wttr.in"];

			try {
				const url = `${WTTR_URL}/${coordinates.lat},${coordinates.lon}?format=j1&lang=zh`;
				const payload = await readJson(url, deadline);
				const weather = normalizeWttr(
					payload,
					new Date(now()).toISOString(),
				);
				if (!weather) throw new Error("weather response was invalid");
				return remember(weather, coordinates);
			} catch (error) {
				const reason =
					error?.reason === "timeout" || now() >= deadline
						? "timeout"
						: "unavailable";
				throw serviceError(reason, attemptedSources);
			}
		}

		function getLastSuccessfulWeather(coords) {
			if (!lastSuccess) return null;
			let coordinates;
			try {
				coordinates = roundedCoordinates(coords);
			} catch {
				return null;
			}
			if (
				lastSuccess.coordinateKey !==
				`${coordinates.lat},${coordinates.lon}`
			) {
				return null;
			}
			return { ...lastSuccess.weather, stale: true };
		}

		return Object.freeze({ fetchCurrentWeather, getLastSuccessfulWeather });
	}

	const weatherService = createWeatherService();
	window.WeatherCapsule = Object.freeze({
		createWeatherService,
		weatherService,
	});
})();
