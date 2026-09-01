import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const values = args.filter((arg) => arg !== "--dry-run");
const [slug, suppliedTitle] = values;
const postSlugPattern = /^\d{14}$/u;

if (!slug) {
	console.error("用法：pnpm new-post -- <yyyymmddhhmmss> [标题] [--dry-run]");
	process.exit(1);
}

if (slug === "." || slug === ".." || /[\\/:*?"<>|]/u.test(slug)) {
	console.error("slug 不能包含路径分隔符或 Windows 文件名禁用字符。");
	process.exit(1);
}

if (!postSlugPattern.test(slug)) {
	console.error("文章 slug 必须严格为 14 位数字：yyyymmddhhmmss。");
	process.exit(1);
}

const title = suppliedTitle || slug;
const published = `${slug.slice(0, 4)}-${slug.slice(4, 6)}-${slug.slice(6, 8)} ${slug.slice(8, 10)}:${slug.slice(10, 12)}:${slug.slice(12, 14)}`;
const postDirectory = resolve("src", "content", "posts", slug);
const postPath = resolve(postDirectory, "index.md");

if (existsSync(postDirectory)) {
	console.error(`文章目录已存在：${postDirectory}`);
	process.exit(1);
}

const content = `---
title: ${JSON.stringify(title)}
published: ${published}
description: ""
image: ""
tags: []
category: ""
draft: false
private: false
views: 0
comments: 0
hotness: 0
---

## 正文标题

在这里开始写作。
`;

if (dryRun) {
	console.log(`[dry-run] 将创建：${postPath}`);
	console.log(content);
} else {
	mkdirSync(postDirectory, { recursive: true });
	writeFileSync(postPath, content, "utf8");
	console.log(`已创建文章：${postPath}`);
}
