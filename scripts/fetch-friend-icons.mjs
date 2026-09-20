import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { parse } from "parse5";
import { pathToFileURL } from "node:url";
import defaultFriends from "../src/data/friends.json" with { type: "json" };

const REPO_ROOT = path.resolve(import.meta.dirname, "..");
const DEFAULT_PUBLIC_ROOT = path.join(REPO_ROOT, "public");
const DEFAULT_MANIFEST_PATH = path.join(
	REPO_ROOT,
	"src",
	"constants",
	"friend-icons.json",
);
export const FRIEND_ICON_SCHEMA_VERSION = 1;
export const FRIEND_ICON_USER_AGENT = "myblog-friend-icons/1.0";
export const DEFAULT_MAX_BYTES = 1024 * 1024;
export const DEFAULT_MAX_REDIRECTS = 5;
export const DEFAULT_TIMEOUT_MS = 10_000;
export const NEGATIVE_STATUSES = Object.freeze([
	"no-valid-icon",
	"http-error",
	"network-error",
	"timeout",
	"redirect-limit",
	"body-too-large",
	"invalid-image",
]);

const MIME_BY_KIND = {
	png: ["image/png"],
	jpeg: ["image/jpeg", "image/jpg"],
	webp: ["image/webp"],
	gif: ["image/gif"],
	ico: [
		"image/x-icon",
		"image/vnd.microsoft.icon",
		"image/ico",
		"image/icon",
	],
};

function fail(message) {
	throw new Error(message);
}

export function normalizeFriendUrl(value) {
	if (typeof value !== "string" || !value.trim())
		fail("friend URL must be a non-empty HTTP/HTTPS URL");
	let parsed;
	try {
		parsed = new URL(value.trim());
	} catch {
		fail(`invalid friend URL: ${value}`);
	}
	if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
		fail(`friend URL must use HTTP/HTTPS: ${value}`);
	}
	parsed.protocol = parsed.protocol.toLowerCase();
	parsed.hostname = parsed.hostname.toLowerCase();
	if (
		(parsed.protocol === "http:" && parsed.port === "80") ||
		(parsed.protocol === "https:" && parsed.port === "443")
	) {
		parsed.port = "";
	}
	parsed.hash = "";
	if (!parsed.pathname) parsed.pathname = "/";
	return parsed.href;
}

export const normalizeUrl = normalizeFriendUrl;

function normalizeCandidateUrl(value, base) {
	let parsed;
	try {
		parsed = new URL(value, base);
	} catch {
		return null;
	}
	if (parsed.protocol !== "http:" && parsed.protocol !== "https:")
		return null;
	return normalizeFriendUrl(parsed.href);
}

function relGroup(rel) {
	const tokens = String(rel ?? "")
		.toLowerCase()
		.split(/\s+/)
		.filter(Boolean);
	if (tokens.includes("apple-touch-icon")) return "apple-touch-icon";
	if (tokens.includes("shortcut") && tokens.includes("icon"))
		return "shortcut icon";
	if (tokens.includes("icon")) return "icon";
	return null;
}

export function parseIconCandidates(html, finalUrl) {
	const document = parse(String(html));
	const grouped = new Map([
		["icon", []],
		["shortcut icon", []],
		["apple-touch-icon", []],
	]);
	function visit(node) {
		if (node?.tagName === "link") {
			const attrs = new Map(
				(node.attrs ?? []).map(({ name, value }) => [
					name.toLowerCase(),
					value,
				]),
			);
			const group = relGroup(attrs.get("rel"));
			const href = attrs.get("href");
			const candidate =
				group && href ? normalizeCandidateUrl(href, finalUrl) : null;
			if (candidate && !grouped.get(group).includes(candidate))
				grouped.get(group).push(candidate);
		}
		for (const child of node?.childNodes ?? []) visit(child);
	}
	visit(document);
	return [...grouped.values()].flat();
}

function contentType(value) {
	return String(value ?? "")
		.split(";", 1)[0]
		.trim()
		.toLowerCase();
}

function validIsoTimestamp(value) {
	if (typeof value !== "string") return false;
	const parsed = new Date(value);
	return Number.isFinite(parsed.getTime()) && parsed.toISOString() === value;
}

const ALLOWED_CONTENT_TYPES = new Set(Object.values(MIME_BY_KIND).flat());

function validRootRelativePath(value) {
	return (
		typeof value === "string" &&
		value.startsWith("/") &&
		!value.startsWith("//") &&
		!value.includes("\\") &&
		!value.includes("\0") &&
		!value.includes("://") &&
		!value.split("/").some((segment) => segment === "." || segment === "..")
	);
}

function validSourceUrl(value) {
	if (typeof value !== "string") return false;
	if (validRootRelativePath(value)) return true;
	try {
		const parsed = new URL(value);
		return (
			(parsed.protocol === "http:" || parsed.protocol === "https:") &&
			normalizeFriendUrl(value) === value
		);
	} catch {
		return false;
	}
}

function validatePositiveEntry(entry, index, seenUrls) {
	const allowedKeys = [
		"friendUrl",
		"localPath",
		"sourceUrl",
		"contentType",
		"byteSize",
		"lastSuccessfulAt",
	];
	let normalizedUrl;
	try {
		normalizedUrl =
			typeof entry?.friendUrl === "string"
				? normalizeFriendUrl(entry.friendUrl)
				: null;
	} catch {
		normalizedUrl = null;
	}
	const valid =
		entry &&
		typeof entry === "object" &&
		!Array.isArray(entry) &&
		Object.keys(entry).length === allowedKeys.length &&
		allowedKeys.every((key) =>
			Object.prototype.hasOwnProperty.call(entry, key),
		) &&
		normalizedUrl === entry.friendUrl &&
		validRootRelativePath(entry.localPath) &&
		(entry.localPath.startsWith("/friend-icons/") ||
			validRootRelativePath(entry.localPath)) &&
		validSourceUrl(entry.sourceUrl) &&
		ALLOWED_CONTENT_TYPES.has(entry.contentType) &&
		Number.isSafeInteger(entry.byteSize) &&
		entry.byteSize > 0 &&
		entry.byteSize <= DEFAULT_MAX_BYTES &&
		validIsoTimestamp(entry.lastSuccessfulAt);
	if (!valid)
		throw new Error(
			`corrupt friend icon positive cache entry at index ${index}`,
		);
	if (seenUrls.has(entry.friendUrl))
		throw new Error(
			`duplicate friend icon positive cache entry: ${entry.friendUrl}`,
		);
	seenUrls.add(entry.friendUrl);
}

function detectKind(bytes) {
	if (
		bytes.length >= 8 &&
		bytes
			.slice(0, 8)
			.every(
				(v, i) =>
					v === [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a][i],
			)
	)
		return "png";
	if (
		bytes.length >= 3 &&
		bytes[0] === 0xff &&
		bytes[1] === 0xd8 &&
		bytes[2] === 0xff
	)
		return "jpeg";
	if (
		bytes.length >= 12 &&
		String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
		String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
	)
		return "webp";
	if (
		bytes.length >= 6 &&
		["GIF87a", "GIF89a"].includes(String.fromCharCode(...bytes.slice(0, 6)))
	)
		return "gif";
	if (
		bytes.length >= 4 &&
		bytes[0] === 0 &&
		bytes[1] === 0 &&
		bytes[2] === 1 &&
		bytes[3] === 0
	)
		return "ico";
	return null;
}

function verifyImage(bytes, type) {
	const kind = detectKind(bytes);
	if (!kind || !MIME_BY_KIND[kind].includes(type)) return null;
	return kind;
}

async function readResponseBytes(response, maxBytes, signal) {
	const declared = Number(response.headers?.get?.("content-length") ?? 0);
	if (declared > maxBytes)
		throw new Error(`response exceeds ${maxBytes} bytes`);
	if (response.body?.getReader) {
		const reader = response.body.getReader();
		const chunks = [];
		let total = 0;
		const cancel = () => reader.cancel?.().catch(() => {});
		signal?.addEventListener("abort", cancel, { once: true });
		try {
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				total += value.byteLength;
				if (total > maxBytes)
					throw new Error(`response exceeds ${maxBytes} bytes`);
				chunks.push(value);
			}
		} catch (error) {
			cancel();
			throw error;
		} finally {
			signal?.removeEventListener("abort", cancel);
			reader.releaseLock?.();
		}
		const output = new Uint8Array(total);
		let offset = 0;
		for (const chunk of chunks) {
			output.set(chunk, offset);
			offset += chunk.byteLength;
		}
		return output;
	}
	const raw =
		typeof response.arrayBuffer === "function"
			? await response.arrayBuffer()
			: new TextEncoder().encode(await response.text());
	const buffer = new Uint8Array(raw);
	if (buffer.byteLength > maxBytes)
		throw new Error(`response exceeds ${maxBytes} bytes`);
	return buffer;
}

async function withTimeout(operation, controller, timeoutMs) {
	let timeoutHandle;
	try {
		return await Promise.race([
			operation(),
			new Promise((_, reject) => {
				timeoutHandle = setTimeout(() => {
					controller.abort();
					reject(new Error(`request timed out after ${timeoutMs}ms`));
				}, timeoutMs);
			}),
		]);
	} finally {
		clearTimeout(timeoutHandle);
	}
}

async function fetchWithLimits(url, options) {
	const { fetchImpl, timeoutMs, maxBytes, maxRedirects } = options;
	let current = url;
	for (let redirects = 0; redirects <= maxRedirects; redirects += 1) {
		const controller = new AbortController();
		const request = () =>
			fetchImpl(current, {
				redirect: "manual",
				signal: controller.signal,
				headers: {
					Accept: "text/html,image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
					"User-Agent": FRIEND_ICON_USER_AGENT,
				},
			});
		const response = await withTimeout(
			request,
			controller,
			timeoutMs,
		).catch((error) => {
			if (
				controller.signal.aborted ||
				error.message?.includes("timed out")
			)
				throw new Error(`request timed out after ${timeoutMs}ms`);
			throw error;
		});
		if (response.status >= 300 && response.status < 400) {
			const location = response.headers?.get?.("location");
			if (!location)
				throw new Error(
					`redirect missing location (${response.status})`,
				);
			if (redirects === maxRedirects)
				throw new Error(`too many redirects (limit ${maxRedirects})`);
			current = normalizeCandidateUrl(location, response.url || current);
			if (!current)
				throw new Error("redirect target must use HTTP/HTTPS");
			continue;
		}
		if (!response.ok) throw new Error(`HTTP ${response.status}`);
		const bytes = await withTimeout(
			() => readResponseBytes(response, maxBytes, controller.signal),
			controller,
			timeoutMs,
		).catch((error) => {
			if (
				controller.signal.aborted ||
				error.message?.includes("timed out")
			)
				throw new Error(`request timed out after ${timeoutMs}ms`);
			throw error;
		});
		return {
			bytes,
			contentType: contentType(response.headers?.get?.("content-type")),
			url: normalizeFriendUrl(response.url || current),
		};
	}
	fail("unreachable redirect loop");
}

function localPathTarget(publicRoot, localPath) {
	if (
		typeof localPath !== "string" ||
		!localPath.startsWith("/") ||
		localPath.startsWith("//")
	)
		return null;
	const target = path.resolve(publicRoot, `.${localPath}`);
	const root = path.resolve(publicRoot);
	if (target !== root && !target.startsWith(`${root}${path.sep}`))
		return null;
	return target;
}

async function validLocalAsset(publicRoot, localPath, expectedEntry) {
	const target = localPathTarget(publicRoot, localPath);
	if (!target) return null;
	try {
		const stat = await fs.stat(target);
		if (!stat.isFile() || stat.size > DEFAULT_MAX_BYTES) return null;
		const bytes = new Uint8Array(await fs.readFile(target));
		const kind = detectKind(bytes);
		if (!kind) return null;
		if (
			expectedEntry &&
			(bytes.byteLength !== expectedEntry.byteSize ||
				!MIME_BY_KIND[kind].includes(expectedEntry.contentType))
		)
			return null;
		return { target, bytes, kind };
	} catch {
		return null;
	}
}

async function readManifest(manifestPath) {
	let text;
	try {
		text = await fs.readFile(manifestPath, "utf8");
	} catch (error) {
		if (error.code === "ENOENT")
			return {
				schemaVersion: FRIEND_ICON_SCHEMA_VERSION,
				entries: [],
				negativeEntries: [],
			};
		throw error;
	}
	let manifest;
	try {
		manifest = JSON.parse(text);
	} catch (error) {
		throw new Error(`corrupt friend icon manifest: ${error.message}`);
	}
	if (
		manifest?.schemaVersion !== FRIEND_ICON_SCHEMA_VERSION ||
		!Array.isArray(manifest.entries)
	)
		throw new Error("corrupt friend icon manifest schema");
	if (manifest.negativeEntries === undefined) manifest.negativeEntries = [];
	if (!Array.isArray(manifest.negativeEntries))
		throw new Error("corrupt friend icon negative cache schema");
	const positiveUrls = new Set();
	manifest.entries.forEach((entry, index) =>
		validatePositiveEntry(entry, index, positiveUrls),
	);
	const negativeUrls = new Set();
	manifest.negativeEntries.forEach((entry, index) => {
		let normalizedUrl;
		try {
			normalizedUrl =
				typeof entry?.friendUrl === "string"
					? normalizeFriendUrl(entry.friendUrl)
					: null;
		} catch {
			normalizedUrl = null;
		}
		if (
			!entry ||
			typeof entry !== "object" ||
			Array.isArray(entry) ||
			Object.keys(entry).some(
				(key) =>
					!["friendUrl", "lastAttemptedAt", "status"].includes(key),
			) ||
			normalizedUrl !== entry.friendUrl ||
			!validIsoTimestamp(entry.lastAttemptedAt) ||
			!NEGATIVE_STATUSES.includes(entry.status)
		) {
			throw new Error(
				`corrupt friend icon negative cache entry at index ${index}`,
			);
		}
		if (negativeUrls.has(entry.friendUrl))
			throw new Error(
				`duplicate friend icon negative cache entry: ${entry.friendUrl}`,
			);
		negativeUrls.add(entry.friendUrl);
	});
	return manifest;
}

export { readManifest };

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

function stableAssetName(friendUrl, kind) {
	return `${crypto.createHash("sha256").update(friendUrl).digest("hex").slice(0, 16)}.${kind}`;
}

function timestamp(now) {
	return typeof now === "function"
		? new Date(now()).toISOString()
		: new Date(now ?? Date.now()).toISOString();
}

function logLine(logger, status, friend, url) {
	logger?.log?.(`${status} ${friend.name || "friend"}`);
}

function classifyFailure(reason) {
	const message = String(reason ?? "").toLowerCase();
	if (message.includes("timed out")) return "timeout";
	if (message.includes("too many redirects")) return "redirect-limit";
	if (message.includes("exceeds")) return "body-too-large";
	if (message.includes("no valid icon")) return "no-valid-icon";
	if (message.includes("unsupported") || message.includes("mismatched"))
		return "invalid-image";
	if (/\bhttp \d{3}\b/.test(message)) return "http-error";
	return "network-error";
}

async function fetchImage(url, options) {
	const resource = await fetchWithLimits(url, options);
	const kind = verifyImage(resource.bytes, resource.contentType);
	if (!kind)
		throw new Error("unsupported or mismatched image MIME/signature");
	return { ...resource, kind };
}

async function processFriend(friend, context) {
	let normalized;
	try {
		normalized = normalizeFriendUrl(friend.url);
	} catch (error) {
		return { status: "fallback", reason: error.message };
	}
	const localAvatar =
		typeof friend.avatar === "string" &&
		friend.avatar.startsWith("/") &&
		!friend.avatar.startsWith("//")
			? friend.avatar
			: null;
	if (localAvatar) {
		const verified = await validLocalAsset(context.publicRoot, localAvatar);
		if (verified) {
			return {
				status: "fetched",
				entry: {
					friendUrl: normalized,
					localPath: localAvatar,
					sourceUrl: localAvatar,
					contentType: `image/${verified.kind === "jpeg" ? "jpeg" : verified.kind}`,
					byteSize: verified.bytes.byteLength,
					lastSuccessfulAt: timestamp(context.now),
				},
			};
		}
	}
	const candidates = [];
	if (
		typeof friend.avatar === "string" &&
		/^https?:\/\//i.test(friend.avatar)
	) {
		const avatarUrl = normalizeCandidateUrl(friend.avatar, normalized);
		if (avatarUrl) candidates.push(avatarUrl);
	}
	let pageUrl = normalized;
	for (const candidate of candidates) {
		try {
			const image = await fetchImage(candidate, context);
			return {
				status: "fetched",
				entry: makeEntry(normalized, image, context),
			};
		} catch {
			/* continue through candidates */
		}
	}
	try {
		const page = await fetchWithLimits(pageUrl, context);
		pageUrl = page.url;
		const html = new TextDecoder().decode(page.bytes);
		for (const candidate of [
			...parseIconCandidates(html, page.url),
			normalizeCandidateUrl("/favicon.ico", new URL(page.url).origin),
		]) {
			if (!candidate || candidates.includes(candidate)) continue;
			candidates.push(candidate);
			try {
				const image = await fetchImage(candidate, context);
				return {
					status: "fetched",
					entry: makeEntry(normalized, image, context),
				};
			} catch {
				/* continue */
			}
		}
	} catch (error) {
		return { status: "failed", reason: error.message };
	}
	return { status: "failed", reason: "no valid icon candidate" };
}

function makeEntry(friendUrl, image, context) {
	return {
		friendUrl,
		localPath: `/friend-icons/${stableAssetName(friendUrl, image.kind)}`,
		sourceUrl: image.url,
		contentType: image.contentType,
		byteSize: image.bytes.byteLength,
		lastSuccessfulAt: timestamp(context.now),
		bytes: image.bytes,
	};
}

export async function fetchFriendIcons(options = {}) {
	const maxBytes =
		options.maxBytes === undefined ? DEFAULT_MAX_BYTES : options.maxBytes;
	if (
		typeof maxBytes !== "number" ||
		!Number.isFinite(maxBytes) ||
		maxBytes <= 0 ||
		maxBytes > DEFAULT_MAX_BYTES
	) {
		fail(
			`maxBytes must be a finite number greater than 0 and no more than ${DEFAULT_MAX_BYTES}`,
		);
	}
	const context = {
		friends: options.friends ?? defaultFriends,
		publicRoot: options.publicRoot ?? DEFAULT_PUBLIC_ROOT,
		manifestPath: options.manifestPath ?? DEFAULT_MANIFEST_PATH,
		fetchImpl: options.fetchImpl ?? fetch,
		now: options.now ?? Date.now,
		timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
		maxBytes,
		maxRedirects: options.maxRedirects ?? DEFAULT_MAX_REDIRECTS,
		logger: options.logger ?? console,
	};
	const manifest = await readManifest(context.manifestPath);
	const byUrl = new Map(
		manifest.entries.map((entry) => [entry.friendUrl, entry]),
	);
	const negativeByUrl = new Map(
		manifest.negativeEntries.map((entry) => [entry.friendUrl, entry]),
	);
	for (const entry of manifest.entries) negativeByUrl.delete(entry.friendUrl);
	const entries = [];
	const fallbacks = [];
	const seen = new Set();
	for (const friend of context.friends) {
		let normalized;
		try {
			normalized = normalizeFriendUrl(friend.url);
		} catch {
			fallbacks.push({ friend, reason: "invalid URL" });
			logLine(context.logger, "FALLBACK", friend, friend.url ?? "");
			continue;
		}
		if (seen.has(normalized)) continue;
		seen.add(normalized);
		const oldEntry = byUrl.get(normalized);
		const oldAsset = oldEntry
			? await validLocalAsset(
					context.publicRoot,
					oldEntry.localPath,
					oldEntry,
				)
			: null;
		if (!options.refresh && oldAsset) {
			negativeByUrl.delete(normalized);
			entries.push(oldEntry);
			logLine(context.logger, "CACHED", friend, normalized);
			continue;
		}
		const negativeEntry = negativeByUrl.get(normalized);
		if (!options.refresh && negativeEntry && !oldAsset) {
			fallbacks.push({ friend, reason: negativeEntry.status });
			logLine(context.logger, "FALLBACK", friend, normalized);
			continue;
		}
		const result = await processFriend(friend, context);
		if (result.status === "fetched") {
			const entry = { ...result.entry };
			if (entry.bytes) {
				const target = path.join(
					context.publicRoot,
					entry.localPath.slice(1),
				);
				await atomicWrite(target, entry.bytes);
				delete entry.bytes;
			}
			byUrl.set(normalized, entry);
			negativeByUrl.delete(normalized);
			entries.push(entry);
			logLine(context.logger, "FETCHED", friend, entry.sourceUrl);
		} else if (oldEntry && oldAsset) {
			negativeByUrl.delete(normalized);
			entries.push({ ...oldEntry, status: "kept-old" });
			context.logger?.warn?.(
				`friend icon fetch failed for ${friend.name || "friend"} (${classifyFailure(result.reason)})`,
			);
			logLine(context.logger, "KEPT OLD", friend, normalized);
		} else {
			const failureStatus = classifyFailure(result.reason);
			negativeByUrl.set(normalized, {
				friendUrl: normalized,
				lastAttemptedAt: timestamp(context.now),
				status: failureStatus,
			});
			context.logger?.warn?.(
				`friend icon fetch failed for ${friend.name || "friend"} (${failureStatus})`,
			);
			fallbacks.push({ friend, reason: failureStatus });
			logLine(context.logger, "FALLBACK", friend, normalized);
		}
	}
	const retained = manifest.entries.filter(
		(entry) => !seen.has(entry.friendUrl),
	);
	const manifestEntries = entries.map(
		({ status: _status, ...entry }) => entry,
	);
	const allEntries = [
		...retained,
		...manifestEntries.filter(
			(entry) =>
				!retained.some((old) => old.friendUrl === entry.friendUrl),
		),
	];
	const nextManifest = {
		schemaVersion: FRIEND_ICON_SCHEMA_VERSION,
		entries: allEntries,
		negativeEntries: [...negativeByUrl.values()],
	};
	const previous = JSON.stringify(manifest, null, "\t");
	const next = JSON.stringify(nextManifest, null, "\t");
	if (previous !== next) await atomicWrite(context.manifestPath, `${next}\n`);
	return { entries, fallbacks, manifest: nextManifest };
}

async function main() {
	const refresh = process.argv.includes("--refresh");
	try {
		await fetchFriendIcons({ refresh });
	} catch (error) {
		console.error(`friend icon cache failed: ${error.message}`);
		process.exitCode = 1;
	}
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
	main();
