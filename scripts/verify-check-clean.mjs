import { spawnSync } from "node:child_process";

// 断言 astro check 真的没有 warning——不能只看它自己的 summary。
//
// 背景（2026-11-15 实测）：astro check 逐条打印 5 条 `- warning ts(...)` 诊断，
// 末尾 summary 却写「0 warnings / 5 hints」。只看 summary 的门等于没有门。
// 允许清单只有 ts(6387)：copy-link.ts 的 document.execCommand 是 Clipboard API
// 不可用时唯一可用的回退，属有意保留的废弃 API；新增任何其它 warning 都会翻红。
//
// 用法：pnpm check（= 本脚本）；也可 node scripts/verify-check-clean.mjs 直接跑。
const ALLOWED_CODES = new Set(["ts(6387)"]);
const ANSI = /\u001b\[[0-9;]*m/g;
const DIAGNOSTIC = /^(.+?):\d+:\d+ - warning (ts\(\d+\)):/;

const result = spawnSync("pnpm exec astro check", {
	shell: true,
	encoding: "utf8",
});
if (result.error) {
	console.error(`[check] 无法运行 astro check：${result.error.message}`);
	process.exit(1);
}
const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
process.stdout.write(output);

const warnings = [];
for (const line of output.replace(ANSI, "").split(/\r?\n/)) {
	const match = line.match(DIAGNOSTIC);
	if (match) warnings.push({ file: match[1], code: match[2] });
}
const allowed = warnings.filter((warning) => ALLOWED_CODES.has(warning.code));
const blocking = warnings.filter((warning) => !ALLOWED_CODES.has(warning.code));
if (allowed.length > 0) {
	console.log(
		`[check] 允许 ${allowed.length} 条废弃 API 提示：${[...new Set(allowed.map((warning) => warning.code))].join(", ")}`,
	);
}
if (blocking.length > 0) {
	console.error(
		`[check] ${blocking.length} 条 warning 诊断（summary 可能仍写 0 warnings）：`,
	);
	for (const warning of blocking) {
		console.error(`  - ${warning.file} ${warning.code}`);
	}
	process.exit(1);
}
if (result.status !== 0) process.exit(result.status ?? 1);
console.log("[check] OK：0 条 warning 诊断");
