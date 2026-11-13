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

for (const sourcePath of ["src/nice-books", "src/pages/books/data.json.ts"]) {
	assert.equal(
		existsSync(resolve(root, sourcePath)),
		false,
		`${sourcePath} belongs to the independent Nice Books project`,
	);
}

for (const scriptPath of [
	"scripts/nice-books-smoke.mjs",
	"scripts/nice-books-geometry-qa.mjs",
	"scripts/nice-books-design-qa.mjs",
]) {
	assert.equal(
		existsSync(resolve(root, scriptPath)),
		false,
		`${scriptPath} is replaced by independent-project acceptance`,
	);
}

assert.equal(
	packageJson.scripts.build.includes("test:nice-books"),
	false,
	"the blog build must not run Nice Books business unit tests",
);
for (const scriptName of [
	"test:nice-books",
	"smoke:nice-books",
	"qa:nice-books-geometry",
]) {
	assert.equal(
		packageJson.scripts[scriptName],
		undefined,
		`${scriptName} belongs to the independent project`,
	);
}
assert.equal(
	packageJson.scripts["test:nice-books-ownership"],
	"node scripts/nice-books-ownership.test.mjs",
);
assert.equal(
	packageJson.scripts["smoke:nice-books-migration"],
	"node scripts/nice-books-migration-smoke.mjs",
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

const idSourcePath = resolve(root, "src/data/nice-books-legacy-ids.ts");
assert.ok(existsSync(idSourcePath), "blog owns a fixed legacy ID list");
const idSource = readFileSync(idSourcePath, "utf8");
const idArray = idSource.match(
	/export const NICE_BOOKS_LEGACY_IDS\s*=\s*\[([\s\S]*?)\]\s*as const/,
);
assert.ok(idArray, "legacy ID list has a literal array declaration");
assert.doesNotMatch(
	idSource,
	/\bfrom\s+["'][^"']*(?:nice-books|books\.ts)/i,
	"legacy redirects must not import independent business data",
);
const ids = [...idArray[1].matchAll(/["'](\d{2})["']/g)].map(
	(match) => match[1],
);
assert.deepEqual(
	ids,
	Array.from({ length: 70 }, (_, index) =>
		String(index + 1).padStart(2, "0"),
	),
	"the compatibility list covers the fixed legacy IDs 01–70",
);

if (process.argv.includes("--source-only")) {
	console.log("PASS Nice Books source ownership");
} else {
	const redirectPages = [
		["/books/", "/nice-books/"],
		["/books/archive/", "/nice-books/archive/"],
		...ids.map((id) => [`/books/${id}/`, `/nice-books/${id}/`]),
	];
	for (const [legacyPath, targetPath] of redirectPages) {
		const relative = legacyPath.replace(/^\/+|\/+$/g, "");
		const htmlPath = resolve(dist, relative, "index.html");
		assert.ok(
			existsSync(htmlPath),
			`${legacyPath} remains a static compatibility page`,
		);
		const html = readFileSync(htmlPath, "utf8");
		assert.ok(
			html.includes("data-nice-books-redirect"),
			`${legacyPath} is a compatibility redirect page`,
		);
		assert.ok(
			html.includes('data-pagefind-ignore="all"'),
			`${legacyPath} stays outside the blog search index`,
		);
		const target = html.match(/data-redirect-target="([^"]+)"/);
		assert.equal(
			target?.[1],
			targetPath,
			`${legacyPath} maps to ${targetPath}`,
		);
	}

	assert.equal(
		existsSync(resolve(dist, "books", "data.json")),
		false,
		"the old book data endpoint is no longer published",
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
		"compatibility pages are not discoverable through the blog sitemap",
	);
	console.log(
		"PASS Nice Books build ownership, compatibility pages, and sitemap",
	);
}

function requireTailwindConfig() {
	const path = resolve(root, "tailwind.config.cjs");
	return require(path);
}
