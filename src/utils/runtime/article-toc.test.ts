// 侧栏文章目录激活态纯函数 pickActiveIndex 单测（#99）。
// 三条判定规则各一组正例 + 每条规则一条反例输入（红证据）：
// 「首标题前不激活」与「页底兜底」两条的正例在真实内容上可能恰好重合，
// 故各自单独证红——反例输入构造成「只违反该条规则」的最小形状。
import test from "node:test";
import assert from "node:assert/strict";
import { pickActiveIndex } from "./article-toc";

// 常用基础盘：四条标题，文档坐标 1000/2000/3000/4000，视口 720，文档总高 6000。
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
