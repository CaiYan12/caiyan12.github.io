import assert from "node:assert/strict";
import test from "node:test";
import { remarkExtended } from "./remark-extended.mjs";

test("container directive label becomes an admonition title", () => {
	const tree = {
		type: "root",
		children: [
			{
				type: "containerDirective",
				name: "important",
				children: [
					{
						type: "paragraph",
						data: { directiveLabel: true },
						children: [{ type: "text", value: "核心结论 & 提示" }],
					},
					{
						type: "paragraph",
						children: [{ type: "text", value: "正文" }],
					},
				],
			},
		],
	};

	remarkExtended()(tree);

	assert.equal(
		tree.children[0].value,
		'<div class="admonition admonition-important"><p class="admonition-title">核心结论 &amp; 提示</p>',
	);
	assert.equal(tree.children[1].children[0].value, "正文");
	assert.equal(tree.children[2].value, "</div>");
});

test("unlabelled container keeps its first paragraph as content", () => {
	const tree = {
		type: "root",
		children: [
			{
				type: "containerDirective",
				name: "note",
				children: [
					{
						type: "paragraph",
						children: [{ type: "text", value: "正文" }],
					},
				],
			},
		],
	};

	remarkExtended()(tree);

	assert.equal(
		tree.children[0].value,
		'<div class="admonition admonition-note">',
	);
	assert.equal(tree.children[1].children[0].value, "正文");
	assert.equal(tree.children[2].value, "</div>");
});
