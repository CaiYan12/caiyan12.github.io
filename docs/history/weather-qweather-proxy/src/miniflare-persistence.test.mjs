import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { existsSync, readFileSync, realpathSync, rmSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const repoRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../..",
);
const weatherProxyDir = path.join(repoRoot, "weather-proxy");

function resolveMiniflare() {
	const binDirectory = (process.env.PATH ?? "")
		.split(path.delimiter)
		.find(
			(directory) =>
				path.isAbsolute(directory) &&
				path.basename(directory).toLowerCase() === ".bin" &&
				existsSync(path.join(path.dirname(directory), "wrangler")),
		);
	assert.ok(binDirectory, "Wrangler dlx runtime is available");
	const wranglerPath = realpathSync(
		path.join(path.dirname(binDirectory), "wrangler"),
	);
	const wranglerRequire = createRequire(
		path.join(wranglerPath, "package.json"),
	);
	const miniflareEntry = wranglerRequire.resolve("miniflare");
	let packageRoot = path.dirname(miniflareEntry);
	while (packageRoot !== path.dirname(packageRoot)) {
		const packageFile = path.join(packageRoot, "package.json");
		if (existsSync(packageFile)) {
			const metadata = JSON.parse(readFileSync(packageFile, "utf8"));
			if (metadata.name === "miniflare") {
				const miniflareRequire = createRequire(packageFile);
				return miniflareRequire("miniflare");
			}
		}
		packageRoot = path.dirname(packageRoot);
	}
	throw new Error("Miniflare package root was not found");
}

function jsonResponse(payload) {
	return new Response(JSON.stringify(payload), {
		headers: { "content-type": "application/json" },
		status: 200,
	});
}

function makeOutbound(upstreamCalls) {
	return (request) => {
		upstreamCalls.count += 1;
		if (new URL(request.url).pathname === "/geo/v2/city/lookup") {
			return jsonResponse({
				code: "200",
				location: [{ adm2: "北京", name: "东城", type: "district" }],
			});
		}
		return jsonResponse({
			metadata: {
				attributions: [
					"https://developer.qweather.com/attribution.html",
				],
			},
			condition: { text: "多云", code: "101" },
			temperature: { value: 24.5, unit: "°C" },
		});
	};
}

function makeOptions(
	Miniflare,
	convertV4MiniflareOptions,
	persistPath,
	outboundService,
) {
	return convertV4MiniflareOptions({
		host: "127.0.0.1",
		port: 0,
		name: "weather-proxy",
		rootPath: repoRoot,
		modulesRoot: repoRoot,
		modules: [
			{
				type: "ESModule",
				path: path.join(weatherProxyDir, "src", "index.js"),
			},
			{
				type: "ESModule",
				path: path.join(weatherProxyDir, "src", "handler.js"),
			},
		],
		compatibilityDate: "2026-09-28",
		bindings: {
			WEATHER_ALLOWED_ORIGINS:
				"https://caiyan12.github.io,http://localhost:4321",
			QWEATHER_API_HOST: "api9.example.qweather.test",
			QWEATHER_API_KEY: "miniflare-test-key",
			QWEATHER_ACCOUNT_USAGE_CONFIRMED: "true",
			QWEATHER_BILLING_MONTH: new Date().toISOString().slice(0, 7),
			QWEATHER_ACCOUNT_CALLS_USED: "44999",
			QWEATHER_BILLING_MONTH_ALIGNED: "true",
		},
		durableObjects: {
			WEATHER_QUOTA: { className: "QuotaDO", useSQLite: true },
		},
		outboundService,
		resourcePersistencePath: persistPath,
	});
}

test("Miniflare SQLite monthly quota stays at the cap across runtime restart", async () => {
	const persistenceRoot = path.resolve(
		weatherProxyDir,
		".wrangler",
		`miniflare-persistence-${process.pid}-${randomUUID()}`,
	);
	const ignoredRoot = path.resolve(weatherProxyDir, ".wrangler");
	const relativeToIgnored = path.relative(ignoredRoot, persistenceRoot);
	assert.ok(
		relativeToIgnored !== "" &&
			!relativeToIgnored.startsWith("..") &&
			!path.isAbsolute(relativeToIgnored),
	);

	const { Miniflare, convertV4MiniflareOptions } = resolveMiniflare();
	const firstOutbound = { count: 0 };
	const secondOutbound = { count: 0 };
	let firstRuntime;
	let secondRuntime;
	try {
		firstRuntime = new Miniflare(
			makeOptions(
				Miniflare,
				convertV4MiniflareOptions,
				persistenceRoot,
				makeOutbound(firstOutbound),
			),
		);
		await firstRuntime.ready;
		const firstResponse = await firstRuntime.dispatchFetch(
			"http://weather-proxy.test/v1/weather",
			{
				body: JSON.stringify({ lat: "39.9", lon: "116.4" }),
				headers: {
					"cf-connecting-ip": "198.51.100.9",
					"content-type": "application/json",
					origin: "http://localhost:4321",
				},
				method: "POST",
			},
		);
		assert.equal(firstResponse.status, 429);
		assert.deepEqual(await firstResponse.json(), {
			error: "quota_exhausted",
		});
		assert.equal(firstOutbound.count, 1);
		await firstRuntime.dispose();
		firstRuntime = null;

		secondRuntime = new Miniflare(
			makeOptions(
				Miniflare,
				convertV4MiniflareOptions,
				persistenceRoot,
				makeOutbound(secondOutbound),
			),
		);
		await secondRuntime.ready;
		const afterRestart = await secondRuntime.dispatchFetch(
			"http://weather-proxy.test/v1/weather",
			{
				body: JSON.stringify({ lat: "39.9", lon: "116.4" }),
				headers: {
					"cf-connecting-ip": "198.51.100.9",
					"content-type": "application/json",
					origin: "http://localhost:4321",
				},
				method: "POST",
			},
		);
		assert.equal(afterRestart.status, 429);
		assert.deepEqual(await afterRestart.json(), {
			error: "quota_exhausted",
		});
		assert.equal(secondOutbound.count, 0);
	} finally {
		await firstRuntime?.dispose();
		await secondRuntime?.dispose();
		rmSync(persistenceRoot, { force: true, recursive: true });
	}
});
