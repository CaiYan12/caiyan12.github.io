import test from "node:test";
import assert from "node:assert/strict";
import {
	declaredVersion,
	findBadge,
	versionMatches,
	checkBadges,
	checkVersionSection,
} from "./verify-doc-versions.mjs";

const manifest = {
	dependencies: { astro: "7.4.4", tailwindcss: "4.3.4", satori: "0.63.2" },
	devDependencies: { typescript: "^5.9.3" },
};

const readme = [
	"![Astro](https://img.shields.io/badge/Astro-7.4.4-BC52EE?logo=astro)",
	"![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6)",
	"![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.3-06B6D4)",
].join("\n");

test("从 manifest 取版本，caret 会剥掉", () => {
	assert.equal(declaredVersion(manifest, "astro"), "7.4.4");
	assert.equal(declaredVersion(manifest, "typescript"), "5.9.3");
	assert.equal(declaredVersion(manifest, "missing"), null);
});

test("完整版本与主次版本都算一致", () => {
	assert.equal(versionMatches("7.4.4", "7.4.4"), true);
	assert.equal(versionMatches("4.3", "4.3.4"), true);
	assert.equal(versionMatches("6.4.8", "7.4.4"), false);
	assert.equal(versionMatches("5.9", "5.9.3"), true);
});

test("三个徽章都与真源一致时通过", () => {
	const result = checkBadges({ readme, manifest });
	assert.equal(result.ok, true);
	assert.equal(result.checked, 3);
});

test("徽章停在旧版本时报错", () => {
	const stale = readme.replace("Astro-7.4.4", "Astro-6.4.8");
	const result = checkBadges({ readme: stale, manifest });
	assert.equal(result.ok, false);
	assert.match(
		result.errors[0],
		/Astro: badge 6\.4\.8, package\.json 7\.4\.4/,
	);
});

test("徽章缺失时报错", () => {
	const result = checkBadges({ readme: "", manifest });
	assert.equal(result.ok, false);
	assert.ok(result.errors.length >= 3);
});

test("维护文档降级为指针后该节跳过", () => {
	const doc =
		"### 当前构建链版本\n\n现测：node -p \"require('./package.json')\"\n";
	const result = checkVersionSection(doc, manifest);
	assert.equal(result.skipped, true);
	assert.equal(result.ok, true);
});

test("维护文档若仍列版本表，过期值会被抓到", () => {
	const doc = [
		"### 当前构建链版本",
		"",
		"| 组件 | 现版本 |",
		"| --- | --- |",
		"| `astro` | **6.4.8** |",
		"| `satori` | **0.63.2** |",
	].join("\n");
	const result = checkVersionSection(doc, manifest);
	assert.equal(result.ok, false);
	assert.equal(result.checked, 2);
	assert.match(result.errors[0], /astro: doc 6\.4\.8, package\.json 7\.4\.4/);
});
