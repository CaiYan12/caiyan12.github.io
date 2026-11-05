import test from "node:test";
import assert from "node:assert/strict";
import {
	readDeclared,
	compareVersions,
	verifyDeps,
	WATCHED,
} from "./verify-deps.mjs";

const manifest = {
	dependencies: { astro: "7.4.4", satori: "0.63.2", tailwindcss: "4.3.4" },
	devDependencies: {},
};

test("声明版本与实际安装一致时通过", () => {
	const declared = readDeclared(manifest);
	const installed = {
		astro: "7.4.4",
		satori: "0.63.2",
		tailwindcss: "4.3.4",
	};
	const result = compareVersions({ declared, installed });
	assert.equal(result.ok, true);
	assert.equal(result.checked, 3);
	assert.deepEqual(result.errors, []);
});

test("实际装了旧版本时逐项报出", () => {
	const result = compareVersions({
		declared: readDeclared(manifest),
		installed: { astro: "7.4.4", satori: "0.26.0", tailwindcss: "4.3.4" },
	});
	assert.equal(result.ok, false);
	assert.equal(result.errors.length, 1);
	assert.match(
		result.errors[0],
		/satori: declared 0\.63\.2, installed 0\.26\.0/,
	);
});

test("缺包或 package.json 不可读也算失败", () => {
	const result = compareVersions({
		declared: readDeclared(manifest),
		installed: { astro: "7.4.4", satori: null, tailwindcss: "4.3.4" },
	});
	assert.equal(result.ok, false);
	assert.match(result.errors[0], /missing or unreadable/);
});

test("caret 声明只查包是否存在，不要求严格相等", () => {
	const result = compareVersions({
		declared: readDeclared({ dependencies: { typescript: "^5.9.3" } }, [
			"typescript",
		]),
		installed: { typescript: "5.9.8" },
	});
	assert.equal(result.ok, true);
});

test("manifest 缺少被监视的包时不报假失败", () => {
	const declared = readDeclared({ dependencies: { astro: "7.4.4" } });
	assert.deepEqual(Object.keys(declared), ["astro"]);
	assert.equal(WATCHED.length, 3);
});

test("verifyDeps 允许注入 manifest 与 installed，便于脱机测试", () => {
	const result = verifyDeps({
		root: "/nonexistent",
		manifest,
		installed: { astro: "7.4.4", satori: "0.63.2", tailwindcss: "4.3.4" },
	});
	assert.equal(result.ok, true);
});
