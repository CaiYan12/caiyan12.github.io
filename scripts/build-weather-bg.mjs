// 一次性离线构建：把站主提供的 7 张 Pexels 原图重采样为侧栏天气卡的壁纸资产。
// 显式运行：node scripts/build-weather-bg.mjs --from "C:/Users/Einn Tzai/Downloads"
// 产物 public/weather/bg/*.webp 随仓库提交（构建链不跑它，原图不入库）。
//
// 为什么**保竖向原高、不预裁到盒子高**：壁纸的取景锚点在 CSS 的
// background-position 上，裁成 502×164 就把「往上一点/往下一点」的余量烘死了。
import { mkdir, readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

const KINDS = ["clear", "cloud", "overcast", "rain", "snow", "storm", "fog"];
/** 卡片主体区 ≈251 CSS px 宽，×2 DPR */
const WIDTH = 502;
const QUALITY = 72;

const arg = (flag) => {
	const i = process.argv.indexOf(flag);
	return i === -1 ? undefined : process.argv[i + 1];
};
const from = arg("--from");
if (!from) {
	console.error("缺 --from <原图目录>（目录里要有 clear.jpg … fog.jpg）");
	process.exit(1);
}

const outDir = "public/weather/bg";
await mkdir(outDir, { recursive: true });

let total = 0;
for (const kind of KINDS) {
	const source = `${from}/${kind}.jpg`;
	let input;
	try {
		input = await readFile(source);
	} catch {
		console.error(`缺原图：${source}`);
		process.exit(1);
	}
	const { width, height } = await sharp(input).metadata();
	const target = Math.round((height * WIDTH) / width);
	const buf = await sharp(input)
		.resize({ width: WIDTH, height: target })
		.webp({ quality: QUALITY })
		.toBuffer();
	await writeFile(`${outDir}/${kind}.webp`, buf);
	total += buf.length;
	console.log(
		`${kind}: ${width}x${height} -> ${WIDTH}x${target}  ${buf.length} B`,
	);
}
console.log(`合计 ${total} B -> ${outDir}/`);
