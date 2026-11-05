// 只测公开接口：verifyOgImages({ dir, expectedCount }) 与 countPublishedPosts(dir)。
// 不 mock sharp、不断言内部实现——判据的价值就在于「真的读到了那张图」。
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import sharp from "sharp";
import { countPublishedPosts, verifyOgImages } from "./verify-og-images.mjs";

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

test("没有传期望数量时失败，而不是静默放过数量判据", async () => {
	const dir = await makeDir({ "a.png": await cardPng() });
	const result = await verifyOgImages({ dir });
	assert.equal(result.ok, false);
	assert.ok(
		result.errors.some((e) => e.includes("期望数量无效")),
		`未拒绝缺失的期望数量：${result.errors.join("; ")}`,
	);
	rmSync(dir, { recursive: true, force: true });
});

// 期望数量必须跟着内容走：写死常量会在下一篇非草稿文章提交时让 build 变红。
test("期望数量按非草稿文章派生，草稿不计入", () => {
	const dir = mkdtempSync(join(tmpdir(), "og-content-"));
	const post = (slug, frontmatter) => {
		mkdirSync(join(dir, slug), { recursive: true });
		writeFileSync(
			join(dir, slug, "index.md"),
			`---\n${frontmatter}\n---\n\n正文\n`,
		);
	};
	post("20260101000000", "title: 甲\npublished: 2026-01-01 00:00:00");
	post("20260102000000", "title: 乙\npublished: 2026-01-02 00:00:00");
	post(
		"20260103000000",
		"title: 丙\npublished: 2026-01-03 00:00:00\ndraft: true",
	);
	// 正文里出现 draft: true 不算草稿——只认 frontmatter
	mkdirSync(join(dir, "20260104000000"), { recursive: true });
	writeFileSync(
		join(dir, "20260104000000", "index.md"),
		"---\ntitle: 丁\npublished: 2026-01-04 00:00:00\n---\n\ndraft: true 只是正文里的一行\n",
	);

	assert.equal(countPublishedPosts(dir), 3);
	rmSync(dir, { recursive: true, force: true });
});

test("新增一篇非草稿文章后，期望数量自动加一而无需改脚本常量", async () => {
	const contentDir = mkdtempSync(join(tmpdir(), "og-content-"));
	const write = (slug, draft) => {
		mkdirSync(join(contentDir, slug), { recursive: true });
		writeFileSync(
			join(contentDir, slug, "index.md"),
			`---\ntitle: ${slug}\npublished: 2026-01-01 00:00:00\n${draft ? "draft: true\n" : ""}---\n\n正文\n`,
		);
	};
	write("20260101000000", false);
	write("20260102000000", false);

	const before = countPublishedPosts(contentDir);
	write("20260103000000", false);
	const after = countPublishedPosts(contentDir);
	assert.equal(before, 2);
	assert.equal(after, 3);

	// 真实产物同步多一张时，判据仍然通过——这正是写死 33 会误报的场景
	const ogDir = mkdtempSync(join(tmpdir(), "og-"));
	for (let i = 0; i < 3; i++)
		writeFileSync(join(ogDir, `${i}.png`), await cardPng());
	const result = await verifyOgImages({ dir: ogDir, expectedCount: after });
	assert.equal(result.ok, true, result.errors.join("; "));

	rmSync(contentDir, { recursive: true, force: true });
	rmSync(ogDir, { recursive: true, force: true });
});
