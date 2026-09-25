// scripts/lib/atomic-write.mjs 的契约测试。
// 原先这些断言散在 fetch-friend-icons.test.mjs 里（因为它自己实现了这份逻辑）；
// 实现搬进 lib 后，测试跟着契约走，四个生成脚本共用同一份证明。
// 全部用注入的 fsImpl，不碰真实仓库文件、不访问网络。
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { atomicWrite, atomicWriteJson } from "./atomic-write.mjs";

async function tempDir() {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), "atomic-write-test-"));
	return {
		root,
		target: path.join(root, "artifact.json"),
		leftovers: async () =>
			(await fs.readdir(root)).filter(
				(name) => name.includes(".tmp-") || name.includes(".bak-"),
			),
	};
}

test("atomicWriteJson 写出可被 Prettier 接受的排版，且不留下临时文件", async () => {
	const dir = await tempDir();
	await atomicWriteJson(dir.target, { b: [1, 2, 3], a: "x" });
	const text = await fs.readFile(dir.target, "utf8");
	assert.match(text, /^\{/u, "应是缩进后的 JSON 而不是单行 stringify");
	assert.ok(text.includes('"b"'));
	assert.deepEqual(await dir.leftovers(), []);
	await fs.rm(dir.root, { recursive: true, force: true });
});

test("写入中途失败：旧文件字节不变，且不留临时文件", async () => {
	const dir = await tempDir();
	await fs.writeFile(dir.target, "OLD");
	const fsImpl = {
		...fs,
		writeFile: async () => {
			throw new Error("disk full");
		},
	};
	await assert.rejects(
		atomicWrite(dir.target, Buffer.from("NEW"), fsImpl),
		/disk full/u,
	);
	assert.equal(await fs.readFile(dir.target, "utf8"), "OLD");
	assert.deepEqual(await dir.leftovers(), []);
	await fs.rm(dir.root, { recursive: true, force: true });
});

test("目标已存在时 rename 被拒：走备份位安装新内容，并清理备份", async () => {
	const dir = await tempDir();
	await fs.writeFile(dir.target, "OLD");
	const renamePaths = [];
	let first = true;
	const fsImpl = {
		...fs,
		rename: async (from, to) => {
			renamePaths.push([from, to]);
			if (first) {
				first = false;
				const error = new Error("target exists");
				error.code = "EEXIST";
				throw error;
			}
			return fs.rename(from, to);
		},
	};
	await atomicWrite(dir.target, Buffer.from("NEW"), fsImpl);
	assert.equal(await fs.readFile(dir.target, "utf8"), "NEW");
	// 第一次 rename 是「临时 → 目标」，失败后应是「目标 → 备份」再「临时 → 目标」
	assert.match(path.basename(renamePaths[1][1]), /^artifact\.json\.bak-/u);
	assert.deepEqual(await dir.leftovers(), []);
	await fs.rm(dir.root, { recursive: true, force: true });
});

test("换装第二步也被打断：把备份放回去，旧字节不丢", async () => {
	const dir = await tempDir();
	await fs.writeFile(dir.target, "OLD");
	let renames = 0;
	const fsImpl = {
		...fs,
		rename: async (from, to) => {
			renames += 1;
			// 1: tmp→target 失败（目标存在）；2: target→backup 成功；3: tmp→target 再失败
			if (renames === 1 || renames === 3) {
				const error = new Error(
					renames === 1 ? "target exists" : "antivirus lock",
				);
				error.code = renames === 1 ? "EEXIST" : "EACCES";
				throw error;
			}
			return fs.rename(from, to);
		},
	};
	await assert.rejects(
		atomicWrite(dir.target, Buffer.from("NEW"), fsImpl),
		/antivirus lock/u,
	);
	assert.equal(
		await fs.readFile(dir.target, "utf8"),
		"OLD",
		"回滚必须把旧内容放回去",
	);
	// 这条断言是变异逼出来的：把 finally 里的 rm(temporary) 拆掉时，
	// 只有这里能发现目标目录里躺着一个 .tmp- 孤儿。
	assert.deepEqual(
		await dir.leftovers(),
		[],
		"被打断的写入不得留下 .tmp / .bak 孤儿",
	);
	await fs.rm(dir.root, { recursive: true, force: true });
});

test("同一目标的并发写被串行化，不出现交错", async () => {
	const dir = await tempDir();
	await Promise.all([
		atomicWrite(dir.target, Buffer.from("A".repeat(2048))),
		atomicWrite(dir.target, Buffer.from("B".repeat(4096))),
	]);
	const final = await fs.readFile(dir.target, "utf8");
	assert.ok(
		final === "A".repeat(2048) || final === "B".repeat(4096),
		`最终内容必须是两次写入之一的完整字节，实际长度 ${final.length}`,
	);
	assert.deepEqual(await dir.leftovers(), []);
	await fs.rm(dir.root, { recursive: true, force: true });
});
