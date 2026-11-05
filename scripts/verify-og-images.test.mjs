// 只测公开接口：verifyOgImages({ dir, expectedCount }) 返回 { ok, errors }。
// 不 mock sharp、不断言内部实现——判据的价值就在于「真的读到了那张图」。
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import sharp from "sharp";
import { verifyOgImages } from "./verify-og-images.mjs";

const WIDTH = 1200;
const HEIGHT = 630;

// 造一张「有内容」的图：白底画一块深色矩形，墨迹占比足够高。
async function cardPng({ width = WIDTH, height = HEIGHT, ink = true } = {}) {
	const base = sharp({
		create: {
			width,
			height,
			channels: 3,
			background: { r: 255, g: 255, b: 255 },
		},
	});
	if (!ink) return base.png().toBuffer();
	return base
		.composite([
			{
				input: {
					create: {
						width: Math.round(width / 4),
						height: Math.round(height / 4),
						channels: 3,
						background: { r: 31, g: 41, b: 55 },
					},
				},
				left: Math.round(width / 8),
				top: Math.round(height / 8),
			},
		])
		.png()
		.toBuffer();
}

async function makeDir(cards) {
	const dir = mkdtempSync(join(tmpdir(), "og-verify-"));
	for (const [name, buf] of Object.entries(cards))
		writeFileSync(join(dir, name), buf);
	return dir;
}

test("全部合规时通过", async () => {
	const dir = await makeDir({
		"a.png": await cardPng(),
		"b.png": await cardPng(),
	});
	const result = await verifyOgImages({ dir, expectedCount: 2 });
	assert.equal(result.ok, true, result.errors.join("; "));
	assert.deepEqual(result.errors, []);
	rmSync(dir, { recursive: true, force: true });
});

test("全白图导致失败，且错误信息指名文件", async () => {
	const dir = await makeDir({
		"a.png": await cardPng(),
		"blank.png": await cardPng({ ink: false }),
	});
	const result = await verifyOgImages({ dir, expectedCount: 2 });
	assert.equal(result.ok, false);
	assert.ok(
		result.errors.some(
			(e) => e.includes("blank.png") && e.includes("空白"),
		),
		`未指出空白文件：${result.errors.join("; ")}`,
	);
	rmSync(dir, { recursive: true, force: true });
});

test("尺寸不是 1200×630 时失败，且报出实际尺寸", async () => {
	const dir = await makeDir({
		"a.png": await cardPng(),
		"small.png": await cardPng({ width: 600, height: 315 }),
	});
	const result = await verifyOgImages({ dir, expectedCount: 2 });
	assert.equal(result.ok, false);
	assert.ok(
		result.errors.some(
			(e) => e.includes("small.png") && e.includes("600x315"),
		),
		`未报出实际尺寸：${result.errors.join("; ")}`,
	);
	rmSync(dir, { recursive: true, force: true });
});

test("数量缺失时失败，且报出实际数量", async () => {
	const dir = await makeDir({ "a.png": await cardPng() });
	const result = await verifyOgImages({ dir, expectedCount: 3 });
	assert.equal(result.ok, false);
	assert.ok(
		result.errors.some((e) => e.includes("1") && e.includes("3")),
		`未报出数量差：${result.errors.join("; ")}`,
	);
	rmSync(dir, { recursive: true, force: true });
});

test("目录不存在时失败而不是抛出", async () => {
	const result = await verifyOgImages({
		dir: join(tmpdir(), "og-verify-not-exist-" + Date.now()),
		expectedCount: 1,
	});
	assert.equal(result.ok, false);
	assert.ok(result.errors.length > 0);
});
