// Nice Books 统一 3D 几何运行时检查（缝隙 A 台子上的 QA，非门禁）
// 运行：pnpm qa:nice-books-geometry
// 默认打 127.0.0.1:4321（dev）；NICE_BOOKS_BASE_URL 传的是**完整页面地址**
// （http://host:port/books/），不是站点根——与 NICE_BOOKS_BASE_URL 在 smoke 里的形态一致。
//
// 2026-10-27 迁到 scripts/lib/smoke-harness.mjs（A-5）。迁移动机不是统一风格，而是
// 修掉一个静默失效：本文件原有的 check 签名是 check(ok, message)，与全站其余脚本的
// check(name, ok, detail) **参数顺序相反**；从任意一套 smoke 复制一行判据过来，
// ok 会收到一个非空字符串（真值），于是永远 PASS。
import { makeHarness } from "./lib/smoke-harness.mjs";

const harness = makeHarness({
	envVar: "NICE_BOOKS_BASE_URL",
	// 与 smoke 有意不同：本脚本默认打 dev 4321，smoke 默认打 preview 4322。
	// 按台子的 defaultBase 显式声明，两条命令的默认端口都要保留。
	defaultBase: "http://127.0.0.1:4321/books/",
	launch: { headless: true },
});
const baseUrl = harness.base;
// 台子的 check 不返回布尔，所以返回值一律显式补上——调用点有 `return check(...)` 的写法。
const check = (name, ok, detail = "") => {
	harness.check(name, ok, detail);
	return Boolean(ok);
};
const browser = await harness.browser.launch(harness.launch);
const urls = {
	home: new URL("./", baseUrl).href,
	archive: new URL("archive/", baseUrl).href,
	detail: new URL("01/", baseUrl).href,
};
const viewports = [320, 390, 768, 1024, 1280];

async function inspectBooks(page, label) {
	const books = await page.locator(".nb-book3d").evaluateAll((nodes) =>
		nodes.map((root, index) => {
			const one = (selector) => root.querySelector(selector);
			const front = one(".nb-front-board");
			const back = one(".nb-back-board");
			const top = one(".nb-page-top");
			const fore = one(".nb-page-fore-edge");
			const bottom = one(".nb-page-bottom");
			const spine = one(".nb-spine-body");
			const obi = one(".nb-obi");
			const obiFront = one(".nb-obi-front");
			const obiCopy = one(".nb-sash-copy");
			const size = (node) => {
				if (!node) return null;
				const rect = node.getBoundingClientRect();
				return {
					width: node.offsetWidth,
					height: node.offsetHeight,
					x: rect.x,
					right: rect.right,
				};
			};
			const style = getComputedStyle(root);
			return {
				index,
				front: size(front),
				back: size(back),
				top: size(top),
				fore: size(fore),
				bottom: size(bottom),
				spine: size(spine),
				depth: Number.parseFloat(
					style.getPropertyValue("--book-depth"),
				),
				boardThickness: Number.parseFloat(
					style.getPropertyValue("--board-thickness"),
				),
				spinePatch: spine
					? getComputedStyle(spine, "::before").content
					: null,
				obi: obi
					? {
							front: size(obiFront),
							frontFold: size(one(".nb-obi-front-fold")),
							backReturn: size(one(".nb-obi-back-return")),
							frontOverflows:
								obiFront && obiCopy
									? obiCopy.getBoundingClientRect().bottom >
										obiFront.getBoundingClientRect()
											.bottom +
											0.5
									: true,
						}
					: null,
			};
		}),
	);
	check(
		`${label}: 有 Book3D 实例`,
		books.length > 0,
		`实例数=${books.length}`,
	);
	for (const book of books) {
		const prefix = `${label} book ${book.index}`;
		check(`${prefix}: 前封与后封都在`, Boolean(book.front && book.back));
		check(
			`${prefix}: 前后封尺寸一致`,
			book.front?.width === book.back?.width &&
				book.front?.height === book.back?.height,
		);
		check(
			`${prefix}: 页块三面面积有效`,
			Boolean(
				book.top &&
				book.fore &&
				book.bottom &&
				book.top.width > 0 &&
				book.top.height > 0 &&
				book.fore.width > 0 &&
				book.fore.height > 0,
			),
			book.top
				? `top=${book.top.width}×${book.top.height} fore=${book.fore?.width}×${book.fore?.height}`
				: "页块面缺失",
		);
		check(
			`${prefix}: 页块相对硬壳内缩`,
			Boolean(
				book.front &&
				book.top &&
				book.fore &&
				book.top.width < book.front.width &&
				book.fore.height < book.front.height,
			),
			book.front
				? `front=${book.front.width}×${book.front.height} top.width=${book.top?.width} fore.height=${book.fore?.height}`
				: "前封缺失",
		);
		const expectedPageDepth = book.depth * 2;
		check(
			`${prefix}: 书口厚度由 depth 推导`,
			Math.abs((book.fore?.width ?? 0) - expectedPageDepth) <= 1,
			`fore.width=${book.fore?.width} 期望=${expectedPageDepth}`,
		);
		check(
			`${prefix}: 书脊厚度由 depth 推导`,
			Math.abs((book.spine?.width ?? 0) - expectedPageDepth) <= 1,
			`spine.width=${book.spine?.width} 期望=${expectedPageDepth}`,
		);
		check(
			`${prefix}: 无书脊断口补丁`,
			book.spinePatch === "none" || book.spinePatch === "normal",
			`spinePatch=${book.spinePatch}`,
		);
		check(
			`${prefix}: 腰封前封/折边/回折齐备且文字不溢出`,
			!book.obi ||
				Boolean(
					book.obi.front &&
					book.obi.frontFold &&
					book.obi.backReturn &&
					!book.obi.frontOverflows,
				),
			book.obi
				? `frontFold=${book.obi.frontFold?.width} backReturn=${book.obi.backReturn?.width}`
				: "无腰封",
		);
		check(
			`${prefix}: 腰封前封折边未越过硬壳`,
			!book.obi ||
				Math.abs(
					(book.obi.frontFold?.width ?? 0) -
						(book.boardThickness + 3),
				) <= 1,
			`frontFold=${book.obi?.frontFold?.width} 期望=${book.boardThickness + 3}`,
		);
		check(
			`${prefix}: 腰封背封回折为窄边 6px`,
			!book.obi || book.obi.backReturn?.width === 6,
			`backReturn=${book.obi?.backReturn?.width}`,
		);
		check(
			`${prefix}: 腰封投影未遮住白色书口`,
			!book.obi ||
				Boolean(
					book.obi.frontFold &&
					book.obi.backReturn &&
					book.fore &&
					book.obi.backReturn.x - book.obi.frontFold.right > 1 &&
					book.fore.x < book.obi.backReturn.x &&
					book.fore.right > book.obi.frontFold.right,
				),
		);
	}
}

async function inspectDepthMutation(page) {
	const result = await page
		.locator(".nb-book3d")
		.first()
		.evaluate((root) => {
			const fore = root.querySelector(".nb-page-fore-edge");
			const spine = root.querySelector(".nb-spine-body");
			if (!fore || !spine) return null;
			const before = { fore: fore.offsetWidth, spine: spine.offsetWidth };
			const depth = Number.parseFloat(
				getComputedStyle(root).getPropertyValue("--book-depth"),
			);
			root.style.setProperty("--book-depth", `${depth + 8}px`);
			const after = { fore: fore.offsetWidth, spine: spine.offsetWidth };
			root.style.setProperty("--book-depth", `${depth}px`);
			return { before, after };
		});
	check(
		"depth 变化同步页块与书脊",
		Boolean(
			result &&
			result.after.fore - result.before.fore === 16 &&
			result.after.spine - result.before.spine === 16,
		),
		result
			? `fore Δ=${result.after.fore - result.before.fore} spine Δ=${result.after.spine - result.before.spine}`
			: "找不到 .nb-book3d / 页块 / 书脊",
	);
}

try {
	for (const width of viewports) {
		for (const [pageName, url] of Object.entries(urls)) {
			const page = await browser.newPage({
				viewport: { width, height: 900 },
			});
			await page.goto(url, { waitUntil: "networkidle" });
			await inspectBooks(page, `${pageName}@${width}`);
			const overflow = await page.evaluate(() => ({
				client: document.documentElement.clientWidth,
				scroll: document.documentElement.scrollWidth,
			}));
			check(
				`${pageName}@${width}: 无页面横向溢出`,
				overflow.scroll <= overflow.client + 1,
				`client=${overflow.client} scroll=${overflow.scroll}`,
			);
			if (pageName === "home" && width === 1280) {
				await inspectDepthMutation(page);
				await page.locator("#nb-today-shuffle").click();
				await page.waitForFunction(() => {
					const button = document.querySelector("#nb-today-shuffle");
					return (
						button instanceof HTMLButtonElement &&
						!button.disabled &&
						!button.hasAttribute("aria-busy")
					);
				});
				await inspectBooks(page, "home-shuffled@1280");
			}
			await page.close();
		}
	}

	const reduced = await browser.newPage({
		viewport: { width: 1280, height: 900 },
		reducedMotion: "reduce",
	});
	await reduced.goto(urls.home, { waitUntil: "networkidle" });
	await inspectBooks(reduced, "home-reduced-motion@1280");
	await reduced.close();
} finally {
	await browser.close();
}

// 汇总与退出码交给台子（与原实现口径一致：只按判据成败决定）。
harness.finish();
