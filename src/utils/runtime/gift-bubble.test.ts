// 礼物气泡几何的单测（2026-11-01 定稿）：
// 起点必须落在按钮中心正上方，图标底边比舞台底边高 8px；
// 无冷却：每次点击都生成一枚（与站点文字特效一致）。
import test from "node:test";
import assert from "node:assert/strict";
import { giftOrigin } from "./gift-bubble";

test("起点 x 使图标中心与按钮中心重合", () => {
	const origin = giftOrigin(
		{ left: 1316, width: 58 },
		{ left: 1176, height: 192 },
	);
	assert.equal(1176 + origin.x + 24 / 2, 1345);
});

test("起点 y 使图标底边高出舞台底边 8px（即按钮顶边上方 8px）", () => {
	const origin = giftOrigin(
		{ left: 1316, width: 58 },
		{ left: 1176, height: 192 },
	);
	assert.equal(192 - (origin.y + 24), 8);
	assert.equal(origin.y, 160);
});
