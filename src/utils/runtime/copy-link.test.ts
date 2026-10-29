// 本文链接复制的单测（#118/T3 迁出后获得的能力；此前这段埋在 theme-script.ts 的
// 装配表里，只能靠浏览器手点，改坏了没人拦得住）。
//
// 观察点选在**访客能看见的东西**上：写进剪贴板的文本、站内提示条上写的文案。
// 提示条走真实的 src/utils/site-toast.ts（不替换成假实现），所以断言的是最终
// DOM 里那条 #site-toast 元素的 textContent——即访客眼睛看到的那句话。
//
// 桩只实现被测路径真正用到的 DOM 面：Element/HTMLDivElement 两个 instanceof 判定、
// createElement / getElementById / body.appendChild / execCommand、dataset 与 href。
// 剪贴板分三种：Clipboard API 可用、Clipboard API 缺失、Clipboard API 报错。
import test from "node:test";
import assert from "node:assert/strict";
import { initCopyLink } from "./copy-link";

// ---- 最小 DOM 桩 ----

/** 按 id 登记的节点表：createElement 出来的 div 设 id 时自动入表，getElementById 才找得到 */
const registry = new Map<string, FakeElement>();

/**
 * 把 `[data-xxx]` 选择器翻译成「该元素的 dataset 里有 xxx 这个键」。
 * 真实 DOM 里 `data-copy-link` 对应的 dataset 键是驼峰的 `copyLink`，
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
	style: Record<string, string> = {};
	value = "";
	href = "";
	hidden = false;
	textContent = "";
	children: FakeElement[] = [];
	classList = {
		add: () => {},
		remove: () => {},
	};
	/** 被 select() 过的标记：回退路径用它确认确实选中了 textarea 里的文本 */
	selected = false;
	/** 被 remove() 过的标记：回退路径用它确认临时节点用完即清 */
	removed = false;

	get id() {
		return this.#id;
	}

	set id(value: string) {
		this.#id = value;
		registry.set(value, this);
	}

	setAttribute(name: string, value: string) {
		this.dataset[name] = value;
	}

	getAttribute(name: string) {
		return this.dataset[name] ?? null;
	}

	appendChild(child: FakeElement) {
		this.children.push(child);
		child.parent = this;
	}

	remove() {
		this.removed = true;
	}

	select() {
		this.selected = true;
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

class FakeDiv extends FakeElement {}

(globalThis as Record<string, unknown>).Element = FakeElement;
(globalThis as Record<string, unknown>).HTMLDivElement = FakeDiv;

type ClickHandler = (event: unknown) => unknown;

const dom = {
	clickHandlers: [] as ClickHandler[],
	/** 按标签名记录本次会话创建过的元素 */
	created: [] as Array<{ tag: string; el: FakeElement }>,
	execCommandCalls: [] as string[],
	execCommandResult: true,
	addEventListener(type: string, fn: ClickHandler) {
		if (type === "click") dom.clickHandlers.push(fn);
	},
	createElement(tag: string) {
		const el = tag === "div" ? new FakeDiv() : new FakeElement();
		dom.created.push({ tag, el });
		return el;
	},
	getElementById(id: string) {
		return registry.get(id) ?? null;
	},
	execCommand(command: string) {
		dom.execCommandCalls.push(command);
		return dom.execCommandResult;
	},
	body: new FakeElement(),
};

(globalThis as Record<string, unknown>).document = dom;
(globalThis as Record<string, unknown>).window = {
	// 提示条的淡入/淡出定时器不需要真跑：文案在设置 textContent 的那一刻就定了
	requestAnimationFrame: () => 0,
	setTimeout: () => 0,
	clearTimeout: () => {},
};

// initCopyLink 有「只绑一次」旗标，模块状态在本进程内唯一 → 这里装一次即可
initCopyLink();
const click = dom.clickHandlers[0];

// ---- 剪贴板控制 ----

/** 覆盖全局 navigator（Node 自带的 navigator 是可配置访问器，可被 defineProperty 换掉） */
function setClipboard(
	clipboard: { writeText?: (text: string) => Promise<void> } | undefined,
) {
	Object.defineProperty(globalThis, "navigator", {
		value: { clipboard },
		configurable: true,
		writable: true,
	});
}

/**
 * 组一个带 [data-copy-link] 的链接，并把它作为可点目标。
 * 真实场景里访客点的是链接**内部的某个子元素**，所以 target 挂在 link 下面，
 * 由 closest 自己往上找——「命中最近的复制链接」这条契约因此是被测出来的，
 * 不是被桩喂出来的。
 */
function makeLinkTarget(options: {
	copyLink?: string;
	copyMessage?: string;
	href?: string;
}) {
	const link = new FakeElement();
	if (options.copyLink !== undefined) {
		link.dataset.copyLink = options.copyLink;
	}
	if (options.copyMessage !== undefined) {
		link.dataset.copyMessage = options.copyMessage;
	}
	link.href = options.href ?? "https://example.com/post/";
	const target = new FakeElement();
	link.appendChild(target);
	return { target, link };
}

type ClickOutcome = {
	prevented: boolean;
	/** 走 Clipboard API 时被**调用过** writeText 的文本（调用可能随后抛错） */
	attemptedWrites: string[];
};

/** 跑一次点击；clipboard 为 undefined 表示 Clipboard API 不可用 */
async function clickLink(
	options: { copyLink?: string; copyMessage?: string; href?: string },
	clipboard: { writeText?: (text: string) => Promise<void> } | undefined,
): Promise<ClickOutcome> {
	const attemptedWrites: string[] = [];
	if (clipboard === undefined) {
		setClipboard(undefined);
	} else {
		setClipboard({
			writeText: async (text: string) => {
				attemptedWrites.push(text);
				await clipboard.writeText?.(text);
			},
		});
	}

	const { target } = makeLinkTarget(options);
	let prevented = false;
	await click({
		target,
		preventDefault: () => {
			prevented = true;
		},
	});
	return { prevented, attemptedWrites };
}

/** 取当前站内提示条的文案（真实 site-toast 写入 #site-toast 的 textContent） */
function toastText(): string | null {
	return registry.get("site-toast")?.textContent ?? null;
}

test("复制来源：data-copy-link 优先于 href", async () => {
	const outcome = await clickLink(
		{
			copyLink: "https://example.com/canonical",
			href: "https://example.com/raw",
		},
		{ writeText: async () => {} },
	);

	assert.deepEqual(outcome.attemptedWrites, [
		"https://example.com/canonical",
	]);
});

test("复制来源：data-copy-link 为空串时退回 href", async () => {
	const outcome = await clickLink(
		{ copyLink: "", href: "https://example.com/raw" },
		{ writeText: async () => {} },
	);

	assert.deepEqual(outcome.attemptedWrites, ["https://example.com/raw"]);
});

test("没有 data-copy-link 属性的链接根本不触发复制（不被 closest 命中）", async () => {
	const outcome = await clickLink(
		{ href: "https://example.com/raw" },
		{ writeText: async () => {} },
	);

	assert.deepEqual(outcome.attemptedWrites, []);
});

test("点击 [data-copy-link] 会阻止默认跳转（不让访客离开文章）", async () => {
	const outcome = await clickLink(
		{ copyLink: "x" },
		{ writeText: async () => {} },
	);

	assert.equal(outcome.prevented, true);
});

test("成功提示：默认文案「已复制」，可被 data-copy-message 覆盖", async () => {
	await clickLink({ copyLink: "a" }, { writeText: async () => {} });
	assert.equal(toastText(), "已复制");

	await clickLink(
		{ copyLink: "b", copyMessage: "链接已到手" },
		{ writeText: async () => {} },
	);
	assert.equal(toastText(), "链接已到手");
});

test("失败提示：复制不成功时文案是「复制失败，请手动复制」", async () => {
	// Clipboard API 存在但抛错，且回退路径的 execCommand 也失败 → 走失败分支
	dom.execCommandResult = false;
	const outcome = await clickLink(
		{ copyLink: "a" },
		{
			writeText: async () => {
				throw new Error("denied");
			},
		},
	);

	assert.equal(toastText(), "复制失败，请手动复制");
	// Clipboard API 确实被调用过（是它抛错才落到回退路径），但回退也失败 → 判失败
	assert.deepEqual(outcome.attemptedWrites, ["a"]);

	dom.execCommandResult = true;
});

test("Clipboard API 不可用时回退到 textarea + execCommand", async () => {
	dom.execCommandResult = true;
	dom.execCommandCalls = [];
	dom.created = [];

	const outcome = await clickLink(
		{ copyLink: "https://example.com/fallback" },
		undefined,
	);

	// 没走 Clipboard API：一条都没调用过 writeText
	assert.deepEqual(outcome.attemptedWrites, []);
	// 回退路径确实走过 execCommand("copy")
	assert.deepEqual(dom.execCommandCalls, ["copy"]);

	// 回退用的 textarea：装上了待复制的文本、选中了它、用完即移除
	const textareas = dom.created.filter((c) => c.tag === "textarea");
	assert.equal(textareas.length, 1, "回退路径应恰好建一个 textarea");
	assert.equal(textareas[0].el.value, "https://example.com/fallback");
	assert.equal(
		textareas[0].el.selected,
		true,
		"textarea 应被 select() 才能复制",
	);
	assert.equal(textareas[0].el.removed, true, "临时 textarea 用完应移除");

	// 回退成功即算复制成功
	assert.equal(toastText(), "已复制");
});
