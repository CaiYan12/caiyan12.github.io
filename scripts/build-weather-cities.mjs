// 一次性离线构建：从 DataV 行政区划图集抓取全国地级市中心点，生成天气城市目录。
// 显式运行：node scripts/build-weather-cities.mjs
// 产物 public/weather/city-catalog.js 随仓库提交（构建链不跑它）。
import { writeFileSync } from "node:fs";

const BASE = "https://geo.datav.aliyun.com/areas_v3/bound";
// 34 个省级行政区代码（与 100000_full.json 的 adcode 一致）
const PROVINCES = [
	"110000",
	120000,
	130000,
	140000,
	150000,
	210000,
	220000,
	230000,
	310000,
	320000,
	330000,
	340000,
	350000,
	360000,
	370000,
	410000,
	420000,
	430000,
	440000,
	450000,
	460000,
	500000,
	510000,
	520000,
	530000,
	540000,
	610000,
	620000,
	630000,
	640000,
	650000,
	710000,
	810000,
	820000,
].map(String);

// 全名 → 卡片上该显示的名字：先砍掉行政后缀，再从第一个民族标记处截断。
// 例：伊犁哈萨克自治州→伊犁、德宏傣族景颇族自治州→德宏、阿克苏地区→阿克苏、锡林郭勒盟→锡林郭勒。
const ETHNIC =
	/哈萨克|柯尔克孜|蒙古族|藏族羌族|土家族|朝鲜族|傈僳族|布依族|苗族|彝族|回族|白族|傣族|瑶族|黎族|侗族|景颇族|哈尼族|羌族|蒙古族|藏族|各族/u;
function shortName(raw) {
	let s = String(raw)
		.replace(/(自治州|自治县|地区|盟|林区|市)$/u, "")
		.trim();
	const i = s.search(ETHNIC);
	if (i > 0) s = s.slice(0, i);
	return s.trim();
}

const rows = [];
const seen = new Set();

async function grab(code) {
	const url = `${BASE}/${code}_full.json`;
	const res = await fetch(url, { cache: "no-store" });
	if (!res.ok) throw new Error(`${code} HTTP ${res.status}`);
	const j = await res.json();
	const out = [];
	for (const f of j.features || []) {
		const p = f.properties || {};
		const c = p.center || p.centroid;
		if (!Array.isArray(c) || c.length < 2) continue;
		const name = String(p.name || "");
		if (!/^[一-鿿]+$/u.test(name)) continue;
		out.push({
			name,
			level: p.level,
			lat: +c[1],
			lon: +c[0],
			adcode: p.adcode,
		});
	}
	return out;
}

// 直辖市与省级：100000_full.json 里就有中心点，直接用作市名
const country = await (await fetch(`${BASE}/100000_full.json`)).json();
const MUNI = new Set(["北京", "上海", "天津", "重庆"]);
for (const f of country.features || []) {
	const p = f.properties || {};
	const c = p.center || p.centroid;
	const nm = String(p.name || "").replace(/市$/u, "");
	if (!MUNI.has(nm) || !Array.isArray(c)) continue;
	if (!seen.has(nm)) {
		seen.add(nm);
		rows.push([nm, +(+c[1]).toFixed(1), +(+c[0]).toFixed(1)]);
	}
}
console.log(`直辖市：${rows.length}`);

let failed = [];
for (const code of PROVINCES) {
	if (
		code === "110000" ||
		code === "120000" ||
		code === "310000" ||
		code === "500000"
	)
		continue; // 直辖市已取省级中心
	try {
		const list = await grab(code);
		for (const e of list) {
			if (e.level !== "city") continue;
			const full = e.name.replace(/市$/u, "");
			if (!full) continue;
			// 归一后撞名就退回全名（例：海南藏族自治州 与 海南省）
			const nm = seen.has(shortName(full)) ? full : shortName(full);
			if (seen.has(nm)) continue;
			seen.add(nm);
			rows.push([nm, +e.lat.toFixed(1), +e.lon.toFixed(1)]);
		}
		process.stdout.write(`${code}✓ `);
	} catch (error) {
		if (code === "710000") {
			process.stdout.write("710000(无地级子划分)· ");
			continue;
		}
		failed.push(`${code}: ${error.message}`);
		process.stdout.write(`${code}✗ `);
	}
	await new Promise((r) => setTimeout(r, 120));
}
console.log(`\n失败 ${failed.length}：${failed.join(" | ")}`);

rows.sort((a, b) => a[0].localeCompare(b[0], "zh-Hans-CN"));
const body = `// 生成文件，勿手改：node scripts/build-weather-cities.mjs
// 来源：DataV 行政区划图集 areas_v3（中国地级市与直辖市中心点，官方中文名）
// 用途：把访客坐标解析成中文市名；不在任何市附近时由调用方回退。
window.__weatherCityCatalog = ${JSON.stringify(rows)};
`;
writeFileSync("public/weather/city-catalog.js", body);
console.log(
	`\n写入 public/weather/city-catalog.js · ${rows.length} 城 · ${(body.length / 1024).toFixed(1)}KB（未压缩）`,
);
if (failed.length) process.exitCode = 1;
