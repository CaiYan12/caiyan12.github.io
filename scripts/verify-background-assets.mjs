// 断言壁纸池里每一张都在体积预算内（README TODO「限制壁纸池单张体积上限」）。
//
// 为什么需要这条判据：背景图是整页首屏资源（Layout.astro 的 .bg-image 带
// fetchpriority="high"），超标不会让构建失败——只会让访客多下载几 MB、
// 多占几十 MB 解码内存，并在并发解码时更容易被 Chromium 判成 EncodingError。
// 也就是说「图压坏了 / 图太大了」这件事在 astro build 里完全看不出来，必须单独守。
//
// 查的是目录而不是 src/config.ts 的 backgroundConfig.images：public/ 下的字节会
// 原样进 dist，孤儿图同样要付下载与仓库成本；而 config.ts 在裸 node 里不可靠
// import（JSON import attributes + Astro 虚拟模块）。
//
// 用法：node scripts/verify-background-assets.mjs
// 退出码：0 通过；1 失败（失败项逐条打到 stderr）
import { readdirSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import sharp from "sharp";

const DIR = "public/images/bg";
/** 单张字节上限：1.5 MiB */
const MAX_BYTES = 1.5 * 1024 * 1024;
/** 最长边上限（px）；与 scripts/build-backgrounds.mjs 的 MAX_EDGE 同值 */
const MAX_EDGE = 2560;
const EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);

function kb(bytes) {
	return `${(bytes / 1024).toFixed(1)}KB`;
}

let names;
try {
	names = readdirSync(DIR, { withFileTypes: true })
		.filter(
			(entry) =>
				entry.isFile() && EXTS.has(extname(entry.name).toLowerCase()),
		)
		.map((entry) => entry.name)
		.sort();
} catch {
	console.error(`壁纸目录不可读：${DIR}`);
	process.exit(1);
}

if (names.length === 0) {
	console.error(`壁纸目录里没有任何位图：${DIR}`);
	process.exit(1);
}

const failures = [];
for (const name of names) {
	const file = join(DIR, name);
	const bytes = statSync(file).size;
	const meta = await sharp(file).metadata();
	const edge = Math.max(meta.width ?? 0, meta.height ?? 0);
	const problems = [];
	if (bytes > MAX_BYTES)
		problems.push(`体积 ${kb(bytes)} > ${kb(MAX_BYTES)}`);
	if (edge > MAX_EDGE) problems.push(`最长边 ${edge}px > ${MAX_EDGE}px`);
	if (problems.length > 0) failures.push({ name, bytes, edge, problems });
}

if (failures.length === 0) {
	console.log(
		`壁纸池 ${names.length} 张全部在预算内（≤${kb(MAX_BYTES)}、≤${MAX_EDGE}px）。`,
	);
	process.exit(0);
}

for (const { name, bytes, edge, problems } of failures) {
	console.error(
		`${name}：${problems.join("；")}（实测 ${kb(bytes)} / ${edge}px）`,
	);
}
console.error(
	[
		"",
		`${failures.length} 张壁纸超出预算。`,
		"",
		"重新导出（原图放一个目录，按文件名产出同名 .webp）：",
		"",
		"  pnpm build:bg -- --from <原图目录>",
		"",
		`口径：最长边 ≤${MAX_EDGE}px、单张 ≤${kb(MAX_BYTES)}、WebP q80。`,
	].join("\n"),
);
process.exit(1);
