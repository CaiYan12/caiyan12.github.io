// 中文地名覆盖门：城市目录资产本身 + 服务解析结果 + 「API 返回范围」全覆盖。
// 跑法：pnpm test:weather（已串入）；单跑 node --test scripts/weather-city-catalog.test.mjs
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const serviceScript = await readFile(
	new URL("../public/weather/weather-service.js", import.meta.url),
	"utf8",
);
const catalogSource = await readFile(
	new URL("../public/weather/city-catalog.js", import.meta.url),
	"utf8",
);
const CATALOG = JSON.parse(
	catalogSource
		.slice(catalogSource.indexOf("[", catalogSource.indexOf("=")))
		.replace(/;\s*$/, ""),
);
const CJK_ONLY = /^[一-鿿]+$/u;

/** 用真实目录装配一个服务实例；fetchImpl 由用例给出。 */
async function serviceWith(fetchImpl, withCatalog = true) {
	const window = { setTimeout, clearTimeout };
	if (withCatalog) window.__weatherCityCatalog = CATALOG;
	vm.runInNewContext(serviceScript, {
		window,
		AbortController,
		Date,
		URL,
		setTimeout,
		clearTimeout,
	});
	return window.WeatherCapsule.createWeatherService({ fetchImpl });
}

function wttrResponse(area, region) {
	return {
		nearest_area: [
			{
				...(area ? { areaName: [{ value: area }] } : {}),
				...(region ? { region: [{ value: region }] } : {}),
			},
		],
		current_condition: [
			{
				temp_C: "24",
				weatherCode: "113",
				weatherDesc: [{ value: "Clear" }],
			},
		],
	};
}

async function cityNameAt(lat, lon, area = "Somewhereville", region) {
	const service = await serviceWith(async () => ({
		ok: true,
		json: async () => wttrResponse(area, region),
	}));
	const weather = await service.fetchCurrentWeather({
		latitude: lat,
		longitude: lon,
	});
	return weather.cityName;
}

test("城市目录：全部是纯中文名、落在中国范围内、无重名", () => {
	assert.ok(CATALOG.length >= 340, `地级市条目过少：${CATALOG.length}`);
	const seen = new Set();
	for (const row of CATALOG) {
		assert.equal(
			row.length,
			3,
			`行结构应为 [名, 纬度, 经度]：${JSON.stringify(row)}`,
		);
		assert.ok(CJK_ONLY.test(row[0]), `市名不是纯中文：${row[0]}`);
		assert.ok(row[0].length <= 6, `市名过长：${row[0]}`);
		assert.ok(
			row[1] >= 3.6 &&
				row[1] <= 53.6 &&
				row[2] >= 73.4 &&
				row[2] <= 135.1,
			`中心点落在中国范围外：${row[0]} ${row[1]},${row[2]}`,
		);
		assert.ok(!seen.has(row[0]), `市名重复：${row[0]}`);
		seen.add(row[0]);
	}
});

test("大市解析到正确中文市名", async () => {
	const EXPECT = [
		[39.9, 116.4, "北京"],
		[31.2, 121.5, "上海"],
		[22.5, 114.1, "深圳"],
		[23.1, 113.3, "广州"],
		[28.7, 115.9, "南昌"],
		[43.8, 87.6, "乌鲁木齐"],
		[38.9, 121.6, "大连"],
		[45.8, 126.5, "哈尔滨"],
		[30.6, 104.1, "成都"],
		[29.7, 91.1, "拉萨"],
		[43.9, 81.3, "伊犁"],
	];
	for (const [lat, lon, want] of EXPECT) {
		assert.equal(
			await cityNameAt(lat, lon),
			want,
			`${lat},${lon} 应解析为 ${want}`,
		);
	}
});

test("半径外的国内坐标回退到中文省名", async () => {
	// 敦煌（县级市，不在地级市目录里）→ 应落到甘肃省名而不是村镇拉丁名
	assert.equal(await cityNameAt(40.1, 94.7, "Dunhuang", "Gansu"), "甘肃");
});

test("region 缺失时用 country 认得港澳", async () => {
	const resolve = await resolver();
	// 坐标取在任何地级市 120km 之外，确保走的是映射层而不是市名层
	assert.equal(
		resolve({ lat: "22.2", lon: "97.0" }, "Kowloon", "", "Hong Kong"),
		"香港",
	);
	assert.equal(
		resolve({ lat: "22.2", lon: "97.0" }, "Taipa", "", "Macao"),
		"澳门",
	);
});

test("绝不拿 areaName 当省表键（村镇名撞省名就是错标）", async () => {
	const resolve = await resolver();
	// 北京郊区的坐标落在任何地级市 120km 外时，"Beijing" 只是村镇名，
	// 不该被当成省名翻译；这里断言它原样返回。
	assert.equal(
		resolve({ lat: "39.0", lon: "97.0" }, "Beijing", "", ""),
		"Beijing",
	);
});

test("境外坐标保持 wttr 原名，绝不套中文目录", async () => {
	assert.equal(await cityNameAt(51.5, -0.12, "London", ""), "London");
	assert.equal(await cityNameAt(35.7, 139.7, "Tokyo", ""), "Tokyo");
});

test("目录缺失时降级为 wttr 原名，不抛错", async () => {
	const service = await serviceWith(
		async () => ({
			ok: true,
			json: async () => wttrResponse("Nanchangfu"),
		}),
		false,
	);
	const weather = await service.fetchCurrentWeather({
		latitude: 28.68,
		longitude: 115.89,
	});
	assert.equal(weather.cityName, "Nanchangfu");
});

// 「以 API 返回范围为准」：这份 region 取值来自 2026-09-29 对 80 个中国坐标的实测
// （node output/wttr-name-sample.mjs）。wttr 加码或改写法时，人工比对后同步这里。
const API_RETURNED_REGIONS = [
	"Anhui",
	"Beijing",
	"Chongqing",
	"Fujian",
	"Gansu",
	"Guangdong",
	"Guangxi",
	"Guizhou",
	"Hainan",
	"Hebei",
	"Heilongjiang",
	"Henan",
	"Hubei",
	"Hunan",
	"Jiangsu",
	"Jiangxi",
	"Jilin",
	"Liaoning",
	"Nei Mongol",
	"Ningxia",
	"Qinghai",
	"Shaanxi",
	"Shandong",
	"Shanghai",
	"Shanxi",
	"Sichuan",
	"T'ai-wan",
	"Tianjin",
	"Xinjiang",
	"Xizang",
	"Yunnan",
	"Zhejiang",
];

/** 取服务里的纯函数：给定坐标 / wttr 原名 / wttr 省名，应显示什么。 */
async function resolver(withCatalog = true) {
	const window = { setTimeout, clearTimeout };
	if (withCatalog) window.__weatherCityCatalog = CATALOG;
	vm.runInNewContext(serviceScript, {
		window,
		AbortController,
		Date,
		URL,
		setTimeout,
		clearTimeout,
	});
	return window.WeatherCapsule.resolveCityName;
}

test("wttr 实测返回过的每一个 region 都能译成中文", async () => {
	const resolve = await resolver();
	for (const region of API_RETURNED_REGIONS) {
		// 坐标故意落在任何地级市中心 120km 之外，逼出省级回退这一层
		const name = resolve(
			{ lat: "39.0", lon: "97.0" },
			"UnmappedVillage",
			region,
		);
		assert.ok(
			CJK_ONLY.test(name),
			`region "${region}" 未落到中文（实得 ${name}）`,
		);
	}
});

test("省名逐条对得上（不是「只要中文就行」）", async () => {
	const resolve = await resolver();
	const EXPECT = {
		"Nei Mongol": "内蒙古",
		Xizang: "西藏",
		Shanxi: "山西",
		Shaanxi: "陕西",
		"T'ai-wan": "台湾",
		Guangxi: "广西",
	};
	for (const [region, want] of Object.entries(EXPECT)) {
		assert.equal(
			resolve({ lat: "39.0", lon: "97.0" }, "Village", region),
			want,
			`region "${region}" 应译为 ${want}`,
		);
	}
});

test("山西与陕西不串（Shanxi 与 Shaanxi 是两个省）", async () => {
	const resolve = await resolver();
	assert.equal(resolve({ lat: "39.0", lon: "97.0" }, "X", "Shanxi"), "山西");
	assert.equal(resolve({ lat: "39.0", lon: "97.0" }, "X", "Shaanxi"), "陕西");
});
