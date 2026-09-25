// 构建期产物的原子写契约（单一来源）。
//
// 这份实现原先住在 fetch-friend-icons.mjs 里（已导出、fs 可注入，与友链逻辑并不缠绕），
// 而 projects / contributions / site-stats 三个脚本各自又写了一份朴素的 tmp+rename。
// 提到这里之后：强的一份被四处共用，"崩溃不留半截文件"不再取决于哪个脚本先写。
//
// 为什么不是简单的 writeFile：Windows 上 rename 覆盖已存在目标可能被拒（杀毒软件常
// 短暂持有刚写入的文件），所以先把旧目标挪到唯一命名的备份位再装新文件；第二次 rename
// 被打断时把备份放回去。备份可能因杀毒持有而留下，那种情况下保留它而不是抛错——
// 原文件已经安全，多一个 .bak 目录项比丢缓存好。
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { formatJson } from "./write-json.mjs";

const atomicWriteLocks = new Map();

async function atomicWriteOnce(filePath, bytes, fsImpl) {
	await fsImpl.mkdir(path.dirname(filePath), { recursive: true });
	const operationId = crypto.randomUUID();
	const temporary = `${filePath}.tmp-${operationId}`;
	const backup = `${filePath}.bak-${operationId}`;
	let backupCreated = false;
	let preserveBackup = false;
	try {
		await fsImpl.writeFile(temporary, bytes);
		try {
			await fsImpl.rename(temporary, filePath);
		} catch (error) {
			let targetExists = true;
			try {
				await fsImpl.access(filePath);
			} catch {
				targetExists = false;
			}
			if (!targetExists) throw error;
			// Windows may reject rename-overwrite. Move the old target to a unique,
			// recoverable backup before installing the replacement, then restore it
			// if the second rename is interrupted.
			await fsImpl.rename(filePath, backup);
			backupCreated = true;
			try {
				await fsImpl.rename(temporary, filePath);
			} catch (replacementError) {
				try {
					await fsImpl.rename(backup, filePath);
					backupCreated = false;
				} catch (restoreError) {
					preserveBackup = true;
					replacementError.message += `; old cache restore failed: ${restoreError.message}`;
				}
				throw replacementError;
			}
		}
	} finally {
		await fsImpl.rm(temporary, { force: true });
		if (backupCreated && !preserveBackup) {
			try {
				await fsImpl.rm(backup, { force: true });
			} catch {
				// A recoverable backup may remain when antivirus software holds it.
			}
		}
	}
}

/**
 * 原子写字节/文本。同一目标的并发写按路径排队，后一次不会与前一次交错。
 * fsImpl 可注入（测试用内存假 fs），默认 node:fs/promises。
 */
export function atomicWrite(filePath, bytes, fsImpl = fs) {
	const lockKey = path.resolve(filePath);
	const previous = atomicWriteLocks.get(lockKey) ?? Promise.resolve();
	const operation = previous
		.catch(() => {})
		.then(() => atomicWriteOnce(filePath, bytes, fsImpl));
	atomicWriteLocks.set(lockKey, operation);
	return operation.finally(() => {
		if (atomicWriteLocks.get(lockKey) === operation)
			atomicWriteLocks.delete(lockKey);
	});
}

/**
 * 生成期 JSON 产物的原子写：排版走 write-json.mjs 的 formatJson（Prettier 可缺失时
 * 降级为 tab 缩进），调用方只交对象，不再各自 stringify + 各自 tmp+rename。
 */
export async function atomicWriteJson(filePath, value, fsImpl = fs) {
	const text = await formatJson(filePath, value);
	await atomicWrite(filePath, Buffer.from(text, "utf8"), fsImpl);
}
