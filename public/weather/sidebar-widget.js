(() => {
	if (window.WeatherSidebarWidget || !window.WeatherCapsule?.weatherService) {
		return;
	}

	// 共享规则自 service 经 Capsule 消费：文字→kind 分类、坐标验证与粗化、
	// 定位/天气文案与时间格式的正典都在 weather-service.js，
	// 由 scripts/weather-rules.test.mjs 逐条锁定；本文件只做 adapter 呈现。
	const {
		weatherKind,
		roundCoordinates,
		locationErrorMessage,
		weatherErrorMessage,
		formatTime,
		sourceLabel,
	} = window.WeatherCapsule;

	const state = {
		status: "idle",
		coordinates: null,
		weather: null,
		fetchedAt: null,
		locationError: "",
		weatherError: "",
	};

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

	// 参数行小图标：几何逐字保留站主给的参考图，只留 d —— 不带 iconfont 的
	// p-id/version，也不把第二张里硬写的 fill="#040000" 带进来，颜色一律走 currentColor。
	const DETAIL_ICONS = {
		体感: [
			"M442.65472 514.78528c-7.7824-11.22304-16.1792-22.20032-24.90368-33.09568 8.97024-17.03936 19.00544-34.48832 30.22848-52.38784 77.49632-123.86304 228.06528-225.73056 247.48032-321.90464 5.28384-26.4192 11.14112-49.60256 22.9376-26.2144 67.01056 132.66944 201.1136 412.4672 198.90176 645.5296-2.49856 263.12704-182.59968 292.4544-264.92928 293.51936a25.14944 25.14944 0 0 1-24.69888-32.5632c32.93184-106.0864 103.75168-250.38848 75.44832-488.93952-2.00704-16.09728-25.88672-15.5648-27.4432 0.73728-18.26816 190.21824-57.344 340.7872-108.1344 468.74624 28.83584-125.58336-0.12288-275.33312-124.88704-453.4272zM358.27712 37.19168c-77.25056 0-136.35584 59.10528-136.35584 136.35584 0 77.25056 59.10528 136.31488 136.35584 136.31488 77.25056 0 136.31488-59.06432 136.31488-136.31488S435.52768 37.19168 358.27712 37.19168z m0 181.78048c-27.27936 0-45.4656-18.18624-45.4656-45.4656 0-27.2384 18.18624-45.38368 45.4656-45.38368 27.2384 0 45.4656 18.14528 45.4656 45.42464 0 27.2384-22.7328 45.4656-45.4656 45.4656zM302.03904 643.4816a182.272 182.272 0 0 0-181.73952 181.78048c0 99.9424 77.25056 181.78048 181.73952 181.78048a182.272 182.272 0 0 0 181.78048-181.78048 182.272 182.272 0 0 0-181.78048-181.78048z m0 272.62976a91.136 91.136 0 0 1-90.84928-90.84928c0-49.9712 40.87808-90.89024 90.84928-90.89024s90.89024 40.91904 90.89024 90.89024c0 49.9712-40.87808 90.84928-90.89024 90.84928z",
		],
		风速: [
			"M352 0h64v1024h-64z",
			"M415.5 256h161v64h-161zM415.502 0h321v64h-321zM415.5 128h321v64h-321z",
		],
		湿度: [
			"M512 874.666667c-34.133333 12.8-72.533333 21.333333-106.666667 21.333333C251.733333 896 128 772.266667 128 618.666667 128 392.533333 332.8 200.533333 405.333333 140.8c29.866667 25.6 81.066667 68.266667 128 132.266667 17.066667 17.066667 42.666667 21.333333 59.733334 4.266666 17.066667-17.066667 21.333333-42.666667 4.266666-59.733333-85.333333-102.4-166.4-162.133333-170.666666-166.4-17.066667-12.8-34.133333-12.8-51.2 0C366.933333 59.733333 42.666667 302.933333 42.666667 618.666667 42.666667 819.2 204.8 981.333333 405.333333 981.333333c46.933333 0 98.133333-8.533333 140.8-29.866666 21.333333-8.533333 29.866667-34.133333 21.333334-55.466667s-34.133333-29.866667-55.466667-21.333333z",
			"M750.933333 238.933333c-17.066667-12.8-34.133333-12.8-51.2 0-8.533333 8.533333-230.4 170.666667-230.4 388.266667 0 140.8 115.2 256 256 256s256-115.2 256-256c0-213.333333-221.866667-379.733333-230.4-388.266667zM725.333333 802.133333c-93.866667 0-170.666667-76.8-170.666666-170.666666 0-136.533333 119.466667-256 170.666666-298.666667 51.2 46.933333 170.666667 162.133333 170.666667 298.666667 0 93.866667-76.8 170.666667-170.666667 170.666666z",
		],
	};
	const SVG_NS = "http://www.w3.org/2000/svg";

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
		status.title = statusText;
		reading.hidden = !state.weather;
		card.querySelector("[data-weather-meta]").hidden = !state.weather;
		if (refresh) {
			refresh.hidden = !state.weather || state.status === "weather-error";
			refresh.disabled = state.status === "weather-loading";
		}
		retry.hidden = !canRetry;
		retry.textContent =
			state.status === "location-error" ? "重试定位" : "重试获取附近天气";
		if (!state.weather) {
			// 没有天气就没有壁纸：CSS 靠卡片根上这个属性存在与否决定画不画两层
			delete card.dataset.weatherKind;
			return;
		}

		const temperature = state.weather.temperatureC;
		const roundedTemperature = Number.isInteger(temperature)
			? String(temperature)
			: String(Number(temperature.toFixed(1)));
		// 卡片标题已经写着「附近天气」，行内不再重复「附近：」——那 39px 是城市名的命。
		const cityText = state.weather.cityName || "未知城市";
		const conditionText =
			state.weather.condition ||
			state.weather.description ||
			"天气情况未知";
		const city = card.querySelector("[data-weather-city]");
		const description = card.querySelector("[data-weather-description]");
		city.textContent = cityText;
		city.title = cityText;
		description.textContent = conditionText;
		description.title = conditionText;
		card.querySelector("[data-weather-temperature]").textContent =
			`${roundedTemperature}°C`;
		// 通栏参数行：每项一个「标签 + 数值」对，靠分隔线与字重差建立三级层级，
		// 不再是一串点号连接的纯文本。数值全部来自同一份 j1 响应。
		// 不放风向：wttr 的 winddir16Point 是英文十六方位，会重新引入翻译面。
		const detailItems = [];
		const { feelsLikeC, windSpeedKmph, humidityPercent } = state.weather;
		if (Number.isFinite(feelsLikeC))
			detailItems.push(["体感", `${feelsLikeC}°`]);
		if (Number.isFinite(windSpeedKmph))
			detailItems.push(["风速", `${windSpeedKmph} km/h`]);
		if (Number.isFinite(humidityPercent))
			detailItems.push(["湿度", `${humidityPercent}%`]);
		const details = card.querySelector("[data-weather-details]");
		details.replaceChildren(
			...detailItems.map(([label, value]) => {
				const item = document.createElement("span");
				item.className = "weather-widget__detail";
				const icon = document.createElementNS(SVG_NS, "svg");
				icon.setAttribute("viewBox", "0 0 1024 1024");
				icon.setAttribute("width", "10");
				icon.setAttribute("height", "10");
				icon.setAttribute("aria-hidden", "true");
				icon.setAttribute("focusable", "false");
				icon.setAttribute("class", "weather-widget__detail-icon");
				for (const d of DETAIL_ICONS[label] || []) {
					const path = document.createElementNS(SVG_NS, "path");
					path.setAttribute("d", d);
					icon.appendChild(path);
				}
				const labelEl = document.createElement("span");
				labelEl.className = "weather-widget__detail-label";
				labelEl.textContent = label;
				const valueEl = document.createElement("span");
				valueEl.className = "weather-widget__detail-value";
				valueEl.textContent = value;
				item.append(icon, labelEl, valueEl);
				return item;
			}),
		);
		details.hidden = detailItems.length === 0;
		details.title = detailItems
			.map(([label, value]) => `${label} ${value}`)
			.join("，");
		const stale =
			state.status === "weather-error" || state.weather.stale === true;
		card.querySelector("[data-weather-stale]").hidden = !stale;
		const icon = card.querySelector("[data-weather-icon]");
		// 文字→kind 的分类已单源到 service（weatherKind），无匹配回退 cloud
		// 与旧 iconKind 的 else 分支一致；本文件只负责把 kind 呈现成图标与壁纸。
		const iconKindName =
			weatherKind(
				state.weather.condition ?? state.weather.description,
				state.weather.conditionCode,
			) ?? "cloud";
		icon.dataset.weatherKind = iconKindName;
		icon.src = `/weather/icons/${iconKindName}.svg`;
		// 同一份 kind 镜像到卡片根：壁纸层挂在 body 上，需要按天气换图
		card.dataset.weatherKind = iconKindName;
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
					state.coordinates = roundCoordinates(position?.coords);
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

	// 天气是侧栏的子元件。窄屏下 #sidebar 只是 `display: none`、节点仍在 DOM 里，
	// 若照旧初始化，手机访客会为了一张永不显示的卡被弹定位授权、并发出一条
	// 永远看不见的天气请求。因此挂载点必须随侧栏的实际渲染与否取舍。
	const sidebarIsRendered = (card) => {
		const sidebar = card.closest("#sidebar");
		return !sidebar || getComputedStyle(sidebar).display !== "none";
	};

	function pageReady() {
		const cards = [
			...document.querySelectorAll("[data-weather-widget]"),
		].filter(sidebarIsRendered);
		if (cards.length === 0) return;
		cards.forEach(bindCard);
		renderAll();
		if (state.status === "idle") requestLocation();
	}

	window.WeatherSidebarWidget = Object.freeze({ state });
	// 侧栏在 swup 容器内，按主题协议重挂（同 Slideshow / WidgetNewLog）。
	document.addEventListener("colorful:page:loaded", pageReady);
	pageReady();
})();
