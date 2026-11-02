// 用真实 DOM + 可控浏览器时钟，覆盖 scroll/rAF 与防抖定时器跨相位的竞态。
import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import { chromium } from "playwright";

const fixture = `<style>body{margin:0}.post-body{margin-left:300px}h2{margin:0;height:400px}#sidebar{position:fixed;top:0;left:0;width:250px}nav{height:200px;overflow:auto}li{height:30px}ol{padding:0;margin:0;list-style:none}</style><aside id="sidebar"><nav data-article-toc><ol class="article-toc"></ol></nav></aside><article class="post-body">${Array.from({ length: 65 }, (_, i) => `<h2 id="h${i}">Chapter ${i}</h2>`).join("")}</article><script type="module">import {initArticleToc} from '/article-toc.js';initArticleToc();window.ready=true;</script>`;

for (const phase of ["early", "before-deadline"]) {
	test(`目录防抖：${phase} 改变阅读位置，rAF 尚未处理时也不能朝旧目标启动`, async () => {
		const sources = new Map();
		for (const [url, file] of [
			["/article-toc.js", "article-toc.ts"],
			["/reduced-motion", "reduced-motion.ts"],
		]) {
			sources.set(
				url,
				stripTypeScriptTypes(
					await readFile(
						new URL(
							`../src/utils/runtime/${file}`,
							import.meta.url,
						),
						"utf8",
					),
				),
			);
		}
		const server = createServer((req, res) => {
			res.setHeader(
				"content-type",
				sources.has(req.url) ? "text/javascript" : "text/html",
			);
			res.end(sources.get(req.url) ?? fixture);
		});
		await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
		const browser = await chromium.launch();
		try {
			const page = await browser.newPage({
				viewport: { width: 1200, height: 720 },
			});
			await page.clock.install({
				time: new Date("2026-11-02T12:00:00Z"),
			});
			await page.addInitScript(() => {
				window.__revealTimers = [];
				const schedule = window.setTimeout.bind(window);
				window.setTimeout = (fn, delay, ...args) => {
					if (
						delay !== 100 ||
						!new Error().stack.includes("article-toc.js")
					)
						return schedule(fn, delay, ...args);
					const row = {
						due: performance.now() + delay,
						fired: false,
					};
					window.__revealTimers.push(row);
					return schedule(() => {
						row.fired = true;
						fn(...args);
					}, delay);
				};
			});
			await page.goto(`http://127.0.0.1:${server.address().port}/`);
			await page.waitForFunction(() => window.ready);
			await page.clock.pauseAt(new Date("2026-11-02T12:01:00Z"));
			const scroll = (index) =>
				page.evaluate((i) => {
					window.scrollTo(
						0,
						document.getElementById(`h${i}`).offsetTop + 50,
					);
					window.dispatchEvent(new Event("scroll"));
				}, index);
			const probe = () =>
				page.evaluate(() => ({
					top: document.querySelector("nav").scrollTop,
					current: [...document.querySelectorAll("li")].findIndex(
						(li) => li.classList.contains("current"),
					),
				}));
			await scroll(50);
			await page.clock.runFor(1000);
			assert.deepEqual(await probe(), { top: 1415, current: 50 });
			await page.evaluate(() => {
				window.__revealTimers = [];
			});
			await scroll(55);
			await page.clock.runFor(32);
			assert.equal(
				(await probe()).current,
				55,
				"first target must really become active",
			);
			if (phase === "before-deadline") {
				const remaining = await page.evaluate(
					() => window.__revealTimers.at(-1).due - performance.now(),
				);
				await page.clock.runFor(remaining - 4);
			}
			assert.equal(
				await page.evaluate(() => window.__revealTimers.at(-1).fired),
				false,
				"test must start before old debounce fires, not during an in-flight animation",
			);
			await scroll(45);
			await page.clock.runFor(48);
			assert.deepEqual(
				await probe(),
				{ top: 1415, current: 45 },
				"container must remain still while latest target is inside quiet window",
			);
			await page.clock.runFor(600);
			assert.deepEqual(await probe(), { top: 1265, current: 45 });
		} finally {
			await browser.close();
			await new Promise((resolve) => server.close(resolve));
		}
	});
}
