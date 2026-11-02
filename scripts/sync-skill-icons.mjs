// 手动刷新技能图标；不进联网构建链。保留原有 Iconify 图形与每集合的许可来源。
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { skillsData } from "../src/data/skills.ts";
import { formatJson } from "./lib/write-json.mjs";

const root = new URL("../public/skill-icons/", import.meta.url);
const icons = [...new Set(skillsData.map((skill) => skill.icon))].sort();
const prefixes = [...new Set(icons.map((icon) => icon.split(":")[0]))];
const infoUrl = `https://api.iconify.design/collections?prefixes=${prefixes.join(",")}`;
const infoResponse = await fetch(infoUrl);
if (!infoResponse.ok)
	throw new Error(`Iconify metadata HTTP ${infoResponse.status}`);
const collections = await infoResponse.json();
for (const prefix of prefixes) {
	if (
		!collections[prefix]?.license?.title ||
		!collections[prefix]?.license?.url
	)
		throw new Error(`Missing license metadata: ${prefix}`);
}
const downloaded = [];
for (const icon of icons) {
	if (!/^[a-z0-9-]+:[a-z0-9-]+$/.test(icon))
		throw new Error(`Invalid icon: ${icon}`);
	const [prefix, name] = icon.split(":");
	const source = `https://api.iconify.design/${prefix}/${name}.svg`;
	const response = await fetch(source);
	if (!response.ok) throw new Error(`${icon} HTTP ${response.status}`);
	if (!response.headers.get("content-type")?.includes("image/svg+xml"))
		throw new Error(`${icon} is not SVG`);
	const svg = await response.text();
	if (
		!/^<svg\b[\s\S]*<\/svg>\s*$/.test(svg) ||
		/<script\b|<foreignObject\b|\son\w+\s*=|javascript:|(?:href|src)=["'](?:https?:|\/\/)/i.test(
			svg,
		)
	)
		throw new Error(`Unsafe or incomplete SVG: ${icon}`);
	downloaded.push({ icon, prefix, name, source, svg });
}
// 全部抓取/校验成功后才更新文件；离线时不覆盖现有资源。
await mkdir(root, { recursive: true });
const files = [];
for (const { icon, prefix, name, source, svg } of downloaded) {
	await mkdir(new URL(`${prefix}/`, root), { recursive: true });
	await writeFile(new URL(`${prefix}/${name}.svg`, root), svg, "utf8");
	files.push({
		icon,
		file: `${prefix}/${name}.svg`,
		source,
		bytes: Buffer.byteLength(svg),
		sha256: createHash("sha256").update(svg).digest("hex"),
	});
}
const manifest = new URL("SOURCES.json", root);
await writeFile(
	manifest,
	await formatJson(fileURLToPath(manifest), {
		retrievedAt: new Date().toISOString(),
		metadataSource: infoUrl,
		collections,
		files,
	}),
	"utf8",
);
console.log(
	`Saved ${files.length} original SVGs and collection license metadata`,
);
