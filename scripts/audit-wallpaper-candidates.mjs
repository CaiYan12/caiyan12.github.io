// 壁纸候选审计：给一批候选图打分，按 PEXELS-SOURCES.md 的口径判定是否可用。
//
// 为什么入库：2026-11-15 第一次选图只看了亮度与色相，被站长以「内部信息太复杂、
// 太多高楼」否决——缺的维度是「留白度」。那次筛选写了六个一次性脚本、全部留在
// gitignore 的 output/ 里，下一次换图只能重写。判据本身值钱，脚本不该跟着产物蒸发。
//
// 用法：node scripts/audit-wallpaper-candidates.mjs <候选目录> [--json]
// 退出码：0（审计工具，不阻断构建）；候选目录不可读时 1。
import { readdir, stat } from "node:fs/promises";
import { extname, join } from "node:path";
import sharp from "sharp";

/** 平滑块占比下限（留白度）：8×8 块内标准差 < SMOOTH_SD 算「平滑」 */
const MIN_SMOOTH = 45;
/** 蓝青相（180–240°）占比下限 */
const MIN_BLUE = 55;
/** 暖色（0–60°）占比上限 */
const MAX_WARM = 30;
/**
 * 平均亮度下限（0–255）：只防全黑，不是质量目标。
 *
 * 2026-11-15 第二批有三张暗调图（亮度 16 / 26 / 34）是站长明确要的留白取舍，
 * 所以门槛从 35 下调到 15——35 以上观感更好，但不该把「大天空 + 大水面」判死。
 */
const MIN_LUM = 15;
const SMOOTH_SD = 6;
const SAMPLE = 160;
const EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);

function pct(buckets, from, to) {
	const total = buckets.reduce((a, b) => a + b, 0) || 1;
	const slice = buckets
		.slice(from / 30, to / 30 + 1)
		.reduce((a, b) => a + b, 0);
	return Math.round((slice / total) * 100);
}

async function auditOne(file) {
	const { data, info } = await sharp(file)
		.resize(SAMPLE, SAMPLE, { fit: "fill" })
		.raw()
		.toBuffer({ resolveWithObject: true });
	const ch = info.channels;
	let lum = 0;
	let n = 0;
	const buckets = new Array(12).fill(0);
	for (let i = 0; i < data.length; i += ch) {
		const R = data[i];
		const G = data[i + 1];
		const B = data[i + 2];
		lum += 0.2126 * R + 0.7152 * G + 0.0722 * B;
		const max = Math.max(R, G, B);
		const min = Math.min(R, G, B);
		const d = max - min;
		const sat = max === 0 ? 0 : d / max;
		if (sat > 0.15 && d > 0) {
			let h;
			if (max === R) h = ((G - B) / d) % 6;
			else if (max === G) h = (B - R) / d + 2;
			else h = (R - G) / d + 4;
			h = (h * 60 + 360) % 360;
			buckets[Math.floor(h / 30)]++;
		}
		n++;
	}

	const grey = await sharp(file)
		.greyscale()
		.resize(SAMPLE, SAMPLE, { fit: "fill" })
		.raw()
		.toBuffer({ resolveWithObject: true });
	const g = grey.data;
	const gw = grey.info.width;
	const gh = grey.info.height;
	const B = 8;
	let smooth = 0;
	let blocks = 0;
	for (let by = 0; by < gh; by += B) {
		for (let bx = 0; bx < gw; bx += B) {
			let s = 0;
			let s2 = 0;
			let c = 0;
			for (let y = by; y < Math.min(by + B, gh); y++) {
				for (let x = bx; x < Math.min(bx + B, gw); x++) {
					const v = g[y * gw + x];
					s += v;
					s2 += v * v;
					c++;
				}
			}
			const mean = s / c;
			const sd = Math.sqrt(Math.max(0, s2 / c - mean * mean));
			if (sd < SMOOTH_SD) smooth++;
			blocks++;
		}
	}

	const meta = await sharp(file).metadata();
	const L = Math.round(lum / n);
	const blue = pct(buckets, 180, 240);
	const warm = pct(buckets, 0, 60);
	const smoothPct = Math.round((smooth / blocks) * 100);
	const pass =
		smoothPct >= MIN_SMOOTH &&
		blue >= MIN_BLUE &&
		warm <= MAX_WARM &&
		L >= MIN_LUM;
	return {
		file,
		width: meta.width,
		height: meta.height,
		bytes: (await stat(file)).size,
		L,
		blue,
		warm,
		smooth: smoothPct,
		pass,
	};
}

const dir = process.argv[2];
const asJson = process.argv.includes("--json");
if (!dir) {
	console.error(
		"用法：node scripts/audit-wallpaper-candidates.mjs <候选目录> [--json]",
	);
	process.exit(1);
}

let names;
try {
	names = (await readdir(dir))
		.filter((name) => EXTS.has(extname(name).toLowerCase()))
		.sort();
} catch {
	console.error(`候选目录不可读：${dir}`);
	process.exit(1);
}
if (names.length === 0) {
	console.error(`目录里没有候选图：${dir}`);
	process.exit(1);
}

const rows = [];
for (const name of names) rows.push(await auditOne(join(dir, name)));
rows.sort((a, b) => b.smooth - a.smooth || a.L - b.L);

if (asJson) {
	console.log(JSON.stringify(rows, null, 2));
} else {
	console.log(
		`口径：留白 ≥${MIN_SMOOTH}%、蓝青 ≥${MIN_BLUE}%、暖色 ≤${MAX_WARM}%、亮度 ≥${MIN_LUM}`,
	);
	for (const r of rows) {
		console.log(
			`${r.pass ? "PASS" : "fail"} 留白=${String(r.smooth).padStart(3)}% 蓝青=${String(r.blue).padStart(3)}% 暖色=${String(r.warm).padStart(3)}% 亮度=${String(r.L).padStart(3)} ${r.width}×${r.height} ${(r.bytes / 1024).toFixed(0)}KB  ${r.file}`,
		);
	}
	console.log(`\n达标 ${rows.filter((r) => r.pass).length}/${rows.length}`);
}
