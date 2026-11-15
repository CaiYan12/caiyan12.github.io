// 一次性离线构建：把站主提供的背景原图重采样成壁纸池资产（WebP）。
// 显式运行：node scripts/build-backgrounds.mjs --from "C:/Users/Einn Tzai/Downloads"
// 产物 public/images/bg/*.webp 随仓库提交；构建链不跑它，原图不入库。
//
// 为什么是 WebP q80 + 最长边 2560：壁纸池单张预算「≤1.5MB 且最长边 ≤2560px」的落地口径。
// 判定在 scripts/verify-background-assets.mjs，两边常量必须同值——改一处就要改另一处。
//
// 输入按文件名导出同名 .webp（pexels-65441.jpg → pexels-65441.webp），
// 所以换图时把原图放进一个目录、跑一次即可，不用手改 src/config.ts 的文件名。
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import sharp from "sharp";

/** 最长边上限（px），与 verify-background-assets.mjs 的 MAX_EDGE 同值 */
const MAX_EDGE = 2560;
/** WebP 质量；2560px 下实测单张远低于 1.5MB 预算 */
const QUALITY = 80;
/** 允许的原图扩展名（大小写不敏感） */
const SOURCE_EXTS = new Set([".jpg", ".jpeg", ".png"]);
const OUT_DIR = "public/images/bg";

const arg = (flag) => {
	const i = process.argv.indexOf(flag);
	return i === -1 ? undefined : process.argv[i + 1];
};

const from = arg("--from");
if (!from) {
	console.error("缺 --from <原图目录>（目录里放 .jpg/.jpeg/.png 原图）");
	process.exit(1);
}

let entries;
try {
	entries = await readdir(from, { withFileTypes: true });
} catch {
	console.error(`原图目录不可读：${from}`);
	process.exit(1);
}

const sources = entries
	.filter((e) => e.isFile() && SOURCE_EXTS.has(extname(e.name).toLowerCase()))
	.sort((a, b) => a.name.localeCompare(b.name));

if (sources.length === 0) {
	console.error(`目录里没有 .jpg/.jpeg/.png 原图：${from}`);
	process.exit(1);
}

await mkdir(OUT_DIR, { recursive: true });

let total = 0;
for (const entry of sources) {
	const input = await readFile(join(from, entry.name));
	const meta = await sharp(input).metadata();
	const buf = await sharp(input)
		.resize({
			width: MAX_EDGE,
			height: MAX_EDGE,
			fit: "inside",
			withoutEnlargement: true,
		})
		.webp({ quality: QUALITY })
		.toBuffer();
	const outMeta = await sharp(buf).metadata();
	const outName = `${basename(entry.name, extname(entry.name))}.webp`;
	await writeFile(join(OUT_DIR, outName), buf);
	total += buf.length;
	console.log(
		`${entry.name} ${meta.width}×${meta.height} → ${outName} ${outMeta.width}×${outMeta.height} ${(buf.length / 1024).toFixed(1)}KB`,
	);
}

console.log(
	`共 ${sources.length} 张，合计 ${(total / 1024).toFixed(1)}KB → ${OUT_DIR}/`,
);
