import assert from "node:assert/strict";
import { createReadStream, existsSync } from "node:fs";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { chromium } from "playwright";

const mainDist = resolve(process.env.MAIN_DIST || "dist");
const niceBooksDist = process.env.NICE_BOOKS_DIST
	? resolve(process.env.NICE_BOOKS_DIST)
	: null;
assert.ok(niceBooksDist, "NICE_BOOKS_DIST must point to the independent build");
assert.ok(
	existsSync(resolve(mainDist, "index.html")),
	"MAIN_DIST must be built",
);
assert.ok(
	existsSync(resolve(niceBooksDist, "index.html")),
	"NICE_BOOKS_DIST must be built",
);

const server = createServer((request, response) => {
	if (request.method !== "GET" && request.method !== "HEAD") {
		response.writeHead(405).end();
		return;
	}
	let pathname;
	try {
		pathname = decodeURIComponent(
			new URL(request.url, "http://local").pathname,
		);
	} catch {
		response.writeHead(400).end("Bad URL");
		return;
	}
	const independent =
		pathname === "/nice-books" || pathname.startsWith("/nice-books/");
	const root = independent ? niceBooksDist : mainDist;
	const relative = independent
		? pathname.slice("/nice-books".length).replace(/^\/+/, "")
		: pathname.replace(/^\/+/, "");
	let filePath = resolve(root, relative);
	if (!relative || pathname.endsWith("/"))
		filePath = resolve(filePath, "index.html");
	if (filePath !== root && !filePath.startsWith(`${root}${sep}`)) {
		response.writeHead(403).end("Forbidden");
		return;
	}
	const stream = createReadStream(filePath);
	stream.on("error", () => response.writeHead(404).end("Not found"));
	stream.on("open", () => {
		response.writeHead(200, {
			"cache-control": "no-store",
			"content-type": contentType(filePath),
		});
		if (request.method === "HEAD") response.end();
		else stream.pipe(response);
	});
});

await new Promise((resolveListen) =>
	server.listen(0, "127.0.0.1", resolveListen),
);
const address = server.address();
assert.ok(address && typeof address === "object");
const rootUrl = new URL(`http://127.0.0.1:${address.port}/`);
const browser = await chromium.launch();

try {
	for (const width of [1280, 390]) {
		const context = await browser.newContext({
			viewport: { width, height: width === 390 ? 844 : 900 },
		});
		const page = await context.newPage();
		const pageErrors = [];
		page.on("pageerror", (error) => pageErrors.push(error.message));
		await context.route("**/*", (route) => {
			const target = new URL(route.request().url());
			if (target.hostname === "caiyan12.github.io") {
				return route.fulfill({
					status: 302,
					headers: {
						location: new URL(
							`${target.pathname}${target.search}`,
							rootUrl,
						).href,
					},
				});
			}
			if (target.origin !== rootUrl.origin) return route.abort();
			return route.continue();
		});

		await page.goto(rootUrl.href, { waitUntil: "domcontentloaded" });
		const selector =
			width === 390
				? '#mmenu a[href="/nice-books/"]'
				: '#head-nav a[href="/nice-books/"]';
		const link = page.locator(selector);
		assert.equal(await link.count(), 1, `${width}: Nice Books nav link`);
		assert.notEqual(
			await link.getAttribute("data-no-swup"),
			null,
			`${width}: external project uses full document navigation`,
		);
		if (width === 390) await page.locator("#open-nav").click();
		else
			await page
				.locator("#head-nav a.catbtns")
				.filter({ hasText: "本站资源" })
				.hover();
		await link.click();
		await page.waitForURL((url) => url.pathname === "/nice-books/");
		await page.locator("#nb-hero").waitFor();

		if (width === 1280) {
			const q = "?q=%E4%B8%AD%E6%96%87%20%2F&tag=%E6%96%87%E5%AD%A6";
			const hash = "#%E4%B9%A6%E6%9E%B6";
			await visitLegacy(page, "/books/", "/nice-books/", q, hash);
			await page.locator("#nb-hero").waitFor();
			await visitLegacy(
				page,
				"/books/archive/",
				"/nice-books/archive/",
				"?q=%E7%99%BE%E5%B9%B4%E5%AD%A4%E7%8B%AC",
				"#list",
			);
			await page.locator("#nb-archive-grid").waitFor();
			await visitLegacy(
				page,
				"/books/01/",
				"/nice-books/01/",
				"?from=legacy%20%E6%94%B6%E8%97%8F",
				"#related",
			);
			await page.locator("#nb-books-main h1").waitFor();
			await page.goto(new URL("/nice-books/02/", rootUrl).href, {
				waitUntil: "domcontentloaded",
			});
			await page.goBack({ waitUntil: "domcontentloaded" });
			assert.equal(new URL(page.url()).pathname, "/nice-books/01/");
			await page.locator('header a[data-nb-nav="external"]').click();
			await page.waitForURL((url) => url.pathname === "/");
			assert.equal(new URL(page.url()).origin, rootUrl.origin);
		}

		assert.deepEqual(pageErrors, [], `${width}: page errors`);
		console.log(
			`PASS ${width}: main navigation and ${width === 1280 ? "legacy redirects, Chinese query/hash, history.back, return-to-main host mapping" : "mobile entry"}`,
		);
		await context.close();
	}
	console.log(
		`TEST-ONLY HOST MAP: https://caiyan12.github.io/ => ${rootUrl.href}`,
	);
} finally {
	await browser.close();
	await new Promise((resolveClose, rejectClose) =>
		server.close((error) => (error ? rejectClose(error) : resolveClose())),
	);
}

async function visitLegacy(page, path, expectedPath, search, hash) {
	await page.goto(new URL(`${path}${search}${hash}`, rootUrl).href, {
		waitUntil: "domcontentloaded",
	});
	await page.waitForURL(
		(url) =>
			url.origin === rootUrl.origin &&
			url.pathname === expectedPath &&
			url.search === search &&
			url.hash === hash,
		{ timeout: 10000 },
	);
}

function contentType(path) {
	return (
		{
			".css": "text/css; charset=utf-8",
			".html": "text/html; charset=utf-8",
			".js": "text/javascript; charset=utf-8",
			".json": "application/json; charset=utf-8",
			".svg": "image/svg+xml",
			".xml": "application/xml; charset=utf-8",
			".woff": "font/woff",
			".woff2": "font/woff2",
			".ttf": "font/ttf",
			".png": "image/png",
			".jpg": "image/jpeg",
			".jpeg": "image/jpeg",
			".webp": "image/webp",
		}[extname(path).toLowerCase()] ?? "application/octet-stream"
	);
}
