// 侧栏文章目录激活态纯函数单测（#99/T3 + #102/T5）。
// pickActiveIndex：三条判定规则各一组正例 + 每条规则一条反例输入（红证据）：
// 「首标题前不激活」与「页底兜底」两条的正例在真实内容上可能恰好重合，
// 故各自单独证红——反例输入构造成「只违反该条规则」的最小形状。
// pickTocRevealScrollTop（#102）：居中 + 钳制四种输入各一条。
import test from "node:test";
import assert from "node:assert/strict";
import {
	pickActiveIndex,
	pickTocRevealScrollTop,
	buildArticleTocItem,
	collectArticleTocEntries,
} from "./article-toc";

// ---- 最小 DOM 桩（照 quote-band.test.ts 先例）：只实现这两个纯函数用到的面 ----
type FakeLi = {
	style: { props: Record<string, string>; setProperty(k: string, v: string) };
	children: FakeEl[];
	appendChild(c: FakeEl): void;
};

type FakeEl = { tagName?: string; id?: string } & Record<string, unknown>;

function makeLi(): FakeLi {
	const li: FakeLi = {
		style: {
			props: {},
			setProperty(k, v) {
				this.props[k] = v;
			},
		},
		children: [],
		appendChild(c) {
			li.children.push(c);
		},
	};
	return li;
}

// makeEl(tag, attrs)：li 走结构桩；标题桩支持 tagName/id/textContent
function makeEl(tag: string, attrs: Record<string, string> = {}): FakeEl {
	if (tag === "li") return makeLi() as unknown as FakeEl;
	const el: FakeEl = {
		tagName: tag.toUpperCase(),
		id: attrs.id,
		textContent: "",
		attrs: {},
		children: [],
	};
	el.prepend = (child: FakeEl) => {
		(el.children as FakeEl[]).unshift(child);
	};
	el.setAttribute = (name: string, value: string) => {
		(el.attrs as Record<string, string>)[name] = value;
	};
	return el;
}

// 文档桩：createElement 记 tag；查询选择器由调用方按测试用例注入。
function makeDoc(
	create: (tag: string) => FakeEl,
	queryAll: (sel: string) => FakeEl[],
): Document {
	return {
		createElement: create,
		querySelectorAll: queryAll,
	} as unknown as Document;
} // 常用基础盘：四条标题，文档坐标 1000/2000/3000/4000，视口 720，文档总高 6000。
const TOPS = [1000, 2000, 3000, 4000];
const VIEW = 720;
const DOC = 6000;

test("规则一：越过第 k 条返回 k；两条之间返回前一条", () => {
	// 恰好越过第 3 条（top 3000 - 2990 = 10 ≤ 10）
	assert.equal(pickActiveIndex(TOPS, 2990, VIEW, DOC), 2);
	// 越过第 4 条
	assert.equal(pickActiveIndex(TOPS, 3995, VIEW, DOC), 3);
	// 位置落在第 2 与第 3 条之间 → 返回前一条（第 2 条，索引 1）
	assert.equal(pickActiveIndex(TOPS, 2500, VIEW, DOC), 1);
});

test("规则一反例（红证据）：滚动位置尚未越过任何标题时，不得因「接近」就激活", () => {
	// 距首标题 11px：判定线 10 之外，若实现把阈值放宽（如 >= 或 +1 容差）会错亮第 1 条
	assert.equal(pickActiveIndex(TOPS, 989, VIEW, DOC), -1);
});

test("规则二：首个标题越线前返回 -1（不激活任何条目）", () => {
	assert.equal(pickActiveIndex(TOPS, 0, VIEW, DOC), -1);
	// 页顶上方再留 900px 开头区的典型初载位：首标题还在视口下方约 100px
	assert.equal(pickActiveIndex(TOPS, 900, VIEW, DOC), -1);
	// 单条标题的未越线状态同样返回 -1
	assert.equal(pickActiveIndex([1000], 500, VIEW, DOC), -1);
});

test("规则二反例（红证据）：距首标题恰好 1px（判定线 10 之内）必须点亮第 1 条", () => {
	// 反例构造：若「首标题前返回 -1」被实现成「scrollY < 首标题」而非「越线判定」，
	// 999（首标题还差 1px 才到判定线）会被误判为 -1
	assert.equal(pickActiveIndex(TOPS, 990, VIEW, DOC), 0);
});

test("规则三：滚到页底强制最后一条——按位置已满足与靠兜底满足两种输入各一条", () => {
	// (a) 按位置已满足：滚到底时 61 条全部越线，兜底与按位置结果相同
	assert.equal(pickActiveIndex(TOPS, DOC - VIEW, VIEW, DOC), TOPS.length - 1);
	// (b) 靠兜底满足：尾部标题 5900 距页底仅 100px，但视口 720 → 滚到底时
	// scrollY = 5280，5900 - 5280 = 620 > 10，按位置到不了最后一条——
	// 兜底是唯一能点亮最后一条的路径。
	assert.equal(pickActiveIndex([1000, 2000, 5900], DOC - VIEW, VIEW, DOC), 2);
});

test("规则三反例（红证据）：未到页底（差 2px）时，兜底不得提前触发", () => {
	// scrollY + innerHeight = scrollHeight - 2，不满足 >= scrollHeight - 1。
	// 此时按位置算应仍激活被越过的第 2 条（top 2000 已越线，5900 未越），
	// 若兜底判据被写成 > scrollHeight - 2 一类的放宽，会提前点亮最后一条。
	assert.equal(
		pickActiveIndex([1000, 2000, 5900], DOC - VIEW - 2, VIEW, DOC),
		1,
	);
});

test("空标题数组返回 -1（不激活）", () => {
	assert.equal(pickActiveIndex([], 0, VIEW, DOC), -1);
	// 即便滚动状态满足页底兜底，空表也只能返回 -1（无条目可点亮）
	assert.equal(pickActiveIndex([], DOC - VIEW, VIEW, DOC), -1);
});

test("单条标题的两种状态：越线 0、页底也是 0", () => {
	assert.equal(pickActiveIndex([1000], 1000, VIEW, DOC), 0);
	assert.equal(pickActiveIndex([1000], DOC - VIEW, VIEW, DOC), 0);
});

// ---- pickTocRevealScrollTop：居中 + 钳制（#102/T5 票面四种输入）----

test("reveal 目标（居中）：条目中线对齐容器中点，不触钳制", () => {
	// itemTop=500、条目高 30、容器高 200、内容高 2000：
	// 目标 = 500 + 15 − 100 = 415，落在 [0, 1800] 内 → 原值。
	// 滚到 415 后条目中线位于容器内 500−415+15 = 100 = 200/2，居中成立。
	assert.equal(pickTocRevealScrollTop(500, 30, 200, 2000), 415);
});

test("reveal 目标（顶钳制）：首章不足半屏，钳 0 不拖出顶部空白", () => {
	// 10 + 15 − 100 = −75 < 0 → 钳 0（旧行为「贴边」同为 0，此输入居中/贴边同值，
	// 区分二者靠居中正例与底钳制反例，不靠这一条）。
	assert.equal(pickTocRevealScrollTop(10, 30, 200, 2000), 0);
});

test("reveal 目标（底钳制）：末章不足半屏，钳到最大滚动位不拖出底部空白", () => {
	// 1950 + 15 − 100 = 1865 > 1800 = 2000 − 200 → 钳 1800。
	// 贴边算法会给 1950+30−200 = 1780（条目底贴容器底），与居中钳制值不同——
	// 本条是「居中钳制 ≠ 贴边」的区分性反例。
	assert.equal(pickTocRevealScrollTop(1950, 30, 200, 2000), 1800);
	assert.notEqual(pickTocRevealScrollTop(1950, 30, 200, 2000), 1780);
});

test("reveal 目标（容器不比列表矮）：无可滚空间恒 0", () => {
	// scrollHeight 400 < clientHeight 500：max = max(0, −100) = 0，任何目标都钳 0。
	assert.equal(pickTocRevealScrollTop(0, 30, 500, 400), 0);
	// 恰好等高（400 = 400）同样 max = 0。
	assert.equal(pickTocRevealScrollTop(100, 30, 400, 400), 0);
});

// ---- buildArticleTocItem：渲染结构契约（此前无消费者、审查裁定补测而非删导出）----

function newLi(
	doc: Document,
	entry: Parameters<typeof buildArticleTocItem>[1],
) {
	return buildArticleTocItem(doc, entry) as unknown as FakeLi;
}

test("buildArticleTocItem：li 带层级变量、a 的 href/title/text 与条目一致", () => {
	const doc = makeDoc(
		(tag) => makeEl(tag),
		() => [],
	);
	const li = newLi(doc, { slug: "sec-2", text: "部署与回滚", depth: 3 });
	assert.equal(li.style.props["--toc-depth"], "3");
	assert.equal(li.children.length, 1);
	const a = li.children[0] as unknown as {
		attrs: Record<string, string>;
		textContent: string;
	};
	assert.equal(a.attrs.href, "#sec-2");
	assert.equal(a.attrs.title, "部署与回滚");
	assert.equal(a.textContent, "部署与回滚");
	const icon = (a as unknown as { children: FakeEl[] }).children[0];
	assert.equal(icon.tagName, "I");
	assert.equal(icon.className, "fa fa-angle-right");
	assert.equal((icon.attrs as Record<string, string>)["aria-hidden"], "true");
});

test("buildArticleTocItem：depth 取值 2–4 原样写入，不夹取", () => {
	const doc = makeDoc(
		(tag) => makeEl(tag),
		() => [],
	);
	const h2 = newLi(doc, { slug: "a", text: "甲", depth: 2 });
	const h4 = newLi(doc, { slug: "c", text: "丙", depth: 4 });
	assert.equal(h2.style.props["--toc-depth"], "2");
	assert.equal(h4.style.props["--toc-depth"], "4");
});

test("buildArticleTocItem：text 逐字透传（空白归一是 collect 侧职责，不在此重复）", () => {
	const doc = makeDoc(
		(tag) => makeEl(tag),
		() => [],
	);
	const raw = "  多  词  标题  ";
	const li = newLi(doc, { slug: "b", text: raw, depth: 2 });
	const a = li.children[0] as unknown as {
		attrs: Record<string, string>;
		textContent: string;
	};
	// title 与 textContent 都取 entry.text 原文；若在此处再做 trim/归一会与
	// collect 的输出不一致（双源），故契约是逐字透传。
	assert.equal(a.attrs.title, raw);
	assert.equal(a.textContent, raw);
});

// ---- collectArticleTocEntries：采集契约 ----

/** 根元素桩：querySelectorAll("h2[id], h3[id], h4[id]") 返回注入的标题序列 */
function makeRoot(headings: FakeEl[]): Element {
	return {
		querySelectorAll: (sel: string) =>
			sel === "h2[id], h3[id], h4[id]" ? headings : [],
	} as unknown as Element;
}

test("collectArticleTocEntries：DOM 顺序 + depth 映射（h2/h3/h4 → 2/3/4）", () => {
	const h2 = makeEl("h2", { id: "intro" });
	h2.textContent = "  前言  ";
	const h3 = makeEl("h3", { id: "setup" });
	h3.textContent = "安装";
	const h4 = makeEl("h4", { id: "deep" });
	h4.textContent = "细节";
	const entries = collectArticleTocEntries(makeRoot([h2, h3, h4]));
	assert.deepEqual(entries, [
		{ slug: "intro", text: "前言", depth: 2 },
		{ slug: "setup", text: "安装", depth: 3 },
		{ slug: "deep", text: "细节", depth: 4 },
	]);
});

test("collectArticleTocEntries：无 id 或空白文本的标题被剔除；空输入返回空数组", () => {
	const noId = makeEl("h2");
	noId.textContent = "没 id";
	const blank = makeEl("h3", { id: "blank" });
	blank.textContent = "   \n  ";
	const entries = collectArticleTocEntries(makeRoot([noId, blank]));
	assert.deepEqual(entries, []);
	// 完全空的容器
	assert.deepEqual(collectArticleTocEntries(makeRoot([])), []);
});
