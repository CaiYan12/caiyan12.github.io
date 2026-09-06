// LQIP 模糊占位图生成（移植自 Firefly 的 scripts/generate-lqips.ts，MIT）
// 方案来源: https://blog.cosine.ren/post/astro-lqip-implementation
//
// 扫描 src/ 与 public/ 下的位图，缩到 2x2 取四角颜色生成 135° 斜向渐变，
// 以 18 字符紧凑 hex 存入 src/constants/lqips.json（构建期由 lqip-utils 读取）。
// 与 Firefly 原版差异：用 node:fs 递归代替 glob（免依赖），脚本改为 .mjs（免 tsx）。
// 增量执行：已处理的图片跳过，已删除的图片清理条目。
//
// 同时为 public/images/ 下的大图生成响应式 WebP 变体（TODO2）：
// 变体输出到 public/images/_variants/<相对路径>.<宽度>w.webp（不入库，随构建进 dist），
// 原图宽高与可用变体档位写入 src/constants/image-manifest.json（入库，
// 渲染层 image-variants.ts 读取并用 existsSync 兜底，变体缺失时回退原图）。

import sharp from "sharp";
import fs from "fs/promises";
import path from "path";

const SRC_DIR = "src";
const PUBLIC_DIR = "public";
const OUTPUT_FILE = "src/constants/lqips.json";
const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".webp", ".avif"]);
// 需要忽略的目录（相对于项目根目录，目录前缀匹配）
// public/images/_variants 是 WebP 变体目录（见下方变体生成），不参与 LQIP 扫描
const IGNORE_DIRS = [
	"src/content",
	"public/fonts",
	"public/pio",
	"public/images/_variants",
];

// ---------- WebP 响应式变体 ----------
const IMAGES_ROOT = path.join(PUBLIC_DIR, "images");
const VARIANTS_ROOT = path.join(IMAGES_ROOT, "_variants");
const MANIFEST_FILE = "src/constants/image-manifest.json";
const VARIANT_WIDTHS = [480, 720, 1080, 1440];
// 变体档位相对原图需有足够缩放收益才生成（避免 860 宽原图生成 720 变体）
const VARIANT_SCALE_RATIO = 1.2;
// 背景图由 theme-script JS 加载，不属于四类渲染层，跳过（_variants 是变体自身目录）
const VARIANT_SKIP_DIRS = ["public/images/bg", "public/images/_variants"];
const VARIANT_SRC_EXTS = new Set([".jpg", ".jpeg", ".png"]);

const LqipMap = {};

function rgbToHex(color) {
	const hex = (n) => n.toString(16).padStart(2, "0");
	return `#${hex(color.r)}${hex(color.g)}${hex(color.b)}`;
}

async function processImage(imagePath) {
	try {
		const { data, info } = await sharp(imagePath)
			.resize(2, 2, { fit: "fill" })
			.raw()
			.toBuffer({ resolveWithObject: true });

		const channels = info.channels;
		const colors = [];

		for (let i = 0; i < 4; i++) {
			const offset = i * channels;
			colors.push({
				r: data[offset],
				g: data[offset + 1],
				b: data[offset + 2],
			});
		}

		// 使用 corners[0], [1], [3] 生成 135deg 斜向渐变
		const compact = `${rgbToHex(colors[0]).slice(1)}${rgbToHex(colors[1]).slice(1)}${rgbToHex(colors[3]).slice(1)}`;
		return compact;
	} catch (error) {
		console.error(`Error processing ${imagePath}:`, error);
		return null;
	}
}

function filePathToKey(filePath) {
	if (filePath.startsWith(PUBLIC_DIR)) {
		return `public:${path.relative(PUBLIC_DIR, filePath).replace(/\\/g, "/")}`;
	}
	return `src:${path.relative(SRC_DIR, filePath).replace(/\\/g, "/")}`;
}

/** 递归收集图片文件（跳过 IGNORE_DIRS 前缀目录） */
async function collectImages(dir, out) {
	let entries;
	try {
		entries = await fs.readdir(dir, { withFileTypes: true });
	} catch {
		return;
	}
	for (const entry of entries) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			if (
				IGNORE_DIRS.some((ig) =>
					full.replace(/\\/g, "/").startsWith(ig),
				)
			)
				continue;
			await collectImages(full, out);
		} else if (IMAGE_EXTS.has(path.extname(entry.name).toLowerCase())) {
			out.push(full.replace(/\\/g, "/"));
		}
	}
}

async function main() {
	// 读取已有的 lqips.json
	let existingLqips = {};
	try {
		const content = await fs.readFile(OUTPUT_FILE, "utf-8");
		existingLqips = JSON.parse(content);
		console.log(
			`Loaded ${Object.keys(existingLqips).length} existing entries from ${OUTPUT_FILE}`,
		);
	} catch {
		console.log(`No existing ${OUTPUT_FILE} found, will create new.`);
	}

	const files = [];
	await collectImages(SRC_DIR, files);
	await collectImages(PUBLIC_DIR, files);

	if (files.length === 0) {
		console.log("No image files found.");
		return;
	}

	// 移除已不存在的图片数据
	const currentKeys = new Set(files.map((file) => filePathToKey(file)));
	const removedKeys = Object.keys(existingLqips).filter(
		(key) => !currentKeys.has(key),
	);
	for (const key of removedKeys) {
		delete existingLqips[key];
	}
	if (removedKeys.length > 0) {
		console.log(`Removed ${removedKeys.length} stale entries.`);
	}

	// 过滤掉已有数据的图片
	const newFiles = files.filter((file) => {
		const key = filePathToKey(file);
		return !(key in existingLqips);
	});

	console.log(
		`Found ${files.length} images, ${newFiles.length} new to process.`,
	);

	const lqips = { ...existingLqips };
	let processed = 0;

	for (const file of newFiles) {
		const filePath = path.resolve(file);
		process.stdout.write(
			`\rProcessing ${processed + 1}/${newFiles.length}...`,
		);
		const compact = await processImage(filePath);
		if (compact !== null) {
			lqips[filePathToKey(file)] = compact;
			processed++;
		}
	}

	const dir = path.dirname(OUTPUT_FILE);
	await fs.mkdir(dir, { recursive: true });
	await fs.writeFile(
		OUTPUT_FILE,
		JSON.stringify(lqips, null, "\t") + "\n",
		"utf-8",
	);

	console.log(
		`\nDone! Processed ${processed}/${newFiles.length} new images. Total: ${Object.keys(lqips).length}. Output: ${OUTPUT_FILE}`,
	);

	await generateVariants();
}

/** 收集 public/images 下可生成变体的原图（返回相对 public/images 的路径） */
async function collectVariantSources(dir, out) {
	let entries;
	try {
		entries = await fs.readdir(dir, { withFileTypes: true });
	} catch {
		return;
	}
	for (const entry of entries) {
		const full = path.join(dir, entry.name);
		const normalized = full.replace(/\\/g, "/");
		if (entry.isDirectory()) {
			if (VARIANT_SKIP_DIRS.some((skip) => normalized.startsWith(skip)))
				continue;
			await collectVariantSources(full, out);
		} else if (
			VARIANT_SRC_EXTS.has(path.extname(entry.name).toLowerCase())
		) {
			out.push(path.relative(IMAGES_ROOT, full).replace(/\\/g, "/"));
		}
	}
}

/** 清理孤儿变体：原图已删除或档位不再有效的变体文件 */
async function cleanStaleVariants(validSources) {
	let removed = 0;
	async function walk(dir) {
		let entries;
		try {
			entries = await fs.readdir(dir, { withFileTypes: true });
		} catch {
			return;
		}
		for (const entry of entries) {
			const full = path.join(dir, entry.name);
			if (entry.isDirectory()) {
				await walk(full);
			} else {
				// 变体命名：<原图相对路径>.<W>w.webp，其中原图相对路径可能自带扩展名
				const rel = path
					.relative(VARIANTS_ROOT, full)
					.replace(/\\/g, "/");
				const match = rel.match(/^(.+)\.(\d+)w\.webp$/);
				if (!match) continue;
				const sourceRel = match[1];
				const width = Number(match[2]);
				if (
					!validSources.has(sourceRel) ||
					!VARIANT_WIDTHS.includes(width)
				) {
					await fs.rm(full, { force: true });
					removed++;
				}
			}
		}
	}
	await walk(VARIANTS_ROOT);
	if (removed > 0) console.log(`Removed ${removed} stale variant file(s).`);
}

/**
 * 为 public/images 下的 jpg/png 生成响应式 WebP 变体，并重建尺寸 manifest。
 * manifest key 与 lqips 一致（public:images/xxx），值为 { width, height, variants: [...] }；
 * 变体文件不入库（.gitignore 排除 public/images/_variants/），CI 每次构建重新生成。
 */
async function generateVariants() {
	const sources = [];
	await collectVariantSources(IMAGES_ROOT, sources);
	await cleanStaleVariants(new Set(sources));

	const manifest = {};
	let generated = 0;
	let skipped = 0;

	for (const rel of sources) {
		const srcPath = path.join(IMAGES_ROOT, rel);
		let metadata;
		try {
			metadata = await sharp(srcPath).metadata();
		} catch (error) {
			console.error(`\nError reading ${srcPath}:`, error?.message);
			continue;
		}
		const srcWidth = metadata.width ?? 0;
		const srcHeight = metadata.height ?? 0;
		if (!srcWidth || !srcHeight) continue;

		// 原图宽度需大于档位 × 1.2 才生成（保证缩放收益，小图直接跳过）
		const widths = VARIANT_WIDTHS.filter(
			(w) => srcWidth > w * VARIANT_SCALE_RATIO,
		);
		if (widths.length > 0) {
			manifest[`public:images/${rel}`] = {
				width: srcWidth,
				height: srcHeight,
				variants: widths,
			};
		}

		const srcMtime = (await fs.stat(srcPath)).mtimeMs;
		for (const w of widths) {
			const variantPath = path.join(VARIANTS_ROOT, `${rel}.${w}w.webp`);
			await fs.mkdir(path.dirname(variantPath), { recursive: true });
			// 增量：变体已存在且不早于原图 mtime 则跳过
			try {
				const stat = await fs.stat(variantPath);
				if (stat.mtimeMs >= srcMtime) {
					skipped++;
					continue;
				}
			} catch {
				/* 不存在则生成 */
			}
			await sharp(srcPath)
				.resize({ width: w })
				.webp({ quality: 82 })
				.toFile(variantPath);
			generated++;
		}
	}

	await fs.mkdir(path.dirname(MANIFEST_FILE), { recursive: true });
	await fs.writeFile(
		MANIFEST_FILE,
		JSON.stringify(manifest, null, "\t") + "\n",
		"utf-8",
	);

	console.log(
		`Variants: ${generated} generated, ${skipped} up-to-date. Manifest entries: ${Object.keys(manifest).length}. Output: ${MANIFEST_FILE}`,
	);
}

main();
