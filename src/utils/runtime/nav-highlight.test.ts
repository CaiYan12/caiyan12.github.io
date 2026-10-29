// 导航高亮 DOM 壳单测（#118/T3 迁出后获得的能力）。
//
// 判定口径在 nav-state.ts 的纯函数里，本文件锁的是壳层三件事：class 与 aria-current
// 同步维护、前缀匹配不越过路径段边界、下拉父项按子链接点亮。桩只实现这几个函数
// 用到的面（querySelectorAll / getAttribute / closest / classList.toggle），
// 选择器按原样匹配——若壳层改了选择器，这里会以「unexpected selector」直接红。
import test from "node:test";
import assert from "node:assert/strict";
import { syncNavHighlight } from "./nav-highlight";

type Li = {
	classes: Set<string>;
	isDropdown: boolean;
	children: Anchor[];
	classList: { toggle(name: string, on: boolean): void };
	querySelector(sel: string): unknown;
	querySelectorAll(sel: string): Anchor[];
};

type Anchor = {
	href: string;
	li: Li | null;
	attrs: Map<string, string>;
	getAttribute(name: string): string | null;
	setAttribute(name: string, value: string): void;
	removeAttribute(name: string): void;
	closest(sel: string): Li | null;
};

function makeLi(isDropdown = false): Li {
	const li: Li = {
		classes: new Set<string>(),
		isDropdown,
		children: [],
		classList: {
			toggle(name, on) {
				if (on) li.classes.add(name);
				else li.classes.delete(name);
			},
		},
		// 只有下拉父项才有 void href 的直系父链接
		querySelector: (sel) =>
			isDropdown && sel.includes("javascript:void(0)") ? {} : null,
		querySelectorAll: (sel) => (sel === ":scope > ul a" ? li.children : []),
	};
	return li;
}

function makeAnchor(href: string, li: Li | null): Anchor {
	const attrs = new Map<string, string>();
	return {
		href,
		li,
		attrs,
		getAttribute: (name) =>
			name === "href" ? href : (attrs.get(name) ?? null),
		setAttribute: (name, value) => void attrs.set(name, value),
		removeAttribute: (name) => void attrs.delete(name),
		closest: (sel) => (sel === "li" ? li : null),
	};
}

/** 装上一次性文档桩：三个选择器各自返回对应集合，其余选择器视为契约被改坏 */
function install(
	pathname: string,
	nav: Anchor[],
	mmenu: Anchor[],
	dropdowns: Li[],
) {
	(globalThis as Record<string, unknown>).document = {
		querySelectorAll(sel: string) {
			if (sel === "#nav a, #mmenu a") return [...nav, ...mmenu];
			if (sel === "#nav li.dropdown, #mmenu li") return dropdowns;
			if (sel === "#mmenu a") return mmenu;
			throw new Error(`unexpected selector: ${sel}`);
		},
	};
	(globalThis as Record<string, unknown>).window = {
		location: { pathname },
	};
}

test("路径段边界：/link/ 不命中 /link-survey/，命中 /link/2026/", () => {
	const li = makeLi();
	const anchor = makeAnchor("/link/", li);

	install("/link-survey/", [anchor], [], []);
	syncNavHighlight();
	assert.equal(li.classes.has("current"), false);
	assert.equal(anchor.attrs.has("aria-current"), false);

	// 同一批节点换到命中路径再算一遍（等价于切页后的重跑）
	install("/link/2026/", [anchor], [], []);
	syncNavHighlight();
	assert.equal(li.classes.has("current"), true);
	assert.equal(anchor.attrs.get("aria-current"), "page");
});

test("换页后由命中变不命中：class 与 aria-current 都要清掉", () => {
	const li = makeLi();
	const anchor = makeAnchor("/tag/", li);

	install("/tag/技术/", [anchor], [], []);
	syncNavHighlight();
	assert.equal(li.classes.has("current"), true);

	install("/archive/", [anchor], [], []);
	syncNavHighlight();
	assert.equal(li.classes.has("current"), false);
	assert.equal(anchor.attrs.has("aria-current"), false);
});

test("首页只认精确的 /：/archive/ 下首页项不高亮", () => {
	const li = makeLi();
	const anchor = makeAnchor("/", li);

	install("/", [anchor], [], []);
	syncNavHighlight();
	assert.equal(li.classes.has("current"), true);

	install("/archive/", [anchor], [], []);
	syncNavHighlight();
	assert.equal(li.classes.has("current"), false);
});

test("下拉父项：void 父链接自身不判，由子链接是否命中决定", () => {
	const dropdown = makeLi(true);
	const voidAnchor = makeAnchor("javascript:void(0)", dropdown);
	const child = makeAnchor("/tag/", dropdown);
	dropdown.children = [child];

	// 子链接不在 nav 列表里，只有第二遍（dropdown 遍历）能点亮父项
	install("/tag/技术/", [voidAnchor], [], [dropdown]);
	syncNavHighlight();
	assert.equal(dropdown.classes.has("current"), true);

	install("/about/", [voidAnchor], [], [dropdown]);
	syncNavHighlight();
	assert.equal(dropdown.classes.has("current"), false);
});
