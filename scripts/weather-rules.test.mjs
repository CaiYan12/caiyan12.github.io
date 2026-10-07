// 天气共享规则单测：weatherKind / roundCoordinates / 侧栏文案函数（T3 起正典居所在
// weather-service.js，经 window.WeatherCapsule 暴露；侧栏自 T4 起消费）。
// 装载方式与 weather-service.test.mjs 同构：vm.runInNewContext 执行 IIFE 后取 Capsule。
// 45 个码的 emoji 逐码守卫由 weather-codes.test.mjs 承担——它经 normalizeWttr 咬住
// conditionIcon 的码表优先路径，与本文件的 kind 映射路径互补。
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const serviceScript = await readFile(
	new URL("../public/weather/weather-service.js", import.meta.url),
	"utf8",
);
const BEIJING = { latitude: 39.9042, longitude: 116.4074 };

const capsule = (() => {
	const window = { setTimeout, clearTimeout };
	vm.runInNewContext(serviceScript, {
		window,
		AbortController,
		Date,
		URL,
		setTimeout,
		clearTimeout,
	});
	return window.WeatherCapsule;
})();

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

function wttrFixture(langZh, code = "999") {
	return {
		nearest_area: [{ areaName: [{ value: "Beijing" }] }],
		current_condition: [
			{
				temp_C: "24",
				weatherCode: code,
				weatherDesc: [{ value: "Clear" }],
				...(langZh ? { lang_zh: [{ value: langZh }] } : {}),
			},
		],
	};
}

test("weatherKind：12 个冒烟同源用例——2xx 段逐码归类，雪先于雨、雾先于雨", () => {
	const kindCases = [
		{ condition: "可能打雷", code: "200", kind: "storm" },
		{ condition: "小雪", code: "227", kind: "snow" },
		{ condition: "雾", code: "248", kind: "fog" },
		{ condition: "局部毛毛雨", code: "263", kind: "rain" },
		{ condition: "烟霾", code: "149", kind: "fog" },
		{ condition: "冰丸", code: "350", kind: "snow" },
		{ condition: "局部下小雪", code: "179", kind: "snow" },
		// 「小雨夹雪」同时含雨与雪：雪必须排在雨前，否则被归成 rain
		{ condition: "小雨夹雪", code: "317", kind: "snow" },
		{ condition: "晴", code: "113", kind: "clear" },
		{ condition: "阴", code: "122", kind: "overcast" },
		{ condition: "多云", code: "119", kind: "cloud" },
		// 表外码 + 上游 lang_zh：雾优先于雨（AGENTS.md 记的优先级）
		{ condition: "雨雾", code: "999", kind: "fog" },
	];
	for (const { condition, code, kind } of kindCases) {
		assert.equal(
			capsule.weatherKind(condition, code),
			kind,
			`${condition}/${code}`,
		);
	}
});

test("weatherKind：无匹配（且非 113）返回 null——终端 🌡️、侧栏 cloud 的分叉由 adapter 吸收", () => {
	assert.equal(capsule.weatherKind("未知天象", "999"), null);
	assert.equal(capsule.weatherKind("", "999"), null);
	// code 只保留 113 的「晴」语义：文字无匹配也能归 clear
	assert.equal(capsule.weatherKind("未知天象", "113"), "clear");
	assert.equal(capsule.weatherKind("晴", "999"), "clear");
	// 输入防御：非字符串 condition 不抛错
	assert.equal(capsule.weatherKind(undefined, "999"), null);
});

test("conditionIcon 映射路径：码表外的文字经 kind 映射，emoji 与旧正则链逐项一致", async () => {
	const cases = [
		{ lang_zh: "雨雾", icon: "🌫️" },
		{ lang_zh: "多云", icon: "☁️" },
		{ lang_zh: "阴", icon: "☁️" },
		{ lang_zh: "小雨夹雪", icon: "🌨️" },
		{ lang_zh: "未知天象", icon: "🌡️" },
	];
	for (const c of cases) {
		const service = createService({
			fetchImpl: async () => ({
				ok: true,
				json: async () => wttrFixture(c.lang_zh),
			}),
		});
		const weather = await service.fetchCurrentWeather(BEIJING);
		assert.equal(weather.icon, c.icon, c.lang_zh);
	}
});

test("roundCoordinates：0.1° 粗化返回数字对；非法返回 null（统一契约，不再两种错误语义）", () => {
	// vm realm 的对象原型与本上下文不同构，深比较按字段断言（同 weather-service.test.mjs 只咬原语值的口径）
	const rounded = capsule.roundCoordinates(BEIJING);
	assert.equal(rounded.latitude, 39.9);
	assert.equal(rounded.longitude, 116.4);
	// 边界含端点：±90 / ±180 合法
	const bounds = capsule.roundCoordinates({ latitude: -90, longitude: 180 });
	assert.equal(bounds.latitude, -90);
	assert.equal(bounds.longitude, 180);
	assert.equal(
		capsule.roundCoordinates({ latitude: 90.1, longitude: 0 }),
		null,
	);
	assert.equal(
		capsule.roundCoordinates({ latitude: 0, longitude: -180.5 }),
		null,
	);
	assert.equal(
		capsule.roundCoordinates({ latitude: "39.9", longitude: 0 }),
		null,
	);
	assert.equal(
		capsule.roundCoordinates({ latitude: Number.NaN, longitude: 0 }),
		null,
	);
	assert.equal(capsule.roundCoordinates(undefined), null);
});

test("service 坐标契约不变：非法坐标在 fetch 流程里仍翻译为 invalid_location 错误", async () => {
	const service = createService({
		fetchImpl: async () => {
			throw new Error("不该被调到：坐标校验应先失败");
		},
	});
	await assert.rejects(
		service.fetchCurrentWeather({ latitude: 90.1, longitude: 0 }),
		(error) => error.reason === "invalid_location",
	);
});

test("locationErrorMessage / weatherErrorMessage：错误码 → 文案映射", () => {
	assert.equal(
		capsule.locationErrorMessage({ code: 1 }),
		"定位权限被拒绝，请在浏览器设置中允许位置访问后重试",
	);
	assert.equal(
		capsule.locationErrorMessage({ code: 2 }),
		"设备暂时无法获取位置，请检查定位服务后重试",
	);
	assert.equal(capsule.locationErrorMessage({ code: 3 }), "定位超时，请重试");
	assert.equal(capsule.locationErrorMessage({}), "暂时无法获取位置，请重试");
	// 旧数据标记在场时用短文案：233px 侧栏里长句会被省略号截掉
	assert.equal(capsule.weatherErrorMessage({}, true), "天气更新失败");
	assert.equal(
		capsule.weatherErrorMessage({ reason: "timeout" }, false),
		"天气请求超时，请重试",
	);
	assert.equal(
		capsule.weatherErrorMessage({ reason: "upstream" }, false),
		"天气暂不可用，请重试",
	);
});

test("formatTime：本地时 HH:MM 补零；Invalid Date → 空串", () => {
	assert.equal(
		capsule.formatTime(new Date(2026, 0, 1, 9, 5).getTime()),
		"09:05",
	);
	assert.equal(
		capsule.formatTime(new Date(2026, 10, 7, 23, 59).getTime()),
		"23:59",
	);
	assert.equal(capsule.formatTime(Number.NaN), "");
});

test("sourceLabel：wttr.in 原样、其余 String()、缺省「天气来源」", () => {
	assert.equal(capsule.sourceLabel({ source: "wttr.in" }), "wttr.in");
	assert.equal(capsule.sourceLabel({ source: "open-meteo" }), "open-meteo");
	assert.equal(capsule.sourceLabel({}), "天气来源");
});
