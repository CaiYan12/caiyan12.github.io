import { createRequire } from "node:module";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../..",
);
const weatherProxyDir = path.resolve(repoRoot, "weather-proxy");
const host = "127.0.0.1";
const port = Number(process.env.WEATHER_PROXY_LOCAL_PORT ?? "8787");
const mockMode = process.argv.includes("--mock");
let stage = "configuration";

function resolveMiniflareRootFromPnpm() {
	const pathEntries = (process.env.PATH ?? "").split(path.delimiter);
	const binDirectory = pathEntries.find(
		(directory) =>
			path.isAbsolute(directory) &&
			path.basename(directory).toLowerCase() === ".bin" &&
			existsSync(path.join(path.dirname(directory), "wrangler")),
	);
	if (!binDirectory) throw new Error("local runtime unavailable");
	const nodeModules = path.dirname(binDirectory);
	const wranglerPath = realpathSync(path.join(nodeModules, "wrangler"));
	const packageRequire = createRequire(
		path.join(wranglerPath, "package.json"),
	);
	let packageDirectory = path.dirname(packageRequire.resolve("miniflare"));
	while (true) {
		const manifest = path.join(packageDirectory, "package.json");
		if (existsSync(manifest)) {
			const packageJson = JSON.parse(readFileSync(manifest, "utf8"));
			if (packageJson.name === "miniflare") {
				return realpathSync(packageDirectory);
			}
		}
		const parent = path.dirname(packageDirectory);
		if (parent === packageDirectory) break;
		packageDirectory = parent;
	}
	throw new Error("local runtime unavailable");
}

function loadMiniflareRuntime(packageRoot) {
	const packageRequire = createRequire(
		path.join(packageRoot, "package.json"),
	);
	const miniflarePackage = packageRequire("miniflare");
	if (
		typeof miniflarePackage.Miniflare !== "function" ||
		typeof miniflarePackage.convertV4MiniflareOptions !== "function"
	) {
		throw new Error("local runtime unavailable");
	}
	return miniflarePackage;
}

function mockUpstream(request) {
	const pathName = new URL(request.url).pathname;
	const data =
		pathName === "/geo/v2/city/lookup"
			? {
					code: "200",
					location: [
						{ adm2: "北京", name: "东城", type: "district" },
					],
				}
			: {
					metadata: {
						tag: "local-mock",
						attributions: [
							"https://developer.qweather.com/attribution.html",
						],
					},
					condition: { text: "多云", code: "101" },
					temperature: { value: 24.5, unit: "°C" },
				};
	return new Response(JSON.stringify(data), {
		headers: { "content-type": "application/json" },
		status: 200,
	});
}

async function main() {
	if (process.argv.includes("--resolve-runtime")) {
		const packageRoot = resolveMiniflareRootFromPnpm();
		const apiKeyPresent = process.env.QWEATHER_API_KEY !== undefined;
		process.stdout.write(`WEATHER_PROXY_MINIFLARE_ROOT:${packageRoot}\n`);
		process.stdout.write(
			`WEATHER_PROXY_BOOTSTRAP_KEY_PRESENT:${apiKeyPresent}\n`,
		);
		return;
	}
	if (!Number.isInteger(port) || port < 1 || port > 65535) {
		throw new Error("local proxy configuration invalid");
	}
	stage = "Wrangler configuration";
	const configText = readFileSync(
		path.join(weatherProxyDir, "wrangler.jsonc"),
		"utf8",
	);
	const wranglerConfig = JSON.parse(configText.replace(/,\s*([}\]])/g, "$1"));
	stage = "Miniflare runtime resolution";
	const packageRoot = process.env.WEATHER_PROXY_MINIFLARE_ROOT;
	if (!packageRoot) throw new Error("local runtime unavailable");
	const { Miniflare, convertV4MiniflareOptions } =
		loadMiniflareRuntime(packageRoot);
	const bindings = {
		...(wranglerConfig.vars ?? {}),
		QWEATHER_API_HOST: mockMode
			? "api9.example.qweather.test"
			: (process.env.QWEATHER_API_HOST ?? ""),
		QWEATHER_API_KEY: mockMode
			? "local-mock-key"
			: (process.env.QWEATHER_API_KEY ?? ""),
		QWEATHER_ACCOUNT_USAGE_CONFIRMED: mockMode
			? "true"
			: (process.env.QWEATHER_ACCOUNT_USAGE_CONFIRMED ?? "false"),
		QWEATHER_BILLING_MONTH: process.env.QWEATHER_BILLING_MONTH ?? "",
		QWEATHER_ACCOUNT_CALLS_USED:
			process.env.QWEATHER_ACCOUNT_CALLS_USED ?? "",
		QWEATHER_BILLING_MONTH_ALIGNED: mockMode
			? "true"
			: (process.env.QWEATHER_BILLING_MONTH_ALIGNED ?? "false"),
	};
	if (mockMode) {
		bindings.QWEATHER_BILLING_MONTH = new Date().toISOString().slice(0, 7);
		bindings.QWEATHER_ACCOUNT_CALLS_USED = "0";
	}
	stage = "Miniflare runtime setup";
	const miniflareOptions = convertV4MiniflareOptions({
		host,
		port,
		name: wranglerConfig.name,
		rootPath: repoRoot,
		modulesRoot: repoRoot,
		modules: [
			{
				type: "ESModule",
				path: path.resolve(weatherProxyDir, "src", "index.js"),
			},
			{
				type: "ESModule",
				path: path.resolve(weatherProxyDir, "src", "handler.js"),
			},
		],
		compatibilityDate: wranglerConfig.compatibility_date,
		bindings,
		durableObjects: {
			WEATHER_QUOTA: { className: "QuotaDO", useSQLite: true },
		},
		...(mockMode ? { outboundService: mockUpstream } : {}),
		resourcePersistencePath: path.join(
			weatherProxyDir,
			".wrangler",
			mockMode ? "miniflare-mock" : "miniflare-live",
		),
	});
	const miniflare = new Miniflare(miniflareOptions);
	stage = "Miniflare runtime startup";
	const ready = await miniflare.ready;
	if (ready.hostname !== host || Number(ready.port) !== port) {
		await miniflare.dispose();
		throw new Error("local proxy bound to an unexpected address");
	}
	process.stdout.write(
		`Local weather proxy test runtime listening at http://${host}:${port} (${mockMode ? "mock" : "live"}); press Ctrl+C to stop.\n`,
	);
	stage = "Miniflare runtime shutdown";
	const stop = () => {
		void miniflare.dispose().finally(() => process.exit(0));
	};
	process.once("SIGINT", stop);
	process.once("SIGTERM", stop);
}

main().catch((error) => {
	process.stderr.write(
		`Local weather proxy failed during ${stage} (${error?.name ?? "Error"}).\n`,
	);
	if (mockMode)
		process.stderr.write(`${error?.message ?? "No additional detail."}\n`);
	process.exitCode = 1;
});
