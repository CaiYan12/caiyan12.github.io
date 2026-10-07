(() => {
	if (window.WeatherCapsule) return;

	const TOTAL_TIMEOUT_MS = 8000;
	const WTTR_URL = "https://wttr.in";
	const weatherNames = {
		113: "晴",
		116: "少云",
		119: "多云",
		122: "阴",
		143: "轻雾",
		149: "烟霾",
		176: "局部下小雨",
		179: "局部下小雪",
		182: "局部有雨夹雪",
		185: "局部有冻毛毛雨",
		200: "可能打雷",
		227: "小雪",
		230: "暴雪",
		248: "雾",
		260: "冻雾",
		263: "局部毛毛雨",
		266: "毛毛雨",
		281: "冻毛毛雨",
		284: "大冻毛毛雨",
		293: "局部小雨",
		296: "小雨",
		299: "有时中雨",
		302: "中雨",
		305: "有时大雨",
		308: "大雨",
		311: "小冻雨",
		314: "中或大冻雨",
		317: "小雨夹雪",
		320: "中或大雨夹雪",
		323: "局部小雪",
		326: "小雪",
		329: "局部中雪",
		332: "中雪",
		335: "局部大雪",
		338: "大雪",
		350: "冰丸",
		353: "小阵雨",
		356: "中或大阵雨",
		359: "暴阵雨",
		362: "小阵雨夹雪",
		365: "中或大阵雨夹雪",
		368: "小阵雪",
		371: "中或大阵雪",
		386: "局部小雷阵雨",
		389: "中或大雷阵雨",
		392: "小雷阵雪",
		395: "中或大雷阵雪",
	};
	const weatherIcons = {
		113: "☀️",
		116: "🌤️",
		119: "☁️",
		122: "☁️",
		143: "🌫️",
		149: "🌫️",
		176: "🌦️",
		179: "🌨️",
		182: "🌨️",
		185: "🌧️",
		200: "⛈️",
		227: "🌨️",
		230: "❄️",
		248: "🌫️",
		260: "🌫️",
		263: "🌦️",
		266: "🌧️",
		281: "🌧️",
		284: "🌧️",
		293: "🌦️",
		296: "🌧️",
		299: "🌧️",
		302: "🌧️",
		305: "🌧️",
		308: "🌧️",
		311: "🌧️",
		314: "🌧️",
		317: "🌨️",
		320: "🌨️",
		323: "🌨️",
		326: "🌨️",
		329: "🌨️",
		332: "🌨️",
		335: "🌨️",
		338: "❄️",
		350: "🌨️",
		353: "🌦️",
		356: "🌧️",
		359: "🌧️",
		362: "🌨️",
		365: "🌨️",
		368: "🌨️",
		371: "🌨️",
		386: "⛈️",
		389: "⛈️",
		392: "⛈️",
		395: "⛈️",
	};

	function serviceError(reason, sources) {
		const error = new Error(reason);
		error.reason = reason;
		error.sources = [...sources];
		return error;
	}

	// 坐标验证 + 0.1° 粗化的共享契约：非法返回 null（null = 无法粗化）。
	// 终端侧在 fetch 流程里把它翻译成 serviceError（请求参数非法属异常路径，语义不变），
	// 侧栏天气胶囊直接消费数字对（显示与缓存键）——同一份验证规则，不再各写一份。
	function roundCoordinates(coords) {
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

	function roundedCoordinates(coords) {
		const rounded = roundCoordinates(coords);
		if (!rounded) throw serviceError("invalid_location", []);
		return {
			lat: rounded.latitude.toFixed(1),
			lon: rounded.longitude.toFixed(1),
		};
	}

	// 中国境内的城市名由本地目录解析：wttr 的 nearest_area 是村镇级站点
	// （实测深圳返回 "Dills Corner"、佛山返回 "Tainan"、南昌返回 "Nanchangfu"），
	// 直接显示既不是访客所在的城市，也永远是拉丁写法。
	const CHINA_BOX = {
		latMin: 3.6,
		latMax: 53.6,
		lonMin: 73.4,
		lonMax: 135.1,
	};
	const CITY_MATCH_MAX_KM = 120;
	// 键取 wttr 的 region（省级）原样返回值；未命中再试 country，用于港澳。
	const provinceNames = {
		Anhui: "安徽",
		Beijing: "北京",
		Chongqing: "重庆",
		Fujian: "福建",
		Gansu: "甘肃",
		Guangdong: "广东",
		Guangxi: "广西",
		Guizhou: "贵州",
		Hainan: "海南",
		Hebei: "河北",
		Heilongjiang: "黑龙江",
		Henan: "河南",
		"Hong Kong": "香港",
		Hubei: "湖北",
		Hunan: "湖南",
		Jiangsu: "江苏",
		Jiangxi: "江西",
		Jilin: "吉林",
		Liaoning: "辽宁",
		Macao: "澳门",
		Macau: "澳门",
		"Nei Mongol": "内蒙古",
		Ningxia: "宁夏",
		Qinghai: "青海",
		Shaanxi: "陕西",
		Shandong: "山东",
		Shanghai: "上海",
		Shanxi: "山西",
		Sichuan: "四川",
		Tianjin: "天津",
		Xizang: "西藏",
		Xinjiang: "新疆",
		Yunnan: "云南",
		Zhejiang: "浙江",
		"T'ai-wan": "台湾",
		Taiwan: "台湾",
	};

	function nearestCatalogCity(lat, lon) {
		const catalog = window.__weatherCityCatalog;
		if (!Array.isArray(catalog) || catalog.length === 0) return null;
		const cosLat = Math.cos((lat * Math.PI) / 180);
		let best = null;
		let bestSq = Infinity;
		for (const entry of catalog) {
			const dLat = entry[1] - lat;
			const dLon = (entry[2] - lon) * cosLat;
			const sq = dLat * dLat + dLon * dLon;
			if (sq < bestSq) {
				bestSq = sq;
				best = entry;
			}
		}
		if (!best) return null;
		return Math.sqrt(bestSq) * 111.32 <= CITY_MATCH_MAX_KM ? best[0] : null;
	}

	function resolveCityName(coordinates, areaName, region, country) {
		const lat = Number(coordinates?.lat);
		const lon = Number(coordinates?.lon);
		const inChina =
			Number.isFinite(lat) &&
			Number.isFinite(lon) &&
			lat >= CHINA_BOX.latMin &&
			lat <= CHINA_BOX.latMax &&
			lon >= CHINA_BOX.lonMin &&
			lon <= CHINA_BOX.lonMax;
		if (inChina) {
			const city = nearestCatalogCity(lat, lon);
			if (city) return city;
			// 省名优先；港澳在这份数据里 region 为空，只有 country 认得出来。
			// 绝不拿 areaName 当键——它是村镇名，撞上省名就是错标。
			for (const label of [region, country]) {
				const key = String(label || "").trim();
				// 键来自上游 JSON，必须只认自有属性：朴素查表会把 "__proto__"
				// 之类算作命中并返回原型对象。
				if (key && Object.hasOwn(provinceNames, key)) {
					return provinceNames[key];
				}
			}
		}
		return areaName || null;
	}

	// —— 侧栏天气胶囊的文案与格式规则（service 是共享规则的正典居所，侧栏自 T4 起改从 Capsule 消费；
	//    终端天气行有自己的状态栏文案，不经这些函数） ——

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
			// 「旧数据」标记与下方重试按钮已在同一张卡上说明其余信息，
			// 这句再长就会在 233px 侧栏里被省略号截掉。
			return "天气更新失败";
		}
		return error?.reason === "timeout"
			? "天气请求超时，请重试"
			: "天气暂不可用，请重试";
	}

	function formatTime(timestamp) {
		const date = new Date(timestamp);
		if (!Number.isFinite(date.getTime())) return "";
		// 页脚已是「数据：wttr.in 14:36」的组件状态栏语序，时间不再自带「获取于」前缀。
		return `${String(date.getHours()).padStart(2, "0")}:${String(
			date.getMinutes(),
		).padStart(2, "0")}`;
	}

	function sourceLabel(weather) {
		if (weather.source === "wttr.in") return "wttr.in";
		return String(weather.source ?? "天气来源");
	}

	// 「天气文字+码 → kind」的共享规则：终端天气行与侧栏天气胶囊是它的两个消费者
	// （终端经下面的 KIND_ICONS 映射出 emoji，侧栏经 data-weather-kind 驱动图标与壁纸层）。
	// 优先级逐段锁死「雷→雪→雾→雨→晴→阴→云」：wttr 的 2xx 段同时含雷暴(200)、雪(227/230)、
	// 雾(248/260) 与冻毛毛雨(263–284)，且「小雨夹雪(317)」要求雪排在雨前——任何按码段判定
	// 都会把其中三类归错。只按中文天气文字归类，code 仅保留 113 的「晴」语义。
	// 无任何匹配（且非 113）返回 null：终端回退 🌡️、侧栏回退 cloud，分叉由各自 adapter 吸收。
	function weatherKind(condition, code) {
		const text = String(condition ?? "");
		if (/雷/u.test(text)) return "storm";
		if (/雪|雹|冰/u.test(text)) return "snow";
		if (/雾|霾/u.test(text)) return "fog";
		if (/雨/u.test(text)) return "rain";
		if (/晴/u.test(text) || String(code ?? "") === "113") return "clear";
		if (/阴/u.test(text)) return "overcast";
		if (/云/u.test(text)) return "cloud";
		return null;
	}

	// 终端天气行的 emoji：码表优先（与 normalizeWttr 既有输出逐项一致），表外走共享 kind 映射。
	// 「阴」在 kind 里单列（侧栏壁纸要区分阴天与多云），终端侧两者同为 ☁️——由这张映射吸收。
	const KIND_ICONS = {
		storm: "⛈️",
		snow: "🌨️",
		fog: "🌫️",
		rain: "🌧️",
		clear: "☀️",
		overcast: "☁️",
		cloud: "☁️",
	};

	function conditionIcon(condition, code) {
		if (weatherIcons[Number(code)]) {
			return weatherIcons[Number(code)];
		}
		return KIND_ICONS[weatherKind(condition, code)] ?? "🌡️";
	}

	function firstValue(value) {
		return Array.isArray(value) ? value[0] : null;
	}

	function normalizeWttr(payload, fetchedAt, coordinates) {
		const data = payload?.data || payload;
		const condition = firstValue(data?.current_condition);
		const area = firstValue(data?.nearest_area);
		if (!condition) return null;

		const areaName = firstValue(area?.areaName)?.value?.trim() || null;
		const cityName = resolveCityName(
			coordinates,
			areaName,
			firstValue(area?.region)?.value?.trim(),
			firstValue(area?.country)?.value?.trim(),
		);
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

		const optionalNumber = (raw) => {
			const n = Number(raw);
			return Number.isFinite(n) ? n : null;
		};

		return {
			cityName,
			temperatureC,
			condition: description,
			description,
			conditionCode: String(condition.weatherCode ?? ""),
			icon: conditionIcon(description, code),
			// 体感、风力、湿度来自同一个 j1 响应，不额外请求任何上游。
			feelsLikeC: optionalNumber(condition.FeelsLikeC),
			windSpeedKmph: optionalNumber(condition.windspeedKmph),
			humidityPercent: optionalNumber(condition.humidity),
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
					coordinates,
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
		resolveCityName,
		weatherKind,
		roundCoordinates,
		locationErrorMessage,
		weatherErrorMessage,
		formatTime,
		sourceLabel,
	});
})();
