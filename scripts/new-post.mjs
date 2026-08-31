import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const values = args.filter((arg) => arg !== "--dry-run");
const [slug, suppliedTitle] = values;

if (!slug) {
	console.error("用法：pnpm new-post -- <slug> [标题] [--dry-run]");
	process.exit(1);
}

if (slug === "." || slug === ".." || /[\\/:*?"<>|]/u.test(slug)) {
	console.error("slug 不能包含路径分隔符或 Windows 文件名禁用字符。");
	process.exit(1);
}

const title = suppliedTitle || slug;
const localDate = new Intl.DateTimeFormat("sv-SE", {
	timeZone: "Asia/Shanghai",
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
}).format(new Date());
const postDirectory = resolve("src", "content", "posts", slug);
const postPath = resolve(postDirectory, "index.md");

if (existsSync(postDirectory)) {
	console.error(`文章目录已存在：${postDirectory}`);
	process.exit(1);
}

const content = `---
title: ${JSON.stringify(title)}
published: ${localDate}
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
