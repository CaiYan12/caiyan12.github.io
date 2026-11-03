// 判定 framenavigated 是否为 Swup 的 pushState 引起（而非整页刷新）。
// 判据：整页刷新会清空 window 上的运行时状态并重新解析文档；
//       pushState 只改 URL，document 与 window 状态全部保留。
//
// 用法：pnpm verify:live:swup [baseUrl]
// 关键坑（2026-11-03 实测）：标记必须写在 Swup 接管**之后**。若在 init 前写
//   window.xxx，Swup 替换容器时标记会消失，得到假的 alive=null；
//   正确等法是等 window.swup.navigate 出现。
// 来源：2026-11-03 从 output/live-verify-swup3.mjs 提升入库。
import { createRequire } from "node:module";

const req = createRequire(new URL("../package.json", import.meta.url));
const { chromium } = req("playwright");

const BASE = (process.argv[2] ?? "https://caiyan12.github.io").replace(
	/\/$/,
	"",
);
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
	viewport: { width: 1440, height: 900 },
});
const page = await ctx.newPage();

await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForFunction(
	() => !!window.swup && typeof window.swup.navigate === "function",
	null,
	{
		timeout: 20000,
	},
);

// 在 document 上挂一个不可伪造的实例标记：整页刷新后 document 会被替换，标记必然消失
await page.evaluate(() => {
	document.__docMark = "original-document";
	window.__winMark = "original-window";
	window.__swupNextVisitCount = 0;
	window.swup.hooks.on("visit:start", () => {
		window.__swupNextVisitCount += 1;
	});
});

const before = await page.evaluate(() => ({
	docMark: document.__docMark ?? null,
	performanceNavCount: performance.getEntriesByType("navigation").length,
}));

const href = await page.evaluate(() => {
	const main = document.querySelector("main");
	const a = [
		...(main ?? document).querySelectorAll('a[href^="/posts/"]'),
	].find((x) => {
		const b = x.getBoundingClientRect();
		return b.width > 0 && b.height > 0;
	});
	return a ? a.getAttribute("href") : null;
});

await page.locator(`main a[href="${href}"]`).first().click();
await page
	.waitForURL((u) => u.pathname === href, { timeout: 20000 })
	.catch(() => {});
await page.waitForTimeout(2500);

const after = await page.evaluate(() => ({
	docMark: document.__docMark ?? null,
	winMark: window.__winMark ?? null,
	swupVisits: window.__swupNextVisitCount ?? null,
	path: location.pathname,
	performanceNavCount: performance.getEntriesByType("navigation").length,
}));

console.log("=== Swup 是否真正接管（document 级证据）===");
console.log("before:", JSON.stringify(before));
console.log("after :", JSON.stringify(after));
console.log();

const docPreserved = after.docMark === "original-document";
const winPreserved = after.winMark === "original-window";
const swupRan = (after.swupVisits ?? 0) >= 1;

console.log(
	`${docPreserved ? "PASS" : "FAIL"}  document 实例未被替换（整页刷新会换掉它）`,
);
console.log(`${winPreserved ? "PASS" : "FAIL"}  window 状态未被清空`);
console.log(
	`${swupRan ? "PASS" : "FAIL"}  Swup visit:start 钩子被触发 ${after.swupVisits} 次`,
);
console.log();
console.log(
	`结论：${docPreserved && winPreserved && swupRan ? "Swup 接管成功，framenavigated 是 pushState 的判定伪影" : "需要进一步排查"}`,
);

await ctx.close();
await browser.close();
