// Pre-commit gate: check the STAGED content (index blobs) with Prettier's
// official Node API — ignore rules, config resolution and the format decision
// all come from that API; no CLI output parsing. Scope matches CI
// (lint.yml: `prettier --check ./src ./docs`). Read-only: the index, the
// working tree, and every version-controlled file stay untouched.
// Bypass a single commit with `git commit --no-verify`.
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TAG = "[pre-commit]";

function git(args, opts = {}) {
	const r = spawnSync("git", args, {
		encoding: "buffer",
		maxBuffer: 64 * 1024 * 1024,
		...opts,
	});
	if (r.status !== 0) return null;
	return r.stdout;
}

const repo = git(["rev-parse", "--show-toplevel"])?.toString().trim();
if (!repo) {
	console.error(
		`${TAG} cannot determine the repository root; refusing to run with unclear scope.`,
	);
	process.exit(1);
}

// 1) Staged files. ACMR excludes deletions; -z keeps spaces/CJK paths intact.
const stagedRaw = git([
	"diff",
	"--cached",
	"--name-only",
	"-z",
	"--diff-filter=ACMR",
]);
const staged = stagedRaw
	? stagedRaw.toString("utf8").split("\0").filter(Boolean)
	: [];

// 2) Scope: src/ + docs/ only, same as CI. Everything else exits fast — the
//    Prettier requirement below only applies when there IS something to check.
const inScope = staged.filter(
	(f) => f.startsWith("src/") || f.startsWith("docs/"),
);
if (inScope.length === 0) process.exit(0);

// Contract: with in-scope staged files, a missing or broken Prettier install
// BLOCKS the commit — this is a gate, not a best-effort linter. (Distinct from
// scripts/enable-hooks.mjs, which only configures hooks during install and may
// skip gracefully.)
let prettier;
try {
	prettier = await import("prettier");
} catch (e) {
	console.error(
		`${TAG} cannot load prettier from node_modules (${e?.message ?? e}).`,
	);
	console.error(
		`${TAG} run \`pnpm install\` first, or bypass once with \`git commit --no-verify\`.`,
	);
	process.exit(1);
}

// 3) Config provenance: staged CONTENT is checked against the WORKING-TREE
//    config. If the effective config file is itself part of this commit, the
//    two can differ — say so loudly instead of silently claiming otherwise.
const ignorePath = path.join(repo, ".prettierignore");
try {
	const configFile = await prettier.resolveConfigFile(
		path.join(repo, inScope[0]),
	);
	const committedConfigs = staged.filter(
		(f) =>
			f === ".prettierignore" ||
			(configFile &&
				f === path.relative(repo, configFile).replaceAll("\\", "/")),
	);
	if (committedConfigs.length > 0) {
		console.warn(
			`${TAG} NOTE: ${committedConfigs.join(", ")} is being committed in this very commit.`,
		);
		console.warn(
			`${TAG} This check used the WORKING-TREE config, which may differ from the committed one. After committing, re-run the check if the config changed formatting rules.`,
		);
	}
} catch (e) {
	console.warn(
		`${TAG} NOTE: config file lookup failed (${e?.message ?? e}); proceeding with Prettier's own search.`,
	);
}

// 4) Per file: official API for ignore rules (full glob semantics), parser
//    inference, config resolution, and the format decision. Content comes
//    from the INDEX (`git show :<path>`), so partially staged files are
//    judged by what is actually being committed.
const unformatted = [];
const errors = [];
for (const f of inScope) {
	const abs = path.join(repo, ...f.split("/"));
	let info;
	try {
		info = await prettier.getFileInfo(abs, { ignorePath });
	} catch (e) {
		errors.push([f, `getFileInfo failed: ${e?.message ?? e}`]);
		continue;
	}
	if (info.ignored) continue; // covered by .prettierignore (glob-aware)
	if (!info.inferredParser) continue; // file type Prettier cannot parse
	const blob = git(["show", `:${f}`]);
	if (blob === null) {
		errors.push([f, "could not read staged content from the index"]);
		continue;
	}
	let config;
	try {
		config = (await prettier.resolveConfig(abs)) ?? {};
	} catch (e) {
		errors.push([f, `config resolution failed: ${e?.message ?? e}`]);
		continue;
	}
	// Anchor plugin references so loading does not depend on process cwd.
	// import.meta.resolve() resolves from THIS module's location (.githooks/
	// inside the repo), so bare package names hit the repo's node_modules —
	// the same resolution `pnpm exec prettier` gets — and return the real
	// entry file (ESM cannot import a bare directory path).
	if (Array.isArray(config.plugins)) {
		config.plugins = config.plugins.map((p) => {
			if (typeof p !== "string" || path.isAbsolute(p)) return p;
			if (p.startsWith(".")) return path.join(repo, p);
			try {
				return fileURLToPath(import.meta.resolve(p));
			} catch {
				return p; // let Prettier surface its own resolution error
			}
		});
	}
	try {
		const ok = await prettier.check(blob.toString("utf8"), {
			...config,
			filepath: f,
		});
		if (!ok) unformatted.push(f);
	} catch (e) {
		errors.push([
			f,
			`prettier could not process the staged content: ${String(e?.message ?? e).split("\n")[0]}`,
		]);
	}
}

if (errors.length > 0) {
	console.error(
		`${TAG} prettier could not process ${errors.length} staged file(s):`,
	);
	for (const [f, msg] of errors) console.error(`  ${f}\n    ${msg}`);
}
if (unformatted.length > 0) {
	console.error(
		`${TAG} staged file(s) not formatted (checked under src/ + docs/):`,
	);
	for (const f of unformatted) console.error(`  ${f}`);
}
if (errors.length > 0 || unformatted.length > 0) {
	console.error(
		`${TAG} fix the file(s) above, review the result, then re-stage, e.g.:`,
	);
	console.error(`  pnpm exec prettier --write <file>`);
	console.error(
		`${TAG} or bypass once with \`git commit --no-verify\` (CI runs the full check on push).`,
	);
	process.exit(1);
}
