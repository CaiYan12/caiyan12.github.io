import { chromium } from "playwright";

const baseUrl =
	process.env.NICE_BOOKS_BASE_URL ?? "http://127.0.0.1:4321/books/";
const urls = {
	home: new URL("./", baseUrl).href,
	archive: new URL("archive/", baseUrl).href,
	detail: new URL("01/", baseUrl).href,
};
const viewports = [320, 390, 768, 1024, 1280];
const failures = [];
let checks = 0;

function check(ok, message) {
	checks += 1;
	if (!ok) failures.push(message);
}

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
	check(books.length > 0, `${label}: 没有 Book3D 实例`);
	for (const book of books) {
		const prefix = `${label} book ${book.index}`;
		check(Boolean(book.front && book.back), `${prefix}: 缺少前封或后封`);
		check(
			book.front?.width === book.back?.width &&
				book.front?.height === book.back?.height,
			`${prefix}: 前后封尺寸不一致`,
		);
		check(
			Boolean(
				book.top &&
				book.fore &&
				book.bottom &&
				book.top.width > 0 &&
				book.top.height > 0 &&
				book.fore.width > 0 &&
				book.fore.height > 0,
			),
			`${prefix}: 页块面面积无效`,
		);
		check(
			Boolean(
				book.front &&
				book.top &&
				book.fore &&
				book.top.width < book.front.width &&
				book.fore.height < book.front.height,
			),
			`${prefix}: 页块没有相对硬壳内缩`,
		);
		const expectedPageDepth = book.depth * 2;
		check(
			Math.abs((book.fore?.width ?? 0) - expectedPageDepth) <= 1,
			`${prefix}: 书口厚度没有由 depth 推导`,
		);
		check(
			Math.abs((book.spine?.width ?? 0) - expectedPageDepth) <= 1,
			`${prefix}: 书脊厚度没有由 depth 推导`,
		);
		check(
			book.spinePatch === "none" || book.spinePatch === "normal",
			`${prefix}: 检测到书脊断口补丁`,
		);
		check(
			!book.obi ||
				Boolean(
					book.obi.front &&
						book.obi.frontFold &&
						book.obi.backReturn &&
						!book.obi.frontOverflows,
				),
			`${prefix}: 腰封缺少前封/前封折边/背封回折或文字溢出`,
		);
		check(
			!book.obi ||
				Math.abs(
					(book.obi.frontFold?.width ?? 0) -
						(book.boardThickness + 3),
				) <= 1,
			`${prefix}: 腰封前封折边越过硬壳并遮挡书口`,
		);
		check(
			!book.obi || book.obi.backReturn?.width === 6,
			`${prefix}: 腰封背封回折不是预期窄边`,
		);
		check(
			!book.obi ||
				Boolean(
					book.obi.frontFold &&
						book.obi.backReturn &&
						book.fore &&
						book.obi.backReturn.x - book.obi.frontFold.right > 1 &&
						book.fore.x < book.obi.backReturn.x &&
						book.fore.right > book.obi.frontFold.right,
				),
			`${prefix}: 腰封投影遮住白色书口，前封折边与背封回折之间没有可见页块`,
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
		Boolean(
			result &&
			result.after.fore - result.before.fore === 16 &&
			result.after.spine - result.before.spine === 16,
		),
		"depth 变化没有同步页块与书脊",
	);
}

const browser = await chromium.launch({ headless: true });
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
				overflow.scroll <= overflow.client + 1,
				`${pageName}@${width}: 页面横向溢出 ${JSON.stringify(overflow)}`,
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

console.log(JSON.stringify({ checks, failures }, null, 2));
if (failures.length) process.exitCode = 1;
