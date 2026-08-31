// LQIP 模糊占位图生成（移植自 Firefly 的 scripts/generate-lqips.ts，MIT）
// 方案来源: https://blog.cosine.ren/post/astro-lqip-implementation
//
// 扫描 src/ 与 public/ 下的位图，缩到 2x2 取四角颜色生成 135° 斜向渐变，
// 以 18 字符紧凑 hex 存入 src/constants/lqips.json（构建期由 lqip-utils 读取）。
// 与 Firefly 原版差异：用 node:fs 递归代替 glob（免依赖），脚本改为 .mjs（免 tsx）。
// 增量执行：已处理的图片跳过，已删除的图片清理条目。

import sharp from "sharp";
import fs from "fs/promises";
import path from "path";

const SRC_DIR = "src";
const PUBLIC_DIR = "public";
const OUTPUT_FILE = "src/constants/lqips.json";
const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".webp", ".avif"]);
// 需要忽略的目录（相对于项目根目录，目录前缀匹配）
const IGNORE_DIRS = ["src/content", "public/fonts", "public/pio"];

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
			if (IGNORE_DIRS.some((ig) => full.replace(/\\/g, "/").startsWith(ig)))
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

	console.log(`Found ${files.length} images, ${newFiles.length} new to process.`);

	const lqips = { ...existingLqips };
	let processed = 0;

	for (const file of newFiles) {
		const filePath = path.resolve(file);
		process.stdout.write(`\rProcessing ${processed + 1}/${newFiles.length}...`);
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
}

main();
