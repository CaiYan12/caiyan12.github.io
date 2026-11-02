import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
const dist = resolve(process.env.MAIN_DIST || "dist");
for (const path of ["src/ai-news", "src/pages/ai-news", "public/ai-news"]) {
	assert.equal(
		existsSync(resolve(path)),
		false,
		`${path} belongs to the independent project`,
	);
}
assert.equal(
	existsSync(resolve(dist, "ai-news")),
	false,
	"main build must not publish any AI news files",
);
const sitemap = readFileSync(resolve(dist, "sitemap-0.xml"), "utf8");
assert.ok(
	sitemap.includes("https://caiyan12.github.io/ai-news/"),
	"main sitemap retains independent AI news URL",
);
console.log("PASS main build ownership and sitemap");
