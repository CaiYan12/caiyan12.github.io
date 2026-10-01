// 从站主头像重导出站点 favicon.ico，落到两处真实使用点（根 `/favicon.ico`、`/domain/favicon.ico`）。
// 显式运行（pnpm build:favicon），**不参与 pnpm build**；ICO 容器手工拼装，不引第三方库。
// 用法：node scripts/build-favicon.mjs [--from <源图>] [--out <路径> ...]
import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

const SIZES = [16, 32, 48, 256];
const DEFAULT_SRC = "public/images/avatar.png";
const DESTS = ["public/favicon.ico", "public/domain/favicon.ico"];

// 浏览器对 PNG 内嵌的 ICO 条目全都认（老 IE 要 BMP-DIB，本站不覆盖），
// 所以条目直接放 sharp 出来的 PNG，体积远小于同尺寸的 24 位 DIB。
async function buildIco(src) {
	const images = [];
	for (const size of SIZES) {
		const buf = await sharp(src)
			.resize({
				width: size,
				height: size,
				fit: "cover",
				kernel: sharp.kernel.lanczos3,
			})
			.png({ compressionLevel: 9, palette: size < 256 })
			.toBuffer();
		images.push({ size, buf });
	}
	const dirBytes = 16 * images.length;
	let offset = 6 + dirBytes;
	const entries = images.map(({ size, buf }) => {
		const byte = size >= 256 ? 0 : size; // 256 在宽/高字段里写成 0
		const header = Buffer.alloc(16);
		header[0] = byte;
		header[1] = byte;
		header.writeUInt16LE(1, 4); // 平面数
		header.writeUInt16LE(32, 6); // 位深
		header.writeUInt32LE(buf.length, 8);
		header.writeUInt32LE(offset, 12);
		offset += buf.length;
		return header;
	});
	const head = Buffer.alloc(6);
	head.writeUInt16LE(1, 2); // 类型 1 = icon
	head.writeUInt16LE(images.length, 4);
	return {
		ico: Buffer.concat([head, ...entries, ...images.map((i) => i.buf)]),
		images,
	};
}

const at = (flag) => {
	const i = process.argv.indexOf(flag);
	return i === -1 ? undefined : process.argv[i + 1];
};
// 写出前回读自己拼的容器：条目数、每条尺寸与 PNG 魔数、数据不越界。
// 手工拼的二进制最容易错的正是偏移与长度，而浏览器拿到坏 ico 是静默降级成默认地球图。
function assertContainer(ico, images) {
	const count = ico.readUInt16LE(4);
	if (ico.readUInt16LE(2) !== 1 || count !== images.length) {
		throw new Error(
			`ICO 头不对：type=${ico.readUInt16LE(2)} images=${count}`,
		);
	}
	images.forEach(({ size, buf }, i) => {
		const o = 6 + i * 16;
		const declared = ico[o] === 0 ? 256 : ico[o];
		const off = ico.readUInt32LE(o + 12);
		const len = ico.readUInt32LE(o + 8);
		const png =
			ico.subarray(off, off + 8).toString("hex") === "89504e470d0a1a0a";
		if (
			declared !== size ||
			len !== buf.length ||
			!png ||
			off + len > ico.length
		) {
			throw new Error(`第 ${i} 条目（${size}px）回读不一致`);
		}
	});
}

const from = at("--from") ?? DEFAULT_SRC;
const src = await readFile(from); // 缺源图时直接抛错，不静默产出空图标
const { ico, images } = await buildIco(src);
assertContainer(ico, images);
const dests = at("--out") ? [at("--out")] : DESTS;
for (const dest of dests) {
	await writeFile(dest, ico);
	console.log(`${dest}  ${ico.length} B`);
}
console.log(
	`源 ${from}  条目 ${images.map((i) => `${i.size}:${i.buf.length}B`).join(" ")}`,
);
