import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("./books.css", import.meta.url), "utf8");
const header = readFileSync(
	new URL("../components/SiteHeader.astro", import.meta.url),
	"utf8",
);
const detail = readFileSync(
	new URL("../../pages/books/[id].astro", import.meta.url),
	"utf8",
);
const footer = readFileSync(
	new URL("../components/SiteFooter.astro", import.meta.url),
	"utf8",
);
const archiveScript = readFileSync(
	new URL("../scripts/archive.ts", import.meta.url),
	"utf8",
);
const archivePage = readFileSync(
	new URL("../../pages/books/archive.astro", import.meta.url),
	"utf8",
);

test("书库载入控件保留 12 本初始页、异步忙碌态与收起回退契约", () => {
	assert.match(
		archivePage,
		/id="nb-btn-more"[\s\S]*?type="button"[\s\S]*?hidden/,
	);
	assert.match(
		archivePage,
		/id="nb-btn-collapse"[\s\S]*?type="button"[\s\S]*?hidden/,
	);
	assert.match(archiveScript, /const PAGE_SIZE = 12;/);
	assert.match(archiveScript, /const LOAD_STEP = 10;/);
	assert.match(archiveScript, /shown:\s*PAGE_SIZE/);
	assert.match(archiveScript, /filtered\.slice\(0, state\.shown\)/);
	assert.match(archiveScript, /state\.shown\s*=\s*PAGE_SIZE/);
	assert.match(archiveScript, /nb-btn-collapse/);
	assert.match(archiveScript, /button\.disabled = busy/);
	assert.match(archiveScript, /button\.setAttribute\("aria-busy", "true"\)/);
	assert.match(archiveScript, /label\.textContent = "加载中…"/);
	assert.match(archiveScript, /collapseButton\.hidden = !canCollapse/);
	assert.match(archiveScript, /收起/);
	assert.match(
		css,
		/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\.nb-archive-action:hover,[\s\S]*?transform:\s*none;/,
	);
});

test("导航与返回链接把下划线限制在文字层，同时保留 44px 点击区", () => {
	assert.match(header, /class="nb-site-nav-label"/);
	assert.match(detail, /nb-back-link inline-flex min-h-11 items-center/);
	assert.match(detail, /class="nb-back-link-label"/);
	assert.match(
		css,
		/\.nb-site-nav-label\s*\{[\s\S]*?border-bottom:\s*2px solid transparent;[\s\S]*?line-height:\s*1\.5;/,
	);
	assert.match(
		css,
		/\.nb-site-nav-link\[aria-current="page"\] \.nb-site-nav-label\s*\{[\s\S]*?border-bottom-color:\s*var\(--nb-seal\);/,
	);
	assert.match(
		css,
		/\.nb-back-link-label\s*\{[\s\S]*?border-bottom:\s*1px dashed var\(--nb-border-strong\);[\s\S]*?line-height:\s*1\.5;/,
	);
});

test("详情页书签从正文栏顶部的索引轨悬挂", () => {
	assert.match(detail, /class="nb-detail-hanger" aria-hidden="true"/);
	assert.match(detail, /class="nb-detail-hanger-line"/);
	assert.match(detail, /class="nb-detail-hanger-marker"/);
	assert.match(
		css,
		/\.nb-detail-hanger\s*\{[\s\S]*?left:\s*284px;[\s\S]*?pointer-events:\s*none;/,
	);
	assert.match(
		css,
		/\.nb-detail-hanger-line\s*\{[\s\S]*?height:\s*0;[\s\S]*?border-top:\s*2px dashed color-mix\(in srgb, var\(--nb-seal\) 76%, var\(--nb-ink-soft\)\);/,
	);
	assert.doesNotMatch(
		css,
		/\.nb-detail-hanger-line\s*\{[\s\S]*?border-bottom:/,
	);
	assert.match(
		css,
		/\.nb-detail-hanger-marker\s*\{[\s\S]*?top:\s*8px;[\s\S]*?right:\s*48px;[\s\S]*?clip-path:/,
	);
});

test("页脚导航组以独立 auto 列保持页面中心对齐", () => {
	assert.match(footer, /grid-cols-\[1fr_auto_1fr\]/);
	assert.match(footer, /class="flex flex-wrap justify-self-center gap-x-5/);
});

test("减少动态效果时摘抄卡清除默认旋转", () => {
	const reducedBlock =
		css.match(
			/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*$/,
		)?.[0] ?? "";
	assert.match(
		reducedBlock,
		/\.nb-excerpt-card\s*\{[\s\S]*?transform:\s*none;/,
	);
});

test("腰封荐语保留两行且不再移动封面文字避让", () => {
	assert.doesNotMatch(css, /\.nb-cover--hero\s+\.cv-author/);
	assert.doesNotMatch(css, /\.nb-cover--hero\s+\.cv-imprint/);
	assert.match(css, /\.nb-sash-copy\s*\{[\s\S]*?-webkit-line-clamp:\s*2;/);
	assert.match(
		css,
		/\.nb-sash-copy\s*\{[\s\S]*?height:\s*36px;[\s\S]*?padding:\s*0 12px;[\s\S]*?line-height:\s*18px;/,
	);
	assert.match(
		css,
		/\.nb-book3d-card \.nb-sash-face\s*\{[\s\S]*?line-height:\s*18px;/,
	);
	assert.match(
		css,
		/\.nb-book3d-card \.nb-sash-copy\s*\{[\s\S]*?height:\s*34px;[\s\S]*?line-height:\s*17px;/,
	);
	assert.match(
		css,
		/@container \(max-width: 159px\)\s*\{[\s\S]*?\.nb-book3d-card \.nb-sash-face[\s\S]*?line-height:\s*15px;[\s\S]*?\.nb-book3d-card \.nb-sash-copy[\s\S]*?height:\s*28px;[\s\S]*?line-height:\s*14px;/,
	);
});

test("共享书架卡片样式收窄硬壳阴影，hover 恢复正常阴影并保留书本轻抬与印章红反馈", () => {
	const finePointerBlock =
		css.match(
			/@media \(hover: hover\) and \(pointer: fine\) \{[\s\S]*?\n  \}/,
		)?.[0] ?? "";
	assert.match(
		finePointerBlock,
		/\.nb-book-card:hover \.nb-book3d\s*\{[\s\S]*?transform:\s*translateY\(-4px\) rotate\(-1deg\);/,
	);
	assert.match(
		finePointerBlock,
		/\.nb-book-card--shelf-style:hover \.nb-front-board,\s+\.nb-hero-book--shelf-style:hover \.nb-front-board\s*\{[\s\S]*?5px 5px 20px rgba\(40, 31, 20, 0\.12\),[\s\S]*?12px 16px 26px rgba\(40, 31, 20, 0\.1\);/,
	);
	assert.match(
		finePointerBlock,
		/\.nb-book-card--shelf-style:hover \.nb-back-board,\s+\.nb-hero-book--shelf-style:hover \.nb-back-board\s*\{[\s\S]*?-10px 0 50px 10px rgba\(40, 31, 20, 0\.28\);/,
	);
	assert.match(
		finePointerBlock,
		/\.nb-book-card--shelf-style:hover > a > h3\s*\{[\s\S]*?color:\s*var\(--nb-seal\);/,
	);
	assert.match(
		finePointerBlock,
		/\.nb-book-card--shelf-style:hover::before\s*\{[\s\S]*?transform:\s*scaleY\(3\);/,
	);
	assert.match(
		css,
		/\.nb-book-card--shelf-style:focus-within::before\s*\{[\s\S]*?transform:\s*scaleY\(3\);/,
	);
	assert.match(
		css,
		/\.nb-book-card--shelf-style::after\s*\{[\s\S]*?display:\s*none;/,
	);
	assert.match(
		css,
		/\.nb-book-card--shelf-style \.nb-front-board,\s+\.nb-hero-book--shelf-style \.nb-front-board\s*\{[\s\S]*?3px 3px 10px rgba\(40, 31, 20, 0\.08\),[\s\S]*?6px 8px 14px rgba\(40, 31, 20, 0\.06\);[\s\S]*?transition:\s*box-shadow 180ms var\(--nb-ease-out\);/,
	);
	assert.match(
		css,
		/\.nb-book-card--shelf-style \.nb-back-board,\s+\.nb-hero-book--shelf-style \.nb-back-board\s*\{[\s\S]*?box-shadow:\s*-6px 0 30px 6px rgba\(40, 31, 20, 0\.16\);[\s\S]*?transition:\s*box-shadow 180ms var\(--nb-ease-out\);/,
	);
	const reducedBlock =
		css.match(
			/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*$/,
		)?.[0] ?? "";
	assert.match(
		reducedBlock,
		/\.nb-book-card::after,[\s\S]*?\.nb-book-card \.nb-book3d\s*\{[\s\S]*?transform:\s*none;/,
	);
});

test("书架与书库卡片作者行使用单行省略截断，避免译者孤字换行", () => {
	assert.match(
		css,
		/\.nb-book-authors\s*\{[\s\S]*?-webkit-box-orient:\s*vertical;[\s\S]*?-webkit-line-clamp:\s*1;[\s\S]*?overflow:\s*hidden;[\s\S]*?text-overflow:\s*ellipsis;/,
	);
});

test("书本几何层复刻前封、后封与双倍厚度书口坐标", () => {
	assert.match(
		css,
		/\.nb-book3d-object\s*\{[\s\S]*?transform-style:\s*preserve-3d;/,
	);
	assert.match(
		css,
		/\.nb-front-board\s*\{[\s\S]*?translateZ\(var\(--front-z\)\)/,
	);
	assert.match(
		css,
		/\.nb-back-board\s*\{[\s\S]*?translateZ\(var\(--back-z\)\)/,
	);
	assert.match(css, /\.nb-page-top,[\s\S]*?left:\s*1%;[\s\S]*?width:\s*98%;/);
	assert.match(
		css,
		/\.nb-page-fore-edge\s*\{[\s\S]*?width:\s*var\(--page-depth\);[\s\S]*?translate\(-55%, 0\) rotateY\(90deg\);[\s\S]*?transform-origin:\s*center center/,
	);
});

test("腰封只绕前封硬壳，书口保持裸露，背封仅显示窄回折", () => {
	assert.match(
		css,
		/\.nb-spine-body\s*\{[\s\S]*?width:\s*var\(--page-depth\);[\s\S]*?rotateY\(90deg\)/,
	);
	assert.doesNotMatch(css, /\.nb-book3d-spine::before/);
	assert.match(css, /\.nb-obi-front,[\s\S]*?top:\s*var\(--obi-y\);/);
	assert.doesNotMatch(css, /\.nb-obi-spine\s*\{/);
	assert.match(
		css,
		/\.nb-sash-fold\s*\{[\s\S]*?width:\s*var\(--obi-front-fold-depth\);[\s\S]*?rotateY\(90deg\)/,
	);
	assert.match(
		css,
		/--obi-front-fold-depth:\s*calc\(var\(--board-thickness\) \+ 3px\)/,
	);
	assert.doesNotMatch(
		css,
		/--obi-front-fold-depth:\s*calc\(var\(--page-depth\)/,
	);
	assert.match(
		css,
		/\.nb-obi-back-return\s*\{[\s\S]*?width:\s*var\(--obi-return-width\);[\s\S]*?translateZ\(calc\(var\(--back-z\) - var\(--board-thickness\) - 0\.5px\)\)/,
	);
	assert.doesNotMatch(css, /--depth-[xy]|--p:|--e:/);
});
