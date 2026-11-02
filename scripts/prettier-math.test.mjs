import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { createMarkdownProcessor } from "@astrojs/markdown-remark";
import katex from "katex";
import * as prettier from "prettier";
import remarkCjkFriendly from "remark-cjk-friendly";
import remarkMath from "remark-math";
import { visit } from "unist-util-visit";

const root = fileURLToPath(new URL("../", import.meta.url));

async function markdownFiles(directory) {
	const entries = await readdir(directory, { withFileTypes: true });
	const paths = await Promise.all(
		entries.map((entry) => {
			const path = join(directory, entry.name);
			return entry.isDirectory()
				? markdownFiles(path)
				: entry.name.endsWith(".md")
					? [path]
					: [];
		}),
	);
	return paths.flat().sort();
}

// Use the site's math parser, not Prettier's internal AST: a formatter that
// stops recognizing math must not also become the oracle for this test.
async function formulas(source) {
	const result = [];
	const renderer = await createMarkdownProcessor({
		syntaxHighlight: false,
		smartypants: false,
		remarkPlugins: [
			remarkCjkFriendly,
			remarkMath,
			() => (tree) => {
				visit(tree, ["math", "inlineMath"], (node) => {
					result.push({ type: node.type, value: node.value });
				});
			},
		],
	});
	await renderer.render(source);
	return result;
}

function renderResults(nodes) {
	return nodes.map(({ type, value }) => {
		try {
			return {
				code: katex.renderToString(value, {
					displayMode: type === "math",
					throwOnError: true,
					strict: "ignore",
				}),
			};
		} catch (error) {
			// Existing invalid content must not be silently normalized or turned
			// into a different error by a formatting-only dependency upgrade.
			return { error: error.message };
		}
	});
}

test("Prettier preserves single-dollar superscripts and subscripts", async () => {
	const source = "$Q_2^*>Q_1^*$\n\n**$\\hat{x}_i$ and $\\hat{y}_j$**\n";
	const before = await formulas(source);
	assert.equal(before.length, 3);
	const formatted = await prettier.format(source, { parser: "markdown" });
	const after = await formulas(formatted);
	assert.deepEqual(after, before);
	const rendered = renderResults(after);
	assert.ok(
		rendered.every((result) => result.code),
		"samples must render",
	);
	assert.deepEqual(rendered, renderResults(before));
});

test("Prettier preserves math throughout the current Markdown content", async (t) => {
	const paths = await markdownFiles(join(root, "src", "content"));
	assert.ok(paths.length > 0, "the corpus must not be empty");
	let formulaCount = 0;
	for (const path of paths) {
		await t.test(relative(root, path), async () => {
			const source = await readFile(path, "utf8");
			const before = await formulas(source);
			formulaCount += before.length;
			const config = (await prettier.resolveConfig(path)) ?? {};
			const formatted = await prettier.format(source, {
				...config,
				filepath: path,
			});
			const after = await formulas(formatted);
			assert.deepEqual(
				after,
				before,
				"math contents must remain identical",
			);
			assert.deepEqual(renderResults(after), renderResults(before));
			assert.equal(await readFile(path, "utf8"), source);
		});
	}
	assert.ok(formulaCount > 0, "the corpus must exercise real formulas");
	t.diagnostic(`${paths.length} Markdown files; ${formulaCount} formulas`);
});
