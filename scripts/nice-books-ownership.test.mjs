import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
const root = resolve(".");
const dist = resolve(process.env.MAIN_DIST || "dist");
const packageJson = JSON.parse(
	readFileSync(resolve(root, "package.json"), "utf8"),
);

// 2026-11-23 退役：/books/ 兼容层不再由博客维护（ADR 0018）。
for (const sourcePath of [
	"src/nice-books",
	"src/pages/books",
	"src/components/NiceBooksLegacyRedirect.astro",
	"src/data/nice-books-legacy-ids.ts",
]) {
	assert.equal(
		existsSync(resolve(root, sourcePath)),
		false,
		`${sourcePath} belongs to the independent Nice Books project or is retired`,
	);
}

for (const scriptPath of [
	"scripts/nice-books-smoke.mjs",
	"scripts/nice-books-geometry-qa.mjs",
	"scripts/nice-books-design-qa.mjs",
	"scripts/nice-books-migration-smoke.mjs",
]) {
	assert.equal(
		existsSync(resolve(root, scriptPath)),
		false,
		`${scriptPath} is retired`,
	);
}

for (const scriptName of [
	"test:nice-books",
	"smoke:nice-books",
	"qa:nice-books-geometry",
	"smoke:nice-books-migration",
]) {
	assert.equal(
		packageJson.scripts[scriptName],
		undefined,
		`${scriptName} is retired`,
	);
}
assert.equal(
	packageJson.scripts.build.includes("test:nice-books"),
	false,
	"the blog build must not run Nice Books business unit tests",
);
assert.equal(
	packageJson.scripts["test:nice-books-ownership"],
	"node scripts/nice-books-ownership.test.mjs",
);
assert.equal(
	packageJson.dependencies?.gsap ?? packageJson.devDependencies?.gsap,
	undefined,
	"GSAP is dedicated to the migrated Nice Books implementation",
);

const tailwind = requireTailwindConfig();
assert.equal(tailwind.theme.extend.colors.nb, undefined);
for (const fontName of ["nb-body", "nb-serif", "nb-kai", "nb-hand", "nb-mono"])
	assert.equal(tailwind.theme.extend.fontFamily[fontName], undefined);

const configSource = readFileSync(resolve(root, "src/config.ts"), "utf8");
assert.match(
	configSource,
	/url:\s*"\/nice-books\/"/,
	"blog keeps the independent Nice Books entry",
);

const astroConfig = readFileSync(resolve(root, "astro.config.mjs"), "utf8");
assert.match(
	astroConfig,
	/new URL\("\/nice-books\/", siteConfig\.siteURL\)/,
	"blog sitemap keeps the independent Nice Books homepage",
);
assert.doesNotMatch(
	astroConfig,
	/startsWith\("\/books\/"\)/,
	"retired /books/ sitemap filter is removed",
);

if (process.argv.includes("--source-only")) {
	console.log("PASS Nice Books retirement source guard");
} else {
	assert.equal(
		existsSync(resolve(dist, "books")),
		false,
		"retired compatibility pages must not be published",
	);
	const sitemapPath = resolve(dist, "sitemap-0.xml");
	assert.ok(existsSync(sitemapPath), "blog sitemap exists");
	const sitemap = readFileSync(sitemapPath, "utf8");
	assert.ok(
		sitemap.includes("https://caiyan12.github.io/nice-books/"),
		"blog sitemap retains the independent project homepage",
	);
	assert.doesNotMatch(
		sitemap,
		/<loc>[^<]*\/books\//,
		"retired compatibility pages are not discoverable through the blog sitemap",
	);
	console.log(
		"PASS Nice Books retirement guard: compatibility pages removed, sitemap ownership intact",
	);
}

function requireTailwindConfig() {
	const path = resolve(root, "tailwind.config.cjs");
	return require(path);
}
