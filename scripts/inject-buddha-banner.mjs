import { promises as fs } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// 构建后处理：向 dist 内全部 HTML 页面注入「佛祖保佑」横幅。
// 唯一文本源是仓库根目录的 佛祖保佑.xml（直接消费原文件，避免两份文本漂移）：
// 1) 横幅注释置于文件首行，Ctrl+U 查看源码第一屏可见；
// 2) <head> 起始处内联 console.info 打印同款内容——内联脚本不经 Vite 打包，
//    不受 astro.config.mjs 生产 console 清理（pure: console.log/debug）影响。
// 幂等：已注入的文件跳过；仅处理 .html，RSS/sitemap/robots 等 XML 与文本输出不动。
const distDirectory = resolve("dist");
const bannerPath = fileURLToPath(new URL("../佛祖保佑.xml", import.meta.url));
const banner = (await fs.readFile(bannerPath, "utf8"))
	.replace(/^\uFEFF/, "")
	.replace(/\r\n/g, "\n")
	.replace(/\s+$/, "");
if (
	!banner.startsWith("<!--") ||
	!banner.endsWith("-->") ||
	banner.slice(4, -3).includes("-->")
) {
	console.error(
		"佛祖保佑.xml 格式不正确：必须是完整 HTML 注释块（<!-- 开头、--> 结尾，注释内部不得出现 -->）。",
	);
	process.exit(1);
}
// JSON 字符串字面量可直接作为 JS 字符串；< 转义为 \u003c 防止出现 </script 序列
const consoleScript = `<script>console.info(${JSON.stringify(banner).replaceAll("<", "\\u003c")});</script>`;

async function walkHtmlFiles(directory) {
	const entries = await fs.readdir(directory, { withFileTypes: true });
	const files = [];
	for (const entry of entries) {
		const entryPath = resolve(directory, entry.name);
		if (entry.isDirectory()) {
			files.push(...(await walkHtmlFiles(entryPath)));
		} else if (entry.isFile() && entry.name.endsWith(".html")) {
			files.push(entryPath);
		}
	}
	return files;
}

const htmlFiles = await walkHtmlFiles(distDirectory);
let injectedCount = 0;
for (const filePath of htmlFiles) {
	let html = await fs.readFile(filePath, "utf8");
	let changed = false;
	if (!html.startsWith(banner)) {
		html = `${banner}\n${html}`;
		changed = true;
	}
	if (!html.includes(consoleScript)) {
		html = html.replace(
			/<head(\s[^>]*)?>/i,
			(headTag) => `${headTag}${consoleScript}`,
		);
		changed = true;
	}
	if (changed) {
		await fs.writeFile(filePath, html);
		injectedCount += 1;
	}
}

console.log(
	`佛祖保佑横幅注入完成：${injectedCount}/${htmlFiles.length} 个页面（源码首行注释 + console 打印）。`,
);
