// 断言壁纸池「真的能上线」：产物里每张都在预算内，且页面序列化出来的池每条都能落到文件。
//
// 为什么需要这条判据：背景图是整页首屏资源（Layout.astro 的 .bg-image 带
// fetchpriority="high"），超标不会让构建失败——只会让访客多下载几 MB、
// 多占几十 MB 解码内存，并在并发解码时更容易被 Chromium 判成 EncodingError。
// 也就是说「图太大了」这件事在 astro build 里完全看不出来，必须单独守。
//
// 为什么查产物而不是 src/config.ts：
// 1. `public/` 下的字节会原样进 dist，孤儿图同样要付下载成本；
// 2. config.ts 在裸 node 里不可靠 import（JSON import attributes + Astro 虚拟模块），
//    而 `data-backgrounds` 正是它被序列化后的真实形态——从产物反读，不解析 TS；
// 3. 只查目录会漏掉「配置里写了不存在的文件」：目录全绿、线上 404。2026-11-15 补上。
//
// 用法：node scripts/verify-background-assets.mjs [distDir]
// 退出码：0 通过；1 失败（失败项逐条打到 stderr）
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import sharp from "sharp";

const DIST = resolve(process.argv[2] ?? "dist");
const DIR = join(DIST, "images/bg");
const INDEX = join(DIST, "index.html");
/** 单张字节上限：1.5 MiB */
const MAX_BYTES = 1.5 * 1024 * 1024;
/** 最长边上限（px）；与 scripts/build-backgrounds.mjs 的 MAX_EDGE 同值 */
const MAX_EDGE = 2560;
const EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);

function kb(bytes) {
	return `${(bytes / 1024).toFixed(1)}KB`;
}

if (!existsSync(INDEX)) {
	console.error(
		`缺 ${INDEX}：先跑 astro build——本门读产物里的 data-backgrounds，不解析 src/config.ts。`,
	);
	process.exit(1);
}

// 1) 页面序列化出来的真实池（HTML 属性里是 &quot; 转义过的 JSON）
const html = readFileSync(INDEX, "utf8");
const match = html.match(/data-backgrounds="([^"]*)"/u);
if (!match) {
	console.error(
		`${INDEX} 里没有 data-backgrounds：Layout.astro 的背景层没渲染出来。`,
	);
	process.exit(1);
}
let pool;
try {
	pool = JSON.parse(match[1].replaceAll("&quot;", '"'));
} catch {
	console.error(`data-backgrounds 不是合法 JSON：${match[1].slice(0, 120)}`);
	process.exit(1);
}
if (!Array.isArray(pool) || pool.length === 0) {
	console.error(
		"data-backgrounds 是空池：backgroundConfig.images 没配或全被过滤掉了。",
	);
	process.exit(1);
}

// 2) 产物里的实际文件
let names;
try {
	names = readdirSync(DIR, { withFileTypes: true })
		.filter(
			(entry) =>
				entry.isFile() &&
				EXTS.has(
					entry.name.toLowerCase().slice(entry.name.lastIndexOf(".")),
				),
		)
		.map((entry) => entry.name)
		.sort();
} catch {
	console.error(`壁纸目录不可读：${DIR}（先跑 astro build）`);
	process.exit(1);
}

const failures = [];

// 2a) 池里每条都要在产物里落到文件——配置写错文件名时这里翻红，而不是线上 404
for (const url of pool) {
	if (typeof url !== "string" || !url.startsWith("/images/bg/")) {
		failures.push(`${String(url)}：不在 /images/bg/ 下，无法核对`);
		continue;
	}
	const name = url.slice("/images/bg/".length);
	if (!existsSync(join(DIR, name))) {
		failures.push(`${url}：配置里有、产物里没有（线上会 404）`);
	}
}

// 2b) 目录里每张都要在预算内——含未入池的孤儿图，它们同样随站点发布
for (const name of names) {
	const file = join(DIR, name);
	const bytes = statSync(file).size;
	const meta = await sharp(file).metadata();
	const edge = Math.max(meta.width ?? 0, meta.height ?? 0);
	const problems = [];
	if (bytes > MAX_BYTES)
		problems.push(`体积 ${kb(bytes)} > ${kb(MAX_BYTES)}`);
	if (edge > MAX_EDGE) problems.push(`最长边 ${edge}px > ${MAX_EDGE}px`);
	if (problems.length > 0) {
		failures.push(
			`${name}：${problems.join("；")}（实测 ${kb(bytes)} / ${edge}px）`,
		);
	}
}

if (failures.length === 0) {
	console.log(
		`壁纸池 ${pool.length} 条全部落到产物、${names.length} 张全部在预算内（≤${kb(MAX_BYTES)}、≤${MAX_EDGE}px）。`,
	);
	process.exit(0);
}

for (const line of failures) console.error(line);
console.error(
	[
		"",
		`${failures.length} 项不通过。`,
		"",
		"重新导出（原图放一个目录，按文件名产出同名 .webp）：",
		"",
		"  pnpm build:bg -- --from <原图目录>",
		"",
		`口径：最长边 ≤${MAX_EDGE}px、单张 ≤${kb(MAX_BYTES)}、WebP q80。`,
	].join("\n"),
);
process.exit(1);
