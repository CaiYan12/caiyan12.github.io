import { readdirSync } from "node:fs";
import { resolve } from "node:path";

const postsDirectory = resolve("src", "content", "posts");
const postSlugPattern = /^\d{14}$/u;
const directories = readdirSync(postsDirectory, { withFileTypes: true }).filter(
	(entry) => entry.isDirectory(),
);
const invalidDirectories = directories.filter(
	(entry) => !postSlugPattern.test(entry.name),
);

if (invalidDirectories.length > 0) {
	console.error(
		"文章 URL slug 校验失败：posts/ 后只能使用 14 位数字 yyyymmddhhmmss。",
	);
	invalidDirectories.forEach((entry) => console.error(`- ${entry.name}`));
	process.exit(1);
}

console.log(
	`文章 URL slug 校验通过：${directories.length} 个目录均符合 yyyymmddhhmmss。`,
);
