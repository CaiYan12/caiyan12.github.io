// 构建前的依赖一致性断言：确认 node_modules 里真正装着 package.json 声明的版本。
//
// 为什么需要（2026-11-05 Satori 升级实测）：合并 package.json 不会重装 node_modules，
// 集成 worktree 里声明已是 satori 0.63.2、磁盘上仍是 0.26.0，dist 是旧产物，
// 而 OG 断言 33/33 全绿——验的根本不是新依赖。CI 有 --frozen-lockfile，本机没有。
//
// 只覆盖「换了就等于换了渲染结果」的关键包；caret 声明只查包是否存在，
// 因为 ^x.y.z 允许装到更高版本，严格相等会误报。
//
// 用法：node scripts/verify-deps.mjs
// 退出码：0 通过；1 不一致。输出全 ASCII（Windows 控制台是 GBK，见 commands.md）。
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const WATCHED = ["astro", "satori", "tailwindcss"];

const ROOT = fileURLToPath(new URL("../", import.meta.url));

export function readDeclared(manifest, names = WATCHED) {
	const declared = {};
	for (const name of names) {
		const spec =
			manifest?.dependencies?.[name] ?? manifest?.devDependencies?.[name];
		if (typeof spec !== "string" || spec.length === 0) continue;
		declared[name] = {
			spec,
			version: spec.replace(/^[~^]/, ""),
			exact: !/^[~^]/.test(spec),
		};
	}
	return declared;
}

export function readInstalled(root, names = WATCHED) {
	const installed = {};
	for (const name of names) {
		const file = join(root, "node_modules", name, "package.json");
		if (!existsSync(file)) {
			installed[name] = null;
			continue;
		}
		try {
			installed[name] =
				JSON.parse(readFileSync(file, "utf8")).version ?? null;
		} catch {
			installed[name] = null;
		}
	}
	return installed;
}

export function compareVersions({ declared, installed }) {
	const errors = [];
	for (const [name, want] of Object.entries(declared)) {
		const got = installed[name] ?? null;
		if (got === null) {
			errors.push(
				`${name}: missing or unreadable in node_modules (want ${want.spec})`,
			);
			continue;
		}
		if (want.exact && got !== want.version) {
			errors.push(`${name}: declared ${want.version}, installed ${got}`);
		}
	}
	return {
		ok: errors.length === 0,
		errors,
		checked: Object.keys(declared).length,
	};
}

export function verifyDeps({ root = ROOT, manifest, installed } = {}) {
	const declared = readDeclared(
		manifest ??
			JSON.parse(readFileSync(join(root, "package.json"), "utf8")),
	);
	const actual = installed ?? readInstalled(root, Object.keys(declared));
	return compareVersions({ declared, installed: actual });
}

const isCli =
	process.argv[1] &&
	import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isCli) {
	const result = verifyDeps();
	if (!result.ok) {
		for (const error of result.errors) console.error(`[deps] ${error}`);
		console.error("[deps] run: pnpm install --frozen-lockfile");
		process.exit(1);
	}
	console.log(`[deps] OK: ${result.checked} key deps match package.json`);
}
