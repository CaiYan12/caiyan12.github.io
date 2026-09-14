import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
	normalizeFriendUrl,
	parseIconCandidates,
	fetchFriendIcons,
	readManifest,
} from "./fetch-friend-icons.mjs";

async function tempFixture() {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), "friend-icons-test-"));
	const publicRoot = path.join(root, "public");
	await fs.mkdir(publicRoot, { recursive: true });
	return {
		root,
		publicRoot,
		manifestPath: path.join(root, "friend-icons.json"),
	};
}

function response(body, { url = "https://example.test/", contentType = "text/html", status = 200 } = {}) {
	const bytes = typeof body === "string" ? new TextEncoder().encode(body) : body;
	return {
		ok: status >= 200 && status < 300,
		status,
		url,
		headers: new Headers({ "content-type": contentType, "content-length": String(bytes.length) }),
		arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
		text: async () => new TextDecoder().decode(bytes),
	};
}

function pngBytes() {
	return Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
}

test("normalizeFriendUrl removes fragment/default port and keeps path/query", () => {
	assert.equal(
		normalizeFriendUrl("HTTPS://Example.test:443/path?q=1#frag"),
		"https://example.test/path?q=1",
	);
	assert.equal(normalizeFriendUrl("http://Example.test:80"), "http://example.test/");
	assert.throws(() => normalizeFriendUrl("ftp://example.test/"), /HTTP\/HTTPS/);
});

test("parseIconCandidates follows rel tokens case-insensitively and resolves against final URL", () => {
	const html = `<!doctype html><link REL="SHORTCUT ICON icon" href="/a.ico"><link rel="apple-touch-icon" href="icons/apple.png"><link rel="ICON" href="/ignored.png">`;
	assert.deepEqual(parseIconCandidates(html, "https://example.test/redirected/page"), [
		"https://example.test/ignored.png",
		"https://example.test/a.ico",
		"https://example.test/redirected/icons/apple.png",
	]);
});

test("fetchFriendIcons fetches remote avatar first, writes manifest and stable asset", async () => {
	const fixture = await tempFixture();
	const calls = [];
	const friends = [{ name: "A", url: "https://Example.test:443/", description: "", tags: [], avatar: "https://cdn.test/avatar.png" }];
	const result = await fetchFriendIcons({
		friends,
		publicRoot: fixture.publicRoot,
		manifestPath: fixture.manifestPath,
		now: () => "2026-09-14T00:00:00.000Z",
		fetchImpl: async (url) => {
			calls.push(url);
			return response(pngBytes(), { url, contentType: "image/png" });
		},
	});
	assert.equal(calls.length, 1);
	assert.equal(result.entries.length, 1);
	assert.match(result.entries[0].localPath, /^\/friend-icons\/[a-f0-9]{16}\.png$/);
	assert.equal(result.entries[0].sourceUrl, "https://cdn.test/avatar.png");
	assert.equal(result.entries[0].contentType, "image/png");
	assert.equal(result.entries[0].byteSize, 9);
	assert.deepEqual(await fs.readFile(path.join(fixture.publicRoot, result.entries[0].localPath)), Buffer.from(pngBytes()));
	assert.equal((await readManifest(fixture.manifestPath)).schemaVersion, 1);
});

test("local root-relative avatar is verified and avoids network", async () => {
	const fixture = await tempFixture();
	await fs.mkdir(path.join(fixture.publicRoot, "images"), { recursive: true });
	await fs.writeFile(path.join(fixture.publicRoot, "images", "avatar.png"), pngBytes());
	let called = false;
	const result = await fetchFriendIcons({
		friends: [{ name: "A", url: "https://example.test/", description: "", tags: [], avatar: "/images/avatar.png" }],
		publicRoot: fixture.publicRoot,
		manifestPath: fixture.manifestPath,
		fetchImpl: async () => { called = true; throw new Error("network"); },
	});
	assert.equal(called, false);
	assert.equal(result.entries[0].localPath, "/images/avatar.png");
});

test("HTML candidates fall back after bad icon and preserve final redirect URL", async () => {
	const fixture = await tempFixture();
	const calls = [];
	const html = '<link rel="icon" href="bad.svg"><link rel="shortcut icon" href="ok.webp">';
	const result = await fetchFriendIcons({
		friends: [{ name: "A", url: "https://example.test/start", description: "", tags: [] }],
		publicRoot: fixture.publicRoot,
		manifestPath: fixture.manifestPath,
		fetchImpl: async (url) => {
			calls.push(url);
			if (url === "https://example.test/start") return response(html, { url: "https://example.test/final/index.html" });
			if (url.endsWith("bad.svg")) return response("<svg/>", { url, contentType: "image/svg+xml" });
			return response(Uint8Array.from([...Buffer.from("RIFF"), 0, 0, 0, 0, ...Buffer.from("WEBP")]), { url, contentType: "image/webp" });
		},
	});
	assert.deepEqual(calls, [
		"https://example.test/start",
		"https://example.test/final/bad.svg",
		"https://example.test/final/ok.webp",
	]);
	assert.equal(result.entries[0].sourceUrl, "https://example.test/final/ok.webp");
	assert.equal(result.entries[0].localPath.endsWith(".webp"), true);
});

test("normal mode skips valid cache, refresh fetches, and failed refresh keeps old bytes", async () => {
	const fixture = await tempFixture();
	const friends = [{ name: "A", url: "https://example.test/", description: "", tags: [], avatar: "https://cdn.test/a.png" }];
	const calls = [];
	const first = await fetchFriendIcons({
		friends, publicRoot: fixture.publicRoot, manifestPath: fixture.manifestPath,
		fetchImpl: async (url) => { calls.push(url); return response(pngBytes(), { url, contentType: "image/png" }); },
	});
	const oldPath = path.join(fixture.publicRoot, first.entries[0].localPath);
	const oldBytes = await fs.readFile(oldPath);
	const second = await fetchFriendIcons({
		friends, publicRoot: fixture.publicRoot, manifestPath: fixture.manifestPath,
		fetchImpl: async () => { throw new Error("must not fetch"); },
	});
	assert.equal(second.entries[0].localPath, first.entries[0].localPath);
	assert.equal(calls.length, 1);
	const refreshed = await fetchFriendIcons({
		friends, publicRoot: fixture.publicRoot, manifestPath: fixture.manifestPath, refresh: true,
		fetchImpl: async () => { throw new Error("offline"); },
	});
	assert.equal(refreshed.entries[0].localPath, first.entries[0].localPath);
	assert.deepEqual(await fs.readFile(oldPath), oldBytes);
	assert.equal(refreshed.entries[0].status, "kept-old");
});

test("duplicate and invalid friends are handled without duplicate requests", async () => {
	const fixture = await tempFixture();
	const calls = [];
	const result = await fetchFriendIcons({
		friends: [
			{ name: "A", url: "https://example.test/#one", description: "", tags: [] },
			{ name: "B", url: "https://EXAMPLE.test/", description: "", tags: [] },
			{ name: "C", url: "javascript:alert(1)", description: "", tags: [] },
		],
		publicRoot: fixture.publicRoot,
		manifestPath: fixture.manifestPath,
		fetchImpl: async (url) => { calls.push(url); return response(pngBytes(), { url, contentType: "image/png" }); },
	});
	assert.equal(calls.length, 2);
	assert.equal(result.entries.length, 1);
	assert.equal(result.fallbacks.length, 1);
});

test("bad MIME, signature and oversized body produce fallback and no temporary files", async () => {
	const fixture = await tempFixture();
	const result = await fetchFriendIcons({
		friends: [{ name: "A", url: "https://example.test/", description: "", tags: [], avatar: "https://cdn.test/a.png" }],
		publicRoot: fixture.publicRoot,
		manifestPath: fixture.manifestPath,
		maxBytes: 4,
		fetchImpl: async (url) => response(new Uint8Array(8), { url, contentType: "image/png" }),
	});
	assert.equal(result.fallbacks.length, 1);
	assert.deepEqual((await fs.readdir(fixture.publicRoot)).filter((name) => name.endsWith(".tmp")), []);
});

test("hung requests time out and continue without leaving temporary files", async () => {
	const fixture = await tempFixture();
	const result = await fetchFriendIcons({
		friends: [{ name: "A", url: "https://example.test/", description: "", tags: [], avatar: "https://cdn.test/a.png" }],
		publicRoot: fixture.publicRoot,
		manifestPath: fixture.manifestPath,
		timeoutMs: 5,
		fetchImpl: async () => new Promise(() => {}),
	});
	assert.equal(result.fallbacks.length, 1);
	assert.deepEqual((await fs.readdir(fixture.publicRoot)).filter((name) => name.endsWith(".tmp")), []);
});
