// 文档里的版本号不能与 package.json 脱节。
//
// 为什么（2026-11-05 实测）：Astro 6.4.8 -> 7.4.4 上线后，README 头部徽章一直停在
// 6.4.8，直到站长自己发现。package.json / pnpm-lock.yaml 是唯一真源，
// docs/agents/build-and-deploy.md 里那张手写版本表已降级为「现测方式 + 真源指针」。
//
// 徽章允许写完整版本（7.4.4）或主次版本（4.3），两者都算与真源一致。
// 用法：node scripts/verify-doc-versions.mjs
// 退出码：0 一致；1 不一致。输出全 ASCII。
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));

export const BADGES = [
	{ label: "Astro", dep: "astro" },
	{ label: "Tailwind_CSS", dep: "tailwindcss" },
	{ label: "TypeScript", dep: "typescript" },
];

export function declaredVersion(manifest, dep) {
	const spec =
		manifest?.dependencies?.[dep] ??
		manifest?.devDependencies?.[dep] ??
		null;
	return typeof spec === "string" ? spec.replace(/^[~^]/, "") : null;
}

export function findBadge(readme, label) {
	const pattern = new RegExp(`badge/${label}-([0-9]+(?:\\.[0-9]+)*)-`);
	const match = pattern.exec(readme);
	return match ? match[1] : null;
}

export function versionMatches(badge, version) {
	if (badge === version) return true;
	const parts = version.split(".");
	return parts.length >= 2 && badge === `${parts[0]}.${parts[1]}`;
}

export function checkBadges({ readme, manifest }) {
	const errors = [];
	let checked = 0;
	for (const { label, dep } of BADGES) {
		const version = declaredVersion(manifest, dep);
		if (!version) continue;
		const badge = findBadge(readme, label);
		if (badge === null) {
			errors.push(`${label}: badge not found in README`);
			continue;
		}
		checked++;
		if (!versionMatches(badge, version)) {
			errors.push(`${label}: badge ${badge}, package.json ${version}`);
		}
	}
	return { ok: errors.length === 0, errors, checked };
}

// 维护文档若仍列着「现版本」表，逐行核对；降级为指针后该节无版本值，直接跳过。
export function checkVersionSection(docText, manifest) {
	const start = docText.indexOf("### 当前构建链版本");
	if (start < 0) return { ok: true, skipped: true, checked: 0 };
	const rest = docText.slice(start);
	const next = rest.indexOf("\n## ", 4);
	const section = next > 0 ? rest.slice(0, next) : rest;
	const pattern = /\|\s*`([^`]+)`\s*\|\s*\*\*([0-9][0-9.]*)\*\*/g;
	const errors = [];
	let checked = 0;
	let match;
	while ((match = pattern.exec(section)) !== null) {
		const [, name, value] = match;
		const version = declaredVersion(manifest, name);
		if (!version) continue;
		checked++;
		if (value !== version) {
			errors.push(`${name}: doc ${value}, package.json ${version}`);
		}
	}
	return {
		ok: errors.length === 0,
		errors,
		checked,
		skipped: checked === 0,
	};
}

const isCli =
	process.argv[1] &&
	import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isCli) {
	const manifest = JSON.parse(
		readFileSync(join(ROOT, "package.json"), "utf8"),
	);
	const readme = readFileSync(join(ROOT, "README.md"), "utf8");
	const doc = readFileSync(
		join(ROOT, "docs/agents/build-and-deploy.md"),
		"utf8",
	);
	const badges = checkBadges({ readme, manifest });
	const section = checkVersionSection(doc, manifest);
	const errors = [...badges.errors, ...section.errors];
	if (errors.length > 0) {
		for (const error of errors) console.error(`[docver] ${error}`);
		console.error("[docver] sync badges/version table with package.json");
		process.exit(1);
	}
	console.log(
		`[docver] OK: ${badges.checked} badges, version section ${section.skipped ? "degraded to pointer" : `${section.checked} rows`}`,
	);
}
