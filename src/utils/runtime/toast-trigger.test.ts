// 通用提示触发器的单测（T7 #122 迁出后获得的能力；此前这段埋在 theme-script.ts 里，
// 「灰态控件点了要弹说明」只能靠浏览器手点，改坏了没人拦得住）。
//
// 观察点选在**访客能看见的东西**上：站内提示条上写的文案。提示条走真实的
// src/utils/site-toast.ts（不替换成假实现），所以断言的是最终 DOM 里那条
// #site-toast 元素的 textContent；「没弹」= 这条元素压根没被创建过。
//
// 桩只实现被测路径真正用到的 DOM 面：Element instanceof 判定、createElement /
// getElementById / body.appendChild、dataset、closest。
// closest 按真实语义**逐级向上找**（先看自己，再看父级），所以「命中最近的触发器」
// 这条契约是被测出来的，不是被桩喂出来的。
import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { initToastTrigger, readToastMessage } from "./toast-trigger";

// ---- 最小 DOM 桩 ----

/** 按 id 登记的节点表：提示条设 id 时自动入表 */
const registry = new Map<string, FakeElement>();

/**
 * 把 `[data-xxx]` 选择器翻译成「该元素的 dataset 里有 xxx 这个键」。
 * 真实 DOM 里 `data-site-toast` 对应的 dataset 键是驼峰的 `siteToast`，
 * 这里按同一条规则转换，否则 closest 永远匹配不上。
 */
function matchesSelector(el: FakeElement, selector: string): boolean {
	const attr = selector.match(/^\[data-([a-z-]+)\]$/);
	if (!attr) return false;
	const key = attr[1].replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
	return el.dataset[key] !== undefined;
}

class FakeElement {
	#id = "";
	dataset: Record<string, string> = {};
	parent: FakeElement | null = null;
	hidden = false;
	children: FakeElement[] = [];
	classList = {
		add: () => {},
		remove: () => {},
	};
	/** textContent 被写入的次数：用来判断「弹了几条提示」 */
	textContentWrites = 0;
	#textContent = "";

	get id() {
		return this.#id;
	}

	set id(value: string) {
		this.#id = value;
		registry.set(value, this);
	}

	get textContent() {
		return this.#textContent;
	}

	set textContent(value: string) {
		this.#textContent = value;
		this.textContentWrites++;
	}

	setAttribute(_name: string, _value: string) {}

	appendChild(child: FakeElement) {
		this.children.push(child);
		child.parent = this;
	}

	/** 真实语义：先看自己，逐级向上找第一个匹配的祖先 */
	closest(selector: string): FakeElement | null {
		let node: FakeElement | null = this;
		while (node) {
			if (matchesSelector(node, selector)) return node;
			node = node.parent;
		}
		return null;
	}
}

(globalThis as Record<string, unknown>).Element = FakeElement;
(globalThis as Record<string, unknown>).HTMLDivElement = FakeElement;

type ClickHandler = (event: unknown) => unknown;

const dom = {
	clickHandlers: [] as ClickHandler[],
	addEventListener(type: string, fn: ClickHandler) {
		if (type === "click") dom.clickHandlers.push(fn);
	},
	createElement() {
		return new FakeElement();
	},
	getElementById(id: string) {
		return registry.get(id) ?? null;
	},
	body: new FakeElement(),
};

(globalThis as Record<string, unknown>).document = dom;
(globalThis as Record<string, unknown>).window = {
	requestAnimationFrame: () => 0,
	setTimeout: () => 0,
	clearTimeout: () => {},
};

// initToastTrigger 有「只绑一次」旗标，模块状态在本进程内唯一 → 这里装一次即可
initToastTrigger();
const click = dom.clickHandlers[0];

// 提示条是复用的同一个 #site-toast 节点，跨用例会串味 → 每个用例前清空登记表，
// 让「有没有弹过提示」在每条用例里都从零开始数。
beforeEach(() => {
	registry.clear();
});

/** 组一个带 data-site-toast 的触发器；message 为 undefined 表示没有这个属性 */
function makeTrigger(message: string | undefined) {
	const trigger = new FakeElement();
	if (message !== undefined) trigger.dataset.siteToast = message;
	return trigger;
}

/**
 * 点一下某个触发器：真实场景里访客点的是触发器**内部的某个子元素**，
 * 所以这里把子元素作为 event.target，让 closest 自己往上找。
 */
function clickTrigger(message: string | undefined) {
	const trigger = makeTrigger(message);
	const inner = new FakeElement();
	trigger.appendChild(inner);
	click({ target: inner, preventDefault: () => {} });
	return trigger;
}

/** 当前提示条文案（没弹过则 null） */
function toastText(): string | null {
	return registry.get("site-toast")?.textContent ?? null;
}

// ---- readToastMessage 的取值与 trim 规则 ----

test("readToastMessage：取 data-site-toast 的值并 trim 两侧空白", () => {
	const trigger = makeTrigger("  这条仓库没有公开源码  ");
	assert.equal(
		readToastMessage(trigger as unknown as HTMLElement),
		"这条仓库没有公开源码",
	);
});

test("readToastMessage：内部空白原样保留（只 trim 两侧）", () => {
	const trigger = makeTrigger("  两条  说明  ");
	assert.equal(
		readToastMessage(trigger as unknown as HTMLElement),
		"两条  说明",
	);
});

test("readToastMessage：没有 data-site-toast 属性时返回空串", () => {
	const trigger = makeTrigger(undefined);
	assert.equal(readToastMessage(trigger as unknown as HTMLElement), "");
});

test("readToastMessage：全是空白时返回空串（不是原始空白）", () => {
	const trigger = makeTrigger("   \t  ");
	assert.equal(readToastMessage(trigger as unknown as HTMLElement), "");
});

// ---- 触发行为 ----

test("点击带文案的触发器：弹出该文案（trim 后）", () => {
	clickTrigger("  点不开是正常的  ");

	assert.equal(toastText(), "点不开是正常的");
});

test("空白文案静默不弹：提示条压根不被创建", () => {
	clickTrigger("   ");

	assert.equal(registry.has("site-toast"), false, "空白文案不应弹出提示条");
});

test("没有 data-site-toast 的元素点击不弹提示", () => {
	clickTrigger(undefined);

	assert.equal(registry.has("site-toast"), false);
});

test("一次点击只出一条：closest 命中的最近触发器说了算", () => {
	const outer = makeTrigger("外层说明");
	const inner = makeTrigger("内层说明");
	outer.appendChild(inner);
	const leaf = new FakeElement();
	inner.appendChild(leaf);

	const before = registry.get("site-toast")?.textContentWrites ?? 0;
	click({ target: leaf, preventDefault: () => {} });

	const toast = registry.get("site-toast");
	assert.equal(
		toast?.textContent,
		"内层说明",
		"应取最近的内层触发器，不冒泡到外层",
	);
	assert.equal(
		(toast?.textContentWrites ?? 0) - before,
		1,
		"一次点击只写一条提示文案",
	);
});
