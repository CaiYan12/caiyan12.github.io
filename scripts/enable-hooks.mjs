// pnpm `prepare` hook (runs on `pnpm install`): point core.hooksPath at
// .githooks/ unless it is already set to something else. Never silently
// overwrites an existing value; never fails the install.
import { spawnSync } from "node:child_process";
import { chmodSync } from "node:fs";

function git(...args) {
	return spawnSync("git", args, { encoding: "utf8" });
}

const probe = git("rev-parse", "--git-dir");
if (probe.status !== 0) {
	console.log("[hooks-setup] not a git repository; skipping hook setup.");
	process.exit(0);
}

const DESIRED = ".githooks";
const current = git("config", "--get", "core.hooksPath");
const value = (current.stdout ?? "").trim();

if (value === DESIRED) {
	console.log("[hooks-setup] core.hooksPath already points at .githooks.");
	process.exit(0);
}
if (value !== "") {
	console.warn(
		`[hooks-setup] core.hooksPath is already set to "${value}" — NOT overwriting.`,
	);
	console.warn(
		"[hooks-setup] to enable the prettier pre-commit gate, set it manually (or remove the current value first):",
	);
	console.warn("  git config core.hooksPath .githooks");
	process.exit(0);
}

const set = git("config", "core.hooksPath", DESIRED);
if (set.status !== 0) {
	console.warn(
		"[hooks-setup] failed to set core.hooksPath; skipping (nothing was changed).",
	);
	console.warn((set.stderr ?? "").trim());
	process.exit(0);
}
// POSIX clones: Git ignores hooks without the executable bit (githooks docs).
// Windows ignores the bit, so this is a no-op there; on Linux/macOS a fresh
// checkout lands as 100644 and needs this to actually run.
try {
	chmodSync(new URL("../.githooks/pre-commit", import.meta.url), 0o755);
} catch {
	// non-fatal: the manual fix is `chmod +x .githooks/pre-commit`
}
console.log(
	`[hooks-setup] enabled: core.hooksPath=${DESIRED} (prettier gate on commit; see .githooks/README.md).`,
);
