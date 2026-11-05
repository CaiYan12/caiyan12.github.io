// 判据脚本里不许写死会随仓库增长的计数。
//
// 为什么（2026-11-05 实测）：verify-og-images.mjs 曾写 EXPECTED_COUNT = 33，
// 下一篇非草稿文章提交就会让 pnpm build 变红——不是产物坏了，是判据过期了。
// AGENTS.md 早有「不写会自己漂的计数」的文字规则，实现者与 /code-review 都没拦住，
// 所以改成确定性检查。期望值应由内容目录派生（见 countPublishedPosts()）。
//
// 扫描范围：scripts/verify-*.mjs，排除 *.test.mjs（测试里需要放反例样本）。
// 用法：node scripts/verify-no-hardcoded-counts.mjs
// 退出码：0 无命中；1 命中。输出全 ASCII。
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPTS_DIR = fileURLToPath(new URL(".", import.meta.url));

const PATTERN =
	/\b(?:const|let|var)\s+(EXPECTED_[A-Z0-9_]+)\s*=\s*\d+(?:\.\d+)?\b/g;

export function isTarget(name) {
	return /^verify-.*\.mjs$/.test(name) && !name.endsWith(".test.mjs");
}

export function findHardcodedCounts(text) {
	const hits = [];
	const lines = text.split(/\r?\n/);
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const trimmed = line.trimStart();
		// 注释里的示例不算命中，否则文档化的反例会把判据自己弄红
		if (
			trimmed.startsWith("//") ||
			trimmed.startsWith("*") ||
			trimmed.startsWith("/*")
		) {
			continue;
		}
		PATTERN.lastIndex = 0;
		let match;
		while ((match = PATTERN.exec(line)) !== null) {
			hits.push({ name: match[1], line: i + 1, text: line.trim() });
		}
	}
	return hits;
}

export function scanScripts(dir = SCRIPTS_DIR, read = readFileSync) {
	const hits = [];
	const files = readdirSync(dir).filter(isTarget).sort();
	for (const name of files) {
		const text = read(join(dir, name), "utf8");
		for (const hit of findHardcodedCounts(text)) {
			hits.push({ ...hit, file: `scripts/${name}` });
		}
	}
	return { files: files.length, hits };
}

const isCli =
	process.argv[1] &&
	import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isCli) {
	const { files, hits } = scanScripts();
	if (hits.length > 0) {
		for (const hit of hits) {
			console.error(
				`[counts] ${hit.file}:${hit.line} ${hit.name} -> ${hit.text}`,
			);
		}
		console.error(
			"[counts] derive expected values from the repo, do not hardcode them",
		);
		process.exit(1);
	}
	console.log(
		`[counts] OK: ${files} verify scripts, 0 hardcoded expectations`,
	);
}
