(() => {
	if (!window.WeatherCapsule) return;

	const weatherService = window.WeatherCapsule.weatherService;
	window.domainWeatherService = Object.freeze({
		fetchCurrentWeather(coords, fetchImpl) {
			if (!fetchImpl) return weatherService.fetchCurrentWeather(coords);
			const testService = window.WeatherCapsule.createWeatherService({
				fetchImpl,
			});
			return testService.fetchCurrentWeather(coords);
		},
	});

	const weatherInfo = document.getElementById("weather-info");
	if (!weatherInfo) return;

	weatherInfo.style.whiteSpace = "normal";
	weatherInfo.style.overflow = "visible";
	weatherInfo.style.textOverflow = "clip";

	function appendRetryButton() {
		weatherInfo.append(document.createTextNode(" "));
		const button = document.createElement("button");
		button.type = "button";
		button.className = "weather-retry";
		button.setAttribute("aria-label", "重试获取附近天气");
		button.textContent = "[重试]";
		button.style.font = "inherit";
		button.style.lineHeight = "inherit";
		button.style.color = "inherit";
		button.style.background = "none";
		button.style.border = "0";
		button.style.padding = "0";
		button.style.textDecoration = "underline";
		button.style.cursor = "pointer";
		button.addEventListener("click", loadWeather);
		weatherInfo.append(button);
	}

	function setStatus(message, { retry = false } = {}) {
		weatherInfo.replaceChildren(document.createTextNode(message));
		if (retry) appendRetryButton();
	}

	function appendLink(label, href) {
		const link = document.createElement("a");
		link.href = href;
		link.target = "_blank";
		link.rel = "noopener noreferrer";
		link.textContent = label;
		link.style.color = "inherit";
		link.style.textDecoration = "underline";
		link.style.overflowWrap = "anywhere";
		weatherInfo.append(link);
	}

	function showWeather(weather) {
		weatherInfo.replaceChildren(
			document.createTextNode(
				`附近：${weather.cityName || "未知城市"} ${weather.temperatureC}°C `,
			),
		);
		const icon = document.createElement("span");
		icon.setAttribute("aria-hidden", "true");
		icon.textContent = weather.icon;
		weatherInfo.append(
			icon,
			document.createTextNode(` ${weather.description}`),
		);

		if (weather.stale) {
			weatherInfo.append(document.createTextNode("（旧数据）"));
		}
		weatherInfo.append(document.createTextNode("（来源："));
		appendLink(weather.source, weather.sourceUrl);
		weatherInfo.append(document.createTextNode("）"));
		if (weather.stale) appendRetryButton();
	}

	function weatherErrorMessage(error) {
		if (error?.reason === "timeout") {
			return "天气请求超过 8 秒上限，请稍后重试。";
		}
		return "天气服务暂不可用，请重试。";
	}

	function showGeolocationError(error) {
		const messages = {
			1: "定位权限已拒绝，请在浏览器设置中允许定位后重试。",
			2: "当前位置暂不可用，请重试。",
			3: "定位超时，请重试。",
		};
		setStatus(messages[error.code] || "定位失败，请重试。", {
			retry: true,
		});
	}

	function loadWeather() {
		if (!navigator.geolocation) {
			setStatus("当前浏览器不支持定位，无法查询附近天气。");
			return;
		}

		setStatus("正在获取位置，用于显示附近天气…");
		navigator.geolocation.getCurrentPosition(
			({ coords }) => {
				setStatus("正在读取天气…");
				weatherService
					.fetchCurrentWeather(coords)
					.then(showWeather)
					.catch((error) => {
						const stale =
							weatherService.getLastSuccessfulWeather(coords);
						if (stale) {
							showWeather(stale);
							return;
						}
						setStatus(weatherErrorMessage(error), { retry: true });
					});
			},
			showGeolocationError,
			{
				enableHighAccuracy: false,
				timeout: 8000,
				maximumAge: 0,
			},
		);
	}

	loadWeather();
})();
