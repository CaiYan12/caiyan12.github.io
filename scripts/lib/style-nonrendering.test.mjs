import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
	NON_RENDERING_TAGS,
	isNonRenderingLine,
	isNonRenderingTag,
	stripNonRenderingLines,
	tagOfLine,
} from "./style-nonrendering.mjs";

// 指纹行的真实形状（取自 output/architecture-2026-11-10/F2.5/fp-before 的正文）：
//   <标签><#id><.class> | <位置路径> | <属性…>
//   状态行在标识前多一段 `:<伪类> `
const SCRIPT_LINE =
	'script | body:2>script:6 | font-family="Noto Sans SC Variable";display=none';
const SCRIPT_ID_LINE =
	"script#giscus-src | body:2>div:8>div:4>main:1>div:1>section:5>script:2 | display=none";
const STATE_LINE =
	":hover a.skip-link | body:2>a:1 | color=rgb(255, 255, 255);background-color=rgb(0, 192, 0)";
const DIV_LINE =
	"div.post-list | body:2>div:8>div:4>main:1>div:2>div:2>div:1>article:3 | color=rgb(0, 0, 0)";
const DIV_CLASS_LOOKS_LIKE_TAG =
	"div.script-box | body:2>div:9 | display=block";
const STYLE_LINE = "style | body:1>style:3 | display=none";
const LINK_LINE = "link | body:1>link:2 | display=none";
const META_LINE = "meta | body:1>meta:1 | display=none";
const NOSCRIPT_LINE = "noscript | body:2>noscript:4 | display=inline";
const TEMPLATE_LINE = "template | body:2>template:2 | display=none";

describe("tagOfLine", () => {
	it("普通行取到标签名", () => {
		assert.equal(tagOfLine(DIV_LINE), "div");
		assert.equal(tagOfLine(SCRIPT_LINE), "script");
	});

	it("带 id 的标签不会被 id 干扰", () => {
		assert.equal(tagOfLine(SCRIPT_ID_LINE), "script");
	});

	it("状态行跳过 :hover 前缀", () => {
		assert.equal(tagOfLine(STATE_LINE), "a");
	});

	it("类名看起来像标签名时仍按元素标签判定", () => {
		assert.equal(tagOfLine(DIV_CLASS_LOOKS_LIKE_TAG), "div");
	});

	it("自定义元素保留连字符", () => {
		assert.equal(
			tagOfLine("my-widget.x | body:2>my-widget:1 | display=block"),
			"my-widget",
		);
	});

	it("空值/非字符串不抛错", () => {
		assert.equal(tagOfLine(""), "");
		assert.equal(tagOfLine(undefined), "");
		assert.equal(tagOfLine(null), "");
	});
});

describe("isNonRenderingTag", () => {
	it("六类不渲染标签都认", () => {
		for (const tag of NON_RENDERING_TAGS) {
			assert.equal(isNonRenderingTag(tag), true, tag);
		}
	});

	it("大小写不敏感", () => {
		assert.equal(isNonRenderingTag("SCRIPT"), true);
		assert.equal(isNonRenderingTag(" Style "), true);
	});

	it("会生成盒子的元素一律不算", () => {
		for (const tag of [
			"div",
			"a",
			"span",
			"img",
			"input",
			"br",
			"svg",
			"p",
		]) {
			assert.equal(isNonRenderingTag(tag), false, tag);
		}
	});

	it("未知或空值按渲染元素处理（宁严不宽）", () => {
		assert.equal(isNonRenderingTag(""), false);
		assert.equal(isNonRenderingTag(undefined), false);
		assert.equal(isNonRenderingTag("scriptish"), false);
	});
});

describe("isNonRenderingLine", () => {
	it("脚本/样式/链接/元信息行判为不渲染", () => {
		for (const line of [
			SCRIPT_LINE,
			SCRIPT_ID_LINE,
			STYLE_LINE,
			LINK_LINE,
			META_LINE,
			NOSCRIPT_LINE,
			TEMPLATE_LINE,
		]) {
			assert.equal(isNonRenderingLine(line), true, line);
		}
	});

	it("渲染元素行（含状态行）不判为不渲染", () => {
		for (const line of [DIV_LINE, STATE_LINE, DIV_CLASS_LOOKS_LIKE_TAG]) {
			assert.equal(isNonRenderingLine(line), false, line);
		}
	});
});

describe("stripNonRenderingLines", () => {
	it("只删不渲染行，其余保持原顺序", () => {
		const input = [
			DIV_LINE,
			SCRIPT_LINE,
			STATE_LINE,
			META_LINE,
			DIV_CLASS_LOOKS_LIKE_TAG,
		];
		const { lines, dropped } = stripNonRenderingLines(input);
		assert.deepEqual(lines, [
			DIV_LINE,
			STATE_LINE,
			DIV_CLASS_LOOKS_LIKE_TAG,
		]);
		assert.equal(dropped, 2);
	});

	it("不修改入参", () => {
		const input = [DIV_LINE, SCRIPT_LINE];
		stripNonRenderingLines(input);
		assert.deepEqual(input, [DIV_LINE, SCRIPT_LINE]);
	});

	it("空数组与非数组安全", () => {
		assert.deepEqual(stripNonRenderingLines([]), { lines: [], dropped: 0 });
		assert.deepEqual(stripNonRenderingLines(undefined), {
			lines: [],
			dropped: 0,
		});
	});

	it("全是渲染元素时一条不删", () => {
		const { lines, dropped } = stripNonRenderingLines([
			DIV_LINE,
			STATE_LINE,
		]);
		assert.equal(dropped, 0);
		assert.deepEqual(lines, [DIV_LINE, STATE_LINE]);
	});
});
