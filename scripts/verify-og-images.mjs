// 断言构建产物里的 OG 分享卡「还在、且没坏」。
//
// 为什么需要这条判据（2026-11-05 升级 satori 时补上）：OG 分享卡全部由 satori
// 在构建期渲染成 PNG。它坏掉的表现不是抛错，而是**画布错位、整行内容掉出画布、
// 甚至整张全白**——这三种坏法下 `astro build` 照样成功，`astro check` 不看产物，
// 现有 CI 全绿。也就是说合并之后没有任何东西守着这批图。
//
// 本脚本只读产物：不解码网络资源、不起浏览器、不新增依赖（sharp 已是本站依赖）。
// 三条判据：数量与已发布文章数一致、每张 1200×630、每张不是空白。
//
// 数量为什么是派生的，不是写死的：`/og/[slug].png` 的路由对每篇非草稿文章产一张，
// 所以期望数量 = `src/content/posts/*/index.md` 里 frontmatter 不含 `draft: true`
// 的篇数。写成常量 33 会在下一篇非草稿文章提交那一刻让 `pnpm build` 直接变红——
// 那不是产物坏了，是判据本身过期了。派生之后，判据仍然抓得住「少了一张」与
// 「多出一张」，但不会因为正常发文而误报。
//
// 空白阈值怎么来的（实测，不是拍脑袋）：上线时那 33 张真实分享卡的「非白像素占比」
// 在 4.199%–14.819% 之间（白底 + 深色文字，最低那张是标题最短的）。阈值取 1%，
// 是实测最小值的四分之一——既容得下将来更短的标题，又能抓住真正的白板（0%）。
//
// 用法：node scripts/verify-og-images.mjs [distDir]
// 退出码：0 通过；1 失败（失败项逐条打到 stderr）
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const WIDTH = 1200;
const HEIGHT = 630;
const MIN_INK_RATIO = 0.01; // 1%，见文件头的标定依据

// 内容目录按脚本自身位置解析，不依赖调用方的 cwd
const DEFAULT_CONTENT_DIR = fileURLToPath(
	new URL("../src/content/posts", import.meta.url),
);

// 与 `src/pages/og/[...slug].png.ts` 的 getStaticPaths 保持同一语义：
// 每篇非草稿文章一张图。草稿判定只看 frontmatter 段，避免正文里出现同名字样时误判。
export function countPublishedPosts(contentDir = DEFAULT_CONTENT_DIR) {
	if (!existsSync(contentDir) || !statSync(contentDir).isDirectory()) {
		throw new Error(`内容目录不存在：${contentDir}`);
	}
	let published = 0;
	for (const entry of readdirSync(contentDir, { withFileTypes: true })) {
		if (!entry.isDirectory()) continue;
		const file = join(contentDir, entry.name, "index.md");
		if (!existsSync(file)) continue;
		const raw = readFileSync(file, "utf8");
		const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw);
		const isDraft = frontmatter
			? /^draft:\s*true\s*$/m.test(frontmatter[1])
			: false;
		if (!isDraft) published++;
	}
	return published;
}

// 判「非白」的亮度阈值：白底卡片上最浅的文字也明显低于 250
const LUMINANCE_CUTOFF = 250;

async function inspectPng(file) {
	const { data, info } = await sharp(file)
		.raw()
		.toBuffer({ resolveWithObject: true });
	const pixels = info.width * info.height;
	let ink = 0;
	for (let i = 0; i < data.length; i += info.channels) {
		const luminance =
			0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
		if (luminance < LUMINANCE_CUTOFF) ink++;
	}
	return {
		width: info.width,
		height: info.height,
		inkRatio: pixels > 0 ? ink / pixels : 0,
	};
}

export async function verifyOgImages({ dir, expectedCount } = {}) {
	const errors = [];
	const ogDirectory = resolve(dir ?? "dist/og");

	if (!Number.isInteger(expectedCount) || expectedCount < 0) {
		return {
			ok: false,
			errors: [
				`期望数量无效：${expectedCount}；应由 countPublishedPosts() 派生，或在调用时显式传入整数`,
			],
		};
	}

	if (!existsSync(ogDirectory) || !statSync(ogDirectory).isDirectory()) {
		return { ok: false, errors: [`OG 目录不存在：${ogDirectory}`] };
	}

	const files = readdirSync(ogDirectory)
		.filter((name) => name.toLowerCase().endsWith(".png"))
		.sort();

	if (files.length !== expectedCount) {
		// 少于期望时不列全部文件名——真实产物有几十张，全列出来只会把错误信息淹掉；
		// 多出时列出来，因为那几个名字才是有用的线索。
		const detail =
			files.length > expectedCount
				? `；多出：${files.slice(expectedCount).join(", ")}`
				: "";
		errors.push(
			`数量不符：期望 ${expectedCount} 张（已发布文章数），实际 ${files.length} 张${detail}`,
		);
	}

	let minInkRatio = Number.POSITIVE_INFINITY;
	for (const name of files) {
		const file = join(ogDirectory, name);
		let facts;
		try {
			facts = await inspectPng(file);
		} catch (error) {
			errors.push(`${name}：无法解码（${error.message}）`);
			continue;
		}

		if (facts.width !== WIDTH || facts.height !== HEIGHT) {
			errors.push(
				`${name}：尺寸 ${facts.width}x${facts.height}，期望 ${WIDTH}x${HEIGHT}`,
			);
		}

		if (facts.inkRatio < MIN_INK_RATIO) {
			errors.push(
				`${name}：疑似空白，非白像素占比 ${(facts.inkRatio * 100).toFixed(3)}%（阈值 ${MIN_INK_RATIO * 100}%）`,
			);
		}

		minInkRatio = Math.min(minInkRatio, facts.inkRatio);
	}

	return {
		ok: errors.length === 0,
		errors,
		count: files.length,
		expectedCount,
		minInkRatio,
	};
}

const isCli =
	process.argv[1] &&
	import.meta.url === new URL(`file://${resolve(process.argv[1])}`).href;
if (isCli) {
	const ogDirectory = process.argv[2]
		? join(resolve(process.argv[2]), "og")
		: "dist/og";

	let expectedCount;
	try {
		expectedCount = countPublishedPosts();
	} catch (error) {
		console.error(`[og] 无法推导期望数量：${error.message}`);
		process.exit(1);
	}

	const result = await verifyOgImages({ dir: ogDirectory, expectedCount });

	if (!result.ok) {
		for (const error of result.errors) console.error(`[og] ${error}`);
		process.exit(1);
	}

	console.log(
		`[og] ${result.count}/${result.expectedCount} 张通过：尺寸 ${WIDTH}x${HEIGHT}，` +
			`最小非白像素占比 ${(result.minInkRatio * 100).toFixed(3)}%`,
	);
}
