import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

// 上游 wttr.in（Go 版）的官方简中天气码表。
// 取法：https://raw.githubusercontent.com/chubin/wttr.in/master/share/translations/zh-cn/conditions.txt
// 行格式「<code>: <中文名> : <English>」。核对日期：2026-09-29。
// 149「Smoky haze」不在这张表里（上游自己也没译名），但线上实测 wttr.in 会返回它，
// 故本站自译为「烟霾」，单列在 EXTRA_CODES。
const UPSTREAM_CODES = {
	113: "晴",
	116: "少云",
	119: "多云",
	122: "阴",
	143: "轻雾",
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
const EXTRA_CODES = { 149: "烟霾" };
const ENGLISH_SENTINEL = "Untranslated English Text";

const serviceScript = await readFile(
	new URL("../public/weather/weather-service.js", import.meta.url),
	"utf8",
);

async function weatherFor(code) {
	const window = { setTimeout, clearTimeout };
	vm.runInNewContext(serviceScript, {
		window,
		AbortController,
		Date,
		URL,
		setTimeout,
		clearTimeout,
	});
	const service = window.WeatherCapsule.createWeatherService({
		fetchImpl: async () => ({
			ok: true,
			json: async () => ({
				nearest_area: [{ areaName: [{ value: "Beijing" }] }],
				current_condition: [
					{
						temp_C: "20",
						weatherCode: String(code),
						weatherDesc: [{ value: ENGLISH_SENTINEL }],
					},
				],
			}),
		}),
	});
	return service.fetchCurrentWeather({ latitude: 39.9, longitude: 116.4 });
}

function tableKeys(name) {
	const block = serviceScript.match(
		new RegExp(`const ${name} = \\{([\\s\\S]*?)\\n\\t\\};`),
	);
	assert.ok(block, `未找到 ${name} 表`);
	return new Set(
		[...block[1].matchAll(/(\d{3}):/g)].map((m) => Number(m[1])),
	);
}

test("上游官方简中表的每个码都取得到对应中文，不回退英文", async () => {
	const problems = [];
	for (const [code, expected] of Object.entries(UPSTREAM_CODES)) {
		const weather = await weatherFor(code);
		if (weather.condition !== expected) {
			problems.push(
				`${code}: 得到「${weather.condition}」应为「${expected}」`,
			);
		}
		if (weather.description === ENGLISH_SENTINEL) {
			problems.push(`${code}: 描述回退成英文原文`);
		}
	}
	assert.deepEqual(problems, []);
});

test("全部已覆盖码都有专属 emoji，不掉默认温度计", async () => {
	const problems = [];
	for (const code of [
		...Object.keys(UPSTREAM_CODES),
		...Object.keys(EXTRA_CODES),
	]) {
		const weather = await weatherFor(code);
		if (!weather.icon || weather.icon === "🌡️") {
			problems.push(`${code}: 图标为默认温度计或缺失`);
		}
	}
	assert.deepEqual(problems, []);
});

test("两张码表键集合一致，超出上游表的自造码只有 149", () => {
	const names = tableKeys("weatherNames");
	const icons = tableKeys("weatherIcons");
	assert.deepEqual(
		[...names].sort((a, b) => a - b),
		[...icons].sort((a, b) => a - b),
		"weatherNames 与 weatherIcons 的码集合不一致",
	);
	assert.deepEqual(
		[...names].filter((c) => !UPSTREAM_CODES[c]).sort((a, b) => a - b),
		[149],
	);
	assert.equal(
		names.size,
		Object.keys(UPSTREAM_CODES).length + Object.keys(EXTRA_CODES).length,
	);
});
