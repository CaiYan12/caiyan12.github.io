// 全仓行尾一致性检查：同一份文本文件里不许混用 CRLF 与裸 LF。
//
// 为什么是这个判据（2026-11-05 实测 293 个文本文件）：core.autocrlf=true，
// Git blob 统一是 LF，工作区里 124 个文件本来就是纯 LF、其余纯 CRLF、0 个混合。
// 强制全仓 CRLF 会误报那 124 个；混合行尾则是确定性的坏状态，零误报。
//
// 用法：node scripts/verify-eol.mjs
// 退出码：0 无混合；1 发现混合。输出全 ASCII。
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { detectEol } from "./lib/eol.mjs";

const ROOT = fileURLToPath(new URL("../", import.meta.url));

const TEXT_EXT = new Set([
	".mjs",
	".js",
	".cjs",
	".ts",
	".astro",
	".svelte",
	".md",
	".css",
	".scss",
	".json",
	".yml",
	".yaml",
	".cjs",
	".txt",
	".html",
]);

export function scanTrackedFiles(root = ROOT, list = undefined) {
	const raw =
		list ??
		execFileSync("git", ["ls-files"], {
			cwd: root,
			encoding: "utf8",
			maxBuffer: 20 * 1024 * 1024,
		});
	const files = raw.split(/\r?\n/).filter((f) => {
		const dot = f.lastIndexOf(".");
		return dot >= 0 && TEXT_EXT.has(f.slice(dot).toLowerCase());
	});
	const mixed = [];
	for (const file of files) {
		const buffer = readFileSync(join(root, file));
		// 跳过二进制：含 NUL 的一律不看
		if (buffer.includes(0)) continue;
		if (detectEol(buffer.toString("utf8")) === "mixed") mixed.push(file);
	}
	return { scanned: files.length, mixed };
}

const isCli =
	process.argv[1] &&
	import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isCli) {
	const { scanned, mixed } = scanTrackedFiles();
	if (mixed.length > 0) {
		for (const file of mixed) console.error(`[eol] mixed CRLF/LF: ${file}`);
		console.error("[eol] keep one EOL style per file");
		process.exit(1);
	}
	console.log(`[eol] OK: ${scanned} tracked text files, 0 mixed EOL`);
}
