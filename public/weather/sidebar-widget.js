(() => {
	if (window.WeatherSidebarWidget || !window.WeatherCapsule?.weatherService) {
		return;
	}

	const state = {
		status: "idle",
		coordinates: null,
		weather: null,
		fetchedAt: null,
		locationError: "",
		weatherError: "",
	};

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
			return null;
		}
		return {
			latitude: Math.round(latitude * 10) / 10,
			longitude: Math.round(longitude * 10) / 10,
		};
	}

	function locationErrorMessage(error) {
		if (error?.code === 1) {
			return "定位权限被拒绝，请在浏览器设置中允许位置访问后重试";
		}
		if (error?.code === 2) {
			return "设备暂时无法获取位置，请检查定位服务后重试";
		}
		if (error?.code === 3) return "定位超时，请重试";
		return "暂时无法获取位置，请重试";
	}

	function weatherErrorMessage(error, hasStaleWeather) {
		if (hasStaleWeather) {
			return "天气更新失败，当前显示旧数据，请重试";
		}
		return error?.reason === "timeout"
			? "天气请求超时，请重试"
			: "天气暂不可用，请重试";
	}

	function iconKind(weather) {
		const condition = String(
			weather.condition ?? weather.description ?? "",
		);
		const code = String(weather.conditionCode ?? "").toLowerCase();
		if (/雷/u.test(condition) || /^2\d{2}$/u.test(code)) return "storm";
		if (/雪|冰雹/u.test(condition) || /^4\d{2}$/u.test(code)) return "snow";
		if (/雾|霾/u.test(condition) || /^5\d{2}$/u.test(code)) return "fog";
		if (/雨/u.test(condition) || /^3\d{2}$/u.test(code)) return "rain";
		if (/晴/u.test(condition) || code === "113") {
			return "clear";
		}
		return "cloud";
	}

	function setExternalLink(anchor, rawUrl, label) {
		anchor.textContent = label;
		try {
			const url = new URL(rawUrl);
			if (url.protocol !== "https:" || url.username || url.password) {
				anchor.removeAttribute("href");
				return;
			}
			anchor.href = url.href;
		} catch {
			anchor.removeAttribute("href");
		}
	}

	function formatTime(timestamp) {
		const date = new Date(timestamp);
		if (!Number.isFinite(date.getTime())) return "";
		return `获取于 ${String(date.getHours()).padStart(2, "0")}:${String(
			date.getMinutes(),
		).padStart(2, "0")}`;
	}

	function sourceLabel(weather) {
		if (weather.source === "wttr.in") return "wttr.in";
		return String(weather.source ?? "天气来源");
	}

	function renderCard(card) {
		const status = card.querySelector("[data-weather-status]");
		const reading = card.querySelector("[data-weather-reading]");
		const refresh = card
			.closest(".widget")
			?.querySelector("[data-weather-refresh]");
		const retry = card.querySelector("[data-weather-retry]");
		card.dataset.weatherState = state.status;

		let statusText = "启用 JavaScript 后可查看附近天气";
		let canRetry = false;
		if (state.status === "locating") {
			statusText = "正在获取位置，用于显示附近天气";
		} else if (state.status === "loading") {
			statusText = "正在读取天气";
		} else if (state.status === "weather-loading") {
			statusText = "正在更新天气";
		} else if (state.status === "location-error") {
			statusText = state.locationError;
			canRetry = true;
		} else if (state.status === "unsupported") {
			statusText = state.locationError;
		} else if (state.status === "weather-error") {
			statusText = weatherErrorMessage(
				state.weatherError,
				Boolean(state.weather),
			);
			canRetry = true;
		} else if (state.status === "success") {
			statusText = "天气已更新";
		}
		status.textContent = statusText;
		reading.hidden = !state.weather;
		if (refresh) {
			refresh.hidden = !state.weather || state.status === "weather-error";
			refresh.disabled = state.status === "weather-loading";
		}
		retry.hidden = !canRetry;
		retry.textContent =
			state.status === "location-error" ? "重试定位" : "重试获取附近天气";
		if (!state.weather) return;

		const temperature = state.weather.temperatureC;
		const roundedTemperature = Number.isInteger(temperature)
			? String(temperature)
			: String(Number(temperature.toFixed(1)));
		card.querySelector("[data-weather-temperature]").textContent =
			`${roundedTemperature}°C`;
		card.querySelector("[data-weather-city]").textContent =
			`附近：${state.weather.cityName || "未知城市"}`;
		card.querySelector("[data-weather-description]").textContent =
			state.weather.condition ||
			state.weather.description ||
			"天气情况未知";
		const stale =
			state.status === "weather-error" || state.weather.stale === true;
		card.querySelector("[data-weather-stale]").hidden = !stale;
		card.querySelector("[data-weather-icon]").dataset.weatherKind =
			iconKind(state.weather);
		card.querySelector("[data-weather-fetched-at]").textContent =
			formatTime(state.fetchedAt);
		const source = card.querySelector("[data-weather-source]");
		setExternalLink(
			source,
			state.weather.sourceUrl,
			sourceLabel(state.weather),
		);
	}

	function renderAll() {
		for (const card of document.querySelectorAll("[data-weather-widget]")) {
			renderCard(card);
		}
	}

	async function fetchWeather() {
		if (!state.coordinates || state.status === "weather-loading") return;
		state.status = "weather-loading";
		state.weatherError = "";
		renderAll();
		try {
			state.weather =
				await window.WeatherCapsule.weatherService.fetchCurrentWeather(
					state.coordinates,
				);
			state.fetchedAt = Date.now();
			state.status = "success";
		} catch (error) {
			state.weatherError = error;
			const stale =
				window.WeatherCapsule.weatherService.getLastSuccessfulWeather(
					state.coordinates,
				);
			if (stale) state.weather = stale;
			if (state.weather)
				state.weather = { ...state.weather, stale: true };
			state.status = "weather-error";
		}
		renderAll();
	}

	function requestLocation() {
		if (typeof navigator.geolocation?.getCurrentPosition !== "function") {
			state.status = "unsupported";
			state.locationError = "当前浏览器不支持定位，无法获取附近天气";
			renderAll();
			return;
		}
		state.status = "locating";
		state.locationError = "";
		renderAll();
		try {
			navigator.geolocation.getCurrentPosition(
				(position) => {
					state.coordinates = roundedCoordinates(position?.coords);
					if (!state.coordinates) {
						state.status = "location-error";
						state.locationError = "暂时无法获取位置，请重试";
						renderAll();
						return;
					}
					state.status = "loading";
					renderAll();
					void fetchWeather();
				},
				(error) => {
					state.status = "location-error";
					state.locationError = locationErrorMessage(error);
					renderAll();
				},
				{ enableHighAccuracy: false, maximumAge: 0, timeout: 8000 },
			);
		} catch {
			state.status = "location-error";
			state.locationError = "暂时无法获取位置，请重试";
			renderAll();
		}
	}

	function bindCard(card) {
		if (card.dataset.weatherBound === "true") return;
		card.dataset.weatherBound = "true";
		card.closest(".widget")
			?.querySelector("[data-weather-refresh]")
			?.addEventListener("click", () => void fetchWeather());
		card.querySelector("[data-weather-retry]")?.addEventListener(
			"click",
			() => {
				if (state.status === "location-error") requestLocation();
				else if (state.coordinates) void fetchWeather();
				else requestLocation();
			},
		);
	}

	function pageReady() {
		const cards = [...document.querySelectorAll("[data-weather-widget]")];
		if (cards.length === 0) return;
		cards.forEach(bindCard);
		renderAll();
		if (state.status === "idle") requestLocation();
	}

	window.WeatherSidebarWidget = Object.freeze({ state });
	document.addEventListener("astro:page-load", pageReady);
	pageReady();
})();
