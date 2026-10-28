import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
const dist = resolve(process.env.MAIN_DIST || "dist");
assert.equal(
	existsSync(resolve(dist, "ai-news/index.html")),
	false,
	"main build must not publish AI news HTML",
);
assert.equal(
	existsSync(resolve(dist, "ai-news/snapshot/juya.xml")),
	false,
	"main build must not publish AI news snapshot",
);
const sitemap = readFileSync(resolve(dist, "sitemap-0.xml"), "utf8");
assert.ok(
	sitemap.includes("https://caiyan12.github.io/ai-news/"),
	"main sitemap retains independent AI news URL",
);
console.log("PASS main build ownership and sitemap");
