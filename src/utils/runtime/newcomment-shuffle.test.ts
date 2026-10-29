// 侧栏「换一批」加载态契约单测（#124/T9 迁入 src/utils/runtime/ 后获得的能力）。
// 期望值取自迁移前的字面实现（基线 theme-script.ts:197-223），不是实现副本：
// 键名、文案、类名、aria 属性逐字抄自那份快照，改任一处即访客可感知的契约变更。
//
// 为什么只钉 setNewCommentShuffleLoading：它自足（只吃一个 button 与布尔），
// 用最小按钮桩即可观察。点击换批的主路径要 document 级事件委托 + Element 判定 +
// 两次 setTimeout + performance.now，桩化面远大于被测逻辑，按先例留给浏览器复验，
// 见报告。
import test from "node:test";
import assert from "node:assert/strict";
import { setNewCommentShuffleLoading } from "./newcomment-shuffle";

type FakeEl = {
	classes: Set<string>;
	classList: { toggle: (name: string, force?: boolean) => void };
	textContent: string;
};

function makeEl(): FakeEl {
	const el: FakeEl = {
		classes: new Set<string>(),
		classList: {
			toggle(name: string, force?: boolean) {
				if (force) el.classes.add(name);
				else el.classes.delete(name);
			},
		},
		textContent: "",
	};
	return el;
}

/** 最小按钮桩：只实现被测函数触到的面（querySelector / classList / setAttribute / dataset / disabled） */
function makeButton() {
	const icon = makeEl();
	const label = makeEl();
	const attrs: Record<string, string> = {};
	const button = {
		disabled: false,
		dataset: {} as Record<string, string>,
		classList: {
			toggle(name: string, force?: boolean) {
				if (force) button.classes.add(name);
				else button.classes.delete(name);
			},
		},
		classes: new Set<string>(),
		icon,
		label,
		/** 置 false 模拟真实 DOM 里按钮内缺少该子节点 */
		hasIcon: true,
		hasLabel: true,
		attrs,
		querySelector(selector: string) {
			if (selector === "[data-newcomment-icon]") {
				return button.hasIcon ? icon : null;
			}
			if (selector === "[data-newcomment-label]") {
				return button.hasLabel ? label : null;
			}
			return null;
		},
		setAttribute(name: string, value: string) {
			attrs[name] = value;
		},
	};
	return button;
}

type ButtonStub = ReturnType<typeof makeButton>;

const asButton = (b: ButtonStub) => b as unknown as HTMLButtonElement;

test("进入加载态：禁用、aria-busy、文案与加载图标同时就位", () => {
	const button = makeButton();
	setNewCommentShuffleLoading(asButton(button), true);

	assert.equal(button.disabled, true);
	assert.equal(button.attrs["aria-busy"], "true");
	assert.equal(button.attrs["aria-label"], "正在加载最新评论");
	assert.equal(button.attrs.title, "正在加载最新评论");
	assert.equal(button.label.textContent, "加载中…");
	assert.ok(button.classes.has("is-loading"));
	assert.ok(button.icon.classes.has("fa-circle-o-notch"));
	assert.ok(button.icon.classes.has("fa-spin"));
	assert.equal(button.icon.classes.has("fa-random"), false);
});

test("退出加载态：按钮恢复可点，文案与图标回到「换一批」", () => {
	const button = makeButton();
	setNewCommentShuffleLoading(asButton(button), true);
	setNewCommentShuffleLoading(asButton(button), false);

	assert.equal(button.disabled, false);
	assert.equal(button.attrs["aria-busy"], "false");
	assert.equal(button.attrs["aria-label"], "换一批最新评论");
	assert.equal(button.attrs.title, "换一批最新评论");
	assert.equal(button.label.textContent, "换一批");
	assert.equal(button.classes.has("is-loading"), false);
	assert.ok(button.icon.classes.has("fa-random"));
	assert.equal(button.icon.classes.has("fa-circle-o-notch"), false);
	assert.equal(button.icon.classes.has("fa-spin"), false);
});

test("data-shuffle-subject 决定文案主语（留言板那处复用同一函数）", () => {
	const button = makeButton();
	button.dataset.shuffleSubject = "留言";

	setNewCommentShuffleLoading(asButton(button), true);
	assert.equal(button.attrs["aria-label"], "正在加载留言");
	assert.equal(button.attrs.title, "正在加载留言");

	setNewCommentShuffleLoading(asButton(button), false);
	assert.equal(button.attrs["aria-label"], "换一批留言");
	assert.equal(button.attrs.title, "换一批留言");
});

test("图标或文案节点缺失时不抛错，属性与禁用态照常切换", () => {
	const button = makeButton();
	button.hasIcon = false;
	button.hasLabel = false;

	assert.doesNotThrow(() =>
		setNewCommentShuffleLoading(asButton(button), true),
	);
	assert.equal(button.disabled, true);
	assert.equal(button.attrs["aria-busy"], "true");

	assert.doesNotThrow(() =>
		setNewCommentShuffleLoading(asButton(button), false),
	);
	assert.equal(button.disabled, false);
	assert.equal(button.attrs["aria-busy"], "false");
});
